# Runtime Missing Snapshot Resync

## Why

CCM can centrally authorize MCP/Skill for projects and groups, but the runtime resync endpoint previously only refreshed existing runtime snapshots. If a project or group already had authorized tools but had never produced a runtime snapshot, marketplace install/update could show authorization impact while failing to prove that the resource entered the child-agent runtime delivery chain.

This blocked the long-running MCP/Skill goal in two ways:

- configured project scopes stayed in `runtime_missing`;
- marketplace operations had source proof and authorization impact, but no `runtimeResync` bridge evidence.

## What Changed

- Added missing-snapshot resync support in `backend/tools/runtime-tool-sync.ts`.
- Added `includeMissing` / `include_missing` support to `POST /api/tools/runtime-resync`.
- Extended marketplace `autoResync` so install/update can create first runtime snapshots for authorized scopes affected by the marketplace item.
- Preserved project/group metadata on new runtime audits and resync responses.
- Fixed runtime audit de-duplication so identical authorization snapshot IDs across different projects do not collapse into one scope.
- Made runtime authorization inventory use the latest relevant snapshot per runtime/project/group and keep project-level snapshots separate from group-level snapshots.
- Counted marketplace-created runtime snapshots in operation history runtime resync totals.

## Files

- `backend/tools/runtime-tool-sync.ts`
- `backend/tools/tool-authorization.ts`
- `backend/modules/tools/tools.ts`
- `backend/modules/tools/marketplace.ts`

## Verification

- `npm run build:backend`
- `npm run test:runtime-tools`
- `npm run check`
- `POST /api/tools/runtime-resync` with `includeMissing=true` created first runtime snapshots for `nova-erp-server`, `smart-live-Cloud`, and group `gmps7ha15`.
- `POST /api/marketplace/update` for official `mcp-feishu` with `autoResync=true` recorded `runtimeResync.schema = ccm-marketplace-runtime-resync-v1`.
- `GET /api/tools/mcp-skill-goal-audit` now reports:
  - `central_authorization_catalog`: proven
  - `runtime_artifact_delivery`: proven
  - `unauthorized_use_blocked`: proven
  - `marketplace_lifecycle_bridge`: proven

## Remaining Risks

- The overall goal remains incomplete because real child-agent invocation evidence is still missing for configured scopes.
- Claude Code real CLI proof is blocked by the local Claude gateway being unreachable at `127.0.0.1:15721`.
- The group `gmps7ha15` still grants `code-review` and `frontend-design`, but those skills are missing from the current catalog, so its dispatch gate correctly remains blocked.
- Cursor and Codex probe records have become stale under the 30-minute freshness window and need to be re-run for final goal proof.
