# Browser Acceptance Flow Summary

## Task

Give project/main agents a compact report of real browser acceptance flows grouped by their generated flow type.

## Changes

- Added `backend/test-agent/browser/flow-summary.ts`.
- Added `browserFlowSummary` to TestAgent report and verdict output.
- Groups browser results by `context.generatedBy`, for example:
  - `acceptance_form_flow`
  - `acceptance_popup_flow`
  - `acceptance_drag_flow`
  - `acceptance_network_state_flow`
- Only includes results carrying acceptance source metadata; unrelated hand-written browser checks are excluded.
- Records:
  - passed, failed, blocked, skipped, and total flow counts
  - flow type count
  - deduplicated acceptance criterion count
  - action, assertion, and failed-step counts
  - projects, providers, criteria, and failure details per flow type
- Added the summary to:
  - report JSON
  - verdict JSON
  - CLI summary and attention lines
  - Markdown report
  - report/verdict contract schemas
  - artifact semantic verification
- Added `runTestAgentBrowserFlowSummarySelfTest`.

## Verification

- `npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts`: passed.
- Compiled the same TestAgent entry points to a workspace-local temporary runtime: passed.
- Focused runtime self-tests passed:
  - `runTestAgentBrowserFlowSummarySelfTest`
  - `runTestAgentArtifactVerifierSelfTest`
  - `runTestAgentAcceptanceNetworkStateFlowSelfTest`
  - `runTestAgentAcceptancePopupFlowSelfTest`
  - `runTestAgentCliSelfTest`
  - `runTestAgentContractSelfTest`
- The summary self-test verified 3 acceptance flows across 2 generated flow types and 3 distinct criteria: 1 passed, 1 failed, and 1 blocked.
- The unrelated explicit browser smoke result was excluded, while verdict evidence reported 3 acceptance flows and 2 failed or blocked flows.

## Notes

The self-test mixes passed, failed, and blocked acceptance flows plus an unrelated explicit browser check. It verifies only acceptance-sourced flows are grouped and that report, verdict, CLI, Markdown, contract validation, and evidence counts agree.
