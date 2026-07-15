# CCM Memory Phase 316: Final Dispatch Reactive Compact Retry

Date: 2026-07-15

## Claude Code Gap

Claude Code applies microcompact and proactive autocompact before the API call. If the Provider still returns prompt-too-long, it withholds the recoverable error, performs one reactive compact, rebuilds the message sequence, and retries. A `hasAttempted` guard prevents an error/compact/retry loop.

Phase 315 gave CCM an exact final-prompt capacity gate, but an oversized prompt was only blocked. It did not automatically rebuild the final Provider prompt, and a Provider-side 413/PTL could still fall into ordinary runtime failure handling.

## Phase 316 Contract

`ccm-final-dispatch-reactive-compact-v1` now closes both paths:

1. Preflight gate reports `recompact_required`.
2. Provider reports prompt-too-long even though the local estimate was ready.

The recovery uses the actual model auto-compact threshold. It first measures the fixed prompt without recent group messages, reserves a model-derived safety margin, and assigns only the remaining token budget to the current exact `gcs_*` recent context.

The context projection preserves:

- the context header and summary head;
- requirement, constraint, decision, error, task, `gcs_*`, and `tas_*` lines;
- the newest context tail;
- checksummed omission markers for removed ranges.

The task, development contract, memory packet, tool contract, and current child request remain outside the elastic recent-context segment. If those fixed sections exceed model capacity, dispatch still fails closed.

## Provider PTL Retry

Provider errors matching 413, prompt-too-long, context-length, context-window, or token-limit signals schedule one same-Provider recovery attempt. The same Task Agent session and exact group session are retained. The rebuilt prompt must pass the final payload gate, snapshot binding, typed-memory WAL, invocation lineage, and runner delivery checks again.

No second reactive retry is scheduled. A second PTL is surfaced instead of entering a retry loop.

## Durable Evidence

The body-free recovery receipt records:

- exact group, `gcs_*`, task, `tas_*`, and Worker packet identity;
- trigger: `preflight_threshold` or `provider_prompt_too_long`;
- attempt number, fixed tokens, context budget, safety margin, and threshold;
- original and recovered prompt tokens/checksums;
- recent-context source/projection checksums and omitted-line count;
- recovered/blocked status and final Provider permission.

Task Agent snapshots atomically store the receipt with the recovered gate and prompt checksum. Memory Center reports recovered, blocked, invalid, original token, recovered token, and threshold state.

## Verification

- Phase 316 first process: 14/14 checks passed.
- Phase 316 restart process: 5/5 checks passed.
- Synthetic preflight sample: 189,716 -> 3,434 tokens with a 21,000-token trigger.
- Current task, fixed contract, and newest context sentinels remained in the recovered prompt.
- Fixed-prompt overflow remained blocked.
- Tampered receipt and cross-session identity were rejected.
- Phase 315 final payload gate and restart regression passed.
- Phase 314 true post-compact payload and restart regression passed.
- Exact group-session task entrypoints and restart passed.
- Task Agent invocation lineage passed.
- Global Agent global-only context passed.
- Model-aware typed-memory budget passed.
- Real Provider version soak: 165 checks, 5 turns, versions `1.0.0`, `2.0.0`, and `3.0.0` passed.

## Result

CCM no longer stops at measuring an oversized final worker prompt. It can use the model's real capacity to compact the elastic current-session context, persist the recovery decision, and continue the same child-Agent task once, while retaining strict session isolation and fail-closed behavior.

