# CCM Memory Phase 339: Safe Extraction Cursor Advance

Date: 2026-07-15

## Goal

Align CCM with Claude Code's Session Memory cursor safety rule: a successful memory extraction may update the summary, token baseline, timestamp, and extraction count while keeping the extraction cursor at the previous safe message when the latest assistant turn still contains tool calls.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code calls `updateLastSummarizedMessageIdIfSafe()` after Session Memory extraction. The helper advances `lastSummarizedMessageId` only when the latest assistant turn has no `tool_use` blocks. This prevents later extraction or compaction from starting at a lone `tool_result` whose matching assistant tool request was skipped.

## Previous Gap

CCM already delayed low-token and low-tool-call updates, but after an extraction became due it always copied `lastObservedMessageId` into `lastExtractionMessageId`. A busy assistant tool turn therefore became the next source boundary even though its tool results might arrive later. The signed model receipt repeated the same unsafe cursor.

## Implementation

`resolveGroupSessionMemoryExtractionCursor()` now provides one cursor decision for deterministic snapshots and forked model extraction receipts:

```text
not_extracted           -> keep the previous cursor
advanced                -> move to the last observed message at a natural break
held_tool_use_boundary  -> extraction commits, but keep the previous cursor
```

The durable cadence state records:

- `cursorAdvanceStatus`
- `cursorAdvanceSafe`
- `cursorBefore`
- `cursorAfter`
- `cursorHeldReason=last_assistant_turn_has_tool_calls`

When the cursor is held, `tokensAtLastExtraction`, `lastExtractedAt`, and `extractionCount` still advance. Forced model extraction is also treated as an actual extraction for this state transition.

The signed model receipt records the same cursor status and uses the safe `cursorAfter.lastExtractionMessageId`. Memory Center validates that the persisted receipt cursor, safety status, and snapshot cadence cursor agree. Model-extraction replay reports `currentSnapshotCursorMatchesReceipt` for the current execution.

## Context And Isolation

- Group-main and project child-Agent context state that Session Memory was updated while the cursor was held at the tool boundary.
- The next child-Agent source range includes both the assistant `tool_use` and following `tool_result` instead of an orphan result.
- Memory Center fleet rows expose the status, before/after cursor, safety flag, and hold reason; fleet totals include `cadenceCursorHeldToolBoundaryCount`.
- Every value remains scoped to the exact `groupId--gcs_*` snapshot. Sibling `gcs_*` sessions are not read or modified.
- Global Agent remains global-only and does not receive group Session Memory evidence.

## Verification

Dedicated test:

```text
PHASE339_RESULT={"checks":12,"passed":12}
```

It covers safe natural-break advancement, busy-tool cursor holding, token/count progress, complete tool boundary preservation on the next round, signed receipt binding, receipt tamper rejection, replay cursor verification, restart stability, sibling-session isolation, Memory Center visibility, child-Agent context visibility, and Global Agent separation.

Adjacent regressions:

```text
Phase 338 cadence cursor miss: 12/12
Session Memory update cadence: 17/17
Session Memory model extraction transaction: 12/12
Phase 337 cursorless compact resume: 14/14
npm run check: passed
npm run docs:check: passed
npm run build: passed
```

## Result

CCM can now refresh memory during long tool-heavy work without moving the source boundary into an incomplete tool exchange. Fresh third-party project child-Agent sessions receive updated Session Memory together with a complete tool-use/result boundary, matching Claude Code's safety behavior while preserving multi-group and multi-session isolation.
