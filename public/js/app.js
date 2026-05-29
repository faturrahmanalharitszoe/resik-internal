/* ─── STATE ─── */
let token = localStorage.getItem('chat_token');
let currentUser = JSON.parse(localStorage.getItem('chat_user') || 'null');
if (currentUser) {
  if (!currentUser.role) currentUser.role = 'staff';
  if (!currentUser.jabatan) currentUser.jabatan = 'Staff';
}
let currentRoomId = null;
let socket = null;
let rooms = [];
let systemUsers = [];
let typingTimer = null;
let currentView = 'chat';
let currentNotionPageId = null;
let currentNotionPage = null;

const API = '';

/* ─── ELEMENTS ─── */
const $ = (id) => document.getElementById(id);

/* ─── PREMIUM CUSTOM DIALOG MODALS ─── */
function showCustomAlert(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
      <div class="custom-dialog-modal">
        <div class="custom-dialog-header">
          <span class="custom-dialog-icon">⚠️</span>
          <span class="custom-dialog-title">Perhatian</span>
        </div>
        <div class="custom-dialog-body">${esc(message)}</div>
        <div class="custom-dialog-footer">
          <button class="btn-primary-sm" style="background: var(--accent); border-color: var(--accent); color: white;" id="custom-dialog-alert-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const okBtn = overlay.querySelector('#custom-dialog-alert-ok');
    okBtn.focus();

    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
      resolve();
    };

    const handleKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    okBtn.onclick = close;
    document.addEventListener('keydown', handleKey);
  });
}
window.showCustomAlert = showCustomAlert;

function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
      <div class="custom-dialog-modal">
        <div class="custom-dialog-header">
          <span class="custom-dialog-icon">❓</span>
          <span class="custom-dialog-title">Konfirmasi</span>
        </div>
        <div class="custom-dialog-body">${esc(message)}</div>
        <div class="custom-dialog-footer">
          <button class="btn-secondary-sm" id="custom-dialog-confirm-cancel">Batal</button>
          <button class="btn-primary-sm" style="background: var(--accent); border-color: var(--accent); color: white;" id="custom-dialog-confirm-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const okBtn = overlay.querySelector('#custom-dialog-confirm-ok');
    const cancelBtn = overlay.querySelector('#custom-dialog-confirm-cancel');
    okBtn.focus();

    const confirmAction = () => {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
      resolve(true);
    };

    const cancelAction = () => {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
      resolve(false);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelAction();
      } else if (e.key === 'Enter') {
        if (document.activeElement !== cancelBtn) {
          e.preventDefault();
          confirmAction();
        }
      }
    };

    okBtn.onclick = confirmAction;
    cancelBtn.onclick = cancelAction;
    document.addEventListener('keydown', handleKey);
  });
}
window.showCustomConfirm = showCustomConfirm;

function showCustomPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
      <div class="custom-dialog-modal">
        <div class="custom-dialog-header">
          <span class="custom-dialog-icon">✍️</span>
          <span class="custom-dialog-title">Input</span>
        </div>
        <div class="custom-dialog-body" style="margin-bottom: 4px;">${esc(message)}</div>
        <div class="custom-dialog-input-wrapper">
          <input type="text" class="custom-dialog-input" id="custom-dialog-prompt-input" value="${esc(defaultValue)}" />
        </div>
        <div class="custom-dialog-footer">
          <button class="btn-secondary-sm" id="custom-dialog-prompt-cancel">Batal</button>
          <button class="btn-primary-sm" style="background: var(--accent); border-color: var(--accent); color: white;" id="custom-dialog-prompt-ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const inputEl = overlay.querySelector('#custom-dialog-prompt-input');
    const okBtn = overlay.querySelector('#custom-dialog-prompt-ok');
    const cancelBtn = overlay.querySelector('#custom-dialog-prompt-cancel');

    inputEl.focus();
    if (defaultValue) {
      inputEl.select();
    }

    const submitAction = () => {
      const val = inputEl.value;
      overlay.remove();
      resolve(val);
    };

    const cancelAction = () => {
      overlay.remove();
      resolve(null);
    };

    okBtn.onclick = submitAction;
    cancelBtn.onclick = cancelAction;

    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelAction();
      }
    };
  });
}
window.showCustomPrompt = showCustomPrompt;
const authScreen = $('auth-screen');
const app = $('app');
const loginForm = $('login-form');
const registerForm = $('register-form');
const sidebarName = $('sidebar-name');
const roomList = $('room-list');
const emptyState = $('empty-state');
const chatView = $('chat-view');
const chatRoomName = $('chat-room-name');
const chatMembersCount = $('chat-members-count');
const messagesList = $('messages-list');
const messageInput = $('message-input');
const typingIndicator = $('typing-indicator');
const modalOverlay = $('modal-overlay');

/* ─── THEME & SIDEBAR INITIALIZATION ─── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeIcon = document.querySelector('#theme-toggle-btn .theme-icon');
  const themeText = document.querySelector('#theme-toggle-btn .theme-text');
  if (theme === 'dark') {
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeText) themeText.textContent = 'Mode Terang';
  } else {
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Mode Gelap';
  }
}
const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

const isSidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
if (isSidebarCollapsed) {
  document.addEventListener('DOMContentLoaded', () => {
    const appEl = $('app');
    if (appEl) appEl.classList.add('sidebar-collapsed');
  });
  const appEl = $('app');
  if (appEl) appEl.classList.add('sidebar-collapsed');
}

/* ─── INIT ─── */
if (token && currentUser) {
  showApp();
} else {
  showAuth();
}

/* ─── AUTH TABS ─── */
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    loginForm.classList.toggle('hidden', tab !== 'login');
    registerForm.classList.toggle('hidden', tab !== 'register');
  });
});

/* ─── AUTH FORMS ─── */
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('login-username').value.trim();
  const password = $('login-password').value;
  $('login-error').textContent = '';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    saveAuth(data.token, data.user);
    await showApp();
  } catch (err) {
    $('login-error').textContent = err.message;
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const display_name = $('reg-name').value.trim();
  const username = $('reg-username').value.trim();
  const email = $('reg-email').value.trim();
  const password = $('reg-password').value;
  const division = $('reg-division').value;
  const jabValue = $('reg-jabatan').value;
  const [role, jabatan] = jabValue ? jabValue.split('-') : ['staff', 'Staff'];
  $('register-error').textContent = '';

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, username, email, password, division, role, jabatan }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    saveAuth(data.token, data.user);
    await showApp();
  } catch (err) {
    $('register-error').textContent = err.message;
  }
});

/* ─── LOGOUT ─── */
$('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('chat_token');
  localStorage.removeItem('chat_user');
  if (socket) socket.disconnect();
  location.reload();
});

/* ─── COLLAPSIBLE SIDEBAR & THEME EVENTS ─── */
if ($('theme-toggle-btn')) {
  $('theme-toggle-btn').addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });
}

window.toggleSidebar = () => {
  const appEl = $('app');
  if (!appEl) return;
  const willCollapse = !appEl.classList.contains('sidebar-collapsed');
  appEl.classList.toggle('sidebar-collapsed', willCollapse);
  localStorage.setItem('sidebar_collapsed', willCollapse ? 'true' : 'false');
  console.log('Sidebar toggled. Collapsed:', willCollapse);
};

function switchSidebarTab(tabName, autoExpand = true) {
  // Update active state in UI
  document.querySelectorAll('.activity-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `tab-btn-${tabName}`);
  });

  // Toggle visibility of sidebar sections
  const menuSection = document.querySelector('.menu-section');
  const notionSection = document.querySelector('.notion-section');
  const roomsSection = document.querySelector('.rooms-section');
  const usersSection = document.querySelector('.users-section');

  if (menuSection) menuSection.classList.toggle('hidden', tabName !== 'files');
  if (notionSection) notionSection.classList.toggle('hidden', tabName !== 'notion');
  if (roomsSection) roomsSection.classList.toggle('hidden', tabName !== 'chat');
  if (usersSection) usersSection.classList.toggle('hidden', tabName !== 'chat');

  // Handle auto expansion of collapsed sidebar
  if (autoExpand) {
    const appEl = $('app');
    if (appEl && appEl.classList.contains('sidebar-collapsed')) {
      toggleSidebar();
    }
  }

  // Prevent infinite loop by checking currentView before switching
  if (tabName === 'files' && currentView !== 'sharing') {
    switchView('sharing');
  } else if (tabName === 'notion' && currentView !== 'notion' && currentView !== 'notion-calendar') {
    if (currentNotionPageId) {
      switchView('notion');
    } else {
      switchView('notion-calendar');
    }
  } else if (tabName === 'chat' && currentView !== 'chat') {
    switchView('chat');
  }
}
window.switchSidebarTab = switchSidebarTab;


if ($('toggle-rooms-btn')) {
  $('toggle-rooms-btn').addEventListener('click', (e) => {
    if (e.target.id === 'btn-new-room') return;
    const isHidden = $('room-list').classList.toggle('hidden');
    const arrow = $('toggle-rooms-btn').querySelector('.toggle-arrow');
    if (arrow) {
      arrow.textContent = isHidden ? '▸' : '▾';
    }
  });
}

if ($('toggle-users-btn')) {
  $('toggle-users-btn').addEventListener('click', () => {
    const isHidden = $('user-list').classList.toggle('hidden');
    const arrow = $('toggle-users-btn').querySelector('.toggle-arrow');
    if (arrow) {
      arrow.textContent = isHidden ? '▸' : '▾';
    }
  });
}

if ($('side-peek-close-btn')) {
  $('side-peek-close-btn').addEventListener('click', () => {
    $('side-peek-backdrop').classList.add('hidden');
    $('side-peek-panel').classList.remove('open');
  });
}

if ($('side-peek-backdrop')) {
  $('side-peek-backdrop').addEventListener('click', () => {
    $('side-peek-backdrop').classList.add('hidden');
    $('side-peek-panel').classList.remove('open');
  });
}

/* ─── MODAL: NEW ROOM ─── */
$('btn-new-room').addEventListener('click', () => modalOverlay.classList.remove('hidden'));
$('modal-close').addEventListener('click', () => modalOverlay.classList.add('hidden'));

$('btn-create-room').addEventListener('click', async () => {
  const name = $('new-room-name').value.trim();
  if (!name) return;
  try {
    const res = await apiFetch('/api/rooms', { method: 'POST', body: { name } });
    if (res) {
      modalOverlay.classList.add('hidden');
      $('new-room-name').value = '';
      await loadRooms();
    }
  } catch (err) {
    console.error(err);
  }
});

/* ─── SEND MESSAGE ─── */
$('btn-send').addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  // Auto-resize
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';

  // Typing indicator
  if (!currentRoomId) return;
  socket.emit('typing', { room_id: currentRoomId, is_typing: true });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing', { room_id: currentRoomId, is_typing: false });
  }, 2000);
});

function sendMessage() {
  const content = messageInput.value.trim();
  if (!content || !currentRoomId) return;

  socket.emit('send_message', { room_id: currentRoomId, content }, (res) => {
    if (res?.error) console.error(res.error);
  });

  messageInput.value = '';
  messageInput.style.height = 'auto';
  socket.emit('typing', { room_id: currentRoomId, is_typing: false });
}

/* ─── SOCKET ─── */
function connectSocket() {
  socket = io({ auth: { token } });

  socket.on('connect', () => {
    socket.emit('join_rooms');
  });

  socket.on('new_message', (msg) => {
    if (msg.room_id === currentRoomId) {
      appendMessage(msg);
      scrollToBottom();
    }
    updateRoomPreview(msg.room_id, msg.content);
  });

  socket.on('user_typing', ({ user_id, display_name, is_typing, room_id }) => {
    if (room_id !== currentRoomId || user_id === currentUser.id) return;
    typingIndicator.textContent = is_typing ? `${display_name} sedang mengetik...` : '';
    typingIndicator.classList.toggle('hidden', !is_typing);
  });

  socket.on('user_status', ({ user_id, is_online }) => {
    // 1. Update in systemUsers
    const user = systemUsers.find(u => u.id === user_id);
    if (user) {
      user.is_online = is_online;
      renderUsers();
    }

    // 2. Update in rooms list
    const room = rooms.find(r => r.type === 'dm' && r.dm_user_id === user_id);
    if (room) {
      room.dm_user_is_online = is_online;
      renderRooms();

      // 3. Update in chat header if currently open
      if (currentRoomId === room.id) {
        chatMembersCount.textContent = is_online ? 'Online' : 'Offline';
      }
    }
  });

  socket.on('join_new_room', ({ room_id }) => {
    socket.emit('join_room', { room_id });
    loadRooms().then(() => {
      renderUsers();
    });
  });

  socket.on('message_deleted', ({ message_id }) => {
    const el = document.querySelector(`[data-msg-id="${message_id}"]`);
    if (el) el.closest('.msg-group')?.remove();
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });
}

/* ─── ROOMS ─── */
async function loadRooms() {
  const data = await apiFetch('/api/rooms');
  if (!data) return;
  rooms = data;
  renderRooms();
}

function renderRooms() {
  roomList.innerHTML = '';
  const groupRooms = rooms.filter(r => r.type === 'group');
  groupRooms.forEach((room) => {
    const li = document.createElement('li');
    li.className = 'room-item' + (room.id === currentRoomId ? ' active' : '');
    li.dataset.roomId = room.id;
    li.innerHTML = `
      <span class="room-hash">#</span>
      <div class="room-info">
        <div class="room-name">${esc(room.name)}</div>
        <div class="room-preview">${esc(room.last_message || 'Belum ada pesan')}</div>
      </div>
    `;
    li.addEventListener('click', () => openRoom(room));
    roomList.appendChild(li);
  });
}

async function loadUsers() {
  const data = await apiFetch('/api/rooms/meta/users');
  if (!data) return;
  systemUsers = data;
  renderUsers();
}

