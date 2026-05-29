require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  const res = await pool.query('SELECT id, username, display_name, role, division, jabatan FROM users');
  console.table(res.rows);
  await pool.end();
}

main().catch(console.error);
