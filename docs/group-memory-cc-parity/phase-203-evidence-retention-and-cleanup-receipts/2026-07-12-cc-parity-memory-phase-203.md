# Phase 203: Recovery Evidence Retention And Explicit Cleanup Receipts

Date: 2026-07-12

## Goal

Bound terminal delivery-recovery diagnostics without ever dropping unresolved evidence or the latest recovery proof, and require a short-lived, single-use, exact-checksum cleanup receipt before any eligible telemetry evidence file can be removed.

## Implemented

### Unresolved evidence retention

The delivery quarantine ledger no longer uses a blind 240-row tail slice.

Retention now follows:

`preserve_all_unresolved_and_latest_recovery_proof_compact_cleaned_terminal_only`

Rules:

- every unresolved temp, orphan or corrupt-current evidence row remains hot;
- the newest `quarantined_corrupt_current` row is the latest recovery proof;
- the latest proof cannot become a cleanup candidate;
- only rows already cleaned by an executed receipt become terminal;
- terminal cleaned detail compacts by exact group and reason;
- compact summaries retain cleaned count, first/last times, quarantine ID root and cleanup-receipt ID root;
- compact summaries are checksummed and bounded to 120 by default.

Safety takes precedence over a hard hot-row bound. Without an explicit cleanup receipt, unresolved evidence is not silently discarded.

### Quarantine retention

Added:

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention`

It validates the quarantine checksum, compacts cleaned terminal rows and reports unresolved/latest-proof retention. It deletes no files and grants no cleanup authority.

The conflict-resolution scheduler runs this retention after recovery and orphan reconciliation. Scheduler output exposes retention and blocked-retention counts.

### Cleanup candidate selection

Eligible cleanup targets are derived from a valid group-local quarantine and valid delivery generation chain.

Supported target classes:

- old checksum-addressed recovery evidence, excluding the latest proof;
- interrupted atomic-write temp files;
- orphan previous evidence only when it is not the required previous generation.

The current delivery ledger is never eligible. A required previous ledger is never eligible. Missing, changed, protected, cross-group or path-escaping targets are rejected.

### Explicit cleanup receipts

Added:

- `createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt`;
- `executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt`;
- `inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup`.

Each receipt binds:

- exact group ID;
- actor role and actor ID;
- reason;
- quarantine checksum;
- current and previous delivery-ledger checksums;
- latest recovery proof ID;
- exact quarantine IDs, target paths, target kinds and target file checksums;
- issue and expiry times;
- single-use policy and receipt checksum.

Receipt creation requires `explicitApproval=true`. Execution requires explicit non-background execution. Receipts expire, cannot be replayed and fail closed after quarantine, generation, latest-proof or file checksum changes.

### Exact cleanup execution

A valid receipt deletes only its exact eligible telemetry evidence paths. It then:

- marks matching quarantine rows cleaned;
- records cleanup receipt ID and time;
- compacts cleaned terminal diagnostics;
- consumes the receipt;
- preserves the latest recovery proof, current/previous ledgers and all unrelated evidence.

This is the only Phase 203 path allowed to remove telemetry evidence. It does not delete cold archive shards or project memory.

### Memory Center operations

Added:

- `approve_delivery_telemetry_evidence_cleanup`;
- `execute_delivery_telemetry_evidence_cleanup`.

Both operations require a reason and write Memory Center audit records. Approval and execution remain separate.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup`

It verifies:

- unresolved count matches retained hot evidence;
- latest recovery proof still exists;
- quarantine and compact checksums are valid;
- cleanup receipts are checksummed and group-local;
- scheduler cleanup authority remains false.

## Verification

### Phase 203 cleanup soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupSelfTest`

Result: 9/9 passed.

Tested:

- four unresolved rows remain hot before cleanup;
- latest recovery proof is excluded from a three-file cleanup receipt;
- missing explicit approval is rejected;
- expired, tampered, background and cross-group execution are blocked;
- valid execution deletes exactly one old recovery evidence file and two interrupted temp files;
- latest recovery evidence remains on disk;
- consumed receipt replay is blocked;
- three cleaned rows compact while one latest proof remains hot;
- scheduler retains quarantine for two groups and deletes nothing;
- task count, GC approval ledgers and cold shard count remain unchanged;
- the Phase 203 quality gate covers both groups.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 37/37 passed.

Coverage includes Phases 176-203, explicit telemetry cleanup receipts, evidence retention/compaction, delivery recovery/quarantine, recurrence freshness, coordinator and Global Agent context delivery, scheduler/controller safety, cold archive generations, historical compact replay, memory-first and partial compact, PTL, ignore-memory and provider-ranking memory usage.

## Invariants

- Every unresolved evidence row remains hot until explicit cleanup.
- Latest recovery proof is permanently excluded from cleanup candidates.
- Scheduler never creates or executes a cleanup receipt.
- Cleanup approval and cleanup execution are separate explicit actions.
- A cleanup receipt is exact-group, exact-generation, exact-quarantine and exact-file-checksum.
- Cleanup receipts expire and are single-use.
- Background, cross-group, stale, tampered and replayed cleanup attempts fail closed.
- Cleanup removes telemetry evidence only; it never deletes current/required previous ledgers or cold shards.

## Next Audit

Phase 204 should add cleanup receipt revocation and crash-safe partial-execution recovery: journal each candidate before deletion, resume or reconcile an interrupted explicit cleanup without deleting outside the receipt set, and keep the latest recovery proof protected across every partial state.
