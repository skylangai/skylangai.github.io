import { reactive, computed } from 'vue';

import {
  createOrder as apiCreate,
  getOrder as apiGetOrder,
  listOrders as apiList,
  detectDevice,
} from '../api/pay.js';
import { useFinance } from './useFinance.js';
import { useAuth } from './useAuth.js';

/* 充值视图状态机（单例 reactive，整个 chat 子应用共享）。
 *
 * 关键约束（来自产品 spec）：
 *   - 用户点了"立即充值"后，本视图一直轮询订单状态
 *   - 只要切到别的 view（chat / stats / welcome）→ 立即停止轮询
 *   - 再回到充值 view → 不自动恢复轮询；订单显示区清掉，记录列表会刷新
 *
 * 因此我们暴露 stopPolling()，由 useView 在 goChat/goStats/goWelcome 里统一调；
 * enterRecharge() 则是进入视图时调用——它"清空当前订单 + 拉刷新记录"，
 * 而不是恢复上一个未完成订单的轮询。
 */

const POLL_INTERVAL_MS = 2000;
/* 单次订单最长轮询时长（ms）：超过就停掉，避免长尾轮询占用网络。
 * 生产真实 ZPAY 体验下 1~3 分钟到账，这里给 10 分钟足够。 */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

/* 充值记录每页 N 条；与 StatsView 的"详细使用记录"一致的视觉节奏。
 * 改这里就能调；后端 limit ≤ 100 是硬上限。 */
export const RECHARGE_PAGE_SIZE = 10;

const state = reactive({
  /* 当前正在创建 / 等待支付的订单（仅活跃时有值；切 view 或完成会被清掉） */
  activeOrder: null,             // {outTradeNo, money, status, qrcode, img, payurl, device, ...}
  creating: false,               // 正在 POST /pay/create
  createError: '',               // 创建失败的可读原因（"网络异常 …"）
  /* 充值记录（仅当前页；按 createdAt 倒序，由后端排好） */
  records: [],
  recordsTotal: 0,               // 用户的总记录数；用于算页数
  recordsPage: 1,                // 当前页码（1-based）
  recordsPageSize: RECHARGE_PAGE_SIZE,
  loadingRecords: false,
  recordsError: '',
});

let _pollTimer = null;
let _pollStartTs = 0;
let _pollSeq = 0;          // 串行号防止"老订单的轮询返回覆盖新订单"

const fin = useFinance();
const auth = useAuth();

function _clearTimer() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

/* 切换 view 时调一次：彻底停止轮询，但保留订单数据"原样冷冻"也无所谓——
 * 进入视图时 enterRecharge 会清空。 */
export function stopPaymentPolling() {
  _clearTimer();
  _pollSeq++;             // 让所有 in-flight 的 poll 都判作过期
}

async function _pollOnce(otn, mySeq) {
  if (mySeq !== _pollSeq) return;     // 已被新订单或离开 view 抢占
  if (Date.now() - _pollStartTs > POLL_TIMEOUT_MS) {
    _clearTimer();
    if (state.activeOrder && state.activeOrder.outTradeNo === otn) {
      state.createError = '等待支付超时，请刷新订单状态再试';
    }
    return;
  }
  let res;
  try {
    res = await apiGetOrder(otn);
  } catch (e) {
    return;       // 网络瞬时错误就让下一次 tick 再试
  }
  if (mySeq !== _pollSeq) return;
  if (!res || !res.ok || !res.order) return;
  const o = res.order;
  // 用最新数据替换 active（前端能立即看到 status 变化 / 二维码刷新）
  if (state.activeOrder && state.activeOrder.outTradeNo === otn) {
    state.activeOrder = o;
  }
  // 仅在当前展示的 page 包含这条订单时原地替换（分页后其它页不在内存里，不需要管）
  const idx = state.records.findIndex((r) => r.outTradeNo === otn);
  if (idx >= 0) {
    state.records.splice(idx, 1, o);
  }
  if (o.status === 'paid' || o.status === 'failed') {
    _clearTimer();
    if (o.status === 'paid') {
      // 余额：充值成功后 money_total 增加；前端只更新展示用的 money_total / balance
      fin.state.money_total = (fin.state.money_total || 0) + Number(o.money || 0);
      fin.state.balance     = (fin.state.balance     || 0) + Number(o.money || 0);
      // 重新拉一次当前页：让"刚刚 paid 的订单"按创建时间正确排进列表
      // （而不是沿用上面 splice 留下的位置；如果它本来不在第 1 页，就会自然消失）
      loadRecords({ page: state.recordsPage });
    }
  }
}

function _startPolling(otn) {
  _clearTimer();
  _pollSeq++;
  _pollStartTs = Date.now();
  const mySeq = _pollSeq;
  // 立刻跑一次，再起 interval，避免用户等满 2s 才看到第一次更新
  _pollOnce(otn, mySeq);
  _pollTimer = setInterval(() => _pollOnce(otn, mySeq), POLL_INTERVAL_MS);
}

/* —— 业务动作 —— */

