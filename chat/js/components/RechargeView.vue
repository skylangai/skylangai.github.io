<script setup>
import { ref, computed, watch } from 'vue';
import { usePay } from '../composables/usePay.js';
import { useAuth } from '../composables/useAuth.js';
import { useView } from '../composables/useView.js';
import Pager from './Pager.vue';

/* 充值视图。
 *
 * 数据流：
 *   - useView.isRecharge 由 false → true（进入页面 / 点 sidebar 入口）
 *     → enterRecharge()：清掉活动订单 + 拉刷新记录
 *   - 用户点"立即充值"  → recharge(amount)：POST /pay/create
 *     → PC 设备返回二维码 → 前端 2s 轮询 /pay/order/{otn} 直到 paid/failed
 *     → mobile 设备返回 payurl → 直接 window.location 跳转过去
 *   - 用户切到其它 view → useView 里统一 stopPaymentPolling
 *
 * "再回来不再等待支付结果" spec 的实现方式：enterRecharge 总是把 activeOrder 清掉。
 */

const pay = usePay();
const auth = useAuth();
const { isRecharge } = useView();

const amount = ref('10.00');
const amountError = ref('');

/* 进入视图就刷新一次记录；spec 要求"每次点击 充值入口或者刷新按钮，
 * 这里的数据需要刷新一次" */
watch(isRecharge, (v) => { if (v) pay.enterRecharge(); }, { immediate: true });

function _validateAmount() {
  amountError.value = '';
  const n = Number(amount.value);
  if (!isFinite(n) || n <= 0) {
    amountError.value = '请输入大于 0 的金额';
    return null;
  }
  if (n > 10000) {
    amountError.value = '单笔最大充值金额 10000 元';
    return null;
  }
  // 圆角到 2 位小数（与后端落库精度对齐）
  return Math.round(n * 100) / 100;
}

async function onPay() {
  if (!auth.isLoggedIn.value) {
    amountError.value = '请先登录后再充值';
    return;
  }
  const n = _validateAmount();
  if (n == null) return;
  amount.value = n.toFixed(2);
  await pay.recharge(n);
}

/* 二维码渲染：
 *   - 后端给 img（直链）→ 直接 <img>
 *   - 后端只给 qrcode 字符串 → 用免费三方服务把内容转成 QR 图（联调期临时方案）
 *   - mock 模式下 qrcode 是 "mock://..."，不会真正可扫，但 status 会立刻 paid，
 *     UI 上一闪而过，不影响演示 */
function qrSrc(order) {
  if (!order) return '';
  if (order.img) return order.img;
  if (order.qrcode && order.qrcode.indexOf('mock://') !== 0) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='
      + encodeURIComponent(order.qrcode);
  }
  return '';
}

function statusLabel(s) {
  if (s === 'paid')    return '已确认';
  if (s === 'pending') return '待确认';
  if (s === 'failed')  return '未成功支付';
  return s || '-';
}
function statusClass(s) {
  if (s === 'paid')    return 'is-paid';
  if (s === 'pending') return 'is-pending';
  if (s === 'failed')  return 'is-failed';
  return '';
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts) * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const activeOrder = computed(() => pay.state.activeOrder);
const records = computed(() => pay.state.records);
const showQr = computed(() => activeOrder.value
  && activeOrder.value.device === 'pc'
  && (activeOrder.value.status === 'pending' || activeOrder.value.status === 'paid'));
const showMobileTip = computed(() => activeOrder.value
  && activeOrder.value.device !== 'pc'
  && activeOrder.value.payurl);

/* 分页：直接读 composable 里的 state，所有翻页 / 刷新都走 setPage / loadRecords。 */
const recordsPage = computed(() => pay.state.recordsPage);
const recordsPageSize = computed(() => pay.state.recordsPageSize);
const totalPages = pay.totalPages;
const recordsMeta = computed(() => {
  const total = pay.state.recordsTotal || 0;
  if (total === 0) return '';
  return `共 ${total} 条 · 第 ${recordsPage.value} / ${totalPages.value} 页`;
});
</script>

