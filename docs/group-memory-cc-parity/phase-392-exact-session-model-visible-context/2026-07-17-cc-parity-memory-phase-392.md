# Phase 392: Exact-session model-visible context

Date: 2026-07-17

## Goal

Make Memory Center report the context that a child Agent model actually receives after final-dispatch Context Collapse and reactive recovery, while preserving strict `groupId + gcs_*` isolation.

Before this phase, final prompt gates were captured per `tas_*`, but the Memory Center detail path requested the snapshot overview by `groupId` only. Selecting one exact group-chat session could therefore aggregate final-prompt capacity evidence from a sibling `gcs_*`.

## Claude Code reference

The executable comparison is based on:

- `D:/claude-code/src/query.ts`: the API view applies collapse before autocompact and carries that projected message set into the Provider call;
- `D:/claude-code/src/commands/context/context-noninteractive.ts`: `/context` analyzes the collapsed and microcompacted API view rather than the raw transcript;
- the same command reports the active context strategy, collapsed spans, staged spans, and collapse health.

The local `src/services/contextCollapse/*` and `snip*` files remain generated stubs. Phase 392 follows the query and `/context` contracts and does not claim line-for-line algorithm parity with unavailable implementation code.

## Exact-session diagnostics

`buildGroupTaskAgentMemoryContextSnapshotOverview()` now accepts an optional exact `gcs_*` and passes it through the authoritative task-Agent snapshot inventory filter.

Memory Center diagnostics call it with the selected `resolvedSessionId`. Rows, weak rows, retention rows, aggregate counts, and the latest final-dispatch model view are therefore restricted to the selected `groupId + gcs_*`.

A group-only caller remains available for fleet reporting and can still aggregate all sessions deliberately.

## Model-visible context proof

Task-Agent snapshot rows now expose body-free final gate metadata:

- Provider and model;
- raw and effective context windows;
- reserved output and autocompact buffer;
- final prompt tokens, Provider envelope tokens, threshold, and remaining tokens;
- capacity source and evidence checksum;
- final gate ID/checksum and prompt checksum;
- reactive recovery stages;
- nested Context Collapse mode, entry ID, lifecycle generation, and token reduction.

The exact-session overview derives `ccm-exact-session-final-dispatch-model-view-v1`. It contains no prompt, memory, transcript, or collapse projection body. Its checksum is stable across restart.

The view fails closed when gate proof is invalid or any cross-session row is detected. Pressure is computed against the model-specific autocompact threshold, not a fixed global byte size.

## Memory Center

The compression-boundary view now includes `模型最终可见上下文` before the durable Context Collapse ledger.

It displays:

- final model prompt tokens and threshold;
- pressure percentage and remaining tokens;
- effective/raw window and output reservation;
- Provider and model identity;
- direct, Context Collapse, or reactive strategy;
- exact-session and gate-proof status.

This separates the original transcript size from the actual projected prompt seen by the child Agent model.

## Snapshot self-test repair

The split Memory Center Phase 315 task-Agent snapshot self-test had stale dynamic require paths and did not prepare the current per-entry memory sync manifest. Phase 392 repairs only that directly affected self-test path and updates its fixture to use the production entry-sync preparation step.

The original six assertions now execute and pass again.

## Verification

Phase 392 command:

```text
npm run test:final-dispatch-model-view-exact-session-restart
```

Result: `26/26`.

Coverage includes:

- two sibling `gcs_*` sessions with independent `tas_*` snapshots;
- Codex 64K and Cursor 1M capacity identities cannot leak across sessions;
- the exact-session model view contains one matching sample only;
- final prompt tokens and threshold equal the authoritative final Provider gate;
- Context Collapse generation and recovery stages remain visible without bodies;
- prompt and memory sentinels are absent from the derived view;
- Memory Center scope API returns the exact-session report;
- checksum survives a fresh Node process restart;
- frontend wiring is present.

Compatibility regression:

- Phase 390 durable Context Collapse: `26/26`;
- Phase 391 Context Collapse lifecycle race: `28/28`;
- Phase 316 final dispatch reactive compact: `19/19`;
- Phase 317 reactive compact circuit breaker: `18/18`;
- Phase 386 group-session lifecycle fence: `32/32`;
- original Memory Center task-Agent snapshot self-test: `6/6`.

Compatibility total: `129/129`.

Phase 376-392 focused memory chain: `748/748`.

Targeted memory checks through Phase 392: `1604/1604`.

## Browser acceptance

Memory Center was rendered against an isolated server with two real sibling exact-session snapshots.

- session A: Codex `phase392-codex-model`, `7,367 / 48,000` prompt tokens, `15.3%` pressure, `56,000` effective window, `collapse committed`, one exact-session sample;
- session B: Cursor `phase392-cursor-model`, `18 / 800,000` prompt tokens, `0.0%` pressure, `900,000` effective window, direct strategy, one exact-session sample;
- switching to session B exposed no Codex model identity or Codex token count;
- both views reported exact-session `verified` and proof `valid`;
- console errors: `0` for both views.

The first browser pass found that `MemoryCenterPanel.vue` had not destructured the three new composable fields. The API and build were correct, but the panel was absent. The shell binding and the dedicated test were updated, then the browser acceptance was rerun successfully. This prevents a source-only false positive.

The isolated server and temporary CCM home were removed after acceptance.

## Engineering verification

- backend TypeScript build: passed; one known transient Windows `TS5033 UNKNOWN open` was retried successfully;
- frontend production build: passed (`2064` modules transformed);
- documentation links: `1078/1078`;
- split-export checks: passed;
- all factory dependency checks: passed;
- Phase 392 focused checks: `26/26`;
- compatibility checks: `129/129`.

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. The long-term Claude Code parity goal remains active.
