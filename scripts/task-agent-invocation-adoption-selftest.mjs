import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-invocation-adoption-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const nativeContinuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const sha = (value, length = 64) => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function boundEdge(label, options = {}) {
  const groupId = options.groupId || `phase256-${label}-${nonce}`;
  const groupSessionId = options.groupSessionId || `gcs_phase256_${label}_${nonce}`;
  const taskId = options.taskId || `task-phase256-${label}-${nonce}`;
  const taskAgentSessionId = options.taskAgentSessionId || `tas_phase256_${label}_${nonce}`;
  const prompt = options.prompt || `phase256 ${label} prompt`;
  const lifecycleHead = lifecycle.ensureGroupSessionLifecycleHead(groupId, groupSessionId, { reason: "phase256 invocation adoption fixture" }).head;
  let edge = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase256-project",
    taskAgentSessionId,
    nativeSessionId: options.nativeSessionId || "",
    executionId: options.executionId || taskId,
    attemptSequence: options.attemptSequence || 1,
    providerAttempt: options.providerAttempt || 1,
    invocationKind: options.invocationKind || "spawn",
    branchKind: options.branchKind || "main",
    parentInvocationEdge: options.parentInvocationEdge,
    retryOfInvocationEdgeId: options.retryOfInvocationEdgeId || "",
    forkReason: options.forkReason || "",
  });
  edge = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp_${label}_${nonce}`,
    memoryContextSnapshotId: `tams_${label}_${nonce}`,
    memoryContextSnapshotChecksum: sha(`snapshot-${label}`, 24),
    groupSessionMemoryBinding: {
      sessionLifecycleFenceRequired: true,
      sessionLifecycleHeadId: lifecycleHead.lifecycle_head_id,
      sessionLifecycleGeneration: lifecycleHead.generation,
      sessionLifecycleStatus: lifecycleHead.status,
      sessionLifecycleHeadChecksum: lifecycleHead.head_checksum,
    },
    renderedPrompt: prompt,
  });
  return { groupId, groupSessionId, taskId, taskAgentSessionId, prompt, edge };
}

function completedRoot(label, options = {}) {
  const fixture = boundEdge(label, options);
  let edge = lineage.dispatchTaskAgentInvocationEdge(fixture.edge, { transport: "codex" });
  edge = lineage.bindTaskAgentInvocationRunnerRequest(edge, `adr_${label}_${nonce}`);
  edge = lineage.completeTaskAgentInvocationEdge(edge, {
    success: true,
    nativeSessionId: options.nativeSessionId || `native-${label}`,
    runnerRequestId: `adr_${label}_${nonce}`,
    output: `completed ${label}`,
  });
  return { ...fixture, edge };
}

function deliveryReceipt(fixture, edge, overrides = {}) {
  const lifecycleHead = lifecycle.readGroupSessionLifecycleHead(fixture.groupId, fixture.groupSessionId);
  const bindingCore = {
    groupId: fixture.groupId,
    groupSessionId: fixture.groupSessionId,
    scopeId: `${fixture.groupId}--${fixture.groupSessionId}`,
    checksum: sha(`binding-${fixture.groupId}-${fixture.groupSessionId}`, 24),
    deliveryReady: true,
    sessionLifecycleFenceRequired: true,
    sessionLifecycleFenceValid: true,
    sessionLifecycleHeadId: lifecycleHead.lifecycle_head_id,
    sessionLifecycleGeneration: lifecycleHead.generation,
    sessionLifecycleStatus: lifecycleHead.status,
    sessionLifecycleHeadChecksum: lifecycleHead.head_checksum,
  };
  const payload = {
    schema: "ccm-task-agent-memory-context-delivery-receipt-v2",
    version: 2,
    receiptId: `tamdr_phase256_${sha(`${edge.invocation_edge_id}-${nonce}`, 20)}`,
    source: "ccm_runner_dispatch_witness",
    status: "delivered",
    delivered: true,
    deliveredAt: new Date().toISOString(),
    taskAgentSessionId: fixture.taskAgentSessionId,
    taskId: fixture.taskId,
    groupId: fixture.groupId,
    project: "phase256-project",
    runtime: edge.transport || "codex",
    nativeSessionId: edge.native_session_id || "",
    executionId: fixture.taskId,
    traceId: "",
    attempt: edge.attempt_sequence || 1,
    runnerRequestId: edge.runner_request_id,
    memoryContextSnapshotId: edge.memory_context_snapshot_id,
    memoryContextSnapshotChecksum: edge.memory_context_snapshot_checksum,
    memoryContextChecksum: sha(`memory-${fixture.groupId}`, 24),
    workerContextPacketId: edge.worker_context_packet_id,
    groupSessionMemoryBinding: bindingCore,
    groupSessionMemoryBindingChecksum: bindingCore.checksum,
    sessionLifecycleFenceValid: true,
    sessionLifecycleHeadId: lifecycleHead.lifecycle_head_id,
    sessionLifecycleGeneration: lifecycleHead.generation,
    sessionLifecycleStatus: lifecycleHead.status,
    sessionLifecycleHeadChecksum: lifecycleHead.head_checksum,
    modelExtractionEvidenceValid: true,
    snapshotRenderedPromptChecksum: edge.prompt_checksum,
    actualRenderedPromptChecksum: edge.prompt_checksum,
    promptBindingMode: "exact",
    executionSucceeded: true,
    outputChecksum: sha("phase256 output", 24),
    ...overrides,
  };
  return { ...payload, checksum: sha(JSON.stringify(payload), 64) };
}

try {
  const leaseGroup = `phase256-lease-${nonce}`;
  const leaseSession = `gcs_phase256_lease_${nonce}`;
  const firstLease = lineage.acquireTaskAgentInvocationRecoveryLease(leaseGroup, leaseSession, { leaseMs: 60_000 });
  equal(firstLease.acquired, true, "first recovery owner must acquire the scope lease");
  equal(firstLease.lease.fencing_token, 1, "first recovery lease must start at fence 1");
  const contendedLease = lineage.acquireTaskAgentInvocationRecoveryLease(leaseGroup, leaseSession, { leaseMs: 60_000 });
  equal(contendedLease.acquired, false, "second live owner must not enter the same recovery scope");
  equal(contendedLease.lease.lease_id, firstLease.lease.lease_id, "contention must report the active owner lease");
  equal(lineage.finalizeTaskAgentInvocationRecoveryLease(firstLease.lease, { pass: true }).finalized, true, "lease owner must finalize with its exact fence");
  const secondLease = lineage.acquireTaskAgentInvocationRecoveryLease(leaseGroup, leaseSession, { leaseMs: 60_000 });
  equal(secondLease.lease.fencing_token, 2, "new recovery run must monotonically increment the fence");
  lineage.finalizeTaskAgentInvocationRecoveryLease(secondLease.lease, { pass: true });
  const deadOwnerLease = lineage.acquireTaskAgentInvocationRecoveryLease(leaseGroup, leaseSession, { ownerPid: 99999999, leaseMs: 60_000 });
  equal(deadOwnerLease.acquired, true, "dead-owner fixture must acquire before simulated crash");
  const takeoverLease = lineage.acquireTaskAgentInvocationRecoveryLease(leaseGroup, leaseSession, { leaseMs: 60_000 });
  equal(takeoverLease.acquired, true, "dead recovery owner must be taken over without waiting for expiry");
  equal(takeoverLease.lease.takeover, true, "takeover receipt must preserve abandoned-owner evidence");
  ok(takeoverLease.lease.fencing_token > deadOwnerLease.lease.fencing_token, "takeover fence must exceed abandoned owner fence");
  lineage.finalizeTaskAgentInvocationRecoveryLease(takeoverLease.lease, { pass: true });

  const blocked = boundEdge("lease-blocked");
  const blocker = lineage.acquireTaskAgentInvocationRecoveryLease(blocked.groupId, blocked.groupSessionId, { leaseMs: 60_000 });
  const blockedRun = lineage.reconcileTaskAgentInvocationRecovery({ groupId: blocked.groupId, groupSessionId: blocked.groupSessionId, minimumAgeMs: 0 });
  equal(blockedRun.lease_contended, 1, "reconcile must report a live competing recovery owner");
  equal(lineage.findTaskAgentInvocationEdge(blocked.edge.invocation_edge_id).status, "prepared", "contended recovery must not mutate the edge");
  lineage.finalizeTaskAgentInvocationRecoveryLease(blocker.lease, { released: true });
  const fencedRun = lineage.reconcileTaskAgentInvocationRecovery({ groupId: blocked.groupId, groupSessionId: blocked.groupSessionId, minimumAgeMs: 0 });
  const fencedEdge = lineage.findTaskAgentInvocationEdge(blocked.edge.invocation_edge_id);
  equal(fencedEdge.recovery_outcome, "abandoned_before_dispatch", "lease owner may deterministically close an undispatched edge");
  ok(fencedEdge.recovery_lease_id.startsWith("tirl_"), "recovery mutation must persist its lease id");
  ok(fencedEdge.recovery_fencing_token >= 2, "recovery mutation must persist a monotonic fence");
  equal(lineage.readTaskAgentInvocationRecoveryLease(blocked.groupId, blocked.groupSessionId).status, "completed", "successful recovery must durably finalize its lease");
  equal(fencedRun.leased, 1, "recovery run must expose acquired scope count");

  const continuityGroup = `phase256-continuity-${nonce}`;
  const continuitySession = `gcs_phase256_continuity_${nonce}`;
  const continuityTask = `task-phase256-continuity-${nonce}`;
  const rootEdge = completedRoot("continuity-root", { groupId: continuityGroup, groupSessionId: continuitySession, taskId: continuityTask, nativeSessionId: "native-continuity" });
  const resumed = boundEdge("continuity-resume", {
    groupId: continuityGroup,
    groupSessionId: continuitySession,
    taskId: continuityTask,
    taskAgentSessionId: rootEdge.taskAgentSessionId,
    nativeSessionId: "native-continuity",
    attemptSequence: 2,
    invocationKind: "resume",
    branchKind: "native_recovery",
    parentInvocationEdge: rootEdge.edge,
  });
  let resumedEdge = lineage.dispatchTaskAgentInvocationEdge(resumed.edge, { transport: "codex" });
  resumedEdge = lineage.bindTaskAgentInvocationRunnerRequest(resumedEdge, `adr_continuity_resume_${nonce}`);
  resumedEdge = lineage.completeTaskAgentInvocationEdge(resumedEdge, {
    success: true,
    nativeSessionId: "native-continuity",
    nativeContinuationEvidence: nativeContinuation.buildNativeSessionContinuationEvidence({ provider: "codex", runnerRequestId: `adr_continuity_resume_${nonce}`, requestedNativeSessionId: "native-continuity", returnedNativeSessionId: "native-continuity", providerOutputContractEvidence: runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: "native-continuity" })).providerOutputContractEvidence, nativeResumeRequested: true, runnerSuccess: true }),
    runnerRequestId: `adr_continuity_resume_${nonce}`,
    output: "resumed",
  });
  equal(resumedEdge.adoption_status, "adopted", "native resume must adopt the exact requested native session");
  equal(lineage.verifyTaskAgentInvocationAdoptionReceipt(resumedEdge.adoption_receipt, resumedEdge).valid, true, "adoption receipt checksum and scope must validate");
  resumedEdge = lineage.bindTaskAgentInvocationMemoryDelivery(resumedEdge, { deliveryReceipt: deliveryReceipt(resumed, resumedEdge) });
  equal(resumedEdge.reinjection_status, "proven", "resume first dispatch must prove current group-session memory delivery");
  equal(lineage.verifyTaskAgentInvocationReinjectionProof(resumedEdge.reinjection_proof, resumedEdge).valid, true, "reinjection proof checksum and identity must validate");

  const switched = boundEdge("continuity-switch", {
    groupId: continuityGroup,
    groupSessionId: continuitySession,
    taskId: continuityTask,
    taskAgentSessionId: `tas_phase256_switch_${nonce}`,
    invocationKind: "spawn",
    branchKind: "provider_switch",
    parentInvocationEdge: resumedEdge,
    retryOfInvocationEdgeId: resumedEdge.invocation_edge_id,
    forkReason: "codex_to_cursor",
  });
  let switchedEdge = lineage.dispatchTaskAgentInvocationEdge(switched.edge, { transport: "cursor" });
  switchedEdge = lineage.bindTaskAgentInvocationRunnerRequest(switchedEdge, `adr_continuity_switch_${nonce}`);
  switchedEdge = lineage.completeTaskAgentInvocationEdge(switchedEdge, { success: true, nativeSessionId: "native-cursor", runnerRequestId: `adr_continuity_switch_${nonce}`, output: "switched" });
  switchedEdge = lineage.bindTaskAgentInvocationMemoryDelivery(switchedEdge, { deliveryReceipt: deliveryReceipt(switched, switchedEdge) });
  equal(switchedEdge.adoption_receipt.adoption_mode, "provider_switch_fork", "provider switch must use explicit fork adoption mode");
  equal(switchedEdge.adoption_status, "adopted", "provider switch must adopt its rebuilt context");
  equal(switchedEdge.reinjection_status, "proven", "provider switch must re-inject current group-session memory");

  const continuityReport = lineage.buildTaskAgentInvocationLineageReport({ groupId: continuityGroup, groupSessionId: continuitySession });
  equal(continuityReport.overall.adoptionRequiredCount, 2, "report must count successful continuity boundaries");
  equal(continuityReport.overall.adoptionVerifiedCount, 2, "report must expose verified adoption receipts");
  equal(continuityReport.overall.reinjectionProvenCount, 2, "report must expose proven first-dispatch reinjections");
  equal(continuityReport.overall.adoptionInvalidCount, 0, "verified continuity graph must have no invalid adoption receipt");
  equal(continuityReport.overall.reinjectionUnverifiedCount, 0, "verified continuity graph must have no unproven reinjection");

  const mismatchRoot = completedRoot("mismatch-root", { nativeSessionId: "native-mismatch-a" });
  const mismatch = boundEdge("mismatch-resume", {
    groupId: mismatchRoot.groupId,
    groupSessionId: mismatchRoot.groupSessionId,
    taskId: mismatchRoot.taskId,
    taskAgentSessionId: mismatchRoot.taskAgentSessionId,
    nativeSessionId: "native-mismatch-a",
    attemptSequence: 2,
    invocationKind: "resume",
    branchKind: "native_recovery",
    parentInvocationEdge: mismatchRoot.edge,
  });
  let mismatchEdge = lineage.dispatchTaskAgentInvocationEdge(mismatch.edge, { transport: "codex" });
  mismatchEdge = lineage.bindTaskAgentInvocationRunnerRequest(mismatchEdge, `adr_mismatch_${nonce}`);
  mismatchEdge = lineage.completeTaskAgentInvocationEdge(mismatchEdge, { success: true, nativeSessionId: "native-mismatch-b", nativeContinuationEvidence: nativeContinuation.buildNativeSessionContinuationEvidence({ provider: "codex", runnerRequestId: `adr_mismatch_${nonce}`, requestedNativeSessionId: "native-mismatch-a", returnedNativeSessionId: "native-mismatch-b", nativeResumeRequested: true, runnerSuccess: true }), runnerRequestId: `adr_mismatch_${nonce}`, output: "wrong session" });
  equal(mismatchEdge.adoption_status, "unverified", "native session identity drift must fail adoption closed");
  mismatchEdge = lineage.bindTaskAgentInvocationMemoryDelivery(mismatchEdge, { deliveryReceipt: { ...deliveryReceipt(mismatch, mismatchEdge), checksum: "tampered" } });
  equal(mismatchEdge.reinjection_status, "unverified", "tampered delivery receipt must not prove reinjection");
  const mismatchReport = lineage.buildTaskAgentInvocationLineageReport({ groupId: mismatch.groupId, groupSessionId: mismatch.groupSessionId });
  ok(mismatchReport.weakRows.some(row => row.gaps.includes("adoption_receipt_unverified") && row.gaps.includes("recovery_reinjection_unproven")), "Memory Center report must surface both continuity failures");

  const recoveryRoot = completedRoot("runner-recovery-root", { nativeSessionId: "native-runner-recovery" });
  const recoveryEdgeFixture = boundEdge("runner-recovery", {
    groupId: recoveryRoot.groupId,
    groupSessionId: recoveryRoot.groupSessionId,
    taskId: recoveryRoot.taskId,
    taskAgentSessionId: recoveryRoot.taskAgentSessionId,
    nativeSessionId: "native-runner-recovery",
    attemptSequence: 2,
    invocationKind: "resume",
    branchKind: "native_recovery",
    parentInvocationEdge: recoveryRoot.edge,
  });
  let recoveryEdge = lineage.dispatchTaskAgentInvocationEdge(recoveryEdgeFixture.edge, { transport: "codex" });
  const direct = spool.createDirectAgentDispatchRequest({
    projectName: "phase256-project",
    message: recoveryEdgeFixture.prompt,
    workDir: root,
    agentType: "codex",
    taskId: recoveryEdgeFixture.taskId,
    executionId: recoveryEdgeFixture.taskId,
    taskAgentSessionId: recoveryEdgeFixture.taskAgentSessionId,
    groupId: recoveryEdgeFixture.groupId,
    requestedNativeSessionId: "native-runner-recovery",
    nativeResumeRequested: true,
  });
  spool.markDirectAgentDispatchStarted(direct.id, { runnerPid: 99999999 });
  recoveryEdge = lineage.bindTaskAgentInvocationRunnerRequest(recoveryEdge, direct.id);
  spool.completeDirectAgentDispatch(direct.id, { success: true, output: "durable recovery", nativeSessionId: "native-runner-recovery", nativeContinuationEvidence: nativeContinuation.buildNativeSessionContinuationEvidence({ provider: "codex", runnerRequestId: direct.id, requestedNativeSessionId: "native-runner-recovery", returnedNativeSessionId: "native-runner-recovery", providerOutputContractEvidence: runtime.normalizeAgentCommandOutput("codex", JSON.stringify({ type: "thread.started", thread_id: "native-runner-recovery" })).providerOutputContractEvidence, nativeResumeRequested: true, runnerSuccess: true }), exitCode: 0 });
  const recoveryRun = lineage.reconcileTaskAgentInvocationRecovery({ groupId: recoveryRoot.groupId, groupSessionId: recoveryRoot.groupSessionId, minimumAgeMs: 0 });
  const recoveredEdge = lineage.findTaskAgentInvocationEdge(recoveryEdge.invocation_edge_id);
  equal(recoveredEdge.recovery_outcome, "recovered_completed", "valid durable runner pair must recover the continuity edge");
  equal(recoveredEdge.adoption_status, "adopted", "crash recovery must reconstruct native adoption receipt");
  equal(recoveredEdge.reinjection_status, "proven", "crash recovery must reconstruct first-dispatch proof from the exact runner pair");
  equal(recoveredEdge.reinjection_proof.source, "direct_runner_pair_reconstruction", "reconstructed proof must name its evidence source");
  ok(recoveredEdge.recovery_fencing_token > 0 && recoveryRun.max_fencing_token > 0, "recovered edge and run must expose the same fencing domain");

  const deletion = memory.deleteGroupSessionMemoryArtifacts(blocked.groupId, blocked.groupSessionId);
  equal(deletion.invocationLineageArtifacts.recoveryLeaseDeleted, 1, "group-session deletion must remove its recovery lease");
  equal(lineage.readTaskAgentInvocationRecoveryLease(blocked.groupId, blocked.groupSessionId), null, "deleted group session must leave no recovery lease");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
  ok((collaborationSource.match(/bindTaskAgentInvocationMemoryDelivery/g) || []).length >= 4, "all three real dispatch paths must bind reinjection proof");
  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf-8");
  ok(serverSource.indexOf("reconcileTaskAgentInvocationRecovery()") < serverSource.indexOf("resumeTaskQueues(startupCollabCtx)"), "fenced invocation recovery must still precede queue resume");
  const globalSource = fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf-8");
  equal(globalSource.includes("TASK_AGENT_INVOCATION_ADOPTION_RECEIPT_SCHEMA"), false, "Global Agent must remain outside group child adoption context");

  console.log(JSON.stringify({
    pass: true,
    checks,
    leases: {
      firstFence: firstLease.lease.fencing_token,
      takeoverFence: takeoverLease.lease.fencing_token,
      reconcileFence: fencedEdge.recovery_fencing_token,
    },
    continuity: {
      adoptionVerified: continuityReport.overall.adoptionVerifiedCount,
      reinjectionProven: continuityReport.overall.reinjectionProvenCount,
      recovered: recoveryRun.recovered,
    },
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
