# Phase 375: Explicit initial Provider memory baseline

Date: 2026-07-16

## Goal

Close the bootstrap gap for an installed Claude Code, Codex, or Cursor runtime that has no valid Provider-scoped endurance baseline.

The system may offer a minimal first-baseline canary, but it must never choose a paid Provider automatically, start a model call during approval, or treat runtime installation as memory evidence.

## Initial-baseline preview

Each Provider now has an independent `initial_provider_baseline_canary` preview. It is approvable only when:

- the Provider is explicitly selected;
- its executable, semantic version, and executable identity are available;
- no valid Provider-scoped endurance baseline exists;
- the model is bound into the plan;
- the plan remains exactly two groups with concurrency one.

The absence proof is a stable checksum over Provider, model, semantic version, executable identity, and current baseline presence/validity. Probe timestamps are deliberately excluded so repeated read-only previews remain stable.

## Single-use authorization

Creating a receipt requires all of:

```text
explicitApproval=true
riskAccepted=true
initialBaselineAcknowledged=true
approvedBy=<actor>
baselineAbsenceChecksum=<current proof>
planChecksum=<current plan>
```

The signed receipt binds Provider, model, version key, executable identity, baseline-absence proof, two-group plan, concurrency, timeout, and group prefix. It expires within 15 minutes, is single-use, cannot be created by the scheduler, and grants no execution until a separate explicit claim.

Claiming re-runs the preview while holding the report-set lock. If another process creates a valid baseline after approval but before claim, the old receipt becomes stale and execution fails closed.

## Evidence qualification

The first canary reuses the Provider-specific continuity contracts from Phase 374:

- Codex requires valid receipt recovery with whole-task replay suppressed;
- Claude Code and Cursor require exact native-session resume and sentinel recall;
- every Provider requires account-backed child evidence, exact runtime identity, unchanged workspace, two unique groups, two unique `gcs_*` sessions, and valid isolation.

The initial audit does not invent a second wave. It records one real canary wave with exactly two groups and discloses:

```text
baselineQualification.mode = initial_provider_baseline_canary
baselineQualification.initialBaselineCanaryGatePassed = true
summary.waveCount = 1
summary.observedGroupCount = 2
```

This narrow qualification passes only when both groups pass and there are zero Provider timeout, unavailable, receipt, CCM evidence, replay-suppression, workspace, isolation, or Provider failures. Normal endurance reports still require at least two waves. A later ordinary wave naturally replaces the first qualification with the standard multi-wave endurance gate.

Successful qualification persists the first Provider-scoped endurance report. Failed child evidence never starts promotion, and failed promotion leaves the receipt terminal without opening ordinary wave approval.

## Memory Center and CLI

Memory Center now shows a manual Claude/Codex/Cursor segmented selector. Ordinary wave, version-transition canary, and initial-baseline canary previews follow only the selected Provider; the UI no longer chooses the first approvable Provider and therefore cannot silently choose where account cost may occur.

The approval inventory includes initial-baseline counts, approved receipts, promoted baselines, and failed promotions. API audit events contain checksums and identities, not prompt or memory bodies.

Read-only CLI preview:

```text
npm run memory:live-initial-baseline:preview -- --provider claudecode
node scripts/task-agent-live-memory-wave-approval.mjs initial-baseline-preview --provider cursor
```

Explicit CLI approval is available through `approve-initial-baseline-canary`; execution remains a separate `execute` action with `--explicit-execution true`.

## Deterministic verification

The Phase 375 harness uses isolated temporary homes and controlled signed account-backed evidence. It does not contact real Provider accounts.

It verifies:

- Claude Code first-baseline creation and promotion;
- Cursor first-baseline creation and promotion;
- stable absence proofs across repeated runtime probes;
- explicit acknowledgement, HMAC, TTL, and single-use policy;
- exactly two groups and concurrency one;
- Provider/model/version/executable identity binding;
- one-wave/two-group qualification without fabricated evidence;
- ordinary approval opening only after promotion;
- duplicate initial-baseline rejection;
- Memory Center three-Provider previews and inventory counters;
- Provider-scoped CLI output;
- Codex claim rejection when a concurrent baseline appears before claim.

Result: `96/96` (`37/37` Claude Code, `37/37` Cursor, `22/22` baseline-race worker).

## Regression summary

- Phase 375 initial Provider baseline: `96/96`
- Phase 374 cross-Provider transition canary: `76/76`
- Phase 373 Codex transition canary: `71/71`
- Phase 372 transition ledger: `71/71`
- Phase 371 approval retention: `65/65`
- Phase 370 approved wave lifecycle: `55/55`
- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 report retention: `56/56`
- three-Provider native memory soak: `84/84`

Phase 375 new and directly affected regression checks: `654/654`.

Targeted memory checks through Phase 375: `956/956`.

## Production state

No real model call, approval, execution, report deletion, or production baseline creation occurred in this phase.

Claude Code `2.1.201` and Cursor Agent `2026.07.09-a3815c0` remain installed but do not yet have account-backed production endurance baselines. Their first-baseline actions can now be offered safely after the user selects the Provider and explicitly approves the operation. Codex CLI `0.115.0` retains its existing proven production baseline and is not eligible for an initial-baseline canary.

## Remaining parity work

- run the first account-backed Claude Code and Cursor baseline canaries only after explicit user approval;
- retain real latency, session-resume, and memory-continuity evidence across later ordinary waves;
- exercise transition canaries after genuine installed Provider identity changes;
- continue tracking Claude Code memory behavior and migrate verified improvements.

The long-term Claude Code parity goal remains active. The engineering bootstrap gap is closed; production evidence still has to come from real, explicitly authorized Provider calls.
