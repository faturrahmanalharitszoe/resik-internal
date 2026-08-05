# Dokumentasi Teknis: Socket.io — Fitur Chat Resik Internal

## Arsitektur Umum

```
┌──────────────┐     ┌──────────────────────────┐     ┌──────────────┐
│   Browser    │────▶│   Socket.io Server (WS)   │────▶│  PostgreSQL  │
│  (Client)    │◀────│   server/socket.js         │◀────│              │
└──────────────┘     │   server/index.js          │     └──────────────┘
                     └──────────────────────────┘
                              │
                     ┌────────┴────────┐
                     │  Express Routes  │
                     │  (REST API)      │
                     └─────────────────┘
```

**Tech Stack:**
- **Socket.io** `^4.7.2` — WebSocket transport + fallback polling
- **PostgreSQL** — via `pg ^8.11.3`
- **JWT** (`jsonwebtoken ^9.0.2`) — autentikasi koneksi socket
- **Web Push** `^3.6.7` — notifikasi push via VAPID

---

## 1. Inisialisasi Server

**File: `server/index.js`**

```javascript
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware: inject io ke semua Express route
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Auth middleware diterapkan ke SEMUA koneksi socket
io.use(socketAuth);

// Setup event handler
setupSocket(io);
```

`io` juga diakses via `app.set('io', io)` → bisa diambil di route dengan `req.app.get('io')`.

---

## 2. Autentikasi Socket

**File: `server/middleware/auth.js`**

```javascript
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication error: no token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;  // { id, username, display_name, role, division, jabatan, is_admin }
    next();
  } catch (err) {
    return next(new Error('Authentication error: invalid token'));
  }
}
```

**Client-side connection:**
```javascript
// app.js line 557
socket = io({ auth: { token: localStorage.getItem('token') } });
```

`socket.user` tersedia di semua event handler server sebagai objek user yang sedang login.

---

## 3. Diagram Alur Koneksi

```
Client                          Server
  │                               │
  │──── connect (auth: token) ───▶│
  │                               │── socketAuth middleware
  │                               │   ├── jwt.verify(token)
  │                               │   └── socket.user = decoded
  │                               │
  │                               │── socket.join('user_<id>')
  │                               │── UPDATE users SET is_online = true
  │                               │
  │◀─── connect event ────────────│
  │                               │
  │──── emit('join_rooms') ──────▶│
  │                               │── SELECT room_id FROM room_members
  │                               │   WHERE user_id = $1
  │                               │── socket.join(roomId) × N
  │                               │── broadcast user_status(online) ke semua room
  │                               │
  │◀─── 'new_message' ───────────│  (realtime incoming)
  │◀─── 'user_typing' ───────────│
  │◀─── 'user_status' ───────────│
  │◀─── 'message_deleted' ───────│
  │◀─── 'new_persistent_notif' ──│
  │                               │
  │──── disconnect ──────────────▶│
  │                               │── UPDATE users SET is_online = false,
  │                               │                    last_seen = NOW()
  │                               │── broadcast user_status(offline)
```

---

## 4. Daftar Event Lengkap

### 4.1 Event yang Dikirim Client → Server

| Event | Payload | Callback | Fungsi |
|-------|---------|----------|--------|
| `join_rooms` | *(tanpa payload)* | — | Join semua room milik user saat koneksi pertama |
| `join_room` | `{ room_id }` | — | Join satu room secara dinamis |
| `send_message` | `{ room_id, content, type?, file_url?, file_name?, file_size? }` | `{ success, message }` atau `{ error }` | Kirim pesan chat |
| `typing` | `{ room_id, is_typing }` | — | Indikator sedang mengetik |
| `delete_message` | `{ message_id, room_id }` | `{ success }` atau `{ error }` | Hapus pesan (soft delete) |

### 4.2 Event yang Dikirim Server → Client

