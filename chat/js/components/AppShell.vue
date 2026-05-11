<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useView } from '../composables/useView.js';
import { useSessions } from '../composables/useSessions.js';
import { useModels } from '../composables/useModels.js';
import { useAuth } from '../composables/useAuth.js';
import { useFinance } from '../composables/useFinance.js';
import { DEBUG } from '../api/config.js';
import { sendMessage as apiSendMessage, uploadAttachments } from '../api/chat.js';
import { FIXED_ANSWER, ASSISTANT_NAME } from '../mock/fixedAnswer.js';

import Sidebar from './Sidebar.vue';
import FloatActions from './FloatActions.vue';
import WelcomeView from './WelcomeView.vue';
import ChatView from './ChatView.vue';
import StatsView from './StatsView.vue';
import ContactModal from './ContactModal.vue';
import SkillsModal from './SkillsModal.vue';
import NoticeModal from './NoticeModal.vue';
import AuthModal from './AuthModal.vue';

/* DEBUG 模式下"假装"thinking 阶段会展示的工具调用占位（仅 UI mock）。
 * 非 DEBUG 模式下默认空：真实 thinking/工具事件由后端 SSE thinking 事件实时下发，
 * 没有就保持空，避免误导用户以为模型真做了某些操作。 */
const MOCK_DEFAULT_TOOLS = [
  { name: 'Read', args: ['…6136-5293-817403/agent-core/skills/alibaba-hot-product-insight/SKILL.md'] },
  { name: 'Cron list', args: [] },
  { name: 'Bash', args: [
      'Read skill memory for hot product insight',
      'python /Users/linxie/.claw/accounts/1755404055/agen…'
    ]
  }
];
const DEFAULT_TOOLS = DEBUG ? MOCK_DEFAULT_TOOLS : [];

const ANIM_MIN_MS = 1500; // DEBUG 模式下"假装"loading 至少这么久，避免一闪而过
const GUEST_ANIM_MIN_MS = 800; // 游客 mock 比 DEBUG 短一点，少耗用户耐心

/* 未登录访客发送时给的本地 mock 答复——纯前端，不打后端、不计费、不入库。
 * 用 Markdown，让 MessageItem.vue 自然渲染列表 / 加粗 / 链接。 */
const GUEST_MOCK_ANSWER =
  '👋 您当前是 **游客模式**，可以体验对话框；要解锁完整能力请先登录或注册：\n\n' +
  '- 真实大模型回答（含联网检索）\n' +
  '- 多轮上下文记忆 / 历史会话保存\n' +
  '- 文件附件（PDF / Word / Markdown / TXT）解析\n' +
  '- 用量与额度统计\n\n' +
  '点击侧栏底部的「**登录 / 注册**」即可继续。';

const view = useView();
const { state: viewState, isWelcome, isChat, isStats, goWelcome, goChat } = view;
const sess = useSessions();
const { state: modelState } = useModels();
const auth = useAuth();
const fin = useFinance();

/* 顶部 mobile bar 的标题：随当前视图 / 当前会话变化 */
const mobileTitle = computed(() => {
  if (isStats.value) return '使用统计';
  if (isChat.value) {
    const cur = sess.currentSession.value;
    if (cur && cur.title) return cur.title;
  }
  return ASSISTANT_NAME || '凌云 AI';
});

/* drawer 打开时锁住 <html> 滚动，避免抽屉里滑动手势穿透到主区。
 * 切回 false 或组件销毁都要恢复，否则页面变成"死页"。 */
watch(() => view.state.drawerOpen, (open) => {
  const html = document.documentElement;
  if (!html) return;
  if (open) {
    html.dataset.prevOverflow = html.style.overflow || '';
    html.style.overflow = 'hidden';
  } else {
    html.style.overflow = html.dataset.prevOverflow || '';
    delete html.dataset.prevOverflow;
  }
});

/* Esc 关掉抽屉（移动端有外接键盘 / iPad 场景） */
function onKeydown(e) {
  if (e.key === 'Escape' && view.state.drawerOpen) view.closeDrawer();
}

/* 启动时调一次 /me 恢复登录态：cookie 在 → 自动恢复；cookie 失效 → 弹出登录可由用户自助 */
onMounted(() => {
  auth.bootstrap();
  window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  // 兜底恢复 overflow，避免组件被销毁时抽屉还开着
  const html = document.documentElement;
  if (html) html.style.overflow = html.dataset.prevOverflow || '';
});

/* 顶部"用户/登录"按钮：登录后点头像 → 弹登录改成（暂时不做 user sheet）打开登录模态；
 * 未登录 → 直接打开登录。两种情况都顺手关掉抽屉，让模态在干净背景上展示。 */
