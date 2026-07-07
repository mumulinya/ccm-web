# Phase 41: Compact Boundary Timeline

## Goal

Continue the long-term CCM memory upgrade toward Claude Code parity by making every group compact boundary observable as a single lifecycle timeline.

The group main Agent dispatches work to third-party child Agents that start as fresh sessions. After group chat memory is compacted, CCM must prove that the compressed memory was restored, reinjected, dispatched, used, scored, and recalled across those child-Agent sessions.

## Implemented

- Added a compact-boundary timeline under group post-compact diagnostics: `postCompactUsage.boundaryTimeline`.
- Added `buildGroupCompactBoundaryTimeline()` to correlate compression, recovery audit, first dispatch, candidate usage, child-Agent reliability, and typed recall.
- Added `buildCompactBoundaryTimelineReport()` for multi-group aggregation.
- Added `evaluateCompactBoundaryTimeline()` as a Memory Center quality check.
- Added overview-level `compactBoundaryTimelineReport` and warning/critical alerts for weak compact boundaries.
- Added Memory Center UI panel named `压缩边界时间线`.
- Added selftest `runMemoryCenterCompactBoundaryTimelineSelfTest()`.
- Hardened token evidence reading so compact timelines can read pre/post token counts from `compaction`, `compactBoundary`, or `messageCompression`.
- Hardened timeline status so a warning/failing component is not hidden by high average scores.
- Updated worker handoff rendering to avoid vague "previous discussion" language in self-contained child-Agent dispatch context.

## Timeline Components

Each group compact boundary now exposes:

- Compression:
  - compacted message count
  - pre-compact token count
  - post-compact token count
  - reduction rate
  - token pressure
- Recovery:
  - post-compact recovery audit status
  - passed and failed recovery checks
- Dispatch:
  - first child-Agent dispatch marker
  - first-dispatch latency
  - latest-boundary target coverage
- Candidate usage:
  - post-compact candidate ledger totals
  - strict classification rate
  - stale promoted count
- Child-Agent reliability:
  - per-child-Agent memory reliability score
  - weak Agent count
- Typed recall:
  - typed memory recall hint count
  - matched, boosted, and deprioritized memory docs

## Files

- `backend/modules/knowledge/memory-control-center.ts`
- `backend/agents/worker-handoff.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `docs/group-memory-cc-parity/phase-41-compact-boundary-timeline/2026-07-07-cc-parity-memory-phase-41.md`

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run test:chat-experience`
- `memoryCenter.runMemoryCenterCompactBoundaryTimelineSelfTest()`
- `memoryCenter.runMemoryCenterChildAgentMemoryReliabilitySelfTest()`
- `memoryCenter.runMemoryCenterPostCompactDispatchMarkerTrendSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactUsageDiagnosticsSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `worker.runWorkerHandoffSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`

Previously passed before the final backend hardening and retained as part of this phase's built assets:

- `npm run build:frontend`
- `npm run build:mcp-feishu`

## Result

CCM can now inspect a compact boundary as a lifecycle instead of scattered metrics. The group main Agent and Memory Center can see whether a compacted group recovered its summary, reinjected critical candidates, reached child Agents on first dispatch, avoided stale candidate promotion, preserved child-Agent reliability, and kept typed memory recall active.

This moves CCM closer to Claude Code-style post-compaction discipline for fresh child-Agent sessions.

## Next Candidates

- Add first-class pre/post compact hook ledgers with hook output, failure, and timing evidence.
- Add automatic targeted rework for child Agents whose memory reliability remains weak after compaction.
- Extend compact-boundary timelines across multiple historical boundaries, not only the latest boundary.
- Add per-boundary memory replay tests that prove a child Agent can reconstruct required files, commands, constraints, and acceptance criteria from the injected context alone.
