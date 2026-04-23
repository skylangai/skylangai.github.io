import { createApp } from 'vue';
import AppShell from './components/AppShell.js';

const app = createApp(AppShell);

/* 全局错误兜底：在演示阶段把异常打印到 console，避免静默失败 */
app.config.errorHandler = (err, instance, info) => {
  console.error('[chat-vue] error', err, info);
};

app.mount('#app');
