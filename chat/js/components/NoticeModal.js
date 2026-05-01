import { defineComponent, computed } from 'vue';
import BaseModal from './BaseModal.js';

/* Demo 受限提示弹窗 */
export default defineComponent({
  name: 'NoticeModal',
  components: { BaseModal },
  props: {
    open: { type: Boolean, default: false },
    feature: { type: String, default: '' }
  },
  emits: ['update:open', 'contact'],
  setup(props, { emit }) {
    const featureLabel = computed(() =>
      props.feature ? `「${props.feature}」` : '该功能'
    );
    function close() { emit('update:open', false); }
    function toContact() {
      emit('update:open', false);
      emit('contact');
    }
    return { featureLabel, close, toContact };
  },
  template: `
    <BaseModal name="notice" :open="open" @update:open="$emit('update:open', $event)" labelledby="demoNoticeTitle">
      <button type="button" class="notice-modal-close" aria-label="关闭" @click="close">
        <i class="fa fa-times" aria-hidden="true"></i>
      </button>
      <div class="notice-modal-icon" aria-hidden="true">
        <i class="fa fa-info"></i>
      </div>
      <h3 id="demoNoticeTitle" class="notice-modal-title">功能暂未开放</h3>
      <p class="notice-modal-sub">
        <span>{{ featureLabel }}</span>
        在 Demo 状态下暂不支持，欢迎联系我们了解完整版能力。
      </p>
      <div class="notice-modal-actions">
        <button type="button" class="notice-btn notice-btn-ghost" data-modal-autofocus
                @click="close">我知道了</button>
        <button type="button" class="notice-btn notice-btn-primary" @click="toContact">联系我们</button>
      </div>
    </BaseModal>
  `
});
