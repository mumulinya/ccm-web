# TestAgent browser element screenshot assertion

## Goal

Add element-level visual non-blank verification to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser assertion type `elementScreenshotNotBlank`.
- Added handoff-friendly aliases:
  - `element_screenshot_not_blank`
  - `element_not_blank`
  - `region_not_blank`
  - `visual_not_blank`
  - `screenshot_region_not_blank`
- Added optional thresholds:
  - `minUniqueColors` / `min_unique_colors`
  - `minNonWhitePixels` / `min_non_white_pixels`
- Implemented Playwright locator screenshot capture and in-memory PNG pixel analysis.
- The assertion checks that the captured element region contains non-white, non-transparent visual pixels and can optionally require a minimum number of unique colors.
- Added explicit MCP unsupported response because MCP text snapshots cannot prove element-level pixels.
- Added a real Playwright self-test with a rendered canvas chart as the positive case and a blank white preview region as the negative case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserElementScreenshotAssertionSelfTest`
  - `runTestAgentBrowserClipboardAssertionSelfTest`
  - `runTestAgentBrowserDragToActionSelfTest`

## Notes

This fills a gap between page text checks and full-page screenshot artifact validation. It is useful for charts, canvases, preview panes, icons, and media-like UI where successful rendering may not produce accessible text.
