# Acceptance Network State Flow

## Task

Let TestAgent infer real offline and online-recovery checks from acceptance criteria by changing the browser context network state.

Examples:

```text
At /network-state, when the browser goes offline, shows "Browser offline".
在 /network-state 断网后恢复在线，然后显示 "浏览器已恢复在线"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-network-state-flows.ts`.
- Supports two modes:
  - enter offline state
  - enter offline state and recover online
- Generates a real browser flow with:
  - `goto`
  - `setOffline`
  - optional `setOnline`
  - `browserOffline` or `browserOnline`
  - `text`, `visible`, and `inViewport`
  - parent-page URL and console checks
- Supports English offline/reconnect wording and Chinese `离线`, `断网`, `恢复在线`, `重新联网`, and `网络恢复`.
- Does not add `networkNoErrors` while intentionally offline because expected disconnection failures are not product regressions.
- Integrated the generator into `buildBrowserChecksForProject`.
- Added source metadata coverage and `runTestAgentAcceptanceNetworkStateFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceNetworkStateFlowSelfTest
PASS runTestAgentBrowserNetworkStateActionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceDragFlowSelfTest
PASS runTestAgentAcceptancePopupFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses real Playwright context offline emulation. TestAgent must observe offline/online browser events, verify `navigator.onLine`, prove the user-facing status text, and satisfy the `browser_network_state` required check.
