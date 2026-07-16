# CCM Memory Phase 338: Cadence Cursor-Miss Semantics

Date: 2026-07-15

## Goal

Align Session Memory update cadence with Claude Code when the last extraction message is no longer present in the active conversation window. Historical tool calls before a pruned or resumed cursor must not be misclassified as new extraction activity.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`

Claude Code's `countToolCallsSince()` starts counting only after it finds the remembered message UUID. If an explicit UUID is absent from the current messages, the scan never starts and the incremental tool-call count remains zero. A Session Memory update can still run after sufficient context growth when the last assistant turn is a natural break without tool calls.

## Previous Gap

CCM used `findIndex()` and then sliced from `Math.max(0, start + 1)`. When an explicit `lastExtractionMessageId` was not found, `start` was `-1`, so CCM scanned the entire active window and counted every historical tool call. After resume, pruning, or message-window replacement this could falsely satisfy the three-tool threshold and trigger duplicate model extraction during a busy tool turn.

## Implementation

`evaluateGroupSessionMemoryUpdateCadence()` now uses a cursor-aware scan contract:

```text
not_set   -> scan the current window
resolved  -> scan only messages after the extraction cursor
not_found -> scan zero messages and count zero tool calls
```

The durable cadence state records:

- `lastExtractionCursorStatus`
- `lastExtractionCursorIndex`
- `toolCallScanMessageCount`
- the resulting incremental tool-call count and status

When the cursor is missing, token growth is still mandatory. If the latest assistant turn contains tools, status becomes `waiting_natural_break_after_cursor_miss`; if a natural break occurs, extraction may proceed exactly as in Claude Code. The fix does not advance the extraction cursor, rewrite Session Memory, or read another `gcs_*` scope.

## Visibility

- Memory Center fleet rows show cadence cursor state and scanned-message count.
- Fleet totals include `cadenceCursorMissCount`.
- Group-main and controlled project child-Agent context include the same cadence evidence.
- Global Agent remains outside group Session Memory.

## Verification

Dedicated test:

```text
PHASE338_RESULT={"checks":12,"passed":12}
```

It covers missing, unset, and resolved cursors; suffix-only tool counting; busy tool turns; natural breaks; mandatory token growth; exact-session persistence; sibling-session isolation; real Memory Center fleet output; child-Agent context; UI visibility; and Global Agent separation.

Adjacent regressions:

```text
Session Memory update cadence: 17/17
Session Memory model extraction transaction: 12/12
Phase 337 cursorless compact resume: 14/14
npm run check: passed
npm run build: passed (frontend, MCP Feishu, backend)
```

## Result

Session Memory extraction cadence now measures actual post-cursor activity instead of replaying historical tool calls after a cursor disappears. This reduces duplicate extraction cost and prevents stale history from distorting when group memory is refreshed for future project child-Agent sessions.
