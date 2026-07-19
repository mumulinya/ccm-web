# Phase 394: Provider usage preflight feedback

Date: 2026-07-18

## Goal

Feed the trustworthy Provider-observed context from one successful project-Agent delivery into the exact same task session's next final-dispatch capacity gate. The measurement must affect preflight compaction before the next third-party Provider call, rather than remaining a Memory Center diagnostic only.

The scope remains exact and session-local:

```text
groupId + gcs_* + taskId + tas_* + provider + model
```

A measured Codex task session must not change a sibling Cursor session, another group-chat session, another task session, or the Global Agent. The Global Agent continues to consume global context only.

## Claude Code reference

Claude Code's canonical context measurement is `tokenCountWithEstimation()` in `D:/claude-code/src/utils/tokens.ts:230`. It starts from the most recent API response usage and adds a rough estimate for messages introduced after that response. Parallel tool-result siblings are included by walking back to the first record with the same assistant response ID.

`D:/claude-code/src/services/compact/autoCompact.ts:225` passes that measured-plus-estimated token count into the auto-compact threshold decision. Therefore the previous API measurement is operational feedback for the next turn, not display-only telemetry.

CCM cannot assume that every third-party Agent exposes Claude's native message array or tokenizer. Phase 394 implements the equivalent invariant at the final-dispatch boundary: persist the last trustworthy observed-versus-estimated difference for the exact task session and apply it to the next current prompt estimate.

## Preflight calibration rule

A successful Provider usage receipt creates a checksum-protected `ccm-final-dispatch-provider-usage-baseline-v1` record. The observed model input is:

```text
previous_observed_context_tokens = direct_input_tokens
                                   + cache_read_input_tokens
                                   + cache_creation_input_tokens
```

The next final-dispatch gate uses:

```text
positive_bias_tokens = max(
  0,
  previous_observed_context_tokens - previous_estimated_input_tokens
)

model_visible_input_tokens = current_estimated_input_tokens
                           + positive_bias_tokens
```

Only positive underestimation is carried forward. A negative historical drift cannot enlarge the next capacity allowance or suppress compaction. The baseline is added exactly once and is not treated as another prompt body.

When the baseline is valid, the gate reports `provider_observed_baseline_plus_current_estimate`. Without a trustworthy exact-session baseline, it explicitly falls back to `estimated_final_prompt`.

## Persistence and integrity

The baseline is persisted on `TaskAgentSession.providerContextUsageBaseline` after a successful Provider delivery. Its checksum and identity binding cover:

- group and `gcs_*` identity;
- task and `tas_*` identity;
- Provider and model identity;
- previous estimate and observed context;
- positive drift and observation metadata.

The production dispatch call site supplies a baseline only when its normalized Provider and exact model match the active task session. Provider or model changes do not consume a stale baseline.

On restart, the baseline is reverified before use. A cross-session baseline, checksum mutation, or invalid persisted identity fails closed before a Provider call. The Memory Center report also treats an invalid persisted baseline as invalid rather than silently displaying it as measured truth.

If the calibrated count crosses the threshold, responsive final-dispatch compaction runs before dispatch. Recompaction retains the valid baseline until the recovered prompt plus bias is genuinely under the gate; it cannot erase the evidence merely to make the gate pass.

## Memory Center

The exact-session model-context panel adds a `next preflight` card containing:

- positive Provider-observed bias tokens;
- the next-turn token basis;
- the previous estimate used by the persisted baseline;
- checksum-backed status from the current task session.

This makes the next compaction decision inspectable without exposing prompt, transcript, compact summary, or memory bodies.

## Verification

Phase 394 command:

```text
npm run test:final-dispatch-provider-usage-baseline-restart
```

Result: `37/37`.

Coverage includes:

- successful Provider usage persists as an exact-session baseline;
- direct input and cache input produce the observed context exactly once;
- a `+433` historical underestimate changes the next preflight count;
- a raw estimate that would dispatch instead triggers calibrated preflight compaction;
- calibrated overflow actually compacts and recovers below the threshold;
- responsive recompaction retains the observed baseline;
- restart preserves the same checksum and behavior;
- an unreported sibling has no baseline;
- sibling sessions and Provider switches cannot consume the baseline;
- persisted baseline tampering fails closed before Provider invocation;
- Memory Center exposes the next-preflight calibration.

Compatibility verification completed in this phase:

- Phase 393 Provider-observed model context: `26/26`;
- Phase 394 Provider usage preflight feedback: `37/37`;
- Phase 315 final-dispatch payload gate: `17/17`;
- Phase 316 final-dispatch reactive compact: `19/19`;
- backend and frontend production builds: passed;
- split-export and factory-dependency checks: passed.

Phase 376-394 focused memory chain: `811/811`.

Targeted memory checks through Phase 394: `1667/1667`.

No paid Provider call was made. All usage receipts and Provider responses used by the self-tests and browser fixture were local deterministic fixtures.

## Browser acceptance

Memory Center was rendered against an isolated server with two sibling exact sessions.

- Codex session: `model context 7,800`, basis `provider_observed`, estimate `7,367`, drift `+5.9% / within_tolerance`;
- Codex next preflight: `+433`, basis `provider_observed_baseline_plus_current_estimate`, previous estimate `7,367`;
- Cursor sibling: `model context 18`, basis `estimated_final_prompt`, estimate `18`, drift `unmeasured`;
- Cursor next preflight: `+0`, basis `estimated_final_prompt`, estimate `18`;
- switching exact sessions exposed no Codex baseline in the Cursor sibling;
- browser console errors: `0`.

The isolated server was stopped and its temporary home removed. The accidentally created real-home fixture was precisely deleted through production cleanup paths and a final global search returned `NO_PHASE394_REAL_HOME_RESIDUE`.

## Result

Phase 394 closes the operational gap between Provider-observed context and the next compact decision. A group-chat task session now learns from its own last Provider measurement while preserving strict multi-group, multi-`gcs_*`, multi-`tas_*`, Provider, model, and Global-Agent isolation.

The long-term Claude Code parity goal remains active. Subsequent phases continue auditing newer CC context-accounting and compaction behavior rather than treating this phase as the endpoint.
