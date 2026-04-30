<script setup>
import { ref } from 'vue';
import BaseModal from './BaseModal.vue';
import { INITIAL_SKILLS } from '../mock/skills.js';

/* 技能管理弹窗 */
defineProps({
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['update:open', 'demo-notice']);

/* 这里复制一份初始数据，避免组件间共享导致跨实例污染 */
const skills = ref(INITIAL_SKILLS.map((s) => ({ ...s })));
const spinning = ref(false);

function close() { emit('update:open', false); }

function toggleSkill(id, checked) {
  const s = skills.value.find((x) => x.id === id);
  if (s) s.enabled = !!checked;
}

function removeSkill(id) {
  skills.value = skills.value.filter((s) => s.id !== id);
}

function refresh() {
  if (spinning.value) return;
  spinning.value = true;
  setTimeout(() => { spinning.value = false; }, 700);
}

function uploadSkill() {
  emit('demo-notice', '上传技能');
}
</script>

<template>
  <BaseModal name="skills" :open="open" @update:open="$emit('update:open', $event)" labelledby="skillsModalTitle">
    <header class="skills-modal-head">
      <div class="skills-modal-title" id="skillsModalTitle">
        <span>{{ skills.length }}</span> skills
      </div>
      <div class="skills-modal-tools">
        <button type="button" class="skills-icon-btn"
                :class="{ 'is-spinning': spinning }"
                title="刷新" aria-label="刷新" @click="refresh">
          <i class="fa fa-refresh" aria-hidden="true"></i>
        </button>
        <button type="button" class="skills-add-btn" @click="uploadSkill">
          <i class="fa fa-arrow-up" aria-hidden="true"></i>
          <span>上传技能</span>
        </button>
      </div>
      <button type="button" class="skills-modal-close" aria-label="关闭" @click="close">
        <i class="fa fa-times" aria-hidden="true"></i>
      </button>
    </header>

    <div class="skills-modal-body">
      <div v-if="skills.length === 0" class="skills-empty">暂无已安装的技能</div>
      <div v-for="s in skills" :key="s.id"
           class="skill-row" :class="{ 'is-disabled': !s.enabled }">
        <span class="skill-icon" aria-hidden="true">
          <i class="fa fa-file-text-o"></i>
        </span>
        <div class="skill-meta">
          <div class="skill-title-row">
            <span class="skill-title">{{ s.title }}</span>
            <span v-if="s.version" class="skill-version">{{ s.version }}</span>
          </div>
          <div class="skill-desc" :title="s.desc">{{ s.desc }}</div>
        </div>
        <label class="skill-toggle" :aria-label="'启用/停用 ' + s.title">
          <input type="checkbox" :checked="s.enabled"
                 @change="toggleSkill(s.id, $event.target.checked)" />
          <span class="slider"></span>
        </label>
        <button type="button" class="skill-remove" aria-label="移除该技能" title="移除"
                @click="removeSkill(s.id)">
          <i class="fa fa-times"></i>
        </button>
      </div>
    </div>

    <footer class="skills-modal-foot">
      <button type="button" class="skills-save-btn" @click="close">
        <i class="fa fa-check" aria-hidden="true"></i> 保存
      </button>
    </footer>
  </BaseModal>
</template>

<!-- 见 BaseModal.vue 顶部说明：modal 节点由 BaseModal 动态拼 class 渲染，scoped 命中不到。 -->
<style>
.skills-modal {
  position: fixed;
  inset: 0;
  z-index: 9997;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.skills-modal.is-open {
  display: flex;
  animation: cmFadeIn 0.18s ease both;
}
.skills-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 22, 50, 0.42);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.skills-modal-dialog {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: 86vh;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 22, 50, 0.30),
              0 4px 14px rgba(15, 22, 50, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cmPopIn 0.26s cubic-bezier(0.2, 0.8, 0.25, 1) both;
}

/* —— 顶部 —— */
.skills-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 56px 14px 24px;  /* 右侧留位给 close × */
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.skills-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.3px;
}
.skills-modal-title span { font-weight: 700; }
.skills-modal-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}
.skills-icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: #ffffff;
  border-radius: 8px;
  color: var(--text-sub);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 320ms ease;
}
.skills-icon-btn:hover {
  background: var(--hover);
  color: var(--text);
  border-color: var(--border-strong);
}
.skills-icon-btn.is-spinning { animation: skillsSpin 0.7s linear; }
@keyframes skillsSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.skills-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.skills-add-btn:hover {
  background: var(--hover);
  border-color: var(--border-strong);
}
.skills-add-btn:active { transform: translateY(1px); }
.skills-add-btn i { font-size: 11px; color: var(--text-sub); }

.skills-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: background 160ms ease, color 160ms ease;
}
.skills-modal-close:hover {
  background: var(--hover);
  color: var(--text);
}

/* —— 列表 —— */
.skills-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px;
  background: var(--bg-side);
}

.skill-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 10px;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.skill-row:last-child { margin-bottom: 4px; }
.skill-row:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}
.skill-row.is-disabled { opacity: 0.66; }

.skill-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.10);
  color: #16a34a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.skill-row.is-disabled .skill-icon {
  background: var(--chip-bg);
  color: var(--text-muted);
}

.skill-meta { flex: 1; min-width: 0; }
.skill-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.skill-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.skill-version {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-sub);
  background: var(--chip-bg);
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}
.skill-desc {
  font-size: 12.5px;
  color: var(--text-sub);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* iOS 风格开关 */
.skill-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.skill-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.skill-toggle .slider {
  position: absolute;
  inset: 0;
  background: #d6d8dd;
  border-radius: 999px;
  transition: background 180ms ease;
}
.skill-toggle .slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.25, 1);
}
.skill-toggle input:checked + .slider {
  background: linear-gradient(135deg, #22c55e, #10b981);
}
.skill-toggle input:checked + .slider::after { transform: translateX(16px); }
.skill-toggle input:focus-visible + .slider {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.28);
}

/* 删除按钮 */
.skill-remove {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 160ms ease, color 160ms ease;
}
.skill-remove:hover {
  background: rgba(239, 68, 68, 0.10);
  color: #ef4444;
}

.skills-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 13.5px;
}

/* —— 底部 —— */
.skills-modal-foot {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: #ffffff;
  flex-shrink: 0;
}
.skills-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  background: linear-gradient(135deg, #22c55e, #10b981);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.28);
  transition: filter 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.skills-save-btn:hover {
  filter: brightness(1.06);
  box-shadow: 0 10px 22px rgba(34, 197, 94, 0.34);
}
.skills-save-btn:active { transform: translateY(1px); }
.skills-save-btn i { font-size: 11px; }

@media (max-width: 560px) {
  .skills-modal-dialog { max-height: 92vh; }
  .skills-modal-head { padding: 14px 50px 12px 16px; flex-wrap: wrap; }
  .skills-modal-body { padding: 12px; }
  .skill-row { padding: 12px; gap: 10px; }
  .skills-add-btn span { display: none; }
  .skills-add-btn { padding: 0 10px; }
}
</style>
