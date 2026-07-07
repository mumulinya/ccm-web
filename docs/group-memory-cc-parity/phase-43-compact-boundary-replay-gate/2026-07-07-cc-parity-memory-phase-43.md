# Phase 43: Compact Boundary Replay Gate

## Goal

Continue the long-term CCM memory upgrade toward Claude Code parity by proving that a compacted group memory can be replayed into a fresh third-party child Agent session.

The group main Agent dispatches work to child Agents such as Claude Code, Cursor, or Codex. Those sessions may not share the original group chat history. After compaction, CCM must verify that the injected context still contains the required constraints, files, verification commands, hook-injected requirements, compact boundary, and receipt contracts.

## Implemented

- Added `buildGroupCompactBoundaryReplayGate()` in `backend/modules/knowledge/memory-control-center.ts`.
- Added `buildCompactBoundaryReplayReport()` for multi-group aggregation.
- Added `evaluateCompactBoundaryReplayGate()` as a Memory Center quality check.
- Added group detail diagnostics under `postCompactUsage.boundaryReplay`.
- Added overview-level `compactBoundaryReplayReport` and alerts.
- Added Memory Center UI panel named `压缩边界 Replay Gate`.
- Added selftest `runMemoryCenterCompactBoundaryReplayGateSelfTest()`.
- Extended child Agent memory context rendering so `compaction.hookLedger` appears in the actual rendered memory package.
- Fixed child-Agent progress summaries so active native/scratchpad session progress is not hidden by generic worker summaries.

## Replay Behavior

The replay gate is read-only. It does not create a new dispatch, does not append a post-compact marker, and does not mutate typed recall ledgers.

It builds a synthetic child-Agent memory package from current group memory and renders it through the same `renderGroupMemoryContextBundle()` path that real child-Agent dispatches use.

The gate checks whether the rendered context contains:

- group goal
- compact boundary checksum or message boundary
- persistent requirements
- post-compact reinjection candidates
- file candidates
- skill candidates
- verification command candidates
- blocker candidates
- hook ledger run evidence
- post-compact recovery audit evidence
- `memoryUsed/memoryIgnored` receipt contract
- `postCompactCandidateUsage` candidate-use contract

## Files

- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `docs/group-memory-cc-parity/phase-43-compact-boundary-replay-gate/2026-07-07-cc-parity-memory-phase-43.md`

Generated build outputs were refreshed under:

- `ccm-package/dist`
- `ccm-package/public`

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `memoryCenter.runMemoryCenterCompactBoundaryReplayGateSelfTest()`
- `compaction.runGroupMemoryCompactionHookSelfTest()`
- `memoryCenter.runMemoryCenterCompactionHookLedgerSelfTest()`
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
- `collaboration.runCollaborationUxSelfTest()`

## Result

CCM can now verify that compacted memory is not only recorded and scored, but actually replayable into the kind of context a fresh child Agent receives.

This closes a practical gap between "memory exists" and "memory is usable by a third-party Agent session." It also makes hook-injected requirements visible in the real child-Agent memory package.

## Next Candidates

- Add automatic targeted rework when replay gate fails for a weak child Agent.
- Extend replay gates across multiple historical compact boundaries.
- Add per-target replay scoring so each child Agent can be checked against its own files, commands, and responsibilities.
- Add replay-driven context minimization so candidates that repeatedly fail or stay unused are demoted before dispatch.
