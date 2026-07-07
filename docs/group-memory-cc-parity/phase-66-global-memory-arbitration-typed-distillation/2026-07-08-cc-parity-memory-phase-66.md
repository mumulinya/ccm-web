# Phase 66 - Global Memory Arbitration Typed Distillation

## Objective

Continue CCM memory toward Claude Code parity by turning repeated Global Agent versus group memory arbitration conflicts into durable typed MEMORY.md.

Phase 65 made arbitration persistent in a group-scoped ledger. Phase 66 makes the next step automatic: when the same stale Global Agent memory conflicts with the same newer group evidence repeatedly, CCM writes a typed memory document so future project child Agents can recall the group-local rule directly.

## Behavior

Repeated arbitration conflicts now trigger `distillGroupGlobalMemoryArbitrationToTypedMemory`.

Default behavior:

- threshold is `occurrenceCount >= 2`
- one-off conflicts remain ledger-only
- repeated conflicts write `global-memory-arbitration-decisions.md`
- the generated document is typed memory type `project`
- the document includes stale global memory, current group rule, decisive evidence, and application rule
- file/path terms are added to typed memory `paths` for future targeted recall
- the arbitration ledger is updated with:
  - `distilledAt`
  - `distillationStatus`
  - `typedMemoryDoc`
  - `typedMemorySlug`
  - `typedMemoryType`

The child Agent context bundle now uses the post-distillation ledger summary, so Memory Center and rendered child context see the final state instead of the pre-distillation snapshot.

## Child Context

`buildAgentMemoryContextBundle` now exposes:

- `group_state.typedMemory.arbitrationDistillation`
- refreshed typed memory sync/index data when a distillation document is written
- refreshed typed memory load plan and recall after arbitration distillation
- a rendered `全局记忆仲裁蒸馏` line that points to the typed MEMORY.md result

This means repeated global/group conflicts become immediately visible as typed memory context for the same bundle generation path, and are also available to later third-party child Agent sessions.

## Memory Center

The global memory arbitration report now includes:

- `arbitrationDistilledConflictCount`
- `arbitrationPendingDistillationCount`
- `arbitrationTypedMemoryDocs`

Added targeted quality check:

- `global_memory_arbitration_distillation`

It verifies that repeated arbitration conflicts are fully distilled into typed MEMORY.md and no repeated conflict remains pending.

## Verification

Passed on 2026-07-08:

- `npm run build:backend`
- `npm run check`
- `npm run test:chat-experience`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- targeted `buildMemoryQualityReport({ checkIds: ["global_memory_arbitration_distillation"], cacheMaxAgeMs: 0 })`
- targeted `buildMemoryQualityReport({ checkIds: ["global_memory_arbitration_ledger", "global_memory_arbitration_distillation"], cacheMaxAgeMs: 0 })`

The arbitration context self-test verified:

- stale global rule is recalled
- newer group evidence demotes/conflicts with it
- repeated conflict reaches `occurrenceCount: 2`
- `global-memory-arbitration-decisions.md` is written
- generated typed memory contains the sentinel/current group rule
- rendered child context mentions arbitration distillation
- ledger reports `distilledConflictCount: 1` and `pendingDistillationCount: 0`

## Current Status

This phase moves CCM memory closer to Claude Code behavior: repeated contradictions are no longer just detected or logged, they become durable typed memory that future child Agents can load as current project/group context.

The long-term Claude Code parity goal remains active.

## Next Upgrade Direction

- Add cross-group duplicate suppression for stale Global Agent memory items.
- Add a Memory Center UI table for arbitration ledger entries and typed distillation results.
- Add semantic contradiction scoring beyond keyword/newer-message heuristics.
- Add a background maintenance pass that periodically re-distills pending arbitration ledger candidates across all groups.
