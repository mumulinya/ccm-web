# TestAgent Acceptance Multi-Field Form Flow

Date: 2026-07-08

## Goal

Let auto browser verification handle simple multi-field user flows, such as filling both email and password before submitting a login form.

## Changes

- Extended `AcceptanceFormFlow` with `fields[]`.
- Kept `fieldLabel` and `inputValue` as first-field compatibility aliases.
- Updated form-flow check generation to emit one `fill` action per inferred field.
- Added conservative extraction for repeated clauses such as `enter "value" into "Field"`.
- Added `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`.

## Verification Scenario

The new self-test launches a real local login fixture:

- The handoff target URL is the site root.
- Acceptance criteria mention `/login`.
- The criterion says to enter `ada@example.test` into `Email`.
- The criterion says to enter `correct horse battery staple` into `Password`.
- The criterion says to click `Sign in`.
- The criterion expects `Dashboard` to be shown afterwards.
- TestAgent generates one `acceptance_form_flow` check.
- Playwright fills both labeled inputs, clicks the semantic button, and verifies `Dashboard`.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`
- `runTestAgentAcceptanceFormFlowSelfTest`
- `runTestAgentAcceptancePathGroupingSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
