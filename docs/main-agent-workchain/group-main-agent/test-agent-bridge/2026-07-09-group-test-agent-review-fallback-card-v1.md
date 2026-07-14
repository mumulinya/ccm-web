# 群聊 TestAgent 复核兜底卡片 v1

日期：2026-07-09

## 目标

当群聊前端收到 `test_agent_review_ready`，但当前消息列表里没有能合并的任务卡时，仍然给用户展示清晰的 TestAgent 复核结论。

之前的兜底是追加一条 work event。它能避免信息丢失，但用户很难像看任务卡一样看到“复核状态、证据、下一步”。参考 CC 的主链路思路，子任务或复核结果应该被主流程消化成用户可读摘要，而不是只留在内部事件中。

## 改动

- `frontend/src/components/collaboration/GroupChat.vue`
  - 复用 `resolveTestAgentFallbackTaskId(...)`，当 review-ready 没有 `taskId` 时优先接到最近的 TestAgent 计划兜底卡。
  - 新增 `testAgentReviewPhase(...)`，把 TestAgent 复核状态转成群聊任务卡阶段。
  - 新增 `createTestAgentReviewFallbackMessage(...)`，在找不到可合并任务卡时创建轻量任务卡。
  - `applyTestAgentReviewReady(...)` 的 fallback 从 work event 升级为 `project_task_intake` 消息，复用现有 `TaskCollaborationCard` 展示。
  - 用户可见区只展示复核摘要、证据和下一步；`test_agent_report`、trace、原始事件类型继续放技术详情。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码守护，确认群聊 review-ready 兜底会生成任务卡，而不是退回成纯内部事件。

## 用户体验

- 即使第三方写代码 Agent 或 TestAgent 只回传复核事件，没有完整任务卡，用户也能看到结构化复核卡。
- `needs_rework` 显示“需返工”，`needs_user` 显示“等你确认”，`passed` 显示“复核已返回”。
- 普通问话不触发这条链路，不会额外显示 Todo 或复核卡。

## 验证

已运行并通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run test:render-regression`
