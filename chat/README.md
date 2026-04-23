# 凌云智能 - 生意助手 / chat 子模块

电商智能生意助手的对话演示模块。已从 jQuery 重写为 Vue 3（**无构建**：浏览器原生 ESM + CDN）。

## 目录结构

```
chat/
├── index.html             # 仅 #app 挂载点 + importmap + module 入口
├── css/style.css          # 1900+ 行原样保留
├── assets/logo.svg
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
    ├── composables/       # 共享响应式状态
    │   ├── useView.js     # welcome / chat / stats 三态
    │   ├── useSessions.js # 会话 CRUD + 派生标题
    │   ├── useModels.js   # 当前模型选择
    │   ├── useUploads.js  # 待发送附件队列
    │   └── useModalStack.js
    └── components/
        ├── AppShell.js    # 根组件
        ├── Sidebar.js
        ├── FloatActions.js
        ├── WelcomeView.js
        ├── ChatView.js
        ├── StatsView.js
        ├── Composer.js    # 输入框（欢迎页/对话页两处复用）
        ├── ModelMenu.js
        ├── UploadButton.js
        ├── AttachmentChips.js
        ├── MessageItem.js
        ├── Pager.js
        ├── BaseModal.js   # teleport + ESC + 锁滚 class 通用容器
        ├── ContactModal.js
        ├── SkillsModal.js
        └── NoticeModal.js
```

## 运行

> **必须经 HTTP 服务**。原生 ESM 在 `file://` 下会被浏览器拒绝。

任选其一：

```bash
# 在仓库根目录
python3 -m http.server 8765
# 然后访问 http://localhost:8765/chat/

# 或者
npx serve .
```

## 关键技术点

- **Vue 3 通过 importmap 引入**，`<script type="importmap">` 把裸说明符 `vue` 映射到
  `https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js`（带模板编译器，可写 `template: \`...\``）。
- **状态共享**：用模块作用域的 `reactive()` + composable 工厂函数（如 `useSessions()`），
  返回单例 state，欢迎页与对话页两处 Composer 自动同步。
- **Modal 栈**：`useModalStack` 集中管理 ESC、body 锁滚 class、栈顶关闭语义；
  `BaseModal` 通过 `<Teleport to="body">` 把弹窗挂到根，避免 z-index/clip-path 干扰。
- **CSS 100% 沿用**：模板里的 `:class` 与原 jQuery 版相同，`chat/css/style.css` 一行未改。

## 备选 CDN

`unpkg` 偶发慢或超时时，换成：

```html
<script type="importmap">
{ "imports": { "vue": "https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.prod.js" } }
</script>
```

或本地化（推荐生产环境）：

```bash
mkdir -p chat/js/vendor
curl -L -o chat/js/vendor/vue.esm-browser.prod.js \
  https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js
```

并将 importmap 改为：

```html
<script type="importmap">
{ "imports": { "vue": "./js/vendor/vue.esm-browser.prod.js" } }
</script>
```

## 接真后端的最小改动

1. `js/api/chat.js`
   - `FAKE_API_URL` → 真实对话接口
   - `UPLOAD_API_URL` → 真实上传接口
   - `ENABLE_REAL_UPLOAD = true`
2. `js/mock/` 下的常量与生成函数：按字段替换为接口返回。例如把
   - `usageStats.js` 改为 `export async function fetchUsageStats() { ... }`
   - `usageRecords.js` 改为 `fetchUsageRecords({ page, size })`
3. 在对应组件里（`StatsView.js` / `AppShell.js`）改成 `onMounted` 时拉取并赋给 `ref/reactive`。

## 已知限制

- 不引入打包工具，因此**严格依赖 ES Modules**：IE 全系列、Safari < 11 不可用。
- 没有路由：三个视图通过 state 切换，URL 不会变化。如果未来需要分享链接，可
  在 `useView.js` 里挂 `pushState` / `popstate`，组件无需变更。
- 演示阶段 `sendMessage` 打到 `jsonplaceholder.typicode.com`，仅为了让 Network 面板
  能看到一次请求，不会用其响应内容。最终回答始终是 `mock/fixedAnswer.js` 里的固定串。

## 与旧 jQuery 版的行为差异

- **历史回放与 live 渲染统一了视觉**：助手消息只要带 `_liveFlags`（曾经走过 live 链路），
  即使会话切换后再回来仍会保留工具列表。jQuery 版会在重新渲染时丢掉工具列表。
  这是从「两套渲染函数」统一到「一份模板 + 数据驱动」之后的自然结果，UX 更一致。
- 其它行为（会话切换、附件预览、模型菜单同步、Modal 栈、统计分页等）与旧版一致。
