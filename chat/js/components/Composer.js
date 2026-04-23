import { defineComponent, ref, watch, nextTick, computed } from 'vue';
import { useUploads } from '../composables/useUploads.js';
import UploadButton from './UploadButton.js';
import AttachmentChips from './AttachmentChips.js';
import ModelMenu from './ModelMenu.js';

/* 通用输入框 composer：欢迎页 / 对话页两处复用
 *
 * 通过 props 控制：
 *   - placeholder: 占位符
 *   - sendIcon:    发送按钮图标（welcome 用 ↑，chat 用 ●）
 *   - bottomFixed: 是否启用 chat 页底部固定样式（多一个 composer-bottom-fixed 类）
 *   - permLabel:   权限胶囊文案（welcome 用「完全访问权限」，chat 用「默认权限」）
 *   - permTone:    权限点颜色 'green' | 'grey'
 *   - showFolder:  chat 页那个 📁 project 胶囊
 *   - autofocus:   挂载后是否自动聚焦
 *
 * 事件：
 *   - submit({ text, attachments }): 用户按下回车或点击发送时触发
 *
 * 文本与附件队列均为内部/共享状态：
 *   - text: 本组件内部 ref（每个 composer 实例独立的输入草稿）
 *   - attachments: 来自 useUploads() 的全局 reactive，两处 composer 共享
 */
export default defineComponent({
  name: 'Composer',
  components: { UploadButton, AttachmentChips, ModelMenu },
  props: {
    placeholder: { type: String, default: '输入问题... ' },
    sendIcon:    { type: String, default: '↑' },
    bottomFixed: { type: Boolean, default: false },
    permLabel:   { type: String, default: '完全访问权限' },
    permTone:    { type: String, default: 'green' },
    showFolder:  { type: Boolean, default: false },
    autofocus:   { type: Boolean, default: false }
  },
  emits: ['submit'],
  setup(props, { emit, expose }) {
    const text = ref('');
    const inputRef = ref(null);
    const { state: uploads, consume: consumeAttachments } = useUploads();

    const canSend = computed(() => text.value.trim().length > 0 || uploads.list.length > 0);

    function autosize() {
      const el = inputRef.value;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }

    /* 输入变化时同步高度 */
    watch(text, () => nextTick(autosize));

    function clear() {
      text.value = '';
      nextTick(autosize);
    }

    /* 暴露给父组件 / 外部填入提示词 */
    function setText(v) {
      text.value = v;
      nextTick(() => {
        autosize();
        if (inputRef.value) inputRef.value.focus();
      });
    }

    function focus() {
      if (inputRef.value) inputRef.value.focus();
    }

    function trySubmit() {
      if (!canSend.value) return;
      const trimmed = text.value.trim();
      const attachmentsAtSend = consumeAttachments();
      emit('submit', { text: trimmed, attachments: attachmentsAtSend });
      clear();
    }

    function onKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        trySubmit();
      }
    }

    /* 挂载后可选自动聚焦 */
    nextTick(() => {
      if (props.autofocus) focus();
    });

    expose({ setText, focus, clear });

    return {
      text, inputRef, canSend,
      autosize, onKeydown, trySubmit
    };
  },
  template: `
    <div class="composer" :class="{ 'composer-bottom-fixed': bottomFixed }">
      <textarea
        ref="inputRef"
        class="composer-input"
        rows="1"
        :placeholder="placeholder"
        v-model="text"
        @input="autosize"
        @keydown="onKeydown"></textarea>

      <AttachmentChips />

      <div class="composer-bottom">
        <div class="composer-left">
          <UploadButton />
          <button v-if="showFolder" type="button" class="chip chip-folder">
            <span class="folder-ic">📁</span> project
          </button>
        </div>
        <div class="composer-right">
          <button type="button" class="chip chip-perm">
            <span class="dot" :class="permTone === 'green' ? 'dot-green' : 'dot-grey'"></span>
            <span>{{ permLabel }}</span>
            <svg class="chip-caret" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
                    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <ModelMenu />
          <button type="button" class="send-btn" title="发送" @click="trySubmit">{{ sendIcon }}</button>
        </div>
      </div>
    </div>
  `
});