function renderUsers() {
  const userList = $('user-list');
  if (!userList) return;
  userList.innerHTML = '';

  systemUsers.forEach((user) => {
    const currentRoom = rooms.find(r => r.id === currentRoomId);
    const isActive = currentRoom && currentRoom.type === 'dm' && currentRoom.dm_user_id === user.id;

    const li = document.createElement('li');
    li.className = 'room-item' + (isActive ? ' active' : '');
    li.dataset.userId = user.id;

    const divisionLabels = {
      marketing: 'Marketing',
      sdm: 'SDM',
      keuangan: 'Keuangan',
      operasional: 'Operasional'
    };

    const divLabel = divisionLabels[user.division] || 'Umum';
    const statusDot = user.is_online
      ? '<span class="status-dot online"></span>'
      : '<span class="status-dot offline"></span>';

    const dmRoom = rooms.find(r => r.type === 'dm' && r.dm_user_id === user.id);
    const lastMsg = dmRoom ? dmRoom.last_message : 'Klik untuk chat';

    li.innerHTML = `
      <div class="user-avatar-container">
        <div class="avatar-circle-sm">${user.display_name.slice(0, 2).toUpperCase()}</div>
        ${statusDot}
      </div>
      <div class="room-info" style="margin-left: 8px;">
        <div class="room-name-container" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="room-name" style="flex: 1; font-weight: 500; font-size: 13px;">${esc(user.display_name)}</span>
          <span class="division-badge ${user.division || ''}">${esc(divLabel)}</span>
        </div>
        <div class="room-preview">${esc(lastMsg)}</div>
      </div>
    `;

    li.addEventListener('click', () => startDM(user.id));
    userList.appendChild(li);
  });
}

async function startDM(targetUserId) {
  try {
    const res = await apiFetch('/api/rooms/dm', {
      method: 'POST',
      body: { target_user_id: targetUserId }
    });

    if (res) {
      await loadRooms();
      renderUsers();
      openRoom(res);
    }
  } catch (err) {
    console.error('Gagal memulai DM:', err);
  }
}

async function openRoom(room) {
  switchView('chat');
  currentRoomId = room.id;

  // Update active state in Rooms list
  document.querySelectorAll('.room-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.roomId === room.id);
  });

  // Update active state in Users list
  if (room.type === 'dm') {
    document.querySelectorAll('#user-list .room-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.userId === room.dm_user_id);
    });
    chatRoomName.textContent = room.dm_user_display_name || 'Direct Message';
    chatMembersCount.textContent = room.dm_user_is_online ? 'Online' : 'Offline';
  } else {
    document.querySelectorAll('#user-list .room-item').forEach((el) => {
      el.classList.remove('active');
    });
    chatRoomName.textContent = '#' + room.name;
    chatMembersCount.textContent = 'Memuat pesan...';
  }

  emptyState.classList.add('hidden');
  chatView.classList.remove('hidden');
  messagesList.innerHTML = '';
  typingIndicator.classList.add('hidden');

  const messages = await apiFetch(`/api/rooms/${room.id}/messages`);
  if (!messages) return;

  if (room.type !== 'dm') {
    chatMembersCount.textContent = `${messages.length} pesan terakhir`;
  }

  let lastDate = null;
  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (msgDate !== lastDate) {
      appendDateDivider(msgDate);
      lastDate = msgDate;
    }
    appendMessage(msg);
  });

  scrollToBottom(false);
  messageInput.focus();
}

function updateRoomPreview(roomId, content) {
  const item = document.querySelector(`.room-item[data-room-id="${roomId}"] .room-preview`);
  if (item) item.textContent = content;

  const room = rooms.find(r => r.id === roomId);
  if (room) {
    room.last_message = content;
    if (room.type === 'dm') {
      const userItem = document.querySelector(`.room-item[data-user-id="${room.dm_user_id}"] .room-preview`);
      if (userItem) {
        userItem.textContent = content;
      }
    }
  }
}

/* ─── MESSAGE RENDERING ─── */
function appendMessage(msg) {
  const isOwn = msg.sender_id === currentUser.id;
  const initials = (msg.display_name || '?').slice(0, 2).toUpperCase();
  const time = new Date(msg.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });

  const group = document.createElement('div');
  group.className = 'msg-group' + (isOwn ? ' own' : '');
  group.innerHTML = `
    <div class="avatar-circle">${initials}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-sender">${isOwn ? 'Kamu' : esc(msg.display_name)}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-bubble" data-msg-id="${msg.id}">${esc(msg.content)}</div>
    </div>
  `;
  messagesList.appendChild(group);
}

function appendDateDivider(dateStr) {
  const div = document.createElement('div');
  div.className = 'date-divider';
  div.textContent = dateStr;
  messagesList.appendChild(div);
}

function scrollToBottom(smooth = true) {
  const container = $('messages-container');
  container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

/* ─── HELPERS ─── */
function saveAuth(t, user) {
  token = t;
  currentUser = user;
  localStorage.setItem('chat_token', t);
  localStorage.setItem('chat_user', JSON.stringify(user));
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  try {
    const res = await fetch(API + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      location.reload();
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(`API error [${path}]:`, err);
    return null;
  }
}

function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTagClassForRecipient(rec) {
  const r = rec.toLowerCase();
  if (r.includes('marketing')) return 'tag-red';
  if (r.includes('sdm')) return 'tag-green';
  if (r.includes('keuangan')) return 'tag-yellow';
  if (r.includes('operasional')) return 'tag-blue';
  if (r.includes('sm') || r.includes('manager')) return 'tag-purple';
  if (r.includes('staff')) return 'tag-gray';
  if (r.includes('direktur') || r.includes('wakil')) return 'tag-pink';
  return 'tag-default';
}

async function showApp() {
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');

  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional'
  };
  const divLabel = divisionLabels[currentUser.division] || '';
  sidebarName.textContent = currentUser.display_name + (divLabel ? ` (${divLabel})` : '');

  connectSocket();
  await loadRooms();
  await loadUsers();
  initSharingEvents();
  await loadNotionWorkspace();
  switchSidebarTab('chat', false);
}

function showAuth() {
  app.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

/* ─── SHARING FOLDER STATE & CONTROLLERS ─── */
let activeTab = 'masuk';
let sharedDocuments = [];
let projects = [];
let recipientsList = [];
let selectedUploadFile = null;
let sharingCurrentPage = 1;
const sharingPageSize = 10;

function switchView(viewName) {
  currentView = viewName;

  // Hide all main views
  $('chat-view').classList.add('hidden');
  $('empty-state').classList.add('hidden');
  $('sharing-folder-view').classList.add('hidden');
  if ($('notion-workspace-view')) $('notion-workspace-view').classList.add('hidden');

  // Deactivate active sidebar items
  $('btn-sharing-folder').classList.remove('active');
  document.querySelectorAll('.room-item').forEach((el) => {
    el.classList.remove('active');
  });

  if (viewName === 'chat') {
    if (!currentRoomId) {
      $('empty-state').classList.remove('hidden');
    } else {
      $('chat-view').classList.remove('hidden');
    }
  } else if (viewName === 'sharing') {
    currentRoomId = null;
    $('btn-sharing-folder').classList.add('active');
    $('sharing-folder-view').classList.remove('hidden');
    initSharingFolder();
  } else if (viewName === 'notion') {
    currentRoomId = null;
    if ($('notion-workspace-view')) {
      $('notion-workspace-view').classList.remove('hidden');
      $('notion-page-content-area').classList.toggle('hidden', currentNotionPage && !!currentNotionPage.is_database);
      $('notion-database-content-area').classList.toggle('hidden', !currentNotionPage || !currentNotionPage.is_database);
      $('notion-calendar-view-area').classList.add('hidden');

      const coverWrapper = document.querySelector('.notion-cover-wrapper');
      const notionHeader = document.querySelector('.notion-header');
      if (coverWrapper) coverWrapper.classList.remove('hidden');
      if (notionHeader) notionHeader.classList.remove('hidden');
    }
  } else if (viewName === 'notion-calendar') {
    currentRoomId = null;
    if ($('notion-workspace-view')) {
      $('notion-workspace-view').classList.remove('hidden');
      $('notion-page-content-area').classList.add('hidden');
      $('notion-database-content-area').classList.add('hidden');
      $('notion-calendar-view-area').classList.remove('hidden');

      const coverWrapper = document.querySelector('.notion-cover-wrapper');
      const notionHeader = document.querySelector('.notion-header');
      if (coverWrapper) coverWrapper.classList.remove('hidden');
      if (notionHeader) notionHeader.classList.remove('hidden');

      // Set Combined Calendar header info
      const titleInput = $('notion-page-title');
      if (titleInput) {
        titleInput.value = 'Kalender Gabungan';
        titleInput.readOnly = true;
      }

      const emojiEl = $('notion-emoji-icon');
      if (emojiEl) emojiEl.textContent = '📅';

      const coverEl = $('notion-cover');
      if (coverEl) coverEl.style.backgroundImage = 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';

      const coverActions = document.querySelector('.notion-cover-actions');
      if (coverActions) coverActions.classList.add('hidden');

      const editBtn = $('btn-notion-edit-toggle');
      if (editBtn) editBtn.classList.add('hidden');
      const cancelBtn = $('btn-notion-edit-cancel');
      if (cancelBtn) cancelBtn.classList.add('hidden');
      const deleteBtn = $('btn-notion-delete');
      if (deleteBtn) deleteBtn.classList.add('hidden');

      const accessContainer = $('notion-page-access-container');
      if (accessContainer) accessContainer.innerHTML = '';

      const breadcrumbs = $('notion-breadcrumbs');
      if (breadcrumbs) breadcrumbs.innerHTML = '<span class="notion-breadcrumb-item">Kalender Gabungan</span>';

      renderNotionCalendar();
    }
  }

  // Re-render sidebar lists to apply active highlighting
  renderRooms();
  renderUsers();
  if (typeof renderNotionTree === 'function') renderNotionTree();

  // Auto-switch sidebar tab to match view without auto-expanding
  if (viewName === 'chat') {
    const activeTabBtn = document.querySelector('#tab-btn-chat');
    if (activeTabBtn && !activeTabBtn.classList.contains('active')) {
      switchSidebarTab('chat', false);
    }
  } else if (viewName === 'sharing') {
    const activeTabBtn = document.querySelector('#tab-btn-files');
    if (activeTabBtn && !activeTabBtn.classList.contains('active')) {
      switchSidebarTab('files', false);
    }
  } else if (viewName === 'notion' || viewName === 'notion-calendar') {
    const activeTabBtn = document.querySelector('#tab-btn-notion');
    if (activeTabBtn && !activeTabBtn.classList.contains('active')) {
      switchSidebarTab('notion', false);
    }
  }
}

function initSharingEvents() {
  // Navigation
  $('btn-sharing-folder').addEventListener('click', () => {
    switchView('sharing');
  });

  // Handle selectable pills change
  document.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') {
      const pill = e.target.closest('.recipient-pill');
      if (pill) {
        pill.classList.toggle('selected', e.target.checked);
      }
    }
  });

  // Tab click
  document.querySelectorAll('.sharing-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sharing-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      sharingCurrentPage = 1;
      renderDocumentsTable();
    });
  });

  // Search & Filter change
  $('sharing-search').addEventListener('input', () => {
    sharingCurrentPage = 1;
    renderDocumentsTable();
  });
  $('filter-month').addEventListener('change', () => {
    sharingCurrentPage = 1;
    renderDocumentsTable();
  });
  $('filter-year').addEventListener('change', () => {
    sharingCurrentPage = 1;
    renderDocumentsTable();
  });

  // Close modals
  $('modal-upload-close').addEventListener('click', () => $('modal-upload-overlay').classList.add('hidden'));
  $('modal-edit-close').addEventListener('click', () => $('modal-edit-overlay').classList.add('hidden'));

  // Trigger Upload modal
  $('btn-upload-doc').addEventListener('click', () => {
    $('doc-upload-form').reset();
    selectedUploadFile = null;
    $('upload-file-info').classList.add('hidden');
    $('upload-error').textContent = '';

    // Set default date to now
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    $('upload-doc-date').value = `${year}-${month}-${day}`;

    // Hide or show 'Kontrak' based on role
    const selectType = $('upload-doc-type');
    const kontrakOpt = selectType.querySelector('option[value="Kontrak"]');
    if (currentUser.role === 'staff') {
      if (kontrakOpt) kontrakOpt.style.display = 'none';
    } else {
      if (kontrakOpt) kontrakOpt.style.display = '';
    }

    renderRecipientSelectors();
    $('modal-upload-overlay').classList.remove('hidden');
  });

  // Form submits
  $('doc-upload-form').addEventListener('submit', uploadDocSubmit);
  $('doc-edit-form').addEventListener('submit', editDocSubmit);

  // Drag & drop
  setupDragAndDrop();
}

function initSharingFolder() {
  renderSharingTabs();

  // Set default active tab based on role
  document.querySelectorAll('.sharing-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (currentUser.role === 'top management') {
    activeTab = 'semua';
    $('tab-semua-btn').classList.add('active');
  } else if (currentUser.role === 'management') {
    activeTab = 'divisi';
    $('tab-divisi-btn').classList.add('active');
  } else {
    activeTab = 'masuk';
    document.querySelector('.sharing-tab-btn[data-tab="masuk"]').classList.add('active');
  }

  updateSharingCounts();
  loadSharingProjects();
  loadSharingRecipients().then(() => {
    renderRecipientSelectors();
  });
  loadSharedDocuments();
}

function renderSharingTabs() {
  const tabDivisi = $('tab-divisi-btn');
  const tabSemua = $('tab-semua-btn');

  // Default hidden
  tabDivisi.classList.add('hidden');
  tabSemua.classList.add('hidden');

  if (currentUser.role === 'management') {
    tabDivisi.classList.remove('hidden');
  } else if (currentUser.role === 'top management') {
    tabSemua.classList.remove('hidden');
  }
}

async function updateSharingCounts() {
  const counts = await apiFetch('/api/documents/counts');
  if (counts) {
    $('stats-in-today').textContent = counts.todayInCount;
    $('stats-out-today').textContent = counts.todayOutCount;
    $('stats-in-total').textContent = counts.totalInCount;
    $('stats-out-total').textContent = counts.totalOutCount;
  }
}

