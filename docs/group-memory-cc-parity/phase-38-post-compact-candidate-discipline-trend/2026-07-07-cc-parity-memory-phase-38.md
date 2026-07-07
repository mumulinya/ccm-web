# Phase 38: Post-Compact Candidate Discipline Trend

## Goal

Continue the long-term CCM memory-system upgrade toward Claude Code parity. This phase focuses on making post-compact memory usage observable over time for multiple group chats, so a group main Agent can see whether child Agents actually classify and use compressed-memory reinjection candidates after each fresh third-party Agent session.

## Claude Code Reference

Relevant Claude Code patterns checked in `D:\claude-code`:

- `src/bootstrap/state.ts` keeps a `pendingPostCompaction` flag and consumes it once after compaction to mark the first post-compact API success.
- `src/utils/attachments.ts` re-surfaces relevant memories after compact because surfaced-memory dedup is derived from the post-boundary message set.
- `docs/context/compaction.mdx` describes compact boundary metadata, preserved segments, post-compact reinjection budgets, hooks, and PTL fallback.
- `docs/context/project-memory.mdx` describes memory freshness checks, strict ignore semantics, relevant-memory selection, and the need to verify stale file/function/flag claims before using memory.

The CCM equivalent in this phase is not another compression primitive. It is an audit and trend layer that continuously checks whether compressed-memory candidates were classified as `used`, `ignored`, or `verified`, and whether historically ignored or archived candidates were incorrectly promoted to `used` without verification.

## Implemented

- Added `buildPostCompactCandidateDisciplineTrend()` in `backend/modules/knowledge/memory-control-center.ts`.
- Added per-group trend rows with:
  - `checked`
  - `strictClassified`
  - `missing`
  - `unclassified`
  - `stalePromoted`
  - `strictClassificationRate`
  - daily `buckets`
  - recent failed rows
  - stale-promotion rows
  - ledger strict classification rate
- Expanded stale detection to include every ledger candidate with `ignored_count > 0`, not only candidates already recommended for deprioritization. This better matches the memory freshness rule: historical ignored context must be verified before it can become active context again.
- Attached the trend to the existing `post_compact_candidate_discipline` quality check.
- Added group-detail diagnostics under `postCompactUsage.discipline`.
- Added Memory Center overview alerts when recent strict classification rate falls below the threshold.
- Added per-group alerts for group chats that fall below the threshold, so multiple group chats can be monitored independently.
- Added Memory Center frontend panel for group scope:
  - strict classification rate
  - stale promoted count
  - ledger rate
  - recent task count
  - recent bucket trend
  - recent candidate gaps
- Added `runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest()`.

## Files

- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `docs/group-memory-cc-parity/phase-38-post-compact-candidate-discipline-trend/2026-07-07-cc-parity-memory-phase-38.md`

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactUsageDiagnosticsSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`

## Result

Phase 38 makes post-compact memory use measurable across group chats. The main group Agent can now tell whether child Agents are merely receiving compressed memory packets or actually classifying each candidate with a strict receipt. The system also surfaces stale promotions, where a previously ignored or archived candidate is directly used instead of being verified first.

## Next Candidates

- Add a post-compact first-dispatch cache-miss style metric similar to Claude Code `pendingPostCompaction`.
- Add explicit per-child-Agent discipline scoring, so unreliable third-party Agent sessions can be targeted for rework.
- Add a compact-boundary trend that correlates candidate discipline with compression pressure, token reduction, and recovery audit status.
