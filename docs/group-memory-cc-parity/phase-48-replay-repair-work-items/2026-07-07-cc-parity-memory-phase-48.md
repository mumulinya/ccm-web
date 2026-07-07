# Phase 48 - Replay Repair Pending Work Items

## 目标

把 Phase 44/45 的 Replay Repair Plan 和 Attempt Ledger 继续升级为群聊主 Agent 可消费的修复工作单。Memory Center 发现压缩边界 replay 缺口后，不再只显示诊断建议，而是把每条修复动作物化到按群聊隔离的 sidecar ledger：

- `group-memory-replay-repair-work-items/<groupId>.json`

这个 ledger 不是真实任务队列，打开 Memory Center 不会自动创建可执行任务；它只是稳定、幂等地记录“主 Agent 下一步应处理什么”。后续主 Agent 可以读取、认领、再决定是否派发给项目子 Agent。

## CC 对照

本阶段对照了 `D:\claude-code` 的两个关键思路：

- `src/bootstrap/state.ts` 的 `pendingPostCompaction` / `consumePostCompaction()`：压缩后的首个调用需要被一次性标记，避免把压缩后状态和普通缓存/会话状态混淆。
- `src/tools/AgentTool/agentMemory.ts` 的 `loadAgentMemoryPrompt()`：子 Agent 启动时按 scope 加载持久记忆 prompt，说明第三方子 Agent 新会话必须在 spawn/dispatch 时收到明确的记忆上下文。

CCM 本阶段对应落点：Replay Gate 缺口变成一次性、可审计、可关闭的 pending work；子 Agent 记忆包会渲染当前 replay repair pending work，提醒它不要误把失败 replay 当作可用上下文。

## 实现

- 新增 `ccm-compact-boundary-replay-repair-work-items-v1` sidecar。
- `buildGroupCompactBoundaryReplayGate()` 在真实当前边界 replay 后同步 work items；历史 replay 和 agent type matrix 仍保持只读，不误写待办。
- work item 使用稳定 ID，按 `groupId + action_id + boundary + targetProject` 去重。
- 同一 replay 缺口重复刷新不会追加重复记录；当最新 replay 变为 `ok` 或修复动作清空时，open items 自动关闭为 `completed`。
- 新增 `replay_repair_pending_work_items` 质量检查和 Overview 报告/告警。
- 子 Agent 记忆包新增 `Replay Repair pending work` 渲染段。
- Memory Center 新增 `Replay Repair Work Items` 面板，按群聊展示 open/pending/completed 状态。

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
  - `runMemoryCenterReplayRepairPendingWorkItemsSelfTest`
  - `runMemoryCenterChildAgentTypeReplayMatrixSelfTest`
  - `runMemoryCenterHistoricalCompactBoundaryReplaySelfTest`
  - `runMemoryCenterCompactBoundaryReplayGateSelfTest`
  - `runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest`
  - `runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest`
  - `runMemoryCenterCompactionHookLedgerSelfTest`
  - `runMemoryCenterCompactBoundaryTimelineSelfTest`
  - `runMemoryCenterChildAgentMemoryReliabilitySelfTest`

## 下一步方向

继续往 CC parity 推进时，下一层可以做“主 Agent claim/dispatch API”：让群聊主 Agent 显式认领 replay repair work item，再决定是自行重建记忆包、刷新 typed MEMORY.md，还是派发给具体项目子 Agent。仍需保持一个原则：诊断页只物化 sidecar，不直接污染真实任务队列。
