# TestAgent browser dragTo action

## Goal

Add real Playwright-backed drag and drop support to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser action type `dragTo`.
- Added handoff-friendly aliases:
  - `drag`
  - `drag_to`
  - `drag_and_drop`
  - `drop`
  - `move_to`
- Added destination locator fields for the drop target:
  - `destinationSelector` / `destination_selector`
  - `destinationLocator` / `destination_locator`
  - `destinationTestId` / `destination_test_id`
  - `destinationDataTestId` / `destination_data_testid`
  - `destinationLabel` / `destination_label`
  - `destinationPlaceholder` / `destination_placeholder`
  - `destinationRole` / `destination_role`
  - `destinationName` / `destination_name`
  - `destinationText` / `destination_text`
  - `destinationAltText` / `destination_alt_text`
  - `destinationTitle` / `destination_title`
  - `destinationExact` / `destination_exact`
- Added common handoff synonyms such as `to_selector`, `drop_selector`, `to_test_id`, `drop_role`, and `to_text`.
- Implemented Playwright `locator.dragTo()` with semantic source and destination locators.
- Added explicit unsupported results for MCP browser adapters so drag/drop does not silently pass through a weak fallback.
- Added a real Playwright self-test fixture with a draggable task card and a Done column, plus a missing-destination negative case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserDragToActionSelfTest`
  - `runTestAgentBrowserTableAssertionSelfTest`
  - `runTestAgentBrowserDialogAssertionSelfTest`

## Notes

This pass intentionally keeps drag/drop locator-based instead of adding coordinate dragging. Locator-based drag is more stable for web-app verification and fits the existing semantic locator model. Coordinate drag can be added later as a separate capability when needed.
