import { reactive, computed } from 'vue';
import { MODELS, DEFAULT_MODEL_ID } from '../mock/models.js';

const state = reactive({
  currentModelId: DEFAULT_MODEL_ID
});

const currentModel = computed(() =>
  MODELS.find((m) => m.id === state.currentModelId) || MODELS[0]
);

function selectModel(id) {
  if (MODELS.some((m) => m.id === id)) state.currentModelId = id;
}

export function useModels() {
  return {
    models: MODELS,
    state,
    currentModel,
    selectModel
  };
}
