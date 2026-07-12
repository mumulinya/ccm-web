# Phase 202: Delivery Ledger Recovery And Interrupted-Write Quarantine

Date: 2026-07-12

## Goal

Recover maintenance-notification delivery telemetry after a corrupted or interrupted current write, using only a fully checksummed same-group previous ledger, while preserving corrupt evidence, current notification freshness, group/audience isolation and the scheduler's no-task/no-approval/no-delete boundary.

## Implemented

### Current/previous generation verification

Added:

`verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations`

Each candidate verifies:

- v2 ledger schema;
- exact group ID;
- ledger checksum;
- every detailed delivery checksum and group ID;
- every compact summary checksum and group ID;
- current-to-previous checksum link.

The verifier reports:

- `ok` for a valid current/previous chain;
- `recoverable` only when current is invalid and previous is fully valid for the same group;
- `blocked` when no trusted same-group previous candidate exists;
- `empty` before telemetry initialization.

Historical generation number or a plausible filename is not enough to authorize recovery.

### Recovery with evidence preservation

Added:

`recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger`

Recovery defaults to dry-run. Applied recovery:

1. reads and checksums the invalid current bytes;
2. persists a checksum-addressed evidence wrapper under `delivery-telemetry-recovery-evidence`;
3. records the corrupt current in the delivery quarantine ledger;
4. uses the verified previous ledger as the previous generation input;
5. applies current retention/freshness rules;
6. writes a new current generation with a valid previous checksum link;
7. re-verifies the resulting chain.

It never copies the previous file directly over current as if no failure occurred. The recovered current is a new generation, and delivery evidence older than the latest notification observation remains stale.

### Interrupted-write and orphan quarantine

Added:

`reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans`

It detects group-local:

- interrupted current atomic-write temp files;
- interrupted previous atomic-write temp files;
- a valid but mismatched/orphan previous ledger.

Candidates are recorded in:

`maintenance-notification-delivery-quarantine.json`

The quarantine ledger is checksummed and bounded. Temp and orphan files are preserved as evidence; reconciliation does not delete or promote them.

### Recovery health

Added:

`inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth`

It verifies:

- current/previous generation health;
- quarantine checksum and group boundary;
- recovery evidence path containment;
- evidence source-content checksum;
- temp/orphan diagnostics;
- no-task/no-approval/no-delete output.

### Scheduler integration

The existing conflict-resolution scheduler now runs, per group:

1. archive maintenance and notification emission;
2. delivery-ledger recovery;
3. temp/orphan reconciliation;
4. delivery retention.

Automatic recovery is allowed because it restores advisory telemetry only. It cannot authorize archive repair or GC. Scheduler output exposes recovery, blocked-recovery and orphan-candidate counts.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_recovery`

It requires a valid current/previous same-group chain, valid quarantine evidence and zero task, approval or deletion capability.

## Verification

### Phase 202 recovery soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRecoverySelfTest`

Result: 10/10 passed.

Tested:

- invalid current plus valid same-group previous is recoverable;
- dry-run does not overwrite corrupt current;
- scheduler automatically recovers one group without authority escalation;
- recovery creates a new valid generation;
- current notification delivery freshness is preserved after rollback to previous evidence;
- corrupt current and two interrupted temp files enter quarantine evidence;
- a valid previous ledger copied from another group cannot recover;
- a same-group previous ledger with a tampered checksum cannot recover;
- orphan previous is diagnosed without deletion;
- tasks, approval receipts and cold shard files remain unchanged;
- recovery quality covers both groups.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 36/36 passed.

Coverage includes Phases 176-202, delivery current/previous recovery, interrupted-write quarantine, recurrence freshness, retention/compaction, real coordinator and Global Agent context paths, scheduler/controller safety, cold archive generations, historical compact replay, memory-first and partial compact, PTL, ignore-memory and provider-ranking memory usage.

## Invariants

- Recovery selects only a fully checksummed same-group previous ledger.
- Cross-group or checksum-invalid previous files fail closed.
- Corrupt current bytes are preserved before recovery.
- Applied recovery always creates and re-verifies a new current generation.
- Previous delivery evidence cannot satisfy a newer notification observation.
- Temp/orphan reconciliation preserves evidence and deletes nothing.
- Scheduler recovery restores telemetry only; it grants no archive or GC authority.
- Recovery creates no child-Agent task or approval receipt and deletes no shard.

## Next Audit

Phase 203 should add bounded aging for quarantine and recovery evidence, protect every unresolved or latest recovery proof, compact superseded terminal diagnostics, and require an explicit checksummed cleanup receipt before any telemetry evidence file can be removed.
