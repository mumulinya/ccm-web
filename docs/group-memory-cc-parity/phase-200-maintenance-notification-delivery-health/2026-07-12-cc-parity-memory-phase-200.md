# Phase 200: Maintenance Notification Delivery Health And Real-Path Soak

Date: 2026-07-12

## Goal

Prove that pending cold-archive maintenance notifications reach the real group main Agent and Global Agent context paths, persist bounded delivery evidence, diagnose repeatedly unseen critical advice and remain permanently unable to create tasks, approvals, deletion or cross-group authority.

## Phase 199 Audit Correction

Phase 199 injected group notifications into `buildCoordinatorPrompt`, but current production group orchestration primarily enters through `runGroupOrchestrator` and its `extraInstructions` path. Phase 200 moved the shared notification builder into that real path.

Global Agent injection was already on the real `getContext` path and is now augmented with delivery evidence and health.

## Implemented

### Real group main Agent path

Added:

`buildCoordinatorMaintenanceNotificationInstructions`

`runGroupOrchestrator` now adds this section to the same `extraInstructions` consumed by `buildLlmCoordinatorMessages`.

Delivery is recorded only when the LLM context is about to be sent. A missing model configuration or coded fallback does not claim model delivery. A context-limit retry increments the same context/session-bound delivery item.

### Delivery ledger

Added:

`maintenance-notification-deliveries.json`

Added API:

`recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery`

Each entry binds:

- exact group and audience;
- notification ID and state fingerprint;
- context ID and consumer session ID;
- delivery channel and timestamps;
- idempotent delivery count;
- checksum and permanent advisory-only safety flags.

Repeated construction of the same context/session updates one entry instead of appending unbounded duplicates. The ledger retains at most 480 entries per group.

### Global Agent delivery

`buildAgenticContext` records delivery when it is building a real session context. Internal reads without a Global Agent session do not claim delivery unless explicitly requested.

The Global Agent context now includes:

`conflict_resolution_maintenance_delivery_health`

The summary is bounded to eight groups and remains read-only.

### Revalidated unhealthy-state alerts

Current archive state now distinguishes:

- `revalidated`: current files were successfully recomputed;
- `healthy`: manifest generation and quarantine inputs are valid.

A manifest-generation failure is therefore no longer hidden merely because it is unhealthy. A matching, recomputed critical notification can enter context without granting repair or deletion authority.

### Repeated unseen diagnostics

Added:

`inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth`

It reports:

- pending notifications;
- pending notifications with delivery evidence;
- unseen pending notifications;
- severe notifications repeatedly emitted past an age threshold without delivery;
- invalid delivery checksums.

The diagnostic always returns zero created tasks, approval receipts and deletions.

Maintenance status now includes this delivery-health report.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_health`

It verifies checksums, group boundaries, advisory flags and the no-task/no-approval/no-delete contract. Repeated unseen alerts are diagnostics rather than automatic authorization.

## Verification

### Phase 200 soak self-test

`runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryHealthSelfTest`

Result: 8/8 passed.

The test intentionally corrupts a current manifest and verifies:

- both audience-specific critical notifications remain visible;
- three unseen emissions become two read-only repeated-unseen diagnostics;
- group main Agent delivery reduces the unseen count from two to one;
- Global Agent delivery reduces it from one to zero;
- rebuilding the same main-Agent context produces one ledger row with delivery count two;
- a cross-group notification cannot be recorded in another group's ledger;
- delivery creates no task, approval receipt or shard deletion;
- the Phase 200 quality gate covers two groups.

### Phase 199 regression

`runMemoryCenterConflictResolutionMaintenanceNotificationContextSelfTest`

Result: 9/9 passed.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 34/34 passed.

Coverage includes Phases 176-200, real coordinator and Global Agent context paths, unhealthy manifest alerts, delivery idempotency, maintenance scheduler/controller, cold archive generations, historical compact replay, memory-first and partial compact, PTL, ignore-memory and provider-ranking memory usage.

## Invariants

- Only a real context send path records delivery.
- Group and audience bindings are exact and checksum-audited.
- An unhealthy state can be visible after revalidation without becoming authorized.
- Repeated unseen critical advice is diagnostic only.
- Delivery evidence is bounded and idempotent per context/session.
- Global Agent summaries remain bounded and cross-group advisory-only.
- Delivery cannot create a child-Agent task.
- Delivery cannot create or consume a GC approval receipt.
- Delivery cannot delete or modify a cold shard.

## Next Audit

Phase 201 should add restart-safe aggregation and aging for delivery telemetry, preserve unresolved severe delivery gaps during retention, compact terminal delivery diagnostics, and prove that telemetry retention cannot erase a currently unseen critical notification or merge evidence across groups or audiences.
