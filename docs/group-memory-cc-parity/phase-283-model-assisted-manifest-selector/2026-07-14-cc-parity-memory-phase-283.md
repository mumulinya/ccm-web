# Phase 283: Model-Assisted Memory Manifest Selector

## Goal

Align CCM group-session memory selection with Claude Code's independent manifest-selection flow:

- Scan at most 200 Markdown memory headers, without exposing document bodies to the selector.
- Filter already surfaced, stale-conflicted, invalid, and session-unbound memories before model selection.
- Let the model select zero to five filenames for the current child-Agent task.
- Bind every durable decision to the exact `groupId--gcs_*` session, query checksum, and decision checksum.
- Fail closed when selection is unavailable, invalid, tampered with, or refers to an unknown path.
- Deliver only verified selected documents to each newly created third-party child-Agent session.

Claude Code references audited for this phase:

- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/memdir/teamMemPrompts.ts`
- `D:/claude-code/src/memdir/memoryTypes.ts`

## Implementation

### Metadata-only manifest

`buildGroupTypedMemoryManifest()` builds a bounded manifest from no more than 200 Markdown headers. Each selector candidate contains only:

- memory type
- relative filename
- modification time
- description

Memory body text is never included in the selector prompt. Candidates are filtered before the model call when they were already surfaced, belong to an invalid or unbound model Topic, have a pending stale conflict, or violate the active session boundary.

### Independent selector

`selectGroupTypedMemoryManifest()` runs a production selector in an isolated sandbox with tools disabled and file changes rejected. The selector may return an empty result and can select no more than five known relative filenames.

Unavailable, failed, malformed, uncertain, path-traversing, or unknown-filename output becomes an empty selection. The normal recall path does not silently fall back to loading unrelated memories.

An explicit `requiredRelPath` repair request may bypass a model non-selection, but it still cannot bypass archive integrity, exact-session binding, stale-conflict safety, or repair warnings.

### Durable verified decisions

Every selector result is recorded under:

`.manifest-selector-decisions/<requestId>.json`

The record binds the decision to:

- exact `groupId--gcs_*` scope
- recall query checksum
- selected filenames
- decision checksum
- selector status and failure reason

`verifyGroupTypedMemoryManifestSelection()` rejects modified decisions, cross-session reuse, query rebinding, unknown paths, or invalid checksums. `buildGroupTypedMemoryRecall()` treats verification failure as no automatic selection.

### Child-Agent context delivery

`buildAgentMemoryContextBundleWithManifestSelection()` now performs a two-stage context build:

1. Synchronize and distill only the active group-session memory.
2. Build the metadata manifest and invoke the selector.
3. Rebuild the final child-Agent context using only verified selected documents.

Cross-Agent dispatch, task queues, automatic dispatch, provider retry, group broadcast, mention, and broadcast API paths all use the asynchronous selected bundle. Each third-party child-Agent invocation therefore starts a fresh provider session with a bounded projection of the current group-chat session memory.

The Global Agent boundary remains unchanged: it receives global routing memory only and does not consume group conversation bodies or group-session typed memory.

### Memory Center telemetry

Memory Center aggregates selector decisions per group-chat session and reports:

- total decisions
- selected and empty decisions
- failed and invalid decisions
- latest selector state
- decision-integrity gaps

The frontend displays a `memory selector` summary and a per-session selector state. A tampered or invalid decision is surfaced as a Session Memory gap instead of being hidden.

## Session Lifecycle

- Every group chat supports multiple `gcs_*` sessions.
- Recall and selector decisions are isolated by `groupId--gcs_*`.
- A new group-chat session starts with a new memory scope instead of extending one permanent conversation context.
- Legacy `default` group sessions are deleted without migration.
- Ignore-memory requests remain empty and do not call the selector.

## Verification

Phase 283 dedicated test:

- `scripts/group-typed-memory-manifest-selector-selftest.mjs`: 19/19 checks passed.

Coverage includes the 200-file cap, metadata-only prompts, prefiltering, recent-tool hints, durable checksummed decisions, five-file cap, empty/failure/unavailable behavior, decision and query tamper rejection, cross-session isolation, selected-only child delivery, Memory Center telemetry, ignore-memory behavior, all production dispatch paths, and no legacy `default` creation.

Regression results:

- Phase 278 model extraction typed memory: 9/9 passed.
- Phase 279 durable retry: 11/11 passed.
- Phase 280 semantic Topic lifecycle: 12/12 passed.
- Phase 281 Topic quality and rebalancing: 13/13 passed.
- Phase 282 model Topic recall selection: 13/13 passed.
- Semantic reference recall: 20 passed.
- Session recall ledger: 20 passed.
- Consumption feedback: 18 passed.
- Stale candidate lifecycle: 40 passed.
- Dispatch WAL: 39 passed.
- Artifact transaction recovery: 13/13 passed.
- Compact-head fence: 38 passed.
- Session lifecycle fence: 31 passed.
- Invocation lineage: 22 passed.
- Invocation recovery: 32 passed.
- Invocation adoption: 42 passed.
- Global Agent global-only boundary: 13 passed.
- Full `npm run build`: passed.

Production runtime verification after restart:

- URL: `http://localhost:3081`
- root HTTP status: 200
- Memory Center overview HTTP status: 200
- server PID: `32036`
- lifecycle heads: 4 anchored and valid, 0 fail-closed, 0 invalid journals, 0 invalid commits
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- Memory Center exposes all manifest-selector decision, selected, empty, failed, selected-document, and invalid-session counters
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- selector decision count: 0 because no active group Session Memory remains; this is a valid cold state
- stderr: empty

## Long-Term Direction

Phase 283 completes the independent metadata-manifest selector and verified selected-only injection. It does not complete the long-term Claude Code memory-parity goal. That goal remains active for continued improvements to adaptive compaction and reinjection, retrieval-quality evaluation, stale-source proof ergonomics, and production recall observability.
