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
    
    if (res.rows.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }
    
    const columns = Object.keys(res.rows[0]);
    const columnsStr = columns.join(', ');
    
    res.rows.forEach(r => {
      const values = columns.map(col => {
        const val = r[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        return `'${val}'`; // fallback
      });
      
      sql += `INSERT INTO users (${columnsStr}) VALUES (${values.join(', ')});\n`;
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