<template>
  <section class="recharge">
    <div class="rch-scroll">
      <div class="rch-inner">
        <header class="rch-header">
          <h2 class="rch-title">账户充值</h2>
          <span class="rch-period">仅支持支付宝</span>
        </header>

        <!-- 未登录提示 -->
        <div v-if="!auth.isLoggedIn.value" class="rch-empty-hint">
          请先登录后再使用充值功能。
        </div>

        <!-- 表单：金额 + 充值按钮 -->
        <div class="rch-form">
          <label class="rch-label" for="rch-amount">充值金额（元）</label>
          <div class="rch-amount-row">
            <span class="rch-amount-prefix">¥</span>
            <input id="rch-amount" v-model="amount" type="number" min="0.01"
                   step="0.01" max="10000" class="rch-amount-input"
                   :disabled="pay.state.creating" />
          </div>
          <div v-if="amountError" class="rch-amount-err">{{ amountError }}</div>
          <div v-else-if="pay.state.createError" class="rch-amount-err">
            {{ pay.state.createError }}
          </div>

          <button type="button"
                  class="alipay-btn"
                  :disabled="!auth.isLoggedIn.value || pay.state.creating"
                  @click="onPay">
            <span class="alipay-btn-ic" aria-hidden="true">
              <!-- 支付宝官方品牌色 + 简化字母标，避免直接复用商标图 -->
              <svg viewBox="0 0 24 24" focusable="false">
                <rect x="3" y="3" width="18" height="18" rx="4" fill="#fff"/>
                <text x="12" y="16" font-family="Arial, sans-serif" font-size="11"
                      font-weight="700" fill="#1677ff" text-anchor="middle">支</text>
              </svg>
            </span>
            <span>{{ pay.state.creating ? '正在下单…' : '使用支付宝充值' }}</span>
          </button>
        </div>

        <!-- 当前订单 / 二维码区 -->
        <section v-if="activeOrder" class="rch-active">
          <div class="rch-active-head">
            <span class="rch-active-title">当前订单</span>
            <span class="rch-active-otn" :title="activeOrder.outTradeNo">
              {{ activeOrder.outTradeNo }}
            </span>
          </div>

          <div class="rch-active-body">
            <!-- PC：二维码 -->
            <template v-if="showQr">
              <div class="rch-qr-wrap">
                <img v-if="qrSrc(activeOrder)" class="rch-qr" :src="qrSrc(activeOrder)" alt="支付二维码" />
                <div v-else class="rch-qr-placeholder">二维码加载中…</div>
              </div>
              <div class="rch-qr-tips">
                <div class="rch-qr-money">¥ {{ Number(activeOrder.money).toFixed(2) }}</div>
                <div class="rch-qr-status" :class="statusClass(activeOrder.status)">
                  <template v-if="activeOrder.status === 'paid'">✅ 已支付，余额已入账</template>
                  <template v-else-if="activeOrder.status === 'failed'">❌ 支付失败：{{ activeOrder.error }}</template>
                  <template v-else>⏳ 等待支付宝扫码支付…（每 2 秒自动刷新）</template>
                </div>
              </div>
            </template>

            <!-- mobile：跳转链接（前端已 try 跳转过；这里再显式给个手动按钮兜底） -->
            <template v-else-if="showMobileTip">
              <div class="rch-mobile-tip">
                <p>已为你打开支付宝支付页。如未自动跳转，请点下方按钮手动跳转。</p>
                <a :href="activeOrder.payurl" class="alipay-btn alipay-btn--mobile" target="_self">
                  打开支付宝完成支付
                </a>
              </div>
            </template>

            <!-- failed -->
            <template v-else-if="activeOrder.status === 'failed'">
              <div class="rch-fail-tip">
                ❌ 支付失败：{{ activeOrder.error || '未知原因' }}
              </div>
            </template>
          </div>
        </section>

        <!-- 充值记录 -->
        <section class="rch-records">
          <div class="rch-records-head">
            <span class="rch-records-title">
              <svg class="rch-records-ic" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor"
                      stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              充值记录
              <span class="rch-records-meta" v-if="recordsMeta">
                · {{ recordsMeta }}
              </span>
            </span>
            <button type="button" class="rch-refresh-btn"
                    :disabled="pay.state.loadingRecords"
                    title="刷新充值记录（重拉当前页）"
                    @click="pay.loadRecords({ page: recordsPage })">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-3.5-7.1M21 4v5h-5"
                      fill="none" stroke="currentColor" stroke-width="1.8"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ pay.state.loadingRecords ? '刷新中…' : '刷新' }}
            </button>
          </div>

          <div class="rch-table-wrap">
            <table class="rch-table">
              <thead>
                <tr>
                  <th class="col-time">时间</th>
                  <th class="col-money">金额</th>
                  <th class="col-status">订单状态</th>
                  <th class="col-otn">商户订单号</th>
                </tr>
              </thead>
              <tbody>
                <!-- 未登录优先级最高：不展示"加载失败"，引导用户先登录 -->
                <tr v-if="!auth.isLoggedIn.value">
                  <td colspan="4" class="rch-empty">请先登录后查看充值记录</td>
                </tr>
                <tr v-else-if="pay.state.loadingRecords && records.length === 0">
                  <td colspan="4" class="rch-empty">加载中…</td>
                </tr>
                <tr v-else-if="pay.state.recordsError">
                  <td colspan="4" class="rch-empty" style="color:#ef4444">
                    加载失败：{{ pay.state.recordsError }}
                  </td>
                </tr>
                <tr v-else-if="records.length === 0">
                  <td colspan="4" class="rch-empty">暂无充值记录</td>
                </tr>
                <tr v-for="r in (auth.isLoggedIn.value ? records : [])" :key="r.outTradeNo">
                  <td class="cell-time">{{ fmtTime(r.createdAt) }}</td>
                  <td class="cell-money">¥ {{ Number(r.money).toFixed(2) }}</td>
                  <td class="cell-status">
                    <span class="rch-status-pill" :class="statusClass(r.status)">
                      {{ statusLabel(r.status) }}
                    </span>
                  </td>
                  <td class="cell-otn" :title="r.outTradeNo">{{ r.outTradeNo }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <Pager v-if="auth.isLoggedIn.value && pay.state.recordsTotal > recordsPageSize"
                 :page="recordsPage"
                 :total-pages="totalPages"
                 :page-size="recordsPageSize"
                 @update:page="pay.setPage($event)" />
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.recharge {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-main);
  overflow: hidden;
}
.rch-scroll { flex: 1; overflow-y: auto; }
.rch-inner {
  max-width: 920px;
  margin: 0 auto;
  padding: 28px 32px 56px;
}

