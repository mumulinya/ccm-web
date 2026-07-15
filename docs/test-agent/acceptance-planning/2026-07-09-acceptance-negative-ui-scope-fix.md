# Acceptance Negative UI Scope Fix

## Task

Fix a false negative-ui derivation where a responsive acceptance criterion such as:

```text
Mobile responsive page at /responsive shows "Mobile navigation ready" with no horizontal overflow.
```

was incorrectly converted into a `notVisible` assertion for `Mobile navigation ready`.

## Changes

- Tightened `backend/test-agent/browser/acceptance-negative-ui-assertions.ts` so negative UI assertions are only generated when the negative wording is directly associated with the quoted UI target.
- Preserved explicit negative UI cases:
  - `"Debug panel" should not be visible` -> `notVisible`
  - `"Obsolete task" must not be present` -> `notPresent`
- Prevented unrelated layout language such as `no horizontal overflow` from negating nearby positive quoted text.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceResponsiveViewportSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentAcceptanceMultiClickFlowSelfTest
PASS runTestAgentAcceptanceClickNavigationFlowSelfTest
PASS runTestAgentAcceptanceFormFlowSelfTest
PASS runTestAgentAcceptanceUploadFlowSelfTest
PASS runTestAgentAcceptanceDownloadFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

This only touched the independent TestAgent area and did not modify collaboration code.
