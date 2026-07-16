# Phase 376: Task-Agent memory entry delta sync

Date: 2026-07-16

## Goal

Stop re-injecting an entire group-session memory projection when one entry changes, or when the exact third-party child-Agent native session already has the committed baseline.

The optimization must preserve the existing identity boundary:

```text
group + gcs_* + task + tas_* + project + native Provider session
```

A new `tas_*` always receives a complete baseline. A manifest from another group chat session is never reusable. Global Agent context remains outside this path.

## Claude Code comparison

The reference is the current local Claude Code Team Memory implementation:

- `D:\claude-code\src\services\teamMemorySync\types.ts` exposes per-entry `sha256:<hex>` checksums;
- `D:\claude-code\src\services\teamMemorySync\index.ts` computes a key-level delta instead of uploading an unchanged full snapshot;
- conflict resolution refreshes current checksums before recomputing the delta;
- deterministic key ordering keeps checksum and batching behavior stable.

CCM does not copy Claude Code's remote organization/repository API. It applies the same entry-checksum and delta principle locally to the durable group-session memory baseline already delivered to an exact task-Agent session.

## Entry manifest

Each upgraded snapshot contains `ccm-task-agent-memory-entry-sync-v1` and a signed `ccm-task-agent-memory-entry-manifest-v1`.

Entries are deterministic and sorted:

- `group/core` for session-scoped memory state, gates, compact state, and binding metadata;
- `typed/<relPath>` for every surfaced typed-memory document;
- `global/mission` only when an explicit global mission handoff is already part of the child work order;
- `memory/value` as a compatibility fallback for nonstandard memory input.

Every row records `sha256:<64 hex>`, characters, and UTF-8 bytes. The manifest binds group, `gcs_*`, full semantic memory checksum, and an overall manifest checksum.

Derived `rendered_text` is not treated as an independent entry when structured source fields exist. This prevents one typed-document edit from making the derived full rendering look like an unrelated whole-memory change.

## Transport modes

The plan selects one of three modes:

### `full`

Used when no committed compatible baseline exists, including:

- a new task-Agent session;
- legacy snapshots without a manifest;
- uncommitted, rejected, invalid, or tampered prior delivery;
- a delta whose rendered size would reach at least 80% of the complete projection.

The complete trusted memory envelope remains mandatory.

### `delta`

Used when a trusted prior manifest exists and one or more keys changed or disappeared.

The Prompt contains:

- previous snapshot and manifest checksums;
- current manifest checksum;
- changed entry keys and replacement content;
- removed entry keys as explicit tombstones;
- exact group and `gcs_*` identity.

Unchanged typed-memory bodies and the old full `rendered_text` are omitted. The delta itself is placed in the trusted memory envelope and receives the existing final-Prompt injection proof.

### `continuation`

Used when all entry checksums are unchanged. No memory body is repeated.

This mode aligns with `memory_snapshot_sync.action=none` and remains deliverable only when the existing native-continuation proof verifies the same Provider native session and committed delivery baseline. Without that proof, the existing snapshot-sync gate falls back to `prompt_update` and rejects a stale continuation plan.

## Durable ordering

The existing two-phase snapshot lifecycle remains authoritative:

1. compute the current entry manifest and transport plan;
2. render the exact full, delta, or continuation Prompt;
3. bind the plan, semantic memory checksum, final Prompt checksum, and injection proof into the snapshot;
4. dispatch through the Provider memory channel;
5. commit the snapshot only after a valid delivery receipt;
6. allow the next delta/continuation only from that committed manifest head.

The binder recomputes the manifest immediately before persistence. A modified delta body, changed manifest, replaced prior snapshot, checksum tamper, or cross-`gcs_*` reuse fails before a snapshot is written.

This local race handling is fail-closed. Unlike Claude Code's remote 412 loop, CCM does not yet automatically rerender and retry a Prompt after a concurrent exact-`tas_*` manifest change; the enclosing task retry builds a fresh work order and manifest.

## Production paths

All task-Agent work-order paths pass the exact `tas_*` identity into the memory-entry planner:

- group mention/collaboration initial dispatch;
- Provider retry and native-session recovery dispatch;
- direct task queue dispatch;
- automatic assignment dispatch.

The group collaboration Prompt previously had an additional `workerMemoryPacket` insertion outside the self-contained handoff. Both initial and retry renderers now use the same entry transport projection, so a delta is not silently followed by a duplicate full packet.

## Lifecycle and Memory Center

The manifest is embedded in the existing snapshot and therefore inherits snapshot retention, session deletion, group-session deletion, backup, and delivery-commit lifecycle without a new orphan sidecar.

Inventory and Memory Center expose:

- full, delta, continuation, invalid, and legacy snapshot counts;
- changed and removed entry totals;
- per-row transport mode, additions/removals, manifest checksum, previous manifest checksum, and validation issues.

Legacy snapshots remain readable and force one complete baseline before delta reuse.

## Verification

New command:

```text
npm run test:task-agent-memory-entry-delta-sync-restart
```

The restart harness covers:

- complete first baseline for a new `tas_*`;
- exact Provider-channel and Prompt-proof commit;
- restart restoration of the committed manifest;
- one changed typed document producing one changed key;
- unchanged document body absent from the delta Prompt;
- full rendered projection absent from the delta Prompt;
- unchanged memory producing zero-repeat continuation mode;
- exact native continuation evidence before commit;
- removal-only delta with a relPath tombstone;
- tampered delta rejection before persistence;
- cross-`gcs_*` rejection;
- inventory and Memory Center counters;
- source checks for mention, retry, direct, and automatic production paths.

Result: `47/47`.

Observed deterministic fixture size:

```text
full projection: 3736 chars
single-entry delta: 2429 chars
unchanged memory body: 0 chars
```

The delta fixture therefore removed 35% of memory body characters while retaining exact checksums and one changed entry. Real savings depend on document count and change shape; the full fallback prevents a larger delta from being preferred merely because it is technically incremental.

## Regression summary

- Phase 376 entry delta sync: `47/47`
- Phase 349 snapshot sync: `23/23`
- Phase 350 sync commit: `28/28`
- Phase 351 monotonic commit: `22/22`
- Phase 352 Prompt injection proof: `27/27`
- Phase 353 continuation baseline proof: `29/29`
- Phase 354 trusted envelope proof: `31/31`
- Phase 355 Provider memory channel: `37/37`
- Provider channel acknowledgement: `38/38`
- direct durable dispatch spool: `39/39`
- group-session lifecycle fence: `31/31`
- compact-head fence: `38/38`

Phase 376 and directly affected checks: `392/392`.

Targeted memory checks through Phase 376: `1003/1003`.

## Production state

No real Provider model call, approval, execution, memory deletion, or production baseline mutation occurred in this phase.

The currently running old CCM process must restart before it loads the new renderer and backend modules.

## Remaining parity work

- automatically rerender and retry when an exact-`tas_*` manifest changes between work-order construction and snapshot bind;
- measure real account-backed Prompt/token savings after explicit Provider authorization;
- retain long-duration evidence across repeated full/delta/continuation cycles and Provider version changes;
- continue auditing new Claude Code Team Memory and compact behavior without weakening group-session isolation.

The long-term Claude Code parity goal remains active.
