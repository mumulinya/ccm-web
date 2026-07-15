# Acceptance Popup Flow

## Task

Let TestAgent infer real popup/new-tab checks from acceptance criteria, so external help pages, previews, and new-window workflows can be verified without hand-written browser checks.

Examples:

```text
At /support, click "Open help center", then opens a new tab at /help containing "Support article ready".
在 /support 点击 "打开帮助中心"，然后在新标签页打开 /help-cn，并包含 "帮助中心已就绪"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-popup-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `click`
  - `popupOpened`
  - `popupUrlIncludes`
  - `popupTextIncludes`
  - optional `popupTitleIncludes`
  - parent-page URL, console, and network checks
- Supports English popup intent such as `popup`, `new tab`, `new window`, and `separate tab/window`.
- Supports Chinese popup intent such as `新标签页`, `新窗口`, `弹出窗口`, and `弹出页面`.
- Separately parses the source page path and popup target path.
- Suppresses duplicate click-flow and path-smoke checks for popup criteria.
- Added source metadata coverage and `runTestAgentAcceptancePopupFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptancePopupFlowSelfTest
PASS runTestAgentBrowserPopupAssertionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceDialogFlowSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test opens real English and Chinese popup pages. TestAgent must capture popup URL/title/text telemetry, verify URL and text assertions, write popup logs, and satisfy `browser_popup` plus `browser_popup_log` required checks.
