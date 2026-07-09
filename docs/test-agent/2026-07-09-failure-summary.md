# Failure Summary

## Summary

Added a structured failure summary to TestAgent reports and verdicts. This gives the group main agent a compact list of rework points without digging through command output, browser steps, required check coverage, and acceptance coverage separately.

## Added

- New helper:
  - `backend/test-agent/failure-summary.ts`
- New report/verdict field:
  - `failureSummary`
- New exported API:
  - `buildTestAgentFailureSummary`
- New self-test:
  - `runTestAgentFailureSummarySelfTest`
- Markdown report section:
  - `## Failure Summary`

## Behavior

The summary collects failures from:

- work-order errors,
- dev server failures,
- failed or timed-out commands,
- failed or blocked HTTP checks,
- failed or blocked browser checks,
- missing required check coverage,
- unverified acceptance criteria.

Each item includes:

- `type`
- `project`
- `title`
- `status`
- `reason`
- `evidence`
- `nextAction`

For browser checks, TestAgent prefers the first failed browser step and includes useful pointers such as final URL, title, screenshot path, console log path, and network log path when available.

## Verification

- Added `runTestAgentFailureSummarySelfTest`.
- The self-test verifies:
  - command failures appear in `failureSummary`,
  - browser failed steps appear with the failed assertion name and message,
  - required check gaps appear as `required_check` items,
  - markdown reports include `## Failure Summary`,
  - verdict JSON carries the same summary,
  - report and verdict contract validation still passes.
