# Playwright Multi-Session Parallel Steps

## Task

Let TestAgent arm a receiver-side wait at the same time another browser session performs an action. This is required for real-time chat delivery, transient notifications, presence changes, collaboration events, and other behavior that cannot be represented faithfully as purely sequential browser steps.

## Contract

A top-level multi-session scenario step may contain a `parallel` array:

```json
{
  "parallel": [
    {
      "session": "receiver",
      "action": {
        "type": "waitForText",
        "text": "alice: Hello",
        "timeoutMs": 10000
      }
    },
    {
      "session": "sender",
      "action": {
        "type": "click",
        "role": "button",
        "name": "Send",
        "exact": true
      }
    }
  ]
}
```

The group occupies one ordered stage in `sessionSteps`. All leaf steps start together with `Promise.all`, results remain in declared order, and later scenario stages start only after every parallel member completes.

## Validation

- A parallel group contains at least two leaf steps.
- At least two distinct declared sessions must participate.
- Every leaf step contains exactly one action or assertion.
- Parallel groups cannot also define their own session/action/assertion fields.
- Nested parallel groups are rejected by the leaf-step contract.
- Unknown sessions and single-session parallel groups produce work-order errors before browser launch.

## Planning And Evidence

- Execution-plan action/assertion totals count all parallel leaf steps.
- `browserSessionSteps` reports the total leaf-step count.
- `browserParallelGroups` reports the number of explicit parallel groups.
- Browser-result context includes:
  - `sessionStepCount`
  - `parallelGroupCount`
- Every parallel member step detail includes `parallelGroup=<n>`, so reports show exactly which cross-session steps ran together.
- `browserMultiSessionSummary` aggregates parallel-group counts.
- Verdict evidence includes `browserMultiSessionParallelGroups`.
- CLI and Markdown summaries expose the same count.
- Session-prefixed steps, screenshots, telemetry, snapshots, and artifact verification continue to work unchanged.

## Real Concurrency Self-Test

`runTestAgentMultiSessionBrowserSelfTest` now contains two parallel groups.

The first group starts a 400 ms browser-side delay in both isolated contexts, then each context sends a timestamp to the local test server. A follow-up `jsTruthy` assertion requires the server timestamps to differ by less than 200 ms. Sequential execution would differ by roughly 400 ms and fail.

The second group starts Bob's `waitForText` action together with Alice's semantic `Send` button click. Both steps must pass before the final receiver-side visibility assertion runs.

The self-test also verifies:

- 14 leaf scenario steps after adding one cross-session convergence assertion
- 2 parallel groups
- 7 planned actions and 9 planned assertions
- 9 executed actions after including automatic session navigation
- 9 executed assertions
- summary, verdict, CLI, Markdown, contract, and artifact consistency
- artifact verification reconstructs parallel groups from step details and checks that each group contains at least two sessions
- invalid same-session parallel groups are rejected

## Verification

- Scoped TypeScript compilation: passed.
- Real two-context Playwright concurrency self-test: passed.
- Focused regressions passed:
  - `runTestAgentBrowserMultiSessionSummarySelfTest`
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

No collaboration source code was changed. A future group/main Agent can submit explicit parallel groups through the normal TestAgent work order when the acceptance criterion depends on receiver readiness or truly concurrent browser activity.
