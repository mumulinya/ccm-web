# Acceptance Responsive Viewport Checks

## Summary

Added acceptance-derived responsive/mobile browser checks. When acceptance criteria mention mobile, responsive layouts, small screens, or horizontal overflow, TestAgent now generates a real Playwright browser check at a mobile viewport instead of relying only on desktop smoke checks.

## Added

- New helper:
  - `backend/test-agent/browser/acceptance-responsive-checks.ts`
- New probe type:
  - `acceptance_responsive_viewport`
- New exported APIs:
  - `ACCEPTANCE_RESPONSIVE_PROBE_TYPE`
  - `buildAcceptanceResponsiveBrowserChecks`
- New capability profile entry:
  - `acceptance_criteria_to_responsive_browser_checks`
- New self-test:
  - `runTestAgentAcceptanceResponsiveViewportSelfTest`

## Behavior

For criteria such as:

```text
Mobile responsive page at /responsive shows "Mobile navigation ready" with no horizontal overflow.
```

TestAgent generates a browser check that:

- opens `/responsive`,
- uses a `390x844` mobile viewport,
- marks the context as mobile,
- asserts the page is not blank,
- asserts `noHorizontalOverflow`,
- carries acceptance-derived text and URL assertions,
- captures normal screenshots and browser snapshots.

## Coverage

Required checks such as `responsive`, `mobile`, `viewport`, and `horizontal_overflow` now map to responsive/mobile browser evidence. Passing responsive checks can therefore verify these required checks instead of leaving them unknown.

## Verification

The self-test starts a local responsive page, derives a mobile check from acceptance text, runs it in Playwright, and verifies:

- generated probe type is `acceptance_responsive_viewport`,
- viewport is `390x844` and mobile,
- `noHorizontalOverflow` passes,
- mobile-only text is verified,
- required check `responsive` is marked verified.
