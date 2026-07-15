# Acceptance Select And Checkbox Form Flow

## Goal

Extend acceptance-derived browser form flows beyond text inputs. TestAgent can now infer common select and checkbox controls from acceptance criteria and execute them in a real browser.

Example criterion:

```text
At /settings, select "High" in "Priority", check "Notify team", enter "Quarterly plan" into "Title", click "Save", then shows "Saved Quarterly plan High notify".
```

Generated browser actions include:

- `goto` `/settings`
- `selectOption` label `Priority` value `High`
- `check` label `Notify team`
- `fill` label `Title` value `Quarterly plan`
- `click` button `Save`
- visible text and URL assertions

## Changes

- `acceptance-form-flows.ts` now tracks each inferred control action as `fill`, `selectOption`, or `check`.
- Added extraction for select verbs:
  - `select`
  - `choose`
  - `pick`
- Added extraction for checkbox verbs:
  - `check`
  - `tick`
  - `enable`
- Existing text input flow behavior is preserved.
- Added a real Playwright self-test with a select, checkbox, text input, submit button, visible status assertion, screenshot artifact, and acceptance coverage check.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest`: PASS
  - `runTestAgentAcceptanceFormFlowSelfTest`: PASS
  - `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`: PASS
  - `runTestAgentAcceptanceRedirectFormFlowSelfTest`: PASS
- Full TestAgent self-test matrix: 46/46 PASS

## Follow-up

- Add `uncheck` extraction for criteria that explicitly disable a checkbox.
- Add radio-button extraction when acceptance criteria mention choosing one of several options.
- Add select-by-label fallback if an option value differs from its visible label.
