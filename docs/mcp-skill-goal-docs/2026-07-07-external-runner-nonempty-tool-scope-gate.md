# External Runner Non-Empty Tool Scope Gate

Date: 2026-07-07

## Why

The external runner already revalidates runtime tool snapshots before launching child Agents. Its self-test covered missing snapshots, blocked dispatch gates, and basic scope drift, but the drift case used an empty current scope. That was weaker than the real CCM risk: a queued child-agent request may carry a non-empty MCP / Skill snapshot, then the group or project authorization changes before the external runner starts.

This upgrade strengthens the evidence that external runners cannot reuse stale MCP / Skill authorization after scope changes.

## Changes

- Extended `runAgentRunnerSelfTest()` with a non-empty MCP / Skill scope.
- Added a passing case where the queued snapshot and current scope both contain:
  - MCP `payments/createInvoice`
  - Skill `release-notes`
- Added a blocking case where the current scope has changed to:
  - MCP `payments/refundInvoice`
  - Skill `security-audit`
- Verified the block includes an `authorization_scope` blocker and exposes requested/current scope differences.

## Affected Files

- `backend/agents/runner.ts`
- `docs/external-runner-nonempty-tool-scope-gate/2026-07-07-external-runner-nonempty-tool-scope-gate.md`

## Verification

- `npm run build:backend`: passed.
- `npm run check`: passed.
- `npm run test:runtime-tools`: passed with new agent runner checks:
  - `runnerGateAcceptsMatchingNonEmptyScope`
  - `runnerGateBlocksChangedMcpSkillScope`
  - `runnerGateReportsAuthorizationScopeBlocker`
- Direct smoke:
  - `node -e "const { runAgentRunnerSelfTest } = require('./ccm-package/dist/agents/runner.js'); ..."`
  - Returned `pass=true` with all seven agent runner checks true.

## Risks / Notes

- This is a deterministic self-test of the runner gate and does not launch a real child-agent CLI.
- Real launches are still protected by the same `validateExternalRunnerRuntimeToolGate()` path before `runManagedCommand()`.
