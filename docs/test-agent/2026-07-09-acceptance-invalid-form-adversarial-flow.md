# Acceptance Invalid Form Adversarial Flow

## Task

Let TestAgent treat invalid form acceptance criteria as adversarial browser evidence without requiring the group/main agent to hand-write an adversarial browser probe.

Example:

```text
At /login, enter "bad@example.test" into "Email" and enter "wrong-password" into "Password", click "Sign in", then stays on /login and shows "Invalid password".
```

## Changes

- `acceptance_form_flow` now detects invalid/negative form intent from words such as `invalid`, `wrong`, `bad`, `required`, `error`, `stays on`, and equivalent Chinese phrases.
- Matching generated browser checks include:
  - `adversarial: true`
  - `context.adversarialIntent = invalid_form_input`
  - existing source metadata: `context.generatedBy` and `context.acceptanceCriteria`
- The check still uses the existing `acceptance_form_flow` probe type, so it continues to satisfy form-specific required coverage while also satisfying `adversarial`.
- Added `runTestAgentAcceptanceInvalidFormAdversarialSelfTest`.
- Extended the source metadata self-test to cover adversarial form-flow context.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

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

This strengthens real browser validation for invalid login, validation errors, and other negative form paths while keeping TestAgent independent from collaboration code.
