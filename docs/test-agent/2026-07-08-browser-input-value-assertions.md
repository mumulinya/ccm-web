# Browser Input Value Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify the real DOM value of text inputs and textareas after a browser flow. This helps prove that a form field was actually filled or preserved, instead of only relying on a success message somewhere on the page.

## New Assertions

```json
{ "type": "inputValueEquals", "label": "Display name", "value": "Ada Lovelace" }
```

```json
{ "type": "inputValueIncludes", "label": "Display name", "value": "Lovelace" }
```

Accepted aliases:

- `input_value_equals`
- `input_equals`
- `value_equals`
- `field_value_equals`
- `input_value_includes`
- `input_includes`
- `value_includes`
- `field_value_includes`

## Changes

- Added `inputValueEquals` and `inputValueIncludes` browser assertion types.
- Added work-order aliases for natural handoff phrasing.
- Playwright provider now resolves semantic locators and verifies `inputValue()`.
- Failure messages include target detail and value lengths, not the actual input value.
- MCP browser adapters return an explicit unsupported result because they do not expose DOM control values.
- Added `runTestAgentBrowserInputValueAssertionSelfTest` with real pass/fail Playwright fixtures.

## Acceptance Flow Note

This assertion is intentionally explicit for now. Acceptance-derived form flows run all actions before assertions; after submit, many apps redirect, clear fields, or reload. Automatically appending input-value assertions to every inferred form flow would make conservative inference too strict. The group-main-agent can still pass explicit `inputValueEquals` checks when the final field value is part of the requested acceptance criteria.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserInputValueAssertionSelfTest`: PASS
  - `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`: PASS
  - `runTestAgentBrowserCookieAssertionSelfTest`: PASS
- Full TestAgent self-test matrix: 59/59 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
