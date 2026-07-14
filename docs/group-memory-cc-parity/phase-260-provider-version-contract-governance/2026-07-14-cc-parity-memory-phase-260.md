# Phase 260: Provider Version Contract Governance

Date: 2026-07-14

## Goal

Bind every trusted Task Agent native continuation to the actual third-party CLI executable identity, CLI version, provider-output parser contract, and current invocation evidence. A previous CLI version must not silently authorize continuation after an upgrade.

This phase continues the long-term Claude Code memory parity goal; it does not complete that goal.

## Claude Code Reference

The implementation was re-audited against `D:\claude-code`, especially:

- `src/utils/sessionRestore.ts`: restores persisted session state before the next query and resets stale cross-session state.
- `src/services/api/sessionIngress.ts`: treats session ingress as an explicit compatibility boundary.
- `src/bridge/sessionIdCompat.ts`: translates versioned session identity at a dedicated compatibility layer.
- `src/services/contextCollapse/persist.ts` and the compact bootstrap state: persist collapse state independently from the transient prompt.

CCM already persisted group-session memory, Task Agent invocation lineage, restart recovery, native continuation evidence, capacity revalidation, and post-compact reinjection. The missing boundary was provider CLI version identity: Phase 259 could detect output drift, but its trusted parser evidence was not tied to the executable/version that produced it.

## Delivered

- Added real CLI version probes for Claude Code, Codex, and Cursor Agent.
- Bound each probe to all resolved executable paths plus file size/mtime identity and a stable checksum.
- Added `ccm-agent-runtime-version-snapshot-v1` with version text, semantic version, probe status, executable identity, observation time, and checksum.
- Upgraded provider output evidence to `ccm-provider-output-contract-evidence-v2`.
- Derived a stable `pcc_*` contract ID from provider, parser version, accepted event/field definition, and executable identity.
- Upgraded native continuation evidence to version 4 and bound it to expected/observed contract IDs, runtime version, runtime identity, transition state, and current-version continuity proof.
- Persisted trusted and pending provider contracts on each `tas_*` Task Agent session.
- Preserved superseded contract epochs in bounded Task Agent session history.
- Carried the last trusted or pending contract expectation into every following runner request.
- Upgraded continuation soak reporting to `ccm-task-agent-continuation-soak-report-v2` with contract epoch and transition metrics.
- Added live provider contract inventory to Memory Center, independent of historical group-chat sessions.
- Kept Global Agent outside group-session continuation bodies.

## Transition Policy

1. Same executable/version and recognized output: reuse the native session.
2. New executable/version with current output returning the requested trusted native session ID: record a verified contract transition and continue under a new epoch.
3. New executable/version with malformed, conflicting, moved, or unrecognized identity output: retain raw diagnostics, reject native reuse, clear the old native ID, and degrade to scratchpad.
4. The next invocation retries native capture as a new session under the pending current-version contract and receives the selected group-session memory again.
5. A successful recovery spawn promotes the pending contract to trusted and clears the pending state.

Legacy evidence without a contract ID is accepted only as a one-time migration when no prior expected contract exists. Once a versioned contract has been persisted, missing current-version evidence fails closed.

## Real Provider Evidence

The Phase 260 self-test probed the installed CLIs:

| Provider | Version | Executable identity prefix |
| --- | --- | --- |
| Claude Code | `2.1.201 (Claude Code)` | `57424c231bda` |
| Codex CLI | `codex-cli 0.115.0` | `bdd6a1fa2ea3` |
| Cursor Agent | `2026.07.09-a3815c0` | `a2336782ad12` |

These values are runtime observations, not hard-coded accepted versions. A binary or shim change produces a new executable identity and therefore a new contract epoch.

## Verification

- Phase 260 provider contract/version soak: 58/58 passed.
- Phase 259 continuation soak/restart/output drift: 40/40 passed.
- Phase 258 continuation compatibility/capacity commit: 33/33 passed.
- Phase 257 native continuation/re-budget: 28/28 passed.
- Invocation lineage: 22 checks passed.
- Invocation recovery: 32/32 passed.
- Invocation adoption: 42/42 passed.
- Direct dispatch spool: 39/39 passed.
- `npm run check` passed.
- `npm run build` passed.

The Phase 260 synthetic upgrade soak produced three provider contract epochs, one verified transition, one unverified transition, a valid hash chain, two service epochs, fail-closed output drift, scratchpad degradation, and a successful clean recovery spawn under the newest contract.

## Remaining Long-Term Work

- Run long, real task-producing continuations across actual provider upgrades rather than synthetic version changes.
- Add provider contract retention/rollup policy after enough real epochs exist.
- Continue model-aware compaction and retrieval-quality tuning with long-session token evidence.

