# Runtime Authorization Readiness Propagation

## Why

CCM already exposes MCP/Skill authorization readiness in project and group tool settings, but task dispatch and runtime sync could still proceed with only the raw allowed tool list. That made missing MCP tools or missing Skills visible in configuration screens while child-agent runtime events, snapshots, prompts, and readiness probes did not consistently carry the same dispatchability signal.

## What Changed

- Runtime sync audits now carry `authorization_readiness`.
- Runtime snapshots persist authorization readiness and include it in the snapshot hash input.
- Runtime readiness probes add an `authorization_readiness` check and mark delivery as not ready when authorized tools are missing or invalid.
- Project direct dispatch builds runtime tools from the unified authorization payload and writes readiness into runtime audit/work events.
- Group collaboration dispatch builds a normalized authorization payload per group/project scope and forwards readiness into runtime preparation.
- Child-agent runtime prompts now warn when configured MCP/Skill authorization cannot be fully dispatched.
- Runtime tool self-tests cover the prompt warning and readiness-probe delivery gate.

## Affected Files

- `backend/tools/tool-authorization.ts`
- `backend/tools/runtime-tool-sync.ts`
- `backend/server.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/group-live-routes.ts`

## Verification

- `npm run build:backend` passed.
- `npm run test:runtime-tools` passed, including `authorizationReadinessPromptWarnsChildAgent` and `authorizationReadinessBlocksDelivery`.
- `npm run check` passed.
- `git diff --check -- backend/tools/runtime-tool-sync.ts backend/server.ts backend/modules/collaboration/collaboration.ts backend/modules/collaboration/group-live-routes.ts` passed with only existing LF/CRLF warnings.
- A temporary dist server on port `3091` returned HTTP 200 for `/` and `/api/tools/runtime-readiness?deep=0`.

## Remaining Risk

Dispatch is not hard-blocked by authorization readiness yet. The current increment makes the state visible and auditable across runtime prompt, snapshot, lifecycle, and readiness APIs while preserving existing dispatch behavior.
