# 群聊 TestAgent 复核计划兜底卡片 v1

日期：2026-07-09

## 目标

当群聊前端收到 `test_agent_execution_plan_ready`，但当前消息列表里没有能合并的任务卡时，仍然展示结构化 TestAgent 复核计划。

这和复核结论兜底卡片配套：计划先返回时用户能看到“复核计划 / 预检受阻 / 下一步”，后续复核结论如果带同一个任务 ID 会继续合并进同一任务卡。

## 改动

- `frontend/src/components/collaboration/GroupChat.vue`
  - 新增 `resolveTestAgentFallbackTaskId(...)`，当事件没有 `taskId` 时，把后续复核结论接到最近的 TestAgent 计划兜底卡。
  - 新增 `createTestAgentExecutionPlanFallbackMessage(...)`。
  - `applyTestAgentExecutionPlanReady(...)` 在找不到任务卡时创建轻量 `project_task_intake` 消息，而不是只追加 work event。
  - 复核计划和预检问题进入用户可见任务卡；原始 execution plan、trace、事件类型继续放技术详情。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码守护，确认 plan-ready fallback 生成任务卡。

## 用户体验

- TestAgent 复核计划返回时，即使任务卡暂时缺失，用户也能看到计划摘要、预计证据、预检问题和下一步。
- 预检受阻会显示“需修复”，可执行计划会显示“复核准备中”。
- 普通问话不触发这条链路。

## 验证

已运行并通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run test:render-regression`
