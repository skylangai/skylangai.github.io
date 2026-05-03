import { reactive, computed } from 'vue';
import { DEFAULT_SESSION_TITLE, TITLE_MAX_LEN } from '../mock/fixedAnswer.js';

/* 会话管理
 *
 * sessions: { sessionId -> { id, title, messages: [...],
 *                            updatedAt: number,
 *                            messageCount: number,
 *                            loaded: boolean    ← 是否已从后端拉过完整消息 } }
 *
 * loaded 字段决定首次点击 session 时是否需要发 POST /chat/messages。
 * - 通过用户当前会话发送过消息 → loaded = true（已经在内存里）
 * - 通过 /me 返回的列表填充 → loaded = false（只有 title，没拉过 messages）
 * - 拉过 /chat/messages 一次 → loaded = true（后续点击直接命中前端缓存）
 */
const state = reactive({
  sessions: {},
  order: [],
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
    messages: [],
    updatedAt: Date.now(),
    messageCount: 0,
    loaded: true            // 本地新建：消息全在内存，无需再拉
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

/* 往指定会话尾部追加一条消息 */
function appendMessage(sessionId, msg) {
  const sess = state.sessions[sessionId];
  if (!sess) return;
  sess.messages.push(msg);
  sess.updatedAt = Date.now();
  sess.messageCount = sess.messages.length;
}

function setTitle(sessionId, title) {
  const sess = state.sessions[sessionId];
  if (sess) sess.title = title;
}

/* ============== 后端数据吸入 ============== */

/* 用 /auth/me 或 /auth/login 返回的 sessions 列表（仅 title）覆盖前端目录。
 *
 * 行为：
 * - 已存在的 sessionId 保留 messages / loaded 状态，只更新 title / updatedAt / messageCount
 * - 新出现的 sessionId 创建空槽位（loaded=false，等用户点击时才拉 messages）
 * - 服务器没出现的 sessionId 一律删除（避免出现游离的本地会话）
 * - 用 updatedAt 倒序作为侧栏顺序
 */
function ingestFromServer(remoteSessions) {
  const list = Array.isArray(remoteSessions) ? remoteSessions : [];

  // 1) 删掉服务器已经没有的会话（保留当前选中以避免界面闪掉，但若被选中也跟着切走）
  const remoteIds = new Set(list.map((s) => s.sessionId));
  for (const id of Object.keys(state.sessions)) {
    if (!remoteIds.has(id)) {
      delete state.sessions[id];
    }
  }

  // 2) 写入 / 更新
  for (const s of list) {
    const id = s.sessionId;
    const existing = state.sessions[id];
    if (existing) {
      existing.title = s.title || existing.title || DEFAULT_SESSION_TITLE;
      existing.updatedAt = s.updatedAt || existing.updatedAt || 0;
      existing.messageCount = s.messageCount ?? existing.messageCount ?? 0;
      // 不重置 loaded / messages：用户可能已经看过这个会话
    } else {
      state.sessions[id] = {
        id,
        title: s.title || DEFAULT_SESSION_TITLE,
        messages: [],
        updatedAt: s.updatedAt || 0,
        messageCount: s.messageCount || 0,
        loaded: false
      };
    }
  }

  // 3) order：按 updatedAt 倒序
  state.order = Object.values(state.sessions)
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map((s) => s.id);

  // 4) 当前选中如果消失了就清空
  if (state.currentSessionId && !state.sessions[state.currentSessionId]) {
    state.currentSessionId = null;
  }
}

/* 用后端返回的完整 messages 替换本地缓存。
 * payload 里的字段命名是后端的：{id, role, message, ts, attachments?}
 * 这里映射成前端约定：{id, role, content, attachments?}
 */
function replaceMessages(sessionId, serverMessages) {
  const sess = state.sessions[sessionId];
  if (!sess) return;
  const mapped = (serverMessages || []).map((m) => {
    const localMsg = {
      id: 'srv_' + sessionId + '_' + m.id,
      role: m.role,
      content: m.message || '',
      attachments: Array.isArray(m.attachments) ? m.attachments : []
    };
    return localMsg;
  });
  sess.messages = mapped;
  sess.messageCount = mapped.length;
  sess.loaded = true;
}

/* 标记一个 session 的 loaded 状态（外部需要时用） */
function markLoaded(sessionId, loaded = true) {
  const sess = state.sessions[sessionId];
  if (sess) sess.loaded = !!loaded;
}

/* 完全清空（退出登录时） */
function clearAll() {
  state.currentSessionId = null;
  state.order = [];
  for (const k of Object.keys(state.sessions)) delete state.sessions[k];
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
    deriveTitle,
    ingestFromServer,
    replaceMessages,
    markLoaded,
    clearAll
  };
}
