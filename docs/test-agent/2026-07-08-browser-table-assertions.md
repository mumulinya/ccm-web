# TestAgent browser table assertions

## Goal

Add Playwright-backed table row and cell assertions to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser assertion types:
  - `tableRowIncludes`
  - `tableCellTextIncludes`
  - `tableCellTextEquals`
- Added handoff-friendly aliases such as `table_row_includes`, `table_cell_includes`, `table_cell_text_equals`, `row_contains`, and `cell_equals`.
- Added table targeting fields:
  - `tableSelector` / `table_selector`
  - `tableLocator` / `table_locator`
  - `rowText` / `row_text`
  - `rowIndex` / `row_index`
  - `rowNumber` / `row_number`
  - `columnName` / `column_name`
  - `columnHeader` / `column_header`
  - `columnIndex` / `column_index`
  - `columnNumber` / `column_number`
  - `texts`, `values`, `expectedTexts`, `expected_texts`
- Added Playwright DOM evaluation for real `<table>` elements and ARIA table/grid structures.
- Added polling so dynamic table updates after browser actions can be verified.
- Added MCP explicit unsupported responses for table structure checks.
- Added a real Playwright self-test fixture that updates an orders table after a click, plus a negative cell mismatch case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserTableAssertionSelfTest`
  - `runTestAgentBrowserDialogAssertionSelfTest`
  - `runTestAgentBrowserElementCountSelfTest`

## Notes

The assertion failure text reports row/column context and text lengths instead of dumping actual cell values. The page snapshot and screenshot remain available as evidence when deeper inspection is needed.
