# Phase 145: Pressure Provenance Provider Dispatch Gate

## Goal

Phase 144 已经把 `agentType + project` 的 pressure provenance compliance health 转成 provider-aware dispatch advisory。Phase 145 把 advisory 从 Memory Center 的诊断建议升级成真正的子 Agent 派发保护：群聊主 Agent 在创建第三方项目子 Agent 会话前，会把当前 runner 的 provider advisory 注入 WorkerContextPacket，并在 `hold_until_repair` 时通过 pre-dispatch gate 阻断派发，直到修复证据恢复到可放行状态。

## Implemented

- WorkerContextPacket 新增可注入字段：
  - `pressure_provenance_provider_dispatch_advisory`
- runtime 渲染新增：
  - `Pressure provenance provider dispatch advisory`
  - `hold_until_repair`
  - `Pre-dispatch hold`
- context usage 新增分类：
  - `pressure_provenance_provider_dispatch_advisory`
- acceptance gate 新增确认项：
  - `pressure_provenance_provider_dispatch_advisory_ack_required`
  - `pressure_provenance_provider_dispatch_hold_required`
- 群聊 orchestrator 现在会从 typed pressure provenance feedback policy 构建 selected-provider advisory。
- `buildWorkerContextPreDispatchGateForCoordinator` 现在会读取 selected provider advisory，并在 `should_hold_dispatch=true` / `dispatch_policy=hold_until_repair` 时返回：
  - `dispatch_ready=false`
  - `provider_dispatch_hold=true`
  - `repair_source=worker_context_pressure_provenance_feedback_provider_dispatch_advisory`
  - `next_step=repair_pressure_provenance_provider_before_child_dispatch`
- binding ledger 新增持久化字段：
  - `worker_context_packet_pressure_provenance_provider_dispatch_advisory`
  - `has_pressure_provenance_provider_dispatch_advisory`
- Memory Center quality report/check 新增：
  - `worker_context_packet_pressure_provenance_provider_dispatch_gate`
- `backend/test-agent/types.ts` 补齐 `HttpCheckSpec.context?: Record<string, any>`，让新增检查上下文类型稳定通过。
- 新增自测：
  - `runWorkerContextPressureProvenanceProviderDispatchGateSelfTest`
  - 覆盖 `codex/api` 复发后 WorkerContextPacket 携带 critical advisory 并阻断派发；后续合规恢复后变成 `monitor` / `allow_with_receipt_sampling` 并放行。

## Validation

- `npm run check`: PASS
- `npm run build:backend`: PASS
- `npm run build`: PASS
- Final dist regression set：PASS
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
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`
  - `runWorkerContextPreDispatchGateSelfTest`
  - `runWorkerContextIgnoreMemoryPolicySelfTest`
  - `runWorkerContextCompactionRetrySelfTest`
  - `runAgentRuntimeKernelSelfTest`
  - `runWorkerContextUsageSelfTest`
  - `runWorkerHandoffSelfTest`

## Stable Memory

Phase 145 makes pressure provenance provider memory enforceable at the exact point where CCM creates a fresh third-party child-agent session. A risky provider is no longer only visible in Memory Center; the selected runner's advisory is inserted into the WorkerContextPacket, rendered into the handoff context, counted in context usage, persisted in the binding ledger, and used by the pre-dispatch gate.

The critical behavior is:

1. A recovered provider can relapse if new WorkerContextPacket evidence misses required pressure memory usage/provenance.
2. The relapsed `agentType + project` row becomes `critical` with `dispatch_policy=hold_until_repair`.
3. The selected child-agent packet carries this advisory before dispatch.
4. The pre-dispatch gate blocks the child-agent session and asks for pressure provenance repair first.
5. A later compliant recovery downgrades the provider to `monitor` with `allow_with_receipt_sampling`, which disarms the hold without permanently banning the runner.

This moves CCM closer to Claude Code-style memory safety because compressed/typed group memory now affects live execution, not only recall ranking or after-the-fact diagnostics.

## Next Direction

- Persist actual provider choice decisions into a dispatch ledger so future relapse/recovery can be traced to main Agent routing.
- Feed real project runtime alternatives into provider candidate selection, not only health rows and advisory inputs.
- Add UI visibility in Group Chat / Memory Center showing why a child Agent was held before launch.
- Extend the hold gate to support temporary override receipts when the user explicitly accepts risk.
- Connect the provider dispatch gate with post-compact reinjection proof so compacted memory can prove it protected a real child-agent session.
