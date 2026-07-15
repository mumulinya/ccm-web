# Phase 299: Provider Compact Generation Reset

## Status

- Date: 2026-07-15
- Result: completed
- Scope: exact group-session Provider compact generation, post-compact reset, stale-response fencing, Memory Center visibility
- Long-term goal: remains active

## Claude Code parity source

Claude Code treats compact as a session-state boundary rather than only a shorter transcript:

- `D:\claude-code\src\services\compact\postCompactCleanup.ts:13-76` centralizes cleanup for automatic and manual compact paths.
- `D:\claude-code\src\constants\systemPromptSections.ts:61-67` clears system-prompt state and beta-header latches on `/clear` and `/compact`.
- `D:\claude-code\src\bootstrap\state.ts:1741-1744` defines beta-header latches as compact-scoped state.
- `D:\claude-code\src\services\api\claude.ts:1407-1409` keeps context-management beta state sticky only for the current session generation.

CCM already persisted Provider capacity outcomes by exact `groupId + gcs_* + tas_* + nativeSessionId`, but it did not invalidate an in-flight response created before a successful primary compact. A late response could therefore recreate pre-compact token credit or relatch context-management beta state after the transcript boundary had advanced.

## Implementation

### Monotonic exact-session generation

`provider-native-compact-session-capacity.ts` now stores a checksummed, monotonic `generation` for each exact `groupId + gcs_*` capacity ledger.

- Generation starts at 1.
- A successful primary compact with a real boundary advances it once.
- Reset clears Provider-session capacity baselines, pending outcomes, and sticky beta state.
- `last_reset` and bounded `reset_history` preserve body-free audit evidence.
- Another group session keeps its own generation and cannot observe the reset.

`getProviderNativeCompactSessionGenerationFence()` exposes the current generation, last reset identity, ledger checksum, and exact Provider-session identity for child-Agent context construction.

### Stale outcome fencing

Provider execution receipts now carry `capacity_generation`. Receipt verification binds this field when an expected generation is supplied.

`recordProviderNativeCompactSessionOutcome()` compares the receipt generation with the current ledger generation before it can mutate session capacity:

- older generation: reject as `stale_generation_after_compact_reset`
- future generation: reject as `future_generation_not_observed`
- current generation: permit normal strong-outcome processing

Rejected outcomes enter a bounded, checksummed, body-free audit list. They cannot restore cleared-token credit, a post-edit input baseline, pending outcome state, or sticky beta.

### Dispatch and compact lifecycle binding

The native apply plan now carries:

- `providerSessionCapacityGeneration`
- `provider_session_capacity_generation`
- `providerSessionGenerationFence`

Every child-Agent context build reads the latest fence. Both automatic compaction and Memory Center manual compaction use `runGroupMemoryAutoCompactionNow()`, and only a successful primary compact that produced a real boundary invokes `resetProviderNativeCompactSessionCapacity()`.

Partial-sidecar-only maintenance does not reset the Provider generation because it creates no primary transcript boundary. A new group chat session naturally receives a new `gcs_*` scope, while session deletion removes its capacity ledger.

Raw transcripts and typed `MEMORY.md` documents are not rewritten by generation reset.

### Memory Center

The group-session compact view now exposes a `Provider Compact Session Capacity` panel with:

- current generation and reset identity
- exact Provider-session count and sticky beta count
- pending strong outcomes and latest cleared tokens
- reset and stale-fence counts
- per-session effective capacity baseline
- rejected outcome generation compared with the current generation

Responsive QA found that the mobile single-column grid still allowed `.detail-panel` to keep its intrinsic minimum width. `min-width: 0`, mobile `minmax(0, 1fr)`, breakable ledger paths, and a stacked mobile discipline header now prevent the Provider panel from being clipped by long Windows paths.

## Regression evidence

- Phase 299 generation reset: 12/12
- Phase 298 Provider session capacity: 14/14
- Phase 296/297 Provider execution and response outcome: 21/21
- Phase 293 resume effective-token integration: 12/12
- Phase 294 durable snip replay: 11/11
- Phase 295 compact restart soak: 11/11
- Phase 292 exact-session compaction hook isolation: 25/25
- Multi-session auto compaction scope: 12/12
- Global Agent global-only context: 13/13
- `git diff --check` for Phase 299 source files: passed
- Final `npm run build`: passed

The generation selftest proves generation 1 capacity use, a real primary compact advancing generation 2, reset of derived Provider-session state, rejection of a delayed generation 1 outcome, fresh generation 2 capacity use, cross-session isolation, restart round-trip persistence, Memory Center exposure, and body-free ledgers.

## Visual evidence

The production Memory Center was inspected with an isolated exact-session fixture containing generation 2, one reset, one current Provider session, and one fenced generation 1 outcome.

- Desktop viewport: 1440 x 1000
- Mobile viewport: 390 x 844
- Desktop panel width: 795.6 px; no article overlap or overflow
- Mobile workspace/detail width: 363.2 px
- Mobile Provider panel width: 308 px; no horizontal overflow or article overlap
- Browser console warnings/errors: 0
- Temporary fixture memory, manifest, capacity ledger, lifecycle head, and lifecycle commit: removed after QA

## Production evidence

- URL: `http://localhost:3081`
- Production PID: `17744`
- Home responses: three consecutive HTTP 200
- Memory Center overview: HTTP 200
- stderr size: 0 bytes
- Logs: `C:\Users\admin\.cc-connect\logs\ccm-server-phase299.log`
- Error log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase299.err.log`

## Remaining parity work

Phase 299 closes normal-operation generation reset and late-response replay. The long-term parity goal remains active. The next audit should verify crash consistency between durable primary-boundary commit and capacity-generation reset, so a process exit in that narrow window cannot leave a committed compact boundary paired with the previous Provider generation.
