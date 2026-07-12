# Phase 195: Conflict Resolution Checksum-Addressed Cold Archive

Date: 2026-07-12

## Goal

Keep immutable conflict-resolution history indefinitely without allowing the hot typed-memory distillation ledger or child-Agent context to grow without bound.

Older branches must remain group-isolated, checksum-verifiable, lazily searchable, recoverable for audit and unable to grant current authority.

## Implemented

### Bounded hot index

`postCompactCompletionMemoryPreservationClosureConflictResolutionArchive.rows` is now a bounded hot index.

Default limit:

`GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT=160`

The MEMORY.md renderer remains bounded to the latest 100 rows. `archived_count` and `immutable_branch_count` describe the complete cold archive rather than only the hot rows.

### Checksum-addressed cold shards

Every immutable row is stored under the group-local directory:

`.archive/post-compact-completion-memory-preservation-closure-conflict-resolutions/shards/<bucket>/<content-checksum>.json`

Rows are assigned to 16 stable SHA-256 prefix buckets. Each shard records:

- exact `group_id`;
- bucket;
- content checksum;
- row count;
- normalized immutable rows.

The checksum is part of the filename. Existing content-addressed files are never overwritten unless their stored content still matches the expected checksum.

### Manifest and root integrity

The group-local `manifest.json` records:

- total immutable row count;
- hot row count;
- shard count;
- full rows checksum;
- shard paths and content checksums;
- row IDs, resolution entry IDs and task-family keys for lazy routing;
- root manifest checksum.

Full verification checks manifest schema/group/checksum, every shard schema/group/bucket/checksum/count, unique row IDs, total counts and the complete rows checksum.

### Lazy audit lookup

Added:

`lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive`

It routes by row ID, resolution entry ID or task-family key using manifest metadata and reads only matching shards. A typical exact lookup reads one shard rather than loading the complete archive.

Memory Center resolution and repair-retention reports now fall back to lazy cold lookup when an entry is no longer in the hot index.

### Audit-only restoration

Added:

`restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows`

It restores verified rows into the bounded hot index and records:

`cold_restore_mode=audit_only_not_current_authority`

Restoration cannot bypass current-source reverification, memory usage receipts or fresh child-session authority.

### Tamper blocking

Shard checksum mismatch, manifest checksum mismatch, group mismatch, path escape, count mismatch or complete rows checksum mismatch makes verification fail.

A tampered archive:

- cannot satisfy lazy lookup;
- cannot be restored;
- cannot be used as the source for another distillation write.

This prevents modified historical data from being rewritten as valid memory.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_cold_archive_integrity`

It checks hot-index bounds, manifest linkage, row/shard counts and full cold-archive verification for each group.

## Verification

### Phase 195 self-test

`runMemoryCenterConflictResolutionColdArchiveSelfTest`

Result: 13/13 passed.

Tested:

- 400 rows become a 40-row hot index and complete cold archive;
- 401 rows remain present after a later append;
- 16 stable content-addressed shards;
- oldest cold entry found by reading one shard;
- task-family lazy lookup;
- audit-only bounded restore;
- shard tamper detection;
- manifest tamper detection;
- tampered archive blocks restoration and redistillation;
- restoring the original shard restores full verification;
- two groups remain isolated;
- integrity quality gate passes for both groups;
- Memory Center creates no real child-Agent task.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 28/28 passed.

Coverage includes Phases 176-195, resolution hot/cold audit fallback, repair and outcome retention, compact outcome ledger, memory-first compact, replay and metadata partial compact, PTL, ignore memory and runtime usage.

## Invariants

- Every shard and manifest is group-local.
- Manifest paths cannot escape the group cold-archive directory.
- Cold rows remain immutable and reversible historical evidence.
- Hot restoration is audit-only and never current authorization.
- A checksum failure blocks lookup, restore and redistillation.
- Child-Agent context remains bounded even while the immutable archive grows.
- Historical majority cannot authorize a current conflict decision.
- Every new child-Agent session still requires fresh memory usage declarations and current-source verification.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 196 should add crash-safe manifest generations and conservative orphan-shard mark/sweep. Unreferenced content-addressed shards must first enter a quarantine manifest with a grace period and may be deleted only after the current and previous manifests both verify, no open repair references them, and a recovery simulation proves no immutable row would be lost.
