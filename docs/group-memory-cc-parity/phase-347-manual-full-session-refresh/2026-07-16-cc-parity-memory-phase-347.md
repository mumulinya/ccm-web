# CCM Memory Phase 347: Manual Full-Session Refresh

Date: 2026-07-16

## Goal

Align manual Session Memory extraction with Claude Code by allowing a user to re-extract any non-empty exact conversation, even when no messages were added after the last safe extraction cursor, while preserving incremental automatic extraction.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code's `manuallyExtractSessionMemory(messages, toolUseContext)` rejects only `messages.length === 0`. It passes the complete current `messages` array to `runForkedAgent()` as `forkContextMessages`. It does not reject a refresh because the previous Session Memory cursor already points to the current tail.

## Previous Gap

Phase 345 introduced a safe manual extraction command but reused CCM's automatic incremental range after `lastExtractionMessageId`. When that range was empty it returned `manual_extraction_no_new_messages`.

That prevented a user from intentionally regenerating stale, weak, or incorrectly emphasized Session Memory without first adding an artificial chat message. It also meant the manual model saw only the incremental range, unlike Claude Code's complete current conversation.

## Implementation

The extraction path now separates two source-range contracts:

- automatic extraction uses `incremental_after_safe_cursor` and only sends messages after the committed cursor;
- manual extraction uses `full_session_refresh` and sends the bounded complete current exact-session transcript.

Only a completely empty conversation fails manual extraction. If no messages were added after the prior cursor, the model still runs, the snapshot and receipt are recommitted, the extraction count advances, and the safe cursor remains bound to the same tail message.

The request audit records:

- `sourceRangeMode`
- `incrementalSourceMessageCount`
- `manualRefreshWithoutNewMessages`
- `priorSafeCursor`

New v3 model extraction receipts bind the range mode and no-new refresh state. The verifier requires manual receipts to use `full_session_refresh`, automatic receipts to use `incremental_after_safe_cursor`, and the no-new flag to exactly match a manual run with zero incremental messages. Recomputing a checksum cannot turn a manual full refresh into an automatic range without failing semantic verification. Historical v1 and v2 receipts remain compatible.

## Memory Center

The confirmation dialog and tooltip now state that manual extraction reprocesses the complete current exact-session record. Fleet reporting exposes the latest range mode, incremental message count, and no-new refresh state. Fleet cards count complete manual refreshes and no-new manual refreshes separately from direct-write suppression bypasses.

## Isolation And Safety

Manual full-session input still uses CCM's structured transcript budget, tool-use/tool-result boundary protection, exact `group--gcs_*` scope, extraction lease and fencing token, merge-quality gate, staged snapshot commit, typed-memory deduplication, replay artifacts, and safe cursor resolver.

Automatic cadence remains incremental. Sibling sessions are not read or modified. Global Agent cannot invoke the operation and receives neither the full group transcript nor its Session Memory body.

## Verification

Dedicated restart test:

```text
PHASE347_RESULT={"checks":15,"passed":15}
```

Coverage includes first manual full-session extraction, repeated no-new refresh, stable safe cursor, distinct signed receipts, v3 verification, semantic range tamper rejection after checksum recomputation, v2 compatibility, fresh-process evidence, Memory Center no-new visibility, automatic incremental preservation, raw transcript immutability apart from an explicit append, sibling isolation, complete-session UI semantics, Global Agent exclusion, and legacy-default absence.

Adjacent regressions:

```text
Phase 345 manual extraction: 15/15
Phase 346 manual suppression bypass: 16/16
Base model extraction: 12/12
```

Release verification:

```text
npm run build: passed
npm run check: passed
npm run docs:check: 332 parity documents, 1026 links, 0 failures
desktop 1280x720: complete-session action and manual refresh fleet card visible, no horizontal overflow, 0 console errors
mobile 390x844: action and card in bounds, no horizontal overflow, 0 console errors
```

## Result

Manual Session Memory extraction is now a true refresh command rather than an incremental-only update. A user can regenerate an existing conversation's memory whenever needed, while scheduled extraction continues to process only new exact-session messages and all cursor, budget, replay, and isolation guarantees remain intact.
