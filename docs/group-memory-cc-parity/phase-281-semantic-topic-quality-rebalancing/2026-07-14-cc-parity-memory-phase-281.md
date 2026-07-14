# Phase 281: Semantic Topic Quality And Rebalancing

## Status

Completed on 2026-07-14.

Phase 280 introduced deterministic semantic topic lifecycle management. Phase 281 improves assignment quality for mixed Chinese and English memory, isolates facts without enough semantic signal, upgrades old topic concepts and preserves assignment provenance across later commits.

## Claude Code Reference

Compared against:

- `D:/claude-code/src/services/extractMemories/prompts.ts`
- `D:/claude-code/src/services/extractMemories/extractMemories.ts`
- `D:/claude-code/src/memdir/memoryTypes.ts`

Claude Code gives its extraction subagent the existing memory manifest and explicitly requires it to update an existing semantic file instead of writing a duplicate. The subagent can use model semantics to recognize equivalent concepts across wording and language.

CCM retains its stricter boundary: the model can propose only evidence-bound facts and cannot choose files or paths. Therefore the deterministic topic layer must provide equivalent duplicate avoidance and lifecycle quality itself.

## Canonical Concepts

Topic extraction now normalizes text with Unicode NFKC and treats `_` and `-` as semantic word boundaries. A bounded bilingual domain vocabulary maps Chinese and English variants to stable canonical concepts, including:

- database, backup and retention;
- frontend and accessibility;
- testing and deployment;
- security and authentication;
- API, performance and logging;
- memory, context, compression and session;
- Agent, documentation and Git.

Canonical concepts are combined with bounded lexical identifiers. Similarity uses canonical overlap, overlap coefficient and Jaccard score. A single incidental shared token is no longer enough to merge unrelated topics.

## Confidence And Unclassified Topics

Every active fact receives a deterministic concept profile and confidence score. Facts below the minimum assignment confidence do not create hash-named topic files. They enter one bounded category-specific topic:

- `met_user_unclassified`
- `met_feedback_unclassified`

These facts remain fully evidence-bound, checksummed and recallable. Unclassified means the routing signal is weak, not that the fact is untrusted.

Unclassified and consolidated topics both count toward the 40-topic category limit. Capacity rebalancing reserves room for both buckets and cannot exceed the configured topic cap.

## Assignment Provenance

Each fact now stores `topicAssignment` with:

- assignment schema and algorithm version;
- strategy and initial strategy;
- confidence and similarity score;
- low-confidence state;
- normalized concepts;
- cross-language reuse evidence;
- rebalanced state and prior topic ID;
- first and latest assignment timestamps.

Cross-language reuse and historical rebalancing provenance survive later stable commits. Memory Center therefore reports current archive history rather than only the latest assignment event.

Cross-language reuse requires both canonical semantic overlap and a real dominant-script transition between Latin and CJK text. Different wording inside one language does not inflate the cross-language counter.

## Historical Rebalancing

On the next successful typed-memory commit, existing topic concepts are normalized to the current canonical vocabulary. Active fact text enriches its previous topic before duplicate detection.

This allows old English and Chinese topics for the same concept to merge into the older canonical topic. Facts pointing to a merged or low-confidence historical topic are reassigned deterministically. Retired and previously merged topics cannot become similarity candidates again.

All Markdown changes, retired file deletion, archive updates and `MEMORY.md` regeneration remain inside the shared typed-memory artifact transaction.

## Memory Center

The Session Memory fleet now exposes per-session and overall counters for:

- unclassified facts;
- low-confidence assignments;
- rebalanced facts;
- cross-language topic reuse.

The frontend adds a `topic quality` metric beside semantic topic lifecycle counters.

## Invariants

- Scope remains exactly `groupId--gcs_*`.
- Another group session cannot read or recall topic facts.
- The global Agent receives global context only.
- Topic filenames and paths remain system-controlled.
- Low-confidence routing never weakens evidence admission.
- Topic assignment is independent of object insertion order.
- Legacy `default` sessions are not migrated or created.

## Verification

New focused test:

`npm run test:group-session-model-extraction-topic-quality`

Result: 13/13 checks passed.

Covered behavior:

- Chinese and English database backup facts reuse one topic;
- unrelated frontend accessibility memory stays separate;
- weak Chinese and English facts share one unclassified topic;
- unclassified Markdown keeps raw-message evidence bindings;
- every active fact carries auditable assignment provenance;
- object insertion order does not change topic identity;
- provenance survives a later stable commit;
- old bilingual topics merge and rebalance;
- unclassified and consolidated buckets remain inside the topic cap;
- bilingual topic content is recallable;
- another `gcs_*` session cannot observe the facts;
- Memory Center counters match the checksummed archive;
- no legacy `default` session is created.

Regression results:

- Phase 278 typed-memory closure: 9/9;
- Phase 279 durable retry: 11/11;
- Phase 280 semantic lifecycle: 12/12;
- fact supersession: 13/13;
- artifact transaction recovery: 13/13;
- shared ledger mutation coordination: 15/15;
- Memory Center session scope: 13/13.

Full `npm run build` passed for frontend, MCP Feishu and backend.

Runtime deployment verification:

- URL: `http://localhost:3081`
- HTTP status: `200`
- server PID after restart: `2904`
- Memory Center overview exposes unclassified, low-confidence, rebalanced and cross-language counters
- lifecycle heads: 2 valid, 0 failed
- legacy `default` Session Memory scopes: 0
- `fetch-web-mcp`, `filesystem-mcp` and `mcp-feishu`: connected
- stderr: empty

## Main Files

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-session-model-extraction-topic-quality-selftest.mjs`
- `package.json`

## Next Direction

The long-term Claude Code parity goal remains active. The next comparison should audit recall-side manifest selection and stale-memory verification: semantic topic quality now improves storage, but worker context selection must prove that the best current topic is loaded under tight model budgets without promoting stale or conflicting facts.
