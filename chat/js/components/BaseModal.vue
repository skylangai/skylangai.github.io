<script setup>
import { watch, nextTick, onBeforeUnmount, ref } from 'vue';
import { useModalStack } from '../composables/useModalStack.js';

/* 通用 modal 容器：teleport 到 body，统一处理 ESC、backdrop 点击、body 锁滚 class
 *
 * 用法：
 *   <BaseModal name="contact" :open="show" @update:open="show = $event">
 *     <slot 内容>
 *   </BaseModal>
 *
 * 渲染出的结构（沿用旧 CSS 类名）：
 *   <div class="${name}-modal" :class="{ 'is-open': open }">
 *     <div class="${name}-modal-backdrop" @click="close"></div>
 *     <div class="${name}-modal-dialog" role="document">
 *       <slot />
 *     </div>
 *   </div>
 *
 * 同时 body 上 toggle .${name}-modal-open 锁滚动 class（与旧 CSS 100% 兼容）
 */
const props = defineProps({
  /* class 前缀：对应旧 CSS 里的 contact / skills / notice / demoNotice 等 */
  name:  { type: String, required: true },
  open:  { type: Boolean, default: false },
  /* 可选：a11y 用 */
  labelledby: { type: String, default: null }
});
const emit = defineEmits(['update:open', 'opened', 'closed']);

const stack = useModalStack();
const dialogRef = ref(null);

function close() {
  emit('update:open', false);
}

function onBackdrop() {
  close();
}

/* 监听 open 变化：同步入栈/出栈，发射事件 */
watch(
  () => props.open,
  (val) => {
    if (val) {
      stack.open({
        id: props.name,
        bodyClass: `${props.name}-modal-open`,
        onClose: close
      });
      nextTick(() => {
        const closeBtn = dialogRef.value && dialogRef.value.querySelector('[data-modal-autofocus], .notice-btn-ghost, .contact-modal-close, .skills-modal-close, [aria-label="关闭"]');
        if (closeBtn) closeBtn.focus();
        emit('opened');
      });
    } else {
      stack.close(props.name);
      emit('closed');
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  stack.close(props.name);
});
</script>

<template>
  <Teleport to="body">
    <div :class="[name + '-modal', { 'is-open': open }]"
         :aria-hidden="open ? 'false' : 'true'"
         role="dialog"
         aria-modal="true"
         :aria-labelledby="labelledby">
      <div :class="name + '-modal-backdrop'" @click="onBackdrop"></div>
      <div :class="name + '-modal-dialog'" role="document" ref="dialogRef">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<!--
  说明：BaseModal 渲染的 div class 是动态拼接的（contact-modal / notice-modal / skills-modal …），
  而具体子 modal 的样式来自 ContactModal/NoticeModal/SkillsModal。如果用 scoped，子组件
  scoped 选择器命中不到 BaseModal 渲染的节点（data-v 不一致）。所以 modal 全家族统一用
  普通 <style>（非 scoped），靠 .xxx-modal- 前缀做命名隔离。
  本文件不放具体样式：cmFadeIn/cmPopIn 共享 keyframes 与 body.xxx-modal-open 锁滚 class
  都在公共 css/style.css 中。
-->

