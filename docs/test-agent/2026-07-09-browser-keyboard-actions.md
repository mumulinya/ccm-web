# Browser Keyboard Actions

## Summary

Added real keyboard-oriented browser actions to the standalone TestAgent so it can verify keyboard-only Web workflows, shortcut handlers, and controls that depend on input/keydown events instead of direct value assignment.

## Added

- New browser action types:
  - `focus`
  - `typeText`
- New aliases:
  - `set_focus`
  - `focus_element`
  - `focus_field`
  - `type_text`
  - `type_keys`
  - `type_chars`
  - `keyboard_type`
  - `keyboard_input`
  - `press_text`
  - `hotkey`
  - `shortcut`
  - `keyboard_shortcut`
  - `key_combo`
  - `key_combination`
- Playwright provider behavior:
  - `focus` maps to locator focus.
  - `typeText` focuses the target when supplied, then sends real keyboard text through `page.keyboard.type`.
  - `press` now accepts `key`, `value`, or `text`, so shortcut-style work orders such as `hotkey: Control+Alt+K` do not collapse to Enter.
- MCP adapter behavior:
  - Providers with type/key tools map `typeText` where possible.
  - Deterministic DOM focus stays Playwright-first; unsupported MCP focus paths now fail explicitly.
- Added `browser_keyboard_actions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserKeyboardActionSelfTest`.
- The self-test starts a local browser fixture and verifies:
  - focus lands on a search input,
  - `type_text` triggers real input events,
  - `press_key` submits with Enter,
  - `hotkey` opens a command menu,
  - a wrong typed value fails the browser assertion instead of being accepted.
