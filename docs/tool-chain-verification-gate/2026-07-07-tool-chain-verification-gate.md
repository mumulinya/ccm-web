# Tool Chain Verification Gate

Date: 2026-07-07

## Why

CCM already had a human-readable MCP / Skill chain verification report and row-level actions. The next gap was a machine-readable gate that a main Agent, CI script, or operations panel can use before dispatching child Agents.

This matters for the long-running MCP / Skill goal because "configured" is not the same as "safe to dispatch", and "safe to dispatch" is still not the same as "observed working in a real child-agent loop".

## Changes

- Added `gate` to `GET /api/tools/chain-verification`.
- Added schema `ccm-tool-chain-verification-gate-v1`.
- Gate status values:
  - `not_configured`: no configured MCP / Skill scopes in the filtered report.
  - `blocked`: at least one configured scope is blocked by authorization, missing runtime, runtime resync need, or unauthorized attempts.
  - `ready_unverified`: no blockers, but at least one configured scope has no observed MCP / Skill invocation.
  - `verified`: all configured scopes are unblocked and have observed invocation evidence.
- Gate exposes:
  - `dispatchReady`
  - `verified`
  - `requiresObservation`
  - compact blocking / pending / verified scope lists
  - aggregated `nextActions`
- The Tools UI now shows a "派发门禁" strip in the chain verification tab.

## Affected Files

- `backend/modules/tools/tools.ts`
- `frontend/src/components/tools/ToolsConfig.vue`
- `docs/tool-chain-verification-gate/2026-07-07-tool-chain-verification-gate.md`

## Verification

- `npm run build:backend`: passed.
- `npm run build:frontend`: passed.
- `npm run check`: passed.
- `npm run test:runtime-tools`: passed.
- Temporary server smoke on port `3098`:
  - `GET /api/tools/chain-verification` returned `schema=ccm-tool-chain-verification-v1`.
  - `gate.schema=ccm-tool-chain-verification-gate-v1`.
  - Current local state returned `gate.status=blocked`, `dispatchReady=false`, `verified=false`, `configuredScopes=3`, `blockingScopes=3`, `gateActionCount=6`.

## Risks / Notes

- `ready_unverified` is intentionally not treated as fully verified. It only means the runtime appears dispatchable and no unauthorized attempts are visible in the current audit window.
- The gate is scoped to the current report filters. A filtered request can be used to gate one project or group, while the unfiltered request gates the visible aggregate.
- Invocation evidence still depends on child-agent audits being written with project or group context.
