# Browser Presence Assertions

## Summary

Added DOM presence assertions to standalone TestAgent. These assertions distinguish whether an element exists in the DOM from whether it is visible, which is useful for delete/remove workflows and hidden-but-mounted UI state.

## Added

- New browser assertion types:
  - `present`
  - `notPresent`
- New aliases:
  - `present`
  - `exists`
  - `element_exists`
  - `dom_present`
  - `attached`
  - `not_present`
  - `absent`
  - `missing`
  - `removed`
  - `deleted`
  - `element_absent`
  - `element_missing`
  - `element_removed`
  - `dom_absent`
  - `detached`
- Added `browser_presence_assertions` to the TestAgent capability profile.

## Behavior

- `present` waits for the target locator to be attached to the DOM.
- `notPresent` waits until the target locator count is zero.
- This is different from `visible` / `notVisible`:
  - hidden elements can still pass `present`,
  - removed elements should pass `notPresent`,
  - hidden-but-mounted elements should fail `notPresent`.

## Provider Notes

- Playwright performs real DOM presence checks.
- MCP browser adapters use best-effort page snapshot text checks only when `text`, `value`, or `name` is available.
- MCP selector-only presence assertions fail explicitly with guidance to use Playwright.
- Computer Use remains unsupported for DOM/page-text presence checks.

## Verification

- Added `runTestAgentBrowserPresenceAssertionSelfTest`.
- The self-test verifies:
  - hidden DOM elements pass `present`,
  - deleted elements pass `notPresent`,
  - existing hidden elements fail `notPresent`,
  - MCP text presence and absence can pass best-effort,
  - MCP selector-only DOM presence fails explicitly.
