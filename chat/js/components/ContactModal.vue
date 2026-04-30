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
