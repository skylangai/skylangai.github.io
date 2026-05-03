/* 极简 SSE 解析器：手工解析 text/event-stream
 *
 * 不用第三方库（EventSource 不支持 POST + body）。
 * 用法：
 *   await streamSSE(url, { method: 'POST', body: ... }, {
 *     onEvent: (event, data) => { ... },
 *     signal: AbortController.signal,
 *   });
 *
 * 协议（见 W3C SSE）：
 *   每条事件由若干行组成，事件之间用空行分隔
 *     event: <name>      ← 可选，缺省 'message'
 *     data: <payload>    ← 可多行，多行 data 用 '\n' 拼接
 *     <空行>             ← 触发本事件
 *
 * 我们的后端事件 payload 都是一行 JSON，所以能简单 JSON.parse；
 * 解析失败时回退为原始字符串，调用方自己决定怎么处理。
 */
import { API_BASE, REQUEST_TIMEOUT_MS } from './config.js';

const DEFAULT_STREAM_TIMEOUT_MS = 5 * 60 * 1000;  // 长连接，不能用 15s

/**
 * @param {string} path        以 '/' 开头的相对路径，自动拼 API_BASE
 * @param {object} init        fetch 的 init（method/body/headers 等），credentials 自动加
 * @param {object} handlers
 *   - onEvent(event, data)    每解析出一条 SSE 事件
 *   - onOpen(response)        响应头到达（status/headers），可用来检查 401
 *   - signal                  AbortSignal，外部取消用
 *   - timeoutMs               总超时（默认 5 分钟）
 *
 * @returns {Promise<void>}    所有事件分发完成后 resolve；网络/HTTP 错误 reject
 */
export async function streamSSE(path, init, handlers = {}) {
  const { onEvent, onOpen, signal, timeoutMs = DEFAULT_STREAM_TIMEOUT_MS } = handlers;
  const ctrl = new AbortController();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let resp;
  try {
    resp = await fetch(API_BASE + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      ...init,
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }

  if (onOpen) {
    try { onOpen(resp); } catch (e) { /* swallow handler error */ }
  }

  if (!resp.ok || !resp.body) {
    clearTimeout(timer);
    throw new Error('SSE HTTP ' + resp.status);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE 用空行分隔事件；可能是 \n\n 或 \r\n\r\n
      let sepIdx;
      while ((sepIdx = _findEventEnd(buf)) >= 0) {
        const block = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx).replace(/^(\r?\n){1,2}/, '');
        const parsed = _parseBlock(block);
        if (parsed && onEvent) onEvent(parsed.event, parsed.data);
      }
    }
    // 结束前可能还有半条事件（理论上不该发生），尽力解析一次
    if (buf.trim() && onEvent) {
      const parsed = _parseBlock(buf);
      if (parsed) onEvent(parsed.event, parsed.data);
    }
  } finally {
    clearTimeout(timer);
    try { reader.releaseLock(); } catch (e) { /* ignore */ }
  }
}

function _findEventEnd(s) {
  const a = s.indexOf('\n\n');
  const b = s.indexOf('\r\n\r\n');
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

function _parseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(':')) continue;  // 注释或空
    const idx = rawLine.indexOf(':');
    const field = idx === -1 ? rawLine : rawLine.slice(0, idx);
    let val = idx === -1 ? '' : rawLine.slice(idx + 1);
    if (val.startsWith(' ')) val = val.slice(1);
    if (field === 'event') event = val;
    else if (field === 'data') dataLines.push(val);
    // id / retry 字段我们不需要
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join('\n');
  let data;
  try { data = JSON.parse(raw); } catch (e) { data = raw; }
  return { event, data };
}
