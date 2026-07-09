# TestAgent Browser Wait For URL

Date: 2026-07-08

## Goal

Avoid flaky browser verification when a form submit or click triggers an asynchronous navigation. TestAgent should wait for the expected final route before checking page text and URL assertions.

## Changes

- Added the `waitForUrl` browser action type.
- Added work-order aliases such as `wait_for_url`, `wait_for_navigation`, and `wait_for_route`.
- Implemented Playwright support with `page.waitForURL`.
- Added MCP best-effort handling that fails honestly when the adapter cannot observe the expected URL.
- Updated acceptance form-flow generation to insert `waitForUrl` when the expected final path differs from the starting path.
- Updated redirect form-flow self-test to use a delayed `/login -> /dashboard` redirect.

## Verification Scenario

The redirect self-test launches a real local login fixture:

- `/login` renders an email/password form.
- Clicking `Sign in` schedules a delayed redirect to `/dashboard`.
- TestAgent fills both fields and clicks the button.
- TestAgent waits for `/dashboard`.
- TestAgent verifies final URL and `Dashboard` text after the delayed navigation.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAcceptanceRedirectFormFlowSelfTest`
- `runTestAgentWorkOrderNormalizationSelfTest`
- `runTestAgentMcpProviderSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
