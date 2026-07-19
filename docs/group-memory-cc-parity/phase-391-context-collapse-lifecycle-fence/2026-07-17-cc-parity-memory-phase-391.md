# Phase 391: Context-collapse lifecycle fence

Date: 2026-07-17

## Goal

Close the race between durable final-dispatch Context Collapse and exact group-chat session archive/delete transitions. A stale child-Agent dispatch must never commit or replay collapsed context after its `gcs_*` session has left the active lifecycle generation.

The scope remains `groupId + gcs_*`. Sibling sessions and sibling groups stay isolated. The Global Agent remains global-context-only and does not read this ledger.

## Commit ordering

`commitFinalDispatchContextCollapse()` now commits through this order:

1. acquire the exact `gcs_*` lifecycle commit fence;
2. verify that lifecycle status, generation, head ID, and head checksum are still current and active;
3. acquire the Context Collapse ledger file lock;
4. re-read and validate the ledger;
5. atomically write the new revision.

This ordering makes the lifecycle head authoritative. An archive or delete transition either happens before the commit and rejects it as stale, or happens after a completed old-generation commit and prevents that entry from being projected.

## Durable lifecycle binding

Each committed span and body-free receipt now records:

- `lifecycle_generation`;
- `lifecycle_status`;
- `lifecycle_head_id`;
- `lifecycle_head_checksum`.

Ledger and receipt verification reject missing or invalid lifecycle bindings. Read-time projection requires the current head to be active and to match all four values. These runtime diagnostics are excluded from the durable ledger checksum so Memory Center inspection does not mutate the stored proof.

## Archive, delete, and restore semantics

- `deleted`: late commits fail closed, projection is disabled, and primary/backup collapse files cannot reappear after cleanup;
- `archived`: late commits and projection are disabled while the old-generation ledger may remain as historical evidence;
- restored `active`: lifecycle generation advances, so old-generation spans cannot replay;
- a fresh commit in the restored generation creates a new valid span and can survive restart;
- active sibling `gcs_*` sessions continue to commit and project independently.

Memory Center now exposes the current lifecycle status and generation in the Context Collapse summary and the generation/head binding on each retained span. Archived or deleted selections render a warning instead of implying that historical spans are currently eligible for prompt injection.

## Verification

Phase 391 command:

```text
npm run test:final-dispatch-context-collapse-lifecycle-race-restart
```

Result: `28/28`.

The test uses separate Node processes and a shared barrier for real commit/delete and commit/archive races. Coverage includes:

- both race participants complete without an in-process shortcut;
- delete tombstone wins final state and prevents ledger resurrection;
- archived/deleted sessions cannot project or accept late commits;
- an old-generation archive span does not replay after restore;
- restore advances generation and accepts a fresh bound span;
- body-free receipt lifecycle proof verifies;
- active sibling isolation;
- lock ordering inspection;
- restart persistence for tombstone, restored generation, and fresh projection;
- Memory Center lifecycle summary and per-row generation wiring.

Compatibility regression:

- Phase 390 durable final-dispatch Context Collapse: `26/26`;
- Phase 316 final worker dispatch reactive compact: `19/19`;
- Phase 317 reactive compact circuit breaker: `18/18`;
- Phase 386 group-session lifecycle fence: `32/32`.

Compatibility total: `95/95`.

Phase 376-391 focused memory chain: `722/722`.

Targeted memory checks through Phase 391: `1578/1578`.

## Browser acceptance

Memory Center was exercised against an isolated server and temporary CCM home with two real exact-session ledgers.

- restored active session: `1 span`, lifecycle `active`, generation `3`, checksum valid;
- archived session: `1 span`, lifecycle `archived`, generation `2`, while the retained historical row remains explicitly bound to generation `1`;
- both exact `gcs_*` scopes were listed independently;
- browser console errors: `0` for both states;
- the isolated server and temporary CCM home were removed after acceptance.

## Engineering verification

- backend TypeScript build: passed;
- frontend production build: passed (`2064` modules transformed);
- documentation links: `1077/1077`;
- split-export checks: passed;
- all factory dependency checks: passed;
- Phase 391 focused checks: `28/28`;
- compatibility checks: `95/95` (`26 + 19 + 18 + 32`).

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. The long-term Claude Code parity goal remains active.
