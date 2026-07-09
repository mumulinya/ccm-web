# TestAgent Acceptance Form Flow

Date: 2026-07-08

## Goal

Move auto browser verification beyond static page smoke checks when the acceptance criteria clearly describe a simple user action. TestAgent should be able to infer a conservative form flow, operate the browser, and verify the resulting UI state.

## Changes

- Added `browser/acceptance-form-flows.ts`.
- Added conservative extraction for route, field label, input value, submit button name, and expected text.
- Added `acceptance_form_flow` browser probe checks with `goto`, `fill`, `click`, and post-action assertions.
- Integrated form-flow checks ahead of route-only smoke checks.
- Exported `buildAcceptanceFormFlows` and `buildAcceptanceFormFlowBrowserChecks`.
- Added `runTestAgentAcceptanceFormFlowSelfTest`.

## Verification Scenario

The new self-test launches a real local task board fixture:

- The handoff target URL is the site root.
- Acceptance criteria mention `/tasks`.
- The criterion says to enter `Buy milk` into the `Task` field.
- The criterion says to click the `Add task` button.
- The criterion expects `Buy milk` to be shown afterwards.
- TestAgent generates a browser flow check for `/tasks`.
- Playwright fills the labeled input, clicks the semantic button, waits briefly, and verifies the saved task appears.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAcceptanceFormFlowSelfTest`
- `runTestAgentAcceptancePathGroupingSelfTest`
- `runTestAgentAutoBrowserSmokeSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
