# Form Flow Post-Submit Control Text Filter

## Task

Fix a form-flow false failure where TestAgent could require submitted form labels or the submit button text to remain visible after a successful redirect.

The failing shape was:

```text
At /login, enter "ada@example.test" into "Email" and enter "correct horse battery staple" into "Password", click "Sign in", then navigates to /dashboard and shows "Dashboard".
```

After the browser reached `/dashboard`, TestAgent still asserted `Email`, `Password`, and `Sign in` as visible page text.

## Changes

- Updated `flowDerivedAssertions(...)` in `backend/test-agent/browser/acceptance-form-flows.ts`.
- Quoted form control labels and submit button text are now filtered from post-submit visible-text assertions.
- Input values were already filtered; this extends the same idea to field labels and button labels.
- The expected completion text, URL assertion, state assertions, console checks, and network checks are preserved.

## Verification

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceRedirectFormFlowSelfTest
PASS runTestAgentAcceptanceInvalidFormAdversarialSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceFormFlowSelfTest
PASS runTestAgentAcceptanceMultiFieldFormFlowSelfTest
PASS runTestAgentAcceptanceRefreshPersistenceFormFlowSelfTest
PASS runTestAgentAdversarialBrowserSelfTest
PASS runTestAgentAcceptanceRepeatedClickSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

This keeps TestAgent focused on the real completion state after form submission instead of accidentally pinning the post-submit page to the source form UI.
