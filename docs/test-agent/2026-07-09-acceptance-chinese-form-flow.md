# Acceptance Chinese Form Flow

## Task

Let TestAgent infer real browser form checks from Chinese acceptance criteria, so group/main agent handoffs can stay in Chinese while TestAgent still verifies behavior in a browser.

Example:

```text
在 /tasks 输入 "买牛奶" 到 "任务"，点击 "添加任务"，然后显示 "买牛奶"。
```

## Changes

- Extended `backend/test-agent/browser/acceptance-form-flows.ts` with Chinese form/action keywords:
  - fill/input: `填写`, `输入`, `录入`, `填入`, `设置`
  - select/check: `选择`, `选中`, `勾选`, `取消勾选`
  - submit: `点击`, `点按`, `轻触`, `按下`, `提交`
  - result: `然后`, `之后`, `显示`, `出现`, `看到`, `可见`
- Added Chinese field/value direction parsing for phrases like `输入 "value" 到 "field"`.
- Added Chinese refresh-persistence wording support for future form persistence criteria.
- Added `runTestAgentAcceptanceChineseFormFlowSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceChineseFormFlowSelfTest
PASS runTestAgentAcceptanceFormFlowSelfTest
PASS runTestAgentAcceptanceMultiFieldFormFlowSelfTest
PASS runTestAgentAcceptanceRedirectFormFlowSelfTest
PASS runTestAgentAcceptanceInvalidFormAdversarialSelfTest
PASS runTestAgentAcceptanceChineseClickFlowSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test starts a real local Chinese UI, fills the Chinese-labeled input, clicks the Chinese button, and verifies the rendered Chinese result text with Playwright.
