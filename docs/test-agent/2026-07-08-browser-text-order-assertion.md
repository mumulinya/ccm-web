# TestAgent browser text order assertion

## Goal

Add a real browser assertion for ordered text sequences to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser assertion type `textOrder`.
- Added handoff-friendly aliases:
  - `text_order`
  - `text_sequence`
  - `element_text_order`
  - `list_order`
  - `order_includes`
  - `sequence_in_order`
- Reused existing assertion fields:
  - `selector` / `locator` / semantic locator fields for an optional container
  - `texts`, `values`, `expectedTexts`, `expected_texts` for the expected sequence
- Implemented Playwright polling against the target container's visible text, falling back to `body` when no container is supplied.
- Implemented MCP page-text fallback so snapshot-capable browser adapters can still verify simple order assertions.
- Added failure messages that report expected count, found count, and missing index instead of dumping full page text or expected text.
- Added a real Playwright self-test fixture that sorts a task list descending after a click, plus a negative case that expects the old order.
- Added `browser_text_order_assertions` to the TestAgent capability profile.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserTextOrderAssertionSelfTest`
  - `runTestAgentBrowserElementScreenshotAssertionSelfTest`
  - `runTestAgentBrowserClipboardAssertionSelfTest`

## Notes

This is useful for sorted lists, kanban column order, drag-and-drop reorder flows, priority queues, search results, and any UI where completion depends on relative order rather than only the presence of text.
