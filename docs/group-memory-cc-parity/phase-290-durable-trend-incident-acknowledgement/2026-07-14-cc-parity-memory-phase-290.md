# Claude Code Parity Memory Phase 290

Date: 2026-07-14

## Objective

Phase 290 closes the operator loop for Phase 289 durable trend signals. An actionable exact-session trend now has durable `opened`, `acknowledged`, and `resolved` history. Acknowledgement changes alert visibility only; it does not change recall, scoring, compaction, retention, distillation, or deletion behavior.

## Incident Ledger

Each exact `groupId--gcs_*` scope may own:

`group-memory-md/<exact-scope>/.memory-shape-trend-incidents.json`

The `ccm-group-typed-memory-shape-trend-incident-ledger-v1` ledger is:

- exact-session bound;
- body-free and advisory-only;
- append-only at the incident-event level;
- capped at 500 events;
- pruned only by complete resolved incident groups after 180 days or capacity pressure;
- protected by an exclusive file lock, atomic replacement, and a valid backup;
- anchored by per-event checksums, `previousEventChecksum`, `headEventChecksum`, and a ledger checksum.

Every event declares `visibilityOnly=true` and `memoryMutationAuthorized=false`.

## Actionable State

An incident opens only when the durable trend is valid, has `status=drift`, and contains at least one bounded signal. The incident fingerprint contains sorted signal codes and severities, not memory bodies or metric payloads.

- Continued samples with the same actionable signal fingerprint do not create duplicate incidents.
- A changed signal fingerprint resolves the current incident and opens a new pending incident.
- A non-actionable trend resolves the current incident.
- Historical acknowledged and resolved incidents remain visible in the bounded event history.

This prevents every telemetry sample from becoming a notification while still making an actual change in actionable state require a fresh acknowledgement.

## Acknowledgement

`acknowledgeGroupTypedMemoryShapeTrendIncident()` requires:

- an exact group-chat session scope;
- explicit confirmation;
- the current incident ID and checksum;
- a valid current trend and incident chain;
- a matching current actionable fingerprint.

Stale, resolved, cross-session, changed, or tampered incidents fail closed. Replaying the same valid acknowledgement is idempotent.

Free-form operator notes are never stored. The event keeps only note length and a checksum. Actor, timestamp, trend generation, trend ledger checksum, trend summary checksum, signal fingerprint, and signal codes remain as body-free audit evidence.

## Memory Center

Memory Center now provides:

- a fleet `trend incidents` card;
- per-session pending, acknowledged, resolved, invalid, and recovered counts;
- active incident identity and signal codes;
- an exact-session `确认趋势` action;
- a confirmation dialog that states the no-mutation boundary;
- a dedicated acknowledgement API;
- an audit event with `visibilityOnly=true` and `memoryMutationAuthorized=false`.

The API accepts the external `group::gcs_*` scope and converts it to the internal `group--gcs_*` typed-memory scope. Legacy/default scope acknowledgement is rejected.

## Concurrent Durability Repair

Parallel compatibility testing exposed two Windows durability defects outside the new incident file:

1. `memory-control/metrics.json` used an unlocked read-modify-write and one-shot rename.
2. `.recall-ledger.json` used the local one-shot rename path and had no mutation lock.

Phase 290 now:

- serializes metrics mutations with the shared file lock;
- writes metrics through the shared retrying atomic JSON implementation;
- serializes recall-ledger read-modify-write operations;
- routes non-transactional group-memory JSON writes through the shared retrying atomic implementation;
- preserves the existing typed-memory distillation lock, fencing, and staged artifact transaction semantics.

The dedicated test starts six Node processes and performs 90 concurrent metric updates. All counters and events are retained and a valid backup is produced.

The Phase 289 trend recorder also now rejects an existing primary and backup when neither can be parsed, instead of treating an unrecoverable ledger as a new empty ledger. Runtime fields added by trend and incident readers are excluded from checksums, so a returned read object can be verified directly without changing persisted checksums.

## Agent Boundaries

- Group-chat trend incidents belong to one exact conversation session.
- Session B cannot inspect or acknowledge Session A's incident.
- The Global Agent remains global-only and receives no group incident state.
- Project child Agents receive no incident diagnostics in their context.
- Acknowledgement is not an approval receipt for memory mutation.
- User `ignore memory`, current-source truth, memory delivery limits, and context budgets remain authoritative.
- No legacy `default` session is created or migrated.

## Verification

Phase 290 dedicated test:

- `scripts/group-typed-memory-shape-trend-incident-selftest.mjs`: 59/59 checks passed.

Coverage includes automatic incident opening, unchanged-state deduplication, signal-state replacement, resolution, explicit confirmation, stale checksum rejection, cross-session rejection, idempotent acknowledgement, body and note non-disclosure, trend generation and checksum binding, event-chain verification, tamper detection, backup recovery, incident-ledger failure isolation, unrecoverable trend fail-closed behavior, Memory Center fields, API source integration, six-process metric concurrency, atomic backup production, and no legacy `default` creation.

Compatibility matrix:

- Phase 283 manifest selector: 19/19 passed.
- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 285 selector consumption closure: 32/32 passed.
- Phase 286 selector calibration: 35/35 passed.
- Phase 287 recall-shape telemetry: 50/50 passed.
- Phase 288 write shape and bounded drift: 56/56 passed.
- Phase 289 durable trend: 55/55 passed.
- Phase 290 trend incident acknowledgement: 59/59 passed.
- typed-memory consumption feedback: 18/18 passed.
- task-session recall: 20/20 passed.
- delivery lease: 54/54 passed.
- dispatch WAL: 39/39 passed.
- Memory Center session scope: 13/13 passed.
- total: 480 checks passed.
- full `npm run build`: passed.
- focused `git diff --check`: passed with only existing CRLF conversion warnings.

## Production Evidence

- URL: `http://localhost:3081`
- server PID: `4556`
- root HTTP status: 200 on three consecutive checks
- Memory Center Overview API: 200
- all 8 trend-incident fleet fields: present
- live exact-session acknowledgement API test: 61/61 checks passed
- acknowledgement API receipt: `memoryMutationAuthorized=false`
- trend-incident invalid and pending counts after fixture cleanup: 0
- active group Session Memory scopes: 0
- legacy `default` Session Memory scopes and files: 0
- Phase 290 runtime residue after API test: 0
- group-session lifecycle heads: 13 anchored and valid, 0 failed
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- stderr: empty

## Long-Term Direction

Phase 290 completes durable advisory acknowledgement and incident history. The long-term parity goal remains active. The next useful step is body-free export for offline diagnosis and bounded comparison across provider/model versions, while preserving exact-session ownership and never allowing fleet diagnostics to become cross-session memory context.
