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
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
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
