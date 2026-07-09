# Phase 128 - Cross-Group Pressure Recall Usage

Date: 2026-07-09

## Goal

Let CCM reuse pressure typed-memory usage feedback across multiple group chats that dispatch work to the same project child Agent.

Before this phase, pressure recall usage feedback was local to one group. That meant a fresh third-party child Agent session in another group could miss useful evidence that the same project had already used, verified, or ignored a pressure `MEMORY.md` document elsewhere. The parity target is Claude Code-like memory behavior: local context remains primary, but project-scoped memory experience can travel as auditable hints.

## Implemented

- Added cross-group pressure recall usage aggregation in `backend/modules/collaboration/group-memory-index.ts`.
- New project-scoped summary:
  - `buildGroupTypedMemoryPressureRecallUsageProjectSummary(groupId, options)`
- Cross-group summaries read `.pressure-recall-usage-ledger.json` from other groups and filter by `targetProject`.
- The scan is bounded by `GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS`.
- Cross-group rows preserve:
  - `hint_scope: "cross_group_project"`
  - `source_group_count`
  - `group_ids`
- Local group rows keep priority. If the local group has usage feedback for the same memory doc, the cross-group row for that doc is filtered out.
- `buildGroupTypedMemoryRecall` now reports:
  - `cross_group_hint_count`
  - `cross_group_matched_count`
- Partial compact policy now falls back to project cross-group usage history when local group pressure usage history is empty.
- Pressure usage strategy bias now exposes cross-group audit fields:
  - `summary_source`
  - `source_group_count`
  - `source_groups`
- Policy summaries now expose cross-group source metadata for debugging and Memory Center follow-up.

## Acceptance

New selftests:

- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`

Key checks:

- A source group with `used` and `verified` pressure recall feedback promotes the same target project's typed memory in another group.
- A source group with ignored pressure recall feedback can deprioritize that memory in another group.
- `targetProject` isolation blocks cross-group hints for the wrong project.
- Local group usage feedback overrides cross-group feedback for the same memory doc.
- Partial compact policy can use same-project cross-group pressure feedback when the target group has no local usage ledger.
- Cross-group pressure feedback can select the compact strategy category that historical outcomes preferred, while the baseline without feedback still follows raw token pressure.
- Policy output remains auditable through `source_group_count` and `source_groups`.

Regression checks passed:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`

Build validation:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist validation:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`

## Stable Memory

CCM now supports multiple group chats sharing pressure memory experience for the same project child Agent. The child Agent still receives the target group's own memory first, but if that group has no local pressure usage history for a memory doc, CCM can use other groups' same-project pressure usage as a scored hint.

This is intentionally conservative:

- local group feedback wins over cross-group feedback for the same doc;
- cross-group feedback is limited to the same `targetProject`;
- usage aging and stale suppression still apply;
- cross-group scans are bounded;
- policy and recall diagnostics expose source scope and source group counts.

This moves CCM closer to Claude Code-style durable memory because each fresh child Agent session can benefit from project-level memory experience accumulated across group chats without turning that experience into untraceable global state.

## Next Direction

Next parity work should make this shared pressure memory more operational:

- show cross-group pressure usage hints in Memory Center UI;
- add pruning or compaction for old cross-group pressure usage ledgers;
- create repair work items when cross-group hints are stale, contradictory, or repeatedly ignored;
- let the global Agent arbitrate between local group memory, cross-group project memory, and global memory when all three exist;
- add a project-level memory health report for child Agent context injection quality.
