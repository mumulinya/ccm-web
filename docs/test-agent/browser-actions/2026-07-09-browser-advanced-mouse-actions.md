# TestAgent browser advanced mouse actions

## Goal

Add real Playwright verification support for double-click and right-click interactions in the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser action types:
  - `doubleClick`
  - `rightClick`
- Added handoff-friendly aliases:
  - `double_click`
  - `doubleclick`
  - `dblclick`
  - `dbl_click`
  - `right_click`
  - `rightclick`
  - `context_click`
  - `context_menu`
- Implemented Playwright actions:
  - `doubleClick` maps to locator `dblclick`.
  - `rightClick` maps to locator `click({ button: "right" })`.
- Reused existing semantic locator support, so actions can target by selector, test id, role, label, text, and related fields.
- Added explicit MCP unsupported responses for these actions until deterministic MCP-specific mappings are implemented.
- Added `browser_advanced_mouse_actions` to the TestAgent capability profile.
- Added a real Playwright self-test fixture where double-click enters edit mode and right-click opens a context menu, plus a negative missing-menu-item case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserAdvancedMouseActionSelfTest`
  - `runTestAgentBrowserDragToActionSelfTest`
  - `runTestAgentBrowserScrollActionSelfTest`

## Notes

This helps TestAgent verify UI flows that depend on desktop-style mouse behavior, such as double-click-to-edit, double-click-to-open, context menus, and secondary actions that are not reachable through a normal click.
