# Cursor Runtime Plugin E2E Coverage

## Why

CCM already generated isolated Cursor runtime plugin artifacts for project child agents, but the runtime sync integration self-test did not prove that path at the same level as Codex and Claude Code.

This matters for the long-running MCP/Skill goal: Cursor child agents must receive authorized MCP and Skill resources through CCM-managed runtime artifacts, while unauthorized or tool-scoped MCP grants remain behind the CCM proxy. The test also needs to prove CCM does not write `.cursor/` configuration into the user's project workspace.

## What Changed

- Added a Cursor runtime sync scenario to `runRuntimeToolSyncIntegrationSelfTest`.
- Verified the generated `.cursor-plugin/plugin.json` declares both `skills` and `mcpServers`.
- Verified the generated plugin `.mcp.json` contains only native-safe full-server MCP grants.
- Verified tool-scoped MCP grants remain excluded from native Cursor MCP config.
- Verified package-backed Skills are copied into the Cursor plugin skill directory with references intact.
- Verified Cursor runtime snapshots preserve the plugin directory and MCP config path.
- Verified runtime readiness checks the Cursor plugin MCP inheritance path.
- Verified the project work directory is not polluted with a `.cursor/` folder.
- Surfaced the most important Cursor checks in the top-level `runtimeSync` self-test output.

## Affected Files

- `backend/tools/runtime-tool-sync.ts`
  - `runRuntimeToolSyncIntegrationSelfTest`
  - `runRuntimeToolSyncSelfTest`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`

## Risks And Notes

- This is test coverage and chain proof for the existing Cursor plugin sync implementation; it does not change the Cursor launch command.
- The Cursor readiness check remains filesystem-based unless a real Cursor CLI deep probe is added later.
- Full-server MCP grants can be exposed natively; tool-scoped MCP grants continue to use the CCM proxy because native MCP configs cannot reliably enforce per-tool filtering.
