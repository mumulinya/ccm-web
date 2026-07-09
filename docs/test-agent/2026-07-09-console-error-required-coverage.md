# Console Error Required Coverage

## Summary

Tightened required-check coverage for console error verification. `console_errors` now requires real console/page-error evidence or an explicit `consoleNoErrors` assertion, and it no longer treats unrelated console assertion failures, such as `consoleNoWarnings`, as console error failures.

## Changed

- Refined `consoleSignal(...)` in `backend/test-agent/required-checks.ts`.
- `console_errors` now fails only on:
  - captured console error telemetry,
  - captured page errors,
  - failed `consoleNoErrors` / page-error assertions.
- Warning-only telemetry no longer fails `console_errors`; it is handled by `console_warnings`.
- Failed `consoleNoWarnings` assertions no longer make `console_errors` fail.
- Computer Use MCP browser checks no longer prove console cleanliness unless they have explicit console evidence. Computer Use can still verify broad browser interaction, but it does not expose browser console telemetry to TestAgent.

## Why

The group main agent will eventually ask TestAgent whether a project is safe to accept. A web page opening successfully is not the same thing as proving the runtime console is clean, especially when the provider cannot read console messages. This change keeps the required-check result honest:

- clean console evidence -> `verified`,
- observed console error -> `not_verified`,
- provider lacks console evidence -> `unknown`.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence leaves `console_errors` unknown,
- warning-only telemetry still verifies `console_errors`,
- failed `consoleNoWarnings` does not fail `console_errors`,
- error-like console telemetry marks `console_errors` as `not_verified`,
- Computer Use MCP evidence leaves both `console_errors` and `console_warnings` unknown.
