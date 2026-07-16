# Phase 377: Task-Agent memory entry render transaction

Date: 2026-07-16

## Goal

Close the prepare-to-bind race left by Phase 376. For one exact task-Agent session, only one process may render a full, delta, or continuation memory Prompt against the current committed manifest head.

The transaction identity remains:

```text
group + gcs_* + task + tas_* + project
```

A renderer from another group chat, group-session conversation, task-Agent session, or project cannot reuse or replace the transaction. Global Agent context remains outside this path.

## Durable render lease

`prepareTaskAgentMemoryEntrySyncContext()` now records a `ccm-task-agent-memory-entry-render-lease-v1` inside the existing task-Agent session store. No independent sidecar is introduced.

The lease binds:

- a random `tamerl_*` lease ID;
- a monotonic per-`tas_*` fencing token;
- owner process ID and a 120-second lease window;
- exact group, `gcs_*`, task, `tas_*`, and project identities;
- semantic source-memory checksum;
- base snapshot ID/checksum and trusted manifest checksum;
- generated plan and current manifest checksums.

One exact process may idempotently prepare the same source and base again without consuming a new token. A live conflicting owner fails closed with `TASK_AGENT_MEMORY_ENTRY_SYNC_RENDER_BUSY` and does not change the persisted lease.

## Crash takeover

When a prepared lease owner has exited or the lease has expired, the next task retry recomputes the memory transport from the latest committed snapshot. It does not reuse the abandoned Prompt text.

The replacement lease:

- advances the fencing token;
- records `recovered_stale_lease_id`;
- preserves the old lease in bounded history;
- increments the takeover counter;
- obtains a fresh plan and Prompt against the current manifest head.

This covers both crash boundaries tested in this phase:

1. process exits after first full-memory prepare but before snapshot bind;
2. process exits after delta prepare but before snapshot bind.

## Bind fence

`bindTaskAgentMemoryContextSnapshot()` now accepts an entry-sync plan only when its durable render lease is still the current prepared lease and all of these values match:

- lease ID, fencing token, owner PID, status, and expiry;
- source-memory checksum;
- plan and current-manifest checksums;
- base snapshot ID and base-manifest checksum;
- the manifest recomputed immediately before snapshot persistence.

Successful bind consumes the prepared lease by changing it to `bound` and recording the snapshot identity. An abandoned Prompt from an older fencing token cannot bind after takeover. Its rejection also cannot mark the newer lease rejected, because rejection is conditional on the same lease ID and token.

## Claude Code comparison

Claude Code Team Memory uses per-entry checksums and refreshes the remote head after a concurrent update conflict. CCM has no equivalent remote organization/repository API, so Phase 377 applies the same stale-writer principle at the local Prompt-render boundary.

The local durable lease is a CCM-specific adaptation: it serializes renderers before Provider dispatch and fences stale Prompt commits after a process crash. It does not claim to reproduce a remote HTTP 412 protocol.

## Memory Center

Snapshot inventory and Memory Center now expose:

- prepared, active, bound, rejected, and stale lease counts;
- takeover and bounded-history counts;
- maximum fencing token;
- per-snapshot lease ID, owner, window, token, and recovered predecessor;
- the 120-second lease TTL policy.

Selected-group views use the same exact-group counters and do not aggregate another chat's `gcs_*` or `tas_*` state into the selected scope.

## Verification

New command:

```text
npm run test:task-agent-memory-entry-render-lease-restart
```

The multi-process harness covers:

- first lease at fencing token 1;
- dead-owner full-baseline takeover at token 2;
- same-owner idempotent prepare;
- committed full baseline;
- live delta owner at token 3;
- cross-process contender rejection without lease replacement;
- dead delta-owner takeover at token 4;
- recomputed and committed delta;
- rejection of the superseded Prompt after takeover;
- preservation of the newer bound lease after stale rejection;
- lease history, takeover, inventory, and Memory Center counters.

Result: `38/38`.

The test fixture deliberately keeps the stable entry larger than the changed entry so that it exercises the delta branch. The existing 80% capacity rule is unchanged: a delta close to the full projection still falls back to full memory injection.

## Regression summary

Current Phase 377 run:

- render transaction restart test: `38/38`;
- Phase 348 access evidence: `12/12`;
- Phase 349-354 snapshot, commit, Prompt, continuation, and envelope tests: `160/160`;
- Phase 355 Provider memory channel: `37/37`;
- Provider acknowledgement: `38/38`;
- direct durable spool: `39/39`;
- group-session lifecycle fence: `31/31`;
- compact-head fence: `38/38`;
- Phase 376 entry delta sync: `47/47`.

Current affected suite: `440/440`.

Targeted memory checks through Phase 377: `1041/1041`.

Full frontend, MCP, and backend builds pass. Backend and MCP TypeScript checks pass.

## Production state

No real Provider model call, account authorization, memory deletion, or production baseline mutation occurred in this phase. Provider delivery behavior is covered by deterministic local adapters and existing signed delivery evidence.

The running CCM process must restart before it loads the new backend and Memory Center bundle.

## Remaining parity work

- run account-authorized long-duration full/delta/continuation cycles across real Claude Code, Codex, and Cursor sessions;
- measure actual Provider token savings and Prompt-cache behavior using the configured per-model capacity policies;
- add bounded wait/retry presentation for a user-visible task that encounters a live render owner, while preserving fail-closed semantics;
- continue auditing future Claude Code Team Memory and compact changes.

The long-term Claude Code parity goal remains active.
