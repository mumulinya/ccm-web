# TestAgent Playwright URL Includes Wait

Date: 2026-07-08

## Goal

Make explicit browser checks more stable when a click or submit triggers delayed navigation. A `urlIncludes` assertion should wait within its timeout instead of checking the URL only once immediately.

## Changes

- Updated Playwright `urlIncludes` assertions to wait for the expected URL fragment.
- Kept the assertion contract unchanged.
- Added `runTestAgentPlaywrightUrlIncludesWaitSelfTest`.

## Verification Scenario

The new self-test launches a real local browser fixture:

- `/start` renders a `Continue` button.
- Clicking the button redirects to `/done` after a short delay.
- The browser check does not include an explicit `waitForUrl` action.
- The first assertion is `urlIncludes: /done`.
- Playwright waits for `/done`, then verifies `Done` text.

## Verification Run

Targeted self-tests passed:

- `runTestAgentPlaywrightUrlIncludesWaitSelfTest`
- `runTestAgentAcceptanceRedirectFormFlowSelfTest`
- `runTestAgentPlaywrightRealBrowserSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
