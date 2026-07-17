/* 全局 API 配置（前端唯一总开关）
 *
 * DEBUG = true  → MOCK 模式：所有接口在本文件外的实现里走 mock 分支
 *                  · 不依赖后端，离线可用
 *                  · 仍然会"假装"发一条 fire-and-forget 请求，便于在 Network 面板观察
 * DEBUG = false → 正式模式：所有接口打到 API_BASE 指向的真后端
 *                  · 开发期：通过 vite.config.js 的 server.proxy 把 /api 反向代理到
 *                    http://localhost:8000，规避 CORS、cookie 一律 same-origin
 *                  · 上线后：API_BASE 仍是相对路径 '/api'，由 nginx 将
 *                    /api → 后端服务，前端无需改动
 *
 * 切换方式：直接改下面的 DEBUG 常量即可（不要靠 import.meta.env，避免误把 dev 一并切到 mock）
 */
export const DEBUG = false;

/* 真后端入口；保持相对路径，让本机开发 / 反向代理上线两种部署都不用改 */
export const API_BASE = '/api';

/* 通用 fetch 超时（ms） */
export const REQUEST_TIMEOUT_MS = 15000;

/* 中国大陆手机号：1 开头 + 第二位 3-9 + 9 位数字。auth 端点 + UI 共用 */
export const CN_PHONE_RE = /^1[3-9]\d{9}$/;
/* 邮箱：温和版本，覆盖常见情况；与后端 schemas.EMAIL_RE 等价 */
export const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

/* 把"用户在登录框里随便输的一串字符"分类成 phone / email / unknown，
 * 让上层在 mock 分支 + UI 校验里只写一处分支逻辑。
 * 返回：{ kind: 'phone' | 'email' | 'unknown', value: string } */
export function classifyIdentifier(raw) {
  const v = (raw || '').trim();
  if (!v) return { kind: 'unknown', value: '' };
  if (EMAIL_RE.test(v)) return { kind: 'email', value: v.toLowerCase() };
  if (CN_PHONE_RE.test(v)) return { kind: 'phone', value: v };
  return { kind: 'unknown', value: v };
}

/* fetch + AbortController 实现超时（替代 $.ajax 的 timeout） */
export function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

/* 与 useI18n / 官网共用 localStorage key；给后端带上语言偏好。
 * 后端优先读 X-Lang，其次 Accept-Language；缺省按中文。 */
const LANG_STORAGE_KEY = 'skylang-lang';

export function currentUiLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (e) { /* private mode */ }
  return 'zh';
}

function langHeaders() {
  const lang = currentUiLang();
  return {
    'X-Lang': lang,
    'Accept-Language': lang === 'en' ? 'en' : 'zh-CN'
  };
}

/* 真后端 JSON POST 的统一封装：自动带 cookie、自动 JSON 头、自动解析为 JSON。
 *
 * 出错时返回 { ok:false, code:9000, message } 形式，调用方就只需关心业务字段。
 * （网络异常 / HTTP !2xx / JSON 解析失败 都归一化到这里） */
export async function apiPostJson(path, body, timeoutMs = REQUEST_TIMEOUT_MS) {
  try {
    const r = await fetchWithTimeout(
      API_BASE + path,
      {
        method: 'POST',
        credentials: 'include',  // 必带 cookie，否则后端拿不到 session_token
        headers: {
          'Content-Type': 'application/json',
          ...langHeaders()
        },
        body: JSON.stringify(body || {})
      },
      timeoutMs
    );
    return await r.json().catch(() => ({
      ok: false, code: 9001, message: 'HTTP ' + r.status + '（响应非 JSON）'
    }));
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return { ok: false, code: 9002, message: '请求超时' };
    }
    return { ok: false, code: 9000, message: '网络异常：' + (e && e.message || e) };
  }
}

export async function apiGetJson(path, timeoutMs = REQUEST_TIMEOUT_MS) {
  try {
    const r = await fetchWithTimeout(
      API_BASE + path,
      {
        method: 'GET',
        credentials: 'include',
        headers: { ...langHeaders() }
      },
      timeoutMs
    );
    return await r.json().catch(() => ({
      ok: false, code: 9001, message: 'HTTP ' + r.status + '（响应非 JSON）'
    }));
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return { ok: false, code: 9002, message: '请求超时' };
    }
    return { ok: false, code: 9000, message: '网络异常：' + (e && e.message || e) };
  }
}

/* DELETE 同 POST 共用一份归一化逻辑，主要给删除 / 取消订阅类操作用 */
export async function apiDeleteJson(path, timeoutMs = REQUEST_TIMEOUT_MS) {
  try {
    const r = await fetchWithTimeout(
      API_BASE + path,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...langHeaders() }
      },
      timeoutMs
    );
    return await r.json().catch(() => ({
      ok: false, code: 9001, message: 'HTTP ' + r.status + '（响应非 JSON）'
    }));
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return { ok: false, code: 9002, message: '请求超时' };
    }
    return { ok: false, code: 9000, message: '网络异常：' + (e && e.message || e) };
  }
}
