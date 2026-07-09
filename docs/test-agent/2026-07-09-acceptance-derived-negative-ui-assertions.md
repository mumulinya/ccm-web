# Acceptance-Derived Negative UI Assertions

## Summary

Extended TestAgent's acceptance-derived browser checks so explicit negative UI requirements become real browser assertions. This helps catch cases where a feature should not show an error, debug panel, obsolete row, or removed item.

## Added

- New parser module: `backend/test-agent/browser/acceptance-negative-ui-assertions.ts`.
- New derived assertion reason: `negative_ui`.
- New inferred assertion types:
  - `notVisible`
  - `notPresent`
- Exported `buildAcceptanceNegativeUiBrowserAssertions`.
- Added `runTestAgentAcceptanceDerivedNegativeUiSelfTest`.

## Behavior

Examples:

```text
At /dashboard, "Debug panel" should not be visible.
At /dashboard, "Obsolete task" must not be present.
```

Produces browser assertions for the `/dashboard` smoke check:

- `notVisible` for `Debug panel`
- `notPresent` for `Obsolete task`
- `urlIncludes: /dashboard`

`notVisible` allows the text to exist in hidden DOM. `notPresent` requires the text target to be absent from the DOM.

When a criterion produces a negative UI assertion, the quoted forbidden text is not also converted into a positive visible-text assertion.

## Boundaries

- The derivation requires explicit negative language such as `not`, `must not`, `should not`, `without`, `no`, `hidden`, `removed`, or `absent`.
- DOM absence is inferred only for stronger wording such as `not present`, `absent`, `removed`, `deleted`, `detached`, or `not in the DOM`.
- Other negative UI wording defaults to `notVisible`.
- It does not infer selectors or test IDs; explicit browser checks should still be used for ambiguous UI targets.

## Verification

- Added `runTestAgentAcceptanceDerivedNegativeUiSelfTest`.
- The self-test verifies:
  - `notVisible` is derived for hidden/visible-negative text,
  - `notPresent` is derived for DOM-absence wording,
  - negative quoted text is not treated as required visible text,
  - generated path-smoke checks carry the negative assertions,
  - a real Playwright browser verifies hidden text and absent DOM text on a local `/dashboard` page.
