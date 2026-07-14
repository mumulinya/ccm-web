# Phase 269: Incremental Typed-Memory Distillation Cursor

Date: 2026-07-14

## Goal

Bring CCM long-term group-log distillation in line with Claude Code's current `extractMemories` behavior. Building a child-Agent context repeatedly must not reprocess the same conversation range, inflate fact frequency, or advance past data that was not durably written.

The cursor remains scoped by the typed-memory identity, which is `groupId + groupSessionId` for group sessions.

## Claude Code Reference

Reference: `D:/claude-code/src/services/extractMemories/extractMemories.ts`.

Claude Code keeps `lastMemoryMessageUuid`, counts only model-visible messages after that cursor, falls back to the available transcript when compaction removed the cursor, advances only after successful extraction, and runs a trailing extraction when work arrived during an active run.

Phase 269 applies those invariants to CCM typed `MEMORY.md` log distillation.

## Previous Gap

`distillGroupMessagesToTypedMemory()` stored `lastDistilledMessageId` but did not use it when selecting input. Every child context build rescanned up to 5000 recent messages. Since candidate keys already include `messageId`, this did not create new rows, but it incremented each fact and rejected-observation `count` again.

That made context construction frequency look like repeated user evidence and could distort long-term recall and admission diagnostics.

## Implementation

### Durable incremental cursor

The distillation ledger now records `ccm-group-typed-memory-distillation-cursor-v1` with:

- previous and new committed message IDs;
- cursor-found and cursor-missing fallback state;
- eligible, pending, processed, and remaining message counts;
- batch-limit and force-rescan evidence;
- cumulative processed-message count.

Only messages after the committed cursor are processed. If the cursor is absent because transcript compaction removed it, CCM processes the available transcript instead of becoming permanently idle.

### Oldest-first bounded batches

When a delta exceeds the configured batch size, CCM processes the oldest unprocessed messages first and advances only to that batch's final message. No middle range is silently skipped.

`distillGroupMessagesToTypedMemoryUntilCaughtUp()` performs bounded trailing batches before child-Agent recall. The default cap is eight batches and can be configured up to 32.

### Commit ordering and idempotency

Typed Markdown documents and the index are written before the new cursor is committed to the ledger. A write failure leaves the old cursor intact, so the same messages are retried.

A fact key already binds one source `messageId`; retries therefore preserve `count=1`. Rejected admission observations follow the same rule. Historical inflated counts are normalized and recorded in `duplicateInflationRepair` on the next distillation maintenance pass.

### Context-bundle integration

`buildAgentMemoryContextBundle()` now uses bounded catch-up before typed-memory recall. A fresh third-party project Agent session therefore receives the latest successfully distilled memory, not an intermediate backlog batch.

## Verification

New command:

```text
npm run test:group-typed-memory-incremental-distillation
```

Phase 269 checks 13 invariants:

- oldest pending batch first;
- lossless backlog advancement;
- identical input is a no-op;
- appended-message-only processing;
- cumulative cursor accounting;
- forced retry does not inflate facts or rejections;
- historical duplicate inflation repair;
- missing-cursor transcript fallback;
- failed durable commit does not advance the cursor;
- bounded catch-up reaches the latest message before recall;
- group-session isolation;
- raw transcript immutability.

Adjacent regression evidence:

- existing typed log distillation: 10/10 passed;
- long-term write admission: 22/22 passed;
- positive feedback binding: 21/21 passed;
- positive feedback lifecycle and revocation: 19/19 passed;
- multi-group/multi-session context budget and ownership: 12/12 passed;
- TypeScript check: passed.

Production audit found 22 typed-memory ledgers, no cursor-format ledgers yet, and one old probe ledger containing three inflated facts. Active ledgers adopt the new cursor without migration by using their existing `lastDistilledMessageId`; historical inflated rows are repaired on their next maintenance pass.

## Stable Memory

- Context construction is not evidence repetition.
- A typed-memory fact tied to one message cannot gain confidence merely because another child Agent context was built.
- Distillation cursors are session-scoped and only move after durable Markdown/index writes.
- Missing cursors recover from available transcript data instead of disabling extraction.
- Child-Agent context recall occurs after bounded distillation catch-up.
- The long-term Claude Code parity goal remains active.
