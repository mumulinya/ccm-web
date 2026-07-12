# Phase 196: Cold Archive Manifest Generations And Conservative GC

Date: 2026-07-12

## Goal

Make the Phase 195 conflict-resolution cold archive resilient to interrupted manifest updates and long-term accumulation of unreferenced content-addressed shards.

Garbage collection must never delete a shard during first discovery, while an open repair references its resolution, when current or previous manifests are invalid, when quarantine metadata is tampered, or when recovery simulation cannot prove every row remains available.

## Implemented

### Crash-safe manifest generations

Every cold-archive write now follows this order:

1. Verify the current manifest and all current shards.
2. Persist the current manifest as an immutable checksum-addressed generation if needed.
3. Write all new content-addressed shards.
4. Write the new immutable generation file.
5. Atomically replace the current `manifest.json` pointer.

Generation-bound manifest checksums now include:

- generation number and ID;
- previous manifest checksum;
- previous manifest relative path;
- row and shard checksums.

Legacy manifests without generation fields retain their legacy checksum calculation and migrate on the next verified write.

### Current and previous generation verification

Added:

`verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations`

It verifies:

- the current pointer and all current shards;
- the immutable copy of the current generation;
- the exact previous-generation path and checksum link;
- the previous manifest and all previous shards;
- strictly increasing generation numbers;
- that every previous row ID is recoverable from the current generation.

### Manifest recovery

Added:

`recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration`

When the current pointer is missing or corrupted, it scans immutable generation files, fully verifies their shards and atomically restores the newest valid generation. An invalid generation is never selected merely because it has a larger number.

### Orphan shard quarantine

Added:

`reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards`

An orphan is a shard referenced by neither the current nor previous manifest. First discovery only creates a checksum-protected quarantine entry.

Each quarantine row records:

- shard path and content checksum;
- row count and row-ID checksum;
- resolution entry IDs;
- first/last seen timestamps;
- grace eligibility time;
- shard integrity and recovery coverage;
- open-repair reference state;
- final status and deletion timestamp.

### Deletion gates

Deletion requires all of the following:

- the shard was present in a previous quarantine generation;
- the configured grace period elapsed;
- deletion was explicitly requested;
- current manifest, current generation copy and previous generation all verify;
- previous-generation rows are recoverable from current;
- the orphan shard independently verifies against its content-addressed filename;
- every orphan row ID exists in the current archive;
- no open repair references any resolution entry in the shard;
- quarantine schema, group and checksum are valid.

Failure of any gate leaves the file in place.

### Quarantine tamper protection

The quarantine manifest has its own checksum. Modifying `first_seen_at`, eligibility, paths or statuses without recomputing a valid manifest blocks cleanup with:

`blocked_quarantine_integrity`

An invalid quarantine is not silently overwritten.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_manifest_generation_gc_safety`

It audits generation linkage, immutable current-generation copies, recovery simulation, quarantine integrity, blocked invalid shards and the safety evidence for every deleted shard.

## Verification

### Phase 196 self-test

`runMemoryCenterConflictResolutionManifestGenerationGcSelfTest`

Result: 14/14 passed.

Tested:

- three linked manifest generations;
- exact current/previous checksums;
- immutable current-generation copy;
- open repair prevents orphan deletion;
- repair closure allows deletion only on a later pass;
- deleting an orphan retains every current row;
- first discovery never deletes in the same run;
- corrupted current pointer blocks GC;
- newest valid generation recovers the current pointer;
- corrupted previous generation blocks GC;
- restoring previous generation restores the chain;
- tampered quarantine cannot bypass grace;
- two groups remain isolated;
- generation/GC quality gate passes;
- Memory Center creates no real child-Agent task.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 29/29 passed.

Coverage includes Phases 176-196, cold archive lookup/restore/tamper blocking, repair and outcome retention, compact outcome ledger, memory-first compact, replay and metadata partial compact, PTL, ignore memory and runtime usage.

## Invariants

- The current manifest pointer is replaced only after shards and immutable generation are durable.
- Current and previous generations must both verify before deletion.
- First discovery never deletes an orphan shard.
- Open repairs protect every referenced resolution entry.
- Quarantine timestamps cannot be trusted without a valid checksum.
- Recovery selects only fully verified generations.
- GC is group-local and cannot inspect or remove another group's shards.
- Deleted shards must be redundant by current-row recovery simulation.
- Historical resolution remains evidence only, never current authorization.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 197 should add a maintenance controller that schedules verification and quarantine dry-runs, persists explicit approval/decision receipts for destructive GC, exposes recovery recommendations to the group main Agent and Global Agent, and never enables deletion solely from a background timer.
