const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'intranet_chat'
});

async function exportData() {
  try {
    const res = await pool.query('SELECT * FROM users');
    
    let sql = `-- Migration script for users table\n\n`;
    
    res.rows.forEach(r => {
      // Escape single quotes in strings
      const name = r.name ? r.name.replace(/'/g, "''") : '';
      const username = r.username ? r.username.replace(/'/g, "''") : '';
      const password = r.password ? r.password.replace(/'/g, "''") : '';
      const role = r.role ? r.role.replace(/'/g, "''") : '';
      const department = r.department ? r.department.replace(/'/g, "''") : '';
      const createdAt = r.created_at ? `'${r.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
      const updatedAt = r.updated_at ? `'${r.updated_at.toISOString()}'` : 'CURRENT_TIMESTAMP';
      
      sql += `INSERT INTO users (id, username, password, role, department, name, created_at, updated_at) VALUES ('${r.id}', '${username}', '${password}', '${role}', '${department}', '${name}', ${createdAt}, ${updatedAt});\n`;
    });

    fs.writeFileSync('migration_users.sql', sql);
    console.log('✅ Berhasil mengekspor data user ke migration_users.sql');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal mengekspor data:', err);
    process.exit(1);
  }
}

exportData();
