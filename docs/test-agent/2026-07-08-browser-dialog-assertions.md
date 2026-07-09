# TestAgent browser dialog assertions

## Goal

Add Playwright-backed browser dialog verification to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser assertion types:
  - `dialogAppeared`
  - `dialogMessageIncludes`
  - `dialogTypeEquals`
- Added work-order aliases for handoff-friendly input, including `alert_message_includes`, `dialog_type_equals`, `alert_appeared`, `confirm_appeared`, and `prompt_appeared`.
- Added Playwright `page.on("dialog")` telemetry that records dialog type, message, default value, timestamp, and auto-accept result.
- Added `.dialogs.log` telemetry artifacts next to existing console and network browser logs.
- Added report, evidence, artifact manifest, and acceptance coverage wiring for dialog telemetry.
- Added MCP adapter explicit unsupported results so native dialog checks do not silently pass without Playwright.
- Added a real Playwright self-test fixture that triggers alert, confirm, and prompt dialogs, plus a negative message-mismatch case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserDialogAssertionSelfTest`
  - `runTestAgentBrowserElementCountSelfTest`
  - `runTestAgentBrowserAttributeAssertionSelfTest`
  - `runTestAgentBrowserCookieAssertionSelfTest`

## Notes

Dialog message assertions keep expected text out of step detail and record it in the dialog log artifact instead. This keeps step summaries compact while preserving auditable evidence.
