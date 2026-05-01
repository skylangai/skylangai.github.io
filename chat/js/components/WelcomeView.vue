<script setup>
import { ref, computed } from 'vue';
import { PROMPTS } from '../mock/prompts.js';
import Composer from './Composer.vue';

const TABS = [
  { id: 'market',  label: '市场洞察', ic: '📊' },
  { id: 'shop',    label: '店铺分析', ic: '🏬' },
  { id: 'publish', label: '智能发品', ic: '📦' },
  { id: 'image',   label: '创意图片', ic: '🖼' },
  { id: 'video',   label: '创意视频', ic: '🎬' },
  { id: 'decor',   label: '店铺装修', ic: '🎨' }
];

const emit = defineEmits(['submit', 'pick-prompt']);

const activeTab = ref('market');
/* 不同 Tab 切换会导致提示词重新动效，简单做法：始终复用同一份 mock，
   未来可以按 tab.id 拉取不同 prompts。 */
const prompts = computed(() => PROMPTS);

const composerRef = ref(null);

function pickPrompt(text) {
  emit('pick-prompt', text);
  if (composerRef.value && composerRef.value.setText) {
    composerRef.value.setText(text);
  }
}

function onSubmit(payload) {
  emit('submit', payload);
}
</script>

<template>
  <section class="welcome">
    <div class="welcome-inner">
      <div class="welcome-logo">
        <img src="/assets/logo.svg" alt="logo" />
      </div>
      <h1 class="welcome-title">电商智能生意助手</h1>

      <Composer ref="composerRef"
                placeholder="输入问题... "
                send-icon="↑"
                :autofocus="true"
                @submit="onSubmit" />

      <div class="tabs">
        <button v-for="t in TABS" :key="t.id"
                type="button"
                class="tab"
                :class="{ active: activeTab === t.id }"
                @click="activeTab = t.id">
          <span class="tab-ic">{{ t.ic }}</span> {{ t.label }}
        </button>
      </div>

      <div class="prompts">
        <div class="prompts-title">尝试以下提示词</div>
        <ul class="prompts-list">
          <li v-for="(p, i) in prompts" :key="i" class="prompt-item"
              @click="pickPrompt(p)">{{ p }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.welcome {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 24px 40px;
  overflow-y: auto;
}
.welcome-inner {
  width: 100%;
  max-width: 720px;
}
.welcome-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.welcome-logo img {
  width: 56px;
  height: 56px;
}
.welcome-title {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

/* Tabs */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 8px;
  justify-content: center;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  height: 32px;
}
.tab:hover { background: var(--hover); }
.tab.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}
.tab .tab-ic { font-size: 13px; }

/* 提示词列表 */
.prompts {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 10px 4px;
}
.prompts-title {
  padding: 4px 14px 6px;
  font-size: 12.5px;
  color: var(--text-sub);
}
.prompts-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.prompts-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prompts-list li:hover { background: var(--hover); }
.prompts-list li .diamond {
  color: var(--text-muted);
  font-size: 10px;
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .welcome { padding: 40px 16px; }
  .tabs { justify-content: flex-start; }
}
</style>
