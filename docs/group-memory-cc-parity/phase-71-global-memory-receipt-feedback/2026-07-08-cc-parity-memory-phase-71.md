# Phase 71 - Global Memory Receipt Feedback Loop

## Goal

把群聊主 Agent 给项目子 Agent 注入的 Global Agent / 跨群聊 / semantic arbitration 记忆，升级成可回执、可验收、可返工的闭环。子 Agent 每次第三方 CLI 会话完成任务时，必须声明本轮看到的 `global_memory_id` 是 `used`、`ignored`、`verified`、`background` 还是 `advisory`，并在高风险场景声明当前源核验。

## Completed

- `backend/modules/collaboration/agent-receipts.ts`
  - 解析并归一化 `globalMemoryUsage`。
  - 结果说明 review 文本会显示全局记忆使用声明。
- `backend/agents/worker-handoff.ts`
  - `CCM_AGENT_RECEIPT` 模板加入 `globalMemoryUsage`。
  - 工作单说明要求遇到 `global_memory_id`、`semantic_risk`、`cross_group_suppression` 时必须逐条声明。
- `backend/modules/collaboration/memory.ts`
  - 子 Agent 记忆包新增全局记忆回执规则。
  - 对 `semantic_risk`、demoted/conflict、cross-group suppression 明确要求 current source verification。
- `backend/modules/collaboration/collaboration.ts`
  - 新增 Global Memory Receipt Gate 收集、评分和可见摘要。
  - `scoreChildAgentReceipt`、delivery summary、acceptance gate、runtime kernel、coordination events、targeted rework 都接入该 gate。
  - 修复 delivery summary 精简 receipt 时丢失 `globalMemoryUsage` 的问题。
  - 可见摘要现在优先显示 `missing_global_memory_reference`，避免完全没声明 id 时被二级缺口抢主状态。
- `backend/modules/collaboration/group-memory-index.ts`
  - 提高 `global-claude-memory:*` typed docs 召回权重，避免 managed/user Claude memory 被自动 reference artifacts 挤出默认子 Agent 上下文。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加 `backendWiresGlobalMemoryReceiptGate` 静态覆盖，锁住子 Agent prompt、worker handoff、receipt parser、summary/runtime/acceptance gate 的连线。

## Behavior

- 好回执：列出所有相关 `global_memory_id`，风险项声明 `currentSourceVerified=true` / `semanticRiskAcknowledged=true` / `crossGroupSuppression=background_only`，验收通过。
- 缺声明：子 Agent 只说“用了平台全局记忆”但不列 `global_memory_id`，结果说明质量降级，acceptance gate 失败，runtime kernel 显示 `missing_global_memory_reference`。
- 误用：cross-group suppression / background-only 全局记忆被直接 `used` 且未核验当前源，summary/runtime 显示 `unsafe_global_memory_use`。

## Verification

- `npm run build:backend`
- `npm run check`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `node scripts\main-agent-decision-ui-selftest.mjs`
- `runGlobalMemoryUsageReceiptValidationSelfTest`
- `runMemoryDispatchGateReceiptValidationSelfTest`
- `runReadPlanRevalidationGateReceiptValidationSelfTest`
- `runPostCompactReinjectionGateReceiptValidationSelfTest`
- `runPostCompactDispatchMarkerVisibleSelfTest`
- `runGlobalGroupMemoryContextSelfTest`
- `runGroupGlobalClaudeMemoryImportContextSelfTest`
- `runGroupGlobalAgentMemoryBridgeContextSelfTest`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runGroupGlobalAgentMemorySemanticArbitrationSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest`
- `runGlobalMemoryControlSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest`

## Environment Repair

During verification, parallel stateful memory selftests polluted `C:\Users\admin\.cc-connect\global-agent-memory\memory.json` with a selftest sentinel. The polluted main file was backed up, then the real entries from `memory.json.bak` were restored while removing only the selftest sentinel.

- Polluted main backup: `C:\Users\admin\.cc-connect\global-agent-memory\memory.selftest-polluted-1783447025702.json`
- Original backup snapshot before sanitizing: `C:\Users\admin\.cc-connect\global-agent-memory\memory.bak-before-sanitize-1783447074999.json`
- Restored entries: 1 authorization rule, 19 sessions
- Removed entries: 1 selftest user memory

## Next Direction

Phase 72 should continue toward Claude Code parity by hardening stateful memory selftest isolation and by adding a production-facing audit that warns when real Global Agent memory contains known selftest sentinel patterns.
