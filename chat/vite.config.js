import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/* PR1: Vite + SFC 改造
 *  - 仅作用于 chat/ 子目录，根目录的 jQuery 老站不受影响
 *  - base: './' 让产物用相对路径，方便挂在任何子路径下
 *  - publicDir: 'public' 中的 assets/ css/ fonts/ 会被原样拷贝到产物根 */
export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  plugins: [vue()],
  server: {
    port: 5173,
    open: false,
    /* 把 /api/** 反向代理到本地 FastAPI 后端，避免开发期 CORS / cookie 问题。
     * 上线后由 nginx 做同样的事，前端代码无须感知。 */
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        ws: false
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});
