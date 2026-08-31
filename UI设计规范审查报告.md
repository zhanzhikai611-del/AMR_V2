# AMR_v2 前端 UI 设计规范审查报告

> 审查对象：Vue 3 + Vite + TypeScript 项目（`src/` 下 23 个 `.vue` 组件 + `src/styles/main.css`）
> 审查基准：WCAG 2.1 AA、响应式 Web 设计通用规范、企业级控制台 UI 设计体系最佳实践
> 审查范围：可访问性（A11y）、语义化结构、响应式、色彩对比、交互状态、代码体系一致性

---

## 一、总体结论

**整体评价：良好，但存在 1 项高优先级阻断性问题和若干中低优先级改进项。**

这套 UI 在可访问性工程上明显优于一般业务项目：语义化地标、装饰图标 `aria-hidden`、图标按钮 `aria-label`、对话框 `role="dialog"+aria-modal`、地图标记 `role="button"+tabindex`、全局 `:focus-visible`、`prefers-reduced-motion` 都已覆盖。核心短板集中在 **响应式最小宽度约束** 与 **次要文本/状态文本的色彩对比度** 两项，它们直接触碰 WCAG 硬性指标。

| 维度 | 符合度 | 说明 |
|------|--------|------|
| 语义化结构 / 地标 | ✅ 优秀 | `aside/nav/main/section` + `aria-label` 完整 |
| 装饰元素可访问性 | ✅ 优秀 | 图标 `aria-hidden="true"`，图表 `role="img"` |
| 键盘可达性 | ✅ 良好 | 地图标记、卡片、分页均可聚焦与回车触发 |
| 焦点可见性 | ✅ 良好 | 全局 `:focus-visible` 描边 |
| 对话框无障碍 | ⚠️ 良好但有缺口 | 有 `aria-modal/aria-labelledby`，缺焦点陷阱与 Esc 关闭 |
| 响应式 | ❌ 不达标 | `body{min-width:1180px}` 阻断小屏 |
| 色彩对比度 | ❌ 部分不达标 | `--ink-400/--ink-500` 低于 AA |
| 表格语义 | ⚠️ 不达标 | `<th>` 缺 `scope`，无 `<caption>` |
| 设计体系一致性 | ⚠️ 小问题 | 存在未定义 CSS 变量与死代码 |

---

## 二、符合规范的良好实践（应保留）

1. **`index.html` 规范完整**：`<html lang="zh-CN">`、`viewport` meta、`<title>`、`<meta description>` 齐备（满足 WCAG 3.1.1 语言标识）。
2. **装饰性 SVG 正确隐藏**：`AppIcon.vue` 统一 `aria-hidden="true"`，避免读屏冗余播报。
3. **图标按钮均有可访问名称**：`aria-label="收起派单任务"`、`关闭`、`选择 AMR-xxx，状态` 等（AppLayout / ObjectInspector / DigitalTwinMap / TaskRecordsView）。
4. **模态框语义正确**：`role="dialog" aria-modal="true" aria-labelledby`（BehaviorTreesView 绑定框、MapEditorView 发布/删除框）。
5. **地图 AMR 标记键盘可达**：`<g role="button" tabindex="0" @keydown.enter/.space>`（DigitalTwinMap.vue:141）。
6. **全局焦点样式**：`button:focus-visible, a:focus-visible, ... { outline: 3px ... }`（main.css:52），未用 `outline:none` 直接抹除焦点。
7. **尊重减弱动效偏好**：`@media (prefers-reduced-motion: reduce)`（main.css:351, 412）。
8. **搜索框有屏幕阅读器专用标签**：`.behavior-index-search span/.page-search span { position:absolute; clip:rect(0,0,0,0) }`（视觉隐藏但不删除）。
9. **设计令牌集中管理**：颜色/字号/字重全部收敛在 `:root`，便于统一治理。

---

## 三、关键问题（按优先级）

### 🔴 P0 响应式最小宽度阻断（违反 WCAG 1.4.10 Reflow / 响应式规范）

- **位置**：`src/styles/main.css:46`
  ```css
  html, body, #app { min-width: 1180px; min-height: 100%; margin: 0; }
  ```
