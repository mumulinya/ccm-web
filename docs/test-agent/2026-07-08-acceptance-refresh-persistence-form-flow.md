# Acceptance Refresh Persistence Form Flow

## Goal

Make TestAgent infer browser-level refresh persistence checks directly from acceptance criteria such as "still shows after refresh". This helps catch web features that look saved before reload but disappear after the page is refreshed.

## Changes

- Added refresh/reload intent detection to acceptance form flows.
- Generated form-flow actions now become:
  - open the target path
  - fill/select/check inferred controls
  - click the inferred submit button
  - wait briefly for post-submit state
  - reload the page when the criterion asks for refresh persistence
  - wait briefly after reload
  - assert final text, URL, console, and network state
- Kept the public `BrowserCheckSpec` shape unchanged; refresh intent is expressed through the generated `reload` action.
- Added `runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest` with a real local web page that saves to `localStorage`, reloads, and proves the saved task is still visible.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest`: PASS
  - `runTestAgentAcceptanceRedirectFormFlowSelfTest`: PASS
- Full TestAgent self-test matrix: 49/49 PASS

## Follow-up

- Consider adding delayed async-save heuristics if a future app needs to wait for a specific network response before reload.
- Consider generating localStorage/sessionStorage assertions when acceptance text names the storage key explicitly.
