# Browser Accessibility Assertions

## Summary

Added browser accessibility assertions to standalone TestAgent. This lets TestAgent verify that a real web UI exposes expected accessible names, descriptions, and ARIA snapshot text instead of only checking visible DOM text.

## Added

- New browser assertion types:
  - `accessibleNameEquals`
  - `accessibleNameIncludes`
  - `accessibleDescriptionEquals`
  - `accessibleDescriptionIncludes`
  - `ariaSnapshotIncludes`
- New aliases:
  - `accessible_name_equals`
  - `accessible_name_is`
  - `accessible_name`
  - `aria_name_equals`
  - `aria_name`
  - `accessible_name_includes`
  - `accessible_name_contains`
  - `aria_name_includes`
  - `aria_name_contains`
  - `accessible_description_equals`
  - `accessible_description_is`
  - `aria_description_equals`
  - `accessible_description_includes`
  - `accessible_description_contains`
  - `aria_description_includes`
  - `aria_description_contains`
  - `aria_snapshot_includes`
  - `aria_snapshot_contains`
  - `accessibility_snapshot_includes`
  - `accessibility_snapshot_contains`
- New business helper file:
  - `backend/test-agent/browser/accessibility-assertions.ts`
- Playwright provider behavior:
  - Accessible names are derived from common browser semantics such as `aria-labelledby`, `aria-label`, associated labels, `alt`, button/input values, text, title, and placeholder fallback.
  - Accessible descriptions are derived from `aria-describedby` and `aria-description`.
  - `ariaSnapshotIncludes` uses Playwright `locator.ariaSnapshot()` when available and falls back to a compact role/name/description string.
  - Failure messages report expected and actual lengths instead of echoing sensitive expected UI text.
- MCP provider behavior:
  - `ariaSnapshotIncludes` can be checked best-effort against snapshot/page text exposed by the MCP browser adapter.
  - Precise accessible name and description assertions fail explicitly with guidance to use the Playwright provider.
  - Computer Use remains unsupported for accessibility-tree assertions.
- Added `browser_accessibility_assertions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserAccessibilityAssertionSelfTest`.
- The self-test verifies:
  - Playwright passes exact and substring accessible name checks,
  - Playwright passes exact and substring accessible description checks,
  - Playwright passes ARIA snapshot substring checks,
  - wrong accessible-name expectations fail without leaking the expected text,
  - MCP can best-effort pass `ariaSnapshotIncludes`,
  - MCP fails precise accessible-name assertions with a clear provider-boundary message.
