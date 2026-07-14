# Phase 261: Real Provider Task Output Version Soak

Date: 2026-07-14

## Goal

Move provider-version continuation proof beyond synthetic JSON evidence. A cross-version Task Agent chain is accepted only when the real CCM external Runner starts a provider process, the group-session memory prompt is delivery-bound, the provider changes a Git workspace file, the output and file set are checksummed, unsafe output drift fails closed, and a clean later spawn produces another memory-bound artifact.

This phase continues the long-term Claude Code memory parity goal. It does not complete that goal.

## Claude Code Reference

The implementation was re-audited against:

- `D:\claude-code\src\utils\sessionRestore.ts`: restored state must be tied to the current session before the next query.
- `D:\claude-code\src\services\api\sessionIngress.ts`: persisted session events use explicit append identity and recover from stale writers instead of assuming success.
- `D:\claude-code\src\bridge\sessionIdCompat.ts`: session identity conversion is a dedicated compatibility boundary.
- `D:\claude-code\src\services\contextCollapse\persist.ts`: compacted state is durable independently of a transient prompt.

The remaining CCM gap after Phase 260 was evidence strength. Version transition behavior was covered with normalized synthetic provider output, but no test proved that a real Runner invocation both consumed the selected group-session memory and produced code across upgrade, drift, downgrade, and recovery.

## Delivered

- Upgraded continuation soak reports to `ccm-task-agent-continuation-soak-report-v3`.
- Added durable `task_artifact_committed` events to the per-`groupId + gcs_* + tas_*` hash chain.
- Bound each task artifact event to:
  - Runner request ID and execution witness.
  - Task Agent memory snapshot ID.
  - Actual rendered prompt checksum.
  - Group-session memory binding checksum.
  - Memory delivery receipt checksum.
  - Provider runtime version, executable identity, and provider contract.
  - Task output checksum.
  - Bounded changed-file paths and file-change checksum.
- A task is `taskArtifactProven` only when memory delivery passed, execution succeeded, the Runner started, a request ID exists, output is checksummed, and at least one workspace file changed.
- Added report metrics for artifact evidence, proven artifacts, unproven artifacts, memory-bound artifacts, recovery artifacts, and cross-version artifact chains.
- A cross-version chain with an unverified transition is not proven unless a later memory-bound recovery artifact exists.
- Integrated artifact evidence into streamed group assignment, direct project dispatch, and automatic group assignment paths.
- Fixed absolute `CCM_CURSOR_AGENT_COMMAND` version probing on Windows. Explicit executable paths are now identified directly instead of being passed to `where.exe` as an invalid `path:pattern`.
- Added Memory Center cards and continuation rows for real task output, memory-bound output, clean recovery, and cross-version proof.

## Real Soak

`scripts/task-agent-real-provider-version-task-soak-selftest.mjs` creates a temporary Git project and runs the compiled CCM external Runner five times through a versioned Cursor-compatible provider fixture:

1. Version `1.0.0` clean native spawn.
2. Version `1.0.0` native resume.
3. Version `2.0.0` verified executable/contract transition while retaining the native session.
4. Version `3.0.0` output-contract drift after writing a real code artifact; the old native session is fenced and the Task Agent degrades to scratchpad.
5. Version `3.0.0` clean spawn with a new native session; pending contract trust is promoted.

Each turn modifies `src/provider-evolution.js`, starts from a committed Git baseline, receives the same `groupId + gcs_*` memory sentinel, and emits a delivery-bound artifact event. The temporary project and all test ledgers are deleted after verification.

## Acceptance

- Real provider task soak: `99/99` checks.
- Five real Runner turns and five Git artifact changes.
- Three provider executable contract epochs.
- One verified version transition and one unverified transition.
- Scratchpad downgrade and clean native recovery.
- Five memory-bound task artifacts and one recovery artifact.
- One valid cross-version task-producing chain.
- Phase 258 capacity/compatibility regression: `33/33`.
- Phase 259 restart/output-drift regression: `40/40`.
- Phase 260 provider-version regression: `58/58`.

## Boundaries

- Group-session evidence remains isolated by `groupId + gcs_*`; deleted sessions are not migrated or restored.
- Global Agent memory remains outside this group-session artifact chain.
- A no-file-change response remains observable but is not counted as a proven code artifact.
- An intentionally drifted provider turn can still produce a file, but it cannot authorize reuse of the previous native session.

## Next Direction

Run the same production-grade artifact proof against installed Claude Code, Codex, and Cursor CLIs during controlled real upgrades, then bind compact-boundary reinjection and task artifact proof into one end-to-end acceptance chain.
