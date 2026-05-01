import { createApp } from 'vue';
import AppShell from './components/AppShell.vue';

/* PR1: 暂保持旧 CSS 整体导入；PR2 会按组件搬进各 .vue 的 <style scoped> */
import '../css/style.css';

const app = createApp(AppShell);

/* 全局错误兜底：在演示阶段把异常打印到 console，避免静默失败 */
app.config.errorHandler = (err, instance, info) => {
  console.error('[chat-vue] error', err, info);
};

app.mount('#app');
