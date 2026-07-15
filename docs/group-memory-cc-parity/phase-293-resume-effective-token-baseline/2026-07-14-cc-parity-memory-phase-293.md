# Phase 293: Resume Effective Token Baseline

## Status

- Date: 2026-07-14
- Result: completed
- Scope: exact group-session resume projection, token pressure, Session Memory cadence, preserved provider usage

## Claude Code parity source

Claude Code `D:\claude-code\src\utils\sessionStorage.ts:1840` restores the live preserved segment instead of treating the full on-disk transcript as active context. At lines 1921-1935 it also zeros stale provider usage on preserved assistant messages; the source comment explicitly says that retaining the pre-compact usage can cause `resume -> immediate autocompact spiral`.

CCM now applies the same behavioral rule to each exact `groupId + gcs_* sessionId` scope:

1. The durable raw transcript remains unchanged and remains the recovery authority.
2. A verified committed boundary projects only the preserved segment plus messages appended after the boundary.
3. Old provider usage is zeroed only on cloned preserved messages used by the resume projection.
4. Pressure and Session Memory cadence use summary tokens plus projected-message tokens, not the full raw transcript.
5. Full synchronous snapshot rebuilding runs only when the projection is invalid or effective context actually reaches the model-derived auto-compact threshold.

## Implementation

### Preserved usage sanitization

`backend/modules/collaboration/group-memory-boundary-journal.ts` now clones the preserved segment and zeros:

- `input_tokens`
- `output_tokens`
- `cache_creation_input_tokens`
- `cache_read_input_tokens`

Both top-level `usage` and nested `message.usage` are supported. Projection and durable proof rows record the sanitized message count and excluded stale token total. Raw transcript objects are never mutated.

### Checksummed effective-token baseline

`backend/modules/collaboration/memory.ts` now persists `ccm-group-memory-resume-effective-token-baseline-v1` with:

- exact group and session identity
- boundary, summary, and projection checksums
- raw transcript tokens
- omitted raw-prefix tokens
- projected message tokens
- summary tokens
- effective context tokens
- stale provider usage excluded
- model-derived pressure warning
- deterministic baseline ID and checksum

The calculation is:

```text
effective_context_tokens = summary_tokens + projected_message_tokens
```

This baseline is visible in the rendered main/child Agent group context, so the model receives the actual active-context accounting rather than a misleading raw-transcript size.

### Resume behavior

For a verified boundary below threshold, `prepareGroupMemoryResumeProjection()`:

- reuses the committed projection
- keeps the boundary ID and journal commit count unchanged
- skips full transcript snapshot refresh
- persists an effective pressure sample
- rebases an older larger Session Memory extraction counter when necessary
- records the baseline in the checksummed resume proof

Invalid projections still fail closed and rebuild from raw transcript. Real effective growth above threshold still advances a new committed boundary.

## Regression coverage

- Boundary journal self-test: 16/16
- Resume integration self-test: 12/12
- Phase 292 exact-session hook isolation: 25/25
- Multi-session auto compaction: 12/12
- Compact-head fence: 38/38
- Memory Center session scope: 13/13
- `npm run build:backend`: passed
- Full `npm run build`: passed
- Focused `git diff --check`: no whitespace errors; only repository CRLF conversion warnings
- Production `http://localhost:3081/`: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200
- Production PID: `30448`
- stderr: empty
- Logs: `C:\Users\admin\.cc-connect\logs\ccm-server-phase293.log` and `C:\Users\admin\.cc-connect\logs\ccm-server-phase293.err.log`

The resume integration test includes a preserved assistant message with 190,000 stale provider-usage tokens and proves that the projection zeros the usage while leaving the raw transcript unchanged. It also proves that repeated resume does not add a boundary and that a genuinely large appended context does.

## Long-term goal state

Phase 293 closes the resume-token inflation gap found in the current Claude Code source audit. The long-term Claude Code parity goal remains active for subsequent upstream behavior audits and production hardening.
