# Phase 390: Durable final-dispatch context collapse

Date: 2026-07-17

## Goal

Add the missing durable context-collapse stage before full final-dispatch reactive projection. Historical group-chat context can now be projected once, replayed across later child-Agent sessions, and discarded from the model input without modifying the exact `gcs_*` transcript.

The Global Agent remains global-context-only. It does not read this group-session ledger.

## Claude Code reference

The comparison focused on:

- `D:/claude-code/src/query.ts`: context collapse runs after microcompact and before autocompact, so a granular projected view can avoid an unnecessary full summary;
- `D:/claude-code/src/query.ts`: a prompt-too-long recovery drains context-collapse work before reactive compact;
- `D:/claude-code/src/services/contextCollapse/persist.ts`: collapsed state is intended to survive independently from one transient prompt;
- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts`: one Session Memory section uses a 2,000-token compact projection budget.

The checked `contextCollapse` implementation files in this local Claude Code tree are stubs, so Phase 390 follows the executable query-loop contract and does not claim line-for-line implementation parity.

## Durable exact-session store

Added `backend/agents/final-dispatch-context-collapse.ts`.

Each ledger is isolated by `groupId + gcs_*` and records committed historical-prefix projections with:

- exact source-prefix line count and SHA-256;
- bounded projection text and checksum;
- original/projected token and character counts;
- omitted-line count and trigger;
- task, `tas_*`, and WorkerContextPacket bindings;
- entry checksum, ledger checksum, revision, atomic primary/backup writes.

The original group-chat content is not copied into the ledger. It remains in the exact session transcript. Only the bounded projected prefix needed for later model input is durable.

## Read-time replay

On a later child-Agent dispatch, CCM re-hashes the first `source_prefix_line_count` lines of the current exact-session context. The stored projection is replayed only when that checksum matches.

This allows newly appended tail context to remain visible while reusing the already collapsed historical prefix. A sibling `gcs_*`, another group, a changed prefix, or a corrupt ledger cannot reuse the projection.

Primary corruption with a valid backup is diagnostic and fail closed. CCM exposes the backup evidence but refuses to project from it until the primary is repaired.

## Capacity limits

Durable collapse is deliberately bounded:

- maximum projection budget per committed prefix: `2,000` tokens;
- maximum retained entries per exact group session: `24`;
- the dedicated stress check proves the retained ledger remains below `512 KiB` after 30 distinct commits.

These limits apply to the durable projection store, not to the original transcript. They prevent context collapse from becoming another multi-megabyte memory file.

## Production pipeline

`recoverFinalWorkerDispatchPayload()` now executes:

1. derive the model-specific final-dispatch context budget;
2. commit or reuse an exact-session durable collapse;
3. render and measure the collapsed model input;
4. apply the existing reactive projection only if more reduction is needed;
5. verify the final payload gate before the Provider call.

The existing reactive-compact receipt carries a body-free nested `context_collapse` receipt and ordered `recovery_stages`. Task-Agent memory snapshots therefore preserve the exact context-collapse proof together with the final prompt gate.

No paid Provider call is needed to exercise this path.

## Lifecycle and observability

- deleting a `gcs_*` memory scope deletes its context-collapse primary and backup;
- Memory Center diagnostics read only the selected exact-session ledger;
- the Memory Center panel displays committed spans, original/projected totals, omitted lines, revision, checksum, and recent entries.

## Verification

Phase 390 command:

```text
npm run test:final-dispatch-context-collapse-restart
```

Result: `26/26`.

Coverage includes:

- exact-session commit and body-free receipt verification;
- current constraint and latest task preservation in the real model view;
- committed-prefix replay and appended-tail continuity;
- sibling group and sibling `gcs_*` isolation;
- stronger follow-up collapse and checksum validation;
- 2,000-token per-span budget and 24-entry retention;
- sub-megabyte on-disk bound after 30 commits;
- reactive pipeline ordering and nested receipt verification;
- corrupt-primary fail-closed behavior;
- restart replay and lifecycle deletion;
- Memory Center and production wiring.

Compatibility regression:

- Phase 316 final worker dispatch reactive compact: `19/19`;
- Phase 317 reactive compact circuit breaker: `18/18`;
- Phase 386 group-session lifecycle fence: `32/32`.

Compatibility total: `69/69`.

Phase 376-390 focused memory chain: `694/694`.

Targeted memory checks through Phase 390: `1550/1550`.

## Browser acceptance

The Memory Center was rendered in headless Chrome at `1440x1000` with an isolated exact-group-session diagnostics response.

- `Agent 记忆控制中心` was visible exactly once;
- the selected scope was `phase390-browser::gcs_phase390_browser`;
- the `最终派发 Context Collapse` panel was visible;
- the panel rendered `2 spans` and the exact-session ID;
- console and page errors: `0`.

## Engineering verification

- backend TypeScript build: passed;
- frontend production build: passed (`2063` modules transformed);
- split-export checks: passed;
- all factory dependency checks: passed;
- documentation links: `1076/1076`;
- focused and compatibility checks: `95/95` (`26 + 19 + 18 + 32`).

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. The long-term Claude Code parity goal remains active.
