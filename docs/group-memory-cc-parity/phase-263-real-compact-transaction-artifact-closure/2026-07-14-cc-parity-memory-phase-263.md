# Phase 263: Real Compact Transaction Artifact Closure

## Goal

Bind every post-compact Task Agent invocation and changed-file artifact to a compact epoch produced by an actual Group Main Agent memory compaction transaction. A manually supplied epoch is no longer sufficient evidence that post-compact memory was delivered.

Historical group sessions are intentionally not migrated. Deleted or obsolete sessions may be removed and must not be restored into a new `gcs_*` session.

## Scope Boundary

- Group memory identity is `groupId + groupSessionId`.
- A compact transaction receipt is valid only for the exact group and `gcs_*` session that created it.
- Global Agent context remains global-only and does not consume group-session memory.
- Task Agent delivery is fail-closed for every non-`precompact` epoch when the compact receipt is missing, invalid, copied from another session, or checksum-mismatched.
- Raw group transcript remains the recovery source; the compact receipt proves a committed projection, not deletion of the transcript.

## Implementation

### Compact transaction receipt

`compactGroupConversationMemory` now emits `ccm-group-memory-compact-transaction-receipt-v1` after pre/post hooks, recovery audit, and cleanup audit complete.

The receipt binds:

- `group_id` and `group_session_id`
- compact boundary ID and derived `cmp_*` epoch
- summarized message range and count
- summary checksum and preserved-segment checksum
- pre/post compact token counts
- hook run identity, evidence checksum, and failure count
- recovery and cleanup audit results
- raw transcript path and committed time
- deterministic `gctr_*` receipt identity and SHA-256 receipt checksum

Receipt verification rejects invalid schema, identity, epoch, summary, preserved segment, transcript, hook failure, failed recovery/cleanup audit, cross-group use, cross-session use, and checksum drift.

### Task Agent delivery chain

The exact receipt is projected into `ccm-group-memory-context-v1`, then persisted through:

1. Task Agent memory-context snapshot
2. group-session memory binding
3. Runner memory-delivery receipt
4. durable invocation edge
5. post-compact reinjection proof
6. changed-file task artifact evidence
7. continuation soak artifact closure

For a non-`precompact` edge, reinjection can be `proven` only when receipt validity, boundary ID, receipt checksum, compact epoch, group identity, `gcs_*` identity, `tas_*` identity, snapshot, Runner request, delivery receipt, prompt binding, provider contract, and file artifact all agree.

### Report and Memory Center

The soak report is now `ccm-task-agent-continuation-soak-report-v5` and exposes `postCompactArtifactCompactTransactionReceiptMismatchCount`.

Memory Center exposes the same metric as `continuationSoakPostCompactArtifactCompactTransactionReceiptMismatchCount` and displays a `compact receipt drift` diagnostic card plus per-chain receipt drift state.

## Real Runner Proof

The real provider-version task soak now performs this sequence:

1. Execute the first external Runner turn in `precompact`.
2. Create 72 real group messages for the same `groupId + gcs_*` session.
3. Run `compactGroupConversationMemory(..., force: true)` against the real transcript file.
4. Verify the generated `gctr_*` receipt and boundary-derived `cmp_*` epoch.
5. Deliver the same verified receipt to four later external Runner turns across provider versions `1.0.0`, `2.0.0`, and `3.0.0`.
6. Prove four post-compact changed-file artifact closures.
7. Verify a cross-session receipt is rejected by the verifier and Task Agent delivery.
8. Inject a receipt-only mismatch negative control and confirm only the compact-receipt mismatch metric increases.

## Verification

- `npm run check`: pass
- `npm run build`: pass
- invocation-lineage self-test: pass
- continuation soak restart self-test: pass, 41 checks
- provider contract/version soak: pass, 58 checks
- real external Runner artifact soak: pass, 146 checks and 5 turns
- compact integration, recovery audit, cleanup audit, and hook self-tests: pass
- production overview API: HTTP 200, soak schema v5, compact receipt mismatch metric present
- production server: `http://localhost:3081`, PID 31708, stderr 0 bytes
- desktop UI QA: 1440 x 1000, metric present, no page overflow
- mobile UI QA: 390 x 844, metric present, no page or metric-card overflow
- browser console: 0 errors

## Result

Post-compact continuity is no longer inferred from an arbitrary epoch string. It is closed against a real, session-scoped compaction transaction and the exact receipt must survive through memory injection to the resulting code artifact.
