# Dialog And Popup Required Coverage

## Summary

Added required-check coverage for browser dialog and popup verification. TestAgent can now distinguish between a generic browser pass, a telemetry log artifact, and real dialog/popup evidence from assertions or captured browser events.

## Changed

- Added dialog coverage mapping in `backend/test-agent/required-checks.ts` for checks such as:
  - `browser_dialog`
  - `dialog`
  - `dialog_assertions`
  - `alert`, `confirm`, `prompt`
- Added popup coverage mapping for checks such as:
  - `browser_popup`
  - `popup`
  - `popup_assertions`
  - `new_tab`, `new_window`
- Added artifact-log coverage for:
  - `browser_dialog_log`
  - `dialog_log`
  - `browser_popup_log`
  - `popup_log`

## Evidence Rules

- `browser_dialog` requires a passing dialog assertion or captured dialog telemetry.
- `browser_popup` requires a passing popup assertion or captured popup telemetry.
- Empty dialog/popup log artifacts do not prove that a dialog or popup appeared.
- `browser_dialog_log` and `browser_popup_log` only prove that telemetry log artifacts were written.
- Failed dialog/popup assertions mark the matching required check as `not_verified`.

## Why

Dialog and popup flows often represent real product behavior: confirmations, prompts, OAuth windows, help-center links, report popouts, and external previews. A page load alone should not satisfy those requirements, and an empty log file should not be treated as the feature working.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence leaves `browser_dialog` and `browser_popup` unknown,
- dialog/popup log artifacts verify only their log-specific checks,
- passing dialog assertions verify `browser_dialog`,
- failed dialog assertions mark `browser_dialog` as `not_verified`,
- passing popup assertions verify `browser_popup`,
- failed popup assertions mark `browser_popup` as `not_verified`.