| Event | Payload | Siapa yang Terima | Fungsi |
|-------|---------|-------------------|--------|
| `new_message` | `{ id, room_id, content, type, file_url, file_name, file_size, created_at, sender_id, username, display_name }` | Semua di dalam room (termasuk pengirim) | Pesan baru masuk |
| `user_typing` | `{ user_id, display_name, is_typing, room_id }` | Semua di dalam room **kecuali pengirim** | Indikator mengetik |
| `user_status` | `{ user_id, is_online }` | Semua yang ada di room milik user | Status online/offline |
| `message_deleted` | `{ message_id, room_id }` | Semua di dalam room | Pesan dihapus |
| `join_new_room` | `{ room_id }` | User tertentu (personal room `user_<id>`) | Paksa client join room baru |
| `removed_from_room` | `{ room_id }` | User yang dihapus dari room | Notifikasi dihapus dari room |
| `member_added` | `{ room_id, user }` | Semua di dalam room | Anggota baru ditambahkan |
| `member_removed` | `{ room_id, user_id }` | Semua di dalam room | Anggota dihapus |
| `new_persistent_notification` | `{ id, user_id, sender_id, document_id, message, is_read, created_at, sender_name, document_name }` | User tertentu (personal room) | Notifikasi dokumen |
| `new_document_assigned` | `{ document_object }` | **Semua** connected clients (broadcast) | Dokumen baru tersedia |

---

## 5. Manajemen Room

### 5.1 Tipe Room

```sql
type VARCHAR(10) NOT NULL CHECK (type IN ('group', 'dm'))
```

- **`group`** — Ruangan grup dengan nama, bisa banyak anggota
- **`dm`** — Direct message (1 lawan 1), `name = NULL`

### 5.2 Strategi Join Room

| Mekanisme | Kapan | Handler |
|-----------|-------|---------|
| `socket.join('user_<id>')` | Saat connect (otomatis) | `socket.js:9` |
| `join_rooms` event | Setelah connect | `socket.js:15` — query semua `room_members`, join satu-satu |
| `join_room` event | On-demand (saat buka chat) | `socket.js:34` |
| `join_new_room` dari REST route | Saat user ditambah ke room | Dari `rooms.js` via `req.io.to('user_<id>').emit(...)` |

### 5.3 Room Leave

Tidak ada event explicit leave. Socket.io otomatis leave semua room saat disconnect. Untuk penghapusan anggota, server emit `removed_from_room` ke user yang bersangkutan, lalu client menghapus room dari state lokal.

### 5.4 Personal Room (`user_<id>`)

Setiap user punya room personal yang berguna untuk:
- Notifikasi dokumen baru (`new_persistent_notification`)
- Perintah join room (`join_new_room`)
- Notifikasi dihapus dari room (`removed_from_room`)

---

## 6. Kirim Pesan (`send_message`)

### Flow

```
Client                          Server                          Room
  │                               │                               │
  │── send_message ──────────────▶│                               │
  │   { room_id, content }        │                               │
  │                               │── Verifikasi keanggotaan      │
  │                               │   SELECT 1 FROM room_members  │
  │                               │                               │
  │                               │── INSERT INTO messages        │
  │                               │   RETURNING *                 │
  │                               │                               │
  │                               │── io.to(room_id).emit ───────▶│ semua client di room
  │                               │   ('new_message', message)    │ termasuk pengirim
  │                               │                               │
  │◀── callback({ success, message })                             │
```

### Payload Pesan

```javascript
{
  id: UUID,
  room_id: UUID,
  content: "Halo semua!",
  type: "text",              // 'text' | 'file' | 'image' | 'system'
  file_url: null,            // URL file jika type = file/image
  file_name: null,           // Nama file
  file_size: null,           // Ukuran file dalam bytes
  created_at: "2026-08-05T...",
  sender_id: UUID,
  username: "fatur",
  display_name: "Fatur"
}
```

### Validasi Server

1. `room_id` dan `content` harus ada (atau `file_url` untuk file)
2. User harus terdaftar sebagai anggota room (`room_members`)
3. Jika gagal → callback `{ error: 'Bukan anggota room ini' }`

### Catatan Teknis

- Pesan dikirim ke **semua client di room termasuk pengirim** (pakai `io.to()` bukan `socket.to()`)
- Client menerima event `new_message` lalu menjalankan `appendMessage()` untuk render ke DOM
- Sidebar room juga di-update preview pesan terakhirnya via `updateRoomPreview()`

---

## 7. Typing Indicator

### Flow

```
Client (A)                      Server                      Client (B)
  │                               │                            │
  │── typing({ room_id,           │                            │
  │     is_typing: true }) ──────▶│                            │
  │                               │── user_typing({            │
  │                               │   user_id: A,              │
  │                               │   is_typing: true,         │
  │                               │   display_name: "Fatur"    │
  │                               │ }) ───────────────────────▶│
  │                               │                            │ tampilkan "Fatur sedang mengetik..."
  │                               │                            │
  │   (1.5 detik tanpa ketik)     │                            │
  │                               │                            │
  │── typing({ room_id,           │                            │
  │     is_typing: false }) ─────▶│                            │
  │                               │── user_typing({            │
  │                               │   is_typing: false         │
  │                               │ }) ───────────────────────▶│ sembunyikan indicator
```

