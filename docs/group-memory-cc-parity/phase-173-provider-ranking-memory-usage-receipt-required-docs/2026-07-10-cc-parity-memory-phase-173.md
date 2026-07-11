# CCM Group Memory CC Parity - Phase 173

Date: 2026-07-10

## Focus

Phase 173 upgrades provider-ranking receipt memory usage from a single-doc receipt check to a required-docs receipt check.

When a WorkerContextPacket declares `memory_receipt_required_doc_rel_paths`, the child Agent final `CCM_AGENT_RECEIPT.memoryUsed` or `memoryIgnored` must cite every required relPath with an explicit usage state. This closes the gap where a child Agent could cite `provider-ranking-provenance-compact-repair-receipt-memory.md` but silently omit the recalled discipline memory `provider-ranking-memory-usage-receipt-discipline.md`.

## Implemented

- Extended provider-ranking memory usage receipt coverage to compute:
  - `requiredDocRelPaths`
  - `coveredDocRelPaths`
  - `missingDocRelPaths`
  - `missingUsageStateDocRelPaths`
  - per-doc usage coverage
- Added the required-docs quality check:
  - `worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_required_docs`
- Added a report/evaluator pair that verifies required memory docs across child Agent receipts.
- Enhanced repair work items so missing required docs are carried into:
  - `provider_ranking_memory_receipt_required_doc_rel_paths`
  - `provider_ranking_memory_receipt_missing_doc_rel_paths`
  - `provider_ranking_memory_receipt_missing_usage_state_doc_rel_paths`
  - `prompt_patch`
  - `raw_recovery`
- Updated repair candidate metadata validation so dispatch candidates must preserve every expected provider-ranking receipt memory relPath.
- Added exported selftest:
  - `runMemoryCenterWorkerContextProviderRankingProvenanceCompactRepairReceiptMemoryUsageReceiptRequiredDocsSelfTest`

## Verification

TypeScript compile:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Focused regression:

```json
{
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

Continue toward Claude Code style memory parity by making required-doc receipt coverage apply more broadly across other recalled typed memories, not only provider-ranking receipt discipline. The long-term goal remains active.
