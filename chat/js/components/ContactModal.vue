<script setup>
import { ref } from 'vue';
import BaseModal from './BaseModal.vue';

defineProps({
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['update:open']);

const toastShow = ref(false);
let toastTimer = null;

function close() { emit('update:open', false); }

function copy(text) {
  const writeOk = () => {
    toastShow.value = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastShow.value = false; }, 1600);
  };
  const legacy = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); writeOk(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(writeOk).catch(legacy);
  } else {
    legacy();
  }
}
</script>

<template>
  <BaseModal name="contact" :open="open" @update:open="$emit('update:open', $event)" labelledby="contactModalTitle">
    <button type="button" class="contact-modal-close" aria-label="关闭" @click="close">
      <i class="fa fa-times" aria-hidden="true"></i>
    </button>
    <div class="contact-modal-head">
      <div class="contact-modal-icon">
        <i class="fa fa-rocket" aria-hidden="true"></i>
      </div>
      <h3 id="contactModalTitle" class="contact-modal-title">联系我们</h3>
      <p class="contact-modal-sub">欢迎随时联系，我们将为您安排 Demo 体验与方案咨询</p>
    </div>
    <ul class="contact-modal-list">
      <li>
        <span class="cm-icon"><i class="fa fa-phone" aria-hidden="true"></i></span>
        <div class="cm-meta">
          <span class="cm-label">联系电话</span>
          <a class="cm-value" href="tel:13609756994">刘生 · 13609756994</a>
        </div>
        <button type="button" class="cm-copy" aria-label="复制电话"
                @click.stop.prevent="copy('13609756994')">
          <i class="fa fa-clone" aria-hidden="true"></i>
        </button>
      </li>
      <li>
        <span class="cm-icon"><i class="fa fa-envelope" aria-hidden="true"></i></span>
        <div class="cm-meta">
          <span class="cm-label">邮箱</span>
          <a class="cm-value" href="mailto:liujc19@tsinghua.org.cn">liujc19@tsinghua.org.cn</a>
        </div>
        <button type="button" class="cm-copy" aria-label="复制邮箱"
                @click.stop.prevent="copy('liujc19@tsinghua.org.cn')">
          <i class="fa fa-clone" aria-hidden="true"></i>
        </button>
      </li>
    </ul>
    <div class="contact-modal-foot">
      <span class="cm-toast" :class="{ 'is-show': toastShow }">已复制到剪贴板</span>
    </div>
  </BaseModal>
</template>

<!-- 见 BaseModal.vue 顶部说明：modal 节点由 BaseModal 动态拼 class 渲染，
     scoped 命中不到，全家族统一用普通 <style>。 -->
<style>
.contact-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.contact-modal.is-open {
  display: flex;
  animation: cmFadeIn 0.22s ease both;
}
.contact-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 22, 50, 0.55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}
.contact-modal-dialog {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 30px 80px rgba(15, 22, 50, 0.45),
              0 6px 18px rgba(15, 22, 50, 0.25);
  padding: 32px 28px 24px;
  animation: cmPopIn 0.32s cubic-bezier(0.2, 0.8, 0.25, 1) both;
  overflow: hidden;
}
.contact-modal-dialog::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 6px;
  background: linear-gradient(90deg, #1a2a66 0%, #4338ca 50%, #7c3aed 100%);
}
.contact-modal-close {
  position: absolute;
  top: 14px; right: 14px;
  width: 34px; height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(26, 42, 102, 0.06);
  color: #4338ca;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
}
.contact-modal-close:hover {
  background: rgba(124, 58, 237, 0.14);
  color: #7c3aed;
  transform: rotate(90deg);
}
.contact-modal-head {
  text-align: center;
  margin-bottom: 22px;
}
.contact-modal-icon {
  width: 58px; height: 58px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1a2a66 0%, #4338ca 55%, #7c3aed 100%);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 10px 24px rgba(67, 56, 202, 0.35);
  margin: 6px auto 14px;
}
.contact-modal-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #1a2a66;
  letter-spacing: 1px;
}
.contact-modal-sub {
  margin: 0;
  font-size: 13px;
  color: #6b7090;
  line-height: 1.7;
}
.contact-modal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.contact-modal-list li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #f5f6fb;
  border: 1px solid rgba(26, 42, 102, 0.08);
  border-radius: 12px;
  transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
}
.contact-modal-list li:hover {
  background: #ffffff;
  border-color: rgba(67, 56, 202, 0.35);
  transform: translateY(-1px);
}
.contact-modal-list .cm-icon {
  flex-shrink: 0;
  width: 40px; height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4338ca, #7c3aed);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 6px 14px rgba(67, 56, 202, 0.28);
}
.contact-modal-list .cm-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}
.contact-modal-list .cm-label {
  font-size: 11.5px;
  color: #8a8fa8;
  letter-spacing: 0.4px;
  margin-bottom: 2px;
}
.contact-modal-list .cm-value {
  font-size: 14.5px;
  color: #1a2a66;
  font-weight: 600;
  text-decoration: none;
  word-break: break-all;
}
.contact-modal-list .cm-value:hover { color: #4338ca; }
.contact-modal-list .cm-copy {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(26, 42, 102, 0.10);
  background: #ffffff;
  color: #4338ca;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.contact-modal-list .cm-copy:hover {
  background: linear-gradient(135deg, #4338ca, #7c3aed);
  color: #ffffff;
  transform: scale(1.05);
}
.contact-modal-foot {
  margin-top: 18px;
  text-align: center;
  min-height: 18px;
}
.cm-toast {
  display: inline-block;
  font-size: 12.5px;
  color: #22a06b;
  background: rgba(34, 160, 107, 0.10);
  border: 1px solid rgba(34, 160, 107, 0.25);
  padding: 4px 12px;
  border-radius: 999px;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.cm-toast.is-show {
  opacity: 1;
  transform: translateY(0);
}
@media (max-width: 480px) {
  .contact-modal-dialog { padding: 26px 20px 18px; border-radius: 14px; }
  .contact-modal-title { font-size: 19px; }
  .contact-modal-list .cm-value { font-size: 13.5px; }
}
</style>
