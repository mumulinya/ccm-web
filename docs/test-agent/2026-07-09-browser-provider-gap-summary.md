# TestAgent Browser Provider Gap Summary

## Goal

Make browser-provider limitations explicit in TestAgent evidence. When MCP/Computer Use/Chrome-style providers cannot perform an action or assertion that a web feature verification needs, the report now records the gap as structured evidence instead of leaving it buried in a failed step string.

## Changes

- Added `backend/test-agent/browser/provider-gaps.ts`.
- Added `browserProviderGaps` to TestAgent reports and verdicts.
- Added `evidenceSummary.browserProviderGaps` to verdict JSON.
- Added CLI and markdown report output for provider gaps.
- Added contract schema support and artifact report/verdict consistency checks.
- Added `browser_provider_gap_summary` to the TestAgent capability declaration.

## Behavior

Provider gaps are derived from actual browser result failures, including:

- unsupported actions/assertions
- missing provider tools
- provider availability failures
- MCP/Computer Use limitations that require Playwright or browser-native DOM/JS/network access

Each item records the provider, project, check, failed step, category, reason, and recommendation.

## Verification

- TypeScript no-emit compile passed for `backend/test-agent/index.ts` and `backend/test-agent/cli.ts`.
- Focused self-test added: `runTestAgentBrowserProviderGapSummarySelfTest`.

## Follow-Up

- Future group/main-agent integration can read `verdict.browserProviderGaps` and route the task back with a concrete provider recommendation, usually switching browser verification to Playwright for deterministic web checks.
