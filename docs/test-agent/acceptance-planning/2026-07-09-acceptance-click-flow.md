# TestAgent Acceptance Click Flow

## Goal

Move TestAgent closer to real browser verification from acceptance criteria. Existing generated checks covered smoke, form, upload, download, and responsive cases. This adds a conservative click-flow generator for criteria that describe clicking a control and observing a visible result.

## Changes

- Added `backend/test-agent/browser/acceptance-click-flows.ts`.
- Added `ACCEPTANCE_CLICK_FLOW_PROBE_TYPE`.
- Integrated click-flow checks into `buildBrowserChecksForProject`.
- Exported click-flow helpers from `backend/test-agent/index.ts`.
- Added the capability declaration `acceptance_criteria_to_click_browser_flows`.
- Added `runTestAgentAcceptanceClickFlowSelfTest`.

## Behavior

The new parser targets criteria shaped like:

- `At /menu, click "Open settings", then shows "Settings panel ready".`

It generates:

- `goto` to the target URL,
- semantic `click` using role/name,
- optional `waitForUrl` when the criterion includes a post-click URL,
- `pageNotBlank`,
- expected text assertion,
- URL assertion,
- console and network error assertions,
- screenshot capture.

The parser intentionally avoids form, upload, download, select, check, and input criteria so those specialized flows keep ownership.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- `runTestAgentAcceptanceClickFlowSelfTest`

The self-test starts a real local web server, lets TestAgent infer the click browser check from acceptance criteria, runs it through Playwright, clicks the button, and verifies the post-click text evidence.

## Follow-Up

- Extend click-flow parsing for link-driven navigation phrasing.
- Add multi-step click sequences only after the single-click flow remains stable.
- Let future group-chat integration include generated click-flow checks when handing browser-facing acceptance criteria to TestAgent.
