import { reactive, computed } from 'vue';

/* 三态视图机：'welcome' | 'chat' | 'stats'
 * 单例模块作用域 state，整个 chat 子应用共享 */
const state = reactive({
  current: 'welcome'
});

export function useView() {
  return {
    state,
    isWelcome: computed(() => state.current === 'welcome'),
    isChat:    computed(() => state.current === 'chat'),
    isStats:   computed(() => state.current === 'stats'),
    goWelcome() { state.current = 'welcome'; },
    goChat()    { state.current = 'chat'; },
    goStats()   { state.current = 'stats'; }
  };
}