async function loadSharingProjects() {
  const data = await apiFetch('/api/documents/projects');
  if (data) {
    projects = data;
    const upProj = $('upload-project-name');
    const editProj = $('edit-project-name');

    const placeholder = '<option value="" disabled selected>Pilih Proyek</option>';
    const options = data.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');

    upProj.innerHTML = placeholder + options;
    editProj.innerHTML = placeholder + options;
  }
}

async function loadSharingRecipients() {
  const data = await apiFetch('/api/documents/recipients');
  if (data) {
    recipientsList = data;
  }
}

function renderRecipientSelectors() {
  const upContainer = $('upload-recipient-container');
  const editContainer = $('edit-recipient-container');

  upContainer.innerHTML = '';
  editContainer.innerHTML = '';

  if (currentUser.role === 'staff') {
    // Staff sends to divisions and roles
    const divisions = ['Marketing', 'SDM', 'Keuangan', 'Operasional'];
    const roles = ['Staff', 'SM', 'Direktur Umum', 'Wakil Direktur'];

    const getHtml = () => `
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em;">DIVISI</div>
      <div class="recipient-pill-container" style="margin-bottom: 12px;">
        ${divisions.map(div => `
          <label class="recipient-pill">
            <input type="checkbox" name="recipients-division" value="Divisi ${div}"> Divisi ${div}
          </label>
        `).join('')}
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em;">JABATAN / ROLE</div>
      <div class="recipient-pill-container">
        ${roles.map(role => `
          <label class="recipient-pill">
            <input type="checkbox" name="recipients-role" value="${role}"> ${role}
          </label>
        `).join('')}
      </div>
    `;

    upContainer.innerHTML = getHtml();
    editContainer.innerHTML = getHtml();
  } else {
    // Management/Top Management sends to specific users
    const filtered = recipientsList.filter(user => {
      if (currentUser.role === 'management') {
        return user.role === 'management' || user.role === 'top management';
      }
      return true;
    });

    const userCheckboxes = filtered
      .filter(user => user.username !== currentUser.username)
      .map(user => `
        <label class="recipient-item">
          <input type="checkbox" name="recipients-user" value="${esc(user.name)}"> ${esc(user.name)} (${user.jabatan})
        </label>
      `).join('');

    const getHtml = () => `
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600; letter-spacing: 0.05em;">PENGGUNA</div>
      <div class="recipient-grid" style="max-height: 120px;">
        ${userCheckboxes || '<span style="font-size: 12px; color: var(--text-muted);">Tidak ada pengguna lain</span>'}
      </div>
    `;

    upContainer.innerHTML = getHtml();
    editContainer.innerHTML = getHtml();
  }
}

async function loadSharedDocuments() {
  const data = await apiFetch('/api/documents');
  if (data) {
    sharedDocuments = data;
    renderDocumentsTable();
  }
}

function getDisplayRecipients(penerimaStr) {
  const recs = (penerimaStr || '').split(',').map(r => r.trim()).filter(Boolean);

  const isGroupLabel = (str) => {
    return str.startsWith('Divisi ') ||
      str.startsWith('SM ') ||
      str.startsWith('Staff ') ||
      str === 'Direktur Umum' ||
      str === 'Wakil Direktur' ||
      str === 'Direktur' ||
      str === 'Semua SM' ||
      str === 'Semua Staff';
  };

  const groupLabels = recs.filter(isGroupLabel);
  if (groupLabels.length > 0) {
    return groupLabels;
  }
  return recs;
}

