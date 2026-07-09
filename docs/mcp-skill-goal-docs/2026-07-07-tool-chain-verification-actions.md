# Tool Chain Verification Actions

Date: 2026-07-07

## Why

The existing MCP / Skill child-agent chain verification report could show whether a project or group scope was blocked, stale, missing runtime snapshots, or only not yet observed. It did not give operators a direct next step from the report itself.

This matters for the long-running CCM goal because group-configured MCP and Skill grants need to be usable by Claude Code, Cursor, Codex, and other child agents, while unauthorized tools remain blocked and auditable. A report that only describes state is not enough for ongoing operations.

## Changes

- Added per-scope `nextActions` to `GET /api/tools/chain-verification`.
- Mapped verification statuses to actionable remediation:
  - `not_configured`: open authorization setup.
  - `authorization_blocked`: inspect authorization and scope audit.
  - `runtime_missing`: inspect runtime readiness and authorization.
  - `runtime_needs_resync`: resync the affected scope, preferring precise `snapshotIds`.
  - `unauthorized_attempts`: open filtered unauthorized invocation audit.
  - `ready_not_observed` / `verified`: open filtered invocation audit.
- Extended invocation audit project filtering with project aliases so project id and display name mismatches do not hide records.
- Added chain verification card buttons in the tools UI.
- Added invocation audit filter state, visible filter summary, and clear-filter behavior.
- Chain verification runtime resync actions use `staleOnly=false` for the targeted scope because `runtime_needs_resync` can include catalog stale, dispatch blocked, or delivery-not-ready snapshots.

## Affected Files

- `backend/modules/tools/tools.ts`
- `frontend/src/api/index.js`
- `frontend/src/components/tools/ToolsConfig.vue`
- `docs/tool-chain-verification-actions/2026-07-07-tool-chain-verification-actions.md`

## Verification

- `npm run build:backend`: passed.
- `npm run build:frontend`: passed.
- `npm run test:runtime-tools`: passed.
- `npm run check`: passed.
- Temporary server smoke on port `3097`:
  - `GET /api/tools/chain-verification` returned `schema=ccm-tool-chain-verification-v1`, `success=true`, `totalScopes=9`, `configuredScopes=3`, and row `nextActions`.
  - `GET /api/tools/invocation-audit?limit=10&category=unauthorized` returned `schema=ccm-tool-invocation-audit-v1`, `success=true`, and preserved `category=unauthorized` filter.

## Known Issues / Risks

- The project-scope audit filter now supports aliases, but it still depends on child-agent audit entries carrying a stable project id or project name.
- `runtime_missing` cannot be resynced without a prior runtime snapshot; the action intentionally routes the operator to runtime readiness and authorization checks.
