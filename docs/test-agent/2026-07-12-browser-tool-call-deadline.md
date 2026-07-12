# Browser Tool Call Deadline And Cancellation

Date: 2026-07-12

## Goal

Prevent a hanging MCP browser tool from hanging the entire TestAgent run, and preserve enough
evidence to distinguish an infrastructure timeout from a product failure.

Reference:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`

The Claude Code verifier requires real browser execution and troubleshooting instead of skipping a
check. CCM also needs a bounded operational contract: an unavailable or wedged browser provider
must produce PARTIAL/BLOCKED evidence rather than an indefinitely running agent.

Scope remains limited to:

- `backend/test-agent/**`
- `docs/test-agent/**`

No collaboration or group-chat source file was modified.

## Previous Gap

`browserTimeoutMs` was passed into browser actions and assertions, but the outer MCP tool executor
call had no deadline. If a tool promise never settled, TestAgent never reached its report, verdict,
artifact cleanup, or group-agent handoff.

The first timeout prototype exposed a second safety issue. After a timed-out MCP navigation, the
check continued requesting console, network, and snapshot evidence. The provider chain then treated
the blocked MCP result as eligible for Playwright fallback. A click or submission could therefore
have completed remotely after timeout and then been replayed through Playwright.

## Per-Call Deadline

The recording browser executor now uses normalized `browserTimeoutMs` as the deadline for every MCP
tool call. The existing normalization rules provide a minimum of 1000ms and a default of 60000ms.

For each call, the recorder:

1. Creates an `AbortController`.
2. Passes `{ signal, timeoutMs }` as an optional third executor argument.
3. Races provider completion against the deadline.
4. Marks the deadline before requesting abort, so synchronous abort rejection is still classified
   as timeout.
5. Writes exactly one failed timeout record.
6. Attaches the record to the current browser execution lineage scope.
7. Absorbs late resolve or reject outcomes without appending another transcript record.

Existing two-argument executors remain compatible because the third argument is optional. Executors
that support cooperative cancellation can stop work immediately by observing `AbortSignal`.

MCP `listTools()` capability discovery uses the same deadline and optional AbortSignal. A discovery
timeout is preserved as `Browser tool listing timed out after ...` instead of being collapsed into
the misleading `No MCP browser tools were listed` message. Since discovery happens before any page
operation, normal provider fallback remains safe at that stage.

## Timeout Evidence

`BrowserToolCallRecord` can now contain:

- `timeoutMs`;
- `timedOut`;
- `abortRequested`;
- the existing `browserExecution` identity.

Added `browserToolCallTimeoutSummary` to report and verdict. It records total, passed, failed,
timed-out, and abort-requested calls, timeout counts by tool, and per-call execution identity,
deadline, and measured duration.

CLI and Markdown show timeout totals and individual calls. Detailed tool records show deadline,
timeout, abort, call ID, and owning browser check/run.

## Immediate Stop

MCP execution now recognizes timeout errors returned directly by the executor or converted into a
failed adapter step. A timeout immediately exits the check as `blocked`.

TestAgent does not continue with:

- console or network collection;
- page-text or assertion reads;
- normal or failure screenshots;
- action-effect polling;
- another browser provider.

The provider registry treats a timed-out result as an uncertain execution outcome and returns it
without fallback. This prevents replay of a potentially side-effectful click, form submission, or
other mutation whose remote completion state is unknown.

## Contract And Artifact Integrity

The report contract and artifact verifier require:

- `timeoutMs` of at least 1000ms;
- timeout status to be failed;
- `abortRequested=true` for every timeout;
- no output preview on a timed-out call;
- measured duration not shorter than the deadline;
- a canonical timeout error or the existing minimal-session redacted error;
- no timed-out call linked to a passed browser result;
- zero timed-out calls in an accepted verdict.

The artifact verifier adds:

```text
browser_tool_timeout_evidence
```

It rebuilds timeout summary data from raw call records and compares report and verdict counters.

## Self-Test

Added:

- `backend/test-agent/browser/tool-call-timeout-self-test.ts`
- `runTestAgentBrowserToolCallTimeoutSelfTest`

The self-test uses an executor that deliberately ignores abort and resolves after 1200ms while the
deadline is 1000ms. It proves:

- the low-level call rejects at about 1000ms;
- hanging capability discovery aborts at about 1000ms with an explicit listing-timeout reason;
- AbortSignal fires;
- the late resolve occurs but creates no second record;
- the JSONL transcript remains one line;
- full TestAgent returns one MCP blocked result with no Playwright replay;
- browser result duration remains close to the configured deadline;
- timeout and lineage summaries remain internally consistent;
- report, verdict, and genuine artifact verification pass;
- removing abort evidence fails contract validation;
- linking a timeout to a passed browser result fails contract and refreshed-hash artifact checks.

## Verification

Passed:

- `npm run check` during implementation;
- browser tool call timeout self-test from a fresh temporary TypeScript build;
- browser tool evidence lineage self-test;
- Playwright MCP, Claude in Chrome MCP, and Computer Use MCP provider self-tests;
- MCP and Playwright action-effect self-tests;
- capability-aware and mixed browser provider routing self-tests;
- Claude in Chrome and Chrome DevTools existing-session self-tests;
- real Playwright browser self-test;
- artifact verifier and report contract self-tests;
- latest provider regression matrix: 13/13 passed after capability-discovery deadline changes.

The long-term independent TestAgent goal remains active for later verification milestones and final
group-agent integration.
