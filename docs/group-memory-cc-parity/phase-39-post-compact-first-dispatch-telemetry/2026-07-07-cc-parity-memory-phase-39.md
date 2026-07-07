# Phase 39: Post-Compact First Dispatch Telemetry

## Goal

Continue upgrading CCM group memory toward Claude Code parity by making the post-compact first child-Agent dispatch observable, scored, and visible across multiple group chats.

This phase targets the Claude Code `pendingPostCompaction` / `consumePostCompaction` pattern: after compaction, the first subsequent model call is tagged once so cache misses and restored context behavior can be attributed to compaction rather than ordinary session drift.

## Implemented

- Exported read-only dispatch ledger helpers from `backend/modules/collaboration/memory.ts`:
  - `getGroupPostCompactDispatchLedgerFile()`
  - `readGroupPostCompactDispatchLedger()`
- Added `buildPostCompactDispatchMarkerTrend()` in `backend/modules/knowledge/memory-control-center.ts`.
- Added per-group first-dispatch telemetry:
  - compacted boundary state
  - ledger file and update time
  - marker entry count
  - target count
  - boundary count
  - first dispatch count
  - followup dispatch count
  - first dispatch rate
  - latest boundary target coverage
  - first-dispatch latency
  - waiting age
  - recent markers
  - invariant gaps
- Added `evaluatePostCompactDispatchContinuity()` to Memory Center quality checks.
- Added overview-level `postCompactDispatchTrend` and group/system alerts for marker failures or stale waiting.
- Added group detail diagnostics at `postCompactUsage.dispatch`.
- Added Memory Center UI panel named `首派发 marker`, shown beside candidate discipline diagnostics.
- Added selftest `runMemoryCenterPostCompactDispatchMarkerTrendSelfTest()`.

## Why This Matters

CCM child Agents are third-party fresh sessions. A compressed group memory packet is only useful if the first child-Agent dispatch after compact can be traced. Without this telemetry, a group main Agent cannot tell whether a child Agent received the restored memory as a first-hop recovered context or merely as a later followup packet.

Phase 39 closes that observability gap:

- first dispatch after compact is counted per group and target child Agent
- followup dispatches are distinguished from first dispatches
- multi-target group chats are tracked independently
- Memory Center can surface missing or inconsistent first-dispatch markers

## Files

- `backend/modules/collaboration/memory.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `docs/group-memory-cc-parity/phase-39-post-compact-first-dispatch-telemetry/2026-07-07-cc-parity-memory-phase-39.md`

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
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

CCM now has a Memory Center-visible equivalent of Claude Code's post-compaction first-call telemetry for group child-Agent dispatches. The system can prove whether a compacted group memory boundary has a first dispatch marker, whether multiple target child Agents each received their first recovered-context dispatch, and whether followup dispatches are correctly sequenced.

## Next Candidates

- Add per-child-Agent reliability scoring that combines first-dispatch marker health, candidate classification discipline, and receipt strictness.
- Correlate compact pressure, token reduction, recovery audit, first-dispatch latency, and candidate-use rate in one compact-boundary timeline.
- Add an explicit post-compact hook result ledger so pre/post compact hooks become first-class Memory Center diagnostics.
