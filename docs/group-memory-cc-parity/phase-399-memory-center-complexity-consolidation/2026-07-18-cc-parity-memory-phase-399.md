# Phase 399: Memory Center complexity consolidation

Date: 2026-07-18

## Goal

Audit whether the recent Claude Code parity work added production behavior that CCM does not need, remove unjustified state and side effects, and make Memory Center serve users before developers.

The user-facing center should answer four questions first:

1. How much context can the model use?
2. When will CCM compact it?
3. What memory reaches the current child Agent?
4. Which settings can the user change?

Checksums, ledgers, leases, replay gates, recovery proofs, and calibration internals are diagnostic evidence. They must not dominate the normal path.

## Audit findings

The Phase 394-397 behavior is justified and retained:

- the last trustworthy Provider input usage corrects the next preflight estimate;
- the baseline is bound to exact `group + gcs_* + task + tas_* + provider + model` identity;
- compact epoch and head changes invalidate old measurements;
- only the current snapshot may replace the session baseline;
- delayed responses cannot move canonical delivery back to an old snapshot.

The Phase 398 implementation was not justified by its blast radius. It added an automatic receipt scanner and writer to `listTaskAgentSessions()` for a narrow crash window, plus recovery proofs and inventory fields that had no production decision consumer. This made a read API mutate storage and added operational state mainly to satisfy its own test.

The Provider baseline also stored `source_memory_binding_checksum` even though the snapshot checksum plus compact epoch/head already prove the same lineage for baseline admission.

Memory Center had accumulated implementation evidence directly in the main experience: Provider refresh leases, dispatch recovery WAL, snapshot checksums, compact hooks, replay gates, retry ownership, distillation transactions, and English diagnostic dumps. These are useful during failure analysis but are not primary memory controls.

## Removed

- Phase 398 orphan-receipt reconciliation and its hidden list-time filesystem mutation;
- crash-injection production option used only by the orphan test;
- recovery proof and recovery inventory fields;
- multi-state baseline admission status and persisted issue arrays;
- duplicate baseline `source_memory_binding_checksum`;
- final-gate `provider_usage_baseline_issues`, which had no production consumer;
- the Phase 398 package command and self-test.

The delivery receipt now exposes one compact fact: `providerContextUsageBaselineAdmitted`. Detailed rejection reasons remain local to the admission decision and are not persisted as another state machine.

## Memory Center

The default page now keeps daily controls visible:

- model-capacity presets;
- context window and automatic compact threshold;
- health and alert summary;
- memory scopes and current memory;
- a compact current-child-Agent context summary.

The following areas are closed disclosures by default:

- Session Memory prompt/template customization and Provider capacity maintenance;
- microcompact, typed-memory delivery, archive, and retention settings;
- dispatch recovery and session budget diagnostics;
- compression quality and integrity diagnostics;
- exact-session compact/reinjection ledgers and replay evidence.

The former eleven-card final-context diagnostic was reduced to five user-facing facts: current input, pressure, effective window, target Agent, and handling strategy. Provider usage basis, cache-token split, estimate drift, next-preflight bias, exact-session proof, and checksums remain backend evidence rather than main cards.

## Verification

Focused behavior checks:

- Provider usage preflight feedback: `37/37`;
- Provider model/runtime identity: `23/23`;
- compact-lineage invalidation: `32/32`;
- current-snapshot atomic replacement: `31/31`;
- Provider-observed model context: `26/26`.
- Global Agent global-only context boundary: passed all 13 checks;
- group-session sidecar isolation: passed all 14 checks.

Focused total: `149/149`.

Build and structural checks:

- backend TypeScript build: passed;
- frontend Vite build: passed, 2,065 modules;
- package JSON parse: passed;
- focused `git diff --check`: passed.

Browser acceptance used the local production build without a paid Provider call:

- desktop `1280px`: all four diagnostic disclosures closed by default;
- mobile `390x844`: no horizontal overflow and no control outside the viewport;
- advanced settings disclosure opens and exposes its controls;
- console errors: `0`.

## Complexity rule

Future Claude Code parity work must add production state only when at least one real runtime decision consumes it. Test-only evidence belongs in tests or diagnostics, read APIs must remain read-only, and a narrow crash window does not justify automatic recovery unless data loss is observed or the recovery path is materially simpler than the failure it handles.

The long-term memory parity goal remains ongoing, but future phases should prefer deleting or merging state before adding another ledger, receipt, or Memory Center panel.
