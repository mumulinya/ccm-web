# Phase 130 - Cross-Group Pressure Usage Repair Work Items

Date: 2026-07-09

## Goal

Turn Phase 129 cross-group pressure memory warnings into actionable Memory Center repair work items.

Before this phase, CCM could audit same-project cross-group pressure recall usage and flag stale-only or contradictory evidence, but those findings were still passive warnings. Claude Code-style memory needs the main Agent to keep a repair queue for memory drift: when local group pressure feedback contradicts useful cross-group evidence, the system should create an auditable item that can be claimed, dispatched, and closed through the existing repair workflow.

## Implemented

- Added cross-group pressure recall usage repair gap extraction in `backend/modules/knowledge/memory-control-center.ts`.
- Added repair work item creation for:
  - `recommendation_conflict`
  - `stale_cross_group_only`
- Added work item source:
  - `cross_group_pressure_recall_usage_repair`
- Added work item component:
  - `cross_group_pressure_recall_usage`
- Repair items preserve:
  - target project
  - rel path
  - local recommendation
  - cross-group recommendation
  - source group count
  - source groups
  - stale entry count
  - quality gap reason
- Repair items reuse the existing compact-boundary replay repair work item ledger instead of introducing a new queue.
- Existing repair item state is preserved when the same issue is regenerated.
- Old cross-group pressure repair items are closed automatically when the report becomes healthy or the gap disappears.
- Added report:
  - `buildWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemReport`
- Added quality check:
  - `worker_context_packet_cross_group_pressure_recall_usage_repair_work_items`
- Memory quality overview now returns:
  - `workerContextPacketCrossGroupPressureRecallUsageRepairWorkItemReport`
- Group post-compact usage diagnostics now include:
  - `crossGroupPressureRecallUsage`
  - `crossGroupPressureRecallUsageRepairWorkItems`
- The dispatch candidate path now sees these repair work items through the existing replay repair dispatch flow.

## Acceptance

New selftest:

- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`

Key checks:

- A same-project cross-group pressure usage conflict creates a repair work item.
- The repair item records the conflict type, target project, rel path, local recommendation, cross-group recommendation, and source group provenance.
- The repair report passes when every active conflict or stale-only gap has a repair work item.
- The existing replay repair dispatch candidate flow can see the generated repair item.
- The existing replay repair work item state machine can claim and complete the generated item.
- The Phase 129 cross-group pressure usage selftest now uses a dedicated target project so parallel or repeated tests do not inherit unrelated `frontend` pressure ledgers.

Regression checks passed:

- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterReplayRepairDispatchCandidateSelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`

Build validation passed:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist validation passed:

- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterReplayRepairDispatchCandidateSelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`

## Stable Memory

CCM can now promote cross-group pressure memory quality warnings into reusable repair work items.

The operational invariant is:

- local group pressure feedback remains authoritative for recall;
- same-project cross-group pressure feedback remains supplemental and auditable;
- local-vs-cross recommendation conflicts become repair work instead of silent drift;
- stale-only cross-group pressure evidence becomes repair work instead of hidden noise;
- generated repair work items reuse the existing replay repair ledger, dispatch candidates, and claim/complete state machine;
- resolved gaps close their repair items instead of leaving stale work active.

This moves the memory system closer to Claude Code parity because child Agent context memory is no longer just injected or audited. It now has a maintenance loop: pressure recall evidence can be observed, diagnosed, turned into work, and completed by the main Agent/global Agent workflow.

## Next Direction

Next parity work should make the repair loop more autonomous:

- allow the global Agent to arbitrate cross-group pressure memory conflicts across multiple active groups;
- generate compacted project-level pressure memory summaries from completed repair items;
- make stale pressure recall usage ledgers eligible for safe pruning after repair closure;
- include repair item state in WorkerContextPacket memory provenance so fresh child Agent sessions know whether a memory hint is trusted, disputed, or under repair.
