<script setup>
import { ref, computed } from 'vue';
import { USAGE_STATS } from '../mock/usageStats.js';
import { USAGE_RECORDS, USAGE_PAGE_SIZE } from '../mock/usageRecords.js';
import { formatNumber, formatMoney } from '../utils/format.js';
import Pager from './Pager.vue';

const page = ref(1);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(USAGE_RECORDS.length / USAGE_PAGE_SIZE))
);

const pageSlice = computed(() => {
  const p = Math.min(Math.max(1, page.value), totalPages.value);
  const start = (p - 1) * USAGE_PAGE_SIZE;
  return USAGE_RECORDS.slice(start, start + USAGE_PAGE_SIZE);
});

const usageMeta = computed(() =>
  `共 ${USAGE_RECORDS.length} 条 · 第 ${page.value} / ${totalPages.value} 页`
);

/* 概览卡的 SVG 图标（作为字符串塞进 v-html，CSS 决定大小颜色） */
const ICONS = {
  balance:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3" y="6" width="14" height="12" rx="2"/>' +
      '<rect x="17" y="9" width="3" height="6" rx="1"/>' +
    '</svg>',
  cost:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 4v16M16 8c0-2-2-3-4-3s-4 1-4 3 2 3 4 3 4 1 4 3-2 3-4 3-4-1-4-3"/>' +
    '</svg>',
  req:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="4"  y="13" width="3" height="7" rx="1"/>' +
      '<rect x="10.5" y="9"  width="3" height="11" rx="1"/>' +
      '<rect x="17" y="5"  width="3" height="15" rx="1"/>' +
    '</svg>',
  in:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 4v14M6 12l6 6 6-6"/>' +
    '</svg>',
  out:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20V6M6 12l6-6 6 6"/>' +
    '</svg>'
};

const cards = computed(() => {
  const s = USAGE_STATS;
  const remaining = Math.max(0, s.quotaTotal - s.quotaUsed);
  const remainPct = s.quotaTotal > 0 ? (remaining / s.quotaTotal) * 100 : 0;
  return [
    {
      tone: 'tone-balance',
      label: '本月剩余额度',
      value: '$' + formatMoney(remaining),
      subText: `${remainPct.toFixed(1)}% / $${formatMoney(s.quotaTotal)}`,
      progressPct: remainPct,
      icon: ICONS.balance
    },
    {
      tone: 'tone-cost',
      label: '总费用',
      value: '$' + formatMoney(s.quotaUsed),
      subText: '本月累计消费',
      icon: ICONS.cost
    },
    {
      tone: 'tone-req',
      label: '总请求数',
      value: formatNumber(s.requestCount),
      subText: '次调用',
      icon: ICONS.req
    },
    {
      tone: 'tone-in',
      label: '输入 Tokens',
      value: formatNumber(s.inputTokens),
      subText: 'Prompt 总量',
      icon: ICONS.in
    },
    {
      tone: 'tone-out',
      label: '输出 Tokens',
      value: formatNumber(s.outputTokens),
      subText: '回复总量',
      icon: ICONS.out
    }
  ];
});
</script>

