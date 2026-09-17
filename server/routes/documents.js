const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const webpush = require('../webpush');

const router = express.Router();
router.use(authMiddleware);

// Helper: normalize files column to array of {path, originalName, size}
// 1 upload = 1 row, files stored as JSONB array. Fallback to file_path for legacy rows.
// Legacy rows lost the original filename (stored as "1787...-1234.pptx"); recover it
// from document_name suffix ("Nama Dokumen - namaasli") + stored extension.
function friendlyOriginalName(storedPath, rawOriginal, documentName) {
  const stored = String(storedPath || '').replace(/\\/g, '/').split('/').pop();
  const ext = stored.includes('.') ? stored.substring(stored.lastIndexOf('.')) : '';
  let orig = (rawOriginal || '').trim();
  const looksGenerated = !orig || orig === stored || /^\d+-\d+\./.test(orig);
  if (!looksGenerated) return orig;
  const docName = String(documentName || '');
  if (docName.includes(' - ')) {
    const suffix = docName.substring(docName.lastIndexOf(' - ') + 3).trim();
    if (suffix) {
      if (ext && suffix.toLowerCase().endsWith(ext.toLowerCase())) return suffix;
      return ext ? suffix + ext : suffix;
    }
  }
  return orig || stored;
}

function normalizeFiles(row) {
  let files = [];
  try {
    if (Array.isArray(row.files)) {
      files = row.files;
    } else if (typeof row.files === 'string' && row.files) {
      files = JSON.parse(row.files);
    }
  } catch (e) {
    files = [];
  }
  if (!Array.isArray(files) || files.length === 0) {
    if (row.file_path) {
      const base = String(row.file_path).replace(/\\/g, '/').split('/').pop();
      files = [{ path: row.file_path, originalName: friendlyOriginalName(row.file_path, base, row.document_name), size: null }];
    }
  }
  // Ensure shape
  files = files.map(f => {
    if (typeof f === 'string') {
      const base = String(f).replace(/\\/g, '/').split('/').pop();
      return { path: f, originalName: friendlyOriginalName(f, base, row.document_name), size: null };
    }
    const p = f.path || f.file || '';
    return {
      path: p,
      originalName: friendlyOriginalName(p, f.originalName || f.name || '', row.document_name),
      size: f.size != null ? f.size : null
    };
  }).filter(f => f.path);
  return files;
}

function mapDocRow(row) {
  const files = normalizeFiles(row);
  return {
    id: row.id,
    project_name: row.project_name,
    document_type: row.document_type,
    sub_tipe: row.sub_tipe,
    document_name: row.document_name,
    document_number: row.document_number,
    description: row.description,
    file: files.length > 0 ? files[0].path : row.file_path,
    files,
    files_count: files.length,
    senderName: row.sender_name,
    senderDivision: row.sender_division,
    penerima: row.penerima,
    tgl: row.tgl,
    created_at: row.created_at,
    updated_at: row.updated_at,
    share_token: row.share_token
  };
}

