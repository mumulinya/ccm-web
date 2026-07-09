# Phase 140: Pressure Provenance Feedback Policy Recovery

## Goal

Phase 139 已经让 pressure provenance feedback policy 影响 typed MEMORY.md 召回风险门控，但 policy 仍有一个长期记忆系统缺口：一旦某个 `agentType + project` 进入高频违规 attribution，历史违规会永久推动 stricter dispatch policy。Phase 140 的目标是让记忆系统保留历史违规事实，同时允许后续真实 compliant receipts 形成 recovery evidence，把 policy 从 active punishment 降回 monitor。

## Implemented

- 新增 pressure provenance compliance recovery typed memory：
  - `distillPressureProvenancePreDispatchComplianceRecoveryToTypedMemory`
  - archive：`pressureProvenancePreDispatchComplianceRecoveryArchive`
  - typed MEMORY.md：`feedback/pressure-provenance-compliance-recovery.md`
  - source：`auto:pressure-provenance-compliance-recovery-distillation`
- `preservedGroupTypedMemoryDistillationArchives` 现在保留 recovery archive，避免普通群聊日志蒸馏覆盖 Phase 140 的恢复证据。
- `buildWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceReport` 现在同时蒸馏：
  - non-compliant packets -> `pressureProvenancePreDispatchComplianceArchive`
  - compliant packets -> `pressureProvenancePreDispatchComplianceRecoveryArchive`
- `buildPressureProvenancePreDispatchComplianceDispatchPolicy` 现在计算 recovery-aware policy：
  - 保留 `violation_count` 和 `raw_frequent`
  - 新增 `recovery_compliant_count`
  - 新增 `recovery_credit`
  - 新增 `effective_violation_count`
  - 新增 `recovered_violation_count`
  - 新增 `recovered`
  - policy active 依据 `effective_violation_count >= frequentThreshold`
- 当后续 compliant receipts 的 recovery credit 抵消历史违规后：
  - `active=false`
  - `action=monitor_recovered_pressure_memory_provenance_receipt_contract`
  - WorkerContextPacket 不再注入 active feedback policy
  - bundle 渲染不再给子 Agent 添加额外 ACK/close gate 噪音
- Runtime 修复：
  - `extractPressureProvenanceDispatchFeedbackPolicy` 现在尊重显式 `active:false`。
  - 之前“有 policyRows 就自动 active”的逻辑会把 recovered policy 重新激活，Phase 140 已修正。
- 可读渲染增强：
  - active policy 文本会显示 `recoveryCredit` 和 `effectiveViolations`。
  - 群聊记忆包渲染会显示“历史违约 / 恢复抵扣 / 有效违约”。
- Memory Center 新增质量检查：
  - `worker_context_packet_pressure_provenance_feedback_policy_recovery`
  - 检查有高频历史违规且有 recovery archive 的组，policy 是否能在 recovery credit 足够时降回 monitor。
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest`
  - 覆盖 active policy -> recovery archive -> recovered policy -> bundle 不注入 active policy -> Memory Center quality pass。

## Validation

- `npm run build:backend`: PASS
- Phase 140 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRecoverySelfTest`: PASS
- 相邻回归：
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

Phase 140 makes pressure provenance feedback policy reversible without deleting audit history. Historical violations remain in `pressureProvenancePreDispatchComplianceArchive`; compliant recovery evidence is stored separately in `pressureProvenancePreDispatchComplianceRecoveryArchive`. Policy construction combines both archives each time and uses `effective_violation_count`, not raw `violation_count`, to decide whether stricter WorkerContextPacket ACK/final receipt review is still required.

This is important for a Claude Code-like memory system: memory should learn from failures, but it should also learn from corrected behavior. A child-agent executor/project that repeatedly fixes its receipt discipline should stop being permanently punished, while the original violations remain available for audits, regressions, and future relapse detection.

## Next Direction

Continue from recovery-aware feedback into risk-aware dispatch planning:

- If effective violations stay high, automatically create repair work items before ordinary implementation dispatch.
- If several executor/provider choices exist, use effective compliance health to prefer historically safer child Agents.
- Add Memory Center overview cards for per-agent/project memory compliance health, including raw violations, recovery credits, effective violations, and latest compliant receipt.
- Add relapse detection: if a recovered attribution starts violating again, re-activate strict policy and mark the recovery streak broken.
