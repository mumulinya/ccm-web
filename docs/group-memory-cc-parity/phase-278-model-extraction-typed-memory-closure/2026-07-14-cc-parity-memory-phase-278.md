# Phase 278: Model Extraction To Typed Memory Closure

## Status

Completed on 2026-07-14.

This phase closes the gap between forked-model Session Memory extraction and session-scoped typed memory. The model still cannot write `MEMORY.md` directly. It produces evidence-bound proposals; CCM validates and commits them through the deterministic typed-memory transaction coordinator.

## Scope Rules

- Memory identity is exactly `groupId + groupSessionId`.
- The accepted scope format is `groupId--gcs_*`.
- A project child Agent can only recall typed memory from its source group session.
- The global Agent is unchanged and receives global context only.
- Legacy `default` sessions are not migrated. Session deletion removes the scoped snapshot, extraction artifacts, typed-memory directory and dispatch evidence.

## Claude Code Parity Direction

Claude Code's `extractMemories` flow lets a model inspect the existing memory manifest and update durable topic files. CCM now provides the equivalent closed loop with a stricter trust boundary:

1. The model reads the bounded `MEMORY.md` manifest for the exact group session.
2. The model writes the fixed ten-section Session Memory format.
3. CCM builds a signed fact graph from the raw transcript and model output.
4. Only durable user constraints and explicit corrections that appear in both the raw user message and model output become proposals.
5. CCM verifies scope, committed receipt, request artifact, transcript checksum, markdown checksum, extraction fencing token and fact-graph checksum.
6. The shared typed-memory mutation coordinator commits admitted facts, audit archive, topic files and `MEMORY.md` atomically.

## Admission Policy

Admitted:

- `constraint` facts from user messages, mapped to `user` typed memory.
- `replacement` facts from explicit user corrections, mapped to `feedback` typed memory.
- Facts with exact normalized source-message evidence and exact model-output confirmation.

Rejected:

- unresolved or current-task state;
- standalone paths and symbols derivable from the current repository;
- retained Session Memory facts without current raw-message evidence;
- assistant-authored facts;
- receipt, scope, checksum, artifact or fencing mismatches.

## Persistence

The session distillation ledger now preserves `modelExtractionTypedMemoryArchive` with:

- stable fact checksums;
- active and superseded states;
- source message and transcript checksums;
- extraction execution ID and fencing token;
- receipt, request artifact and fact-graph checksums;
- per-execution admitted, rejected, duplicate and superseded counts;
- bounded rejection history.

Active facts render to:

- `model-extracted-user-constraints.md`
- `model-extracted-corrections.md`

Superseded facts remain auditable in the ledger but are removed from model-facing topic files and recall.

## Transaction Order

Session Memory snapshot commit and typed-memory proposal commit are intentionally separate:

1. Commit the validated Session Memory snapshot and extraction receipt.
2. Commit typed-memory proposals through the shared typed-memory lock and artifact journal.
3. Append the typed-memory outcome to extraction history.
4. Bind the outcome into delivery replay evidence.

If step 2 fails, the successful Session Memory snapshot remains committed. The result is marked `failed_retriable`; no partial topic file or ledger mutation is published.

## Memory Center

The Session Memory fleet panel now shows:

- model proposal count;
- admitted and rejected count;
- active and superseded typed facts;
- duplicate count and superseded count for the latest execution;
- archive presence, checksum validity and session binding.

An invalid archive changes the session health result to `fail`.

## Verification

New focused test:

`npm run test:group-session-model-extraction-typed-memory`

Result: 9/9 checks passed.

Covered behavior:

- durable constraint commit and semantic recall;
- exact `gcs_*` session isolation;
- unresolved/path/symbol rejection;
- receipt scope tampering fail-closed;
- duplicate extraction idempotency;
- old-fact supersession and new-fact recall;
- typed-memory failure preserving the committed snapshot;
- Memory Center admission metadata;
- no legacy `default` session creation.

Regression tests passed:

- model Session Memory extraction;
- fact supersession;
- direct-write extraction suppression;
- typed-memory write admission;
- distillation fencing transaction;
- artifact transaction recovery;
- shared ledger mutation coordination;
- Memory Center session scoping;
- incremental distillation cursor;
- zero-write distillation preflight;
- direct memory transactions;
- bounded `MEMORY.md` entrypoint projection.

Full `npm run build` passed for frontend, MCP Feishu and backend.

Runtime deployment verification:

- URL: `http://localhost:3081`
- HTTP status: `200`
- server PID after restart: `33652`
- lifecycle heads: 2 valid, 0 failed
- `fetch-web-mcp`, `filesystem-mcp` and `mcp-feishu`: connected
- stderr: empty

## Main Files

- `backend/modules/collaboration/group-session-memory-model-extraction.ts`
- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-session-model-extraction-typed-memory-selftest.mjs`
- `package.json`

## Next Direction

The next parity step should add a durable retry worker for `failed_retriable` typed-memory proposal commits. It should replay the already committed receipt and archived request artifact without rerunning the model, while keeping the same session scope and extraction fencing evidence.
