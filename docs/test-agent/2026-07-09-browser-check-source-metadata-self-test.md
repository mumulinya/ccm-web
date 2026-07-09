# Browser Check Source Metadata Self-Test

## Task

Add lightweight regression coverage for generated browser check source metadata.

## Changes

- Added `runTestAgentBrowserCheckSourceMetadataSelfTest`.
- Exported it from `backend/test-agent/index.ts`.
- The self-test checks that generated browser checks include:
  - `context.source = acceptance_criteria`
  - `context.generatedBy`
  - `context.acceptanceCriteria`
- Covered generated check families:
  - auto target URL smoke
  - acceptance path smoke
  - form flow
  - download flow
  - upload flow
  - click flow
  - responsive viewport
- Added a guard that responsive text such as `Mobile navigation ready` remains a positive `text` assertion when the criterion also says `no horizontal overflow`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
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

This keeps project-agent handoff evidence traceable without changing collaboration code.
