# Phase 84 - API Microcompact Session Snapshot Binding

## 目标

Phase 83 已能区分 native API apply 与 CLI advisory，但 API microcompact 使用声明还主要依赖 plan/apply/request patch checksum。本阶段把该契约继续绑定到每一次项目子 Agent 会话和本轮记忆上下文快照，避免第三方子 Agent 新会话复用旧会话的 API microcompact 声明。

## 已完成

- `ccm-api-microcompact-native-apply-plan-v1` 新增会话绑定字段：
  - `sessionBinding`
  - `task_agent_session_id`
  - `native_session_id`
  - `memory_context_snapshot_id`
  - `memory_context_snapshot_checksum`
  - `sessionBindingRequired`
  - `receiptContract`
- `buildAgentMemoryContextBundle()` 生成 native apply plan 时传入本轮 `session_binding`。
- `applyPlanChecksum` 现在会随 session binding 变化，阻止跨会话复用同一个 native apply proof。
- API microcompact 回执校验新增会话/快照匹配：
  - `taskAgentSessionId`
  - `nativeSessionId`
  - `memoryContextSnapshotId`
  - `memoryContextSnapshotChecksum`
- `evaluateReceiptApiMicrocompactEditPlan()` 新增：
  - `session_binding_required`
  - `session_matched`
  - `session_mismatch`
  - `session_mismatch_plan_checksums`
- 正确 session/snapshot 的 advisory 或 native 声明通过；错误 session 即使 planChecksum 正确也 hard fail。
- 子 Agent 工作单和 self-contained handoff 模板更新 `apiMicrocompactUsage` 示例，要求填写 session/snapshot 证据。
- 结果摘要、验收 gate、runtime kernel、精准返工摘要支持 `session_mismatch` 状态。
- Memory Center 治理增强：
  - API Microcompact Receipt Discipline 统计 `sessionMismatch`。
  - API Microcompact Native Apply Readiness 统计 `sessionBound`。
  - 前端面板显示 session gap / session bound，并在 row 中展示 session 或 snapshot。
- 静态自测加入 session/snapshot 字段护栏。

## 语义边界

- 这不是要求第三方 CLI 共享旧会话；相反，它承认每个项目子 Agent 都可能是新会话。
- 子 Agent 可以声明 `advisory` 或 `not_supported`，但该声明必须来自收到本轮记忆包的会话。
- `native_applied` 仍然必须同时满足 request patch、beta header、apply checksum、request checksum 和 session/snapshot 匹配。
- 旧任务如果没有 session binding，不会被新规则误判；一旦新上下文包携带 binding，就必须按 binding 回执。

## 验证

- `npm run build:backend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runGroupApiMicrocompactNativeApplyPlanSelfTest`
- `runApiMicrocompactReceiptValidationSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest`
- `buildMemoryQualityReport({ checkIds: ['api_microcompact_receipt_discipline', 'api_microcompact_native_apply_readiness'], refresh: true })`
- `npm run check`
- `npm run build`

## 结果

Phase 84 已完成。CCM 的 API microcompact 从“计划被看到、回执被声明”升级为“声明必须来自本轮子 Agent 会话和本轮记忆快照”。这更贴近 Claude Code 级别的会话上下文纪律，也更适合 CCM 多群聊、多项目子 Agent、多第三方会话的协作模型。

## 下一步候选

- 为 native API 执行器增加发送后 proof ledger，记录真实 provider request 使用了哪个 `requestPatchChecksum`。
- 将 session/snapshot binding 推广到 typed MEMORY.md 召回和 Global Agent memory 使用声明。
- 对历史 API microcompact 任务做 legacy backfill，区分未绑定旧记录与真正错会话记录。
