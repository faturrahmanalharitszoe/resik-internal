const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

async function runMigrations() {
  console.log('🔄 Menjalankan migrasi database...');
  try {
    // 1. Add division column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS division VARCHAR(50) 
      CHECK (division IN ('marketing', 'sdm', 'keuangan', 'operasional'));
    `);

    // 2. Add role column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'staff' 
      CHECK (role IN ('staff', 'management', 'top management'));
    `);

    // 3. Add jabatan column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS jabatan VARCHAR(50) DEFAULT 'Staff';
    `);
    
    // 4. Ensure default group rooms exist
    const defaultRooms = ['General', 'Marketing', 'SDM', 'Keuangan', 'Operasional'];
    for (const name of defaultRooms) {
      const exists = await pool.query(
        "SELECT id FROM rooms WHERE name = $1 AND type = 'group' LIMIT 1",
        [name]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          "INSERT INTO rooms (name, type) VALUES ($1, 'group')",
          [name]
        );
        console.log(`✅ Room default dibuat: ${name}`);
      }
    }

    // 5. Create projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);

    // Seed default projects if none exist
    const projectsCount = await pool.query("SELECT COUNT(*) FROM projects");
    if (parseInt(projectsCount.rows[0].count, 10) === 0) {
      const defaultProjects = [
        'Project PO Marketing',
        'Pengadaan Unit Kerja',
        'Operasional Kantor',
        'Proyek Intranet'
      ];
      for (const name of defaultProjects) {
        await pool.query("INSERT INTO projects (name) VALUES ($1) ON CONFLICT DO NOTHING", [name]);
      }
      console.log('✅ Default projects seeded.');
    }

    // 6. Create shared_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_name VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        sub_tipe VARCHAR(100),
        document_name VARCHAR(255) NOT NULL,
        document_number VARCHAR(100) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        sender_name VARCHAR(100) NOT NULL,
        sender_division VARCHAR(50) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        penerima TEXT,
        tgl TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 7. Create notion_pages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notion_pages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        icon VARCHAR(50),
        cover_image VARCHAR(500),
        parent_id UUID REFERENCES notion_pages(id) ON DELETE CASCADE,
        is_database BOOLEAN DEFAULT FALSE,
        database_view VARCHAR(50) DEFAULT 'table',
        properties JSONB DEFAULT '{}'::jsonb,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        access_level VARCHAR(50) DEFAULT 'public' CHECK (access_level IN ('public', 'staff', 'management', 'top_management')),
        allowed_divisions TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 7a. Add access control columns if they don't exist
    await pool.query(`
      ALTER TABLE notion_pages
      ADD COLUMN IF NOT EXISTS access_level VARCHAR(50) DEFAULT 'public'
      CHECK (access_level IN ('public', 'staff', 'management', 'top_management'));
    `);

    await pool.query(`
      ALTER TABLE notion_pages
      ADD COLUMN IF NOT EXISTS allowed_divisions TEXT;
    `);

    // Seed default Notion pages if none exist
    const notionCount = await pool.query("SELECT COUNT(*) FROM notion_pages");
    if (parseInt(notionCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding default Notion pages...');
      
      // Get a default user to set as creator (or set NULL)
      const userRes = await pool.query("SELECT id FROM users LIMIT 1");
      const defaultUserId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

      // 1. Root Wiki: Dokumentasi Tim
      const wikiRes = await pool.query(`
        INSERT INTO notion_pages (title, content, icon, cover_image, is_database, created_by)
        VALUES (
          'Dokumentasi Tim',
          '# Dokumentasi & Wiki Internal Tim\n\nSelamat datang di wiki internal tim kami! Di sini Anda dapat menemukan panduan operasional, aturan kantor, dan materi referensi penting lainnya.\n\n### Cara menggunakan Wiki ini:\n1. Klik sub-halaman di bawah untuk melihat rincian.\n2. Klik **Ubah** di kanan atas untuk mengedit konten.\n3. Anda dapat menyematkan gambar, video, atau code block.\n\n---\n*Hubungi Admin jika Anda memiliki pertanyaan.*',
          '📚',
          'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          FALSE,
          $1
        ) RETURNING id
      `, [defaultUserId]);
      const wikiId = wikiRes.rows[0].id;

      // 1a. Sub-page: Aturan Kantor
      await pool.query(`
        INSERT INTO notion_pages (title, content, icon, cover_image, parent_id, created_by)
        VALUES (
          'Aturan Kantor',
          '# Aturan & Kebijakan Kantor\n\nBerikut adalah aturan dasar yang berlaku bagi seluruh karyawan:\n\n### Jam Kerja\n- Jam masuk: **08:30 WIB**\n- Jam pulang: **17:30 WIB**\n- Istirahat: **12:00 - 13:00 WIB**\n\n### Pakaian\n- Senin - Kamis: Pakaian formal/rapi.\n- Jumat: Pakaian batik bebas.\n\n### Cuti & Sakit\n- Pengajuan cuti minimal **3 hari** sebelum hari H.\n- Surat keterangan sakit harus diserahkan ke SDM paling lambat **2 hari** setelah masuk kembali.',
          '🏢',
          'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
          $1,
          $2
        )
      `, [wikiId, defaultUserId]);

      // 1b. Sub-page: Panduan Operasional IT
      await pool.query(`
        INSERT INTO notion_pages (title, content, icon, cover_image, parent_id, created_by)
        VALUES (
          'Panduan Operasional IT',
          '# Panduan Operasional IT & Keamanan\n\nPanduan ini berisi cara akses jaringan internal dan kebijakan keamanan data perusahaan.\n\n### Koneksi VPN Kantor\nUntuk terhubung ke jaringan internal dari luar kantor, ikuti instruksi berikut:\n\`\`\`bash\n# Jalankan perintah ini di terminal Anda\nopenconnect vpn.intranet.com --user=username_anda\n\`\`\`\n\n### Kebijakan Password\n- Minimal **10 karakter**.\n- Harus memuat kombinasi huruf besar, huruf kecil, angka, dan simbol.\n- Ganti password berkala setiap **90 hari**.',
          '💻',
          'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
          $1,
          $2
        )
      `, [wikiId, defaultUserId]);

      // 2. Root Database: Papan Tugas & Proyek
      const dbRes = await pool.query(`
        INSERT INTO notion_pages (title, content, icon, cover_image, is_database, database_view, created_by)
        VALUES (
          'Papan Tugas & Proyek',
          'Database utama untuk melacak progres tugas tim, tenggat waktu (deadline), penanggung jawab (assignee), dan prioritas proyek.',
          '📅',
          'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
          TRUE,
          'board',
          $1
        ) RETURNING id
      `, [defaultUserId]);
      const dbId = dbRes.rows[0].id;

      // Seed Database Rows/Tasks (child pages under database)
      await pool.query(`
        INSERT INTO notion_pages (title, content, icon, parent_id, properties, created_by)
        VALUES (
          'Implementasi Chat System',
          'Menyelesaikan integrasi websocket socket.io untuk fitur obrolan grup dan pesan langsung realtime.',
          '💬',
          $1,
          '{"status": "Done", "priority": "High", "deadline": "2026-05-20", "start_date": "2026-05-18", "assignee": "marketing", "progress": 100}'::jsonb,
          $2
        )
      `, [dbId, defaultUserId]);

      await pool.query(`
        INSERT INTO notion_pages (title, content, icon, parent_id, properties, created_by)
        VALUES (
          'Desain Notion Copycat',
          'Merancang tata letak minimalis premium terinspirasi dari aplikasi Notion. Menyertakan side-peek panel dan menu navigasi baru.',
          '🎨',
          $1,
          '{"status": "In Progress", "priority": "High", "deadline": "2026-05-23", "start_date": "2026-05-21", "assignee": "sdm", "progress": 80}'::jsonb,
          $2
        )
      `, [dbId, defaultUserId]);

      await pool.query(`
        INSERT INTO notion_pages (title, content, icon, parent_id, properties, created_by)
        VALUES (
          'Pengujian Stabilitas Server',
          'Melakukan load testing menggunakan Apache Bench atau K6 untuk menguji performa server saat diakses banyak pengguna.',
          '🚀',
          $1,
          '{"status": "To Do", "priority": "Medium", "deadline": "2026-05-28", "start_date": "2026-05-26", "assignee": "keuangan", "progress": 0}'::jsonb,
          $2
        )
      `, [dbId, defaultUserId]);

      await pool.query(`
        INSERT INTO notion_pages (title, content, icon, parent_id, properties, created_by)
        VALUES (
          'Dokumentasi API & Rilis',
          'Menulis panduan integrasi REST API dan Socket.IO untuk programmer backend dan mobile app.',
          '📄',
          $1,
          '{"status": "To Do", "priority": "Low", "deadline": "2026-05-30", "start_date": "2026-05-29", "assignee": "operasional", "progress": 0}'::jsonb,
          $2
        )
      `, [dbId, defaultUserId]);

      console.log('🌱 Default Notion pages seeded successfully.');
    }

    console.log('✅ Migrasi database selesai.');
  } catch (err) {
    console.error('❌ Gagal menjalankan migrasi database:', err);
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  runMigrations,
};
