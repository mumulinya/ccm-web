# TestAgent browser computed style assertions

## Goal

Add real browser verification for computed CSS state to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser assertion types:
  - `computedStyleEquals`
  - `computedStyleIncludes`
- Added handoff-friendly aliases:
  - `computed_style_equals`
  - `style_equals`
  - `css_equals`
  - `css_property_equals`
  - `computed_style_includes`
  - `style_includes`
  - `css_includes`
  - `css_property_includes`
- Added property fields:
  - `property`
  - `styleProperty` / `style_property`
  - `cssProperty` / `css_property`
- Implemented Playwright polling with `getComputedStyle(...).getPropertyValue(...)`.
- Supports both kebab-case CSS properties and camelCase input such as `backgroundColor`.
- Added explicit MCP unsupported responses because text snapshots cannot prove computed DOM style.
- Added `browser_computed_style_assertions` to the TestAgent capability profile.
- Added a real Playwright self-test fixture that changes a badge from draft styling to active green styling after a click, plus a negative wrong-color case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserComputedStyleAssertionSelfTest`
  - `runTestAgentBrowserAttributeAssertionSelfTest`
  - `runTestAgentBrowserElementScreenshotAssertionSelfTest`

## Notes

This closes the gap between DOM attribute checks and pixel-level screenshot checks. It is useful for theme switches, active/disabled visual states, status colors, layout display modes, and CSS-driven UI changes.
