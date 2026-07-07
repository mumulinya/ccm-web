# Work Item Next Dispatch Visible v1

## 背景

cc 的 Team/TaskList 链路强调：子 Agent 完成任务后，要继续查看任务列表，找到新解锁的工作项或确认是否解锁了其他人的工作。项目里已经有 `work_items`、依赖、认领和重排逻辑，但任务卡没有把“下一步可派发”的工作项明确展示给用户。

## 本次升级

- 任务卡新增“下一步可派发”区域。
- 前端任务卡数据生成器会从 `work_items` 推导 `next_claimable`。
- 如果后端已经提供 `work_item_summary.next_claimable`，前端优先使用后端结果。
- 全局任务历史和群聊任务卡都可以显示已解锁的后续工作项。

## 用户可见效果

- 用户能看到哪个子 Agent 工作项已经完成。
- 用户能看到下一个可以派发的工作项，例如 `web：接入 owner 筛选 UI`。
- 主 Agent 的协调链路更像真实工作流：前置完成后，后续任务不再只藏在技术数据里。

## 验收覆盖

- `scripts/unified-chat-task-experience-selftest.mjs`
  - 验证全局任务在依赖完成后能推导出 `next_claimable`。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态守护任务卡展示“下一步可派发”。
- `scripts/main-agent-render-regression.mjs`
  - Playwright 真实渲染检查执行队列卡和已解锁工作项文本。
