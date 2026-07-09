# Browser Console Assertions

## Summary

Added explicit browser console message assertions to standalone TestAgent browser checks. This lets TestAgent verify runtime signals such as feature-ready logs and fail deliveries that emit unexpected warnings, instead of only checking console errors.

## Added

- New browser assertion types:
  - `consoleIncludes`
  - `consoleNotIncludes`
  - `consoleNoWarnings`
- New aliases:
  - `console_includes`
  - `console_contains`
  - `console_message_includes`
  - `console_message_contains`
  - `console_has_message`
  - `console_not_includes`
  - `console_not_contains`
  - `console_message_not_includes`
  - `console_message_not_contains`
  - `no_console_message`
  - `no_console_warning`
  - `no_console_warnings`
  - `console_no_warning`
  - `console_no_warnings`
- New business helper file:
  - `backend/test-agent/browser/console-assertions.ts`
- Playwright provider behavior:
  - `consoleIncludes` waits for delayed console events captured from `page.on("console")`.
  - `consoleNotIncludes` and `consoleNoWarnings` use the assertion `settleMs` window, defaulting to a short wait.
  - Console assertion details avoid echoing expected sensitive text and report expected substring length.
- MCP provider behavior:
  - Browser-native MCP adapters now expose raw console messages when available.
  - MCP `consoleNoErrors` filters actual error-like lines instead of treating ordinary info/log output as errors.
  - Computer Use remains unsupported for console telemetry because it does not expose browser console logs.
- Added console assertion capabilities to the TestAgent profile.

## Verification

- Added `runTestAgentBrowserConsoleAssertionSelfTest`.
- The self-test verifies:
  - delayed Playwright console messages are observed,
  - negative console substring assertions pass when absent,
  - warning-free assertions pass on clean pages,
  - warning telemetry fails `consoleNoWarnings`,
  - `consoleNotIncludes` fails when the warning text appears,
  - MCP console info/log output can be asserted without being misclassified as console errors.
