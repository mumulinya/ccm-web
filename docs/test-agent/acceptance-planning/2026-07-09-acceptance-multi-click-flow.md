# TestAgent Acceptance Multi-Click Flow

## Goal

Extend generated browser checks from single-click flows to simple multi-click interaction paths. Real UI work often requires opening a menu, then choosing a nested action before the acceptance result appears.

## Changes

- Extended `backend/test-agent/browser/acceptance-click-flows.ts`.
- Added `targets[]` to click flows while preserving the existing `targetRole` and `targetName` fields for compatibility.
- Updated click action generation to emit each target in order.
- Added quote-range filtering so click-like words inside quoted labels, such as `Open settings`, are not treated as new click verbs.
- Added `runTestAgentAcceptanceMultiClickFlowSelfTest`.
- Exported the new self-test from `backend/test-agent/index.ts`.

## Behavior

The parser now supports criteria like:

- `At /menu, click "Open settings", click "Advanced", then shows "Advanced settings ready".`

It generates:

- `goto /menu`,
- `click role=button name=Open settings`,
- `click role=button name=Advanced`,
- `text "Advanced settings ready"`,
- `urlIncludes /menu`,
- console and network assertions,
- screenshot capture.

The parser remains conservative:

- it ignores click/open/follow words inside quoted labels,
- it keeps form/upload/download ownership with their specialized flow generators,
- it caps parsed click targets to a small bounded list.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`
- `runTestAgentAcceptanceMultiClickFlowSelfTest`

The self-test starts a real local page, lets TestAgent infer the multi-click browser check, clicks `Open settings`, clicks `Advanced`, and verifies the final visible status text through Playwright.

## Follow-Up

- Add guarded support for mixed link/button multi-step flows when needed.
- Consider recording parsed click targets in markdown/debug output if future troubleshooting needs it.
