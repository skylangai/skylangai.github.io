<script setup>
import { ref } from 'vue';
import { useView } from '../composables/useView.js';
import { useSessions } from '../composables/useSessions.js';
import { useModels } from '../composables/useModels.js';
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

/* 模拟 AJAX 在 finalize 之前会顺序展示的工具调用（仅 UI mock） */
const DEFAULT_TOOLS = [
  { name: 'Read', args: ['…6136-5293-817403/agent-core/skills/alibaba-hot-product-insight/SKILL.md'] },
  { name: 'Cron list', args: [] },
  { name: 'Bash', args: [
      'Read skill memory for hot product insight',
      'python /Users/linxie/.claw/accounts/1755404055/agen…'
    ]
  }
];

const ANIM_MIN_MS = 1500; // 即使 fake API 即时返回，也至少 loading 这么久，更像真请求

const { state: viewState, isWelcome, isChat, isStats, goWelcome, goChat } = useView();
const sess = useSessions();
const { state: modelState } = useModels();

/* ============== Modal 开关 ============== */
const contactOpen = ref(false);
const skillsOpen  = ref(false);
const noticeOpen  = ref(false);
const noticeFeature = ref('');

function openContact() { contactOpen.value = true; }
function openSkills()  { skillsOpen.value = true; }
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
      tools: DEFAULT_TOOLS,
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

  /* 7) 触发 AJAX */
  const startTs = Date.now();
  apiSendMessage({
    sessionId: sessionIdAtSend,
    message: text,
    model: modelState.currentModelId,
    attachments: userAttachmentsMeta
  }).finally(() => {
    /* 至少 loading ANIM_MIN_MS，避免一闪而过 */
    const waited = Date.now() - startTs;
    const wait = Math.max(0, ANIM_MIN_MS - waited);
    setTimeout(() => {
      finalize(sessionIdAtSend, placeholder, startTs);
    }, wait);
  });
}

function finalize(sessionId, placeholder, startTs) {
  const elapsedSec = Math.max(1, Math.round((Date.now() - startTs) / 1000));
  placeholder.content = FIXED_ANSWER;
  placeholder._liveFlags.pending = false;
  placeholder._liveFlags.elapsed = elapsedSec;
}
</script>

<template>
  <div class="app">
    <Sidebar
      @new-chat="onNewChat"
      @open-skills="openSkills"
      @demo-notice="openNotice" />

    <main class="main">
      <FloatActions @open-contact="openContact" />

      <WelcomeView v-show="isWelcome" @submit="onSubmit" />
      <ChatView    v-show="isChat"    @submit="onSubmit" />
      <StatsView   v-show="isStats" />
    </main>

    <ContactModal v-model:open="contactOpen" />
    <SkillsModal  v-model:open="skillsOpen" @demo-notice="openNotice" />
    <NoticeModal  v-model:open="noticeOpen" :feature="noticeFeature" @contact="onNoticeContact" />
  </div>
</template>
