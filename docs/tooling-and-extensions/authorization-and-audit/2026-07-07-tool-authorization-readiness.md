# Tool Authorization Readiness

## Background

Project and group tool authorization already persisted selected MCP/Skill grants and returned a server-side `tool_audit`. That audit showed missing MCP servers, missing MCP tools, and missing Skills, but the save result did not expose a compact machine-readable verdict for whether the authorization set was ready to dispatch to child agents.

This made it harder for callers, UI surfaces, and later orchestration gates to distinguish:

- a valid authorization set that can be delivered to child agents;
- a saved authorization set that contains stale, removed, or misspelled tools.

## What Changed

Backend:

- `buildToolAuthorizationPayload()` now returns `authorization_readiness`.
- Project and group tool authorization GET/POST responses include `authorization_readiness`.
- Tool authorization change records include the same readiness verdict.
- Readiness records include requested counts, available counts, missing counts, invalid MCP grants, and compact unavailable rows.

Frontend:

- Project and group tool configuration modals show whether the current authorization is dispatch-ready.
- Saving a config with unavailable grants uses a warning toast instead of a success-only message.

## Why This Matters

The authorization record can still preserve user intent when a tool is temporarily unavailable, but the system now has an explicit verdict before dispatch:

- child-agent orchestration can see whether the selected grants are currently deliverable;
- users get immediate feedback when a saved authorization has stale grants;
- the audit trail records readiness without storing MCP commands, env values, or Skill prompt bodies.

## Verification Coverage

`runToolAuthorizationSelfTest()` now verifies:

- ready authorization sets are marked `dispatchReady=true`;
- missing MCP/Skill grants are marked `dispatchReady=false`;
- change audit records carry the readiness verdict.

## Verification

Run:

```powershell
npm run build:backend
npm run test:runtime-tools
npm run build:frontend
npm run check
```
