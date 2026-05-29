const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper function to check if user can access a page
async function canAccessPage(user, page) {
  // Top management can access everything
  if (user.role === 'top management') {
    return true;
  }

  // Public pages accessible to all authenticated users
  if (page.access_level === 'public') {
    return true;
  }

  // Check role-based access
  if (page.access_level === 'staff' && user.role === 'staff') {
    return true;
  }

  if (page.access_level === 'management' && (user.role === 'management' || user.role === 'top management')) {
    return true;
  }

  if (page.access_level === 'top_management' && user.role === 'top management') {
    return true;
  }

  // Check division-based access
  if (page.allowed_divisions) {
    const allowedDivs = page.allowed_divisions.split(',').map(d => d.trim());
    if (allowedDivs.includes(user.division)) {
      return true;
    }
  }

  return false;
}

// GET /api/notion/pages
router.get('/pages', async (req, res) => {
  try {
    const user = req.user;
    let query = 'SELECT id, title, icon, parent_id, is_database, database_view, properties, created_by, access_level, allowed_divisions, created_at, updated_at FROM notion_pages ORDER BY created_at ASC';
    
    const result = await db.query(query);
    
    // Filter pages based on user's access level
    const accessiblePages = [];
    for (const page of result.rows) {
      if (await canAccessPage(user, page)) {
        accessiblePages.push(page);
      }
    }
    
    res.json(accessiblePages);
  } catch (err) {
    console.error('Error fetching notion pages:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/notion/pages/:id
router.get('/pages/:id', async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const pageRes = await db.query('SELECT * FROM notion_pages WHERE id = $1', [id]);
    if (pageRes.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    const page = pageRes.rows[0];
    
    // Check access permission
    if (!(await canAccessPage(user, page))) {
      return res.status(403).json({ error: 'Access denied to this page' });
    }
    
    // Fetch children (only those user can access)
    const childrenRes = await db.query(
      'SELECT id, title, icon, parent_id, is_database, database_view, properties, access_level, allowed_divisions, created_at, updated_at FROM notion_pages WHERE parent_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    const accessibleChildren = [];
    for (const child of childrenRes.rows) {
      if (await canAccessPage(user, child)) {
        accessibleChildren.push(child);
      }
    }
    
    res.json({
      page,
      children: accessibleChildren
    });
  } catch (err) {
    console.error('Error fetching notion page detail:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/notion/pages
router.post('/pages', async (req, res) => {
  try {
    const user = req.user;
    const { title, content, icon, cover_image, parent_id, is_database, database_view, properties, access_level, allowed_divisions } = req.body;
    const userId = req.user ? req.user.id : null;
    
    const finalAccessLevel = access_level || 'public';
    
    // Validate access_level
    const validAccessLevels = ['public', 'staff', 'management', 'top_management'];
    if (!validAccessLevels.includes(finalAccessLevel)) {
      return res.status(400).json({ error: 'Invalid access_level' });
    }
    
    // Validate allowed_divisions if provided
    let finalAllowedDivisions = null;
    if (allowed_divisions) {
      const validDivisions = ['marketing', 'sdm', 'keuangan', 'operasional'];
      const divArray = Array.isArray(allowed_divisions) ? allowed_divisions : allowed_divisions.split(',').map(d => d.trim());
      const invalidDivs = divArray.filter(d => !validDivisions.includes(d));
      if (invalidDivs.length > 0) {
        return res.status(400).json({ error: `Invalid divisions: ${invalidDivs.join(', ')}` });
      }
      finalAllowedDivisions = divArray.join(',');
    }
    
    const result = await db.query(
      `INSERT INTO notion_pages (title, content, icon, cover_image, parent_id, is_database, database_view, properties, created_by, access_level, allowed_divisions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        title || 'Untitled',
        content || '',
        icon || '📄',
        cover_image || null,
        parent_id || null,
        is_database || false,
        database_view || 'table',
        properties ? (typeof properties === 'string' ? properties : JSON.stringify(properties)) : '{}',
        userId,
        finalAccessLevel,
        finalAllowedDivisions
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating notion page:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/notion/pages/:id
router.put('/pages/:id', async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, content, icon, cover_image, parent_id, is_database, database_view, properties, access_level, allowed_divisions } = req.body;
    
    const checkRes = await db.query('SELECT * FROM notion_pages WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const existing = checkRes.rows[0];
    
    // Anyone can edit and change access levels
    let updatedAccessLevel = existing.access_level;
    if (access_level !== undefined) {
      const validAccessLevels = ['public', 'staff', 'management', 'top_management'];
      if (!validAccessLevels.includes(access_level)) {
        return res.status(400).json({ error: 'Invalid access_level' });
      }
      updatedAccessLevel = access_level;
    }
    
    // Validate and update allowed_divisions
    let updatedAllowedDivisions = existing.allowed_divisions;
    if (allowed_divisions !== undefined) {
      if (allowed_divisions) {
        const validDivisions = ['marketing', 'sdm', 'keuangan', 'operasional'];
        const divArray = Array.isArray(allowed_divisions) ? allowed_divisions : allowed_divisions.split(',').map(d => d.trim());
        const invalidDivs = divArray.filter(d => !validDivisions.includes(d));
        if (invalidDivs.length > 0) {
          return res.status(400).json({ error: `Invalid divisions: ${invalidDivs.join(', ')}` });
        }
        updatedAllowedDivisions = divArray.join(',');
      } else {
        updatedAllowedDivisions = null;
      }
    }
    
    const updatedTitle = title !== undefined ? title : existing.title;
    const updatedContent = content !== undefined ? content : existing.content;
    const updatedIcon = icon !== undefined ? icon : existing.icon;
    const updatedCoverImage = cover_image !== undefined ? cover_image : existing.cover_image;
    const updatedParentId = parent_id !== undefined ? parent_id : existing.parent_id;
    const updatedIsDatabase = is_database !== undefined ? is_database : existing.is_database;
    const updatedDatabaseView = database_view !== undefined ? database_view : existing.database_view;
    
    let updatedProperties = existing.properties;
    if (properties !== undefined) {
      updatedProperties = typeof properties === 'string' ? JSON.parse(properties) : properties;
    }
    
    const result = await db.query(
      `UPDATE notion_pages
       SET title = $1, content = $2, icon = $3, cover_image = $4, parent_id = $5, is_database = $6, database_view = $7, properties = $8, access_level = $9, allowed_divisions = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [updatedTitle, updatedContent, updatedIcon, updatedCoverImage, updatedParentId, updatedIsDatabase, updatedDatabaseView, updatedProperties, updatedAccessLevel, updatedAllowedDivisions, id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating notion page:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/notion/pages/:id
router.delete('/pages/:id', async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    
    // Check if page exists
    const pageRes = await db.query('SELECT * FROM notion_pages WHERE id = $1', [id]);
    if (pageRes.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const page = pageRes.rows[0];
    
    // Anyone can delete pages
    
    const deleteRes = await db.query('DELETE FROM notion_pages WHERE id = $1 RETURNING id', [id]);
    res.json({ message: 'Page deleted successfully', id });
  } catch (err) {
    console.error('Error deleting notion page:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
