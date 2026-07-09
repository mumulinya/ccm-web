# Phase 131 - Pressure Repair Provenance In Child Context

Date: 2026-07-09

## Goal

Carry cross-group pressure memory repair state into the actual child Agent context.

Before this phase, Phase 130 could create repair work items when local pressure memory feedback conflicted with same-project cross-group evidence, but a fresh third-party child Agent session could still receive a typed `MEMORY.md` recall without seeing whether that memory was trusted, disputed, or under repair. Claude Code-style memory needs provenance at the point of use, not only in Memory Center reports.

## Implemented

- Added pressure recall usage repair hint loading in `backend/modules/collaboration/group-memory-index.ts`.
- The typed memory recall path now reads open `cross_group_pressure_recall_usage_repair` work items from the existing replay repair work item ledger.
- Pressure usage hints now carry:
  - `target_project`
  - `provenance_status`
  - `repair_status`
  - `repair_open`
  - `repair_work_item_id`
  - `repair_gap_type`
  - `repair_priority`
  - `repair_reason`
  - `repair_local_recommendation`
  - `repair_cross_group_recommendation`
  - `repair_source_group_count`
- Matched pressure usage diagnostics now preserve the same repair fields.
- Recall scoring now reports:
  - `repair_hint_count`
  - `repair_matched_count`
  - `disputed_matched_count`
- `renderGroupTypedMemoryRecall` now renders short provenance markers such as:
  - `pressure repair recommendation_conflict:pending`
  - `provenance cross_group_project_assist`
- `buildAgentMemoryContextBundle` now forwards cross-group pressure recall and pressure repair hint options into typed memory recall.
- `renderGroupMemoryContextBundle` now promotes active pressure repair provenance to the top of the child memory bundle, so WorkerContextPacket head/tail compaction does not hide it.

## Acceptance

New selftests:

- `runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest`
- `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`

Key checks:

- A local pressure usage recommendation conflict with an open cross-group pressure repair work item marks the recalled typed memory as `disputed_under_repair`.
- The matched diagnostic includes the repair work item id, gap type, local recommendation, and cross-group recommendation.
- The rendered typed memory recall includes `pressure repair recommendation_conflict:pending`.
- The child memory bundle `rendered_text` includes the repair marker.
- A rendered WorkerContextPacket still includes the repair marker after platform memory compaction.

Regression checks passed:

- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`

Build validation passed:

- `npm run build:backend`
- `npm run check`
- `npm run build`

Final dist validation passed:

- `runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest`
- `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterReplayRepairDispatchCandidateSelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`

## Stable Memory

CCM now carries pressure memory repair provenance to the child Agent session itself.

The operational invariant is:

- local group pressure feedback remains authoritative;
- same-project cross-group pressure feedback remains supplemental;
- if a memory recommendation is disputed or stale under repair, the typed recall diagnostic must say so;
- the child Agent rendered context must show the repair state before the Agent applies the memory;
- WorkerContextPacket compaction must not hide active pressure repair provenance.

This makes memory use closer to Claude Code behavior: context is not just recalled, it is recalled with trust state and maintenance state.

## Next Direction

Next parity work should let the global Agent arbitrate completed pressure repair outcomes:

- when a repair item is completed, update project-level pressure memory trust summaries;
- suppress obsolete cross-group hints after repair closure;
- expose trusted/disputed/repaired counts in Memory Center;
- add a small provenance contract to `CCM_AGENT_RECEIPT.memoryUsed` so child Agents report whether they used trusted memory, disputed memory, or ignored a repair-marked memory.
