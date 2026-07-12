# Phase 190: Closure Feedback Conflict Arbitration

Date: 2026-07-12

## Goal

Handle reliable independent child-Agent sessions that disagree about whether the same closure memory is useful for the same task family.

CCM must not blindly follow historical majority counts. It must preserve both evidence branches, neutralize automatic promotion/suppression and require the current child session to re-read current source before making its own `memoryUsed` or `memoryIgnored` decision.

## Implemented

### Contradiction detection

Conflict arbitration consumes the Phase 189 independent, deduplicated, task-family-relevant, age-decayed and source-weighted evidence clusters.

Only compliant rows participate:

- positive branch: `used` or `verified`;
- negative branch: `ignored` with a reason.

Each branch preserves:

- independent entry/session/packet counts;
- weighted evidence and branch confidence;
- Provider and receipt-source identities;
- entry IDs and task/native session IDs.

### Conflict thresholds

Default activation requires:

- both branches have at least one independent session;
- both branches have weighted evidence of at least `0.6`;
- minority-to-majority evidence ratio is at least `0.25`.

The thresholds are configurable. Stale or low-reliability opposition that falls below branch weight does not create a false conflict.

### Neutral arbitration

An active conflict returns:

`surface_conflict_reverify_current_session`

Arbitration state:

`contradictory_reverify_current_session`

Policy:

- no automatic historical promotion;
- no automatic generic recall suppression;
- historical majority cannot authorize a decision;
- both branches remain immutable audit evidence;
- the current new child session must inspect current source and decide independently.

Current noncompliant receipt repair remains higher priority than contradiction arbitration.

### WorkerContext propagation

The post-compact closure receipt contract now carries:

- conflict active state;
- arbitration state;
- conflict ratio;
- positive and ignored branch weights;
- current-session verification requirement;
- `historical_majority_authorization_allowed=false`.

WorkerContext acceptance adds a dedicated conflict verification requirement. Rendered context explicitly tells the third-party child Agent that historical majority cannot choose `memoryUsed` or `memoryIgnored` for the current session.

### Memory Center quality check

Registered:

`post_compact_completion_memory_preservation_closure_feedback_conflict_arbitration`

It verifies dual-branch preservation, neutral recommendation, unsuppressed recall, WorkerContext contract/acceptance propagation, rendered current-session instructions, immutable archives and no historical-majority authority.

## Verification

### Phase 190 end-to-end self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackConflictArbitrationSelfTest`

Result: 10/10 passed across three isolated groups.

Observed arbitration:

- one verified session versus three ignored sessions;
- positive weighted evidence `0.9`;
- ignored weighted evidence `2.7`;
- conflict ratio `0.3333`;
- recommendation `surface_conflict_reverify_current_session`;
- generic closure recall remains active;
- WorkerContext requires current-session source verification.

Control groups prove that consistently ignored evidence still uses the Phase 189 confidence gate and that stale positive opposition does not create a false conflict.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 23/23 passed.

Coverage includes provider switch/ranking boundaries, replay and metadata partial compact, partial-compact policy, PTL, ignore-memory, Phase 181-190 post-compact repair/closure/feedback flow and existing pressure-feedback aging.

## Invariants

- Conflict evidence never crosses `groupId` or task family.
- Only compliant, independent and weighted evidence participates in arbitration.
- Both used/verified and ignored branches remain auditable.
- Historical majority is ranking evidence only and cannot authorize a current decision.
- Provider execution history remains ranking evidence only.
- Explicit provider switches require a fresh valid receipt/checksum, local authority and task compatibility.
- Historical repair completion remains recovery evidence, not permanent repository truth.
- Historical task/native sessions never become current authority.
- Every fresh child-Agent session must independently return `memoryUsed` or `memoryIgnored`.
- Used or verified requires `currentSourceVerified=true`; ignored requires a reason.
- Conflict arbitration never deletes immutable feedback or closure archives.
- Exact closure identity remains recallable.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 191 should persist the current-session conflict resolution as a typed arbitration outcome. A newer compliant session may resolve a conflict for that task family, but the resolution must be session-bound, current-source verified, reversible if later reliable contradictions appear, and unable to erase either historical branch.
