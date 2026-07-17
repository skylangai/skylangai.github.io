<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useSessions } from '../composables/useSessions.js';
import { useView } from '../composables/useView.js';
import { useAuth } from '../composables/useAuth.js';
import {
  loadMessages as apiLoadMessages,
  deleteSession as apiDeleteSession
} from '../api/chat.js';
import { useI18n } from '../composables/useI18n.js';

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
const { state: viewState, goStats, goChat, goRecharge, closeDrawer } = useView();
const { isLoggedIn, displayName, initial, logout } = useAuth();
const { t } = useI18n();

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
  const ok = window.confirm(t('nav.deleteConfirm', { title }));
  if (!ok) return;

  deletingId.value = id;
  try {
    const res = await apiDeleteSession(id);
    if (res && (res.ok || res.code === 1050)) {
      // ok: 后端确实删了；1050: 后端已经没这条 session（可能在别端删过），本地一并清掉
      removeSession(id);
    } else {
      window.alert(t('nav.deleteFail', {
        msg: (res && res.message) ? res.message : t('nav.unknownError')
      }));
    }
  } catch (e) {
    window.alert(t('nav.deleteFail', { msg: (e && e.message) || e }));
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

/* 抽屉模式下，任何"目的性的导航/动作"完成后都顺手收起抽屉，避免它继续遮挡主区。
 * 桌面端 closeDrawer 是 no-op（drawerOpen 一直为 false 也不影响布局）。 */
function onNewChat(e) {
  e.preventDefault();
  closeDrawer();
  emit('new-chat');
}
function onOpenSkills(e) {
  e.preventDefault();
  closeDrawer();
  emit('open-skills');
}
function onDemoNotice(name, e) {
  e.preventDefault();
  closeDrawer();
  emit('demo-notice', name);
}
function onGoStats() {
  closeDrawer();
  goStats();
}
function onGoRecharge() {
  closeDrawer();
  goRecharge();
}

function onOpenAuth(e) {
  if (e) e.preventDefault();
  closeDrawer();
  emit('open-auth');
}
function onLogout(e) {
  if (e) e.preventDefault();
  closeDrawer();
  logout();
}

const isStatsActive = computed(() => viewState.current === 'stats');
const isRechargeActive = computed(() => viewState.current === 'recharge');
</script>

<template>
  <aside class="sidebar">
    <div class="brand">{{ t('brand.name') }}</div>

    <nav class="nav">
      <a class="nav-item nav-new" href="#" @click="onNewChat">
        <span class="ic">＋</span>{{ t('nav.newChat') }}
      </a>

      <div class="nav-group">
        <a class="nav-item" href="#" @click.prevent><span class="ic">⚡</span>{{ t('nav.capabilities') }}</a>
        <div class="nav-sub">
          <a href="#" @click="onOpenSkills"><span class="ic">✦</span>{{ t('nav.skills') }}</a>
          <a href="#" @click="onDemoNotice('cron', $event)"><span class="ic">⏱</span>{{ t('nav.cron') }}</a>
          <a href="#" @click="onDemoNotice('oauth', $event)"><span class="ic">🔗</span>{{ t('nav.oauth') }}</a>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title" :class="{ 'is-collapsed': collapsed }" @click="toggleCollapsed">
          <span class="caret" aria-hidden="true">
            <svg class="caret-ic" viewBox="0 0 12 12" focusable="false">
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span> {{ t('nav.history') }}
        </div>
        <div class="nav-section-body" v-show="!collapsed">
          <!-- 父级（电商智能生意助手）：仅显示标题，去掉未读小红标 -->
          <div v-if="sessionList.length > 0" class="session-parent">
            <span class="session-icon" aria-hidden="true">
              <!-- 4-pointed sparkle：AI 助手的常见视觉符号（Gemini / Claude 同款思路）-->
              <svg viewBox="0 0 24 24" fill="currentColor"
                   xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.4c.3 0 .55.2.62.49l1.05 4.2a4 4 0 0 0 2.92 2.92l4.2 1.05a.64.64 0 0 1 0 1.24l-4.2 1.05a4 4 0 0 0-2.92 2.92l-1.05 4.2a.64.64 0 0 1-1.24 0l-1.05-4.2a4 4 0 0 0-2.92-2.92l-4.2-1.05a.64.64 0 0 1 0-1.24l4.2-1.05a4 4 0 0 0 2.92-2.92l1.05-4.2A.64.64 0 0 1 12 2.4Z"/>
              </svg>
            </span>
            <span class="session-title">{{ t('brand.assistant') }}</span>
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
             :class="{ 'is-active': isRechargeActive }"
             @click="onGoRecharge">
          <span class="section-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <!-- 钱包 / 卡片 + 加号：与 "充值" 语义贴合，且不撞 "使用统计" 的柱状图 -->
              <rect x="3.5" y="6"  width="17" height="12" rx="2"
                    fill="none" stroke="currentColor" stroke-width="1.7"/>
              <path d="M3.5 10h17" stroke="currentColor" stroke-width="1.7" fill="none"/>
              <path d="M16.2 14.2v3M14.7 15.7h3" stroke="currentColor"
                    stroke-width="1.7" fill="none" stroke-linecap="round"/>
            </svg>
          </span> {{ t('nav.recharge') }}
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
          </span> {{ t('nav.stats') }}
        </div>
      </div>
    </nav>

    <div class="user" :class="{ 'is-guest': !isLoggedIn }">
      <div class="avatar avatar-user" :class="{ 'is-guest': !isLoggedIn }">{{ isLoggedIn ? initial : 'G' }}</div>
      <div class="user-name" :title="displayName">{{ displayName }}</div>
      <button v-if="isLoggedIn"
              type="button"
              class="auth-action-btn auth-action-btn--ghost"
              :title="t('nav.logoutTitle')"
              @click="onLogout">{{ t('nav.logout') }}</button>
      <button v-else
              type="button"
              class="auth-action-btn auth-action-btn--primary"
              :title="t('nav.login')"
              @click="onOpenAuth">{{ t('nav.login') }}</button>
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
          <span>{{ t('nav.deleteSession') }}</span>
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

/* 通用：无论挂在 .session-parent 还是未来出现在 .session-item 上都生效。
 * 之所以列两条而不是只写 .session-icon，是为了让 scoped 选择器更明确，
 * 避免被全站其他 .session-icon（若有）误命中。 */
.session-parent .session-icon,
.session-item .session-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  /* 比纯色更有质感的渐变，沿用主色调 */
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 1px 3px rgba(67, 56, 202, 0.25);
}
.session-parent .session-icon svg,
.session-item .session-icon svg {
  width: 11px;
  height: 11px;
  display: block;
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

/* 响应式：
 * - 历史方案是把 sidebar 强行缩成 64px 图标条，导致登录按钮、历史会话标题全部不可读。
 * - 现在改为"抽屉模式"：sidebar 由 AppShell 的 .sidebar-wrapper 包裹后绝对定位、
 *   滑入滑出。这里的 sidebar 自身只需保证两点：
 *     1) 在抽屉宽度（min(85vw,320px)）下能撑满；
 *     2) 文字 / 登录按钮 / 章节标题等保持完整可见，不再隐藏；
 *     3) 触摸目标加大到至少 ~40px 高度，更适合手指点击。
 */
@media (max-width: 720px) {
  .sidebar {
    width: 100%;
    padding: 14px 10px 10px;
  }
  .brand { font-size: 18px; padding: 8px 12px 16px; }

  /* 触摸友好：行高与左右内边距略放大 */
  .nav-item       { padding: 10px 12px; font-size: 14px; }
  .nav-sub a      { padding: 9px 12px;  font-size: 13.5px; }
  .session-item,
  .session-parent { padding: 10px 10px 10px 22px; font-size: 14px; }

  /* 用户区（底部登录/退出）也加大触摸目标 */
  .user { padding: 12px 10px; }
  .auth-action-btn { height: 30px; font-size: 13px; }
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
