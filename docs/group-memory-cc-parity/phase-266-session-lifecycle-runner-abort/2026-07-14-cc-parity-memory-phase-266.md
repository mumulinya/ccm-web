# Phase 266: Session Lifecycle Runner Abort

## Goal

Stop a Task Agent from continuing to modify project files after its owning `groupId + gcs_*` session is archived or deleted.

Phase 265 rejected stale delivery, reinjection proof, and artifact proof, but a third-party CLI could still run until completion before its result was rejected. Phase 266 moves the lifecycle fence into process execution and startup recovery.

Historical sessions remain deletion-only. No transcript or memory context is migrated into the replacement session. Global Agent remains global-context-only.

## Claude Code Reference

The implementation follows the cancellation ownership pattern visible in:

- `D:/claude-code/src/tasks/LocalAgentTask/LocalAgentTask.tsx`
- `D:/claude-code/src/utils/abortController.ts`
- `D:/claude-code/src/commands/clear/conversation.ts`

Claude Code gives local sub-agents their own `AbortController`, links child cancellation to the owning parent where appropriate, and aborts running agents when the conversation/task lifecycle is terminated.

CCM uses process-tree termination and durable cancellation files because Codex, Cursor, and Claude Code are invoked as third-party CLI processes rather than in-process tasks.

## Lifecycle Cancellation

`requestGroupSessionAgentCancellation` now revokes execution by exact group-session identity.

When a `gcs_*` session is archived or deleted, CCM:

1. commits the new lifecycle generation or deletion tombstone
2. finds non-terminal tasks owned by the exact session
3. writes durable task cancellation markers
4. terminates locally managed process trees
5. marks matching queued or running external Runner requests `cancel_requested`
6. records `session_lifecycle_stale` provenance on those requests

Deletion still commits its tombstone before transcript and sidecar removal. A replacement session receives a new ID and independent active generation 1.

## Independent Runner Fence

Every group Task Agent Runner request now carries:

- `groupId`
- exact `groupSessionId`
- lifecycle generation and status
- lifecycle head ID and checksum
- originating memory-context snapshot ID and checksum

The independent Runner validates this binding:

1. before runtime-tool validation and process spawn
2. every 100 ms while the third-party CLI is running
3. immediately before writing a successful result

A missing lifecycle binding on a `gcs_*` request fails closed. A deleted, archived, corrupt, or generation-stale binding produces a terminal cancelled result with `session_lifecycle_stale` evidence. The Runner does not launch a known-stale request.

If the lifecycle changes during execution, the Runner writes task cancellation state and terminates the process tree. Final delivery fencing from Phase 265 remains as the last independent barrier.

## Startup Recovery

`reconcileGroupSessionLifecycleAgentCancellations` runs before task-queue resume.

It groups all non-terminal tasks by `groupId + gcs_*`, reloads the durable lifecycle head, and reissues cancellation for scopes that are archived, deleted, missing, or corrupt. This restores cancellation markers after a crash between lifecycle commit and local process cleanup.

External Runner processes additionally revalidate the lifecycle head themselves, so they do not depend on the main server being alive.

## Verification

- `npm run check`: pass
- `npm run build`: pass
- lifecycle process-abort and restart self-test: pass, 33 assertions
- real managed child terminated after session deletion: pass, under 1 second in final run
- queued external Runner request revoked by exact group-session identity: pass
- independent Runner handles the stale request without launching the Agent: pass
- independent Runner result contains deletion-tombstone evidence: pass
- startup reconciliation restores a removed cancellation marker: pass
- replacement session starts at independent active generation 1: pass
- Phase 265 lifecycle delivery-fence regression: pass, 31 assertions
- Phase 264 compact-head regression: pass, 38 assertions
- Memory Center session-scope regression: pass, 13/13 checks
- group-session maintenance race: pass, 4/4 checks
- Runner runtime-tool gate regression: pass, 14/14 checks
- production overview API: HTTP 200 with lifecycle counters present
- production server: `http://localhost:3081`, PID 24652
- production stderr: empty

## Result

Group-session lifecycle invalidation now reaches the actual third-party Agent process. Deleting or archiving a group session no longer merely rejects the eventual answer: it actively interrupts local execution, revokes external Runner work, survives restart, and fails closed before stale work can be launched again.

