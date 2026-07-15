# CCM Memory Phase 317: Final dispatch reactive compact circuit breaker

Date: 2026-07-15

Status: implemented, verified, and deployed

Long-term goal status: active

## Why this phase was required

Phase 316 gave a single Provider call one bounded reactive-compact retry. The remaining risk was durable repetition across later turns of the same project child-Agent session. A Provider or fixed prompt that repeatedly rejects recovered prompts could make every later turn repeat the same expensive recovery.

Claude Code addresses the equivalent auto-compact failure mode in `D:\claude-code\src\services\compact\autoCompact.ts` with `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`. After three consecutive failures, the session stops retrying automatically; a later success resets the counter.

Phase 317 applies that behavior to CCM's final third-party Agent dispatch boundary with exact `group + gcs_* + task + tas_*` ownership.

## Implementation

### Durable exact-session circuit

`backend/tasks/agent-sessions.ts` persists `ccm-final-dispatch-reactive-compact-circuit-breaker-v1` inside the owning `TaskAgentSession`.

The state includes:

- exact `group_id`, `group_session_id`, `task_id`, and `task_agent_session_id`;
- a derived `scope_id` containing all four identities;
- `closed` or `open` state;
- consecutive failures, revision, timestamps, and bounded body-free events;
- a checksum covering the complete durable state.

Three consecutive failures open the circuit. Attempt IDs are idempotent. Invalid checksums or identity mismatches fail closed. A verified Provider acceptance or explicit successful repair resets the circuit to `closed` with zero failures.

### Provider dispatch integration

`backend/modules/collaboration/collaboration.ts` now inspects the circuit before both forms of recovery:

- capacity-gate recovery before the Provider call;
- the one forced recovery after a real Provider 413/PTL response.

An open or invalid circuit blocks another automatic recovery in that exact `tas_*` session. It does not affect sibling project sessions, another `gcs_*` conversation, another group, or the global Agent.

Failed preflight recovery and a second Provider PTL after recovery increment the circuit. The circuit resets only after the Provider actually accepts the final prompt. Ordinary execution failures, timeouts, and permission drift do not incorrectly count as Provider acceptance.

### Memory Center visibility

The task-Agent snapshot inventory and Memory Center now expose:

- open circuit count;
- total consecutive failure count;
- invalid circuit count;
- per-snapshot circuit state, failure count, revision, checksum validity, and blocked status.

The frontend adds a `compact circuit` metric and includes `closed/open + failures` in each task-Agent snapshot row.

## Runtime invariants

1. The third consecutive failure opens the circuit.
2. A fourth automatic recovery is not scheduled for that exact `tas_*` session.
3. Restart preserves the open state and its checksum.
4. Duplicate attempt IDs do not increment the counter or revision.
5. Invalid or cross-scope state fails closed.
6. A true Provider acceptance resets the circuit; an unrelated failure does not.
7. Sibling `tas_*`, sibling `gcs_*`, other groups, and the global Agent remain isolated.
8. Failure events store fingerprints, not Provider prompt or error bodies.
9. Memory Center reports the same durable state used by production dispatch.

## Verification

New two-process acceptance test:

`npm run test:final-worker-dispatch-reactive-compact-circuit-breaker-restart`

It passed 18 checks covering initial state, failures one through three, open-state blocking, attempt idempotency, restart durability, exact-scope rejection, checksum tampering, fail-closed behavior, successful reset, production ordering, Memory Center projection, UI projection, body-free storage, and multi-group/multi-session isolation.

Regression evidence:

| Capability | Result |
| --- | --- |
| Phase 315 final Provider prompt gate | 12/12 plus restart 5/5 |
| Phase 316 reactive compact | 14/14 plus restart 5/5 |
| Phase 314 true post-compact payload gate | 8/8 plus restart 11/11 |
| Phase 313 exact group task entrypoints | 10/10 plus restart 5/5 |
| Global Agent global-only context | 13/13 |
| Model-aware typed-memory budget | 42/42 |
| Real Provider version/task soak | 165/165 |
| Full frontend, MCP Feishu, and backend build | passed |

The Phase 316 large sample still recovered from 189,716 estimated input tokens to 3,434 tokens against a 21,000-token trigger while preserving fixed contracts, current task text, key decisions, and latest context.

## Production deployment

Phase 317 is deployed at `http://localhost:3081`.

- PID: `4360`
- home response: HTTP 200
- Memory Center overview response: HTTP 200
- Memory Center response includes open, failure, and invalid circuit metrics
- built Memory Center asset includes the `compact circuit` view
- stderr: 0 bytes
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase317.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase317.err.log`

## Remaining long-term direction

The requested memory system is operationally complete for the current known Claude Code parity surface: compression, model-aware budgeting, exact conversation memory, child-Agent reinjection, final prompt gating, reactive recovery, and durable failure suppression are all implemented. The long-term goal remains active only for future Claude Code source changes, newly observed Provider behavior, and further adversarial hardening; it no longer represents a large unfinished baseline.
