# Phase 287: Selector Recall Shape Telemetry

## Goal

Complete the Claude Code `memoryShapeTelemetry` denominator semantics for CCM's model-assisted typed-memory selector, while preserving exact group-chat session isolation and linking later child-agent consumption evidence back to the exact selector run.

The measured chain is now:

`candidate headers -> selector run -> selected shape -> delivery commit -> consumption receipt -> observed utility`

## Claude Code Comparison

The implementation was checked against:

- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/memdir/memoryShapeTelemetry.ts`

Claude Code records shape telemetry whenever the selector actually runs, including an empty selection. Empty selected-age statistics use `-1`, which distinguishes "the selector ran and chose nothing" from "the selector never ran". CCM now preserves the same distinction.

## Run Semantics

`selectGroupTypedMemoryManifest()` now persists `selectorRan` and `shapeTelemetryExpected` in its checksummed decision.

Shape telemetry is expected for:

- a successful selector call with selected memories;
- a successful selector call returning an empty array;
- invalid or unknown model output after the executor was invoked;
- executor failure after invocation;
- cancellation observed after the executor call returned.

Shape telemetry is not fabricated for:

- an empty candidate manifest;
- user `ignore memory` intent;
- an unavailable selector executor;
- cancellation before the executor call;
- an invalid non-session scope.

This makes selector-run count a truthful denominator rather than a count of successful selections.

## Shape Artifact

Each real selector run creates a checksummed `ccm-group-typed-memory-manifest-selector-shape-v1` artifact under the exact session's `.manifest-selector-shape` directory.

The artifact binds:

- exact `groupId--gcs_*` scope;
- selector request ID and decision checksum;
- query checksum, without query text;
- manifest checksum;
- selector status;
- candidate and selected counts;
- candidate-level and event-level selection rates;
- candidate and selected age statistics;
- fresh and stale selected counts;
- `-1` newest/oldest/average selected age for an empty selection;
- `bodyFree=true` and an artifact checksum.

Runtime-only `shapeFile`, `recorded`, `idempotent`, and verification fields are excluded from checksum calculation. This keeps the returned in-memory artifact and the durable artifact equivalently verifiable.

The verifier rejects checksum changes, decision mismatches, cross-session reuse, invalid counts/rates, a missing empty-selection sentinel, and any artifact not explicitly marked body-free.

## Aggregation And Utility

`summarizeGroupTypedMemoryManifestSelectorShapes()` reports per exact session:

- expected, valid, invalid, and missing shape counts;
- selector-run and empty-selection counts;
- total candidates and selections;
- aggregate and average-event selection rates;
- average selected age and fresh/stale counts;
- consumption-linked selector runs;
- delivered, used, verified, ignored, and unreported documents;
- structured receipt coverage;
- observed consumed utility.

Only a valid consumption outcome for the same selector request is linked. Receipt coverage is `(delivered - unreported) / delivered`. Utility is `(used + verified) / (used + verified + ignored)`. Both remain `null` when there is no valid denominator.

Deleting an expected shape or modifying a shape invalidates selector integrity and becomes an explicit Memory Center gap.

## Memory Center

Memory Center now exposes fleet-wide cards for:

- `recall shape`: selector runs, selected/candidate ratio, and empty runs;
- `selector utility`: consumed utility, receipt coverage, and invalid shape count.

Each group-chat session row exposes shape integrity, runs, selection rate, empty count, selected age, fresh/stale split, receipt coverage, utility, and missing expected artifacts. Fleet aggregation uses candidate/document weighted denominators rather than averaging session percentages.

## Agent And Session Boundaries

- Every shape belongs to one exact group-chat session.
- Session B cannot read, validate, or aggregate Session A shape artifacts.
- The Global Agent remains global-only and receives no group-chat selector telemetry as context.
- Third-party project child agents receive the selected group-session memory through the existing delivery capsule; their structured consumption receipt closes the utility loop.
- Old sessions remain deletion-only. No legacy `default` scope is created or migrated.

## Verification

Phase 287 dedicated test:

- `scripts/group-typed-memory-manifest-selector-shape-selftest.mjs`: 50/50 checks passed.

Coverage includes selected runs, empty runs, executor failure, no candidates, unavailable executor, ignore-memory, pre-call abort, `-1` age sentinels, fresh/stale age classification, selection-rate denominators, body and query non-disclosure, checksum binding, cross-session rejection, missing expected shape detection, tamper detection, exact consumption linkage, receipt coverage, consumed utility, Memory Center fields, and no legacy `default` creation.

Compatibility regression:

- Phase 283 manifest selector: 19/19 passed.
- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 285 selector consumption closure: 32/32 passed.
- Phase 286 selector calibration: 35/35 passed.
- typed-memory consumption feedback: 18/18 passed.
- task-session recall: 20/20 passed.
- delivery lease: 54/54 passed.
- dispatch WAL: 39/39 passed.
- Memory Center session scope: 13/13 passed.
- compatibility total: 260/260 passed.
- dedicated plus compatibility total: 310 checks passed.
- full `npm run build`: passed.
- `git diff --check`: passed; only existing CRLF conversion warnings were emitted.

## Production Evidence

- URL: `http://localhost:3081`
- server PID: `29048`
- root HTTP status: 200 on three consecutive checks
- Memory Center Overview API: 200
- all ten recall-shape/coverage/utility fleet fields: present
- group-session lifecycle heads: 7 anchored and valid, 0 failed
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- shape invalid and missing counts in the clean cold state: 0
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- stderr: empty

## Long-Term Direction

Phase 287 completes recall-shape accounting, not the entire long-term Claude Code parity goal. The next work should use these trustworthy denominators for bounded drift and capacity evaluation, including long-running selection-rate changes, age-distribution changes, receipt-coverage degradation, utility confidence, and alert thresholds. Those controls must remain advisory until enough exact-session evidence exists and must never weaken current-source truth, user ignore-memory intent, session isolation, or model context budgets.
