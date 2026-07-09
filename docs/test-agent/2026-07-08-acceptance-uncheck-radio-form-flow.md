# Acceptance Uncheck And Radio Form Flow

## Goal

Extend acceptance-derived browser flows to cover disabling a checkbox and selecting an explicit radio option.

Example criterion:

```text
At /preferences, uncheck "Newsletter", choose the radio option "Email", click "Save", then shows "Saved Email newsletter off".
```

Generated browser actions include:

- `goto` `/preferences`
- `uncheck` label `Newsletter`
- `check` label `Email` for the radio input
- `click` button `Save`
- visible text, URL, console, and network assertions

## Changes

- Added `uncheck` as an acceptance form flow action type.
- Added checkbox-disable verbs:
  - `uncheck`
  - `untick`
  - `disable`
  - `clear`
- Added explicit radio extraction for `choose`, `select`, or `pick` phrases that mention a radio button.
- Radio choices use the existing Playwright `check` action by accessible label.
- Generic select extraction ignores segments that explicitly mention radio controls.
- Added a real Playwright self-test with a default-checked newsletter checkbox and a default-selected SMS radio option.

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

- Add radio-group-aware phrasing such as `choose "Email" for "Contact method"` when the criterion does not explicitly say `radio`.
- Add explicit checked/unchecked state assertions for post-action evidence.
