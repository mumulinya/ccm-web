# CCM Memory Phase 315: Final Worker Dispatch Payload Gate

Date: 2026-07-15

## Goal

Close the gap between the compacted WorkerContextPacket budget and the actual Provider prompt. A project child Agent may only be dispatched when the final rendered prompt, Provider envelope, model capacity, exact group session, task, and `tas_*` session are bound to one durable gate.

## Runtime Contract

- Build `ccm-final-worker-dispatch-payload-gate-v1` after the final recovery/fallback prompt is rendered.
- Count the complete Provider input, not only the memory packet.
- Bind `group_id + group_session_id + task_id + task_agent_session_id + worker_context_packet_id`.
- Persist Provider, model, context window, output reserve, auto-compact buffer, trigger, token count, character count, and prompt checksum.
- Fail closed before `callAgentForGroupStream()` when status is `recompact_required` or validation fails.
- Keep the gate body-free: only measurements, identity, and checksums are durable.

## Snapshot And Lineage Closure

`attachTaskAgentFinalDispatchPayloadGate()` atomically updates the current Task Agent memory snapshot after the final prompt exists. It verifies the prompt and exact session identity, writes the gate into the Worker packet, recalculates the snapshot checksum, and updates the session reference checksum under the Task Agent session store lock.

The snapshot inventory now validates:

- gate checksum and schema;
- exact group, `gcs_*`, task, `tas_*`, and packet identity;
- prompt checksum/token/character binding;
- `ready`, `recompact_required`, and legacy `missing` states;
- lineage pre-dispatch proof for ready invocation edges.

Legacy snapshots without the Phase 315 gate remain readable and are counted as `missing`; they are not treated as proof of a current Provider dispatch.

## Memory Center

The global snapshot report and exact-group detail expose:

- ready, blocked, missing, and invalid gate counts;
- prompt binding and lineage proof counts;
- final prompt tokens versus the model auto-compact trigger;
- Provider/model identity and dispatch state for each snapshot.

## Verification

- Full frontend, Feishu MCP, and backend production build: passed.
- Phase 315 first process: 12/12 checks passed.
- Phase 315 restart process: 5/5 checks passed.
- Memory Center Task Agent snapshot: 6/6 checks passed, including snapshot checksum, delivery receipt, final gate, and retention dry-run.
- Ready fixture: 699 input tokens.
- Blocked fixture: 156,006 input tokens.
- Auto-compact trigger: 21,000 input tokens.
- Task Agent invocation lineage: 22 checks passed.
- Invocation adoption: 42 checks passed.
- Invocation recovery: 32 checks passed.
- Exact-session task entrypoints and restart: passed.
- True post-compact payload and restart: passed.
- Global Agent global-only context: 13 checks passed.
- Model-aware typed-memory budget: 42 checks passed.
- Real Provider version soak: 161 checks, 5 turns, versions `1.0.0`, `2.0.0`, and `3.0.0` passed.

## Result

The compact gate, final Provider prompt gate, Task Agent memory snapshot, invocation lineage, and Memory Center now describe the same exact dispatch. A small memory packet can no longer hide an oversized final prompt, and a gate cannot be reused across group sessions or child Agent sessions.