// Setup multer upload directory
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/documents/projects
router.get('/projects', async (req, res) => {
  try {
    const result = await db.query("SELECT kode AS id, kode || ' - ' || description AS name FROM kode WHERE category = 'DEPARTMENT' AND aktif = 1 ORDER BY description ASC");
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/documents/recipients
router.get('/recipients', async (req, res) => {
  try {
    const result = await db.query('SELECT username, display_name AS name, role, division AS divisi, jabatan FROM users');
    const divisionLabels = {
      marketing: 'Marketing',
      sdm: 'SDM',
      keuangan: 'Keuangan',
      operasional: 'Operasional',
      it: 'IT'
    };
    const jabatanLabels = {
      'SM': 'Senior Manager',
      'Wakil Direktur': 'Wakil Direktur Utama'
    };
    const mapped = result.rows.map(row => ({
      username: row.username,
      name: row.name,
      role: row.role,
      divisi: divisionLabels[row.divisi] || row.divisi,
      jabatan: jabatanLabels[row.jabatan] || row.jabatan
    }));
    res.json(mapped);
  } catch (err) {
    console.error('Error fetching recipients:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/documents/counts
router.get('/counts', async (req, res) => {
  try {
    const user = req.user;
    const displayName = user.display_name;
    const division = user.division;
    const jabatan = user.jabatan || 'Staff';

    // Build the full list of group labels the current user belongs to (for "masuk")
    const userGroups = [displayName];
    const divisionLabels = {
      marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional',
      it: 'IT'
    };
    const mappedDiv = divisionLabels[division] || division;
    const jabatanHierarchy = ['Staff', 'Asisten Manager', 'Manager', 'Senior Manager', 'Direktur', 'Wakil Direktur', 'Wakil Direktur Utama', 'Direktur Umum'];
    const userLevel = jabatanHierarchy.indexOf(jabatan);

    if (mappedDiv) {
      userGroups.push('Divisi ' + mappedDiv);
      if (jabatan) userGroups.push(jabatan + ' ' + mappedDiv);
      if (userLevel > 0) {
        jabatanHierarchy.slice(0, userLevel).forEach(lowerJab => {
          userGroups.push(lowerJab + ' ' + mappedDiv);
        });
      }
    }

    if (jabatan === 'Direktur Umum') userGroups.push('Direktur Umum');
    else if (jabatan === 'Wakil Direktur' || jabatan === 'Wakil Direktur Utama') { userGroups.push('Wakil Direktur', 'Wakil Direktur Utama'); }
    else if (jabatan === 'Direktur') userGroups.push('Direktur');
    else if (jabatan === 'SM' || jabatan === 'Senior Manager') { userGroups.push('Semua SM', 'Semua Senior Manager'); }
    else if (jabatan === 'Staff') userGroups.push('Semua Staff');

    // OUT (keluar): only documents the user themselves sent
    const totalOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1';
    const todayOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1 AND tgl >= CURRENT_DATE';

    // IN (masuk): only documents explicitly addressed to the user (directly or via group labels), excluding own-sent
    const totalInQuery = `
      SELECT COUNT(*) FROM shared_documents d
      WHERE EXISTS (
        SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec WHERE rec = ANY($1::text[])
      )
      AND d.sender_name != $2
    `;
    const todayInQuery = `
      SELECT COUNT(*) FROM shared_documents d
      WHERE EXISTS (
        SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec WHERE rec = ANY($1::text[])
      )
      AND d.sender_name != $2
      AND d.tgl >= CURRENT_DATE
    `;

    const totalOut = await db.query(totalOutQuery, [displayName]);
    const todayOut = await db.query(todayOutQuery, [displayName]);
    const totalIn = await db.query(totalInQuery, [userGroups, displayName]);
    const todayIn = await db.query(todayInQuery, [userGroups, displayName]);

    res.json({
      todayInCount: parseInt(todayIn.rows[0].count, 10),
      todayOutCount: parseInt(todayOut.rows[0].count, 10),
      totalInCount: parseInt(totalIn.rows[0].count, 10),
      totalOutCount: parseInt(totalOut.rows[0].count, 10)
    });
  } catch (err) {
    console.error('Error fetching counts:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/documents
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const displayName = user.display_name;
    const role = user.role || 'staff';
    const division = user.division;
    const jabatan = user.jabatan || 'Staff';

    let query = '';
    let params = [];

    if (role === 'top management' || user.is_admin) {
      // Direktur sees all documents
      query = `
        SELECT d.*, COALESCE(d.sender_division, u.division) AS sender_division
        FROM shared_documents d
        LEFT JOIN users u ON d.user_id = u.id
        ORDER BY d.tgl DESC
      `;
    } else if (role === 'management' && (jabatan === 'SM' || jabatan === 'Senior Manager')) {
      // Senior Manager sees division documents
      let targetDivisions = [division];
      let subDivs = [];

      if (division === 'keuangan') {
        subDivs = ['Payment', 'Payroll', 'IT', 'Keuangan', 'Accounting'];
      } else if (division === 'sdm') {
        subDivs = ['SDM', 'GA'];
      } else if (division === 'operasional') {
        subDivs = ['OPS', 'Pengadaan', 'operasional'];
      } else if (division === 'marketing') {
        subDivs = ['marketing'];
      }

      query = `
        SELECT DISTINCT d.*, COALESCE(d.sender_division, u.division) AS sender_division
        FROM shared_documents d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.sender_division = $1
           OR u.division = $1
           OR d.sender_name = ANY($2::text[])
           OR EXISTS (
             SELECT 1 FROM users u2
             WHERE u2.division = $1
               AND u2.display_name = ANY(string_to_array(d.penerima, ','))
           )
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec
             WHERE rec = ANY($2::text[])
           )
        ORDER BY d.tgl DESC
      `;
      params = [division, [...subDivs, division]];
    } else {
      // User sees:
      // - Documents sent by them
      // - Documents where they or one of their group labels is in the recipients
      // Higher jabatan in same division also sees documents sent to lower jabatan in that division
      const userGroups = [displayName];
      const divisionLabels = {
        marketing: 'Marketing',
        sdm: 'SDM',
        keuangan: 'Keuangan',
        operasional: 'Operasional',
        it: 'IT'
      };
      const mappedDiv = divisionLabels[division] || division;

      // Jabatan hierarchy: higher index = higher level
      const jabatanHierarchy = ['Staff', 'Asisten Manager', 'Manager', 'Senior Manager', 'Direktur', 'Wakil Direktur', 'Wakil Direktur Utama', 'Direktur Umum'];
      const userLevel = jabatanHierarchy.indexOf(jabatan);

      if (mappedDiv) {
        // Always include own division group and own jabatan+divisi combo
        userGroups.push('Divisi ' + mappedDiv);
        if (jabatan) {
          userGroups.push(jabatan + ' ' + mappedDiv);
        }
        // If user is above Staff level, also include all lower jabatan+divisi combos in same division
        if (userLevel > 0) {
          jabatanHierarchy.slice(0, userLevel).forEach(lowerJab => {
            userGroups.push(lowerJab + ' ' + mappedDiv);
          });
        }
      }

      if (jabatan === 'Direktur Umum') {
        userGroups.push('Direktur Umum');
      } else if (jabatan === 'Wakil Direktur' || jabatan === 'Wakil Direktur Utama') {
        userGroups.push('Wakil Direktur');
        userGroups.push('Wakil Direktur Utama');
      } else if (jabatan === 'Direktur') {
        userGroups.push('Direktur');
      } else if (jabatan === 'SM' || jabatan === 'Senior Manager') {
        userGroups.push('Semua SM');
        userGroups.push('Semua Senior Manager');
      } else if (jabatan === 'Staff') {
        userGroups.push('Semua Staff');
      }

      query = `
        SELECT d.*, COALESCE(d.sender_division, u.division) AS sender_division
        FROM shared_documents d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.sender_name = $1
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec
             WHERE rec = ANY($2::text[])
           )
        ORDER BY d.tgl DESC
      `;
      params = [displayName, userGroups];
    }

    const result = await db.query(query, params);

    // Map database field names to what frontend expects (1 row = 1 upload, files = array)
    const mappedDocs = result.rows.map(mapDocRow);

    res.json(mappedDocs);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/documents/share/:token — resolve share link (requires login)
// 1 link = 1 upload: if the token belongs to a legacy split row (1 upload previously
// stored as N rows, one per file), merge all sibling rows into a single response
// so the recipient sees all files in that upload.
router.get('/share/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token tidak valid' });
    }
    const result = await db.query(
      'SELECT * FROM shared_documents WHERE share_token = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link tidak valid atau dokumen tidak ditemukan' });
    }
    const row = result.rows[0];
    const base = mapDocRow(row);
    // New single-row multi-file uploads already contain all files — return as-is
    if (base.files_count > 1) {
      return res.json(base);
    }
    // Legacy: look for sibling rows from the same upload
    // (same grouping key as frontend: document_number + sender + project + type + same minute)
    let siblings = [row];
    try {
      if ((row.document_number || '').trim()) {
        const sibRes = await db.query(
          `SELECT * FROM shared_documents
           WHERE COALESCE(TRIM(document_number), '') = $1
             AND COALESCE(TRIM(sender_name), '') = $2
             AND COALESCE(TRIM(project_name), '') = $3
             AND COALESCE(TRIM(document_type), '') = $4
             AND date_trunc('minute', tgl) = date_trunc('minute', $5::timestamptz)`,
          [
            (row.document_number || '').trim(),
            (row.sender_name || '').trim(),
            (row.project_name || '').trim(),
            (row.document_type || '').trim(),
            row.tgl
          ]
        );
        if (sibRes.rows.length > 1) {
          siblings = sibRes.rows;
        }
      }
    } catch (e) {
      console.error('Error finding share siblings:', e);
      siblings = [row];
    }
    if (siblings.length <= 1) {
      return res.json(base);
    }
    // Merge sibling files into one upload response
    const mergedFiles = [];
    const seen = new Set();
    siblings.forEach(r => {
      normalizeFiles(r).forEach(f => {
        if (!seen.has(f.path)) { seen.add(f.path); mergedFiles.push(f); }
      });
    });
    let displayName = row.document_name || '';
    const prefixes = siblings.map(r => (r.document_name || '').split(' - ')[0].trim()).filter(Boolean);
    if (prefixes.length === siblings.length && new Set(prefixes).size === 1) {
      displayName = prefixes[0];
    }
    return res.json({
      ...base,
      document_name: displayName,
      file: mergedFiles.length > 0 ? mergedFiles[0].path : base.file,
      files: mergedFiles,
      files_count: mergedFiles.length,
      _groupIds: siblings.map(r => r.id),
      _isGrouped: true
    });
  } catch (err) {
    console.error('Error resolving share link:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents/submit_document
router.post('/submit_document', upload.array('files', 20), async (req, res) => {
  try {
    const { project_name, document_type, sub_tipe, document_name, document_number, description, penerima, senderName, senderDivision, userId, tgl } = req.body;

    if (!document_type || !document_number) {
      if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) { } });
      return res.status(400).json({ error: 'Document type and document number are required' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'File upload is required' });
    }

    // Server-side validation: Staff cannot upload 'Kontrak'
    if (document_type.toLowerCase() === 'kontrak' && req.user.role === 'staff' && !req.user.is_admin) {
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (e) { } });
      return res.status(403).json({ error: 'Staf biasa tidak diperbolehkan mengunggah dokumen tipe Kontrak' });
    }

    let recipientsArray = [];
    if (penerima) {
      try {
        recipientsArray = JSON.parse(penerima);
      } catch (e) {
        if (typeof penerima === 'string') {
          recipientsArray = penerima.split(',').map(r => r.trim());
        }
      }
    }
    const penerimaString = recipientsArray.join(',');

    // 1 upload = 1 row, semua file disimpan dalam kolom files (JSONB).
    // file_path diisi file pertama untuk kompatibilitas dengan kode lama.
    const filesPayload = files.map(file => ({
      path: '/uploads/' + file.filename,
      originalName: file.originalname,
      size: file.size != null ? file.size : null
    }));
    const firstFilePath = filesPayload[0].path;
    const docName = (document_name || '').trim();

    const insertQuery = tgl
      ? `INSERT INTO shared_documents
         (project_name, document_type, sub_tipe, document_name, document_number, description, file_path, files, sender_name, sender_division, user_id, penerima, tgl, share_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`
      : `INSERT INTO shared_documents
         (project_name, document_type, sub_tipe, document_name, document_number, description, file_path, files, sender_name, sender_division, user_id, penerima, share_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`;

    const queryParams = [
      project_name,
      document_type,
      sub_tipe || '',
      docName,
      document_number,
      description || '',
      firstFilePath,
      JSON.stringify(filesPayload),
      senderName || req.user.display_name,
      senderDivision || req.user.division,
      userId || req.user.id,
      penerimaString
    ];
    if (tgl) {
      queryParams.push(tgl);
    }
    queryParams.push(require('crypto').randomBytes(12).toString('hex'));

    const result = await db.query(insertQuery, queryParams);
    const newDoc = result.rows[0];

    // Trigger In-App Notification (Socket.io) + Web Push sekali per upload (bukan per file)
    const io = req.app.get('io');
    if (io) {
      io.emit('new_document_assigned', newDoc);
    }
    sendDocumentNotifications(newDoc, req, db, webpush).catch(err => {
      console.error('Failed to send push notifications:', err);
    });

    res.status(201).json({ message: 'Document uploaded successfully', count: filesPayload.length, documents: [newDoc] });
  } catch (err) {
    console.error('Error submitting document:', err);
    if (req.files) {
      req.files.forEach(f => {
        if (f.path && fs.existsSync(f.path)) {
          try { fs.unlinkSync(f.path); } catch (e) { }
        }
      });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

async function sendDocumentNotifications(newDoc, req, db, webpush) {
  const recipientsArray = (newDoc.penerima || '').split(',').map(r => r.trim());
  if (recipientsArray.length === 0) return;

  // 1. Fetch all users and find who should get this
  const usersRes = await db.query("SELECT * FROM users");
  const divisionLabels = { marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional', it: 'IT' };
  const jabatanHierarchy = ['Staff', 'Asisten Manager', 'Manager', 'Senior Manager', 'Direktur', 'Wakil Direktur', 'Wakil Direktur Utama', 'Direktur Umum'];

  const targetUserIds = [];
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
    // Don't send push to the sender themselves
    if (hasAccess && u.id !== req.user.id) {
      targetUserIds.push(u.id);
    }
  }

  if (targetUserIds.length === 0) return;

  // 2. Insert notifications to DB
  const notifMsg = `Dokumen Baru: ${newDoc.document_name}`;
  const insertedNotifs = [];
  for (const uid of targetUserIds) {
    const notifRes = await db.query(
      'INSERT INTO notifications (user_id, sender_id, document_id, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [uid, req.user.id, newDoc.id, notifMsg]
    );
    insertedNotifs.push(notifRes.rows[0]);
  }

  // Emit socket event with notification ID so frontend can track it
  const io = req.app.get('io');
  if (io) {
    insertedNotifs.forEach(notif => {
      io.to(`user_${notif.user_id}`).emit('new_persistent_notification', {
        ...notif,
        sender_name: newDoc.sender_name,
        document_name: newDoc.document_name
      });
    });
  }

  // 3. Fetch push subscriptions
  const placeholders = targetUserIds.map((_, i) => '$' + (i + 1)).join(',');
  const subsRes = await db.query(`SELECT * FROM push_subscriptions WHERE user_id IN (${placeholders})`, targetUserIds);

  const payload = JSON.stringify({
    title: 'Dokumen Baru Diterima',
    body: `Dokumen ${newDoc.document_name} (${newDoc.document_type}) telah dibagikan ke divisi Anda oleh ${newDoc.sender_name}.`,
    url: '/'
  });

  for (const sub of subsRes.rows) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };
    webpush.sendNotification(pushSub, payload).catch(err => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription has expired or is no longer valid, delete it
        db.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]).catch(console.error);
      } else {
        console.error('Push notification error:', err);
      }
    });
  }
}

// PUT /api/documents/edit_document
router.put('/edit_document', async (req, res) => {
  try {
    const { id, project_name, document_type, sub_tipe, document_name, document_number, description, penerima, tgl } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // Verify ownership and existence
    const docCheck = await db.query('SELECT user_id, sender_name FROM shared_documents WHERE id = $1', [id]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }

    const doc = docCheck.rows[0];
    if (doc.user_id !== req.user.id && req.user.role !== 'top management' && !req.user.is_admin) {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk mengubah dokumen ini' });
    }

    // Server-side validation: Staff cannot change document to 'Kontrak'
    if (document_type && document_type.toLowerCase() === 'kontrak' && req.user.role === 'staff' && !req.user.is_admin) {
      return res.status(403).json({ error: 'Staf biasa tidak diperbolehkan mengubah dokumen menjadi tipe Kontrak' });
    }

    let recipientsArray = [];
    if (penerima) {
      if (Array.isArray(penerima)) {
        recipientsArray = penerima;
      } else {
        try {
          recipientsArray = JSON.parse(penerima);
        } catch (e) {
          if (typeof penerima === 'string') {
            recipientsArray = penerima.split(',').map(r => r.trim());
          }
        }
      }
    }
    const penerimaString = recipientsArray.join(',');

    const updateQuery = tgl
      ? `UPDATE shared_documents 
         SET project_name = $1, 
             document_type = $2, 
             sub_tipe = $3, 
             document_name = $4, 
             document_number = $5, 
             description = $6, 
             penerima = $7,
             updated_at = NOW(),
             tgl = $8
         WHERE id = $9
         RETURNING *`
      : `UPDATE shared_documents 
         SET project_name = $1, 
             document_type = $2, 
             sub_tipe = $3, 
             document_name = $4, 
             document_number = $5, 
             description = $6, 
             penerima = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`;

    const queryParams = [project_name, document_type, sub_tipe, document_name, document_number, description, penerimaString];
    if (tgl) {
      queryParams.push(tgl, id);
    } else {
      queryParams.push(id);
    }

    const result = await db.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document updated successfully', document: result.rows[0] });
  } catch (err) {
    console.error('Error editing document:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Helper for document access control
async function checkDocumentAccess(doc, user) {
  const displayName = user.display_name;
  const role = user.role || 'staff';
  const division = user.division;
  const jabatan = user.jabatan || 'Staff';

  if (role === 'top management' || user.is_admin) {
    return true;
  }

  if (role === 'management' && (jabatan === 'SM' || jabatan === 'Senior Manager')) {
    let subDivs = [];
    if (division === 'keuangan') {
      subDivs = ['Payment', 'Payroll', 'IT', 'Keuangan', 'Accounting'];
    } else if (division === 'sdm') {
      subDivs = ['SDM', 'GA'];
    } else if (division === 'operasional') {
      subDivs = ['OPS', 'Pengadaan', 'operasional'];
    } else if (division === 'marketing') {
      subDivs = ['marketing'];
    }
    const allowedDivs = [...subDivs, division].map(d => d.toLowerCase());

    const queryCheck = await db.query(`
      SELECT 1 FROM shared_documents d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = $1 AND (
        d.sender_division = $2
        OR u.division = $2
        OR d.sender_name = ANY($3::text[])
        OR EXISTS (
          SELECT 1 FROM users u2 
          WHERE u2.division = $2 
            AND u2.display_name = ANY(string_to_array(d.penerima, ','))
        )
        OR EXISTS (
          SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec
          WHERE rec = ANY($3::text[])
        )
      )
    `, [doc.id, division, [...subDivs, division]]);

    return queryCheck.rows.length > 0;
  }

  // Staff / management access with hierarchy
  const userGroups = [displayName];
  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional',
    it: 'IT'
  };
  const mappedDiv = divisionLabels[division] || division;
  const jabatanHierarchy = ['Staff', 'Asisten Manager', 'Manager', 'Senior Manager', 'SM', 'Direktur', 'Wakil Direktur', 'Wakil Direktur Utama', 'Direktur Umum'];
  const userLevel = jabatanHierarchy.indexOf(jabatan);

  if (mappedDiv) {
    userGroups.push('Divisi ' + mappedDiv);
    if (jabatan) {
      userGroups.push(jabatan + ' ' + mappedDiv);
    }
    // Higher-level users can also see docs sent to lower jabatan in same division
    if (userLevel > 0) {
      jabatanHierarchy.slice(0, userLevel).forEach(lowerJab => {
        userGroups.push(lowerJab + ' ' + mappedDiv);
      });
    }
  }
  if (jabatan === 'Direktur Umum') {
    userGroups.push('Direktur Umum');
  } else if (jabatan === 'Wakil Direktur' || jabatan === 'Wakil Direktur Utama') {
    userGroups.push('Wakil Direktur');
    userGroups.push('Wakil Direktur Utama');
  } else if (jabatan === 'Direktur') {
    userGroups.push('Direktur');
  } else if (jabatan === 'SM' || jabatan === 'Senior Manager') {
    userGroups.push('Semua SM');
    userGroups.push('Semua Senior Manager');
  } else if (jabatan === 'Staff') {
    userGroups.push('Semua Staff');
  }

  const recipients = (doc.penerima || '').split(',').map(r => r.trim());
  const hasGroupAccess = userGroups.some(g => recipients.includes(g));

  return doc.sender_name === displayName || hasGroupAccess;
}

// GET /api/documents/preview/:id — supports ?f=<filename> or ?i=<index> for multi-file docs (1 row = 1 upload)
router.get('/preview/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM shared_documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Document not found');
    }
    const doc = result.rows[0];
    const hasAccess = await checkDocumentAccess(doc, req.user);
    if (!hasAccess) {
      return res.status(403).send('Anda tidak memiliki akses ke dokumen ini');
    }

    const files = normalizeFiles(doc);
    let target = files[0] ? files[0].path : doc.file_path;
    if (req.query.i != null && req.query.i !== '') {
      const idx = parseInt(req.query.i, 10);
      if (!isNaN(idx) && files[idx]) target = files[idx].path;
    } else if (req.query.f) {
      const want = path.basename(String(req.query.f));
      const found = files.find(f => path.basename(f.path) === want);
      if (found) target = found.path;
    }

    const filePath = path.join(__dirname, '../..', target);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found on server');
    }
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error previewing document:', err);
    res.status(500).send('Server error');
  }
});

