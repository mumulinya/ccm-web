# Phase 393: Provider-observed model context

Date: 2026-07-18

## Goal

Calibrate the exact-session final-dispatch model view with trustworthy usage reported by the third-party Agent Provider. Memory Center must distinguish the estimated prompt from the context the Provider says was actually visible to the model, rather than treating a memory file's byte size or the pre-dispatch estimate as the compression capacity.

The scope remains `groupId + gcs_* + tas_*`. A measured Codex session must not affect an unreported Cursor sibling, another group, or the Global Agent.

## Capacity rule

The Provider-observed context is:

```text
observed_context_tokens = direct_input_tokens
                        + cache_read_input_tokens
                        + cache_creation_input_tokens
```

The normalized transport receipt already accounts for whether cache-read tokens were included in the Provider's top-level input field. The model view therefore consumes the normalized direct/cache components once and does not blindly add raw Provider fields together.

When the usage receipt is present, checksum-valid, reported, and has a positive observed context, the authoritative display basis is `provider_observed`:

```text
model_visible_tokens = observed_context_tokens
```

When no trustworthy Provider measurement exists, the system explicitly falls back to `estimated_final_prompt`:

```text
model_visible_tokens = final_dispatch_prompt_tokens
```

This fallback is disclosed as an estimate. It is not presented as Provider-observed truth.

## Calibration and pressure

The exact-session model view now exposes body-free calibration evidence:

- measurement status and token basis;
- Provider/model identity and transport mode;
- direct input, cache read, and cache creation input tokens;
- normalized Provider input, output, and total tokens;
- estimated prompt tokens and observed context tokens;
- drift in tokens and percent;
- usage checksum and observation time.

Pressure and remaining capacity use `model_visible_tokens`. The estimated pressure is retained separately so operators can see how far local token estimation differs from the Provider receipt.

Drift states are deterministic:

- below 10% absolute drift: `within_tolerance`;
- 10% through below 25%: `warn`;
- 25% or greater: `fail`;
- no trusted observation: `unmeasured`.

## Integrity and isolation

An invalid or checksum-tampered usage receipt changes calibration to `invalid` and the exact-session model view to `fail_closed`. Invalid usage is never used as `provider_observed`; the body-free view retains the estimate only for diagnostics.

The usage inventory remains bound to the exact `groupId + gcs_* + tas_*` delivery. A sibling `gcs_*` without a Provider report remains on its own estimate and cannot inherit the measured token count, checksum, Provider identity, or pressure from another session.

The Global Agent contract is unchanged: it consumes global context only and does not receive group-chat session memory.

## Memory Center

The final model context panel now shows:

- `model context`: calibrated model-visible tokens and the local estimate;
- `usage basis`: Provider-observed or estimated;
- `estimate drift`: signed drift percent and status;
- calibrated pressure and remaining model threshold;
- Provider usage components without prompt, transcript, memory, or Context Collapse bodies.

The UI makes estimation visible instead of implying false precision.

## Verification

Phase 393 command:

```text
npm run test:final-dispatch-model-view-provider-usage-calibration-restart
```

Result: `26/26`.

Coverage includes:

- a measured Codex exact session uses `provider_observed`;
- `2,000` direct + `5,500` cache read + `300` cache creation = `7,800` observed context tokens;
- the normalized Provider input is `7,800`, output is `500`, and total is `8,300`;
- a `7,367` estimate reports `+433` tokens and `+5.9%` drift;
- pressure uses `7,800 / 48,000`, while estimated pressure remains separately visible;
- a Cursor sibling without usage stays on `estimated_final_prompt`;
- sibling sessions cannot inherit observed usage or its checksum;
- Memory Center scope returns the calibrated exact-session view;
- usage tampering fails closed;
- body-free view checks and restart-stable checksums remain intact.

Compatibility verification completed in this phase:

- Provider usage compatibility suite: `58/58`;
- Phase 392 exact-session model view: `26/26`;
- Phase 391 Context Collapse lifecycle race: `28/28`;
- Phase 390 durable Context Collapse: `26/26`;
- Phase 316 final-dispatch reactive compact: `19/19`;
- Memory Center session-scope self-test: `13/13`;
- backend and frontend production builds: passed;
- split-export and factory-dependency checks: passed.

Phase 376-393 focused memory chain: `774/774`.

Targeted memory checks through Phase 393: `1630/1630`.

## Browser acceptance

Memory Center was rendered against an isolated server with two sibling exact sessions.

- Codex session: `model context 7,800`, basis `provider_observed`, estimate `7,367`, drift `+5.9% / within_tolerance`;
- Cursor sibling: `model context 18`, basis `estimated_final_prompt`, estimate `18`, drift `unmeasured`;
- switching sessions exposed no measured Codex usage in the Cursor session;
- browser console errors: `0`.

The isolated server was stopped. Its temporary CCM home and the accidentally created real-HOME fixture/lifecycle artifacts were precisely removed. A global search for the unique test group, group-session, and task-session IDs returned no residue.

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. Phase 393 uses deterministic Provider-usage fixtures and persisted receipt verification.

The long-term Claude Code parity goal remains active. This phase improves capacity truth and observability; it does not claim that every remaining Claude Code memory behavior is complete.
