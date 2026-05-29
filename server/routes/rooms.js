const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/rooms — list rooms user is a member of
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.name, r.type,
        (SELECT content FROM messages WHERE room_id = r.id AND is_deleted = false
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE room_id = r.id AND is_deleted = false
         ORDER BY created_at DESC LIMIT 1) as last_message_at,
        u.id as dm_user_id,
        u.display_name as dm_user_display_name,
        u.username as dm_user_username,
        u.avatar_url as dm_user_avatar_url,
        u.is_online as dm_user_is_online
       FROM rooms r
       JOIN room_members rm ON r.id = rm.room_id
       LEFT JOIN room_members rm2 ON r.id = rm2.room_id AND r.type = 'dm' AND rm2.user_id != $1
       LEFT JOIN users u ON rm2.user_id = u.id
       WHERE rm.user_id = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms — create group room
router.post('/', async (req, res) => {
  const { name, member_ids = [] } = req.body;

  if (!name) return res.status(400).json({ error: 'Nama room wajib diisi' });

  try {
    const room = await db.query(
      'INSERT INTO rooms (name, type, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, 'group', req.user.id]
    );
    const roomId = room.rows[0].id;

    const allMembers = [...new Set([req.user.id, ...member_ids])];
    for (const uid of allMembers) {
      await db.query(
        'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roomId, uid]
      );
      // Notify each online member socket to join the room and reload rooms
      req.io.to(`user_${uid}`).emit('join_new_room', { room_id: roomId });
    }

    res.status(201).json(room.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/rooms/dm — create or get DM room
router.post('/dm', async (req, res) => {
  const { target_user_id } = req.body;
  const current_user_id = req.user.id;

  if (!target_user_id) {
    return res.status(400).json({ error: 'Target user ID wajib diisi' });
  }

  try {
    // 1. Check if DM room already exists between these two users
    const existing = await db.query(
      `SELECT r.id FROM rooms r
       JOIN room_members rm1 ON r.id = rm1.room_id AND rm1.user_id = $1
       JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id = $2
       WHERE r.type = 'dm'
       LIMIT 1`,
      [current_user_id, target_user_id]
    );

    if (existing.rows.length > 0) {
      const roomId = existing.rows[0].id;
      const roomDetails = await db.query(
        `SELECT r.id, r.name, r.type,
           u.id as dm_user_id,
           u.display_name as dm_user_display_name,
           u.username as dm_user_username,
           u.avatar_url as dm_user_avatar_url,
           u.is_online as dm_user_is_online
         FROM rooms r
         LEFT JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id != $1
         LEFT JOIN users u ON rm2.user_id = u.id
         WHERE r.id = $2`,
        [current_user_id, roomId]
      );
      return res.json(roomDetails.rows[0]);
    }

    // 2. Create a new DM room
    const newRoom = await db.query(
      "INSERT INTO rooms (type, name) VALUES ('dm', NULL) RETURNING *"
    );
    const roomId = newRoom.rows[0].id;

    // 3. Add both users to the new DM room
    await db.query(
      "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)",
      [roomId, current_user_id]
    );
    await db.query(
      "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)",
      [roomId, target_user_id]
    );

    // Notify both users' sockets to join the new room and reload sidebar
    req.io.to(`user_${current_user_id}`).emit('join_new_room', { room_id: roomId });
    req.io.to(`user_${target_user_id}`).emit('join_new_room', { room_id: roomId });

    // Get the details for the newly created room
    const roomDetails = await db.query(
      `SELECT r.id, r.name, r.type,
         u.id as dm_user_id,
         u.display_name as dm_user_display_name,
         u.username as dm_user_username,
         u.avatar_url as dm_user_avatar_url,
         u.is_online as dm_user_is_online
       FROM rooms r
       LEFT JOIN room_members rm2 ON r.id = rm2.room_id AND rm2.user_id != $1
       LEFT JOIN users u ON rm2.user_id = u.id
       WHERE r.id = $2`,
      [current_user_id, roomId]
    );

    res.status(201).json(roomDetails.rows[0]);
  } catch (err) {
    console.error('Create DM room error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms/:id/messages — paginated message history
router.get('/:id/messages', async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;

  // Check membership
  const member = await db.query(
    'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2',
    [id, req.user.id]
  );
  if (member.rows.length === 0) {
    return res.status(403).json({ error: 'Akses ditolak' });
  }

  try {
    let query = `
      SELECT m.id, m.content, m.type, m.file_url, m.file_name, m.file_size,
             m.created_at, m.is_deleted,
             u.id as sender_id, u.username, u.display_name, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = $1 AND m.is_deleted = false
    `;
    const params = [id];

    if (before) {
      params.push(before);
      query += ` AND m.created_at < $${params.length}`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);
    res.json(result.rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/rooms/meta/users — list all users (for DM / invite)
router.get('/meta/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, display_name, avatar_url, is_online, last_seen, division
       FROM users WHERE id != $1 ORDER BY display_name`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
