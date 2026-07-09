# Phase 141: Pressure Provenance Feedback Policy Relapse

## Goal

Phase 140 让 pressure provenance feedback policy 可以通过 compliant receipts 恢复，不再永久惩罚同一 `agentType + project`。Phase 141 补上恢复后的复发检测：如果一个已经 recovered 的执行器/项目在 `last_compliant_at` 之后再次出现 pressure provenance 回执违规，系统必须打破 recovery streak，重新激活严格 WorkerContextPacket feedback policy。

## Implemented

- `pressureProvenancePreDispatchComplianceArchive` 的 attribution 现在记录：
  - `first_violation_at`
  - `last_violation_at`
- `buildPressureProvenancePreDispatchComplianceDispatchPolicy` 现在计算 recovery relapse：
  - `post_recovery_violation_count`
  - `recovery_streak_broken_at`
  - `relapsed`
  - `relapsedAttributionCount`
- policy active 逻辑升级：
  - 普通高频违规：`effective_violation_count >= frequentThreshold`
  - 恢复后复发：`relapsed=true` 即重新激活 strict policy，即使 post-recovery violation 只有 1 次。
- relapsed policy action：
  - `reactivate_pressure_memory_provenance_receipt_contract_after_recovery_relapse`
- active relapsed policy 会继续进入：
  - `buildAgentMemoryContextBundle`
  - WorkerContextPacket top-level `pressure_provenance_dispatch_feedback_policy`
  - ACK / final receipt review acceptance gates
  - typed recall feedback risk gating
- 可读渲染增强：
  - 群聊记忆包显示 `恢复后复发=N`
  - WorkerContextPacket 渲染显示 `relapsed=true` 与 `postRecoveryViolations=N`
- Memory Center 新增质量检查：
  - `worker_context_packet_pressure_provenance_feedback_policy_relapse`
  - 检查 recovered attribution 在 post-recovery violation 后是否重新 active。
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest`
  - 覆盖 initial violations -> recovery -> recovered inactive policy -> post-recovery violation -> relapsed active policy -> bundle 注入 relapsed policy -> Memory Center quality pass。

## Validation

- `npm run build:backend`: PASS
- Phase 141 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRelapseSelfTest`: PASS
- 相邻回归：
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

Phase 141 closes the loop created by Phase 140. Recovery evidence can reduce policy severity, but it is not a permanent shield. When a recovered `agentType + project` emits any new pressure provenance violation after `recovery_last_compliant_at`, the policy row is marked `relapsed=true`, records `post_recovery_violation_count`, and reactivates strict ACK/final receipt review.

This keeps the memory system adaptive without being naive: it can forgive corrected behavior, but it also detects relapse and restores stricter context-use discipline. Historical violation archive, recovery archive, and relapse evidence are all retained as separate audit facts.

## Next Direction

Continue from relapse-aware policy into dispatch planning:

- Auto-create repair work items when `relapsed=true` or effective violations stay high.
- Add Memory Center compliance health rows per `agentType + project` with raw violations, recovery credits, effective violations, relapse status, and latest compliant/violation timestamps.
- Use compliance health to prefer safer child-agent providers when multiple runners are available.
- Expose relapsed status in group overview alerts so the main Agent can avoid silent repeated memory-contract failures.
