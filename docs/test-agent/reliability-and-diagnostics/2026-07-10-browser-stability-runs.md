# TestAgent Browser Stability Runs

Date: 2026-07-10

## Goal

Add explicit browser stability reruns to the standalone TestAgent so an asynchronous web feature is not accepted because of one lucky browser pass. This milestone stays inside `backend/test-agent/**` and does not modify group collaboration code.

## Claude Code References

The design follows the verification principles in:

- `D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`
  - Verify the delivered behavior by running it.
  - Test beyond the happy path.
  - Do not treat code inspection or an implementation claim as proof.
- `D:\claude-code\src\commands\init-verifiers.ts`
  - Keep feature verification separate from ordinary unit-test execution.
- `D:\claude-code\src\utils\claudeInChrome\prompt.ts`
  - Use real browser evidence.
  - Avoid meaningless retries.
  - Preserve useful diagnostics for the final decision.

## Work Order Contract

A browser check can request isolated reruns:

```json
{
  "name": "Chat delivery remains stable",
  "stabilityRuns": 3,
  "actions": [],
  "assertions": []
}
```

Supported input names:

- `stabilityRuns`
- `stability_runs`
- `repeatRuns`
- `repeat_runs`

The accepted range is `1..10`. The default is `1`, so existing browser checks keep their previous behavior.

## Runtime Behavior

- Playwright executes every requested run.
- Every run creates a fresh browser context.
- Every run receives a unique artifact index.
- Screenshots, snapshots, logs, traces, HAR files, videos, and other browser artifacts cannot silently overwrite evidence from another run.
- MCP browser providers return a blocked capability result when a check needs isolated stability runs.
- The browser provider registry can then fall back to Playwright.
- A zero-call MCP fallback no longer registers a transcript path for a file that was never created.

## Stability Classification

| Status | Meaning |
| --- | --- |
| `stable_pass` | Every requested run completed and passed. |
| `stable_fail` | Every requested run completed and failed. |
| `flaky` | Complete runs contain a real mix of pass and fail results. |
| `blocked` | Runs are missing, duplicated, inconsistent, skipped, or blocked. |

The `browser_stability` required check maps these states as follows:

- `stable_pass` -> `verified`
- `stable_fail` or `flaky` -> `not_verified`
- `blocked` -> `unknown`

## Report And Evidence

The stability summary is included in:

- TestAgent report JSON
- verdict JSON and evidence counters
- CLI report summary
- Markdown report
- execution-plan summary
- required-check coverage
- risks for flaky or consistently failing groups

The artifact verifier independently checks:

- valid stability metadata
- consistent group identity, project, check name, provider, and probe type
- complete and unique run numbers
- no artifact path reuse across runs
- report summary recomputation
- report and verdict consistency

## Self-Tests

Two dedicated exports were added:

- `runTestAgentBrowserStabilitySummarySelfTest`
  - Covers stable pass, stable fail, flaky, blocked, missing runs, and duplicate runs.
  - Covers required-check gating, verdict counters, CLI, Markdown, and contract schemas.
- `runTestAgentBrowserStabilitySelfTest`
  - Starts a real local web server.
  - Runs the same Playwright check three times.
  - Proves every context starts with empty `localStorage`.
  - Produces three unique screenshots.
  - Exercises MCP-to-Playwright fallback.
  - Verifies the intact artifact manifest.
  - Reuses a screenshot path in a tampered report and proves the artifact verifier rejects it.

## Verification Results

The scoped TypeScript build passed:

```powershell
npx tsc --target ES2022 --module commonjs --lib ES2022 --types node --strict false --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames --resolveJsonModule --rootDir backend --noEmit --pretty false backend/test-agent/index.ts backend/test-agent/cli.ts
```

The following targeted self-tests passed:

- `runTestAgentBrowserStabilitySummarySelfTest`
- `runTestAgentBrowserStabilitySelfTest`
- `runTestAgentExecutionPlanSelfTest`
- `runTestAgentBrowserProviderGapSummarySelfTest`
- `runTestAgentPlaywrightContextOptionsSelfTest`
- `runTestAgentRequiredCheckCoverageSelfTest`
- `runTestAgentArtifactVerifierSelfTest`
- `runTestAgentMcpProviderSelfTest`
- `runTestAgentMcpScreenshotArtifactSelfTest`
- `runTestAgentCliSelfTest`
- `runTestAgentContractSelfTest`
- `runTestAgentMultiSessionBrowserSelfTest`

## Scope Boundary

This milestone changes only the standalone TestAgent implementation and this documentation area. Existing uncommitted files under `backend/modules/collaboration/**` belong to other work and were not edited.

## Follow-Up

The long-term TestAgent goal remains active. A later collaboration integration can pass `stabilityRuns`, target URLs, credentials or session setup, acceptance criteria, and required checks through the project handoff without changing this runtime contract.
