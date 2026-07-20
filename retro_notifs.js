require('dotenv').config();
const db = require('./server/db');

async function migrate() {
  try {
    const docsRes = await db.query('SELECT * FROM shared_documents');
    const usersRes = await db.query('SELECT * FROM users');
    const viewsRes = await db.query('SELECT document_id, viewer_name FROM document_views');
    
    // Create a map of viewed documents for fast lookup
    const viewsMap = {}; // "docId_viewerName" -> true
    viewsRes.rows.forEach(r => {
      viewsMap[`${r.document_id}_${r.viewer_name}`] = true;
    });

    const divisionLabels = { marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional', it: 'IT' };
    const jabatanHierarchy = ['Staff', 'Asisten Manager', 'Manager', 'Senior Manager', 'Direktur', 'Wakil Direktur', 'Wakil Direktur Utama', 'Direktur Umum'];

    let count = 0;

    for (const doc of docsRes.rows) {
      let penerimaStr = doc.penerima;
      if (!penerimaStr) continue;

      let recipientsArray = [];
      try {
        recipientsArray = JSON.parse(penerimaStr);
      } catch (e) {
        recipientsArray = (penerimaStr || '').split(',').map(r => r.trim());
      }
      if (recipientsArray.length === 0) continue;

      const targetUsers = [];

      for (const u of usersRes.rows) {
        const userGroups = [u.display_name];
        const mappedDiv = divisionLabels[u.division] || u.division;
        const userLevel = jabatanHierarchy.indexOf(u.jabatan);
        
        if (mappedDiv) {
          userGroups.push('Divisi ' + mappedDiv);
          if (u.jabatan) userGroups.push(u.jabatan + ' ' + mappedDiv);
          if (userLevel > 0) {
            jabatanHierarchy.slice(0, userLevel).forEach(lowerJab => {
              userGroups.push(lowerJab + ' ' + mappedDiv);
            });
          }
        }
        if (u.jabatan === 'Direktur Umum') userGroups.push('Direktur Umum');
        else if (u.jabatan === 'Wakil Direktur' || u.jabatan === 'Wakil Direktur Utama') { userGroups.push('Wakil Direktur', 'Wakil Direktur Utama'); }
        else if (u.jabatan === 'Direktur') userGroups.push('Direktur');
        else if (u.jabatan === 'SM' || u.jabatan === 'Senior Manager') { userGroups.push('Semua SM', 'Semua Senior Manager'); }
        else if (u.jabatan === 'Staff') userGroups.push('Semua Staff');

        const hasAccess = userGroups.some(g => recipientsArray.includes(g));
        if (hasAccess && u.id !== doc.user_id) {
          const hasViewed = viewsMap[`${doc.id}_${u.display_name}`];
          if (!hasViewed) {
            targetUsers.push(u);
          }
        }
      }

      for (const u of targetUsers) {
        const checkRes = await db.query(
          'SELECT 1 FROM notifications WHERE user_id = $1 AND document_id = $2',
          [u.id, doc.id]
        );
        if (checkRes.rows.length === 0) {
          const notifMsg = `Dokumen Baru: ${doc.document_name}`;
          await db.query(
            'INSERT INTO notifications (user_id, sender_id, document_id, message, created_at) VALUES ($1, $2, $3, $4, $5)',
            [u.id, doc.user_id, doc.id, notifMsg, doc.created_at]
          );
          count++;
        }
      }
    }

    console.log(`✅ Sukses memigrasi ${count} notifikasi retroaktif untuk dokumen lama.`);
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
