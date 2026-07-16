# CCM Memory Phase 337: Cursorless Session Memory Resume

Date: 2026-07-15

## Goal

Align CCM with Claude Code when a resumed group session has valid Session Memory content but no extraction cursor. The exact-session memory should still be usable for compact, while a present-but-invalid cursor, tampered receipt, or sibling session must continue to fail closed.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`

`trySessionMemoryCompaction()` handles two source-confirmed modes:

1. A normal extraction cursor resolves the summarized boundary.
2. A resumed session with non-empty Session Memory and no cursor seeds retention from the conversation tail, expands backward to the configured minimum window, preserves API invariants, and uses Session Memory as the compact summary.

Claude Code does not treat an explicitly present cursor that cannot be found as a resumed session. That case falls back to traditional compact.

## Previous Gap

CCM required `snapshot.lastSummarizedMessageId` for every Session Memory compact selection. Even when the exact `group + gcs_*` snapshot, Markdown path, checksum, and non-empty summary were valid, a missing cursor returned `last_summarized_cursor_missing` and discarded the Session Memory path. This affected resumed, migrated, or older valid snapshots.

## Implementation

`backend/modules/collaboration/group-memory-compaction.ts` now records two explicit cursor modes in `ccm-group-session-memory-compact-selection-v1`:

```text
snapshot_cursor
resumed_session_tail
```

For a missing cursor with a non-empty message tail:

- `cursor_status=resumed_without_cursor`;
- the final exact-session message ID becomes the body-free retention seed;
- the existing CC-style minimum/maximum retained window is calculated backward;
- tool-use/tool-result, provider-fragment, and task-transaction closure still runs;
- the Phase 336 section-aware compact projection and true payload gate still run;
- no compact model API call is made when selection succeeds.

For a present cursor that is not found, CCM still returns `last_summarized_cursor_not_found`. Missing messages, invalid snapshots, checksum mismatches, and sibling sessions do not enter resume mode.

The selection verifier binds the resumed flag, cursor mode, empty source cursor, exact tail seed, exact session, nested projection, API closure, and selection checksum. Existing legacy receipts without cursor-mode fields remain readable.

## Visibility

- Memory Center labels the path as `恢复会话尾部窗口` rather than a normal snapshot cursor.
- Controlled project child-Agent context receives `cursor_status/cursor_mode` evidence.
- Global Agent remains outside group Session Memory and continues using only global context.

## Verification

Dedicated restart test:

```text
PHASE337_RESULT={"checks":14,"passed":14}
```

It covers cursorless selection, exact tail seeding, bounded retained context, no compact-model call, Phase 336 projection reuse, source immutability, receipt verification, cursor-mode tamper rejection, durable restart projection, sibling-session isolation, invalid explicit cursor fallback, Memory Center visibility, child-Agent visibility, and Global Agent separation.

Adjacent regressions:

```text
Phase 330 Session Memory compact selection: 15/15
Phase 331 API invariant closure: 14/14
Phase 332 post-compact session reset: 14/14
Phase 336 Session Memory compact projection: 17/17
Boundary journal: 16/16
npm run check: passed
npm run build: passed (frontend, MCP Feishu, backend)
```

## Result

Valid resumed group sessions no longer lose the Session Memory compact path solely because an extraction cursor is absent. CCM now matches Claude Code's recovery behavior while retaining stricter exact-session, checksum, projection, and transaction evidence around that path.
