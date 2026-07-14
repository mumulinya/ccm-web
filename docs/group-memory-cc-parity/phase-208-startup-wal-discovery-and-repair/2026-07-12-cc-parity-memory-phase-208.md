# Phase 208: Startup WAL Discovery And Repair Artifacts

Date: 2026-07-12

## Goal

Discover cleanup commit WAL independently of known journal rows during startup/scheduler maintenance, automatically recover only exact proven links, quarantine every unproven or cross-linked transaction without deletion, materialize non-tasking repair work items and dispatch briefs, and preserve an auditable root when terminal WAL history is pruned.

## Implemented

### WAL-first startup discovery

Added:

- `discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits`;
- `runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery`.

Discovery enumerates the commit ledger directly. It does not depend on journal traversal to know which transactions exist.

For every transaction it validates:

- transaction and commit-ledger checksums;
- exact group binding;
- known monotonic phase;
- matching receipt ID, group and checksum;
- matching journal execution, receipt and checksum;
- candidate-ID root derived from the journal;
- receipt and journal ledger integrity.

### Proven automatic recovery

An open transaction is automatically recoverable only when all links are exact and checksummed. Startup discovery invokes the existing Phase 207 WAL recovery under the same receipt lease and group transaction lock.

After recovery, discovery re-reads all ledgers and reports the resulting state. It does not treat a previous intention or historical evidence as current authorization.

### Unproven transaction quarantine

Transactions with missing, invalid, cross-group or mismatched links are never auto-repaired in place. Discovery writes group-local evidence to:

`maintenance-notification-delivery-cleanup-commit-quarantine.json`

Each deterministic quarantine entry records:

- group and transaction IDs;
- observed group binding;
- exact validation gaps;
- observed transaction checksum;
- first/last seen times;
- evidence checksum.

Repeated discovery updates the existing evidence instead of duplicating it.

### Repair work items

Added:

`maintenance-notification-delivery-cleanup-commit-repair-work-items.json`

Each invalid transaction receives one deterministic critical repair item with:

- transaction and quarantine bindings;
- exact gaps;
- required receipt, journal, candidate-root and commit-ledger proofs;
- pending lifecycle state;
- `should_create_real_task=false`.

The scheduler creates no real task and no approval receipt.

### Dispatch briefs

Added:

`maintenance-notification-delivery-cleanup-commit-repair-dispatch-briefs.json`

Each repair item has one group-main-agent brief containing:

- deterministic brief/work-item/transaction IDs;
- proof instructions;
- required evidence files;
- explicit prohibition on deleting evidence or rewriting WAL;
- `should_create_real_task=false`.

### Scheduler integration

The maintenance scheduler now invokes WAL discovery before normal cleanup-journal reconciliation. Telemetry exposes:

- discovered transaction count;
- invalid discovered transaction count;
- repair work-item count;
- repair dispatch-brief count.

Discovery remains non-destructive and reports zero deleted files, tasks and approvals.

### Terminal WAL compact root

The commit ledger now preserves a checksummed compact summary when terminal entries exceed the retention limit.

The compact contains:

- cumulative compacted transaction count;
- transaction-ID root;
- transaction-checksum root;
- first/last completion times;
- compact generation and checksum.

Open transactions are never compacted. The compact checksum participates in the parent commit-ledger checksum.

Production retains the latest 160 terminal transactions. Tests can use a lower bounded limit to exercise compaction without manufacturing hundreds of cleanup executions.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_startup_discovery`

It accepts either:

- no invalid transaction; or
- every invalid transaction fully contained by quarantine evidence, a repair work item and a dispatch brief.

It also requires:

- zero recoverable transactions left open;
- non-tasking repair artifacts;
- valid compact root when terminal history was pruned;
- zero scheduler deletion/task authority.

## Verification

### Phase 208 startup discovery soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscoverySelfTest`

Result: 11/11 passed.

Tested:

- seven successful transactions with a terminal limit of four;
- four detailed transactions retained and three compacted;
- compact transaction-ID root, transaction-checksum root and checksum validate;
- scheduler independently discovers four healthy retained transactions;
- a real prepared-phase crash is automatically recovered by startup discovery;
- a second prepared-phase WAL has its journal row removed;
- the orphan WAL remains discoverable directly from the commit ledger;
- invalid journal-ledger state quarantines every affected transaction;
- repair work items and dispatch briefs are deterministic and idempotent;
- two-group startup discovery aggregates healthy and contained-invalid states;
- no task, approval, cold shard or additional evidence deletion occurs.

Observed compact state:

- retained terminal transactions: 4;
- compacted transactions: 3;
- compact generation: 3;
- compact checksum valid.

Observed orphan state:

- commit transactions scanned: 2;
- invalid transactions contained: 2;
- repair work items: 2;
- dispatch briefs: 2.

### Compatibility

Phases 203-207 cleanup, crash journal, leases, CAS and WAL tests remain covered by the combined regression.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 42/42 passed.

Coverage includes Phases 176-208, startup WAL discovery, missing-journal orphan detection, repair artifact idempotency, compact roots, every finalization crash phase, shared-ledger CAS, execution leases, scheduler safety, delivery recovery/retention, cold archives, post-compact reinjection and preservation, historical replay, memory-first and partial compact, PTL, ignore-memory, provider-ranking usage and runtime-kernel behavior.

## Invariants

- WAL enumeration does not depend on journal rows.
- Automatic recovery requires exact receipt, journal and candidate bindings.
- Unproven WAL is quarantined, never rewritten or deleted automatically.
- Each invalid transaction maps to deterministic repair evidence, work item and brief.
- Repair artifacts never create real tasks by themselves.
- Open WAL is never compacted.
- Pruned terminal WAL remains represented by two cumulative roots and a checksum.
- Scheduler startup discovery deletes zero evidence and creates zero approvals.
- Every artifact remains group-local.

## Next Audit

Phase 209 should add lifecycle actions and explicit resolution receipts for cleanup-commit repair work items, inject ready briefs into the group-main-agent and Global Agent maintenance context without granting cross-group authority, and deliver a selected brief to a project child Agent only after explicit assignment binding.
