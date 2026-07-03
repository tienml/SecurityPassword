const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const DEFAULT_BASE_URL = 'https://grandpa-discharge-isolated.ngrok-free.dev';
const STORAGE_KEYS = { baseUrl: 'sp_base_url', token: 'sp_token', user: 'sp_user' };

const apiList = [
  { key: 'register', method: 'POST', path: '/api/auth/register', auth: false, body: ['userName', 'email', 'password'] },
  { key: 'login', method: 'POST', path: '/api/auth/login', auth: false, body: ['loginIdentifier', 'password'] },
  { key: 'forgot', method: 'POST', path: '/api/auth/forgot-password', auth: false, body: ['email'] },
  { key: 'reset', method: 'POST', path: '/api/auth/reset-password', auth: false, body: ['email', 'otp', 'newPassword'] },
  { key: 'me', method: 'GET', path: '/api/auth/me', auth: true, body: [] },
  { key: 'changePassword', method: 'POST', path: '/api/auth/change-password', auth: true, body: ['currentPassword', 'newPassword'] },
  { key: 'users', method: 'GET', path: '/api/admin/users', auth: true, admin: true, body: [] },
  { key: 'loginLogs', method: 'GET', path: '/api/admin/login-logs', auth: true, admin: true, body: [] },
  { key: 'sessions', method: 'GET', path: '/api/admin/sessions', auth: true, admin: true, body: [] },
  { key: 'passwordLogs', method: 'GET', path: '/api/admin/password-change-logs', auth: true, admin: true, body: [] }
];

const endpoints = Object.fromEntries(apiList.map((api) => [api.key, api.path]));

const state = {
  baseUrl: (localStorage.getItem(STORAGE_KEYS.baseUrl) || localStorage.getItem('baseUrl') || DEFAULT_BASE_URL).replace(/\/$/, ''),
  token: localStorage.getItem(STORAGE_KEYS.token) || localStorage.getItem('token') || '',
  user: safeJson(localStorage.getItem(STORAGE_KEYS.user) || localStorage.getItem('user')),
  adminTab: 'users',
  isLoading: false
};

function safeJson(value) {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function setResponse(data) {
  const el = $('#apiResponse');
  if (!el) return;
  el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function setLastRequest(method, path, body) {
  const el = $('#lastRequest');
  if (!el) return;
  const bodyText = body ? ` | Body: ${JSON.stringify(body)}` : '';
  el.textContent = `${method} ${state.baseUrl}${path}${bodyText}`;
}

function showToast(message, isError = false) {
  const toast = $('#toast');
  if (!toast) {
    alert(message);
    return;
  }
  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : ''}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function setLoading(loading) {
  state.isLoading = loading;
  $$('button, input').forEach((el) => { el.disabled = loading; });
}

async function apiRequest(keyOrPath, { method = 'GET', body = null, auth = true } = {}) {
  const path = endpoints[keyOrPath] || keyOrPath;
  const payload = body && typeof body === 'object' ? cleanBody(body) : null;
  setLastRequest(method, path, payload);

  const headers = { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (payload) headers['Content-Type'] = 'application/json';
  if (auth && state.token) headers.Authorization = `Bearer ${state.token}`;

  const fetchOptions = { method, headers, mode: 'cors' };
  if (payload) fetchOptions.body = JSON.stringify(payload);

  setLoading(true);
  let responseData = null;
  try {
    const res = await fetch(state.baseUrl + path, fetchOptions);
    const text = await res.text();
    responseData = parseResponse(text, res.ok, res.status);
    setResponse(responseData);
    if (!res.ok || responseData.success === false) throw new Error(responseData.message || `HTTP ${res.status}`);
    return responseData;
  } catch (error) {
    const message = normalizeFetchError(error);
    setResponse(responseData || { success: false, message, data: null });
    throw new Error(message);
  } finally {
    setLoading(false);
  }
}

function cleanBody(data) {
  const result = {};
  Object.entries(data).forEach(([key, value]) => {
    const text = typeof value === 'string' ? value.trim() : value;
    if (text !== '') result[key] = text;
  });
  return result;
}

function parseResponse(text, ok, status) {
  try { return text ? JSON.parse(text) : { success: ok, message: `HTTP ${status}`, data: null }; }
  catch { return { success: ok, message: text || `HTTP ${status}`, data: null }; }
}

function normalizeFetchError(error) {
  if (String(error.message).includes('Failed to fetch')) {
    return 'Không gọi được API. Với Live Server hãy chạy port 3000 hoặc 5173, kiểm tra ngrok còn sống và backend đã bật CORS.';
  }
  return error.message || 'Có lỗi khi gọi API.';
}

function getFormData(form) {
  return cleanBody(Object.fromEntries(new FormData(form).entries()));
}

function getValue(obj, ...names) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(obj, name)) return obj[name];
  }
  const lowerMap = Object.fromEntries(Object.keys(obj).map((key) => [key.toLowerCase(), key]));
  for (const name of names) {
    const realKey = lowerMap[String(name).toLowerCase()];
    if (realKey) return obj[realKey];
  }
  return undefined;
}

