# Phase 42: Compaction Hook Ledger

## Goal

Continue the long-term CCM memory upgrade toward Claude Code parity by making pre/post compact hooks first-class, durable, and auditable.

Before this phase, hooks could affect the compacted memory, but their execution evidence lived mainly inside `compaction.hookResults`. The group main Agent and Memory Center needed a stable sidecar ledger so hook output, failures, timing, and phase coverage remain inspectable after future memory updates.

## Implemented

- Added `GROUP_COMPACTION_HOOK_LEDGER_VERSION`.
- Added sidecar ledger files under `group-memory-compaction-hooks/<groupId>.json`.
- Added exported hook ledger APIs:
  - `getGroupMemoryCompactionHookLedgerFile()`
  - `readGroupMemoryCompactionHookLedger()`
- Wrapped pre/post hook execution with:
  - `hook_run_id`
  - phase
  - hook index
  - success/failure status
  - duration in milliseconds
  - compacted result summary
  - boundary/checksum evidence
- Added explicit no-hook phase entries so CCM can distinguish "no hooks registered" from "ledger missing".
- Stored the latest hook ledger summary back into `memory.compaction.hookLedger`.
- Added Memory Center hook diagnostics under `postCompactUsage.compactionHooks`.
- Added `buildCompactionHookLedgerReport()` for multi-group aggregation.
- Added `evaluateCompactionHookLedger()` as a Memory Center quality check.
- Added overview-level `compactionHookLedgerReport` and alerts for missing phases or failed hooks.
- Added Memory Center UI panel named `压缩 Hook Ledger`.
- Added selftests:
  - `runGroupMemoryCompactionHookSelfTest()`
  - `runMemoryCenterCompactionHookLedgerSelfTest()`

## Ledger Signals

Each hook ledger row records:

- `hook_run_id`
- `phase`: `pre` or `post`
- `hook_index`
- `ok` / `status`
- `duration_ms`
- `error`
- `result_summary`
- `boundary_id`
- `summarized_through_message_id`
- `summary_checksum`
- timestamp

Memory Center summarizes:

- pre hook count
- post hook count
- failed hook count
- average duration
- latest run id
- recent entries
- missing phase gaps

## Files

- `backend/modules/collaboration/group-memory-compaction.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `docs/group-memory-cc-parity/phase-42-compaction-hook-ledger/2026-07-07-cc-parity-memory-phase-42.md`

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

CCM can now prove what happened immediately before and after group memory compaction. The hook lifecycle is no longer hidden inside transient runtime behavior: it is persisted, scored, visible in Memory Center, and connected to compact boundary diagnostics.

This makes future child-Agent memory injection safer because pre/post compact enrichment is now traceable when a third-party Agent starts a fresh session.

## Next Candidates

- Add automatic targeted rework for child Agents whose memory reliability remains weak after compaction.
- Extend compact-boundary timelines across multiple historical boundaries.
- Add per-boundary replay tests proving a child Agent can reconstruct files, commands, constraints, acceptance criteria, and hook-injected requirements from context alone.
- Add hook-ledger retention policy and archive compaction so very long-running groups keep recent hook evidence without unbounded ledger growth.
