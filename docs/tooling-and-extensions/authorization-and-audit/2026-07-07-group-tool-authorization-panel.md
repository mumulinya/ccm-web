# Group Tool Authorization Panel Upgrade

Date: 2026-07-07

## Goal

Make group-level MCP and Skill authorization directly operable from the group
chat UI. This closes a practical gap in the runtime tool chain: group chats can
now grant the tools that child project agents should receive during dispatch.

## Changes

- `GroupChat.vue` now owns explicit `groupTools` and `groupAllTools` state.
- Opening the group tool modal loads the current group grants plus all enabled
  MCP servers, enabled Skills, and currently discovered MCP subtools.
- `GroupToolsModal.vue` now renders selectable MCP servers and Skills instead
  of only showing already configured entries.
- MCP subtools can be granted with `server/tool` values, matching the existing
  backend authorization parser used by `ToolManager` and runtime sync.
- Selecting a full MCP server suppresses duplicate subtool grants for that
  server.
- Missing MCP or Skill grants remain visible so admins can see stale grants and
  recover them after reinstalling a marketplace item.

## Runtime Impact

The backend already accepts group `tools` in the shape:

```json
{
  "mcp": ["filesystem-mcp", "fetch-web-mcp/fetch"],
  "skill": ["code-safety-auditor"]
}
```

Those values flow into the same runtime sync and tool execution authorization
path used by project child agents. This update makes that shape configurable
from the group chat UI.

## Verification

- `npm run build:frontend` passed.
- `npm run test:runtime-tools` passed, including MCP tool-scope authorization.
- `npm run check` passed for backend and Feishu integration TypeScript.
