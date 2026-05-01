<script setup>
import { computed } from 'vue';
import { ASSISTANT_NAME } from '../mock/fixedAnswer.js';
import { formatFileSize } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';

const { displayName: authDisplayName, initial: authInitial } = useAuth();

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
  assistantName: { type: String, default: ASSISTANT_NAME }
});

const isUser = computed(() => props.msg.role === 'user');
const live = computed(() => props.msg._liveFlags || null);
const statusText = computed(() => {
  if (!live.value) return '';
  return live.value.pending ? '处理中...' : `已处理 ${live.value.elapsed}秒`;
});
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
      <div class="msg-header"><span class="name">{{ assistantName }}</span></div>

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
        <div v-if="live.pending" class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <div v-else class="msg-text">{{ msg.content }}</div>
      </template>

      <!-- 历史回放：仅文本 -->
      <div v-else class="msg-text">{{ msg.content }}</div>
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
  white-space: pre-wrap;
}

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
