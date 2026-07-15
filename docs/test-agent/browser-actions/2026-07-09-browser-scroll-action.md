# TestAgent browser scroll action

## Goal

Make the standalone CCM TestAgent perform real Playwright scroll actions instead of accepting a normalized `scroll` action without browser-side behavior. Do not touch group collaboration code.

## Implemented

- Added handoff-friendly scroll aliases:
  - `scroll_down`
  - `scroll_up`
  - `scroll_left`
  - `scroll_right`
  - `wheel`
  - `mouse_wheel`
- Added direction inference for scroll aliases, while still honoring explicit `direction`.
- `amount`, `delta`, `pixels`, or numeric `value` can provide the Playwright scroll distance.
- Implemented Playwright `scroll` action:
  - Without a target, scrolls the page via deterministic `window.scrollBy`.
  - With `coordinate`, moves the mouse and uses `page.mouse.wheel`.
  - With a selector/test id/role/label target, scrolls that element via `element.scrollBy`.
- Added clear action detail such as `page; down 920px`.
- Changed Playwright action handling to fail explicitly for unmapped actions instead of silently reporting success.
- Added `browser_scroll_actions` to the TestAgent capability profile.
- Added a real Playwright self-test fixture where a below-fold CTA only passes viewport verification after a real scroll, plus an insufficient-scroll negative case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserScrollActionSelfTest`
  - `runTestAgentPlaywrightInViewportSelfTest`
  - `runTestAgentBrowserDragToActionSelfTest`

## Notes

This fixes a dangerous verification gap: a work order could previously include a `scroll` browser action, but the Playwright provider did not actually scroll before running assertions.
