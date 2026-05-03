import { reactive, computed } from 'vue';
import {
  login as apiLogin,
  register as apiRegister,
  me as apiMe,
  logoutApi
} from '../api/auth.js';
import { DEBUG } from '../api/config.js';
import { useFinance } from './useFinance.js';
import { useSessions } from './useSessions.js';

/* 登录态管理（单例 reactive，整个子应用共享）
 *
 * 持久化方案：
 *   - HttpOnly cookie 由后端下发（max-age 7 天），关闭浏览器再开仍然有效
 *   - 前端额外把 user 写到 localStorage，让"打开 app → 第一帧"就能渲染头像 / 名字，
 *     避免等待 /me 返回那 100ms 的灰屏；服务端校验完后会再覆盖一次
 *
 * 启动流程（main.js → AppShell.vue 的 onMounted）：
 *   1) 同步：从 localStorage 读取上次的 user（瞬时 UI）
 *   2) 异步：DEBUG=false 时调一次 GET /api/auth/me
 *      - 成功 → 用最新 user / finance / sessions 覆盖 localStorage 与内存 state
 *      - 失败（cookie 过期 / 服务端拒绝）→ 视为已登出，清掉本地痕迹
 *
 * 注意：DEBUG 模式下 /me 永远返回未登录，所以 mock 阶段只能依赖手动登录后的状态，
 * 关闭浏览器再开就要重新登录（mock 没有真后端可校验，不在那边维持是合理的）。
 */

const STORAGE_USER_KEY = 'sky_auth_user';
const STORAGE_TOKEN_KEY = 'sky_auth_token_ref'; // 仅作"是否登录过"的标记，token 真值在 cookie

const fin = useFinance();
const sess = useSessions();

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
  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, '1');
  } catch (e) { /* ignore */ }
}
function clearStoredUser() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  } catch (e) { /* ignore */ }
}

const initialUser = readStoredUser();

const state = reactive({
  /* user 为 null 表示未登录；token 字段已废弃（cookie 由后端管理） */
  user: initialUser,
  /* 启动期 /me 校验是否完成；未完成时不应在 UI 上把"未登录"误判为最终态 */
  bootstrapped: false
});

const isLoggedIn = computed(() => Boolean(state.user));

const initial = computed(() => {
  if (!state.user) return 'G';
  const u = state.user.username || '';
  return u ? u.slice(0, 1).toUpperCase() : 'U';
});

const displayName = computed(() => {
  if (!state.user) return '游客';
  return state.user.username || ('用户' + (state.user.phone || '').slice(-4));
});

/* 把后端响应里的 user / finance / sessions 全部应用到内存 + localStorage */
function applyAuthSuccess(payload) {
  if (payload.user) {
    state.user = payload.user;
    writeStoredUser(payload.user);
  }
  if (payload.finance) fin.setFromServer(payload.finance);
  if (Array.isArray(payload.sessions)) sess.ingestFromServer(payload.sessions);
}

async function loginAction(payload) {
  const res = await apiLogin(payload);
  if (res && res.ok && res.user) {
    applyAuthSuccess(res);
    state.bootstrapped = true;
    return { ok: true };
  }
  return { ok: false, message: (res && res.message) || '登录失败' };
}

async function registerAction(payload) {
  const res = await apiRegister(payload);
  if (res && res.ok && res.user) {
    applyAuthSuccess(res);
    state.bootstrapped = true;
    return { ok: true };
  }
  return { ok: false, message: (res && res.message) || '注册失败' };
}

/* 应用启动时调用一次：用 cookie 拉一遍 /me，恢复登录态 / finance / sessions */
async function bootstrap() {
  if (state.bootstrapped) return;
  await _syncFromServer({ allowClearOnFail: true });
  state.bootstrapped = true;
}

/* 主动重新同步（给 StatsView 等页面用）；只在已登录时刷新，未登录直接 no-op。
 * 失败时不清除登录态，只是不刷新（避免短暂网络抖动把用户踢下线）。 */
async function refresh() {
  if (!state.user) return;
  await _syncFromServer({ allowClearOnFail: false });
}

async function _syncFromServer({ allowClearOnFail }) {
  if (DEBUG) {
    // mock 模式没有真后端，只能依赖 localStorage 的痕迹。bootstrap 时不动 user。
    return;
  }
  const res = await apiMe();
  if (res && res.ok && res.user) {
    applyAuthSuccess(res);
    return;
  }
  if (allowClearOnFail) {
    state.user = null;
    clearStoredUser();
    fin.reset();
    sess.clearAll();
  }
}

async function logout() {
  // 先尝试通知后端，再清前端；网络失败也照样清
  try { await logoutApi(); } catch (e) { /* ignore */ }
  state.user = null;
  clearStoredUser();
  fin.reset();
  sess.clearAll();
}

export function useAuth() {
  return {
    state,
    isLoggedIn,
    initial,
    displayName,
    loginAction,
    registerAction,
    bootstrap,
    refresh,
    logout
  };
}
