import { reactive, computed } from 'vue';
import { login as apiLogin, register as apiRegister } from '../api/auth.js';

/* 登录态管理（单例 reactive，整个子应用共享）
 *
 * 持久化方案：
 *   - token 写入 cookie（HttpOnly 由后端控制；前端 demo 阶段写普通 cookie）
 *   - 用户公开信息（手机号、用户名）写入 localStorage，便于刷新后立即渲染头像 / 名字
 *   - 退出时同时清掉两份
 *
 * 安全考虑：
 *   - 前端 cookie 设置 SameSite=Lax，限制跨站携带
 *   - 不在 localStorage 里保存密码或敏感字段
 *   - 在 HTTPS 站点下增加 Secure 属性
 *   - 真实部署时建议改为后端下发 HttpOnly cookie，此处的前端写入仅为 demo 兜底
 */

const COOKIE_NAME = 'sky_auth_token';
const STORAGE_USER_KEY = 'sky_auth_user';
const COOKIE_DAYS = 7;

function setCookie(name, value, days) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  const secure = (typeof location !== 'undefined' && location.protocol === 'https:')
    ? '; Secure' : '';
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}
function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const target = encodeURIComponent(name) + '=';
  const parts = document.cookie ? document.cookie.split('; ') : [];
  for (const p of parts) {
    if (p.indexOf(target) === 0) {
      return decodeURIComponent(p.slice(target.length));
    }
  }
  return '';
}
function delCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie =
    `${encodeURIComponent(name)}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function readStoredUser() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.username) return null;
    return obj;
  } catch (e) { return null; }
}
function writeStoredUser(user) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user)); }
  catch (e) { /* ignore */ }
}
function clearStoredUser() {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_USER_KEY); } catch (e) { /* ignore */ }
}

const initialToken = getCookie(COOKIE_NAME);
const initialUser  = readStoredUser();

const state = reactive({
  /* 没登录时 token 为 ''，user 为 null */
  token: initialToken || '',
  user:  initialToken && initialUser ? initialUser : null
});

const isLoggedIn = computed(() => Boolean(state.token && state.user));

/* 头像首字母：用户名首字 / 手机号末位兜底 */
const initial = computed(() => {
  if (!state.user) return 'G';
  const u = state.user.username || '';
  return u ? u.slice(0, 1).toUpperCase() : 'U';
});

/* 显示名：登录前 "游客"，登录后取 username */
const displayName = computed(() => {
  if (!state.user) return '游客';
  return state.user.username || ('用户' + (state.user.phone || '').slice(-4));
});

function applyAuth(token, user) {
  state.token = token || '';
  state.user  = user || null;
  if (token) setCookie(COOKIE_NAME, token, COOKIE_DAYS);
  if (user)  writeStoredUser(user);
}

async function loginAction(payload) {
  const res = await apiLogin(payload);
  if (res && res.ok && res.token && res.user) {
    applyAuth(res.token, res.user);
    return { ok: true };
  }
  return { ok: false, message: (res && res.message) || '登录失败' };
}

async function registerAction(payload) {
  const res = await apiRegister(payload);
  if (res && res.ok && res.token && res.user) {
    applyAuth(res.token, res.user);
    return { ok: true };
  }
  return { ok: false, message: (res && res.message) || '注册失败' };
}

function logout() {
  state.token = '';
  state.user  = null;
  delCookie(COOKIE_NAME);
  clearStoredUser();
}

export function useAuth() {
  return {
    state,
    isLoggedIn,
    initial,
    displayName,
    loginAction,
    registerAction,
    logout
  };
}
