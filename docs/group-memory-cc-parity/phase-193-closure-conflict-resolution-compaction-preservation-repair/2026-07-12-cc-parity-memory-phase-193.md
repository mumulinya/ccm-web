# Phase 193: Closure Conflict Resolution Compaction Preservation Repair

Date: 2026-07-12

## Goal

Route failed conflict-resolution compact preservation into the existing group main-Agent repair chain.

The repair must be group-isolated, idempotent and no-real-task. It may close only after a newer and different compact retry/outcome restores the exact resolution identity, state, resolving-session evidence, reversible history and acceptance requirements.

## Implemented

### Strict resolution-aware repair detection

Completion preservation comparison now also covers:

- conflict-resolution MEMORY.md paths;
- resolution entry ID, state and usage state;
- active versus reopened state;
- resolving task-Agent and native session IDs;
- reversible and historical-branches-preserved flags;
- active-resolution reverification and reversible acceptance;
- reopened-conflict current-session verification acceptance.

An outcome that reports `preserved=true` but loses any required resolution field is still treated as a preservation failure.

### Idempotent main-Agent work items

Repair work-item identity includes the resolution document, entry, state, resolving sessions and active/reopened state. Repeated scans therefore retain one stable work item for the same failed compact boundary while distinct resolution identities cannot collapse into one repair.

The work item persists all `completion_preservation_conflict_resolution_*` fields and remains owned by the group main Agent.

### Candidate and no-real-task brief propagation

The generic repair candidate normalizer and group-orchestrator brief builder now preserve all resolution fields.

Candidate and brief validators require exact scalar, list and boolean metadata. The brief explicitly requires:

- a newer, different retry/outcome;
- exact conflict-resolution restoration;
- historical resolving sessions to remain evidence only;
- current-source reverification for each new child-Agent session;
- Memory Center not to create a real child-Agent task.

### Strict corrected-outcome closure

Closure rejects:

- an older outcome;
- reuse of the failed retry ID;
- reuse of the failed outcome ID;
- an outcome from another group;
- a nominally preserved outcome with changed or missing resolution identity;
- loss of reversible branch history or state-specific acceptance requirements.

The corrected retry proof records exact resolution restoration and reversible-boundary restoration. Active and reopened resolution states are both supported.

## Why Distillation Exists

Raw group chat is the immutable audit source, but it grows without bound and cannot be injected into every new Claude Code, Cursor or Codex session.

Distillation produces a bounded, typed and searchable memory view containing decisions, evidence, conflicts, applicability and freshness metadata. It does not delete the raw transcript or turn history into current authority. Every recalled memory remains scoped by `groupId`, and every new child-Agent session must declare `memoryUsed` or `memoryIgnored` and reverify current sources when required.

## Verification

### Phase 193 self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionRepairSelfTest`

Result: 10/10 passed.

Covered:

- one idempotent work item per failed group compact;
- exact main-Agent candidates;
- self-contained no-real-task briefs;
- stale, same-retry, same-outcome and cross-group rejection;
- one group closure cannot close another group;
- active resolution strict closure;
- reopened resolution strict closure;
- immutable conflict-resolution archive preservation;
- Memory Center creates no real task.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 25/25 passed.

Coverage includes Phases 176-193, memory-first compact, replay partial compact, metadata partial compact, PTL emergency downgrade, ignore-memory policy, completion-memory preservation and runtime usage.

The memory-first self-test budget was recalibrated from 2600 to 3800 tokens because the current minimum valid packet carries more mandatory memory contracts. The scenario still proves pre-compact over-budget and post-compact recovery; production budget behavior was not changed.

## Invariants

- All memory and repair state is isolated by `groupId`.
- Provider history remains ranking evidence, never authorization.
- Historical repair and resolving sessions remain recovery evidence only.
- Every new child-Agent session must make a fresh memory usage declaration.
- Used or verified memory requires `currentSourceVerified=true`; ignored memory requires a reason.
- Conflict history cannot authorize a current decision by majority.
- Conflict resolution remains reversible and preserves both historical branches.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 194 should add retention and garbage-collection safety for long-running repair and resolution ledgers: compact superseded diagnostic noise without deleting immutable resolution branches, current open repairs, latest verified closure proofs or per-group audit boundaries.
