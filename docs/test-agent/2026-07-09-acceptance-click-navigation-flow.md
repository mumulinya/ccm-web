# TestAgent Acceptance Click Navigation Flow

## Goal

Extend the acceptance click-flow generator beyond quoted button clicks. Many handoffs describe browser navigation as natural language, such as `click the Settings link, then navigates to /settings`. TestAgent should turn that into a real browser interaction instead of falling back to a generic smoke check.

## Changes

- Extended `backend/test-agent/browser/acceptance-click-flows.ts`.
- Added conservative parsing for unquoted click targets:
  - `click the Settings link`
  - `click the Save button`
  - `follow the Account link`
- Reused the existing role inference so link/navigation wording maps to `role=link`; otherwise the flow defaults to `role=button`.
- Added `runTestAgentAcceptanceClickNavigationFlowSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Behavior

The parser now supports criteria like:

- `At /menu, click the Settings link, then navigates to /settings.`

It generates:

- `goto /menu`,
- `click role=link name=Settings`,
- `waitForUrl /settings`,
- `urlIncludes /settings`,
- `pageNotBlank`,
- console and network assertions,
- screenshot capture.

The unquoted parser is intentionally conservative. It stops at punctuation or follow-up words like `then`, `should`, `navigates`, and ignores targets that look like raw paths.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- `runTestAgentAcceptanceClickNavigationFlowSelfTest`

The self-test starts a real local page with a `Settings` link, lets TestAgent infer the browser check from the acceptance criterion, clicks the link with Playwright, waits for `/settings`, and verifies the final URL.

## Follow-Up

- Add support for multi-click flows after the single navigation flow is stable.
- Consider parsing quoted destination page text after navigation when both URL and visible text are present.
