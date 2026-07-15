const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, display_name, email, division, role, jabatan, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin user list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req, res) => {
  const { username, display_name, email, password, division, role, jabatan, is_admin } = req.body;

  if (!username || !display_name || !email || !password || !role || !jabatan) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  const validDivisions = ['marketing', 'sdm', 'keuangan', 'operasional'];
  if (division && !validDivisions.includes(division)) {
    return res.status(400).json({ error: 'Divisi tidak valid' });
  }

  const validRoles = ['staff', 'management', 'top management', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter' });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username atau email sudah digunakan' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const adminFlag = !!is_admin;

    const result = await db.query(
      `INSERT INTO users (username, display_name, email, password_hash, division, role, jabatan, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, display_name, email, division, role, jabatan, is_admin, created_at`,
      [username, display_name, email, password_hash, division || null, role, jabatan, adminFlag]
    );

    const user = result.rows[0];

    // Auto-join General room
    const generalRoom = await db.query(
      "SELECT id FROM rooms WHERE name = 'General' AND type = 'group' LIMIT 1"
    );
    if (generalRoom.rows.length > 0) {
      await db.query(
        'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [generalRoom.rows[0].id, user.id]
      );
    }

    // Auto-join Division room
    const divisionRoomMap = {
      marketing: 'Marketing',
      sdm: 'SDM',
      keuangan: 'Keuangan',
      operasional: 'Operasional'
    };
    const roomName = divisionRoomMap[division];
    if (roomName) {
      const divisionRoom = await db.query(
        "SELECT id FROM rooms WHERE name = $1 AND type = 'group' LIMIT 1",
        [roomName]
      );
      if (divisionRoom.rows.length > 0) {
        await db.query(
          'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [divisionRoom.rows[0].id, user.id]
        );
      }
    }

    res.status(201).json(user);
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id - Update user info
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { display_name, email, division, role, jabatan, is_admin } = req.body;

  if (!display_name || !email || !role || !jabatan) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  const validDivisions = ['marketing', 'sdm', 'keuangan', 'operasional'];
  if (division && !validDivisions.includes(division)) {
    return res.status(400).json({ error: 'Divisi tidak valid' });
  }

  const validRoles = ['staff', 'management', 'top management', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Role tidak valid' });
  }

  try {
    const checkRes = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id <> $2',
      [email, id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email sudah digunakan oleh pengguna lain' });
    }

    const adminFlag = !!is_admin;

    const result = await db.query(
      `UPDATE users 
       SET display_name = $1, email = $2, division = $3, role = $4, jabatan = $5, is_admin = $6
       WHERE id = $7
       RETURNING id, username, display_name, email, division, role, jabatan, is_admin, created_at`,
      [display_name, email, division || null, role, jabatan, adminFlag, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/password - Reset user password
router.put('/users/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
  }

  try {
    const checkRes = await db.query('SELECT id FROM users WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, id]);

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' });
  }

  try {
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }
    res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
