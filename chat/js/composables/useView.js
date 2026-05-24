import { reactive, computed } from 'vue';

import { stopPaymentPolling } from './usePay.js';

/* 四态视图机：'welcome' | 'chat' | 'stats' | 'recharge'
 * 单例模块作用域 state，整个 chat 子应用共享
 *
 * 同时承担"窄屏侧栏抽屉"开关：drawerOpen
 *   - 仅在 ≤720px 视为有效：CSS 媒体查询里 .sidebar-wrapper.is-open 才会 translateX(0)
 *   - 桌面端 drawerOpen=true/false 都不影响布局，所以无须监听 resize 同步
 *   - 任何"切换内容/进入新视图"的动作都应顺手 closeDrawer，避免抽屉挂在那挡住主区
 *
 * "切走时停掉支付轮询"的策略：
 *   spec 明确"切到别的 view 后不再等待支付结果"，所以所有 go*() 都先调一次
 *   stopPaymentPolling()——由 RechargeView 自己清空当前活动订单则在 enterRecharge 里。
 */
const state = reactive({
  current: 'welcome',
  drawerOpen: false
});

function _leave() { stopPaymentPolling(); }

export function useView() {
  return {
    state,
    isWelcome:  computed(() => state.current === 'welcome'),
    isChat:     computed(() => state.current === 'chat'),
    isStats:    computed(() => state.current === 'stats'),
    isRecharge: computed(() => state.current === 'recharge'),
    goWelcome()  { _leave(); state.current = 'welcome';  state.drawerOpen = false; },
    goChat()     { _leave(); state.current = 'chat';     state.drawerOpen = false; },
    goStats()    { _leave(); state.current = 'stats';    state.drawerOpen = false; },
    goRecharge() {           state.current = 'recharge'; state.drawerOpen = false; },

    // 抽屉显式控制
    drawerOpen:    computed(() => state.drawerOpen),
    openDrawer()   { state.drawerOpen = true; },
    closeDrawer()  { state.drawerOpen = false; },
    toggleDrawer() { state.drawerOpen = !state.drawerOpen; }
  };
}
