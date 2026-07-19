# Phase 381: Live Provider memory usage baseline gate

Date: 2026-07-17

## Goal

Connect Phase 380's comparable usage cohorts to CCM's existing live Provider endurance evidence without allowing deterministic fixtures, ordinary task traffic, stale Provider binaries, or non-exact group selections to become a published savings baseline.

## Runner provenance

Every new task-Agent memory transport usage receipt now contains a checksum-sealed `ccm-task-agent-memory-transport-usage-provenance-v1` projection.

It records:

- origin: native CLI, external Agent Runner, recovery replay, deterministic fixture, or unverified;
- runner kind;
- explicit account-backed state;
- explicit live-execution authorization state;
- fixture state;
- authorization receipt checksum;
- Provider executable identity checksum;
- capture time and provenance checksum.

`account_backed=true` is valid only when live execution is explicitly authorized and the source is not a fixture. Missing or malformed executable identities are retained as unavailable evidence rather than being coerced into a trusted identity.

The server's native CLI and external runner completion paths attach provenance before normalized usage enters the existing delivery callback and durable direct-dispatch spool. Existing collaboration mention/retry, direct task, automatic assignment, and WAL recovery paths therefore retain provenance through their existing `providerUsage` plumbing.

Normal project traffic is not automatically called a live benchmark. It remains non-account-backed unless the execution options contain an explicit live-memory-usage authorization checksum and account-backed declaration.

## Endurance binding

`ccm-live-provider-memory-usage-baseline-preview-v1` combines exact task-Agent delivery receipts with the latest checksum-valid endurance report.

The endurance evidence must prove:

- checksum-valid endurance schema;
- gate passed;
- at least two waves and two passed groups;
- all waves account-backed and group-isolated;
- source-set checksum present;
- no CCM evidence failure;
- every observation references a valid child report;
- latest Provider transition gate passed;
- latest Provider, model, runtime version, and executable identity are available.

Each candidate usage receipt must also match that latest Provider identity, include a Provider output contract ID, pass its own receipt/provenance checks, and carry explicit live authorization.

## Publication gate

The preview can become `publishable` only when:

- endurance evidence is trusted;
- the selected scope is exact `group + gcs_*`, or fleet publication is separately and explicitly enabled;
- at least one Phase 380 cohort is comparable;
- full, delta, and continuation each meet the minimum sample requirement;
- at least one gated whole-call observation exists.

Selecting only a group never falls back to an exact-session publication claim. It returns `scope_not_exact`.

Fixtures return `provenance_rejected`. Non-account-backed endurance returns `endurance_unverified`. Runtime binary drift rejects receipts from the old executable identity.

The preview remains advisory and states:

```text
measurementScope = whole_provider_call_observation
causalClaim = false
publicationApplied = false
```

This phase does not automatically mutate transport policy or publish a fleet baseline.

## Memory Center

Memory Center now exposes:

- live baseline status;
- publishable state;
- eligible and rejected receipt counts;
- comparable cohort count;
- gated observation count;
- the complete checksum-sealed baseline preview.

Exact `gcs_*` selection is passed through snapshot inventory and baseline analysis, so a sibling fixture session in the same group cannot affect the selected session's counts.

## Split-module repair

The repository's concurrent focused-module extraction had moved `handleMemoryCenterApi()` under the self-test facade without re-exporting it. It also left dynamic `require()` paths one directory short.

Phase 381 restored the compatibility export and corrected those dynamic paths. The live wave approval API regression now executes through the real Memory Center facade again.

## Verification

New command:

```text
npm run test:task-agent-live-memory-usage-baseline-restart
```

The two-process harness covers:

- nine authorized account-backed full/delta/continuation receipts;
- exact-session publication readiness;
- fixture rejection;
- non-account-backed endurance rejection;
- runtime executable drift rejection;
- group-only scope rejection;
- report tamper rejection;
- same-group sibling `gcs_*` isolation after restart;
- Memory Center projection;
- native CLI and external runner provenance source wiring.

Result: `48/48`.

Compatibility regression:

- Phase 381 live baseline gate: `48/48`;
- Phase 380 usage cohorts: `48/48`;
- Phase 379 Provider usage: `58/58`;
- live Provider endurance: `45/45`;
- live wave approval and Memory Center API: `55/55`.

Phase 376-381 focused memory chain: `380/380`.

Targeted memory checks through Phase 381: `1236/1236`.

Full frontend, MCP, and backend builds pass.

## Production state

No real Claude Code, Codex, or Cursor model call was executed in Phase 381. The test data exercises real CCM persistence, restart, inventory, checksum, provenance, endurance, and Memory Center paths with deterministic Provider usage fixtures.

The remaining production proof is to run explicitly authorized account-backed full/delta/continuation waves through the native runner, collect at least three comparable observations per mode, and retain the resulting exact-session baseline preview across multiple Provider versions.

The long-term Claude Code parity goal remains active.
