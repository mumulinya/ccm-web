# Project MCP Subtool Authorization Upgrade

Date: 2026-07-07

## Goal

Bring project-level tool authorization to the same granularity as the runtime
authorization engine. Project agents can now be granted an entire MCP server or
only selected MCP subtools before they are dispatched.

## Changes

- `ProjectManager.vue` now normalizes project tool grants before load and save.
- The project tool loader reads `/api/tools/status` and attaches discovered MCP
  subtools to each enabled MCP server.
- `ProjectToolsModal.vue` now renders MCP servers with nested subtool grants.
- Subtool grants are stored as `server/tool`, matching the existing
  `ToolManager` and runtime sync authorization parser.
- Selecting a full MCP server removes redundant `server/tool` grants for that
  server.
- Missing MCP or Skill grants remain visible so stale project authorization can
  be diagnosed after uninstalling or reinstalling marketplace resources.

## Runtime Impact

Project tool configuration can now persist values such as:

```json
{
  "mcp": ["filesystem-mcp/list_directory"],
  "skill": ["code-safety-auditor"]
}
```

When a project child agent is started, this grant set flows into the existing
runtime sync path. Unsupported tools remain absent from native runtime configs,
and proxy execution still checks authorization before every tool call.

## Verification

- `npm run build:frontend` passed.
- `npm run test:runtime-tools` passed, including MCP tool-scope
  authorization.
- `npm run check` passed for backend and Feishu integration TypeScript.