function saveSession(loginData) {
  const data = loginData.data || {};
  state.token = data.token || data.accessToken || '';
  state.user = {
    id: getValue(data, 'userId', 'id'),
    userName: getValue(data, 'userName', 'username', 'name'),
    email: getValue(data, 'email'),
    role: getValue(data, 'role') || 'USER'
  };
  localStorage.setItem(STORAGE_KEYS.token, state.token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
  localStorage.setItem('token', state.token);
  localStorage.setItem('user', JSON.stringify(state.user));
  updateAuthUi();
}

function logout() {
  state.token = '';
  state.user = null;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateAuthUi();
  openPage('loginPage');
  setResponse('Đã xóa token ở frontend. Backend không có API logout trong danh sách bạn gửi.');
}

function updateAuthUi() {
  const isLoggedIn = Boolean(state.token);
  const role = (state.user?.role || 'GUEST').toUpperCase();
  const isAdmin = role === 'ADMIN';

  $('#authStatus').textContent = isLoggedIn ? `${state.user?.userName || 'User'} đã đăng nhập` : 'Chưa đăng nhập';
  $('#roleBadge').textContent = role;
  $('#roleBadge').classList.toggle('muted', !isLoggedIn);
  $('#logoutBtn').classList.toggle('hidden', !isLoggedIn);

  // Khi đã đăng nhập thì ẩn Đăng nhập / Đăng ký.
  $$('.guest-only').forEach((btn) => btn.classList.toggle('hidden', isLoggedIn));

  // Trang thường chỉ hiện sau khi đăng nhập.
  $$('.protected').forEach((btn) => btn.classList.toggle('hidden', !isLoggedIn));

  // ADMIN không hiện chức năng đổi mật khẩu ở thanh trái.
  $$('.user-only').forEach((btn) => btn.classList.toggle('hidden', !isLoggedIn || isAdmin));

  // Chỉ ADMIN mới hiện quản trị.
  $$('.admin-only').forEach((btn) => btn.classList.toggle('hidden', !isAdmin));

  // Khi đã đăng nhập mà đang ở trang đăng nhập/đăng ký/quên mật khẩu thì chuyển sang trang phù hợp.
  const activePageId = $('.page.active')?.id;
  if (isLoggedIn && ['loginPage', 'registerPage', 'forgotPage', 'resetPage', 'changePasswordPage'].includes(activePageId) && isAdmin) {
    openPage('adminPage');
  } else if (isLoggedIn && ['loginPage', 'registerPage', 'forgotPage', 'resetPage'].includes(activePageId)) {
    openPage('profilePage');
  }
}

function openPage(pageId) {
  const role = (state.user?.role || '').toUpperCase();
  const isLoggedIn = Boolean(state.token);

  if (isLoggedIn && ['loginPage', 'registerPage', 'forgotPage', 'resetPage'].includes(pageId)) {
    pageId = role === 'ADMIN' ? 'adminPage' : 'profilePage';
  }

  if (pageId === 'changePasswordPage' && role === 'ADMIN') {
    showToast('Tài khoản ADMIN không có chức năng đổi mật khẩu ở giao diện này.', true);
    pageId = 'adminPage';
  }

  if ((pageId === 'forgotPage' || pageId === 'resetPage') && role === 'ADMIN') {
    showToast('Tài khoản ADMIN không sử dụng chức năng quên/đặt lại mật khẩu.', true);
    return;
  }
  $$('.page').forEach((page) => page.classList.remove('active'));
  const page = $('#' + pageId);
  if (page) page.classList.add('active');
  $$('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.page === pageId));
  if (pageId === 'profilePage' && state.token) loadProfile();
  if (pageId === 'adminPage' && state.token) loadAdminData();
}

function formatDate(value) {
  if (!value) return 'Chưa có';
  const text = String(value);
  // Chỉ format chuỗi ngày giờ ISO như 2026-07-02T21:13:32.
  // Không xử lý mọi chuỗi có chữ T để tránh mất chữ đầu trong tên như "Tuan".
  const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T/.test(text);
  return isIsoDateTime ? text.replace('T', ' ').slice(0, 19) : text;
}

function renderProfile(user = {}) {
  const isActive = getValue(user, 'isActive', 'active');
  const rows = [
    ['ID', getValue(user, 'id', 'userId')],
    ['UserName', getValue(user, 'userName', 'username', 'name')],
    ['Email', getValue(user, 'email')],
    ['Role', getValue(user, 'role')],
    ['Active', isActive === true ? 'Đang hoạt động' : isActive === false ? 'Bị khóa' : 'Không rõ'],
    ['Failed Attempts', getValue(user, 'failedAttempts', 'failed_attempts')],
    ['Locked Until', getValue(user, 'lockedUntil', 'locked_until') || 'Không'],
    ['Last Login', formatDate(getValue(user, 'lastLoginAt', 'lastLogin', 'last_login_at'))],
    ['Password Changed', formatDate(getValue(user, 'passwordChangedAt', 'passwordChanged', 'password_changed_at'))],
    ['Created At', formatDate(getValue(user, 'createdAt', 'created_at'))]
  ];
  const profileView = $('#profileView');
  if (!profileView) return;
  profileView.innerHTML = rows.map(([label, value]) => `<div class="info-card"><span>${label}</span><strong>${value ?? ''}</strong></div>`).join('');
}

function renderTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const adminTable = $('#adminTable');
    if (adminTable) adminTable.innerHTML = '<div class="empty">Không có dữ liệu.</div>';
    return;
  }
  const keys = Object.keys(rows[0]);
  const adminTable = $('#adminTable');
  if (!adminTable) return;
  adminTable.innerHTML = `<table><thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${keys.map((k) => `<td>${formatCell(row[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function formatCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return formatDate(value);
}

async function loadProfile() {
  try {
    const res = await apiRequest('me');
    const userData = res.data || {};
    state.user = {
      ...state.user,
      id: getValue(userData, 'id', 'userId') ?? state.user?.id,
      userName: getValue(userData, 'userName', 'username', 'name') ?? state.user?.userName,
      email: getValue(userData, 'email') ?? state.user?.email,
      role: getValue(userData, 'role') ?? state.user?.role
    };
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
    localStorage.setItem('user', JSON.stringify(state.user));
    updateAuthUi();
    renderProfile(userData);
  } catch (error) { showToast(error.message, true); }
}

async function loadAdminData() {
  if ((state.user?.role || '').toUpperCase() !== 'ADMIN') {
    showToast('Bạn cần đăng nhập tài khoản ADMIN để xem mục này.', true);
    return;
  }
  try {
    const res = await apiRequest(state.adminTab);
    renderTable(res.data || []);
  } catch (error) { showToast(error.message, true); }
}

function bindEvents() {
  localStorage.setItem(STORAGE_KEYS.baseUrl, state.baseUrl);

  $$('.nav-item').forEach((btn) => btn.addEventListener('click', () => openPage(btn.dataset.page)));
  $$('.forgot-link').forEach((btn) => btn.addEventListener('click', () => openPage('forgotPage')));
  $$('.reset-link').forEach((btn) => btn.addEventListener('click', () => openPage('resetPage')));
  $$('.tab').forEach((btn) => btn.addEventListener('click', () => {
    $$('.tab').forEach((tab) => tab.classList.remove('active'));
    btn.classList.add('active');
    state.adminTab = btn.dataset.admin;
    loadAdminData();
  }));


  $('#loginForm')?.addEventListener('submit', handleLogin);
  $('#registerForm')?.addEventListener('submit', handleRegister);
  $('#forgotForm')?.addEventListener('submit', handleForgot);
  $('#resetForm')?.addEventListener('submit', handleReset);
  $('#changePasswordForm')?.addEventListener('submit', handleChangePassword);
  $('#loadProfile')?.addEventListener('click', loadProfile);
  $('#refreshAdmin')?.addEventListener('click', loadAdminData);
  $('#logoutBtn')?.addEventListener('click', logout);
  $('#clearResponse')?.addEventListener('click', () => setResponse('Chưa có dữ liệu.'));
}

async function handleLogin(e) {
  e.preventDefault();
  try {
    const res = await apiRequest('login', { method: 'POST', body: getFormData(e.target), auth: false });
    saveSession(res);
    showToast(res.message || 'Đăng nhập thành công');
    openPage('profilePage');
  } catch (error) { showToast(error.message, true); }
}

async function handleRegister(e) {
  e.preventDefault();
  try {
    const res = await apiRequest('register', { method: 'POST', body: getFormData(e.target), auth: false });
    showToast(res.message || 'Đăng ký thành công');
    openPage('loginPage');
  } catch (error) { showToast(error.message, true); }
}

async function handleForgot(e) {
  e.preventDefault();
  if ((state.user?.role || '').toUpperCase() === 'ADMIN') {
    showToast('Tài khoản ADMIN không được dùng quên mật khẩu.', true);
    return;
  }
  try {
    const body = getFormData(e.target);
    const res = await apiRequest('forgot', { method: 'POST', body, auth: false });
    if ($('#resetForm')?.email) $('#resetForm').email.value = body.email;
    showToast(res.message || 'Đã gửi OTP');
    openPage('resetPage');
  } catch (error) { showToast(error.message, true); }
}

async function handleReset(e) {
  e.preventDefault();
  if ((state.user?.role || '').toUpperCase() === 'ADMIN') {
    showToast('Tài khoản ADMIN không được đặt lại mật khẩu ở đây.', true);
    return;
  }
  try {
    const body = getFormData(e.target);
    const res = await apiRequest('reset', { method: 'POST', body, auth: false });
    showToast(res.message || 'Đặt lại mật khẩu thành công');
    openPage('loginPage');
  } catch (error) { showToast(error.message, true); }
}

async function handleChangePassword(e) {
  e.preventDefault();
  if (!state.token) {
    showToast('Bạn cần đăng nhập trước khi đổi mật khẩu.', true);
    openPage('loginPage');
    return;
  }
  try {
    const res = await apiRequest('changePassword', { method: 'POST', body: getFormData(e.target) });
    showToast(res.message || 'Đổi mật khẩu thành công');
    e.target.reset();
    logout();
  } catch (error) { showToast(error.message, true); }
}

bindEvents();
updateAuthUi();
