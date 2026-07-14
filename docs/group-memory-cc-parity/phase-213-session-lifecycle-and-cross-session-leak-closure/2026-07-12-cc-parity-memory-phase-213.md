# Phase 213: Session lifecycle and cross-session leak closure

## Goal

Close the implicit active-session paths left after Phase 212 and make group chat sessions operationally complete. A task or receipt must remain bound to the session that created it even when the user switches to another session.

## Leak audit findings

The Phase 212 storage boundary was correct, but several production readers still supplied only `groupId`:

- task entity-chain reconstruction
- runtime-tool evidence collection
- inline task status updates
- file-change, coordination-plan, assignment, and rework evidence collectors
- clarification resolution
- main-Agent decision attachment updates
- review-loop memory snapshots
- group memory API reads
- assignment status updates located only by message id
- child-Agent runtime authorization and receipt evidence scans

Those paths could follow the currently active session after a UI switch. Phase 213 now resolves the session from the task, QA record, explicit request, memory object, or the message-id locator.

## Session identity rules

1. An explicit `group_session_id` wins.
2. A task-linked message uses the task's `group_session_id`.
3. A legacy task without a session is permanently assigned to `default`.
4. Only a message unrelated to a task may use the active session.
5. Explicit task continuation is rejected when the task belongs to another session.
6. Automatic continuation searches only tasks from the current session.
7. Assignment status updates locate the session containing the plan message before writing.

This prevents late receipts and background workers from writing into a newly selected chat.

## Session lifecycle

The session API supports:

- `create`
- `select`
- `rename`
- `archive`
- `restore`
- `delete`
- `prune`

Archived sessions are read-only. A send request targeting an archived session receives HTTP `409` before any model or Agent call.

Deleting a session removes:

- transcript and backup
- session compaction memory and backup
- session-memory snapshot directory
- tool-continuity snapshot directory
- session-scoped typed memory directory

Deletion is rejected while the session has unfinished tasks unless the caller provides explicit `force: true`. Deleting the last session creates a fresh replacement session.

## Retention policy

Memory Center persists:

- `groupSessionRetentionDays`, default `30`
- `groupSessionMaxArchived`, default `20`

The prune action reads these defaults from the orchestrator configuration. It supports dry-run candidate reporting and skips sessions whose unfinished tasks block deletion.

## Frontend

Group Chat now exposes icon controls beside the session selector:

- `+` new session
- `✎` rename
- `▣` archive
- `×` delete

Archived sessions are labelled `[已归档]`. Memory Center exposes editable retention days and maximum archived session count.

## Verification

- TypeScript full check: passed.
- Backend production build: passed.
- Frontend production build: passed.
- Diff whitespace check: passed.
- Session lifecycle and isolation self-test: `12/12` passed.
- Real lifecycle API: create, rename, archive, restore, delete passed.
- Session memory artifact deletion receipt: `ccm-group-session-memory-artifact-delete-v1`.
- Archived session send: HTTP `409`, rejected before dispatch.
- Retention configuration persistence: `45/12` saved through the real API and restored to `30/20`.
- Browser verification: four session controls rendered, retention fields rendered as `30/20`, no console errors.

## Remaining long-term parity work

The long-term goal remains active. Next work should resolve provider/model capability discovery beyond explicit configuration, add scheduled retention execution with a disabled-by-default safety switch, and continue auditing technical diagnostic endpoints that intentionally aggregate group-level metadata.
