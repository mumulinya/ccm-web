# Browser Cookie Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify browser session state after a real UI flow. This is useful for login and account flows where the page can show success text but the feature is only complete if a session cookie is actually set.

## New Assertions

```json
{ "type": "cookieExists", "key": "ccm_session" }
```

```json
{ "type": "cookieValueIncludes", "key": "ccm_session", "value": "verified-token" }
```

Accepted aliases:

- `cookie_exists`
- `has_cookie`
- `cookie_present`
- `cookie_value_includes`
- `cookie_includes`
- `cookie_contains`

## Changes

- Added `cookieExists` and `cookieValueIncludes` browser assertion types.
- Added work-order aliases for natural handoff phrasing.
- Playwright provider now reads cookies from the current browser context and verifies cookie presence/value shape.
- Cookie assertion details include cookie name and expected substring length, not the actual cookie value.
- MCP browser adapters return an explicit unsupported result because they do not expose browser cookies to TestAgent.
- Added `runTestAgentBrowserCookieAssertionSelfTest` with a real login fixture that sets a cookie through a browser `fetch` flow.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserCookieAssertionSelfTest`: PASS
  - `runTestAgentBrowserStateSelfTest`: PASS
  - `runTestAgentPlaywrightInViewportSelfTest`: PASS
- Full TestAgent self-test matrix: 58/58 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
