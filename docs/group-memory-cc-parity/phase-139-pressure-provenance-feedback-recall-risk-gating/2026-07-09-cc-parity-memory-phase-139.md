# Phase 139: Pressure Provenance Feedback Recall Risk Gating

## Goal

把 Phase 138 的 `pressure_provenance_dispatch_feedback_policy` 从“派发时加强 ACK/回执合同”继续推进到“真实影响 typed MEMORY.md 召回策略”。当某个 `agentType + project` 已经因为 pressure provenance 回执违规被沉淀为高频 attribution，后续同一执行器/项目在上下文压力场景召回 disputed/stale under-repair pressure MEMORY.md 时，不能再把风险记忆当作普通高优先级上下文直接交给子 Agent。

## Implemented

- `group-memory-index.ts` 新增 feedback-policy recall risk scoring：
  - `normalizePressureProvenanceDispatchFeedbackPolicyForRecall`
  - `scoreWorkerContextPressureFeedbackPolicyRecallRisk`
  - active policy 下识别 `disputed_under_repair`、`stale_evidence_under_repair`、`repair_open=true` 或 pressure usage repair hint 命中的风险 pressure MEMORY.md。
  - 普通实现任务中对风险 pressure memory 施加负分：
    - medium severity：`-12`
    - high severity：`-16`
  - 如果任务明确要求 provenance/repair/current-source verification，则保留召回并标记 `repair_first_preserve_risky_pressure_memory`，避免修复任务拿不到需要修的记忆。
- `buildGroupTypedMemoryRecall` 现在输出：
  - 每个候选文档的 `workerContextPressureFeedbackPolicy`
  - 汇总级 `workerContextPressureFeedbackPolicyScoring`
  - 被负分打到低分的候选会记录 `pressure_feedback_policy_risk_gated` diagnostics。
- `renderGroupTypedMemoryRecall` 现在会显示：
  - `pressure feedback policy gating risk/gated/repair-first`
  - 单条文档的 `pressure feedback policy -12` 或 `pressure feedback policy repair-first`
- `buildAgentMemoryContextBundle` 现在会在 typed MEMORY.md recall 前预构建 Phase 138 policy，并把它传入首次召回和 global-memory arbitration 后的二次召回。
- `recordWorkerContextPacketAssignmentBindingForCoordinator` 的 pressure recall 摘要现在保留：
  - `pressure_feedback_policy_adjustment`
  - `pressure_feedback_policy_action`
  - `pressure_feedback_policy_risk_doc`
  - `pressure_feedback_policy_repair_first`
  - top-level `pressure_feedback_policy_scoring`
- Memory Center 新增质量检查：
  - `worker_context_packet_pressure_provenance_feedback_recall_risk_gating`
  - 当 frequent attribution 与 risky under-repair pressure MEMORY.md 同时存在时，检查 recall probe 是否发生了降权、门控或 repair-first 标记。
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest`
  - 覆盖 policy 激活、风险记忆降权、正常压力记忆仍可召回、render 文本暴露 gating、Memory Center quality pass。

## Validation

- `npm run build:backend`: PASS
- Phase 139 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackRecallRiskGatingSelfTest`: PASS
- 相邻回归：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest`: PASS
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`: PASS
  - `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`: PASS
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`: PASS
- `npm run check`: PASS
- `npm run build`: PASS
- Final dist regression set：PASS

## Stable Memory

Phase 139 establishes that feedback memory must affect recall, not only prompt text. Once `pressureProvenancePreDispatchComplianceArchive` marks an `agentType + project` pair as a frequent pressure provenance violator, typed MEMORY.md recall must treat under-repair pressure memory as risky context for that pair.

Normal pressure memories remain available. The policy is targeted: it activates only when the pressure provenance feedback policy is active and a recalled document or its pressure usage hint indicates under-repair provenance. Risk memories are not deleted; they are either downranked/gated for ordinary implementation tasks or preserved as `repair-first` when the task is explicitly about provenance repair.

This is closer to Claude Code-style memory behavior: post-dispatch feedback now loops back into future context selection. The group memory system is no longer just remembering that a child Agent violated receipt discipline; it changes what future child Agent sessions receive as context.

## Next Direction

Continue moving from “risk-aware recall” toward “risk-aware dispatch planning”:

- Use compliance attribution to choose safer child-agent providers when multiple runners are available.
- Convert repeated gated risky pressure memories into explicit repair work items before ordinary implementation dispatch.
- Add aging/decay to pressure provenance feedback policy so old violations can recover after sustained compliant receipts.
- Surface per-agent/project memory compliance health in Memory Center overview, not only as a quality check.
