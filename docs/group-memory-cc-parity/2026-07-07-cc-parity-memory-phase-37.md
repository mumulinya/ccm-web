# CCM group memory CC parity - phase 37

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like recovered-context discipline. Phase 36 made every child-Agent receipt classify each injected post-compact candidate as `used`, `ignored`, or `verified`. Phase 37 adds a Memory Center quality check so that this discipline is visible as a long-term system metric, not only as a per-task acceptance gate.

## Implemented

- Added a Memory Center quality check: `post_compact_candidate_discipline`.
  - Label: `压缩候选纪律`.
  - Checks recent task delivery summaries for post-compact candidate rows.
  - Counts each recovered-memory candidate as passing only when classified as `used`, `ignored`, or `verified`.
  - Treats `mentioned` and `unreferenced` as quality gaps.

- Added stale recovered-context promotion detection.
  - Reads per-group post-compact usage ledgers through `buildGroupPostCompactCandidateUsageSummary`.
  - Treats repeatedly ignored or distilled/archive candidates as stale.
  - Flags a gap when a stale candidate is promoted directly as `used` instead of being `verified` first or kept `ignored`.

- Added ledger-history gap detection.
  - Reads `missing_usage_candidates` from each group ledger.
  - Flags historical candidates that only have `mentioned` without `used` / `ignored` / `verified`.

- Integrated the check into `buildMemoryQualityReport`.
  - It now contributes to the Memory Center quality score alongside constraint retention, child-Agent memory use, RAG recall, long-task goal consistency, and source traceability.
  - The existing Memory Center quality panel will surface the check automatically.

- Added selftest coverage.
  - `runMemoryCenterPostCompactCandidateDisciplineSelfTest` verifies:
    - strict per-candidate classification rows are counted,
    - stale ignored candidates used without verification are gaps,
    - mentioned candidates are gaps,
    - ledger-only mentioned candidates are gaps,
    - stale candidates can pass when explicitly `verified`.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactUsageDiagnosticsSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`

## Next Upgrade Direction

- Add per-group trend summaries for strict candidate classification rate over time.
- Expose stale-promotion counts in the group detail diagnostics panel.
- Add a system alert when recent strict classification rate falls below an acceptance threshold.

Long-term status: active. CCM now enforces and measures post-compact candidate classification quality, but the full CC-parity memory objective remains ongoing.
