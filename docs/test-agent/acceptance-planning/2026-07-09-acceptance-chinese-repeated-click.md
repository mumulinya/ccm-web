# Acceptance Chinese Repeated Click

## Task

Let TestAgent infer adversarial repeated-click browser checks from Chinese acceptance criteria.

Example:

```text
在 /retry 点击 "重试" 3 次，然后显示 "重试稳定"。
```

## Changes

- Extended `backend/test-agent/browser/acceptance-repeated-click-checks.ts` with Chinese click words:
  - `点击`
  - `点按`
  - `轻触`
  - `按下`
- Added Chinese repeat-count parsing:
  - Arabic number + `次`, for example `3 次`
  - Chinese count words, for example `三次`
  - fallback repeat intent words: `多次`, `重复`
- Added Chinese result markers such as `然后`, `之后`, `随后`, `应该`, `应当`, and `会`.
- Added `runTestAgentAcceptanceChineseRepeatedClickSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceChineseRepeatedClickSelfTest
PASS runTestAgentAcceptanceRepeatedClickSelfTest
PASS runTestAgentAcceptanceChineseClickFlowSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test starts a real local Chinese UI, clicks the Chinese button three times, verifies the Chinese result text, and confirms the generated check satisfies `adversarial` required coverage.
