<script setup>
/* 主区右上角悬浮按钮组：返回官网 / 联系我们 */
const emit = defineEmits(['open-contact']);
function openContact() { emit('open-contact'); }
</script>

<template>
  <div class="float-actions">
    <a class="float-btn" href="/" aria-label="返回官网">
      <svg class="float-btn-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.6 11.3 12 4l8.4 7.3" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.5 10.5V19a1 1 0 0 0 1 1h3.2v-4.8a1 1 0 0 1 1-1h2.6a1 1 0 0 1 1 1V20h3.2a1 1 0 0 0 1-1v-8.5"
              fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="float-btn-tip">返回官网</span>
    </a>
    <button type="button" class="float-btn" aria-label="联系我们" @click="openContact">
      <svg class="float-btn-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5.5 4.5h3.2l1.6 4-2 1.3a12 12 0 0 0 5.9 5.9l1.3-2 4 1.6v3.2a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4 6.1 1.5 1.5 0 0 1 5.5 4.5z"
              fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="float-btn-tip">联系我们</span>
    </button>
  </div>
</template>

<style scoped>
.float-actions {
  position: absolute;
  top: 14px;
  right: 18px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.float-btn {
  position: relative;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid var(--border);
  color: var(--text-sub);
  box-shadow: var(--shadow-sm);
  transition: transform 160ms ease, box-shadow 160ms ease,
              border-color 160ms ease, color 160ms ease;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.float-btn:hover {
  color: #818cf8;
  border-color: #c7d2fe;
  box-shadow: 0 6px 18px rgba(129, 140, 248, 0.18);
  transform: translateY(-1px);
}
.float-btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
.float-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.28);
}
.float-btn-ic {
  width: 18px;
  height: 18px;
  display: block;
}

/* tooltip：hover 时从按钮左侧淡入（避免遮挡下方按钮） */
.float-btn-tip {
  position: absolute;
  top: 50%;
  right: calc(100% + 10px);
  transform: translateY(-50%) translateX(4px);
  white-space: nowrap;
  padding: 5px 10px;
  font-size: 12px;
  line-height: 1;
  color: #ffffff;
  background: #1f2329;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease;
}
.float-btn-tip::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -3px;
  width: 8px;
  height: 8px;
  background: #1f2329;
  transform: translateY(-50%) rotate(45deg);
  border-radius: 1px;
}
.float-btn:hover .float-btn-tip,
.float-btn:focus-visible .float-btn-tip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

@media (max-width: 720px) {
  .float-actions { top: 10px; right: 12px; gap: 8px; }
  .float-btn { width: 34px; height: 34px; }
  .float-btn-ic { width: 16px; height: 16px; }
}
</style>
