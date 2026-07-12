# Phase 194: Repair, Outcome and Resolution Retention Safety

Date: 2026-07-12

## Goal

Make long-running memory repair ledgers compactable without deleting open repairs, strict corrected-outcome proofs, unresolved compact failures, immutable conflict-resolution branches or group boundaries.

## Implemented

### Replay repair work-item retention

Replaced the destructive `items.slice(-160)` write path with a typed retention policy:

`protect_all_open_latest_verified_proofs_resolution_branches_and_recent_terminal`

It preserves:

- every pending, in-progress or blocked repair;
- the latest strict corrected-retry proof per repair identity;
- the latest work-item identity for every conflict-resolution entry;
- the newest 160 terminal records for diagnosis.

Older superseded terminal diagnostics may be compacted. The ledger records input, accepted, deduplicated, retained and dropped counts, dropped status totals, SHA-256-derived digests and cross-group rejection evidence.

Rows whose `group_id` or `scopeId` does not match the ledger group are rejected rather than persisted.

### Compact outcome retention

Replaced the destructive last-1000 outcome truncation with:

`recent_plus_unresolved_failures_latest_assignment_and_resolution`

It preserves:

- the newest 800 outcomes;
- every completion-memory preservation failure that lacks a later strict corrected outcome;
- the latest outcome for each assignment;
- the latest outcome for each conflict-resolution entry.

A failed outcome is considered superseded only when a later outcome has a different retry and outcome ID, matches the assignment/project, reports `required=true`, `preserved=true`, `gaps=[]`, and restores the exact completion and conflict-resolution summary.

Cross-group outcomes are rejected and audited.

### Immutable conflict-resolution archive

Removed the destructive last-160 truncation from:

`postCompactCompletionMemoryPreservationClosureConflictResolutionArchive`

All reversible historical branches remain in the typed distillation ledger. The rendered MEMORY.md document still shows only the latest 100 rows, so child-Agent context remains bounded.

Archive metadata now declares:

- `immutable_branch_count`;
- `retention_policy=retain_all_reversible_conflict_resolution_branches_render_latest_100`;
- `retention_pruned_count=0`.

### Quality gates

Registered:

- `replay_repair_ledger_retention_safety`;
- `worker_context_packet_compact_outcome_retention_safety`.

The repair check verifies that no open repair, strict proof or conflict-resolution identity was dropped and that matching typed archive rows remain immutable.

The outcome check verifies that no unresolved preservation failure was dropped and that retained entries remain group-isolated. Existing legacy ledgers without retention metadata remain readable and are reported as legacy until their next write/compaction migration.

## Verification

### Phase 194 pressure self-test

`runMemoryCenterReplayRepairLedgerRetentionSafetySelfTest`

Result: 13/13 passed.

Observed repair pressure:

- input: 224 rows;
- cross-group rejected: 1;
- retained: 163;
- superseded terminal diagnostics compacted: 60;
- dropped open repairs: 0;
- dropped strict proofs: 0;
- dropped conflict-resolution identities: 0.

Observed outcome pressure:

- input: 154 rows;
- cross-group rejected: 1;
- retained: 102;
- superseded diagnostics compacted: 51;
- protected unresolved failures: 1;
- dropped unresolved failures: 0.

Typed conflict archive pressure:

- 180 resolution branches written;
- all 180 retained, including the first and last branch;
- rendered MEMORY.md remains bounded to the latest 100 rows;
- a second group retains an independent archive.

Memory Center created no real child-Agent task.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 27/27 passed.

Coverage includes Phases 176-194, compact outcome ledger, memory-first compact, replay partial compact, metadata partial compact, PTL emergency downgrade, ignore-memory policy and runtime usage.

## Invariants

- Retention is always isolated by `groupId`.
- Open repairs cannot be removed by terminal diagnostic pressure.
- An unresolved failed compact outcome cannot be removed by recent successful noise.
- A corrected outcome must be newer, different and exact before it supersedes a failure.
- Conflict-resolution historical branches are immutable and reversible.
- MEMORY.md rendering may be bounded without deleting its authoritative archive.
- Historical sessions and outcomes remain evidence only, never current authorization.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 195 should move the unbounded immutable conflict-resolution rows into checksum-addressed cold archive shards with a manifest and lazy audit lookup. The hot typed-memory ledger should retain a bounded recent index while proving that every older branch still exists, has not been altered and can be restored on demand.