/* 串行号防止快速翻页时旧请求覆盖新请求（与 StatsView.fetchCurrentPage 同套思路）。 */
let _listSeq = 0;

/* 拉指定页的充值记录。
 *   page: 1-based 页码；不传则用当前 state.recordsPage
 *   pageSize: 每页条数，默认 RECHARGE_PAGE_SIZE
 * 后端按 created_at DESC 排序，所以"页码 P / 每页 N" → offset=(P-1)*N，limit=N
 * 即可只把当前页搬到内存，避免一次拉所有记录。 */
async function loadRecords({ page, pageSize } = {}) {
  const size = pageSize || state.recordsPageSize || RECHARGE_PAGE_SIZE;
  const p = Math.max(1, Number(page || state.recordsPage || 1));
  // 未登录就不打后端：后端 require_user 会 401，UI 应显示"请先登录"而非"加载失败"
  // 这里直接把记录清空、清掉错误信息，由 RechargeView 通过 auth.isLoggedIn 决定文案。
  if (!auth.isLoggedIn.value) {
    state.records = [];
    state.recordsTotal = 0;
    state.recordsPage = p;
    state.recordsPageSize = size;
    state.recordsError = '';
    state.loadingRecords = false;
    return;
  }
  const my = ++_listSeq;
  state.loadingRecords = true;
  state.recordsError = '';
  try {
    const offset = (p - 1) * size;
    const res = await apiList({ offset, limit: size });
    if (my !== _listSeq) return;
    if (res && res.ok) {
      state.records = Array.isArray(res.orders) ? res.orders : [];
      state.recordsTotal = Number(res.total || state.records.length);
      state.recordsPage = p;
      state.recordsPageSize = size;
      // 当前页在 total 减少后越界（典型场景：在最后一页删完）→ 自动回退到最后一页
      const totalPages = Math.max(1, Math.ceil((state.recordsTotal || 0) / size));
      if (p > totalPages) {
        return loadRecords({ page: totalPages, pageSize: size });
      }
    } else {
      state.recordsError = (res && res.message) || '加载失败';
    }
  } catch (e) {
    if (my !== _listSeq) return;
    state.recordsError = '网络异常：' + (e && e.message || e);
  } finally {
    if (my === _listSeq) state.loadingRecords = false;
  }
}

/* 跳页 / 上一页 / 下一页 的统一入口；UI 直接调即可 */
function setPage(p) {
  return loadRecords({ page: p });
}

/* 用户点击"立即充值"。返回创建结果（true=成功并已开始轮询；false=失败） */
async function recharge(amount, opts = {}) {
  state.createError = '';
  state.creating = true;
  // 切到新订单立刻让旧的轮询过期
  stopPaymentPolling();
  state.activeOrder = null;
  try {
    const device = opts.device || detectDevice();
    const res = await apiCreate({ amount, name: opts.name, device });
    if (!res || !res.ok || !res.order) {
      state.createError = (res && res.message) || '下单失败';
      return false;
    }
    state.activeOrder = res.order;
    // mobile 设备直接跳转支付链接（不需要轮询，跳过去就由 ZPAY 接管）
    if (res.order.device !== 'pc' && res.order.payurl
        && res.order.status !== 'paid'
        && res.order.payurl.indexOf('mock://') !== 0) {
      try { window.location.href = res.order.payurl; } catch (e) { /* ignore */ }
      return true;
    }
    // PC 设备 / mock 模式：开始轮询（mock 第一次就会拿到 paid）
    if (res.order.status !== 'paid') {
      _startPolling(res.order.outTradeNo);
    } else {
      // 已经直接 paid（mock 模式）：同步 finance；记录列表回到第 1 页重拉，
      // 这样新订单会自然出现在最顶（按 createdAt 倒序），不需要 unshift。
      fin.state.money_total = (fin.state.money_total || 0) + Number(res.order.money || 0);
      fin.state.balance     = (fin.state.balance     || 0) + Number(res.order.money || 0);
      loadRecords({ page: 1 });
    }
    return true;
  } catch (e) {
    state.createError = '网络异常：' + (e && e.message || e);
    return false;
  } finally {
    state.creating = false;
  }
}

/* 进入"充值"view 时调：
 *   - 清掉上一次留下的活动订单（spec：再回来不再等待支付结果）
 *   - 回到第 1 页并刷新记录（spec：每次点击充值入口或刷新按钮都刷新）
 */
function enterRecharge() {
  stopPaymentPolling();
  state.activeOrder = null;
  state.createError = '';
  // 未登录时同样把记录清空（loadRecords 内部已判断），避免显示上一个账号的残留数据
  loadRecords({ page: 1 });
}

const records = computed(() => state.records);
const isPolling = computed(() => !!_pollTimer);
const totalPages = computed(() =>
  Math.max(1, Math.ceil((state.recordsTotal || 0) / (state.recordsPageSize || 1)))
);

export function usePay() {
  return {
    state,
    records,
    isPolling,
    totalPages,
    enterRecharge,
    loadRecords,
    setPage,
    recharge,
    stopPaymentPolling,
    detectDevice,
  };
}
