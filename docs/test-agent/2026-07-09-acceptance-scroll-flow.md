# Acceptance Scroll Flow

## Task

Let TestAgent infer real browser scroll checks from acceptance criteria instead of requiring hand-written browser checks for below-the-fold UI.

Examples:

```text
At /landing, scroll down 1200px, then shows "Ready after scroll".
在 /landing 向下滚动 1200 像素，然后显示 "滚动后就绪"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-scroll-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `scroll`
  - `text`
  - `inViewport`
  - `urlIncludes`
  - console and network error checks
- Supports English and Chinese scroll intent such as `scroll down`, `page down`, `向下滚动`, `下滑`, and `滑到底部`.
- Avoids treating layout-only wording like `no horizontal scroll` / `没有横向滚动` as a user scroll interaction.
- Integrated the generator into `buildBrowserChecksForProject`.
- Added source metadata coverage and `runTestAgentAcceptanceScrollFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceScrollFlowSelfTest
PASS runTestAgentBrowserScrollActionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceResponsiveViewportSelfTest
PASS runTestAgentAcceptanceChineseResponsiveViewportSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses a real page with below-the-fold English and Chinese text. The generated browser checks must scroll the page and prove each target is inside the viewport, giving stronger evidence than a plain text assertion.
