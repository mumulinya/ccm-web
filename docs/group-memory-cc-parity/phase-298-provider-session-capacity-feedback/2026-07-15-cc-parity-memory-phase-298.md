# CCM Memory CC Parity Phase 298

Date: 2026-07-15

## Goal

Close the remaining provider-native compact capacity-feedback gap without corrupting CCM's durable transcript model:

- consume Provider compact outcomes in the exact child Agent session;
- use real Provider token evidence for subsequent context-capacity decisions;
- keep the context-management beta header session-stable;
- prevent repeated stateless responses from being cumulatively over-counted;
- preserve raw group transcripts and typed `MEMORY.md` documents;
- clear the derived state when the owning group session is deleted.

## Claude Code Source Audit

The implementation was checked against the current source under `D:\claude-code`:

- `src/services/compact/microCompact.ts:88`: pending cache edits are consumed once before request parameter construction.
- `src/services/compact/microCompact.ts:100`: pinned cache edits remain available for later request projections.
- `src/services/compact/microCompact.ts:300`: cache editing does not mutate the local transcript.
- `src/services/compact/microCompact.ts:371`: the boundary waits for actual API-reported deleted-token evidence.
- `src/query.ts:873`: API deletion feedback is consumed after the response.
- `src/query.ts:875`: cache-deleted token telemetry is cumulative/sticky and must be converted to an operation delta.
- `src/services/api/claude.ts:1406`: dynamic beta headers are sticky for the session.
- `src/services/api/claude.ts:1532`: pending edits are captured once outside retry parameter reconstruction.
- `src/services/api/claude.ts:1673`: the sticky cache-editing header and live request body behavior are separate decisions.
- `src/services/api/claude.ts:1721`: `context_management` is a per-request API policy.

The last point is important. Anthropic Messages requests are stateless. CCM must not suppress future `context_management` policies merely because an earlier response applied an edit. The one-time operation in this phase is consumption of an outcome into the local capacity baseline, not one-time delivery of the Provider strategy.

## Implementation

### Exact-session capacity ledger

`provider-native-compact-session-capacity.ts` adds a checksummed, atomic ledger keyed by:

- `group_id`
- `group_session_id`
- `task_agent_session_id`
- `native_session_id`

The ledger stores only body-free operational evidence: receipt IDs/checksums, plan checksums, request IDs, outcome status, token counts, timestamps, and the sticky-beta state.

### Latest strong outcome semantics

Only a v2 `native_applied` receipt with `strong_proof=true` and `provider_outcome_verified=true` can create capacity credit.

Phase 296 v1 `native_applied` receipts are projected to `request_accepted`; they cannot create capacity credit.

When multiple stateless requests each report the same cleared amount, CCM uses the latest strong outcome. It does not sum `cleared_input_tokens` across requests. For example, two responses that each clear 48K tokens still produce a latest-clear value of 48K, not 96K.

### Effective capacity baseline

The response receipt now records sanitized Provider usage totals:

- `provider_response_input_tokens`
- `provider_response_output_tokens`

Capacity calculation prefers Provider post-edit input usage when available. It also retains a local diagnostic projection:

`local_effective_context_tokens = raw_active_tokens - latest_provider_cleared_input_tokens`

The two values are intentionally separate. Provider usage drives the effective baseline; the local projection explains the relationship to CCM's unchanged raw transcript.

### Context use and visibility

The next exact child-session context build atomically consumes pending strong outcomes and adds the baseline to:

- the native apply plan as `providerSessionCapacity`;
- the controlled child Agent memory context;
- rendered context text;
- Memory Center post-compact diagnostics.

The native plan keeps `context_management` as a per-request policy and uses the sticky beta latch even when live configuration input no longer repeats the header declaration.

### Lifecycle cleanup

`deleteGroupSessionMemoryArtifacts()` now removes the exact session capacity ledger and backup. No state can leak into a newly created group session.

## Files

- `backend/modules/collaboration/provider-native-compact-session-capacity.ts`
- `backend/modules/collaboration/provider-native-compact-execution-receipt.ts`
- `backend/modules/collaboration/group-memory-compaction.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/provider-native-compact-session-capacity-selftest.mjs`
- `package.json`

## Verification

Phase 298 capacity contract: 14/14.

Covered assertions:

- two strong Provider outcomes are retained;
- pending outcomes wait for planner consumption;
- repeated 48K clears do not become a false 96K cumulative credit;
- Provider post-edit input becomes the effective baseline;
- repeat consumption is idempotent;
- group-session and native-session isolation fail closed;
- v1 accepted-only history cannot create capacity credit;
- restart round trips preserve checksums;
- sticky beta state feeds the next native plan;
- capacity feedback is used without transcript mutation;
- Memory Center exposes the exact session;
- receipt and capacity ledgers remain body-free;
- group-session deletion removes the derived state.

Regression results:

- Phase 297 Provider response outcome: 21/21.
- Phase 293 resume integration: 12/12.
- Phase 294 snip replay: 11/11.
- Phase 295 compact restart soak: 11/11.
- Phase 292 hook session isolation: 25/25.
- Memory Center session scope: 13/13.
- Group auto-compaction session scope: 12/12.
- Global Agent global-only context: 13/13.
- Body-free diagnostic export: 46/46.
- Atomic JSON concurrency: 24 workers, no leftovers.
- Full `npm run build`: passed.

Production verification:

- URL: `http://localhost:3081`
- PID: `35352`
- homepage: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200, 187824-byte response
- stderr: empty
- stdout: `C:\Users\admin\.cc-connect\logs\ccm-server-phase298.log`
- stderr: `C:\Users\admin\.cc-connect\logs\ccm-server-phase298.err.log`

## Result

CCM now has a durable Provider compact feedback loop: response evidence is bound to the exact external child Agent session, consumed once into capacity planning, visible in Memory Center, restart-safe, and removed with the session. Repeated stateless requests cannot inflate token savings, historical accepted-only receipts cannot grant false capacity credit, and raw memory sources remain authoritative and unchanged.

The long-term Claude Code parity goal remains active for future upstream memory and context-management changes.
