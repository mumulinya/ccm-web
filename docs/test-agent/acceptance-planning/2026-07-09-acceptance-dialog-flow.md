# Acceptance Dialog Flow

## Task

Let TestAgent infer native browser dialog checks from acceptance criteria, so alert, confirm, and prompt behavior can be verified without hand-written browser checks.

Examples:

```text
At /dialogs, click "Show alert", then alert dialog includes "Saved profile dialog".
在 /dialogs 点击 "显示确认"，然后确认框包含 "确认发货对话框"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-dialog-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `click`
  - `dialogAppeared`
  - `dialogMessageIncludes`
  - `dialogTypeEquals`
  - `urlIncludes`
  - console and network error checks
- Supports native dialog wording such as `alert`, `confirm`, `prompt`, `dialog`, `对话框`, `提示框`, `确认框`, and `输入框`.
- Integrated the generator into `buildBrowserChecksForProject`.
- Filters dialog criteria out of click-flow generation so a native dialog criterion does not also become a plain text click check.
- Added source metadata coverage and `runTestAgentAcceptanceDialogFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceDialogFlowSelfTest
PASS runTestAgentBrowserDialogAssertionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentAcceptanceKeyboardFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses a real page that triggers an English alert and a Chinese confirm dialog. The generated browser checks must click the trigger, capture the native dialog telemetry, verify the dialog type/message, and write dialog logs.
