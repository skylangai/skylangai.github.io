<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import { useUploads } from '../composables/useUploads.js';
import UploadButton from './UploadButton.vue';
import AttachmentChips from './AttachmentChips.vue';
import ModelMenu from './ModelMenu.vue';

/* 通用输入框 composer：欢迎页 / 对话页两处复用
 *
 * 通过 props 控制：
 *   - placeholder: 占位符
 *   - sendIcon:    发送按钮图标（welcome 用 ↑，chat 用 ●）
 *   - bottomFixed: 是否启用 chat 页底部固定样式（多一个 composer-bottom-fixed 类）
 *   - autofocus:   挂载后是否自动聚焦
 *
 * 事件：
 *   - submit({ text, attachments }): 用户按下回车或点击发送时触发
 *
 * 文本与附件队列均为内部/共享状态：
 *   - text: 本组件内部 ref（每个 composer 实例独立的输入草稿）
 *   - attachments: 来自 useUploads() 的全局 reactive，两处 composer 共享
 */
const props = defineProps({
  placeholder: { type: String, default: '输入问题... ' },
  sendIcon:    { type: String, default: '↑' },
  bottomFixed: { type: Boolean, default: false },
  autofocus:   { type: Boolean, default: false }
});
const emit = defineEmits(['submit']);

const text = ref('');
const inputRef = ref(null);
const { state: uploads, consume: consumeAttachments } = useUploads();

const canSend = computed(() => text.value.trim().length > 0 || uploads.list.length > 0);

function autosize() {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  /* 当 textarea 处于 display:none 子树（典型场景：发送后 AppShell 同步把 WelcomeView
   * 切到 chat，紧接着 trySubmit 的 clear()→nextTick(autosize) 跑在隐藏状态下）时，
   * el.scrollHeight 会是 0。此时如果写 inline height: 0px，等 WelcomeView 再次可见，
   * textarea 就以 0 高度渲染，placeholder 看不见，光标会缩成一个灰色小点。
   * 解决：scrollHeight === 0 时保持 'auto'，让 rows="1" 的内禀高度生效。 */
  const sh = el.scrollHeight;
  if (sh > 0) {
    el.style.height = Math.min(sh, 200) + 'px';
  }
}

/* 输入变化时同步高度 */
watch(text, () => nextTick(autosize));

function clear() {
  text.value = '';
  nextTick(autosize);
}

/* 暴露给父组件 / 外部填入提示词 */
function setText(v) {
  text.value = v;
  nextTick(() => {
    autosize();
    if (inputRef.value) inputRef.value.focus();
  });
}

function focus() {
  if (inputRef.value) inputRef.value.focus();
}

function trySubmit() {
  if (!canSend.value) return;
  const trimmed = text.value.trim();
  const attachmentsAtSend = consumeAttachments();
  emit('submit', { text: trimmed, attachments: attachmentsAtSend });
  clear();
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    trySubmit();
  }
}

/* 挂载后可选自动聚焦 */
nextTick(() => {
  if (props.autofocus) focus();
});

defineExpose({ setText, focus, clear });
</script>

<template>
  <div class="composer" :class="{ 'composer-bottom-fixed': bottomFixed }">
    <textarea
      ref="inputRef"
      class="composer-input"
      rows="1"
      :placeholder="placeholder"
      v-model="text"
      @input="autosize"
      @keydown="onKeydown"></textarea>

    <AttachmentChips />

    <div class="composer-bottom">
      <div class="composer-left">
        <UploadButton />
      </div>
      <div class="composer-right">
        <ModelMenu />
        <button type="button" class="send-btn" title="发送" @click="trySubmit">{{ sendIcon }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.composer {
  border: 1px solid var(--border-strong);
  border-radius: 14px;
  background: #fff;
  padding: 12px 14px 8px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s, border-color 0.15s;
}
.composer:focus-within {
  border-color: #b9bcc4;
  box-shadow: var(--shadow-md);
}
.composer-input {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  background: transparent;
  color: var(--text);
  padding: 4px 2px;
  max-height: 200px;
  overflow-y: auto;
}
.composer-input::placeholder { color: var(--text-muted); }

.composer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}
.composer-left, .composer-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.send-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.1s, opacity 0.2s;
}
.send-btn:hover { transform: scale(1.05); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 对话页底部固定形态 */
.composer-bottom-fixed {
  margin: 8px auto 12px;
  width: 100%;
  max-width: 760px;
  padding: 12px 14px 8px;
}

@media (max-width: 720px) {
  .composer-bottom-fixed { padding: 0 12px; }
}
</style>
