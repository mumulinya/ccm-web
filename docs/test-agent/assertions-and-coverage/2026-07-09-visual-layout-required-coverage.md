# Visual And Layout Required Coverage

## Summary

Added dedicated required-check coverage for browser visual and layout verification. TestAgent now distinguishes screenshot artifacts from visual/layout assertions, so a page screenshot alone does not prove that a chart rendered, a region is non-blank, or a layout is overflow-free.

## Changed

- Added `browserVisualSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserLayoutSignal(...)` in `backend/test-agent/required-checks.ts`.
- Mapped visual checks such as:
  - `browser_visual`
  - `visual`
  - `visual_assertions`
  - `element_visual`
  - `element_screenshot`
  - `chart_render`
  - `canvas_render`
- Mapped layout checks such as:
  - `browser_layout`
  - `layout`
  - `layout_assertions`
  - `in_viewport`
  - `horizontal_overflow`

## Evidence Rules

- `browser_visual` requires passing visual assertion evidence such as:
  - `elementScreenshotNotBlank`
  - `computedStyleEquals`
  - `computedStyleIncludes`
- `browser_layout` requires passing layout assertion evidence such as:
  - `inViewport`
  - `noHorizontalOverflow`
  - `computedStyleEquals`
  - `computedStyleIncludes`
- Failed matching assertions mark the matching required check as `not_verified`.
- Screenshot artifacts verify `screenshots`, but they do not verify `browser_visual` or `browser_layout` by themselves.

## Why

Many UI tasks succeed or fail visually: charts, canvases, preview panes, status colors, responsive layout, and overflow behavior. A screenshot artifact is useful evidence for a human, but TestAgent should not treat it as proof that a specific visual or layout requirement passed unless a concrete assertion checked that condition.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- screenshot-only browser evidence leaves `browser_visual` and `browser_layout` unknown,
- passing `elementScreenshotNotBlank` verifies `browser_visual`,
- failed visual assertions mark `browser_visual` as `not_verified`,
- passing `inViewport` / `noHorizontalOverflow` verifies `browser_layout`,
- failed layout assertions mark `browser_layout` as `not_verified`.
