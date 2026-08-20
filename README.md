# AMR_v2

面向厂内物流场景的 AMR 数字孪生运行平台。

## 当前状态

- 已完成 Vue 3、Vite、TypeScript、Vue Router、Pinia 和 Axios 基础环境。
- 已预留统一接口层 `src/api`。
- 已实现数字孪生首页初版，包括活动任务、2D 地图、全局状态与对象检查面板。
- 已实现单一折叠侧栏、派单中心与行为树初版入口。
- 派单中心在单一菜单内集成“实时派单”和“任务记录”，支持全局任务、任务详情和调度策略原型。
- 模拟数据集中存放在 `mock`，页面通过统一 API 模块读取。
- 已在 `.runtime/node` 准备项目专用 Node.js 24，不依赖电脑中的旧版 Node。
- 资源管理和系统设置当前为页面结构占位，等待对应需求细化。

## 本地运行

```bash
export PATH="$PWD/.runtime/node/bin:$PATH"
npm run dev
```

浏览器访问 `http://127.0.0.1:5173`。

## GitHub Pages

推送到 `codex/amr-v2-initial` 分支后，GitHub Actions 会自动构建并发布：

`https://zhanzhikai611-del.github.io/AMR_V2/`

Pages 构建使用 `/AMR_V2/` 作为资源基础路径，本地开发仍使用 `/`，因此本地访问地址不变。

## 检查

```bash
export PATH="$PWD/.runtime/node/bin:$PATH"
npm run type-check
npm run build
```

每次打开新的终端后，在 `AMR_v2` 目录先执行一次上述 `export PATH`。该设置只影响当前终端，不修改电脑的全局 Node 环境。

## 功能文档

- [派单中心功能说明](docs/dispatch-center.md)
