import { reactive, computed } from 'vue';
import { MODELS as MOCK_MODELS, DEFAULT_MODEL_ID } from '../mock/models.js';
import { DEBUG } from '../api/config.js';
import { loadModels as apiLoadModels } from '../api/models.js';

/* 模型可选项
 *
 * - DEBUG=true  → 直接用 mock/models.js 的 MODELS，开箱即用、离线可用
 * - DEBUG=false → 启动时 GET /api/models 从后端拿白名单（含 'auto'）
 *                  接口失败时退回到只剩 'auto' 一项，保证下拉菜单不空
 *
 * 模块加载时即非阻塞触发一次 fetch（singleton），AppShell / ModelMenu 拿到的
 * 都是同一份 reactive state；fetch 回来后下拉菜单会自动出现新选项。
 */

const FALLBACK_MODELS = [{ id: 'auto', label: 'Auto' }];

const state = reactive({
  models: DEBUG ? MOCK_MODELS.slice() : FALLBACK_MODELS.slice(),
  currentModelId: DEBUG ? DEFAULT_MODEL_ID : 'auto',
  defaultId: DEBUG ? DEFAULT_MODEL_ID : 'auto',
  loaded: DEBUG,           // DEBUG: 不需要 fetch；非 DEBUG: 等接口回包后置 true
  loadError: ''            // 给 UI 排查用，目前没暴露在界面
});

let _loadingPromise = null;

const models = computed(() => state.models);

const currentModel = computed(
  () => state.models.find((m) => m.id === state.currentModelId) || state.models[0]
);

function selectModel(id) {
  if (state.models.some((m) => m.id === id)) state.currentModelId = id;
}

function _hydrate(payload) {
  if (!payload || !Array.isArray(payload.models) || payload.models.length === 0) return;
  state.models = payload.models.slice();
  if (payload.default) state.defaultId = payload.default;
  // 当前选中如果不在新列表里（比如后端列表更新了），回退到 default 或第 1 个
  if (!state.models.some((m) => m.id === state.currentModelId)) {
    state.currentModelId = state.defaultId || state.models[0].id;
  }
}

/* 主动刷新模型列表；外部一般不用调，模块加载时已经触发过一次。
 * 给"用户切到新账号 / 想强制重拉"等场景留个口子。 */
async function bootstrapModels({ force = false } = {}) {
  if (DEBUG) return;
  if (!force && state.loaded) return;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = apiLoadModels()
    .then((res) => {
      if (res && res.ok) {
        _hydrate(res);
        state.loadError = '';
      } else {
        state.loadError = (res && res.message) || '模型列表拉取失败';
      }
    })
    .catch((e) => {
      state.loadError = '模型列表拉取异常: ' + (e && e.message || e);
    })
    .finally(() => {
      state.loaded = true;
      _loadingPromise = null;
    });
  return _loadingPromise;
}

// 模块装载时即触发，与 AppShell.onMounted 时序无关；ModelMenu 第一次渲染就能见到
if (!DEBUG && typeof window !== 'undefined') {
  bootstrapModels();
}

export function useModels() {
  return {
    state,
    models,
    currentModel,
    selectModel,
    bootstrapModels
  };
}
