require('dotenv').config({ override: true });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function deduplicateRooms(client) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📁 DEDUPLIKASI ROOMS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const dupsRes = await client.query(`
    SELECT name, COUNT(*) as cnt
    FROM rooms
    WHERE type = 'group' AND name IS NOT NULL
    GROUP BY name
    HAVING COUNT(*) > 1
  `);

  if (dupsRes.rows.length === 0) {
    console.log('✅ Tidak ada duplikat room.');
    return;
  }

  for (const dup of dupsRes.rows) {
    console.log(`\n🔍 Duplikat: "${dup.name}" (${dup.cnt}x)`);

    const roomsRes = await client.query(`
      SELECT id, created_at FROM rooms
      WHERE type = 'group' AND name = $1
      ORDER BY created_at ASC
    `, [dup.name]);

    const canonical = roomsRes.rows[0];
    const duplicates = roomsRes.rows.slice(1);

    console.log(`   ✅ Simpan: ${canonical.id}`);

    for (const dupRoom of duplicates) {
      console.log(`   🗑  Hapus: ${dupRoom.id}`);

      const msgMoved = await client.query(
        `UPDATE messages SET room_id = $1 WHERE room_id = $2`,
        [canonical.id, dupRoom.id]
      );
      console.log(`      → ${msgMoved.rowCount} pesan dipindahkan`);

      const membersRes = await client.query(
        `SELECT user_id FROM room_members WHERE room_id = $1`,
        [dupRoom.id]
      );
      for (const m of membersRes.rows) {
        await client.query(
          `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [canonical.id, m.user_id]
        );
      }
      console.log(`      → ${membersRes.rowCount} anggota digabung`);

      await client.query(`DELETE FROM room_members WHERE room_id = $1`, [dupRoom.id]);
      await client.query(`DELETE FROM rooms WHERE id = $1`, [dupRoom.id]);
      console.log(`      ✅ Room duplikat dihapus`);
    }
  }
}

async function deduplicateNotion(client) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 DEDUPLIKASI NOTION PAGES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Find duplicate ROOT pages (parent_id IS NULL) by title
  const dupsRes = await client.query(`
    SELECT title, COUNT(*) as cnt
    FROM notion_pages
    WHERE parent_id IS NULL
    GROUP BY title
    HAVING COUNT(*) > 1
  `);

  if (dupsRes.rows.length === 0) {
    console.log('✅ Tidak ada duplikat halaman Notion.');
    return;
  }

  for (const dup of dupsRes.rows) {
    console.log(`\n🔍 Duplikat Notion: "${dup.title}" (${dup.cnt}x)`);

    // Keep oldest root page, delete the newer ones (CASCADE handles children)
    const pagesRes = await client.query(`
      SELECT id, created_at,
        (SELECT COUNT(*) FROM notion_pages c WHERE c.parent_id = np.id) as child_count
      FROM notion_pages np
      WHERE parent_id IS NULL AND title = $1
      ORDER BY created_at ASC
    `, [dup.title]);

    const canonical = pagesRes.rows[0];
    const duplicates = pagesRes.rows.slice(1);

    console.log(`   ✅ Simpan: ${canonical.id} (${canonical.child_count} sub-halaman)`);

    for (const dupPage of duplicates) {
      console.log(`   🗑  Hapus: ${dupPage.id} (${dupPage.child_count} sub-halaman) → CASCADE`);
      // CASCADE on parent_id will auto-delete all child pages
      await client.query(`DELETE FROM notion_pages WHERE id = $1`, [dupPage.id]);
      console.log(`      ✅ Halaman duplikat + sub-halamannya dihapus`);
    }
  }
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await deduplicateRooms(client);
    await deduplicateNotion(client);

    await client.query('COMMIT');
    console.log('\n\n✅ Semua deduplikasi selesai! Database sudah bersih.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error, rollback dijalankan:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
