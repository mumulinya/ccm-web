# Browser Element Count Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify repeated DOM content and list sizes after real browser interaction. This catches feature failures where text appears, but the number of rendered items is wrong, such as add/delete flows, filtered lists, search results, and member/task counts.

## New Assertions

```json
{ "type": "elementCountEquals", "role": "listitem", "count": 2 }
```

```json
{ "type": "elementCountAtLeast", "role": "listitem", "minCount": 2 }
```

```json
{ "type": "elementCountAtMost", "role": "listitem", "maxCount": 5 }
```

Accepted count fields:

- `count`
- `expectedCount`
- `expected_count`
- `minCount`
- `min_count`
- `maxCount`
- `max_count`
- `value`
- `text`

Accepted aliases:

- `element_count_equals`
- `element_count`
- `count_equals`
- `count_is`
- `element_count_at_least`
- `count_at_least`
- `min_count`
- `minimum_count`
- `element_count_at_most`
- `count_at_most`
- `max_count`
- `maximum_count`

## Changes

- Added `elementCountEquals`, `elementCountAtLeast`, and `elementCountAtMost` browser assertion types.
- Added work-order normalization and contract schema fields for count assertions.
- Playwright provider now resolves semantic locators and waits within the assertion timeout for the expected count condition.
- MCP browser adapters return an explicit unsupported result because they do not expose stable DOM count reads.
- Added `runTestAgentBrowserElementCountSelfTest` with real pass/fail task-list fixtures.

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
