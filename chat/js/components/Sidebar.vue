<script setup>
import { ref, computed } from 'vue';
import { useSessions } from '../composables/useSessions.js';
import { useView } from '../composables/useView.js';
import { useAuth } from '../composables/useAuth.js';
import { ASSISTANT_NAME } from '../mock/fixedAnswer.js';

/* 左侧边栏：能力组 + 对话历史 + 使用统计入口
 *
 * 事件：
 *   - new-chat:       点 +新消息
 *   - open-skills:    点「技能」
 *   - demo-notice(name): 点「定时任务/应用授权」
 *   - open-auth:      点左下角「登录」按钮
 */
const emit = defineEmits(['new-chat', 'open-skills', 'demo-notice', 'open-auth']);

const { state, sessionList, selectSession } = useSessions();
const { state: viewState, goStats, goChat } = useView();
const { isLoggedIn, displayName, initial, logout } = useAuth();

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

function onOpenAuth(e) {
  if (e) e.preventDefault();
  emit('open-auth');
}
function onLogout(e) {
  if (e) e.preventDefault();
  logout();
}

const isStatsActive = computed(() => viewState.current === 'stats');
</script>

<template>
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

    <div class="user" :class="{ 'is-guest': !isLoggedIn }">
      <div class="avatar avatar-user" :class="{ 'is-guest': !isLoggedIn }">{{ isLoggedIn ? initial : 'G' }}</div>
      <div class="user-name" :title="displayName">{{ displayName }}</div>
      <button v-if="isLoggedIn"
              type="button"
              class="auth-action-btn auth-action-btn--ghost"
              title="退出登录"
              @click="onLogout">退出</button>
      <button v-else
              type="button"
              class="auth-action-btn auth-action-btn--primary"
              title="登录"
              @click="onOpenAuth">登录</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 232px;
  flex-shrink: 0;
  background: var(--bg-side);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 12px 8px 8px;
}

.brand {
  font-size: 17px;
  font-weight: 700;
  padding: 8px 12px 14px;
  letter-spacing: 0.2px;
}

.nav { flex: 1; overflow-y: auto; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 8px;
  color: var(--text);
  font-size: 13.5px;
  margin: 1px 0;
  cursor: pointer;
}
.nav-item:hover { background: var(--hover); }

.nav-item .ic {
  width: 18px;
  text-align: center;
  font-size: 14px;
  color: var(--text-sub);
}

.nav-new { color: var(--text); font-weight: 500; }

.nav-group { margin-top: 4px; }
.nav-sub {
  display: flex;
  flex-direction: column;
  padding-left: 12px;
  margin: 2px 0 6px;
}
.nav-sub a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
}
.nav-sub a:hover { background: var(--hover); }
.nav-sub .ic { width: 18px; text-align: center; color: var(--text-sub); font-size: 13px; }

.nav-section { margin-top: 10px; }
.nav-section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12.5px;
  color: var(--text-sub);
  cursor: pointer;
  user-select: none;
}
.nav-section-title .caret {
  width: 16px;
  height: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
}
.nav-section-title .caret .caret-ic {
  width: 14px;
  height: 14px;
  display: block;
  transition: transform 180ms ease;
}
/* 折叠态：箭头从「向下 ⌄」旋转到「向右 ›」 */
.nav-section-title.is-collapsed .caret .caret-ic {
  transform: rotate(-90deg);
}
.nav-section-title .section-ic {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
}
.nav-section-title.is-clickable {
  border-radius: 6px;
  margin: 0 4px;
  padding: 6px 8px;
  transition: background 140ms ease, color 140ms ease;
}
.nav-section-title.is-clickable:hover { background: var(--hover); color: var(--text); }
.nav-section-title.is-clickable.is-active {
  background: var(--active);
  color: var(--text);
  font-weight: 600;
}
.nav-section-title.is-clickable.is-active .section-ic { color: var(--text); }
.nav-section-title .section-ic svg {
  width: 14px;
  height: 14px;
  display: block;
}
.nav-section-title .badge {
  margin-left: 4px;
  font-size: 10px;
  background: #eaeaea;
  border-radius: 4px;
  padding: 1px 6px;
  color: var(--text-sub);
}

.nav-section-body { display: flex; flex-direction: column; }

/* 会话列表项 */
.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  position: relative;
}
.session-item:hover { background: var(--hover); }
.session-item.active { background: var(--active); }

.session-item .session-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 9px;
}
.session-item .session-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-item .unread {
  background: var(--primary);
  color: white;
  border-radius: 10px;
  font-size: 10px;
  padding: 1px 6px;
  min-width: 16px;
  text-align: center;
}

/* 父级会话标题（如 "国际站生意助手"） */
.session-parent {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  position: relative;
}
.session-parent:hover { background: var(--hover); }
.session-parent .session-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 父级未读小红标：圆形、轻微上浮、外侧白圈 + 红色阴影，明显但不打扰 */
.session-parent .unread {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef7544;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-1px);
  box-shadow:
    0 0 0 2px #fff,                    /* 外侧白色描边，让红标"贴"在父项上 */
    0 2px 6px rgba(239, 68, 68, 0.40); /* 红色柔光，强化"未读"提示 */
  animation: session-unread-pulse 2.2s ease-out infinite;
}
@keyframes session-unread-pulse {
  0%   { box-shadow: 0 0 0 2px #fff, 0 0 0 0 rgba(239, 68, 68, 0.55); }
  70%  { box-shadow: 0 0 0 2px #fff, 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 2px #fff, 0 0 0 0 rgba(239, 68, 68, 0); }
}

/* 用户区 */
.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-top: 1px solid var(--border);
  margin-top: 6px;
}
.user-name {
  flex: 1;
  font-size: 13.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user.is-guest .user-name { color: var(--text-sub); }
.avatar.avatar-user.is-guest {
  background: linear-gradient(135deg, #b0b6c4 0%, #8a90a3 100%);
}

/* 登录 / 退出按钮：与主题渐变一致，紧凑型 */
.auth-action-btn {
  flex-shrink: 0;
  height: 26px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: filter 0.18s ease, background 0.18s ease,
              color 0.18s ease, border-color 0.18s ease,
              box-shadow 0.18s ease, transform 0.1s ease;
}
.auth-action-btn:active { transform: translateY(1px); }
.auth-action-btn--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #4338ca 0%, #7c3aed 100%);
  box-shadow: 0 4px 10px rgba(67, 56, 202, 0.28);
}
.auth-action-btn--primary:hover {
  filter: brightness(1.06);
  box-shadow: 0 6px 14px rgba(124, 58, 237, 0.36);
}
.auth-action-btn--ghost {
  color: #4338ca;
  background: #ffffff;
  border-color: rgba(67, 56, 202, 0.32);
}
.auth-action-btn--ghost:hover {
  background: rgba(67, 56, 202, 0.08);
  border-color: rgba(67, 56, 202, 0.55);
  color: #3a30b8;
}

/* 响应式：窄屏只显示图标 */
@media (max-width: 720px) {
  .sidebar { width: 64px; padding: 8px 4px; }
  .brand,
  .nav-item span:not(.ic),
  .nav-sub a span:not(.ic),
  .nav-section-title,
  .user-name,
  .auth-action-btn { display: none; }
  .nav-item, .nav-sub a { justify-content: center; padding: 8px; }
}
</style>
