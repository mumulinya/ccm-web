# Playwright Viewport Checks

## Goal

Let TestAgent run individual browser checks with explicit viewport settings. This enables real verification of responsive/mobile behavior instead of only testing a fixed desktop-sized page.

## New Browser Check Fields

```json
{
  "name": "Mobile responsive navigation",
  "url": "/responsive",
  "viewport_width": 390,
  "viewport_height": 844,
  "is_mobile": true,
  "assertions": [
    { "type": "text", "text": "Mobile navigation ready" }
  ]
}
```

Supported fields:

- `viewport: { width, height }`
- `viewportWidth` / `viewport_width`
- `viewportHeight` / `viewport_height`
- `isMobile` / `is_mobile`
- `deviceScaleFactor` / `device_scale_factor`
- `userAgent` / `user_agent`

## Changes

- Added viewport fields to `BrowserCheckSpec`.
- Added work-order normalization for viewport fields.
- Added contract schema support for viewport fields.
- Playwright provider now creates each browser context with the check-specific viewport.
- Browser results now include the effective viewport.
- Markdown reports and execution plans show viewport evidence.
- Added `runTestAgentPlaywrightViewportSelfTest` with a real responsive page verified at `390x844`.

## Verification

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentPlaywrightViewportSelfTest`: PASS
  - `runTestAgentPlaywrightRealBrowserSelfTest`: PASS
- Full TestAgent self-test matrix: 55/55 PASS

## Note

Responsive CSS may still require a page-level `<meta name="viewport" content="width=device-width, initial-scale=1">`. The self-test includes this meta tag so the CSS layout viewport matches the requested mobile viewport.
