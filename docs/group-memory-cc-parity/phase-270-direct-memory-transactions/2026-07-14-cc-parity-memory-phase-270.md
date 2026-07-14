# CCM Group Memory CC Parity - Phase 270

Date: 2026-07-14

## Objective

Add Claude Code-style explicit memory operations to each independent group chat session while keeping background typed-memory extraction incremental, non-duplicating, and unable to resurrect explicitly forgotten memory.

The durable identity remains:

`groupId + groupSessionId -> typedMemoryScopeId = groupId--groupSessionId`

Legacy `default` sessions are not migrated. They are purged, and direct memory writes reject non-`gcs_*` sessions.

## Delivered Behavior

### Deterministic remember

- `/remember <text>` in Group Chat submits a server-side direct-memory action instead of asking the main Agent to improvise a write.
- The source user message remains in the current session transcript.
- The action is bound to the exact typed-memory scope and source message ID.
- SHA-256 request proof is recomputed before admission.
- Stable content identity produces a stable `gmem_*` memory ID.
- Repeating the same memory returns `duplicate` and does not create a second fact.
- The direct action is excluded from heuristic extraction, so one user command cannot become both a direct fact and an auto-distilled fact.

### Deterministic forget

- `/forget <memory ID or exact text>` only searches the current group session.
- Exact memory ID, fact ID, source message ID, or exact normalized text is preferred.
- A bounded substring match is allowed only when it resolves to exactly one fact.
- Zero matches return `forget_target_not_found`.
- Multiple matches return `forget_target_ambiguous` with bounded candidate metadata and perform no deletion.
- Successful deletion creates a scoped tombstone without retaining deleted body text.
- Forced transcript rescans consult tombstones and cannot recreate a forgotten fact.
- A new explicit remember request may intentionally restore the same content and supersede the old tombstone.

### Background extraction interlock

- Direct remember/forget messages advance the same incremental distillation cursor as all other messages.
- Direct request receipts are idempotent by `requestId`.
- Existing direct facts pass the normal long-term write-admission maintenance path.
- Direct receipts, tombstones, and suppression counts are persisted in `.distillation-ledger.json`.
- `MEMORY.md` and typed documents are rebuilt after each committed transaction; empty typed documents are removed.

### Existing-memory manifest for model extraction

- Session-memory model extraction now receives a bounded copy of the exact session's typed `MEMORY.md` manifest.
- The manifest is capped at 12,000 characters and included in input-budget accounting.
- Prompt instructions treat the manifest as untrusted data and prohibit duplicate reconstruction.
- Explicit forget/tombstone results are declared authoritative over older transcript text.
- Manifest checksum, source file, original size, truncation state, and replay material are stored in extraction audit artifacts.

### Memory Center observability

The group memory context view now exposes metadata-only direct-operation telemetry:

- active direct memories;
- remembered, forgotten, duplicate, and rejected counts;
- receipt and tombstone counts;
- facts suppressed during background rescans;
- recent request ID, action, status, reason, memory ID, and source message ID.

Deleted memory body text is not surfaced in this telemetry.

## Main Files

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/collaboration/group-live-routes.ts`
- `backend/modules/collaboration/group-session-memory-model-extraction.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `backend/modules/tools/slash-commands.ts`
- `frontend/src/composables/useSlashCommands.js`
- `frontend/src/components/collaboration/GroupChat.vue`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-direct-memory-transaction-selftest.mjs`

## Verification

Phase 270 direct-memory transaction self-test: 9/9 passed.

- explicit remember commits only to the current scope;
- duplicate remember reuses one stable fact;
- ambiguous forget performs no deletion;
- unique forget creates a tombstone;
- forced rescan does not resurrect forgotten memory;
- cross-session forget cannot reach another scope;
- tampered request checksum is rejected;
- typed document and `MEMORY.md` index remain consistent;
- model extraction receives a bounded existing-memory manifest.

Regression results:

- incremental distillation cursor: 13/13 passed;
- typed-memory write admission: 22/22 passed;
- positive feedback admission: 21/21 passed;
- positive feedback lifecycle: 19/19 passed;
- group session-memory model extraction: 12/12 passed;
- group chat multi-session lifecycle: 14/14 passed;
- slash command center: 19/19 passed;
- TypeScript backend build: passed;
- frontend, MCP integration, and backend full build: passed.

Production HTTP smoke test:

- created temporary `gcs_mrk8r4le_8onz3r`;
- direct remember returned `committed` with `gmem_c5047c53fd77a9d2a4266d1082d4`;
- transcript contained one user message and one durable receipt message;
- SSE completed normally;
- temporary session and all memory artifacts were deleted afterward;
- previous active group session was restored.

Production service after deployment:

- URL: `http://localhost:3081`
- PID: `2940`
- lifecycle heads: 10 checked, 10 valid, 0 failed
- legacy `default` group sessions: 0
- stderr: empty

## Claude Code Parity Notes

This phase closes the largest behavioral gap found in Claude Code's `extractMemories` flow:

- direct user remember is committed before background extraction;
- direct writes and deletes share a durable incremental cursor;
- background extraction sees existing memory and avoids duplicate creation;
- forget is a real scoped mutation, not a prompt suggestion;
- replay and retry are idempotent and auditable.

CCM remains intentionally stricter for multi-Agent group chat: every request proves the composite session scope, and forget never crosses sessions or chooses among ambiguous candidates.

## Next Long-Term Work

The long-term Claude Code parity goal remains active. Candidate next stages include direct-memory transaction locking for concurrent HTTP writers, richer candidate selection UI for ambiguous forget, and model-assisted proposal generation that still commits only through the deterministic admission transaction.
