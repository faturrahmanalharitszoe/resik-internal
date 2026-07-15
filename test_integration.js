process.env.NODE_ENV = 'test';
require('dotenv').config();
const { Pool } = require('pg');
const http = require('http');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const API_URL = 'http://localhost:' + (process.env.PORT || 3002);

// Helper to make HTTP requests
function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Bypass': 'true',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, rawBody: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, rawBody: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Custom multipart/form-data helper for upload
function uploadFile(path, headers = {}, fields = {}, fileContent = 'dummy pdf content', fileName = 'test.pdf') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    let body = '';
    for (const [key, value] of Object.entries(fields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;
    body += `${fileContent}\r\n`;
    body += `--${boundary}--\r\n`;

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
        'X-Test-Bypass': 'true',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, rawBody: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, rawBody: data });
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING INTEGRATION TESTS ---');

  // 1. Login as Staff Marketing
  console.log('Logging in as Staff Marketing...');
  const loginStaffRes = await request('POST', '/api/auth/login', {}, {
    username: 'marketing_staff',
    password: 'password123'
  });
  if (loginStaffRes.status !== 200) {
    throw new Error('Failed to login as marketing_staff: ' + JSON.stringify(loginStaffRes.body));
  }
  const staffToken = loginStaffRes.body.token;
  console.log('Staff Marketing logged in successfully.');

  // 2. Login as SM Keuangan
  console.log('Logging in as SM Keuangan...');
  const loginSmRes = await request('POST', '/api/auth/login', {}, {
    username: 'keuangan_sm',
    password: 'password123'
  });
  if (loginSmRes.status !== 200) {
    throw new Error('Failed to login as keuangan_sm: ' + JSON.stringify(loginSmRes.body));
  }
  const smToken = loginSmRes.body.token;
  console.log('SM Keuangan logged in successfully.');

  // 3. Login as Staff Keuangan
  console.log('Logging in as Staff Keuangan...');
  const loginStaffKeuRes = await request('POST', '/api/auth/login', {}, {
    username: 'keuangan_staff',
    password: 'password123'
  });
  if (loginStaffKeuRes.status !== 200) {
    throw new Error('Failed to login as keuangan_staff: ' + JSON.stringify(loginStaffKeuRes.body));
  }
  const staffKeuToken = loginStaffKeuRes.body.token;
  console.log('Staff Keuangan logged in successfully.');

  // 4. Staff Marketing uploads document to 'SM Keuangan'
  console.log('Staff Marketing uploads document targeted to SM Keuangan...');
  const uploadRes = await uploadFile(
    '/api/documents/submit_document',
    { Authorization: `Bearer ${staffToken}` },
    {
      project_name: 'Proyek A',
      document_type: 'Laporan',
      sub_tipe: 'Bulanan',
      document_number: 'DOC-2026-001',
      document_name: 'Laporan Bulanan Marketing ke SM Keuangan',
      description: 'Ini deskripsi laporan',
      penerima: JSON.stringify(['SM Keuangan']),
      senderName: 'Staff Marketing',
      senderDivision: 'marketing',
      userId: loginStaffRes.body.user.id
    }
  );

  if (uploadRes.status !== 201) {
    throw new Error('Failed to upload document: ' + JSON.stringify(uploadRes.body));
  }
  const docId = uploadRes.body.document.id;
  console.log(`Document uploaded successfully. ID: ${docId}`);

  // 5. Verify SM Keuangan can see the document
  console.log('Verifying SM Keuangan can see the document...');
  const smDocsRes = await request('GET', '/api/documents', { Authorization: `Bearer ${smToken}` });
  if (smDocsRes.status !== 200) {
    throw new Error('Failed to fetch documents as SM: ' + JSON.stringify(smDocsRes.body));
  }
  const foundSm = smDocsRes.body.find(d => d.id === docId);
  if (!foundSm) {
    throw new Error('SM Keuangan did NOT receive the document in list!');
  }
  console.log('SM Keuangan successfully verified to see the document.');

  // 6. Verify SM Keuangan can preview the document
  console.log('Verifying SM Keuangan can preview the document...');
  const smPreviewRes = await request('GET', `/api/documents/preview/${docId}`, { Authorization: `Bearer ${smToken}` });
  if (smPreviewRes.status !== 200) {
    throw new Error(`SM Keuangan preview failed with status ${smPreviewRes.status}: ${smPreviewRes.rawBody}`);
  }
  console.log('SM Keuangan preview verified successfully.');

  // 7. Verify Staff Keuangan CANNOT see the document
  console.log('Verifying Staff Keuangan cannot see the document in list...');
  const staffKeuDocsRes = await request('GET', '/api/documents', { Authorization: `Bearer ${staffKeuToken}` });
  if (staffKeuDocsRes.status !== 200) {
    throw new Error('Failed to fetch documents as Staff Keuangan: ' + JSON.stringify(staffKeuDocsRes.body));
  }
  const foundStaffKeu = staffKeuDocsRes.body.find(d => d.id === docId);
  if (foundStaffKeu) {
    throw new Error('Staff Keuangan should not see this document, but it was found in their list!');
  }
  console.log('Staff Keuangan successfully verified to NOT see the document in list.');

  // 8. Verify Staff Keuangan is blocked (403 Forbidden) from previewing the document
  console.log('Verifying Staff Keuangan is blocked from previewing...');
  const staffKeuPreviewRes = await request('GET', `/api/documents/preview/${docId}`, { Authorization: `Bearer ${staffKeuToken}` });
  if (staffKeuPreviewRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Staff Keuangan preview, but got ${staffKeuPreviewRes.status}`);
  }
  console.log('Staff Keuangan preview block verified successfully (got 403).');

  // 9. Register & test Direktur Umum and Wakil Direktur roles
  console.log('Registering test user as Direktur Umum...');
  const regDirUmumRes = await request('POST', '/api/auth/register', {}, {
    username: 'dir_umum_test_' + Math.random().toString(36).substring(7),
    display_name: 'Direktur Umum Test',
    email: 'dir_umum_' + Math.random().toString(36).substring(7) + '@example.com',
    password: 'password123',
    division: 'operasional',
    role: 'top management',
    jabatan: 'Direktur Umum'
  });
  if (regDirUmumRes.status !== 201) {
    throw new Error('Failed to register Direktur Umum: ' + JSON.stringify(regDirUmumRes.body));
  }
  const dirUmumToken = regDirUmumRes.body.token;

  console.log('Registering test user as Wakil Direktur...');
  const regWadirRes = await request('POST', '/api/auth/register', {}, {
    username: 'wadir_test_' + Math.random().toString(36).substring(7),
    display_name: 'Wakil Direktur Test',
    email: 'wadir_' + Math.random().toString(36).substring(7) + '@example.com',
    password: 'password123',
    division: 'operasional',
    role: 'top management',
    jabatan: 'Wakil Direktur'
  });
  if (regWadirRes.status !== 201) {
    throw new Error('Failed to register Wakil Direktur: ' + JSON.stringify(regWadirRes.body));
  }
  const wadirToken = regWadirRes.body.token;

  // Staff Marketing uploads document targeted to Direktur Umum
  console.log('Staff Marketing uploads document targeted to Direktur Umum...');
  const uploadDirUmumRes = await uploadFile(
    '/api/documents/submit_document',
    { Authorization: `Bearer ${staffToken}` },
    {
      project_name: 'Proyek A',
      document_type: 'LOI',
      sub_tipe: 'Penawaran',
      document_number: 'LOI-2026-999',
      document_name: 'LOI Penawaran Kerjasama',
      description: 'Ditujukan ke Direktur Umum',
      penerima: JSON.stringify(['Direktur Umum']),
      senderName: 'Staff Marketing',
      senderDivision: 'marketing',
      userId: loginStaffRes.body.user.id
    }
  );
  if (uploadDirUmumRes.status !== 201) {
    throw new Error('Failed to upload LOI: ' + JSON.stringify(uploadDirUmumRes.body));
  }
  const loiDocId = uploadDirUmumRes.body.document.id;

  // Verify Direktur Umum can see it
  console.log('Verifying Direktur Umum can see the document...');
  const dirUmumDocsRes = await request('GET', '/api/documents', { Authorization: `Bearer ${dirUmumToken}` });
  if (dirUmumDocsRes.status !== 200) {
    throw new Error('Failed to fetch documents as Direktur Umum');
  }
  if (!dirUmumDocsRes.body.find(d => d.id === loiDocId)) {
    throw new Error('Direktur Umum could NOT see the document targeted to Direktur Umum');
  }

  // Verify Wakil Direktur can see it (as top management)
  console.log('Verifying Wakil Direktur can see the document...');
  const wadirDocsRes = await request('GET', '/api/documents', { Authorization: `Bearer ${wadirToken}` });
  if (wadirDocsRes.status !== 200) {
    throw new Error('Failed to fetch documents as Wakil Direktur');
  }
  if (!wadirDocsRes.body.find(d => d.id === loiDocId)) {
    throw new Error('Wakil Direktur could NOT see the document (top management should see all)');
  }
  console.log('Direktur Umum and Wakil Direktur access verified successfully.');

  // --- ADMIN PANEL API TESTS ---
  console.log('Starting Admin Panel API tests...');

  // 1. Login as Admin
  console.log('Logging in as admin...');
  const loginAdminRes = await request('POST', '/api/auth/login', {}, {
    username: 'admin',
    password: 'admin123'
  });
  if (loginAdminRes.status !== 200) {
    throw new Error('Failed to login as admin: ' + JSON.stringify(loginAdminRes.body));
  }
  const adminToken = loginAdminRes.body.token;
  const adminId = loginAdminRes.body.user.id;
  console.log('Admin logged in successfully.');

  // 2. Verify non-admin is blocked
  console.log('Verifying non-admin staff token is blocked from admin routes...');
  const nonAdminGetUsersRes = await request('GET', '/api/admin/users', { Authorization: `Bearer ${staffToken}` });
  if (nonAdminGetUsersRes.status !== 403) {
    throw new Error('Expected 403 Forbidden for non-admin on GET /api/admin/users, got ' + nonAdminGetUsersRes.status);
  }
  console.log('Non-admin successfully blocked.');

  // 3. Verify admin can list users
  console.log('Verifying admin can list users...');
  const adminGetUsersRes = await request('GET', '/api/admin/users', { Authorization: `Bearer ${adminToken}` });
  if (adminGetUsersRes.status !== 200) {
    throw new Error('Failed to list users as admin: ' + JSON.stringify(adminGetUsersRes.body));
  }
  if (!Array.isArray(adminGetUsersRes.body) || adminGetUsersRes.body.length === 0) {
    throw new Error('Invalid users list returned: ' + JSON.stringify(adminGetUsersRes.body));
  }
  console.log('Admin successfully listed users.');

  // 4. Verify admin can create user
  console.log('Verifying admin can create user...');
  const testUsername = 'admin_test_user';
  const testEmail = 'admin_test_user@example.com';
  const adminCreateUserRes = await request('POST', '/api/admin/users', { Authorization: `Bearer ${adminToken}` }, {
    username: testUsername,
    display_name: 'Admin Test User',
    email: testEmail,
    password: 'password123',
    division: null,
    role: 'staff',
    jabatan: 'Staff Testing',
    is_admin: false
  });
  if (adminCreateUserRes.status !== 201) {
    throw new Error('Admin failed to create user: ' + JSON.stringify(adminCreateUserRes.body));
  }
  const createdUserId = adminCreateUserRes.body.id;
  console.log('User created successfully by admin. ID: ' + createdUserId);

  // 5. Verify admin can edit user
  console.log('Verifying admin can edit user...');
  const adminEditUserRes = await request('PUT', `/api/admin/users/${createdUserId}`, { Authorization: `Bearer ${adminToken}` }, {
    display_name: 'Admin Test User Edited',
    email: testEmail,
    division: null,
    role: 'management',
    jabatan: 'SM Testing',
    is_admin: true
  });
  if (adminEditUserRes.status !== 200) {
    throw new Error('Admin failed to edit user: ' + JSON.stringify(adminEditUserRes.body));
  }
  if (adminEditUserRes.body.display_name !== 'Admin Test User Edited' || adminEditUserRes.body.is_admin !== true) {
    throw new Error('Edited user details mismatch: ' + JSON.stringify(adminEditUserRes.body));
  }
  console.log('User edited successfully by admin.');

  // 6. Verify admin can reset password
  console.log('Verifying admin can reset password...');
  const adminResetPwdRes = await request('PUT', `/api/admin/users/${createdUserId}/password`, { Authorization: `Bearer ${adminToken}` }, {
    password: 'newpassword123'
  });
  if (adminResetPwdRes.status !== 200) {
    throw new Error('Admin failed to reset password: ' + JSON.stringify(adminResetPwdRes.body));
  }
  console.log('Password reset successfully by admin.');

  // 7. Verify admin cannot delete themselves
  console.log('Verifying admin cannot delete their own account...');
  const adminDeleteSelfRes = await request('DELETE', `/api/admin/users/${adminId}`, { Authorization: `Bearer ${adminToken}` });
  if (adminDeleteSelfRes.status !== 400) {
    throw new Error('Expected 400 Bad Request when deleting self, got ' + adminDeleteSelfRes.status);
  }
  console.log('Admin self-deletion blocked successfully.');

  // 8. Verify admin can delete user
  console.log('Verifying admin can delete user...');
  const adminDeleteUserRes = await request('DELETE', `/api/admin/users/${createdUserId}`, { Authorization: `Bearer ${adminToken}` });
  if (adminDeleteUserRes.status !== 200) {
    throw new Error('Admin failed to delete user: ' + JSON.stringify(adminDeleteUserRes.body));
  }
  console.log('User deleted successfully by admin.');

  console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
  await pool.end();
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  pool.end();
  process.exit(1);
});
