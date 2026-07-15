# Resik Internal

Web chat internal berbasis Node.js + Socket.IO + PostgreSQL.

## Struktur Project

```
resik-internal/
├── server/
│   ├── index.js          # Entry point
│   ├── db.js             # Koneksi PostgreSQL
│   ├── socket.js         # Handler Socket.IO (real-time)
│   ├── middleware/
│   │   └── auth.js       # JWT middleware
│   └── routes/
│       ├── auth.js       # Register & login
│       └── rooms.js      # Rooms & messages
├── public/
│   ├── index.html        # Frontend
│   ├── css/style.css     # Styling
│   └── js/app.js         # Logic frontend
├── schema.sql            # Database schema
├── .env.example          # Template environment
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Setup PostgreSQL
Buat database baru dan jalankan schema:
```bash
createdb resikinternal -U appuser
psql -d resikinternal -U appuser -f schema.sql
```

### 3. Konfigurasi environment
```bash
cp .env.example .env
# Edit .env sesuai konfigurasi lokal kamu
```

### 4. Jalankan server
```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

Akses di: **http://localhost:3000**

---

## Fitur yang Sudah Ada

- ✅ Register & login dengan JWT
- ✅ Real-time chat via WebSocket (Socket.IO)
- ✅ Grup ruangan (channel)
- ✅ Typing indicator
- ✅ Histori pesan dari database
- ✅ Online/offline status
- ✅ Delete pesan
- ✅ Auto-join ruangan General
- ✅ File/image & document sharing (Folder Bersama)
- ✅ Search pesan & filter dokumen
- ✅ Direct Message (DM) antar user
- ✅ Read receipts (Status pesan terbaca)

## Langkah Berikutnya

- [ ] Push notifikasi (browser Notification API)
- [ ] Upload avatar
