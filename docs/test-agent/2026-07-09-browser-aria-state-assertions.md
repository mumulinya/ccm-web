# Browser ARIA State Assertions

## Summary

Added semantic ARIA state assertions to standalone TestAgent. These assertions let a work order say that a menu is expanded, a toggle is pressed, an option is selected, or a field is marked invalid/required without hand-writing generic attribute checks.

## Added

- New browser assertion types:
  - `ariaExpanded`
  - `ariaCollapsed`
  - `ariaPressed`
  - `ariaNotPressed`
  - `ariaSelected`
  - `ariaNotSelected`
  - `ariaInvalid`
  - `ariaValid`
  - `ariaRequired`
  - `ariaNotRequired`
- New aliases:
  - `aria_expanded`, `expanded`, `is_expanded`
  - `aria_collapsed`, `collapsed`, `not_expanded`
  - `aria_pressed`, `pressed`, `button_pressed`
  - `aria_not_pressed`, `not_pressed`, `unpressed`
  - `aria_selected`, `aria_option_selected`, `option_selected`
  - `aria_not_selected`, `aria_option_not_selected`, `option_not_selected`
  - `aria_invalid`, `invalid_state`, `field_invalid`
  - `aria_valid`, `valid_state`, `field_valid`
  - `aria_required`, `required_state`, `field_required`
  - `aria_not_required`, `not_required`, `field_not_required`
- New business helper file:
  - `backend/test-agent/browser/aria-state-assertions.ts`
- Playwright provider behavior:
  - Polls the target element's ARIA attribute until the expected state is observed or the assertion times out.
  - `ariaValid` treats a missing `aria-invalid` attribute as valid.
  - `ariaNotRequired` treats a missing `aria-required` attribute as not required.
  - Assertion details include the semantic target and normalized ARIA state, such as `aria-expanded=true`.
- MCP provider behavior:
  - Browser-native MCP adapters explicitly fail these assertions with guidance to use Playwright because snapshots do not expose reliable DOM attributes.
  - Computer Use also reports ARIA DOM state assertions as unsupported.
- Added `browser_aria_state_assertions` to the TestAgent capability profile.

## Verification

- Added `runTestAgentBrowserAriaStateAssertionSelfTest`.
- The self-test verifies:
  - `ariaExpanded`, `ariaPressed`, and `ariaSelected` pass after real browser clicks update the DOM,
  - `ariaInvalid` and `ariaRequired` pass on a form field,
  - `ariaValid` and `ariaNotRequired` pass when the corresponding false ARIA attributes are absent,
  - wrong ARIA state expectations fail with the actual ARIA attribute value,
  - MCP provider behavior fails explicitly instead of claiming a false pass.
