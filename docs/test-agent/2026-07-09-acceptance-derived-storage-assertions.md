# Acceptance-Derived Web Storage Assertions

## Summary

Extended TestAgent's acceptance-derived browser checks so explicit Web Storage requirements in human acceptance criteria become real browser assertions. This lets the group main agent hand off storage expectations as text while the independent TestAgent verifies them through Playwright instead of only reviewing code.

## Added

- New parser module: `backend/test-agent/browser/acceptance-storage-assertions.ts`.
- New derived assertion reason: `web_storage`.
- New inferred assertion types:
  - `localStorageEquals`
  - `localStorageIncludes`
  - `sessionStorageEquals`
  - `sessionStorageIncludes`
- Required check coverage for:
  - `browser_storage`
  - `web_storage`
  - `local_storage`
  - `session_storage`
  - `storage`
- Assertion de-duplication now includes the Web Storage `key`, so separate keys using the same assertion type are preserved.

## Behavior

Examples:

```text
At /app, localStorage key "profile.saved" equals "yes".
At /app, sessionStorage key "draft.notice" includes "draft".
At /app, storage key "feature.flag" equals "enabled".
```

Produces browser assertions for the `/app` smoke check:

- `localStorageEquals` with `key=profile.saved`, `value=yes`
- `sessionStorageIncludes` with `key=draft.notice`, `value=draft`
- `localStorageEquals` with `key=feature.flag`, `value=enabled`
- `urlIncludes: /app`

When a criterion produces Web Storage assertions, quoted key/value strings are not also converted into visible text assertions. This avoids false failures where storage values are intentionally not rendered on the page.

Unqualified `storage key` defaults to `localStorage`, because the phrase usually describes persisted browser state. Use `sessionStorage` explicitly when the expected state is session-scoped.

## Boundaries

- The derivation requires an explicit storage phrase such as `localStorage`, `sessionStorage`, `web storage`, or `storage`.
- It requires an explicit key and quoted expected value.
- It supports equality and contains/includes comparisons.
- It does not infer IndexedDB, Cache Storage, cookies, or server-side persistence.
- MCP providers remain best-effort for browser storage assertions; Playwright is the precise provider.

## Verification

- Added `runTestAgentAcceptanceDerivedStorageAssertionSelfTest`.
- The self-test verifies:
  - storage assertions are derived from acceptance criteria,
  - generic `storage key` maps to `localStorage`,
  - storage key/value quotes are not treated as visible page text,
  - path-scoped auto smoke checks carry the generated storage assertions,
  - `browser_storage` required check coverage is verified from browser steps,
  - a real Playwright browser verifies generated checks on a local `/app` page.
