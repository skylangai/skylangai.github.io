/* 登录 / 注册 / 验证码 相关的 HTTP 调用统一收口
 *
 * 演示阶段：所有请求都打到 FAKE_AUTH_BASE。该地址只是用来在 Network 面板看到请求，
 * 真实切到后端时只需要替换 FAKE_AUTH_BASE 即可（也可改成相对路径走同源代理）。
 *
 * 演示模式（DEMO_MODE = true）：
 *   - 实际仍会发出 POST，便于联调演示
 *   - 但响应结果由本文件内部 mock 生成，不依赖远端真实数据
 *   - 切到真后端时把 DEMO_MODE 设为 false 即可
 */

export const FAKE_AUTH_BASE = 'https://fake-api.skylangai.local/auth';
export const DEMO_MODE = true;

const REQUEST_TIMEOUT_MS = 15000;
/* 中国大陆手机号：1 开头 + 第二位 3-9 + 9 位数字 */
export const CN_PHONE_RE = /^1[3-9]\d{9}$/;

function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

/* 演示模式下统一构造一个像真后端的响应对象 */
function fakeOk(payload) {
  return Promise.resolve({ ok: true, code: 0, ...payload });
}
function fakeFail(message) {
  return Promise.resolve({ ok: false, code: 1, message });
}

/* 仅做演示：实际请求只是为了在 Network 看见，结果以 mock 为准 */
function fireAndForget(path, body) {
  try {
    fetchWithTimeout(
      FAKE_AUTH_BASE + path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      },
      REQUEST_TIMEOUT_MS
    ).catch(() => { /* demo 模式忽略网络错误 */ });
  } catch (e) { /* ignore */ }
}

/**
 * 登录
 * @param {{phone:string, password:string}} payload
 * @returns {Promise<{ok:boolean, code:number, message?:string, token?:string, user?:{phone:string, username:string}}>}
 */
export function login(payload) {
  fireAndForget('/login', payload);
  if (DEMO_MODE) {
    if (!CN_PHONE_RE.test(payload.phone || '')) {
      return fakeFail('手机号格式不正确');
    }
    if (!payload.password) {
      return fakeFail('请输入密码');
    }
    return fakeOk({
      token: 'demo-token-' + Date.now(),
      user: {
        phone: payload.phone,
        username: '用户' + payload.phone.slice(-4)
      }
    });
  }
  return fetchWithTimeout(
    FAKE_AUTH_BASE + '/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    REQUEST_TIMEOUT_MS
  ).then((res) => res.json());
}

/**
 * 注册
 * @param {{phone:string, code:string, username:string, password:string}} payload
 */
export function register(payload) {
  fireAndForget('/register', payload);
  if (DEMO_MODE) {
    if (!CN_PHONE_RE.test(payload.phone || '')) return fakeFail('手机号格式不正确');
    if (!payload.code || payload.code.length < 4) return fakeFail('请输入验证码');
    if (!payload.username) return fakeFail('请输入用户名');
    if (!payload.password || payload.password.length < 6) {
      return fakeFail('密码至少 6 位');
    }
    return fakeOk({
      token: 'demo-token-' + Date.now(),
      user: { phone: payload.phone, username: payload.username }
    });
  }
  return fetchWithTimeout(
    FAKE_AUTH_BASE + '/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    REQUEST_TIMEOUT_MS
  ).then((res) => res.json());
}

/**
 * 发送短信验证码
 * @param {{phone:string}} payload
 */
export function sendCode(payload) {
  fireAndForget('/send-code', payload);
  if (DEMO_MODE) {
    if (!CN_PHONE_RE.test(payload.phone || '')) {
      return fakeFail('手机号格式不正确');
    }
    return fakeOk({ message: '验证码已发送（演示：任意 4 位数字均可通过）' });
  }
  return fetchWithTimeout(
    FAKE_AUTH_BASE + '/send-code',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    REQUEST_TIMEOUT_MS
  ).then((res) => res.json());
}
