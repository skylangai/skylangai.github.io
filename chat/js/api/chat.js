/* 对话相关 HTTP/SSE 调用统一收口
 *
 * 双分支：
 *   DEBUG = true  → 老 mock 行为：fire-and-forget + 立即 resolve 一个固定回答
 *   DEBUG = false → 调真后端
 *      - 对话:        POST /api/chat/send (text/event-stream，token 流式回包)
 *      - 加载历史:    POST /api/chat/messages (一次性 JSON)
 *      - 上传附件:    POST /api/upload (multipart) —— 后端目前未实现，DEBUG/PROD 都跳过
 */
import {
  DEBUG,
  REQUEST_TIMEOUT_MS,
  fetchWithTimeout,
  apiPostJson
} from './config.js';
import { streamSSE } from './sse.js';

/* DEBUG 兜底配置 */
const FAKE_API_URL = 'https://jsonplaceholder.typicode.com/posts';
const UPLOAD_API_URL = '/api/upload';
const ENABLE_REAL_UPLOAD = false;

const UPLOAD_TIMEOUT_MS = 60000;

/**
 * 触发一次对话请求（流式）。
 *
 * @param {{sessionId, message, model?, attachments?}} payload
 * @param {object} [callbacks]
 *   - onThinking(d)  ← SSE 'thinking' 事件，{type, tool, summary}（可选，可能 0 次）
 *   - onChunk(d)     ← SSE 'chunk' 事件，{delta} —— 一个 token / 一个字
 *   - onDone(d)      ← SSE 'done' 事件，{sessionId, message, usage, balance}
 *   - onError(d)     ← SSE 'error' 事件 或 网络异常，{code, message, balance?}
 *
 * 返回 Promise，在 done/error 后 resolve；外部不关心，只看 callbacks 也行。
 *
 * DEBUG 模式：
 *   - fire-and-forget 一个 jsonplaceholder POST，仅为 Network 面板可见
 *   - 不做流式，由调用方拿 onDone 触发 finalize（content 用 mock/fixedAnswer）
 */
export function sendMessage(payload, callbacks = {}) {
  const { onThinking, onChunk, onDone, onError } = callbacks;

  if (DEBUG) {
    // 兼容老用法：保留对 jsonplaceholder 的 fire-and-forget，便于 Network 观察
    fetchWithTimeout(
      FAKE_API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, timestamp: Date.now() })
      },
      REQUEST_TIMEOUT_MS
    ).catch(() => { /* demo 忽略 */ });

    // DEBUG 模式不实际调真后端；onDone 由 AppShell 在 ANIM_MIN_MS 后自己触发，
    // 用 mock/fixedAnswer 的 FIXED_ANSWER 填充。这里返回个 resolved promise 即可。
    return Promise.resolve({ ok: true, mode: 'mock' });
  }

  // 真后端 SSE
  return streamSSE(
    '/chat/send',
    { body: JSON.stringify(payload) },
    {
      onEvent: (event, data) => {
        if (event === 'thinking') onThinking && onThinking(data);
        else if (event === 'chunk') onChunk && onChunk(data);
        else if (event === 'done')  onDone && onDone(data);
        else if (event === 'error') onError && onError(data);
      },
      onOpen: (resp) => {
        if (resp.status === 401) {
          onError && onError({ code: 1030, message: '未登录或登录已过期' });
        }
      }
    }
  ).catch((e) => {
    onError && onError({ code: 9000, message: '网络异常：' + (e && e.message || e) });
  });
}

/**
 * 加载某个 session 的完整历史消息（首次点击会话时调用）。
 *
 * @param {string} sessionId
 * @returns {Promise<{ok:boolean, code:number, message?:string,
 *                    sessionId?:string, title?:string, messageCount?:number,
 *                    updatedAt?:number,
 *                    messages?:Array<{id:number, role:string, message:string,
 *                                     ts:number, attachments?:Array}>}>}
 *
 * DEBUG 模式：返回 ok:true + 空数组，因为 mock 阶段历史消息全在前端 state，不用拉。
 */
export function loadMessages(sessionId) {
  if (DEBUG) {
    return Promise.resolve({
      ok: true, code: 0, sessionId,
      title: '', updatedAt: 0, messageCount: 0,
      messages: []
    });
  }
  return apiPostJson('/chat/messages', { sessionId });
}

/**
 * 上传附件
 * 演示模式：不真正上传，直接 resolve { skipped: true }
 * 真后端：multipart/form-data（后端目前未实现 /api/upload，仍跳过）
 */
export function uploadAttachments(attachments, sessionId) {
  if (!attachments || attachments.length === 0) {
    return Promise.resolve({ skipped: true, reason: 'empty' });
  }
  if (DEBUG || !ENABLE_REAL_UPLOAD) {
    return Promise.resolve({ skipped: true, reason: 'demo' });
  }
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  attachments.forEach((a) => {
    if (a.file) formData.append('files', a.file, a.name);
  });
  return fetchWithTimeout(
    UPLOAD_API_URL,
    { method: 'POST', credentials: 'include', body: formData },
    UPLOAD_TIMEOUT_MS
  ).then((res) => {
    if (!res.ok) throw new Error('upload failed: ' + res.status);
    return res.json().catch(() => ({}));
  });
}

/* 重新导出，便于 AppShell 用到（其他文件别再 import jsonplaceholder URL 了） */
export { FAKE_API_URL, UPLOAD_API_URL, ENABLE_REAL_UPLOAD };
