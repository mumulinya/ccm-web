# CCM Memory Phase 275: Auto-Compaction Session Scope

Date: 2026-07-14

## Objective

Close a production scope leak between group auto-compaction and typed long-term memory. Every auto-compaction distillation commit must use the exact `groupId--groupSessionId` typed-memory identity, never a bare `groupId`.

This preserves CCM's stronger multi-chat extension over Claude Code's project-scoped auto-memory: each group chat conversation owns an independent `MEMORY.md`, topic documents, ledger, cursor, transaction fence, and child Agent context.

## Gap Found

The child Agent context path already distilled with `groupId--gcs_*`, but `runGroupMemoryAutoCompactionNow` still called `distillGroupMessagesToTypedMemory(groupId, ...)`.

Consequences before this phase:

- two sessions in one group could write auto-compaction facts into the same bare-group typed-memory directory;
- a later child Agent could receive memory produced by another group session;
- the session memory JSON claimed a distillation whose ledger identity did not match the owning conversation;
- deleted legacy sessions could remain visible as apparently valid fleet rows.

## Implementation

### Fail-closed scheduler identity

Automatic compaction scheduling and execution now require `gcs_*`. Empty or legacy `default` identities return `legacy_default_session_rejected` before a timer, compaction, or typed-memory mutation can start.

The append hook records summaries and schedules compaction only for a concrete `gcs_*` message identity.

### Exact typed-memory target

The production auto-compaction path now computes one immutable scope:

`typedMemoryScopeId = groupId + "--" + groupSessionId`

That scope is passed to the shared distillation mutation coordinator. Topic Markdown, `MEMORY.md`, ledger, cursor, direct-memory state, artifact transaction, and fencing lock therefore remain in the owning conversation directory.

The scope is persisted in the background compaction state and returned with the compaction result for diagnostics and replay.

### Memory Center integrity gate

Memory Center now compares:

- expected `groupId--gcs_*` scope;
- background compaction scope;
- persisted log-distillation ledger scope.

Missing or mismatched proof fails the session row. Fleet counters expose observed and invalid compact scopes, and the UI shows `compact scope verified/invalid/unobserved` per session.

### Legacy cleanup

The two previously deleted `gmqbz18hj` sessions still had old session-memory JSON that identified their log distillation as bare `gmqbz18hj`. The user explicitly allowed previous sessions to be deleted, so Phase 275 removed only their non-lifecycle residuals:

- 2 group-session memory JSON files;
- 2 Session Memory artifact directories;
- 2 tool-continuity directories;
- 1 empty parent directory.

Their lifecycle heads and commit chains remain as deletion tombstones for anti-rollback auditing. They are not context sources.

## Verification

Primary test:

- `scripts/group-memory-auto-compaction-session-scope-selftest.mjs`: 12/12 passed.

It proves:

- two sessions compact successfully;
- result, background state, and ledgers bind exact session scopes;
- each session's topic files contain only its own sentinel;
- each session gets an independent `MEMORY.md`;
- no bare-group typed-memory directory is created;
- legacy execution and scheduling fail closed;
- Memory Center validates both scopes;
- raw transcripts remain isolated and unchanged.

The built-in auto-compaction test also passes all 14 checks, including micro-compact, post-compact reinjection, recovery audit, typed-memory session binding, and raw transcript preservation.

Regression suites passed:

- Memory Center session scope;
- incremental typed-memory distillation cursor;
- typed-memory multi-artifact transaction recovery;
- typed-memory session recall;
- compact-boundary journal;
- group-memory resume integration;
- direct-write model-extraction suppression.

Full frontend, Feishu MCP integration, and backend build passed. `git diff --check` reported no whitespace errors.

## Production State

- URL: `http://localhost:3081`
- PID: `31972`
- HTTP status: 200
- stderr: empty
- lifecycle heads: 2 checked, 2 valid deleted tombstones, 0 failed
- live session-memory fleet rows: 0
- legacy default rows: 0
- compact-scope invalid rows: 0
- deleted-session non-lifecycle residuals: 0
- active distillation locks: 0
- prepared artifact journals: 0
- artifact stage directories: 0
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected

## Result

Auto-compaction can no longer publish long-term memory at group-only scope. New group conversations remain independent from creation through compaction, typed-memory persistence, recall, and child Agent context delivery.

This completes Phase 275 only. The long-term Claude Code memory-parity goal remains active.
