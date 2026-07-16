# CCM Memory Phase 335: Prompt Cache Cause Attribution

Date: 2026-07-15

## Goal

Move CCM prompt-cache handling from token-drop detection to the Claude Code two-phase model: capture the cache-key-relevant prompt state before a request, then explain an observed cache break after the response. Keep the state durable, body-free, exact-session scoped, and visible to operators and controlled child-Agent context.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\api\promptCacheBreakDetection.ts`
- `D:\claude-code\src\services\api\claude.ts`
- `D:\claude-code\src\services\compact\microCompact.ts`

Claude Code records a pre-call snapshot for tracked query sources and compares system prompt, tool schemas, cache control, model, fast mode, global cache strategy, beta headers, cached microcompact state, effort, and extra body parameters. A post-call cache drop is then attributed to client prompt changes, 5-minute TTL, 1-hour TTL, likely server-side eviction/routing, or an unknown cause. Haiku models are excluded. MCP tool names are sanitized before persistence/analytics.

## Previous Gap

Phase 333 and Phase 334 correctly handled full-compact reset and microcompact cache deletion, but CCM only knew that cache-read tokens dropped by more than 5 percent and at least 2,000 tokens. It could not explain why the drop happened, distinguish TTL/server behavior from a local prompt mutation, or prove which prompt state produced the observation.

## Implementation

### Durable pre-call prompt state

`backend/modules/collaboration/group-prompt-cache-break-detection.ts` now provides:

- `recordGroupPromptCacheState()`
- `verifyGroupPromptCacheStateSnapshot()`
- `ccm-group-prompt-cache-state-snapshot-v1`
- `ccm-group-prompt-cache-pending-changes-v1`
- `ccm-group-prompt-cache-state-event-v1`

Snapshots bind `group_id + gcs_*`, source, model, provider, call number, and checksums. They persist only hashes, bounded counts, fixed flags, sanitized tool names, and timestamps. System text, tool descriptions/schemas, API keys, extra-body values, and request bodies are never stored.

Tracked differences include:

- system prompt excluding cache-control metadata;
- cache-control scope/TTL independently;
- aggregate and per-tool schema hashes;
- model and provider;
- fast mode and global cache strategy;
- beta headers;
- cached microcompact state;
- effort and extra-body hashes.

MCP names collapse to `mcp`, matching Claude Code's privacy boundary.

### Post-call cause attribution

`recordGroupPromptCacheUsage()` now records:

```text
client_prompt_changed
possible_5min_ttl_expiry
possible_1h_ttl_expiry
likely_server_side
unknown_cause
```

Each usage event binds the exact prompt snapshot/checksum, pending-change checksum, cause flags, previous-success gap, request ID, and cache token delta. Expected full compact and microcompact deletion still take priority and never become false cache breaks. Haiku responses are classified `excluded_model` and do not alter the Anthropic comparison baseline.

### Runtime coverage

- The Anthropic-compatible adapter records the actual patched request state before network execution.
- Group-main planning, review, and final summary pass exact-session tracking metadata.
- Model-backed group-memory compact records `group_main_compact` in the same session lifecycle and reports its provider usage before the full compact reset is published.
- Memory Center shows prompt-state count, change state, causes, and cache-break reason.
- Controlled child-Agent memory packets include the latest reason and prompt-change causes.

## Verification

Dedicated test:

```text
node scripts/group-prompt-cache-cause-attribution-restart-selftest.mjs
PHASE335_RESULT={"checks":18,"passed":18}
```

It covers cache-control-only changes, tool schema changes, system changes, unchanged short-gap server classification, both TTL thresholds, Haiku exclusion, MCP sanitization, exact-session isolation, real adapter pre/post ordering, real compaction-model integration, restart persistence, Memory Center, child-Agent context, and body-free storage.

Adjacent regressions:

```text
Phase 333 full-compact cache runtime: 14/14
Phase 334 microcompact cache deletion runtime: 15/15
Provider-native compact execution receipt: 21/21
Phase 329 compaction model usage: 23/23
Boundary journal: 16/16
npm run check: passed
npm run build: passed (frontend, MCP Feishu, backend)
```

## Result

CCM now knows both whether the prompt cache broke and the evidence-backed class of cause. This closes the next source-confirmed Claude Code parity gap without weakening group-session isolation or persisting prompt bodies.
