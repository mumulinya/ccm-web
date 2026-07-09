# TestAgent Acceptance Path Browser Smoke

Date: 2026-07-08

## Goal

When a project handoff only provides a root `targetUrl`, but the acceptance criteria mention a concrete route such as `/tasks`, TestAgent should open that route in the browser and verify the user-facing requirement there.

## Changes

- Added acceptance-path browser smoke generation in `browser/auto-checks.ts`.
- Reused acceptance-derived browser assertions so quoted text and URL expectations are checked on the inferred route.
- Kept explicit handoff browser checks higher priority than auto-generated checks.
- Exported `buildAcceptancePathBrowserSmokeChecks` for direct validation and future orchestration wiring.
- Added `runTestAgentAcceptancePathSmokeSelfTest`.

## Verification Scenario

The new self-test launches a real local web fixture:

- Root `/` renders a generic home page.
- `/tasks` renders `Tasks Ready`.
- The handoff target URL is only the root URL.
- Acceptance criteria mention `Tasks Ready` at `/tasks`.
- TestAgent generates one browser smoke check for `/tasks`.
- Playwright opens `/tasks`, verifies the page is not blank, checks the quoted text, checks the URL path, and records browser evidence.

## Verification Run

Targeted self-tests passed:

- `runTestAgentAcceptancePathSmokeSelfTest`
- `runTestAgentAutoBrowserSmokeSelfTest`
- `runTestAgentBlankPageSmokeSelfTest`

TypeScript compile passed for the TestAgent entrypoints.

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
