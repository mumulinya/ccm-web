# TestAgent Acceptance Redirect Form Flow

Date: 2026-07-08

## Goal

Support common web flows where a form starts on one route and completes on another route, such as `/login` redirecting to `/dashboard`.

## Changes

- Added `expectedUrlPath` to `AcceptanceFormFlow`.
- Kept `path` as the start route used for the initial `goto`.
- Updated form-flow assertions to verify the expected final URL path when a criterion contains multiple explicit paths.
- Updated auto browser check generation so form-flow covered start and final routes do not get duplicate route-only smoke checks.
- Added `runTestAgentAcceptanceRedirectFormFlowSelfTest`.

## Verification Scenario

The new self-test launches a real local login fixture:

- `/login` renders an email/password login form.
- Clicking `Sign in` redirects to `/dashboard` when both fields are filled.
- `/dashboard` renders `Dashboard`.
- Acceptance criteria mention both `/login` and `/dashboard`.
- TestAgent opens `/login`, fills both fields, clicks `Sign in`, and verifies the final URL contains `/dashboard`.
- TestAgent does not generate an extra `/dashboard` route-only smoke check for the same criterion.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAcceptanceRedirectFormFlowSelfTest`
- `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`
- `runTestAgentBrowserInteractionSummarySelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
