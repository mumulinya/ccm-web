# Phase 189: Closure Feedback Independent Evidence Confidence

Date: 2026-07-12

## Goal

Prevent repeated receipts from one reused child-Agent session, packet, provider, or low-reliability channel from masquerading as multiple independent closure-memory feedback signals.

Only sufficiently diverse, recent and reliable evidence may lower generic recall priority. This evidence remains ranking guidance only and never grants provider, repository or session authority.

## Implemented

### Session and packet correlation

Related Phase 188 feedback is clustered when entries share either:

- the same task/native session pair; or
- the same WorkerContext packet ID.

Transitive matches are merged into one evidence cluster. The newest row becomes the representative and the cluster retains correlated session/packet identities and duplicate counts.

This means repeated scans, multiple packet wrappers around one reused session, or the same packet reported through different records contribute one independent vote.

### Receipt-source reliability

Each independent cluster receives a bounded source reliability weight.

Default examples:

- verified corrected repair receipt: `1.0`;
- timeline binding: `0.95`;
- assignment binding or task receipt: `0.9`;
- task delivery summary or direct WorkerContext receipt: `0.8`;
- group-message receipt: `0.75`;
- group-message delivery summary: `0.65`;
- timeline status-only evidence: `0.55`;
- unknown source: `0.65`.

Non-final receipt statuses receive an additional reduction. Deployments may override the source table through options, but all weights remain clamped to `0.1..1.0`.

### Independent evidence confidence

The dynamic closure summary now exposes:

- raw matching feedback count;
- independent evidence/session/packet counts;
- correlated duplicate count;
- distinct Provider and receipt-source counts;
- average source reliability;
- source-adjusted weighted evidence;
- evidence confidence and threshold.

Confidence combines source-adjusted evidence volume with independent-session, Provider and source diversity factors. The default suppression confidence threshold is `0.45`.

### Recall gating

Repeated ignored feedback lowers generic recall only when all are true:

- weighted ignored evidence reaches the Phase 188 threshold;
- ignored evidence exceeds used/verified evidence;
- at least two independent task/native sessions support it;
- evidence confidence reaches the configured threshold.

A single reused session cannot suppress recall regardless of receipt count. Low-reliability status-only evidence must accumulate enough independent weight and confidence before it affects recall.

Used/verified promotion and current noncompliant receipt repair retain their Phase 187 semantics. Every later child session must still reverify current source.

### Provider identity preservation

Feedback recording now prefers the actual receipt Agent or binding `agent_type`/provider identity before falling back to project name. This allows Provider diversity to be measured without changing provider authorization.

### Memory Center quality check

Registered:

`post_compact_completion_memory_preservation_closure_feedback_evidence_confidence`

It verifies duplicate accounting, bounded confidence/source reliability, two-session confidence before suppression, immutable archives and explicit ranking-only/no-authorization output.

## Verification

### Phase 189 end-to-end self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackEvidenceConfidenceSelfTest`

Result: 10/10 passed across three isolated groups.

Observed evidence:

- five ignored rows from one reused session collapse to one independent item, four correlated duplicates, confidence `0.1398`, no suppression;
- two reliable independent sessions produce confidence `0.5786` and may suppress generic recall;
- adding a second Provider and corrected-repair source raises confidence to `0.8454`;
- two independent status-only receipts average reliability `0.55`, confidence `0.4303`, and do not suppress;
- exact corrected-outcome recall still bypasses confident generic suppression.

The test also verifies group isolation, immutable closure archives, ranking-only behavior and no real task creation by Memory Center.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 22/22 passed.

Coverage includes provider switch and ranking boundaries, replay/metadata partial compact, partial-compact policy, PTL, ignore-memory, Phase 181-189 post-compact repair/closure/feedback flow and the existing pressure-feedback aging test.

## Invariants

- Evidence never crosses `groupId`.
- Reused session or packet events count as one independent ranking signal.
- Provider and source diversity adjust confidence only; they never authorize dispatch or repository changes.
- Provider execution history remains ranking evidence only.
- Explicit provider switches require a fresh valid receipt/checksum, local authority and task compatibility.
- Historical repair completion remains recovery evidence, not permanent repository truth.
- Historical task/native sessions never become current authority.
- Used or verified memory requires `currentSourceVerified=true`; ignored memory requires a reason.
- Every fresh child-Agent session must make its own memory-use decision.
- Aging and correlation never delete immutable feedback or closure archives.
- Exact closure identity remains recallable after generic suppression.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 190 should add contradiction-aware feedback arbitration. When independent reliable sessions disagree about used versus ignored relevance for the same task family, CCM should surface uncertainty, avoid aggressive suppression or promotion, preserve both evidence branches and request current-session verification rather than choosing a historical majority blindly.
