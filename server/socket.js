const db = require('./db');

module.exports = function setupSocket(io) {
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

    // Send message
    socket.on('send_message', async (data, callback) => {
      const { room_id, content, type = 'text', file_url, file_name, file_size } = data;

      if (!room_id || (!content && !file_url)) {
        return callback?.({ error: 'Data tidak lengkap' });
      }

      try {
        // Verify membership
        const member = await db.query(
          'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
          [room_id, user.id]
        );
        if (member.rows.length === 0) {
          return callback?.({ error: 'Bukan anggota room ini' });
        }

        const result = await db.query(
          `INSERT INTO messages (room_id, sender_id, content, type, file_url, file_name, file_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, room_id, content, type, file_url, file_name, file_size, created_at`,
          [room_id, user.id, content, type, file_url, file_name, file_size]
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
      } catch (err) {
        console.error('send_message error:', err);
        callback?.({ error: 'Gagal mengirim pesan' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ room_id, is_typing }) => {
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
        const result = await db.query(
          'UPDATE messages SET is_deleted = true WHERE id = $1 AND sender_id = $2 RETURNING id',
          [message_id, user.id]
        );

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
