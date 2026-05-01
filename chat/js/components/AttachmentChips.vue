<script setup>
import { computed } from 'vue';
import { useUploads } from '../composables/useUploads.js';
import { formatFileSize } from '../utils/format.js';

/* 待发送附件预览区（输入框下方） */
const { state: uploads, removeAttachment } = useUploads();
const list = computed(() => uploads.list);
</script>

<template>
  <div class="composer-attachments" :hidden="list.length === 0">
    <div v-for="a in list" :key="a.id" class="attachment-chip" :title="a.name">
      <span class="ac-ic"><i class="fa fa-paperclip"></i></span>
      <span class="ac-name">{{ a.name }}</span>
      <span class="ac-size">{{ formatFileSize(a.size) }}</span>
      <button type="button" class="attachment-chip-remove" aria-label="移除"
              @click.prevent="removeAttachment(a.id)">
        <i class="fa fa-times"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.composer-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
}
.composer-attachments[hidden] { display: none; }

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f7f8fa;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 4px 4px 8px;
  font-size: 12px;
  line-height: 1.2;
  color: var(--text);
  max-width: 260px;
}
.attachment-chip .ac-ic {
  color: var(--text-sub);
  font-size: 13px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
}
.attachment-chip .ac-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.attachment-chip .ac-size {
  color: var(--text-sub);
  font-size: 11px;
  flex-shrink: 0;
}

.attachment-chip-remove {
  background: transparent;
  border: 0;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-sub);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  padding: 0;
  flex-shrink: 0;
}
.attachment-chip-remove:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text);
}
</style>
