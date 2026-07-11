# Required Acceptance Evidence Gate

Date: 2026-07-10

## Goal

Prevent TestAgent from accepting a delivery only because an overall command or browser run passed.
Every acceptance criterion must have criterion-linked execution evidence before the final verdict can be accepted.

This milestone only changes `backend/test-agent/**` and `docs/test-agent/**`.
No collaboration or group-chat code was modified.

## Problem

The previous report status was calculated before `acceptanceCoverage`.
For a work order with one acceptance criterion, a passing overall report could activate
`single_criterion_report_status` fallback and mark the criterion as verified even when no command,
HTTP assertion, or browser observation matched that criterion.

That allowed:

- unrelated passing commands to authorize PASS;
- unknown criteria to coexist with an accepted report;
- verdict `canAccept` to ignore acceptance evidence strength;
- report or verdict JSON to be edited without a dedicated acceptance-evidence integrity check.

## Implementation

Added:

- `backend/test-agent/acceptance-gate.ts`
- `backend/test-agent/acceptance-gate-self-test.ts`

The gate emits:

- `verified`: all criteria have direct or token-matched execution evidence;
- `failed`: at least one criterion has matched failed or blocked evidence;
- `incomplete`: at least one criterion has no matched evidence;
- `weak`: criteria rely on single-criterion report-status fallback;
- `not_applicable`: the work order has no acceptance criteria.

Only `verified` and `not_applicable` set `canAccept=true`.

## Status Rules

TestAgent now calculates operational status first, builds acceptance coverage second, and applies
the acceptance gate last.

- operational PASS + verified/not-applicable gate -> `passed`;
- operational PASS + weak/incomplete gate -> `partial`;
- matched failed acceptance evidence -> `failed`, unless the work order is already structurally `blocked`;
- fallback evidence remains visible as a weak clue but cannot authorize PASS.

The report summary, risks, recommendation, verdict next actions, CLI summary, and Markdown report
now explain which criteria failed, remain incomplete, or have fallback-only evidence.

## Contract And Integrity

Report and verdict contracts now require `acceptanceEvidenceGateSummary`.
Verdict evidence counters include:

- `acceptanceMatchedEvidence`;
- `acceptanceFallbackEvidence`;
- `acceptanceMissingEvidence`.

The artifact verifier rebuilds the gate from `report.acceptanceCoverage`, compares report and verdict
summaries and counters, and recomputes `verdict.canAccept`.

It also emits an independent `acceptance_evidence` verification item, so a report without a verdict
artifact is still checked.

Tampering remains detectable even when the attacker refreshes the manifest SHA-256 for the edited
report or verdict file.

## Browser Recovery Fix

The new gate exposed a false negative in recovered MCP browser sessions.
A transient failed tool call was marking the entire browser tool transcript as failed even when the
final browser result passed after the allowed safe recovery.

Acceptance coverage now derives transcript outcome from final browser results:

- recovered transient calls retain their failed-call count but do not override a final browser PASS;
- an unrecovered failed or blocked browser result still makes the transcript negative evidence.

This keeps low-level diagnostics without treating a successful safe recovery as product failure.

## Self-Test Coverage

The dedicated self-test verifies:

- unrelated passing command -> `partial/weak`;
- exact command output matching one criterion -> `passed/verified`;
- two criteria with one matched -> `partial/incomplete`;
- matched failed command evidence -> `failed`;
- no criteria -> `passed/not_applicable`;
- report gate-summary tampering -> artifact verification failure;
- verdict `canAccept` and counter tampering -> verdict-consistency failure;
- CLI and Markdown expose the gate.

Legacy TestAgent fixtures that expected PASS were updated to emit the exact criteria they claim to
verify. The gate was not weakened for those tests.

## Verification

Passed:

- `npm run check`;
- required acceptance evidence gate self-test;
- contract, coverage, acceptance summary, verdict, artifact verifier, and CLI self-tests;
- adversarial evidence gate self-test;
- MCP, Claude-in-Chrome, computer-use, artifact manifest, and browser artifact self-tests;
- real Playwright profile flow;
- repeated-click adversarial Playwright flow;
- invalid-form adversarial Playwright flow;
- Playwright multi-session collaboration flow;
- Playwright, MCP, multi-session, and cross-session action-effect self-tests;
- existing authenticated session and mixed-provider routing self-tests;
- safe recovery, unsafe retry prevention, and failed recovery self-tests;
- managed and multi-session browser authentication self-tests;
- `git diff --check -- backend/test-agent docs/test-agent`.

The long-term TestAgent goal remains active for later milestones.
