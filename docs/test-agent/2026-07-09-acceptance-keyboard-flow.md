# Acceptance Keyboard Flow

## Task

Let TestAgent infer real browser keyboard shortcut checks from acceptance criteria, so command palettes and keyboard-only workflows can be verified without hand-written browser checks.

Examples:

```text
At /shortcuts, press "Control+Alt+K" keyboard shortcut, then shows "Command palette ready".
在 /shortcuts 按下 "Control+Alt+J" 快捷键，然后显示 "中文命令面板就绪"。
```

## Changes

- Added `backend/test-agent/browser/acceptance-keyboard-flows.ts`.
- Generates a real browser flow with:
  - `goto`
  - `press`
  - `text`
  - `visible`
  - `inViewport`
  - `urlIncludes`
  - console and network error checks
- Supports English keyboard intent such as `keyboard`, `shortcut`, `hotkey`, and `press key`.
- Supports Chinese keyboard intent such as `快捷键`, `热键`, `键盘`, `按键`, and `组合键`.
- Canonicalizes common key names, including `Ctrl` to `Control`, `Esc` to `Escape`, and arrow/page keys.
- Integrated the generator into `buildBrowserChecksForProject`.
- Filters keyboard criteria out of click-flow generation so `press "Control+Alt+K"` is not mistaken for clicking a button named `Control+Alt+K`.
- Added source metadata coverage and `runTestAgentAcceptanceKeyboardFlowSelfTest`.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Focused compiled-runtime self-tests passed:

```text
PASS runTestAgentAcceptanceKeyboardFlowSelfTest
PASS runTestAgentBrowserKeyboardActionSelfTest
PASS runTestAgentBrowserCheckSourceMetadataSelfTest
PASS runTestAgentAcceptanceHoverFlowSelfTest
PASS runTestAgentAcceptanceClickFlowSelfTest
PASS runTestAgentCliSelfTest
PASS runTestAgentContractSelfTest
```

## Notes

The self-test uses a real page that listens for English and Chinese shortcut criteria. The generated browser checks must send the shortcut and prove the revealed command palette text is visible and inside the viewport.
