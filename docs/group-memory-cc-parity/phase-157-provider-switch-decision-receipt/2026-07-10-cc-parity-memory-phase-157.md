# Phase 157 - Provider Switch Decision Receipt

## Goal

Move CCM group memory closer to Claude Code style context governance by making provider switching explicit, auditable, and safe across group main-agent dispatch, third-party child-agent sessions, and final execution receipts.

This phase closes the gap where cross-group provider reliability could recommend a safer runner but the system did not yet carry a typed proof chain distinguishing:

- advised alternative
- approved switch
- actually executed provider

## What Changed

- Added `ccm-provider-switch-decision-receipt-v1` validation and construction in `backend/modules/collaboration/group-orchestrator.ts`.
- The receipt requires:
  - fresh provider reliability snapshot
  - snapshot id/checksum/generation/expiry match
  - same group/project/assignment/dispatch binding
  - explicitly configured same-project safer candidate
  - no local hold on the new candidate
  - task compatibility confirmation plus evidence
  - local/user/task authority
  - explicit permission when switching away from a held provider
- Approved switches rebuild the `WorkerContextPacket` for the new runner, while preserving the decision receipt through packet hash, context usage, rendering, acceptance contract, and compact retry.
- Assignment binding ledger now keeps provider switch lifecycle counters together:
  - `providerSwitchAdvisedCount`
  - `providerSwitchApprovedCount`
  - `providerSwitchSessionBoundCount`
  - `providerSwitchExecutedCount`
  - `providerSwitchExecutionPassedCount`
  - `providerSwitchExecutionFailedCount`
- Child session binding is recorded with `ccm-provider-switch-child-session-binding-v1`.
- Final execution is recorded with `ccm-provider-switch-execution-receipt-v1`.
- Final proof is system-attested by CCM actual runner/session/execution and also checks the child Agent's declared `providerSwitchExecution`.
- Runtime fallback to a different runner is recorded as a mismatch and can downgrade a `done` target receipt to `partial`; it is not disguised as an approved switch.
- `CCM_AGENT_RECEIPT` schema and parser now support `providerSwitchExecution`.
- Memory Center default quality checks now include `worker_context_packet_provider_switch_decision_receipt`.

## Key Invariants

- Provider reliability ranking is advisory only.
- A safer alternative does not imply automatic switching.
- Cross-group reliability cannot authorize a switch or override local hold.
- A switch is approved only when a fresh/checksummed decision receipt has local authority and task compatibility evidence.
- Session creation re-validates the decision receipt before binding a child Agent session.
- Execution proof must match both:
  - child Agent declaration in `providerSwitchExecution`
  - CCM actual runtime/session/execution facts
- Ledger state must keep `advised`, `approved`, and `executed` separate.

## Verification

Passed:

- `runWorkerContextProviderSwitchDecisionReceiptSelfTest()`
- `runAgentReceiptProviderSwitchExecutionSelfTest()`
- `runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest()`
- Phase 137-157 extended regression: `37/37` passed
- Phase 156/157 focused regression after final patch: passed
- Modified-file TypeScript diagnostics: `0`
- `git diff --check` on touched files: passed, with CRLF warnings only

Formal `npm run check` is still blocked by an unrelated concurrent worktree issue:

- `backend/test-agent/contract/schema.ts(470,14): TS7056`

That file was not modified for this phase.

## Self-Test Coverage

`runWorkerContextProviderSwitchDecisionReceiptSelfTest()` covers:

- valid approved switch
- expired snapshot rejection
- tampered receipt rejection
- stale source generation rejection
- project mismatch rejection
- group mismatch rejection
- unconfigured candidate rejection
- missing compatibility evidence rejection
- missing local authority rejection
- held provider switch without explicit permission rejection
- wrong-project session binding rejection
- valid session binding
- actual provider match execution pass
- runtime fallback mismatch execution fail
- advised/approved/executed ledger distinction
- compact retry preserving the decision receipt

`runMemoryCenterWorkerContextPacketProviderSwitchDecisionReceiptSelfTest()` covers:

- advised-only lifecycle
- approved/session-bound/executed lifecycle
- targeted quality report integration
- mismatch degrading report from `ok` to `warn`
- mismatch gap naming actual runner failure

## Important Files

- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/agents/runtime-kernel.ts`
- `backend/agents/worker-handoff.ts`
- `backend/modules/collaboration/agent-receipts.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`

## Next Direction

Phase 158 should continue toward Claude Code parity by making provider switch evidence durable in typed memory:

- Distill approved/mismatched provider switch executions into `MEMORY.md` style typed memory.
- Feed repeated provider switch mismatch patterns back into local pre-dispatch policy.
- Create repair work items for failed provider switch execution proofs.
- Ensure future child Agent dispatch can recall prior switch mismatch evidence without leaking private cross-group details.
