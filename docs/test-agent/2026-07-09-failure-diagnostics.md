# Failure Diagnostics

## Summary

Extended TestAgent failure summaries with concrete diagnostic suggestions. The report now keeps the existing compact `nextAction` while adding a `diagnostics` list that tells the group main agent or project agent where to look first during rework.

## Added

- New `diagnostics` field on each `failureSummary` item.
- Report and verdict contract support for `failureSummary[].diagnostics`.
- Markdown output includes `diagnostics=` in the `## Failure Summary` section.
- Type-specific diagnostics for:
  - work-order issues,
  - dev server failures,
  - command failures and timeouts,
  - HTTP/API failures,
  - browser failures,
  - missing required check coverage,
  - unverified acceptance criteria.

## Behavior

Examples of generated diagnostics:

- command failure: rerun the exact command from the recorded cwd and inspect first assertion/stack trace,
- browser text failure: open the screenshot artifact, inspect rendered copy/loading state, and use `pageTextPreview`,
- URL failure: inspect routing and redirects,
- console/network failure: inspect captured console and network logs first,
- storage/cookie failure: inspect browser state setup and persistence after the writing action,
- required check gap: add explicit command, HTTP, browser, or artifact evidence that proves the required check.

The diagnostics are intentionally bounded and de-duplicated so reports stay compact.

## Verification

- Extended `runTestAgentFailureSummarySelfTest`.
- The self-test verifies:
  - command failures include a rerun diagnostic,
  - browser failures include screenshot and `pageTextPreview` diagnostics,
  - required check failures include command evidence guidance,
  - markdown reports include `diagnostics=`,
  - verdict JSON carries the same diagnostics,
  - report and verdict contract validation still passes.
