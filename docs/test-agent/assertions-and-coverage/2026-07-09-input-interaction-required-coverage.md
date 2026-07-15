# Input Interaction Required Coverage

## Summary

Added dedicated required-check coverage for browser clipboard, focus, and keyboard verification. TestAgent now treats these as concrete interaction evidence instead of letting a generic browser pass satisfy them.

## Changed

- Added `browserClipboardSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserFocusSignal(...)` in `backend/test-agent/required-checks.ts`.
- Added `browserKeyboardSignal(...)` in `backend/test-agent/required-checks.ts`.
- Mapped clipboard checks such as:
  - `browser_clipboard`
  - `clipboard`
  - `clipboard_assertions`
  - `clipboard_actions`
- Mapped focus checks such as:
  - `browser_focus`
  - `focus`
  - `focus_state`
  - `keyboard_focus`
- Mapped keyboard checks such as:
  - `browser_keyboard`
  - `keyboard`
  - `keyboard_actions`
  - `keyboard_shortcut`
  - `hotkey`

## Evidence Rules

- `browser_clipboard` requires passing `setClipboard`, `clipboardTextEquals`, or `clipboardTextIncludes` evidence.
- `browser_focus` requires passing `focus`, `focused`, or `notFocused` evidence.
- `browser_keyboard` requires passing keyboard action evidence such as `typeText` or `press`.
- Failed matching actions/assertions mark the matching required check as `not_verified`.
- A generic browser check with unrelated assertions leaves these checks `unknown`.

## Why

Keyboard-only flows, focus state, and clipboard behavior are all user-facing browser features. A page can render correctly while keyboard submission, focus management, or copy-to-clipboard behavior is broken. The group main agent should be able to request those checks explicitly and receive honest evidence.

## Verification

Extended `runTestAgentRequiredCheckCoverageSelfTest` with fixtures that verify:

- generic browser evidence leaves clipboard/focus/keyboard unknown,
- passing clipboard action/assertion evidence verifies `browser_clipboard`,
- failed clipboard assertions mark `browser_clipboard` as `not_verified`,
- passing focus action/assertion evidence verifies `browser_focus`,
- failed focus assertions mark `browser_focus` as `not_verified`,
- passing keyboard action evidence verifies `browser_keyboard`,
- failed keyboard actions mark `browser_keyboard` as `not_verified`.
