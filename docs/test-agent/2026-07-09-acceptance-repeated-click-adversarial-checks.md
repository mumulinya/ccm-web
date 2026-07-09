# Acceptance Repeated-Click Adversarial Checks

## Task

Make TestAgent infer a real browser adversarial check when acceptance criteria explicitly require repeated clicking, for example:

```text
At /retry, click "Retry" 3 times, then shows "Retry stable".
```

This helps catch UI work that passes a single happy-path click but breaks under repeated user interaction.

## Changes

- Added `backend/test-agent/browser/acceptance-repeated-click-checks.ts`.
- Added `ACCEPTANCE_REPEATED_CLICK_PROBE_TYPE = acceptance_repeated_click`.
- Generated checks are marked:
  - `adversarial: true`
  - `probeType: acceptance_repeated_click`
  - `context.source: acceptance_criteria`
  - `context.generatedBy: acceptance_repeated_click`
  - `context.acceptanceCriteria`
- Repeated-click criteria are excluded from normal acceptance click-flow generation so a one-click check does not replace the intended multi-click verification.
- `buildBrowserChecksForProject(...)` now includes generated repeated-click checks alongside other acceptance-derived browser checks.
- Added `runTestAgentAcceptanceRepeatedClickSelfTest`.
- Extended `runTestAgentBrowserCheckSourceMetadataSelfTest` to cover the new generated check family.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceRepeatedClickSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentAcceptanceMultiClickFlowSelfTest
PASS runTestAgentAcceptanceClickNavigationFlowSelfTest
PASS runTestAgentAcceptanceFormFlowSelfTest
PASS runTestAgentAcceptanceResponsiveViewportSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

This only modifies independent TestAgent files. Collaboration/group-chat code was not changed.
