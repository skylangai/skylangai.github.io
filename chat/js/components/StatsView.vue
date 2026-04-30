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
