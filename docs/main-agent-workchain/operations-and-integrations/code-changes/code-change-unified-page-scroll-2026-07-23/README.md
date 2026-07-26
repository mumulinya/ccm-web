# 代码协作主体页面统一滚动

日期：2026-07-23

> 此方案已被 [等高双面板独立滚动](../independent-dual-pane-scroll-2026-07-23/README.md) 替代。本文只保留为历史实施记录，不代表当前界面行为。

## 问题

代码协作页此前固定为视口高度，并在外层、文件列表和 Diff 查看器分别使用 `overflow`。任务摘要和 Git 工具栏占用上半屏后，代码区只剩较小高度，用户只能在局部框内滚动，主体页面无法继续向下浏览。

## 当前布局

- “代码协作”标签页单独启用主体纵向滚动，不影响全局助手、群聊、终端等固定视口页面。
- 工作台、目录树和 Diff 不再拥有独立纵向滚动条。
- 代码区提供至少 `900px` 的桌面查看高度，移动端至少 `620px`。
- Diff 内容按实际行数继续向下撑开主体页面。
- Diff 工具栏使用 sticky 定位，页面下滑后仍可执行搜索、Hunk 导航、统一/左右视图、复制、下载和回滚。
- 长代码行仍在代码区域内横向滚动，不会撑宽整个页面。
- 目录树与代码内容共享同一页面滚动位置，避免多个滚动条争抢滚轮。

## 范围

仅修改代码协作页的滚动边界：

- `App.vue` 为代码协作标签增加独立可滚动容器。
- `CodeChanges.vue` 让工作台按内容增长并保持 Diff 工具栏粘性。
- `CodeChangeFileList.vue` 移除目录列表纵向滚动框。
- `CodeDiffViewer.vue` 分离页面纵向增长和代码横向滚动。

Git 提交、推送、目录选择、Diff 数据和安全门禁没有改变。

## 验证

- frontend production build：通过。
- `node scripts/code-changes-render-regression.mjs`：6 项通过。
- 浏览器断言主体标签页 `scrollHeight > clientHeight`。
- 浏览器断言工作台、目录树和 Diff 的纵向 overflow 均为 `visible`。
- 页面滚动后 Diff 工具栏保持可见。
- 桌面和 390px 移动端均无横向页面溢出。
- 自动化测试没有连接用户 GitHub，没有付费 Provider 调用。

## 视觉证据

- [页面顶部](evidence/desktop-page-top.png)
- [主体下滑与粘性工具栏](evidence/desktop-page-scroll.png)
- [移动端页面](evidence/mobile-page.png)
