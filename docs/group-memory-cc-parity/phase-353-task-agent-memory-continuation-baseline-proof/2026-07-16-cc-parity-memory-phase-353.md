# Phase 353 - Task Agent Memory Continuation Baseline Proof

## Goal

Prevent unchanged task-Agent memory from being treated as present merely because an earlier prompt was delivered. A `none` snapshot-sync action may omit the full memory projection only when the current third-party Provider invocation proves that it resumed the exact native session which received the committed memory baseline.

The boundary remains exact `group + gcs_* + task + tas_* + project + Provider native session`. Global-Agent dispatch remains outside group-session memory continuation evidence.

## Claude Code comparison

Claude Code injects custom-Agent memory through the Agent system prompt and keeps it attached to the active Agent session. Its snapshot state in `agentMemorySnapshot.ts` is therefore meaningful together with the actual session loading path in `loadAgentsDir.ts` and the resume path in `main.tsx`.

CCM dispatches through external Claude Code, Codex, and Cursor processes. A previously committed prompt does not prove that a later process successfully resumed the same native session. Phase 353 closes that distributed continuation gap instead of assuming local-session continuity.

## Implementation

### Pre-dispatch state machine

`backend/tasks/agent-sessions.ts` now distinguishes three unchanged-memory cases:

- production prompt contains the full rendered memory projection: `none` is reusable without native continuation evidence;
- production prompt omits the projection and the current task-Agent session has an exact reusable Provider-native session: `none` is prepared with `continuation_baseline_required=true`;
- neither condition is true: the decision becomes `prompt_update` with `continuation_baseline_unavailable`, and production prompt-injection enforcement requires full reinjection.

The continuation decision checksum binds the native session id, normalized Provider, Provider contract id, previous canonical delivery receipt id/checksum, previous committed sync checksum, and exact group/task/session/project identity.

Compatibility-only callers without production enforcement retain their legacy snapshot behavior. All real dispatch entry points already enable enforcement through Phase 352.

### Post-run continuation proof

When a continuation-dependent prompt returns, memory delivery now verifies the v4 Provider-native continuation evidence with `verifyNativeSessionContinuationEvidence()`. Commit eligibility requires:

- matching Provider and runner request id;
- matching requested, effective, and delivered native session id;
- native resume requested and no native fork;
- successful runner return;
- Provider output or exit-success policy acknowledgement;
- reusable native session state;
- verified Provider contract continuity.

Failure produces `continuation_baseline_unverified`, marks memory delivery false, rejects the new sync commit, and causes the next snapshot to require full reinjection. A failed or forged continuation can never become the next trusted memory baseline.

### Memory Center

Snapshot inventory and Memory Center expose continuation baseline required, valid, unverified, status, issues, and evidence checksum fields. Fleet and selected-group cards show valid/required/unverified counts separately from prompt-injection proof counts.

## Verification

New command:

```text
npm run test:task-agent-memory-continuation-baseline-proof-restart
```

The 29-check restart test covers:

- first full memory injection and committed baseline;
- durable native-session capture across restart;
- unchanged-memory `none` eligibility binding;
- real Codex `thread.started` output-contract acknowledgement;
- exact runner request and native session binding;
- forged/mismatched continuation rejection;
- rejected continuation forcing full reinjection;
- repaired committed baseline;
- exact cross-`gcs_*` rejection;
- inventory and Memory Center visibility.

Final focused and adjacent results:

- Phase 353 continuation baseline restart: 29/29;
- Phase 352 prompt-injection proof restart: 27/27;
- Phase 351 monotonic commit restart: 22/22;
- Phase 350 sync commit restart: 28/28;
- Phase 349 snapshot sync restart: 23/23;
- task-Agent compact-head fence: 38/38;
- task-Agent session-lifecycle fence: 31/31;
- native continuation and capacity rebudget: 28/28;
- continuation restart soak: 41/41;
- direct durable dispatch spool: 39/39;
- typed-memory consumption feedback: 18/18;
- Provider access evidence restart: 12/12;
- full frontend, MCP, and backend build: pass;
- TypeScript checks: pass.

Two older continuation fixtures were updated to create and bind the required group-session lifecycle head before dispatch. No lifecycle validation was bypassed.

## Boundary

This phase proves transport-level native-session continuity. It does not claim semantic memory use by the model; semantic use remains covered by structured memory-context usage receipts, fact citations, typed-memory consumption feedback, task artifacts, and outcome scoring.
