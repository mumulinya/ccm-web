# TestAgent Browser Provider Plan Warnings

## Goal

Warn before execution when the selected browser provider is unlikely to support a planned browser check. This complements runtime provider gap evidence: plan warnings help the main/project agent choose Playwright before wasting a run on unsupported MCP/Computer Use browser operations.

## Changes

- Extended `backend/test-agent/browser/provider-gaps.ts` with static plan analysis.
- Added `browserProviderWarnings` to the execution plan and plan summary counts.
- Updated `formatTestAgentCliExecutionPlanSummary(...)` so `--plan-only --summary` prints provider warnings.
- Exported provider plan warning helpers from `backend/test-agent/index.ts`.
- Added `browser_provider_plan_warnings` to the TestAgent capability declaration.

## Covered Warnings

- Browser provider disabled while browser checks exist.
- MCP-selected plans that include actions requiring Playwright, such as file upload, drag/drop, history navigation, select controls, clipboard writes, and offline/online emulation.
- MCP-selected plans that include assertions requiring deterministic DOM/browser-state evidence, such as downloaded file verification, element screenshots, accessibility/ARIA state, form state, cookies/storage, layout metrics, native dialogs/popups, and table structure.
- MCP-selected plans that ask for deterministic browser context setup or Playwright trace/HAR/video artifacts.

## Verification

- Added coverage to `runTestAgentExecutionPlanSelfTest`.
- Expected behavior:
  - Playwright plan reports `Browser provider warnings: 0`.
  - MCP plan with trace/HAR artifacts, `uploadFile`, and `downloadedFile` reports three Playwright recommendation warnings.

## Follow-Up

- Later group/main-agent integration can run TestAgent in `--plan-only --summary` mode before full execution and switch provider to Playwright when warnings appear.
