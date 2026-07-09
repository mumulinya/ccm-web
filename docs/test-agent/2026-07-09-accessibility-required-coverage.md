# Accessibility Required Coverage

## Summary

Tightened required-check coverage for accessibility verification. A generic passing browser check no longer proves `accessibility`, `a11y`, or `aria`; TestAgent now requires accessibility/ARIA assertion steps or an accessibility snapshot artifact.

## Added

- New dedicated coverage signal for:
  - `accessibility`
  - `a11y`
  - `aria`
  - `aria_state`
  - `aria_assertion`
  - `browser_accessibility`
  - `screen_reader`
- Existing `browser_accessibility_snapshot`, `accessibility_snapshot`, and `a11y_snapshot` coverage still require accessibility snapshot artifact evidence.
- `runTestAgentRequiredCheckCoverageSelfTest` now covers generic browser evidence, passing accessibility evidence, snapshot evidence, and failed accessibility assertion evidence.

## Behavior

- `browser_e2e` can be verified by a passing browser check.
- `accessibility` requires at least one of:
  - passing accessible name/description assertion,
  - passing ARIA state assertion,
  - passing ARIA snapshot assertion,
  - accessibility snapshot artifact.
- `browser_accessibility_snapshot` specifically requires a snapshot artifact.
- Failed accessibility/ARIA assertion steps mark `accessibility` as `not_verified`.
- A browser check with only text/URL/visibility assertions leaves `accessibility` as `unknown`.

This prevents TestAgent from accepting accessibility requirements based only on unrelated UI evidence.

## Verification

- Extended `runTestAgentRequiredCheckCoverageSelfTest`.
- The self-test verifies:
  - generic browser evidence verifies `browser_e2e`,
  - generic browser evidence does not verify `accessibility` or `aria`,
  - accessibility/ARIA assertion steps verify `accessibility` and `aria`,
  - accessibility snapshot artifacts verify `browser_accessibility_snapshot`,
  - failed accessibility assertion steps mark `accessibility` as `not_verified`.
