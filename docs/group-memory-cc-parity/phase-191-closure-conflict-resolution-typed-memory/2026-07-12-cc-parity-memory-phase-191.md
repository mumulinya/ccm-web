# Phase 191: Closure Conflict Resolution Typed Memory

Date: 2026-07-12

## Goal

Persist a current child-Agent session's valid Phase 190 conflict decision as reversible, task-family-scoped typed MEMORY.md.

The resolution must be bound to the exact current task/native session, preserve both historical conflict branches, require future current-source verification and reopen when newer reliable opposing evidence appears.

## Implemented

### Strict resolution receipt capture

The existing post-compact `memoryUsed`/`memoryIgnored` receipt validator now recognizes a conflict-resolution request only when the WorkerContext contract contains:

- active closure feedback conflict;
- current-session verification requirement;
- `historical_majority_authorization_allowed=false`.

The persisted feedback row keeps:

- task-family identity;
- resolving packet, binding, execution and task/native session;
- used/verified/ignored state;
- current-source verification or ignored reason;
- parent conflict state, fingerprint, ratio and branch weights;
- reversible and historical-branch preservation flags.

An explicitly invalid validator result is authoritative. Semantic field fallback can no longer turn `compliant=false` into a valid resolution.

### Automatic typed-memory distillation

New archive:

`postCompactCompletionMemoryPreservationClosureConflictResolutionArchive`

New document:

`post-compact-completion-memory-preservation-closure-conflict-resolutions.md`

Every valid resolution automatically calls:

`distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory`

Distillation is idempotent, group-isolated and included in the archive-preservation whitelist so later long-log compaction cannot overwrite it.

### Resolution semantics

A newest valid resolution produces one of:

- `resolved_conflict_promote_but_reverify_future_session`
- `resolved_conflict_neutral_reverify_future_session`

Used or verified may guide future promotion after current-source verification. An ignored resolution remains neutral rather than turning one resolving session into a global suppression vote.

Both remain ranking evidence only.

### Reversible reopening

The resolution stores its timestamp and session identity. Newer reliable independent evidence with the opposite usage state is measured after that boundary.

When later opposing weight reaches the conflict branch threshold:

- resolution state becomes `reopened_by_later_reliable_opposition`;
- resolution remains archived;
- both historical branches remain archived;
- conflict arbitration becomes active again;
- recommendation returns `surface_conflict_reverify_current_session`.

### Future WorkerContext recall

For the same task family, future child sessions receive both:

- closure history MEMORY.md;
- conflict-resolution MEMORY.md.

The receipt contract carries resolution entry/state/session/reversible fields. Acceptance requires resolution reverification in the new session. Historical resolving sessions are evidence only and never become current authority.

Contract extraction is now idempotent: passing an already normalized receipt-memory contract through rendering preserves every conflict and resolution field.

### Memory Center quality check

Registered:

`post_compact_completion_memory_preservation_closure_conflict_resolution`

It validates exact session binding, automatic archive/doc creation, future recall and WorkerContext propagation, ignored/used receipt discipline, reversible reopening and historical-branch preservation.

## Verification

### Phase 191 end-to-end self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionSelfTest`

Result: 10/10 passed across three isolated groups.

It proves:

- wrong task/native session cannot create a resolution;
- valid verified resolution is session-bound and promotes with future reverification;
- valid ignored resolution remains neutral;
- repeated receipt scans are idempotent;
- typed MEMORY.md is automatically created and recalled;
- future WorkerContext contains resolution identity and acceptance requirements;
- both historical branches remain present;
- later reliable opposition reopens conflict;
- Memory Center creates no real child-Agent task.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 24/24 passed.

Coverage includes provider switch/ranking boundaries, replay and metadata partial compact, partial-compact policy, PTL, ignore-memory, Phase 181-191 post-compact repair/closure/feedback flow and existing pressure-feedback aging.

## Invariants

- Resolution never crosses `groupId` or task family.
- Explicit validator `compliant=false` cannot be overridden by semantic fallback.
- Resolution requires the exact current task/native session.
- Used or verified requires `currentSourceVerified=true`; ignored requires a reason.
- Resolving session IDs are historical evidence in every future session.
- Both conflict branches remain immutable and auditable.
- Resolution is reversible and later reliable opposition can reopen conflict.
- Resolution and provider history are ranking evidence only, never authorization.
- Explicit provider switches require a fresh valid receipt/checksum, local authority and task compatibility.
- Historical repair completion remains recovery evidence, not permanent repository truth.
- Exact closure identity remains recallable.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 192 should preserve conflict-resolution typed memory through all compact strategies and post-compact reinjection retries. It must verify memory-first, replay partial, metadata partial and PTL downgrade behavior, including resolution archive/doc identity, reopened state and current-session receipt requirements after another compaction boundary.
