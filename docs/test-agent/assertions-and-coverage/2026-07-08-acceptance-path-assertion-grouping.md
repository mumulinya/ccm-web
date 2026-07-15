# TestAgent Acceptance Path Assertion Grouping

Date: 2026-07-08

## Goal

Avoid over-constraining auto browser smoke checks when multiple acceptance criteria mention different routes. A `/tasks` check should not be forced to satisfy text that only belongs to `/settings`.

## Changes

- Added `buildAcceptanceDerivedBrowserAssertionsByCriterion` so TestAgent can preserve which acceptance criterion produced each browser assertion.
- Updated acceptance-path browser smoke generation to group quoted text with the route mentioned in the same criterion.
- Kept assertions for the same route merged, so repeated criteria for `/tasks` still produce one route check with all relevant route-local assertions.
- Exported the criterion-grouped helper for future handoff diagnostics and orchestration wiring.
- Added `runTestAgentAcceptancePathGroupingSelfTest`.

## Verification Scenario

The new self-test launches a real local web fixture:

- Root `/` renders a generic home page.
- `/tasks` renders `Tasks Ready`.
- `/settings` renders `Settings Saved`.
- Acceptance criteria mention both route-specific texts.
- TestAgent generates two browser smoke checks.
- The `/tasks` check includes `Tasks Ready` and `/tasks`, but not `Settings Saved`.
- The `/settings` check includes `Settings Saved` and `/settings`, but not `Tasks Ready`.
- Playwright visits both routes and both checks pass.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAcceptancePathGroupingSelfTest`
- `runTestAgentAcceptancePathSmokeSelfTest`
- `runTestAgentAcceptanceDerivedChecksSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
