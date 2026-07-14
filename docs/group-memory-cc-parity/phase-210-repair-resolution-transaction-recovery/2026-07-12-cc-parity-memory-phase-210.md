# Phase 210: Repair Resolution Transaction Recovery

Date: 2026-07-12

## Goal

Make cleanup-commit repair resolution crash-recoverable across the work-item, dispatch-brief, assignment and resolution-receipt ledgers. A process interruption at any file boundary must leave a durable, checksummed transaction that startup/scheduler maintenance can resume without creating tasks, approvals or deletion authority.

## Implemented

### Resolution transaction WAL

Added:

`maintenance-notification-delivery-cleanup-commit-repair-resolution-transactions.json`

Each transaction binds:

- group, work-item and resolution-receipt IDs;
- immutable receipt checksum and quarantine evidence checksum;
- resolution action;
- before checksums for the target work item;
- exact brief, assignment and sibling-receipt target snapshots;
- per-phase resulting ledger checksums and target roots;
- recovery count and timestamps;
- transaction checksum.

The parent ledger has a monotonic revision, previous-ledger checksum and ledger checksum. Open transactions are retained independently of the latest 160 terminal transactions.

### Durable phase protocol

Resolution advances:

`prepared -> work_item_committed -> brief_committed -> assignment_committed -> receipt_committed -> completed`

Rules:

1. `prepared` is durable before any repair ledger mutation.
2. The work item becomes resolved/cancelled and records the exact receipt ID.
3. Every bound dispatch brief closes with the same receipt ID.
4. Every bound active child assignment closes with the same receipt ID.
5. The selected receipt is consumed and sibling approvals for the same work item are invalidated.
6. Only then does the transaction become terminal.

Each phase persists a target checksum/root. Transaction identity and phase are monotonic and cannot be changed during recovery.

### Write-before-phase recovery

Recovery recognizes both durable phase boundaries and a crash after a target file write but before the corresponding transaction phase update.

Covered write-before-phase states:

- work item written while WAL remains `prepared`;
- brief written while WAL remains `work_item_committed`;
- assignment written while WAL remains `brief_committed`;
- receipt written while WAL remains `assignment_committed`.

The recovery path accepts an already-applied file only when its action, receipt binding and target set exactly match the prepared transaction. Otherwise it fails closed as divergence.

### Group lock and mutation exclusion

Repair lifecycle, approval, assignment, resolution execution, recovery and discovery-artifact writes now use the existing group cleanup-ledger lock.

While a resolution transaction is open for a work item:

- claim/dispatch/reopen is rejected;
- a new resolution approval is rejected;
- a new project-child assignment is rejected;
- discovery cannot refresh the bound evidence, work item or brief.

This prevents another writer from changing transaction inputs after `prepared`.

### Discovery ordering and evidence freeze

Scheduler ordering now runs repair-resolution reconciliation before cleanup-commit WAL discovery.

Discovery also independently reads the resolution transaction ledger under the group lock. If an invalid cleanup commit maps to a work item with an open resolution transaction, discovery preserves the existing quarantine evidence, work item and brief byte-for-byte instead of refreshing `last_seen_at` or checksums.

### Startup and scheduler recovery

Added:

`reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions`

The reconciler:

- enumerates open transactions directly from the transaction WAL;
- verifies transaction, group, phase, receipt and evidence bindings;
- resumes only missing phases;
- increments recovery count;
- is idempotent after completion;
- reports open, invalid, completed and recovered transaction counts;
- exposes zero task, approval and deletion authority.

`runConflictResolutionMemoryMaintenanceSchedulerTick` invokes the real reconciler for every maintained group. The scheduler fails closed when the resolution transaction ledger is invalid, recovery reports blocked, or any open transaction remains.

Scheduler telemetry now includes:

- repair-resolution transaction count;
- recovered-now count;
- open transaction count;
- invalid transaction count.

### Inspection and quality gate

Added transaction health inspection:

`inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions`

Registered quality gate:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_resolution_transaction`

The gate requires:

- a valid transaction-ledger root;
- zero open or invalid transactions;
- valid terminal work-item, brief, assignment and receipt phase proofs;
- a healthy terminal repair lifecycle;
- zero task, approval or deletion authority.

Changing a completed transaction field without updating its transaction checksum and parent ledger root changes quality status from `ok` to `fail`.

## Verification

### Phase 210 resolution transaction crash matrix

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactionSelfTest`

Result: 14/14 passed.

Covered:

- crash after `prepared`;
- crash after work-item write and after work-item phase persistence;
- crash after brief write and after brief phase persistence;
- crash after assignment write and after assignment phase persistence;
- crash after receipt write and after receipt phase persistence;
- durable previous phase at every write-before-phase interruption;
- discovery preservation of all in-flight bound artifacts;
- mutation rejection while a transaction is open;
- recovery of nine open transactions in one startup pass;
- terminal proof validation for every transaction;
- work, brief, assignment and receipt convergence;
- idempotent repeated reconciliation;
- byte-stable second-group ledgers;
- real scheduler recovery of an interrupted transaction;
- healthy quality acceptance and tampered quality rejection;
- transaction/ledger tamper fail-closed behavior;
- unchanged task and approval counts and zero deletion authority.

Observed recovery state:

- interrupted transactions: 9;
- recovered in one pass: 9;
- completed: 9;
- open: 0;
- invalid: 0.

### Compatibility

Phase 208 startup discovery, Phase 209 repair lifecycle/context and Phase 210 transaction tests all pass together.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 44/44 passed.

Coverage includes Phases 176-210, runtime-kernel context usage, historical replay, PTL and ignore-memory behavior, cleanup receipts, crash journals, leases, CAS, finalization WAL, startup discovery, repair lifecycle/context and resolution transaction recovery.

## Invariants

- Resolution WAL prepare precedes every target-ledger mutation.
- One open resolution transaction excludes other mutations for the same work item.
- Recovery never changes group, receipt, evidence, action or target identity.
- A file-written state is accepted only with exact transaction-bound proof.
- Scheduler recovery runs before discovery can refresh repair artifacts.
- Discovery preserves evidence bound by an open resolution transaction.
- Completed transactions prove all four target-ledger phases.
- Recovery is idempotent and group-local.
- Recovery creates no real task or approval and grants no deletion authority.
- Original cleanup-commit WAL and quarantine evidence are never deleted by resolution recovery.

## Next Audit

Phase 211 should add WAL-first startup discovery for repair-resolution transactions, quarantine invalid or cross-linked transactions that cannot be exactly recovered, create non-tasking repair work items/briefs for those failures, and preserve a checksummed compact root when terminal resolution transactions exceed retention. A later lifecycle audit should also make reopen and assignment creation crash-recoverable across their own multi-ledger writes.
