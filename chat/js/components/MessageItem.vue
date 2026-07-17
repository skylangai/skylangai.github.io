<script setup>
import { computed } from 'vue';
import { ASSISTANT_NAME } from '../mock/fixedAnswer.js';
import { formatFileSize } from '../utils/format.js';
import { renderMarkdown } from '../utils/markdown.js';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';

const { displayName: authDisplayName, initial: authInitial } = useAuth();
const { t } = useI18n();

/* 单条消息渲染：根据 msg.role 与 msg._liveFlags 决定形态
 *
 * msg = {
 *   id, role: 'user' | 'assistant',
 *   content: string,
 *   attachments?: [{name, size, type}],   // 仅 user
 *   _liveFlags?: {                        // 仅 assistant，且仅在 live 链路中存在
 *     tools: [...],
 *     elapsed: number,
 *     pending: boolean
 *   }
 * }
 *
 * 与 jQuery 版的对照：
 *   - msg-user：原 appendUserMessage
 *   - msg-assistant + _liveFlags.pending：原 appendAssistantPlaceholder（loading 中）
 *   - msg-assistant + _liveFlags && !pending：原 finalizeAssistantMessage（live 已完成，工具列表 + 答案）
 *   - msg-assistant 无 _liveFlags：原 appendFinalAssistantMessage（历史回放，仅文本）
 */
const props = defineProps({
  msg: { type: Object, required: true },
  assistantName: { type: String, default: '' }
});

const resolvedAssistantName = computed(() =>
  props.assistantName || t('brand.assistant') || ASSISTANT_NAME
);

const isUser = computed(() => props.msg.role === 'user');
const live = computed(() => props.msg._liveFlags || null);
const statusText = computed(() => {
  if (!live.value) return '';
  return live.value.pending
    ? t('chat.processing')
    : t('chat.processed', { sec: live.value.elapsed });
});

/* assistant 消息正文走 Markdown（流式时 props.msg.content 每个 chunk 都会变，
 * computed 自动重新跑 marked + DOMPurify，做到边流边渲染）。
 * 用户消息不渲染 Markdown，bubble 仍走纯文本。 */
const assistantHtml = computed(() => renderMarkdown(props.msg.content || ''));
</script>

<template>
  <!-- 用户消息 -->
  <div v-if="isUser" class="msg msg-user">
    <div class="avatar avatar-user">{{ authInitial }}</div>
    <div class="msg-body">
      <div class="user-name-tag">{{ authDisplayName }}</div>
      <div v-if="msg.attachments && msg.attachments.length" class="user-attachments">
        <div v-for="a in msg.attachments" :key="a.name + a.size" class="user-attachment-chip" :title="a.name">
          <span class="att-ic"><i class="fa fa-file-o"></i></span>
          <span class="att-meta">
            <span class="att-name">{{ a.name }}</span>
            <span class="att-size">{{ formatFileSize(a.size) }}</span>
          </span>
        </div>
      </div>
      <div v-if="msg.content" class="bubble">{{ msg.content }}</div>
    </div>
  </div>

  <!-- 助手消息 -->
  <div v-else class="msg msg-assistant">
    <div class="avatar"><img src="/assets/logo.svg" alt="bot" /></div>
    <div class="msg-body">
      <div class="msg-header"><span class="name">{{ resolvedAssistantName }}</span></div>

      <!-- 仅 live 形态显示状态 + 工具列表（历史回放不显示） -->
      <template v-if="live">
        <div class="msg-status">
          <span>{{ statusText }}</span>
          <span class="caret-sm">▾</span>
        </div>
        <div class="tool-list">
          <div v-for="(t, i) in live.tools" :key="i" class="tool-item">
            <span class="tool-ic">›</span>
            <span class="tool-name">{{ t.name }}</span>
            <span v-for="(arg, j) in t.args" :key="j" class="tool-arg">{{ arg }}</span>
            <span class="tool-caret">›</span>
          </div>
        </div>
        <!-- live 形态：pending 时若一个 chunk 都没到就显示三个点；
             chunk 一到就开始边流边渲染 Markdown -->
        <div v-if="live.pending && !msg.content" class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <div v-else class="msg-text markdown-body" v-html="assistantHtml"></div>
      </template>

      <!-- 历史回放：同样按 Markdown 渲染 -->
      <div v-else class="msg-text markdown-body" v-html="assistantHtml"></div>
    </div>
  </div>
</template>

<style scoped>
/* 用户消息 */
.msg-user {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  gap: 10px;
}
.msg-user .avatar {
  background: var(--green);
}
.msg-user .bubble {
  background: #f3f4f6;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg-user .user-name-tag {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 4px;
  text-align: right;
}
.msg-user .msg-body {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 78%;
}
/* 用户消息中的附件区（在 bubble 上方、用户名下方） */
.msg-user .user-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  margin-bottom: 6px;
  max-width: 100%;
}
.user-attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12.5px;
  line-height: 1.3;
  color: var(--text);
  max-width: 260px;
  box-shadow: var(--shadow-sm);
}
.user-attachment-chip .att-ic {
  color: var(--text-sub);
  flex-shrink: 0;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}
