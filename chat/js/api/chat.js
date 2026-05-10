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
  apiPostJson,
  apiGetJson,
  apiDeleteJson
} from './config.js';
import { streamSSE } from './sse.js';
import { buildClientContext } from '../utils/clientContext.js';
import { partitionAttachments, readFileAsBase64 } from '../utils/fileSupport.js';

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
/* 把 attachments 里的 File 对象读成 base64，并按白名单过滤。
 * 返回一个新的 attachments 数组，元素形态：{name, size, type, content_base64}。
 * 没附件 / 没 .file 时直接返回空数组（不发起任何 IO）。
 *
 * 任何单个文件读失败都会在该附件 .reason 上标出来；调用方通常忽略 reason，
 * 让后端 base64 解码 / 抽取再兜一次（双保险）。 */
async function buildAttachmentsPayload(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  if (list.length === 0) return [];

  /* 二次过滤：UploadButton 已在选件时拦过一遍；万一调用方绕过来，这里再兜底 */
  const { accepted, rejected } = partitionAttachments(list);
  if (rejected.length > 0 && typeof console !== 'undefined') {
    console.warn('[chat] dropping unsupported attachments:',
      rejected.map((r) => `${r.name}(${r.reason})`));
  }

  const out = [];
  for (const a of accepted) {
    const meta = { name: a.name, size: a.size, type: a.type || '' };
    if (!a.file) {
      /* 没有 .file 通常是"历史消息回放"等纯元数据场景；不读取，不发 base64 */
      out.push(meta);
      continue;
    }
    try {
      meta.content_base64 = await readFileAsBase64(a.file);
    } catch (e) {
      meta.reason = '读取本地文件失败：' + (e && e.message || e);
    }
    out.push(meta);
  }
  return out;
}

export async function sendMessage(payload, callbacks = {}) {
  const { onThinking, onChunk, onDone, onError } = callbacks;

  /* 在 API 层透明地给请求挂上"客户端环境"信息（时间/时区/locale/国家码）。
   * 这样所有调用方（AppShell / 测试 / 未来其它入口）都不用各自构造，
   * 后端拿到后再决定如何拼到 LLM system prompt。 */
  const enrichedAttachments = await buildAttachmentsPayload(payload.attachments);
  const enriched = {
    ...payload,
    attachments: enrichedAttachments,
    client_context: buildClientContext()
  };

  if (DEBUG) {
    /* DEBUG 模式发的"假请求"里去掉 base64，免得 Network 面板巨大无用 */
    const debugBody = {
      ...enriched,
      attachments: enrichedAttachments.map(({ content_base64, ...rest }) => rest),
      timestamp: Date.now()
    };
    fetchWithTimeout(
      FAKE_API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debugBody)
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
    { body: JSON.stringify(enriched) },
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
 * 删除某个 session（连带后端的对话历史 + 详细使用记录）。
 *
 * @param {string} sessionId
 * @returns {Promise<{ok:boolean, code:number, message?:string, sessionId?:string}>}
 *
 * DEBUG 模式：直接返回 ok（侧栏自己清本地数据即可，不涉及后端）。
 */
export function deleteSession(sessionId) {
  if (DEBUG) {
    return Promise.resolve({ ok: true, code: 0, sessionId });
  }
  return apiDeleteJson('/chat/sessions/' + encodeURIComponent(sessionId));
}

/**
 * 详细使用记录分页拉取。
 *
 * @param {object} opts
 *   - page (1-based)         默认 1
 *   - pageSize               默认 20，硬上限受后端 100 约束
 * @returns {Promise<{ok:boolean, code:number, total?:number,
 *                    offset?:number, limit?:number,
 *                    records?:Array<{id:number, sessionId:string, messageId:number,
 *                                    prompt:string, inputTokens:number, outputTokens:number,
 *                                    totalTokens:number, cost:number, ts:number}>}>}
 */
export function loadUsageRecords({ page = 1, pageSize = 20 } = {}) {
  if (DEBUG) {
    return Promise.resolve({
      ok: true, code: 0, total: 0, offset: 0, limit: pageSize, records: []
    });
  }
  const offset = Math.max(0, (page - 1) * pageSize);
  const limit  = Math.max(1, Math.min(100, pageSize));
  return apiGetJson(`/finance/records?offset=${offset}&limit=${limit}`);
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