function renderDocumentsTable() {
  const tbody = $('sharing-table-body');
  const emptyDiv = $('sharing-empty');
  const paginationDiv = $('sharing-pagination');
  tbody.innerHTML = '';

  const searchVal = $('sharing-search').value.toLowerCase().trim();
  const filterMonth = $('filter-month').value;
  const filterYear = $('filter-year').value;

  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional'
  };
  const divLabel = divisionLabels[currentUser.division] || '';

  const filtered = sharedDocuments.filter(doc => {
    // 1. Tab Filter
    if (activeTab === 'keluar') {
      if (doc.senderName !== currentUser.display_name) return false;
    } else if (activeTab === 'masuk') {
      if (doc.senderName === currentUser.display_name) return false;
      const recs = (doc.penerima || '').split(',').map(r => r.trim());
      const isRecipient = recs.includes(currentUser.display_name) ||
        recs.includes(`Divisi ${divLabel}`);
      if (!isRecipient) return false;
    } else if (activeTab === 'divisi') {
      // For SM, backend already filtered to their division list.
    } else if (activeTab === 'semua') {
      // For Direktur
    }

    // 2. Search Filter
    if (searchVal) {
      const matchSearch =
        (doc.document_name || '').toLowerCase().includes(searchVal) ||
        (doc.document_number || '').toLowerCase().includes(searchVal) ||
        (doc.document_type || '').toLowerCase().includes(searchVal) ||
        (doc.senderName || '').toLowerCase().includes(searchVal) ||
        (doc.description || '').toLowerCase().includes(searchVal);
      if (!matchSearch) return false;
    }

    // 3. Month Filter
    const docDate = new Date(doc.tgl);
    if (filterMonth !== '') {
      if (docDate.getMonth() !== parseInt(filterMonth, 10)) return false;
    }

    // 4. Year Filter
    if (filterYear !== '') {
      if (docDate.getFullYear() !== parseInt(filterYear, 10)) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    emptyDiv.classList.remove('hidden');
    if (paginationDiv) paginationDiv.classList.add('hidden');
    return;
  }
  emptyDiv.classList.add('hidden');

  // Calculate Pagination parameters
  const totalPages = Math.ceil(filtered.length / sharingPageSize) || 1;
  if (sharingCurrentPage > totalPages) sharingCurrentPage = totalPages;
  if (sharingCurrentPage < 1) sharingCurrentPage = 1;

  // Render pagination controls
  if (paginationDiv) {
    paginationDiv.classList.remove('hidden');
    const pageInfo = $('sharing-page-info');
    if (pageInfo) pageInfo.textContent = `Halaman ${sharingCurrentPage} dari ${totalPages}`;

    const prevBtn = $('btn-sharing-prev');
    const nextBtn = $('btn-sharing-next');
    if (prevBtn) prevBtn.disabled = (sharingCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (sharingCurrentPage === totalPages);
  }

  // Get current page items
  const startIndex = (sharingCurrentPage - 1) * sharingPageSize;
  const pageItems = filtered.slice(startIndex, startIndex + sharingPageSize);

  pageItems.forEach(doc => {
    const tr = document.createElement('tr');

    const dateStr = new Date(doc.tgl).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const senderDivLabel = divisionLabels[doc.senderDivision] || doc.senderDivision || '';
    const senderStr = `${esc(doc.senderName)}<span class="doc-sub">${esc(senderDivLabel)}</span>`;

    const typeBadge = `<span class="badge-type ${doc.document_type.toLowerCase()}">${esc(doc.document_type)}</span>` +
      (doc.sub_tipe ? `<span class="doc-sub">${esc(doc.sub_tipe)}</span>` : '');

    const nameStr = `<span class="doc-title">${esc(doc.document_name)}</span>` +
      `<span class="doc-sub" style="font-family: var(--font-mono);">${esc(doc.document_number)}</span>`;

    const displayRecs = getDisplayRecipients(doc.penerima);
    const recipientsStr = displayRecs.map(r => {
      const tagClass = getTagClassForRecipient(r);
      return `<span class="tag-pill ${tagClass}" style="margin: 2px;">${esc(r)}</span>`;
    }).join(' ');

    const canEdit = doc.senderName === currentUser.display_name;
    const editBtn = canEdit
      ? `<button class="btn-action edit-btn" onclick="event.stopPropagation(); openEditModal('${doc.id}')">Ubah</button>`
      : '';

    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      openDetailModal(doc.id);
    });

    tr.innerHTML = `
      <td style="white-space: nowrap;">${dateStr}</td>
      <td>${senderStr}</td>
      <td>${typeBadge}</td>
      <td>${nameStr}</td>
      <td style="max-width: 200px;">${recipientsStr}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action view-btn" onclick="event.stopPropagation(); openDetailModal('${doc.id}')">Detail</button>
          ${editBtn}
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function changeSharingPage(dir) {
  sharingCurrentPage += dir;
  renderDocumentsTable();
}
window.changeSharingPage = changeSharingPage;

function setupDragAndDrop() {
  const dropzone = $('upload-dropzone');
  const fileInput = $('upload-file-input');

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleSelectedFile(fileInput.files[0]);
    }
  });
}

async function handleSelectedFile(file) {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    await showCustomAlert('Format berkas tidak didukung! Hanya PDF, DOC, DOCX, XLS, XLSX.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    await showCustomAlert('Ukuran berkas maksimal adalah 10MB!');
    return;
  }

  selectedUploadFile = file;
  const fileInfo = $('upload-file-info');
  fileInfo.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  fileInfo.classList.remove('hidden');
}

function resolveRecipientSelections(containerId) {
  const container = $(containerId);
  if (!container) return [];

  const resolvedRecipients = [];
  if (currentUser.role === 'staff') {
    const selectedDivs = [];
    container.querySelectorAll('input[name="recipients-division"]:checked').forEach(cb => {
      selectedDivs.push(cb.value.replace('Divisi ', '').trim()); // e.g. 'Marketing'
    });

    const selectedRoles = [];
    container.querySelectorAll('input[name="recipients-role"]:checked').forEach(cb => {
      selectedRoles.push(cb.value.trim()); // e.g. 'SM'
    });

    if (selectedDivs.length === 0 && selectedRoles.length === 0) {
      return null;
    }

    // Now, resolve based on checked options:
    if (selectedDivs.length > 0 && selectedRoles.length > 0) {
      // Both divisions and roles selected
      selectedDivs.forEach(divName => {
        selectedRoles.forEach(roleName => {
          let groupLabel = '';
          if (roleName === 'Direktur Umum') {
            groupLabel = 'Direktur Umum';
          } else if (roleName === 'Wakil Direktur') {
            groupLabel = 'Wakil Direktur';
          } else if (roleName === 'Direktur') {
            groupLabel = 'Direktur';
          } else {
            groupLabel = `${roleName} ${divName}`;
          }

          if (!resolvedRecipients.includes(groupLabel)) {
            resolvedRecipients.push(groupLabel);
          }

          // Add individual users in this division with this role
          const matchingUsers = recipientsList.filter(u => {
            const matchDiv = (u.divisi || '').toLowerCase() === divName.toLowerCase();
            const matchRole = (u.jabatan || '').toLowerCase() === roleName.toLowerCase() ||
              ((roleName === 'Direktur Umum' || roleName === 'Wakil Direktur' || roleName === 'Direktur') && u.role === 'top management');
            return matchDiv && matchRole;
          });

          matchingUsers.forEach(u => {
            if (!resolvedRecipients.includes(u.name)) {
              resolvedRecipients.push(u.name);
            }
          });
        });
      });

      // Special case: if top management is selected, ensure all Top Management are added as individuals too
      if (selectedRoles.includes('Direktur Umum') || selectedRoles.includes('Wakil Direktur') || selectedRoles.includes('Direktur')) {
        const direkturs = recipientsList.filter(u => u.role === 'top management' || u.jabatan === 'Direktur Umum' || u.jabatan === 'Wakil Direktur' || u.jabatan === 'Direktur');
        direkturs.forEach(u => {
          if (!resolvedRecipients.includes(u.name)) {
            resolvedRecipients.push(u.name);
          }
        });
      }
    } else if (selectedDivs.length > 0) {
      // Only divisions selected (sends to entire division)
      selectedDivs.forEach(divName => {
        const groupLabel = `Divisi ${divName}`;
        if (!resolvedRecipients.includes(groupLabel)) {
          resolvedRecipients.push(groupLabel);
        }

        const matchingUsers = recipientsList.filter(u => (u.divisi || '').toLowerCase() === divName.toLowerCase());
        matchingUsers.forEach(u => {
          if (!resolvedRecipients.includes(u.name)) {
            resolvedRecipients.push(u.name);
          }
        });
      });
    } else if (selectedRoles.length > 0) {
      // Only roles selected (sends to this role in all divisions)
      selectedRoles.forEach(roleName => {
        let groupLabel = '';
        if (roleName === 'Direktur Umum') {
          groupLabel = 'Direktur Umum';
        } else if (roleName === 'Wakil Direktur') {
          groupLabel = 'Wakil Direktur';
        } else if (roleName === 'Direktur') {
          groupLabel = 'Direktur';
        } else if (roleName === 'SM') {
          groupLabel = 'Semua SM';
        } else {
          groupLabel = 'Semua Staff';
        }

        if (!resolvedRecipients.includes(groupLabel)) {
          resolvedRecipients.push(groupLabel);
        }

        const matchingUsers = recipientsList.filter(u => {
          if (roleName === 'Direktur Umum') {
            return u.jabatan === 'Direktur Umum' || (u.role === 'top management' && u.jabatan === 'Direktur Umum');
          } else if (roleName === 'Wakil Direktur') {
            return u.jabatan === 'Wakil Direktur' || (u.role === 'top management' && u.jabatan === 'Wakil Direktur');
          } else if (roleName === 'Direktur') {
            return u.role === 'top management' || u.jabatan === 'Direktur';
          } else if (roleName === 'SM') {
            return u.jabatan === 'SM';
          } else {
            return u.jabatan === 'Staff';
          }
        });

        matchingUsers.forEach(u => {
          if (!resolvedRecipients.includes(u.name)) {
            resolvedRecipients.push(u.name);
          }
        });
      });
    }
  } else {
    // Management/Top Management
    container.querySelectorAll('input[name="recipients-user"]:checked').forEach(cb => {
      resolvedRecipients.push(cb.value);
    });

    if (resolvedRecipients.length === 0) {
      return null;
    }
  }

  return resolvedRecipients;
}

async function uploadDocSubmit(e) {
  e.preventDefault();
  $('upload-error').textContent = '';

  if (!selectedUploadFile) {
    $('upload-error').textContent = 'Silakan pilih berkas dokumen terlebih dahulu!';
    return;
  }

  const resolvedRecipients = resolveRecipientSelections('upload-recipient-container');
  if (!resolvedRecipients) {
    $('upload-error').textContent = 'Pilih minimal satu penerima (Divisi atau Jabatan)!';
    return;
  }

  const formData = new FormData();
  formData.append('project_name', $('upload-project-name').value);
  formData.append('document_type', $('upload-doc-type').value);
  formData.append('sub_tipe', $('upload-sub-tipe').value.trim());
  formData.append('document_number', $('upload-doc-number').value.trim());
  formData.append('document_name', $('upload-doc-name').value.trim());
  formData.append('description', $('upload-description').value.trim());
  formData.append('penerima', JSON.stringify(resolvedRecipients));
  formData.append('file', selectedUploadFile);
  formData.append('senderName', currentUser.display_name);
  formData.append('senderDivision', currentUser.division);
  formData.append('userId', currentUser.id);
  formData.append('tgl', $('upload-doc-date').value);

  try {
    const res = await fetch(`${API}/api/documents/submit_document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengunggah dokumen.');

    $('modal-upload-overlay').classList.add('hidden');
    $('doc-upload-form').reset();
    selectedUploadFile = null;
    $('upload-file-info').classList.add('hidden');

    await showCustomAlert('Dokumen berhasil dikirim!');
    await initSharingFolder();
  } catch (err) {
    $('upload-error').textContent = err.message;
  }
}

async function editDocSubmit(e) {
  e.preventDefault();
  $('edit-error').textContent = '';

  const docId = $('edit-doc-id').value;

  const resolvedRecipients = resolveRecipientSelections('edit-recipient-container');
  if (!resolvedRecipients) {
    $('edit-error').textContent = 'Pilih minimal satu penerima (Divisi atau Jabatan)!';
    return;
  }

  const body = {
    id: docId,
    project_name: $('edit-project-name').value,
    document_type: $('edit-doc-type').value,
    sub_tipe: $('edit-sub-tipe').value.trim(),
    document_number: $('edit-doc-number').value.trim(),
    document_name: $('edit-doc-name').value.trim(),
    description: $('edit-description').value.trim(),
    penerima: JSON.stringify(resolvedRecipients),
    tgl: $('edit-doc-date').value
  };

  try {
    const res = await apiFetch('/api/documents/edit_document', {
      method: 'PUT',
      body
    });

    if (res?.error) throw new Error(res.error);

    $('modal-edit-overlay').classList.add('hidden');
    await showCustomAlert('Informasi dokumen berhasil diubah!');
    await initSharingFolder();
  } catch (err) {
    $('edit-error').textContent = err.message;
  }
}

function openEditModal(docId) {
  const doc = sharedDocuments.find(d => d.id === docId);
  if (!doc) return;

  $('edit-doc-id').value = doc.id;
  $('edit-doc-type').value = doc.document_type;
  $('edit-sub-tipe').value = doc.sub_tipe || '';
  $('edit-project-name').value = doc.project_name;
  $('edit-doc-number').value = doc.document_number;
  $('edit-doc-name').value = doc.document_name;
  $('edit-description').value = doc.description || '';

  if (doc.tgl) {
    const d = new Date(doc.tgl);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    $('edit-doc-date').value = `${year}-${month}-${day}`;
  } else {
    $('edit-doc-date').value = '';
  }

  const container = $('edit-recipient-container');
  renderRecipientSelectors();

  const recs = (doc.penerima || '').split(',').map(r => r.trim());

  if (currentUser.role === 'staff') {
    // Check divisions
    const divisions = ['Marketing', 'SDM', 'Keuangan', 'Operasional'];
    divisions.forEach(div => {
      const checkbox = container.querySelector(`input[name="recipients-division"][value="Divisi ${div}"]`);
      if (checkbox) {
        const isDivChecked = recs.includes(`Divisi ${div}`) ||
          recs.includes(`SM ${div}`) ||
          recs.includes(`Staff ${div}`);
        if (isDivChecked) {
          checkbox.checked = true;
          checkbox.closest('.recipient-pill')?.classList.add('selected');
        }
      }
    });

    // Check roles
    const roles = ['Staff', 'SM', 'Direktur Umum', 'Wakil Direktur'];
    roles.forEach(role => {
      const checkbox = container.querySelector(`input[name="recipients-role"][value="${role}"]`);
      if (checkbox) {
        let isRoleChecked = false;
        if (role === 'Direktur Umum') {
          isRoleChecked = recs.includes('Direktur Umum');
        } else if (role === 'Wakil Direktur') {
          isRoleChecked = recs.includes('Wakil Direktur');
        } else if (role === 'SM') {
          isRoleChecked = recs.includes('Semua SM') || recs.some(r => r.startsWith('SM '));
        } else if (role === 'Staff') {
          isRoleChecked = recs.includes('Semua Staff') || recs.some(r => r.startsWith('Staff '));
        }

        if (isRoleChecked) {
          checkbox.checked = true;
          checkbox.closest('.recipient-pill')?.classList.add('selected');
        }
      }
    });
  } else {
    recs.forEach(rec => {
      const checkbox = container.querySelector(`input[name="recipients-user"][value="${rec}"]`);
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  }

  $('modal-edit-overlay').classList.remove('hidden');
}
window.openEditModal = openEditModal;

function openDetailModal(docId) {
  const doc = sharedDocuments.find(d => d.id === docId);
  if (!doc) return;

  $('peek-doc-name').textContent = doc.document_name;
  $('peek-doc-number').textContent = doc.document_number;
  $('peek-doc-type').textContent = doc.document_type + (doc.sub_tipe ? ` (${doc.sub_tipe})` : '');
  $('peek-project-name').textContent = doc.project_name;
  $('peek-description').textContent = doc.description || 'Tidak ada deskripsi.';

  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional'
  };
  const senderDiv = divisionLabels[doc.senderDivision] || doc.senderDivision || '';
  $('peek-sender').textContent = `${doc.senderName} (${senderDiv})`;

  $('peek-tgl').textContent = new Date(doc.tgl).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const displayRecs = getDisplayRecipients(doc.penerima);
  $('peek-recipients').innerHTML = displayRecs.map(r => {
    const tagClass = getTagClassForRecipient(r);
    return `<span class="tag-pill ${tagClass}" style="margin: 3px;">${esc(r)}</span>`;
  }).join(' ');

  const downloadBtn = $('peek-btn-download');
  downloadBtn.href = doc.file;

  const previewContainer = $('peek-preview-container');
  const placeholder = $('peek-preview-placeholder');

  const existingPreview = previewContainer.querySelector('.preview-element');
  if (existingPreview) existingPreview.remove();

  placeholder.classList.add('hidden');

  const fileUrl = doc.file;
  const ext = fileUrl.substring(fileUrl.lastIndexOf('.')).toLowerCase();

  let fileIcon = '📄';
  let fileTypeLabel = 'Dokumen';

  if (ext === '.pdf') {
    fileIcon = '📕';
    fileTypeLabel = 'Dokumen PDF';
  } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    fileIcon = '🖼️';
    fileTypeLabel = 'Gambar / Foto';
  } else {
    fileIcon = '📁';
    fileTypeLabel = 'Berkas';
  }
  const targetUrl = `/api/documents/preview/${doc.id}?token=${encodeURIComponent(token)}`;

  const actionCard = document.createElement('div');
  actionCard.className = 'preview-element';
  actionCard.style.display = 'flex';
  actionCard.style.flexDirection = 'column';
  actionCard.style.alignItems = 'center';
  actionCard.style.justifyContent = 'center';
  actionCard.style.gap = '16px';
  actionCard.style.padding = '24px';
  actionCard.style.textAlign = 'center';
  actionCard.style.width = '100%';
  actionCard.style.height = '100%';

  actionCard.innerHTML = `
    <span style="font-size: 48px; line-height: 1;">${fileIcon}</span>
    <div>
      <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${esc(doc.document_name)}</div>
      <div style="font-size: 12px; color: var(--text-secondary);">${fileTypeLabel}</div>
    </div>
    <button class="btn-primary-sm" onclick="window.open('${targetUrl}', '_blank')" style="display: inline-flex; align-items: center; gap: 6px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
      </svg>
      Buka Lampiran di Tab Baru
    </button>
  `;
  previewContainer.appendChild(actionCard);

  $('side-peek-backdrop').classList.remove('hidden');
  $('side-peek-panel').classList.add('open');
}
window.openDetailModal = openDetailModal;

/* ─── NOTION WORKSPACE STATE ─── */
let notionPages = [];
let currentDbRows = [];
let notionEditMode = false;
let notionCalendarDate = new Date();
let emojiPickerTarget = 'page'; // 'page' or 'peek'
let activeDbView = 'table';
let currentPeekRowId = null;
let dbFilterText = '';
let dbFilterStatus = '';
let dbFilterPriority = '';
let dbFilterAssignee = '';
let notionCollapsedPages = {};
let notionIsCollapsed = false;

/* ─── NOTION WORKSPACE CONTROLLERS ─── */

async function loadNotionWorkspace() {
  const pages = await apiFetch('/api/notion/pages');
  if (pages) {
    notionPages = pages;
    renderNotionTree();
  }
}
window.loadNotionWorkspace = loadNotionWorkspace;

function renderNotionTree() {
  const treeContainer = $('notion-page-list');
  if (!treeContainer) return;

  const calendarActive = (currentView === 'notion-calendar') ? ' active' : '';
  treeContainer.innerHTML = `
    <li id="btn-notion-calendar" class="room-item notion-special-item${calendarActive}" onclick="switchToNotionCalendar()">
      <span class="room-hash" style="font-style: normal; margin-right: 8px;">📅</span>
      <div class="room-info">
        <div class="room-name">Kalender Gabungan</div>
      </div>
    </li>
  `;

  if (notionIsCollapsed) {
    return;
  }

  // Filter out database rows (pages whose parent is a database)
  const nonRowPages = notionPages.filter(p => {
    if (!p.parent_id) return true;
    const parent = notionPages.find(x => x.id === p.parent_id);
    return !(parent && parent.is_database);
  });

  const buildTree = (parentId) => {
    return nonRowPages.filter(p => p.parent_id === parentId);
  };

  const rootPages = buildTree(null);

  const renderNode = (page, depth = 0) => {
    const children = buildTree(page.id);
    const hasChildren = children.length > 0;
    const isCollapsed = notionCollapsedPages[page.id];
    const isActive = currentNotionPageId === page.id && currentView === 'notion';

    const li = document.createElement('li');
    li.className = `room-item notion-tree-item${isActive ? ' active' : ''}`;
    li.style.paddingLeft = `${depth * 12 + 8}px`;
    li.dataset.pageId = page.id;

    const arrow = hasChildren
      ? `<span class="tree-arrow" onclick="toggleNotionPageCollapse(event, '${page.id}')">${isCollapsed ? '▸' : '▾'}</span>`
      : `<span class="tree-arrow-empty"></span>`;

    const icon = page.icon || (page.is_database ? '📅' : '📄');

    li.innerHTML = `
      ${arrow}
      <span class="room-hash" style="font-style: normal; margin-right: 4px;" onclick="openNotionPage('${page.id}')">${icon}</span>
      <div class="room-info" onclick="openNotionPage('${page.id}')">
        <div class="room-name">${esc(page.title)}</div>
      </div>
    `;

    treeContainer.appendChild(li);

    if (hasChildren && !isCollapsed) {
      children.forEach(child => renderNode(child, depth + 1));
    }
  };

  const renderGroupHeader = (title) => {
    const li = document.createElement('li');
    li.className = 'notion-group-header';
    li.innerHTML = `<span>${title}</span>`;
    treeContainer.appendChild(li);
  };

  const renderEmptyPlaceholder = () => {
    const li = document.createElement('li');
    li.className = 'notion-empty-group-item';
    li.textContent = 'Tidak ada halaman';
    treeContainer.appendChild(li);
  };

  // Group root-level pages
  const publicRoots = rootPages.filter(p => p.access_level === 'public' && !p.allowed_divisions);
  const divisionRoots = rootPages.filter(p => p.allowed_divisions);
  const roleRoots = rootPages.filter(p => p.access_level !== 'public' && !p.allowed_divisions);

  // 1. Public Pages
  renderGroupHeader("🌍 Halaman Publik");
  if (publicRoots.length === 0) {
    renderEmptyPlaceholder();
  } else {
    publicRoots.forEach(page => renderNode(page, 0));
  }

  // 2. Division Pages
  renderGroupHeader("🏢 Halaman Divisi");
  if (divisionRoots.length === 0) {
    renderEmptyPlaceholder();
  } else {
    divisionRoots.forEach(page => renderNode(page, 0));
  }

  // 3. Role Pages
  renderGroupHeader("🔑 Akses Peran");
  if (roleRoots.length === 0) {
    renderEmptyPlaceholder();
  } else {
    roleRoots.forEach(page => renderNode(page, 0));
  }
}
window.renderNotionTree = renderNotionTree;

function toggleNotionPageCollapse(event, pageId) {
  event.stopPropagation();
  notionCollapsedPages[pageId] = !notionCollapsedPages[pageId];
  renderNotionTree();
}
window.toggleNotionPageCollapse = toggleNotionPageCollapse;

function toggleNotionCollapse() {
  notionIsCollapsed = !notionIsCollapsed;
  const arrow = $('notion-arrow');
  if (arrow) {
    arrow.textContent = notionIsCollapsed ? '▸' : '▾';
  }
  renderNotionTree();
}
window.toggleNotionCollapse = toggleNotionCollapse;

async function createNewNotionPage(event) {
  if (event) event.stopPropagation();
  const title = await showCustomPrompt("Masukkan judul halaman baru:");
  if (title === null) return;
  const pageTitle = title.trim() || "Tanpa Judul";

  const isDb = await showCustomConfirm("Apakah Anda ingin membuat halaman ini sebagai Database?\n\n(Klik 'OK' untuk membuat Database, 'Batal' untuk membuat Wiki/Catatan biasa)");

  try {
    const pageData = {
      title: pageTitle,
      content: isDb ? "Database baru untuk tugas dan proyek." : "# " + pageTitle + "\n\nTulis sesuatu di sini...",
      icon: isDb ? "📅" : "📄",
      cover_image: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      parent_id: null,
      is_database: isDb,
      database_view: isDb ? "table" : "table",
      properties: {}
    };

    const newPage = await apiFetch('/api/notion/pages', {
      method: 'POST',
      body: pageData
    });

    if (newPage) {
      await loadNotionWorkspace();
      openNotionPage(newPage.id);
    }
  } catch (err) {
    console.error("Gagal membuat halaman Notion:", err);
  }
}
window.createNewNotionPage = createNewNotionPage;

async function addSubpageToCurrent() {
  if (!currentNotionPageId) return;
  const title = await showCustomPrompt("Masukkan judul sub-halaman baru:");
  if (title === null) return;
  const pageTitle = title.trim() || "Tanpa Judul";

  const isDb = await showCustomConfirm("Apakah Anda ingin membuat sub-halaman ini sebagai Database?\n\n(Klik 'OK' untuk membuat Database, 'Batal' untuk membuat Wiki/Catatan biasa)");

  try {
    const pageData = {
      title: pageTitle,
      content: isDb ? "Database sub-halaman baru." : "# " + pageTitle + "\n\nTulis sesuatu di sini...",
      icon: isDb ? "📅" : "📄",
      cover_image: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      parent_id: currentNotionPageId,
      is_database: isDb,
      database_view: isDb ? "table" : "table",
      properties: {}
    };

    const newPage = await apiFetch('/api/notion/pages', {
      method: 'POST',
      body: pageData
    });

    if (newPage) {
      delete notionCollapsedPages[currentNotionPageId];
      await loadNotionWorkspace();
      openNotionPage(currentNotionPageId);
    }
  } catch (err) {
    console.error("Gagal membuat sub-halaman Notion:", err);
  }
}
window.addSubpageToCurrent = addSubpageToCurrent;

async function openNotionPage(pageId) {
  const result = await apiFetch(`/api/notion/pages/${pageId}`);
  if (!result) return;

  currentNotionPageId = pageId;
  currentNotionPage = result.page;
  currentDbRows = result.children || [];
  notionEditMode = false;

  switchView('notion');

  // Render Cover
  const coverEl = $('notion-cover');
  if (coverEl) {
    if (currentNotionPage.cover_image) {
      if (currentNotionPage.cover_image.startsWith('linear-gradient')) {
        coverEl.style.backgroundImage = currentNotionPage.cover_image;
      } else {
        coverEl.style.backgroundImage = `url(${currentNotionPage.cover_image})`;
      }
    } else {
      coverEl.style.backgroundImage = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    }
  }

  // Render Emoji
  const emojiEl = $('notion-emoji-icon');
  if (emojiEl) {
    emojiEl.textContent = currentNotionPage.icon || (currentNotionPage.is_database ? '📅' : '📄');
  }

  // Render Title Breadcrumbs
  renderBreadcrumbs();

  // Set Title Input
  const titleInput = $('notion-page-title');
  if (titleInput) {
    titleInput.value = currentNotionPage.title || '';
    titleInput.readOnly = false;
  }

  // Restore action controls for standard pages
  const coverActions = document.querySelector('.notion-cover-actions');
  if (coverActions) coverActions.classList.remove('hidden');

  const editBtn = $('btn-notion-edit-toggle');
  if (editBtn) editBtn.classList.remove('hidden');
  const deleteBtn = $('btn-notion-delete');
  if (deleteBtn) deleteBtn.classList.remove('hidden');

  renderNotionPageAccess();

  // Clear search and filters
  const searchInput = $('notion-db-search');
  if (searchInput) searchInput.value = '';
  dbFilterText = '';
  dbFilterStatus = '';
  dbFilterPriority = '';
  dbFilterAssignee = '';

  const filterStatusEl = $('filter-db-status');
  if (filterStatusEl) filterStatusEl.value = '';
  const filterPriorityEl = $('filter-db-priority');
  if (filterPriorityEl) filterPriorityEl.value = '';
  const filterAssigneeEl = $('filter-db-assignee');
  if (filterAssigneeEl) filterAssigneeEl.value = '';

  // Render content area based on page type
  if (!currentNotionPage.is_database) {
    $('notion-page-content-area').classList.remove('hidden');
    $('notion-database-content-area').classList.add('hidden');

    const editBtn = $('btn-notion-edit-toggle');
    if (editBtn) editBtn.textContent = 'Ubah';
    $('notion-editor-wrapper').classList.add('hidden');
    $('notion-preview-area').classList.remove('hidden');

    const textarea = $('notion-editor-textarea');
    if (textarea) textarea.value = currentNotionPage.content || '';

    renderMarkdownPreview();
    renderSubpagesList();
  } else {
    $('notion-page-content-area').classList.add('hidden');
    $('notion-database-content-area').classList.remove('hidden');

    activeDbView = currentNotionPage.database_view || 'table';
    document.querySelectorAll('.notion-db-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === activeDbView);
    });

    renderDatabaseView();
  }
}
window.openNotionPage = openNotionPage;

