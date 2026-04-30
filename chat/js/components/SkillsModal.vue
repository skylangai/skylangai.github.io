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
