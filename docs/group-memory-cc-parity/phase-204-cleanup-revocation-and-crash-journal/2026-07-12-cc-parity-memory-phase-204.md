# Phase 204: Cleanup Receipt Revocation And Crash-Safe Execution Journal

Date: 2026-07-12

## Goal

Make explicit delivery-evidence cleanup recoverable across process interruption without deleting outside the receipt candidate set, allow an unstarted cleanup receipt to be revoked, let the scheduler reconcile metadata without performing deletion, and preserve the latest recovery proof across every partial state.

## Implemented

### Cleanup receipt revocation

Added:

`revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt`

Revocation requires:

- exact group and receipt ID;
- `explicitRevocation=true`;
- actor ID and reason;
- a valid receipt checksum;
- an unconsumed receipt;
- no in-progress cleanup journal.

A revoked receipt cannot execute. Revocation is idempotent after success. A consumed receipt or a receipt whose execution journal has started cannot be revoked.

Memory Center now exposes:

`revoke_delivery_telemetry_evidence_cleanup`

and records the revocation actor, reason and timestamp.

### Checksum execution journal

Added:

`maintenance-notification-delivery-cleanup-journals.json`

Each journal binds:

- exact group, receipt ID and receipt checksum;
- original quarantine and delivery-generation checksums;
- latest recovery proof ID;
- exact cleanup candidates and file checksums;
- per-candidate status;
- start, update and completion times;
- a checksum over the complete journal.

Open journals are retained. Completed/cancelled journals are bounded to the latest 160.

### Intent-before-delete protocol

Each candidate transitions:

`pending -> delete_intent -> deleted`

The journal is atomically persisted at every transition.

Rules:

- a file may be deleted only after its exact `delete_intent` is durable;
- a pending candidate missing without intent blocks recovery;
- a delete-intent candidate missing after restart is safely reconciled as deleted;
- every existing target is checksum-verified immediately before deletion;
- candidates outside the receipt/journal set are never inspected or removed.

### Partial execution resume

Calling cleanup execution again with the same explicit receipt resumes its valid in-progress journal.

Once a journal has started:

- receipt expiry does not prevent exact recovery of already-authorized partial work;
- normal scheduler delivery-generation advancement does not invalidate the journal;
- quarantine itself must remain checksummed;
- every candidate ID must remain in quarantine;
- latest recovery proof must remain unchanged;
- receipt and journal checksums must still match.

This avoids a partial cleanup being locked permanently by ordinary background retention while keeping the original file authorization immutable.

### Metadata-only scheduler reconciliation

Added:

`reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals`

The scheduler invokes it with metadata persistence enabled. It never calls file deletion.

It can:

- report resumable and blocked journals;
- convert `delete_intent + missing file` to deleted;
- when every candidate is already deleted, finish quarantine compaction, receipt consumption and journal completion;
- leave pending existing candidates for an explicit resume.

Scheduler reports:

- open cleanup journal count;
- reconciled journal count;
- cleanup deleted count, permanently zero.

### Crash windows covered

The journal closes the important windows:

1. crash after intent persistence but before delete;
2. crash after delete but before deleted-status persistence;
3. crash after one of several candidate deletions;
4. crash after all deletes but before quarantine finalization;
5. crash after quarantine finalization but before receipt/journal finalization.

All recovery work remains bounded by the original checksummed receipt and journal.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_journal`

It verifies:

- receipt and journal checksums;
- group-local journal ownership;
- zero invalid or blocked journals after reconciliation;
- scheduler has no deletion authority;
- current delivery/recovery health remains valid;
- latest recovery proof remains present when one exists.

## Verification

### Phase 204 crash/revocation soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalSelfTest`

Result: 10/10 passed.

Tested:

- an unstarted receipt can be explicitly revoked;
- revoked receipt execution is blocked;
- in-progress receipt revocation is blocked;
- cleanup interrupted after one deletion leaves an exact resumable journal;
- tampered journal and cross-group resume are blocked;
- scheduler detects the partial journal but deletes no remaining files;
- explicit resume succeeds after receipt expiry and scheduler generation advancement;
- consumed partial receipt cannot replay;
- a crash after all deletes but before finalize is completed by scheduler metadata reconciliation;
- latest recovery proof and another group's unresolved evidence remain;
- tasks, GC approvals and cold shards remain unchanged;
- both groups pass the Phase 204 quality gate with zero open/invalid journals.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 38/38 passed.

Coverage includes Phases 176-204, cleanup revocation, partial execution journal recovery, scheduler metadata reconciliation, explicit evidence cleanup, delivery recovery/quarantine/retention, recurrence freshness, real coordinator and Global Agent context delivery, cold archive generations, historical compact replay, memory-first and partial compact, PTL, ignore-memory and provider-ranking memory usage.

## Invariants

- Cleanup cannot delete before durable exact-file intent.
- Missing pending files block; missing intended files can reconcile as deleted.
- Only explicit execution can delete cleanup targets.
- Scheduler reconciliation deletes zero files.
- Started journals resume the original authorization only; they cannot add candidates.
- Receipt expiry does not strand already-started exact cleanup work.
- Normal telemetry-generation advancement cannot invalidate a valid started journal.
- Revoked, tampered, cross-group and replayed cleanup attempts fail closed.
- Latest recovery proof remains protected in every partial/final state.

## Next Audit

Phase 205 should add per-journal leases and concurrent executor exclusion, detect abandoned executors across process restarts, and prove that two simultaneous explicit cleanup attempts cannot double-delete, overwrite journal progress or consume the same receipt twice.
