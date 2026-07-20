/* ─── HELPERS ─── */
function toTitleCase(str) {
  if (!str) return str;
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

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

/* ─── SHARING FOLDER STATE ─── */
let activeTab = 'masuk';
let sharedDocuments = [];
let projects = [];
let recipientsList = [];
let selectedUploadFile = null;
let sharingCurrentPage = 1;
const sharingPageSize = 10;
let sharingSortField = 'tgl';
let sharingSortDir = 'desc';
let selectedDocIds = new Set();

/* ─── NOTION STATE ─── */
let notionPages = [];
let currentDbRows = [];
let notionEditMode = false;
let notionCalendarDate = new Date();
let emojiPickerTarget = 'page';
let activeDbView = 'table';
let currentPeekRowId = null;
let dbFilterText = '';
let dbFilterStatus = '';
let dbFilterPriority = '';
let dbFilterAssignee = '';
let notionCollapsedPages = {};

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
const chatRoomName = $('chat-title');
const chatMembersCount = $('chat-members-count');
const messagesList = $('messages-list');
const messageInput = $('chat-input');
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

// Restore sidebar width
const savedWidth = localStorage.getItem('sidebar_width');
if (savedWidth) {
  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.width = savedWidth + 'px';
  });
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.style.width = savedWidth + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // Create resizer element
  const resizer = document.createElement('div');
  resizer.className = 'sidebar-resizer';
  resizer.id = 'sidebar-resizer';
  sidebar.appendChild(resizer);

  let isResizing = false;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    sidebar.classList.add('resizing');
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const activityBar = document.querySelector('.activity-bar');
    const activityBarWidth = activityBar ? activityBar.offsetWidth : 50;
    let newWidth = e.clientX - activityBarWidth;
    if (newWidth < 180) newWidth = 180;
    if (newWidth > 450) newWidth = 450;
    sidebar.style.width = newWidth + 'px';
    localStorage.setItem('sidebar_width', newWidth);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      sidebar.classList.remove('resizing');
    }
  });
});

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
};

// Wire up all hamburger sidebar-toggle buttons (collapse from sidebar header + expand from content headers)
['btn-sidebar-collapse', 'empty-sidebar-toggle', 'chat-sidebar-toggle',
  'sharing-sidebar-toggle', 'notion-sidebar-toggle', 'admin-sidebar-toggle'].forEach(id => {
    const btn = $(id);
    if (btn) btn.addEventListener('click', toggleSidebar);
  });

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
  const adminSection = document.querySelector('.admin-section');

  if (menuSection) menuSection.classList.toggle('hidden', tabName !== 'files');
  if (notionSection) notionSection.classList.toggle('hidden', tabName !== 'notion');
  if (roomsSection) roomsSection.classList.toggle('hidden', tabName !== 'chat');
  if (usersSection) usersSection.classList.toggle('hidden', tabName !== 'chat');
  if (adminSection) adminSection.classList.toggle('hidden', tabName !== 'admin');

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
  } else if (tabName === 'admin' && currentView !== 'admin') {
    switchView('admin');
  }
}
window.switchSidebarTab = switchSidebarTab;


if ($('toggle-rooms-btn')) {
  $('toggle-rooms-btn').addEventListener('click', (e) => {
    if (e.target.id === 'btn-new-room') return;
    const roomList = $('room-list');
    if (!roomList) return;
    const isHidden = roomList.classList.toggle('hidden');
    const arrow = $('toggle-rooms-btn').querySelector('.toggle-arrow');
    if (arrow) {
      arrow.textContent = isHidden ? '▸' : '▾';
    }
  });
}

