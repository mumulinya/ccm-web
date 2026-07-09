# Phase 148: Pressure Provenance Provider Dispatch Override Follow-ups

## Goal

Phase 147 允许用户用结构化 receipt 临时 override `hold_until_repair`。Phase 148 把 override 从“安全放行”推进到“闭环修复”：每次 provider hold 被 override 放行后，系统必须自动创建 follow-up repair work item；子 Agent 完成后必须用 `memoryProvenanceUsage/currentSourceVerified=true` 补强 provenance；Memory Center 必须能审计该 follow-up 是否完成并关闭。

## Implemented

- override 派发后自动创建 follow-up repair work item：
  - `ccm-provider-dispatch-override-followup-repair-work-item-v1`
  - source: `worker_context_pressure_provenance_provider_dispatch_override_followup`
- binding ledger 新增：
  - `worker_context_provider_dispatch_override_followup_repair`
  - `provider_dispatch_override_followup_repair_work_item`
  - `worker_context_provider_dispatch_override_completion`
  - `provider_dispatch_override_completion`
  - `providerDispatchOverrideFollowupRepairCount`
  - `providerDispatchOverrideCompletionCount`
- 新增 completion 记录函数：
  - `recordWorkerContextProviderDispatchOverrideCompletionForCoordinator`
- completion receipt 必须包含：
  - `receipt_status=done/completed/ok/success`
  - `memoryProvenanceUsage` / `memory_provenance_usage`
  - 每条 provenance row 必须 `currentSourceVerified=true`
  - `task_agent_session_id`
  - `execution_id`
- completion 合格后自动关闭 follow-up work item：
  - `completion_source=provider_dispatch_override_completion_receipt`
  - `resolutionReason=override_child_agent_receipt_verified_pressure_provenance_followup`
- Memory Center 新增 report/check：
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followups`
- overview alerts 会在 override follow-up 未闭环时暴露：
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followups`
- 新增自测：
  - `runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupSelfTest`

## Validation

- `npm run check`: PASS
- `npm run build:backend`: PASS
- `npm run build`: PASS
- Final dist regression set：PASS
  - `runWorkerContextPressureProvenanceProviderDispatchOverrideCompletionSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupSelfTest`
  - `runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest`
  - `runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runWorkerContextPressureProvenanceProviderDispatchGateSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest`
  - `runWorkerContextPreDispatchGateSelfTest`
  - `runWorkerContextIgnoreMemoryPolicySelfTest`
  - `runWorkerContextCompactionRetrySelfTest`
  - `runAgentRuntimeKernelSelfTest`
  - `runWorkerContextUsageSelfTest`
  - `runWorkerHandoffSelfTest`

## Stable Memory

Phase 148 closes the loop after risky provider override dispatch:

1. `dispatch_with_provider_override` now creates a high-priority follow-up repair item.
2. The follow-up item records the decision id, override id, assignment id, packet id, project, and agent type.
3. A completion receipt is accepted only when it supplies verified pressure provenance evidence.
4. The binding ledger stores the completion receipt and session/execution identifiers.
5. The follow-up repair work item is closed only after the completion receipt proves `memoryProvenanceUsage/currentSourceVerified=true`.
6. Memory Center checks the whole chain: override decision -> follow-up work item -> completion receipt -> closed repair item.

This matters because override is now auditable memory behavior instead of a silent escape hatch. CCM can temporarily accept risk while still forcing the child Agent session to strengthen memory provenance after the run.

## Next Direction

- Distill completed override follow-up rows into typed MEMORY.md so future tasks can recall which provider/project needed risky override and how it was repaired.
- Add one-time consumption semantics so an `allow_once` override cannot be reused after completion.
- Connect override completion rows to pressure provenance feedback recovery, letting a verified override completion reduce effective violation pressure.
- Surface open override follow-up items in Group Chat / Memory Center UI.
- Bind override follow-up completion to post-compact reinjection proof so `/compact` replay can show the override repair loop survived context compression.
