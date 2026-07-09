# Phase 129 - Cross-Group Pressure Usage Memory Center

Date: 2026-07-09

## Goal

Expose Phase 128 cross-group project pressure memory usage in Memory Center so the system can audit why a pressure `MEMORY.md` hint is available, whether it came from local group history or same-project cross-group history, and whether that evidence is stale or contradictory.

Before this phase, cross-group pressure usage could affect recall and partial compact policy, but the operational view was still mostly implicit. Claude Code-style memory needs visible provenance: when a fresh child Agent session receives project memory from another group, the main Agent and global Agent must be able to inspect that transfer.

## Implemented

- Added `GROUP_TYPED_MEMORY_MD_DIR` scanning in `backend/modules/knowledge/memory-control-center.ts` for pressure recall usage ledgers.
- Added report:
  - `buildWorkerContextPacketCrossGroupPressureRecallUsageReport`
- Added quality check:
  - `worker_context_packet_cross_group_pressure_recall_usage`
- The report derives target projects from:
  - WorkerContextPacket dispatch binding projects;
  - local `.pressure-recall-usage-ledger.json` target projects;
  - explicit `targetProject` / `targetProjects` options.
- The report derives cross-group sources from pressure recall usage ledgers and explicit cross-group options.
- Per project, the report records:
  - `mode: "cross_group_project_assist"` when there is no local group history but same-project cross-group history exists;
  - `mode: "local_first"` when local history exists and remains primary;
  - `mode: "local_first_with_cross_group_supplement"` when local history exists and cross-group rows only supplement other docs;
  - stale-only cross-group warnings;
  - local-vs-cross recommendation conflicts.
- Memory Center overview now returns:
  - `workerContextPacketCrossGroupPressureRecallUsageReport`
- Memory quality descriptors now include the new check.
- Memory Center UI now has a `PROJECT PRESSURE MEMORY` panel showing:
  - assist projects;
  - supplement rows;
  - source groups;
  - local-first projects;
  - conflicts;
  - stale cross-group entries.
- The UI supports targeted refresh for:
  - `worker_context_packet_cross_group_pressure_recall_usage`

## Acceptance

New selftest:

- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`

Key checks:

- A target group with no local pressure usage ledger can see same-project cross-group pressure usage as `cross_group_project_assist`.
- The report exposes supplement rows and source group counts.
- The quality check passes when cross-group assist is fresh and non-conflicting.
- After local group feedback appears for the same doc with the opposite recommendation, the report switches to `local_first`.
- The conflict is surfaced in report gaps and the targeted quality check fails loudly.

Regression checks passed:

- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`

Build validation:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist validation:

- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`

## Stable Memory

CCM can now explain cross-group pressure memory sharing in Memory Center. Same-project pressure usage feedback is no longer only an invisible scoring signal; it is summarized as a quality report with local-first semantics, source group provenance, stale history counts, and conflict gaps.

The operational invariant is:

- local group pressure feedback wins;
- cross-group project feedback can assist only when local evidence is absent for that doc;
- contradictory local and cross-group recommendations become quality gaps;
- stale-only cross-group evidence remains audit evidence and must not silently promote memory;
- Memory Center can refresh this check independently.

This makes child Agent context injection closer to Claude Code memory behavior because every cross-session memory transfer has inspectable provenance instead of being an opaque boost.

## Next Direction

Next parity work should turn warnings into autonomous repair:

- create repair work items when cross-group pressure usage conflicts persist;
- prune or compact old pressure recall usage ledgers after they are stale-only;
- let the global Agent arbitrate between local group memory, same-project cross-group memory, and global memory;
- add per-project child Agent memory health reports that combine recall, usage receipt, stale pressure feedback, and cross-group assist quality.
