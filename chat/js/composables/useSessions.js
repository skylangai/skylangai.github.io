import { reactive, computed } from 'vue';
import { DEFAULT_SESSION_TITLE, TITLE_MAX_LEN } from '../mock/fixedAnswer.js';

/* 会话管理：
 *   sessions: 字典 sessionId -> { id, title, messages: [{role, content, attachments?}] }
 *   currentSessionId: 当前激活；为 null 表示在欢迎页（尚未发起任何会话）
 * 这一层是单例 reactive，整个子应用共享。 */
const state = reactive({
  sessions: {},        // 用对象而不是 Map：Vue 2/3 都对纯对象的响应式更稳
  order: [],           // 会话出现顺序（侧栏渲染顺序）
  currentSessionId: null
});

const currentSession = computed(() =>
  state.currentSessionId ? state.sessions[state.currentSessionId] : null
);

const currentMessages = computed(() =>
  currentSession.value ? currentSession.value.messages : []
);

const sessionList = computed(() =>
  state.order.map((id) => state.sessions[id]).filter(Boolean)
);

function makeSessionId() {
  return 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function deriveTitle(text, attachments) {
  const source =
    (text && text.trim()) ||
    (attachments && attachments[0] && attachments[0].name) ||
    DEFAULT_SESSION_TITLE;
  return source.length > TITLE_MAX_LEN
    ? source.slice(0, TITLE_MAX_LEN) + '…'
    : source;
}

/* 创建新会话槽位（用户首次发消息时调用） */
function createSession() {
  const id = makeSessionId();
  state.sessions[id] = {
    id,
    title: DEFAULT_SESSION_TITLE,
    messages: []
  };
  state.order.push(id);
  state.currentSessionId = id;
  return state.sessions[id];
}

/* 选中现有会话 */
function selectSession(id) {
  if (state.sessions[id]) state.currentSessionId = id;
}

/* 清空当前选中（回到欢迎页，但保留所有历史会话） */
function clearCurrent() {
  state.currentSessionId = null;
}

/* 往指定会话尾部追加一条消息（不依赖"当前会话"，避免 race） */
function appendMessage(sessionId, msg) {
  const sess = state.sessions[sessionId];
  if (!sess) return;
  sess.messages.push(msg);
}

/* 更新指定会话标题 */
function setTitle(sessionId, title) {
  const sess = state.sessions[sessionId];
  if (sess) sess.title = title;
}

export function useSessions() {
  return {
    state,
    currentSession,
    currentMessages,
    sessionList,
    createSession,
    selectSession,
    clearCurrent,
    appendMessage,
    setTitle,
    deriveTitle
  };
}
