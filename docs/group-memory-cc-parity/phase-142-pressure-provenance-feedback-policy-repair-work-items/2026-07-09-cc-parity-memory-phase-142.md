# Phase 142: Pressure Provenance Feedback Policy Repair Work Items

## Goal

Phase 141 已经让 pressure provenance feedback policy 支持恢复后复发检测。Phase 142 把这些 active/relapsed policy 继续接进 Memory Center 的 repair workflow：当某个 `agentType + project` 因高频违规或恢复后复发触发严格策略时，系统必须自动生成可追踪的 replay repair work item，并在后续合规恢复后自动关闭同一项。

## Implemented

- 新增 replay repair work item source：
  - `worker_context_pressure_provenance_feedback_policy_repair`
- 新增 repair item builder：
  - `buildWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItem`
- 新增 repair item sync：
  - `syncWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItems`
- 新增 actionable policy row 聚合：
  - `workerContextPacketPressureProvenanceFeedbackPolicyActionableRows`
- 新增 Memory Center 报告/质量检查：
  - `worker_context_packet_pressure_provenance_feedback_policy_repair_work_items`
  - 覆盖 active policy 是否已经生成 open repair work item。
- 群组 Memory Center detail flow 现在会刷新该类 work item，使诊断视图能看到 policy-driven repair backlog。
- repair item 元数据现在携带 pressure provenance policy 关键事实：
  - `pressure_provenance_feedback_agent_type`
  - `pressure_provenance_feedback_project`
  - `pressure_provenance_effective_violation_count`
  - `pressure_provenance_recovery_credit`
  - `pressure_provenance_post_recovery_violation_count`
  - `pressure_provenance_relapsed`
- priority 规则：
  - `relapsed=true` -> `critical`
  - high effective violations -> `high`
  - lower active risk -> `medium`
- policy 后续恢复或不再 active 时，同源 open repair item 会自动完成，resolution reason 为：
  - `pressure_provenance_feedback_policy_recovered_or_no_longer_active`
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest`
  - 覆盖 recovered executor/project 复发后生成 critical repair item，再通过 compliant recovery 关闭同一 repair item。

## Validation

- `npm run build:backend`: PASS
- Phase 142 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest`: PASS
- 相邻回归：
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
- Final dist regression set after full build：PASS

## Stable Memory

Phase 142 makes pressure provenance feedback policy operational instead of only diagnostic. If a child-agent runner repeatedly fails to prove memory provenance, or relapses after prior recovery, Memory Center now opens a durable repair item tied to that exact `agentType + project`. The main group agent can use this as actionable backlog instead of rereading raw archive rows.

The repair item preserves policy evidence and severity, so later dispatch and diagnostics can distinguish ordinary active risk from relapse. When compliant receipts restore the policy to recovered/monitor state, the same work item is completed automatically. This creates a closed loop:

1. WorkerContextPacket pressure receipt violation is archived.
2. Policy activates from effective violations or relapse.
3. Memory Center creates an open repair work item.
4. The group/main agent can see and route the repair.
5. Compliant recovery deactivates policy.
6. Memory Center closes the repair work item.

This is another step toward Claude Code-style memory continuity: compressed/typed memory is not only recalled into future context, but also monitored through durable repair tasks when child-agent executions fail to use it correctly.

## Next Direction

Continue from policy repair backlog into provider-aware dispatch:

- Add Memory Center compliance health rows per `agentType + project` with raw violations, recovery credits, effective violations, relapse status, latest compliant/violation timestamps, and open repair count.
- Feed compliance health into child-agent/provider selection, so the group main agent can prefer safer runners when multiple third-party agents are available.
- Expose pressure provenance repair backlog in group overview alerts, not only diagnostics detail.
- Add compaction-aware replay hints so a repaired policy can produce a concise context block for the next subagent session.
