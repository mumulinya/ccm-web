# Claude Code Parity Memory Phase 289

Date: 2026-07-14

## Objective

Phase 289 makes recall, write, and consumption shape observations durable after the bounded hot event files introduced in Phases 287 and 288 are evicted. It adds an exact-group-session daily trend ledger so long-running memory behavior can be compared without retaining memory bodies, prompts, queries, or receipt reasons.

This is operational evidence only. It is never injected into a child-agent prompt, never consumes the child's memory budget, and never authorizes automatic suppression, deletion, compaction, promotion, or rewriting of memory.

## Durable Ledger

Each exact `groupId--gcs_*` scope owns:

`group-memory-md/<exact-scope>/.memory-shape-trend.json`

The `ccm-group-typed-memory-shape-trend-ledger-v1` ledger stores one bucket per UTC day. Each bucket aggregates only body-free numeric shape metrics:

- selector runs, candidates, selections, empty results, selected age, fresh/stale counts, and 200/5 capacity observations;
- write create/update/noop counts, changed writes, growth, resulting sizes, near-limit writes, and truncated input;
- delivered, used, verified, ignored, and unreported documents, strong receipt binding, and unexpected claims.

It does not store memory content, selector query text, source text, receipt reasons, or child-agent output. Event identity is retained only as a 32-character checksum contribution key while a bucket remains mutable.

## Integrity And Concurrency

Writes use the shared atomic JSON implementation with:

- an exclusive per-ledger file lock;
- flushed temporary files and atomic replacement;
- a last-known-valid `.bak` copy;
- recovery from a valid backup when the primary is corrupt;
- a checksum on every bucket;
- a `previousBucketChecksum` chain across sorted daily buckets;
- a ledger checksum and anchored `headBucketChecksum`;
- exact-session verification on reads, summaries, and cross-session attempts.

Selector request IDs, write event IDs, and consumption checksums become hashed contribution keys. Replaying any event is idempotent and cannot inflate the trend.

## Retention

The retention policy is deliberately bounded:

- exactly 35 calendar days, including today, remain mutable for delayed consumption receipts;
- older buckets are sealed and their contribution keys are deleted;
- sealed buckets reject all late contributions;
- exactly 180 calendar days, including today, may remain in the ledger;
- buckets outside 180 days are pruned on the next accepted contribution;
- each mutable bucket accepts at most 1200 contribution keys;
- the ledger can contain at most 180 daily buckets.

This preserves long-horizon shape evidence without turning diagnostics into another unbounded memory store.

## Trend Windows

`ccm-group-typed-memory-shape-trend-summary-v1` compares:

- recent window: 7 days by default;
- baseline window: the preceding 21 days by default;
- total retained evidence: up to 180 days.

The summary reports `unobserved`, `warming`, `stable`, `drift`, or `invalid`. It preserves the Phase 288 selector, utility, and write confidence gates and emits bounded advisory signals for selection changes, empty-result growth, stale or older selections, receipt and utility degradation, write growth, capacity pressure, and truncation.

Every summary declares:

- `bodyFree=true`;
- `advisoryOnly=true`;
- `autoTuning=false`;
- `crossSessionReuse=false`.

Deleting the bounded `.manifest-selector-shape` and `.memory-write-shape` hot directories does not remove or change the durable trend ledger.

## Memory Center

Memory Center now exposes a fleet `durable trend` card with total and sealed buckets, drift sessions, and backup recoveries.

Each exact session exposes:

- ledger presence and integrity;
- status and generation;
- total, mutable, and sealed bucket counts;
- recent and baseline selector/write evidence;
- utility delta and signal count;
- history beyond the hot comparison horizon;
- primary verification or backup recovery;
- the advisory-only boundary.

Fleet aggregation includes present, stable, warming, drift, invalid, backup-recovered, sealed-bucket, signal, and beyond-hot-retention totals.

## Agent Boundaries

- A group-chat main Agent observes only the memory and trend owned by its exact conversation session.
- Session B cannot verify, aggregate, or reuse Session A's trend.
- Project child Agents continue to receive only selected group-session memory through the existing delivery capsule.
- The Global Agent remains global-only and receives no group-chat memory or trend context.
- User `ignore memory`, current-source truth, freshness quarantine, and context budgets remain authoritative.
- No legacy `default` session is created or migrated. Old sessions remain deletion-only.

## Verification

Phase 289 dedicated test:

- `scripts/group-typed-memory-shape-trend-selftest.mjs`: 55/55 checks passed.

Coverage includes automatic selector/write/consumption contributions, replay idempotency, daily aggregation, exact-session isolation, body/query/reason non-disclosure, bucket and ledger checksums, checksum-chain anchoring, cross-session rejection, atomic backup recovery, Memory Center recovery visibility, 35-day sealing, contribution-key removal, sealed late-receipt rejection, strict 180-day retention, pruning, bounded drift, summary tamper rejection, hot-event deletion durability, fleet fields, and no legacy `default` creation.

Compatibility regression:

- Phase 283 manifest selector: 19/19 passed.
- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 285 selector consumption closure: 32/32 passed.
- Phase 286 selector calibration: 35/35 passed.
- Phase 287 recall-shape telemetry: 50/50 passed.
- Phase 288 write shape and bounded drift: 56/56 passed.
- typed-memory consumption feedback: 18/18 passed.
- task-session recall: 20/20 passed.
- delivery lease: 54/54 passed.
- dispatch WAL: 39/39 passed.
- Memory Center session scope: 13/13 passed.
- Phase 289 durable trend: 55/55 passed.
- total: 421 checks passed.
- full `npm run build`: passed.
- focused `git diff --check`: passed with only existing CRLF conversion warnings.

## Production Evidence

- URL: `http://localhost:3081`
- server PID: `22408`
- root HTTP status: 200 on three consecutive checks
- Memory Center Overview API: 200
- all 12 durable-trend fleet fields: present
- durable-trend invalid session count in the clean cold state: 0
- group-session lifecycle heads: 10 anchored and valid, 0 failed
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- stderr: empty

## Long-Term Direction

Phase 289 closes the durability gap between bounded hot diagnostics and long-running per-session memory observation. The long-term Claude Code parity goal remains active. The next useful enhancement is operator acknowledgement and incident history for durable advisory signals, followed by evaluation of whether trend evidence should be exportable for offline diagnosis. Neither enhancement may alter memory selection or retention automatically.
