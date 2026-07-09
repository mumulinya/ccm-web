# Tool Authorization Change Audit

Date: 2026-07-07

## Goal

Persist project and group MCP/Skill authorization changes so CCM can explain why
a child agent received a given tool grant.

## Changes

- Added authorization change record helpers in `backend/tools/tool-authorization.ts`.
- Added bounded JSONL audit output at
  `~/.cc-connect/agent-runner/tool-authorization-changes.jsonl`.
- `/api/projects/tools` now records project authorization changes after a
  successful save.
- `/api/groups/tools` now records group authorization changes after a successful
  save.
- `test:runtime-tools` now verifies authorization diff generation and compact
  audit summaries.

## Audit Record

Each record includes:

- scope: `project` or `group`
- scope ID
- actor and API source
- normalized before and after grants
- added and removed MCP/Skill grants
- compact missing-tool counts from `tool_audit`

The record intentionally does not include MCP command strings, environment
values, Skill prompts, or full server status payloads.

## Runtime Impact

This does not change runtime execution. It makes authorization changes
traceable before runtime sync copies MCP/Skill grants into Claude Code, Cursor,
or Codex runtime homes.

## Verification

- `npm run build:backend` passed.
- `npm run check` passed.
- `npm run test:runtime-tools` passed and includes authorization diff checks:
  `recordsAuthorizationDiff` and `summarizesAuditWithoutServerStatus`.
