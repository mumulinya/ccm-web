# TestAgent Browser Network Summary

Date: 2026-07-08

## Goal

Make browser network evidence easier for the future group-main-agent handoff path to consume. Raw network logs remain useful, but the main agent should not need to parse log text to explain which request failed.

## Changes

- Added `backend/test-agent/browser/network-summary.ts`.
- Added `browserNetworkSummary` to TestAgent reports.
- Added the same summary to TestAgent verdicts.
- Added `browserNetworkErrors` to verdict `evidenceSummary`.
- Added a `Browser Network Summary` section to the Markdown report.
- Added a one-line browser network summary to the CLI report summary.
- Extended artifact semantic verification so verdict network summaries must match report network summaries.

## Summary Shape

Each browser check now reports:

- project/check/provider/status
- start URL and final URL
- request and response counts
- failed request and failed response counts
- network error count
- HTTP status-code distribution
- Playwright/MCP resource-type distribution
- failure-kind distribution, for example `http_resource_error`
- failed URL samples
- network error samples
- network log artifact path

## Verification

Targeted self-tests passed:

- `runTestAgentPlaywrightResourceErrorSelfTest`
- `runTestAgentArtifactVerifierSelfTest`
- `runTestAgentContractSelfTest`

The resource-error self-test proves:

- page HTTP probe passed
- browser observed a 404 `fetch`
- `networkNoErrors` failed
- report markdown included `Browser Network Summary`
- CLI summary included `Browser network: errors:1`
- verdict included the same network summary
- artifact verifier passed report/verdict semantic consistency

## Scope

Only the independent TestAgent module and TestAgent docs were changed. Group chat/collaboration code was not touched.
