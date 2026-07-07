# Claude Plugin Subagent Inheritance

## Background

CCM delivers authorized tools to Claude Code with two runtime mechanisms:

- `--mcp-config ... --strict-mcp-config` for the parent Claude Code process.
- `--plugin-dir ...` for invocation-scoped Skills.

After checking `D:\claude-code`, the important child-agent detail is that Claude Code propagates `--plugin-dir` to spawned teammate/subagent processes, but does not propagate `--mcp-config`.

That means a parent process can see CCM MCP servers through strict MCP config while Claude-spawned child agents may miss them unless the session plugin also carries a native-safe MCP config.

## What Changed

`backend/tools/runtime-tool-sync.ts` now writes Claude session plugins with explicit Claude-compatible manifest fields:

- `.claude-plugin/plugin.json`
- `skills: "./skills/"`
- `mcpServers: "./.mcp.json"`
- Plugin root `.mcp.json`

The Claude parent process still receives the same strict `mcp-<snapshot>.json` file.

The plugin `.mcp.json` is a child-agent inheritance channel. It contains only native-safe MCP servers that CCM already decided can be exposed at server scope.

## Permission Boundary

Tool-scoped MCP grants remain proxy-only.

For example:

- `search` can be written to strict MCP config and plugin `.mcp.json`.
- `payments/createInvoice` must not be written to either native MCP config, because Claude/Cursor native MCP loading cannot safely expose only one subtool from a server.

Those tool-scoped grants continue to execute through CCM's ToolManager/proxy path with authorization checks.

## Source Alignment

Relevant Claude Code source behavior checked in `D:\claude-code`:

- `src/utils/plugins/schemas.ts` supports manifest `skills` and `mcpServers`.
- `src/utils/plugins/pluginLoader.ts` loads Skill paths declared in the manifest.
- `src/utils/plugins/mcpPluginIntegration.ts` loads plugin `.mcp.json` and manifest `mcpServers`.
- `src/utils/swarm/spawnUtils.ts` propagates `--plugin-dir` to spawned teammate/subagent processes.
- `src/main.tsx` treats `--strict-mcp-config` as parent-process strict MCP input and skips auto-discovered MCP in that parent strict path.

## Test Coverage

The runtime sync integration self-test now runs both Codex and Claude Code temporary runtime syncs.

The Claude Code path verifies:

- The session plugin manifest declares `skills` and `mcpServers`.
- The plugin `.mcp.json` contains the full-server `search` MCP.
- The plugin `.mcp.json` does not contain tool-scoped `payments`.
- The strict parent MCP config and plugin inheritance MCP config have the same native-safe scope.
- Package-backed Skills are copied into the Claude plugin `skills/` directory with supporting files.
- The runtime snapshot records the plugin directory used by `--plugin-dir`.

Runtime readiness now also checks plugin MCP inheritance:

- For Claude Code and Cursor snapshots with plugin directories, readiness validates plugin `.mcp.json` when the plugin manifest declares `mcpServers` or native MCP servers were synced.
- The check verifies every native-safe MCP `serverName` from the audit exists in plugin `.mcp.json`.
- Missing plugin MCP inheritance is surfaced as `plugin_mcp_config`, so old or incomplete snapshots can be resynced instead of silently giving child agents fewer tools.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```

`npm run test:runtime-tools` covers the new Claude plugin subagent inheritance checks through `runtimeSync.runtimeSyncIntegration`.
