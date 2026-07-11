# TestAgent Safe Browser Session Recovery

Date: 2026-07-10

## Goal

Make the standalone TestAgent resilient to a closed or stale authenticated browser tab without risking duplicate user actions.

This milestone only changes `backend/test-agent/**` and `docs/test-agent/**`. It does not modify group collaboration code.

## Claude Code Reference

The recovery behavior was derived from:

`D:\claude-code\src\utils\claudeInChrome\prompt.ts`

The relevant operational rules are:

- refresh browser tab context when a tab/page reference is invalid
- create a fresh verification tab after context loss
- keep retries bounded
- do not repeat the same failing browser action indefinitely

TestAgent uses a stricter deterministic policy: the original call plus at most one safe recovery replay.

## Recovery Policy

Safe replay operations:

- `action:goto`
- `observation:page_text`
- `telemetry:console`
- `telemetry:network`
- `evidence:screenshot`

Operations that are never replayed automatically:

- click
- fill or type
- evaluate JavaScript
- reload
- cookie mutations
- local/session storage mutations

An unsafe stale-context failure is recorded as `not_retried`. This proves that TestAgent prevented a possible duplicate side effect.

## Provider Behavior

Claude in Chrome recovery:

1. Detect a stale tab, lost navigation context, or disconnected transport.
2. Call `tabs_context_mcp` again.
3. Call `tabs_create_mcp` to create a fresh verification tab.
4. Replay the safe operation once.

Chrome DevTools recovery:

1. Detect a stale page or lost navigation context.
2. Call `list_pages` again.
3. Call `new_page` to create a fresh verification page.
4. Replay the safe operation once.

Partial recovery progress is preserved. For example, if context refresh succeeds but new-tab creation fails, evidence records `contextRefreshed=true` and `createdNewTab=false`.

## Evidence Model

Each browser result may contain recovery evidence with:

- provider
- operation token
- trigger category
- retry-safety decision
- status: `recovered`, `failed`, or `not_retried`
- context refresh and new-tab proof
- bounded attempt number

Reports and verdicts include aggregate counts for:

- recovery attempts
- recovered operations
- failed recoveries
- unsafe retries prevented

Recovery evidence never stores raw:

- provider error text
- tab or page IDs
- URLs or titles
- page text
- tool output detail

## Contract And Artifact Verification

Contract validation rejects:

- count/event mismatches
- attempts outside the configured bound
- a side-effectful operation marked safe
- a recovered event without context refresh and new-tab proof
- raw browser details at event, evidence, or summary level

Artifact verification independently:

- validates every recovery event and counter
- rebuilds `browserRecoverySummary` from browser results
- compares report and verdict recovery summaries
- compares verdict recovery evidence counters
- emits a `browser_recovery_evidence` verification item
- rejects tampered raw tab/page/error/URL detail

## Execution Plan

Existing-session browser checks now expose:

- per-check `sessionRecoveryEnabled`
- summary `browserSessionRecoveryChecks`

The CLI execution-plan summary prints `sessionRecovery:<count>` so an orchestrator can confirm recovery support before dispatch.

## Main Files

- `backend/test-agent/browser/recovery.ts`
- `backend/test-agent/browser/recovery-validation.ts`
- `backend/test-agent/browser/recovery-summary.ts`
- `backend/test-agent/browser/recovery-self-test.ts`
- `backend/test-agent/browser/mcp-adapters.ts`
- `backend/test-agent/browser/mcp-provider.ts`
- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/contract/schema.ts`
- `backend/test-agent/execution-plan.ts`
- `backend/test-agent/result-builder.ts`
- `backend/test-agent/verdict.ts`
- `backend/test-agent/artifacts.ts`
- `backend/test-agent/agent-profile.ts`

## Verification

Scoped TestAgent TypeScript:

```text
passed
```

Full backend TypeScript:

```text
passed
```

New recovery self-tests:

```text
TOTAL 4 PASSED 4 FAILED 0
```

The recovery tests cover:

- Claude in Chrome stale `goto` recovery
- exact context refresh and new-tab sequence
- minimal report/transcript redaction
- report contract and artifact tamper rejection
- stale `click` prevention with exactly one click call
- failed new-tab recovery with partial progress evidence
- Chrome DevTools stale snapshot recovery

Existing authentication/provider regression:

```text
TOTAL 14 PASSED 14 FAILED 0
```

## Integration Boundary

The future group-chat main agent only needs to pass an existing-session browser check in the TestAgent work order, including:

- project name and directory
- running target URL
- acceptance criteria
- existing-session provider
- evidence policy
- browser MCP executor

TestAgent owns browser recovery, replay safety, evidence redaction, reporting, and artifact verification. No collaboration module integration is included in this milestone.
