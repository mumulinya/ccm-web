# Phase 352 - Task Agent Memory Prompt Injection Proof

## Goal

Prove that a task Agent's final Provider prompt actually contains the exact group-session memory projection represented by its synchronized memory snapshot. A metadata flag that merely says memory injection was required is not sufficient evidence.

The proof is isolated by exact `group + gcs_* + task + tas_* + project` identity. Global-Agent dispatch remains outside the group-session memory boundary and continues to consume only global context.

## Claude Code comparison

The reference points are:

- `D:\claude-code\src\tools\AgentTool\agentMemorySnapshot.ts`;
- `D:\claude-code\src\tools\AgentTool\loadAgentsDir.ts`;
- `D:\claude-code\src\main.tsx`;
- `D:\claude-code\src\components\agents\SnapshotUpdateDialog.ts`.

Claude Code treats an Agent memory snapshot as synchronized only when the materialized prompt state corresponds to that snapshot. CCM has an additional distributed dispatch boundary, so it must bind the rendered group memory to the exact final prompt and later bind the successful delivery commit to that proof.

## Implementation

### Checksummed injection proof

`backend/tasks/agent-sessions.ts` now creates and verifies `ccm-task-agent-memory-prompt-injection-proof-v1`. The proof binds:

- group, group-session, task, task-Agent-session, and project identity;
- snapshot sync checksum and action;
- memory-context checksum;
- rendered-memory checksum and character count;
- final-prompt checksum;
- prompt-bound, injection-required, and enforcement-required state.

For `initialize` and `prompt_update`, production enforcement fails closed with `TASK_AGENT_MEMORY_PROMPT_INJECTION_REQUIRED` when the exact rendered memory projection is absent from the final prompt. For `none`, a valid continuation baseline can avoid repeating the full projection.

### Final dispatch and delivery commit

The final dispatch payload gate recomputes the proof after any final-prompt rewrite. It reports `memory_prompt_injection_required` instead of allowing a payload whose earlier proof no longer matches.

A successful memory snapshot commit now includes `memory_injection_proof_checksum`. A previous baseline is reusable only when its snapshot, sync decision, canonical delivery receipt, delivery commit, and prompt-injection proof all validate as one identity-bound chain. Legacy commits without this binding are re-established on a later dispatch instead of being trusted silently.

### Production entry points

Prompt-injection enforcement is enabled at all task-Agent production dispatch entry points:

- normal group task dispatch;
- fallback and retry dispatch;
- direct task dispatch;
- auto-assignment dispatch.

Each entry point supplies the actual `rendered_text` projection used to construct the worker handoff. Compatibility-only callers may expose `projection_unavailable`, but production callers cannot disable enforcement by omission.

### Memory Center

Task-Agent snapshot inventory now reports prompt-proof presence, validity, status, enforcement, prompt binding, delivery readiness, and validation issues. Fleet and selected-group summaries expose enforced, bound, missing, and invalid proof counts.

## Verification

New command:

```text
npm run test:task-agent-memory-prompt-injection-proof-restart
```

The 27-check restart test covers:

- blocking a required-memory snapshot before persistence when memory is absent;
- exact rendered projection injection and checksum binding;
- proof recomputation after final-prompt rewriting;
- delivery-commit binding to the proof checksum;
- restart restoration and validation;
- continuation-baseline behavior for unchanged memory;
- exact cross-`gcs_*` rejection;
- inventory and Memory Center observability;
- static enforcement checks at all four production dispatch paths.

Final focused and adjacent results:

- Phase 352 prompt-injection proof restart: 27/27;
- Phase 351 monotonic commit restart: 22/22;
- Phase 350 sync commit restart: 28/28;
- Phase 349 snapshot sync restart: 23/23;
- task-Agent compact-head fence: 38/38;
- task-Agent session-lifecycle fence: 31/31;
- typed-memory consumption feedback: 18/18;
- Provider access evidence restart: 12/12;
- direct durable dispatch spool: 39/39;
- full frontend, MCP, and backend build: pass;
- TypeScript checks: pass;
- documentation links: 1030/1030.

## Boundary

This phase proves delivery of a memory-bearing prompt; it does not claim that a third-party model semantically understood or followed every memory item. Semantic consumption remains measured separately through access evidence, typed-memory feedback, artifact closure, and later task outcomes.
