require('dotenv').config();
const db = require('./server/db');

async function migrate() {
  try {
    console.log('Creating divisions and positions tables on VPS...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS divisions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Drop old hardcoded division constraint from users table
    await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_division_check`);

    console.log('Tables created and constraints updated. Inserting default data...');

    const defaultDivisions = ['Marketing', 'SDM', 'Keuangan', 'Operasional', 'IT'];
    for (const div of defaultDivisions) {
      await db.query(`INSERT INTO divisions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [div]);
    }

    const defaultPositions = ['Staff', 'Asisten Manager', 'Manager', 'Senior Manager', 'Direktur Umum', 'Wakil Direktur Utama', 'Direktur'];
    for (const pos of defaultPositions) {
      await db.query(`INSERT INTO positions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [pos]);
    }

    console.log('Normalizing existing users division cases...');
    const divisions = await db.query('SELECT name FROM divisions');
    for (const row of divisions.rows) {
      await db.query(`UPDATE users SET division = $1 WHERE LOWER(division) = LOWER($1)`, [row.name]);
    }

    console.log('✅ Default data successfully inserted and normalized!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
