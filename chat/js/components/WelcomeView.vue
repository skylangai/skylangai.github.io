<script setup>
import { ref, computed } from 'vue';
import Composer from './Composer.vue';
import { useAuth } from '../composables/useAuth.js';
import { useI18n } from '../composables/useI18n.js';

const { isLoggedIn } = useAuth();
const { t } = useI18n();

const TABS = computed(() => [
  { id: 'market',  label: t('welcome.tab.market'),  ic: '📊' },
  { id: 'shop',    label: t('welcome.tab.shop'),    ic: '🏬' },
  { id: 'publish', label: t('welcome.tab.publish'), ic: '📦' },
  { id: 'image',   label: t('welcome.tab.image'),   ic: '🖼' },
  { id: 'video',   label: t('welcome.tab.video'),   ic: '🎬' },
  { id: 'decor',   label: t('welcome.tab.decor'),   ic: '🎨' }
]);

const emit = defineEmits(['submit', 'pick-prompt']);

const activeTab = ref('market');
const prompts = computed(() => [
  t('prompt.1'), t('prompt.2'), t('prompt.3'), t('prompt.4'),
  t('prompt.5'), t('prompt.6'), t('prompt.7')
]);

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
      <h1 class="welcome-title">{{ t('welcome.title') }}</h1>

      <Composer ref="composerRef"
                :placeholder="t('welcome.placeholder')"
                send-icon="↑"
                :autofocus="true"
                @submit="onSubmit" />

      <div v-if="!isLoggedIn" class="tabs">
        <button v-for="tab in TABS" :key="tab.id"
                type="button"
                class="tab"
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id">
          <span class="tab-ic">{{ tab.ic }}</span> {{ tab.label }}
        </button>
      </div>

      <div v-if="!isLoggedIn" class="prompts">
        <div class="prompts-title">{{ t('welcome.tryPrompts') }}</div>
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
