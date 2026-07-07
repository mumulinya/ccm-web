# Runtime Tool Dispatch Gate

## Why

Runtime tool readiness was visible in audits and prompts, but child-agent dispatch could still continue when configured MCP servers, MCP subtools, or Skills were missing. That created a bad state: CCM knew the authorization was not dispatch-ready, yet a project child Agent could still start without the tools the group or project had configured.

## What Changed

- Added `ccm-runtime-tool-dispatch-gate-v1` to runtime tool sync audits.
- Runtime snapshots now persist `dispatch_gate`.
- Runtime readiness now exposes a `dispatch_gate` check and includes it in delivery readiness.
- Project direct send and stream send return `409` before launching an Agent when the gate is blocked.
- Group live broadcast, group mentions, direct task execution, QA resume, runtime fallback probes, and review dispatch paths all check the gate before calling child Agents.
- Blocked cross-agent dispatches now produce a structured blocked receipt so the main Agent can review the failure without pretending a child Agent ran.

## Affected Files

- `backend/tools/runtime-tool-sync.ts`
- `backend/server.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/group-live-routes.ts`

## Verification

- `npm run build:backend` passed.
- `npm run test:runtime-tools` passed, including `runtimeReadinessChecksDispatchGate`, `dispatchGateBlocksMissingAuthorization`, and `snapshotPersistsDispatchGate`.
- `npm run check` passed.
- `git diff --check -- backend/tools/runtime-tool-sync.ts backend/server.ts backend/modules/collaboration/collaboration.ts backend/modules/collaboration/group-live-routes.ts docs/runtime-tool-dispatch-gate/2026-07-07-runtime-tool-dispatch-gate.md` passed with only existing LF/CRLF warnings.
- A temporary dist server on port `3091` returned HTTP 200 for `/` and `/api/tools/runtime-readiness?deep=0`; the readiness payload included a `dispatch_gate` check.

## Remaining Risk

The gate blocks dispatch when configured authorization cannot be delivered. It does not attempt to infer whether a specific user message would have needed the missing tool; that is intentional fail-closed behavior for configured MCP/Skill grants.
