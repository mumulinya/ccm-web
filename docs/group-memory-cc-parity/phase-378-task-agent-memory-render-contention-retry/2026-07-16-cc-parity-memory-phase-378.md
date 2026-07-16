# Phase 378: Task-Agent memory render contention retry

Date: 2026-07-16

## Goal

Turn the Phase 377 exact-`tas_*` render lease from an immediate cross-process busy failure into a short, bounded, observable retry that never weakens fencing or group-session isolation.

The path remains limited to a task-Agent handoff carrying both a `tas_*` identity and group-session memory. Global Agent context has neither and does not enter this retry path.

## Claude Code comparison

Claude Code Team Memory handles a remote `412 Precondition Failed` with at most two conflict retries. Each retry first probes the current per-entry checksum head, recomputes the delta, and stops when the conflict budget is exhausted.

CCM has a local durable render lease rather than a remote ETag endpoint. Its equivalent policy is:

1. attempt to prepare against the current committed snapshot and manifest head;
2. when another process owns the exact `tas_*` lease, wait briefly;
3. reacquire the session-store lock and read the durable lease head again;
4. recompute the full/delta/continuation plan after owner completion or death;
5. perform at most two head rechecks, then fail closed.

No stale Prompt, manifest, or lease body is reused by the retry loop.

## Retry policy

The production worker handoff now uses `prepareTaskAgentMemoryEntrySyncContextWithRetry()`.

Default policy:

```text
max conflict retries: 2
base delay: 80ms
delay cap: 240ms
jitter per wait: 0-40ms
maximum normal cumulative wait: 320ms
```

The first retry waits 80-120ms. The second waits 160-200ms. The wrapper releases the session-store lock before every wait and reruns the original durable prepare operation after waking.

An active lease owned by the same PID is not waited on. Blocking the same Node.js event loop could not let its current renderer progress, so the conflict returns immediately with `same_process` status and zero retries.

When the retry budget is exhausted, the original `TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY` remains authoritative. The contender does not replace the live owner, advance the fencing token, or dispatch a Provider request.

## Contention receipt

Every wrapper call that observes a conflict records one `ccm-task-agent-memory-entry-render-contention-v1` receipt in the exact task-Agent session.

The receipt binds:

- result: `resolved`, `timeout`, or `same_process`;
- group, `gcs_*`, task, `tas_*`, and project identities;
- contender and owner PIDs;
- blocked lease ID and fencing token;
- source-memory semantic checksum;
- retry count, accumulated wait, and observation time;
- SHA-256 contention checksum.

`verifyTaskAgentMemoryEntryRenderContentionReceipt()` validates schema, checksum, identity, process and lease fields, retry bounds, source checksum, time, and the zero-wait same-process invariant. A modified wait duration or identity fails verification.

The session store also retains cumulative contention, resolved, timeout, same-process, and wait-millisecond counters. Only the latest detailed receipt is retained, while aggregate counts remain bounded with the existing session lifecycle.

## Isolation repair

Inventory now aggregates render leases and contention metrics by `groupId` from task-Agent sessions, including sessions that have prepared memory but do not yet have a snapshot.

The selected-group Memory Center projection no longer falls back to fleet-wide lease counters when the selected group has zero. This removes a subtle cross-group presentation leak left by the initial Phase 377 counter wiring.

The first successful memory prepare also persists the exact `gcs_*` on the `tas_*` session before snapshot bind, so a pre-bind contention receipt is already group-session bound.

## Memory Center

Fleet and selected-group views expose:

- contention count;
- wait-resolved count;
- timeout count;
- same-PID conflict count;
- total wait milliseconds;
- valid and invalid latest contention receipt counts;
- existing active lease, takeover, history, and fencing metrics.

The inventory policy discloses the retry count, delays, jitter, and lease TTL independently.

## Verification

New command:

```text
npm run test:task-agent-memory-entry-render-contention-retry
```

The multi-process harness covers:

- another process owning fencing token 1;
- production handoff observing contention and recovering after owner exit;
- fresh plan takeover at fencing token 2;
- a live owner outlasting both retries and remaining unchanged;
- signed timeout evidence on the thrown busy error;
- same-PID source conflict returning without sleep or token advance;
- checksum tamper rejection;
- three groups retaining independent resolved, timeout, and same-process metrics;
- exact-group Memory Center filtering;
- production source use of the retry wrapper and exact `tas_*` propagation.

Result: `41/41`.

Observed deterministic run:

```text
resolved wait: 256ms
timeout wait: 252ms
same-process wait: 0ms
```

Jitter makes the first two values vary within the documented bound.

## Regression summary

Focused Phase 378 run:

- contention retry: `41/41`;
- Phase 376 entry delta sync: `47/47`;
- Phase 377 render lease and crash takeover: `38/38`;
- monotonic snapshot commit: `22/22`;
- Provider memory-channel acknowledgement: `38/38`;
- direct durable dispatch spool: `39/39`.

Focused total: `225/225`.

Targeted memory checks through Phase 378: `1082/1082`.

Full frontend, MCP, and backend builds pass. Backend and MCP TypeScript checks pass.

## Production state

No real Provider model call, account authorization, memory deletion, or production baseline mutation occurred in this phase. The production bundle was rebuilt, and the running CCM process must restart before loading it.

## Remaining parity work

- run authorized, long-duration full/delta/continuation cycles across real Claude Code, Codex, and Cursor sessions;
- measure actual Provider token use and Prompt-cache behavior under configured model capacities;
- correlate real Provider latency with contention receipts and tune the bounded delays only from measured evidence;
- continue auditing future Claude Code Team Memory and compact behavior.

The long-term Claude Code parity goal remains active.
