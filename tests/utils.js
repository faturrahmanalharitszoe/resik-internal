require('dotenv').config();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'intranet_chat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function getUserByRoleAndDivision(role, division) {
  let query = 'SELECT * FROM users WHERE role = $1';
  let params = [role];

  if (division) {
    query += ' AND division = $2';
    params.push(division);
  }

  query += ' LIMIT 1';

  const res = await pool.query(query, params);
  return res.rows[0];
}

function generateToken(user) {
  const jabatanMap2 = { 'SM': 'Senior Manager', 'Wakil Direktur': 'Wakil Direktur Utama' };
  const normalizedJabatan = jabatanMap2[user.jabatan] || user.jabatan;

  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      display_name: user.display_name, 
      role: user.role, 
      division: user.division, 
      jabatan: normalizedJabatan, 
      is_admin: user.is_admin 
    },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '1h' }
  );
}

module.exports = {
  pool,
  getUserByRoleAndDivision,
  generateToken
};
