# Browser No Horizontal Overflow Assertion

Date: 2026-07-08

## Goal

Let TestAgent verify responsive/mobile layouts in a real browser and fail pages that horizontally overflow the requested viewport. This closes a practical gap where a feature can look complete in code but still be unusable on mobile.

## New Assertion

```json
{
  "viewport_width": 390,
  "viewport_height": 844,
  "is_mobile": true,
  "assertions": [
    { "type": "noHorizontalOverflow" }
  ]
}
```

Accepted aliases:

- `no_horizontal_overflow`
- `no_x_overflow`
- `responsive_no_overflow`
- `no_overflow_x`

## Changes

- Added `noHorizontalOverflow` to browser assertion types and work-order normalization.
- Playwright provider now evaluates document width and visible element bounds against the effective check viewport.
- Browser assertion failure reports include `documentWidth`, `viewportWidth`, and `overflowPx` so the handoff explains why the layout failed.
- MCP browser adapters return an explicit unsupported result for this assertion because they do not expose DOM layout metrics.
- Added `runTestAgentPlaywrightNoHorizontalOverflowSelfTest` with real pass/fail mobile fixtures.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentPlaywrightNoHorizontalOverflowSelfTest`: PASS
  - `runTestAgentPlaywrightViewportSelfTest`: PASS
- Full TestAgent self-test matrix: 56/56 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
