# TestAgent Required Adversarial Evidence Gate

## Goal

Make CCM TestAgent follow the Claude Code verification-agent rule that a delivery cannot receive PASS from happy-path evidence alone.

Reference:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`
- Key requirement: before PASS, the verifier must report at least one adversarial probe and its result.

This milestone changes that instruction from prompt guidance into an executable, machine-verifiable gate.

## Scope

Changed only:

- `backend/test-agent/**`
- `docs/test-agent/**`

No collaboration or group-chat module was changed.

## Work-Order Policy

New options:

```json
{
  "options": {
    "requireAdversarialProbe": true,
    "adversarialProbeWaiver": ""
  }
}
```

Snake-case JSON aliases are also accepted:

```json
{
  "options": {
    "require_adversarial_probe": false,
    "adversarial_probe_waiver": "This fixture only validates static command transport."
  }
}
```

Rules:

1. `requireAdversarialProbe` defaults to `true`.
2. Normalization automatically adds `adversarial` to `requiredChecks` when the gate is enabled.
3. Disabling the gate requires a non-empty waiver reason.
4. A silent `requireAdversarialProbe: false` is a contract and normalization error.
5. An explicitly supplied adversarial required check still wins over a global waiver.
6. Handoff-built work orders enable the gate by default.

## Evidence Summary

Reports and verdicts now include:

```json
{
  "adversarialEvidenceSummary": {
    "required": true,
    "waived": false,
    "status": "verified",
    "total": 2,
    "passed": 2,
    "failed": 0,
    "blocked": 0,
    "skipped": 0,
    "http": 1,
    "browser": 1,
    "probeTypes": ["invalid_form_input", "invalid_input"],
    "items": []
  }
}
```

Supported summary states:

- `verified`: at least one adversarial probe passed and none failed or blocked.
- `failed`: an executed adversarial probe produced failing product evidence.
- `blocked`: the environment prevented adversarial execution.
- `missing`: no executed adversarial evidence exists.
- `waived`: the requirement was disabled with an explicit reason and no probe ran.

The verdict also exposes:

- `evidenceSummary.adversarialProbes`
- `evidenceSummary.adversarialPassed`
- `evidenceSummary.adversarialFailed`
- `evidenceSummary.adversarialBlocked`

## Verdict Semantics

| Evidence state | Report result |
| --- | --- |
| Happy path passes, adversarial evidence missing | `partial`, `need_human`, `canAccept=false` |
| Adversarial HTTP/browser probe passes | May become `passed`, `accept`, `canAccept=true` |
| Adversarial probe fails | `failed`, `rework`, `canAccept=false` |
| Adversarial probe is environment-blocked | `blocked` or `partial`, never product `rework` solely for the block |
| Explicit reasoned waiver | May become `passed`, with waiver preserved in report and verdict |

This distinction prevents unavailable browser or endpoint infrastructure from being mislabeled as a product defect.

## Execution Plan

Execution plans now expose:

- whether the adversarial gate is required
- whether it is waived
- the waiver reason
- the configured adversarial probe count
- a `missing_adversarial_probe_plan` warning when the gate is required but no adversarial HTTP/browser check is planned

The CLI plan summary prints the same policy.

## Report Surfaces

The adversarial summary is propagated through:

- JSON report
- JSON verdict
- Markdown report
- CLI report summary
- CLI validation summary
- execution-plan summary
- report contract
- verdict contract

The TestAgent system prompt and capability definition now state that PASS requires adversarial execution unless a reasoned waiver exists.

## Artifact Integrity

Artifact verification now:

1. Rebuilds adversarial item counts and probe types from raw `httpResults` and `browserResults`.
2. Rejects report summaries that do not match raw results.
3. Requires report and verdict adversarial summaries to match.
4. Verifies verdict adversarial counters.
5. Rejects `canAccept=true` unless the report summary is `verified` or `waived`.
6. Rejects a passed report with missing required adversarial evidence.
7. Emits a dedicated `adversarial_evidence` semantic verification item.

Changing a report summary or waiver reason and then refreshing the manifest SHA-256 is still detected by semantic verification.

## Self-Test

New self-test:

- `runTestAgentAdversarialEvidenceGateSelfTest`

Coverage:

- command happy path without adversarial evidence returns `partial`
- real adversarial HTTP probe passes and permits acceptance
- adversarial browser probe passes and permits acceptance
- failed adversarial HTTP probe routes to rework
- blocked adversarial endpoint remains an environment limitation
- reasoned waiver permits acceptance and remains visible
- missing waiver reason is rejected
- report summary tampering is rejected
- waiver/report-verdict mismatch is rejected
- report and verdict contracts validate
- CLI and Markdown summaries include adversarial evidence

Observed specialized result:

```text
pass=true
missing=partial
http=passed
browser=passed
failed=failed
blocked=blocked
waived=passed
summaryTamper=failed
waiverTamper=failed
```

## Regression Verification

Passed:

```text
npm run check
```

Key regression self-tests passed:

- core command TestAgent
- report artifacts
- verdict artifact
- artifact verifier
- required-check coverage
- work-order and verdict contracts
- standalone CLI behavior
- handoff builder and handoff contract
- execution plan
- failure summary
- adversarial HTTP
- adversarial browser
- acceptance-derived invalid-form adversarial flow
- Playwright action effects
- multi-session action effects
- cross-session action effects
- MCP action effects

## Future Group-Agent Integration

The future group/main Agent only needs to provide:

- original user goal
- acceptance criteria
- project directory and runtime URL
- ordinary checks
- at least one relevant adversarial HTTP/browser check, or an explicit waiver reason

It can consume `verdict.adversarialEvidenceSummary` without parsing Markdown. No collaboration code was changed in this milestone.
