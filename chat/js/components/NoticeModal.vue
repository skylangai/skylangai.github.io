<script setup>
import { computed } from 'vue';
import BaseModal from './BaseModal.vue';

/* Demo 受限提示弹窗 */
const props = defineProps({
  open: { type: Boolean, default: false },
  feature: { type: String, default: '' }
});
const emit = defineEmits(['update:open', 'contact']);

const featureLabel = computed(() =>
  props.feature ? `「${props.feature}」` : '该功能'
);
function close() { emit('update:open', false); }
function toContact() {
  emit('update:open', false);
  emit('contact');
}
</script>

<template>
  <BaseModal name="notice" :open="open" @update:open="$emit('update:open', $event)" labelledby="demoNoticeTitle">
    <button type="button" class="notice-modal-close" aria-label="关闭" @click="close">
      <i class="fa fa-times" aria-hidden="true"></i>
    </button>
    <div class="notice-modal-icon" aria-hidden="true">
      <i class="fa fa-info"></i>
    </div>
    <h3 id="demoNoticeTitle" class="notice-modal-title">功能暂未开放</h3>
    <p class="notice-modal-sub">
      <span>{{ featureLabel }}</span>
      在 Demo 状态下暂不支持，欢迎联系我们了解完整版能力。
    </p>
    <div class="notice-modal-actions">
      <button type="button" class="notice-btn notice-btn-ghost" data-modal-autofocus
              @click="close">我知道了</button>
      <button type="button" class="notice-btn notice-btn-primary" @click="toContact">联系我们</button>
    </div>
  </BaseModal>
</template>

<!-- 见 BaseModal.vue 顶部说明：modal 节点由 BaseModal 动态拼 class 渲染，scoped 命中不到。 -->
<style>
.notice-modal {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.notice-modal.is-open {
  display: flex;
  animation: cmFadeIn 0.18s ease both;
}
.notice-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 22, 50, 0.45);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.notice-modal-dialog {
  position: relative;
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 22, 50, 0.35),
              0 4px 14px rgba(15, 22, 50, 0.20);
  padding: 28px 24px 20px;
  text-align: center;
  animation: cmPopIn 0.26s cubic-bezier(0.2, 0.8, 0.25, 1) both;
}
.notice-modal-close {
  position: absolute;
  top: 10px; right: 10px;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 160ms ease, color 160ms ease;
}
.notice-modal-close:hover {
  background: var(--hover);
  color: var(--text);
}
.notice-modal-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin: 4px auto 14px;
  box-shadow: 0 8px 20px rgba(129, 140, 248, 0.35);
}
.notice-modal-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.4px;
}
.notice-modal-sub {
  margin: 0 0 20px;
  font-size: 13.5px;
  color: var(--text-sub);
  line-height: 1.65;
}
.notice-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.notice-btn {
  min-width: 96px;
  padding: 9px 16px;
  font-size: 13.5px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 160ms ease, color 160ms ease,
              border-color 160ms ease, transform 160ms ease;
}
.notice-btn:active { transform: translateY(1px); }
.notice-btn-ghost {
  background: #ffffff;
  border-color: var(--border-strong);
  color: var(--text);
}
.notice-btn-ghost:hover {
  background: var(--hover);
}
.notice-btn-primary {
  background: linear-gradient(135deg, #4338ca 0%, #7c3aed 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(67, 56, 202, 0.30);
}
.notice-btn-primary:hover {
  filter: brightness(1.06);
  box-shadow: 0 10px 22px rgba(124, 58, 237, 0.36);
}

@media (max-width: 480px) {
  .notice-modal-dialog { padding: 24px 18px 16px; border-radius: 14px; }
  .notice-modal-title { font-size: 16px; }
  .notice-modal-sub { font-size: 13px; }
}
</style>
