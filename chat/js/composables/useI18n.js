import { computed, reactive, watch } from 'vue';
import { MESSAGES } from '../i18n/messages.js';

/* Shared with the marketing site (skylangai_web/js/i18n.js) so language
 * preference survives navigation between / and /chat. */
const STORAGE_KEY = 'skylang-lang';
const DEFAULT_LANG = 'zh';

function readStoredLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch (e) { /* private mode */ }
  return DEFAULT_LANG;
}

const state = reactive({
  lang: readStoredLang()
});

function applyDocumentLang(lang) {
  const html = document.documentElement;
  if (!html) return;
  html.lang = lang === 'en' ? 'en' : 'zh-CN';
  html.setAttribute('data-lang', lang);
  const dict = MESSAGES[lang] || MESSAGES.zh;
  if (dict['page.title']) document.title = dict['page.title'];
}

applyDocumentLang(state.lang);

watch(() => state.lang, (lang) => {
  applyDocumentLang(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) { /* ignore */ }
  window.dispatchEvent(
    new CustomEvent('skylang:langchange', { detail: { lang } })
  );
});

/* Simple {name} interpolation */
function format(template, params) {
  if (!params) return template;
  return String(template).replace(/\{(\w+)\}/g, (_, k) =>
    params[k] != null ? String(params[k]) : '{' + k + '}'
  );
}

export function t(key, params) {
  const lang = state.lang;
  const dict = MESSAGES[lang] || MESSAGES.zh;
  const fallback = MESSAGES.zh;
  const raw = (dict && dict[key] != null) ? dict[key]
    : (fallback && fallback[key] != null) ? fallback[key]
    : key;
  return format(raw, params);
}

export function setLang(lang) {
  if (lang !== 'en' && lang !== 'zh') lang = DEFAULT_LANG;
  state.lang = lang;
}

export function toggleLang() {
  setLang(state.lang === 'en' ? 'zh' : 'en');
}

export function useI18n() {
  const lang = computed(() => state.lang);
  const isEn = computed(() => state.lang === 'en');
  return {
    lang,
    isEn,
    t,
    setLang,
    toggleLang
  };
}
