import { reactive } from 'vue';

/* 待发送的附件队列（共享：欢迎页 / 对话页同时只可见一个 composer）
 * 每条：{ id, file, name, size, type }
 *
 * - file 字段是浏览器原生 File 对象，仅在「点 + 选择 → 点发送」之间短暂持有
 * - 一经发送就被 consume()，且不会写入 sessions[*].messages（历史只保留元数据）
 */
const state = reactive({
  list: []
});

function addFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    state.list.push({
      id: 'att_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6),
      file: f,
      name: f.name,
      size: f.size,
      type: f.type || ''
    });
  }
}

function removeAttachment(id) {
  state.list = state.list.filter((a) => String(a.id) !== String(id));
}

/* 取走待发送队列：返回快照，并清空 state.list
 * 调用方负责把元数据写进 session.messages，把原始 file 交给 uploadAttachments */
function consume() {
  const snapshot = state.list.slice();
  state.list = [];
  return snapshot;
}

export function useUploads() {
  return {
    state,
    addFiles,
    removeAttachment,
    consume
  };
}
