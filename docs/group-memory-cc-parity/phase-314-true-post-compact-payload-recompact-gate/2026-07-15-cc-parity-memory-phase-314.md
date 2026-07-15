# CCM Memory Phase 314: True post-compact payload and recompact gate

Date: 2026-07-15

Status: implemented and verified

Long-term goal status: active

## Why this phase was required

CCM previously estimated the result of a group-memory compact mainly from the summary and a rough recent-message count. That estimate did not represent what the model would actually receive on the next turn. A small summary could still be followed by a large recent window, post-compact file reinjection, persistent requirements, fact anchors, Session Memory restore, and tool-continuity restore.

This matters because compacting an arbitrarily large stored memory file is not the goal. The operational question is whether the complete restored model payload fits the selected model's effective auto-compact threshold. If the restored payload immediately crosses the threshold again, the system must fail closed before sending a full context to a group main Agent or a new third-party child-Agent session.

## Claude Code source comparison

This phase directly audited:

- `D:\claude-code\src\services\compact\compact.ts`
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
- `D:\claude-code\src\utils\conversationRecovery.ts`

Claude Code computes a compact boundary, summary, recovery attachments, SessionStart reinjection, and the resulting context that the next model turn will consume. Phase 314 brings CCM's decision boundary to the same operational level: PTL and second-threshold decisions use the complete reconstructed payload instead of summary size alone.

## Implementation

### True post-compact payload budget

`backend/modules/collaboration/group-memory-compaction.ts` now builds `ccm-group-true-post-compact-payload-budget-v1` from:

- rendered summary;
- the actual bounded recent-message window;
- post-compact reinjection files and metadata;
- persistent requirements and fact anchors;
- exact-session Session Memory restore;
- exact-session tool-continuity restore.

The budget uses the configured model-aware auto-compact threshold. PTL first evaluates the complete pre-PTL payload, applies emergency reduction when needed, and then recomputes the final complete payload.

### Durable second-threshold gate

Every compact now persists `ccm-group-post-compact-payload-gate-v1` with one of three states:

- `ready`: the reconstructed payload is below the trigger and can be dispatched normally.
- `ptl_reduced`: PTL was required and the final reconstructed payload is below the trigger.
- `recompact_required`: the final reconstructed payload still reaches the trigger.

The budget and gate are persisted in the compact boundary, restore record, strategy decision, compaction state, and message-compression state. Their checksum and exact `group_id + group_session_id` identity survive process restart.

When `recompact_required` is active, `backend/modules/collaboration/memory.ts` limits both the group-main-Agent packet and each newly created project child-Agent memory context to the gate's safe render budget. A sibling `gcs_*` conversation does not inherit the gate.

### Memory Center visibility

`backend/modules/knowledge/memory-control-center.ts` now exposes:

- per-session `truePostCompactPayload` in both scope summary and detail diagnostics;
- exact token components, pre-PTL tokens, final true tokens, trigger, render cap, checksum, and gate action;
- schema, checksum, token-count, group, and conversation identity validation;
- `truePostCompactPayloadFleetReport` in the backend overview;
- critical alerts for invalid evidence or `recompact_required`, and warnings for `ptl_reduced`.

`frontend/src/components/knowledge/MemoryCenter.vue` renders a dedicated true-payload panel beside the compact strategy/PTL diagnostics. Operators can see why a payload is large and whether dispatch is ready, PTL-reduced, or restricted to a safe child context.

## Runtime invariants

1. PTL is based on the complete next-turn payload, not summary size alone.
2. The final compact token count equals the recomputed complete payload count.
3. A payload at or above the configured trigger cannot be marked dispatch-ready.
4. `recompact_required` reduces restored context before child dispatch without deleting or rewriting the raw transcript.
5. Budget, gate, checksum, and exact group conversation identity survive restart.
6. Group main Agent and project child-Agent contexts observe the same gate.
7. Sibling conversations and the global Agent remain isolated.
8. Memory Center reports the same durable state used by dispatch code.

## Verification

New two-process acceptance test:

`npm run test:true-post-compact-payload-recompact-restart`

The first process passed eight compact-path checks. Its synthetic payload measured 65,000 tokens before PTL and 54,744 tokens after PTL against an 18,000-token trigger, correctly producing `recompact_required`. The second process passed eleven restart, child-context, exact-session, Memory Center detail/overview, and UI coverage checks.

Representative regressions also passed:

| Capability | Runtime evidence |
| --- | --- |
| Exact task/session entrypoints and restart | `group-task-exact-session-entrypoints-selftest.mjs` |
| Global-only Agent context | `global-agent-global-only-context-selftest.mjs` |
| Model-aware typed-memory delivery budget | `group-typed-memory-model-aware-budget-selftest.mjs` (42 checks) |
| Auto-compaction exact-session scope | `group-memory-auto-compaction-session-scope-selftest.mjs` |
| Compact crash/restart recovery | `group-memory-compact-restart-soak-selftest.mjs` |
| Pre/post compact hook isolation | `group-memory-compaction-hook-session-isolation-selftest.mjs` |
| Resume baseline and recovery | `group-memory-resume-integration-selftest.mjs` |
| Auto-compact circuit breaker restart | `group-memory-auto-compact-circuit-breaker-restart-selftest.mjs` |
| Reactive compact retry ownership | `group-reactive-compact-retry-ownership-restart-selftest.mjs` |
| Exact post-compact cleanup | `post-compact-cleanup-source-scope-selftest.mjs` |
| Provider generation restart reconciliation | `provider-native-compact-generation-restart-reconciliation-selftest.mjs` |
| Real Provider version drift, memory reinjection, and artifact closure | `task-agent-real-provider-version-task-soak-selftest.mjs` (151 checks) |

The complete frontend, MCP integration, and backend build passed. Raw transcripts remained intact.

## Production deployment

Phase 314 was deployed to `http://localhost:3081` on 2026-07-15.

- Server PID after restart: `10780`
- Home response: HTTP 200
- Memory Center overview schema: `ccm-memory-center-true-post-compact-payload-fleet-report-v1`
- Existing exact-session detail schema: `ccm-memory-center-true-post-compact-payload-overview-v1`
- Startup stderr: 0 bytes

Existing sessions created before Phase 314 correctly report an empty payload state until their next real compact. New compact boundaries persist and display the full budget and gate.

## Remaining long-term direction

Phase 314 closes the known true-post-compact accounting gap. The long-term goal remains active for continued source comparison, adversarial multi-session tests, provider/version drift, and future Claude Code memory behavior changes.
