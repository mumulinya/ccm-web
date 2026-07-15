# Console Warning Required Coverage

## Summary

Tightened required-check coverage for console warning verification. A generic passing browser check no longer proves `console_warnings`; TestAgent now needs console warning assertion evidence or captured console telemetry/log evidence, and observed warning messages mark the requirement as not verified.

## Changed

- Added a dedicated `consoleWarningSignal(...)` in `backend/test-agent/required-checks.ts`.
- Mapped required checks such as:
  - `console_warnings`
  - `no_console_warnings`
  - `console_no_warnings`
- The signal now accepts:
  - passing `consoleNoWarnings` assertion steps,
  - captured console messages,
  - console log artifact paths.
- Warning-like console messages such as `[warning] deprecated API used` make `console_warnings` `not_verified`.
- `console_errors` remains separate: warning-only telemetry does not fail the error-free requirement.

## Why

Before this, warning-focused required checks could fall through to the broader console rule and be treated like `console_errors`. That meant a browser run with no error messages could accidentally satisfy a warning-free requirement even if warning telemetry was absent or warning messages were present.

This keeps TestAgent closer to real browser verification: warning cleanliness is a distinct runtime signal, not a side effect of the page loading.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence verifies `browser_e2e` but leaves `console_warnings` unknown,
- `consoleNoWarnings` plus console telemetry verifies `console_warnings`,
- warning-only console telemetry marks `console_warnings` as `not_verified`,
- warning-only console telemetry still leaves `console_errors` verified.
