# Phase 395: Provider model and runtime identity gate

Date: 2026-07-18

## Goal

Prevent an exact task session from reusing Provider-observed context calibration after the effective third-party model or Provider runtime identity changes. The Phase 394 preflight baseline must be tied to the execution identity that produced the measurement, not merely to a Provider family name.

The calibrated identity is now:

```text
groupId + gcs_* + taskId + tas_* + provider + model
        + provider contract (when known)
        + provider runtime version (when known)
```

## Claude Code reference

Claude Code's canonical `tokenCountWithEstimation()` in `D:/claude-code/src/utils/tokens.ts:230` anchors the next context estimate to usage from the latest API response in the active message lineage. `D:/claude-code/src/services/compact/autoCompact.ts:225` then compares that count against a threshold selected for the current model.

That measurement is therefore model- and execution-lineage-specific. CCM dispatches through heterogeneous third-party Agents, so a persisted usage receipt also needs explicit Provider model and runtime identity fences before it can influence the next compact decision.

## Identity rules

`ccm-final-dispatch-provider-usage-baseline-v1` now requires a non-empty model before its status can become `ready`. A reported usage receipt without a trustworthy model remains `unavailable` and cannot become a calibration authority.

This does not block normal task execution. When no valid model-bound baseline exists, the final-dispatch gate uses `estimated_final_prompt`, preserving the current prompt capacity path without claiming Provider-observed precision.

The baseline verifier now supports exact bindings for:

- normalized Provider;
- model;
- Provider output contract ID, when known;
- Provider runtime version, when known.

The final-dispatch gate carries the active contract and runtime version in its checksum-protected body. If a baseline is explicitly supplied under a different model, contract, or runtime version, verification fails closed and the Provider call is not allowed.

## Production reuse

The group-chat production dispatch path only carries a persisted baseline when all available identities match the active `tas_*`:

```text
baseline.provider == active provider
baseline.model == active model
baseline.provider_contract_id == active contract
baseline.provider_runtime_version == active runtime version
```

An active model is mandatory for reuse. Provider, model, contract, or runtime switches drop the old calibration and rebuild the next gate from the current prompt estimate. This avoids applying stale token bias to a different tokenizer, system envelope, transport contract, or executable version.

The successful delivery path now builds the baseline's contract and runtime fields from the normalized, checksum-protected Provider usage receipt. Snapshot inventory verification also supplies known contract/runtime identity so persisted mismatches are visible as hard gaps rather than silently trusted.

Group and Agent isolation remains unchanged:

- no baseline crosses `gcs_*` or `tas_*` boundaries;
- sibling Cursor and Codex sessions remain independent;
- the Global Agent continues to consume global context only;
- prompt, transcript, memory, and compact-summary bodies are not stored in the identity proof.

## Verification

Phase 395 command:

```text
npm run test:final-dispatch-provider-identity-baseline-restart
```

Result: `23/23`.

Coverage includes:

- model, contract, and runtime identity persist on the exact-session baseline;
- the exact identity verifies and can use Provider-observed calibration;
- model switching fails closed when an old baseline is explicitly supplied;
- Provider contract switching fails closed;
- Provider runtime version switching fails closed;
- anonymous-model usage cannot create a ready baseline;
- production baseline selection requires a known active model;
- production selection compares contract and runtime identity;
- normalized receipt identity feeds baseline construction;
- restart preserves the baseline checksum and every identity decision.

Compatibility verification completed in this phase:

- Phase 394 Provider usage preflight feedback: `37/37`;
- Phase 393 Provider-observed model context: `26/26`;
- Phase 392 exact-session model-visible context: `26/26`;
- Phase 315 final-dispatch payload gate: `17/17`;
- Phase 316 final-dispatch reactive compact: `19/19`;
- backend production build: passed;
- split-export and factory-dependency checks: passed.

The first formal Phase 395 build encountered the known intermittent Windows `TS5033 UNKNOWN open` write error in `ccm-package/dist`. The complete command was rerun without source changes and passed normally; no failed build was counted as verification.

Phase 376-395 focused memory chain: `834/834`.

Targeted memory checks through Phase 395: `1690/1690`.

No paid Provider call was made. The usage, model, contract, runtime, restart, and identity-switch evidence came from deterministic isolated fixtures.

## Result

Provider-observed preflight feedback is no longer reusable under an anonymous or changed execution identity. Each group-chat project-Agent task session can learn from its own Provider usage while refusing stale calibration after model or runtime changes, preserving multi-group and multi-session isolation.

The long-term Claude Code parity goal remains active. The next audit should examine calibration lineage and freshness across non-reactive/manual compaction, where the prompt can be replaced without a new Provider response.
