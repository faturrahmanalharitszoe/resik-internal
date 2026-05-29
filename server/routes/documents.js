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
    const result = await db.query('SELECT id, name FROM projects ORDER BY name ASC');
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
      operasional: 'Operasional'
    };
    const mapped = result.rows.map(row => ({
      username: row.username,
      name: row.name,
      role: row.role,
      divisi: divisionLabels[row.divisi] || row.divisi,
      jabatan: row.jabatan
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

    // Sent total
    const totalOut = await db.query(
      'SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1',
      [displayName]
    );

    // Sent today
    const todayOut = await db.query(
      "SELECT COUNT(*) FROM shared_documents WHERE sender_name = $1 AND tgl >= CURRENT_DATE",
      [displayName]
    );

    // Received total
    const totalIn = await db.query(
      "SELECT COUNT(*) FROM shared_documents WHERE $1 = ANY(string_to_array(penerima, ','))",
      [displayName]
    );

    // Received today
    const todayIn = await db.query(
      "SELECT COUNT(*) FROM shared_documents WHERE $1 = ANY(string_to_array(penerima, ',')) AND tgl >= CURRENT_DATE",
      [displayName]
    );

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

    if (role === 'top management') {
      // Direktur sees all documents
      query = 'SELECT * FROM shared_documents ORDER BY tgl DESC';
    } else if (role === 'management' && jabatan === 'SM') {
      // SM sees division documents
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
        SELECT DISTINCT d.* 
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
      // Staff sees:
      // - Documents sent by them
      // - Documents where they or one of their group labels is in the recipients
      const userGroups = [displayName];
      const divisionLabels = {
        marketing: 'Marketing',
        sdm: 'SDM',
        keuangan: 'Keuangan',
        operasional: 'Operasional'
      };
      const mappedDiv = divisionLabels[division] || division;
      if (mappedDiv) {
        userGroups.push('Divisi ' + mappedDiv);
        if (jabatan) {
          userGroups.push(jabatan + ' ' + mappedDiv);
        }
      }
      if (jabatan === 'Direktur Umum') {
        userGroups.push('Direktur Umum');
      } else if (jabatan === 'Wakil Direktur') {
        userGroups.push('Wakil Direktur');
      } else if (jabatan === 'Direktur') {
        userGroups.push('Direktur');
      } else if (jabatan === 'SM') {
        userGroups.push('Semua SM');
      } else if (jabatan === 'Staff') {
        userGroups.push('Semua Staff');
      }

      query = `
        SELECT * FROM shared_documents 
        WHERE sender_name = $1 
           OR EXISTS (
             SELECT 1 FROM unnest(string_to_array(penerima, ',')) rec
             WHERE rec = ANY($2::text[])
           )
        ORDER BY tgl DESC
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
      created_at: row.created_at
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
    
    if (!project_name || !document_type || !document_number) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Project name, document type, and document number are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File upload is required' });
    }

    // Server-side validation: Staff cannot upload 'Kontrak'
    if (document_type.toLowerCase() === 'kontrak' && req.user.role === 'staff') {
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
      try { fs.unlinkSync(req.file.path); } catch (e) {}
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
    if (doc.user_id !== req.user.id && req.user.role !== 'top management') {
      return res.status(403).json({ error: 'Anda tidak memiliki hak untuk mengubah dokumen ini' });
    }

    // Server-side validation: Staff cannot change document to 'Kontrak'
    if (document_type && document_type.toLowerCase() === 'kontrak' && req.user.role === 'staff') {
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
             penerima = $7
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

  if (role === 'top management') {
    return true;
  }

  if (role === 'management' && jabatan === 'SM') {
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

  // Staff access
  const userGroups = [displayName];
  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional'
  };
  const mappedDiv = divisionLabels[division] || division;
  if (mappedDiv) {
    userGroups.push('Divisi ' + mappedDiv);
    if (jabatan) {
      userGroups.push(jabatan + ' ' + mappedDiv);
    }
  }
  if (jabatan === 'Direktur Umum') {
    userGroups.push('Direktur Umum');
  } else if (jabatan === 'Wakil Direktur') {
    userGroups.push('Wakil Direktur');
  } else if (jabatan === 'Direktur') {
    userGroups.push('Direktur');
  } else if (jabatan === 'SM') {
    userGroups.push('Semua SM');
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

module.exports = router;
