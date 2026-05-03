<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useSessions } from '../composables/useSessions.js';
import { useView } from '../composables/useView.js';
import { useAuth } from '../composables/useAuth.js';
import { ASSISTANT_NAME } from '../mock/fixedAnswer.js';
import {
  loadMessages as apiLoadMessages,
  deleteSession as apiDeleteSession
} from '../api/chat.js';

/* 左侧边栏：能力组 + 对话历史 + 使用统计入口
 *
 * 事件：
 *   - new-chat:       点 +新消息
 *   - open-skills:    点「技能」
 *   - demo-notice(name): 点「定时任务/应用授权」
 *   - open-auth:      点左下角「登录」按钮
 */
const emit = defineEmits(['new-chat', 'open-skills', 'demo-notice', 'open-auth']);

const {
  state, sessionList, selectSession,
  replaceMessages, markLoaded, removeSession
} = useSessions();
const { state: viewState, goStats, goChat } = useView();
const { isLoggedIn, displayName, initial, logout } = useAuth();

const collapsed = ref(false);
/* 防止用户在请求未回来时连点同一个会话，发出多次 POST /chat/messages */
const fetchingId = ref('');

/* 右键菜单状态：x/y 是 fixed 坐标；sessionId 选中要操作的会话；显式控制开关 */
const ctxMenu = ref({ open: false, x: 0, y: 0, sessionId: '' });
/* 删除中的 sessionId（防重复点击 + 视觉禁用） */
const deletingId = ref('');

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
}

async function pickSession(id) {
  selectSession(id);
  /* 选中会话后必须同时切到对话视图，否则用户停在欢迎/统计页看不到效果 */
  goChat();

  /* 首次点击且后端尚未加载过：拉一次完整 messages；之后命中前端缓存不再发请求 */
  const sess = state.sessions[id];
  if (!sess || sess.loaded) return;
  if (fetchingId.value === id) return;
  fetchingId.value = id;
  try {
    const res = await apiLoadMessages(id);
    if (res && res.ok && Array.isArray(res.messages)) {
      replaceMessages(id, res.messages);
    } else {
      // 失败也置 loaded：避免每次点都重打；用户可下次新对话产生数据
      markLoaded(id, true);
      console.warn('[chat] loadMessages failed:', res);
    }
  } catch (e) {
    markLoaded(id, true);
    console.warn('[chat] loadMessages error:', e);
  } finally {
    fetchingId.value = '';
  }
}

/* 右键弹出菜单 */
function openCtxMenu(e, id) {
  e.preventDefault();
  e.stopPropagation();
  // 边界保护：菜单尺寸 ~ 140 x 44，避免戳出视窗
  const W = 144, H = 48;
  const x = Math.min(e.clientX, window.innerWidth  - W - 8);
  const y = Math.min(e.clientY, window.innerHeight - H - 8);
  ctxMenu.value = { open: true, x, y, sessionId: id };
}
function closeCtxMenu() {
  ctxMenu.value.open = false;
  ctxMenu.value.sessionId = '';
}

/* 删除：先 confirm，避免误删历史 */
async function confirmDelete() {
  const id = ctxMenu.value.sessionId;
  closeCtxMenu();
  if (!id || deletingId.value) return;
  const sess = state.sessions[id];
  const title = (sess && sess.title) ? sess.title : id;
  const ok = window.confirm(`确认删除会话「${title}」？\n该会话的所有消息都会被永久删除。`);
  if (!ok) return;

  deletingId.value = id;
  try {
    const res = await apiDeleteSession(id);
    if (res && (res.ok || res.code === 1050)) {
      // ok: 后端确实删了；1050: 后端已经没这条 session（可能在别端删过），本地一并清掉
      removeSession(id);
    } else {
      window.alert('删除失败：' + (res && res.message ? res.message : '未知错误'));
    }
  } catch (e) {
    window.alert('删除失败：' + (e && e.message || e));
  } finally {
    deletingId.value = '';
  }
}

/* 全局点击 / Esc / 滚动 一律收起菜单 */
function onGlobalClick(e) {
  if (!ctxMenu.value.open) return;
  // 菜单自身的点击不冒泡到这里（template 上 stop），所以一律关
  closeCtxMenu();
}
function onGlobalKey(e) {
  if (e.key === 'Escape') closeCtxMenu();
}
onMounted(() => {
  window.addEventListener('click', onGlobalClick);
  window.addEventListener('keydown', onGlobalKey);
  window.addEventListener('scroll', closeCtxMenu, true);
  window.addEventListener('resize', closeCtxMenu);
});
onBeforeUnmount(() => {
  window.removeEventListener('click', onGlobalClick);
  window.removeEventListener('keydown', onGlobalKey);
  window.removeEventListener('scroll', closeCtxMenu, true);
  window.removeEventListener('resize', closeCtxMenu);
});

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
          <!-- 父级（电商智能生意助手）：仅显示标题，去掉未读小红标 -->
          <div v-if="sessionList.length > 0" class="session-parent">
            <span class="session-icon">A</span>
            <span class="session-title">{{ ASSISTANT_NAME }}</span>
          </div>
          <div v-for="s in sessionList" :key="s.id"
               class="session-item"
               :class="{ active: s.id === state.currentSessionId, 'is-deleting': s.id === deletingId }"
               @click="pickSession(s.id)"
               @contextmenu="openCtxMenu($event, s.id)">
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

    <!-- 右键浮动菜单（fixed 定位，跳出 sidebar 滚动容器） -->
    <Teleport to="body">
      <div v-if="ctxMenu.open"
           class="session-ctx-menu"
           role="menu"
           :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
           @click.stop>
        <button type="button" class="session-ctx-item is-danger" @click="confirmDelete">
          <span class="ic">🗑</span>
          <span>删除会话</span>
        </button>
      </div>
    </Teleport>
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
.session-item.is-deleting { opacity: 0.45; pointer-events: none; }

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

<!-- 非 scoped：Teleport 到 body 的右键菜单使用 -->
<style>
.session-ctx-menu {
  position: fixed;
  z-index: 10000;
  min-width: 144px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 12px 32px rgba(15, 22, 50, 0.18),
              0 4px 12px rgba(15, 22, 50, 0.10);
  animation: session-ctx-pop 120ms cubic-bezier(0.2, 0.8, 0.25, 1);
}
@keyframes session-ctx-pop {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
.session-ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease, color 120ms ease;
}
.session-ctx-item:hover { background: var(--hover); }
.session-ctx-item.is-danger { color: #ef4444; }
.session-ctx-item.is-danger:hover { background: rgba(239, 68, 68, 0.10); }
.session-ctx-item .ic { width: 16px; text-align: center; font-size: 13px; }
</style>
