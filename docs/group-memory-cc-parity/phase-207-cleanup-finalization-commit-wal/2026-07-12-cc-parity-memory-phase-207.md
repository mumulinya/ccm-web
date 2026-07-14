# Phase 207: Cleanup Finalization Commit WAL

Date: 2026-07-12

## Goal

Make the Phase 206 quarantine, receipt and journal finalization sequence explicitly recoverable at every file boundary. Replace inference-only recovery with a checksummed write-ahead transaction that binds before/after revisions, while keeping scheduler recovery non-destructive and group-local.

## Implemented

### Cleanup commit WAL

Added:

`maintenance-notification-delivery-cleanup-commits.json`

Each transaction binds:

- exact group, receipt and execution IDs;
- receipt checksum and candidate-ID root;
- initial and latest execution fencing tokens;
- recovery count;
- before revisions/checksums for quarantine, receipt and journal ledgers;
- after revision/checksum evidence for each committed file;
- started, updated and completed times;
- transaction checksum.

The commit ledger has its own revision, previous-ledger checksum and ledger checksum. Open transactions remain retained; terminal transactions are bounded to the latest 160.

### Durable phase protocol

Finalization now advances:

`prepared -> quarantine_committed -> receipt_committed -> journal_committed -> completed`

Rules:

1. `prepared` is durable before any finalization ledger changes.
2. Quarantine commit records its resulting revision and checksum.
3. Receipt consumption records its resulting ledger revision, checksum and final fencing token.
4. Journal completion records its resulting ledger revision, checksum and journal checksum.
5. Only then does the transaction become terminal `completed`.

Every phase update is checksummed and written while holding the Phase 206 group transaction lock.

### Crash recovery

Scheduler reconciliation acquires the exact receipt lease, resumes the existing transaction and advances only phases not already proven committed.

Recovery covers:

- crash after prepared WAL persistence;
- crash after quarantine write or quarantine phase persistence;
- crash after receipt consumption or receipt phase persistence;
- crash after journal completion but before WAL completion;
- crash after a data-file write but before its phase update.

If quarantine candidates are already absent while a prepared transaction's before checksum changed, recovery treats that as the transaction's interrupted quarantine commit, not as authorization for a new target set.

If a recovery executor completes an in-progress journal, receipt and journal fencing tokens are updated consistently. If the journal was already completed, recovery preserves the original execution fence and closes only the WAL.

Scheduler recovery deletes zero evidence files.

### Transaction inspection

Cleanup inspection and scheduler telemetry now expose:

- commit-ledger revision and checksum validity;
- total, open, invalid and recovered transaction counts;
- transaction phase, status, fencing and recovery count;
- revision-binding validity for every completed transaction.

A completed transaction is valid only when quarantine, receipt and journal after-revisions are greater than their bound before-revisions and every after-checksum is present.

### Group lock contention backoff

The Phase 206 group lock now retries active-lock contention with a bounded exponential wait budget. Exhaustion returns:

`cleanup_group_ledger_lock_busy`

as a retryable failure instead of spinning indefinitely or writing concurrently.

### Bounded metadata history

Abandoned metadata history is bounded independently of telemetry evidence:

- group ledger lock archives: latest 32;
- per-receipt execution lease archives: latest 16.

Pruning touches lock/lease metadata only. It does not delete delivery evidence, quarantine targets, cold shards, tasks or approvals.

### Scheduler integrity gate

The scheduler now fails closed when:

- the commit-ledger checksum is invalid;
- any transaction checksum, group binding, phase or revision binding is invalid;
- shared journal CAS integrity fails.

Scheduler output includes open, invalid and recovered commit transaction counts. `deliveryCleanupDeletedCount` remains zero.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_wal`

It verifies:

- positive, valid commit-ledger revision/checksum;
- zero open or invalid transactions;
- every transaction is completed;
- every completed transaction has valid before/after revision bindings;
- no abandoned group lock remains;
- scheduler deletion authority remains false.

## Verification

### Phase 207 WAL crash matrix

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitWalSelfTest`

Result: 13/13 passed.

Tested:

- real child-process crash after `prepared`;
- real child-process crash after `quarantine_committed`;
- real child-process crash after `receipt_committed`;
- real child-process crash after `journal_committed`;
- scheduler recovery closes all four transactions;
- every recovered transaction records a higher latest fence and recovery count;
- no recovery repeats evidence deletion;
- transaction checksum tampering is detected;
- group-lock contention waits within a bounded window and returns busy;
- 40 synthetic abandoned group-lock records compact to 32;
- 24 synthetic abandoned receipt-lease records compact to 16;
- scheduler reports zero open/invalid transactions and zero deletions;
- another group's evidence, tasks, approvals and cold shards remain unchanged.

Observed final self-test state:

- commit-ledger revision: 29;
- transactions: 5;
- open: 0;
- invalid: 0;
- recovered: 4.

### Compatibility

Phase 203 cleanup, Phase 204 crash journal, Phase 205 execution leases and Phase 206 shared-ledger CAS self-tests pass after WAL integration.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 41/41 passed.

Coverage includes Phases 176-207, every finalization commit phase, WAL tamper detection, bounded lock contention, shared-ledger CAS, candidate claims, execution leases, dead-process recovery, scheduler safety, delivery recovery/retention, cold archives, post-compact reinjection and preservation, historical replay, memory-first and partial compact, PTL, ignore-memory, provider-ranking usage and runtime-kernel behavior.

## Invariants

- WAL prepare is durable before quarantine, receipt or journal finalization.
- A transaction never changes group, receipt, execution or candidate root during recovery.
- Every phase is monotonic.
- Every completed phase binds an after revision and checksum.
- Scheduler resumes existing authorization only and deletes no evidence.
- Recovery fencing remains consistent between receipt and journal.
- Terminal-journal recovery closes WAL without replaying finalization.
- Group-lock wait is bounded and retryable.
- Lock/lease history pruning never touches telemetry evidence.
- Cross-group ledgers and evidence never enter the transaction.

## Next Audit

Phase 208 should add startup-wide orphan transaction discovery independent of known journal rows, quarantine invalid or cross-linked WAL records, and produce a repair work item/dispatch brief when automatic recovery cannot prove exact receipt, journal and candidate bindings. It should also add a durable commit-history compact root so terminal WAL pruning remains externally auditable.
