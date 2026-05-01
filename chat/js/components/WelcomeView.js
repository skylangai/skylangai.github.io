import { defineComponent, ref, computed } from 'vue';
import { PROMPTS } from '../mock/prompts.js';
import Composer from './Composer.js';

const TABS = [
  { id: 'market',  label: '市场洞察', ic: '📊' },
  { id: 'shop',    label: '店铺分析', ic: '🏬' },
  { id: 'publish', label: '智能发品', ic: '📦' },
  { id: 'image',   label: '创意图片', ic: '🖼' },
  { id: 'video',   label: '创意视频', ic: '🎬' },
  { id: 'decor',   label: '店铺装修', ic: '🎨' }
];

export default defineComponent({
  name: 'WelcomeView',
  components: { Composer },
  emits: ['submit', 'pick-prompt'],
  setup(_, { emit }) {
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

    return { TABS, activeTab, prompts, composerRef, pickPrompt, onSubmit };
  },
  template: `
    <section class="welcome">
      <div class="welcome-inner">
        <div class="welcome-logo">
          <img src="assets/logo.svg" alt="logo" />
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
  `
});
