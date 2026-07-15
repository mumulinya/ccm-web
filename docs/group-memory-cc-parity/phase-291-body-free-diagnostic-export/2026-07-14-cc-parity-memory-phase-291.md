# Claude Code Parity Memory Phase 291

Date: 2026-07-14

## Objective

Phase 291 adds an offline diagnostic export for one exact group-chat session. It correlates durable memory-shape trend and incident state with the provider, model, runtime version, runtime executable identity, and provider output contract observed by third-party task-agent invocations.

The export is diagnostic evidence only. It is never a memory document, prompt attachment, recall input, compaction input, tuning signal, or mutation authorization.

## Exact-Session Ownership

The public scope must be:

`groupId::gcs_*`

The backend converts it to the typed-memory scope:

`groupId--gcs_*`

Group-only, cross-session, and legacy `default` requests fail closed. Exact-session invocation and continuation rows retain their group, group-session, and task-agent-session identities so the verifier can reject a mixed export.

## Export Contract

`buildMemoryCenterExactSessionDiagnosticExport()` produces:

`ccm-memory-center-exact-session-diagnostic-export-v1`

Every export declares:

- `bodyFree=true`
- `offlineOnly=true`
- `advisoryOnly=true`
- `contextInjectionAllowed=false`
- `memoryMutationAuthorized=false`
- `recallPolicyMutationAuthorized=false`
- `crossSessionReuse=false`
- `crossSessionEvidenceMode=aggregate_only`

The whole canonical payload is protected by SHA-256. `verifyMemoryCenterExactSessionDiagnosticExport()` verifies the checksum, exact scope, policy flags, invocation and continuation bindings, aggregate-only fleet shape, and a forbidden body-field list.

## Body-Free Allowlist

The builder uses explicit metadata projections. It may export:

- checksums, IDs, counts, rates, statuses, dates, and bounded signal codes;
- trend recent/baseline aggregate metrics and source checksums;
- incident identity, visibility state, note checksum, and trend binding;
- invocation edge and task-agent-session identities;
- provider, model, provider runtime version, executable identity checksum, and provider contract ID;
- current installed runtime version comparison status.

It does not export:

- memory bodies or typed-memory document contents;
- selector queries or raw contribution keys;
- rendered prompts or worker-context text;
- child-agent output;
- receipt reasons, transcripts, messages, or markdown excerpts;
- local ledger paths.

The test injects secret prompt and child-output sentinels into a real invocation chain and proves neither appears in the serialized export.

## Provider Version Binding

Provider/model/runtime evidence is derived from invocation edges belonging to the requested exact session. The current installed CLI inventory is used only for comparison and cannot manufacture historical evidence.

One evidence row is fully bound only when all of these are present:

- provider;
- model;
- provider output contract ID;
- provider runtime version;
- provider runtime executable identity checksum.

Memory Center reports per-field coverage, full coverage, and unbound evidence count. Runtime comparisons distinguish `current`, `runtime_drift`, `runtime_evidence_unbound`, `runtime_probe_unavailable`, and `provider_unbound`.

## Cross-Session Fleet Boundary

Fleet comparison is aggregate-only. It groups provider/model/runtime/contract combinations and emits counts without group IDs, group-session IDs, task-agent-session IDs, prompts, memory, or outputs.

The fleet object independently declares:

- `aggregateOnly=true`
- `contextInjectionAllowed=false`
- `memoryMutationAuthorized=false`
- `recallPolicyMutationAuthorized=false`
- `crossSessionReuse=false`

This permits offline version comparison without converting another conversation's diagnostics into memory context or recall policy.

## Memory Center

The endpoint is:

`GET /api/memory-center/session-diagnostic-export?scope_id=groupId::gcs_*`

It returns a UTF-8 JSON attachment with `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. The server verifies the generated snapshot before sending it.

Memory Center now includes:

- a per-session Download diagnostic action with a download icon;
- fleet version-bound coverage;
- unbound provider/model/runtime/contract evidence count;
- provider runtime inventory comparison status.

The download action does not acknowledge an incident, tune recall, compact memory, or write a diagnostic ledger.

## Verification

Phase 291 dedicated test:

- `scripts/group-memory-body-free-diagnostic-export-selftest.mjs`: 46/46 passed.

The fixture contains two exact sessions. Session A has one fully bound invocation and Session B has one deliberately unbound invocation. The export proves exact-session filtering while the aggregate fleet reports 50% full coverage without exposing either session identity.

Compatibility matrix:

- Phase 283 manifest selector: 19/19 passed.
- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 285 selector consumption closure: 32/32 passed.
- Phase 286 selector calibration: 35/35 passed.
- Phase 287 recall-shape telemetry: 50/50 passed.
- Phase 288 write shape and bounded drift: 56/56 passed.
- Phase 289 durable trend: 55/55 passed.
- Phase 290 trend incident acknowledgement: 59/59 passed.
- Phase 291 body-free diagnostic export: 46/46 passed.
- typed-memory consumption feedback: 18/18 passed.
- task-session recall: 20/20 passed.
- delivery lease: 54/54 passed.
- dispatch WAL: 39/39 passed.
- Memory Center session scope: 13/13 passed.
- total: 526/526 passed.
- full `npm run build`: passed.
- focused `git diff --check`: passed with only existing CRLF conversion warnings.

## Production Evidence

- URL: `http://localhost:3081`
- server PID: `25296`
- root HTTP status: 200 on three consecutive checks
- Memory Center Overview API: 200
- diagnostic download API: 200 attachment
- downloaded snapshot: checksum, scope, policy, body-free, exact binding, and aggregate-only verification passed
- attachment cache policy: `no-store`
- desktop viewport: no horizontal overflow; new diagnostic cards not clipped
- 390 px mobile viewport: no horizontal overflow; new diagnostic cards not clipped
- active group Session Memory scopes: 0
- legacy `default` Session Memory scopes: 0
- production probe residue: 0
- production stderr: empty

## Agent Boundaries

- The group-chat main Agent owns one memory per exact conversation session.
- Project child Agents receive the current exact-session memory through the existing memory delivery pipeline, not through this diagnostic export.
- The Global Agent remains global-only and receives no group diagnostic state.
- Cross-session fleet comparison cannot be injected into any Agent context.
- Diagnostics cannot authorize memory writes, deletion, compaction, distillation, scoring changes, or recall tuning.
- Existing `ignore memory`, source-of-truth, delivery lease, context budget, lifecycle fence, and dispatch WAL rules remain authoritative.

## Long-Term Direction

Phase 291 completes the planned body-free offline diagnostic and provider/model/runtime correlation layer. The long-term Claude Code parity goal remains active so future reference-source changes can be audited and incorporated without weakening exact-session ownership or context boundaries.
