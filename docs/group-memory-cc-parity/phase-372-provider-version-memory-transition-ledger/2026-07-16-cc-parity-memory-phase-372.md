# Phase 372: Provider version memory transition ledger

Date: 2026-07-16

## Goal

Turn a Provider version change from a version-label observation into durable evidence about whether group-session memory still loads, recovers, remains isolated, and completes useful work after the change.

Phase 369 recorded version epochs and transitions. This phase adds comparison semantics, a persistent hash-chain ledger, a live-wave approval gate, report-retention references, and restart/tamper behavior.

## Epoch comparison

Every contiguous Provider version/runtime identity epoch now records:

- observed and passed group count;
- pass rate;
- Provider latency timeout count/rate;
- Provider unavailable count/rate;
- memory-load receipt failure count/rate;
- CCM evidence failure count/rate;
- group-isolation failure count;
- workspace-change count;
- replay-suppression count;
- observed duration P95.

Adjacent epochs are compared using `versionTransitionRuleVersion = 1`.

At least two groups are required on each side. With less evidence, the transition is `insufficient_evidence`. A transition is `degraded` when the new epoch contains memory receipt, CCM evidence, isolation, or workspace failures, or when pass/timeout/unavailable rates cross the bounded regression thresholds.

A transition is `verified` only when evidence is sufficient, no regression reason is present, memory and CCM evidence remain clean, exact-group isolation remains clean, the workspace remains unchanged, and the new epoch pass rate is at least 90%.

The comparison is diagnostic evidence, not a causal claim that the Provider version caused an observed failure.

## Transition identity

Each transition binds:

```text
from version/runtime identity key
to version/runtime identity key
first observation time
contiguous transition index
```

Returning to an exact earlier version/runtime identity is classified as `reappearance`. Merely restoring the same version text with a changed executable identity remains a new identity, not a proven rollback.

## Approval gate

The live endurance wave preview now exposes `versionTransitionReady`.

- no transition history: ready;
- latest transition `verified`: ready;
- latest transition `degraded` or `insufficient_evidence`: fail closed.

Historical degraded transitions remain visible but do not permanently block a later clean transition. Approval still separately requires the current semantic version and executable identity to match the latest signed evidence.

No scheduler or comparison record grants execution authority.

## Durable ledger

The ledger is stored at:

```text
~/.cc-connect/reliability/live-provider-memory-version-transition-ledger.json
```

It contains only checksums, version identity keys, timestamps, aggregate counts/rates, statuses, and diagnostic reason codes. It does not contain raw group ids, group-session ids, messages, task prompts, memory text, or Provider output.

Every entry binds:

- the previous entry checksum;
- the endurance report checksum;
- the source-set checksum;
- a canonical comparison evidence checksum;
- its own entry checksum.

The ledger has a top-level checksum and is idempotent for the same transition/evidence pair. Revisions append only when the aggregate comparison evidence changes. It is bounded to 500 entries by default; compaction retains a chain-anchor checksum and dropped-entry count.

Any entry-chain or ledger-checksum mismatch blocks further append instead of overwriting history.

## Rule migration

Endurance reports now use:

```text
classifierVersion = 3
versionTransitionRuleVersion = 1
```

The scheduler persists these versions. A classifier or transition-rule change forces a newly signed endurance report even when the source-set checksum is unchanged. The next unchanged tick remains idempotent.

Scheduler state also records the latest transition gate and verified/degraded/insufficient counts. It remains advisory-only and cannot create tasks, delete evidence, approve a wave, or execute a Provider.

## Retention graph

The latest ledger evidence for each unique transition protects its exact endurance report:

```text
transition ledger -> endurance report -> source multi reports -> child single reports
```

The protection reason is `version_transition_ledger`.

If a present transition ledger is invalid, report retention fails closed: every valid endurance report is protected as `invalid_transition_ledger_fail_closed`. No endurance report becomes a prune candidate until the ledger is repaired or explicitly handled.

## Memory Center

Memory Center exposes:

- ledger validity, generation, entries, and unique transitions;
- verified, degraded, insufficient, and exact-identity reappearance counts;
- latest transition approval readiness;
- transition-protected endurance report count;
- body-free checksum/reason diagnostics for invalid ledgers.

The endurance wave panel shows whether continuity is ready or approval-gated. It does not expose a shortcut that bypasses the existing signed, explicit approval flow.

## Deterministic verification

The Phase 372 harness uses a temporary HOME and controlled local Codex executables. It simulates:

```text
v1 clean -> v2 memory receipt regression -> v3 recovered -> exact v1 evidence reappearance
```

It verifies:

- version/runtime epoch identity;
- per-epoch rates and P95 evidence;
- degraded memory receipt classification;
- approval blocked on the degraded latest transition;
- clean v3 continuity verification and approval readiness;
- comparison revision idempotency;
- exact-identity reappearance classification;
- hash-chain and ledger checksum validity;
- no raw group ids in ledger or Memory Center output;
- rule-version migration with unchanged source evidence;
- latest transition report references;
- restart reconstruction;
- tampered entry and top-level checksum detection;
- append rejection while invalid;
- fail-closed protection of every endurance report;
- durable invalid diagnostics after restart.

Result: `71/71`.

## Regression summary

- Phase 372 transition ledger: `71/71`
- Phase 371 approval retention: `65/65`
- Phase 370 approved wave lifecycle: `55/55`
- Phase 369 scheduler/version advisory: `51/51`
- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 report retention: `56/56`

Phase 366-372 related checks: `378/378`.

Additional relevant regressions passed:

- Provider contract/version soak: `58/58`
- cross-version task artifact soak: `165/165`
- Provider recovery fault matrix: `62/62`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

Targeted memory checks through Phase 372: `713/713`.

## Real environment evidence

Installed CLI identity probes passed for:

- Claude Code `2.1.201`;
- Codex CLI `0.115.0`;
- Cursor Agent `2026.07.09-a3815c0`.

This phase did not call a real model, create a production approval, execute a production wave, or delete production evidence. The running CCM process was not interrupted; it must load the new backend on its next normal restart.

## Remaining parity work

- collect an account-backed comparison after an installed Provider identity actually changes;
- execute a recommended wave only after a real user submits the existing signed approval receipt;
- obtain equivalent account-backed recovery evidence for Claude Code and Cursor when their environments are responsive;
- prove simultaneous exact-group recovery across a real Provider transition;
- continue auditing future Claude Code memory behavior and migrate only verified improvements.

The long-term Claude Code parity goal remains active. Normal multi-group session memory operation does not depend on these remaining field-evidence tasks.
