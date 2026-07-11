# CCM Group Memory CC Parity - Phase 174

Date: 2026-07-10

## Focus

Phase 174 extends the Phase 173 required-docs guarantee into the corrected-receipt dispatch brief path.

Phase 173 verified that child Agent final receipts must cite every `memory_receipt_required_doc_rel_paths` entry. Phase 174 makes sure the repair path does not lose those relPaths before the main Agent asks a child Agent to correct `CCM_AGENT_RECEIPT.memoryUsed` or `memoryIgnored`.

## Implemented

- Mirrored provider-ranking receipt required-doc metadata from repair work items into main Agent dispatch candidates:
  - `provider_ranking_memory_receipt_required_doc_rel_paths`
  - `provider_ranking_memory_receipt_missing_doc_rel_paths`
  - `provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths`
- Mirrored the same fields into replay repair dispatch briefs.
- Moved the critical receipt boundary text earlier in `worker_task` so compacting the brief cannot truncate:
  - `CCM_AGENT_RECEIPT.memoryUsed` / `memoryIgnored`
  - every required memory doc relPath
  - `usageState`
  - `ranking evidence only, not authorization`
  - `fresh valid provider switch decision receipt`
- Strengthened dispatch brief metadata validation so required docs must appear in both brief metadata and `worker_task`.
- Added required-docs dispatch brief report/evaluator:
  - `worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_brief_required_docs`
- Added exported selftest:
  - `runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRepairDispatchBriefRequiredDocsSelfTest`

## Verification

TypeScript compile:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Focused regression:

```json
{
  "phase174": true,
  "phase173": true,
  "phase172": true,
  "phase171": true,
  "phase170": true,
  "phase169": true,
  "phase168": true,
  "phase167": true,
  "phase166": true,
  "phase165": true,
  "typedMemoryPhase165": true,
  "phase164": true,
  "phase163": true,
  "phase162": true,
  "compactOutcome": true,
  "ranking": true,
  "runtimeUsage": true,
  "ignorePolicy": true
}
```

## Invariant

Provider switch execution history remains ranking evidence only. It is never authorization. Any fresh explicit provider switch still requires a valid receipt/checksum/local authority/task compatibility decision.

## Next Direction

Generalize this required-doc receipt and dispatch-brief coverage beyond provider-ranking memory into broader typed MEMORY recall families, so every child Agent session has auditable proof that recalled memory was either used or explicitly ignored.