function renderBreadcrumbs() {
  const container = $('notion-breadcrumbs');
  if (!container) return;

  const path = [];
  let curr = currentNotionPage;
  while (curr) {
    path.unshift(curr);
    if (curr.parent_id) {
      curr = notionPages.find(p => p.id === curr.parent_id);
    } else {
      break;
    }
  }

  container.innerHTML = '';
  path.forEach((p, idx) => {
    const isLast = idx === path.length - 1;
    const item = document.createElement('span');
    item.className = 'notion-breadcrumb-item';
    item.textContent = `${p.icon || (p.is_database ? '📅' : '📄')} ${p.title}`;
    if (!isLast) {
      item.onclick = () => openNotionPage(p.id);
      container.appendChild(item);

      const sep = document.createElement('span');
      sep.className = 'notion-breadcrumb-separator';
      sep.textContent = '/';
      container.appendChild(sep);
    } else {
      item.style.fontWeight = '500';
      item.style.color = 'var(--text-primary)';
      container.appendChild(item);
    }
  });
}
window.renderBreadcrumbs = renderBreadcrumbs;

function renderSubpagesList() {
  const container = $('notion-subpages-list');
  if (!container) return;

  container.innerHTML = '';
  if (currentDbRows.length === 0) {
    container.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); font-style: italic;">Tidak ada sub-halaman.</div>';
    return;
  }

  currentDbRows.forEach(page => {
    const item = document.createElement('div');
    item.className = 'notion-subpage-item';
    item.onclick = () => openNotionPage(page.id);

    const icon = page.icon || (page.is_database ? '📅' : '📄');
    item.innerHTML = `
      <span style="font-size: 16px;">${icon}</span>
      <span style="font-weight: 500;">${esc(page.title)}</span>
      ${page.is_database ? '<span style="font-size: 10px; background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary); margin-left: 6px;">Database</span>' : ''}
    `;
    container.appendChild(item);
  });
}
window.renderSubpagesList = renderSubpagesList;

function parseMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  let html = '';
  let inList = false;
  let inCodeBlock = false;
  let codeContent = '';

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        html += `<pre><code>${esc(codeContent.trim())}</code></pre>`;
        codeContent = '';
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      return;
    }

    const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    if (inList && !isListItem) {
      html += '</ul>';
      inList = false;
    }

    if (line.startsWith('# ')) {
      html += `<h1>${parseMarkdownInline(line.slice(2))}</h1>`;
      return;
    }
    if (line.startsWith('## ')) {
      html += `<h2>${parseMarkdownInline(line.slice(3))}</h2>`;
      return;
    }
    if (line.startsWith('### ')) {
      html += `<h3>${parseMarkdownInline(line.slice(4))}</h3>`;
      return;
    }

    if (line.trim() === '---') {
      html += '<hr style="border: none; border-top: 1px solid var(--border); margin: 20px 0;" />';
      return;
    }

    const todoMatch = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === 'x';
      const todoText = todoMatch[2];
      const strikethrough = checked ? ' style="text-decoration: line-through; color: var(--text-muted);"' : '';
      html += `
        <div class="notion-todo-item">
          <input type="checkbox" class="notion-todo-checkbox" data-line="${idx}" ${checked ? 'checked' : ''} />
          <span${strikethrough}>${parseMarkdownInline(todoText)}</span>
        </div>
      `;
      return;
    }

    if (isListItem) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${parseMarkdownInline(line.trim().slice(2))}</li>`;
      return;
    }

    if (line.startsWith('> ')) {
      html += `<blockquote>${parseMarkdownInline(line.slice(2))}</blockquote>`;
      return;
    }

    if (line.trim()) {
      html += `<p>${parseMarkdownInline(line)}</p>`;
    } else {
      html += '<br />';
    }
  });

  if (inList) {
    html += '</ul>';
  }

  return html;
}
window.parseMarkdown = parseMarkdown;

function parseMarkdownInline(text) {
  let html = esc(text);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:6px; display:block; margin: 12px auto;" />');
  html = html.replace(/@\[video\]\((.*?)\)/g, (match, url) => {
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = url.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
      const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      return `
        <div class="video-embed-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 6px; margin: 16px 0; border: 1px solid var(--border);">
          <iframe src="${embedUrl}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;"></iframe>
        </div>
      `;
    } else {
      return `
        <video src="${url}" controls style="max-width: 100%; border-radius: 6px; display: block; margin: 16px auto; border: 1px solid var(--border);"></video>
      `;
    }
  });
  return html;
}
window.parseMarkdownInline = parseMarkdownInline;

function renderMarkdownPreview() {
  const previewArea = $('notion-preview-area');
  if (!previewArea || !currentNotionPage) return;

  previewArea.innerHTML = parseMarkdown(currentNotionPage.content);

  previewArea.querySelectorAll('.notion-todo-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const lineIndex = parseInt(cb.dataset.line, 10);
      const lines = currentNotionPage.content.split('\n');
      const line = lines[lineIndex];

      if (line) {
        if (cb.checked) {
          lines[lineIndex] = line.replace(/\[\s*\]/, '[x]');
        } else {
          lines[lineIndex] = line.replace(/\[[xX]\]/, '[ ]');
        }

        currentNotionPage.content = lines.join('\n');

        const textarea = $('notion-editor-textarea');
        if (textarea) textarea.value = currentNotionPage.content;

        await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
          method: 'PUT',
          body: { content: currentNotionPage.content }
        });

        renderMarkdownPreview();
      }
    });
  });
}
window.renderMarkdownPreview = renderMarkdownPreview;

async function toggleNotionEditMode() {
  if (!currentNotionPageId) return;

  const editBtn = $('btn-notion-edit-toggle');
  const cancelBtn = $('btn-notion-edit-cancel');
  const textarea = $('notion-editor-textarea');
  const previewBlock = $('notion-preview-area');
  const editorWrapper = $('notion-editor-wrapper');

  if (!notionEditMode) {
    notionEditMode = true;
    editBtn.textContent = 'Simpan';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    editorWrapper.classList.remove('hidden');
    previewBlock.classList.add('hidden');
    renderNotionPageAccess();
    textarea.focus();
  } else {
    notionEditMode = false;
    editBtn.textContent = 'Ubah';
    if (cancelBtn) cancelBtn.classList.add('hidden');
    editorWrapper.classList.add('hidden');
    previewBlock.classList.remove('hidden');

    const updatedContent = textarea.value;
    currentNotionPage.content = updatedContent;

    const canEditAccess = true;

    const body = { content: updatedContent };

    if (canEditAccess) {
      const typeSelect = $('notion-access-type-select');
      if (typeSelect) {
        const accessType = typeSelect.value;
        if (accessType === 'public') {
          body.access_level = 'public';
          body.allowed_divisions = null;
        } else if (accessType === 'role') {
          body.access_level = $('notion-access-role-select').value;
          body.allowed_divisions = null;
        } else if (accessType === 'division') {
          body.access_level = 'public';
          const checkedDivs = Array.from(document.querySelectorAll('input[name="access-division"]:checked')).map(el => el.value);
          body.allowed_divisions = checkedDivs.join(',');
        }
      }
    }

    await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
      method: 'PUT',
      body: body
    });

    await loadNotionWorkspace();
    openNotionPage(currentNotionPageId);
  }
}
window.toggleNotionEditMode = toggleNotionEditMode;

function cancelNotionEdit() {
  if (!currentNotionPageId) return;

  notionEditMode = false;

  const editBtn = $('btn-notion-edit-toggle');
  const cancelBtn = $('btn-notion-edit-cancel');
  const textarea = $('notion-editor-textarea');
  const previewBlock = $('notion-preview-area');
  const editorWrapper = $('notion-editor-wrapper');

  if (editBtn) editBtn.textContent = 'Ubah';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (editorWrapper) editorWrapper.classList.add('hidden');
  if (previewBlock) previewBlock.classList.remove('hidden');

  if (textarea) textarea.value = currentNotionPage.content || '';
  renderMarkdownPreview();
  renderNotionPageAccess();
}
window.cancelNotionEdit = cancelNotionEdit;

async function saveNotionTitle() {
  if (!currentNotionPageId) return;

  const titleInput = $('notion-page-title');
  if (!titleInput) return;

  const newTitle = titleInput.value.trim() || 'Tanpa Judul';
  if (newTitle === currentNotionPage.title) return;

  currentNotionPage.title = newTitle;

  const updatedPage = await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
    method: 'PUT',
    body: { title: newTitle }
  });

  if (updatedPage) {
    await loadNotionWorkspace();
    renderBreadcrumbs();
  }
}
window.saveNotionTitle = saveNotionTitle;

async function deleteCurrentNotionPage() {
  if (!currentNotionPageId) return;

  const ok = await showCustomConfirm(`Apakah Anda yakin ingin menghapus halaman "${currentNotionPage.title}"? \n\nSemua sub-halaman di bawahnya juga akan dihapus secara permanen.`);
  if (!ok) return;

  try {
    const res = await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
      method: 'DELETE'
    });

    if (res) {
      currentNotionPageId = null;
      currentNotionPage = null;
      await loadNotionWorkspace();
      switchToNotionCalendar();
    }
  } catch (err) {
    console.error("Gagal menghapus halaman Notion:", err);
  }
}
window.deleteCurrentNotionPage = deleteCurrentNotionPage;

async function changeNotionCover() {
  if (!currentNotionPageId) return;

  const gradients = [
    "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    "linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
    "linear-gradient(120deg, #f6d365 0%, #fda085 100%)",
    "linear-gradient(to right, #ffc3a0 0%, #ffafbd 100%)",
    "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)"
  ];

  const input = await showCustomPrompt(
    `Pilih Cover!\n\n` +
    `Ketik nomor 1-6 untuk memilih cover gradien kustom:\n` +
    `1. Cool Grey-Blue\n` +
    `2. Warm Purple-Pink\n` +
    `3. Mint Green-Blue\n` +
    `4. Sunset Orange-Yellow\n` +
    `5. Peach Pink-Orange\n` +
    `6. Sky Blue-Teal\n\n` +
    `Atau tempel URL gambar langsung (misal: https://picsum.photos/800/200):`
  );

  if (input === null) return;
  const val = input.trim();
  if (!val) return;

  let chosenCover = val;
  const num = parseInt(val, 10);
  if (!isNaN(num) && num >= 1 && num <= 6) {
    chosenCover = gradients[num - 1];
  }

  currentNotionPage.cover_image = chosenCover;

  const updatedPage = await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
    method: 'PUT',
    body: { cover_image: chosenCover }
  });

  if (updatedPage) {
    const coverEl = $('notion-cover');
    if (coverEl) {
      if (chosenCover.startsWith('linear-gradient')) {
        coverEl.style.backgroundImage = chosenCover;
      } else {
        coverEl.style.backgroundImage = `url(${chosenCover})`;
      }
    }
  }
}
window.changeNotionCover = changeNotionCover;