function onMobileAvatarClick() {
  view.closeDrawer();
  if (auth.isLoggedIn.value) {
    // 登录态下点头像，给"退出"快速入口；目前简化为直接弹登录模态
    // （登录模态在已登录态下会显示"已登录"提示，体验也合理）
    openAuth();
  } else {
    openAuth();
  }
}

/* ============== Modal 开关 ============== */
const contactOpen = ref(false);
const skillsOpen  = ref(false);
const noticeOpen  = ref(false);
const authOpen    = ref(false);
const noticeFeature = ref('');

function openContact() { contactOpen.value = true; }
function openSkills()  { skillsOpen.value = true; }
function openAuth()    { authOpen.value    = true; }
function openNotice(feature) {
  noticeFeature.value = feature || '';
  noticeOpen.value = true;
}

/* NoticeModal 的「联系我们」事件：先关 notice 再开 contact
 * （NoticeModal 内部已先关自己再 emit('contact')） */
function onNoticeContact() {
  openContact();
}

/* ============== 业务流程 ============== */

/* 顶部 +新消息：清空当前 session，回欢迎页（保留所有历史） */
function onNewChat() {
  sess.clearCurrent();
  goWelcome();
}

/* 欢迎页 / 对话页 composer 的统一发送入口 */
function onSubmit({ text, attachments }) {
  handleSend(text, attachments);
}

function handleSend(text, attachments) {
  if (!text && (!attachments || attachments.length === 0)) return;

  /* 1) 决定目标会话：当前没有则创建 */
  let targetSession = sess.currentSession.value;
  let isFirstMessage = false;
  if (!targetSession) {
    targetSession = sess.createSession();
    isFirstMessage = true;
  }
  const sessionIdAtSend = targetSession.id;

  /* 2) 切到对话视图 */
  goChat();

  /* 3) 首次消息派生 title */
  if (isFirstMessage) {
    sess.setTitle(sessionIdAtSend, sess.deriveTitle(text, attachments));
  }

  /* 4) 追加 user 消息（仅元数据，不放 File 对象） */
  const userAttachmentsMeta = (attachments || []).map((a) => ({
    name: a.name, size: a.size, type: a.type
  }));
  sess.appendMessage(sessionIdAtSend, {
    id: 'm_' + Date.now() + '_u',
    role: 'user',
    content: text || '',
    attachments: userAttachmentsMeta
  });

  /* 5) 追加 assistant 占位（live 形态）
   * 注意：push 进 reactive 数组的 raw 对象不会被自动转成 Proxy；
   * Vue 3 只追踪通过 Proxy 的写入，所以必须用「数组里返回的那一份」去 mutate，
   * 否则后续把 pending 改成 false 视图不会刷新。 */
  sess.appendMessage(sessionIdAtSend, {
    id: 'm_' + Date.now() + '_a',
    role: 'assistant',
    content: '',
    _liveFlags: {
      // 取独立副本：避免多条 placeholder 共享同一个数组引用，
      // 后续 onThinking push 才不会串扰到其它消息。
      tools: DEFAULT_TOOLS.slice(),
      elapsed: 0,
      pending: true
    }
  });
  const msgs = sess.state.sessions[sessionIdAtSend].messages;
  const placeholder = msgs[msgs.length - 1];

  /* 6) 触发上传（演示模式下空跑） */
  uploadAttachments(attachments, sessionIdAtSend).catch((err) => {
    console.warn('[upload] failed', err);
  });

  /* 7) 触发对话请求 */
  const startTs = Date.now();

  /* 7a) 未登录：完全不打后端，本地给一段 mock 答复引导用户登录。
   * - 不调 apiSendMessage（也就不会出现 "未登录" 红色错误气泡）
   * - 不计费、不入库；session 仍然是 localOnly，刷新就消失
   * - 让 finalize 加点延迟，让用户能看到 typing 动画 */
  if (!auth.isLoggedIn.value) {
    setTimeout(() => finalizeGuestMock(placeholder, startTs), GUEST_ANIM_MIN_MS);
    return;
  }

  /* 给 apiSendMessage 的是带 .file 的"原始 attachments"，
   * api/chat.js 里会读成 base64 再发；UI / DB 里仍只看 userAttachmentsMeta。 */
  if (DEBUG) {
    /* DEBUG: 老 mock 行为，假装 ANIM_MIN_MS 后用 FIXED_ANSWER 收尾 */
    apiSendMessage({
      sessionId: sessionIdAtSend,
      message: text,
      model: modelState.currentModelId,
      attachments: attachments
    }).finally(() => {
      const waited = Date.now() - startTs;
      const wait = Math.max(0, ANIM_MIN_MS - waited);
      setTimeout(() => finalizeMock(placeholder, startTs), wait);
    });
    return;
  }

  /* 非 DEBUG：走 SSE，实时按 token 增量拼到 placeholder.content */
  let toolsLive = [];     // 由真后端 thinking 事件累积，替换 DEFAULT_TOOLS
  let acc = '';
  apiSendMessage(
    {
      sessionId: sessionIdAtSend,
      message: text,
      model: modelState.currentModelId,
      attachments: attachments
    },
    {
      onThinking: (d) => {
        // backend: { type:'tool_call', tool:'READ'|'WRITE'|'BASH', summary }
        toolsLive.push({
          name: (d && d.tool) || 'Tool',
          args: d && d.summary ? [d.summary] : []
        });
        placeholder._liveFlags.tools = toolsLive.slice();
      },
      onChunk: (d) => {
        if (!d || typeof d.delta !== 'string') return;
        acc += d.delta;
        placeholder.content = acc;
        // 第一个 chunk 到达就退出 loading，UI 即可"打字"展示
        if (placeholder._liveFlags.pending) {
          placeholder._liveFlags.pending = false;
        }
      },
      onDone: (d) => {
        if (d && typeof d.message === 'string' && !acc) {
          // 兜底：万一一个 chunk 都没到，用 done.message 一次性填
          placeholder.content = d.message;
        }
        placeholder._liveFlags.pending = false;
        placeholder._liveFlags.elapsed = Math.max(1, Math.round((Date.now() - startTs) / 1000));
        // 计费 / 余额增量
        fin.applyTurnDelta({ usage: d && d.usage, balance: d && d.balance });
        // 第一轮对话之后，本会话从此被标记为"已加载完整 messages"，
        // 重新点击侧栏不会再 POST /chat/messages。
        const cur = sess.state.sessions[sessionIdAtSend];
        if (cur) cur.loaded = true;
        // SSE 完成 = 后端已经 _persist_turn 落库；摘掉 localOnly，
        // 让下次 ingestFromServer 排序按 updatedAt 来，不要永远钉在最顶部。
        sess.markPersisted(sessionIdAtSend);
      },
      onError: (d) => {
        const m = (d && d.message) || '请求失败';
        placeholder.content = '⚠️ ' + m;
        placeholder._liveFlags.pending = false;
        placeholder._liveFlags.elapsed = Math.max(1, Math.round((Date.now() - startTs) / 1000));
        // 余额不足 / 未登录 等错误：考虑弹登录框
        if (d && d.code === 1030) {
          openAuth();
        }
      }
    }
  );
}

