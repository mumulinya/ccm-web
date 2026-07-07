# Tool Chain Verification Self-Test Coverage

Date: 2026-07-07

## Why

The chain verification gate made MCP / Skill dispatch readiness machine-readable, but it still needed stable automated coverage. A local HTTP smoke proves the current machine works; a self-test proves the gate semantics remain intact when future runtime, authorization, marketplace, or audit code changes.

This supports the long-running CCM goal because child-agent tool inheritance should be continuously verified, not only inspected through the UI.

## Changes

- Added `runToolChainVerificationSelfTest()` in the tools module.
- Added the self-test to `npm run test:runtime-tools`.
- Covered these gate cases with pure in-memory data:
  - observed configured scope becomes `verified`;
  - ready runtime without invocation evidence becomes `ready_unverified`;
  - authorization blocked, runtime missing, runtime resync need, and unauthorized attempts all block dispatch;
  - unconfigured scopes do not count as configured blockers;
  - runtime resync next action targets stale snapshot IDs with `staleOnly=false`;
  - group filters gate only the selected group scope;
  - project display-name invocation evidence is matched through project alias handling.

## Affected Files

- `backend/modules/tools/tools.ts`
- `scripts/runtime-tool-fabric-selftest.mjs`
- `docs/tool-chain-verification-selftest/2026-07-07-tool-chain-verification-selftest.md`

## Verification

- `npm run build:backend`: passed.
- `npm run check`: passed.
- `npm run test:runtime-tools`: passed, including new `toolChainVerification` checks:
  - `verifiedGatePassesObservedScope`
  - `readyUnverifiedRequiresObservation`
  - `blockedGateBlocksDispatch`
  - `unconfiguredScopeExcludedFromConfiguredGate`
  - `runtimeResyncActionTargetsSnapshot`
  - `gateAggregatesNextActions`
  - `groupFilterGatesOnlyGroupScope`
  - `projectAliasInvocationEvidence`
- Temporary server smoke on port `3099`:
  - `GET /api/tools/chain-verification` returned `schema=ccm-tool-chain-verification-v1`.
  - `gate.schema=ccm-tool-chain-verification-gate-v1`.
  - Current local state returned `gate.status=blocked`, `dispatchReady=false`, `rows=9`, `actionCount=6`.

## Risks / Notes

- The new self-test validates gate semantics with synthetic inventory and audit data. Real child-agent execution remains covered by runtime sync, tool manager, tool loop, and marketplace self-tests.
- The self-test intentionally does not read local user config, so it remains deterministic across machines.
