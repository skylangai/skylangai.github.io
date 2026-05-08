/* 模型列表 API
 *
 * - DEBUG=true  → 不打后端，使用 mock/models.js 的本地列表（保持纯演示模式可用）
 * - DEBUG=false → GET /api/models 拿后端白名单（无需登录，欢迎页也能用）
 *
 * 响应统一形如：
 *   { ok: true, code: 0, models: [{id, label}, ...], default: 'auto' }
 */
import { DEBUG, apiGetJson } from './config.js';
import { MODELS as MOCK_MODELS, DEFAULT_MODEL_ID } from '../mock/models.js';

export function loadModels() {
  if (DEBUG) {
    return Promise.resolve({
      ok: true,
      code: 0,
      models: MOCK_MODELS.slice(),
      default: DEFAULT_MODEL_ID
    });
  }
  return apiGetJson('/models');
}
