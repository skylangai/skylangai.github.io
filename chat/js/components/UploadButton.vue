<script setup>
import { ref, computed } from 'vue';
import { useUploads } from '../composables/useUploads.js';

/* 文件上传按钮：触发隐藏 file input；选完入队 */
const { state: uploads, addFiles } = useUploads();
const inputRef = ref(null);

const hasAttachments = computed(() => uploads.list.length > 0);

function trigger() {
  if (!inputRef.value) return;
  inputRef.value.value = ''; // 让连续选同一个文件也能触发 change
  inputRef.value.click();
}

function onChange(e) {
  addFiles(e.target.files);
}
</script>

<template>
  <button type="button"
          class="chip chip-icon chip-upload"
          :class="{ 'has-attachments': hasAttachments }"
          title="上传文件" aria-label="上传文件"
          @click="trigger">＋
    <input ref="inputRef" type="file" multiple hidden @change="onChange" />
  </button>
</template>

<style scoped>
/* .chip / .chip-icon 是公共原子类，定义在 css/style.css */
.chip-upload {
  cursor: pointer;
  transition: color 120ms, border-color 120ms, background 120ms;
}
.chip-upload:hover { color: var(--text); }
.chip-upload.has-attachments {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(255, 106, 26, 0.06);
}
</style>
