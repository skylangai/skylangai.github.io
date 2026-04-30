<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useModels } from '../composables/useModels.js';

/* 模型选择下拉：chip 触发器 + 向上展开的菜单
 * 内部自管 open 状态；点空白/Esc 关闭 */
const { models, currentModel, selectModel } = useModels();
const open = ref(false);
const rootRef = ref(null);

function toggle(e) {
  e.stopPropagation();
  open.value = !open.value;
}

function pick(id) {
  selectModel(id);
  open.value = false;
}

function onDocClick(e) {
  if (!open.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) open.value = false;
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false;
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="chip-model-wrap" ref="rootRef">
    <button type="button" class="chip chip-model"
            :class="{ 'is-open': open }"
            :aria-expanded="open ? 'true' : 'false'"
            aria-haspopup="listbox"
            @click="toggle">
      <span class="model-ic">✧</span>
      <span class="chip-model-label">{{ currentModel.label }}</span>
      <svg class="chip-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="model-menu" :class="{ 'is-open': open }" role="listbox" aria-label="选择模型"
         :hidden="!open">
      <button v-for="m in models" :key="m.id" type="button"
              class="model-menu-item"
              :class="{ 'is-selected': m.id === currentModel.id }"
              role="option"
              :aria-selected="m.id === currentModel.id ? 'true' : 'false'"
              @click.stop="pick(m.id)">
        <span class="mm-ic">✧</span>
        <span class="mm-name">{{ m.label }}</span>
        <span class="mm-check"><i class="fa fa-check"></i></span>
      </button>
    </div>
  </div>
</template>
