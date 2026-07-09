# Browser Checked State Assertions

## Goal

Make TestAgent prove checkbox and radio final state after browser actions. This complements acceptance-derived `check`, `uncheck`, and radio flows by recording explicit state assertions in the browser evidence.

## New Assertions

- `checked`
- `notChecked`

Examples:

```json
{ "type": "checked", "label": "Notify team" }
```

```json
{ "type": "notChecked", "label": "Newsletter" }
```

## Changes

- Added `checked` and `notChecked` browser assertion types.
- Added work-order aliases:
  - `is_checked`
  - `not_checked`
  - `unchecked`
  - `checkbox_checked`
  - `checkbox_unchecked`
- Playwright provider now verifies checked state using locator `isChecked`.
- MCP browser adapters return an explicit unsupported message for checked-state assertions because they do not expose DOM checked properties.
- Acceptance-derived form flows now add:
  - `checked` after inferred `check` actions.
  - `notChecked` after inferred `uncheck` actions.
- Updated real browser self-tests for checkbox, radio, and uncheck flows to assert these state checks pass.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentAcceptanceUncheckRadioFormFlowSelfTest`: PASS
  - `runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest`: PASS
- Full TestAgent self-test matrix: 47/47 PASS

## Follow-up

- Add explicit select value assertions for post-select evidence.
- Add MCP checked-state support if a future MCP browser adapter exposes DOM property evaluation.
