# Phase 96 - Native Proof Closure Re-proof

## 目标

继续把 CCM 群聊记忆系统往 Claude Code 记忆压缩/使用链路靠近。本阶段聚焦 API microcompact native apply proof 的修复闭环：Phase 95 已经能用完整 timeline binding 自动关闭 repair work item，但这只能证明“修复任务链路已闭环”，不能等同于“provider native_request_adapter telemetry 已经是强证明”。

## 本阶段增强

- 新增 `api_microcompact_native_apply_proof_repair_closure_reproof` Memory Center 检查。
- 新增 closure re-proof report：
  - `repair_closure_status=timeline_proved`
  - `provider_reproof_status=needed | strong`
  - `timelineProvedRepairCount`
  - `providerStrongProofCount`
  - `providerStrongReproofNeededCount`
- 对 timeline closure 后仍缺强 provider telemetry 的 repair item 生成精确 re-proof candidate。
- re-proof candidate 绑定关键定位字段：
  - `task_id`
  - `request_patch_checksum`
  - `runner_request_id`
  - `execution_id`
  - `task_agent_session_id`
  - `memory_context_snapshot_id`
- 补充 proof summary 的 `executionId`/`externalRunnerRequestId`，避免 re-proof 候选丢失 execution 线索。
- Memory Center overview 增加对应报告和告警。

## 语义边界

本阶段明确拆分两个状态：

- Timeline closure：证明 `dispatch -> child_agent_start -> worker_handoff_ready -> task_agent_memory_context_snapshot -> child_agent_receipt` 完整，并可关闭匹配 repair item。
- Native provider strong proof：必须仍由 fresh `native_request_adapter` telemetry、task-agent session/snapshot binding、execution/runner binding 同时证明。

因此，timeline closure 不会自动把 `requestTelemetryStrong` 或 `nativeApplyStrongProof` 改为 true。

## 自测

新增：

- `runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofSelfTest`

自测构造两个对照组：

- weak 组：timeline repair closure 完成，但不补 adapter telemetry。结果应生成 `provider_reproof_status=needed` 的精确候选。
- strong 组：timeline repair closure 完成后补齐真实 adapter telemetry、session/snapshot、execution/runner 绑定。结果应变为 provider strong，且不再产生 re-proof candidate。

## 已验证

- `npm run build:backend`
- `runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyProofRepairTimelineCompletionSelfTest`

后续完整构建和全量检查仍会继续执行。
