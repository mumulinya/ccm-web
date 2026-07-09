# Browser Attribute Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify DOM and ARIA attribute state after real browser interaction. This covers UI state that may not change visible text, such as `aria-expanded`, `aria-selected`, `aria-current`, and `data-state`.

## New Assertions

```json
{ "type": "attributeEquals", "role": "button", "name": "Menu", "attribute": "aria-expanded", "value": "true" }
```

```json
{ "type": "attributeIncludes", "role": "button", "name": "Menu", "attributeName": "data-state", "value": "active" }
```

Accepted attribute-name fields:

- `attribute`
- `attr`
- `attributeName`
- `attribute_name`
- `key`

Accepted aliases:

- `attribute_equals`
- `attr_equals`
- `attribute_value_equals`
- `aria_equals`
- `attribute_includes`
- `attr_includes`
- `attribute_value_includes`
- `aria_includes`

## Changes

- Added `attributeEquals` and `attributeIncludes` browser assertion types.
- Added work-order normalization and contract schema fields for attribute assertions.
- Playwright provider now resolves semantic locators and verifies `getAttribute(...)`.
- Failure messages include the target, attribute name, expected length, and actual length, not the raw attribute value.
- MCP browser adapters return an explicit unsupported result because they do not expose stable DOM attribute reads.
- Added `runTestAgentBrowserAttributeAssertionSelfTest` with real pass/fail ARIA/data-state fixtures.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserAttributeAssertionSelfTest`: PASS
  - `runTestAgentBrowserEnabledStateSelfTest`: PASS
  - `runTestAgentBrowserInputValueAssertionSelfTest`: PASS
- Full TestAgent self-test matrix: 61/61 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
