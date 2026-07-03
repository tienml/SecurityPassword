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
  adminPage: { users: 1, loginLogs: 1, sessions: 1, passwordLogs: 1 },
  adminData: { users: [], loginLogs: [], sessions: [], passwordLogs: [] },
  isLoading: false,
  loginLockTimer: null,
  loginCountdown: 0
};

const LOGIN_LOCK_KEY = 'sp_login_lock_state';
const LOGIN_FAIL_COUNT_KEY = 'sp_login_fail_count_state';
const TEMP_LOCK_SECONDS = 15;
const MAX_FAILED_ATTEMPTS = 5;

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
    if (!res.ok || responseData.success === false) {
      const err = new Error(responseData.message || `HTTP ${res.status}`);
      err.response = responseData;
      err.status = res.status;
      throw err;
    }
    return responseData;
  } catch (error) {
    const message = normalizeFetchError(error);
    const err = new Error(message);
    err.response = error.response || responseData || { success: false, message, data: null };
    err.status = error.status;
    setResponse(err.response);
    throw err;
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

const ADMIN_PAGE_SIZE = 15;

function isAdminRow(row) {
  return String(getValue(row, 'role') || '').toUpperCase() === 'ADMIN';
}

function getAllLoginLockStates() {
  return safeJson(localStorage.getItem(LOGIN_LOCK_KEY)) || {};
}

function normalizeLockKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getUserIdentifiers(row = {}) {
  return [
    getValue(row, 'id', 'userId'),
    getValue(row, 'userName', 'username', 'name'),
    getValue(row, 'email'),
    getValue(row, 'loginIdentifier')
  ].map(normalizeLockKey).filter(Boolean);
}

function getLocalLockForUser(row = {}) {
  const allLocks = getAllLoginLockStates();
  const keys = getUserIdentifiers(row);
  for (const key of keys) {
    if (allLocks[key]) return allLocks[key];
  }
  return null;
}

// Backend hiện chỉ khóa tạm 15 giây sau khi sai mật khẩu.
// Frontend không còn chức năng khóa vĩnh viễn hoặc yêu cầu ADMIN mở khóa.
function isTemporaryLockedUser(row) {
  const lockedUntil = getValue(row, 'lockedUntil', 'locked_until');
  const lockedUntilTime = lockedUntil ? new Date(lockedUntil).getTime() : 0;
  return Number.isFinite(lockedUntilTime) && lockedUntilTime > Date.now();
}

function enrichAdminUser(row) {
  return row;
}

function clearLocalLockForUser(row = {}) {
  const allLocks = getAllLoginLockStates();
  getUserIdentifiers(row).forEach((key) => delete allLocks[key]);
  localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(allLocks));
}

function getVisibleAdminRows(rows) {
  if (!Array.isArray(rows)) return [];
  if (state.adminTab !== 'users') return rows;
  return rows.filter((row) => !isAdminRow(row));
}

