# External Runner Snapshot MCP Config Delivery

## Why

The external runner gate could validate a runtime tool snapshot that carried `runtimeToolSnapshot.mcpConfigPath`, but the actual child-agent launch command only used the top-level `request.mcpConfigPath`.

That created a delivery gap: a request could pass MCP/Skill snapshot validation while Claude Code, Cursor, or Codex started without the validated MCP config path. For the CCM MCP/Skill chain, validation and execution must consume the same runtime artifact.

## What Changed

- Added `resolveRunnerMcpConfigPath` to resolve the effective MCP config path from the validated runtime snapshot first, then fall back to the top-level request field.
- Updated external runner launch to pass the effective MCP config path into `buildAgentCommand`.
- Returned the merged validated runtime snapshot from `validateExternalRunnerRuntimeToolGate`, including persisted snapshot fields like `mcpConfigPath`.
- Recorded the effective MCP config path and validated runtime snapshot in runner success and failure results.
- Extended `runAgentRunnerSelfTest` with a nested-snapshot-only MCP config request.
- Verified launch command construction for:
  - Claude Code `--mcp-config`
  - Cursor `--plugin-dir`
  - Codex isolated `CODEX_HOME`

## Affected Files

- `backend/agents/runner.ts`
  - `validateExternalRunnerRuntimeToolGate`
  - `runRequest`
  - `runAgentRunnerSelfTest`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`

## Risks And Notes

- The external runner still blocks stale, missing, dispatch-blocked, or authorization-drifted snapshots before launch.
- The effective MCP config path is taken from the already validated snapshot, so execution now follows the same artifact that passed the gate.
- Internal collaboration callers already pass a top-level `mcpConfigPath`; this change hardens external or queued requests that only carry the nested runtime snapshot payload.
