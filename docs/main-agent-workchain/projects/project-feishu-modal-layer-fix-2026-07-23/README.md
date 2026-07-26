# 项目飞书配置弹窗层级修复

## 问题

项目编辑弹窗使用 `z-index: 10030`，旧飞书扫码弹窗复用了通用 `.modal-overlay`，层级只有 `100`。从编辑项目中打开飞书配置时，飞书弹窗因此被压在编辑弹窗下面。

## 修复

- 飞书配置弹窗通过 Vue `Teleport` 直接挂载到 `body`，不再受编辑弹窗的堆叠上下文限制。
- 飞书弹窗使用独立遮罩层和 `z-index: 10100`，明确高于项目编辑弹窗。
- `Escape` 只关闭当前最上层的飞书弹窗，编辑项目弹窗继续保留。
- 点击飞书弹窗遮罩只关闭飞书弹窗。
- 移动端使用底部面板布局，内容区域可滚动，二维码保持固定宽高比。
- 弹窗按钮和提示改用 Lucide 图标，并保留原有扫码链接生成和授权流程。

## 验证

- `node scripts/modal-layout-reliability-selftest.mjs`：通过。
- `npm run build:frontend`：通过。
- `node scripts/project-management-render-regression.mjs`：11 项通过，0 个页面错误。
- 浏览器验证确认飞书弹窗挂载在 `body`，并且计算层级高于编辑项目弹窗。
- 验证截图：[desktop-project-feishu-modal-layer.png](evidence/desktop-project-feishu-modal-layer.png)
- npm release 回归 5/5 通过，修复已发布为 `@mumulinya167/cc-web@1.0.21`，`latest` 已指向该版本。

测试使用本地 mock API，没有调用付费 Provider。
