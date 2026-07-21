# TestAgent Report

- Status: partial
- Recommendation: need_human
- Work order: test_mru515nd_9105jv
- Task: task-internal-mcp-e2e
- Group: group-internal-mcp-e2e
- Original goal: 验证任务、知识、TestAgent、交付工作区与证据 MCP 能被第三方 Agent 调用
- Started: 2026-07-21T04:12:51.540Z
- Finished: 2026-07-21T04:12:52.557Z
- Duration: 1017ms

## Summary

TestAgent execution passed, but acceptance criteria have only report-status fallback evidence and are not independently verified.

## Acceptance Criteria

- npm run check 成功

## Commands

- demo-project command `npm run check`: passed - exit=0; duration=842ms

## HTTP

- none

## HTTP Concurrency Summary

- checks=0; requests=0; completed=0; passed=0; failed=0; blocked=0; maxInFlight=0

## HTTP Page Resource Summary

- total=0; passed=0; failed=0; blocked=0; contentTypeMismatches=0; kinds=none

## Adversarial Evidence Summary

- status=waived; required=no; waived=yes; total=0; passed=0; failed=0; blocked=0; skipped=0; http=0; browser=0; relevant=0; unlinked=0; passedRelevant=0; goalLinked=0; waiver=This isolated command-only fixture has no external input surface to probe.

## Browser

- none

## Browser Network Summary

- none

## Browser Authentication Summary

- checks:0 managed:0 existingSession:0 passed:0 failed:0 blocked:0 sessions:0 credentialEnvNames:0 storageStates:0 artifactSuppressions:0 existingProviders:none minimal:0 full:0 tabContext:0 newTabs:0
- Credential environment names: none

## Browser Recovery Summary

- checks=0; attempted=0; recovered=0; failed=0; unsafeRetriesPrevented=0

## Browser Action Effect Summary

- checks=0; actions=0; changed=0; failed=0; unchanged=0; unavailable=0; crossSession=0; detailSuppressed=0

## Browser Interaction Summary

- none

## Browser Multi-Session Summary

- scenarios=0; passed=0; failed=0; blocked=0; sessions=0; parallelGroups=0; roles=none; comparisons=0; failedComparisons=0; actions=0; assertions=0; failedSteps=0; screenshots=0; consoleErrors=0; pageErrors=0; networkErrors=0

## Browser Stability Summary

- groups=0; stable=0; flaky=0; failed=0; blocked=0; runs=0/0; passedRuns=0; failedRuns=0; blockedRuns=0; screenshots=0

## Browser Check Execution Coverage

- none

## Browser Evidence Temporal Integrity

- status=complete; items=1; timestamps=0; durations=0; reportWindow=0; resultWindow=0; planMismatch=0; toleranceMs=100
- report / report: complete - startedAt=2026-07-21T04:12:51.540Z; finishedAt=2026-07-21T04:12:52.557Z; durationMs=1017

## Browser Resource Lifecycle

- status=complete; owned=0; released=0; external=0; open=0; cleanupFailed=0; invalid=0

## Browser Tool Evidence Lineage

- status=complete; results=0/0; calls=0/0; orphan=0; unscoped=0; invalid=0; failedCalls=0

## Browser Tool Call Timeouts

- calls=0; passed=0; failed=0; timedOut=0; abortRequested=0

## Browser Acceptance Flow Summary

- passed:0, failed:0, blocked:0, skipped:0, total:0, types:0, criteria:0; actions=0; assertions=0; failedSteps=0

## Browser Provider Summary

- status=provider_none; preferred=none; selected=none; available=none; attempted=none; fallback=no

## Browser Provider Gaps

- none

## Failure Summary

- none

## Required Check Summary

- Status counts: verified:1, not_verified:0, unknown:0, total:1
- Attention: none
- Verified commands: npm run check: passed - exit=0

## Required Check Coverage

- commands: verified - npm run check: passed - exit=0

## Acceptance Summary

- Status counts: verified:1, not_verified:0, unknown:0, total:1
- Match strength counts: direct:0, token:1, fallback:0, none:0
- Evidence source counts: matched_evidence:1, single_criterion_report_status:0, none:0
- Attention: none
- Verified npm run check 成功 [token/matched_evidence score=0.75]: demo-project: command npm run check: exit=0; duration=842ms

## Required Acceptance Evidence Gate

- status=weak; canAccept=no; total=1; verified=1; notVerified=0; unknown=0; matched=1; fallback=1; missing=0; direct=0; token=1
- Fallback-only evidence: npm run check 成功

## Acceptance Coverage

- npm run check 成功: verified - demo-project: command npm run check: exit=0; duration=842ms; demo-project: npm run check: exit=0; duration=842ms

## Risks

- adversarial probe waived: This isolated command-only fixture has no external input surface to probe.
- acceptance criterion has only report-status fallback evidence: npm run check 成功

## Blocked Reasons

- none

## Evidence

- npm run check: passed - exit=0; duration=842ms
- TestAgent JSON report: partial - C:\Users\admin\.cc-connect\ccm\scratch\internal-workflow-mcp-selftest\.cc-connect\test-agent-artifacts\test_mru515nd_9105jv\report.json
- TestAgent Markdown report: partial - C:\Users\admin\.cc-connect\ccm\scratch\internal-workflow-mcp-selftest\.cc-connect\test-agent-artifacts\test_mru515nd_9105jv\report.md
- TestAgent verdict JSON: partial - C:\Users\admin\.cc-connect\ccm\scratch\internal-workflow-mcp-selftest\.cc-connect\test-agent-artifacts\test_mru515nd_9105jv\verdict.json
- TestAgent artifact manifest: partial - C:\Users\admin\.cc-connect\ccm\scratch\internal-workflow-mcp-selftest\.cc-connect\test-agent-artifacts\test_mru515nd_9105jv\artifact-manifest.json

## Dev Server Details

- none

## Command Details

### 1. demo-project: npm run check

- Status: passed
- CWD: C:\Users\admin\.cc-connect\ccm\scratch\internal-workflow-mcp-selftest\demo-project
- Exit code: 0
- Duration: 842ms

**Command run:**
```text
npm run check
```

**Output observed:**
```text
> check
> node -e "process.stdout.write('check-ok')"

check-ok
```

## HTTP Details

- none

## Browser Details

- none

## Browser Provider Preflight

- none

## Browser Tool Calls

- none