- **问题**：强制 1180px 最小宽度，使得视口 < 1180px（小笔记本、平板、所有手机）会出现横向滚动、布局溢出。`main.css` 内虽有 `@media (max-width: 1420/1380/1280/1260/1180/1100/1080/1050/900/720px)` 等多档断点，但因 `body` 不会被压到 1180 以下，这些断点**实际只在横向滚动的放大视图里生效**，响应式意图被架空。WCAG 1.4.10 要求内容在 320px 宽下可用且不出现二维滚动。
- **影响**：在控制室大屏（≥1280px）上没问题；一旦在笔记本/外接小屏或未来做移动巡检端访问，界面直接破损。
- **建议**：
  - 若该产品**仅面向固定控制室大屏**，请显式把"最低支持视口 1180px"写入设计约束文档，并移除误导性断点，避免后续维护者误判；
  - 若需兼顾小屏，将 `min-width:1180px` 改为 `min-width:0`，并针对 <1180 补齐一档布局（侧栏抽屉化、栅格降列）。至少应支持到 1024px 平板横屏。

### 🟠 P1 次要文本色彩对比度不达标（违反 WCAG 1.4.3）

设计体系把灰色文本大量用作正文/副文本/表头/占位，但两档灰色在白底对比度不足：

| 变量 | 取值 | 白底对比度 | 规范要求 | 结论 |
|------|------|-----------|----------|------|
| `--ink-400` | `#9aa8b5` | **≈ 2.4:1** | UI 组件/大文本 ≥ 3:1 | ❌ 不达标 |
| `--ink-500` | `#8192a1` | **≈ 3.2:1** | 正文 ≥ 4.5:1 | ❌ 不达标（仅够大文本/UI 3:1） |
| `--ink-700` | `#405364` | ≈ 8:1 | ≥ 4.5:1 | ✅ 达标 |
| `--structural-ink` | `#15202b` | ≈ 14:1 | — | ✅ 达标 |

- **位置**：`src/styles/main.css:18-19` 定义；被广泛用于 `body` 正文、`--type-compact/caption`、表头 `th`、时间戳、占位符、趋势图坐标轴等（如 `records-table th`、`task-card__meta`、`trend-labels text`、`settings-table th`）。
- **影响**：低视力用户在次要信息（状态、时间、说明）辨识困难；在 `--*-soft` 浅色底（如 `running-soft`、`waiting-soft`）上对比度更低，状态徽标文字尤甚。
- **建议**：将 `--ink-500` 加深至约 `#5f7484`（≈4.6:1）以上、`--ink-400` 加深至约 `#7c8b97`（≈3.5:1，至少满足 UI/大文本）以上；状态徽标文字（如"成功/等待/异常"）建议统一改用更深的专用文字色（参考代码里已对"等待"用 `#9e650f` 的做法）。

### 🟡 P2 表格缺 `scope` 与 `<caption>`（违反 WCAG 1.3.1 信息与关系）

- **位置**：`BehaviorTreesView.vue:68`、`TaskRecordsView.vue:157/178`、`ResourceManagementView.vue`、`UsersSettingsView.vue`、`LogsSettingsView.vue`、`DictionariesSettingsView.vue` 等多处 `<table>`。
- **问题**：所有 `<th>` 均**无 `scope="col"`**，列头与数据单元格的关联仅靠视觉位置，读屏用户无法稳定建立"某单元格属于哪一列"的映射；亦无 `<caption>` 说明表意。
- **建议**：
  ```html
  <th scope="col">任务</th> … <th scope="col">状态</th>
  ```
  并在每张表加 `<caption class="sr-only">…</caption>`（或用 `aria-label` 标注 `<table>`）。

### 🟡 P2 模态框缺焦点管理与 Esc 关闭（WCAG 2.1.1 / 2.4.3 最佳实践）

