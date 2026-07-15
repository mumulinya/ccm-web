# Acceptance Browser History Flow

## Task

Let TestAgent turn explicit browser Back and Forward acceptance criteria into real Playwright navigation checks instead of treating them as ordinary click-only checks.

## Changes

- Added `backend/test-agent/browser/acceptance-history-flows.ts` as a separate browser-flow business module.
- Supports English and Chinese criteria with:
  - an explicit initial route and destination route
  - a quoted click target
  - browser Back intent
  - expected text after returning
  - optional browser Forward intent and expected destination text
- Generates deterministic browser actions:
  - open the initial route
  - click the semantic button/link target
  - wait for the destination URL
  - execute browser Back
  - wait for the initial URL and expected returned-page text
  - optionally execute browser Forward and wait for the destination URL/text again
- Adds final page, visibility, viewport, URL, console, network, and screenshot evidence.
- Adds `acceptance_history_flow` source metadata, so the browser acceptance flow summary groups these results automatically.
- Excludes history criteria from generic acceptance click flows and removes covered source/destination routes from redundant path-smoke generation.
- Exported the parser and check builder from the standalone TestAgent entry point.
- Added `runTestAgentAcceptanceHistoryFlowSelfTest` with a real local web server and Playwright browser run.

## Parsing Guardrails

The generator only creates a history flow when the criterion includes all evidence needed for a deterministic test: a click action, browser-history Back wording, two distinct URL paths, a quoted click target, and expected text after Back. Forward mode also requires expected text after Forward. Ambiguous page-level "back" buttons remain available to the normal click flow instead of being mistaken for browser chrome navigation.

## Verification

- Scoped TypeScript compilation of `backend/test-agent/index.ts` and `backend/test-agent/cli.ts`: passed.
- Real Playwright history-flow self-test: passed.
- The self-test verified:
  - an English Back-only flow
  - a Chinese Back-then-Forward flow
  - passing `goBack`, `goForward`, `waitForUrl`, and `waitForText` browser steps
  - final URL, visible text, viewport, console, network, screenshot, and acceptance-coverage evidence
  - 2 history flows in `browserFlowSummary`
  - no duplicate generic click flow or path-smoke check
  - ordinary page buttons named `Back` or `返回` do not trigger browser-history planning
- Focused regressions passed:
  - `runTestAgentBrowserFlowSummarySelfTest`
  - `runTestAgentBrowserCheckSourceMetadataSelfTest`
  - `runTestAgentAcceptanceClickNavigationFlowSelfTest`
  - `runTestAgentAcceptanceNetworkStateFlowSelfTest`
  - `runTestAgentArtifactVerifierSelfTest`
  - `runTestAgentCliSelfTest`
  - `runTestAgentContractSelfTest`

## Integration Boundary

No collaboration module was changed. A future project/main Agent only needs to pass the normal TestAgent work order with `targetUrl` and explicit acceptance criteria; TestAgent will plan and execute these history checks independently.
