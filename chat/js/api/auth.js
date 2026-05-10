/* 登录 / 注册 / 验证码 / 会话维持 接口
 *
 * 双分支：
 *   DEBUG = true  → 走 mock，本地构造响应（保留旧的离线演示能力）
 *   DEBUG = false → 真实打到 ${API_BASE}/auth/...
 *
 * 真后端响应统一形如：
 *   { ok, code, message?, token?, user?, finance?, sessions? }
 * 其中 finance / sessions 仅在登录态相关接口（register / login / me）里附带。
 *
 * 双渠道：所有"身份"字段都是 phone OR email 二选一；
 * 调用方传入哪个就发哪个，约定后端二选一恰有其一。
 */
import {
  DEBUG,
  CN_PHONE_RE,
  EMAIL_RE,
  REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
  apiPostJson,
  apiGetJson,
  classifyIdentifier
} from './config.js';

export { CN_PHONE_RE, EMAIL_RE, classifyIdentifier };

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

/* 从 payload 里提取 phone / email：
 *   - 都没传 / 都传了 → null
 *   - 只传 phone 或只传 email → { kind, value }
 * mock 分支用它做格式校验 + 拼 user 对象 */
function extractIdentity(payload) {
  const hasPhone = !!(payload && payload.phone);
  const hasEmail = !!(payload && payload.email);
  if (hasPhone === hasEmail) return null; // 0 个或 2 个都返回 null
  return hasEmail
    ? { kind: 'email', value: String(payload.email).trim().toLowerCase() }
    : { kind: 'phone', value: String(payload.phone).trim() };
}

function mockUserFromIdentity(id, username) {
  return {
    id: 1,
    phone: id.kind === 'phone' ? id.value : null,
    email: id.kind === 'email' ? id.value : null,
    username
  };
}

/* ============== 登录 ============== */
export function login(payload) {
  if (DEBUG) {
    fireAndForget('/auth/login', payload);
    const id = extractIdentity(payload);
    if (!id)                        return fakeFail('请输入手机号或邮箱中的一个');
    if (id.kind === 'phone' && !CN_PHONE_RE.test(id.value)) return fakeFail('手机号格式不正确');
    if (id.kind === 'email' && !EMAIL_RE.test(id.value))    return fakeFail('邮箱格式不正确');
    if (!payload.password)          return fakeFail('请输入密码');
    const username = '用户' + id.value.slice(-4);
    return fakeOk({
      token: 'demo-token-' + Date.now(),
      user: mockUserFromIdentity(id, username),
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
    const id = extractIdentity(payload);
    if (!id)                                       return fakeFail('请输入手机号或邮箱中的一个');
    if (id.kind === 'phone' && !CN_PHONE_RE.test(id.value)) return fakeFail('手机号格式不正确');
    if (id.kind === 'email' && !EMAIL_RE.test(id.value))    return fakeFail('邮箱格式不正确');
    if (!payload.code || payload.code.length < 4)  return fakeFail('请输入验证码');
    if (!payload.username)                          return fakeFail('请输入用户名');
    if (!payload.password || payload.password.length < 6) {
      return fakeFail('密码至少 6 位');
    }
    return fakeOk({
      token: 'demo-token-' + Date.now(),
      user: mockUserFromIdentity(id, payload.username),
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
    const id = extractIdentity(payload);
    if (!id) return fakeFail('请输入手机号或邮箱中的一个');
    if (id.kind === 'phone' && !CN_PHONE_RE.test(id.value)) return fakeFail('手机号格式不正确');
    if (id.kind === 'email' && !EMAIL_RE.test(id.value))    return fakeFail('邮箱格式不正确');
    const channel = id.kind === 'email' ? '邮箱' : '手机';
    return fakeOk({ message: `验证码已发送至${channel}（演示：任意 4 位数字均可通过）` });
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
    money_total: 50,
    money_used: 0,
    balance: 50,
    request_count: 0,
    input_tokens: 0,
    output_tokens: 0
  };
}