/* DEBUG 模式收尾：固定回答 */
function finalizeMock(placeholder, startTs) {
  const elapsedSec = Math.max(1, Math.round((Date.now() - startTs) / 1000));
  placeholder.content = FIXED_ANSWER;
  placeholder._liveFlags.pending = false;
  placeholder._liveFlags.elapsed = elapsedSec;
}

/* 游客 mock 收尾：本地引导文案，不与 DEBUG mock 共用避免文案串台 */
function finalizeGuestMock(placeholder, startTs) {
  const elapsedSec = Math.max(1, Math.round((Date.now() - startTs) / 1000));
  placeholder.content = GUEST_MOCK_ANSWER;
  placeholder._liveFlags.pending = false;
  placeholder._liveFlags.elapsed = elapsedSec;
  // 工具栏清空——游客没有真正的 thinking / tool_call 阶段
  placeholder._liveFlags.tools = [];
}
</script>

<template>
  <div class="app" :class="{ 'drawer-open': view.state.drawerOpen }">
    <!-- ===== 仅窄屏可见的顶部条：汉堡 + 标题 + 头像/登录 =====
         desktop 上 display:none，不影响原布局 -->
    <header class="mobile-bar" role="banner">
      <button type="button"
              class="mobile-bar-btn"
              :aria-label="view.state.drawerOpen ? '关闭菜单' : '打开菜单'"
              @click="view.toggleDrawer">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round"/>
        </svg>
      </button>

      <div class="mobile-bar-title" :title="mobileTitle">{{ mobileTitle }}</div>

      <button v-if="auth.isLoggedIn.value"
              type="button"
              class="mobile-bar-avatar"
              :aria-label="'当前账号 ' + auth.displayName.value"
              @click="onMobileAvatarClick">
        <span class="mobile-bar-avatar-letter">{{ auth.initial.value }}</span>
      </button>
      <button v-else
              type="button"
              class="mobile-bar-login"
              aria-label="登录或注册"
              @click="onMobileAvatarClick">登录</button>
    </header>

    <!-- ===== 侧栏包裹：desktop 平铺，mobile 抽屉 ===== -->
    <div class="sidebar-wrapper" :class="{ 'is-open': view.state.drawerOpen }">
      <Sidebar
        @new-chat="onNewChat"
        @open-skills="openSkills"
        @demo-notice="openNotice"
        @open-auth="openAuth" />
    </div>

    <!-- mobile 抽屉打开时的半透明遮罩；点击即关 -->
    <div v-if="view.state.drawerOpen"
         class="drawer-backdrop"
         aria-hidden="true"
         @click="view.closeDrawer"></div>

    <main class="main">
      <FloatActions @open-contact="openContact" />

      <WelcomeView v-show="isWelcome" @submit="onSubmit" />
      <ChatView    v-show="isChat"    @submit="onSubmit" />
      <StatsView   v-show="isStats" />
    </main>

    <ContactModal v-model:open="contactOpen" />
    <SkillsModal  v-model:open="skillsOpen" @demo-notice="openNotice" />
    <NoticeModal  v-model:open="noticeOpen" :feature="noticeFeature" @contact="onNoticeContact" />
    <AuthModal    v-model:open="authOpen" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  /* 100vh 在 iOS Safari 会算上工具栏导致内容被裁；100dvh 是动态视口高度，新版浏览器主流支持。
     双兜底：旧浏览器走 100vh，新浏览器自动用 100dvh。 */
  height: 100vh;
  height: 100dvh;
  width: 100vw;
  overflow: hidden;
}

