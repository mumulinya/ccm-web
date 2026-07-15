# Manual Tool Catalog Reload And Audit

## Background

Marketplace install, update, and uninstall already refreshed ToolManager after changing the MCP/Skill catalog. The manual tool APIs had a weaker path:

- `/api/mcp`
- `/api/mcp/delete`
- `/api/skills`
- `/api/skills/delete`

Those endpoints persisted JSON records but did not immediately rebuild ToolManager's in-memory MCP clients, server status, Skill list, prompt surface, and proxy execution catalog.

That could leave a short-lived mismatch where the central catalog had changed but agent prompts or CCM proxy execution still saw the old catalog.

## What Changed

Backend:

- `ToolManager.loadTools()` now performs a true full refresh:
  - disconnects existing MCP clients;
  - clears old server configs and statuses;
  - reloads MCP and Skill catalog records from disk.
- Manual MCP/Skill create, update, and delete APIs now call ToolManager reload before returning success.
- Manual catalog mutations append safe audit entries to `~/.cc-connect/tools/catalog-operations.jsonl`.
- The audit record stores action, type, name, reload status, and counts only. It does not store MCP env values, headers, commands, or Skill prompt bodies.

## Why This Matters

This makes CCM's central MCP/Skill management more immediate and predictable:

- newly added Skills become visible to prompt generation and Skill discovery without a separate reload click;
- updated MCP server definitions do not keep using a stale existing client;
- deleted MCP servers disappear from status and proxy execution after the delete API returns;
- manual tool changes now have a small audit trail matching the marketplace path.

## Verification Coverage

`runToolManagerRuntimeSelfTest()` now verifies:

- `loadTools()` disconnects stale clients;
- stale MCP server status is cleared on reload;
- the Skill catalog is rebuilt from the latest loader result.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run check
```
