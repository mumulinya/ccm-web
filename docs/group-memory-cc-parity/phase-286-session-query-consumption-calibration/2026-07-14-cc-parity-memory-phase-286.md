# Phase 286: Session And Query Bound Consumption Calibration

## Goal

Use the Phase 285 delivery-to-consumption evidence to improve later model-assisted memory selection without creating a popularity loop, leaking evidence across group-chat sessions, or turning historical model claims into automatic recall policy.

The selector chain is now:

`headers -> model selection -> recall -> attachment -> dispatch commit -> consumption receipt -> advisory calibration`

## Claude Code Comparison

The current Claude Code source was re-audited at:

- `D:/claude-code/src/memdir/findRelevantMemories.ts`
- `D:/claude-code/src/memdir/memoryScan.ts`
- `D:/claude-code/src/memdir/memoryShapeTelemetry.ts`

Claude Code scans up to 200 newest memory headers, excludes already surfaced files, sends filenames/descriptions and recent tools to a Sonnet side query, and records recall-shape telemetry. It does not directly promote a memory merely because a previous model said it used that memory.

CCM preserves that boundary. Historical consumption is supplied as a separate advisory section; it does not change the 200-header manifest format and cannot automatically select or suppress a document.

## Calibration Artifact

`buildGroupTypedMemoryManifestSelectorCalibration()` builds a checksummed `ccm-group-typed-memory-manifest-selector-calibration-v1` artifact.

Every artifact binds:

- exact `groupId--gcs_*` scope;
- the exact selector query checksum;
- a bounded 30-day lookback and 14-day evidence half-life by default;
- the current manifest candidate set;
- the latest valid consumption outcome per selector request;
- strong snapshot and delivery-receipt binding;
- exclusion counts and reasons;
- up to 12 body-free filename hints;
- `advisoryOnly=true`, `autoSuppression=false`, and `crossSessionReuse=false`.

The artifact is embedded in the selector decision. Its checksum is included in the decision checksum, so changing a hint, state, count, scope, or query invalidates the decision.

## Evidence Admission

Calibration admits an outcome only when:

- the decision, attached outcome, committed outcome, and consumption outcome all verify;
- the consumption outcome is strongly bound to the committed snapshot and runner delivery receipt;
- the decision query checksum exactly matches the current selector query;
- the outcome belongs to the same exact group-chat session;
- no structured receipt claimed an undelivered path;
- the evidence is inside the lookback window;
- the document is still present in the current manifest candidate set;
- the per-document state is `used`, `verified`, or `ignored`.

`unreported` deliveries never train the selector. Invalid, weakly bound, unreadable, unexpected-claim, query-mismatched, and expired outcomes are excluded with separate diagnostic counters.

## Hint Semantics

Hints are deliberately coarse:

- `support`: recent strong `used` or `verified` evidence outweighs ignored evidence.
- `caution`: at least two strong ignored outcomes outweigh useful evidence.
- `mixed`: evidence exists but is not strong enough for either conclusion.

The model prompt explicitly states that:

- a prior `support` hint is not a reason to select by itself;
- a prior `caution` hint is not a ban;
- current query, filename, description, freshness, and current-source truth remain authoritative;
- no hint may cross a group-chat session.

The selector can still choose a caution document when it is clearly useful for the current task. Stale-conflict quarantine, path conditions, already-surfaced deduplication, recent-tool noise filtering, user ignore-memory intent, and delivery budgets retain priority.

## Memory Center

Memory Center now exposes per session and fleet-wide:

- calibration-observed decisions;
- decisions that received at least one hint;
- admitted strong evidence count;
- total support, caution, and mixed hints;
- the latest decision's calibration checksum and evidence summary.

Calibration hints are operational telemetry, not Session Memory failures. A modified calibration artifact invalidates its selector decision and is then reported through existing selector-integrity gaps.

## Session And Agent Boundaries

- Calibration requires an exact group-chat Session Memory scope.
- Exact query checksum matching prevents broad topic popularity from becoming policy.
- Session B cannot use Session A consumption outcomes, even inside the same group.
- The Global Agent remains global-only and receives no group selector calibration.
- User `ignore memory` requests bypass the selector and calibration prompt.
- Old sessions remain deletion-only; no legacy `default` session is created or migrated.

## Verification

Phase 286 dedicated test:

- `scripts/group-typed-memory-manifest-selector-calibration-selftest.mjs`: 35/35 checks passed.

Coverage includes support, repeated-ignore caution, single-ignore mixed state, exact-query isolation, exact-session isolation, strong receipt admission, unreported exclusion, unexpected-claim exclusion, body non-disclosure, bounded lookback expiry, checksum tamper rejection, caution without auto-suppression, selector-request/decision checksum binding, Memory Center telemetry, ignore-memory behavior, and no legacy `default` creation.

Initial compatibility regression:

- Phase 283 manifest selector: 19/19 passed.
- Phase 284 selector delivery outcome: 30/30 passed.
- Phase 285 selector consumption closure: 32/32 passed.

Full regression and production verification:

- selector/calibration/consumption/recall/lease/WAL/Memory Center regression: 260 checks passed.
- full `npm run build`: passed.
- URL: `http://localhost:3081`
- server PID: `5844`
- root HTTP status: 200 on three consecutive post-start checks
- Memory Center overview HTTP status: 200
- lifecycle heads: 6 valid, 0 failed
- `fetch-web-mcp`, `filesystem-mcp`, and `mcp-feishu`: connected
- calibration observed/hinted/evidence/support/caution/mixed fields: present in the production Memory Center response
- active group Session Memory scopes: 0 after old-session deletion
- legacy `default` Session Memory scopes: 0
- calibration and consumption closure gaps: 0 in the clean cold state
- stderr: empty

## Long-Term Direction

Phase 286 adds guarded consumption calibration, not unconstrained reinforcement learning. The long-term Claude Code parity goal remains active. The next audit should complete recall-shape quality telemetry and long-running drift/capacity evaluation so selection quality can be measured without weakening session scope, freshness, current-source verification, or context budgets.
