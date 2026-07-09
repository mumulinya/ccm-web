# Tool Authorization Audit UI

Date: 2026-07-07

## Goal

Expose backend `tool_audit` results in project and group authorization panels so
admins can see the server-side truth for missing MCP servers, missing MCP
subtools, and missing Skills.

## Changes

- `ProjectManager.vue` stores `tool_audit` from `GET /api/projects/tools` and
  from successful `POST /api/projects/tools`.
- `ProjectToolsModal.vue` accepts `toolAudit` and displays backend audit rows.
- `GroupChat.vue` stores `tool_audit` from `GET /api/groups/tools` and from
  successful `POST /api/groups/tools`.
- `GroupToolsModal.vue` accepts `toolAudit` and displays backend audit rows.
- Group tool save now checks the backend response and does not show success when
  the server rejects the request.

## Runtime Impact

This does not change runtime execution. It makes the authorization control
surface more reliable by showing the same audit result that runtime sync and
proxy execution depend on.

## Verification

- `npm run build:frontend` passed.
- `npm run test:runtime-tools` passed, including `toolAuthorization`.
- `git diff --check` passed for the changed UI and documentation files.
