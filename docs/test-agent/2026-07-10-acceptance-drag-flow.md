# Acceptance Drag Flow

## Task

Let TestAgent infer real drag-and-drop checks from acceptance criteria, so kanban boards, reorderable lists, and drop zones can be verified through browser interaction.

Examples:

```text
At /board, drag "Ship release" to "Done column", then shows "Ship release moved to Done".
在 /board 将 "发布任务" 拖动到 "已完成列"，然后显示 "发布任务已移入完成列"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-drag-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `dragTo`
  - `text`
  - `visible`
  - `inViewport`
  - `urlIncludes`
  - console and network error checks
- Supports English `drag`, `drag and drop`, and `move` wording.
- Supports Chinese `拖动`, `拖拽`, `拖到`, `拖入`, and `移动` wording.
- Handles Chinese grammar where the dragged source appears before the drag verb.
- Integrated the generator into `buildBrowserChecksForProject`.
- Added source metadata coverage and `runTestAgentAcceptanceDragFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceDragFlowSelfTest
PASS runTestAgentBrowserDragToActionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceScrollFlowSelfTest
PASS runTestAgentAcceptanceClipboardFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses a real HTML5 drag/drop board. TestAgent must move English and Chinese task cards into their destination drop zones, verify the resulting status, and satisfy the `browser_drag` required check.
