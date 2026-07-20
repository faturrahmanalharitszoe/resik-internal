require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});
(async () => {
    try {
        const cnt = await pool.query('SELECT COUNT(*) FROM kode');
        console.log('Total rows in kode table:', cnt.rows[0].count);

        const sample = await pool.query('SELECT * FROM kode LIMIT 10');
        console.table(sample.rows);

        const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'kode'
      ORDER BY ordinal_position
    `);
        console.table(cols.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
})();
