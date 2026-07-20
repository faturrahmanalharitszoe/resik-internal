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
  console.log('⚠️  MEMULAI PROSES PEMBERSIHAN DATABASE...');

  try {
    // 1. Truncate all data
    console.log('🔄 Mengosongkan seluruh data tabel (TRUNCATE CASCADE)...');
    await pool.query(`
      TRUNCATE TABLE users, rooms, room_members, messages, shared_documents, notion_pages, projects CASCADE;
    `);
    console.log('✅ Semua data berhasil dikosongkan.');

    // 2. Add is_admin column if it doesn't exist
    console.log('🔄 Menambahkan kolom is_admin...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Kolom is_admin siap.');

    // 3. Recreate role constraint
    console.log('🔄 Memperbarui constraint role...');
    await pool.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    await pool.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('staff', 'management', 'top management', 'admin'));
    `);
    console.log('✅ Constraint role berhasil diperbarui (mendukung "admin").');

    // 4. Seed default admin user
    console.log('🔄 Membuat akun admin default...');
    const passwordHash = await bcrypt.hash('admin123', 12);
    await pool.query(`
      INSERT INTO users (username, display_name, email, password_hash, division, role, jabatan, is_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, ['admin', 'Administrator', 'admin@company.com', passwordHash, 'sdm', 'admin', 'Administrator', true]);

    console.log('\n======================================================');
    console.log('🎉 DATABASE BERHASIL DIBERSIHKAN DAN DIINISIALISASI!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role:     admin');
    console.log('   Division: sdm');
    console.log('   Jabatan:  Administrator');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Gagal membersihkan database:', err);
  } finally {
    await pool.end();
  }
}

main();
