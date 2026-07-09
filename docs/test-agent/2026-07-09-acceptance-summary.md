# TestAgent Acceptance Summary

## Goal

Make acceptance-criteria status easy for the main/group agent to consume. Required checks prove categories of verification were attempted; acceptance summary answers the product question directly: which user-facing criteria are verified, failed, or still unknown.

## Changes

- Added `backend/test-agent/acceptance-summary.ts`.
- Added `acceptanceSummary` to verdict JSON.
- Added acceptance status counts, attention lines, and verified evidence samples to CLI report summaries.
- Added `## Acceptance Summary` to markdown reports while preserving full `## Acceptance Coverage`.
- Added artifact verifier consistency checks for `verdict.acceptanceSummary`.
- Exported acceptance summary helpers from `backend/test-agent/index.ts`.
- Added `acceptance_coverage_summary` to the TestAgent capability declaration.

## Behavior

The summary includes:

- total acceptance criteria
- counts for `verified`, `not_verified`, and `unknown`
- failed/unknown criteria with evidence or status
- a few verified evidence samples

This gives the future group/main-agent bridge a direct machine-readable verdict surface without parsing markdown.

## Verification

- Added `runTestAgentAcceptanceSummarySelfTest`.
- Updated CLI and contract self-tests for the new summary field.

## Follow-Up

- Later integration can prioritize `verdict.acceptanceSummary.notVerified` and `verdict.acceptanceSummary.unknown` when routing rework back to project agents.
