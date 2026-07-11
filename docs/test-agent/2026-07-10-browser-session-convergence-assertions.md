# Browser Session Convergence Assertions

## Task

Extend the standalone TestAgent so a multi-session browser scenario can prove that two already-open user sessions eventually expose the same dynamic application state.

This closes an evidence gap in collaboration testing. A receiver-side text assertion proves that one expected message appeared, but it does not prove that sender and receiver reached the same rendered state. The new comparison step evaluates both isolated Playwright pages concurrently, polls until the requested relation holds, and records privacy-preserving evidence.

## Work Order Contract

A comparison is a top-level `sessionSteps` item:

```json
{
  "compare": {
    "leftSession": "sender",
    "rightSession": "receiver",
    "expression": "document.querySelector('#messages')?.innerText || ''",
    "operator": "equals",
    "timeoutMs": 10000,
    "pollMs": 100
  }
}
```

The shared `expression` is normalized into `leftExpression` and `rightExpression`. Different expressions may be supplied when the two roles render equivalent state through different UI structures.

Supported operators:

- `equals`: stable serialized values must be equal.
- `notEquals`: stable serialized values must differ.
- `includes`: the left string, array, or serialized value must include the right value.

Accepted aliases include `comparison`, `compareSessions`, `convergence`, `left_session`, `right_session`, `not_equal`, `contains`, `timeout_ms`, and `interval_ms`.

Use `browser_session_convergence` or `cross_session_compare` in `requiredChecks` when acceptance depends on this evidence.

## Validation

- Comparison steps must reference two declared, distinct sessions.
- A comparison cannot be nested in a `parallel` group.
- A comparison cannot also contain a session action/assertion or parallel fields.
- A shared expression or both side-specific expressions are required.
- Only `equals`, `notEquals`, and `includes` are accepted.
- Timeout and polling values must be positive.
- Comparisons count as assertions in execution plans and reports.

## Execution

- The two page expressions start concurrently with `Promise.allSettled`.
- Stable serialization sorts object keys before comparison and hashing.
- Failed relations are polled until `timeoutMs`.
- Every evaluation attempt is bounded by the remaining overall deadline. A page expression that returns a never-resolving Promise cannot hang TestAgent.
- A failed comparison stops later ordered scenario steps, matching existing assertion semantics.
- The result step is attributed to the left session and includes both session names. Multi-session failure summaries attribute a failed comparison to both participants.

## Evidence Privacy

Compared values are never written to the report.

Each side records only:

- JavaScript value type
- string, array, or object length when available
- stable serialized byte count
- SHA-256 digest

Evaluation error messages are also omitted. Reports retain only the error type, message byte count, and message SHA-256 digest. Contract and artifact verification reject common raw-value fields such as `value`, `rawValue`, `leftValue`, `rightValue`, `actual`, and `expected`.

Artifact verification also checks:

- comparison count agrees with comparison steps and result metadata
- both sessions exist and are distinct
- operator and status agree with the matching execution step
- digests are valid 64-character SHA-256 values
- passed `equals` comparisons have matching digests
- passed `notEquals` comparisons have different digests

## Reporting

The browser result includes `browserSessionComparisons`. Multi-session summaries expose:

- `comparisonCount`
- `failedComparisonCount`

Verdicts expose:

- `browserMultiSessionComparisons`
- `browserFailedSessionComparisons`

CLI and Markdown summaries show comparison totals. The TestAgent profile advertises `browser_session_convergence_assertions`.

## Verification

- Scoped TypeScript compilation: passed.
- `runTestAgentBrowserSessionComparisonSelfTest`: passed.
  - all three operators
  - stable object-key serialization
  - polling before convergence
  - alias normalization
  - sensitive evaluation-error redaction
  - never-resolving expression terminated in about 31 ms for a 25 ms deadline
- `runTestAgentMultiSessionBrowserSelfTest`: passed with two isolated Edge/Playwright contexts.
  - Alice sends a message while Bob's page is already open
  - Bob observes the message
  - sender and receiver `#messages` state digests converge
  - report, verdict, screenshots, artifact manifest, and semantic artifact verification pass
- Failure-summary fixture: 2 comparisons recorded, 1 failed, both failed sessions attributed.
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

No collaboration or group-chat implementation was changed. A future group/main Agent only needs to pass the project run command, target URL, declared browser sessions, ordered scenario steps, and explicit comparison criteria through the normal TestAgent work order.