function renderNotionPageAccess() {
  const container = $('notion-page-access-container');
  if (!container) return;

  if (!currentNotionPage) {
    container.innerHTML = '';
    return;
  }

  // Check if current user can edit the access settings
  // Creator OR top management, AND currentUser.role !== 'staff'
  const canEditAccess = true;

  // Determine current display info
  let accessText = '🌍 Publik (Semua Pengguna)';
  let tagClass = 'tag-blue';

  if (currentNotionPage.allowed_divisions) {
    const divs = currentNotionPage.allowed_divisions.split(',').map(d => d.toUpperCase()).join(', ');
    accessText = `🏢 Khusus Divisi: ${divs}`;
    tagClass = 'tag-green';
  } else if (currentNotionPage.access_level && currentNotionPage.access_level !== 'public') {
    const roleMap = {
      'staff': 'Staff Keatas',
      'management': 'Management Keatas',
      'top_management': 'Top Management'
    };
    accessText = `🔑 Khusus Peran: ${roleMap[currentNotionPage.access_level] || currentNotionPage.access_level}`;
    tagClass = 'tag-purple';
  }

  if (!notionEditMode) {
    container.innerHTML = `
      <div class="notion-page-access-bar">
        <span class="access-label">Akses Halaman:</span>
        <span class="tag-pill ${tagClass}">${esc(accessText)}</span>
      </div>
    `;
  } else {
    // Edit mode is active
    if (!canEditAccess) {
      // If user cannot edit, just show read-only access level during editing
      container.innerHTML = `
        <div class="notion-page-access-bar">
          <span class="access-label">Akses Halaman (Hanya Baca):</span>
          <span class="tag-pill ${tagClass}">${esc(accessText)}</span>
        </div>
      `;
      return;
    }

    // Determine default select options
    let initialAccessType = 'public';
    if (currentNotionPage.allowed_divisions) {
      initialAccessType = 'division';
    } else if (currentNotionPage.access_level && currentNotionPage.access_level !== 'public') {
      initialAccessType = 'role';
    }

    const divisions = ['marketing', 'sdm', 'keuangan', 'operasional'];
    const allowedDivsArray = currentNotionPage.allowed_divisions ? currentNotionPage.allowed_divisions.split(',').map(d => d.trim()) : [];

    const checkboxesHtml = divisions.map(div => {
      const isChecked = allowedDivsArray.includes(div) ? 'checked' : '';
      return `
        <label>
          <input type="checkbox" name="access-division" value="${div}" ${isChecked} />
          ${esc(div.toUpperCase())}
        </label>
      `;
    }).join('');

    const initialRole = currentNotionPage.access_level === 'public' ? 'staff' : currentNotionPage.access_level;

    container.innerHTML = `
      <div class="notion-page-access-edit-bar">
        <div class="field-inline">
          <label>Tipe Akses:</label>
          <select id="notion-access-type-select" onchange="onNotionAccessTypeChange()">
            <option value="public" ${initialAccessType === 'public' ? 'selected' : ''}>🌍 Publik (Semua)</option>
            <option value="role" ${initialAccessType === 'role' ? 'selected' : ''}>🔑 Batasi Peran</option>
            <option value="division" ${initialAccessType === 'division' ? 'selected' : ''}>🏢 Batasi Divisi</option>
          </select>
        </div>
        
        <div id="notion-access-role-group" class="field-inline ${initialAccessType === 'role' ? '' : 'hidden'}">
          <label>Peran Minimal:</label>
          <select id="notion-access-role-select">
            <option value="staff" ${initialRole === 'staff' ? 'selected' : ''}>Staff Keatas</option>
            <option value="management" ${initialRole === 'management' ? 'selected' : ''}>Management Keatas</option>
            <option value="top_management" ${initialRole === 'top_management' ? 'selected' : ''}>Top Management</option>
          </select>
        </div>

        <div id="notion-access-division-group" class="field-inline ${initialAccessType === 'division' ? '' : 'hidden'}">
          <label>Pilih Divisi:</label>
          <div class="access-division-checkboxes">
            ${checkboxesHtml}
          </div>
        </div>
      </div>
    `;
  }
}
window.renderNotionPageAccess = renderNotionPageAccess;

function onNotionAccessTypeChange() {
  const typeSelect = $('notion-access-type-select');
  if (!typeSelect) return;

  const type = typeSelect.value;
  const roleGroup = $('notion-access-role-group');
  const divisionGroup = $('notion-access-division-group');

  if (type === 'public') {
    if (roleGroup) roleGroup.classList.add('hidden');
    if (divisionGroup) divisionGroup.classList.add('hidden');
  } else if (type === 'role') {
    if (roleGroup) roleGroup.classList.remove('hidden');
    if (divisionGroup) divisionGroup.classList.add('hidden');
  } else if (type === 'division') {
    if (roleGroup) roleGroup.classList.add('hidden');
    if (divisionGroup) divisionGroup.classList.remove('hidden');
  }
}
window.onNotionAccessTypeChange = onNotionAccessTypeChange;


function toggleEmojiPicker(event, target) {
  if (event) event.stopPropagation();

  emojiPickerTarget = target;
  const popup = $('emoji-picker-popup');
  if (!popup) return;

  const isHidden = popup.classList.contains('hidden');
  if (isHidden) {
    popup.classList.remove('hidden');
    const rect = event.target.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY + 8}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    const closePicker = (e) => {
      if (!popup.contains(e.target) && e.target !== event.target) {
        popup.classList.add('hidden');
        document.removeEventListener('click', closePicker);
      }
    };
    document.addEventListener('click', closePicker);
  } else {
    popup.classList.add('hidden');
  }
}
window.toggleEmojiPicker = toggleEmojiPicker;

async function selectEmoji(emoji) {
  const popup = $('emoji-picker-popup');
  if (popup) popup.classList.add('hidden');

  if (emojiPickerTarget === 'page') {
    if (!currentNotionPageId) return;

    currentNotionPage.icon = emoji;
    const emojiEl = $('notion-emoji-icon');
    if (emojiEl) emojiEl.textContent = emoji;

    const updatedPage = await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
      method: 'PUT',
      body: { icon: emoji }
    });

    if (updatedPage) {
      await loadNotionWorkspace();
      renderBreadcrumbs();
    }
  } else if (emojiPickerTarget === 'peek') {
    const peekEmojiEl = $('notion-peek-emoji');
    if (peekEmojiEl) peekEmojiEl.textContent = emoji;
  }
}
window.selectEmoji = selectEmoji;

function insertEditorTag(tag) {
  const textarea = $('notion-editor-textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  let replacement = '';
  switch (tag) {
    case 'bold':
      replacement = `**${selectedText || 'tebal'}**`;
      break;
    case 'italic':
      replacement = `*${selectedText || 'miring'}*`;
      break;
    case 'code':
      replacement = `\`${selectedText || 'code'}\``;
      break;
    case 'h1':
      replacement = `\n# ${selectedText || 'Judul 1'}\n`;
      break;
    case 'h2':
      replacement = `\n## ${selectedText || 'Judul 2'}\n`;
      break;
    case 'h3':
      replacement = `\n### ${selectedText || 'Judul 3'}\n`;
      break;
    case 'bullet':
      replacement = `\n- ${selectedText || 'Item daftar'}`;
      break;
    case 'todo':
      replacement = `\n- [ ] ${selectedText || 'Tugas baru'}`;
      break;
    case 'codeblock':
      replacement = `\n\`\`\`javascript\n${selectedText || '// tulis kode di sini'}\n\`\`\`\n`;
      break;
    case 'image':
      replacement = `\n![](https://picsum.photos/400/300)\n`;
      break;
    case 'video':
      replacement = `\n@[video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n`;
      break;
  }

  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  textarea.selectionStart = start + replacement.length;
  textarea.selectionEnd = start + replacement.length;
}
window.insertEditorTag = insertEditorTag;

async function switchDbView(viewName) {
  if (!currentNotionPageId) return;

  activeDbView = viewName;
  document.querySelectorAll('.notion-db-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
    method: 'PUT',
    body: { database_view: viewName }
  });

  const p = notionPages.find(x => x.id === currentNotionPageId);
  if (p) p.database_view = viewName;

  renderDatabaseView();
}
window.switchDbView = switchDbView;

function renderDatabaseView() {
  let filteredRows = currentDbRows.filter(row => {
    const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});

    if (dbFilterText) {
      const query = dbFilterText.toLowerCase();
      if (!(row.title || '').toLowerCase().includes(query) && !(row.content || '').toLowerCase().includes(query)) {
        return false;
      }
    }

    if (dbFilterStatus) {
      if (props.status !== dbFilterStatus) return false;
    }

    if (dbFilterPriority) {
      if (props.priority !== dbFilterPriority) return false;
    }

    if (dbFilterAssignee) {
      if (props.assignee !== dbFilterAssignee) return false;
    }

    return true;
  });

  if (activeDbView === 'table') {
    renderTable(filteredRows);
  } else if (activeDbView === 'board') {
    renderBoard(filteredRows);
  } else if (activeDbView === 'calendar') {
    renderCalendar(filteredRows);
  } else if (activeDbView === 'gallery') {
    renderGallery(filteredRows);
  } else if (activeDbView === 'list') {
    renderList(filteredRows);
  } else if (activeDbView === 'timeline') {
    renderTimeline(filteredRows);
  }
}
window.renderDatabaseView = renderDatabaseView;

