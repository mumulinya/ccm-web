# Phase 259: Task Agent Continuation Soak, Restart Recovery, and Output Drift

Date: 2026-07-14

## Goal

Strengthen CCM group-session memory toward Claude Code-style durable context use by proving that a project Task Agent can continue across multiple invocations, service restarts, compaction capacity changes, and third-party CLI output drift without crossing group or chat-session boundaries.

The long-term Claude Code memory parity goal remains active after this phase.

## Delivered

- Added a persistent, hash-chained continuation soak ledger scoped by `groupId--gcs_*--tas_*`.
- Recorded invocation prepare, context delivery, provider dispatch, terminal outcome, native continuation evidence, capacity prepare/commit, post-compact reinjection, startup recovery, and service epoch events.
- Added startup replay, chain verification, health reporting, and group-session artifact deletion.
- Upgraded native continuation evidence to version 3.
- Accepted Codex native continuation only from `thread.started.thread_id`.
- Accepted Cursor native continuation only from a top-level `session_id` on known JSON events.
- Preserved raw provider IDs for diagnostics when output is malformed, conflicting, or moved to an untrusted field, while refusing native-session reuse and falling back to scratchpad continuation.
- Reconciled continuation soak state during startup recovery.
- Exposed soak health, evidence-chain validity, provider turns, restart epochs, resume acknowledgements, capacity closure, output drift, and post-compact reinjection in Memory Center.
- Kept Global Agent isolated from group-chat transcript and continuation-soak bodies; it continues to use only global context for cross-group dispatch.

## Session Boundary

Each group chat can own multiple independent `gcs_*` sessions. Every Task Agent invocation receives memory derived from the selected group-session scope, while native provider continuation is additionally isolated by its Task Agent session scope.

Deleting a group-chat session removes its transcript and session-owned memory, compaction, typed-memory, delivery WAL, invocation lineage, recovery, continuation-soak, and boundary artifacts. When the deleted session is the final session in a group, CCM creates one fresh empty session instead of reviving the shared legacy `default` session.

## Legacy Data Decision

Per user direction on 2026-07-14, existing group-chat sessions were not migrated or retained. They were force-deleted through the production deletion closure:

| Group | Deleted session | Messages | Memory artifacts deleted | Fresh session |
| --- | --- | ---: | ---: | --- |
| `gmps7ha15` | `gcs_mriu5m33_ahy0yo` | 2 | 11 | `gcs_mrjwjlql_24y4hr` |
| `gmqbz18hj` | `gcs_mriu5m6i_2vpxc9` | 0 | 0 | `gcs_mrjwjlta_aadbjx` |
| `gmr02wpbv` | `gcs_mriu5m94_sfq6ix` | 0 | 0 | `gcs_mrjwjlwd_ahhjax` |

After cleanup, every manifest contains exactly one empty, non-legacy session and no legacy/default session.

## Verification

- Phase 259 continuation soak/restart/output-drift self-test: 40/40 passed.
- Phase 258 regression: 33/33 passed.
- Phase 257 regression: 28/28 passed.
- Invocation recovery: 32/32 passed.
- Invocation adoption: 42/42 passed.
- Invocation lineage: 22 checks passed.
- Delivery lease: 54/54 passed.
- Direct dispatch spool: 39/39 passed.
- Dispatch WAL: 39/39 passed.
- Model-aware budget: 42/42 passed.
- Model capability cache, recovery, and race suites passed.
- Memory Center multi-session isolation: 13 checks passed.
- `npm run check` passed.
- `npm run build` passed.

The final Phase 259 report contained one valid health chain, four provider turns, two service epochs, three trusted resume acknowledgements, four post-compact reinjection proofs, a 1/1 capacity prepare/commit closure, zero output-drift violations, and a valid hash chain.

## Remaining Long-Term Work

- Run longer production soaks against real third-party Codex, Cursor, and Claude Code CLI versions.
- Version and monitor additional provider output contracts as those CLIs evolve.
- Continue tuning model-aware compaction and recall using real long-session token and retrieval-quality evidence.

