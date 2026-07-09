# Phase 143: Pressure Provenance Feedback Compliance Health

## Goal

Phase 142 已经能在 pressure provenance feedback policy active/relapsed 时自动生成 repair work item。Phase 143 把这些分散事实聚合成每个 `agentType + project` 的 compliance health row，让群聊主 Agent 在给第三方项目子 Agent 派发任务前，可以直接看到该 runner/project 的记忆回执风险、恢复状态、复发状态和 repair backlog。

## Implemented

- 新增 compliance health report：
  - `buildWorkerContextPacketPressureProvenanceFeedbackComplianceHealthReport`
- 新增 quality check：
  - `worker_context_packet_pressure_provenance_feedback_compliance_health`
- 群聊 Memory Center detail 增加：
  - `pressureProvenanceFeedbackComplianceHealth`
- health row 聚合以下事实：
  - raw `violation_count`
  - `effective_violation_count`
  - `recovery_credit`
  - `recovery_compliant_count`
  - `post_recovery_violation_count`
  - `relapsed`
  - `recovered`
  - `policyActive`
  - `first_violation_at`
  - `last_violation_at`
  - `recovery_first_compliant_at`
  - `recovery_last_compliant_at`
  - `recovery_streak_broken_at`
  - `open_repair_item_count`
  - `completed_repair_item_count`
  - `repair_backlog_state`
- health row 风险状态：
  - `critical`: policy active 且 `relapsed=true`
  - `warning`: policy active 但未复发
  - `monitor`: 已 recovered
  - `watch`: 有历史违规但未 active
  - `healthy`: 无风险事实
- dispatch recommendation：
  - `hold_child_dispatch_until_pressure_provenance_repair`
  - `strict_receipt_review_or_repair_before_ordinary_dispatch`
  - `allow_dispatch_with_receipt_sampling`
  - `allow_dispatch_with_pressure_provenance_monitoring`
  - `normal_dispatch`
- health report 默认会同步 Phase 142 repair work items，然后读取 repair ledger，所以 active/relapsed health row 应该带 open repair backlog。
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest`
  - 覆盖违规 -> 恢复 -> 复发 -> `critical` health row + open repair item -> 再恢复 -> `monitor` health row + completed repair item。

## Validation

- `npm run build:backend`: PASS
- Phase 143 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest`: PASS
- 相邻回归：
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

Phase 143 gives the group main Agent a direct compliance map for third-party child-agent runners. The system no longer only knows that pressure provenance memory was ignored somewhere; it can now say:

1. Which `agentType + project` failed the memory provenance contract.
2. Whether recovery receipts have reduced the effective violation count.
3. Whether the recovered pair relapsed.
4. Whether an open repair work item already exists.
5. What dispatch posture the main Agent should use before launching another child-agent session.

This matters because each project child-agent task creates a fresh session. The group memory must therefore be compressed, recalled, injected, and then verified through receipts every time. The compliance health row turns those repeated sessions into a stable, queryable risk model that survives compaction and can steer future dispatch.

## Next Direction

Continue from health rows into provider-aware dispatch:

- Feed `pressureProvenanceFeedbackComplianceHealth.rows` into child-agent/provider selection when multiple runners are available.
- Surface `critical` and `warning` health rows in group overview alerts, not only group detail diagnostics.
- Add a compact dispatch hint block to WorkerContextPacket when the selected `agentType + project` has `monitor/watch` history.
- Record provider choice decisions so later recovery/relapse can be traced back to the main Agent's dispatch reasoning.