.rch-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}
.rch-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--text);
}
.rch-period {
  font-size: 13px;
  color: var(--text-sub);
  background: var(--chip-bg);
  padding: 4px 10px;
  border-radius: 999px;
}
.rch-empty-hint {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 18px;
  font-size: 13.5px;
  color: var(--text-sub);
}

/* 表单 */
.rch-form {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 18px;
}
.rch-label {
  display: block;
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 6px;
}
.rch-amount-row {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  max-width: 280px;
}
.rch-amount-prefix {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  background: var(--chip-bg);
  color: var(--text-sub);
  font-size: 14px;
}
.rch-amount-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px 10px;
  font-size: 16px;
  color: var(--text);
  background: transparent;
}
.rch-amount-err {
  margin-top: 6px;
  color: #ef4444;
  font-size: 12.5px;
}

/* 支付宝品牌色按钮 */
.alipay-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  height: 40px;
  padding: 0 22px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #ffffff;
  background: linear-gradient(135deg, #1677ff 0%, #006eff 100%);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.30);
  transition: filter 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease;
}
.alipay-btn:hover:not(:disabled) {
  filter: brightness(1.05);
  box-shadow: 0 6px 16px rgba(22, 119, 255, 0.40);
}
.alipay-btn:active:not(:disabled) { transform: translateY(1px); }
.alipay-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.alipay-btn-ic {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.alipay-btn-ic svg { width: 18px; height: 18px; display: block; }
.alipay-btn--mobile {
  text-decoration: none;
  width: max-content;
}

/* 当前订单 / 二维码 */
.rch-active {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px 18px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 18px;
}
.rch-active-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.rch-active-title { font-size: 14px; font-weight: 600; color: var(--text); }
.rch-active-otn {
  font-size: 12px;
  color: var(--text-sub);
  font-family: 'SF Mono', 'Menlo', Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.rch-active-body {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: center;
}
.rch-qr-wrap {
  width: 240px;
  height: 240px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fafbfc;
}
.rch-qr {
  display: block;
  width: 220px;
  height: 220px;
  object-fit: contain;
}
.rch-qr-placeholder {
  color: var(--text-sub);
  font-size: 13px;
}
.rch-qr-tips { flex: 1; min-width: 200px; }
.rch-qr-money {
  font-size: 26px;
  font-weight: 700;
  color: #1677ff;
  margin-bottom: 8px;
}
.rch-qr-status { font-size: 13.5px; color: var(--text-sub); }
.rch-qr-status.is-paid    { color: #16a34a; font-weight: 600; }
.rch-qr-status.is-failed  { color: #ef4444; font-weight: 600; }
.rch-qr-status.is-pending { color: #d97706; }
.rch-mobile-tip { font-size: 13.5px; color: var(--text-sub); }
.rch-fail-tip   { color: #ef4444; font-size: 14px; }

/* 充值记录 */
.rch-records {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 18px 8px;
  box-shadow: var(--shadow-sm);
}
.rch-records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.rch-records-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.rch-records-ic {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-sub);
}
.rch-records-meta {
  margin-left: 6px;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--text-sub);
}
.rch-refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease;
}
.rch-refresh-btn:hover:not(:disabled) {
  background: var(--hover);
  border-color: var(--border-strong);
}
.rch-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.rch-table-wrap { width: 100%; overflow-x: auto; }
.rch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.rch-table th, .rch-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
}
.rch-table th {
  color: var(--text-sub);
  font-weight: 500;
  background: var(--chip-bg);
}
.rch-table tr:last-child td { border-bottom: none; }
.col-time   { width: 22%; }
.col-money  { width: 14%; }
.col-status { width: 16%; }
.col-otn    { width: 48%; }
.cell-otn {
  font-family: 'SF Mono', 'Menlo', Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}
.cell-money { color: #1677ff; font-weight: 600; }
.rch-empty {
  padding: 24px 8px;
  color: var(--text-sub);
  text-align: center;
}

.rch-status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--chip-bg);
  color: var(--text-sub);
}
.rch-status-pill.is-paid    { background: rgba(22, 163, 74, 0.10); color: #16a34a; }
.rch-status-pill.is-pending { background: rgba(217, 119, 6, 0.12); color: #d97706; }
.rch-status-pill.is-failed  { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

/* mobile 端紧凑 */
@media (max-width: 720px) {
  .rch-inner { padding: 18px 14px 40px; }
  .rch-active-body { gap: 14px; }
  .rch-qr-wrap { width: 200px; height: 200px; }
  .rch-qr      { width: 180px; height: 180px; }
  .rch-table th, .rch-table td { padding: 8px 6px; font-size: 12px; }
  .col-time { width: 28%; }
  .col-otn  { width: 40%; }
}
</style>
