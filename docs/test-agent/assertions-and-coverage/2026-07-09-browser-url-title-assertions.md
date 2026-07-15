# Browser URL And Title Assertions

## Summary

Added exact and negative URL/title assertions to standalone TestAgent browser checks. This makes route and document-title verification more precise than broad substring checks.

## Added

- New browser assertion types:
  - `urlEquals`
  - `urlNotIncludes`
  - `titleEquals`
  - `titleNotIncludes`
- New aliases:
  - `url_equals`
  - `url_is`
  - `url_exact`
  - `exact_url`
  - `url_not_includes`
  - `url_not_contains`
  - `url_excludes`
  - `title_equals`
  - `title_is`
  - `title_exact`
  - `exact_title`
  - `title_not_includes`
  - `title_not_contains`
  - `title_excludes`
- Playwright provider behavior:
  - `urlEquals` supports full URLs and relative `pathname + search + hash` values such as `/settings?tab=profile#details`.
  - URL assertions wait for delayed navigation when needed.
  - Title assertions poll until the title matches or times out.
- MCP provider behavior:
  - URL assertions use adapter-tracked current URL.
  - Title assertions remain best-effort because MCP adapters do not expose a consistent page title API.
- Added `browser_url_title_assertions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserUrlTitleAssertionSelfTest`.
- The self-test starts a local browser fixture and verifies:
  - exact relative URL matching,
  - URL negative substring checks,
  - exact title checks,
  - negative title checks,
  - delayed title updates,
  - failure when URL/title expectations are wrong.
