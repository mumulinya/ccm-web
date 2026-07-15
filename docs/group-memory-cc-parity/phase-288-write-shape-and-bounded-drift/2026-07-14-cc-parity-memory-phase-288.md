# Phase 288: Write Shape And Bounded Drift

## Goal

Extend Phase 287 recall-shape accounting to Claude Code's second `memoryShapeTelemetry` responsibility: memory write shape. Use recall, write, and consumption denominators to provide exact-session capacity and drift diagnostics without automatically changing memory selection or write policy.

The observed chain is now:

`typed-memory write -> write shape -> selector shape -> delivery -> consumption -> bounded drift report`

## Claude Code Comparison

The current source was re-audited at:

- `D:/claude-code/src/memdir/memoryShapeTelemetry.ts`
- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/utils/sessionFileAccessHooks.ts`

Claude Code's source calls `logMemoryRecallShape()` after a real selector run, including an empty selection, and calls `logMemoryWriteShape()` after Edit or Write touches a recognized memory path. The distributed source contains an auto-generated telemetry stub, so its private event payload and server-side trend policy are not available for direct replication.

CCM therefore mirrors the observable trigger semantics and keeps its additional diagnostics conservative, checksummed, body-free, exact-session, and advisory-only.

## Write Shape Artifact

Every `upsertGroupTypedMemoryDocument()` operation for an exact `groupId--gcs_*` scope records a `ccm-group-typed-memory-write-shape-v1` artifact under `.memory-write-shape`.

Each event records only:

- exact session scope and a unique event ID;
- memory filename and validated memory type;
- `create`, `update`, or `noop` operation;
- changed and before-exists flags;
- before/after/delta bytes and line counts;
- input body character count and configured body limit;
- near-limit and truncation flags;
- source and document checksums;
- `bodyFree=true`, timestamp, and artifact checksum.

The source string, document body, query text, model output, and child-agent prompt are never stored. Runtime-only file and recording fields are excluded from checksum calculation so returned and durable artifacts verify identically.

Write telemetry is best effort after the authoritative atomic document write. A telemetry failure is returned diagnostically but cannot roll back or corrupt the memory document.

The verifier rejects invalid scope, cross-session reuse, unknown memory type, unsafe filename, inconsistent operation flags, impossible byte/line deltas, incorrect capacity flags, missing body-free marker, invalid timestamp, and checksum tampering.

## Retention And Capacity

Write-shape retention is capped at 400 events per exact session. Recall-shape analysis remains bounded by the selector's latest 200 durable decisions.

Per-session write summaries expose:

- valid, invalid, create, update, noop, and changed counts;
- total growth bytes;
- average and maximum resulting document size;
- near-body-limit and truncated-body counts;
- latest verified write shape.

The bounded ledgers prevent diagnostics from becoming another unbounded memory source.

## Drift Windows

`ccm-group-typed-memory-shape-drift-v1` compares:

- recent window: 7 days by default;
- baseline window: the preceding 21 days by default.

All windows are configurable within bounded limits. Events outside the 28-day comparison horizon do not affect current drift status.

The report includes candidate and selection rates, empty-selection rate, average candidate count, selected age, stale share, selector capacity saturation, receipt coverage, consumed utility, write size, growth, near-limit writes, and truncation.

Default confidence gates require:

- at least 3 real selector runs in each window for selector drift;
- at least 3 declared consumption documents in each window for utility drift;
- at least 3 write events in each window for write drift.

Status semantics:

- `unobserved`: neither window has selector or write evidence;
- `warming`: evidence exists but no comparison family meets its minimum sample size;
- `stable`: at least one comparison family is sufficiently sampled and no bounded signal fires;
- `drift`: sufficiently sampled comparison or current truncation produces one or more signals.

## Signals

Current advisory thresholds are:

- absolute selection-rate change of at least 20 percentage points;
- empty-selection increase of at least 25 percentage points;
- selected-memory age increase of at least 7 days;
- stale-selection share increase of at least 25 percentage points;
- receipt coverage or consumed utility decrease of at least 20 percentage points;
- at least half of recent runs reaching the 200-candidate or 5-selection cap;
- average write size increasing by at least 4000 bytes;
- at least half of recent writes approaching their configured body limit;
- any recent write exceeding its configured body limit.

Selection-rate change by itself is informational because lower selection can mean healthy selectivity. Drift is not authorization to suppress, promote, compact, delete, or rewrite memory.

Every report binds the exact session and declares `advisoryOnly=true`, `autoTuning=false`, `crossSessionReuse=false`, and `bodyFree=true`. The full report is checksummed.

## Memory Center

Memory Center now adds fleet cards for:

- `memory writes`: total events, create/update counts, and near-limit writes;
- `shape drift`: drift sessions, warming sessions, signal count, and invalid reports.

Each exact session exposes write integrity, operation counts, growth, maximum size, capacity pressure, drift status, recent/baseline selector runs, selection-rate delta, utility delta, signals, and the advisory-only boundary.

Fleet aggregation exposes write totals, invalid sessions, drift/stable/warming/unobserved session counts, warning counts, and report-integrity failures. A tampered write artifact becomes a Session Memory integrity gap.

## Agent And Session Boundaries

- Write and drift artifacts require an exact group-chat session scope.
- Session B cannot verify or aggregate Session A events.
- The Global Agent remains global-only and receives no group-chat write or drift context.
- Drift diagnostics are not injected into child-agent prompts and do not consume context budget.
- Third-party project child agents continue to receive only selected session memory and return structured consumption receipts.
- User `ignore memory`, current-source truth, freshness quarantine, and delivery budgets remain authoritative.
- Old sessions remain deletion-only; no legacy `default` scope is created or migrated.

## Verification

Phase 288 dedicated test:

- `scripts/group-typed-memory-shape-drift-selftest.mjs`: 56/56 checks passed.

Coverage includes create/update/noop classification, size and capacity accounting, body and source non-disclosure, returned/durable checksum parity, exact-session isolation, cross-session rejection, artifact tamper detection, baseline and recent windows, warming confidence, selector and write confidence gates, signed deltas, bounded signals, advisory-only and no-auto-tuning markers, drift checksum tamper rejection, Memory Center rows/fleet totals, and no legacy `default` creation.

Compatibility regression:

- Phase 283 manifest selector: 19/19 passed.
- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 285 selector consumption closure: 32/32 passed.
- Phase 286 selector calibration: 35/35 passed.
- Phase 287 recall-shape telemetry: 50/50 passed.
- typed-memory consumption feedback: 18/18 passed.
- task-session recall: 20/20 passed.
- delivery lease: 54/54 passed.
- dispatch WAL: 39/39 passed.
- Memory Center session scope: 13/13 passed.
- compatibility total: 310/310 passed.
- dedicated plus compatibility total: 366 checks passed.
- full `npm run build`: passed.
- focused `git diff --check`: passed with only existing CRLF conversion warnings.

## Production Evidence

- URL: `http://localhost:3081`
- server PID: `2996`
- root HTTP status: 200 on three consecutive checks
- Memory Center Overview API: 200
- all 16 write-shape and drift fleet fields: present
- group-session lifecycle heads: 8 anchored and valid, 0 failed
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- write-shape invalid and drift-invalid counts in the clean cold state: 0
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- stderr: empty

## Long-Term Direction

Phase 288 completes the observable recall/write shape trigger pair and establishes trustworthy drift confidence gates. The long-term Claude Code parity goal remains active. The next work should add durable trend snapshots or fleet-level historical buckets so bounded diagnostics survive selector-event retention, then evaluate whether confidence-calibrated alerts need operator acknowledgement. No future phase may turn these diagnostics into automatic memory suppression or deletion without stronger independent-session evidence and an explicit user-controlled policy.
