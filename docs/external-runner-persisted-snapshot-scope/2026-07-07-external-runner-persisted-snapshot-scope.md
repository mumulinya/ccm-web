# External Runner Persisted Snapshot Scope

## Why

The external runner must treat the persisted runtime snapshot as the authority for MCP/Skill scope. A queued or external request can carry a partial payload, and the payload's `allowedTools` field is easier to omit or tamper with than the already generated `runtime-tool-snapshot.json`.

Before this change, runner scope validation was driven by the request payload's `allowedTools`. If that field was missing or forged, the runner could validate against the wrong tool set instead of the snapshot's original `requested` scope.

## What Changed

- `validateExternalRunnerRuntimeToolGate` now derives the effective requested MCP/Skill scope from the persisted snapshot first:
  - `persistedSnapshot.requested`
  - `persistedSnapshot.allowedTools`
  - `persistedSnapshot.allowed_tools`
- Payload `allowedTools` is still accepted only when it matches the persisted snapshot scope.
- Mismatched payload scope is blocked with `snapshot_requested_tools`.
- Runner self-tests now prove:
  - a request with only `snapshotPath` can recover the non-empty MCP/Skill scope from disk;
  - forged payload scope cannot override the persisted snapshot scope.

## Affected Files

- `backend/agents/runner.ts`
  - `validateExternalRunnerRuntimeToolGate`
  - `runAgentRunnerSelfTest`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`

## Risks And Notes

- Normal CCM collaboration requests already include `allowedTools`; they continue to work when the payload matches the snapshot.
- Older snapshot files that lack `requested` still fall back to payload scope.
- This tightens external runner authorization without changing project or group tool configuration semantics.
