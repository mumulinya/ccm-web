# Browser Multi-Session Summary

## Task

Give a project/main Agent a compact, structured verdict for cross-user browser verification without requiring it to parse every raw browser result, session artifact, and ordered scenario step.

## Changes

- Added `backend/test-agent/browser/multi-session-summary.ts`.
- Added `browserMultiSessionSummary` to TestAgent report and verdict output.
- Only browser results containing at least two structured `browserSessions` are included. Ordinary single-page browser checks are excluded.
- Summary-level evidence includes:
  - total, passed, failed, blocked, and skipped scenario counts
  - total and unique session-role counts
- action, assertion, and failed-step counts
- explicit parallel-group counts
  - screenshot count
  - console, page, and network error counts
- Every scenario item includes:
  - project, check, provider, status, and probe type
  - session names and per-session final state counts
  - failed session names
  - failed step details

## Verdict Fields

The main Agent can read:

```text
verdict.browserMultiSessionSummary
verdict.evidenceSummary.browserMultiSessionScenarios
verdict.evidenceSummary.browserMultiSessionSessions
verdict.evidenceSummary.browserMultiSessionParallelGroups
verdict.evidenceSummary.browserFailedMultiSessionScenarios
```

This makes a collaboration decision possible without loading the complete report:

- accept when all required checks pass and failed multi-session scenarios are zero
- request rework when a sender, receiver, author, observer, or other named session fails
- inspect the summary item's `failedSessionNames` and `failedSteps` for the first actionable cause

## Output

- CLI output uses one canonical summary line and prints failed-session attention lines.
- Markdown reports include a dedicated `Browser Multi-Session Summary` section.
- Report/verdict contract schemas validate all summary counters and item fields.
- The artifact verifier rebuilds the summary from `browserResults`, compares it with the report and verdict, and validates the three verdict evidence counters.
- Existing per-session artifact integrity checks still verify session names, metadata, steps, screenshots, snapshots, and browser artifacts.

## Self-Tests

### Synthetic Summary Test

`runTestAgentBrowserMultiSessionSummarySelfTest` combines:

- one passed sender/receiver scenario
- one failed author/observer scenario
- one ordinary single-page browser check that must be excluded

It verifies that the observer is identified as the failed session and that console/network/step failures and verdict counts agree.

### Real Browser Test

`runTestAgentMultiSessionBrowserSelfTest` continues to run two isolated Playwright contexts. It now also verifies:

- one passing multi-session scenario
- two total sessions and two unique roles
- two explicit parallel groups
- nine executed actions and eight assertions
- two screenshots
- report/verdict summary equality
- zero failed multi-session scenarios
- CLI and Markdown summary output
- artifact manifest semantic verification

## Verification

- Scoped TypeScript compilation of `backend/test-agent/index.ts` and `backend/test-agent/cli.ts`: passed.
- `runTestAgentMultiSessionBrowserSelfTest`: passed with real Playwright contexts.
- `runTestAgentBrowserMultiSessionSummarySelfTest`: passed.
- Focused regressions passed:
  - `runTestAgentArtifactVerifierSelfTest`
  - `runTestAgentBrowserFlowSummarySelfTest`
  - `runTestAgentRequiredCheckCoverageSelfTest`
  - `runTestAgentCliSelfTest`
  - `runTestAgentContractSelfTest`

## Integration Boundary

No collaboration module was changed. The future group/main Agent can consume the summary through the normal TestAgent verdict contract after it submits an explicit multi-session browser check.
