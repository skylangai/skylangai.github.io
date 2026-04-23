/* 可选模型列表
 * 接真后端时只需替换此数组 / 把 currentModelId 持久化到 localStorage */
export const MODELS = [
  { id: 'auto',         label: 'Auto' },
  { id: 'deepseek-3.2', label: 'DeepSeek V3.2' },
  { id: 'qwen-3.5',     label: 'Qwen 3.5' },
  { id: 'doubao-2.0',   label: 'Doubao 2.0' },
  { id: 'kimi-2.5',     label: 'Kimi K2.5' },
  { id: 'glm-4.7',      label: 'GLM 4.7' }
];

export const DEFAULT_MODEL_ID = 'auto';
