# Phase 146: Pressure Provenance Provider Dispatch Decision Ledger

## Goal

Phase 145 已经能把 pressure provenance provider advisory 注入 WorkerContextPacket，并在 `hold_until_repair` 时阻断第三方项目子 Agent 会话。Phase 146 继续补上主 Agent 的派发决策账本：每次 selected provider 被 advisory/gate 影响时，系统必须把“为什么派发、为什么 hold、为什么恢复后 sampling 放行”写入 binding ledger，供 Memory Center 后续追溯 relapse/recovery 与真实派发选择之间的关系。

## Implemented

- 新增 provider dispatch decision builder：
  - `ccm-worker-context-provider-dispatch-decision-v1`
- assignment 现在会携带：
  - `worker_context_provider_dispatch_decision`
  - `provider_dispatch_decision`
- binding ledger 现在持久化：
  - `worker_context_provider_dispatch_decision`
  - `provider_dispatch_decision`
- binding ledger 新增统计：
  - `providerDispatchDecisionCount`
  - `providerDispatchHoldDecisionCount`
  - `providerDispatchReadyDecisionCount`
- provider decision action 会按 gate/advisory 归类：
  - `hold_until_repair`
  - `hold_for_context_repair`
  - `dispatch_with_receipt_sampling`
  - `strict_review_before_dispatch`
  - `dispatch_with_monitoring`
  - `dispatch`
- provider hold 时 assignment `needs` 现在明确提示：
  - `先完成 pressure provenance provider repair/recovery，再启动第三方子 Agent 会话`
- Memory Center 新增 report/check：
  - `worker_context_packet_pressure_provenance_provider_dispatch_decision_ledger`
- Memory Center overview 新增：
  - `workerContextPacketPressureProvenanceProviderDispatchDecisionLedgerReport`
- overview alerts 会在 decision 缺失或与 advisory/gate 不一致时暴露：
  - `worker_context_packet_pressure_provenance_provider_dispatch_decision_ledger`
- 新增自测：
  - `runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest`

## Validation

- `npm run check`: PASS
- `npm run build:backend`: PASS
- `npm run build`: PASS
- Final dist regression set：PASS
  - `runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runWorkerContextPressureProvenanceProviderDispatchGateSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest`
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest`
  - `runWorkerContextPreDispatchGateSelfTest`
  - `runWorkerContextIgnoreMemoryPolicySelfTest`
  - `runWorkerContextCompactionRetrySelfTest`
  - `runAgentRuntimeKernelSelfTest`
  - `runWorkerContextUsageSelfTest`
  - `runWorkerHandoffSelfTest`

## Stable Memory

Phase 146 makes provider choice auditable. The system no longer only knows that a packet was blocked or allowed; it now records the main Agent decision that caused that outcome.

The critical behavior is:

1. A critical `agentType + project` provider produces `action=hold_until_repair`.
2. The decision records the selected provider, health status, dispatch policy, gate id, packet id, repair source, next step, and advisory snapshot.
3. `should_create_real_task=false` is persisted for held providers.
4. A recovered provider produces `action=dispatch_with_receipt_sampling` and `requires_receipt_sampling=true`.
5. Memory Center checks the ledger decision against the WorkerContextPacket advisory and pre-dispatch gate, so later relapse/recovery work can prove whether the main Agent respected typed memory at dispatch time.

This is a direct step toward Claude Code-style memory behavior: compressed/typed memory is not just recalled into context; it actively changes routing, and the routing decision itself becomes stable memory evidence.

## Next Direction

- Add explicit user-approved override receipts for rare cases where a held provider must still run.
- Feed real project runtime alternatives into provider selection so the decision ledger can record `chosen`, `rejected`, and `safer_alternative` candidates.
- Add Group Chat / Memory Center UI surface for provider hold and decision reason.
- Distill repeated provider decision patterns into typed MEMORY.md entries so future tasks can recall dispatch discipline without reading raw ledgers.
- Bind provider decision ledger rows to post-compact reinjection proof, proving compacted memory protected a real child-agent session after `/compact`.