.user-attachment-chip .att-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.user-attachment-chip .att-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.user-attachment-chip .att-size {
  color: var(--text-sub);
  font-size: 11px;
}

/* 助手消息 */
.msg-assistant {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.msg-assistant .avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid var(--border);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.msg-assistant .avatar img { width: 100%; height: 100%; }

.msg-assistant .msg-body {
  flex: 1;
  min-width: 0;
}
.msg-assistant .msg-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 8px;
}
.msg-assistant .msg-header .name { font-weight: 600; }
.msg-assistant .msg-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-sub);
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  width: fit-content;
}
.msg-assistant .msg-text {
  font-size: 14px;
  line-height: 1.65;
  margin-bottom: 10px;
}
/* 注：markdown-body 的内部元素样式写在文件末尾的非 scoped 块里，
 * 因为 v-html 注入的 DOM 节点不带 scoped 的 [data-v-xxx] 属性，
 * scoped 选择器穿透不进去。 */

/* 工具调用列表 */
.tool-list {
  border-left: 2px solid var(--border);
  padding: 4px 0 4px 12px;
  margin: 4px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tool-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-sub);
}
.tool-item .tool-ic {
  font-size: 12px;
  color: var(--text-muted);
}
.tool-item .tool-name { color: var(--text); }
.tool-item .tool-arg {
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  color: var(--text-sub);
  max-width: 360px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tool-item .tool-caret { color: var(--text-muted); font-size: 10px; }

/* loading 三个点 */
.loading-dots {
  display: inline-flex;
  gap: 4px;
  padding: 6px 0;
}
.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: blink 1.2s infinite ease-in-out;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.9); }
  40% { opacity: 1; transform: scale(1); }
}
</style>

<!-- 全局（非 scoped）：markdown 渲染出来的节点没有 [data-v-xxx]，必须在这里加。
     只针对 .msg-assistant .markdown-body 子树生效，不会污染其它地方。 -->
<style>
.msg-assistant .markdown-body { word-break: break-word; }

.msg-assistant .markdown-body > *:first-child { margin-top: 0; }
.msg-assistant .markdown-body > *:last-child  { margin-bottom: 0; }

.msg-assistant .markdown-body p {
  margin: 0 0 8px;
  line-height: 1.65;
}

/* 标题：和正文同色但加重 + 适当字号；放在聊天气泡内不需要太大 */
.msg-assistant .markdown-body h1,
.msg-assistant .markdown-body h2,
.msg-assistant .markdown-body h3,
.msg-assistant .markdown-body h4,
.msg-assistant .markdown-body h5,
.msg-assistant .markdown-body h6 {
  margin: 14px 0 8px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
}
.msg-assistant .markdown-body h1 { font-size: 20px; }
.msg-assistant .markdown-body h2 { font-size: 18px; }
.msg-assistant .markdown-body h3 { font-size: 16px; }
.msg-assistant .markdown-body h4 { font-size: 15px; }
.msg-assistant .markdown-body h5,
.msg-assistant .markdown-body h6 { font-size: 14px; }

/* 强调 */
.msg-assistant .markdown-body strong { font-weight: 700; }
.msg-assistant .markdown-body em     { font-style: italic; }
.msg-assistant .markdown-body del    { color: var(--text-muted); }

/* 列表 */
.msg-assistant .markdown-body ul,
.msg-assistant .markdown-body ol {
  margin: 4px 0 8px;
  padding-left: 22px;
}
.msg-assistant .markdown-body li { margin: 2px 0; }
.msg-assistant .markdown-body li > p { margin: 0 0 4px; }
.msg-assistant .markdown-body input[type="checkbox"] {
  margin: 0 6px 0 -18px;
  vertical-align: middle;
}

/* 引用 */
.msg-assistant .markdown-body blockquote {
  margin: 8px 0;
  padding: 4px 12px;
  border-left: 3px solid var(--border);
  color: var(--text-sub);
  background: #fafbfc;
  border-radius: 4px;
}

/* 行内代码 */
.msg-assistant .markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  background: #f3f4f6;
  padding: 1px 5px;
  border-radius: 4px;
  color: #b9402b;
}
/* 围栏代码块：pre 包 code 时不要双重底色 */
.msg-assistant .markdown-body pre {
  margin: 8px 0;
  padding: 12px 14px;
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.55;
}
.msg-assistant .markdown-body pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
  border-radius: 0;
}

/* 表格：给个干净的边框，长内容横向滚动靠 pre/wrapping，不强制 overflow */
.msg-assistant .markdown-body table {
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
  width: auto;
  max-width: 100%;
  display: block;
  overflow-x: auto;
}
.msg-assistant .markdown-body th,
.msg-assistant .markdown-body td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
}
.msg-assistant .markdown-body th {
  background: #f3f4f6;
  font-weight: 600;
}
.msg-assistant .markdown-body tr:nth-child(2n) td { background: #fafbfc; }

/* 链接 */
.msg-assistant .markdown-body a {
  color: var(--primary, #2563eb);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
}
.msg-assistant .markdown-body a:hover { opacity: 0.85; }

/* 分割线 */
.msg-assistant .markdown-body hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 12px 0;
}

/* 图片：避免 LLM 给的图把布局撑爆 */
.msg-assistant .markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 6px 0;
}
</style>

