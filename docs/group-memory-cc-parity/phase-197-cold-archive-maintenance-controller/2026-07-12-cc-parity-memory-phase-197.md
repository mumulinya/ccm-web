# Phase 197: Cold Archive Maintenance Controller And GC Approval Receipts

Date: 2026-07-12

## Goal

Provide an operational maintenance controller for Phase 196 without allowing background timers, recommendations or Global Agent visibility to become destructive authorization.

Background and due-run execution may verify archive state and preview quarantine only. Real shard deletion requires an explicit, exact, unexpired, single-use decision receipt and a separate non-background execution.

## Implemented

### Read-only maintenance runs

Added:

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance`

Every run performs:

- complete cold archive verification;
- current/previous generation verification;
- quarantine dry-run;
- next-run calculation;
- recommendation generation;
- maintenance-ledger persistence.

The persisted controller policy is:

`background_verify_and_dry_run_never_delete`

Every maintenance run records:

- `destructive_action_authorized=false`;
- `deletion_attempted=false`;
- `mode=verify_and_quarantine_dry_run_only`.

### Due-run entrypoint

Added:

`runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance`

It evaluates persisted `next_run_at` values and runs due groups with `trigger=background`. The return contract always reports:

- `destructiveActionAuthorized=false`;
- `deletedCount=0`.

This entrypoint is ready for scheduler integration but is not yet attached to a process-start timer.

### Main-Agent and Global-Agent recommendations

Maintenance runs expose two separate advisory views.

Group main Agent:

- owns local follow-up review;
- `should_create_real_task=false`;
- explicit dispatch is required before any child-Agent work.

Global Agent:

- receives cross-group health visibility;
- remains advisory-only;
- `cross_group_authorization_allowed=false`.

Recommendations never contain a destructive capability.

### Exact GC approval receipts

Added:

`createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt`

Creation requires:

- `explicitApproval=true`;
- actor role `group-main-agent` or `global-agent`;
- actor ID and reason;
- valid current and previous generations;
- valid quarantine checksum;
- at least one eligible shard.

Each receipt binds:

- exact `groupId`;
- current and previous manifest checksums;
- quarantine checksum;
- exact approved shard paths;
- shard content and row-ID checksums;
- issuing actor and reason;
- issue and expiry times;
- `single_use=true`.

### Strict execution gate

Added:

`executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt`

Execution rejects:

- background, timer, scheduler or cron triggers;
- missing explicit execution;
- missing or cross-group receipts;
- consumed or revoked receipts;
- invalid receipt checksums;
- expired receipts;
- changed manifest generations;
- changed quarantine state;
- stale shard candidate checksums;
- open-repair or failed recovery gates.

The reconcile layer also receives `allowedRelPaths`, so even a valid receipt cannot delete an eligible shard outside its exact candidate set.

After successful execution, the receipt is marked consumed with an execution checksum. Replay is rejected.

### Maintenance status

Added:

`inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance`

It audits:

- latest run dry-run boundary;
- next-run schedule;
- approval receipt checksum/group validity;
- open and consumed receipt counts;
- generation and quarantine health;
- current main/global recommendations.

### Memory Center operations

Added group maintenance operations:

- `run_conflict_resolution_archive_maintenance`;
- `approve_conflict_resolution_archive_gc`;
- `execute_conflict_resolution_archive_gc`.

All operations require a reason and write Memory Center audit entries.

### Quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_controller`

Legacy archives without a controller run remain readable and are reported as legacy until their first maintenance run.

## Verification

### Phase 197 self-test

`runMemoryCenterConflictResolutionMaintenanceControllerSelfTest`

Result: 16/16 passed.

Tested:

- forced background due-run for two groups deletes nothing;
- direct timer run cannot authorize deletion;
- main and Global Agent receive advisory recommendations;
- missing explicit approval is rejected;
- untrusted actor role is rejected;
- receipt binds exact group/generation/quarantine/shard state;
- background receipt execution is blocked;
- cross-group receipt execution is blocked;
- expired receipt execution is blocked;
- generation change invalidates an old receipt;
- receipt checksum tampering is detected;
- valid receipt deletes exactly one approved shard;
- consumed receipt replay is rejected;
- maintenance status audits the receipt lifecycle;
- two groups remain isolated;
- Memory Center creates no real child-Agent task.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 30/30 passed.

Coverage includes Phases 176-197, maintenance approvals, manifest recovery, quarantine GC, cold lookup/restore/tamper blocking, repair and outcome retention, memory-first and partial compact, PTL, ignore memory and runtime usage.

## Invariants

- Background maintenance is permanently non-destructive.
- A recommendation is not an approval receipt.
- Global Agent visibility does not grant cross-group authority.
- GC approval is exact-group, exact-generation and exact-shard-set.
- Approval and execution are separate actions.
- Approval receipts expire and are single-use.
- Changed archive or quarantine state invalidates prior approval.
- The reconcile layer enforces approved paths independently of the controller.
- No maintenance path creates a real child-Agent task.

## Next Audit

Phase 198 should attach the read-only due-run entrypoint to the existing scheduler lifecycle, add per-group idempotency and exponential backoff, emit deduplicated main-Agent/Global-Agent maintenance notifications, and prove that process restarts or repeated timer ticks cannot create tasks, approval receipts or destructive actions.