<template>
  <section class="stats">
    <div class="stats-scroll">
      <div class="stats-inner">
        <header class="stats-header">
          <h2 class="stats-title">使用统计</h2>
          <span class="stats-period">本月数据</span>
        </header>

        <!-- 上栏：5 张概览卡 -->
        <div class="stats-cards">
          <div v-for="c in cards" :key="c.label" class="stat-card" :class="c.tone">
            <div class="stat-card-head">
              <span class="stat-card-ic" v-html="c.icon"></span>
              <span class="stat-card-label">{{ c.label }}</span>
            </div>
            <div class="stat-card-value">{{ c.value }}</div>
            <div class="stat-card-sub">
              <template v-if="c.progressPct != null">
                <div class="stat-card-bar">
                  <div class="stat-card-bar-fill" :style="{ width: c.progressPct.toFixed(1) + '%' }"></div>
                </div>
                <span>{{ c.subText }}</span>
              </template>
              <template v-else>{{ c.subText }}</template>
            </div>
          </div>
        </div>

        <!-- 下栏：详细使用记录 -->
        <section class="usage-section">
          <div class="usage-section-head">
            <span class="usage-section-title">
              <svg class="usage-section-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor"
                      stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              详细使用记录
            </span>
            <span class="usage-section-meta">{{ usageMeta }}</span>
          </div>

          <div class="usage-table-wrap">
            <table class="usage-table">
              <thead>
                <tr>
                  <th class="col-time">请求时间</th>
                  <th class="col-prompt">提问内容</th>
                  <th class="col-tokens">总 Tokens</th>
                  <th class="col-cost">费用</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pageSlice.length === 0">
                  <td colspan="4" class="usage-empty">暂无使用记录</td>
                </tr>
                <tr v-for="r in pageSlice" :key="r.ts">
                  <td class="cell-time">{{ r.time }}</td>
                  <td class="cell-prompt" :title="r.prompt">{{ r.prompt }}</td>
                  <td class="cell-tokens">{{ formatNumber(r.tokens) }}</td>
                  <td class="cell-cost">${{ formatMoney(r.cost) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Pager :page="page" :total-pages="totalPages" :page-size="USAGE_PAGE_SIZE"
                 @update:page="page = $event" />
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  overflow: hidden;
}
.stats-scroll {
  flex: 1;
  overflow-y: auto;
}
.stats-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 28px 32px 56px;
}
.stats-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}
.stats-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--text);
}
.stats-period {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--chip-bg);
  padding: 4px 10px;
  border-radius: 999px;
}

/* 概览卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}
.stat-card {
  position: relative;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 16px 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}
.stat-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.stat-card-ic {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-card-ic :deep(svg) { width: 16px; height: 16px; display: block; }
.stat-card-label {
  font-size: 12.5px;
  color: var(--text-sub);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-card-value {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--text);
  line-height: 1.15;
  word-break: break-all;
}
.stat-card-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.stat-card-bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: #eef0f3;
  overflow: hidden;
  position: relative;
}
.stat-card-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #22c55e, #10b981);
  border-radius: 999px;
}
/* 5 种主题色 */
.stat-card.tone-balance .stat-card-ic { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.stat-card.tone-cost    .stat-card-ic { background: rgba(255, 106, 26, 0.12); color: #f97316; }
.stat-card.tone-req     .stat-card-ic { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.stat-card.tone-in      .stat-card-ic { background: rgba(129, 140, 248, 0.14); color: #6366f1; }
.stat-card.tone-out     .stat-card-ic { background: rgba(236, 72, 153, 0.12); color: #ec4899; }

/* 详细使用记录 */
.usage-section {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.usage-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: #fafbfc;
}
.usage-section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.usage-section-ic { width: 16px; height: 16px; color: var(--text-sub); }
.usage-section-meta { font-size: 12.5px; color: var(--text-sub); }

.usage-table-wrap { overflow-x: auto; }
.usage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  table-layout: fixed;
}
.usage-table thead th {
  text-align: left;
  font-weight: 600;
  color: var(--text-sub);
  background: #fafbfc;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  letter-spacing: 0.2px;
  white-space: nowrap;
}
.usage-table tbody td {
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}
.usage-table tbody tr:last-child td { border-bottom: none; }
.usage-table tbody tr { transition: background 120ms ease; }
.usage-table tbody tr:hover { background: #fafbfc; }

.col-time   { width: 170px; }
.col-prompt { width: auto; }
.col-tokens { width: 120px; text-align: right; }
.col-cost   { width: 100px; text-align: right; }

.usage-table .cell-time {
  color: var(--text-sub);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.usage-table .cell-prompt {
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}
.usage-table .cell-tokens {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--text);
}
.usage-table .cell-cost {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #16a34a;
}
.usage-empty {
  padding: 36px 18px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 960px) {
  .stats-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-inner { padding: 22px 18px 40px; }
}
@media (max-width: 480px) {
  .stats-cards { grid-template-columns: 1fr; }
  .col-time { width: 130px; }
  .col-tokens { width: 90px; }
  .col-cost { width: 80px; }
  .usage-table thead th, .usage-table tbody td { padding: 10px 12px; }
}
</style>
