# Phase 49 - Replay Repair Claim And Dispatch

## 目标

把 Phase 48 的 replay repair pending work items 从“可读 sidecar 待办”升级为“主 Agent 可显式认领、派发标记、阻塞、完成、重开”的状态机。这样群聊主 Agent 不只知道压缩边界 replay 有缺口，还能在不污染真实任务队列的前提下管理这些记忆修复工作。

## 实现

- 新增 `updateCompactBoundaryReplayRepairWorkItem()`。
- 新增 Memory Center API：
  - `POST /api/memory-center/replay-repair-work-item`
- 支持动作：
  - `claim`
  - `dispatch`
  - `complete` / `resolve`
  - `block`
  - `cancel`
  - `reopen`
- work item 记录：
  - `owner`
  - `startedAt`
  - `completedAt`
  - `dispatch_target`
  - `blockedReason`
  - `resolutionReason`
  - `history`
  - `lastReceipt`
- 已完成或取消的 work item 在 Memory Center 重新刷新 replay 时不会被重新变回 pending。
- `replay_repair_pending_work_items` 覆盖率改为按 `open + completed` 计算，避免“已处理过的修复项”被误判为未物化。
- Memory Center 的 `Replay Repair Work Items` 面板新增认领、派发、完成、阻塞、重开按钮。
- 子 Agent 记忆包继续渲染 `Replay Repair pending work`，并带出 owner / dispatch 状态，保证第三方新会话能看到修复工作状态。

## 设计边界

这个 API 只更新 `group-memory-replay-repair-work-items/<groupId>.json` sidecar，不自动创建真实任务、不直接启动第三方子 Agent、不修改项目代码。真实执行仍应由群聊主 Agent 读取 sidecar 后显式决策。

## 修改文件

- `backend/modules/knowledge/memory-control-center.ts`
- `backend/modules/collaboration/memory.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `ccm-package/dist/**`
- `ccm-package/public/**`

## 验证

- `npm run check`
- `npm run build:backend`
- `npm run build:mcp-feishu`
- `npm run build:frontend`
- `npm run test:chat-experience`
- Node selftests:
  - `runMemoryCenterReplayRepairWorkItemClaimSelfTest`
  - `runMemoryCenterReplayRepairPendingWorkItemsSelfTest`
  - `runMemoryCenterChildAgentTypeReplayMatrixSelfTest`
  - `runMemoryCenterHistoricalCompactBoundaryReplaySelfTest`
  - `runMemoryCenterCompactBoundaryReplayGateSelfTest`
  - `runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest`
  - `runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest`

## 下一步方向

下一层可以把 replay repair work item 与群聊主 Agent 的实际派发循环接起来：主 Agent 读取 claimed/dispatch 标记后，生成真实子 Agent 任务或先自行刷新 group memory / typed MEMORY.md，再触发 compact boundary replay gate 验证闭环。
