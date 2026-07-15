# Browser Element Count At Most

Date: 2026-07-08

## Goal

Extend TestAgent list/count verification with an upper-bound assertion. This helps prove filtered search results, deletion flows, permission-limited lists, and capped result sets do not render too many items.

## New Assertion

```json
{ "type": "elementCountAtMost", "role": "listitem", "maxCount": 5 }
```

Accepted aliases:

- `element_count_at_most`
- `count_at_most`
- `max_count`
- `maximum_count`

Accepted max-count fields:

- `maxCount`
- `max_count`
- `count`
- `value`
- `text`

## Changes

- Added `elementCountAtMost` browser assertion type.
- Added work-order aliases and contract schema fields for max count.
- Playwright provider now waits within the assertion timeout until the locator count is at or below the max count.
- MCP browser adapters return an explicit unsupported result because they do not expose stable DOM count reads.
- Extended `runTestAgentBrowserElementCountSelfTest` to cover at-most pass and fail cases.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserElementCountSelfTest`: PASS
  - `runTestAgentBrowserFocusStateSelfTest`: PASS
  - `runTestAgentBrowserAttributeAssertionSelfTest`: PASS
- Full TestAgent self-test matrix: 63/63 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
