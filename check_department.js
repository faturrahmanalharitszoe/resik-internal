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
        const res = await pool.query("SELECT * FROM kode WHERE category = 'DEPARTMENT'");
        console.table(res.rows);
        console.log('Total:', res.rows.length);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
})();