// GET /api/documents/viewonly
router.get('/viewonly', async (req, res) => {
  const { file_path } = req.query;
  if (!file_path) {
    return res.status(400).send('File path is required');
  }

  const filename = path.basename(file_path);
  const dbPath = '/uploads/' + filename;

  try {
    let docResult = await db.query('SELECT * FROM shared_documents WHERE file_path = $1', [dbPath]);
    if (docResult.rows.length === 0) {
      // File may be the 2nd..nth file of a multi-file upload (stored in files JSONB)
      docResult = await db.query('SELECT * FROM shared_documents WHERE files @> $1::jsonb', [JSON.stringify([{ path: dbPath }])]);
    }
    if (docResult.rows.length === 0) {
      // Fallback: match any file basename inside files array
      const allDocs = await db.query('SELECT * FROM shared_documents');
      const match = allDocs.rows.find(r => normalizeFiles(r).some(f => path.basename(f.path) === filename));
      if (!match) {
        return res.status(404).send('Document not found');
      }
      docResult = { rows: [match] };
    }

    const doc = docResult.rows[0];
    const hasAccess = await checkDocumentAccess(doc, req.user);
    if (!hasAccess) {
      return res.status(403).send('Anda tidak memiliki akses ke dokumen ini');
    }

    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error fetching file in viewonly:', err);
    res.status(500).send('Server error');
  }
});

