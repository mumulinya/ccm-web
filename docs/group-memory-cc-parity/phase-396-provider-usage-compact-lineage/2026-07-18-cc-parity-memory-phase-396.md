# Phase 396: Provider usage compact lineage

Date: 2026-07-18

## Goal

Stop a Provider-observed preflight baseline from calibrating a prompt after the exact group-chat memory has been replaced by manual, Session Memory, or other non-reactive compaction. The baseline may continue across ordinary turns in the same compact lineage, but it must not cross a compact epoch or durable compact-head transition.

The scope remains:

```text
groupId + gcs_* + taskId + tas_* + provider + model + runtime identity
        + compact epoch + durable compact head
```

## Claude Code reference

Claude Code's `tokenCountWithEstimation()` in `D:/claude-code/src/utils/tokens.ts:230` anchors the current count to the latest API response still present in the active message array and estimates messages added after it.

Compaction replaces that message lineage. `D:/claude-code/src/services/compact/compact.ts:332` constructs the new post-compact message array from the boundary marker, summary messages, preserved messages, attachments, and hook results. `D:/claude-code/src/services/compact/autoCompact.ts:294` and `:323` reset the prior summarized-message cursor because Session Memory pruning or legacy compaction removes the old message UUID from the new array.

The equivalent CCM invariant is that Provider usage from the old compact lineage cannot remain authoritative after the group-session prompt source has been replaced.

## Source lineage proof

Every ready `ccm-final-dispatch-provider-usage-baseline-v1` now records:

- `source_compact_epoch`;
- `source_compact_head_id`;
- `source_compact_head_generation`;
- `source_compact_head_checksum`;
- `source_memory_binding_checksum` as historical source-snapshot evidence.

The source values come from the checksum-protected `group_session_memory_binding` attached to the exact task-Agent snapshot that produced the Provider usage receipt.

A precompact baseline requires `source_compact_epoch = precompact` and a source binding checksum. A post-compact baseline additionally requires a valid `cmp_*` epoch and a non-empty durable compact head with generation greater than zero.

## Reuse rule

Production dispatch reuses the baseline only when the current task snapshot has the same:

```text
compact epoch
compact head ID
compact head generation
compact head checksum
```

The source memory-binding checksum is retained as evidence but is not an equality fence for later turns. This is intentional: ordinary messages and memory updates in the same compact lineage are analogous to Claude Code's messages added after the latest API response and must not discard calibration merely because a new snapshot was rendered.

When compact epoch or head changes, production omits the old baseline and builds the next gate from `estimated_final_prompt`. If stale evidence is explicitly injected into a gate, exact-lineage verification fails closed before a Provider call.

Final-dispatch reactive compact does not advance the group compact epoch, so it continues carrying the valid baseline while reducing the current prompt. Manual and non-reactive group compaction do advance the durable lineage and therefore invalidate the old calibration.

## Integrity versus staleness

Memory Center inventory now distinguishes two states:

- `invalid`: the persisted baseline's checksum, schema, source fields, or exact `group + gcs_* + task + tas_*` identity is corrupt;
- `stale_after_compact`: the historical baseline is internally valid, but its compact epoch/head no longer matches the current snapshot.

`invalid` remains a hard gap and fails closed. `stale_after_compact` is a warning, contributes zero positive bias, and reports `estimated_final_prompt` for next preflight. The old body-free measurement remains available for historical audit without being used as current capacity authority.

Provider/model/contract/runtime changes continue to produce the Phase 395 stale-identity behavior. Sibling `gcs_*` and `tas_*` sessions cannot inherit either the baseline or its compact lineage. The Global Agent remains global-context-only.

## Verification

Phase 396 command:

```text
npm run test:final-dispatch-provider-usage-compact-lineage-restart
```

Focused result: `32/32`.

The test performs a real isolated compact transaction rather than editing fixture JSON:

- creates a calibrated precompact Codex `tas_*`;
- compacts 72 source messages for the same `gcs_*`;
- verifies the compact transaction receipt;
- commits durable compact-head generation 1;
- binds a new post-compact task-Agent snapshot;
- confirms the old baseline remains historically valid under its source lineage;
- confirms the new epoch/head reject the old baseline;
- confirms same-lineage continuation still uses Provider calibration;
- confirms production fallback uses current prompt estimation;
- confirms explicit stale injection fails closed;
- confirms Memory Center reports `stale_after_compact`, not baseline corruption;
- confirms lineage mutation breaks the baseline checksum;
- confirms sibling isolation and restart-stable epoch/checksum evidence.

Compatibility verification completed in this phase:

- Phase 395 Provider model/runtime identity gate: `23/23`;
- Phase 394 Provider usage preflight feedback: `37/37`;
- Phase 393 Provider-observed model context: `26/26`;
- Phase 315 final-dispatch payload gate: `17/17`;
- Phase 316 final-dispatch reactive compact: `19/19`;
- task-Agent durable compact-head fence: `38/38`;
- backend production build: passed;
- backend TypeScript `--noEmit`: passed.

Several full Windows emit attempts encountered intermittent `TS5033 UNKNOWN open` errors on changing `dist` files. After the successful `--noEmit` check and compiled-module test, the complete `build:backend` command was retried and exited successfully. Failed emit attempts were not counted as verification.

Phase 376-396 focused memory chain: `866/866`.

Targeted memory checks through Phase 396: `1722/1722`.

No paid Provider call was made. Provider usage, compact input, model identity, durable head, restart, and tamper evidence were deterministic isolated fixtures.

## Result

CCM now treats the latest Provider usage like an anchor in the current compact lineage instead of a permanent task-session constant. Ordinary same-lineage turns retain useful calibration; a real group-memory replacement invalidates it before the next third-party Agent call and safely returns to current prompt estimation.

The long-term Claude Code parity goal remains active. The next audit should examine whether a fresh post-compact Provider response atomically replaces the stale baseline and clears the warning without a transient cross-snapshot race.
