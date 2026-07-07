# CCM group memory CC parity - phase 33

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like recovered-context behavior. Phase 32 persisted post-compact candidate usage into a per-group ledger. Phase 33 makes that ledger affect typed `MEMORY.md` recall scoring, so recovered memory starts learning from whether child Agents actually used, ignored, or verified prior candidates.

## Implemented

- Added post-compact usage scoring to `backend/modules/collaboration/group-memory-index.ts`.
  - `buildGroupTypedMemoryRecall` now accepts `postCompactCandidateUsage`.
  - Typed memory docs that mention useful recovered candidates get a positive score adjustment.
  - Docs tied to repeatedly ignored candidates get a negative score adjustment and may be skipped as low-score.
  - Mentioned-only candidates get a small hint so the next receipt is pushed to classify usage explicitly.

- Added recall diagnostics.
  - Each recalled doc may include `postCompactUsage.adjustment` and matched candidate hints.
  - Recall result includes `postCompactUsageScoring` with `hint_count`, `matched_count`, `boosted_count`, and `deprioritized_count`.
  - Rendered typed memory includes `post-compact usage +N` / negative adjustment metadata beside the score.

- Connected child-Agent context bundles to the scoring path.
  - `buildAgentMemoryContextBundle` now computes the post-compact reinjection gate and usage summary before typed recall.
  - The usage summary is passed into `buildGroupTypedMemoryRecall`.
  - The existing usage ledger section remains rendered in the child context packet, while typed recall now also reflects the scoring effect.

- Added selftest coverage.
  - `runGroupTypedMemoryPostCompactUsageScoringSelfTest` verifies useful recovered candidates are boosted and ignored candidates are deprioritized.
  - `runGroupPostCompactCandidateUsageLedgerSelfTest` now also proves usage hints feed into typed recall scoring inside child context bundles.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

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

- Feed `deprioritize_or_distill` into long-term log distillation so stale ignored candidates are archived or rewritten into lower-priority memory docs.
- Add strict candidate classification mode where every injected `pcrc_*` candidate must be classified in the child Agent receipt.
- Surface post-compact usage scoring in the memory center UI so the user can inspect why a memory was boosted or deprioritized.

Long-term status: active. This phase makes recovered-memory usage affect future recall, but the full CC-parity memory objective remains ongoing.
