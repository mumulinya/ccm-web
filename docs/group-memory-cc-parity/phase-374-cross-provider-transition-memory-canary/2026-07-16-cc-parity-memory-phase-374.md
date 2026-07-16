# Phase 374: Cross-Provider transition memory canary

Date: 2026-07-16

## Goal

Extend the explicit Provider-transition canary from Codex to Claude Code and Cursor while preserving the strongest native memory-continuity evidence each Provider can produce.

The system must not invent a Codex-style MCP receipt for Providers that do not expose that path, and it must not weaken Codex verification to the common denominator.

## Provider-specific continuity modes

Supported live-wave Providers are now:

```text
claudecode
codex
cursor
```

Evidence modes are explicit:

- Codex: `receipt_recovery`;
- Claude Code: `native_session_resume`;
- Cursor: `native_session_resume`.

Codex requires a clean model receipt omission, same-native-session narrow recovery, a valid memory-load receipt, and no whole-task replay or completion suppression.

Claude Code and Cursor require a successful initial turn, captured native session identity, successful resume of that exact session, exact private-sentinel recall without tools/files, terminal model output, and an unchanged workspace.

Both modes still require durable child reports, exact Provider version and executable identity, two unique groups, two unique `gcs_*` sessions, unique memory sentinels, and valid multi-group isolation.

## Generic multi-group runner

`task-agent-live-multi-group-memory-soak.mjs` now accepts:

```text
--provider claudecode|codex|cursor
--model <provider model>
```

It passes the correct model flag to the child runner. Codex alone receives `--codex-receipt-recovery`.

Challenge isolation is Provider-aware:

- Codex requires one unique challenge per group;
- Claude Code/Cursor require zero fabricated challenges;
- all Providers require unique groups, sessions, and sentinels.

Every group records `memoryContinuityMode`, `memoryContinuityVerified`, and its Provider-specific recovery status.

## Generic approval and execution

Ordinary wave and transition-canary plan validation now accept all three Providers. Runtime capture, HMAC receipt creation, duplicate rejection, claim-before-run, current identity revalidation, report shape, and evidence promotion remain unchanged.

The execute CLI derives Provider and model from the signed plan instead of hard-coding Codex.

For Claude Code/Cursor canaries, execution fails closed when:

- initial or resume status is not passed;
- session or sentinel checksum is missing;
- child semantic version or executable identity differs;
- child or multi report is not account-backed;
- workspace changed;
- group/session/sentinel isolation fails.

Invalid native-session evidence never starts endurance promotion.

## Provider-scoped endurance

Endurance audits and latest-report reads now accept a Provider filter. The signed report includes `providerFilter`.

This prevents a newer Cursor report from hiding the latest Claude Code or Codex baseline in a shared CCM home. Approval verification, canary creation, current-plan revalidation, and evidence promotion all use the receipt plan's Provider scope.

Memory Center exposes three ordinary previews and three transition-canary previews. It selects an approvable Provider without discarding diagnostics for the other two.

CLI previews accept:

```text
node scripts/task-agent-live-memory-wave-approval.mjs preview --provider <provider>
node scripts/task-agent-live-memory-wave-approval.mjs transition-preview --provider <provider>
```

When a Provider CLI is installed but no Provider-scoped endurance baseline exists, the preview reports the requested Provider and runtime identity as `runtimeUnproven`. It is not mislabeled as drift and remains non-approvable.

## Deterministic verification

The Phase 374 harness uses separate temporary homes for Claude Code and Cursor. Each Provider runs through:

```text
generic fixture multi-group native resume
v1 account-backed baseline
v2 runtime drift
explicit two-group transition canary
verified endurance promotion
v3 missing native-resume evidence
fail-closed rejection without promotion
```

It verifies:

- Provider/model argument propagation;
- two-group native session recall;
- zero fabricated recovery inventory and challenge ids;
- group/session/sentinel isolation;
- Provider-scoped endurance reports;
- ordinary approval for a proven Provider;
- Provider-scoped drift and canary readiness;
- HMAC canary execution and promotion;
- verified transition ledger evidence;
- ordinary approval reopening after promotion;
- missing native resume proof rejection;
- failed new identity remaining unproven;
- three-Provider Memory Center preview arrays;
- Provider-scoped CLI preview parity.

Result: `76/76` (`38/38` Claude Code, `38/38` Cursor).

## Regression summary

- Phase 374 cross-Provider canary: `76/76`
- Phase 373 Codex transition canary: `71/71`
- Phase 372 transition ledger: `71/71`
- Phase 371 approval retention: `65/65`
- Phase 370 approved wave lifecycle: `55/55`
- Phase 369 scheduler/version advisory: `51/51`
- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 report retention: `56/56`

Phase 366-374 related checks: `525/525`.

The existing three-Provider native memory and multi-group soak remains `84/84`.

Targeted memory checks through Phase 374: `860/860`.

## Production readiness

Read-only runtime probes currently report:

- Claude Code `2.1.201` is installed;
- Codex CLI `0.115.0` is installed and matches its proven baseline;
- Cursor Agent `2026.07.09-a3815c0` is installed.

Claude Code and Cursor do not yet have Provider-scoped production endurance baselines, so their canary previews are `runtimeUnproven`, non-approvable, and non-executable. Codex remains matched and does not need a transition canary.

No real model call, production approval, canary execution, or evidence deletion occurred in this phase.

## Remaining parity work

- collect initial account-backed Claude Code and Cursor endurance baselines through explicit live operations;
- use Provider-specific transition canaries only after an actual installed identity change;
- prove simultaneous exact-group recovery during a real account-backed Provider transition;
- continue comparing future Claude Code memory behavior and migrate verified improvements.

The long-term Claude Code parity goal remains active. Provider-specific evidence is now structurally supported without cross-Provider baseline collisions.