/* 默认（>720px）：sidebar-wrapper 就是普通 flex item，跟 main 并排，不浮起来 */
.sidebar-wrapper {
  flex-shrink: 0;
  display: flex;          /* 让里面的 .sidebar 能撑满高度 */
  min-height: 0;
}

.main {
  flex: 1;
  min-width: 0;           /* 关键：防止子元素（如长 prompt）撑爆 flex 容器 */
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  position: relative;
  overflow: hidden;
}

/* 顶部 mobile bar：默认隐藏，仅 ≤720px 显示 */
.mobile-bar { display: none; }

/* drawer backdrop：默认隐藏，仅在 mobile 抽屉打开时启用 */
.drawer-backdrop { display: none; }

@media (max-width: 720px) {
  /* 改为列布局：mobile-bar 顶在最上 → main 占剩余高度 → 抽屉绝对定位浮在最上层 */
  .app {
    flex-direction: column;
  }

  .mobile-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 52px;
    padding: 0 12px;
    /* iPhone 横屏时左右安全区也避开（刘海会侵入） */
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
    background: var(--bg-side);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    z-index: 50;
  }

  .mobile-bar-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 140ms ease;
  }
  .mobile-bar-btn:hover,
  .mobile-bar-btn:active { background: var(--hover); }

  .mobile-bar-title {
    flex: 1;
    min-width: 0;
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    /* 标题过长省略号；中间居中显示 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-bar-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: linear-gradient(135deg, var(--primary), #7c3aed);
    box-shadow: 0 1px 3px rgba(67, 56, 202, 0.25);
  }
  .mobile-bar-avatar-letter {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }
  .mobile-bar-login {
    height: 30px;
    padding: 0 14px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    color: #ffffff;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    background: linear-gradient(135deg, #4338ca 0%, #7c3aed 100%);
    box-shadow: 0 4px 10px rgba(67, 56, 202, 0.28);
  }
  .mobile-bar-login:active { transform: translateY(1px); }

  /* sidebar 抽屉化：fixed 浮在最上层，translateX(-100%) 默认收起 */
  .sidebar-wrapper {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(85vw, 320px);
    z-index: 1100;
    background: var(--bg-side);
    box-shadow: 4px 0 24px rgba(15, 22, 50, 0.18);
    transform: translateX(-100%);
    transition: transform 220ms cubic-bezier(0.2, 0.8, 0.25, 1);
    /* 抽屉自身能滚（如历史会话很多） */
    overflow-y: auto;
    /* iOS 顶部安全区：让侧栏顶部留出刘海空间 */
    padding-top: env(safe-area-inset-top);
  }
  .sidebar-wrapper.is-open { transform: translateX(0); }

  .drawer-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 22, 50, 0.45);
    z-index: 1090;
    animation: drawer-backdrop-fadein 180ms ease-out;
  }

  /* 让 main 占满剩余高度（mobile bar 之下） */
  .main {
    flex: 1;
    min-height: 0;
  }
}

@keyframes drawer-backdrop-fadein {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
