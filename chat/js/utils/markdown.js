import { marked } from 'marked';
import DOMPurify from 'dompurify';

/* Markdown 渲染工具
 *
 * 给 assistant 消息内容用。LLM 输出完全不可信，必须先用 DOMPurify 清洗，
 * 否则模型只要回一段 <img src=x onerror=...> 就能在前端执行任意 JS。
 *
 * 设计要点：
 * - 流式过程中会被高频调用（每个 SSE chunk 都会重渲一次 computed），
 *   所以 marked 走最便宜的同步 parse + GFM；DOMPurify 也走默认安全配置。
 * - GFM 开了表格 / 删除线 / 任务列表 / 自动链接 / 代码块。
 * - breaks=true：单换行也变 <br>，更贴近聊天体验（LLM 经常用单换行分句）。
 * - 不暴露 HTML，allowDangerousHtml=false（marked v15 默认就是 false，但显式写一下）。
 */

marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false
});

/* 清洗时禁掉所有可能跨域 / 脚本能力的标签和属性。
 * - FORBID_TAGS: <style>, <iframe>, <object>, <embed>, <form> 一律禁
 * - FORBID_ATTR: 所有 on* 事件、style 内联（防 expression()）、外联资源 src 之外的 href javascript: 由 DOMPurify 自动过滤
 */
const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
};

/* 给所有 <a> 加 target=_blank + rel=noopener，避免跳转打断 SPA 状态。 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function renderMarkdown(text) {
  if (!text) return '';
  let html;
  try {
    html = marked.parse(String(text));
  } catch (e) {
    /* marked 在流式中遇到未闭合 ``` / 表格碎片不会抛错，但兜底一下 */
    return escapeHtml(String(text));
  }
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
