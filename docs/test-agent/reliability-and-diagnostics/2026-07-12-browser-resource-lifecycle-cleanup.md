# Browser Resource Lifecycle And Cleanup

## Scope

This milestone strengthens standalone TestAgent browser resource cleanup. It changes only `backend/test-agent` and `docs/test-agent`; collaboration and group-chat orchestration remain untouched.

## Reference

Claude Code's verification agent permits temporary test resources only when they are cleaned up. TestAgent previously called Playwright `context.close()` and `browser.close()` in cleanup paths, but swallowed close errors and produced no evidence that cleanup succeeded.

## Implementation

- Added `browser/resource-lifecycle.ts` with an isolated lifecycle recorder, deterministic summary builder, semantic verifier, and CLI formatters.
- Every TestAgent-owned Playwright browser and browser context receives a unique resource ID tied to the current browser execution `planId`.
- Successful close records `releaseAttemptedAt`, `releasedAt`, and `released` status.
- Close exceptions record `cleanup_failed` with a sanitized error instead of disappearing.
- Browser close additionally verifies `browser.isConnected()` is false when the API is available.
- Playwright multi-session contexts are tracked independently, including partial setup and finalization failures.
- MCP browser sessions are recorded as `external_browser_session` with `external/retained` policy. TestAgent does not close a user's existing authenticated browser session.
- Open resources, cleanup failures, plan mismatches, duplicate IDs, ownership violations, invalid timestamps, and events outside the report window prevent acceptance.

## Report And Artifact Surfaces

- Report fields: `browserResourceLifecycleEvents`, `browserResourceLifecycleSummary`
- Verdict field: `browserResourceLifecycleSummary`
- Evidence counters: owned, released, open, and cleanup-failed resources
- Artifact semantic item: `browser_resource_lifecycle_evidence`
- CLI line: `Browser resource lifecycle: ...`
- Markdown section: `Browser Resource Lifecycle`

## Adversarial Self-Test

`browser/resource-lifecycle-self-test.ts` proves:

1. A successful real Playwright check releases its browser and context.
2. A failing real Playwright assertion still releases its browser and context.
3. An MCP check records an externally owned retained session without treating it as a leak.
4. Forged open and cleanup-failed resources are rejected.
5. Events from another execution plan are rejected.
6. Duplicate resource IDs are rejected.
7. Recomputing the lifecycle summary and refreshing report SHA-256 does not bypass artifact verification.

## Verification

- `npm run check`: passed.
- Temporary backend compilation: passed.
- Browser resource lifecycle self-test: passed.
- Expanded provider/reliability regression matrix: 19/19 passed.

The matrix covered MCP, Claude in Chrome, Computer Use, existing sessions, mixed provider fallback, MCP action effects, real Playwright, multi-session Playwright, stability runs, managed authentication, multi-session authentication, contracts, artifact verification, execution coverage, tool lineage, tool deadlines, temporal integrity, and resource lifecycle integrity.
