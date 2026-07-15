# Acceptance Chinese Click Flow

## Task

Let TestAgent infer real browser click checks from Chinese acceptance criteria, so a group/main agent can pass Chinese task summaries without manually translating them into English probe templates.

Example:

```text
在 /menu 点击 "打开设置"，然后显示 "设置面板就绪"。
```

## Changes

- Extended `backend/test-agent/browser/acceptance-click-flows.ts` with Chinese click/result keywords:
  - click verbs: `点击`, `点按`, `轻触`, `打开`, `按下`
  - result words: `然后`, `之后`, `显示`, `出现`, `可见`, `跳转`, `导航`, `进入`
- Kept existing English click-flow behavior intact.
- Added `runTestAgentAcceptanceChineseClickFlowSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.
- Fixed the Chinese click-flow filter so button text containing `设置` is not mistaken for a form/input action.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceChineseClickFlowSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentAcceptanceMultiClickFlowSelfTest
PASS runTestAgentAcceptanceClickNavigationFlowSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceRepeatedClickSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test starts a real local web page, clicks the Chinese button text, and verifies the resulting Chinese UI text through Playwright.
