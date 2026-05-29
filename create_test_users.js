require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);
  
  const testUsers = [
    {
      username: 'marketing_staff',
      display_name: 'Staff Marketing',
      email: 'marketing_staff@example.com',
      password_hash: passwordHash,
      division: 'marketing',
      role: 'staff',
      jabatan: 'Staff'
    },
    {
      username: 'keuangan_sm',
      display_name: 'SM Keuangan',
      email: 'keuangan_sm@example.com',
      password_hash: passwordHash,
      division: 'keuangan',
      role: 'management',
      jabatan: 'SM'
    },
    {
      username: 'keuangan_staff',
      display_name: 'Staff Keuangan',
      email: 'keuangan_staff@example.com',
      password_hash: passwordHash,
      division: 'keuangan',
      role: 'staff',
      jabatan: 'Staff'
    }
  ];

  for (const u of testUsers) {
    const check = await pool.query('SELECT id FROM users WHERE username = $1', [u.username]);
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (username, display_name, email, password_hash, division, role, jabatan)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.username, u.display_name, u.email, u.password_hash, u.division, u.role, u.jabatan]
      );
      console.log(`User ${u.username} created.`);
    } else {
      console.log(`User ${u.username} already exists.`);
    }
  }

  await pool.end();
}

main().catch(console.error);
