# Phase 132 - Pressure Memory Provenance Receipt Contract

Date: 2026-07-09

## Goal

Close the loop from Phase 131 by requiring child Agents to report how they used typed pressure memory with provenance and repair state.

Before this phase, CCM could inject `pressure repair recommendation_conflict:pending` into the child Agent WorkerContextPacket, but the receipt path still reduced memory usage mostly to string arrays in `memoryUsed` / `memoryIgnored`. Claude Code-style memory needs feedback that preserves trust state: when a child Agent uses, verifies, ignores, or merely mentions a disputed pressure memory, that outcome must return to the pressure usage ledger with provenance.

## Implemented

- Added structured receipt field parsing in `backend/modules/collaboration/agent-receipts.ts`:
  - `memoryProvenanceUsage`
  - `memory_provenance_usage`
  - `typedMemoryProvenanceUsage`
  - `typed_memory_provenance_usage`
  - `pressureMemoryUsage`
  - `pressure_memory_usage`
- Each provenance usage row supports:
  - `relPath`
  - `name`
  - `usageState`
  - `provenanceStatus`
  - `repairWorkItemId`
  - `repairStatus`
  - `repairGapType`
  - `currentSourceVerified`
  - `reason`
- Extended pressure recall usage collection in `backend/modules/collaboration/collaboration.ts` so structured provenance rows take precedence over free-text `memoryUsed` / `memoryIgnored`.
- If a child Agent says `usageState: "used"` with `currentSourceVerified: true`, CCM records the pressure memory usage as `verified`.
- Extended `.pressure-recall-usage-ledger.json` entries in `backend/modules/collaboration/group-memory-index.ts` with:
  - `provenance_status`
  - `repair_status`
  - `repair_work_item_id`
  - `repair_gap_type`
  - `current_source_verified`
- Extended pressure usage stats aggregation with:
  - `provenance_statuses`
  - `repair_work_item_ids`
  - `repair_statuses`
  - `repair_gap_types`
  - `current_source_verified_count`
- Updated `backend/agents/worker-handoff.ts` receipt schema example to include `memoryProvenanceUsage`.
- Updated child memory bundle rendering to explicitly require `memoryProvenanceUsage` when pressure repair provenance is visible.

## Acceptance

New selftest:

- `runPressureMemoryProvenanceReceiptUsageSelfTest`

Key checks:

- `extractAgentReceipt` preserves structured `memoryProvenanceUsage`.
- A structured provenance receipt row is matched to the recalled pressure typed memory by `relPath` / `name`.
- `currentSourceVerified: true` upgrades `usageState: "used"` into ledger `usage_state: "verified"`.
- The pressure usage ledger entry stores `provenance_status`, `repair_work_item_id`, `repair_status`, `repair_gap_type`, and `current_source_verified`.
- The pressure usage stats aggregate provenance status and repair work item ids.

Regression checks passed:

- `runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest`
- `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`

Build validation passed:

- `npm run build:backend`
- `npm run check`
- `npm run build`

Final dist validation passed:

- `runPressureMemoryProvenanceReceiptUsageSelfTest`
- `runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest`
- `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`
- `runGroupTypedMemoryCrossGroupPressureRecallUsageSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`
- `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`
- `runWorkerContextPartialCompactCrossGroupPressureRecallUsageStrategySelfTest`
- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`

## Stable Memory

CCM now has a structured receipt contract for pressure memory provenance.

The operational invariant is:

- pressure memory provenance shown to a child Agent must be reportable by that child Agent;
- disputed or stale-under-repair memories should not disappear into plain `memoryUsed` strings;
- `memoryProvenanceUsage` is the preferred receipt field for typed pressure memory with trust/repair state;
- legacy `memoryUsed` / `memoryIgnored` matching still works as a compatibility fallback;
- using a disputed pressure memory as verified requires `currentSourceVerified: true`;
- the pressure usage ledger now preserves repair provenance so future scoring can distinguish trusted, disputed, stale, and verified usage.

This moves CCM closer to Claude Code parity because memory is no longer only injected with provenance. The provenance now survives the child Agent receipt and feeds the next recall/repair cycle.

## Next Direction

Next parity work should add Memory Center visibility for provenance receipt quality:

- report child Agent receipts that saw pressure repair provenance but omitted `memoryProvenanceUsage`;
- show trusted/disputed/verified-under-repair counts per group and project;
- let completed repair items update a project-level trust summary;
- use that trust summary to suppress obsolete cross-group pressure hints after repair closure.
