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

<style scoped>
/* .chip 基础形态由 css/style.css 提供，这里只放 model 触发器特化样式 */
.chip-model-wrap {
  position: relative;
  display: inline-block;
}
.chip-model { cursor: pointer; }
.chip-model.is-open {
  background: var(--hover);
  border-color: #b9bcc4;
}
.chip-model.is-open .chip-caret {
  transform: rotate(180deg);
  color: var(--text);
}
.chip-model-label {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-ic { color: var(--text-sub); }

/* chip 上的小箭头 */
.chip-caret {
  width: 11px;
  height: 11px;
  margin-left: 4px;
  color: var(--text-sub);
  flex-shrink: 0;
  transition: transform 160ms ease, color 160ms ease;
  display: inline-block;
  vertical-align: middle;
}
.chip-model:hover .chip-caret { color: var(--text); }

/* 弹层 */
.model-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 200px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.06);
  z-index: 60;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 140ms ease, transform 140ms ease;
  pointer-events: none;
}
.model-menu[hidden] { display: none !important; }
.model-menu.is-open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.model-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  text-align: left;
  line-height: 1.3;
  transition: background 100ms;
}
.model-menu-item:hover { background: var(--hover); }
.model-menu-item .mm-ic {
  width: 16px;
  color: var(--text-sub);
  flex-shrink: 0;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.model-menu-item .mm-name { flex: 1; min-width: 0; }
.model-menu-item .mm-check {
  width: 14px;
  color: var(--primary);
  opacity: 0;
  flex-shrink: 0;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.model-menu-item.is-selected .mm-check { opacity: 1; }
.model-menu-item.is-selected .mm-name { color: var(--primary); font-weight: 600; }
.model-menu-item.is-selected .mm-ic { color: var(--primary); }
</style>
