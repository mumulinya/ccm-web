# Browser Tool Evidence Lineage Gate

Date: 2026-07-12

## Goal

Prove that every MCP browser result came from the exact browser tool calls recorded for that check
and run. A global transcript is no longer sufficient evidence for an individual PASS.

Reference:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`

The Claude Code verifier requires an actual command or tool execution and observed output for each
passing check. It also warns that evidence may be spot-checked by re-execution. This milestone
turns that requirement into a machine-verifiable browser evidence chain.

Scope remains limited to:

- `backend/test-agent/**`
- `docs/test-agent/**`

No collaboration or group-chat source file was modified.

## Previous Gap

TestAgent already persisted MCP browser calls in `browserToolCalls` and a JSONL transcript, but the
records formed one global list. A report could not prove which calls produced a particular browser
result.

This allowed several ambiguous or tampered states:

- a passing result with no attributable tool call;
- a tool call copied from check A into check B;
- a transcript call that no result claimed;
- a result referencing an ID absent from the transcript;
- report tool records modified independently of the persisted transcript.

## Execution Scope

The recording browser executor now uses Node `AsyncLocalStorage` to carry a
`BrowserCheckExecutionIdentity` through every asynchronous MCP tool call.

Each recorded call can contain:

```json
{
  "browserExecution": {
    "checkId": "browser-check:1:2",
    "projectIndex": 0,
    "checkIndex": 1,
    "run": 1,
    "expectedRuns": 1,
    "evidence": "provider"
  }
}
```

The MCP provider opens one execution scope around each browser check. After the check finishes, it
collects exactly the records created inside that scope and writes their IDs to
`browserResult.browserToolCallIds`.

This remains safe for future asynchronous or parallel tool activity because scope propagation is
bound to the promise chain rather than a mutable global current-check variable.

## Lineage Summary

Added `backend/test-agent/browser/tool-evidence-lineage.ts` and the report/verdict field
`browserToolEvidenceLineage`.

The summary independently derives:

- MCP results requiring tool evidence;
- linked and unlinked results;
- total, scoped, linked, and failed calls;
- missing and foreign call references;
- duplicate call records or references;
- scoped calls not claimed by their result;
- calls recorded without an execution scope;
- per-check and per-run call IDs and status.

A previously passing operational result is downgraded to partial when lineage is incomplete or
invalid. Verdict `canAccept` also requires complete lineage.

## Contract And Artifact Integrity

The report contract validates the result call-ID list, record execution identity, derived summary,
and PASS gate. It rejects call IDs attached to non-MCP or synthetic results.

The artifact verifier adds:

```text
browser_tool_lineage_evidence
```

This verifier:

1. Rebuilds lineage from raw browser results and tool records.
2. Checks report and verdict summaries and counters.
3. Requires a transcript artifact whenever tool calls exist.
4. Parses every JSONL transcript record.
5. Requires the transcript to exactly match `report.browserToolCalls` for all MCP sessions, not only
   minimal existing-session evidence.

Refreshing the report SHA-256 therefore cannot hide a deleted link, changed scope, orphan call, or
report/transcript mismatch.

## CLI And Markdown

CLI output now includes linked result and call ratios plus orphan, unscoped, and invalid counts.
Markdown includes a Browser Tool Evidence Lineage section with per-check call IDs. Browser tool
call details show both the record ID and owning browser execution identity.

## Self-Test

Added:

- `backend/test-agent/browser/tool-evidence-lineage-self-test.ts`
- `runTestAgentBrowserToolEvidenceLineageSelfTest`

The real TestAgent self-test runs two MCP browser checks and records 12 tool calls. It proves:

- both checks pass with disjoint call-ID sets;
- all 12 records carry provider execution scope;
- all records are claimed by exactly one result;
- report and verdict contracts pass;
- CLI, Markdown, transcript, and artifact verification pass;
- removing one result call-ID set leaves orphan calls and fails;
- linking check A call IDs to check B produces foreign and duplicate references;
- deleting one record scope produces an unscoped call and fails;
- changing report scope while refreshing report integrity still fails transcript and semantic checks.

## Verification

Passed:

- `npm run check`;
- browser tool evidence lineage self-test from a fresh temporary TypeScript build;
- genuine report and verdict contract validation;
- genuine artifact verification;
- refreshed-hash missing-link tamper rejection;
- refreshed-hash transcript-scope tamper rejection;
- Playwright MCP provider self-test;
- Claude in Chrome MCP provider self-test;
- Computer Use MCP provider self-test;
- capability-aware MCP/Playwright routing self-test;
- Claude in Chrome existing-session self-test;
- Chrome DevTools existing-session self-test;
- mixed Playwright plus existing-session MCP routing self-test;
- browser authentication and existing-session contract self-tests;
- real Playwright browser self-test;
- artifact verifier and report contract self-tests.

The long-term independent TestAgent goal remains active for later verification milestones and final
group-agent integration.
