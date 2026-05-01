import { reactive, watch } from 'vue';

/* 全局 modal 栈：
 *   - 维护当前打开的 modal id 数组（栈顶 = 最上层）
 *   - 自动 toggle body 上的 .${className}-open class（CSS 已有锁滚动样式）
 *   - 监听 document.keydown，按 Esc 关闭栈顶
 *   - 同时只允许一个 modal class 占用 body，但允许多个 modal 同时打开（z-index 由 CSS 控制）
 *
 * 这里用最小可用实现：每个 BaseModal 自己注册/反注册自己。
 */
const state = reactive({
  stack: []   // [{ id, bodyClass, onClose }]
});

let escBound = false;
function ensureEscBound() {
  if (escBound || typeof document === 'undefined') return;
  escBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || state.stack.length === 0) return;
    const top = state.stack[state.stack.length - 1];
    if (top && typeof top.onClose === 'function') top.onClose();
  });
}

/* 同步 body 上各 modal 的锁滚动 class
 * 每个 modal 用独立 class（兼容旧 CSS 的 .contact-modal-open / .skills-modal-open / .notice-modal-open）*/
function syncBodyClasses() {
  if (typeof document === 'undefined') return;
  // 先清掉所有可能 toggle 的 class，再按当前栈追加
  const toRemove = ['contact-modal-open', 'skills-modal-open', 'notice-modal-open', 'auth-modal-open'];
  toRemove.forEach((c) => document.body.classList.remove(c));
  state.stack.forEach((item) => {
    if (item.bodyClass) document.body.classList.add(item.bodyClass);
  });
}

watch(() => state.stack.length, syncBodyClasses, { flush: 'post' });

function open({ id, bodyClass, onClose }) {
  ensureEscBound();
  // 防重复入栈
  close(id, true);
  state.stack.push({ id, bodyClass, onClose });
  syncBodyClasses();
}

function close(id, silent = false) {
  const idx = state.stack.findIndex((x) => x.id === id);
  if (idx === -1) return;
  state.stack.splice(idx, 1);
  if (!silent) syncBodyClasses();
}

function isOpen(id) {
  return state.stack.some((x) => x.id === id);
}

export function useModalStack() {
  return { state, open, close, isOpen };
}
