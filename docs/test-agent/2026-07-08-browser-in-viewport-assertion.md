# Browser In Viewport Assertion

Date: 2026-07-08

## Goal

Let TestAgent verify that an important element is actually inside the current browser viewport. This helps catch mobile and responsive bugs where a CTA, submit button, or critical control exists in the DOM but is pushed below or outside the visible area.

## New Assertion

```json
{
  "viewport_width": 390,
  "viewport_height": 640,
  "is_mobile": true,
  "assertions": [
    { "type": "inViewport", "testId": "cta" }
  ]
}
```

Accepted aliases:

- `in_viewport`
- `within_viewport`
- `visible_in_viewport`
- `element_in_viewport`

## Changes

- Added `inViewport` to browser assertion types and work-order normalization.
- Playwright provider now resolves the semantic locator, waits for the element to be visible, and verifies its bounding box fits within the effective check viewport.
- Failure output includes the element rect, viewport size, and visibility state for easier rework handoff.
- MCP browser adapters return an explicit unsupported result because they do not expose DOM layout metrics.
- Added `runTestAgentPlaywrightInViewportSelfTest` with real pass/fail mobile fixtures.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentPlaywrightInViewportSelfTest`: PASS
  - `runTestAgentPlaywrightNoHorizontalOverflowSelfTest`: PASS
  - `runTestAgentPlaywrightViewportSelfTest`: PASS
- Full TestAgent self-test matrix: 57/57 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
