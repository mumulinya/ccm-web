# Acceptance-Derived Cookie Assertions

## Summary

Extended TestAgent's acceptance-derived browser checks so explicit cookie requirements in human acceptance criteria become real browser assertions. This keeps cookie/session requirements in the independent TestAgent path instead of relying on code review or a group-chat agent's summary.

## Added

- New parser module: `backend/test-agent/browser/acceptance-cookie-assertions.ts`.
- New derived assertion reason: `browser_cookie`.
- New assertion type:
  - `cookieValueEquals`
- New inferred assertion types:
  - `cookieExists`
  - `cookieValueEquals`
  - `cookieValueIncludes`
- Required check coverage for:
  - `browser_cookie`
  - `cookie`
  - `cookies`
  - `cookie_assertions`
  - `cookie_actions`

## Behavior

Examples:

```text
At /app, cookie "ccm_session" equals "verified-token-123".
At /app, cookie "theme" includes "dark".
At /app, cookie "analytics_id" exists.
```

Produces browser assertions for the `/app` smoke check:

- `cookieValueEquals` with `key=ccm_session`
- `cookieValueIncludes` with `key=theme`
- `cookieExists` with `key=analytics_id`
- `urlIncludes: /app`

Cookie expected values are intentionally not printed in step details or failures; reports include cookie names and expected value lengths to avoid leaking session material.

When a criterion produces cookie assertions, quoted cookie names and values are not also converted into visible text assertions. This avoids false failures where session data is intentionally not rendered on the page.

## Boundaries

- The derivation requires an explicit cookie phrase such as `cookie` or `cookies`.
- It supports existence, equality, and contains/includes comparisons.
- It does not infer which UI action should set a cookie. If a cookie is created after a login or form flow, the work order still needs an explicit browser flow or a future acceptance-flow builder that can infer the interaction.
- MCP browser adapters cannot verify cookies precisely; Playwright is the provider for these assertions.

## Verification

- Added `runTestAgentAcceptanceDerivedCookieAssertionSelfTest`.
- The self-test verifies:
  - cookie assertions are derived from acceptance criteria,
  - cookie equality is verified exactly with `cookieValueEquals`,
  - cookie key/value quotes are not treated as visible page text,
  - path-scoped auto smoke checks carry generated cookie assertions,
  - `browser_cookie` required check coverage is verified from browser steps,
  - a real Playwright browser verifies generated checks against cookies set by a local `/app` response.
