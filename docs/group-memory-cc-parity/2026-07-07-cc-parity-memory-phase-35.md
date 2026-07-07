# CCM group memory CC parity - phase 35

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like memory visibility and recovered-context discipline. Phase 32-34 made post-compact candidate usage persistent, useful for typed `MEMORY.md` scoring, and distillable into a low-priority archive. Phase 35 exposes those signals in the Memory Center API and UI, so a group owner can inspect how child Agents actually used recovered memory after compaction.

## Implemented

- Added group-scope post-compact usage diagnostics to `backend/modules/knowledge/memory-control-center.ts`.
  - Lightweight overview summaries now include candidate counts, ledger totals, ledger path, and update time.
  - Group detail responses now include `postCompactUsage`.
  - Detail diagnostics read the post-compact usage ledger, typed-memory distillation ledger, typed `MEMORY.md` docs, and recall scoring.

- Exposed Memory Center diagnostics for the full post-compact loop.
  - Ledger totals: `used`, `ignored`, `verified`, `mentioned`, and total rows.
  - Candidate buckets: useful/promotable, ignored/deprioritized, and missing explicit usage receipts.
  - Low-priority archive rows from `.distillation-ledger.json`.
  - Typed memory recall scoring: hint count, matched count, boosted count, and deprioritized count.
  - Per-doc boost/deprioritize rows for `MEMORY.md` recall diagnostics.
  - Recent child-Agent receipt entries.

- Updated `frontend/src/components/knowledge/MemoryCenter.vue`.
  - The group "压缩边界" view now shows a "压缩重注入候选" diagnostics panel.
  - Added compact cards for usage totals, recall weighting, and archive count.
  - Added candidate lists for promotion, deprioritization, explicit-receipt gaps, and archive rows.
  - Added typed-memory recall diagnostics showing which docs were boosted or deprioritized.
  - Added recent child-Agent usage receipts.

- Added backend selftest coverage.
  - `runMemoryCenterPostCompactUsageDiagnosticsSelfTest` builds a temporary group, records used/ignored/mentioned candidate receipts, writes typed memory docs, distills archive rows, then verifies Memory Center exposes ledger totals, buckets, archive rows, recall scoring, boost/deprioritize diagnostics, and overview stats.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

- `memoryCenter.runMemoryCenterPostCompactUsageDiagnosticsSelfTest()`
- `memoryCenter.runGlobalMemoryControlSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `memory.runGroupTypedMemoryContextSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `memory.runGroupMemoryDispatchFreshnessGateSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`
- `collaboration.runPostCompactDispatchMarkerVisibleSelfTest()`
- `collaboration.runMemoryDispatchGateReceiptValidationSelfTest()`

## Next Upgrade Direction

- Add stricter child-Agent receipt enforcement so every injected post-compact candidate must be classified before a task can be marked fully accepted.
- Add Memory Center quality checks that detect archived or repeatedly ignored candidates being promoted back into primary task context.
- Add per-group trend charts for post-compact usage over time, especially after manual or automatic compaction.

Long-term status: active. The system can now see, score, distill, and inspect post-compact recovered-memory usage across group details, but the full CC-parity memory objective remains ongoing.
