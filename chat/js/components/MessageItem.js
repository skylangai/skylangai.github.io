import { defineComponent, computed } from 'vue';
import { ASSISTANT_NAME } from '../mock/fixedAnswer.js';
import { formatFileSize } from '../utils/format.js';

/* 单条消息渲染：根据 msg.role 与 msg._liveFlags 决定形态
 *
 * msg = {
 *   id, role: 'user' | 'assistant',
 *   content: string,
 *   attachments?: [{name, size, type}],   // 仅 user
 *   _liveFlags?: {                        // 仅 assistant，且仅在 live 链路中存在
 *     tools: [...],
 *     elapsed: number,
 *     pending: boolean
 *   }
 * }
 *
 * 与 jQuery 版的对照：
 *   - msg-user：原 appendUserMessage
 *   - msg-assistant + _liveFlags.pending：原 appendAssistantPlaceholder（loading 中）
 *   - msg-assistant + _liveFlags && !pending：原 finalizeAssistantMessage（live 已完成，工具列表 + 答案）
 *   - msg-assistant 无 _liveFlags：原 appendFinalAssistantMessage（历史回放，仅文本）
 */
export default defineComponent({
  name: 'MessageItem',
  props: {
    msg: { type: Object, required: true },
    assistantName: { type: String, default: ASSISTANT_NAME }
  },
  setup(props) {
    const isUser = computed(() => props.msg.role === 'user');
    const live = computed(() => props.msg._liveFlags || null);
    const statusText = computed(() => {
      if (!live.value) return '';
      return live.value.pending ? '处理中...' : `已处理 ${live.value.elapsed}秒`;
    });
    return { isUser, live, statusText, formatFileSize };
  },
  template: `
    <!-- 用户消息 -->
    <div v-if="isUser" class="msg msg-user">
      <div class="avatar avatar-user">L</div>
      <div class="msg-body">
        <div class="user-name-tag">Lin Yun</div>
        <div v-if="msg.attachments && msg.attachments.length" class="user-attachments">
          <div v-for="a in msg.attachments" :key="a.name + a.size" class="user-attachment-chip" :title="a.name">
            <span class="att-ic"><i class="fa fa-file-o"></i></span>
            <span class="att-meta">
              <span class="att-name">{{ a.name }}</span>
              <span class="att-size">{{ formatFileSize(a.size) }}</span>
            </span>
          </div>
        </div>
        <div v-if="msg.content" class="bubble">{{ msg.content }}</div>
      </div>
    </div>

    <!-- 助手消息 -->
    <div v-else class="msg msg-assistant">
      <div class="avatar"><img src="assets/logo.svg" alt="bot" /></div>
      <div class="msg-body">
        <div class="msg-header"><span class="name">{{ assistantName }}</span></div>

        <!-- 仅 live 形态显示状态 + 工具列表（历史回放不显示） -->
        <template v-if="live">
          <div class="msg-status">
            <span>{{ statusText }}</span>
            <span class="caret-sm">▾</span>
          </div>
          <div class="tool-list">
            <div v-for="(t, i) in live.tools" :key="i" class="tool-item">
              <span class="tool-ic">›</span>
              <span class="tool-name">{{ t.name }}</span>
              <span v-for="(arg, j) in t.args" :key="j" class="tool-arg">{{ arg }}</span>
              <span class="tool-caret">›</span>
            </div>
          </div>
          <div v-if="live.pending" class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <div v-else class="msg-text">{{ msg.content }}</div>
        </template>

        <!-- 历史回放：仅文本 -->
        <div v-else class="msg-text">{{ msg.content }}</div>
      </div>
    </div>
  `
});
