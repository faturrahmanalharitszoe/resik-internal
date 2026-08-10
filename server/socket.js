const db = require('./db');
const webpush = require('./webpush');

function stripHtmlTags(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '');
}

module.exports = function setupSocket(io) {
  const typingTimestamps = new Map();
  const userActiveRoom = new Map(); // userId -> room_id currently viewed

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] Connected: ${user.display_name} (${socket.id})`);

    // Join personal user room to receive dynamic room invitations/notifications
    socket.join(`user_${user.id}`);

    // Mark user online
    db.query('UPDATE users SET is_online = true WHERE id = $1', [user.id]);

    // Join all user's rooms on connect
    socket.on('join_rooms', async () => {
      try {
        const result = await db.query(
          'SELECT room_id FROM room_members WHERE user_id = $1',
          [user.id]
        );
        const roomIds = result.rows.map((r) => r.room_id);
        roomIds.forEach((roomId) => socket.join(roomId));

        // Broadcast online status to all rooms
        roomIds.forEach((roomId) => {
          socket.to(roomId).emit('user_status', { user_id: user.id, is_online: true });
        });
      } catch (err) {
        console.error('join_rooms error:', err);
      }
    });

    // Join specific room dynamically
    socket.on('join_room', ({ room_id }) => {
      socket.join(room_id);
    });

    // Track which room the user is currently viewing (for notifications)
    socket.on('view_room', ({ room_id }) => {
      userActiveRoom.set(user.id, room_id);
    });

    socket.on('leave_view', () => {
      userActiveRoom.delete(user.id);
    });

    // Send message
    socket.on('send_message', async (data, callback) => {
      const { room_id, content, type = 'text', file_url, file_name, file_size } = data;

      if (!room_id || (!content && !file_url)) {
        return callback?.({ error: 'Data tidak lengkap' });
      }

      // Sanitize: strip HTML tags from text content
      const sanitizedContent = type === 'text' ? stripHtmlTags(content) : content;

      try {
        // Verify membership
        const member = await db.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
          [room_id, user.id]
        );
        if (member.rows.length === 0) {
          return callback?.({ error: 'Bukan anggota room ini' });
        }

        // Truncate overly long messages
        const maxContentLength = 5000;
        const finalContent = sanitizedContent && sanitizedContent.length > maxContentLength
          ? sanitizedContent.substring(0, maxContentLength)
          : sanitizedContent;

        const result = await db.query(
          `INSERT INTO messages (room_id, sender_id, content, type, file_url, file_name, file_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, room_id, content, type, file_url, file_name, file_size, created_at`,
          [room_id, user.id, finalContent, type, file_url, file_name, file_size]
        );

        const message = {
          ...result.rows[0],
          sender_id: user.id,
          username: user.username,
          display_name: user.display_name,
        };

        // Broadcast to everyone in the room (including sender)
        io.to(room_id).emit('new_message', message);
        callback?.({ success: true, message });

        // Create notifications for other room members + web push (like sharing folder)
        (async () => {
          try {
            const membersRes = await db.query(
              'SELECT user_id FROM room_members WHERE room_id = $1 AND user_id != $2',
              [room_id, user.id]
            );
            // Exclude members who are currently viewing this room (no notification needed)
            const memberIds = membersRes.rows
              .map(r => r.user_id)
              .filter(uid => userActiveRoom.get(uid) !== room_id);
            if (memberIds.length === 0) return;

            const preview = finalContent
              ? (finalContent.length > 80 ? finalContent.substring(0, 80) + '...' : finalContent)
              : 'Mengirim file';
            const notifMsg = `${user.display_name}: ${preview}`;

            const insertedNotifs = [];
            for (const uid of memberIds) {
              const notifRes = await db.query(
                `INSERT INTO notifications (user_id, sender_id, message, room_id)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [uid, user.id, notifMsg, room_id]
              );
              insertedNotifs.push(notifRes.rows[0]);
            }

            const ioInstance = io;
            insertedNotifs.forEach(notif => {
              ioInstance.to(`user_${notif.user_id}`).emit('new_persistent_notification', {
                ...notif,
                sender_name: user.display_name,
                type: 'chat',
                room_id,
                message: notifMsg
              });
            });

            // Fetch push subscriptions
            const placeholders = memberIds.map((_, i) => '$' + (i + 1)).join(',');
            const subsRes = await db.query(
              `SELECT * FROM push_subscriptions WHERE user_id IN (${placeholders})`,
              memberIds
            );

            const payload = JSON.stringify({
              title: 'Pesan Baru',
              body: notifMsg,
              url: '/'
            });

            for (const sub of subsRes.rows) {
              const pushSub = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
              };
              webpush.sendNotification(pushSub, payload).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  db.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]).catch(console.error);
                } else {
                  console.error('Push notification error:', err);
                }
              });
            }
          } catch (err) {
            console.error('Failed to create chat notifications:', err);
          }
        })();
      } catch (err) {
        console.error('send_message error:', err);
        callback?.({ error: 'Gagal mengirim pesan' });
      }
    });

    // Typing indicator (rate-limited: max once per second per user)
    socket.on('typing', ({ room_id, is_typing }) => {
      const now = Date.now();
      const key = `${user.id}:${room_id}`;
      const lastTyping = typingTimestamps.get(key) || 0;

      // Throttle: allow typing signal only once per second
      if (now - lastTyping < 1000) return;
      typingTimestamps.set(key, now);

      socket.to(room_id).emit('user_typing', {
        user_id: user.id,
        display_name: user.display_name,
        is_typing,
        room_id,
      });
    });

    // Delete message
    socket.on('delete_message', async ({ message_id, room_id }, callback) => {
      try {
        const isAdmin = !!user.is_admin;

        let query = 'UPDATE messages SET is_deleted = true WHERE id = $1 ';
        let params = [message_id];

        if (!isAdmin) {
          query += 'AND sender_id = $2 ';
          params.push(user.id);
        }
        query += 'RETURNING id';

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
          return callback?.({ error: 'Pesan tidak ditemukan atau bukan milikmu' });
        }

        io.to(room_id).emit('message_deleted', { message_id, room_id });
        callback?.({ success: true });
      } catch (err) {
        console.error('delete_message error:', err);
        callback?.({ error: 'Gagal menghapus pesan' });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`[Socket] Disconnected: ${user.display_name}`);

      // Cleanup typing rate limit entries
      for (const [key] of typingTimestamps) {
        if (key.startsWith(`${user.id}:`)) {
          typingTimestamps.delete(key);
        }
      }

      userActiveRoom.delete(user.id);

      await db.query(
        'UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1',
        [user.id]
      );

      // Notify rooms user is offline
      const result = await db.query(
        'SELECT room_id FROM room_members WHERE user_id = $1',
        [user.id]
      );
      result.rows.forEach(({ room_id }) => {
        socket.to(room_id).emit('user_status', { user_id: user.id, is_online: false });
      });
    });
  });
};
