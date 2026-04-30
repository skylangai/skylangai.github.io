<script setup>
/* 主区右上角悬浮按钮组：返回官网 / 联系我们 */
const emit = defineEmits(['open-contact']);
function openContact() { emit('open-contact'); }
</script>

<template>
  <div class="float-actions">
    <a class="float-btn" href="/" aria-label="返回官网">
      <svg class="float-btn-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.6 11.3 12 4l8.4 7.3" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.5 10.5V19a1 1 0 0 0 1 1h3.2v-4.8a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1V20h3.2a1 1 0 0 0 1-1v-8.5"
              fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="float-btn-tip">返回官网</span>
    </a>
    <button type="button" class="float-btn" aria-label="联系我们" @click="openContact">
      <svg class="float-btn-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5.5 4.5h3.2l1.6 4-2 1.3a12 12 0 0 0 5.9 5.9l1.3-2 4 1.6v3.2a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4 6.1 1.5 1.5 0 0 1 5.5 4.5z"
              fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="float-btn-tip">联系我们</span>
    </button>
  </div>
</template>
