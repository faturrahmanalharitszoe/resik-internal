require('dotenv').config({ override: true });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function deduplicateRooms() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all duplicate group room names
    const dupsRes = await client.query(`
      SELECT name, COUNT(*) as cnt, MIN(created_at) as oldest_at
      FROM rooms
      WHERE type = 'group' AND name IS NOT NULL
      GROUP BY name
      HAVING COUNT(*) > 1
    `);

    if (dupsRes.rows.length === 0) {
      console.log('✅ Tidak ada duplikat room. Database sudah bersih.');
      await client.query('ROLLBACK');
      return;
    }

    for (const dup of dupsRes.rows) {
      console.log(`\n🔍 Ditemukan duplikat: "${dup.name}" (${dup.cnt}x)`);

      // Get all rooms with this name, oldest first (canonical = first)
      const roomsRes = await client.query(`
        SELECT id, created_at FROM rooms
        WHERE type = 'group' AND name = $1
        ORDER BY created_at ASC
      `, [dup.name]);

      const canonicalRoom = roomsRes.rows[0];
      const duplicateRooms = roomsRes.rows.slice(1);

      console.log(`   ✅ Room canonical (disimpan): ${canonicalRoom.id} (dibuat: ${canonicalRoom.created_at})`);

      for (const dupRoom of duplicateRooms) {
        console.log(`   🗑  Room duplikat (dihapus): ${dupRoom.id}`);

        // Move messages from duplicate to canonical
        const msgMoved = await client.query(`
          UPDATE messages SET room_id = $1 WHERE room_id = $2
        `, [canonicalRoom.id, dupRoom.id]);
        console.log(`      → ${msgMoved.rowCount} pesan dipindahkan`);

        // Move members from duplicate to canonical (skip if already member)
        const membersRes = await client.query(`
          SELECT user_id FROM room_members WHERE room_id = $1
        `, [dupRoom.id]);

        let membersMoved = 0;
        for (const m of membersRes.rows) {
          await client.query(`
            INSERT INTO room_members (room_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `, [canonicalRoom.id, m.user_id]);
          membersMoved++;
        }
        console.log(`      → ${membersMoved} anggota dipindahkan/digabung`);

        // Remove members from duplicate room
        await client.query(`DELETE FROM room_members WHERE room_id = $1`, [dupRoom.id]);

        // Delete the duplicate room
        await client.query(`DELETE FROM rooms WHERE id = $1`, [dupRoom.id]);
        console.log(`      ✅ Room duplikat dihapus.`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Deduplikasi selesai! Semua room sudah bersih.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

deduplicateRooms();
