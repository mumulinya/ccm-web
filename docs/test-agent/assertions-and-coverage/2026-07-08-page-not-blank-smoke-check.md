# TestAgent Page Not Blank Smoke Check

Date: 2026-07-08

## Goal

Avoid accepting a web delivery that returns HTTP 200 but renders only an empty app shell, such as `<div id="app"></div>`.

## Changes

- Added a `pageNotBlank` browser assertion type.
- Updated auto browser smoke checks to use `pageNotBlank` instead of a loose `jsTruthy` expression.
- Playwright now verifies visible user-facing content using page DOM and layout:
  - visible text
  - visible media or drawing surfaces
  - visible form controls
  - labeled interactive elements
- MCP browser adapters support `pageNotBlank` through page snapshot/text evidence.
- Work-order normalization accepts aliases such as `page_not_blank`, `not_blank`, and `non_empty_page`.
- Added `runTestAgentBlankPageSmokeSelfTest`.

## Verification Scenario

The new blank-page self-test launches a real local web fixture:

- HTTP page probe returns 200 and passes.
- Browser opens the page successfully.
- Page contains only an empty app root.
- Console and network checks do not hide the failure.
- `assert:pageNotBlank` fails.
- Overall report status is `failed` with recommendation `rework`.
- Required check `browser_e2e` becomes `not_verified`.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAutoBrowserSmokeSelfTest`
- `runTestAgentBlankPageSmokeSelfTest`
- `runTestAgentWorkOrderNormalizationSelfTest`

TypeScript no-emit compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
