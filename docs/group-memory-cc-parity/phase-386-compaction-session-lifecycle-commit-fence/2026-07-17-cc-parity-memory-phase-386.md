# Phase 386: Compaction session lifecycle commit fence

Date: 2026-07-17

## Goal

Prevent a long-running Group Main Agent compaction from committing memory, typed-memory distillation, a compact head, or failure state after its exact `gcs_*` conversation has been archived or deleted.

This closes a race specific to CCM's multi-conversation architecture:

```text
compact starts on active lifecycle generation N
-> model summary request waits
-> user archives or deletes the conversation
-> lifecycle advances to generation N+1
-> old model response returns
-> stale compact must not commit
```

The Global Agent remains global-context-only. No Global Agent memory is introduced into the group-session fence.

## Claude Code source audit

The current local Claude Code source was re-audited at:

- `D:\claude-code\src\services\compact\compact.ts`;
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`;
- `D:\claude-code\src\QueryEngine.ts`.

Claude Code keeps its remote session alive during a long compaction API request, propagates the compact abort controller into the summarizer path, and does not treat the eventual response as detached from the live session.

CCM Phases 321-335 already cover the other audited post-compact state:

- child task status;
- file restore deduplication;
- invoked skills;
- current plan and plan mode;
- tool, Agent, and MCP context deltas;
- loaded tool state;
- message ordering;
- compact lineage;
- Session Memory-first selection;
- post-compact state reset and cache attribution.

The remaining CCM-specific gap was lifecycle invalidation while the model request was in flight. An in-process `Set` prevented duplicate work in one server process, but it did not prove that the owning group conversation still existed when the result committed.

## Lifecycle binding

`runGroupMemoryAutoCompactionNow()` now binds the active lifecycle head before any compact work starts:

- exact `groupId`;
- exact `gcs_*` ID;
- lifecycle generation;
- lifecycle status;
- lifecycle head ID;
- lifecycle head checksum.

An archived, deleted, corrupt, or missing lifecycle cannot start a new compact.

The binding is passed into the production compaction engine and revalidated at four mutation boundaries:

1. before PreCompact hooks;
2. after the model summary request returns;
3. before PostCompact hooks;
4. after PostCompact hooks.

The stale error uses `GROUP_COMPACTION_SESSION_LIFECYCLE_STALE` and is not downgraded into an ordinary model-summary fallback.

## Atomic commit fence

`withGroupSessionLifecycleCommitFence()` acquires the same lifecycle-head file lock used by archive, restore, and delete transitions. Inside that lock it revalidates the original generation and performs the synchronous final commit sequence:

- typed-memory distillation;
- compact head commit;
- Provider-native compact reset;
- post-compact session reset;
- prompt-cache notification;
- memory save;
- circuit-breaker success update.

The ordering provides two valid outcomes:

- compact obtains the lock first, commits, then archive/delete advances lifecycle and cleanup removes the session artifacts;
- archive/delete obtains the lock first, advances lifecycle, and the old compact is rejected before any final write.

The stale error branch does not save degraded memory and does not recreate an auto-compact circuit-breaker sidecar for a deleted conversation.

## Durable proof

Every successful compact now stores a body-free, checksummed proof:

```text
ccm-group-compaction-session-lifecycle-commit-proof-v1
```

The proof binds:

- exact group and conversation;
- active lifecycle generation and head checksum;
- compact boundary ID;
- compact transaction receipt checksum;
- `current_active` validation status;
- commit timestamp.

It is attached to the compact boundary and group-session memory and survives restart. A forged generation, changed boundary, changed transaction checksum, or proof checksum fails verification.

## Memory Center

Memory Center now exposes `Compaction Session Lifecycle Fence` for the selected group conversation. It shows:

- generation and lifecycle status;
- exact boundary;
- exact `gcs_*` identity;
- compact transaction binding;
- body-free policy;
- proof checksum validity.

Another conversation in the same group cannot satisfy or contribute this proof.

## Verification

Phase 386 command:

```text
npm run test:group-compaction-session-lifecycle-fence-restart
```

Result: `32/32`.

The two-process test uses a local OpenAI-compatible HTTP fixture and exercises the real model-compaction request. It proves:

- deletion occurs while the HTTP request is in flight;
- the returned response cannot recreate memory, compact head, or circuit-breaker state;
- the deleted lifecycle tombstone survives restart;
- archive occurs while a separate HTTP request is in flight;
- archived memory remains byte-for-byte unchanged;
- an active sibling conversation in the same group compacts normally;
- the successful lifecycle proof verifies and survives restart;
- Memory Center reports the proof as verified;
- forged lifecycle generations are rejected.

Compatibility regression:

- Phase 320 compaction summary input projection: `21/21`;
- Phase 295 compact restart soak: `11/11`;
- Phase 275 auto-compaction exact-session scope: `12/12`;
- Phase 332 post-compact session reset: `14/14`;
- Phase 265 Task Agent lifecycle fence: `31/31`;
- Phase 264 compact-head fence: `38/38`;
- Phase 292 compact-hook session isolation: `27/27`.

Compatibility total: `154/154`.

Phase 376-386 focused memory chain: `597/597`.

Targeted memory checks through Phase 386: `1453/1453`.

Engineering verification passed:

- backend TypeScript build;
- frontend production build;
- MCP Feishu TypeScript build;
- `check:split` and split export ordering;
- all factory dependency checks;
- GroupChat binding check: `240` resolved bindings.
- documentation links: `1072/1072`.

The Phase 320 fixture was updated to explicitly disable Session Memory-first selection and exceed the current preserved-window budget. This keeps that test authoritative for its stated model-summary input path after later Session Memory and frontend module-splitting changes.

## Production state

No real Claude Code, Codex, Cursor, Anthropic, or OpenAI model call was executed. All model waits and race transitions use a local deterministic HTTP fixture.

The long-term Claude Code parity goal remains active.
