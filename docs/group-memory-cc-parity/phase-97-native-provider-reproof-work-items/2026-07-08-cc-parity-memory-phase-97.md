# Phase 97 - Native Provider Re-proof Work Items

## 目标

Phase 96 已经把 `timeline_proved` repair closure 和真正的 provider strong proof 拆开，并生成精确 re-proof candidate。本阶段把这些 candidate 物化成主 Agent 可领取、可派发、可关闭的 repair work item，避免 re-proof 停留在 Memory Center 诊断层。

## 本阶段增强

- 新增 repair work item source：
  - `api_microcompact_native_apply_provider_reproof`
- 新增 provider re-proof work item 同步：
  - `syncApiMicrocompactNativeApplyProviderReproofWorkItems`
- 新增 Memory Center check：
  - `api_microcompact_native_apply_proof_repair_closure_reproof_work_items`
- 新增 report：
  - `ccm-api-microcompact-native-apply-proof-repair-closure-reproof-work-item-report-v1`
- 通用 replay repair dispatch candidate 现在会透传 provider re-proof 字段：
  - `provider_reproof_status`
  - `provider_reproof_reason`
  - `reproof_candidate_id`
  - `timeline_binding_id`
  - `original_work_item_id`

## 行为语义

- 如果 timeline closure 已经证明原始 native repair work item 可关闭，但 provider telemetry 仍弱，系统会创建 open provider re-proof work item。
- 该 work item 保留精确定位字段：
  - `request_patch_checksum`
  - `runner_request_id`
  - `execution_id`
  - `task_agent_session_id`
  - `memory_context_snapshot_id`
  - `timeline_binding_id`
  - `original_work_item_id`
- 当 closure re-proof report 后续显示 provider strong proof 已补齐时，对应 work item 会自动完成，`resolutionReason=native_provider_reproof_strong`。

## 自测

新增：

- `runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofWorkItemSelfTest`

覆盖：

- timeline closure 生成 provider re-proof candidate。
- candidate 物化为 `api_microcompact_native_apply_provider_reproof` work item。
- work item 保留精确 re-proof 定位字段。
- 通用主 Agent dispatch candidate 能看到 provider re-proof item。
- 模拟 provider strong 后自动关闭 provider re-proof work item。

## 已验证

- `npm run build:backend`
- `npm run check`
- `npm run build`
- `runMemoryCenterApiMicrocompactNativeApplyProofRepairClosureReproofWorkItemSelfTest`
- Phase 90-97 native proof repair 自测矩阵
- 定向 `buildMemoryQualityReport({ checkIds: ['api_microcompact_native_apply_proof_repair_closure_reproof_work_items'] })`
