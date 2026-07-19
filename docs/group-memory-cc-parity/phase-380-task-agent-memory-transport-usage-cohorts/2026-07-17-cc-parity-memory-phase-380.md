# Phase 380: Task-Agent memory transport usage cohorts

Date: 2026-07-17

## Goal

Prevent CCM from claiming that `delta` or native `continuation` memory transport saves Provider tokens when the observations are not comparable.

Phase 379 bound normalized Provider usage to an exact memory delivery. It intentionally did not claim real savings. Phase 380 adds the statistical and identity gate required before such an observation may be shown.

## Durable comparison dimensions

New usage receipts remain body-free and checksum-sealed. They now also bind:

- a stable task-family key derived from an explicit worker packet key or a SHA-256 digest of `worker_context_packet.task`;
- the task-family source type and source checksum, without storing task text in the usage receipt;
- a deterministic final-Prompt token bucket.

The analyzer admits only verifier-valid `reported` receipts. It groups observations by the complete tuple:

```text
Provider
+ model
+ Provider runtime version
+ Provider output contract ID
+ target project
+ task family
+ final Prompt size bucket
```

A change in any dimension creates a different cohort. `unreported` is rejected rather than interpreted as zero tokens.

## Minimum sample gate

The default minimum is three independent observations for every transport mode:

```text
full >= 3
delta >= 3
continuation >= 3
```

Only a cohort satisfying all three conditions receives status `comparable` and may emit two observations: `full` versus `delta`, and `full` versus `continuation`.

Incomplete cohorts are `insufficient_samples`. A related Provider/project/task-family base that splits across model, runtime, contract, or Prompt dimensions is disclosed as `drifted`. Neither state may emit a savings claim.

## Measurement language

Every emitted comparison declares:

```text
measurement_scope = whole_provider_call_observation
causality = memory_transport_not_isolated
```

Provider input tokens cover the whole bound model call. The report does not present them as a causal measurement of memory text alone. Memory-transport token estimates remain a separate body-free projection.

Per mode, the report records sample count and median/mean values for:

- Provider input tokens;
- cache-read input tokens;
- estimated memory-transport tokens;
- estimated final-Prompt tokens.

## Integrity

`ccm-task-agent-memory-transport-usage-cohort-report-v1` contains:

- exact `group` and optional exact `gcs_*` scope;
- eligible and rejected counts;
- explicit rejection reasons;
- sorted receipt checksum references;
- per-cohort checksums;
- a report checksum;
- gated observations only for comparable cohorts.

The verifier checks report/cohort checksums, exact scope, minimum samples, and claim eligibility. Receipt token, Prompt bucket, task-family metadata, cohort statistics, or claim tampering invalidates the evidence.

## Exact-session isolation

Task-Agent snapshot inventory now accepts `groupSessionId`/`group_session_id` in addition to `groupId`.

The filter applies to:

- active task-Agent sessions;
- orphan snapshot matching;
- inventory rows and summaries;
- cohort input rows;
- Memory Center report rows;
- capacity-session projection.

When a `gcs_*` is selected, sibling sessions from the same group are not used as fallback samples. Group-only reports may aggregate multiple sessions, but disclose `exact_group_session=false`.

## Memory Center

Snapshot health cards now expose:

- all/comparable/drifted/insufficient cohort counts;
- gated observation count;
- rejected row count;
- the three-samples-per-mode policy;
- whole-call observation wording.

The complete sealed cohort report is also returned as `providerMemoryTransportUsageCohorts`.

## Verification

New command:

```text
npm run test:task-agent-memory-transport-usage-cohorts-restart
```

The two-process restart harness covers:

- three `full`, three `delta`, and three `continuation` exact-session receipts;
- one comparable cohort and exactly two gated observations;
- minimum-sample suppression at 3/3/2;
- Provider, model, runtime version, Provider contract, project, task-family, and Prompt-bucket splits;
- explicit exclusion of `unreported` usage;
- invalid receipt checksum exclusion;
- report/cohort tamper rejection;
- same-group sibling `gcs_*` isolation after restart;
- group-only aggregation disclosure;
- exact-session Memory Center projection.

Result: `48/48`.

Focused regression:

- Phase 380 cohort gate: `48/48`;
- Phase 379 Provider usage: `58/58`;
- Phase 376 entry delta sync: `47/47`;
- Phase 377 render transaction: `38/38`;
- Phase 378 contention retry: `41/41`;
- Provider memory-channel acknowledgement: `38/38`;
- direct durable dispatch spool: `39/39`;
- compaction Provider usage: `23/23`.

Focused total: `332/332`.

Targeted memory checks through Phase 380: `1188/1188`.

Full frontend, MCP, and backend builds pass. Backend and MCP TypeScript checks pass. Focused module export and factory dependency checks pass.

## Production state

No real Claude Code, Codex, or Cursor model call was executed in this phase. The tests use deterministic Provider usage fixtures and real CCM persistence/restart paths.

Account-authorized long-duration measurements remain required before tuning production transport thresholds or presenting a fleet-wide real-world savings baseline.

The long-term Claude Code parity goal remains active.
