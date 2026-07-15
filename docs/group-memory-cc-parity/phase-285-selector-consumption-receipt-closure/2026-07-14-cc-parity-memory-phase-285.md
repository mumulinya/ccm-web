# Phase 285: Selector Consumption Receipt Closure

## Goal

Close the evidence gap between typed memory being committed to a third-party child-Agent prompt and the child Agent actually reporting how each delivered `MEMORY.md` document affected its work.

Phase 284 proved `selected -> recalled -> attached -> committed`. Phase 285 extends the chain to:

`selected -> recalled -> attached -> committed -> receipt-bound consumption`

The final stage distinguishes delivered, used, verified, ignored, unreported, weakly bound, unexpected, and stale-without-receipt states. It does not infer successful memory use from delivery alone or from free-form model language.

Claude Code references retained for this parity direction:

- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/memdir/memoryShapeTelemetry.ts`

## Implementation

### Consumption outcome artifacts

Each exact group-chat session stores immutable consumption outcomes under:

`.manifest-selector-consumption/`

An outcome binds all of the following:

- exact `groupId--gcs_*` scope;
- selector request, selection checksum, capsule checksum, and committed outcome checksum;
- task ID, task-Agent session ID, and target project;
- memory-context snapshot ID and checksum;
- runner delivery-receipt checksum;
- the complete set of attached selector document paths;
- per-document usage state and evidence tier;
- structured receipt claims for paths that were not delivered;
- its own checksum.

Consumption verification reloads the decision, attached outcome, and committed outcome from disk. A consumption file cannot cross sessions, rebind to another selector request, omit an attached document, add an unattached document, or survive checksum tampering.

### Per-document receipt semantics

For every surfaced selector document, the durable outcome records one of:

- `used`: the child Agent explicitly used the memory.
- `verified`: the child Agent used or checked it and CCM independently recomputed a matching current-source file checksum.
- `ignored`: the child Agent explicitly declined to use it and supplied a reason.
- `unreported`: the document reached the child Agent, but no valid per-path declaration was returned.

A child-Agent `verified` claim without `system_current_source_file_proof` is downgraded to `used` and retains the `verified_without_system_current_source_proof` anomaly. `memoryUsed` and `memoryIgnored` remain accepted as weaker text evidence, while structured `typedMemoryUsage` is the primary contract.

Claims for a `relPath` outside the committed attachment set are retained as `unexpectedClaimedRelPaths` and fail closure. They never create a consumption row for an undelivered memory.

### Production task completion path

`buildDeliverySummary()` now writes selector consumption outcomes immediately after the existing typed-memory consumption ledger is built. It passes the exact group-session scope, task/project identity, normalized consumption rows, and durable receipt evidence.

The delivery summary exposes:

- newly recorded and idempotently reused outcome counts;
- skipped outcome count;
- complete outcome evidence for task diagnostics.

Repeated summary construction is idempotent for the same selector request, snapshot, delivery receipt, and receipt evidence.

### Child-Agent contract

The child-Agent development contract and rendered memory packet now explicitly require `typedMemoryUsage` to cover every surfaced `MEMORY.md` `relPath` with `used`, `verified`, or `ignored` plus a reason.

The contract also states:

- paths that were not delivered must not be claimed;
- `verified` requires platform-recomputable `currentSourceEvidence`;
- the child Agent may propose stale-memory repair but cannot directly rewrite long-term memory.

### Memory Center

Memory Center now reports per session and fleet-wide:

- consumption outcome and delivered-document counts;
- used, verified, ignored, and unreported document counts;
- weak snapshot/delivery-receipt bindings;
- unexpected path claims;
- committed deliveries that became stale without a consumption receipt;
- consumption closure gaps and closure validity.

Invalid artifacts, weak bindings, unreported documents, unexpected claims, and stale committed deliveries become Session Memory gaps. The UI displays delivery closure and consumption closure separately.

## Session And Agent Boundaries

- Consumption files require an exact `groupId--gcs_*` scope.
- Task-Agent session, snapshot, receipt, selector, and project identities must agree.
- Multiple group chats and multiple sessions inside one group remain isolated.
- Global Agent context remains global-only and does not consume group-chat selector receipts.
- User `ignore memory` requests skip selector execution and create no consumption obligation.
- Old sessions are deleted rather than migrated; legacy `default` sessions are not created.

## Closure Rules

Consumption closure passes only when:

- every persisted outcome verifies;
- every attached document has exactly one per-path state;
- snapshot and delivery-receipt evidence match the committed dispatch;
- no receipt claims an undelivered path;
- no committed delivery has aged past the grace period without a receipt.

`unreported` is observable and is a closure gap. Delivery is therefore never presented as proof that the model used the memory.

## Verification

Phase 285 dedicated test:

- `scripts/group-typed-memory-manifest-selector-consumption-selftest.mjs`: 32/32 checks passed.

Coverage includes used, ignored, strongly verified, unproved-verified downgrade, unreported, unexpected path claims, snapshot and delivery-receipt binding, idempotency, tamper rejection, complete attachment coverage, cross-session rejection, stale committed-without-consumption detection, Memory Center telemetry, ignore-memory behavior, production call-site and contract presence, and no legacy `default` creation.

Regression results:

- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 283 manifest selector: 19/19 passed.
- Typed-memory consumption feedback: 18 passed.
- Session recall and deduplication: 20 passed.
- Delivery lease and budget fencing: 54 passed.
- Durable dispatch WAL and recovery: 39 passed.
- Memory Center session-scope and consumption isolation: 13/13 passed.
- Full `npm run build`: passed.

Production runtime verification after restart:

- URL: `http://localhost:3081`
- root HTTP status: 200
- Memory Center overview HTTP status: 200
- server PID: `28140`
- lifecycle heads: 5 valid, 0 failed
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- selector consumption outcome, delivered, used, verified, ignored, unreported, weak-binding, unexpected-claim, stale-without-receipt, closure-gap, and invalid-session fields: present in the production Memory Center response
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- selector consumption counts and closure gaps: 0 in the clean cold state
- stderr: empty

## Long-Term Direction

Phase 285 proves delivery-to-consumption receipt closure. The long-term Claude Code memory-parity goal remains active. A later phase should use accumulated consumption outcomes to improve selector calibration and memory quality without allowing popularity feedback to override exact session scope, freshness, current-source truth, user ignore-memory intent, or delivery budgets.
