# Form Flow Input Value Filter

## Summary

Fixed acceptance-derived form flows so quoted field input values are not automatically treated as visible page text assertions. A multi-field form can now submit successfully without TestAgent incorrectly requiring sensitive or internal input values, such as passwords, to appear in rendered text.

## Changed

- Added `flowDerivedAssertions(...)` in `backend/test-agent/browser/acceptance-form-flows.ts`.
- Filtered derived `quoted_text` assertions for:
  - form field input values,
  - the expected result text already added by the form flow itself.
- Kept non-quoted semantic assertions and useful quoted UI text, such as labels or button names.
- Added self-test coverage in `runTestAgentAcceptanceMultiFieldFormFlowSelfTest` to ensure email/password input values are not emitted as page text assertions.

## Why

The acceptance-derived assertion layer is useful for normal visible-text criteria, but form flows already know which quoted strings are values to type into controls. Requiring those values to appear as visible text causes false failures, especially for password fields and forms that only show a success message after submission.

## Verification

Ran:

- `runTestAgentRequiredCheckCoverageSelfTest`
- `runTestAgentAcceptanceMultiFieldFormFlowSelfTest`
- `runTestAgentAcceptanceFormFlowSelfTest`
- `runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest`
- `runTestAgentAcceptanceUncheckRadioFormFlowSelfTest`
- `runTestAgentBrowserInputValueAssertionSelfTest`
- `runTestAgentBrowserEnabledStateSelfTest`
- `runTestAgentBrowserElementCountSelfTest`
- `runTestAgentBrowserTableAssertionSelfTest`
- `runTestAgentBrowserTextOrderAssertionSelfTest`
