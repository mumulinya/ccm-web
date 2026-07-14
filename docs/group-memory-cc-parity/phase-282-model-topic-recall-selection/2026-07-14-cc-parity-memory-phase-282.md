# Phase 282: Model Topic Recall Selection

## Goal

Align CCM group-session memory recall with Claude Code's selective memory loading behavior:

- Select only memories that are clearly useful for the current task.
- Allow an empty result when no model-extracted Topic is relevant.
- Filter previously surfaced documents before selection.
- Keep recall bound to the exact `groupId--gcs_*` session scope.
- Treat stale memories as point-in-time observations that require current-source verification.
- Never let `forceMemory` bypass archive integrity or pending-conflict quarantine.

Claude Code references audited for this phase:

- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/memdir/teamMemPrompts.ts`
- `D:/claude-code/src/memdir/memoryTypes.ts`

## Implementation

### Topic-bound recall

`buildGroupTypedMemoryRecall()` now verifies every document produced by `auto:model-extraction-evidence-admission` against the checksummed model-extraction Topic archive. Missing, corrupt, retired, or unbound Topic data fails closed.

Each candidate receives an auditable Topic score containing:

- Topic identity and assignment version.
- Query and Topic concepts.
- Semantic similarity.
- Strong lexical matches against evidence-bound facts.
- Unclassified status and assignment confidence.
- Eligibility and score adjustment.

Normal Topic documents require either a semantic match or a strong lexical match. Unclassified Topics require a strong lexical match and cannot enter context merely because their memory type has a positive base score.

### Selection and deduplication

- Unrelated model Topics are gated before final ranking.
- Multiple files belonging to one Topic compete by score; only the highest-scoring part is selected by default.
- Different Topics remain independently selectable.
- Explicitly required paths may bypass relevance and same-Topic deduplication, but not archive integrity.
- Recall remains capped by the existing child-memory delivery budget, whose default maximum is five documents.

### Stale-conflict quarantine

Pending stale-memory candidates are excluded from automatic recall, including calls using `forceMemory`.

An explicitly required path may load a pending-conflict document for repair workflows. Its rendered child-Agent context includes:

`PENDING STALE CONFLICT / REVERIFY REQUIRED`

The warning states that the old memory is not authoritative until the current source is read and verified again.

### Diagnostics

`modelExtractionTopicScoring` now reports archive presence/validity, model document count, archive-bound count, integrity gating, evaluated/boosted/relevance-gated counts, unclassified matches, pending stale conflicts, and same-Topic duplicate suppression.

Rendered context identifies selected Topic IDs, semantic similarity or lexical evidence, stale age, and pending-conflict status.

## Session And Agent Boundaries

- Group main Agent and child project Agents use only the active `groupId--gcs_*` typed-memory scope.
- Each new third-party child-Agent session receives only the selected documents delivered by `buildAgentMemoryContextBundle()`.
- Another group chat session cannot observe these Topics.
- Ignore-memory requests still behave as an empty `MEMORY.md`.
- Global Agent group-session context boundaries are unchanged: it uses global routing context, not group conversation bodies.
- Legacy `default` sessions are deleted without migration. The production fleet purge checked three groups, found no legacy session, performed zero migrations, and reported zero failures.

## Verification

Phase 282 dedicated test:

- `scripts/group-session-model-extraction-topic-recall-selftest.mjs`: 13/13 checks passed.

Coverage includes unrelated empty recall, English and Chinese matching, unclassified gating, best-part selection, cross-Topic selection, archive tamper fail-closed, pending-conflict quarantine, explicit repair warning, exact session isolation, child bundle delivery, ignore memory, and no legacy default creation.

Regression results:

- Phase 278 model extraction typed memory: 9/9 passed.
- Phase 279 durable retry: 11/11 passed.
- Phase 280 semantic Topic lifecycle: 12/12 passed.
- Phase 281 Topic quality and rebalancing: 13/13 passed.
- Semantic reference recall: 20 passed.
- Session recall ledger: 20 passed.
- Consumption feedback: 18 passed.
- Stale candidate lifecycle: 40 passed under the new quarantine contract.
- Artifact transaction recovery: 13/13 passed.
- Memory Center session scope: 13/13 passed.
- Full `npm run build`: passed.

Production runtime verification after restart:

- URL: `http://localhost:3081`
- root HTTP status: 200
- Memory Center overview HTTP status: 200
- server PID: 31572
- lifecycle heads: 3 valid, 0 failed
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- legacy `default` Session Memory scopes in overview: 0
- stderr: empty

## Long-Term Direction

Phase 282 completes selective model-Topic recall, not the long-term Claude Code parity goal. The goal remains active for continued work on model-assisted manifest selection quality, stale-source proof ergonomics, adaptive compact/reinjection behavior, and production recall telemetry.