function renderTable(rows) {
  const container = $('notion-db-view-container');
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">Tidak ada data yang cocok dengan filter.</div>';
    return;
  }

  let html = `
    <table class="notion-table-view">
      <thead>
        <tr>
          <th>Judul</th>
          <th>Status</th>
          <th>Prioritas</th>
          <th>Divisi</th>
          <th>Mulai</th>
          <th>Tenggat</th>
          <th>Kemajuan</th>
          <th style="width: 40px;">Aksi</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(row => {
    const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
    const icon = row.icon || '📄';
    const status = props.status || 'To Do';
    const priority = props.priority || 'Low';
    const assignee = props.assignee || '';
    const startDate = props.start_date || '';
    const deadline = props.deadline || '';
    const progress = props.progress !== undefined ? props.progress : 0;

    html += `
      <tr data-row-id="${row.id}">
        <td class="table-cell-title" onclick="openNotionPeek('${row.id}')">
          <span style="margin-right: 6px;">${icon}</span>
          <span class="row-title-text">${esc(row.title)}</span>
        </td>
        <td>
          <select onchange="updateRowPropertyDirect('${row.id}', 'status', this.value)" class="notion-prop-select ${status.replace(' ', '-').toLowerCase()}">
            <option value="To Do" ${status === 'To Do' ? 'selected' : ''}>To Do</option>
            <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Done" ${status === 'Done' ? 'selected' : ''}>Done</option>
          </select>
        </td>
        <td>
          <select onchange="updateRowPropertyDirect('${row.id}', 'priority', this.value)" class="notion-prop-select priority-${priority.toLowerCase()}">
            <option value="Low" ${priority === 'Low' ? 'selected' : ''}>Low</option>
            <option value="Medium" ${priority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="High" ${priority === 'High' ? 'selected' : ''}>High</option>
          </select>
        </td>
        <td>
          <select onchange="updateRowPropertyDirect('${row.id}', 'assignee', this.value)" class="notion-prop-select assignee-${assignee}">
            <option value="">Tanpa Divisi</option>
            <option value="marketing" ${assignee === 'marketing' ? 'selected' : ''}>Marketing</option>
            <option value="sdm" ${assignee === 'sdm' ? 'selected' : ''}>SDM</option>
            <option value="keuangan" ${assignee === 'keuangan' ? 'selected' : ''}>Keuangan</option>
            <option value="operasional" ${assignee === 'operasional' ? 'selected' : ''}>Operasional</option>
          </select>
        </td>
        <td>
          <input type="date" value="${startDate}" onchange="updateRowPropertyDirect('${row.id}', 'start_date', this.value)" class="notion-table-date-input" />
        </td>
        <td>
          <input type="date" value="${deadline}" onchange="updateRowPropertyDirect('${row.id}', 'deadline', this.value)" class="notion-table-date-input" />
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" min="0" max="100" value="${progress}" onchange="updateRowPropertyDirect('${row.id}', 'progress', parseInt(this.value, 10))" class="notion-table-num-input" />
            <span style="font-size: 11px; color: var(--text-secondary);">%</span>
          </div>
        </td>
        <td style="text-align: center;">
          <button onclick="deleteDbRow('${row.id}')" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 4px;" title="Hapus">🗑️</button>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}
window.renderTable = renderTable;

async function updateRowPropertyDirect(rowId, field, value) {
  const row = currentDbRows.find(r => r.id === rowId);
  if (!row) return;

  const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
  props[field] = value;

  if (field === 'status') {
    if (value === 'Done') {
      props.progress = 100;
    } else if (value === 'To Do' && props.progress === 100) {
      props.progress = 0;
    }
  }

  row.properties = props;

  await apiFetch(`/api/notion/pages/${rowId}`, {
    method: 'PUT',
    body: { properties: props }
  });

  renderDatabaseView();
}
window.updateRowPropertyDirect = updateRowPropertyDirect;

async function deleteDbRow(rowId) {
  const row = currentDbRows.find(r => r.id === rowId);
  if (!row) return;

  const ok = await showCustomConfirm(`Apakah Anda yakin ingin menghapus "${row.title}"?`);
  if (!ok) return;

  try {
    await apiFetch(`/api/notion/pages/${rowId}`, {
      method: 'DELETE'
    });

    currentDbRows = currentDbRows.filter(r => r.id !== rowId);
    renderDatabaseView();
  } catch (err) {
    console.error("Gagal menghapus baris database:", err);
    await showCustomAlert("Gagal menghapus item. Silakan coba lagi.");
  }
}
window.deleteDbRow = deleteDbRow;

function renderBoard(rows) {
  const container = $('notion-db-view-container');
  if (!container) return;

  container.innerHTML = '';

  const columns = ['To Do', 'In Progress', 'Done'];
  const boardEl = document.createElement('div');
  boardEl.className = 'notion-board';

  columns.forEach(colName => {
    const colDiv = document.createElement('div');
    colDiv.className = 'notion-board-col';
    colDiv.dataset.status = colName;

    colDiv.addEventListener('dragover', (e) => {
      e.preventDefault();
      colDiv.classList.add('dragover');
    });
    colDiv.addEventListener('dragleave', () => {
      colDiv.classList.remove('dragover');
    });
    colDiv.addEventListener('drop', handleBoardCardDrop);

    const colTasks = rows.filter(r => {
      const props = typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {});
      return (props.status || 'To Do') === colName;
    });

    const colHeader = document.createElement('div');
    colHeader.className = 'notion-board-col-header';
    colHeader.innerHTML = `
      <span class="column-title ${colName.replace(' ', '-').toLowerCase()}">${colName}</span>
      <span class="notion-board-col-count">${colTasks.length}</span>
    `;
    colDiv.appendChild(colHeader);

    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'notion-board-cards';

    colTasks.forEach(task => {
      const props = typeof task.properties === 'string' ? JSON.parse(task.properties) : (task.properties || {});
      const icon = task.icon || '📄';
      const priority = props.priority || 'Low';
      const deadline = props.deadline || '';
      const progress = props.progress !== undefined ? props.progress : 0;

      const card = document.createElement('div');
      card.className = 'notion-board-card';
      card.draggable = true;
      card.dataset.taskId = task.id;
      card.addEventListener('dragstart', handleBoardCardDragStart);
      card.addEventListener('click', () => openNotionPeek(task.id));

      let progressHtml = '';
      if (progress > 0) {
        progressHtml = `
          <div class="card-progress-bar-container" style="margin-top: 8px;">
            <div class="card-progress-bar-fill" style="width: ${progress}%; height: 4px; background: var(--online); border-radius: 2px;"></div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${progress}% selesai</div>
          </div>
        `;
      }

      const priorityTagClass = `tag-pill tag-${priority === 'High' ? 'red' : priority === 'Medium' ? 'yellow' : 'blue'}`;

      card.innerHTML = `
        <div class="notion-board-card-title">
          <span style="font-size: 16px;">${icon}</span>
          <span>${esc(task.title)}</span>
        </div>
        <div class="notion-board-card-props">
          <span class="${priorityTagClass}">${priority}</span>
          ${props.assignee ? `<span class="tag-pill tag-gray">${esc(props.assignee.toUpperCase())}</span>` : ''}
        </div>
        <div class="notion-board-card-footer">
          ${deadline ? `<span>📅 ${deadline}</span>` : '<span></span>'}
          ${progress > 0 ? `<span>${progress}% selesai</span>` : ''}
        </div>
      `;

      cardsContainer.appendChild(card);
    });

    colDiv.appendChild(cardsContainer);
    boardEl.appendChild(colDiv);
  });

  container.appendChild(boardEl);
}
window.renderBoard = renderBoard;

let draggedCardId = null;

function handleBoardCardDragStart(e) {
  draggedCardId = e.currentTarget.dataset.taskId;
  e.dataTransfer.setData('text/plain', draggedCardId);
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.classList.add('dragging');
}
window.handleBoardCardDragStart = handleBoardCardDragStart;

async function handleBoardCardDrop(e) {
  e.preventDefault();
  const col = e.currentTarget.closest('.notion-board-col');
  if (!col) return;
  col.classList.remove('dragover');

  const newStatus = col.dataset.status;
  const taskId = e.dataTransfer.getData('text/plain') || draggedCardId;

  if (taskId && newStatus) {
    const cardEl = document.querySelector(`.notion-board-card[data-task-id="${taskId}"]`);
    if (cardEl) cardEl.classList.remove('dragging');

    await updateRowPropertyDirect(taskId, 'status', newStatus);
  }

  draggedCardId = null;
}
window.handleBoardCardDrop = handleBoardCardDrop;


function renderCalendar(rows) {
  const container = $('notion-db-view-container');
  if (!container) return;

  container.innerHTML = '';

  const calendarContainer = document.createElement('div');
  calendarContainer.className = 'notion-calendar-view-container';

  const year = notionCalendarDate.getFullYear();
  const month = notionCalendarDate.getMonth();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const calHeader = document.createElement('div');
  calHeader.className = 'calendar-nav-header';
  calHeader.innerHTML = `
    <h4>${monthNames[month]} ${year}</h4>
    <div style="display: flex; gap: 8px;">
      <button class="btn-secondary-sm" onclick="navigateDbCalendar(-1)">←</button>
      <button class="btn-secondary-sm" onclick="navigateDbCalendar(0)">Hari Ini</button>
      <button class="btn-secondary-sm" onclick="navigateDbCalendar(1)">→</button>
    </div>
  `;
  calendarContainer.appendChild(calHeader);

  const grid = document.createElement('div');
  grid.className = 'notion-calendar-grid';

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  daysOfWeek.forEach(day => {
    const dCell = document.createElement('div');
    dCell.className = 'calendar-day-header';
    dCell.textContent = day;
    grid.appendChild(dCell);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayVal = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell pad';
    cell.innerHTML = `<span class="day-num">${dayVal}</span>`;
    grid.appendChild(cell);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    cell.className = `calendar-day-cell${isToday ? ' today' : ''}`;
    cell.innerHTML = `<span class="day-num">${d}</span>`;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateTasks = rows.filter(r => {
      const props = typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {});
      return props.deadline === dateStr;
    });

    dateTasks.forEach(task => {
      const taskDiv = document.createElement('div');
      taskDiv.className = 'calendar-task-badge';
      taskDiv.onclick = () => openNotionPeek(task.id);

      const props = typeof task.properties === 'string' ? JSON.parse(task.properties) : (task.properties || {});
      const status = props.status || 'To Do';
      taskDiv.classList.add(status.replace(' ', '-').toLowerCase());
      taskDiv.textContent = `${task.icon || '📄'} ${task.title}`;

      cell.appendChild(taskDiv);
    });

    grid.appendChild(cell);
  }

  // Pad with next month's days to form a complete 6-row (42 cells) grid
  const totalRendered = firstDay + daysInMonth;
  const nextMonthPadding = 42 - totalRendered;
  for (let d = 1; d <= nextMonthPadding; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell pad';
    cell.innerHTML = `<span class="day-num">${d}</span>`;
    grid.appendChild(cell);
  }

  calendarContainer.appendChild(grid);
  container.appendChild(calendarContainer);
}
window.renderCalendar = renderCalendar;

window.navigateDbCalendar = (dir) => {
  if (dir === 0) {
    notionCalendarDate = new Date();
  } else {
    notionCalendarDate.setMonth(notionCalendarDate.getMonth() + dir);
  }
  renderDatabaseView();
};

function renderGallery(rows) {
  const container = $('notion-db-view-container');
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">Tidak ada data yang cocok dengan filter.</div>';
    return;
  }

  const galleryEl = document.createElement('div');
  galleryEl.className = 'notion-gallery-view';

  rows.forEach(row => {
    const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
    const icon = row.icon || '📄';
    const status = props.status || 'To Do';
    const cover = row.cover_image || 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';

    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.style.position = 'relative';

    const coverStyle = cover.startsWith('linear-gradient') ? `background: ${cover};` : `background-image: url(${cover}); background-size: cover; background-position: center;`;

    card.innerHTML = `
       <div class="gallery-card-cover" style="${coverStyle}"></div>
       <button onclick="event.stopPropagation(); deleteDbRow('${row.id}')" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); border: none; color: white; cursor: pointer; font-size: 16px; padding: 6px 8px; border-radius: 4px; display: none;" class="gallery-delete-btn" title="Hapus">🗑️</button>
       <div class="gallery-card-info" onclick="openNotionPeek('${row.id}')">
         <div style="display:flex; align-items:center; gap: 6px; margin-bottom: 4px;">
           <span style="font-size: 16px;">${icon}</span>
           <span class="gallery-card-title">${esc(row.title)}</span>
         </div>
         <div style="display:flex; gap: 4px; align-items:center;">
           <span class="tag-pill tag-${status === 'Done' ? 'green' : status === 'In Progress' ? 'yellow' : 'gray'}">${status}</span>
           ${props.assignee ? `<span class="tag-pill tag-blue">${esc(props.assignee.toUpperCase())}</span>` : ''}
         </div>
       </div>
     `;

    card.addEventListener('mouseenter', () => {
      card.querySelector('.gallery-delete-btn').style.display = 'block';
    });
    card.addEventListener('mouseleave', () => {
      card.querySelector('.gallery-delete-btn').style.display = 'none';
    });

    galleryEl.appendChild(card);
  });

  container.appendChild(galleryEl);
}
window.renderGallery = renderGallery;

function renderList(rows) {
  const container = $('notion-db-view-container');
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">Tidak ada data yang cocok dengan filter.</div>';
    return;
  }

  const listEl = document.createElement('div');
  listEl.className = 'notion-list-view';

  rows.forEach(row => {
    const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
    const icon = row.icon || '📄';
    const status = props.status || 'To Do';
    const priority = props.priority || 'Low';
    const assignee = props.assignee || '';
    const isDone = status === 'Done';

    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.position = 'relative';

    const titleStrikethrough = isDone ? ' style="text-decoration: line-through; color: var(--text-muted);"' : '';

    item.innerHTML = `
       <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
         <input type="checkbox" ${isDone ? 'checked' : ''} onclick="event.stopPropagation(); toggleListTaskStatus('${row.id}', '${status}')" style="cursor: pointer; width: 15px; height: 15px;" />
         <span style="font-size: 16px;">${icon}</span>
         <span class="list-item-title"${titleStrikethrough}>${esc(row.title)}</span>
       </div>
       <div style="display: flex; gap: 6px; align-items: center;">
         <span class="tag-pill tag-${priority === 'High' ? 'red' : priority === 'Medium' ? 'yellow' : 'gray'}">${priority}</span>
         ${assignee ? `<span class="tag-pill tag-blue">${esc(assignee.toUpperCase())}</span>` : ''}
         <button onclick="event.stopPropagation(); deleteDbRow('${row.id}')" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 14px; padding: 4px 8px; margin-left: 8px;" title="Hapus">🗑️</button>
       </div>
     `;

    item.onclick = () => openNotionPeek(row.id);
    listEl.appendChild(item);
  });

  container.appendChild(listEl);
}
window.renderList = renderList;

window.toggleListTaskStatus = async (rowId, currentStatus) => {
  const nextStatus = currentStatus === 'Done' ? 'To Do' : 'Done';
  await updateRowPropertyDirect(rowId, 'status', nextStatus);
};

