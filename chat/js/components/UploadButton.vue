<script setup>
import { ref, computed } from 'vue';
import { useUploads } from '../composables/useUploads.js';
import { FILE_INPUT_ACCEPT, partitionAttachments } from '../utils/fileSupport.js';

/* 文件上传按钮：触发隐藏 file input；选完后做一次本地白名单校验再入队 */
const { state: uploads, addFiles } = useUploads();
const inputRef = ref(null);

const hasAttachments = computed(() => uploads.list.length > 0);

function trigger() {
  if (!inputRef.value) return;
  inputRef.value.value = ''; // 让连续选同一个文件也能触发 change
  inputRef.value.click();
}

function onChange(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;
  /* 不直接交给 useUploads，先按"扩展名 + 体积"过一遍，
   * 不支持的当场弹一行原生 alert（demo 阶段够用，后期再换 toast）。
   * 这里用扁平的 {file, name, size, type} 形态，与 useUploads.addFiles 内部一致。 */
  const wrapped = files.map((f) => ({ file: f, name: f.name, size: f.size, type: f.type || '' }));
  const { accepted, rejected } = partitionAttachments(wrapped);
  if (rejected.length > 0) {
    const lines = rejected.map((r) => `• ${r.name}：${r.reason}`).join('\n');
    alert('以下文件未被添加：\n' + lines);
  }
  if (accepted.length > 0) {
    /* useUploads.addFiles 期望传一个 FileList-like，构造一个数组就够（length + index） */
    addFiles(accepted.map((a) => a.file));
  }
}
</script>

<template>
  <button type="button"
          class="chip chip-icon chip-upload"
          :class="{ 'has-attachments': hasAttachments }"
          title="上传文件（支持 PDF / Word(.docx) / Markdown / TXT）"
          aria-label="上传文件"
          @click="trigger">＋
    <input ref="inputRef" type="file" multiple hidden
           :accept="FILE_INPUT_ACCEPT"
           @change="onChange" />
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
