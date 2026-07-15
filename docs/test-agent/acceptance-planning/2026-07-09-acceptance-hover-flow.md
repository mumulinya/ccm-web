# Acceptance Hover Flow

## Task

Let TestAgent infer real browser hover checks from acceptance criteria, so hover-only menus, tooltips, and flyouts can be verified without hand-written browser checks.

Examples:

```text
At /menu, hover "Tools", then shows "Export report".
在 /menu 悬停在 "工具"，然后显示 "导出报告"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-hover-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `hover`
  - `text`
  - `visible`
  - `inViewport`
  - `urlIncludes`
  - console and network error checks
- Supports English hover wording such as `hover`, `mouse over`, and `move mouse over`.
- Supports Chinese hover wording such as `悬停`, `鼠标移到`, `鼠标移动到`, `鼠标经过`, and `移入`.
- Integrated the generator into `buildBrowserChecksForProject`.
- Added source metadata coverage and `runTestAgentAcceptanceHoverFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceHoverFlowSelfTest
PASS runTestAgentBrowserHoverActionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceScrollFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses a real CSS hover menu with English and Chinese triggers. The generated browser checks must hover the trigger and prove the revealed item is visible and inside the viewport.
