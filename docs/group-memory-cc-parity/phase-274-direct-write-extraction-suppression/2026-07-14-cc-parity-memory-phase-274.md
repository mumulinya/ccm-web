# CCM Memory Phase 274: Direct-Write Extraction Suppression

Date: 2026-07-14

## Objective

Align group-session memory extraction with Claude Code's `hasMemoryWritesSince` behavior. When a user turn has already completed a deterministic `/remember` or `/forget` commit, the later forked model extractor must not read the same transcript range and write the same memory a second time.

The stable scope remains `groupId + groupSessionId`. Only `gcs_*` sessions are accepted. Child Agent executions receive only their owning group-session memory; the global Agent remains global-context-only. Legacy `default` sessions are deleted without migration.

## Claude Code Reference

Reference files:

- `D:/claude-code/src/services/extractMemories/extractMemories.ts`
- `D:/claude-code/src/services/extractMemories/prompts.ts`
- `D:/claude-code/src/memdir/paths.ts`

Claude Code treats main-agent memory writes and background extraction as mutually exclusive for a transcript range. It skips the forked extractor and advances `lastMemoryMessageUuid` to the latest message.

CCM now applies the same scheduler-level rule, with stronger group-session and transaction proof binding for third-party child Agent workflows.

## Implementation

### Exact committed-write proof

`group-session-memory-model-extraction.ts` reads the current session's typed-memory ledger behind the artifact read-consistency barrier. Suppression is allowed only when all of these match:

- typed scope ID;
- user message ID;
- direct-memory request ID;
- request checksum;
- `remember` or `forget` action;
- committed ledger receipt.

`duplicate`, `rejected`, uncommitted, and cross-session requests cannot suppress extraction.

### Cursor advancement without model invocation

A committed direct write now:

- skips the model executor;
- advances the model-extraction cursor across the consumed range;
- preserves the ordinary extraction count;
- commits under the existing session extraction lease and fencing transaction;
- appends a chained `suppressed` history event;
- persists a checksummed suppression receipt in `updateCadence`.

The receipt binds the source message IDs, transcript checksum, direct-memory proofs, typed-ledger checksum, ledger mutation fence, extraction fence, cursor before/after, and suppression timestamp.

### Memory Center diagnostics

Fleet rows now expose:

- suppression total and active state;
- latest suppression receipt and checksum validity;
- proof count;
- cursor before/after;
- ledger fence and receipt checksum;
- last suppression timestamp.

A valid suppression is an independent successful terminal outcome. It does not count as model pending, model failure, or backoff. A corrupt receipt fails closed even when the session has no ordinary summary snapshot.

The frontend displays `direct skips` fleet totals and concise per-session proof/fence/cursor status.

## Verification

Primary self-test:

- `scripts/group-session-memory-direct-write-suppression-selftest.mjs`: 13/13 passed.

Covered cases:

- committed remember and forget skip model invocation;
- cursor advances and survives process restart;
- ledger proof and fencing bindings remain valid;
- chained history records suppression;
- Memory Center reports verified suppression;
- valid suppression is not model pending or failed;
- duplicate, rejected, uncommitted, and cross-session requests invoke the model path instead;
- a tampered suppression receipt fails closed.

Regression suites passed:

- group-session model extraction;
- group-session update cadence;
- direct-memory transaction;
- incremental distillation cursor;
- Memory Center session scope;
- typed-memory session recall;
- typed-memory multi-artifact transaction recovery.

Full frontend, Feishu MCP integration, and backend build passed. `git diff --check` reported no whitespace errors.

## Production State

- URL: `http://localhost:3081`
- PID: `33424`
- HTTP status: 200
- lifecycle heads: 2 checked, 2 valid, 0 failed
- active distillation locks: 0
- prepared artifact journals: 0
- artifact stage directories: 0
- stderr: empty
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected

## Result

Direct typed-memory writes and model extraction are now mutually exclusive for the same group-session transcript range. The system can prove why a model run was skipped, advance safely after restart, expose the decision in Memory Center, and fail closed if the proof is damaged.

This completes Phase 274 only. The long-term Claude Code memory-parity goal remains active.
