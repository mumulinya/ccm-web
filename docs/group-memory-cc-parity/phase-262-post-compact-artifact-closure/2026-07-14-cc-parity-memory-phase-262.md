# Phase 262: Post-Compact Artifact Closure

Date: 2026-07-14

## Goal

Prove that code produced after a group-session compact boundary used memory reinjected for the exact Task Agent invocation. A valid result must close the compact epoch, invocation edge, `groupId + gcs_* + tas_*` identity, memory snapshot, Runner request, delivery receipt, provider contract, and changed-file artifact into one evidence chain.

This phase continues the long-term Claude Code memory parity goal. It does not complete that goal.

## Gap Closed

Phase 261 independently proved real memory-bound code output and post-compact reinjection. The v3 report did not require those proofs to describe the same invocation, so two unrelated valid events in one ledger could appear stronger than they were.

Phase 262 upgrades the report to `ccm-task-agent-continuation-soak-report-v4` and accepts a post-compact artifact closure only when all of these conditions match:

- The artifact and reinjection proof use the same non-empty `invocation_edge_id`.
- Event identity and proof identity match the same `groupId + gcs_* + tas_*` scope.
- The artifact memory snapshot equals the reinjection proof snapshot.
- The artifact compact epoch is not `precompact` and equals the proof compact epoch.
- The artifact and proof bind the same memory delivery receipt.
- Runner request identities do not conflict.
- The reinjection proof checksum is valid and its status is `proven`.
- The task artifact is proven and retains provider contract, runtime version, executable identity, output, and changed-file evidence.

## Delivered

- Added compact-evidence retention for reinjection proof identity, compact epoch, Runner request, delivery receipt, and checksum validity.
- Added compact epoch and durable invocation metadata to every `task_artifact_committed` event.
- Added per-artifact closure rows and aggregate metrics for:
  - Post-compact artifact evidence.
  - Proven and unproven closures.
  - Edge, identity, snapshot, epoch, and delivery mismatches.
  - Recovery closures.
  - Cross-version post-compact artifact chains.
- A chain containing an unsafe provider transition requires a later proven recovery artifact closure; an earlier or unrelated recovery cannot satisfy it.
- Extended normalized native continuation receipts with provider contract and executable-version evidence so lineage events preserve version governance.
- Added Memory Center cards for post-compact output and closure recovery, plus row-level closure status.
- Added `test:task-agent-real-post-compact-artifact-soak` as the dedicated acceptance command.

## Real Runner Soak

`scripts/task-agent-real-provider-version-task-soak-selftest.mjs` now creates real invocation lineage for all five external Runner turns:

1. Version `1.0.0` clean spawn before compact.
2. Version `1.0.0` native resume after the first compact boundary.
3. Version `2.0.0` verified provider transition after another compact boundary.
4. Version `3.0.0` intentional output-contract drift after compact; native reuse is fenced.
5. Version `3.0.0` clean spawn after compact; the pending contract is promoted and a later recovery artifact is committed.

Each turn changes a temporary Git workspace file and consumes the selected group-session memory sentinel. Four post-compact turns close against their exact reinjection proof. A negative-control artifact with deliberately wrong edge, snapshot, epoch, and delivery receipt is rejected and classified by each mismatch metric.

## Acceptance

- Real Runner and closure soak: `124/124` checks.
- Five real external Runner turns and five Git file changes.
- Four post-compact artifact closures proven; zero positive-chain identity mismatches.
- One later clean recovery closure after the unsafe version transition.
- One cross-version post-compact artifact chain.
- Negative control: one unproven closure with edge, snapshot, epoch, and delivery mismatch classification.
- Invocation adoption/reinjection regression: `42/42`.
- Restart/reinjection regression: `40/40`.
- Provider contract/version regression: `58/58`.
- TypeScript `npm run check`: passed.
- Full `npm run build`: passed.
- Production API: v4 report, zero production soak rows after isolated test cleanup, zero stderr bytes.
- Memory Center UI: desktop `1280x720` and mobile `390x844`, no card overflow, no page horizontal overflow, no console errors.

## Boundaries

- Group memory and evidence remain isolated by `groupId + gcs_*`; multiple groups and multiple group sessions do not share closure rows.
- Deleted historical group sessions are not restored or migrated. Their lineage, snapshots, delivery receipts, and soak ledgers remain deletion-scoped artifacts.
- Global Agent context is not admitted into this group-session closure. It continues to use global context only.
- The production report intentionally shows zero closure artifacts after this test because all real soak ledgers are isolated under a temporary CCM home and deleted after acceptance.

## Next Direction

Run the same closure against controlled upgrades of installed Claude Code, Codex, and Cursor CLIs, including an actual compact-triggered group session rather than a fixture epoch, then add long-duration restart and concurrent-dispatch observation without weakening deletion isolation.
