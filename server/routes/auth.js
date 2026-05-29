const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, display_name, email, password, division, role, jabatan } = req.body;

  if (!username || !display_name || !email || !password || !division) {
    return res.status(400).json({ error: 'Semua field wajib diisi termasuk divisi' });
  }

  const validDivisions = ['marketing', 'sdm', 'keuangan', 'operasional'];
  if (!validDivisions.includes(division)) {
    return res.status(400).json({ error: 'Divisi tidak valid' });
  }

  const userRole = role || 'staff';
  const userJabatan = jabatan || 'Staff';
  const validRoles = ['staff', 'management', 'top management'];
  if (!validRoles.includes(userRole)) {
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

    const result = await db.query(
      `INSERT INTO users (username, display_name, email, password_hash, division, role, jabatan)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, display_name, email, division, role, jabatan, created_at`,
      [username, display_name, email, password_hash, division, userRole, userJabatan]
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

    const token = jwt.sign(
      { id: user.id, username: user.username, display_name: user.display_name, role: user.role, division: user.division, jabatan: user.jabatan },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, display_name: user.display_name, role: user.role, division: user.division, jabatan: user.jabatan },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url,
        division: user.division,
        role: user.role,
        jabatan: user.jabatan,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
