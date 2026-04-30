<script setup>
import { computed } from 'vue';

/* 紧凑分页器：1 ... cur-1 cur cur+1 ... N
 * 既被 StatsView 用，也方便未来其它表格复用 */
const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageSize: { type: Number, default: 10 }
});
const emit = defineEmits(['update:page']);

const pages = computed(() => buildPageList(props.page, props.totalPages));

function go(p) {
  let next = p;
  if (p === 'prev') next = Math.max(1, props.page - 1);
  else if (p === 'next') next = Math.min(props.totalPages, props.page + 1);
  else next = parseInt(p, 10) || 1;
  if (next === props.page) return;
  emit('update:page', next);
}

function buildPageList(cur, total) {
  if (total <= 7) {
    const arr = [];
    for (let i = 1; i <= total; i++) arr.push(i);
    return arr;
  }
  const set = new Set([1, total, cur, cur - 1, cur + 1]);
  const sorted = Array.from(set)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result = [];
  for (let j = 0; j < sorted.length; j++) {
    if (j > 0 && sorted[j] - sorted[j - 1] > 1) result.push('…');
    result.push(sorted[j]);
  }
  return result;
}
</script>

<template>
  <div class="usage-pager">
    <span class="page-info">每页 {{ pageSize }} 条</span>
    <button type="button" :disabled="page <= 1" @click="go('prev')">上一页</button>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="page-ellipsis">…</span>
      <button v-else type="button"
              :class="{ 'is-active': p === page }"
              @click="go(p)">{{ p }}</button>
    </template>
    <button type="button" :disabled="page >= totalPages" @click="go('next')">下一页</button>
  </div>
</template>

<style scoped>
.usage-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 14px 18px;
  background: #fafbfc;
  border-top: 1px solid var(--border);
}
.usage-pager .page-info {
  margin-right: auto;
  font-size: 12.5px;
  color: var(--text-sub);
}
.usage-pager button {
  min-width: 32px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text);
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.usage-pager button:hover:not([disabled]):not(.is-active) {
  background: var(--hover);
  border-color: var(--border-strong);
}
.usage-pager button.is-active {
  background: var(--text);
  color: #ffffff;
  border-color: var(--text);
  cursor: default;
}
.usage-pager button[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
.usage-pager .page-ellipsis {
  color: var(--text-muted);
  padding: 0 4px;
  user-select: none;
}
</style>
