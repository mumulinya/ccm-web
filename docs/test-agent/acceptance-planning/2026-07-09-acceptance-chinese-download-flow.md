# Acceptance Chinese Download Flow

## Task

Let TestAgent infer real browser download checks from Chinese acceptance criteria.

Example:

```text
在 /exports 点击 "导出 CSV"，然后下载 "tasks.csv"，内容包含 "Ship TestAgent"。
```

## Changes

- Extended `backend/test-agent/browser/acceptance-download-flows.ts` with Chinese download/export keywords:
  - `下载`
  - `导出`
- Added Chinese click action words for download flow parsing:
  - `点击`
  - `点按`
  - `轻触`
  - `按下`
- Added Chinese downloaded-content matching:
  - `内容包含`
  - `包含`
  - `包括`
  - `含有`
- Added `runTestAgentAcceptanceChineseDownloadFlowSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceChineseDownloadFlowSelfTest
PASS runTestAgentAcceptanceDownloadFlowSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceChineseClickFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test starts a real Chinese export page, clicks the Chinese export button, captures the browser download, and verifies the downloaded CSV contains the expected content.
