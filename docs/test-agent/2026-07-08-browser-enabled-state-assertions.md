# Browser Enabled State Assertions

Date: 2026-07-08

## Goal

Let TestAgent verify whether an interactive control is actually enabled or disabled in the running browser. This catches cases where a feature renders the right button text but leaves the button unusable, or where a guarded action is accidentally clickable too early.

## New Assertions

```json
{ "type": "disabled", "role": "button", "name": "Create account" }
```

```json
{ "type": "enabled", "role": "button", "name": "Create account" }
```

Accepted aliases:

- `is_enabled`
- `enabled`
- `can_click`
- `clickable`
- `is_disabled`
- `disabled`
- `not_enabled`
- `cannot_click`

## Changes

- Added `enabled` and `disabled` browser assertion types.
- Added work-order aliases for natural handoff phrasing.
- Playwright provider now verifies actionability through locator `isEnabled()`.
- MCP browser adapters return an explicit unsupported result because they do not expose stable DOM enabled-state checks.
- Added `runTestAgentBrowserEnabledStateSelfTest` with real pass/fail browser fixtures.

## Verification

Commands run:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

Result:

- TypeScript no-emit compile: PASS
- Targeted runtime self-tests:
  - `runTestAgentBrowserEnabledStateSelfTest`: PASS
  - `runTestAgentBrowserInputValueAssertionSelfTest`: PASS
  - `runTestAgentAcceptanceSelectCheckboxFormFlowSelfTest`: PASS
- Full TestAgent self-test matrix: 60/60 PASS

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
