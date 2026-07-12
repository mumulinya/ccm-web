# Phase 199: Maintenance Notification Context And Visibility Receipts

Date: 2026-07-12

## Goal

Deliver Phase 198 pending cold-archive maintenance notifications into the group main Agent and Global Agent context paths, while ensuring acknowledgement or suppression changes advisory visibility only and never grants task, approval, deletion or cross-group authority.

## Implemented

### Current-state notification context

Added:

`buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext`

Each read:

- selects one exact `groupId` and audience;
- re-verifies manifest generations and quarantine inputs;
- accepts only the notification's exact state fingerprint and checksums;
- filters valid acknowledgement/suppression receipts;
- returns a bounded pending list;
- declares `advisory_visibility_only_no_task_no_approval_no_delete`.

The notification now persists its current/previous manifest checksum, quarantine checksum, grace period and state observation time. Revalidation recomputes the archive state at the same observation time, so unchanged files remain stable while changed manifests or shards invalidate the old notification.

### Group main Agent injection

`buildCoordinatorPrompt` now injects at most four pending notifications for the current group.

The prompt section explicitly states that notifications are read-only advice and must not create a child-Agent task, sign a GC approval receipt or delete data. No notification from another group is read or rendered.

### Global Agent injection

`buildAgenticContext` now includes:

`conflict_resolution_maintenance_notifications`

It contains at most eight groups and at most two notifications per group. Every row remains advisory-only and explicitly denies cross-group authorization. Visibility across groups does not grant Global Agent permission to operate on those groups.

### Acknowledgement and suppression receipts

Added a separate ledger:

`maintenance-notification-receipts.json`

Added APIs:

- `acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification`;
- `suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification`;
- `inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceipts`.

Each receipt binds:

- exact group and audience;
- notification ID and state fingerprint;
- current/previous manifest and quarantine checksums;
- actor role, actor ID and session ID;
- issue and expiry time;
- a checksum over the complete receipt contract.

Suppression requires a reason. Actor role must match the audience. Changed archive state creates a new fingerprint, so an old acknowledgement or suppression cannot hide a new notification.

### Memory Center operations

Added group operations:

- `ack_conflict_resolution_maintenance_notification`;
- `suppress_conflict_resolution_maintenance_notification`.

Both operations write Memory Center audit records. They do not call task creation, GC approval or shard deletion code.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_context`

It verifies audience/group isolation, receipt integrity and the permanent no-task/no-approval/no-delete boundary.

## Verification

### Phase 199 self-test

`runMemoryCenterConflictResolutionMaintenanceNotificationContextSelfTest`

Result: 9/9 passed.

Tested:

- coordinator prompt receives only its group's pending notification;
- Global Agent receives bounded two-group advisory summaries;
- acknowledgement hides only the exact group-main-Agent state;
- suppression requires a reason and hides only the exact Global Agent state;
- wrong audience, cross-group reuse and stale state are rejected;
- changed state reappears for both audiences;
- receipt consumption creates no task, approval or shard deletion;
- all destructive and cross-group authorization flags remain false;
- the Phase 199 quality gate covers both groups.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 33/33 passed.

Coverage includes Phases 176-199, coordinator and Global Agent context injection, maintenance scheduler/controller, cold archive generations, historical compact replay, memory-first and partial compact, PTL, ignore-memory, provider ranking and runtime usage.

## Invariants

- Notifications and receipts are isolated by exact `groupId` and audience.
- Notification text is advice, not an instruction escalation or authorization.
- Acknowledgement and suppression affect visibility only.
- Suppression always has an auditable reason.
- A changed fingerprint always reappears.
- Global Agent visibility never grants cross-group action authority.
- No notification path creates a real child-Agent task.
- No notification path creates a GC approval receipt.
- No notification path deletes or mutates a cold shard.

## Next Audit

Phase 200 should add bounded delivery/ack telemetry and production soak diagnostics: measure whether pending notifications are actually observed by each context path, detect repeatedly unseen critical notifications, and expose read-only health summaries without automatically creating tasks or escalating permissions.
