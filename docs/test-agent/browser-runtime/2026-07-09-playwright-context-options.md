# Playwright Context Options

## Summary

Added browser context configuration to standalone TestAgent Playwright checks. This lets work orders verify the running product under realistic browser environment settings such as locale, timezone, media preferences, granted permissions, and geolocation.

## Added

- Browser check fields:
  - `locale`
  - `timezoneId` / `timezone_id` / `timezone`
  - `colorScheme` / `color_scheme`
  - `reducedMotion` / `reduced_motion`
  - `permissions`
  - `geolocation`
- Nested `context` object support for the same options.
- Playwright provider wiring:
  - passes locale/timezone/media/geolocation into `browser.newContext`,
  - grants requested permissions for monitored origins,
  - records applied context options in `BrowserCheckResult.contextOptions`.
- Markdown report output now includes a compact browser context summary.
- Added `browser_context_options` to the TestAgent capability profile.

## Verification

- Added `runTestAgentPlaywrightContextOptionsSelfTest`.
- The self-test starts a local browser fixture and verifies:
  - `Intl.DateTimeFormat().resolvedOptions().locale`,
  - `Intl.DateTimeFormat().resolvedOptions().timeZone`,
  - `prefers-color-scheme`,
  - `prefers-reduced-motion`,
  - granted geolocation coordinates,
  - failure when the expected timezone does not match the applied context.

## Notes

These options are currently Playwright-provider capabilities. MCP browser providers do not expose a consistent cross-tool way to emulate locale, timezone, media preferences, or permissions, so they should not be treated as supporting this context contract.
