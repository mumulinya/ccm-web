# Phase 205: Cleanup Journal Execution Leases And Fencing

Date: 2026-07-12

## Goal

Prevent two explicit executors, a scheduler reconciliation, or a restarted process from concurrently mutating the same delivery-evidence cleanup journal. Preserve Phase 204 intent-before-delete recovery while guaranteeing one active owner, monotonic fencing and single receipt consumption per group-local cleanup execution.

## Implemented

### Atomic per-receipt execution lease

Each cleanup receipt now has an independent lease file under:

`maintenance-notification-delivery-cleanup-leases`

Lease acquisition uses an exclusive `wx+` file create. The winning process keeps the file descriptor open for the execution lifetime. A competing executor receives:

`cleanup_execution_lease_busy`

without creating a second journal, adding delete intents, deleting a file or consuming the receipt.

Each checksummed lease binds:

- exact group, receipt and execution IDs;
- owner instance, PID, hostname and role;
- lease ID and monotonically increasing fencing token;
- acquisition, renewal and expiry times;
- recovery count and terminal release status.

### Lease renewal

The executor renews its lease before candidate work and before finalization. Renewal extends from elapsed execution time while preserving the same lease ID and fencing token.

Every destructive step verifies that the lease file still identifies the current owner. A lost owner returns:

`cleanup_execution_lease_lost`

and cannot continue journal or receipt mutation.

### Journal fencing

Phase 205 journals record:

- lease contract version;
- lease owner and lease ID;
- fencing token and recovery count;
- lease acquisition, expiry, status and release time.

These fields are covered by the journal checksum. Every journal upsert checks the live lease and rejects an older fencing token.

Existing Phase 204 journals remain valid: lease fields enter the checksum only after `lease_contract_version` is present. A valid old in-progress journal is upgraded when a fenced executor resumes it.

### Abandoned executor recovery

An active lease becomes recoverable when:

- its TTL expires; or
- its owner is on the current host and the owner PID no longer exists.

The abandoned lease is atomically renamed before a replacement is created. The replacement increments the fencing token and recovery count, then resumes only the exact candidates already authorized by the Phase 204 journal.

Recovery does not repeat already persisted `deleted` candidates. A `delete_intent` whose file disappeared is reconciled under the existing intent-before-delete rule.

### Scheduler boundary

Scheduler reconciliation now participates in the same lease protocol before changing journal, quarantine or receipt metadata.

When an explicit executor owns the lease, the scheduler reports the journal as leased and performs no mutation. It still has zero file-deletion authority.

If a process dies after receipt/journal finalization but before releasing the lease file, scheduler reconciliation releases only that abandoned terminal lease metadata. It does not replay finalization or delete any file.

Scheduler and cleanup inspection now expose:

- leased journal count;
- abandoned journal count;
- recovered executor count;
- lease ID, fencing token and recovery count per journal.

The scheduler continues to report `deliveryCleanupDeletedCount=0`.

### Receipt single-consumption fence

A successfully consumed receipt stores the execution fencing token. The final journal token and receipt token must match. Replay remains blocked by the existing single-use receipt check.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_journal_lease`

It verifies:

- journal and lease validity;
- no abandoned or blocked journal remains;
- every consumed journal-backed receipt has the same fencing token as its journal;
- scheduler cleanup authority and scheduler deletion count remain zero.

## Verification

### Phase 205 lease soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLeaseSelfTest`

Result: 11/11 passed.

Tested:

- two nested simultaneous explicit attempts select one winner;
- the loser observes the winner lease and deletes nothing;
- scheduler observes an active journal lease without mutating or deleting;
- a receipt cannot execute in another group;
- an interrupted executor remains exclusive before expiry;
- an expired executor is recovered with a higher fencing token;
- a real child process exits with an unexpired lease and the parent recovers it immediately from the dead PID;
- a child process that exits after finalization leaves a terminal lease which the scheduler reconciles without replay or deletion;
- takeover deletes only remaining candidates and does not repeat an already deleted target;
- the receipt is consumed once and the journal is not overwritten or duplicated;
- tasks, GC approvals and cold shards remain unchanged.

### Phase 204 compatibility

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalSelfTest`

Result: 10/10 passed after lease integration.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 39/39 passed.

Coverage includes Phases 176-205, concurrent cleanup exclusion, dead-process recovery, receipt fencing, delivery cleanup/recovery/retention, scheduler safety, cold archive generations, post-compact reinjection and preservation, historical compact replay, memory-first and partial compact, PTL, ignore-memory, provider-ranking memory usage and runtime-kernel behavior.

## Invariants

- One group-local receipt has at most one active cleanup executor.
- A journal mutation requires the matching live lease and current fencing token.
- Fencing tokens only increase across lease replacement.
- Scheduler reconciliation cannot bypass an explicit executor lease.
- Scheduler never deletes cleanup evidence.
- A restarted process resumes only the original checksummed candidate set.
- Already deleted candidates are never deleted again.
- A receipt is consumed once and stores the winning fencing token.
- Latest recovery proof and cross-group evidence remain protected.
- Phase 204 journals remain readable and resumable after the upgrade.

## Next Audit

Phase 206 should protect the shared per-group receipt and journal ledgers when different receipts execute concurrently. Add ledger revisions or compare-and-swap writes so two valid per-journal lease holders cannot lose each other's updates, and compact bounded abandoned/released lease history without granting the scheduler telemetry-evidence deletion authority.
