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
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
});
