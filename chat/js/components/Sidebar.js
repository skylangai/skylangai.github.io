import { defineComponent, ref, computed } from 'vue';
import { useSessions } from '../composables/useSessions.js';
import { useView } from '../composables/useView.js';
import { ASSISTANT_NAME } from '../mock/fixedAnswer.js';

/* 左侧边栏：能力组 + 对话历史 + 使用统计入口
 *
 * 事件：
 *   - new-chat:       点 +新消息
 *   - open-skills:    点「技能」
 *   - demo-notice(name): 点「定时任务/应用授权」
 */
export default defineComponent({
  name: 'Sidebar',
  emits: ['new-chat', 'open-skills', 'demo-notice'],
  setup(_, { emit }) {
    const { state, sessionList, selectSession } = useSessions();
    const { state: viewState, goStats, goChat } = useView();

    const collapsed = ref(false);

    function toggleCollapsed() {
      collapsed.value = !collapsed.value;
    }

    function pickSession(id) {
      selectSession(id);
      /* 选中会话后必须同时切到对话视图，否则用户停在欢迎/统计页看不到效果 */
      goChat();
    }

    function onNewChat(e) {
      e.preventDefault();
      emit('new-chat');
    }
    function onOpenSkills(e) {
      e.preventDefault();
      emit('open-skills');
    }
    function onDemoNotice(name, e) {
      e.preventDefault();
      emit('demo-notice', name);
    }
    function onGoStats() {
      goStats();
    }

    const isStatsActive = computed(() => viewState.current === 'stats');

    return {
      state, sessionList, collapsed, toggleCollapsed,
      ASSISTANT_NAME,
      pickSession, onNewChat, onOpenSkills, onDemoNotice, onGoStats,
      isStatsActive
    };
  },
  template: `
    <aside class="sidebar">
      <div class="brand">凌云AI</div>

      <nav class="nav">
        <a class="nav-item nav-new" href="#" @click="onNewChat">
          <span class="ic">＋</span>新消息
        </a>

        <div class="nav-group">
          <a class="nav-item" href="#" @click.prevent><span class="ic">⚡</span>能力</a>
          <div class="nav-sub">
            <a href="#" @click="onOpenSkills"><span class="ic">✦</span>技能</a>
            <a href="#" @click="onDemoNotice('定时任务', $event)"><span class="ic">⏱</span>定时任务</a>
            <a href="#" @click="onDemoNotice('应用授权', $event)"><span class="ic">🔗</span>应用授权</a>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-section-title" :class="{ 'is-collapsed': collapsed }" @click="toggleCollapsed">
            <span class="caret" aria-hidden="true">
              <svg class="caret-ic" viewBox="0 0 12 12" focusable="false">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
                      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span> 对话历史
          </div>
          <div class="nav-section-body" v-show="!collapsed">
            <!-- 父级（电商智能生意助手） + 未读 -->
            <div v-if="sessionList.length > 0" class="session-parent">
              <span class="session-icon">A</span>
              <span class="session-title">{{ ASSISTANT_NAME }}</span>
              <span class="unread">{{ sessionList.length }}</span>
            </div>
            <div v-for="s in sessionList" :key="s.id"
                 class="session-item"
                 :class="{ active: s.id === state.currentSessionId }"
                 @click="pickSession(s.id)">
              <span class="session-title">{{ s.title }}</span>
              <span class="caret-sm" style="color:#9aa0a6">○</span>
            </div>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-section-title is-clickable"
               :class="{ 'is-active': isStatsActive }"
               @click="onGoStats">
            <span class="section-ic" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <rect x="4"   y="13" width="3.2" height="7"  rx="1" fill="currentColor"/>
                <rect x="10.4" y="9"  width="3.2" height="11" rx="1" fill="currentColor"/>
                <rect x="16.8" y="5"  width="3.2" height="15" rx="1" fill="currentColor"/>
              </svg>
            </span> 使用统计
          </div>
        </div>
      </nav>

      <div class="user">
        <div class="avatar avatar-user">L</div>
        <div class="user-name">Lin Yun</div>
      </div>
    </aside>
  `
});
