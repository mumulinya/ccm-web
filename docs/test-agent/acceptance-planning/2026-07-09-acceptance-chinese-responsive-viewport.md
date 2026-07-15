# Acceptance Chinese Responsive Viewport

## Task

Prove that TestAgent can turn Chinese responsive/mobile acceptance criteria into a real mobile browser check.

Example:

```text
移动端响应式页面在 /responsive 显示 "移动导航已就绪"，并且没有横向滚动。
```

## Changes

- Added `runTestAgentAcceptanceChineseResponsiveViewportSelfTest`.
- Reused the existing responsive check generator, which already recognizes Chinese responsive intent such as `移动端`, `响应式`, `横向滚动`, and `横向溢出`.
- Verified Chinese quoted text and explicit path assertions are preserved in the generated mobile viewport check.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceChineseResponsiveViewportSelfTest
PASS runTestAgentAcceptanceResponsiveViewportSelfTest
PASS runTestAgentAcceptanceChineseUploadFlowSelfTest
PASS runTestAgentAcceptanceUploadFlowSelfTest
PASS runTestAgentAcceptanceChineseDownloadFlowSelfTest
PASS runTestAgentAcceptanceDownloadFlowSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test starts a real Chinese responsive page, runs Playwright at a `390x844` mobile viewport, verifies no horizontal overflow, checks the Chinese mobile-only text, and confirms the `responsive` required check is verified.