### Logic Client-Side

```javascript
// app.js
let isTyping = false;
let typingThrottle = null;

messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing', { room_id: currentRoomId, is_typing: true });
  }
  clearTimeout(typingThrottle);
  typingThrottle = setTimeout(() => {
    isTyping = false;
    socket.emit('typing', { room_id: currentRoomId, is_typing: false });
  }, 1500);  // auto-stop setelah 1.5 detik diam
});

// Setelah kirim pesan
socket.emit('typing', { room_id: currentRoomId, is_typing: false });
```

### Key Points

- `is_typing: true` hanya dikirim **sekali** saat user mulai mengetik (tidak spam)
- `is_typing: false` dikirim otomatis setelah **1.5 detik** tidak ada input
- Server meneruskan ke room **kecuali pengirim** (`socket.to()` bukan `io.to()`)
- Client mengabaikan event dari diri sendiri (`user_id === currentUser.id`)

---

## 8. Hapus Pesan (`delete_message`)

### Flow

```
Client                          Server                          Room
  │                               │                               │
  │── delete_message ────────────▶│                               │
  │   { message_id, room_id }     │                               │
  │                               │── Cek apakah admin atau       │
  │                               │   pemilik pesan               │
  │                               │                               │
  │                               │── UPDATE messages             │
  │                               │   SET is_deleted = true       │
  │                               │   WHERE id = $1               │
  │                               │   [AND sender_id = $2]        │
  │                               │                               │
  │                               │── message_deleted ───────────▶│ semua client di room
  │                               │   { message_id, room_id }     │
  │                               │                               │
  │◀── callback({ success })      │                               │
```

### Otorisasi

- **Admin** (`is_admin = true` atau username `admin`/`administrator`): bisa hapus pesan siapa saja
- **User biasa**: hanya bisa hapus pesan milik sendiri

### Soft Delete

Pesan tidak benar-benar dihapus dari database. Flag `is_deleted = true` diset, lalu client menampilkan placeholder `"Pesan ini telah dihapus"`.

---

## 9. Status Online/Offline

### Saat Connect

```
Client                          Server
  │                               │
  │──── connect ─────────────────▶│
  │                               │── UPDATE users SET is_online = true WHERE id = $1
  │                               │
  │──── join_rooms ──────────────▶│
  │                               │── socket.join(roomId) × N
  │                               │── socket.to(roomId).emit('user_status',
  │                               │     { user_id, is_online: true })
```

### Saat Disconnect

```
Client                          Server
  │                               │
  │──── disconnect ──────────────▶│
  │                               │── UPDATE users SET is_online = false,
  │                               │                    last_seen = NOW()
  │                               │   WHERE id = $1
  │                               │
  │                               │── SELECT room_id FROM room_members
  │                               │   WHERE user_id = $1
  │                               │
  │                               │── socket.to(roomId).emit('user_status',
  │                               │     { user_id, is_online: false })
```

### Client-Side Handler

```javascript
socket.on('user_status', ({ user_id, is_online }) => {
  // Update di array systemUsers
  const user = systemUsers.find(u => u.id === user_id);
  if (user) user.is_online = is_online;

  // Update di sidebar room list (untuk DM)
  const room = rooms.find(r => r.type === 'dm' && r.dm_user_id === user_id);
  if (room) room.dm_user_is_online = is_online;

  // Update di chat header jika room sedang dibuka
  if (currentRoomId === room.id) {
    chatMembersCount.textContent = is_online ? 'Online' : 'Offline';
  }
});
```

---

## 10. Manajemen Anggota Room

Semua event di bawah dikirim dari **REST routes** (`server/routes/rooms.js`) menggunakan `req.io`.

### Tambah Anggota

```
POST /api/rooms/:id/members { user_id }
```

```javascript
// rooms.js
req.io.to(`user_${user_id}`).emit('join_new_room', { room_id: id });
req.io.to(id).emit('member_added', { room_id: id, user: newMember });
```

Client menerima `join_new_room` → emit `join_room` ke server → client sekarang mendengarkan pesan dari room tersebut.

