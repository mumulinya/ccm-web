# Phase 209: Repair Lifecycle And Agent Context

Date: 2026-07-12

## Goal

Turn Phase 208 cleanup-commit repair artifacts into a checksummed, group-local lifecycle; require an explicit single-use resolution receipt; expose ready repair briefs to the group main Agent and read-only summaries to Global Agent; and inject a brief into a project child Agent only through an exact assignment binding.

## Implemented

### Repair lifecycle

Added explicit transitions for cleanup-commit repair work items:

- `pending -> claimed`;
- `claimed -> dispatched`;
- terminal or blocked states may be explicitly reopened;
- resolution and cancellation are performed only through a separate resolution receipt.

Lifecycle actions require:

- `explicitAction=true`;
- actor role `group-main-agent` or `local-user`;
- actor identity and reason;
- a valid group-local work-item ledger root and item checksum.

Global Agent cannot claim, dispatch, assign or resolve an item.

### Exact project-child assignment

Added a checksummed repair-assignment ledger:

`maintenance-notification-delivery-cleanup-commit-repair-assignments.json`

An assignment requires explicit authorization by the group main Agent or local user and binds:

- group ID;
- work-item, brief and transaction IDs;
- project;
- Agent type;
- coordinator assignment ID;
- optional child session ID.

Project child Agent recall requires every supplied binding field to match. Missing assignment, wrong group, project, Agent type, assignment ID or child session returns no brief.

Resolution closes every active binding for the work item so a terminal brief cannot remain visible to a child Agent.

### Resolution receipts

Added:

`maintenance-notification-delivery-cleanup-commit-repair-resolution-receipts.json`

Approval and execution are separate operations.

Approval binds:

- group and work-item IDs;
- immutable work-item checksum;
- quarantine evidence checksum;
- resolution action;
- actor role, actor ID and reason;
- issue and expiry timestamps;
- single-use policy.

Execution revalidates the complete work, brief, assignment, quarantine and receipt ledgers. It rejects:

- expired receipts;
- cross-group receipt IDs;
- changed work items or quarantine evidence;
- invalid ledger roots;
- consumed receipts;
- replay after successful execution.

The receipt ledger has a separate state checksum per receipt. Its ledger root covers `receipt_checksum`, `consumed` and `consumed_at`, so changing only the consumed flag is detected. Executing one approved receipt also invalidates other open approvals for the same work item.

### Group main Agent context

`buildCoordinatorMaintenanceNotificationInstructions` now merges the existing cold-archive maintenance notifications with group-local cleanup-commit repair briefs.

The context permits local repair planning and explicit claim/dispatch actions. It does not create a real task automatically and does not grant receipt-free resolution or deletion authority.

### Global Agent context

`buildAgenticContext` now includes `cleanup_commit_repair_context` across visible groups.

Global Agent receives only bounded per-group summaries. The context explicitly sets:

- `can_claim_or_dispatch=false`;
- `can_resolve_without_receipt=false`;
- `cross_group_authorization_allowed=false`.

Visibility does not merge group authority or expose assignment rights.

### Project child Agent context

`buildWorkerContextPacketForAssignment` now requests cleanup-commit repair context with the exact assignment identity and passes it into `buildWorkerContextPacket` only when one active binding matches.

WorkerContextPacket now supports:

- `cleanup_commit_repair_context`;
- a required context-usage category when a repair brief is present;
- a repair-brief acceptance requirement;
- rendered instructions that prohibit evidence/WAL deletion, self-resolution and cross-group expansion.

An unassigned worker packet contains `cleanup_commit_repair_context=null`.

### Persistent quality gate

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_repair_lifecycle_context`

The gate verifies:

- quarantine, work-item, brief, assignment and resolution-receipt ledger integrity;
- every open work item has a non-tasking open brief;
- terminal items leak no open brief;
- active assignments bind only an open item and matching brief in the same group;
- consumed receipts correspond to terminal items;
- Global Agent remains read-only;
- a project child Agent with no assignment sees no brief.

The quality gate accepts healthy terminal state and fails after only the receipt `consumed` state is tampered.

## Why Distillation Exists

Compaction and distillation solve different problems.

Compaction reduces the current conversation so an Agent can continue within its context window. Its output is session-oriented and may still contain transient discussion.

Distillation extracts durable, typed and attributable facts from raw conversations and execution history, such as:

- user constraints;
- project decisions;
- verified failures and lessons;
- file references;
- current work state and invalidation rules.

CCM needs distillation because each third-party project child Agent starts a new session. Replaying all raw group messages into every new session wastes context, increases stale-fact conflicts and weakens relevance. Distillation provides a bounded memory layer that can be scored, deduplicated and injected by group/project/Agent scope.

Distillation does not authorize deletion of raw evidence. Raw messages, receipts, WAL and quarantine evidence remain available for audit and re-distillation.

## Verification

### Phase 209 lifecycle and context self-test

`runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairLifecycleContextSelfTest`

Result: 13/13 passed.

Covered:

- ready brief injection into group main Agent and coordinator context;
- bounded read-only Global Agent visibility;
- Global Agent claim and assignment rejection;
- pending, claimed, dispatched and resolved lifecycle states;
- exact project child assignment and WorkerContextPacket injection;
- missing and mismatched group/project/assignment/session isolation;
- approval/execution separation;
- expiry and cross-group rejection;
- replay and consumed-state tamper rejection;
- healthy quality acceptance and tampered quality failure;
- terminal context closure;
- preservation of evidence, real-task count and approval count.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Combined regression

Combined regression: 43/43 passed.

Coverage includes Phases 176-209, runtime-kernel context usage, PTL and ignore-memory behavior, historical replay, delivery cleanup, crash journals, execution leases, shared-ledger CAS, finalization WAL, startup discovery and the new repair lifecycle/context chain.

## Invariants

- Every repair artifact remains group-local.
- Repair briefs never create real tasks automatically.
- Global Agent visibility grants no group authority.
- Project child Agent visibility requires exact assignment binding.
- Resolution requires a separate, expiring, single-use receipt.
- Receipt consumption state participates in the ledger integrity root.
- Terminal resolution closes briefs and active assignments.
- Repair lifecycle operations do not rewrite or delete the original WAL or quarantine evidence.
- Distillation does not delete raw memory evidence.

## Next Audit

Phase 210 should make multi-ledger resolution completion crash-recoverable. Work-item, brief, assignment and receipt updates currently use independent atomic files; the next phase should add a prepared/committed resolution transaction journal, startup reconciliation and exact recovery so a process interruption between those writes cannot leave a partial terminal state.
