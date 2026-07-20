/**
 * Script migrasi table `kode` dari MySQL (resikapps.resikcemerlang.com)
 * ke PostgreSQL (localhost, database intranet_chat)
 *
 * Cara pakai:
 *   1. Isi MYSQL_PASSWORD di bawah
 *   2. Jalankan: node migrate_kode.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

// ========== KONFIGURASI MYSQL (Sumber) ==========
const MYSQL_CONFIG = {
    host: 'resikapps.resikcemerlang.com',
    port: 3306,
    user: 'root',
    password: 'R_Cemerlang83', // <-- ISI PASSWORD MYSQL DI SINI
    database: 'msi',
};

// ========== KONFIGURASI POSTGRESQL (Tujuan) ==========
const PG_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'intranet_chat',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
};

async function main() {
    console.log('Memulai migrasi table kode...\n');

    // 1. Koneksi ke MySQL
    console.log('⏳ Menghubungkan ke MySQL (resikapps.resikcemerlang.com)...');
    const mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Terhubung ke MySQL.\n');

    // 2. Cek deskripsi table kode di MySQL
    console.log('⏳ Membaca struktur table kode dari MySQL...');
    const [columns] = await mysqlConn.execute('DESCRIBE kode');
    console.log('Struktur table kode (MySQL):');
    console.table(columns.map(c => ({
        Field: c.Field,
        Type: c.Type,
        Null: c.Null,
        Key: c.Key,
        Default: c.Default,
        Extra: c.Extra,
    })));
    console.log('');

    // 3. Ambil semua data dari MySQL
    console.log('⏳ Mengambil data dari MySQL...');
    const [rows] = await mysqlConn.execute('SELECT * FROM kode');
    console.log(`✅ Mendapatkan ${rows.length} baris data.\n`);

    // 4. Tutup koneksi MySQL
    await mysqlConn.end();

    // 5. Koneksi ke PostgreSQL
    console.log('⏳ Menghubungkan ke PostgreSQL (localhost)...');
    const pgPool = new Pool(PG_CONFIG);
    const pgClient = await pgPool.connect();
    console.log('✅ Terhubung ke PostgreSQL.\n');

    try {
        // 6. Drop table kode jika sudah ada (biar clean)
        console.log('⏳ Drop table kode di PostgreSQL (jika ada)...');
        await pgClient.query('DROP TABLE IF EXISTS kode');
        console.log('✅ Table kode dihapus (jika ada).\n');

        // 7. Buat table kode di PostgreSQL
        console.log('⏳ Membuat table kode di PostgreSQL...');
        await pgClient.query(`
      CREATE TABLE kode (
        id BIGSERIAL PRIMARY KEY,
        category VARCHAR(10),
        kode VARCHAR(20),
        description VARCHAR(100),
        value DECIMAL(10,2),
        subof VARCHAR(20),
        kode_wilayah VARCHAR(20),
        kode_1_30 INT,
        aktif SMALLINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Table kode berhasil dibuat di PostgreSQL.\n');

        // 8. Insert data ke PostgreSQL
        if (rows.length > 0) {
            console.log(`⏳ Menyalin ${rows.length} baris data ke PostgreSQL...`);

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];

                // Konversi tipe data dari MySQL ke PostgreSQL
                const id = r.id ?? null;
                const category = r.category ?? null;
                const kode = r.kode ?? null;
                const description = r.description ?? null;
                const value = r.value ?? null;
                const subof = r.subof ?? null;
                const kode_wilayah = r.kode_wilayah ?? null;
                const kode_1_30 = r.kode_1_30 ?? null;
                const aktif = r.aktif ?? 1;
                const created_at = r.created_at ?? null;
                const updated_at = r.updated_at ?? null;

                await pgClient.query(
                    `INSERT INTO kode (id, category, kode, description, value, subof, kode_wilayah, kode_1_30, aktif, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [id, category, kode, description, value, subof, kode_wilayah, kode_1_30, aktif, created_at, updated_at]
                );

                if ((i + 1) % 100 === 0 || i === rows.length - 1) {
                    console.log(`   Progress: ${i + 1}/${rows.length} baris`);
                }
            }

            console.log(`✅ ${rows.length} baris data berhasil disalin ke PostgreSQL.\n`);
        } else {
            console.log('⚠️  Tidak ada data di table kode (MySQL kosong).\n');
        }

        // 9. Reset sequence id
        const maxId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) : 0;
        if (maxId > 0) {
            await pgClient.query(`ALTER SEQUENCE kode_id_seq RESTART WITH ${maxId + 1}`);
            console.log(`✅ Sequence id di-reset ke ${maxId + 1}.\n`);
        }

        // 10. Verifikasi
        console.log('⏳ Verifikasi data di PostgreSQL...');
        const verifyResult = await pgClient.query('SELECT COUNT(*) as total FROM kode');
        console.log(`   Total baris di PostgreSQL: ${verifyResult.rows[0].total}`);
        console.log('✅ Migrasi selesai!\n');

    } catch (err) {
        console.error('❌ Gagal:', err);
        throw err;
    } finally {
        pgClient.release();
        await pgPool.end();
    }
}

main().catch(err => {
    console.error('Migrasi gagal:', err);
    process.exit(1);
});
