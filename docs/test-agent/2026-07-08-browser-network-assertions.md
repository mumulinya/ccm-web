# TestAgent Browser Network Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify that a browser interaction actually called the expected API endpoint, not only that the DOM changed afterwards.

## Changes

- Added `networkRequestIncludes` browser assertion.
- Added `networkResponseIncludes` browser assertion.
- Added work-order aliases such as `network_request_includes` and `network_response_includes`.
- Updated Playwright assertions to wait for matching network telemetry within the assertion timeout.
- Extended MCP browser adapters to expose best-effort network request text when tools provide it.
- Added `runTestAgentBrowserNetworkAssertionSelfTest`.

## Verification Scenario

The new self-test launches a real local web fixture:

- `/tasks` renders a `Save task` button.
- Clicking the button sends `POST /api/tasks`.
- The API responds with HTTP 201 JSON.
- The page updates to `Saved via API`.
- TestAgent verifies the UI text, request evidence, response evidence, console state, network state, screenshot, and network log artifact.

## Verification Run

Targeted self-tests passed:

- `runTestAgentBrowserNetworkAssertionSelfTest`
- `runTestAgentPlaywrightResourceErrorSelfTest`
- `runTestAgentMcpProviderSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
