# Phase 388: Exact-session compaction cancellation

Date: 2026-07-17

## Goal

Give every Group Main Agent conversation a Claude Code-style compaction abort path that remains exact to `groupId + gcs_*`, works across CCM server processes, reaches the model request and compact hooks, and never turns a user cancellation into memory degradation or a circuit-breaker failure.

The Global Agent remains global-context-only. This cancellation protocol does not expose group memory or group transcript state to the Global Agent.

## Claude Code source audit

The local Claude Code implementation was re-audited at:

- `D:\claude-code\src\services\compact\compact.ts`;
- `D:\claude-code\src\QueryEngine.ts`.

Claude Code passes one compact abort controller into both the forked-agent and streaming summarizer paths, passes its signal to PreCompact and PostCompact hooks, and rejects an aborted synthetic response instead of accepting it as a summary.

CCM already had Phase 386 lifecycle invalidation and Phase 387 activity keep-alive. The remaining gap was an intentional, user-addressable cancellation path. Timeout or lifecycle invalidation could stop a request, but a user could not cancel one exact group conversation without waiting or affecting failure telemetry.

## Durable cancellation request

`requestGroupCompactionCancellation()` writes a body-free cancellation request into the exact activity ledger under its file lock. It binds:

- group and `gcs_*` conversation;
- current `acba_*` compaction operation;
- `gcca_*` cancellation request ID;
- request time and actor;
- SHA-256 checksum of the reason.

The reason body is not persisted in the activity ledger. Repeating a request for the same operation is idempotent. A stale operation ID or conversation without an active compact cannot latch cancellation onto a later compact.

## Abort propagation

Every admitted compact now owns an outer `AbortController`. A configurable exact-session cancellation poll checks the durable ledger throughout the operation; the production default is 500 ms.

The same signal reaches:

- the model summary HTTP request;
- the model wait heartbeat path;
- PreCompact hooks;
- PostCompact hooks.

The HTTP client bridges the external signal into its timeout controller and rethrows the original `GROUP_COMPACTION_CANCELLED` reason. Model fallback logic is forbidden from converting that cancellation into a deterministic successful compact.

Hooks receive `signal` and can stop their own asynchronous work. The hook ledger records `cancelled` independently from `failed`, including separate phase and total statistics.

## Commit and failure semantics

A cancelled operation returns:

```text
success=false
compacted=false
cancelled=true
reason=compaction_cancelled
```

It does not:

- save changed group memory;
- create or advance a compact head;
- commit a compact boundary;
- increment model-compaction failures;
- degrade memory health;
- record a circuit-breaker failure;
- immediately restart a pending compact for the same cancellation.

The durable activity moves to terminal `cancelled`. A later explicit or automatic compact may start normally, so cancellation is not a permanent session latch.

## Memory Center

The selected group conversation now shows `cancelling` while a request is pending and `cancelled` in terminal history. A running activity exposes a Stop control that sends `cancel_compaction` through the existing Memory Center operation API with the exact activity operation ID.

The operation requires a reason, is restricted to a `gcs_*` scope, and records an audit event with body-free cancellation evidence.

## Verification

Phase 388 command:

```text
npm run test:group-compaction-exact-session-cancellation-restart
```

Result: `24/24`.

The dedicated test proves:

- a second Node process cancels an in-flight local HTTP model request through the real Memory Center API;
- the HTTP transport aborts before the delayed response;
- memory, compact head, and circuit-breaker artifacts remain byte-stable;
- the cancellation ledger is checksummed, body-free, exact-session, and idempotent;
- a long PreCompact hook receives the abort signal and records `cancelled`, not `failed`;
- sibling conversations remain independent;
- cancellation evidence survives restart;
- the same conversation can compact successfully afterward.

Compatibility regression:

- Phase 387 compaction activity keep-alive: `23/23`;
- Phase 386 compaction session lifecycle fence: `32/32`;
- Phase 320 compaction summary input projection: `21/21`;
- Phase 302 auto-compact circuit breaker: `12/12`;
- Phase 295 compact restart soak: `11/11`;
- Phase 275 auto-compaction exact-session scope: `12/12`;
- Phase 332 post-compact session reset: `14/14`;
- Phase 265 Task Agent lifecycle fence: `31/31`;
- Phase 264 compact-head fence: `38/38`;
- Phase 292 compact-hook session isolation: `27/27`.

Compatibility total: `221/221`.

Phase 376-388 focused memory chain: `644/644`.

Targeted memory checks through Phase 388: `1500/1500`.

The Phase 302 fixture now injects its failing compact runner explicitly instead of mutating a read-only split-module re-export.

Engineering verification passed:

- backend TypeScript build;
- frontend production build;
- MCP Feishu TypeScript build;
- `check:split`, split export ordering, and all factory dependency checks;
- GroupChat binding check: `240` resolved bindings;
- documentation links: `1074/1074`;
- local Memory Center browser render with zero new console errors.

The browser pass also caught and fixed an existing setup-order TDZ in the live-memory cost approval predicate. The predicate is now initialized before the context-settings composable consumes it; approval semantics and paid Provider authorization remain unchanged.

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. The model cancellation test uses a local delayed OpenAI-compatible HTTP fixture.

The long-term Claude Code parity goal remains active.
