# Playwright Multi-Session Browser Verification

## Task

Enable the standalone TestAgent to prove cross-user browser behavior such as group chat delivery, collaboration updates, shared notifications, and synchronized state without changing the collaboration implementation itself.

Sequential single-page checks are insufficient for this requirement: they cannot prove that a receiver page was already open before another user performed an action. TestAgent now supports an explicit ordered scenario across isolated Playwright browser contexts.

## Work Order Contract

Multi-session checks use optional `sessions` and `sessionSteps` fields on a normal browser check:

```json
{
  "name": "Sender message appears for receiver",
  "sessions": [
    {
      "name": "sender",
      "url": "/chat?user=alice",
      "setupActions": [
        { "type": "setSessionStorage", "key": "identity", "value": "alice" }
      ]
    },
    {
      "name": "receiver",
      "url": "/chat?user=bob",
      "setupActions": [
        { "type": "setSessionStorage", "key": "identity", "value": "bob" }
      ]
    }
  ],
  "sessionSteps": [
    { "session": "sender", "action": { "type": "fill", "label": "Message", "value": "Hello", "exact": true } },
    { "session": "sender", "action": { "type": "click", "role": "button", "name": "Send", "exact": true } },
    { "session": "receiver", "action": { "type": "waitForText", "text": "alice: Hello" } },
    { "session": "receiver", "assertion": { "type": "visible", "text": "alice: Hello", "exact": true } }
  ],
  "screenshot": true
}
```

Use `browser_multi_session` in `requiredChecks` when acceptance depends on this evidence.

## Validation Rules

- At least two uniquely named sessions are required.
- At least two sessions must participate in ordered scenario steps.
- Every session step must reference a declared session.
- A session step contains exactly one `action` or one `assertion`.
- A top-level step may instead contain a `parallel` array with at least two leaf steps from at least two sessions.
- Parallel groups cannot be nested.
- Top-level actions/assertions cannot be mixed with `sessionSteps` in the same check.
- Session URLs may be absolute or relative to the project `targetUrl`.
- Existing single-session browser checks remain backward compatible.

## Execution Semantics

- Playwright creates one isolated browser context per session.
- All session pages are opened and all setup actions finish before the first scenario step runs.
- Scenario actions and assertions then execute in the declared cross-session order.
- Steps inside an explicit `parallel` group start together and complete as one ordered scenario stage.
- Cookies, local storage, session storage, permissions, console telemetry, and network telemetry are isolated by context.
- A failed ordered step stops later scenario steps, while evidence is still finalized for every opened session.
- MCP browser providers return an explicit blocked capability result. Execution planning warns that multi-session checks require Playwright instead of allowing a weak single-page fallback.

## Evidence

Each `BrowserCheckResult` can now include `browserSessions`. Every session records:

- initial and final URL
- title and page text preview
- screenshots and page snapshots
- accessibility, trace, HAR, video, and download artifacts when enabled
- console, page, and network errors
- console and network log paths

Scenario steps are prefixed with the session name, for example:

```text
session:sender:action:click
session:receiver:action:waitForText
session:receiver:assert:visible
```

Parallel groups remain visible as normal session-prefixed result steps, while scenario metadata records `parallelGroupCount`.

CLI output reports scenario/session/failure totals. Markdown reports include a Browser Sessions section. Acceptance-sourced scenarios participate in `browserFlowSummary`, and required-check coverage can directly verify `browser_multi_session`.

The artifact verifier checks that session names are unique, session metadata agrees with the result, session-prefixed steps exist, and every per-session screenshot/snapshot/browser artifact is present in the aggregate browser result.

## Real Browser Self-Test

`runTestAgentMultiSessionBrowserSelfTest` starts a local chat application and opens two isolated contexts before any message is sent:

- sender session: Alice
- receiver session: Bob
- Alice fills and sends `Hello from Alice`
- Bob's already-open page waits for and verifies `alice: Hello from Alice`
- separate session storage assertions prove the identities remain isolated
- both sessions verify console and network health
- both sessions produce screenshots, snapshots, telemetry, and structured final state

## Verification

- Scoped TypeScript compilation of `backend/test-agent/index.ts` and `backend/test-agent/cli.ts`: passed.
- Real two-context Playwright self-test: passed.
- Work-order and report/verdict contract validation: passed.
- MCP planning warning and invalid-session normalization checks: passed.
- Artifact manifest and multi-session semantic verification: passed.
- Focused regressions passed:
  - `runTestAgentWorkOrderNormalizationSelfTest`
  - `runTestAgentExecutionPlanSelfTest`
  - `runTestAgentBrowserProviderGapSummarySelfTest`
  - `runTestAgentPlaywrightContextOptionsSelfTest`
  - `runTestAgentBrowserFlowSummarySelfTest`
  - `runTestAgentRequiredCheckCoverageSelfTest`
  - `runTestAgentArtifactVerifierSelfTest`
  - `runTestAgentCliSelfTest`
  - `runTestAgentContractSelfTest`

## Integration Boundary

No group-chat or collaboration module was modified. A future group/main Agent only needs to provide this standard TestAgent browser-check contract together with the project run command and target URL.

Natural-language auto-generation of arbitrary multi-user scenarios is intentionally not inferred yet. The main/project Agent should provide explicit sessions and ordered steps so that TestAgent does not invent user identities, authentication state, or collaboration expectations.