function renderTimeline(rows) {
  const container = $('notion-db-view-container');
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">Tidak ada data yang cocok dengan filter.</div>';
    return;
  }

  const year = notionCalendarDate.getFullYear();
  const month = notionCalendarDate.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const timelineContainer = document.createElement('div');
  timelineContainer.className = 'notion-timeline-view-container';
  timelineContainer.style.display = 'flex';
  timelineContainer.style.flexDirection = 'column';
  timelineContainer.style.gap = '12px';

  const timelineNav = document.createElement('div');
  timelineNav.className = 'calendar-nav-header';
  timelineNav.style.padding = '0';
  timelineNav.innerHTML = `
    <h4 style="font-weight: 600; color: var(--text-primary); margin: 0;">Timeline: ${monthNames[month]} ${year}</h4>
    <div style="display: flex; gap: 8px;">
      <button class="btn-secondary-sm" onclick="navigateDbCalendar(-1)">&lt;</button>
      <button class="btn-secondary-sm" onclick="navigateDbCalendar(0)">Hari Ini</button>
      <button class="btn-secondary-sm" onclick="navigateDbCalendar(1)">&gt;</button>
    </div>
  `;
  timelineContainer.appendChild(timelineNav);

  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'timeline-scroll-wrapper';
  scrollWrapper.style.overflowX = 'auto';
  scrollWrapper.style.border = '1px solid var(--border)';
  scrollWrapper.style.borderRadius = '6px';
  scrollWrapper.style.background = 'var(--bg-surface)';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `200px repeat(${numDays}, 35px)`;
  grid.style.minWidth = `${200 + numDays * 35}px`;

  const leftHeader = document.createElement('div');
  leftHeader.className = 'timeline-header-cell';
  leftHeader.style.padding = '8px 12px';
  leftHeader.style.fontWeight = '600';
  leftHeader.style.borderBottom = '1px solid var(--border)';
  leftHeader.style.borderRight = '1px solid var(--border)';
  leftHeader.style.fontSize = '12px';
  leftHeader.style.background = 'var(--bg)';
  leftHeader.textContent = 'Tugas';
  grid.appendChild(leftHeader);

  for (let d = 1; d <= numDays; d++) {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'timeline-header-cell';
    dayHeader.style.padding = '8px 0';
    dayHeader.style.textAlign = 'center';
    dayHeader.style.fontWeight = '600';
    dayHeader.style.borderBottom = '1px solid var(--border)';
    dayHeader.style.borderRight = '1px solid var(--border)';
    dayHeader.style.fontSize = '11px';
    dayHeader.style.background = 'var(--bg)';
    dayHeader.textContent = d;
    grid.appendChild(dayHeader);
  }

  rows.forEach(row => {
    const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});

    const leftCell = document.createElement('div');
    leftCell.style.padding = '12px';
    leftCell.style.borderBottom = '1px solid var(--border)';
    leftCell.style.borderRight = '1px solid var(--border)';
    leftCell.style.fontSize = '12px';
    leftCell.style.whiteSpace = 'nowrap';
    leftCell.style.overflow = 'hidden';
    leftCell.style.textOverflow = 'ellipsis';
    leftCell.style.cursor = 'pointer';
    leftCell.style.background = 'var(--bg)';
    leftCell.onclick = () => openNotionPeek(row.id);
    leftCell.innerHTML = `<span style="margin-right: 4px;">${row.icon || '📄'}</span><strong>${esc(row.title)}</strong>`;
    grid.appendChild(leftCell);

    let startDayIdx = null;
    let endDayIdx = null;

    if (props.start_date) {
      const sDate = new Date(props.start_date);
      if (sDate.getFullYear() === year && sDate.getMonth() === month) {
        startDayIdx = sDate.getDate();
      } else if (sDate < new Date(year, month, 1)) {
        startDayIdx = 1;
      }
    }
    if (props.deadline) {
      const dDate = new Date(props.deadline);
      if (dDate.getFullYear() === year && dDate.getMonth() === month) {
        endDayIdx = dDate.getDate();
      } else if (dDate > new Date(year, month, numDays)) {
        endDayIdx = numDays;
      }
    }

    for (let d = 1; d <= numDays; d++) {
      const cell = document.createElement('div');
      cell.style.borderBottom = '1px solid var(--border)';
      cell.style.borderRight = '1px solid var(--border)';
      cell.style.position = 'relative';
      cell.style.background = 'transparent';

      if (startDayIdx !== null && endDayIdx !== null && d === startDayIdx) {
        const barSpan = endDayIdx - startDayIdx + 1;
        const barContainer = document.createElement('div');
        barContainer.style.position = 'relative';
        barContainer.style.display = 'flex';
        barContainer.style.alignItems = 'center';

        const bar = document.createElement('div');
        bar.className = `timeline-bar ${props.status ? props.status.replace(' ', '-').toLowerCase() : 'to-do'}`;
        bar.style.position = 'absolute';
        bar.style.left = '4px';
        bar.style.top = '6px';
        bar.style.width = `${barSpan * 35 - 8}px`;
        bar.style.height = '24px';
        bar.style.zIndex = '5';
        bar.style.borderRadius = '4px';
        bar.style.cursor = 'pointer';
        bar.style.display = 'flex';
        bar.style.alignItems = 'center';
        bar.style.padding = '0 8px';
        bar.style.fontSize = '11px';
        bar.style.fontWeight = '500';
        bar.style.whiteSpace = 'nowrap';
        bar.style.overflow = 'hidden';
        bar.style.textOverflow = 'ellipsis';
        bar.style.justifyContent = 'space-between';
        bar.onclick = () => openNotionPeek(row.id);

        const progressSpan = document.createElement('span');
        progressSpan.textContent = `${props.progress || 0}%`;
        bar.appendChild(progressSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.color = 'white';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '10px';
        deleteBtn.style.padding = '0 2px';
        deleteBtn.style.marginLeft = '4px';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteDbRow(row.id);
        };
        bar.appendChild(deleteBtn);

        barContainer.appendChild(bar);
        cell.appendChild(barContainer);
      }

      grid.appendChild(cell);
    }
  });

  scrollWrapper.appendChild(grid);
  timelineContainer.appendChild(scrollWrapper);
  container.appendChild(timelineContainer);
}
window.renderTimeline = renderTimeline;

function handleDbFilter() {
  const searchInput = $('notion-db-search');
  if (searchInput) dbFilterText = searchInput.value.trim();

  const statusSelect = $('filter-db-status');
  if (statusSelect) dbFilterStatus = statusSelect.value;

  const prioritySelect = $('filter-db-priority');
  if (prioritySelect) dbFilterPriority = prioritySelect.value;

  const assigneeSelect = $('filter-db-assignee');
  if (assigneeSelect) dbFilterAssignee = assigneeSelect.value;

  renderDatabaseView();
}
window.handleDbFilter = handleDbFilter;

async function addNewDatabaseRow() {
  if (!currentNotionPageId) return;

  const defaultProps = {
    status: 'To Do',
    priority: 'Low',
    assignee: '',
    start_date: new Date().toISOString().split('T')[0],
    deadline: new Date().toISOString().split('T')[0],
    progress: 0
  };

  try {
    const rowData = {
      title: 'Tugas Baru',
      content: '',
      icon: '📄',
      cover_image: null,
      parent_id: currentNotionPageId,
      is_database: false,
      database_view: 'table',
      properties: defaultProps
    };

    const newRow = await apiFetch('/api/notion/pages', {
      method: 'POST',
      body: rowData
    });

    if (newRow) {
      // Add the new row to currentDbRows with proper properties format
      const rowWithProps = {
        ...newRow,
        properties: typeof newRow.properties === 'string' ? JSON.parse(newRow.properties) : newRow.properties
      };
      currentDbRows.push(rowWithProps);

      // Render the database view first
      renderDatabaseView();

      // Then open the peek panel
      openNotionPeek(newRow.id);
    } else {
      await showCustomAlert('Gagal menambahkan data. Silakan coba lagi.');
    }
  } catch (err) {
    console.error("Gagal menambahkan data database:", err);
    await showCustomAlert('Gagal menambahkan data: ' + err.message);
  }
}
window.addNewDatabaseRow = addNewDatabaseRow;

function openNotionPeek(rowId) {
  currentPeekRowId = rowId;
  const row = currentDbRows.find(r => r.id === rowId);
  if (!row) {
    // If not found in currentDbRows, maybe it's in flat notionPages (from Kalender Gabungan)
    const pageRow = notionPages.find(r => r.id === rowId);
    if (!pageRow) return;

    const props = typeof pageRow.properties === 'string' ? JSON.parse(pageRow.properties) : (pageRow.properties || {});
    $('notion-peek-emoji').textContent = pageRow.icon || '📄';
    $('notion-peek-title').value = pageRow.title || '';
    $('notion-peek-status').value = props.status || 'To Do';
    $('notion-peek-priority').value = props.priority || 'Low';
    $('notion-peek-assignee').value = props.assignee || '';
    $('notion-peek-start-date').value = props.start_date || '';
    $('notion-peek-deadline').value = props.deadline || '';
    $('notion-peek-progress').value = props.progress !== undefined ? props.progress : 0;
    $('notion-peek-content').value = pageRow.content || '';
  } else {
    const props = typeof row.properties === 'string' ? JSON.parse(row.properties) : (row.properties || {});
    $('notion-peek-emoji').textContent = row.icon || '📄';
    $('notion-peek-title').value = row.title || '';
    $('notion-peek-status').value = props.status || 'To Do';
    $('notion-peek-priority').value = props.priority || 'Low';
    $('notion-peek-assignee').value = props.assignee || '';
    $('notion-peek-start-date').value = props.start_date || '';
    $('notion-peek-deadline').value = props.deadline || '';
    $('notion-peek-progress').value = props.progress !== undefined ? props.progress : 0;
    $('notion-peek-content').value = row.content || '';
  }

  $('notion-peek-backdrop').classList.remove('hidden');
  $('notion-peek-panel').classList.add('open');
}
window.openNotionPeek = openNotionPeek;

function closeNotionPeek() {
  $('notion-peek-backdrop').classList.add('hidden');
  $('notion-peek-panel').classList.remove('open');
  currentPeekRowId = null;
}
window.closeNotionPeek = closeNotionPeek;

async function saveNotionPeek() {
  if (!currentPeekRowId) return;

  const emoji = $('notion-peek-emoji').textContent;
  const title = $('notion-peek-title').value.trim() || 'Tanpa Judul';
  const status = $('notion-peek-status').value;
  const priority = $('notion-peek-priority').value;
  const assignee = $('notion-peek-assignee').value;
  const startDate = $('notion-peek-start-date').value;
  const deadline = $('notion-peek-deadline').value;
  let progress = parseInt($('notion-peek-progress').value, 10);
  if (isNaN(progress)) progress = 0;
  if (progress < 0) progress = 0;
  if (progress > 100) progress = 100;
  const content = $('notion-peek-content').value;

  const updatedProps = {
    status,
    priority,
    assignee,
    start_date: startDate,
    deadline,
    progress
  };

  if (status === 'Done' && progress !== 100) {
    updatedProps.progress = 100;
  }

  try {
    const updatedRow = await apiFetch(`/api/notion/pages/${currentPeekRowId}`, {
      method: 'PUT',
      body: {
        title,
        icon: emoji,
        content,
        properties: updatedProps
      }
    });

    if (updatedRow) {
      closeNotionPeek();
      // Reload pages array to update Kalender Gabungan
      await loadNotionWorkspace();

      if (currentNotionPageId) {
        const result = await apiFetch(`/api/notion/pages/${currentNotionPageId}`);
        if (result) {
          currentDbRows = result.children || [];
          renderDatabaseView();
        }
      } else {
        renderNotionCalendar();
      }
    }
  } catch (err) {
    console.error("Gagal menyimpan data baris database:", err);
  }
}
window.saveNotionPeek = saveNotionPeek;

async function deleteNotionPeek() {
  if (!currentPeekRowId) return;

  const ok = await showCustomConfirm("Apakah Anda yakin ingin menghapus data ini?");
  if (!ok) return;

  try {
    const res = await apiFetch(`/api/notion/pages/${currentPeekRowId}`, {
      method: 'DELETE'
    });

    if (res) {
      closeNotionPeek();
      await loadNotionWorkspace();

      if (currentNotionPageId) {
        const result = await apiFetch(`/api/notion/pages/${currentNotionPageId}`);
        if (result) {
          currentDbRows = result.children || [];
          renderDatabaseView();
        }
      } else {
        renderNotionCalendar();
      }
    }
  } catch (err) {
    console.error("Gagal menghapus baris database:", err);
  }
}
window.deleteNotionPeek = deleteNotionPeek;

function switchToNotionCalendar() {
  currentNotionPageId = null;
  currentNotionPage = null;
  currentDbRows = [];
  switchView('notion-calendar');
}
window.switchToNotionCalendar = switchToNotionCalendar;

function renderNotionCalendar() {
  const container = $('notion-calendar-grid');
  if (!container) return;

  container.innerHTML = '';

  const year = notionCalendarDate.getFullYear();
  const month = notionCalendarDate.getMonth();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthTitle = $('notion-calendar-month-title');
  if (monthTitle) monthTitle.textContent = `${monthNames[month]} ${year}`;

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  daysOfWeek.forEach(day => {
    const dCell = document.createElement('div');
    dCell.className = 'calendar-day-header';
    dCell.textContent = day;
    container.appendChild(dCell);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dbIds = notionPages.filter(p => p.is_database).map(p => p.id);
  const allTasks = notionPages.filter(p => {
    if (!p.parent_id || !dbIds.includes(p.parent_id)) return false;
    const isTaskPublic = (p.access_level === 'public' && !p.allowed_divisions);
    if (!isTaskPublic) return false;
    const parentDb = notionPages.find(db => db.id === p.parent_id);
    const isParentPublic = parentDb ? (parentDb.access_level === 'public' && !parentDb.allowed_divisions) : true;
    return isParentPublic;
  });

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const dayVal = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell pad';
    cell.innerHTML = `<span class="day-num">${dayVal}</span>`;
    container.appendChild(cell);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    cell.className = `calendar-day-cell${isToday ? ' today' : ''}`;
    cell.innerHTML = `<span class="day-num">${d}</span>`;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateTasks = allTasks.filter(task => {
      const props = typeof task.properties === 'string' ? JSON.parse(task.properties) : (task.properties || {});
      return props.deadline === dateStr;
    });

    dateTasks.forEach(task => {
      const taskDiv = document.createElement('div');
      taskDiv.className = 'calendar-task-badge';
      taskDiv.onclick = () => openNotionPageAndPeek(task.parent_id, task.id);

      const props = typeof task.properties === 'string' ? JSON.parse(task.properties) : (task.properties || {});
      const status = props.status || 'To Do';
      taskDiv.classList.add(status.replace(' ', '-').toLowerCase());
      taskDiv.textContent = `${task.icon || '📄'} ${task.title}`;

      cell.appendChild(taskDiv);
    });

    container.appendChild(cell);
  }

  // Pad with next month's days to form a complete 6-row (42 cells) grid
  const totalRendered = firstDay + daysInMonth;
  const nextMonthPadding = 42 - totalRendered;
  for (let d = 1; d <= nextMonthPadding; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell pad';
    cell.innerHTML = `<span class="day-num">${d}</span>`;
    container.appendChild(cell);
  }
}
window.renderNotionCalendar = renderNotionCalendar;

window.navigateNotionCalendar = (dir) => {
  if (dir === 0) {
    notionCalendarDate = new Date();
  } else {
    notionCalendarDate.setMonth(notionCalendarDate.getMonth() + dir);
  }
  renderNotionCalendar();
};

async function openNotionPageAndPeek(parentDbId, rowId) {
  await openNotionPage(parentDbId);
  openNotionPeek(rowId);
}
window.openNotionPageAndPeek = openNotionPageAndPeek;