- **现象**：各对话框（`role="dialog" aria-modal="true"`）只提供 `×` 关闭按钮，未见 `@keydown.esc` 关闭、打开时焦点移入对话框、以及焦点陷阱的实现（仅 MapEditorView:124 有针对工具切换的 Esc，非对话框）。
- **影响**：键盘用户打开弹窗后，Tab 仍可跑出遮罩层；无法用 Esc 快捷关闭。`aria-modal` 在部分浏览器不会自动约束焦点。
- **建议**：封装一个对话框组合式函数/指令，统一处理：打开时 `focus()` 首个可聚焦元素、监听 Esc 关闭、用 `inert` 或焦点陷阱锁定背景。

### 🟡 P2 未定义的 CSS 变量（代码体系一致性 / 潜在渲染异常）

- **位置**：`main.css:280 / 322 / 401 / 425 / 426` 引用了 `--ink-300`、`--ink-600`，但 `:root`（16-19 行）只定义了 `--ink-700/--ink-500/--ink-400`，**这两个变量从未声明**。
- **影响**：无 fallback 的未定义变量在 computed-value 阶段失效，`color` 会回退为 `inherit/initial`（实际常渲染为黑色），与设计意图不符，且属于静默 bug，难排查。
- **建议**：在 `:root` 补定义 `--ink-600:#5b6b78; --ink-300:#b9c4cc;`（或删除引用处）。

### 🟢 P3 低优先级 / 代码卫生

1. **死代码**：`main.css` 中 `.global-topbar / .scope-switcher / .connection-state / .topbar-actions / .alarm-button / .operator-avatar`（94-106 行）在任意 `.vue` 模板中均无对应标记（grep 零命中）。疑似规划中的顶栏未落地。若不再需要应清理；若计划恢复，注意"报警"等纯图标按钮需补 `aria-label`。
2. **非功能性按钮**：`AppLayout.vue:80` 的 `operator-entry` 是 `<button>` 但无 `@click`、无 `aria-haspopup/expanded`，仅靠 `title` 提示——它可聚焦却无行为。应改为非交互元素或补真实菜单（并加 `aria-expanded`）。
3. **正文 `letter-spacing: 1.5px`**（main.css:47 及多个 `--type-*`）对中文正文会增加字距、略损扫读效率，属排版偏好，可按需收敛到 0.5px 或仅用于拉丁数字。
4. **`editor-stage > svg { min-width:820px; min-height:520px }`**（main.css:376）在极小屏会溢出，配合 P0 一起处理。

---

## 四、改进优先级清单

| 优先级 | 事项 | 工作量 | 规范条款 |
|--------|------|--------|----------|
| P0 | 解除/说明 `min-width:1180px` 约束 | 中 | WCAG 1.4.10 / 响应式 |
| P1 | 加深 `--ink-400/--ink-500`，审计状态徽标文字色 | 小 | WCAG 1.4.3 |
| P2 | 表格 `<th scope="col">` + 表说明 | 小 | WCAG 1.3.1 |
| P2 | 对话框焦点陷阱 + Esc 关闭 | 中 | WCAG 2.1.1/2.4.3 |
| P2 | 定义缺失的 `--ink-300/--ink-600` | 极小 | 代码体系 |
| P3 | 清理死 CSS、修正非功能按钮、收敛字距 | 小 | 代码卫生 |

---

## 五、建议

1. **先解决 P0 与 P1**：这两项属于"硬性不达标"，且修复成本低、收益高。P0 决定是否将 1180px 作为正式设计约束；P1 直接改两个变量值即可全局生效。
2. **引入自动化校验**：在 CI 加入 `axe-core` / `@vue/a11y` 与对比度检查（如 `contrast` 工具），把"对比度≥4.5:1、所有 `<th>` 有 `scope`、图标按钮有 `aria-label`"固化为门禁，避免后续迭代回退。
3. **建立最小视口矩阵**：明确产品目标设备（控制室大屏 / 运维笔记本 / 移动巡检），据此定义断点，而非当前"有断点但被 min-width 架空"的状态。

> 需要我直接动手修复其中某几项（例如补充 `--ink` 变量、给所有 `<th>` 加 `scope`、或为对话框加焦点陷阱），告诉我即可，我会在不破坏现有视觉风格的前提下分批提交。
