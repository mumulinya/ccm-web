# Phase 284: Selector Delivery Outcome Closure

## Goal

Close the gap between a model selecting a memory filename and that memory actually reaching a third-party child-Agent session.

Phase 283 proved which metadata-only manifest entries the selector chose. Phase 284 separately proves:

- which selected documents survived recall scoring;
- which recalled documents survived the delivery capsule budget;
- which attached documents reached a dispatch commit;
- which selected documents were dropped before recall or attachment;
- which decisions or attachments became stale without completing the next stage.

Claude Code references audited for this phase:

- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/memdir/memoryShapeTelemetry.ts`

## Implementation

### Checksummed outcome artifacts

Each group-chat session now stores selector outcome artifacts under:

`.manifest-selector-outcomes/`

An `attached` outcome binds the selector decision to the final child-memory bundle. A `committed` outcome binds the same selection and attached outcome to a successful typed-memory dispatch commit.

Every outcome includes:

- exact `groupId--gcs_*` scope;
- selector request ID and selection checksum;
- query and manifest checksums;
- selected, recalled-selected, and attached-selected relative paths;
- selected-but-not-recalled and recalled-but-not-attached paths;
- delivery capsule checksum and delivery lease ID;
- task, task-Agent session, and target-project identity;
- previous attached-outcome checksum for committed events;
- its own checksum.

Unknown paths, cross-session reuse, modified arrays, selection rebinding, capsule mismatch, missing attached predecessors, and checksum changes fail verification.

### Accurate budget attribution

The final public recall bundle is already reduced to the documents that fit the delivery capsule. Phase 284 reconstructs the pre-capsule recall set from the capsule's skipped-path evidence before writing the attached outcome.

This keeps two failure modes distinct:

- `selectedNotRecalledRelPaths`: the selector chose a file that did not survive recall safety or scoring.
- `recalledNotAttachedRelPaths`: the memory was recalled but did not fit the child-Agent delivery budget.

The implementation does not inflate the delivery budget merely to make selected and attached counts match.

### Dispatch commit closure

`commitChildTypedMemoryDelivery()` writes a committed selector outcome only after:

- the delivery capsule and lease validate;
- the dispatch consume ticket validates;
- dispatch start and execution-return witnesses exist;
- the prompt binding is verified;
- the surfaced recall ledger commit succeeds.

Bundle construction alone can only produce `attached`; it cannot claim provider delivery. Repeating the same dispatch commit returns the existing committed outcome without changing its checksum.

### Orphan and retention handling

An aged selected decision without an attached outcome becomes a stale unattached gap. An aged attached outcome without a committed outcome becomes a stale uncommitted gap. The grace window prevents in-flight dispatches from being marked failed immediately.

When the 200-decision retention limit removes an old decision, its attached and committed outcomes are removed with it. Explicitly disabling selector-decision persistence also keeps outcomes ephemeral, so unmatched files are not left behind.

### Memory Center

Memory Center now distinguishes:

- selected documents;
- attached outcomes and attached selected documents;
- committed outcomes and committed selected documents;
- selected-not-recalled drops;
- recalled-not-attached budget drops;
- invalid outcomes;
- stale unattached and stale uncommitted gaps;
- decision integrity and delivery-closure validity.

An invalid or stale outcome chain becomes a Session Memory gap. A valid decision is no longer presented as proof of actual child-Agent delivery.

## Session And Agent Boundaries

- Outcome files are isolated by exact `groupId--gcs_*` scope.
- A task Agent session and delivery capsule are bound to the outcome.
- A Global Agent cannot reuse group selector outcomes and still receives global-only routing context.
- Ignore-memory calls do not invoke the selector or create outcomes.
- Legacy `default` group sessions are not created or migrated.

## Verification

Phase 284 dedicated test:

- `scripts/group-typed-memory-manifest-selector-delivery-outcome-selftest.mjs`: 30/30 checks passed.

Coverage includes two selected documents under a one-document delivery budget, accurate recall-versus-attachment attribution, attached-only state before dispatch, committed state after a real consume-ticket dispatch, idempotent commit, Memory Center telemetry, outcome tamper rejection, cross-session rejection, stale orphan detection, disabled persistence, and no legacy `default` creation.

Regression results:

- Phase 283 manifest selector: 19/19 passed.
- Session recall and deduplication: 20 passed.
- Delivery lease and budget fencing: 54 passed.
- Durable dispatch WAL and recovery: 39 passed.
- Memory Center session-scope and consumption isolation: 13/13 passed.
- Full `npm run build`: passed.

Production runtime verification after restart:

- URL: `http://localhost:3081`
- root HTTP status: 200
- Memory Center overview HTTP status: 200
- server PID: `21628`
- lifecycle heads: 4 valid, 0 fail-closed
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- selector attached, committed, committed-document, dropped-document, invalid-outcome, and closure-gap fields: present in the production Memory Center response
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- selector delivery counts: 0 in the clean cold state
- selector delivery closure gaps: 0
- stderr: empty

## Long-Term Direction

Phase 284 proves selection-to-delivery closure. The long-term Claude Code memory-parity goal remains active. The next comparison should connect committed selector delivery to the child Agent's structured `memoryUsed` and `memoryIgnored` receipt, so Memory Center can distinguish delivered, used, ignored, and unreported memories without trusting free-form claims.
