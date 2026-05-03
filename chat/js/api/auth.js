/* 登录 / 注册 / 验证码 / 会话维持 接口
 *
 * 双分支：
 *   DEBUG = true  → 走 mock，本地构造响应（保留旧的离线演示能力）
 *   DEBUG = false → 真实打到 ${API_BASE}/auth/...
 *
 * 真后端响应统一形如：
 *   { ok, code, message?, token?, user?, finance?, sessions? }
 * 其中 finance / sessions 仅在登录态相关接口（register / login / me）里附带。
 */
import {
  DEBUG,
  CN_PHONE_RE,
  REQUEST_TIMEOUT_MS,
  API_BASE,
  fetchWithTimeout,
  apiPostJson,
  apiGetJson
} from './config.js';

export { CN_PHONE_RE };

/* ============== mock 工具 ============== */
function fakeOk(payload)   { return Promise.resolve({ ok: true,  code: 0, ...payload }); }
function fakeFail(message) { return Promise.resolve({ ok: false, code: 1, message }); }

/* DEBUG 模式下的 fire-and-forget：仅为了在 Network 面板里能看到一条"请求"，
 * 响应永远以 mock 为准。线上不会执行（被 if (DEBUG) 包裹的分支才会触发）。 */
function fireAndForget(path, body) {
  try {
    fetchWithTimeout(
      'https://fake-api.skylangai.local' + path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      },
      REQUEST_TIMEOUT_MS
    ).catch(() => { /* demo 模式忽略网络错误 */ });
  } catch (e) { /* ignore */ }
}

/* ============== 登录 ============== */
export function login(payload) {
  if (DEBUG) {
    fireAndForget('/auth/login', payload);
    if (!CN_PHONE_RE.test(payload.phone || '')) return fakeFail('手机号格式不正确');
    if (!payload.password)                       return fakeFail('请输入密码');
    return fakeOk({
      token: 'demo-token-' + Date.now(),
      user: {
        id: 1,
        phone: payload.phone,
        username: '用户' + payload.phone.slice(-4)
      },
      finance: _fakeFinance(),
      sessions: []
    });
  }
  return apiPostJson('/auth/login', payload);
}

/* ============== 注册 ============== */
export function register(payload) {
  if (DEBUG) {
    fireAndForget('/auth/register', payload);
    if (!CN_PHONE_RE.test(payload.phone || ''))   return fakeFail('手机号格式不正确');
    if (!payload.code || payload.code.length < 4) return fakeFail('请输入验证码');
    if (!payload.username)                         return fakeFail('请输入用户名');
    if (!payload.password || payload.password.length < 6) {
      return fakeFail('密码至少 6 位');
    }
    return fakeOk({
      token: 'demo-token-' + Date.now(),
      user: { id: 1, phone: payload.phone, username: payload.username },
      finance: _fakeFinance(),
      sessions: []
    });
  }
  return apiPostJson('/auth/register', payload);
}

/* ============== 发送验证码 ============== */
export function sendCode(payload) {
  if (DEBUG) {
    fireAndForget('/auth/send-code', payload);
    if (!CN_PHONE_RE.test(payload.phone || '')) return fakeFail('手机号格式不正确');
    return fakeOk({ message: '验证码已发送（演示：任意 4 位数字均可通过）' });
  }
  return apiPostJson('/auth/send-code', payload);
}

/* ============== 拉当前登录态（页面刷新 / 关闭浏览器重开后用） ============== */
export function me() {
  if (DEBUG) {
    // DEBUG 下不做服务端校验：只看 localStorage 的 user 是否存在。
    // 由 useAuth 决定如何 hydrate；这里始终返回未登录，避免它误以为 mock 也持久化。
    return Promise.resolve({ ok: false, code: 1030, message: '未登录（DEBUG）' });
  }
  return apiGetJson('/auth/me');
}

/* ============== 登出 ============== */
export function logoutApi() {
  if (DEBUG) {
    return fakeOk({ message: '已退出（DEBUG）' });
  }
  return apiPostJson('/auth/logout', {});
}

/* ============== mock 兜底：finance 默认值 ============== */
function _fakeFinance() {
  return {
    token_total: 50,
    token_used: 0,
    balance: 50,
    request_count: 0,
    input_tokens: 0,
    output_tokens: 0
  };
}
