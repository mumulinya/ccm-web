# Phase 368: Live memory endurance attribution

Date: 2026-07-16

## Goal

Turn isolated account-backed multi-group observations into a durable, checksum-valid endurance history that distinguishes Provider latency, Provider availability, model memory-receipt failures, and CCM evidence failures.

The report must support concurrency comparison without presenting correlation as causation, remain body-free, survive restart, protect its source reports from retention, and be visible in Memory Center.

## Endurance evidence graph

`endurance` is now a fourth coordinated live report kind alongside `single`, `multi`, and `fleet`.

```text
retained fleet or endurance report
  -> source multi-group report checksum
    -> child Provider report checksum
```

Endurance reports use the same shared report-set lock, schema/checksum validation, fsync atomic commit, path constraints, and crash-recoverable ownership as the other live report kinds.

Default endurance retention is 90 days, with a maximum of 100 reports and a minimum of five retained reports. A retained endurance report protects every source multi report in its `waves` list; those multi reports continue protecting their child reports.

## Classification

Classifier version 2 uses these terminal classes:

| Class | Meaning |
| --- | --- |
| `passed` | valid child identity and report, Provider passed, signed receipt evidence present |
| `provider_latency_timeout` | valid child report explicitly ended at a bounded Provider timeout |
| `provider_unavailable` | Provider executable or service was unavailable |
| `memory_receipt_failure` | model-side receipt or same-session recovery was missing or blocked without a preceding Provider timeout |
| `ccm_evidence_failure` | child report missing/invalid, group identity mismatch, cross-group collision, or unexplained continuation/recovery evidence failure |
| `provider_failure` | remaining Provider terminal failures |

A valid child Provider timeout is classified before its expected downstream receipt and recovery gaps. This prevents consequences of a timeout from being mislabeled as a CCM evidence defect.

Provider issue fields are limited to controlled diagnostic codes. Any non-code text is replaced by a checksum before persistence.

## Concurrency attribution

Each signed report aggregates waves into concurrency buckets with:

- wave and group counts;
- passing groups;
- Provider latency timeouts;
- memory-receipt failures;
- CCM evidence failures;
- timeout rate;
- duration p50 and p95 per wave.

A Provider latency saturation signal requires:

- at least two baseline groups at concurrency one;
- at least two elevated-concurrency groups;
- no CCM evidence failure in the elevated bucket;
- elevated timeout rate at least 0.20 above baseline.

The report always stores `causalClaim: false`. The signal is explicitly a bounded correlation, not proof that concurrency caused Provider latency.

## Real account-backed result

Classifier version 2 audited all three current account-backed Codex waves:

- waves: `3`;
- observed groups: `6`;
- passed groups: `3`;
- Provider latency timeouts: `2`;
- memory-receipt failures: `1`;
- CCM evidence failures: `0`;
- replay-suppressed failures: `2`;
- all wave identity isolation: valid;
- endurance gate: passed.

Concurrency one contains three groups across two waves: two passed, one memory-receipt failure, and zero Provider timeouts.

Concurrency two contains three groups in one wave: one passed and two Provider timeouts. Its timeout rate is `0.6667`, compared with `0` at concurrency one.

The resulting attribution is `moderate_correlation`, with `causalClaim: false`.

Current report checksum: `e63e57950ae57d64ac75c844036b180f0089858565f03fcc7fb9b0a7f6a6f3a6`

An initial provisional classifier report evaluated downstream continuation gaps before the child Provider timeout and therefore mislabeled the two timeout groups as CCM evidence failures. Real-data verification exposed the ordering error. Classifier version 2 corrected the precedence, was rerun against the same signed sources, and produced the current report above. The provisional report remains retained as diagnostic history and is not selected by Memory Center because the corrected report is newer.

## Memory Center

Memory Center exposes the latest checksum-valid endurance report:

- waves and observed groups;
- passing groups;
- Provider latency timeouts;
- memory-receipt and CCM evidence failures;
- replay suppression count;
- latency saturation correlation;
- endurance gate state;
- compact concurrency buckets.

The current production snapshot reports `3` waves, `6` observed groups, `3` passing groups, `2` latency timeouts, `1` receipt failure, `0` CCM evidence failures, and a passing gate.

## Retention dry-run

After persistence of the versioned endurance reports, the production dry-run observed:

- reports: `21`;
- valid reports: `18`;
- fail-closed old-format or invalid reports: `3`;
- endurance reports: `3`;
- referenced multi reports: `3`;
- referenced child reports: `6`;
- prune candidates: `0`.

No production report or lower-level memory evidence was deleted.

## Deterministic verification

The Phase 368 harness creates:

- a concurrency-one wave with two passing groups;
- a concurrency-two wave with one pass and two distinct Provider timeouts;
- one replay-suppressed terminal timeout;
- a separate valid multi report referencing a missing child.

It verifies classification precedence, concurrency buckets, duration aggregation, non-causal attribution, checksum validity, body-free output, failed CCM gate for the missing child, endurance-to-multi retention edges, multi-to-child edges, restart reconstruction, read-only rerun, and Memory Center counters.

Result: `45/45`.

## Regression summary

- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 retention/restart: `56/56`
- live Provider deterministic matrix: `84/84`
- Phase 362 Provider recovery/fault matrix: `62/62`
- Phase 360 receipt recovery/restart: `44/44`
- Phase 361 recovery lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

Total targeted checks: `471/471`.

## Remaining parity work

- Add repeated bounded account-backed waves so latency attribution is based on a larger sample than three waves.
- Add scheduled endurance generation and trend comparison across Provider versions.
- Use endurance evidence to recommend bounded concurrency without silently changing user policy.
- Obtain equivalent account-backed receipt-recovery evidence for Claude Code and Cursor when their native environments are responsive.
- Exercise Provider version changes while several exact-group recoveries are active.

The long-term Claude Code parity goal remains active. Multi-group memory reliability can now be evaluated across waves with signed source lineage and explicit separation between Provider latency, memory-receipt behavior, and CCM evidence integrity.
