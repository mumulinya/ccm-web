# Browser Check Execution Coverage Gate

Date: 2026-07-11

## Goal

Prevent a browser provider from silently omitting a planned check or stability run and still
allowing TestAgent to report completion.

Reference:

- D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts

The Claude Code verifier requires actual execution evidence for every planned check. A provider
response is not trustworthy merely because every result it happened to return passed; the verifier
must also prove that no planned check disappeared.

This milestone changes only backend/test-agent/** and docs/test-agent/**.
No collaboration or group-chat source file was edited.

## Previous Gap

The browser registry returned whatever result array a provider supplied. A provider could plan two
checks but return only one passing result. The report counted one passing check and had no direct
evidence that the second check was never executed.

Stability metadata detected some incomplete repeated-run groups, but it did not cover ordinary
checks, MCP checks, provider infrastructure failures, or a stability check with no returned runs.

## Execution Plan And Identity

Added backend/test-agent/browser/check-execution-coverage.ts.

Before browser execution, TestAgent records metadata.browserCheckExecutionPlan with:

- a stable checkId derived from project and check indexes;
- project, check name, URL, and indexes;
- expected run count, including stability reruns;
- planned provider and routing reason;
- adversarial and probe metadata.

Each real MCP or Playwright result carries checkId, projectIndex, checkIndex, run, expectedRuns,
and evidence=provider. The identity is attached outside provider-specific implementations, so
success, product failure, blocked execution, multi-session execution, and every stability run use
one accounting contract.

## Reconciliation

The browser registry compares expected run identities with provider results before returning them.

- Complete unique provider evidence produces complete coverage.
- A missing run produces a blocked result with evidence=synthetic_missing.
- Duplicate run identity produces invalid coverage and a coverage diagnostic.
- Unknown or malformed identities produce invalid coverage.
- Provider diagnostics without a check identity remain visible and make coverage incomplete.
- A thrown provider error becomes diagnostics plus blocked missing evidence for every unproved run.

Synthetic missing results never count as provider execution. Rebuilding coverage from a persisted
report still reports the run as missing instead of treating the safety record as browser proof.

## Report And Verdict

Added browserCheckExecutionCoverage to the report and verdict. It records:

- planned checks and expected runs;
- uniquely covered runs and missing runs;
- provider, duplicate, invalid, diagnostic, and synthetic result counts;
- per-check observed, missing, duplicate, and synthetic blocked run numbers.

CLI and Markdown show the aggregate ratio and exact checks needing attention. A partial verdict
directs the caller to rerun missing identities. canAccept requires complete coverage whenever
browser execution coverage exists.

The TestAgent profile now forbids acceptance when a planned browser check is missing, duplicated,
invalid, or silently omitted.

## Contract And Artifact Integrity

The report contract validates:

- plan and execution identity structure;
- unique and index-consistent plan identifiers;
- stored coverage against an independent rebuild from plan plus results;
- exactly one synthetic blocked result for every missing run;
- no synthetic missing result for a run that has provider evidence;
- complete browser execution coverage for a passed report.

The artifact verifier adds browser_execution_coverage_evidence. It independently rebuilds coverage,
checks report/verdict counters, and verifies plan/result consistency. Refreshing report SHA-256
after deleting a run or duplicating an identity does not bypass this semantic check.

## Self-Test

Added backend/test-agent/browser/check-execution-coverage-self-test.ts and exported
runTestAgentBrowserCheckExecutionCoverageSelfTest.

The self-test proves:

1. Two planned MCP browser checks return identified results and complete 2/2 coverage.
2. Omitting one provider result creates one synthetic blocked result and incomplete coverage.
3. Returning runs 1 and 2 of a three-run stability check records run 3 as missing.
4. Duplicating a result identity produces invalid coverage and blocks acceptance.
5. Genuine report, verdict, CLI, Markdown, and artifact evidence pass.
6. Deleting a result or duplicating an identity, then refreshing manifest integrity, still fails
   the dedicated semantic artifact check.

## Verification

Passed:

- npm run check;
- npm run build:backend;
- browser execution coverage self-test;
- capability-aware MCP/Playwright routing self-test;
- three-run real Playwright stability self-test;
- real Playwright browser self-test;
- auto browser smoke self-test;
- blank-page browser smoke self-test;
- report contract self-test;
- artifact verifier self-test;
- safe HTTP page resource self-test;
- git diff --check -- backend/test-agent docs/test-agent.

The backend build also refreshed tracked distribution files for unrelated source files already
being modified by other agents. Those concurrent changes were not reverted or claimed as part of
this TestAgent milestone.

The long-term independent TestAgent goal remains active for later verification milestones and final
group-agent integration.
