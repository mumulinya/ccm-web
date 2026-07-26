# 全页面统一加载遮罩

## 目标

CCM 所有业务页面在首次读取数据时使用同一个加载体验，避免接口较慢时先展示空列表、空会话或未选择项目等误导状态。登录校验也复用同一组件，不再维护独立的全屏加载样式。

## 当前行为

- `PageLoadingOverlay.vue` 是唯一的页面级加载组件。
- 登录状态校验使用全视口模式；登录完成后，业务页遮罩只覆盖内容区，导航、当前页面名称和移动端底栏保持可见。
- 19 个异步业务页统一等待“页面代码模块已加载 + 首轮关键 GET 请求已结束”。静态首页也进入相同门禁。
- 每个标签页只在第一次打开时显示遮罩；标签页常驻后再次切回不会闪烁，也不会因 SSE 或后台刷新重新遮挡。
- 最短显示约 `420ms`，避免极短白闪；请求结束后保留约 `240ms` 稳定期，覆盖组件挂载后立即发出的首轮请求。
- 超过 `8s` 会显示慢加载说明和“重新加载”按钮。
- 登录遮罩在首帧读取已保存主题，避免深色主题先闪白再切换。

## 请求边界

`main.js` 的统一 `fetch` 包装器只追踪当前页面首次加载期间、同源 `/api/` 下的 `GET` 请求。请求无论成功、HTTP 失败还是网络异常都会结束计数，具体错误继续由页面自身展示。

以下持续连接或后台请求不参与页面门禁：

- `/api/auth/session`：由根登录遮罩单独负责。
- `/api/runtime/events`
- `/api/status/stream`
- `/api/usability/workbench/stream`
- `/api/music/remote-command`

列表骨架、搜索中、目录读取、构建中和按钮 loading 等局部反馈仍由各组件保留。统一遮罩只解决页面首次可用之前的全局状态，不替代细粒度操作反馈。

## 数据流

```text
切换到未加载标签
  -> 设置精确 page scope
  -> 加载异步页面模块
  -> 追踪首轮同源 GET 请求
  -> 模块完成且请求计数归零
  -> 稳定期结束
  -> 标记标签页 ready 并移除遮罩
```

后台事件和已加载标签页的新请求不会把 `ready` 改回加载中。

## 文件

- `frontend/src/components/common/PageLoadingOverlay.vue`
- `frontend/src/utils/pageLoadTracker.js`
- `frontend/src/main.js`
- `frontend/src/App.vue`
- `frontend/src/Root.vue`
- `scripts/global-page-loading-overlay-selftest.mjs`
- `scripts/global-page-loading-render-regression.mjs`

## 验证

- 静态回归确认 19 个 `PAGE_LOADERS` 全部通过共享 `definePageComponent(pageId, loader)` 接入。
- 确认 `App.vue` 只有一个内容区遮罩，`Root.vue` 复用同一组件，旧 `root-auth-loading` 已删除。
- Playwright 人为延迟登录、项目和群聊接口，验证桌面与移动端遮罩出现、加载后消失、切回已加载标签不重复出现。
- 深海主题下登录校验与业务页面均使用真实主题变量。
- 测试使用本地 mock API，付费 Provider 调用为 `0`。

截图与机器可读报告位于 `scratch/global-page-loading-render-regression/`，该目录为本地测试产物，不进入 Git。
