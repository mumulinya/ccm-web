# Phase 144: Pressure Provenance Provider Dispatch Advisory

## Goal

Phase 143 已经把 `agentType + project` 的 pressure provenance 状态聚合成 compliance health row。Phase 144 把这些健康行继续转成 provider-aware dispatch advisory，让群聊主 Agent 在派发第三方项目子 Agent 会话前，能看到当前 runner 是否应该 hold、是否存在更健康候选、以及恢复后应该如何放行。

## Implemented

- 新增 provider dispatch advisory report：
  - `buildWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisoryReport`
- 新增 quality check：
  - `worker_context_packet_pressure_provenance_feedback_provider_dispatch_advisory`
- 群聊 Memory Center detail 增加：
  - `pressureProvenanceFeedbackProviderDispatchAdvisory`
- Memory Center overview 增加：
  - `workerContextPacketPressureProvenanceFeedbackComplianceHealthReport`
  - `workerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisoryReport`
- 总览 alerts 现在会暴露：
  - `worker_context_packet_pressure_provenance_feedback_compliance_health`
  - `worker_context_packet_pressure_provenance_feedback_provider_dispatch_advisory`
- advisory candidate 聚合字段：
  - `agent_type`
  - `project`
  - `health_status`
  - `dispatch_policy`
  - `dispatch_recommendation`
  - `provider_score`
  - `open_repair_item_count`
  - `completed_repair_item_count`
  - `repair_backlog_state`
- dispatch policy：
  - `critical` -> `hold_until_repair`
  - `warning` -> `strict_review_before_dispatch`
  - `monitor` -> `allow_with_receipt_sampling`
  - `watch` -> `allow_with_monitoring`
  - `healthy` -> `preferred`
- project advisory 会按 provider score 排序，并给出：
  - `preferred_agent_type`
  - `should_hold_configured_dispatch`
  - `safer_alternative_count`
  - `recommendation`
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest`
  - 覆盖 `codex/api` 复发 critical 时 hold 当前 runner，同时推荐健康的 `cursor/api`；恢复后 advisory 回到 ok。

## Validation

- `npm run build:backend`: PASS
- Phase 144 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest`: PASS
- 相邻回归：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest`: PASS
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`: PASS
  - `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`: PASS
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`: PASS
  - `runAgentRuntimeKernelSelfTest`: PASS
  - `runWorkerContextUsageSelfTest`: PASS
  - `runWorkerHandoffSelfTest`: PASS
- `npm run check`: PASS
- `npm run build`: PASS
- Final dist regression set：PASS

## Stable Memory

Phase 144 is the bridge from passive memory health to dispatch-aware provider choice. The system can now express:

1. This configured runner/project has relapsed and must be held until pressure provenance repair closes.
2. This other runner for the same project has no pressure provenance history and should be preferred.
3. A recovered runner is not permanently banned; it can be used with receipt sampling.
4. Group overview alerts surface the risk before the main Agent silently launches another child-agent session.

This matters because CCM project child Agents are third-party sessions such as Claude Code, Cursor, Codex, or similar runners. Every run starts with a fresh context packet, so the group main Agent needs a durable memory-backed risk model before choosing who receives the next task.

## Next Direction

Continue from advisory into enforceable dispatch gates:

- Inject provider advisory into WorkerContextPacket / main-agent dispatch prompt for the selected project.
- Add a pre-dispatch hold gate when the configured runner is `critical` and no safer alternative exists.
- Record provider choice decisions into a ledger so later recovery/relapse can be traced to main Agent routing decisions.
- Extend provider candidates from real project config/runtime alternatives instead of only advisory inputs and health rows.
