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
