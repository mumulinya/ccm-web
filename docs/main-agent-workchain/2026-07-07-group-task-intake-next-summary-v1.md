# 群聊任务接管“接下来”摘要 v1

## 背景

`D:\claude-code` 的 coordinator 规则强调：启动或安排 worker 后，要简短告诉用户已经启动了什么；worker 结果会后续返回，不能提前编造结果。

本项目的群聊主 Agent 创建项目任务时，任务卡和 Todo 已经存在，但接管气泡本身偏轻。用户如果不展开任务卡，可能只看到“我明白了”，却不够清楚下一步是确认计划、进入队列，还是等待子 Agent 结果说明。

## 本次升级

- 后端 `/api/groups/send` 的 `task_created` SSE 事件新增 `intakeSummary` / `intake_summary`。
- 持久群聊消息也保存同一份 `intakeSummary`，刷新后仍能看到。
- `intakeSummary` schema 为 `ccm-group-task-intake-summary-v1`，包含：
  - 主 Agent 已接管需求。
  - 执行前检查状态。
  - 队列状态。
  - 后续会等待子 Agent 提交结果说明，再由主 Agent 验收和总结。
- 前端 `ProjectTaskIntakeMessage` 新增“接下来”区块，默认展示在任务接管文本下方，不需要展开技术详情。
- `task_created` SSE 同时携带 `taskRuntime`，让本地消息更快拿到任务卡上下文。

## 用户体验

任务接管气泡现在会显示：

```text
接下来 · 已入队
我已接管「...」，会按任务链路继续推进。

主 Agent：coordinator 已接管需求
执行前检查：只读检查已完成
队列状态：已进入执行队列，位置 1
后续跟踪：等待子 Agent 提交结果说明，主 Agent 再验收和总结

下一步：等待主 Agent 启动执行、派发子 Agent，并回收结果说明。
```

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `groupTaskIntakeSummaryVisible`，检查：

- 后端存在 `ccm-group-task-intake-summary-v1`。
- `task_created` 事件携带 `intakeSummary` 和 `taskRuntime`。
- 前端接管气泡渲染“接下来”和“下一步”。
- 摘要使用“结果说明/验收/总结”这类用户可读表达。
- 接管气泡顶部状态跟随 `intakeSummary.status_label`，避免已入队任务显示成笼统的“执行中”。

## 补充优化

`ProjectTaskIntakeMessage` 顶部状态现在优先展示后端给出的用户可读状态：

- 等待确认：需要用户确认执行前计划。
- 已入队：已进入主 Agent 执行队列。
- 已保存：暂未进入执行队列，等待通道恢复或手动启动。

这样用户不用展开技术详情，也能在同一个气泡里看到“主 Agent 已接管、当前处于什么状态、下一步等什么”。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm --prefix frontend run build`
- `npm run build:backend`
- `npm run test:chat-experience`
- `npm run build`
- `npm run test:render-regression`
- `git diff --check -- backend/modules/collaboration/group-live-routes.ts frontend/src/components/collaboration/GroupChat.vue frontend/src/components/collaboration/ProjectTaskIntakeMessage.vue scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/2026-07-07-group-task-intake-next-summary-v1.md`

以上验证均通过；`git diff --check` 只保留仓库既有的 CRLF 提示，没有发现空白错误。
