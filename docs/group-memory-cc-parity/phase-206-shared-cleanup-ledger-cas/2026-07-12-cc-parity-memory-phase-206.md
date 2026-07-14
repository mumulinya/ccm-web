# Phase 206: Shared Cleanup Ledger CAS And Candidate Claims

Date: 2026-07-12

## Goal

Prevent two different, valid cleanup receipts in the same group from losing each other's receipt, journal or quarantine updates while preserving Phase 205 per-receipt execution concurrency. Reject overlapping cleanup authorization before either executor can duplicate a target deletion.

## Implemented

### Group-local short transaction lock

Added a group-local lock file:

`maintenance-notification-delivery-cleanup-ledger.lock`

The lock uses exclusive `wx+` creation and an open file descriptor for the duration of each shared-ledger critical section. It binds:

- exact group ID;
- owner instance, PID, hostname and role;
- acquisition and expiry times;
- checksummed lock identity.

The lock is intentionally short-lived. Per-receipt execution leases continue to own candidate work and deletion. Different receipts can therefore interleave, while each receipt, journal or quarantine commit serializes against the latest group state.

An invalid lock fails closed. A dead or expired lock can be atomically renamed and replaced. A normally released lock is removed.

### Revisioned receipt ledger

The cleanup receipt ledger now stores:

- monotonically increasing `revision`;
- `previous_ledger_checksum`;
- checksum over revision, previous checksum and every receipt terminal state;
- consumed/revoked state and execution fencing token in the ledger checksum.

Every mutation reads the latest ledger while holding the group lock and supplies its expected revision and checksum. A stale write fails with:

`cleanup_receipt_ledger_revision_conflict`

Checksum-invalid ledgers reject further commits.

### Revisioned journal ledger

The cleanup journal ledger now stores the same revision and previous-checksum chain. Its checksum covers every execution ID, receipt ID, journal checksum, status and fencing token.

Journal upsert now:

- holds the group transaction lock;
- re-reads the latest ledger;
- verifies the receipt execution lease;
- rejects stale fencing tokens;
- merges the current execution without dropping other receipt journals;
- advances revision and checksum using compare-and-swap expectations.

### Revisioned quarantine commits

Quarantine writes now include:

- `revision`;
- `previous_quarantine_checksum`;
- revision fields in the quarantine checksum.

Append, retention and final cleanup all use the group transaction lock and expected quarantine checksum. Concurrent cleanup finalization re-reads the latest quarantine before marking its own candidate IDs, so a second receipt cannot write an older quarantine snapshot over the first receipt's cleanup.

### Candidate claim exclusion

The first journal for a quarantine ID owns that cleanup claim. A different execution attempting to persist a journal containing the same quarantine ID receives:

`cleanup_candidate_claim_conflict`

The losing receipt remains unconsumed and can still be explicitly revoked. It never writes delete intent and never deletes the target.

Non-overlapping receipt journals can remain in progress together.

### Concurrent finalization

Explicit execution and scheduler metadata recovery now share one finalization transaction helper. While holding the group lock it:

1. re-reads and validates receipt, journal and quarantine ledgers;
2. verifies the current receipt lease and journal fencing token;
3. validates the exact candidate claim set;
4. commits quarantine cleanup against the latest revision;
5. consumes only the matching receipt;
6. completes only the matching journal.

The Phase 204 execution journal remains the recovery authority if the process stops between those file commits. Scheduler finalization still deletes zero evidence files.

### Inspection and scheduler telemetry

Cleanup inspection now exposes:

- receipt, journal and quarantine revisions;
- receipt and journal ledger checksum validity;
- quarantine checksum validity;
- candidate claim conflict count and details;
- group ledger lock presence, validity, active and abandoned state.

Scheduler telemetry includes journal revision, checksum validity, claim conflicts and invalid-ledger count. A checksum-invalid ledger, invalid group lock or claim conflict fails the scheduler integrity gate without granting deletion authority.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_ledger_cas`

It verifies:

- all three shared ledgers have positive revisions and valid checksums;
- receipt IDs and execution IDs are unique;
- no duplicate candidate claim exists;
- no abandoned or invalid group lock remains;
- scheduler cleanup deletion authority remains false.

## Verification

### Phase 206 CAS soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupLedgerCasSelfTest`

Result: 11/11 passed.

Tested:

- two different non-overlapping receipts hold independent execution leases and interleave;
- the nested receipt completes before the outer receipt resumes;
- both receipt consumptions remain in the final receipt ledger;
- both completed journals remain in the final journal ledger;
- both quarantine cleanups survive without stale-snapshot overwrite;
- receipt and journal revisions advance beyond the nested intermediate snapshots;
- two receipts targeting the same quarantine ID produce one journal claim and one blocked loser;
- the losing receipt remains revocable and unconsumed;
- receipt-ledger revision tampering invalidates the checksum and blocks another commit;
- another group's unresolved evidence remains untouched;
- tasks, GC approvals and cold shards remain unchanged.

### Compatibility

The Phase 203 cleanup, Phase 204 journal and Phase 205 lease self-tests all pass after CAS integration.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 40/40 passed.

Coverage includes Phases 176-206, shared-ledger interleaving, candidate claim exclusion, revision tamper detection, per-receipt leases, dead-process recovery, cleanup recovery/retention, scheduler safety, cold archive generations, post-compact reinjection and preservation, historical compact replay, memory-first and partial compact, PTL, ignore-memory, provider-ranking usage and runtime-kernel behavior.

## Invariants

- Per-receipt leases own deletion; the group lock owns only shared-ledger commits.
- Every shared cleanup-ledger mutation reads the latest revision under the group lock.
- Receipt, journal and quarantine revisions only increase.
- Stale expected revision or checksum cannot commit.
- A different execution cannot claim an already journaled quarantine ID.
- Non-overlapping receipt updates merge rather than overwrite.
- Receipt and journal IDs remain unique after concurrent execution.
- Scheduler detects CAS corruption and deletes zero evidence files.
- Cross-group state never participates in a group transaction.
- Legacy ledgers remain readable and receive revision/checksum metadata on their next mutation.

## Next Audit

Phase 207 should add a write-ahead commit record for the three-file quarantine/receipt/journal finalization sequence. Bind before/after revisions and checksums to one transaction ID, recover every crash point deterministically, add bounded retry/backoff for transient group-lock contention, and compact abandoned lock/lease history without deleting telemetry evidence.
