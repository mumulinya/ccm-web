# Browser Evidence Run Provenance And Temporal Integrity

## Scope

This milestone strengthens the standalone TestAgent browser evidence chain only. It does not modify collaboration or group-chat orchestration code.

## Problem

Browser check IDs and stability run numbers are deterministic. Before this milestone, a result from an older TestAgent run could reuse the same check/run identity. Timestamps and durations were recorded but were not semantically verified against the report or owning browser result.

## Implementation

- Every `BrowserCheckExecutionPlan` now has a unique `planId` and canonical UTC `createdAt`.
- Provider results, synthetic missing results, and scoped MCP tool calls inherit the plan ID.
- Tool-call lineage keys now include `planId`, `checkId`, and `run`.
- Direct provider callers lazily create the same execution plan format when registry orchestration is intentionally bypassed.
- `browser/evidence-temporal-integrity.ts` validates report, plan, browser-result, and browser-tool-call intervals with a 100 ms clock/evaluation tolerance.
- Browser results and tool calls must remain inside the report window.
- Scoped tool calls must remain inside their owning browser-result window.
- Recorded duration must match the timestamp interval.
- Result and tool execution identities must match the report plan ID.
- Invalid temporal evidence prevents a passing acceptance verdict.

## Report And Artifact Surfaces

- Report/verdict field: `browserEvidenceTemporalIntegrity`
- Artifact semantic verification item: `browser_temporal_evidence`
- CLI line: `Browser temporal evidence: ...`
- Markdown section: `Browser Evidence Temporal Integrity`
- Contract schemas validate plan IDs, timestamps, summary shape, derived summary consistency, and `canAccept` gating.

## Adversarial Self-Test

`browser/evidence-temporal-integrity-self-test.ts` executes the same MCP browser work order twice and proves:

1. Both normal reports pass with different plan IDs.
2. Moving the first run's results and tool calls into the second report is rejected after all derived browser summaries are rebuilt.
3. Refreshing the report SHA-256 does not bypass `browser_temporal_evidence` verification.
4. Browser results outside the report window are rejected.
5. Duration tampering is rejected.
6. Tool calls outside their owning result window are rejected.
7. Contract, verdict, CLI, Markdown, and artifact surfaces expose the new evidence.

## Verification

- `npm run check`: passed.
- Temporary backend compilation with declarations/source maps disabled: passed.
- Temporal integrity self-test: passed.
- Provider and reliability regression matrix: 15/15 passed.
- Mixed Playwright/MCP routing stability sampling: 5/5 passed.
- `git diff --check -- backend/test-agent docs/test-agent`: passed; only line-ending conversion warnings were reported.

The regression matrix covered MCP, Claude in Chrome, Computer Use, existing-session providers, mixed routing, MCP action effects, real Playwright, report contracts, artifact verification, execution coverage, tool lineage, tool-call deadlines, and temporal integrity.
