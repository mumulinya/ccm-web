# External Runner Runtime Snapshot Match Gate

## Why

External runner requests can carry MCP/Skill runtime snapshots for Claude Code, Cursor, or Codex. Those snapshots are runtime-specific because their generated artifacts differ:

- Claude Code uses strict MCP config plus a Claude plugin directory.
- Cursor uses an isolated Cursor plugin directory.
- Codex uses an isolated `CODEX_HOME` with `config.toml`.

Before this change, the runner validated snapshot freshness, dispatch readiness, and authorization scope, but it did not explicitly reject runtime mismatches. A request could attempt to launch one runtime with a snapshot generated for another runtime. That weakens the guarantee that the child agent receives the exact authorized MCP/Skill artifacts for its own runtime.

## What Changed

- Runtime snapshot normalization now tracks whether the payload supplied an explicit runtime.
- `validateExternalRunnerRuntimeToolGate` now compares:
  - requested `agentType`;
  - explicit payload snapshot runtime;
  - persisted runtime from `runtime-tool-snapshot.json`.
- The runner rejects mismatches with a machine-readable blocker:
  - `payload_runtime`
  - `snapshot_runtime`
  - `payload_snapshot_runtime`
- Runner self-tests now use separate launch snapshots for Claude Code, Cursor, and Codex.
- Runner self-tests now prove a Cursor snapshot cannot be reused by a Claude Code request.

## Affected Files

- `backend/agents/runner.ts`
  - `normalizeRuntimeToolSnapshot`
  - `validateExternalRunnerRuntimeToolGate`
  - `runAgentRunnerSelfTest`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`

## Risks And Notes

- Requests that omit runtime in the nested payload remain compatible when the persisted snapshot runtime matches the requested `agentType`.
- Mismatched queued requests are now blocked before launch instead of relying on readiness probes or CLI failures.
- This protects runtime-specific native MCP/Skill delivery without changing group/project authorization semantics.
