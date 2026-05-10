<script setup>
import { ref, onMounted } from 'vue';
import { useView } from '../composables/useView.js';
import { useSessions } from '../composables/useSessions.js';
import { useModels } from '../composables/useModels.js';
import { useAuth } from '../composables/useAuth.js';
import { useFinance } from '../composables/useFinance.js';
import { DEBUG } from '../api/config.js';
import { sendMessage as apiSendMessage, uploadAttachments } from '../api/chat.js';
import { FIXED_ANSWER } from '../mock/fixedAnswer.js';

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

const { state: viewState, isWelcome, isChat, isStats, goWelcome, goChat } = useView();
const sess = useSessions();
const { state: modelState } = useModels();
const auth = useAuth();
const fin = useFinance();

/* 启动时调一次 /me 恢复登录态：cookie 在 → 自动恢复；cookie 失效 → 弹出登录可由用户自助 */
onMounted(() => { auth.bootstrap(); });

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
  <div class="app">
    <Sidebar
      @new-chat="onNewChat"
      @open-skills="openSkills"
      @demo-notice="openNotice"
      @open-auth="openAuth" />

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
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  position: relative;
  overflow: hidden;
}
</style>
