const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

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
    const role = user.role || 'staff';
    const division = user.division;
    const jabatan = user.jabatan || 'Staff';

    let totalInQuery = '';
    let todayInQuery = '';
    let totalOutQuery = '';
    let todayOutQuery = '';
    let paramsIn = [];
    let paramsOut = [displayName];

    // For OUT: mirror the frontend "keluar" tab logic
    if (role === 'top management' || user.is_admin || user.username === 'admin' || user.username === 'administrator') {
      // Admin/Top management sees all documents (uses "semua" tab), so keluar = all docs
      totalOutQuery = 'SELECT COUNT(*) FROM shared_documents';
      todayOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE tgl >= CURRENT_DATE';
      paramsOut = [];
    } else if (role === 'management' && (jabatan === 'SM' || jabatan === 'Senior Manager')) {
      // Management sees own docs + docs from their division
      totalOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1 OR sender_division = $2';
      todayOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE (sender_name = $1 OR sender_division = $2) AND tgl >= CURRENT_DATE';
      paramsOut = [displayName, division];
    } else {
      // Staff only sees their own docs
      totalOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1';
      todayOutQuery = 'SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1 AND tgl >= CURRENT_DATE';
      paramsOut = [displayName];
    }

    if (role === 'top management' || user.is_admin || user.username === 'admin' || user.username === 'administrator') {
      totalInQuery = 'SELECT COUNT(*) FROM shared_documents';
      todayInQuery = 'SELECT COUNT(*) FROM shared_documents WHERE tgl >= CURRENT_DATE';
      paramsIn = [];
    } else if (role === 'management' && (jabatan === 'SM' || jabatan === 'Senior Manager')) {
      let targetDivisions = [division];
      let subDivs = [];
      if (division === 'keuangan') subDivs = ['Payment', 'Payroll', 'IT', 'Keuangan', 'Accounting'];
      else if (division === 'sdm') subDivs = ['SDM', 'GA'];
      else if (division === 'operasional') subDivs = ['OPS', 'Pengadaan', 'operasional'];
      else if (division === 'marketing') subDivs = ['marketing'];

      totalInQuery = `
        SELECT COUNT(DISTINCT d.id) FROM shared_documents d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.sender_division = $1 OR u.division = $1
           OR EXISTS (
             SELECT 1 FROM users u2 WHERE u2.division = $1 AND u2.display_name = ANY(string_to_array(d.penerima, ','))
           )
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec WHERE rec = ANY($2::text[])
           )
      `;
      todayInQuery = `
        SELECT COUNT(DISTINCT d.id) FROM shared_documents d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE (d.sender_division = $1 OR u.division = $1
           OR EXISTS (
             SELECT 1 FROM users u2 WHERE u2.division = $1 AND u2.display_name = ANY(string_to_array(d.penerima, ','))
           )
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec WHERE rec = ANY($2::text[])
           )) AND d.tgl >= CURRENT_DATE
      `;
      paramsIn = [division, [...subDivs, division]];
    } else {
      const userGroups = [displayName];
      const divisionLabels = { marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional',
    it: 'IT' };
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

      totalInQuery = `
        SELECT COUNT(*) FROM shared_documents d
        WHERE EXISTS (
          SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec WHERE rec = ANY($1::text[])
        )
      `;
      todayInQuery = `
        SELECT COUNT(*) FROM shared_documents d
        WHERE EXISTS (
          SELECT 1 FROM unnest(string_to_array(d.penerima, ',')) rec WHERE rec = ANY($1::text[])
        ) AND d.tgl >= CURRENT_DATE
      `;
      paramsIn = [userGroups];
    }

    const totalOut = await db.query(totalOutQuery, paramsOut);
    const todayOut = await db.query(todayOutQuery, paramsOut);
    const totalIn = await db.query(totalInQuery, paramsIn);
    const todayIn = await db.query(todayInQuery, paramsIn);

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

    if (role === 'top management' || user.is_admin || user.username === 'admin' || user.username === 'administrator') {
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

    // Map database field names to what frontend expects
    const mappedDocs = result.rows.map(row => ({
      id: row.id,
      project_name: row.project_name,
      document_type: row.document_type,
      sub_tipe: row.sub_tipe,
      document_name: row.document_name,
      document_number: row.document_number,
      description: row.description,
      file: row.file_path,
      senderName: row.sender_name,
      senderDivision: row.sender_division,
      penerima: row.penerima,
      tgl: row.tgl,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    res.json(mappedDocs);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/documents/submit_document
router.post('/submit_document', upload.single('file'), async (req, res) => {
  try {
    const { project_name, document_type, sub_tipe, document_name, document_number, description, penerima, senderName, senderDivision, userId, tgl } = req.body;

    if (!document_type || !document_number) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Document type and document number are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File upload is required' });
    }

    // Server-side validation: Staff cannot upload 'Kontrak'
    if (document_type.toLowerCase() === 'kontrak' && req.user.role === 'staff' && !req.user.is_admin) {
      fs.unlinkSync(req.file.path);
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

    const filePath = '/uploads/' + req.file.filename;

    const insertQuery = tgl
      ? `INSERT INTO shared_documents 
         (project_name, document_type, sub_tipe, document_name, document_number, description, file_path, sender_name, sender_division, user_id, penerima, tgl)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`
      : `INSERT INTO shared_documents 
         (project_name, document_type, sub_tipe, document_name, document_number, description, file_path, sender_name, sender_division, user_id, penerima)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`;

    const queryParams = [
      project_name,
      document_type,
      sub_tipe || '',
      document_name || '',
      document_number,
      description || '',
      filePath,
      senderName || req.user.display_name,
      senderDivision || req.user.division,
      userId || req.user.id,
      penerimaString
    ];
    if (tgl) {
      queryParams.push(tgl);
    }

    const result = await db.query(insertQuery, queryParams);

    res.status(201).json({ message: 'Document uploaded successfully', document: result.rows[0] });
  } catch (err) {
    console.error('Error submitting document:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
    res.status(500).json({ error: 'Database error' });
  }
});

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

  if (role === 'top management' || user.is_admin || user.username === 'admin' || user.username === 'administrator') {
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

// GET /api/documents/preview/:id
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

    const filePath = path.join(__dirname, '../..', doc.file_path);
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
    const docResult = await db.query('SELECT * FROM shared_documents WHERE file_path = $1', [dbPath]);
    if (docResult.rows.length === 0) {
      return res.status(404).send('Document not found');
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

    // Delete physical file
    const filePath = path.join(__dirname, '../..', doc.file_path);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
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
      
      // Delete physical file
      const filePath = path.join(__dirname, '../..', doc.file_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Error deleting file:', e); }
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
