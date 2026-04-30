# 凌云智能 - 生意助手 / chat 子模块

电商智能生意助手的对话演示模块。Vue 3 单文件组件（SFC）+ Vite 子工程。

> **本次改造（PR1）**：从「无构建 + ESM CDN + JS 模板字符串」迁移到「Vite + SFC」，
> CSS 暂未拆分，整体仍是 `chat/css/style.css` 由 `main.js` 一次性 import。
> 后续 PR2 会把样式按组件搬进各 `.vue` 的 `<style scoped>`。

## 目录结构

```
chat/
├── package.json           # 子工程依赖（vue, vite, @vitejs/plugin-vue）
├── vite.config.js         # base: './' + publicDir: 'public'
├── index.html             # Vite 入口（仅 #app 挂载点 + module 入口）
├── public/                # 原样拷到产物根
│   ├── assets/logo.svg
│   ├── css/font-awesome.min.css
│   └── fonts/             # font-awesome 字体
├── css/style.css          # 1900+ 行原样保留（PR2 才会拆）
└── js/
    ├── main.js            # createApp(AppShell).mount('#app')
    ├── api/
    │   └── chat.js        # sendMessage / uploadAttachments（fetch）
    ├── mock/              # 演示数据，接真后端时按字段替换
    │   ├── prompts.js
    │   ├── models.js
    │   ├── skills.js
    │   ├── usageStats.js
    │   ├── usageRecords.js
    │   └── fixedAnswer.js
    ├── utils/
    │   └── format.js
    ├── composables/       # 共享响应式状态（不变）
    │   ├── useView.js
    │   ├── useSessions.js
    │   ├── useModels.js
    │   ├── useUploads.js
    │   └── useModalStack.js
    └── components/        # 全部为 .vue SFC
        ├── AppShell.vue
        ├── Sidebar.vue
        ├── FloatActions.vue
        ├── WelcomeView.vue
        ├── ChatView.vue
        ├── StatsView.vue
        ├── Composer.vue
        ├── ModelMenu.vue
        ├── UploadButton.vue
        ├── AttachmentChips.vue
        ├── MessageItem.vue
        ├── Pager.vue
        ├── BaseModal.vue
        ├── ContactModal.vue
        ├── SkillsModal.vue
        └── NoticeModal.vue
```

## 运行

首次需要安装依赖：

```bash
cd chat
npm install
```

### 开发（带 HMR）

```bash
npm run dev
# 访问 http://localhost:5173/
```

### 生产构建

```bash
npm run build
# 产物输出到 chat/dist/
# 把 chat/dist/ 拷到部署目标（取代旧的 chat/ 目录）
```

### 本地预览构建产物

```bash
npm run preview
```

## 关键技术点

- **Vite + `@vitejs/plugin-vue`**：原生 SFC 编译，自动 tree-shake、HMR 热更。
- **`base: './'`**：产物使用相对路径，挂在任意子路径下都能跑（`/chat/`、CDN 路径等）。
- **`publicDir: 'public'`**：`public/` 下的 `assets/`、`css/font-awesome.min.css`、`fonts/`
  在构建时**原样拷到产物根**，运行时通过 `/assets/logo.svg`、`/css/font-awesome.min.css` 访问。
- **状态共享不变**：`composables/` 下用模块作用域 `reactive()` + composable 工厂函数，
  所有组件共享单例 state。Vite 下行为与之前完全一致。
- **CSS 100% 沿用**：`chat/css/style.css` 一行未改，由 `main.js` 顶部 `import` 引入。
  PR2 才会把它搬进各 `.vue` 的 `<style scoped>`。

## 接真后端的最小改动

1. `js/api/chat.js`
   - `FAKE_API_URL` → 真实对话接口
   - `UPLOAD_API_URL` → 真实上传接口
   - `ENABLE_REAL_UPLOAD = true`
2. `js/mock/` 下的常量与生成函数：按字段替换为接口返回。例如把
   - `usageStats.js` 改为 `export async function fetchUsageStats() { ... }`
   - `usageRecords.js` 改为 `fetchUsageRecords({ page, size })`
3. 在对应组件里（`StatsView.vue` / `AppShell.vue`）改成 `onMounted` 时拉取并赋给 `ref/reactive`。

## 部署

构建后的 `chat/dist/` 是一个**完全静态**的目录，扔到任意静态服务器即可：

```text
dist/
├── index.html
├── assets/
│   ├── index-xxxxxxxx.js
│   ├── index-xxxxxxxx.css
│   └── logo.svg
├── css/font-awesome.min.css
└── fonts/
```

## 与上一版（无构建 + ESM CDN）的差异

| 维度 | 旧版 | 当前 |
|---|---|---|
| 模块加载 | `<script type="importmap">` + unpkg CDN | npm + Vite 打包 |
| 组件文件 | `.js` 里 `defineComponent({ template: \`...\` })` | `.vue` SFC（`<script setup>` + `<template>`） |
| 启动方式 | `python3 -m http.server` | `npm run dev`（HMR） |
| CSS | `<link href="css/style.css">` | `import '../css/style.css'`（PR2 将拆 scoped） |
| 部署 | 整个 `chat/` 目录 | `chat/dist/` |
| 行为 | — | **与旧版一致**（业务逻辑、模板、CSS 类名 0 改动） |

## 已知限制

- 没有路由：三个视图通过 state 切换，URL 不会变化。如果未来需要分享链接，
  可在 `useView.js` 里挂 `pushState` / `popstate`，组件无需变更。
- 演示阶段 `sendMessage` 打到 `jsonplaceholder.typicode.com`，仅为了让 Network 面板
  能看到一次请求，不会用其响应内容。最终回答始终是 `mock/fixedAnswer.js` 里的固定串。

## 后续计划：PR2 — 按组件拆 CSS

把 `chat/css/style.css`（1900+ 行）按组件 className 摘到各 `.vue` 的 `<style scoped>`，
公共部分（CSS 变量、reset、字体、跨组件 layout primitives）保留在 `style.css`。
预计 `style.css` 最终瘦身到 100-300 行，组件之间彻底样式隔离。
