import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-native-rebudget-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const continuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function prepared(label, options = {}) {
  const groupId = options.groupId || `phase257-${label}-${nonce}`;
  const groupSessionId = options.groupSessionId || `gcs_phase257_${label}_${nonce}`;
  const taskId = options.taskId || `task-phase257-${label}-${nonce}`;
  const taskAgentSessionId = options.taskAgentSessionId || `tas_phase257_${label}_${nonce}`;
  const runnerRequestId = options.runnerRequestId || `adr_phase257_${label}_${nonce}`;
  const lifecycleHead = lifecycle.ensureGroupSessionLifecycleHead(groupId, groupSessionId, { reason: "phase257_native_continuation_fixture" }).head;
  let edge = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase257-project",
    taskAgentSessionId,
    nativeSessionId: options.nativeSessionId || "",
    executionId: taskId,
    attemptSequence: options.attemptSequence || 1,
    invocationKind: options.invocationKind || "spawn",
    branchKind: options.branchKind || "main",
    parentInvocationEdge: options.parentInvocationEdge,
  });
  edge = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp_${label}_${nonce}`,
    memoryContextSnapshotId: `tams_${label}_${nonce}`,
    memoryContextSnapshotChecksum: crypto.createHash("sha256").update(label).digest("hex"),
    renderedPrompt: `phase257 ${label} prompt`,
    groupSessionMemoryBinding: {
      sessionLifecycleFenceRequired: true,
      sessionLifecycleHeadId: lifecycleHead.lifecycle_head_id,
      sessionLifecycleGeneration: lifecycleHead.generation,
      sessionLifecycleStatus: lifecycleHead.status,
      sessionLifecycleHeadChecksum: lifecycleHead.head_checksum,
    },
    typedMemoryDeliveryCapsule: {
      schema: "ccm-child-typed-memory-delivery-capsule-v1",
      version: 2,
      group_id: groupId,
      group_session_id: groupSessionId,
      task_id: taskId,
      task_agent_session_id: taskAgentSessionId,
      compact_epoch: "precompact",
      capsule_checksum: `capsule-${label}`,
      budget: {
        model_context_window: options.dispatchWindow || 200_000,
        configured_max_tokens: options.configuredTokens || 5_000,
        effective_max_tokens: Math.min(options.configuredTokens || 5_000, Math.max(1000, Math.floor((options.dispatchWindow || 200_000) * 0.02))),
        token_budget_formula: "min(configured_max_tokens,max(1000,floor(model_context_window*0.02)))",
      },
    },
  });
  edge = lineage.dispatchTaskAgentInvocationEdge(edge, { transport: options.provider || "codex" });
  edge = lineage.bindTaskAgentInvocationRunnerRequest(edge, runnerRequestId);
  return { groupId, groupSessionId, taskId, taskAgentSessionId, runnerRequestId, edge };
}

function capabilityReceipt(fixture, contextWindow, nativeSessionId, model = "gpt-phase257") {
  return runtime.extractNativeModelCapabilityReceipt("codex", JSON.stringify({
    type: "model.metadata",
    model,
    model_capabilities: { context_window: contextWindow, max_output_tokens: 8_000 },
  }), {
    runner: "direct-cli",
    runnerRequestId: fixture.runnerRequestId,
    groupId: fixture.groupId,
    taskId: fixture.taskId,
    executionId: fixture.taskId,
    taskAgentSessionId: fixture.taskAgentSessionId,
    nativeSessionId,
  });
}

try {
  const nativeId = "thread-phase257-resume";
  const resumed = prepared("resume", { nativeSessionId: nativeId, attemptSequence: 2, invocationKind: "resume", branchKind: "native_recovery" });
  const resumeEvidence = continuation.buildNativeSessionContinuationEvidence({
    provider: "claudecode",
    runnerRequestId: resumed.runnerRequestId,
    requestedNativeSessionId: nativeId,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  let resumeEdge = lineage.completeTaskAgentInvocationEdge(resumed.edge, {
    success: true,
    provider: "claudecode",
    nativeSessionId: nativeId,
    nativeContinuationEvidence: resumeEvidence,
    runnerRequestId: resumed.runnerRequestId,
    output: "resumed",
  });
  equal(resumeEdge.native_continuation_status, "acknowledged", "successful --resume exit must acknowledge the requested native session");
  equal(resumeEdge.native_continuation_receipt.session_id_evidence_source, "provider_resume_exit_success", "resume without repeated provider id must preserve its real evidence source");
  equal(resumeEdge.adoption_status, "adopted", "acknowledged native resume may satisfy adoption");
  equal(lineage.verifyTaskAgentNativeContinuationReceipt(resumeEdge.native_continuation_receipt, resumeEdge).valid, true, "native continuation receipt must validate");

  const codexExitOnly = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: "adr-codex-exit-only",
    requestedNativeSessionId: "thread-codex-exit-only",
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(codexExitOnly.nativeContinuationAcknowledged, false, "Codex JSON runtime must repeat the provider thread id before resume is acknowledged");
  equal(codexExitOnly.compatibilityStatus, "provider_output_contract_unverified", "provider capability profile must explain missing output-contract evidence");

  const fallback = prepared("fallback", { nativeSessionId: "thread-phase257-fallback", attemptSequence: 2, invocationKind: "resume", branchKind: "native_recovery" });
  const fallbackEdge = lineage.completeTaskAgentInvocationEdge(fallback.edge, {
    success: true,
    nativeSessionId: "thread-phase257-fallback",
    runnerRequestId: fallback.runnerRequestId,
    output: "request id echoed by caller only",
  });
  equal(fallbackEdge.native_continuation_receipt.session_id_evidence_source, "request_fallback", "caller fallback must never be relabeled as provider output");
  equal(fallbackEdge.native_continuation_status, "unverified", "request fallback cannot acknowledge native continuation");
  equal(fallbackEdge.adoption_status, "unverified", "unacknowledged resume must fail adoption closed");

  const drift = prepared("drift", { nativeSessionId: "thread-phase257-drift", attemptSequence: 2, invocationKind: "resume", branchKind: "native_recovery", dispatchWindow: 200_000 });
  const driftNativeReceipt = capabilityReceipt(drift, 64_000, "thread-phase257-drift");
  const driftEvidence = continuation.buildNativeSessionContinuationEvidence({ provider: "codex", runnerRequestId: drift.runnerRequestId, requestedNativeSessionId: "thread-phase257-drift", returnedNativeSessionId: "thread-phase257-drift", providerOutputContractEvidence: runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: "thread-phase257-drift" })).providerOutputContractEvidence, nativeResumeRequested: true, runnerSuccess: true });
  const driftEdge = lineage.completeTaskAgentInvocationEdge(drift.edge, {
    success: true,
    nativeSessionId: "thread-phase257-drift",
    nativeContinuationEvidence: driftEvidence,
    nativeModelCapabilityReceipt: driftNativeReceipt,
    nativeModelCapabilityRecord: { recorded: true, entry: { model: "gpt-phase257", contextWindow: 64_000 }, downgrade: { action: "rebuild_and_recompact_active_child_sessions_before_next_dispatch" } },
    runnerRequestId: drift.runnerRequestId,
    output: "capacity returned",
  });
  equal(driftEdge.context_rebudget_status, "drift_detected", "actual smaller model window must be recorded as dispatch budget drift");
  equal(driftEdge.context_rebudget_proof.dispatch_effective_memory_tokens, 4_000, "proof must preserve the exact dispatched memory budget");
  equal(driftEdge.context_rebudget_proof.actual_effective_memory_tokens, 1_280, "proof must recompute memory budget from the actual model window");
  equal(driftEdge.context_rebudget_proof.budget_drift_tokens, 2_720, "proof must quantify over-budget memory tokens");
  equal(driftEdge.context_rebudget_proof.current_prompt_rebudgeted, false, "post-return evidence cannot pretend the already-sent prompt was rebuilt");
  equal(driftEdge.context_rebudget_proof.next_dispatch_rebuild_required, true, "capacity downgrade must fence the next dispatch behind rebuild/recompact");
  equal(lineage.verifyTaskAgentContextRebudgetProof(driftEdge.context_rebudget_proof, driftEdge).valid, true, "signed rebudget proof must validate");

  const forgedProof = { ...driftEdge.context_rebudget_proof, actual_model_context_window: 200_000 };
  equal(lineage.verifyTaskAgentContextRebudgetProof(forgedProof, driftEdge).valid, false, "tampered actual capacity must invalidate the proof checksum");
  const crossGroupReceipt = { ...resumeEdge.native_continuation_receipt, group_id: "phase257-other-group" };
  equal(lineage.verifyTaskAgentNativeContinuationReceipt(crossGroupReceipt, resumeEdge).valid, false, "cross-group continuation receipt reuse must be rejected");

  const crash = prepared("crash", { nativeSessionId: "thread-phase257-crash", attemptSequence: 2, invocationKind: "resume", branchKind: "native_recovery" });
  const direct = spool.createDirectAgentDispatchRequest({
    projectName: "phase257-project",
    message: "phase257 crash prompt",
    workDir: root,
    agentType: "codex",
    taskId: crash.taskId,
    executionId: crash.taskId,
    taskAgentSessionId: crash.taskAgentSessionId,
    groupId: crash.groupId,
    requestedNativeSessionId: "thread-phase257-crash",
    nativeResumeRequested: true,
  });
  spool.markDirectAgentDispatchStarted(direct.id, { runnerPid: 99_999_999 });
  let crashEdge = lineage.bindTaskAgentInvocationRunnerRequest(crash.edge, direct.id);
  const crashEvidence = continuation.buildNativeSessionContinuationEvidence({ provider: "codex", runnerRequestId: direct.id, requestedNativeSessionId: "thread-phase257-crash", returnedNativeSessionId: "thread-phase257-crash", providerOutputContractEvidence: runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: "thread-phase257-crash" })).providerOutputContractEvidence, nativeResumeRequested: true, runnerSuccess: true });
  spool.completeDirectAgentDispatch(direct.id, { success: true, output: "durable resume", nativeSessionId: "thread-phase257-crash", nativeContinuationEvidence: crashEvidence, exitCode: 0 });
  const recovery = lineage.reconcileTaskAgentInvocationRecovery({ groupId: crash.groupId, groupSessionId: crash.groupSessionId, minimumAgeMs: 0 });
  crashEdge = lineage.findTaskAgentInvocationEdge(crashEdge.invocation_edge_id);
  equal(recovery.recovered, 1, "startup recovery must consume the durable runner pair");
  equal(crashEdge.native_continuation_status, "acknowledged", "crash recovery must retain provider resume acknowledgement");
  equal(crashEdge.adoption_status, "adopted", "recovered invocation must retain verified adoption");

  const driftReport = lineage.buildTaskAgentInvocationLineageReport({ groupId: drift.groupId, groupSessionId: drift.groupSessionId });
  equal(driftReport.overall.contextRebudgetDriftCount, 1, "Memory Center report must count capacity drift");
  equal(driftReport.overall.nativeContinuationAcknowledgedCount, 1, "Memory Center report must count acknowledged native resume");
  equal(driftReport.rows.every(row => row.group_id === drift.groupId && row.group_session_id === drift.groupSessionId), true, "lineage report must preserve group-session isolation");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
  const collaborationRoutesSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration-routes.ts"), "utf-8");
  ok((collaborationSource.match(/nativeContinuationEvidence:/g) || []).length >= 3, "all three real dispatch paths must persist native continuation evidence");
  ok((`${collaborationSource}\n${collaborationRoutesSource}`.match(/typedMemoryDeliveryCapsule:/g) || []).length >= 3, "all real dispatch paths must bind the dispatched capsule budget");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf-8");
  const continuationSource = fs.readFileSync(path.join(root, "backend", "agents", "native-continuation.ts"), "utf-8");
  ok(serverSource.includes("returnedNativeSessionId") && continuationSource.includes("provider_resume_exit_success"), "runner callback must distinguish returned id from resume exit evidence");
  const globalSource = fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf-8");
  equal(globalSource.includes("TASK_AGENT_CONTEXT_REBUDGET_PROOF_SCHEMA"), false, "Global Agent must remain outside group child capacity proofs");

  console.log(JSON.stringify({
    pass: true,
    checks,
    continuation: { acknowledged: resumeEdge.native_continuation_status, fallback: fallbackEdge.native_continuation_status },
    rebudget: { status: driftEdge.context_rebudget_status, dispatched: 4_000, actual: 1_280, drift: 2_720 },
    recovery: { recovered: recovery.recovered, adoption: crashEdge.adoption_status },
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
