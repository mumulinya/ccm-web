# Phase 201: Delivery Retention, Recurrence Freshness And Restart Safety

Date: 2026-07-12

## Goal

Keep maintenance-notification delivery telemetry bounded for long-running multi-group CCM instances without losing a currently unseen severe notification, reusing stale delivery evidence after a state recurrence, merging audiences/groups or weakening the scheduler's no-task/no-approval/no-delete boundary.

## Implemented

### Current notification pinning

Notification retention no longer applies a blind `first_seen_at` tail slice.

Every maintenance emission now pins the exact current notification for:

- `group-main-agent`;
- `global-agent`.

The remaining capacity keeps the most recently observed terminal notifications. A state fingerprint that first appeared long ago but becomes current again therefore remains in the 240-row hot ledger even under heavy history pressure.

The notification ledger records:

- `pinned_current_notification_ids`;
- `pinned_current_notification_count`;
- an explicit retention policy.

### Recurrence freshness

Delivery health now accepts a delivery only when:

- group, audience, notification ID and state fingerprint match;
- delivery checksum is valid;
- `last_delivered_at` is at or after the notification's latest `state_observed_at`.

If the same fingerprint recurs later, an old session delivery cannot claim that the new occurrence was seen. Both main and Global Agent must receive the current occurrence again.

### Delivery ledger v2

`maintenance-notification-deliveries.json` now uses a v2 envelope with:

- retention generation;
- previous-ledger checksum;
- current ledger checksum;
- bounded hot detailed entries;
- bounded compacted terminal summaries;
- retention diagnostics.

The previous valid ledger is atomically preserved in:

`maintenance-notification-deliveries.previous.json`

Current writes are atomic. Restart inspection validates the current checksum and previous checksum link. A tampered v2 ledger blocks retention and cannot be silently rewritten as valid history.

Legacy v1 delivery ledgers are accepted and migrated on the next valid write.

### Terminal delivery compaction

Added:

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention`

Retention:

- pins fresh delivery rows for current pending notifications;
- keeps recent detail within a configurable hot limit;
- preserves bounded invalid detail for diagnostics;
- compacts old or overflow terminal detail by exact group, audience, notification and fingerprint;
- retains aggregate delivery count, detail count, first/last delivery time and source/context checksum roots;
- never treats a compacted delivery older than `state_observed_at` as current evidence.

Default bounds:

- 320 hot detailed entries;
- 160 compact summaries;
- 30-day terminal aging threshold.

### Read-only scheduler integration

The existing conflict-resolution maintenance scheduler runs delivery retention after each group maintenance attempt.

Scheduler rows expose:

- retention status and generation;
- retention count;
- blocked-retention count.

The scheduler rejects retention output that authorizes destruction, creates tasks, creates approval receipts or deletes data. Existing filesystem idempotency and exponential backoff remain unchanged.

### Bounded context validation

Context building now validates the pinned current candidate first. Legacy ledgers without pin metadata fall back to at most eight recent candidates per audience.

This changes archive verification work from up to 240 historical candidates to one current candidate in normal operation. The Phase 201 pressure soak fell from roughly 118 seconds to 3.65 seconds without reducing coverage.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_retention`

It verifies:

- current and previous checksum continuity;
- hot and compact bounds;
- zero compacted current-delivery evidence;
- zero unprotected repeated-unseen notifications;
- no invalid delivery rows;
- no task, approval or deletion capability.

## Verification

### Phase 201 retention/restart soak

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRetentionSelfTest`

Result: 9/9 passed.

Tested:

- current old fingerprint survives 300 historical notification rows;
- both audience notifications remain pinned in a 240-row ledger;
- old deliveries do not satisfy a recurring current state;
- six terminal detailed rows compact into two audience-specific summaries;
- both current critical notifications remain repeatedly-unseen and protected during compaction;
- a second retention run preserves checksum continuity without double counting;
- scheduler retention runs read-only for two groups;
- fresh post-scheduler delivery is pinned as hot evidence;
- checksum tampering blocks retention without cross-group fallback;
- tasks, approvals and shard files remain unchanged;
- the Phase 201 quality gate covers both groups.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 35/35 passed.

Coverage includes Phases 176-201, notification recurrence, current-state pinning, delivery compaction/restart checks, real coordinator and Global Agent context paths, scheduler/controller safety, cold archive generations, historical compact replay, memory-first and partial compact, PTL, ignore-memory and provider-ranking memory usage.

## Invariants

- Current group/audience notifications are retained before terminal history.
- A recurring fingerprint requires a delivery after its latest observation time.
- Current fresh delivery detail is never compacted.
- Old compact summaries are evidence only, never current authorization or current delivery proof.
- Tampered v2 ledgers fail closed.
- Retention never merges groups or audiences.
- Scheduler retention creates no task or GC approval.
- Scheduler retention deletes no cold shard or delivery evidence required by a current severe notification.

## Next Audit

Phase 202 should add recovery selection between current and previous delivery ledgers, quarantine orphaned temporary/previous telemetry after interrupted writes, and prove that recovery chooses only a fully checksummed group-local generation while preserving current notification pinning and recurrence freshness.
