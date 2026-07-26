# 工作台全宽数据布局

日期：2026-07-23

## 问题

“我的工作台”此前使用 `width:min(1320px,100%)` 并水平居中。在宽屏内容区中，左右会留下明显空白，统计条、目标输入区、快捷入口、执行流和项目资源没有利用现有空间。

## 当前行为

- 工作台宽度始终为当前标签内容区的 `100%`，不再设置固定最大宽度。
- 内边距使用 `clamp(20px, 2.1vw, 40px)`，窄桌面保留操作空间，宽屏也不会出现过大的空白边缘。
- 状态统计、目标输入区、快捷入口和下方工作网格使用同一内容宽度。
- 桌面资源栏使用 `minmax(320px, 25%)`，主执行流占用剩余空间；屏幕变宽后两侧都会获得有效展示面积。
- `1050px` 以下仍切换为单列工作流，`760px` 以下继续使用移动端布局。
- 页面没有新增固定白底，继续跟随用户选择的主题。

## 修改范围

- `frontend/src/components/common/UsabilityWorkbench.vue`
- `scripts/usability-workbench-redesign-selftest.mjs`
- `scripts/workbench-full-width-render-regression.mjs`

工作台数据来源、实时事件、任务操作、项目启停、定时任务和目标确认流程没有改变。

## 验证

- 静态工作台回归确认旧 `1320px` 上限已经移除。
- `1680px` 浏览器中，工作台元素宽度与标签内容区误差不超过 `1px`。
- 状态统计条和主工作网格占用相同内容宽度，资源栏宽度不低于 `320px`。
- `390px` 移动端工作台与父容器等宽，页面和工作台均无横向溢出。
- frontend production build 通过。
- 测试使用 mock 数据，付费 Provider 调用为 `0`。

视觉证据位于 `scratch/workbench-full-width-render-regression/`，该目录为本地测试产物，不进入 Git。
