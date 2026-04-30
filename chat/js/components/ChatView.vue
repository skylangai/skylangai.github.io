<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { useSessions } from '../composables/useSessions.js';
import Composer from './Composer.vue';
import MessageItem from './MessageItem.vue';

const emit = defineEmits(['submit']);

const { state, currentSession, currentMessages } = useSessions();

const scrollRef = ref(null);
const composerRef = ref(null);

function scrollToBottom() {
  const el = scrollRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

/* 消息变化（追加/AJAX 完成）后滚到底部
 * 用 deep watcher 是因为 message 对象内部的 content / _liveFlags.pending 也会变 */
watch(
  () => currentMessages.value.length,
  () => nextTick(scrollToBottom)
);
watch(
  currentMessages,
  () => nextTick(scrollToBottom),
  { deep: true }
);

/* 切换会话时滚到底 + 聚焦 composer */
watch(
  () => state.currentSessionId,
  () => nextTick(() => {
    scrollToBottom();
    if (composerRef.value && composerRef.value.focus) composerRef.value.focus();
  })
);

onMounted(() => {
  nextTick(scrollToBottom);
  if (composerRef.value && composerRef.value.focus) composerRef.value.focus();
});

function onSubmit(payload) {
  emit('submit', payload);
}
</script>

<template>
  <section class="chat">
    <div class="chat-scroll" ref="scrollRef">
      <div class="chat-day">今天</div>
      <div class="chat-list">
        <MessageItem v-for="m in currentMessages" :key="m.id" :msg="m" />
      </div>
    </div>

    <Composer ref="composerRef"
              placeholder="输入问题... "
              send-icon="●"
              :bottom-fixed="true"
              @submit="onSubmit" />

    <div class="chat-footer">助手内容可能会出错，请仔细核对回复内容。</div>
  </section>
</template>

<style scoped>
.chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-main);
}
.chat-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0 16px;
}
.chat-day {
  text-align: center;
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 16px;
}
.chat-day::before, .chat-day::after { content: ""; }

.chat-list {
  max-width: 840px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.chat-footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  padding: 0 0 12px;
}

@media (max-width: 720px) {
  .chat-list { padding: 0 12px; }
}
</style>
