# Browser Focus State Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify real browser focus state. This helps catch keyboard-accessibility and form-flow bugs where the right control exists and is enabled, but focus does not land where the user workflow expects.

## New Assertions

```json
{ "type": "focused", "label": "Email" }
```

```json
{ "type": "notFocused", "role": "button", "name": "Save" }
```

Accepted aliases:

- `focused`
- `has_focus`
- `is_focused`
- `not_focused`
- `blurred`
- `does_not_have_focus`

## Changes

- Added `focused` and `notFocused` browser assertion types.
- Added work-order aliases for natural handoff phrasing.
- Playwright provider now resolves semantic locators and waits for the expected `document.activeElement` state within the assertion timeout.
- MCP browser adapters return an explicit unsupported result because they do not expose stable `activeElement` access.
- Added `runTestAgentBrowserFocusStateSelfTest` with real pass/fail browser fixtures.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserFocusStateSelfTest`: PASS
  - `runTestAgentBrowserAttributeAssertionSelfTest`: PASS
  - `runTestAgentBrowserEnabledStateSelfTest`: PASS
- Full TestAgent self-test matrix: 62/62 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
