# Server Tool Authorization Normalization

Date: 2026-07-07

## Goal

Move project and group tool authorization cleanup into the backend so CCM does
not rely on a specific frontend component to write valid MCP and Skill grants.

## Changes

- Added `backend/tools/tool-authorization.ts`.
- Added `normalizeToolAuthorization()` for project and group grant sets.
- Added `buildToolAuthorizationPayload()` to return normalized tools plus
  `ToolManager.buildScopeAudit()` output.
- `/api/projects/tools` GET now returns normalized `tools` and `tool_audit`.
- `/api/projects/tools` POST now saves normalized tools and returns `tool_audit`.
- `/api/groups/tools` GET now returns normalized `tools` and `tool_audit`.
- `/api/groups/tools` POST now saves normalized tools and returns `tool_audit`.
- `test:runtime-tools` now includes `runToolAuthorizationSelfTest()`.

## Normalization Rules

- Empty `mcp` and `skill` arrays remain empty, preserving explicit deny-all
  semantics.
- Duplicate grants are removed.
- Structured MCP grants such as `{ "server": "filesystem-mcp", "tool":
  "list_directory" }` become `filesystem-mcp/list_directory`.
- Structured Skill grants such as `{ "name": "code-safety-auditor" }` become
  `code-safety-auditor`.
- If a full MCP server grant exists, redundant `server/tool` grants for that
  server are removed.
- Control characters are stripped from grant values before persistence.

## Runtime Impact

Child agent runtime sync and proxy execution already consume the normalized
shape:

```json
{
  "mcp": ["filesystem-mcp/list_directory"],
  "skill": ["code-safety-auditor"]
}
```

This upgrade makes the server-side project and group configuration endpoints
produce the same shape consistently, even when callers are not the CCM web UI.

## Verification

- `npm run test:runtime-tools` passed and now includes `toolAuthorization`.
- Targeted TypeScript check passed for `backend/tools/tool-authorization.ts`,
  `backend/modules/projects/projects.ts`, and
  `backend/modules/collaboration/group-routes.ts`.
- Validation server on port 3081 returned HTTP 200 for the root page.
- Read-only API smoke passed for `GET /api/projects/tools`, including
  `tool_audit`.
- Read-only API smoke passed for `GET /api/groups/tools`, including
  `tool_audit`.
- `GET /api/tools/runtime-readiness?deep=0` kept the existing 6 ready current
  snapshots out of 15 total records.

Full `npm run build:backend` and `npm run check` are currently blocked by
unrelated TypeScript errors in
`backend/modules/collaboration/group-memory-index.ts` around
`pendingExternalIncludes` and related properties on `{}`. This upgrade does not
modify that file.