if ($('toggle-users-btn')) {
  $('toggle-users-btn').addEventListener('click', () => {
    const userList = $('user-list');
    if (!userList) return;
    const isHidden = userList.classList.toggle('hidden');
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
if ($('btn-new-room')) {
  $('btn-new-room').addEventListener('click', () => modalOverlay.classList.remove('hidden'));
}
if ($('modal-close')) {
  $('modal-close').addEventListener('click', () => modalOverlay.classList.add('hidden'));
}

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
if ($('btn-send')) {
  $('btn-send').addEventListener('click', sendMessage);
}

if (messageInput) {
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  let isTyping = false;
  let typingThrottle = null;

  messageInput.addEventListener('input', () => {
    // Auto-resize
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + 'px';

    // Typing indicator — throttled so only fires once per 300ms
    if (!currentRoomId) return;
    if (!isTyping) {
      isTyping = true;
      socket.emit('typing', { room_id: currentRoomId, is_typing: true });
    }
    clearTimeout(typingThrottle);
    clearTimeout(typingTimer);
    typingThrottle = null;
    typingTimer = setTimeout(() => {
      isTyping = false;
      socket.emit('typing', { room_id: currentRoomId, is_typing: false });
    }, 1500);
  });
}

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

  socket.on('new_persistent_notification', (notif) => {
    // In-App Bell update
    const badge = $('notification-badge');
    if (badge) {
      let count = parseInt(badge.textContent) || 0;
      badge.textContent = count + 1;
      badge.classList.remove('hidden');
    }
    showCustomAlert(`Dokumen Baru: ${notif.document_name} telah dibagikan ke divisi Anda.`);

    // Update Dropdown List
    const listContainer = $('notification-list');
    if (listContainer) {
      // Remove empty state message if it exists
      if (listContainer.innerHTML.includes('Belum ada notifikasi baru')) {
        listContainer.innerHTML = '';
      }

      const time = new Date(notif.created_at || new Date()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const itemHtml = `
        <div id="notif-item-${notif.id}" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'" onclick="markNotificationAsRead('${notif.id}')">
          <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${esc(notif.message)}</div>
          <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>Dari: ${esc(notif.sender_name || 'Sistem')}</span>
            <span>${time}</span>
          </div>
        </div>
      `;
      listContainer.insertAdjacentHTML('afterbegin', itemHtml);
    }
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

  socket.on('message_deleted', ({ message_id }) => {
    // Replace message content with deleted state
    const group = messagesList.querySelector(`[data-msg-id="${message_id}"]`);
    if (group) {
      const bubble = group.querySelector('.msg-bubble');
      if (bubble) {
        bubble.innerHTML = '<em>Pesan ini telah dihapus</em>';
        bubble.classList.add('deleted-bubble');
      }
      const deleteBtn = group.querySelector('.msg-delete-btn');
      if (deleteBtn) deleteBtn.remove();
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

  // Member panel real-time events
  socket.on('member_added', ({ room_id, user }) => {
    // Update cached room member_count
    const room = rooms.find(r => r.id === room_id);
    if (room) room.member_count = (room.member_count || 0) + 1;
    // Live-refresh panel if currently viewing this room
    if (room_id === currentRoomId) {
      loadRoomMembers(room_id);
      const memberCount = room ? room.member_count : '?';
      chatMembersCount.textContent = `${memberCount} anggota`;
    }
  });

  socket.on('member_removed', ({ room_id, user_id }) => {
    const room = rooms.find(r => r.id === room_id);
    if (room && room.member_count > 0) room.member_count -= 1;
    if (room_id === currentRoomId) {
      loadRoomMembers(room_id);
      const memberCount = room ? room.member_count : '?';
      chatMembersCount.textContent = `${memberCount} anggota`;
    }
  });

  socket.on('removed_from_room', ({ room_id }) => {
    // Remove room from local list and redirect to empty state
    rooms = rooms.filter(r => r.id !== room_id);
    renderRooms();
    if (currentRoomId === room_id) {
      currentRoomId = null;
      chatView.classList.add('hidden');
      emptyState.classList.remove('hidden');
    }
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
  const roomListEl = $('room-list');
  if (!roomListEl) return;
  roomListEl.innerHTML = '';
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
    roomListEl.appendChild(li);
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
      operasional: 'Operasional',
      it: 'IT',
      it: 'IT'
    };

    const divLabel = divisionLabels[user.division] || '';
    const statusDot = user.is_online
      ? '<span class="status-dot online"></span>'
      : '<span class="status-dot offline"></span>';

    const dmRoom = rooms.find(r => r.type === 'dm' && r.dm_user_id === user.id);
    const hasChat = dmRoom && dmRoom.last_message;
    const subText = hasChat ? dmRoom.last_message : (user.jabatan || user.role || '');

    li.innerHTML = `
      <div class="user-avatar-container">
        <div class="avatar-circle-sm">${user.display_name.slice(0, 2).toUpperCase()}</div>
        ${statusDot}
      </div>
      <div class="room-info" style="margin-left: 8px; min-width: 0; flex: 1;">
        <div class="room-name-container" style="display: flex; align-items: center;">
          <span class="room-name" style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;" title="${esc(toTitleCase(user.display_name))}">${esc(toTitleCase(user.display_name))}</span>
        </div>
        <div class="room-preview-row" style="display: flex; align-items: center; gap: 6px; margin-top: 2px; min-width: 0;">
          ${divLabel ? `<span class="division-badge ${user.division || ''}" style="font-size: 9px; padding: 1px 4px; border-radius: 3px; flex-shrink: 0; line-height: 1.2;" title="Divisi: ${esc(divLabel)}">${esc(divLabel)}</span>` : ''}
          <span class="room-preview" style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; flex: 1;" title="${esc(subText)}">${esc(subText)}</span>
        </div>
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

  // Show/hide members toggle button based on room type
  const btnToggleMembers = $('btn-toggle-members');
  if (btnToggleMembers) {
    btnToggleMembers.classList.toggle('hidden', room.type === 'dm');
  }

  // Update active state in Users list
  if (room.type === 'dm') {
    document.querySelectorAll('#user-list .room-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.userId === room.dm_user_id);
    });
    chatRoomName.textContent = toTitleCase(room.dm_user_display_name) || 'Direct Message';
    chatMembersCount.textContent = room.dm_user_is_online ? 'Online' : 'Offline';
    // Hide members panel for DMs
    const membersPanel = $('members-panel');
    if (membersPanel) membersPanel.classList.add('hidden');
  } else {
    document.querySelectorAll('#user-list .room-item').forEach((el) => {
      el.classList.remove('active');
    });
    chatRoomName.textContent = '#' + room.name;
    const memberCount = room.member_count || '...';
    chatMembersCount.textContent = `${memberCount} anggota`;

    // Reset members panel: clear stale data from previous room
    const membersList = $('members-list');
    if (membersList) membersList.innerHTML = '';

    // If the panel is currently open, reload members for the new room
    const membersPanel = $('members-panel');
    if (membersPanel && !membersPanel.classList.contains('hidden')) {
      loadRoomMembers(room.id);
    }
  }


  emptyState.classList.add('hidden');
  chatView.classList.remove('hidden');
  messagesList.innerHTML = '';
  typingIndicator.classList.add('hidden');

  const messages = await apiFetch(`/api/rooms/${room.id}/messages`);
  if (!messages) return;

  if (room.type !== 'dm') {
    const memberCount = room.member_count || '?';
    chatMembersCount.textContent = `${memberCount} anggota`;
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
  const isAdmin = currentUser.is_admin || currentUser.username === 'admin' || currentUser.username === 'administrator';
  const canDelete = isOwn || isAdmin;
  const initials = (msg.display_name || '?').slice(0, 2).toUpperCase();
  const time = new Date(msg.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit',
  });

  if (msg.is_deleted) {
    const group = document.createElement('div');
    group.className = 'msg-group' + (isOwn ? ' own' : '') + ' deleted';
    group.dataset.msgId = msg.id;
    group.innerHTML = `
      <div class="avatar-circle">${initials}</div>
      <div class="msg-content">
        <div class="msg-meta">
          <span class="msg-sender">${isOwn ? 'Kamu' : esc(toTitleCase(msg.display_name))}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-bubble deleted-bubble"><em>Pesan ini telah dihapus</em></div>
      </div>
    `;
    messagesList.appendChild(group);
    return;
  }

  const deleteBtn = canDelete ? `
    <button class="msg-kebab-btn" onclick="toggleMsgMenu(event, '${msg.id}')" title="Pilihan">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="5" r="1.5"/>
        <circle cx="12" cy="12" r="1.5"/>
        <circle cx="12" cy="19" r="1.5"/>
      </svg>
    </button>
    <div class="msg-menu hidden" id="msg-menu-${msg.id}">
      <button class="msg-menu-item delete" onclick="deleteMessage('${msg.id}')">Hapus Pesan</button>
    </div>` : '';

  const group = document.createElement('div');
  group.className = 'msg-group' + (isOwn ? ' own' : '');
  group.dataset.msgId = msg.id;
  group.innerHTML = `
    <div class="avatar-circle">${initials}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-sender">${isOwn ? 'Kamu' : esc(toTitleCase(msg.display_name))}</span>
        <span class="msg-time">${time}</span>
        <div class="msg-actions-wrap">${deleteBtn}</div>
      </div>
      <div class="msg-bubble" data-msg-id="${msg.id}">${esc(msg.content)}</div>
    </div>
  `;
  messagesList.appendChild(group);

  if (canDelete) {
    const bubble = group.querySelector('.msg-bubble');
    bubble.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      deleteMessage(msg.id);
    });
  }
}

function toggleMsgMenu(e, msgId) {
  e.stopPropagation();
  const allMenus = document.querySelectorAll('.msg-menu');
  allMenus.forEach(menu => {
    if (menu.id !== `msg-menu-${msgId}`) menu.classList.add('hidden');
  });
  const menu = document.getElementById(`msg-menu-${msgId}`);
  if (menu) menu.classList.toggle('hidden');
}

document.addEventListener('click', () => {
  const allMenus = document.querySelectorAll('.msg-menu');
  allMenus.forEach(menu => menu.classList.add('hidden'));
});

function deleteMessage(msgId) {
  showCustomConfirm('Hapus pesan ini untuk semua orang?').then(confirmed => {
    if (!confirmed) return;
    socket.emit('delete_message', { message_id: msgId, room_id: currentRoomId }, (res) => {
      if (res?.error) showCustomAlert(res.error);
    });
  });
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
  if (r.includes('it')) return 'tag-cyan';
  if (r.includes('sm') || r.includes('manager')) return 'tag-purple';
  if (r.includes('staff')) return 'tag-gray';
  if (r.includes('direktur') || r.includes('wakil')) return 'tag-pink';
  return 'tag-default';
}

async function showApp() {
  authScreen.classList.add('hidden');
  app.classList.remove('hidden');

  // Toggle Admin tab & section based on admin privilege
  const tabBtnAdmin = $('tab-btn-admin');
  const isAdmin = currentUser && (currentUser.is_admin === true || currentUser.role === 'admin');
  if (tabBtnAdmin) {
    tabBtnAdmin.classList.toggle('hidden', !isAdmin);
  }

  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional',
    it: 'IT',
    it: 'IT'
  };
  const divLabel = divisionLabels[currentUser.division] || '';
  sidebarName.textContent = toTitleCase(currentUser.display_name) + (divLabel ? ` (${divLabel})` : '');

  connectSocket();
  await loadRooms();
  await loadUsers();
  initSharingEvents();
  await loadNotionWorkspace();
  await loadNotifications();
  switchSidebarTab('chat', false);
}

function showAuth() {
  app.classList.add('hidden');
  authScreen.classList.remove('hidden');
  const tabBtnAdmin = $('tab-btn-admin');
  if (tabBtnAdmin) {
    tabBtnAdmin.classList.add('hidden');
  }
  const adminSection = document.querySelector('.admin-section');
  if (adminSection) {
    adminSection.classList.add('hidden');
  }
}

/* ─── SHARING FOLDER CONTROLLERS ─── */
function switchView(viewName) {
  currentView = viewName;

  // Hide all main views
  $('chat-view').classList.add('hidden');
  $('empty-state').classList.add('hidden');
  $('sharing-folder-view').classList.add('hidden');
  if ($('notion-workspace-view')) $('notion-workspace-view').classList.add('hidden');
  if ($('admin-panel-view')) $('admin-panel-view').classList.add('hidden');

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
      const titleInput = $('notion-title-input');
      if (titleInput) {
        titleInput.value = 'Kalender Gabungan';
        titleInput.readOnly = true;
      }

      const emojiEl = $('notion-page-icon');
      if (emojiEl) emojiEl.textContent = '📅';

      const coverEl = $('notion-cover');
      if (coverEl) coverEl.style.backgroundImage = 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';

      const coverActions = document.querySelector('.notion-cover-actions');
      if (coverActions) coverActions.classList.add('hidden');

      const editBtn = $('btn-notion-edit');
      if (editBtn) editBtn.classList.add('hidden');
      const cancelBtn = $('btn-notion-cancel');
      if (cancelBtn) cancelBtn.classList.add('hidden');
      const deleteBtn = $('btn-notion-delete');
      if (deleteBtn) deleteBtn.classList.add('hidden');

      const accessContainer = $('notion-page-access-container');
      if (accessContainer) accessContainer.innerHTML = '';

      const breadcrumbs = $('notion-breadcrumbs');
      if (breadcrumbs) breadcrumbs.innerHTML = '<span class="notion-breadcrumb-item">Kalender Gabungan</span>';

      renderNotionCalendar();
    }
  } else if (viewName === 'admin') {
    currentRoomId = null;
    if ($('admin-panel-view')) {
      $('admin-panel-view').classList.remove('hidden');
      loadAdminUsers();
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
  } else if (viewName === 'admin') {
    const activeTabBtn = document.querySelector('#tab-btn-admin');
    if (activeTabBtn && !activeTabBtn.classList.contains('active')) {
      switchSidebarTab('admin', false);
    }
  }
}

function initSharingEvents() {
  // Navigation
  $('btn-sharing-folder').addEventListener('click', () => {
    switchView('sharing');
  });

  // Handle selectable pills change + update penerima counter
  document.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') {
      const pill = e.target.closest('.recipient-pill');
      if (pill) {
        pill.classList.toggle('selected', e.target.checked);
      }
      // Update counter in document modals
      const penerimaWrapper = e.target.closest('.penerima-wrapper');
      if (penerimaWrapper) {
        updatePenerimaCounter(penerimaWrapper);
      }
    }
  });

  // Tab click — works for both old .sharing-tab-btn and new .sf-tab
  document.querySelectorAll('.sf-tab, .sharing-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sf-tab, .sharing-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      sharingCurrentPage = 1;
      renderDocumentsTable();
    });
  });

  // Search & Filter change (elements optional — may be removed in newer HTML)
  if ($('sharing-search')) {
    $('sharing-search').addEventListener('input', () => {
      sharingCurrentPage = 1;
      renderDocumentsTable();
    });
  }
  if ($('filter-month')) {
    $('filter-month').addEventListener('change', () => {
      sharingCurrentPage = 1;
      renderDocumentsTable();
    });
  }
  if ($('filter-year')) {
    const yearSelect = $('filter-year');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="all">Semua Tahun</option>';
    for (let y = currentYear; y >= currentYear - 5; y--) {
      yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }
    yearSelect.addEventListener('change', () => {
      sharingCurrentPage = 1;
      renderDocumentsTable();
    });
  }

  // Close modals
  if ($('modal-upload-close')) {
    $('modal-upload-close').addEventListener('click', () => $('modal-upload-overlay').classList.add('hidden'));
  }
  if ($('modal-edit-close')) {
    $('modal-edit-close').addEventListener('click', () => $('modal-edit-overlay').classList.add('hidden'));
  }

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

    populateDocTypes('upload-doc-type');

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

  const isAdmin = currentUser && (currentUser.is_admin || currentUser.username === 'admin' || currentUser.username === 'administrator');

  // Set default active tab based on role
  document.querySelectorAll('.sf-tab, .sharing-tab-btn').forEach(btn => btn.classList.remove('active'));
  if (currentUser.role === 'top management' || isAdmin) {
    activeTab = 'semua';
    const semuaBtn = $('tab-semua-btn');
    if (semuaBtn) { semuaBtn.classList.remove('hidden'); semuaBtn.classList.add('active'); }
  } else if (currentUser.role === 'management') {
    activeTab = 'divisi';
    const divisiBtn = $('tab-divisi-btn');
    if (divisiBtn) { divisiBtn.classList.remove('hidden'); divisiBtn.classList.add('active'); }
  } else {
    activeTab = 'masuk';
    const masukBtn = document.querySelector('.sf-tab[data-tab="masuk"], .sharing-tab-btn[data-tab="masuk"]');
    if (masukBtn) masukBtn.classList.add('active');
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

  const isAdmin = currentUser && (currentUser.is_admin || currentUser.username === 'admin' || currentUser.username === 'administrator');

  if (currentUser.role === 'management') {
    tabDivisi.classList.remove('hidden');
  } else if (currentUser.role === 'top management' || isAdmin) {
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

const DOC_TYPES_BY_DIVISION = {
  marketing: ['PO (Purchase Order)', 'FPTK', 'SPK', 'SPH', 'LOI', 'MRA', 'LOA', 'BQ', 'Kontrak'],
  sdm: ['Penempatan', 'Sewa Tenaga', 'Rekap Cuti Pelaksana', 'Rekap Lembur', 'PKWT', 'BPJS', 'Database Manpower'],
  keuangan: ['Invoice', 'Faktur Pajak'],
  operasional: [''],
  default: ['Lain-lain', 'Memo Internal']
};

function populateDocTypes(selectId, selectedValue = '') {
  const selectEl = $(selectId);
  if (!selectEl) return;

  const divName = (currentUser.division || '').toLowerCase();
  let options = DOC_TYPES_BY_DIVISION[divName] || DOC_TYPES_BY_DIVISION['default'];

  if (divName && DOC_TYPES_BY_DIVISION['default']) {
    options = [...options, ...DOC_TYPES_BY_DIVISION['default']];
  }
  options = [...new Set(options)];

  // Apply role restriction: Staff cannot see 'Kontrak'
  if (currentUser.role === 'staff') {
    options = options.filter(opt => opt !== 'Kontrak');
  }

  if (selectedValue && !options.includes(selectedValue)) {
    options.push(selectedValue);
  }

  let html = '<option value="" disabled selected>Pilih Tipe</option>';
  options.forEach(opt => {
    // Determine the actual value. If it's PO (Purchase Order), keep PO as value?
    // Wait, previously PO was value="PO". Let's match previous values.
    let val = opt;
    if (opt === 'PO (Purchase Order)') val = 'PO';
    html += `<option value="${esc(val)}" ${val === selectedValue ? 'selected' : ''}>${esc(opt)}</option>`;
  });
  selectEl.innerHTML = html;
}

// TomSelect replaced with Select2

async function loadSharingProjects() {
  const data = await apiFetch('/api/documents/projects');
  if (!data) return;
  projects = data;

  const placeholder = '<option value="" disabled selected>Pilih Proyek</option>';
  const options = data.map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');

  const upProj = $('upload-project-name');
  const editProj = $('edit-project-name');

  if (upProj) {
    upProj.innerHTML = placeholder + options;
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
      jQuery('#upload-project-name').select2({
        dropdownParent: jQuery('#modal-upload-overlay'),
        placeholder: 'Pilih Proyek...',
        width: '100%'
      });
    }
  }

  if (editProj) {
    editProj.innerHTML = placeholder + options;
    if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
      jQuery('#edit-project-name').select2({
        dropdownParent: jQuery('#modal-edit-overlay'),
        placeholder: 'Pilih Proyek...',
        width: '100%'
      });
    }
  }
}

async function loadSharingRecipients() {
  const data = await apiFetch('/api/documents/recipients');
  if (data) {
    recipientsList = data;
  }
}

function updatePenerimaCounter(container) {
  const wrapper = container.closest('.penerima-wrapper') || container.querySelector('.penerima-wrapper');
  if (!wrapper) return;
  const counterEl = wrapper.querySelector('.penerima-counter');
  if (!counterEl) return;
  const checked = wrapper.querySelectorAll('input[type="checkbox"]:checked').length;
  if (checked === 0) {
    counterEl.textContent = 'Belum dipilih';
    counterEl.style.color = 'var(--text-muted)';
    counterEl.style.background = 'transparent';
  } else {
    counterEl.textContent = `${checked} penerima dipilih`;
    counterEl.style.color = 'var(--accent)';
    counterEl.style.background = '';
  }
}

function renderPenerimaWidget(container) {
  // Derive unique divisions and jabatan from the loaded recipients list
  const allUsers = recipientsList.filter(u => u.username !== currentUser.username);

  const divisions = [...new Set(
    allUsers.map(u => u.divisi).filter(Boolean)
  )].sort();

  const jabatanList = [...new Set(
    allUsers.map(u => u.jabatan).filter(Boolean)
  )].sort();

  // Build the penerima widget HTML structure
  let html = '<div class="penerima-wrapper">';

  html += `
    <div class="penerima-toolbar">
      <input type="text" class="penerima-search" placeholder="Cari divisi atau jabatan..." data-penerima-search="true" />
      <span class="penerima-counter">Belum dipilih</span>
    </div>
    <div class="penerima-body">
      <div class="penerima-group" data-group="divisi">
        <div class="penerima-group-header">
          <span class="penerima-group-label">Divisi</span>
          <button type="button" class="penerima-select-all" data-select-all="divisi">Pilih Semua</button>
        </div>
        <div class="penerima-items">
          ${divisions.length > 0
      ? divisions.map(div => `
              <label class="recipient-pill">
                <input type="checkbox" name="recipients-division" value="${esc(div)}"> ${esc(div)}
              </label>
            `).join('')
      : '<div class="penerima-empty" style="display:block;">Tidak ada divisi tersedia</div>'
    }
        </div>
      </div>
      <div class="penerima-group" data-group="jabatan">
        <div class="penerima-group-header">
          <span class="penerima-group-label">Jabatan</span>
          <button type="button" class="penerima-select-all" data-select-all="jabatan">Pilih Semua</button>
        </div>
        <div class="penerima-items">
          ${jabatanList.length > 0
      ? jabatanList.map(jab => `
              <label class="recipient-pill">
                <input type="checkbox" name="recipients-jabatan" value="${esc(jab)}"> ${esc(jab)}
              </label>
            `).join('')
      : '<div class="penerima-empty" style="display:block;">Tidak ada jabatan tersedia</div>'
    }
        </div>
      </div>
    </div>
  `;

  html += '</div>'; // .penerima-wrapper
  container.innerHTML = html;

  // ── Attach search filtering ──
  const searchInput = container.querySelector('.penerima-search');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const q = this.value.toLowerCase().trim();
      const wrapper = this.closest('.penerima-wrapper');
      wrapper.querySelectorAll('.penerima-group').forEach(group => {
        let hasVisible = false;
        group.querySelectorAll('.recipient-pill, .recipient-item').forEach(item => {
          const text = item.textContent.toLowerCase();
          const match = !q || text.includes(q);
          item.style.display = match ? '' : 'none';
          if (match) hasVisible = true;
        });
        // Also show/hide the group header
        const header = group.querySelector('.penerima-group-header');
        const itemsContainer = group.querySelector('.penerima-items');
        if (header) header.style.display = hasVisible ? '' : 'none';
      });
    });
  }

  // ── Attach select-all per group ──
  container.querySelectorAll('.penerima-select-all').forEach(btn => {
    btn.addEventListener('click', function () {
      const group = this.closest('.penerima-group');
      if (!group) return;
      const checkboxes = group.querySelectorAll('input[type="checkbox"]');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => {
        cb.checked = !allChecked;
        // Update pill visual
        const pill = cb.closest('.recipient-pill');
        if (pill) pill.classList.toggle('selected', cb.checked);
      });
      // Update button text
      this.textContent = allChecked ? 'Pilih Semua' : 'Hapus Semua';
      updatePenerimaCounter(container);
    });
  });

  // ── Initial counter update ──
  updatePenerimaCounter(container);
}

function renderRecipientSelectors() {
  const upContainer = $('upload-recipient-container');
  const editContainer = $('edit-recipient-container');

  upContainer.innerHTML = '';
  editContainer.innerHTML = '';

  renderPenerimaWidget(upContainer);
  renderPenerimaWidget(editContainer);
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

  // Derive division and jabatan values from recipientsList for dynamic matching
  const knownDivisions = [...new Set(recipientsList.map(u => u.divisi).filter(Boolean))];
  const knownJabatan = [...new Set(recipientsList.map(u => u.jabatan).filter(Boolean))];

  const isGroupLabel = (str) => {
    // New format: "Divisi X", "Jabatan X", "JabatanName DivisionName"
    if (str.startsWith('Divisi ')) return true;
    if (str.startsWith('Jabatan ')) return true;
    // Legacy formats
    if (str.startsWith('SM ') || str.startsWith('Senior Manager ') || str.startsWith('Staff ')) return true;
    if (str === 'Direktur Umum' || str === 'Wakil Direktur' || str === 'Wakil Direktur Utama' || str === 'Direktur') return true;
    if (str === 'Semua SM' || str === 'Semua Senior Manager' || str === 'Semua Staff') return true;
    // Dynamic: "JabatanName DivisionName" combos
    for (const jab of knownJabatan) {
      for (const div of knownDivisions) {
        if (str === `${jab} ${div}`) return true;
      }
    }
    return false;
  };

  const groupLabels = recs.filter(isGroupLabel);
  if (groupLabels.length > 0) {
    return groupLabels;
  }
  return recs;
}

function renderDocumentsTable() {
  const tbody = $('sharing-table-body');
  const emptyDiv = $('sharing-empty') || null;
  const paginationDiv = $('sharing-pagination') || null;
  if (!tbody) return;

  tbody.innerHTML = '';

  const searchVal = $('sharing-search') ? $('sharing-search').value.toLowerCase().trim() : '';
  const filterMonth = $('filter-month') ? $('filter-month').value : '';
  const filterYear = $('filter-year') ? $('filter-year').value : '';

  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional',
    it: 'IT',
    it: 'IT'
  };
  const divLabel = divisionLabels[currentUser.division] || '';

  const filtered = sharedDocuments.filter(doc => {
    // 1. Tab Filter
    if (activeTab === 'keluar') {
      // Staff: only show their own sent documents
      // Management (SM): show documents from their division
      // Top Management: show all documents (handled by "semua" tab)
      const senderLower = (doc.senderName || '').toLowerCase().trim();
      const currentNameLower = (currentUser.display_name || '').toLowerCase().trim();
      const isOwnDoc = senderLower === currentNameLower;
      const isManagement = currentUser.role === 'management';
      const isTopManagement = currentUser.role === 'top management';

      if (isTopManagement) {
        // Top management sees all in "semua" tab, not "keluar"
        return false;
      }

      if (isManagement) {
        // Management sees their own docs + docs from their division
        const senderDiv = doc.senderDivision;
        const sameDivision = senderDiv && senderDiv.toLowerCase() === (currentUser.division || '').toLowerCase();
        if (!isOwnDoc && !sameDivision) return false;
      } else {
        // Staff only sees their own docs
        if (!isOwnDoc) return false;
      }
    } else if (activeTab === 'masuk') {
      // Admin sees all documents (same as "semua" tab)
      const isAdmin = currentUser && (currentUser.is_admin || currentUser.username === 'admin' || currentUser.username === 'administrator');
      if (!isAdmin) {
        const senderLower = (doc.senderName || '').toLowerCase().trim();
        const currentNameLower = (currentUser.display_name || '').toLowerCase().trim();
        if (senderLower === currentNameLower) return false;
        const recs = (doc.penerima || '').split(',').map(r => r.trim());

        // Build the full list of group labels the current user belongs to
        const userGroups = [currentUser.display_name];
        const mappedDiv = divisionLabels[currentUser.division] || '';
        if (mappedDiv) {
          userGroups.push('Divisi ' + mappedDiv);
          const jbt = currentUser.jabatan || 'Staff';
          userGroups.push(jbt + ' ' + mappedDiv);
        }
        const jbt = currentUser.jabatan || 'Staff';
        if (jbt === 'Direktur Umum') {
          userGroups.push('Direktur Umum');
        } else if (jbt === 'Wakil Direktur' || jbt === 'Wakil Direktur Utama') {
          userGroups.push('Wakil Direktur');
          userGroups.push('Wakil Direktur Utama');
        } else if (jbt === 'Direktur') {
          userGroups.push('Direktur');
        } else if (jbt === 'SM' || jbt === 'Senior Manager') {
          userGroups.push('Semua SM');
          userGroups.push('Semua Senior Manager');
        } else if (jbt === 'Staff') {
          userGroups.push('Semua Staff');
        }

        const isRecipient = userGroups.some(g => recs.includes(g));
        if (!isRecipient) return false;
      }
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
    if (filterMonth !== '' && filterMonth !== 'all') {
      // getMonth() is 0-based; filter values are 1-based
      if (docDate.getMonth() + 1 !== parseInt(filterMonth, 10)) return false;
    }

    // 4. Year Filter
    if (filterYear !== '' && filterYear !== 'all') {
      if (docDate.getFullYear() !== parseInt(filterYear, 10)) return false;
    }

    return true;
  });

  // 5. Sorting
  filtered.sort((a, b) => {
    let valA, valB;
    if (sharingSortField === 'tgl') {
      valA = new Date(a.tgl).getTime();
      valB = new Date(b.tgl).getTime();
    } else if (sharingSortField === 'document_name') {
      valA = (a.document_name || '').toLowerCase();
      valB = (b.document_name || '').toLowerCase();
    } else if (sharingSortField === 'senderName') {
      valA = (a.senderName || '').toLowerCase();
      valB = (b.senderName || '').toLowerCase();
    } else {
      return 0;
    }
    if (valA < valB) return sharingSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sharingSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (filtered.length === 0) {
    if (emptyDiv) emptyDiv.classList.remove('hidden');
    if (paginationDiv) paginationDiv.classList.add('hidden');
    return;
  }
  if (emptyDiv) emptyDiv.classList.add('hidden');

  // Calculate Pagination parameters
  const totalPages = Math.ceil(filtered.length / sharingPageSize) || 1;
  if (sharingCurrentPage > totalPages) sharingCurrentPage = totalPages;
  if (sharingCurrentPage < 1) sharingCurrentPage = 1;

  // Render pagination controls
  if (paginationDiv) {
    paginationDiv.classList.remove('hidden');
    paginationDiv.innerHTML = `
      <button class="btn-secondary-sm" id="btn-sharing-prev" onclick="changeSharingPage(-1)" ${sharingCurrentPage === 1 ? 'disabled' : ''}>← Prev</button>
      <span id="sharing-page-info" style="font-size:13px; color:var(--text-secondary);">Halaman ${sharingCurrentPage} dari ${totalPages}</span>
      <button class="btn-secondary-sm" id="btn-sharing-next" onclick="changeSharingPage(1)" ${sharingCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
    `;
  }

  // Get current page items
  const startIndex = (sharingCurrentPage - 1) * sharingPageSize;
  const pageItems = filtered.slice(startIndex, startIndex + sharingPageSize);

  pageItems.forEach(doc => {
    const tr = document.createElement('tr');

    const d = new Date(doc.tgl);
    const dateDay = d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateTime = d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const senderDivLabel = divisionLabels[doc.senderDivision] || doc.senderDivision || '';

    const typeBadge = `<span class="badge-type ${doc.document_type.toLowerCase()}">${esc(doc.document_type)}</span>`;
    const subTipe = doc.sub_tipe ? `<span class="doc-sub">${esc(doc.sub_tipe)}</span>` : '';

    const displayRecs = getDisplayRecipients(doc.penerima);
    const MAX_VISIBLE_RECIPIENTS = 3;
    let recipientsStr = '';
    if (displayRecs.length <= MAX_VISIBLE_RECIPIENTS) {
      recipientsStr = displayRecs.map(r => {
        const tagClass = getTagClassForRecipient(r);
        return `<span class="tag-pill ${tagClass}">${esc(r)}</span>`;
      }).join('');
    } else {
      const visible = displayRecs.slice(0, MAX_VISIBLE_RECIPIENTS);
      const hidden = displayRecs.slice(MAX_VISIBLE_RECIPIENTS);
      recipientsStr = visible.map(r => {
        const tagClass = getTagClassForRecipient(r);
        return `<span class="tag-pill ${tagClass}">${esc(r)}</span>`;
      }).join('');
      const tooltipContent = hidden.map(r => {
        const tagClass = getTagClassForRecipient(r);
        return `<span class="tag-pill ${tagClass}">${esc(r)}</span>`;
      }).join('');
      recipientsStr += `<span class="sf-recipient-more">+${hidden.length}<span class="sf-recipient-tooltip">${tooltipContent}</span></span>`;
    }

    const isDocSelected = selectedDocIds.has(doc.id);
    const canEdit = (doc.senderName || '').toLowerCase().trim() === (currentUser.display_name || '').toLowerCase().trim();
    const canDelete = currentUser.is_admin || currentUser.username === 'admin' || currentUser.username === 'administrator';
    const editBtn = canEdit
      ? `<button class="btn-action edit-btn" onclick="event.stopPropagation(); openEditModal('${doc.id}')">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
           Ubah
         </button>`
      : '';
    const deleteDocBtn = canDelete
      ? `<button class="btn-action delete-btn" onclick="event.stopPropagation(); deleteDocument('${doc.id}', '${esc(doc.document_name)}')">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
           Hapus
         </button>`
      : '';
    const dlFileName = doc.file ? doc.file.replace(/\\/g, '/').split('/').pop() : '';
    const downloadBtn = doc.file
      ? `<a class="btn-action download-btn" style="text-decoration:none; display:inline-flex;" href="${API}/uploads/${dlFileName}" download="${dlFileName}" onclick="event.stopPropagation();">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           Unduh
         </a>`
      : '';
    const previewBtn = (doc.file && isPreviewable(doc.file))
      ? `<button class="btn-action preview-btn" onclick="event.stopPropagation(); previewDocument('${doc.id}', '${doc.file.replace(/\\/g, '/').split('/').pop().replace(/'/g, "\\'")}', '${esc(doc.document_name).replace(/'/g, "\\'")}')">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
           Preview
         </button>`
      : '';

    tr.style.cursor = 'pointer';
    tr.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox' || e.target.closest('.sf-checkbox-cell') || e.target.closest('.btn-action')) return;
      openDetailModal(doc.id);
    });

    tr.innerHTML = `
      <td class="sf-checkbox-cell"><input type="checkbox" ${isDocSelected ? 'checked' : ''} onchange="event.stopPropagation(); toggleDocSelection('${doc.id}', this.checked)"></td>
      <td class="sf-td-date">
        <div class="sf-date-day">${dateDay}</div>
        <div class="sf-date-time">${dateTime}</div>
      </td>
      <td class="sf-td-doc">
        <div class="sf-doc-name">${esc(doc.document_name)}</div>
        <div class="sf-doc-meta">
          ${typeBadge}${subTipe}
          <span class="doc-sub sf-doc-number">${esc(doc.document_number)}</span>
          ${doc.project_name ? `<span class="doc-sub">${esc(doc.project_name)}</span>` : ''}
        </div>
      </td>
      <td class="sf-td-sender">
        <div class="sf-sender-name">${esc(toTitleCase(doc.senderName))}</div>
        ${senderDivLabel ? `<div class="sf-sender-div">${esc(senderDivLabel)}</div>` : ''}
      </td>
      <td class="sf-td-recipients">
        <div class="sf-recipients-wrap">${recipientsStr}</div>
      </td>
      <td class="sf-td-actions">
        <button class="btn-action view-btn" onclick="event.stopPropagation(); openDetailModal('${doc.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Detail
        </button>
        ${downloadBtn}
        ${previewBtn}
        ${editBtn}
        ${deleteDocBtn}
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

async function deleteDocument(docId, docName) {
  const confirmed = await showCustomConfirm(`Hapus dokumen "${docName}" secara permanen? File juga akan ikut terhapus.`);
  if (!confirmed) return;
  try {
    const res = await fetch(`${API}/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { showCustomAlert(data.error || 'Gagal menghapus dokumen'); return; }
    showCustomAlert('Dokumen berhasil dihapus!');
    sharedDocuments = sharedDocuments.filter(d => d.id !== docId);
    renderDocumentsTable();
  } catch (err) {
    showCustomAlert('Terjadi kesalahan saat menghapus dokumen');
  }
}
window.deleteDocument = deleteDocument;

/* ── Column Sorting ── */
function sortDocuments(field) {
  if (sharingSortField === field) {
    sharingSortDir = sharingSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sharingSortField = field;
    sharingSortDir = 'desc';
  }
  // Update sort indicators in thead
  document.querySelectorAll('.sf-table th .sort-indicator').forEach(el => el.classList.remove('active'));
  const activeIndicator = document.getElementById('sort-ind-' + field);
  if (activeIndicator) {
    activeIndicator.classList.add('active');
    activeIndicator.textContent = sharingSortDir === 'asc' ? '▲' : '▼';
  }
  sharingCurrentPage = 1;
  renderDocumentsTable();
}
window.sortDocuments = sortDocuments;

/* ── Row Selection / Bulk Actions ── */
function toggleDocSelection(docId, checked) {
  if (checked) {
    selectedDocIds.add(docId);
  } else {
    selectedDocIds.delete(docId);
  }
  updateBulkBar();
}
window.toggleDocSelection = toggleDocSelection;

function toggleSelectAll(checkbox) {
  const allCheckboxes = document.querySelectorAll('#sharing-table-body input[type="checkbox"]');
  allCheckboxes.forEach(cb => {
    cb.checked = checkbox.checked;
    const row = cb.closest('tr');
    if (row) {
      // Extract docId from the checkbox's onchange attribute
      const match = cb.getAttribute('onchange');
      if (match) {
        const idMatch = match.match(/toggleDocSelection\('([^']+)'/);
        if (idMatch) {
          if (checkbox.checked) selectedDocIds.add(idMatch[1]);
          else selectedDocIds.delete(idMatch[1]);
        }
      }
    }
  });
  updateBulkBar();
}
window.toggleSelectAll = toggleSelectAll;

function updateBulkBar() {
  const bulkBar = $('sharing-bulk-bar');
  const bulkCount = $('bulk-count');
  if (!bulkBar || !bulkCount) return;
  if (selectedDocIds.size > 0) {
    bulkBar.classList.add('active');
    bulkCount.textContent = selectedDocIds.size + ' dipilih';
  } else {
    bulkBar.classList.remove('active');
    bulkCount.textContent = '0 dipilih';
    // Reset select-all checkbox
    const selectAllCb = $('select-all-docs');
    if (selectAllCb) selectAllCb.checked = false;
  }
}
window.updateBulkBar = updateBulkBar;

function clearBulkSelection() {
  selectedDocIds.clear();
  document.querySelectorAll('#sharing-table-body input[type="checkbox"]').forEach(cb => cb.checked = false);
  const selectAllCb = $('select-all-docs');
  if (selectAllCb) selectAllCb.checked = false;
  updateBulkBar();
}
window.clearBulkSelection = clearBulkSelection;

async function bulkDownload() {
  if (selectedDocIds.size === 0) return;
  showCustomAlert(`Mengunduh ${selectedDocIds.size} dokumen... Fitur unduh massal akan segera tersedia.`);
}
window.bulkDownload = bulkDownload;

async function bulkDelete() {
  if (selectedDocIds.size === 0) return;
  const confirmed = await showCustomConfirm(`Hapus ${selectedDocIds.size} dokumen secara permanen? File juga akan ikut terhapus.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${API}/api/documents/bulk_delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: Array.from(selectedDocIds) })
    });
    const data = await res.json();

    if (!res.ok) {
      showCustomAlert(data.error || 'Gagal menghapus dokumen');
      return;
    }

    showCustomAlert(`${data.deletedCount} dokumen berhasil dihapus!`);
    clearBulkSelection();
    await loadSharedDocuments();
  } catch (err) {
    console.error('Error bulk delete:', err);
    showCustomAlert('Terjadi kesalahan saat menghapus dokumen secara massal');
  }
}
window.bulkDelete = bulkDelete;

/* ─── DOCUMENT PREVIEW ─── */
function getFileExtension(filename) {
  if (!filename) return '';
  return filename.split('.').pop().toLowerCase();
}

function isPreviewable(filename) {
  const ext = getFileExtension(filename);
  return ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
}

function getFileTypeLabel(filename) {
  const ext = getFileExtension(filename);
  const labels = {
    pdf: 'PDF', docx: 'Word', doc: 'Word', xlsx: 'Excel', xls: 'Excel',
    png: 'Gambar', jpg: 'Gambar', jpeg: 'Gambar', gif: 'Gambar',
    bmp: 'Gambar', webp: 'Gambar', svg: 'Gambar'
  };
  return labels[ext] || ext.toUpperCase();
}

function previewDocument(docId, filename, docName) {
  // Log view event
  if (docId) {
    apiFetch(`/api/documents/${docId}/view`, { method: 'POST' }).catch(() => { });
  }

  const url = `preview.html?id=${docId}&file=${encodeURIComponent(filename)}&name=${encodeURIComponent(docName || filename)}`;
  window.open(url, '_blank');
}
window.previewDocument = previewDocument;

function closeDocPreview() {
  const overlay = $('doc-preview-overlay');
  if (overlay) overlay.classList.add('hidden');
  const content = $('doc-preview-content');
  if (content) content.innerHTML = '';
}
window.closeDocPreview = closeDocPreview;

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
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    await showCustomAlert('Format berkas tidak didukung! Hanya PDF, Word, Excel, dan Gambar (PNG/JPG/dll).');
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

  const selectedDivs = [];
  container.querySelectorAll('input[name="recipients-division"]:checked').forEach(cb => {
    selectedDivs.push(cb.value.trim()); // e.g. 'Marketing'
  });

  const selectedJabatan = [];
  container.querySelectorAll('input[name="recipients-jabatan"]:checked').forEach(cb => {
    selectedJabatan.push(cb.value.trim()); // e.g. 'SM'
  });

  if (selectedDivs.length === 0 && selectedJabatan.length === 0) {
    return null;
  }

  const resolvedRecipients = [];

  if (selectedDivs.length > 0 && selectedJabatan.length > 0) {
    // Both divisions and jabatan selected — add group labels for each combination
    selectedDivs.forEach(divName => {
      selectedJabatan.forEach(jabName => {
        const groupLabel = `${jabName} ${divName}`;
        if (!resolvedRecipients.includes(groupLabel)) {
          resolvedRecipients.push(groupLabel);
        }
      });
    });
  } else if (selectedDivs.length > 0) {
    // Only divisions — entire division
    selectedDivs.forEach(divName => {
      const groupLabel = `Divisi ${divName}`;
      if (!resolvedRecipients.includes(groupLabel)) resolvedRecipients.push(groupLabel);
    });
  } else {
    // Only jabatan — this jabatan across all divisions
    selectedJabatan.forEach(jabName => {
      const groupLabel = `Jabatan ${jabName}`;
      if (!resolvedRecipients.includes(groupLabel)) resolvedRecipients.push(groupLabel);
    });
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
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  formData.append('tgl', `${$('upload-doc-date').value} ${timeStr}`);

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

  let timeStr = $('edit-doc-date').dataset.time;
  if (!timeStr) {
    const now = new Date();
    timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
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
    tgl: `${$('edit-doc-date').value} ${timeStr}`
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
  populateDocTypes('edit-doc-type', doc.document_type);
  $('edit-sub-tipe').value = doc.sub_tipe || '';

  if (typeof jQuery !== 'undefined' && jQuery.fn.select2) {
    jQuery('#edit-project-name').val(doc.project_name).trigger('change');
  } else {
    $('edit-project-name').value = doc.project_name;
  }
  $('edit-doc-number').value = doc.document_number;
  $('edit-doc-name').value = doc.document_name;
  $('edit-description').value = doc.description || '';

  if (doc.tgl) {
    const d = new Date(doc.tgl);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    $('edit-doc-date').value = `${year}-${month}-${day}`;
    $('edit-doc-date').dataset.time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  } else {
    $('edit-doc-date').value = '';
    $('edit-doc-date').dataset.time = '';
  }

  renderRecipientSelectors();

  const container = $('edit-recipient-container');
  const recs = (doc.penerima || '').split(',').map(r => r.trim()).filter(Boolean);

  // Restore division checkboxes: a division is checked if any saved recipient
  // is "Divisi X", "JabatanX X", or "X Y" where X matches the division name
  container.querySelectorAll('input[name="recipients-division"]').forEach(cb => {
    const divName = cb.value.trim().toLowerCase();
    const isChecked = recs.some(r => {
      const lower = r.toLowerCase();
      return lower === `divisi ${divName}` ||
        lower.endsWith(` ${divName}`) ||
        lower === divName;
    });
    if (isChecked) {
      cb.checked = true;
      cb.closest('.recipient-pill')?.classList.add('selected');
    }
  });

  // Restore jabatan checkboxes: a jabatan is checked if any saved recipient
  // is "Jabatan X", "X DivName", or matches directly
  container.querySelectorAll('input[name="recipients-jabatan"]').forEach(cb => {
    const jabName = cb.value.trim().toLowerCase();
    const isChecked = recs.some(r => {
      const lower = r.toLowerCase();
      return lower === `jabatan ${jabName}` ||
        lower.startsWith(`${jabName} `) ||
        lower === jabName;
    });
    if (isChecked) {
      cb.checked = true;
      cb.closest('.recipient-pill')?.classList.add('selected');
    }
  });

  // Update penerima counter
  updatePenerimaCounter(container);

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
    operasional: 'Operasional',
    it: 'IT'
  };
  const senderDiv = divisionLabels[doc.senderDivision] || doc.senderDivision || '';
  $('peek-sender').textContent = `${doc.senderName} (${senderDiv})`;

  $('peek-tgl').textContent = new Date(doc.tgl).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (doc.updated_at) {
    $('peek-tgl-edit-row').style.display = 'flex';
    $('peek-tgl-edit').textContent = new Date(doc.updated_at).toLocaleString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } else {
    $('peek-tgl-edit-row').style.display = 'none';
  }

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

  // Log view event (fire-and-forget, ignore errors)
  apiFetch(`/api/documents/${doc.id}/view`, { method: 'POST' }).catch(() => { });

  // Fetch and render view history
  const viewsList = $('peek-views-list');
  if (viewsList) {
    viewsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Memuat...</div>';
    apiFetch(`/api/documents/${doc.id}/views`).then(views => {
      if (!views || !Array.isArray(views) || views.length === 0) {
        viewsList.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Belum ada riwayat.</div>';
        return;
      }
      viewsList.innerHTML = views.map(v => {
        const when = new Date(v.viewed_at).toLocaleString('id-ID', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });
        const jabDiv = [v.viewer_jabatan, v.viewer_division ? (
          {
            marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional',
            it: 'IT'
          }[v.viewer_division] || v.viewer_division
        ) : null].filter(Boolean).join(' · ');
        return `
          <div style="display:flex; align-items:flex-start; gap:8px; padding:6px 8px; background:var(--bg-hover); border-radius:var(--radius-sm);">
            <div style="flex-shrink:0; width:28px; height:28px; border-radius:50%; background:var(--accent-glow); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--accent);">
              ${esc(toTitleCase(v.viewer_name || '?').slice(0, 2).toUpperCase())}
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(toTitleCase(v.viewer_name))}</div>
              ${jabDiv ? `<div style="font-size:11px; color:var(--text-muted);">${esc(jabDiv)}</div>` : ''}
              <div style="font-size:11px; color:var(--text-muted); margin-top:1px;">${when}</div>
            </div>
          </div>`;
      }).join('');
    });
  }

  $('side-peek-backdrop').classList.remove('hidden');
  $('side-peek-panel').classList.add('open');
}
window.openDetailModal = openDetailModal;

/* ─── NOTION WORKSPACE CONTROLLERS ─── (state moved to top) */
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

function showNotionTypeDialog(pageTitle) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.innerHTML = `
      <div class="custom-dialog-modal" style="min-width: 350px;">
        <div class="custom-dialog-header">
          <span class="custom-dialog-icon">📄</span>
          <span class="custom-dialog-title">Tipe Halaman: ${esc(pageTitle)}</span>
        </div>
        <div class="custom-dialog-body" style="display: flex; flex-direction: column; gap: 10px;">
          <p style="margin:0; font-size:13px; color:var(--text-muted);">Pilih tipe halaman yang ingin dibuat:</p>
          
          <button id="btn-type-wiki" class="btn-secondary" style="display:flex; flex-direction:column; align-items:flex-start; padding: 12px; text-align: left; height: auto;">
            <div style="font-weight:600; margin-bottom:4px;">📄 Halaman Wiki / Catatan</div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:normal; white-space:normal;">Halaman kosong biasa untuk menulis dokumen, wiki, atau panduan.</div>
          </button>
          
          <button id="btn-type-db" class="btn-secondary" style="display:flex; flex-direction:column; align-items:flex-start; padding: 12px; text-align: left; height: auto;">
            <div style="font-weight:600; margin-bottom:4px;">📅 Database (Tabel/Kalender)</div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:normal; white-space:normal;">Halaman terstruktur seperti To-Do list, Kanban, atau Kalender.</div>
          </button>
        </div>
        <div class="custom-dialog-footer">
          <button class="btn-secondary-sm" id="btn-type-cancel">Batal</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const btnWiki = overlay.querySelector('#btn-type-wiki');
    const btnDb = overlay.querySelector('#btn-type-db');
    const btnCancel = overlay.querySelector('#btn-type-cancel');

    btnWiki.onclick = () => { overlay.remove(); resolve({ isDb: false }); };
    btnDb.onclick = () => { overlay.remove(); resolve({ isDb: true }); };
    btnCancel.onclick = () => { overlay.remove(); resolve(null); };
  });
}

window.createNewNotionPage = async function () {
  currentNotionPageId = null;
  await addSubpageToCurrent();
};

async function addSubpageToCurrent() {
  const isSubpage = !!currentNotionPageId;
  const promptMsg = isSubpage
    ? "Masukkan judul sub-halaman baru:"
    : "Masukkan judul halaman baru (Root):";
  const title = await showCustomPrompt(promptMsg);
  if (title === null) return;
  const pageTitle = title.trim() || "Tanpa Judul";

  const typeChoice = await showNotionTypeDialog(pageTitle);
  if (!typeChoice) return; // Dibatalkan oleh user

  const isDb = typeChoice.isDb;

  try {
    const pageData = {
      title: pageTitle,
      content: isDb ? "Database baru." : "# " + pageTitle + "\n\nTulis sesuatu di sini...",
      icon: isDb ? "📅" : "📄",
      cover_image: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      parent_id: isSubpage ? currentNotionPageId : null,
      is_database: isDb,
      database_view: "table",
      properties: {}
    };

    const newPage = await apiFetch('/api/notion/pages', {
      method: 'POST',
      body: pageData
    });

    if (newPage) {
      if (isSubpage) delete notionCollapsedPages[currentNotionPageId];
      await loadNotionWorkspace();
      if (isSubpage) {
        openNotionPage(currentNotionPageId);
      } else {
        openNotionPage(newPage.id);
      }
    }
  } catch (err) {
    console.error("Gagal membuat halaman Notion:", err);
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

  // Render Emoji / icon
  const emojiEl = $('notion-page-icon');
  if (emojiEl) {
    emojiEl.textContent = currentNotionPage.icon || (currentNotionPage.is_database ? '📅' : '📄');
  }

  // Render Title display — show display div, hide input
  const titleDisplay = $('notion-title-display');
  if (titleDisplay) {
    titleDisplay.textContent = currentNotionPage.title || 'Untitled';
    titleDisplay.classList.remove('hidden');
    titleDisplay.style.cursor = 'pointer';
    // Wire click-to-edit (replace handler each open)
    titleDisplay.onclick = () => {
      const inp = $('notion-title-input');
      if (!inp) return;
      inp.value = titleDisplay.textContent;
      titleDisplay.classList.add('hidden');
      inp.classList.remove('hidden');
      inp.focus();
      inp.select();
    };
  }

  const titleInput = $('notion-title-input');
  if (titleInput) {
    titleInput.value = currentNotionPage.title || '';
    titleInput.classList.add('hidden');
    titleInput.onblur = () => saveNotionTitle();
    titleInput.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveNotionTitle(); }
      if (e.key === 'Escape') {
        titleInput.classList.add('hidden');
        const disp = $('notion-title-display');
        if (disp) disp.classList.remove('hidden');
      }
    };
  }

  // Render Title Breadcrumbs
  renderBreadcrumbs();

  // Restore action controls for standard pages
  const coverActions = document.querySelector('.notion-cover-actions');
  if (coverActions) coverActions.classList.remove('hidden');

  const editBtn = $('btn-notion-edit');
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

    const editBtn = $('btn-notion-edit');
    if (editBtn) editBtn.textContent = 'Edit';
    $('notion-editor-wrapper').classList.add('hidden');
    $('notion-viewer').classList.remove('hidden');

    if (summernoteInitialized) {
      jQuery('#notion-summernote').summernote('code', ensureHtml(currentNotionPage.content));
    }

    renderMarkdownPreview();
    renderSubpagesList();
  } else {
    $('notion-page-content-area').classList.add('hidden');
    $('notion-database-content-area').classList.remove('hidden');

    activeDbView = currentNotionPage.database_view || 'table';
    document.querySelectorAll('.notion-db-tab').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === activeDbView.toLowerCase());
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
  const previewArea = $('notion-rendered-content');
  if (!previewArea || !currentNotionPage) return;

  previewArea.innerHTML = ensureHtml(currentNotionPage.content);

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

        if (summernoteInitialized) {
          jQuery('#notion-summernote').summernote('code', ensureHtml(currentNotionPage.content));
        }

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

function ensureHtml(content) {
  if (!content) return '';
  if (/<(p|h[1-6]|ul|ol|li|blockquote|div|span|table|pre|b|i|strong|em|u)[>\s]/i.test(content)) {
    return content;
  }
  return parseMarkdown(content);
}

let summernoteInitialized = false;

async function toggleNotionEditMode() {
  if (!currentNotionPageId) return;

  const editBtn = $('btn-notion-edit');
  const cancelBtn = $('btn-notion-cancel');
  const previewBlock = $('notion-viewer');
  const editorWrapper = $('notion-editor-wrapper');

  if (!notionEditMode) {
    notionEditMode = true;
    editBtn.textContent = 'Simpan';
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    editorWrapper.classList.remove('hidden');
    previewBlock.classList.add('hidden');
    renderNotionPageAccess();

    const htmlContent = ensureHtml(currentNotionPage.content);

    if (!summernoteInitialized) {
      jQuery('#notion-summernote').summernote({
        height: 400,
        toolbar: [
          ['style', ['style']],
          ['font', ['bold', 'underline', 'clear']],
          ['fontname', ['fontname']],
          ['fontsize', ['fontsize']],
          ['color', ['color']],
          ['para', ['ul', 'ol', 'paragraph']],
          ['table', ['table']],
          ['insert', ['link', 'picture', 'video']],
          ['view', ['fullscreen', 'codeview', 'help']]
        ]
      });
      summernoteInitialized = true;
    }

    jQuery('#notion-summernote').summernote('code', htmlContent);

  } else {
    notionEditMode = false;
    editBtn.textContent = 'Edit';
    if (cancelBtn) cancelBtn.classList.add('hidden');
    editorWrapper.classList.add('hidden');
    previewBlock.classList.remove('hidden');

    const updatedContent = summernoteInitialized ? jQuery('#notion-summernote').summernote('code') : '';
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

  const editBtn = $('btn-notion-edit');
  const cancelBtn = $('btn-notion-cancel');
  const previewBlock = $('notion-viewer');
  const editorWrapper = $('notion-editor-wrapper');

  if (editBtn) editBtn.textContent = 'Edit';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (editorWrapper) editorWrapper.classList.add('hidden');
  if (previewBlock) previewBlock.classList.remove('hidden');

  if (summernoteInitialized) {
    jQuery('#notion-summernote').summernote('code', ensureHtml(currentNotionPage.content));
  }
  renderMarkdownPreview();
  renderNotionPageAccess();
}
window.cancelNotionEdit = cancelNotionEdit;

async function saveNotionTitle() {
  if (!currentNotionPageId) return;

  const titleInput = $('notion-title-input');
  if (!titleInput) return;

  const newTitle = titleInput.value.trim() || 'Tanpa Judul';
  if (newTitle === currentNotionPage.title) {
    // No change — just restore display
    const titleDisplay = $('notion-title-display');
    if (titleDisplay) titleDisplay.classList.remove('hidden');
    titleInput.classList.add('hidden');
    return;
  }

  currentNotionPage.title = newTitle;

  const updatedPage = await apiFetch(`/api/notion/pages/${currentNotionPageId}`, {
    method: 'PUT',
    body: { title: newTitle }
  });

  const titleDisplay = $('notion-title-display');

  if (updatedPage) {
    if (titleDisplay) {
      titleDisplay.textContent = newTitle;
      titleDisplay.classList.remove('hidden');
    }
    if (titleInput) titleInput.classList.add('hidden');
    await loadNotionWorkspace();
    renderBreadcrumbs();
  } else {
    // Revert on failure
    if (titleDisplay) titleDisplay.classList.remove('hidden');
    if (titleInput) titleInput.classList.add('hidden');
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
    const emojiEl = $('notion-page-icon');
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
    const peekEmojiEl = $('notion-peek-icon');
    if (peekEmojiEl) peekEmojiEl.textContent = emoji;
  }
}
window.selectEmoji = selectEmoji;

// Fungsi insertEditorTag dihapus karena menggunakan TUI Editor.

async function switchDbView(viewName) {
  if (!currentNotionPageId) return;

  activeDbView = viewName;
  document.querySelectorAll('.notion-db-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === viewName.toLowerCase());
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
  // Clear container before rendering to prevent content accumulation
  const dbContainer = $('notion-db-content');
  if (dbContainer) dbContainer.innerHTML = '';

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
  const container = $('notion-db-content');
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
  const container = $('notion-db-content');
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
  const container = $('notion-db-content');
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
  grid.style.marginTop = '12px';
  grid.style.width = '100%';

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
  const container = $('notion-db-content');
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
  const container = $('notion-db-content');
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
  const container = $('notion-db-content');
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

  const setVal = (id, val) => { const el = $(id); if (el) { if ('value' in el) el.value = val; else el.textContent = val; } };

  const row = currentDbRows.find(r => r.id === rowId);
  const dataRow = row || notionPages.find(r => r.id === rowId);
  if (!dataRow) return;

  const props = typeof dataRow.properties === 'string' ? JSON.parse(dataRow.properties) : (dataRow.properties || {});

  setVal('notion-peek-icon', dataRow.icon || '📄');
  setVal('notion-peek-title', dataRow.title || '');
  setVal('notion-peek-status', props.status || 'To Do');
  setVal('notion-peek-priority', props.priority || 'Low');
  setVal('notion-peek-assignee', props.assignee || '');
  setVal('notion-peek-duedate', props.deadline || props.due_date || '');
  setVal('notion-peek-tags', (props.tags || []).join(', '));
  setVal('notion-peek-description', dataRow.content || '');

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

  const getVal = (id, fallback = '') => { const el = $(id); return el ? ('value' in el ? el.value : el.textContent) : fallback; };

  const emoji = getVal('notion-peek-icon', '📄');
  const title = getVal('notion-peek-title').trim() || 'Tanpa Judul';
  const status = getVal('notion-peek-status', 'To Do');
  const priority = getVal('notion-peek-priority', 'Low');
  const assignee = getVal('notion-peek-assignee', '');
  const deadline = getVal('notion-peek-duedate', '');
  const tags = getVal('notion-peek-tags', '').split(',').map(t => t.trim()).filter(Boolean);
  const content = getVal('notion-peek-description', '');

  const updatedProps = { status, priority, assignee, deadline, tags };

  if (status === 'Done') {
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
  renderNotionCalendar();
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

  const monthTitle = $('cal-month-year');
  if (monthTitle) monthTitle.textContent = `${monthNames[month]} ${year}`;

  // Wire nav buttons (idempotent — safe to reassign each render)
  const prevBtn = $('btn-cal-prev');
  const nextBtn = $('btn-cal-next');
  if (prevBtn) prevBtn.onclick = () => navigateNotionCalendar(-1);
  if (nextBtn) nextBtn.onclick = () => navigateNotionCalendar(1);

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

/* ─── ROOM MEMBERS PANEL ─── */
let currentRoomMembers = [];

function toggleMembersPanel() {
  const panel = $('members-panel');
  if (!panel || !currentRoomId) return;
  const isHidden = panel.classList.toggle('hidden');
  if (!isHidden) {
    loadRoomMembers(currentRoomId);
  }
}
window.toggleMembersPanel = toggleMembersPanel;

async function loadRoomMembers(roomId) {
  const data = await apiFetch(`/api/rooms/${roomId}/members`);
  if (!data) return;
  currentRoomMembers = data;
  renderMembersPanel();
}

function renderMembersPanel() {
  const list = $('members-list');
  if (!list) return;
  list.innerHTML = '';

  const currentRoom = rooms.find(r => r.id === currentRoomId);
  const isCreator = currentRoom && currentRoom.created_by === currentUser.id;

  currentRoomMembers.forEach((member) => {
    const li = document.createElement('li');
    li.className = 'member-item';

    const statusClass = member.is_online ? 'online' : 'offline';
    const divisionLabels = {
      marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional',
      it: 'IT', it: 'IT'
    };
    const divLabel = divisionLabels[member.division] || '';
    const creatorBadge = member.is_creator ? '<span class="creator-badge">Pembuat</span>' : '';

    let removeBtn = '';
    if (isCreator && member.id !== currentUser.id) {
      removeBtn = `<button class="btn-remove-member" onclick="removeMemberFromRoom('${member.id}')" title="Keluarkan">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>`;
    } else if (member.id === currentUser.id) {
      removeBtn = `<button class="btn-remove-member btn-leave" onclick="removeMemberFromRoom('${member.id}')" title="Keluar dari room">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>`;
    }

    li.innerHTML = `
      <div class="member-avatar">
        <div class="avatar-circle-sm">${esc(member.display_name.slice(0, 2).toUpperCase())}</div>
        <span class="status-dot ${statusClass}"></span>
      </div>
      <div class="member-info">
        <div class="member-name">${esc(toTitleCase(member.display_name))} ${creatorBadge}</div>
        <div class="member-meta">${esc(divLabel)}${member.jabatan ? ' · ' + esc(member.jabatan) : ''}</div>
      </div>
      ${removeBtn}
    `;
    list.appendChild(li);
  });
}

async function removeMemberFromRoom(userId) {
  if (!currentRoomId) return;
  const isSelf = userId === currentUser.id;
  const msg = isSelf ? 'Yakin ingin keluar dari room ini?' : 'Yakin ingin mengeluarkan anggota ini?';
  if (!confirm(msg)) return;

  await apiFetch(`/api/rooms/${currentRoomId}/members/${userId}`, { method: 'DELETE' });
}
window.removeMemberFromRoom = removeMemberFromRoom;

function openAddMemberModal() {
  const modal = $('add-member-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  $('add-member-search').value = '';
  renderAddMemberList();
}
window.openAddMemberModal = openAddMemberModal;

function closeAddMemberModal() {
  const modal = $('add-member-modal');
  if (modal) modal.classList.add('hidden');
}
window.closeAddMemberModal = closeAddMemberModal;

function filterAddMemberList() {
  renderAddMemberList();
}
window.filterAddMemberList = filterAddMemberList;

function renderAddMemberList() {
  const list = $('add-member-list');
  if (!list) return;
  list.innerHTML = '';

  const search = ($('add-member-search')?.value || '').toLowerCase();
  const memberIds = currentRoomMembers.map(m => m.id);

  const available = systemUsers.filter(u =>
    !memberIds.includes(u.id) &&
    (u.display_name.toLowerCase().includes(search) || u.username.toLowerCase().includes(search))
  );

  if (available.length === 0) {
    list.innerHTML = '<li class="no-results">Tidak ada pengguna yang tersedia</li>';
    return;
  }

  available.forEach((user) => {
    const li = document.createElement('li');
    li.className = 'add-member-item';
    const divisionLabels = {
      marketing: 'Marketing', sdm: 'SDM', keuangan: 'Keuangan', operasional: 'Operasional',
      it: 'IT', it: 'IT'
    };
    const divLabel = divisionLabels[user.division] || '';

    li.innerHTML = `
      <div class="member-avatar">
        <div class="avatar-circle-sm">${esc(user.display_name.slice(0, 2).toUpperCase())}</div>
      </div>
      <div class="member-info">
        <div class="member-name">${esc(toTitleCase(user.display_name))}</div>
        <div class="member-meta">${esc(divLabel)}</div>
      </div>
      <button class="btn-add-member-confirm" onclick="addMemberToRoom('${user.id}')">Tambah</button>
    `;
    list.appendChild(li);
  });
}

async function addMemberToRoom(userId) {
  if (!currentRoomId) return;
  const res = await apiFetch(`/api/rooms/${currentRoomId}/members`, {
    method: 'POST',
    body: { user_id: userId }
  });
  if (res) {
    await loadRoomMembers(currentRoomId);
    renderAddMemberList();
    await loadRooms();
  }
}
window.addMemberToRoom = addMemberToRoom;

/* ─── ADMIN PANEL CONTROLLERS ─── */
let adminUsersList = [];

// Switch subview (currently only users)
function switchAdminSubView(subView) {
  document.querySelectorAll('.admin-section .room-item').forEach(el => {
    el.classList.toggle('active', el.id === `btn-admin-${subView}`);
  });
}
window.switchAdminSubView = switchAdminSubView;

// Load all users
async function loadAdminUsers() {
  const users = await apiFetch('/api/admin/users');
  if (users) {
    adminUsersList = users;
    renderAdminUsersTable(users);
  }
}
window.loadAdminUsers = loadAdminUsers;

// Render users table
function renderAdminUsersTable(users) {
  const tbody = $('admin-users-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">Tidak ada data pengguna.</td>
      </tr>
    `;
    return;
  }

  const divisionLabels = {
    marketing: 'Marketing',
    sdm: 'SDM',
    keuangan: 'Keuangan',
    operasional: 'Operasional',
    it: 'IT'
  };

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';

    // division badge class
    const divClass = user.division ? user.division.toLowerCase() : 'default';
    const isSelf = user.id === currentUser.id;

    tr.innerHTML = `
      <td style="padding: 12px 16px; font-weight: 500; color: var(--text-primary);">${esc(toTitleCase(user.display_name))} ${isSelf ? ' <small style="color:var(--accent); font-weight:normal;">(Anda)</small>' : ''}</td>
      <td style="padding: 12px 16px; color: var(--text-secondary);">${esc(user.username)}</td>
      <td style="padding: 12px 16px; color: var(--text-secondary);">${esc(user.email)}</td>
      <td style="padding: 12px 16px;">
        <span class="division-badge ${divClass}">${esc(divisionLabels[user.division] || user.division || '-')}</span>
      </td>
      <td style="padding: 12px 16px; color: var(--text-secondary);">${esc(user.jabatan || '-')}</td>
      <td style="padding: 12px 16px;">
        <span class="role-badge role-${user.role === 'top management' ? 'top-management' : user.role}">${esc(user.role)}</span>
      </td>
      <td style="padding: 12px 16px; text-align: center;">
        <span class="admin-badge ${user.is_admin ? 'yes' : 'no'}">${user.is_admin ? 'Ya' : 'Tidak'}</span>
      </td>
      <td style="padding: 12px 16px; text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button class="btn-primary-sm" style="padding: 4px 8px; font-size: 11px; background: var(--accent);" onclick="openAdminEditUserModal('${user.id}')">Edit</button>
          <button class="btn-secondary-sm" style="padding: 4px 8px; font-size: 11px; background: #e67e22; color: white; border: none;" onclick="openAdminResetPwdModal('${user.id}')">Kunci</button>
          <button class="btn-danger-sm" style="padding: 4px 8px; font-size: 11px; ${isSelf ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${isSelf ? 'disabled' : ''} onclick="deleteAdminUser('${user.id}')">Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Client-side search filter
function filterAdminUsers() {
  const query = $('admin-user-search').value.toLowerCase().trim();
  if (!query) {
    renderAdminUsersTable(adminUsersList);
    return;
  }

  const filtered = adminUsersList.filter(user => {
    return (user.display_name && user.display_name.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.jabatan && user.jabatan.toLowerCase().includes(query)) ||
      (user.role && user.role.toLowerCase().includes(query)) ||
      (user.division && user.division.toLowerCase().includes(query));
  });

  renderAdminUsersTable(filtered);
}
window.filterAdminUsers = filterAdminUsers;

// Open Add User Modal
function openAdminAddUserModal() {
  $('admin-user-modal-title').textContent = 'Tambah Pengguna Baru';
  $('admin-user-id').value = '';
  $('admin-user-display-name').value = '';
  $('admin-user-username').value = '';
  $('admin-user-username').readOnly = false;
  $('admin-user-email').value = '';
  $('admin-user-password').value = '';
  $('admin-user-password').required = true;
  $('admin-user-password-container').style.display = 'block';
  $('admin-user-division').value = '';
  $('admin-user-role').value = 'staff';
  $('admin-user-jabatan').value = '';
  $('admin-user-is-admin').checked = false;
  $('admin-user-error').textContent = '';

  $('modal-admin-user-overlay').classList.remove('hidden');
}
window.openAdminAddUserModal = openAdminAddUserModal;

// Open Edit User Modal
function openAdminEditUserModal(userId) {
  const user = adminUsersList.find(u => u.id === userId);
  if (!user) return;

  $('admin-user-modal-title').textContent = 'Edit Pengguna';
  $('admin-user-id').value = user.id;
  $('admin-user-display-name').value = user.display_name || '';
  $('admin-user-username').value = user.username || '';
  $('admin-user-username').readOnly = true;
  $('admin-user-email').value = user.email || '';
  $('admin-user-password').value = '';
  $('admin-user-password').required = false;
  $('admin-user-password-container').style.display = 'none';
  $('admin-user-division').value = user.division || '';
  $('admin-user-role').value = user.role || 'staff';
  $('admin-user-jabatan').value = user.jabatan || '';
  $('admin-user-is-admin').checked = !!user.is_admin;
  $('admin-user-error').textContent = '';

  $('modal-admin-user-overlay').classList.remove('hidden');
}
window.openAdminEditUserModal = openAdminEditUserModal;

// Close User Modal
function closeAdminUserModal() {
  $('modal-admin-user-overlay').classList.add('hidden');
}
window.closeAdminUserModal = closeAdminUserModal;

// Submit Add / Edit User Form
async function handleAdminUserSubmit(e) {
  e.preventDefault();

  const userId = $('admin-user-id').value;
  const display_name = $('admin-user-display-name').value;
  const username = $('admin-user-username').value;
  const email = $('admin-user-email').value;
  const division = $('admin-user-division').value;
  const role = $('admin-user-role').value;
  const jabatan = $('admin-user-jabatan').value;
  const is_admin = $('admin-user-is-admin').checked;
  const errorEl = $('admin-user-error');

  errorEl.textContent = '';

  const isEdit = !!userId;

  let res;
  if (isEdit) {
    // Edit User
    res = await apiFetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: { display_name, email, division, role, jabatan, is_admin }
    });
  } else {
    // Add User
    const password = $('admin-user-password').value;
    if (password.length < 6) {
      errorEl.textContent = 'Password minimal 6 karakter';
      return;
    }
    res = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: { username, display_name, email, password, division, role, jabatan, is_admin }
    });
  }

  if (res) {
    if (res.error) {
      errorEl.textContent = res.error;
    } else {
      closeAdminUserModal();
      await loadAdminUsers();
      // If the edited user is the current logged-in user, update localStorage
      if (isEdit && userId === currentUser.id) {
        currentUser.display_name = display_name;
        currentUser.email = email;
        currentUser.division = division;
        currentUser.role = role;
        currentUser.jabatan = jabatan;
        currentUser.is_admin = is_admin;
        localStorage.setItem('chat_user', JSON.stringify(currentUser));

        // Refresh sidebar display
        const divisionLabels = {
          marketing: 'Marketing',
          sdm: 'SDM',
          keuangan: 'Keuangan',
          operasional: 'Operasional',
          it: 'IT'
        };
        const divLabel = divisionLabels[currentUser.division] || '';
        sidebarName.textContent = toTitleCase(currentUser.display_name) + (divLabel ? ` (${divLabel})` : '');

        // If revoked admin status, force reload
        if (!is_admin && role !== 'admin') {
          location.reload();
        }
      }
    }
  } else {
    errorEl.textContent = 'Gagal menyimpan data pengguna. Username atau email mungkin sudah terdaftar.';
  }
}
window.handleAdminUserSubmit = handleAdminUserSubmit;

// Open Reset Password Modal
function openAdminResetPwdModal(userId) {
  $('admin-reset-pwd-user-id').value = userId;
  $('admin-reset-pwd-password').value = '';
  $('admin-reset-pwd-error').textContent = '';
  $('modal-admin-reset-pwd-overlay').classList.remove('hidden');
}
window.openAdminResetPwdModal = openAdminResetPwdModal;

// Close Reset Password Modal
function closeAdminResetPwdModal() {
  $('modal-admin-reset-pwd-overlay').classList.add('hidden');
}
window.closeAdminResetPwdModal = closeAdminResetPwdModal;

// Submit Reset Password Form
async function handleAdminResetPwdSubmit(e) {
  e.preventDefault();

  const userId = $('admin-reset-pwd-user-id').value;
  const password = $('admin-reset-pwd-password').value;
  const errorEl = $('admin-reset-pwd-error');

  errorEl.textContent = '';

  if (password.length < 6) {
    errorEl.textContent = 'Password minimal 6 karakter';
    return;
  }

  const res = await apiFetch(`/api/admin/users/${userId}/password`, {
    method: 'PUT',
    body: { password }
  });

  if (res) {
    if (res.error) {
      errorEl.textContent = res.error;
    } else {
      closeAdminResetPwdModal();
      alert('Password pengguna berhasil diperbarui!');
    }
  } else {
    errorEl.textContent = 'Gagal memperbarui password pengguna.';
  }
}
window.handleAdminResetPwdSubmit = handleAdminResetPwdSubmit;

// Delete User
async function deleteAdminUser(userId) {
  if (userId === currentUser.id) {
    alert('Anda tidak dapat menghapus akun Anda sendiri!');
    return;
  }

  const user = adminUsersList.find(u => u.id === userId);
  const name = user ? user.display_name : 'pengguna ini';

  if (!confirm(`Apakah Anda yakin ingin menghapus akun ${name}? Seluruh data pesan dan dokumen yang dikirim oleh pengguna ini akan tetap ada, namun akun akan dihapus dari sistem.`)) {
    return;
  }

  const res = await apiFetch(`/api/admin/users/${userId}`, {
    method: 'DELETE'
  });

  if (res) {
    if (res.error) {
      alert(res.error);
    } else {
      await loadAdminUsers();
    }
  } else {
    alert('Gagal menghapus pengguna.');
  }
}
window.deleteAdminUser = deleteAdminUser;

// Toggle Stats Summary Section in Sharing Folder
function toggleStatsSection() {
  const grid = $('stats-collapsible-grid');
  const chevron = $('stats-toggle-chevron');
  if (!grid) return;

  const isCollapsed = grid.classList.toggle('collapsed');
  if (chevron) {
    chevron.textContent = isCollapsed ? '▼' : '▲';
  }

  localStorage.setItem('stats_collapsed', isCollapsed ? 'true' : 'false');
}
window.toggleStatsSection = toggleStatsSection;

/* --- Mandatory Web Push Logic --- */
let vapidPublicKey = null;

async function checkNotificationPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const permission = Notification.permission;
  const overlay = $('mandatory-push-overlay');
  if (!overlay) return;

  if (permission === 'granted') {
    overlay.classList.add('hidden');
    await registerAndSubscribePush();
  } else {
    // Show mandatory overlay if default or denied
    overlay.classList.remove('hidden');
  }
}

async function registerAndSubscribePush() {
  try {
    const swReg = await navigator.serviceWorker.register('/sw.js');
    if (!vapidPublicKey) {
      const res = await fetch('/api/notifications/vapidPublicKey', { headers: { 'Authorization': `Bearer ${token}` } });
      vapidPublicKey = await res.text();
    }

    // Convert VAPID key
    const padding = '='.repeat((4 - vapidPublicKey.length % 4) % 4);
    const base64 = (vapidPublicKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    const subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: outputArray
    });

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });
  } catch (err) {
    console.error('Failed to subscribe to push notifications', err);
  }
}

/* --- Persistent Notifications Logic --- */
async function loadNotifications() {
  const badge = $('notification-badge');
  const listContainer = $('notification-list');
  if (!badge || !listContainer) return;

  try {
    const notifs = await apiFetch('/api/notifications');
    if (!notifs) return;

    if (notifs.length > 0) {
      badge.textContent = notifs.length;
      badge.classList.remove('hidden');

      let html = '';
      notifs.forEach(notif => {
        const time = new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        html += `
          <div id="notif-item-${notif.id}" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'" onclick="markNotificationAsRead('${notif.id}')">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${esc(notif.message)}</div>
            <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>Dari: ${esc(notif.sender_name || 'Sistem')}</span>
              <span>${time}</span>
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = html;
    } else {
      badge.textContent = '0';
      badge.classList.add('hidden');
      listContainer.innerHTML = '<div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Belum ada notifikasi baru</div>';
    }
  } catch (err) {
    console.error('Failed to load notifications', err);
  }
}

async function markNotificationAsRead(id) {
  try {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Remove from UI
    const el = `notif-item-${id}`;
    if ($(el)) {
      $(el).remove();
    }

    // Decrease badge count
    const badge = $('notification-badge');
    if (badge) {
      let count = parseInt(badge.textContent) || 0;
      if (count > 1) {
        badge.textContent = count - 1;
      } else {
        badge.textContent = '0';
        badge.classList.add('hidden');
        const listContainer = $('notification-list');
        if (listContainer) {
          listContainer.innerHTML = '<div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Belum ada notifikasi baru</div>';
        }
      }
    }

    // Close dropdown & navigate
    const dropdown = $('notification-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    loadSharedDocuments();
    switchView('sharing');

  } catch (err) {
    console.error('Error marking notification read', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnAllowPush = $('btn-allow-push');
  if (btnAllowPush) {
    btnAllowPush.addEventListener('click', async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          $('mandatory-push-overlay').classList.add('hidden');
          $('push-error-msg').classList.add('hidden');
          await registerAndSubscribePush();
        } else {
          $('push-error-msg').classList.remove('hidden');
        }
      } catch (err) {
        console.error('Error requesting permission', err);
      }
    });
  }

  // Toggle dropdown on bell click
  const btnBell = $('btn-notifications');
  const dropdown = $('notification-dropdown');
  if (btnBell && dropdown) {
    btnBell.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btnBell && !btnBell.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }
});

// Call check on startup if already logged in (token exists)
if (token) {
  checkNotificationPermission();
}


