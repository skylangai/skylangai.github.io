import { reactive, computed } from 'vue';

/* 用户的金融状态（token 配额 / 用量）。
 *
 * 来源：
 *   - 登录 / 注册 / /me 响应里的 finance 字段
 *   - 每次 /chat/send 的 done 事件里的 usage + balance（增量更新）
 *
 * 单例 reactive，整个子应用共享；StatsView / 顶部余额提示都从这里读。
 *
 * 字段与后端保持一致：
 *   token_total / token_used / balance / request_count / input_tokens / output_tokens
 */
const state = reactive({
  token_total: 0,
  token_used: 0,
  balance: 0,
  request_count: 0,
  input_tokens: 0,
  output_tokens: 0
});

const balance       = computed(() => state.balance);
const tokenTotal    = computed(() => state.token_total);
const requestCount  = computed(() => state.request_count);

function setFromServer(fin) {
  if (!fin) return;
  state.token_total   = fin.token_total ?? 0;
  state.token_used    = fin.token_used ?? 0;
  state.balance       = fin.balance ?? (state.token_total - state.token_used);
  state.request_count = fin.request_count ?? 0;
  state.input_tokens  = fin.input_tokens ?? 0;
  state.output_tokens = fin.output_tokens ?? 0;
}

/* 一次对话完成后用 done 事件里的 usage 累加（避免每条都重拉 /me） */
function applyTurnDelta({ usage, balance: newBalance } = {}) {
  if (!usage) return;
  state.input_tokens  += (usage.input_tokens  || 0);
  state.output_tokens += (usage.output_tokens || 0);
  state.token_used    += (usage.cost          || 0);
  state.request_count += 1;
  if (typeof newBalance === 'number') {
    state.balance = newBalance;       // 以 done 事件为准
  } else {
    state.balance = state.token_total - state.token_used;
  }
}

function reset() {
  state.token_total = 0;
  state.token_used = 0;
  state.balance = 0;
  state.request_count = 0;
  state.input_tokens = 0;
  state.output_tokens = 0;
}

export function useFinance() {
  return {
    state,
    balance,
    tokenTotal,
    requestCount,
    setFromServer,
    applyTurnDelta,
    reset
  };
}
