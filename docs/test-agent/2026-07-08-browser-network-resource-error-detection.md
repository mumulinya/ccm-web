# TestAgent Browser Network Resource Error Detection

Date: 2026-07-08

## Goal

Strengthen the independent TestAgent browser verifier so a web page that visibly renders but has same-origin runtime resource failures cannot be accepted by accident.

## Changes

- Added Playwright response classification in `backend/test-agent/browser/playwright-provider.ts`.
- Preserved the existing `failOnHttpResourceError` option as the control flag for same-origin browser 4xx resource responses.
- Kept server errors (`>=500`) as hard network errors.
- Added conservative filtering for low-signal browser noise such as `/favicon.ico` and source map misses.
- Enriched browser network telemetry lines with Playwright resource type, for example `response 404 fetch ...`.
- Added `runTestAgentPlaywrightResourceErrorSelfTest` in `backend/test-agent/self-test.ts`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Verification Scenario

The new self-test launches a real local web fixture:

- The page itself returns HTTP 200.
- The HTTP page probe passes.
- Browser JavaScript performs `fetch('/api/missing')`.
- The fetch returns 404.
- Playwright records `http_resource_error 404 fetch ...`.
- The `networkNoErrors` browser assertion fails.
- Required check `network` becomes `not_verified`.
- The report status is `failed` with recommendation `rework`.

This proves the browser provider itself detects runtime network failures, rather than relying only on static HTTP resource extraction.

## Verification Run

- TypeScript no-emit compile passed for `backend/test-agent/index.ts` and `backend/test-agent/cli.ts`.
- Targeted `runTestAgentPlaywrightResourceErrorSelfTest` passed.
- Existing real-browser regressions passed:
  - `real-playwright-browser`
  - `standalone-cli-real-web`
  - `standalone-handoff-real-web`
- Full TestAgent self-test matrix passed: 33 passed, 0 failed.

## Notes

This change does not touch group chat or collaboration code. It only improves the standalone TestAgent browser verification path.
