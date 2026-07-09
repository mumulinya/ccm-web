# Tool Authorization Options API

Date: 2026-07-07

## Goal

Provide one backend source of truth for project and group authorization panels.
The UI no longer needs to assemble MCP servers, MCP subtools, Skill rows, and
runtime status from three separate endpoints.

## Changes

- Added `buildToolAuthorizationOptions()` in `backend/tools/tool-authorization.ts`.
- Added `GET /api/tools/authorization-options`.
- The endpoint returns enabled MCP servers, discovered MCP subtools, enabled
  Skills, grant strings, server state, and safe metadata.
- The endpoint intentionally omits sensitive runtime details such as MCP command
  strings and Skill prompts.
- `ProjectManager.vue` now loads project authorization options from the unified
  endpoint.
- `GroupChat.vue` now loads group authorization options from the unified
  endpoint.
- `runToolAuthorizationSelfTest()` now verifies grant construction and that
  sensitive fields stay out of authorization options.
- Fixed the packaged server dynamic import for the memory control center so the
  validation server can keep serving APIs after rebuilds.

## Endpoint Shape

```json
{
  "success": true,
  "mcp": [
    {
      "name": "filesystem-mcp",
      "grant": "filesystem-mcp",
      "state": "connected",
      "tools": [
        {
          "name": "list_directory",
          "grant": "filesystem-mcp/list_directory"
        }
      ]
    }
  ],
  "skill": [
    {
      "name": "code-safety-auditor",
      "grant": "code-safety-auditor",
      "toolName": "skill:code-safety-auditor"
    }
  ]
}
```

## Runtime Impact

This keeps the authorization UI aligned with the same normalized grant shape
used by runtime sync and proxy tool execution. Marketplace-installed resources
show up in one place after installation and tool reload.

## Verification

- `npm run build:frontend` passed.
- `npm run build:backend` passed.
- `npm run check` passed.
- `npm run test:runtime-tools` passed and includes the expanded
  `toolAuthorization` checks.
- Validation server on port 3081 returned HTTP 200 for the root page.
- `GET /api/tools/authorization-options` returned 3 MCP servers, 2 Skills, and
  19 MCP subtools in the current environment.
- The API smoke check confirmed MCP options do not expose `command` and Skill
  options do not expose `prompt`.
