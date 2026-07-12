# Phase 198: Read-Only Maintenance Scheduler, Idempotency And Notifications

Date: 2026-07-12

## Goal

Attach the Phase 197 read-only maintenance due-run to CCM's existing cron scheduler lifecycle without allowing repeated timer ticks, process restarts, failures or notifications to create tasks, approval receipts or destructive actions.

## Implemented

### Cron lifecycle integration

The existing `tickCronScheduler` now invokes:

`runConflictResolutionMemoryMaintenanceSchedulerTick`

after normal cron jobs and report notifications.

Only groups with an existing conflict-resolution cold-archive manifest are considered. The scheduler calls the Phase 197 due-run with:

- background trigger;
- persisted maintenance state;
- advisory notification emission;
- no destructive capability.

The normal cron task creation path is not used.

### Persistent idempotency

Each group and scheduler window uses the reliability-ledger scope:

`conflict-resolution-memory-maintenance`

The operation key binds group ID and maintenance window. Completed or in-progress operations suppress repeated timer ticks even after a process restart because the idempotency record is filesystem-backed.

Every operation metadata record states:

`destructive_action_authorized=false`

### Persistent failure backoff

Scheduler state is stored in:

`memory-control/conflict-resolution-maintenance-scheduler.json`

Per-group state records:

- failure count;
- last failure and error;
- next retry time;
- last successful operation key;
- final status.

Failures use exponential backoff with configurable base and maximum delays. Ticks before `next_retry_at` are skipped. A successful retry resets the failure count and backoff.

### Hard scheduler boundary

The scheduler validates every due-run result before accepting it. A result is rejected if:

- `destructiveActionAuthorized` is not exactly false;
- `deletedCount` is non-zero.

Scheduler tick reports always declare:

- `destructiveActionAuthorized=false`;
- `deletedCount=0`;
- `createdTaskCount=0`;
- `createdApprovalReceiptCount=0`.

### Deduplicated advisory notifications

Maintenance notifications are persisted per group in:

`maintenance-notifications.json`

The state fingerprint binds:

- group ID;
- current and previous manifest checksums;
- quarantine checksum;
- recommendation severity and action.

Each fingerprint produces at most two notifications:

- one for `group-main-agent`;
- one for `global-agent`.

Repeated ticks update `last_seen_at` and `seen_count` instead of creating new rows.

Every notification declares:

- `advisory_only=true`;
- `destructive_action_authorized=false`;
- `should_create_real_task=false`;
- `cross_group_authorization_allowed=false`.

### Scheduler status

Added:

`getConflictResolutionMemoryMaintenanceSchedulerStatus`

Cron status now exposes the latest memory-maintenance tick and the permanent policy:

`scheduler_verify_dry_run_only_no_task_no_approval_no_delete`

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_scheduler`

It rejects any scheduler result that creates tasks, creates approval receipts, authorizes destruction or deletes shards.

## Verification

### Phase 198 self-test

`runMemoryCenterConflictResolutionMaintenanceSchedulerSelfTest`

Result: 12/12 passed.

Tested:

- first scheduler tick runs two groups read-only;
- repeated tick in the same window is suppressed for both groups;
- simulated process-restart tick is also suppressed;
- next window runs normally;
- notifications remain two rows per group and only increment `seen_count`;
- group main Agent and Global Agent notifications remain advisory;
- injected failure enters persistent backoff;
- tick during backoff is skipped;
- retry after backoff succeeds and resets failure state;
- approval receipt count remains zero;
- shard count remains unchanged;
- task count remains unchanged;
- scheduler quality gate passes.

Observed:

- first completed groups: 2;
- same-window duplicates suppressed: 2;
- simulated-restart duplicates suppressed: 2;
- injected failures: 1;
- backoff skips: 1;
- successful recovery: 1.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 32/32 passed.

Coverage includes Phases 176-198, original cron daily-development protocol, scheduler idempotency/backoff/notifications, GC receipts, manifest recovery, quarantine, cold archive, repair and outcome retention, memory-first and partial compact, PTL, ignore memory and runtime usage.

## Invariants

- Scheduler ticks are always non-destructive.
- Scheduler code never calls task creation for memory maintenance.
- Scheduler code never signs GC approval receipts.
- Cross-restart idempotency is filesystem-backed.
- Backoff state is group-local and persistent.
- Repeated notifications are deduplicated by exact state fingerprint.
- Notifications are advice, not authorization.
- Main and Global Agent audiences remain distinct.
- Existing cron task workflows continue unchanged.

## Next Audit

Phase 199 should inject pending maintenance notifications into the group main Agent and Global Agent context builders, add acknowledgement and suppression receipts, require current archive-state revalidation before acting, and prove that notification consumption still cannot create child tasks or authorize GC.