function renderTable(rows) {
  const adminTable = $('#adminTable');
  if (!adminTable) return;

  const visibleRows = getVisibleAdminRows(rows);

  if (!Array.isArray(visibleRows) || visibleRows.length === 0) {
    adminTable.innerHTML = '<div class="empty">Không có dữ liệu.</div>';
    return;
  }

  const hiddenKeys = ['passwordHash', 'password', 'hash'];
  const keys = Object.keys(visibleRows[0]).filter((key) => !key.startsWith('_') && !hiddenKeys.some((hidden) => key.toLowerCase().includes(hidden.toLowerCase())));
  const currentPage = state.adminPage[state.adminTab] || 1;
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / ADMIN_PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  state.adminPage[state.adminTab] = safePage;

  const start = (safePage - 1) * ADMIN_PAGE_SIZE;
  const pageRows = visibleRows.slice(start, start + ADMIN_PAGE_SIZE);

  const tableHtml = `<table><thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${pageRows.map((row) => `<tr>${keys.map((k) => `<td>${formatCell(row[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const paginationHtml = visibleRows.length > ADMIN_PAGE_SIZE
    ? `<div class="pagination">
        <button class="secondary page-btn" data-page-action="prev" ${safePage === 1 ? 'disabled' : ''}>Trang trước</button>
        <span>Trang ${safePage}/${totalPages} · Hiển thị ${start + 1}-${Math.min(start + ADMIN_PAGE_SIZE, visibleRows.length)} / ${visibleRows.length}</span>
        <button class="secondary page-btn" data-page-action="next" ${safePage === totalPages ? 'disabled' : ''}>Trang sau</button>
      </div>`
    : `<div class="pagination single"><span>Hiển thị ${visibleRows.length} thông tin</span></div>`;

  adminTable.innerHTML = tableHtml + paginationHtml;
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
    state.adminData[state.adminTab] = Array.isArray(res.data) ? res.data : [];
    renderTable(state.adminData[state.adminTab]);
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
    state.adminPage[state.adminTab] = 1;
    loadAdminData();
  }));


  $('#loginForm')?.addEventListener('submit', handleLogin);
  $('#loginForm input[name="loginIdentifier"]')?.addEventListener('input', (e) => {
    if (state.loginLockTimer) clearInterval(state.loginLockTimer);
    state.loginLockTimer = null;
    const submitBtn = getLoginSubmitButton();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng nhập';
    }
    setLoginMessage('');
    restoreLoginCountdownIfNeeded(e.target.value);
  });
  $('#registerForm')?.addEventListener('submit', handleRegister);
  $('#forgotForm')?.addEventListener('submit', handleForgot);
  $('#resetForm')?.addEventListener('submit', handleReset);
  $('#changePasswordForm')?.addEventListener('submit', handleChangePassword);
  $('#loadProfile')?.addEventListener('click', loadProfile);
  $('#refreshAdmin')?.addEventListener('click', loadAdminData);
  $('#logoutBtn')?.addEventListener('click', logout);
  $('#clearResponse')?.addEventListener('click', () => setResponse('Chưa có dữ liệu.'));
  $('#adminTable')?.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('.page-btn');
    if (pageBtn) {
      const total = state.adminData[state.adminTab]?.length || 0;
      const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
      const action = pageBtn.dataset.pageAction;
      if (action === 'prev') state.adminPage[state.adminTab] = Math.max(1, (state.adminPage[state.adminTab] || 1) - 1);
      if (action === 'next') state.adminPage[state.adminTab] = Math.min(totalPages, (state.adminPage[state.adminTab] || 1) + 1);
      renderTable(state.adminData[state.adminTab] || []);
    }
  });
}




function getAllLoginLocks() {
  return safeJson(localStorage.getItem(LOGIN_LOCK_KEY)) || {};
}

function getLoginLockState(identifier = '') {
  const all = getAllLoginLocks();
  return all[normalizeLockKey(identifier)] || null;
}

function saveLoginLockState(identifier, value) {
  const key = normalizeLockKey(identifier);
  if (!key) return;
  const all = getAllLoginLocks();
  all[key] = value;
  localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(all));
}

function clearLoginLockState(identifier) {
  const key = normalizeLockKey(identifier);
  if (!key) return;
  const all = getAllLoginLocks();
  delete all[key];
  localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(all));
}

function getAllLoginFailCounts() {
  return safeJson(localStorage.getItem(LOGIN_FAIL_COUNT_KEY)) || {};
}

function getLoginFailCount(identifier = '') {
  const key = normalizeLockKey(identifier);
  if (!key) return 0;
  const all = getAllLoginFailCounts();
  return Number(all[key] || 0);
}

function saveLoginFailCount(identifier, count) {
  const key = normalizeLockKey(identifier);
  if (!key) return;
  const all = getAllLoginFailCounts();
  all[key] = Math.max(0, Number(count) || 0);
  localStorage.setItem(LOGIN_FAIL_COUNT_KEY, JSON.stringify(all));
}

function clearLoginFailCount(identifier) {
  const key = normalizeLockKey(identifier);
  if (!key) return;
  const all = getAllLoginFailCounts();
  delete all[key];
  localStorage.setItem(LOGIN_FAIL_COUNT_KEY, JSON.stringify(all));
}

function setLoginMessage(message = '', isError = false) {
  const box = $('#loginMessage');
  if (!box) return;
  box.textContent = message;
  box.className = `inline-message ${isError ? 'error' : ''} ${message ? '' : 'hidden'}`;
}

function getLoginSubmitButton() {
  return $('#loginForm button[type="submit"]');
}

function extractSecondsFromMessage(message = '') {
  const text = String(message || '').toLowerCase();
  const match = text.match(/(\d+)\s*(giây|giay|s|sec|second)/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function extractLockUntilMs(response = {}) {
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  const rawLockedUntil = getValue(response, 'lockedUntil', 'locked_until') || getValue(data, 'lockedUntil', 'locked_until');
  const rawSeconds = getValue(response, 'retryAfterSeconds', 'remainingSeconds', 'lockSeconds', 'lockedSeconds', 'retryAfter')
    ?? getValue(data, 'retryAfterSeconds', 'remainingSeconds', 'lockSeconds', 'lockedSeconds', 'retryAfter');

  if (rawLockedUntil) {
    const time = new Date(rawLockedUntil).getTime();
    if (Number.isFinite(time) && time > Date.now()) return time;
  }

  const seconds = Number(rawSeconds) || extractSecondsFromMessage(response.message);
  if (Number.isFinite(seconds) && seconds > 0) return Date.now() + seconds * 1000;

  return null;
}

function startLoginCountdownUntil(lockedUntilMs, identifier = '', messagePrefix = 'Bạn đã nhập sai 5 lần. Tài khoản bị khóa tạm 15 giây') {
  clearInterval(state.loginLockTimer);
  const submitBtn = getLoginSubmitButton();

  const tick = () => {
    const remaining = Math.ceil((Number(lockedUntilMs) - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(state.loginLockTimer);
      state.loginLockTimer = null;
      state.loginCountdown = 0;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập';
      }
      clearLoginLockState(identifier);
      clearLoginFailCount(identifier);
      setLoginMessage('Đã hết 15 giây khóa tạm. Bạn có thể bấm Đăng nhập lại. Nếu sai tiếp 5 lần, tài khoản sẽ tiếp tục bị khóa 15 giây.', false);
      return;
    }

    state.loginCountdown = remaining;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = `Đợi ${remaining}s`;
    }
    setLoginMessage(`${messagePrefix}. Còn ${remaining}s.`, true);
  };

  tick();
  state.loginLockTimer = setInterval(tick, 1000);
}

function restoreLoginCountdownIfNeeded(identifier = '') {
  const lock = getLoginLockState(identifier);
  if (!lock || !lock.lockedUntil) return false;

  const lockedUntilMs = Number(lock.lockedUntil);
  if (Number.isFinite(lockedUntilMs) && lockedUntilMs > Date.now()) {
    startLoginCountdownUntil(lockedUntilMs, identifier, lock.message || 'Tài khoản đang bị khóa tạm');
    return true;
  }

  clearLoginLockState(identifier);
  return false;
}

function handleLoginFailure(error, identifier) {
  const response = error.response || {};
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  const failedAttemptsFromApi = getValue(response, 'failedAttempts', 'failed_attempts') ?? getValue(data, 'failedAttempts', 'failed_attempts');
  const remainingAttemptsFromApi = getValue(response, 'remainingAttempts', 'remaining_attempts') ?? getValue(data, 'remainingAttempts', 'remaining_attempts');
  const lockedUntilMs = extractLockUntilMs(response);

  if (lockedUntilMs) {
    const lockMessage = response.message || error.message || 'Bạn đã nhập sai 5 lần. Tài khoản bị khóa tạm 15 giây';
    saveLoginLockState(identifier, { lockedUntil: lockedUntilMs, message: lockMessage });
    saveLoginFailCount(identifier, MAX_FAILED_ATTEMPTS);
    startLoginCountdownUntil(lockedUntilMs, identifier, lockMessage);
    return;
  }

  // Trường hợp backend chỉ trả status 423/429 hoặc chỉ trả message khóa 15 giây nhưng chưa trả lockedUntil.
  const errorText = `${response.message || ''} ${error.message || ''}`.toLowerCase();
  const looksLikeTemporaryLock = error.status === 423 || error.status === 429 ||
    ((errorText.includes('khóa') || errorText.includes('khoa') || errorText.includes('lock')) &&
    (errorText.includes('15') || errorText.includes('giây') || errorText.includes('giay') || errorText.includes('thử lại') || errorText.includes('thu lai')));

  if (looksLikeTemporaryLock) {
    const fallbackSeconds = extractSecondsFromMessage(errorText) || TEMP_LOCK_SECONDS;
    const fallbackUntil = Date.now() + fallbackSeconds * 1000;
    const lockMessage = response.message || error.message || `Bạn đã nhập sai 5 lần. Tài khoản bị khóa tạm ${fallbackSeconds} giây`;
    saveLoginLockState(identifier, { lockedUntil: fallbackUntil, message: lockMessage });
    saveLoginFailCount(identifier, MAX_FAILED_ATTEMPTS);
    startLoginCountdownUntil(fallbackUntil, identifier, lockMessage);
    return;
  }

  const apiFailed = Number(failedAttemptsFromApi);
  const localFailed = Number.isFinite(apiFailed) && apiFailed > 0
    ? apiFailed
    : getLoginFailCount(identifier) + 1;

  // Backend khóa sau mỗi 5 lần sai. Nếu backend chưa trả lockedUntil ở lần thứ 5, frontend vẫn khóa nút 15s để đúng giao diện yêu cầu.
  if (localFailed >= MAX_FAILED_ATTEMPTS) {
    const fallbackUntil = Date.now() + TEMP_LOCK_SECONDS * 1000;
    const lockMessage = `Bạn đã nhập sai ${MAX_FAILED_ATTEMPTS} lần. Tài khoản bị khóa tạm ${TEMP_LOCK_SECONDS} giây`;
    saveLoginFailCount(identifier, MAX_FAILED_ATTEMPTS);
    saveLoginLockState(identifier, { lockedUntil: fallbackUntil, message: lockMessage });
    startLoginCountdownUntil(fallbackUntil, identifier, lockMessage);
    return;
  }

  saveLoginFailCount(identifier, localFailed);
  const remaining = Number.isFinite(Number(remainingAttemptsFromApi))
    ? Number(remainingAttemptsFromApi)
    : Math.max(0, MAX_FAILED_ATTEMPTS - localFailed);

  setLoginMessage(`Sai tài khoản hoặc mật khẩu lần ${localFailed}/${MAX_FAILED_ATTEMPTS}. Còn ${remaining} lần thử, sai đủ ${MAX_FAILED_ATTEMPTS} lần sẽ khóa tạm ${TEMP_LOCK_SECONDS} giây.`, true);
}


async function handleLogin(e) {
  e.preventDefault();
  const body = getFormData(e.target);
  const identifier = body.loginIdentifier || body.email || body.userName || '';

  // Nếu đang trong 15 giây khóa tạm, frontend chỉ đếm ngược và KHÔNG gọi API.
  if (state.loginLockTimer || restoreLoginCountdownIfNeeded(identifier)) return;

  try {
    setLoginMessage('');
    const submitBtn = getLoginSubmitButton();
    if (submitBtn) submitBtn.textContent = 'Đăng nhập';
    const res = await apiRequest('login', { method: 'POST', body, auth: false });
    clearLoginLockState(identifier);
    clearLoginFailCount(identifier);
    saveSession(res);
    showToast(res.message || 'Đăng nhập thành công');
    openPage('profilePage');
  } catch (error) {
    showToast(error.message, true);
    handleLoginFailure(error, identifier);
  }
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
