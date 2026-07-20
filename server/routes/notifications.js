const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/notifications/vapidPublicKey
router.get('/vapidPublicKey', (req, res) => {
  res.send(process.env.VAPID_PUBLIC_KEY);
});

// POST /api/notifications/subscribe
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const subscription = req.body;
    const userId = req.user.id;
    
    // Simpan ke DB. Jika endpoint sudah ada, update user_id-nya saja (ON CONFLICT)
    await pool.query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) 
      DO UPDATE SET user_id = $1, p256dh = $3, auth = $4
    `, [
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    ]);
    
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
