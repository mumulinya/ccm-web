# Phase 354 - Task Agent Memory Trusted Prompt Envelope

## Goal

Prevent task text, quoted history, or forged markers from impersonating platform-managed group-session memory. A production child-Agent dispatch may claim full memory injection only when the final Provider prompt contains one structurally valid, checksummed trusted-memory envelope bound to the exact source memory context.

The boundary remains exact `group + gcs_* + task + tas_* + project`. Global-Agent dispatch remains outside group-session memory and continues to use global context only.

## Claude Code comparison

Claude Code places Agent memory in a platform-controlled system-prompt path. The model receives memory as an authoritative prompt section rather than as an arbitrary substring that could also occur in user task text.

CCM dispatches self-contained prompts to external Claude Code, Codex, and Cursor processes. Phase 352 proved that the final Provider prompt contained the expected memory projection, while Phase 354 proves that the projection is inside CCM's unique trusted section and is bound to the exact source memory object.

## Implementation

### Trusted envelope

`backend/agents/trusted-memory-prompt-envelope.ts` defines the crypto-only shared envelope module. The rendered form is:

```text
<<<CCM_TRUSTED_MEMORY_BEGIN schema=ccm-trusted-memory-prompt-envelope-v1 checksum=<content-sha256> source_checksum=<source-sha256> chars=<count>>>
<rendered memory context>
<<<CCM_TRUSTED_MEMORY_END checksum=<content-sha256>>>
```

Verification rejects missing or duplicate markers, invalid order or schema, mismatched begin/end checksums, altered content, altered character counts, source-memory checksum drift, and a memory projection outside the trusted section.

`backend/agents/worker-handoff.ts` now renders the platform memory/context section through this envelope. The module is independent of worker handoff and task sessions, avoiding the `worker-handoff -> model-capability-cache -> agent-sessions` dependency cycle.

### Prompt proof and final payload

`backend/tasks/agent-sessions.ts` extends the prompt-injection proof with:

- `trusted_envelope_required`;
- `trusted_envelope_present`;
- `trusted_envelope_valid`;
- `trusted_envelope_bound`;
- content and source checksums, character count, and verification issues.

When trusted-envelope enforcement is enabled, plain `prompt.includes(memory)` can no longer set `prompt_bound` or `full_memory_projection_injected`. Initial and changed-memory dispatches fail before snapshot persistence unless the trusted envelope is valid. An unchanged-memory `none` action may still omit full reinjection only through the Phase 353 verified Provider-native continuation baseline.

The final-dispatch attachment path recalculates the proof after any prompt rewrite. Removing or altering the envelope after the initial snapshot blocks the Provider call.

All four production paths require the trusted envelope:

- group child-Agent dispatch;
- runtime fallback/rebind;
- direct task-queue dispatch;
- auto-assignment dispatch.

### Memory Center

Snapshot inventory and Memory Center expose trusted-envelope required, valid, and unverified counts. Snapshot rows retain envelope presence, binding, checksums, and issues for diagnosis. A continuation-baseline turn that intentionally performs no full reinjection is not misreported as an invalid injection.

## Verification

New command:

```text
npm run test:task-agent-memory-trusted-envelope-proof-restart
```

The 31-check restart test covers:

- memory copied only into ordinary task text is rejected;
- production worker handoff renders one valid envelope;
- duplicate envelope markers are rejected;
- malformed marker prefixes mixed with a valid envelope are rejected;
- content and source-memory checksum tampering are rejected;
- a valid envelope creates a bound prompt proof;
- final Provider prompt rewrites are revalidated;
- the exact proof survives process restart;
- cross-`gcs_*` memory is rejected;
- inventory and Memory Center counts;
- static enforcement at all four production entry points.

Focused and adjacent results:

- Phase 354 trusted-envelope restart: 31/31;
- Phase 353 continuation-baseline restart: 29/29;
- Phase 352 prompt-injection restart: 27/27;
- Phase 351 monotonic sync commit restart: 22/22;
- Phase 350 sync commit restart: 28/28;
- Phase 349 snapshot sync restart: 23/23;
- compact-head fence: 38/38;
- session-lifecycle fence: 31/31;
- native continuation and capacity rebudget: 28/28;
- continuation restart soak: 41/41;
- direct durable dispatch spool: 39/39;
- typed-memory consumption feedback: 18/18;
- typed-memory access evidence restart: 12/12;
- exact-session production entry points and restart: pass;
- full frontend, MCP, and backend build: pass;
- TypeScript checks: pass.
- documentation links: 1033/1033.

## Delivery status

The user-requested core memory system is complete at this boundary: multi-group and multi-session isolation, group-session memory ownership, global-only Global Agent context, configurable capacity, compaction/recovery, task-Agent prompt injection, native continuation, restart persistence, fail-closed delivery proofs, and Memory Center visibility are implemented.

The long-term Claude Code parity goal remains active for future hardening and upstream behavior changes. Those future phases are continuous enhancement, not unfinished core delivery.

## Boundary

This phase proves authoritative transport and prompt placement. It does not by itself prove that a model semantically followed every memory item; semantic use remains covered by typed-memory usage receipts, citations, task artifacts, conflict feedback, and outcome scoring.