// POST /api/documents/:id/view — log a view event
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    await db.query(
      `INSERT INTO document_views (document_id, viewer_name, viewer_jabatan, viewer_division)
       VALUES ($1, $2, $3, $4)`,
      [id, user.display_name, user.jabatan || null, user.division || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error logging document view:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/documents/:id/views — list view history for a document
router.get('/:id/views', async (req, res) => {
  try {
    const { id } = req.params;
    // Only sender or top management can see full view history
    const docResult = await db.query('SELECT sender_name FROM shared_documents WHERE id = $1', [id]);
    if (docResult.rows.length === 0) return res.status(404).json({ error: 'Dokumen tidak ditemukan' });

    const result = await db.query(
      `SELECT viewer_name, viewer_jabatan, viewer_division, viewed_at
       FROM document_views
       WHERE document_id = $1
       ORDER BY viewed_at DESC
       LIMIT 50`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching document views:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// DELETE /api/documents/:id — delete a document (owner, top management, or admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const docResult = await db.query('SELECT * FROM shared_documents WHERE id = $1', [id]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dokumen tidak ditemukan' });
    }

    const doc = docResult.rows[0];

    // Only owner, top management, or admin can delete
    if (doc.user_id !== user.id && user.role !== 'top management' && !user.is_admin && user.username !== 'admin' && user.username !== 'administrator') {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk menghapus dokumen ini' });
    }

    // Delete all physical files in this upload (1 row may hold multiple files)
    const filesToDelete = normalizeFiles(doc);
    if (doc.file_path && !filesToDelete.some(f => f.path === doc.file_path)) {
      filesToDelete.push({ path: doc.file_path });
    }
    for (const f of filesToDelete) {
      const filePath = path.join(__dirname, '../..', f.path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
      }
    }

    await db.query('DELETE FROM shared_documents WHERE id = $1', [id]);
    res.json({ message: 'Dokumen berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/documents/bulk_delete - delete multiple documents
router.post('/bulk_delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Tidak ada dokumen yang dipilih' });
    }
    const user = req.user;

    let deletedCount = 0;

    for (const id of ids) {
      const docResult = await db.query('SELECT * FROM shared_documents WHERE id = $1', [id]);
      if (docResult.rows.length === 0) continue;

      const doc = docResult.rows[0];

      // Only owner, top management, or admin can delete
      if (doc.user_id !== user.id && user.role !== 'top management' && !user.is_admin && user.username !== 'admin' && user.username !== 'administrator') {
        continue;
      }

      // Delete all physical files in this upload (1 row may hold multiple files)
      const filesToDelete = normalizeFiles(doc);
      if (doc.file_path && !filesToDelete.some(f => f.path === doc.file_path)) {
        filesToDelete.push({ path: doc.file_path });
      }
      for (const f of filesToDelete) {
        const filePath = path.join(__dirname, '../..', f.path);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
        }
      }

      await db.query('DELETE FROM shared_documents WHERE id = $1', [id]);
      deletedCount++;
    }

    res.json({ message: 'Dokumen berhasil dihapus', deletedCount });
  } catch (err) {
    console.error('Error bulk deleting documents:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
