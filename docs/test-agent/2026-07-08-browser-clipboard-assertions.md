# TestAgent browser clipboard assertions

## Goal

Add real browser clipboard verification to the standalone CCM TestAgent without touching group collaboration code.

## Implemented

- Added browser action type `setClipboard`.
- Added handoff-friendly action aliases:
  - `set_clipboard`
  - `write_clipboard`
  - `clipboard_set`
  - `clipboard_write`
  - `copy_to_clipboard`
- Added browser assertion types:
  - `clipboardTextEquals`
  - `clipboardTextIncludes`
- Added assertion aliases:
  - `clipboard_text_equals`
  - `clipboard_equals`
  - `clipboard_value_equals`
  - `clipboard_text_includes`
  - `clipboard_includes`
  - `clipboard_contains`
- Granted Playwright browser contexts `clipboard-read` and `clipboard-write` permissions for the tested origin.
- Implemented clipboard read polling so delayed copy interactions can be verified.
- Added explicit MCP unsupported responses for clipboard action/assertions.
- Added a real Playwright self-test fixture that clicks a copy button, verifies clipboard contents, seeds clipboard through TestAgent, and checks a negative mismatch case.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- Temporary runtime compile to `%TEMP%\ccm-test-agent-compiled-runtime`
- Targeted self-tests:
  - `runTestAgentBrowserClipboardAssertionSelfTest`
  - `runTestAgentBrowserDragToActionSelfTest`
  - `runTestAgentBrowserTableAssertionSelfTest`

## Notes

Clipboard assertion errors report expected and actual lengths instead of dumping clipboard contents. This preserves evidence quality while reducing accidental exposure of copied secrets.
