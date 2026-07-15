# CCM Memory Phase 319: Time-based thinking-clear latch

Date: 2026-07-15

Status: implemented, verified, and deployed

Long-term goal status: active for future parity audits

## Why this phase was required

Phase 318 matched Claude Code's cache-cold clearing of old tool results. The next source audit found a separate cache-cold behavior for model-visible thinking blocks.

Claude Code references:

- `D:\claude-code\src\services\api\claude.ts`, around the `thinkingClearLatched` evaluation and API request construction;
- `D:\claude-code\src\services\compact\apiMicrocompact.ts`, where `clear_thinking_20251015` keeps one thinking turn after a cache-cold idle gap;
- `D:\claude-code\src\bootstrap\state.ts`, where the latch is session-stable and reset by `/clear` or `/compact`.

CCM already produced an advisory `clear_thinking_20251015` edit plan. That was insufficient for Claude Code, Cursor, Codex, or other third-party CLI sessions that do not expose native Anthropic context management: old thinking blocks could still enter the actual Main-Agent or child-Agent prompt.

Phase 319 adds a local, non-destructive projection with the same session-latch behavior.

## Implementation

### Exact-session thinking projection

`backend/modules/collaboration/group-memory-compaction.ts` adds:

- `buildGroupTimeBasedThinkingProjection()`;
- `verifyGroupTimeBasedThinkingProjectionReceipt()`;
- schema `ccm-group-time-based-thinking-projection-v1`;
- marker `[Old thinking content cleared]`.

After the configured idle gap, the projection latches within the exact `group + gcs_* + compact epoch` scope. It keeps the most recent model-visible thinking turn and replaces older thinking blocks only in the model-input projection.

The latch remains active on later turns even when their immediate idle gap is below the threshold. This prevents old thinking from reappearing after the first resumed request. A new group conversation or a full compact epoch resets the latch. Invalid prior receipts fail closed and cannot reactivate it.

Redacted thinking is not cleared because it has no model-visible payload. Non-main-thread sources and legacy/default sessions are rejected.

### Main-Agent and child-Agent use

`backend/modules/collaboration/memory.ts` chains the projection after the Phase 318 tool-result projection in both production paths:

- `buildGroupContextPacket()` for the group Main Agent;
- `buildAgentMemoryContextBundle()` for each project child-Agent session.

Both paths use the same exact `gcs_*` receipt and compact epoch. Receipts are stored in the owning conversation's `memory.compaction` and `messageCompression` records. The original group message JSON, typed memory, sibling conversations, other groups, and Global Agent context remain unchanged.

### User control

`backend/modules/collaboration/group-orchestrator.ts` adds `timeBasedThinkingClearEnabled`, default `false`.

The Memory Center adds the user-facing switch `空闲后只保留最近思考`. It shares the existing cache-cold gap setting, defaulting to 60 minutes. This keeps the behavior explicit and avoids silently deleting large reasoning histories.

### Operational visibility

`backend/modules/knowledge/memory-control-center.ts` and `frontend/src/components/knowledge/MemoryCenter.vue` add `Time-based Thinking Clear Latch` diagnostics:

- policy state and exact `gcs_*` scope;
- current compact epoch and whether the latch is active;
- thinking turns cleared and kept;
- estimated tokens saved;
- newly latched versus restart-reused state;
- receipt checksum and raw-transcript preservation.

A historical receipt from an older compact epoch is treated as waiting for a fresh evaluation, not as corruption.

## Runtime invariants

1. The feature is disabled by default.
2. A cache-cold gap latches only an exact `gcs_*` main-thread context.
3. At least the most recent model-visible thinking turn is preserved.
4. The latch survives service restart and later under-threshold turns.
5. A full compact epoch or a new conversation resets the latch.
6. Invalid checksums and cross-session receipts fail closed.
7. Main-Agent and child-Agent prompts use the same projection.
8. Global Agent remains global-only.
9. Original group JSON and typed memory are never mutated.
10. Receipts contain IDs, counts, timestamps, and checksums, never thinking content.

## Verification

New two-process acceptance test:

`npm run test:group-time-based-thinking-clear-latch-restart`

It passed 23 checks covering cache-cold activation, old-thinking clearing, latest-thinking preservation, body-free exact-session receipts, checksum tamper rejection, under-threshold latch reuse, compact-epoch reset, invalid-prior fail-closed behavior, source and legacy-session rejection, redacted-thinking behavior, real Main-Agent prompt use, real child-Agent bundle use, raw-transcript immutability, exact memory persistence, sibling isolation, Memory Center projection, user settings, and restart durability.

Regression evidence:

| Capability | Result |
| --- | --- |
| Phase 319 thinking-clear latch | 23/23 |
| Phase 318 tool-result microcompact | 21/21 |
| Global Agent global-only context | 13/13 |
| Model-aware typed-memory budget | 42/42 |
| Full frontend, MCP Feishu, and backend build | passed |
| Focused `git diff --check` | passed; line-ending warnings only |

## Production deployment

Phase 319 is deployed at `http://localhost:3081`.

- PID: `20144`
- home response: HTTP 200
- Memory Center overview response: HTTP 200
- memory and Web runtime: healthy; the separately configured `filesystem-mcp` logged an `npx` initialize timeout and is degraded for this process
- deployed policy: disabled by default, 60-minute cache-cold threshold
- built Memory Center asset: `MemoryCenter-DFx1Dfxf.js`
- browser verification: setting rendered and exact group-session diagnostic panel rendered as disabled
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase319-final.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase319-final.err.log`

`fetch-web-mcp` and `mcp-feishu` connected successfully. The `filesystem-mcp` startup timeout is independent of the memory projection and does not affect the verified Memory Center or context construction paths.

## Completion statement

CCM now matches both cache-cold context reductions found in the audited Claude Code request path: old compactable tool results and old model-visible thinking turns. The behavior is usable for third-party child Agents even when their native API does not support context-management edits.

The long-term goal remains active only for future Claude Code source changes, Provider-specific behavior, and additional adversarial hardening. Phase 319 itself is complete.
