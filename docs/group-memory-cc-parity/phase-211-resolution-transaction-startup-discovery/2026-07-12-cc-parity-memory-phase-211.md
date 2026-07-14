# Phase 211: Resolution Transaction Startup Discovery

Date: 2026-07-12

## Goal

Discover cleanup-commit repair-resolution transactions directly from their WAL, recover only exact group-local links, contain every unproven or cross-linked transaction without rewriting it, create non-tasking repair artifacts, and retain an auditable compact root when terminal transaction detail is pruned.

## Implemented

### WAL-first discovery

Added:

`discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions`

and the multi-group runner:

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscovery`

Discovery enumerates `maintenance-notification-delivery-cleanup-commit-repair-resolution-transactions.json` directly. It does not depend on receipt, work-item or assignment traversal to know which transactions exist.

For every detailed transaction it validates:

- parent transaction-ledger checksum;
- transaction checksum, group and phase;
- immutable resolution-receipt identity and checksum;
- receipt-to-work-item/action/evidence bindings;
- quarantine evidence checksum;
- work-item before/applied state;
- exact brief, assignment and sibling-receipt target snapshots;
- phase-appropriate applied proof;
- terminal completion proof.

A transaction whose receipt row is missing remains discoverable from WAL and is contained rather than silently disappearing.

### Exact recovery preflight

The reconciler now runs the complete link-gap preflight before it increments `recovery_count` or writes any transaction field.

Only a zero-gap transaction may enter recovery. Cross-group, missing-receipt, checksum-invalid or target-diverged transactions remain byte-stable in the original WAL.

### Invalid transaction containment

Added group-local ledgers:

- `maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-quarantine.json`;
- `maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-work-items.json`;
- `maintenance-notification-delivery-cleanup-commit-repair-resolution-transaction-dispatch-briefs.json`.

Each deterministic containment chain records:

- observed transaction, group, work-item and receipt identities;
- exact validation gaps;
- observed transaction checksum;
- required transaction/receipt/evidence/target proof;
- checksummed evidence, work item and brief;
- `should_create_real_task=false`.

Repeated discovery updates the existing deterministic artifacts. It does not create real tasks, approvals or duplicate repair rows.

When a previously invalid transaction becomes valid, containment artifacts close without deleting their audit history.

### Original WAL preservation

Containment never changes:

- original transaction identity;
- transaction checksum;
- recovery count;
- transaction phase;
- receipt or evidence files.

The original transaction remains the authoritative observed state until an explicit repair path can re-prove it.

### Terminal compact root

The resolution-transaction ledger now bounds detailed terminal history while preserving:

- cumulative compacted count;
- transaction-ID root;
- transaction-checksum root;
- first and last completion times;
- compact generation and checksum.

The compact checksum participates in the parent transaction-ledger checksum. Open transactions are never compacted.

Production retains the latest 160 terminal transactions. Tests may set a lower bounded limit.

### Evidence freeze across maintenance cycles

Original cleanup-commit discovery now preserves evidence, work items and briefs bound by every retained detailed resolution transaction, including terminal transactions.

This prevents a later `last_seen_at` refresh from changing the evidence checksum used by a completed transaction. Compacted transactions remain represented by the cumulative compact roots.

### Scheduler integration

The scheduler's repair-resolution runner now performs:

1. WAL-first discovery;
2. exact automatic recovery;
3. invalid transaction containment.

Contained invalid transactions do not cause endless scheduler failure/backoff. The scheduler fails only when an invalid transaction is uncontained, a recoverable transaction remains open, artifact integrity fails or discovery reports blocked.

Telemetry includes:

- transaction and compacted counts;
- recovered-now count;
- invalid and contained-invalid counts;
- open/recoverable counts.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_resolution_transaction_startup_discovery`

It accepts either:

- healthy detailed/compacted transaction history; or
- invalid detailed transactions fully contained by checksummed, non-tasking quarantine/work-item/brief artifacts.

It requires:

- zero recoverable transactions left open;
- every invalid transaction fully contained;
- valid artifact ledgers;
- valid compact roots;
- zero task, approval or deletion authority.

## Verification

### Phase 211 startup discovery self-test

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionStartupDiscoverySelfTest`

Result: 12/12 passed.

Covered:

- seven successful resolutions with terminal detail limited to four;
- three compacted transactions with valid ID/checksum roots;
- terminal detailed evidence remaining frozen across later discovery;
- exact prepared transaction recovery;
- receipt-row orphan discovery directly from WAL;
- cross-group transaction containment;
- transaction-checksum tamper containment;
- three invalid transactions fully represented by non-tasking artifacts;
- byte-stable invalid WAL rows before and after containment;
- idempotent repeated discovery;
- two-group startup aggregation;
- scheduler acceptance of fully contained invalid state;
- quality acceptance of healthy/contained state;
- quality rejection after compact-root tampering;
- unchanged task and approval counts and zero deletion authority.

Observed compact state:

- retained terminal transactions: 4;
- compacted transactions: 3;
- compact root valid: true.

Observed invalid state:

- exact transactions recovered: 1;
- invalid transactions: 3;
- contained invalid transactions: 3;
- repair work items: 3;
- dispatch briefs: 3.

### Compatibility

Phase 209 lifecycle, Phase 210 crash recovery and Phase 211 discovery tests pass together.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 45/45 passed.

Coverage includes Phases 176-211, runtime-kernel context usage, historical replay, PTL, ignore-memory, cleanup receipts/journals/leases/CAS, finalization WAL, cleanup startup discovery, repair lifecycle, resolution transactions and resolution-transaction containment.

## Invariants

- Transaction enumeration starts from WAL, not dependent ledgers.
- Recovery writes nothing before complete link-gap preflight passes.
- Unproven transactions remain byte-stable.
- Every invalid transaction maps to deterministic, checksummed containment artifacts.
- Containment creates no real task or approval.
- Open transactions are never compacted.
- Pruned terminal history remains represented by two cumulative roots and a checksum.
- Detailed terminal transaction evidence remains frozen across background discovery.
- Scheduler containment grants no repair or deletion authority.
- Every artifact and recovery action remains group-local.

## Next Audit

Phase 212 should add an explicit lifecycle for resolution-transaction containment work items, inject ready briefs into the group main Agent and read-only Global Agent context, and expose a selected brief to a project child Agent only through exact assignment binding. Resolution/cancellation should require a separate expiring, single-use operator receipt. A later phase should make reopen and assignment creation crash-recoverable across their own multi-ledger writes.