### Hapus Anggota

```
DELETE /api/rooms/:id/members/:userId
```

```javascript
// rooms.js
req.io.to(`user_${userId}`).emit('removed_from_room', { room_id: id });
req.io.to(id).emit('member_removed', { room_id: id, user_id: userId });
```

Client menerima `removed_from_room` → hapus room dari sidebar → redirect ke empty state jika sedang membuka room tersebut.

### Buat Room Baru

```
POST /api/rooms { name, member_ids }
```

```javascript
// Notify semua anggota untuk join room
memberIds.forEach(uid => {
  req.io.to(`user_${uid}`).emit('join_new_room', { room_id: roomId });
});
```

---

## 11. Notifikasi Dokumen

### Pipeline Lengkap

```
Upload Document (REST)
    │
    ├──▶ INSERT INTO shared_documents
    │
    ├──▶ io.emit('new_document_assigned', doc)
    │    └── Semua client menerima (broadcast global)
    │
    ├──▶ INSERT INTO notifications (per target user)
    │    │
    │    └──▶ io.to('user_<id>').emit('new_persistent_notification', notif)
    │         └── Client update badge counter + tampilkan alert
    │
    └──▶ webpush.sendNotification(subscription, payload)
         └── Service Worker tampilkan system notification
```

### Push Notification (Web Push / VAPID)

**Registration (client):**
```javascript
// 1. Register service worker
const reg = await navigator.serviceWorker.register('/sw.js');

// 2. Subscribe push
const subscription = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: vapidPublicKey
});

// 3. Kirim subscription ke server
await fetch('/api/notifications/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription)
});
```

**Service Worker (sw.js):**
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus tab yang sudah ada atau buka baru
});
```

---

## 12. Database Schema (Chat-Relevant)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  division VARCHAR(50),
  is_admin BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100),              -- NULL untuk DM
  type VARCHAR(10) CHECK (type IN ('group', 'dm')),
  created_by UUID REFERENCES users(id)
);

-- Room Members
CREATE TABLE room_members (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT,
  type VARCHAR(20) DEFAULT 'text'
    CHECK (type IN ('text', 'file', 'image', 'system')),
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
```

---

## 13. Diagram Koneksi Socket.io

```
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Node.js)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Socket.io Server                          │   │
│  │                                                           │   │
│  │  io.use(socketAuth)  ← middleware JWT verification        │   │
│  │                                                           │   │
│  │  io.on('connection', (socket) => {                        │   │
│  │    socket.user = { id, username, ... }                    │   │
│  │                                                           │   │
│  │    socket.join('user_<id>')     ← personal room           │   │
│  │    socket.join(room1)           ← dari join_rooms         │   │
│  │    socket.join(room2)           ← dari join_rooms         │   │
│  │    ...                                                    │   │
│  │  });                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Express REST Routes                          │   │
│  │  app.use('/api/rooms', roomRoutes)                        │   │
│  │  app.use('/api/documents', docRoutes)                     │   │
│  │                                                           │   │
│  │  req.io.emit(...)  ← bisa emit socket event dari REST    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                           │
    WebSocket                   HTTP REST
    (realtime)                  (request/response)
         │                           │
┌────────┴────────┐         ┌────────┴────────┐
│  Client A       │         │  Client B       │
│  (Browser)      │         │  (Browser)      │
│                 │         │                 │
│  socket.emit()  │         │  fetch()        │
│  socket.on()    │         │  axios()        │
└─────────────────┘         └─────────────────┘
```

---

## 14. Known Issues / Bug

1. **Duplicate `message_deleted` handler** — Ada 2 handler untuk event `handler` di `app.js` (line 630 dan 651). Yang pertama mengganti konten bubble, yang kedua menghapus elemen sepenuhnya. Keduanya akan fire.

2. **Tidak ada rate limiting di typing indicator** — Event `typing` bisa dikirim tanpa batas dari client. Tidak ada throttling server-side.

3. **Tidak ada sanitasi konten di server** — Pesan disimpan mentah dari client. XSS protection hanya di client-side via fungsi `esc()`.

4. **Admin hardcoded** — `socket.js:92` mengecek `user.username === 'admin' || user.username === 'administrator'` selain `user.is_admin`. Dua jalur otorisasi.

5. **Single-server only** — Tidak ada Redis adapter untuk Socket.io. Tidak bisa horizontal scaling.
