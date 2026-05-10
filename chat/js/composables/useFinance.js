import { reactive, computed } from 'vue';

/* 用户的金融状态（额度 / 已花金额 / 累计 token 数）。
 *
 * 来源：
 *   - 登录 / 注册 / /me 响应里的 finance 字段
 *   - 每次 /chat/send 的 done 事件里的 usage + balance（增量更新）
 *
 * 单例 reactive，整个子应用共享；StatsView / 顶部余额提示都从这里读。
 *
 * 字段与后端保持一致（语义"金额"）：
 *   money_total / money_used / balance / request_count / input_tokens / output_tokens
 *
 * NOTE: 历史命名 token_total / token_used 实际意义是"金额额度 / 已花金额"，
 *       已统一改为 money_*；token 数另由 input_tokens / output_tokens 承担。
 */
const state = reactive({
  money_total: 0,
  money_used: 0,
  balance: 0,
  request_count: 0,
  input_tokens: 0,
  output_tokens: 0
});

const balance       = computed(() => state.balance);
const moneyTotal    = computed(() => state.money_total);
const requestCount  = computed(() => state.request_count);

function setFromServer(fin) {
  if (!fin) return;
  state.money_total   = fin.money_total ?? 0;
  state.money_used    = fin.money_used ?? 0;
  state.balance       = fin.balance ?? (state.money_total - state.money_used);
  state.request_count = fin.request_count ?? 0;
  state.input_tokens  = fin.input_tokens ?? 0;
  state.output_tokens = fin.output_tokens ?? 0;
}

/* 一次对话完成后用 done 事件里的 usage 累加（避免每条都重拉 /me） */
function applyTurnDelta({ usage, balance: newBalance } = {}) {
  if (!usage) return;
  state.input_tokens  += (usage.input_tokens  || 0);
  state.output_tokens += (usage.output_tokens || 0);
  state.money_used    += (usage.cost          || 0);
  state.request_count += 1;
  if (typeof newBalance === 'number') {
    state.balance = newBalance;       // 以 done 事件为准
  } else {
    state.balance = state.money_total - state.money_used;
  }
}

function reset() {
  state.money_total = 0;
  state.money_used = 0;
  state.balance = 0;
  state.request_count = 0;
  state.input_tokens = 0;
  state.output_tokens = 0;
}

export function useFinance() {
  return {
    state,
    balance,
    moneyTotal,
    requestCount,
    setFromServer,
    applyTurnDelta,
    reset
  };
}
