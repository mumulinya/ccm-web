# TestAgent Browser Interaction Summary

Date: 2026-07-08

## Goal

Make browser evidence easier for the main agent to consume. TestAgent already records detailed browser steps, but a group/main agent should not need to parse long step logs to know whether TestAgent actually operated the browser.

## Changes

- Added `browser/interaction-summary.ts`.
- Added `browserInteractionSummary` to the TestAgent report.
- Added `browserInteractionSummary` to the TestAgent verdict.
- Added browser action/assertion totals to `verdict.evidenceSummary`.
- Added a `Browser Interaction Summary` section to the Markdown report.
- Extended artifact semantic verification so report/verdict interaction summaries must match.
- Added `runTestAgentBrowserInteractionSummarySelfTest`.

## Verification Scenario

The new self-test launches a real local task board fixture:

- TestAgent infers an `acceptance_form_flow`.
- Playwright opens `/tasks`.
- Playwright fills the `Task` field.
- Playwright clicks `Add task`.
- TestAgent verifies the saved task text, URL, nonblank page, console state, and network state.
- The report, markdown, verdict, and artifact verifier all expose the same interaction summary.

## Verification Run

Targeted self-tests passed:

- `runTestAgentBrowserInteractionSummarySelfTest`
- `runTestAgentAcceptanceFormFlowSelfTest`
- `runTestAgentArtifactVerifierSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
