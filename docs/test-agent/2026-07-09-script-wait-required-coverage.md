# Script Wait Required Coverage

## Summary

Added dedicated required-check coverage for browser JavaScript/expression evidence and conditional wait evidence. TestAgent now separates page-internal state verification from generic browser e2e success, and it distinguishes real conditional waits from simple timeout sleeps.

## Changed

- Added `browserScriptSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserWaitSignal(...)` in `backend/test-agent/required-checks.ts`.
- Extended `runTestAgentRequiredCheckCoverageSelfTest` with script/wait fixtures.
- Added `runTestAgentBrowserScriptWaitAssertionSelfTest`.

## Mapped Checks

- Script/expression checks:
  - `browser_js`
  - `browser_script`
  - `browser_javascript`
  - `browser_evaluate`
  - `js`
  - `javascript`
  - `js_assertions`
  - `page_expression`
- Conditional wait checks:
  - `browser_wait`
  - `wait`
  - `wait_conditions`
  - `wait_for_selector`
  - `wait_for_text`
  - `wait_for_url`
  - `async_ui`

## Evidence Rules

- `browser_js` / `browser_script` require passing JavaScript action or assertion evidence such as:
  - `action:evaluate`
  - `assert:jsTruthy`
  - `assert:jsEquals`
- `browser_wait` requires passing conditional wait evidence such as:
  - `action:waitForText`
  - `action:waitForSelector`
  - `action:waitForUrl`
- `waitForTimeout` is intentionally not treated as `browser_wait` evidence by itself.
- Failed matching script or wait steps mark the matching required check as `not_verified`.
- Generic browser evidence leaves these specialized checks `unknown`.

## Why

Browser UI often depends on state that is not fully visible in plain text: localStorage flags, dataset values, readiness markers, async rendering, or delayed navigation. TestAgent should be able to prove those states with browser-side JavaScript and real wait conditions instead of accepting a broad browser pass.

## Verification

Ran:

- `runTestAgentRequiredCheckCoverageSelfTest`
- `runTestAgentBrowserScriptWaitAssertionSelfTest`
- `runTestAgentBrowserStateSelfTest`
- `runTestAgentBrowserScrollActionSelfTest`
- `runTestAgentPlaywrightContextOptionsSelfTest`

Also ran TypeScript compile checks for:

- `backend/test-agent/index.ts`
- `backend/test-agent/cli.ts`
