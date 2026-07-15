# Acceptance Chinese Upload Flow

## Task

Let TestAgent infer real browser upload checks from Chinese acceptance criteria.

Example:

```text
在 /upload 上传 "notes.txt" 内容为 "中文上传内容" 到 "附件"，点击 "上传"，然后显示 "已上传 notes.txt: 中文上传内容"。
```

## Changes

- Extended `backend/test-agent/browser/acceptance-upload-flows.ts` with Chinese upload keywords: `上传`, `导入`, `添加附件`, `选择文件`, `附加`.
- Added Chinese submit/action parsing for upload flow: `点击`, `点按`, `轻触`, `按下`, `提交`.
- Added Chinese file-content markers: `内容包含`, `内容为`, `内容是`, `包含`, `包括`, `含有`.
- Added Chinese field-label and expected-text parsing.
- Added `runTestAgentAcceptanceChineseUploadFlowSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceChineseUploadFlowSelfTest
PASS runTestAgentAcceptanceUploadFlowSelfTest
PASS runTestAgentAcceptanceChineseDownloadFlowSelfTest
PASS runTestAgentAcceptanceDownloadFlowSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test starts a real Chinese upload page, creates an in-memory fixture file through Playwright, uploads it into the labeled file input, clicks the Chinese submit button, and verifies the uploaded content appears on the page.
