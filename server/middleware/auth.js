const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau sudah expired' });
  }
}

function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error: no token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Authentication error: invalid token'));
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Akses ditolak: Memerlukan hak akses administrator' });
  }
  next();
}

module.exports = { authMiddleware, socketAuth, adminMiddleware };
