# CCM Group Memory CC Parity - Phase 175

Date: 2026-07-10

## Focus

Phase 175 extends required-doc dispatch-brief coverage from provider-ranking receipt memory into pressure provenance receipt repair.

When WorkerContextPacket surfaces disputed or stale-under-repair pressure MEMORY.md rows, the corrected-receipt repair path must preserve every required pressure MEMORY.md `relPath` and every `repairWorkItemId` into the main Agent dispatch candidate, dispatch brief metadata, and worker task text before a child Agent is asked to correct `CCM_AGENT_RECEIPT.memoryProvenanceUsage`.

## Implemented

- Strengthened pressure provenance dispatch brief metadata validation:
  - all `pressure_memory_provenance_rel_paths` must appear in brief metadata and `worker_task`
  - all `pressure_memory_provenance_repair_work_item_ids` must appear in brief metadata and `worker_task`
  - `worker_task` must retain `memoryProvenanceUsage`, `provenanceStatus`, `repairWorkItemId`, `currentSourceVerified`, and `CCM_AGENT_RECEIPT`
- Added required-docs dispatch brief report/evaluator:
  - `worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_brief_required_docs`
- Added exported selftest:
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchBriefRequiredDocsSelfTest`
- The selftest uses two under-repair pressure MEMORY.md relPaths and two repair work item IDs to prove multi-doc coverage survives receipt gap detection, repair work item creation, main Agent dispatch candidate generation, dispatch brief compilation, and quality reporting.

## Verification

TypeScript compile:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Focused regression:

```json
{
  "phase175": true,
  "pressureDispatch": true,
  "pressureTyped": true,
  "pressureReceipt": true,
  "phase174": true,
  "phase173": true,
  "phase172": true,
  "phase171": true,
  "phase170": true,
  "phase169": true,
  "phase168": true,
  "compactOutcome": true,
  "ranking": true,
  "runtimeUsage": true,
  "ignorePolicy": true
}
```

## Invariant

Pressure provenance memory under repair is not blindly trusted. If it is used, `CCM_AGENT_RECEIPT.memoryProvenanceUsage` must prove current-source verification with `currentSourceVerified=true`; otherwise it must be explicitly ignored with a reason.

The provider-switch invariant remains unchanged: provider switch execution history is ranking evidence only, never authorization.

## Next Direction

Continue generalizing required-doc receipt and dispatch-brief coverage into other memory families, especially compact read-plan revalidation and post-compact reinjection candidates, so every recalled or injected memory object has an auditable used/ignored receipt path.
