/* 对话与上传相关的 HTTP 调用统一收口
 * - sendMessage: 触发对话接口（演示阶段打到 mock URL，能在 Network 看到请求）
 * - uploadAttachments: 真实上传开关，演示模式下直接 resolve，不打 URL
 * 切到真后端只需：
 *   1) 把 FAKE_API_URL 换成真实对话接口 URL
 *   2) 把 ENABLE_REAL_UPLOAD 设为 true，确认 UPLOAD_API_URL 指向你的上传接口
 */

export const FAKE_API_URL = 'https://jsonplaceholder.typicode.com/posts';
export const UPLOAD_API_URL = '/api/upload';
export const ENABLE_REAL_UPLOAD = false;

const REQUEST_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS  = 60000;

/* fetch + AbortController 实现超时（替代 $.ajax 的 timeout） */
function fetchWithTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

/**
 * 触发一次对话请求
 * @param {{sessionId:string, message:string, model:string, attachments?:Array<{name:string,size:number,type:string}>}} payload
 */
export function sendMessage(payload) {
  return fetchWithTimeout(
    FAKE_API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: Date.now()
      })
    },
    REQUEST_TIMEOUT_MS
  );
}

/**
 * 上传附件
 * 演示模式：不真正打到 UPLOAD_API_URL，直接返回 { skipped: true }
 * 真后端：multipart/form-data 上传所有 File
 * @param {Array<{file:File, name:string}>} attachments
 * @param {string} sessionId
 */
export function uploadAttachments(attachments, sessionId) {
  if (!attachments || attachments.length === 0) {
    return Promise.resolve({ skipped: true, reason: 'empty' });
  }
  if (!ENABLE_REAL_UPLOAD) {
    return Promise.resolve({ skipped: true, reason: 'demo' });
  }
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  attachments.forEach((a) => {
    if (a.file) formData.append('files', a.file, a.name);
  });
  return fetchWithTimeout(
    UPLOAD_API_URL,
    { method: 'POST', body: formData },
    UPLOAD_TIMEOUT_MS
  ).then((res) => {
    if (!res.ok) throw new Error('upload failed: ' + res.status);
    return res.json().catch(() => ({}));
  });
}
