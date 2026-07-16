import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-continuation-soak-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
process.env.CCM_CONTINUATION_SOAK_EPOCH = "svc_phase259_after_restart";

const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const continuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const memoryCenter = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function contract(provider, sessionId, drift = false) {
  const raw = provider === "codex"
    ? JSON.stringify(drift
      ? { type: "conversation.started", threadId: sessionId }
      : { type: "thread.started", thread_id: sessionId })
    : JSON.stringify(drift
      ? { type: "session.created", sessionId }
      : { type: "result", session_id: sessionId, result: "ok" });
  return runtime.normalizeAgentCommandOutput(provider, raw);
}

function bindAndDispatch(edge, label, compactEpoch) {
  const lifecycleHead = lifecycle.ensureGroupSessionLifecycleHead(edge.group_id, edge.group_session_id, { reason: "phase259_continuation_soak_fixture" }).head;
  let next = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp_phase259_${label}_${nonce}`,
    memoryContextSnapshotId: `tams_phase259_${label}_${nonce}`,
    memoryContextSnapshotChecksum: `snapshot-checksum-${label}`,
    renderedPrompt: `phase259 ${label} prompt`,
    compactEpoch,
    groupSessionMemoryBinding: {
      sessionLifecycleFenceRequired: true,
      sessionLifecycleHeadId: lifecycleHead.lifecycle_head_id,
      sessionLifecycleGeneration: lifecycleHead.generation,
      sessionLifecycleStatus: lifecycleHead.status,
      sessionLifecycleHeadChecksum: lifecycleHead.head_checksum,
    },
  });
  next = lineage.dispatchTaskAgentInvocationEdge(next, { transport: "codex" });
  return next;
}

function completeEdge(edge, label, nativeId, invocationKind = "resume") {
  const runnerRequestId = `adr_phase259_${label}_${nonce}`;
  edge = lineage.bindTaskAgentInvocationRunnerRequest(edge, runnerRequestId);
  const normalized = contract("codex", nativeId);
  const evidence = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: nativeId,
    returnedNativeSessionId: normalized.rawSessionId,
    providerOutputContractEvidence: normalized.providerOutputContractEvidence,
    nativeResumeRequested: invocationKind === "resume",
    runnerSuccess: true,
  });
  edge = lineage.completeTaskAgentInvocationEdge(edge, {
    success: true,
    provider: "codex",
    nativeSessionId: nativeId,
    nativeContinuationEvidence: evidence,
    runnerRequestId,
    output: `phase259 ${label} complete`,
  });
  edge = lineage.bindTaskAgentInvocationMemoryDelivery(edge, {
    recoveryRunnerPairValid: true,
    runnerPromptChecksum: edge.prompt_checksum,
  });
  return edge;
}

try {
  const recognized = contract("codex", "thread-phase259-known");
  equal(recognized.providerOutputContractEvidence.status, "recognized", "known Codex thread.started contract must be recognized");
  equal(recognized.sessionId, "thread-phase259-known", "recognized contract may expose a reusable thread id");
  const drifted = contract("codex", "thread-phase259-drift", true);
  equal(drifted.providerOutputContractEvidence.status, "output_format_drift", "unknown Codex event/field layout must be classified as output drift");
  equal(drifted.sessionId, "", "drifted provider output must not expose a reusable thread id");
  equal(drifted.rawSessionId, "thread-phase259-drift", "drift diagnostics must preserve the observed raw id");

  const driftEvidence = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: "adr-phase259-drift",
    requestedNativeSessionId: "thread-phase259-drift",
    returnedNativeSessionId: drifted.rawSessionId,
    providerOutputContractEvidence: drifted.providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  equal(driftEvidence.compatibilityStatus, "provider_output_format_drift", "drift must produce an explicit compatibility status");
  equal(driftEvidence.nativeContinuationAcknowledged, false, "drifted output must never acknowledge continuation");
  equal(driftEvidence.nativeSessionReusable, false, "drifted output must never be reusable");
  equal(continuation.verifyNativeSessionContinuationEvidence(driftEvidence, { provider: "codex", runnerRequestId: "adr-phase259-drift" }).valid, true, "fail-closed drift evidence must remain checksum-verifiable");

  const groupId = `group-phase259-${nonce}`;
  const groupSessionId = `gcs_phase259_${nonce.replace(/[^a-z0-9]/gi, "")}`;
  const taskId = `task-phase259-${nonce}`;
  const nativeId = `thread-phase259-${nonce}`;
  let taskSession = sessions.openTaskAgentSession({
    scopeId: taskId,
    taskId,
    groupId,
    project: "phase259-project",
    agentType: "codex",
  });
  taskSession = sessions.recordTaskAgentSessionTurn(taskSession.id, {
    success: true,
    nativeSessionId: nativeId,
    nativeModelCapabilityRecord: {
      recorded: true,
      entry: { model: "gpt-phase259", contextWindow: 200_000, checksum: "capacity-phase259-200000", source: "phase259-selftest" },
    },
  });
  const degraded = sessions.advanceTaskAgentSession(taskSession, {
    success: true,
    nativeSessionId: nativeId,
    nativeContinuationUnverified: true,
  });
  equal(degraded.resumeMode, "scratchpad", "unverified provider continuation must degrade the session to scratchpad");
  equal(degraded.nativeSessionId, "", "scratchpad downgrade must fence the unverified native id");

  let first = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase259-project",
    taskAgentSessionId: taskSession.id,
    nativeSessionId: nativeId,
    executionId: taskId,
    attemptSequence: 1,
    invocationKind: "spawn",
    branchKind: "main",
  });
  first = bindAndDispatch(first, "turn1", "precompact");
  first = completeEdge(first, "turn1", nativeId, "spawn");
  equal(first.reinjection_status, "proven", "first-turn memory delivery must be provable");

  let second = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase259-project",
    taskAgentSessionId: taskSession.id,
    nativeSessionId: nativeId,
    executionId: taskId,
    attemptSequence: 2,
    invocationKind: "resume",
    branchKind: "native_recovery",
    parentInvocationEdge: first,
    compactEpoch: "compact-phase259-1",
  });
  second = bindAndDispatch(second, "turn2", "compact-phase259-1");
  second = completeEdge(second, "turn2", nativeId, "resume");
  equal(second.native_continuation_status, "acknowledged", "second turn must prove matching provider-native resume");
  equal(second.reinjection_status, "proven", "post-compact turn must prove memory reinjection");

  sessions.markTaskAgentSessionsForCapacityDowngrade({
    provider: "codex",
    currentContextWindow: 64_000,
    currentEvidenceChecksum: "capacity-phase259-64000",
  });
  taskSession = sessions.listTaskAgentSessions({ taskId })[0];
  const capacityPacket = {
    packet_id: `wcp_phase259_capacity_${nonce}`,
    model_context_capacity: { contextWindow: 64_000, effectiveContextWindow: 44_000, evidenceChecksum: "capacity-phase259-64000" },
    context_usage: { status: "normal" },
    memory: {
      schema: "ccm-group-memory-context-v1",
      group_id: groupId,
      group_session_id: groupSessionId,
      summary: "current phase259 group-session memory",
    },
    task_agent_session_id: taskSession.id,
    task_agent_invocation_lineage: { invocation_edge_id: second.invocation_edge_id },
  };
  const preparedCapacity = sessions.prepareTaskAgentSessionCapacityRevalidation(taskSession.id, capacityPacket);
  equal(preparedCapacity.prepared, true, "capacity revalidation must persist prepare before simulated restart");
  equal(preparedCapacity.session.capacityRevalidationRequired, true, "prepare crash window must retain the downgrade gate");

  soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    phase: "restart_checkpoint",
    status: "interrupted_after_capacity_prepare",
    eventKey: "phase259-before-restart",
    serviceEpoch: "svc_phase259_before_restart",
    evidence: { invocation_edge_id: second.invocation_edge_id, capacityRevalidationProof: preparedCapacity.proof },
  });

  const committedCapacity = sessions.commitTaskAgentSessionCapacityRevalidation(taskSession.id, preparedCapacity.proof, {
    runnerRequestId: `adr_phase259_capacity_${nonce}`,
    runnerStarted: true,
  });
  equal(committedCapacity.acknowledged, true, "post-restart durable runner witness must commit prepared capacity proof");

  let interrupted = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase259-project",
    taskAgentSessionId: taskSession.id,
    nativeSessionId: nativeId,
    executionId: taskId,
    attemptSequence: 3,
    invocationKind: "resume",
    branchKind: "native_recovery",
    parentInvocationEdge: second,
    compactEpoch: "compact-phase259-2",
  });
  interrupted = bindAndDispatch(interrupted, "turn3-crash", "compact-phase259-2");
  const direct = spool.createDirectAgentDispatchRequest({
    projectName: "phase259-project",
    message: "phase259 turn3-crash prompt",
    workDir: root,
    agentType: "codex",
    taskId,
    executionId: taskId,
    taskAgentSessionId: taskSession.id,
    groupId,
  });
  spool.markDirectAgentDispatchStarted(direct.id, { runnerPid: 99999999 });
  interrupted = lineage.bindTaskAgentInvocationRunnerRequest(interrupted, direct.id);
  const turn3Contract = contract("codex", nativeId);
  const turn3Evidence = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: direct.id,
    requestedNativeSessionId: nativeId,
    returnedNativeSessionId: turn3Contract.rawSessionId,
    providerOutputContractEvidence: turn3Contract.providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  spool.completeDirectAgentDispatch(direct.id, {
    success: true,
    output: "runner result persisted before service crash",
    nativeSessionId: nativeId,
    nativeContinuationEvidence: turn3Evidence,
    exitCode: 0,
  });
  equal(lineage.findTaskAgentInvocationEdge(interrupted.invocation_edge_id).status, "dispatched", "runner result crash window must leave lineage nonterminal before startup recovery");

  const invocationRecovery = lineage.reconcileTaskAgentInvocationRecovery({ groupId, groupSessionId, minimumAgeMs: 0 });
  let recovered = lineage.findTaskAgentInvocationEdge(interrupted.invocation_edge_id);
  equal(recovered.status, "completed", "startup invocation recovery must adopt the durable runner result");
  equal(recovered.recovery_outcome, "recovered_completed", "recovered continuation must preserve an explicit recovery outcome");
  equal(recovered.native_continuation_status, "acknowledged", "recovered runner evidence must retain provider-native continuation proof");
  equal(recovered.reinjection_status, "proven", "invocation recovery must reconstruct post-compact reinjection from the durable runner pair");

  let reinjectionCrash = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase259-project",
    taskAgentSessionId: taskSession.id,
    nativeSessionId: nativeId,
    executionId: taskId,
    attemptSequence: 4,
    invocationKind: "resume",
    branchKind: "native_recovery",
    parentInvocationEdge: recovered,
    compactEpoch: "compact-phase259-3",
  });
  reinjectionCrash = bindAndDispatch(reinjectionCrash, "turn4-reinjection-crash", "compact-phase259-3");
  const reinjectionRunnerId = `adr_phase259_reinjection_${nonce}`;
  reinjectionCrash = lineage.bindTaskAgentInvocationRunnerRequest(reinjectionCrash, reinjectionRunnerId);
  const reinjectionContract = contract("codex", nativeId);
  const reinjectionEvidence = continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId: reinjectionRunnerId,
    requestedNativeSessionId: nativeId,
    returnedNativeSessionId: reinjectionContract.rawSessionId,
    providerOutputContractEvidence: reinjectionContract.providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
  reinjectionCrash = lineage.completeTaskAgentInvocationEdge(reinjectionCrash, {
    success: true,
    provider: "codex",
    nativeSessionId: nativeId,
    nativeContinuationEvidence: reinjectionEvidence,
    runnerRequestId: reinjectionRunnerId,
    output: "result persisted before reinjection proof",
  });
  soak.recordTaskAgentContinuationSoakEvent({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    phase: "restart_checkpoint",
    status: "interrupted_before_post_compact_reinjection",
    eventKey: "phase259-before-reinjection-restart",
    serviceEpoch: "svc_phase259_before_restart",
    evidence: { invocation_edge_id: reinjectionCrash.invocation_edge_id, compact_epoch: reinjectionCrash.compact_epoch },
  });
  const preReinjectionReport = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId });
  ok(preReinjectionReport.rows[0].gaps.includes("post_compact_reinjection_unproven"), "crash before reinjection binding must remain visible as a soak gap");
  reinjectionCrash = lineage.bindTaskAgentInvocationMemoryDelivery(reinjectionCrash, {
    recoveryRunnerPairValid: true,
    runnerPromptChecksum: reinjectionCrash.prompt_checksum,
  });
  equal(reinjectionCrash.reinjection_status, "proven", "post-restart delivery reconstruction must prove reinjection");

  const reconciled = soak.reconcileTaskAgentContinuationSoak({
    invocationEdges: lineage.listTaskAgentInvocationEdges({ groupId, groupSessionId }).edges,
    taskAgentSessions: sessions.listTaskAgentSessions({ taskId }),
  });
  ok(reconciled.recorded + reconciled.idempotent > 0, "startup soak reconciliation must replay authoritative lifecycle evidence");
  const report = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId });
  equal(report.overall.chainCount, 1, "one task-agent session must produce one isolated soak chain");
  equal(report.overall.validChainCount, 1, "soak event hash chain must remain continuous across restart replay");
  equal(report.overall.multiTurnChainCount, 1, "three provider turns must be recognized as a multi-turn soak");
  equal(report.overall.restartObservedChainCount, 1, "distinct service epochs must prove a restart was observed");
  ok(report.overall.recoveredEventCount > 0, "startup replay must mark recovered evidence events");
  equal(report.overall.providerOutputFormatDriftCount, 0, "healthy real-run chain must contain no output drift");
  ok(report.overall.postCompactReinjectionProvenCount >= 2, "post-compact turns must retain reinjection proofs");
  equal(report.overall.capacityPreparedCount, report.overall.capacityCommittedCount, "capacity prepare/commit chain must close after restart");
  equal(report.overall.status, "ok", "fully recovered multi-turn soak chain must become healthy");

  const center = memoryCenter.buildTaskAgentMemoryContextSnapshotReport({ groupId });
  equal(center.continuationSoak.schema, "ccm-task-agent-continuation-soak-report-v6", "Memory Center must expose the persisted soak report");
  equal(center.overall.continuationSoakValidChainCount, 1, "Memory Center must expose evidence-chain continuity metrics");
  equal(center.overall.continuationSoakRestartObservedChainCount, 1, "Memory Center must expose restart soak health");
  equal(center.overall.continuationSoakPostCompactArtifactCompactTransactionReceiptMismatchCount, 0, "Memory Center must expose compact transaction receipt mismatch metrics");

  const globalSource = fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf-8");
  equal(globalSource.includes("task-agent-continuation-soak"), false, "Global Agent must remain outside group continuation soak bodies");
  const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId);
  ok(deletion.continuationSoakArtifacts.deleted >= 1, "group-session deletion must remove continuation soak artifacts");
  equal(soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId }).overall.chainCount, 0, "deleted group session must leave no soak chain");

  console.log(JSON.stringify({
    pass: true,
    checks,
    parser: { recognized: recognized.providerOutputContractEvidence.status, drift: drifted.providerOutputContractEvidence.status },
    recovery: { recovered: invocationRecovery.recovered, soakRecorded: reconciled.recorded, soakIdempotent: reconciled.idempotent },
    report: report.overall,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
