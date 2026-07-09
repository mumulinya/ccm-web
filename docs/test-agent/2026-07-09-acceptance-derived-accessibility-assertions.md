# Acceptance-Derived Accessibility Assertions

## Summary

Extended acceptance-derived browser checks so TestAgent can conservatively infer accessibility and ARIA state assertions from human acceptance criteria. This helps the group main agent hand off higher-level requirements while TestAgent still executes concrete browser verification.

## Added

- New derived assertion reasons:
  - `accessible_name`
  - `accessible_description`
  - `aria_state`
- New inferred assertion types:
  - `accessibleNameEquals`
  - `accessibleNameIncludes`
  - `accessibleDescriptionEquals`
  - `accessibleDescriptionIncludes`
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
- Path-scoped auto browser smoke checks now carry non-URL semantic assertions, not only quoted visible-text assertions.
- Assertion de-duplication now includes semantic target fields such as role, name, label, selector, text, and value.

## Behavior

Examples:

```text
At /settings, button "Save" must have accessible name "Save profile".
At /settings, button "Save" accessible description includes "Saves profile changes".
At /settings, button "Menu" has aria-expanded true.
At /settings, field "Email" has aria-invalid true and aria-required true.
```

Produces browser assertions for the `/settings` smoke check:

- `accessibleNameEquals`
- `accessibleDescriptionIncludes`
- `ariaExpanded`
- `ariaInvalid`
- `ariaRequired`
- `urlIncludes: /settings`

When a criterion produces semantic accessibility or ARIA assertions, TestAgent no longer treats every quoted phrase in that criterion as visible page text. This avoids false failures where an accessible name such as `Save profile` is intentionally not visible text.

## Boundaries

The derivation remains intentionally conservative:

- It requires explicit phrases such as `accessible name`, `accessible description`, `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-invalid`, or `aria-required`.
- It requires quoted target text such as button, field, option, tab, or link names.
- It does not infer multi-step interactions; explicit browser checks and acceptance flow builders still handle workflows.
- MCP browser adapters may fail precise accessibility/ARIA DOM checks; Playwright is the provider for these assertions.

## Verification

- Added `runTestAgentAcceptanceDerivedAccessibilitySelfTest`.
- The self-test verifies:
  - semantic assertions are derived from acceptance criteria,
  - semantic quoted values are not also converted into visible text assertions,
  - path-scoped auto smoke checks include accessibility and ARIA state assertions,
  - a real Playwright browser verifies the generated checks on a local `/settings` page.
