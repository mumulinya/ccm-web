# TestAgent browser popup assertions

## Goal

Add real browser verification for new window/new tab popup flows to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser assertion types:
  - `popupOpened`
  - `popupUrlIncludes`
  - `popupTextIncludes`
  - `popupTitleIncludes`
- Added handoff-friendly aliases:
  - `popup_opened`
  - `popup_appeared`
  - `popup_shown`
  - `new_page_opened`
  - `new_tab_opened`
  - `popup_url_includes`
  - `popup_text_includes`
  - `popup_title_includes`
- Added optional `popupIndex` / `popup_index` targeting for flows that open more than one popup.
- Implemented Playwright `page.on("popup")` capture with URL, title, and text preview.
- Added popup telemetry logs under browser telemetry and surfaced `popupLogPath` in reports, evidence, and artifact manifests.
- Added explicit MCP unsupported responses because current MCP text snapshots cannot reliably prove new page/popup content.
- Added `browser_popup_assertions` to the TestAgent capability profile.
- Added a real Playwright self-test fixture that opens a local help center popup, plus a negative popup text mismatch case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserPopupAssertionSelfTest`
  - `runTestAgentBrowserDialogAssertionSelfTest`
  - `runTestAgentBrowserTextOrderAssertionSelfTest`

## Notes

This helps TestAgent verify OAuth handoffs, help/documentation links, external previews, report popouts, and other flows where success depends on a new browser page rather than only the original tab.
