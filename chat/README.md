# 凌云智能 · 国际站生意助手（前端 Demo）

参照截图从 0 搭建的对话式 Web Demo，使用 **HTML + CSS + jQuery**，无需任何构建工具。

本目录作为主站点 `skylangai_web` 的子应用存在，访问路径为 **`/chat/`**。

## 目录结构

```
skylangai_web/
├── index.html          # 主站营销页
├── css/  js/  ...      # 主站资源（与本目录隔离）
└── chat/               # ← 当前目录（独立子应用）
    ├── index.html      # 页面入口
    ├── css/
    │   └── style.css   # 全部样式（侧边栏 / 欢迎页 / 对话页）
    ├── js/
    │   └── app.js      # jQuery 业务逻辑（输入、发送、渲染）
    ├── assets/
    │   └── logo.svg    # 占位 logo（橙色 A）
    └── README.md
```

> jQuery 复用主站本地文件 `../js/jquery-3.7.1.min.js`，避免 CDN 依赖与版本漂移。
> 这是当前唯一与外部目录的耦合点；其余 CSS/JS/资源均在本目录内自包含，可随时迁出独立部署。

## 运行方式

> 必须在「HTTP 协议」下打开（不要直接双击 `index.html`），否则相对路径解析会失效。

在**主站根目录** `skylangai_web/` 下任选一种静态服务器启动：

```bash
# 方式 1：Python 3
python3 -m http.server 5173

# 方式 2：Node（npx，无需安装）
npx --yes http-server -p 5173 -c-1
```

然后浏览器打开：<http://localhost:5173/chat/>

## 功能说明

1. **欢迎页**：居中 logo、标题、输入框、6 个 Tab、推荐提示词列表。
2. **发送消息**：
   - 点击发送按钮 / 按 `Enter`（`Shift+Enter` 换行）
   - 点击推荐提示词也会直接发送
3. **请求与回答**：
   - 调用「假 URL」`https://jsonplaceholder.typicode.com/posts`（真实可达，便于在浏览器 Network 面板观察请求；如需换成完全不存在的 URL 也可以，代码内已用 `.always()` 兜底）。
   - 无论请求成功 / 失败，都会渲染**固定回答**（彩妆品类示例文案）。
4. **对话视图**：用户气泡（右侧绿色头像）+ 助手块（logo + 名称 + 「已处理 N 秒」+ 工具调用列表 + loading 三点动画 + 最终答案）。
5. **侧边栏**：`Messages` 区会自动登记当前会话；点击「+ 新消息」回到欢迎页。

## 自定义

| 想改什么 | 改哪里 |
|---|---|
| 假 URL 地址 | `js/app.js` 顶部 `FAKE_API_URL` |
| 固定回答内容 | `js/app.js` 顶部 `FIXED_ANSWER` |
| 推荐提示词 | `js/app.js` 顶部 `PROMPTS` 数组 |
| 助手名字 / logo | `ASSISTANT_NAME` 常量 / `assets/logo.svg` |
| 主题颜色 | `css/style.css` 顶部 `:root` 变量 |

## 后续扩展建议

- **接真实 API**：把 `FAKE_API_URL` 换成你后端的接口；在 `.done()` 回调里使用 `resp.answer`、`resp.tools` 等字段替换硬编码内容即可。
- **流式输出**：jQuery 的 `$.ajax` 不擅长 SSE / 流，建议届时改用原生 `fetch + ReadableStream` 或 `EventSource`，jQuery 仍可保留处理其它 DOM 工作。
- **复杂状态管理**：如果功能继续增长（多 Agent、收藏、历史会话持久化等），推荐迁移到 **Vue 3**（CDN 也能用，无需打包）或 **React + Vite**，可避免大量手写 DOM 操作。
- **持久化**：当前 `sessions` 仅存在内存中，可加 `localStorage` / `IndexedDB`。
