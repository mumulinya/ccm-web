# CCM Memory Phase 321: Post-compact child task status

Date: 2026-07-15

Status: implemented, verified, and deployed

Long-term goal status: active only for future parity audits and hardening

## Why this phase was required

The Phase 321 Claude Code audit found a compact-recovery behavior that directly matters to CCM's group Main-Agent architecture. Claude Code restores status attachments for background Agents after full and partial compaction so the active Agent still knows which child work is running and which completed result has not been retrieved. Without that state, a compacted coordinator can dispatch duplicate work or forget to collect an existing result.

Claude Code references:

- `D:\claude-code\src\services\compact\compact.ts`;
- `createAsyncAgentAttachmentsIfNeeded()`;
- the full-compact call site near the post-compact file/skill restoration path;
- the partial-compact call site using the same restoration behavior.

CCM retained historical Worker summaries, but it did not persist an exact `group + gcs_*` snapshot of current child-task state at the compact boundary. Phase 321 adds that missing live coordination projection.

## Implementation

### Exact-session task projection

`backend/modules/collaboration/group-memory-compaction.ts` adds:

- `buildGroupPostCompactTaskStatusProjection()`;
- `verifyGroupPostCompactTaskStatusProjectionReceipt()`;
- schema `ccm-group-post-compact-task-status-projection-v1`;
- a default 12-task restoration budget.

The projection selects only tasks bound to the compacting `group_id + gcs_*`. It includes:

- running or in-progress child tasks;
- blocked or failed child tasks that still need coordinator attention;
- recently completed tasks whose result has not been marked retrieved.

It excludes pending/queued tasks, already retrieved results, the currently compacting task, tasks without a child project target, stale terminal tasks, legacy/default sessions, sibling `gcs_*` sessions, and other groups.

CCM currently has no universal result-retrieval flag on historical tasks, so terminal tasks are retained for a bounded 24-hour window by default. Existing and future `retrieved`, `result_retrieved`, `receipt_retrieved`, and `retrieved_at` fields are honored immediately.

### Compact recovery and context use

The selected rows enter `postCompactReinject.taskStatuses` for both full compact and partial sidecar compact. The projection is included in the true post-compact payload budget and persists in:

- the compact boundary restore metadata;
- `memory.compaction`;
- `messageCompression`;
- the exact-session restart state.

`backend/modules/collaboration/memory.ts` now loads the current task store at production compact time. The group Main-Agent context renders the status rows directly. Every newly created third-party child-Agent memory bundle receives the same rows as `task_status` reinjection candidates near the start of the bounded prompt, before lower-priority sections can consume the rendering budget.

This allows the group Main Agent to avoid duplicate dispatch and lets sibling child Agents understand relevant work already in flight. Global Agent context remains global-only.

### Auditable receipt

The body-free receipt records exact group/session identity, source/matched/included counts, running/completed/blocked counts, exclusion counts, selected task IDs, projection checksum, and receipt checksum. It does not contain task descriptions, progress text, errors, or output bodies.

Receipt verification rejects schema drift, missing exact `gcs_*` scope, invalid count relationships, checksum tampering, cross-group reuse, cross-session reuse, and projection checksum mismatch.

### Memory Center visibility

`backend/modules/knowledge/memory-control-center.ts` validates and exposes the receipt and bounded task rows. `frontend/src/components/knowledge/MemoryCenter.vue` adds `Post-compact Child Task Status` diagnostics:

- included and matched tasks;
- running tasks;
- completed results not yet retrieved;
- blocked tasks;
- other group/session tasks excluded;
- receipt status and task rows.

Historical sessions with no compact correctly display `waiting` and `no compact yet`.

## Runtime invariants

1. Task restoration requires an exact non-legacy `gcs_*` scope.
2. Tasks from sibling conversations or other groups never enter the projection.
3. Pending tasks and retrieved results are not restored.
4. The current compacting task is not duplicated as a child-status attachment.
5. The restored status set is bounded and recency ordered.
6. `tasks.json` and group-message JSON are never modified by the projection.
7. Receipts contain metadata and checksums, not task bodies.
8. Full and partial compact use the same projection semantics.
9. Main-Agent and fresh child-Agent prompts receive the restored status rows.
10. Global Agent remains global-only.

## Verification

New two-process acceptance test:

`npm run test:group-post-compact-task-status-restart`

It passed 28/28 checks covering running/completed/blocked inclusion, pending/retrieved/current-task exclusion, group/session isolation, body-free receipt verification, tamper and cross-session rejection, production compact completion, persistence, Main-Agent use, child-Agent use, raw task and transcript immutability, Memory Center visibility, restart durability, and sibling-session independence.

Regression evidence:

| Capability | Result |
| --- | --- |
| Phase 321 post-compact child-task status | 28/28 |
| Phase 320 summary input projection | 21/21 |
| Compact restart soak | 11/11 |
| Compact hook dual-session isolation | 27/27 |
| Phase 319 thinking-clear latch | 23/23 |
| Full frontend, MCP Feishu, and backend build | passed |
| Focused `git diff --check` | passed; line-ending warnings only |

## Production deployment

Phase 321 is deployed at `http://localhost:3081`.

- PID: `19928`
- home response: HTTP 200
- Memory Center overview response: HTTP 200
- `fetch-web-mcp`: connected
- `filesystem-mcp`: connected
- `mcp-feishu`: connected
- stderr: 0 bytes
- built assets: `MemoryCenter-y-4XTX-e.js` and `MemoryCenter-DLJKOVge.css`
- browser verification: an exact group session renders `Post-compact Child Task Status`; a historical session with no compact renders the expected waiting state
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase321.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase321.err.log`

## Completion statement

Phase 321 is complete. After compaction, CCM's group Main Agent no longer relies only on historical Worker prose to remember delegated work. It receives a bounded, exact-session, restart-durable snapshot of active and uncollected child tasks, matching the coordination purpose of Claude Code's async-Agent restoration while preserving CCM's multi-group isolation.

The current system remains production-usable. The long-term goal stays active for future Claude Code source changes and optional hardening, not because this phase is unfinished.
