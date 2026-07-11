# Acceptance Clipboard Flow

## Task

Let TestAgent infer real clipboard checks from acceptance criteria, so copy buttons can be verified by reading the actual browser clipboard instead of trusting page text or implementation code.

Examples:

```text
At /invite, click "Copy invite", then clipboard equals "Invite Code: TEAM-42".
在 /invite 点击 "复制邀请码"，然后剪贴板包含 "TEAM-42-CN"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-clipboard-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `click`
  - `clipboardTextEquals` or `clipboardTextIncludes`
  - `urlIncludes`
  - console and network error checks
- Supports English clipboard wording and Chinese `剪贴板`, `复制到剪贴板`, and `拷贝到剪贴板`.
- Distinguishes exact clipboard equality from substring containment.
- Integrated the generator into `buildBrowserChecksForProject`.
- Filters clipboard criteria out of plain click-flow generation.
- Added source metadata coverage and `runTestAgentAcceptanceClipboardFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceClipboardFlowSelfTest
PASS runTestAgentBrowserClipboardAssertionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentAcceptancePopupFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses real `navigator.clipboard.writeText` calls. TestAgent must click English and Chinese copy buttons, read the browser clipboard back, and satisfy the `browser_clipboard` required check.
