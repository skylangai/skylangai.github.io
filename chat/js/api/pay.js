/* 充值（ZPAY）相关接口客户端封装。
 *
 * 与 auth.js 一样的双分支：
 *   DEBUG = true  → 走本地 mock：不打后端，构造 paid 订单立即返回，
 *                   方便离线演示前端 UX
 *   DEBUG = false → 调真实 ${API_BASE}/pay/...
 *
 * 真实模式下后端会自己判断 USE_MOCK_ZPAY：
 *   - true  → 不调 ZPAY，订单直接 paid（演示场景）
 *   - false → 调 ZPAY，notify 回调来后才 paid（真实场景）
 *
 * 所以前端 UI 里"等待支付结果"的轮询逻辑两种场景都能跑：mock 模式只是
 * 第一次轮询就拿到 paid。
 */
import { DEBUG, apiPostJson, apiGetJson } from './config.js';

/* ---------- DEBUG mock ---------- */
const _mockOrders = [];
function _now() { return Math.floor(Date.now() / 1000); }
function _mockOtn() {
  return 'TMOCK' + Date.now();
}

function _mockOrder({ amount, name, device }) {
  const otn = _mockOtn();
  return {
    outTradeNo: otn,
    money: Number(amount),
    name: name || '账户充值',
    payType: 'alipay',
    device: device || 'pc',
    status: 'paid',
    tradeNo: 'MOCK-' + _now(),
    zpayId: 'MOCK-Z-' + _now(),
    payurl: 'mock://pay/' + otn,
    qrcode: 'mock://pay/' + otn,
    img: '',
    error: '',
    clientip: '127.0.0.1',
    createdAt: _now(),
    paidAt: _now(),
  };
}

/* ---------- 设备类型探测 ----------
 * 真实生产应在服务端按 UA 兜底，这里前端先粗判一下足够：
 *   - mobile：移动设备（按 ZPAY 文档传 mobile 会拿到跳转 URL）
 *   - pc：其它（拿二维码图片）
 * 微信浏览器内置走 wechat 渠道，体验更好；alipay 浏览器内置同理。 */
export function detectDevice() {
  if (typeof navigator === 'undefined') return 'pc';
  const ua = (navigator.userAgent || '').toLowerCase();
  if (/mobi|android|iphone|ipad|ipod/.test(ua)) return 'mobile';
  return 'pc';
}

/* ---------- API ---------- */
/**
 * 下单。返回 { ok, code, message?, order? }
 *   order = { outTradeNo, money, status, qrcode, payurl, img, device, ... }
 *
 * UI 拿到 ok=true 后：
 *   - device==='pc' && img       → <img :src="img"> 二维码
 *   - device==='pc' && qrcode    → 用三方服务把字符串内容转 QR 图
 *   - device==='mobile' && payurl→ window.location = payurl
 */
export async function createOrder({ amount, name, device } = {}) {
  if (DEBUG) {
    if (!amount || Number(amount) <= 0) {
      return { ok: false, code: 1, message: '金额必须大于 0' };
    }
    const order = _mockOrder({ amount, name, device: device || detectDevice() });
    _mockOrders.unshift(order);
    return { ok: true, code: 0, order };
  }
  return apiPostJson('/pay/create', {
    amount: Number(amount),
    name: name || '账户充值',
    device: device || detectDevice(),
  });
}

/* 单条订单状态：前端轮询用。返回 { ok, order } */
export async function getOrder(outTradeNo) {
  if (!outTradeNo) return { ok: false, code: 1, message: '缺少 outTradeNo' };
  if (DEBUG) {
    const o = _mockOrders.find((x) => x.outTradeNo === outTradeNo);
    return o ? { ok: true, code: 0, order: o }
             : { ok: false, code: 2030, message: '订单不存在' };
  }
  return apiGetJson('/pay/order/' + encodeURIComponent(outTradeNo));
}

/* 列出当前用户的充值记录，按时间倒序。返回 { ok, total, orders } */
export async function listOrders({ offset = 0, limit = 20 } = {}) {
  if (DEBUG) {
    return {
      ok: true, code: 0,
      total: _mockOrders.length,
      offset, limit,
      orders: _mockOrders.slice(offset, offset + limit),
    };
  }
  const qs = `?offset=${offset}&limit=${limit}`;
  return apiGetJson('/pay/orders' + qs);
}
