# CCM 全局视觉规范与响应式布局收口 v1

日期：2026-07-14

## 目标

在不改变 Agent 执行、任务派发和会话业务逻辑的前提下，统一 CCM 的应用外壳、移动导航、核心会话页面和深色主题，让普通用户优先看到任务与结果，把管理和技术状态放入默认折叠入口。

## 已实现

### 应用外壳

- 桌面侧栏从 264px 收紧为 232px。
- 顶部页面标题和标签栏合并为 48px 单层工作栏，桌面不再重复展示当前页面标题。
- 主导航和标签使用 `@lucide/vue` 图标，保留自定义外部页面的通用图标回退。
- 工作区域不再被独立的 56px 标题栏和 42px 标签栏重复占用。

### 移动导航

- 底部固定为五个入口：工作台、全局助手、群聊协作、任务派发、更多。
- 项目、工具、知识库、设置等低频入口进入两列“更多功能”菜单。
- 更多菜单支持当前页面高亮、安全区间距和背景遮罩。
- 手机隐藏桌面标签栏，页面内容使用完整可用宽度。

### 群聊协作

- 首屏只保留工具、共享文件、成员和刷新四个常用操作。
- 日志、保存知识、重命名、清空聊天和删除群聊进入“更多”菜单。
- 会话重命名、归档和删除收进会话操作菜单。
- 上下文压缩状态和 Agent 协作协议默认折叠到“协作状态”，不再持续占用普通对话首屏。
- 使用统一图标、按钮高度、圆角、背景和深色状态。

### 全局助手

- 去除紫蓝渐变、霓虹光球、背景模糊和独立字体。
- 会话侧栏使用中性表面，宽度收紧为 224px。
- 手机默认关闭会话抽屉，避免挤压聊天内容。
- 头部只保留执行状态和保存知识，总控面板与决策评测进入更多菜单。
- 手机头部、输入区和历史消息适配深色模式。

### 设计基础与深色模式

- 新增 `frontend/src/styles/design-system.css`，集中维护字号、间距、圆角、字体、焦点态、选择态和减少动态效果规则。
- 修复 25 个 scoped Vue 组件中的 120 处深色选择器写法。
- 旧写法构建后会退化成裸 `[data-theme=dark]`，导致组件样式错误落到 `html`，出现整页透明、滤镜叠加和组件深色规则失效。
- 修复后，深色组件选择器包含实际目标元素；`html` 的透明度固定为 1、滤镜为 none。
- 手机深色全局助手气泡对比度实测为 15.97:1，高于 4.5:1 验收线。

## 自动回归

新增命令：

```bash
npm run test:global-ui-render
```

覆盖断言：

- 桌面顶部栏高度不超过 50px，侧栏宽度保持 220-240px。
- 桌面标签栏位于顶部工作栏内部，不重复显示页面标题。
- 手机底栏固定五个入口且无横向滚动。
- 更多功能菜单为两列，包含全部非核心页面入口。
- 群聊技术状态和危险操作默认折叠。
- 全局助手无霓虹背景，手机会话抽屉默认关闭。
- 浅色、深色、桌面和手机均无页面级横向溢出。
- 深色助手气泡文本对比度不低于 4.5:1。

截图证据：

- `scratch/global-ui-layout-regression/desktop-light-workbench.png`
- `scratch/global-ui-layout-regression/desktop-dark-group-chat.png`
- `scratch/global-ui-layout-regression/mobile-light-more-menu.png`
- `scratch/global-ui-layout-regression/mobile-dark-global-agent.png`

## 验收结果

通过：

- `npm run check`
- `npm --prefix frontend run build`
- `npm run test:global-ui-render`
- `npm run test:render-regression`
- `npm run test:project-management-render`
- `npm run test:task-dispatch-render`
- `npm run test:settings-render`
- `npm run test:knowledge-render`

项目管理、任务派发和知识库的手机回归脚本已同步改为通过“更多功能”菜单进入页面，不再依赖旧 Emoji 底栏。

## 边界

- 本次不改变 Agent 回复内容、任务状态机、群聊派发、项目会话和后端接口。
- 自定义主题预设继续保留；默认浅色和深色主题使用统一工作台规范。
- 旧 `style.css` 继续承担历史组件兼容，新页面和后续全局规范应优先使用 `design-system.css` 中的令牌，避免继续添加无边界的尾部覆盖。
