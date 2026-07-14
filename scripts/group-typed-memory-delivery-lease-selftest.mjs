import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.resolve(root, "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const kernel = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase247-delivery-lease-${nonce}`;
const groupSessionId = `gcs_phase247_${nonce}`;
const typedScopeId = `${groupId}--${groupSessionId}`;
const project = "phase247-project";
const taskId = `phase247-task-${nonce}`;
const taskAgentSessionId = `tas_phase247_${nonce}`;
const scope = `child-agent:${project}:${taskAgentSessionId}:precompact`;
let capacityTaskId = "";
let checks = 0;

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function cleanupRuntimeResidue() {
  for (const topEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
    if (!topEntry.isDirectory()) continue;
    const topDir = path.resolve(runtimeRoot, topEntry.name);
    let children = [];
    try { children = fs.readdirSync(topDir, { withFileTypes: true }); } catch { continue; }
    for (const child of children) {
      if (!child.name.startsWith(groupId) && !child.name.startsWith(`phase247-cross-${nonce}`)) continue;
      const target = path.resolve(topDir, child.name);
      if (!target.startsWith(`${topDir}${path.sep}`)) continue;
      fs.rmSync(target, { recursive: child.isDirectory(), force: true });
    }
  }
}

function makeDoc(relPath, content) {
  return {
    relPath,
    checksum: crypto.createHash("sha256").update(content).digest("hex").slice(0, 32),
    type: "project",
    name: relPath,
    description: content.slice(0, 120),
    snippet: content,
    score: 10,
  };
}

function makeArtifacts({
  docs = [makeDoc("project/lease.md", "delivery lease memory ".repeat(200))],
  attemptSequence = 1,
  sessionDeliveredBytes = 0,
  modelContextWindow = 200_000,
  taskSessionId = taskAgentSessionId,
  task = taskId,
  recallScope = scope,
  compactEpoch = "precompact",
  group = groupId,
  session = groupSessionId,
} = {}) {
  const recall = {
    schema: "ccm-group-typed-memory-recall-v1",
    version: 1,
    recalled: docs,
    surfaced: docs.map(doc => doc.relPath),
  };
  const capsule = memory.buildChildTypedMemoryDeliveryCapsule({
    groupId: group,
    groupSessionId: session,
    targetProject: project,
    taskId: task,
    taskAgentSessionId: taskSessionId,
    ledgerScope: { scope: recallScope, compactEpoch, taskId: task, taskAgentSessionId: taskSessionId },
    recall,
  }, {
    maxTokens: 5000,
    modelContextWindow,
    sessionDeliveredBytes,
  });
  const lease = kernel.buildWorkerTypedMemoryDeliveryLease(capsule, {
    query: "phase247 delivery lease",
    attemptSequence,
    generatedAt: "2026-07-14T00:00:00.000Z",
  });
  const bundle = {
    schema: "ccm-group-memory-context-v1",
    version: 1,
    group_id: group,
    group_session_id: session,
    target_project: project,
    session_binding: { task_id: task, task_agent_session_id: taskSessionId },
    typed_memory_recall: recall,
    typed_memory_delivery_capsule: capsule,
    typed_memory_delivery_lease: lease,
    group_state: {
      typedMemory: {
        recall,
        deliveryCapsule: capsule,
        deliveryLease: lease,
        ledger: { scope: recallScope, compactEpoch, taskId: task, taskAgentSessionId: taskSessionId },
      },
    },
  };
  return { recall, capsule, lease, bundle };
}

function modelCapacity(contextWindow) {
  return {
    schema: "ccm-model-context-capacity-v1",
    provider: "claudecode",
    model: "phase247-model",
    contextWindow,
    effectiveContextWindow: contextWindow,
    reservedOutputTokens: 4096,
    autoCompactBufferTokens: 4096,
    evidenceChecksum: `capacity-${contextWindow}`,
    source: "phase247-selftest",
  };
}

function makePacket(bundle, contextWindow = 200_000, taskSessionId = taskAgentSessionId, task = taskId) {
  return kernel.buildWorkerContextPacket({
    group: { id: bundle.group_id, members: [{ project }] },
    project,
    task: "phase247 delivery lease",
    taskId: task,
    groupSessionId: bundle.group_session_id,
    taskAgentSessionId: taskSessionId,
    memory: bundle,
    modelContextCapacity: modelCapacity(contextWindow),
    contextUsageOptions: { maxTokens: contextWindow, capacityProvenance: modelCapacity(contextWindow) },
  });
}

function admit(bundle, packet, renderedPrompt, attemptSequence = 0) {
  const admission = memory.admitChildTypedMemoryDelivery(bundle, {
    workerContextPacket: packet,
    renderedPrompt,
    attemptSequence,
    skipGroupSessionPresenceCheck: true,
  });
  equal(admission.admitted, true, `dispatch-time consume admission must pass: ${admission.reason || "unknown"}`);
  return admission;
}

function dispatchEvidence(admission, renderedPrompt, overrides = {}) {
  return {
    dispatched: true,
    executionReturned: true,
    renderedPrompt,
    dispatchTicket: admission.ticket,
    dispatchStartedAt: admission.ticket?.admitted_at || new Date().toISOString(),
    ...overrides,
  };
}

try {
  cleanupRuntimeResidue();

  const first = makeArtifacts();
  const firstPacket = makePacket(first.bundle);
  equal(first.lease.schema, "ccm-child-typed-memory-delivery-lease-v1", "capsule construction must create a pending delivery lease");
  equal(first.lease.status, "pending", "new lease must remain pending before runner delivery");
  equal(kernel.validateWorkerTypedMemoryDeliveryLease(first.lease, { capsule: first.capsule }).valid_for_commit, true, "pending lease must validate against its capsule");
  equal(firstPacket.typed_memory_delivery_capsule.trusted_for_delivery, true, "WorkerContextPacket must independently trust the bound capsule");

  const before = typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, scope);
  equal(before.deliveryCount, 0, "building a capsule and lease must not consume the recall ledger");
  equal(before.deliveredBytes, 0, "pending delivery must not consume the 60KB budget");

  const firstPrompt = `prompt capsule=${first.capsule.capsule_checksum}`;
  const failedAdmission = admit(first.bundle, firstPacket, firstPrompt, 1);
  const failedDispatch = memory.commitChildTypedMemoryDelivery(first.bundle, {
    workerContextPacket: firstPacket,
    dispatchEvidence: dispatchEvidence(failedAdmission, firstPrompt, { dispatched: false, executionReturned: false }),
  });
  equal(failedDispatch.committed, false, "failed dispatch must not commit the lease");
  equal(failedDispatch.reason, "dispatch_witness_incomplete", "failed dispatch must expose the missing witness reason");
  equal(typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, scope).deliveryCount, 0, "failed dispatch must leave delivery count unchanged");

  const committedAdmission = admit(first.bundle, firstPacket, firstPrompt, 1);
  const committed = memory.commitChildTypedMemoryDelivery(first.bundle, {
    workerContextPacket: firstPacket,
    dispatchEvidence: dispatchEvidence(committedAdmission, firstPrompt),
  });
  equal(committed.committed, true, "validated packet and runner witness must commit the lease");
  equal(committed.stats.deliveryCount, 1, "first committed lease must count one delivery");
  equal(committed.stats.deliveredBytes, first.capsule.delivered_bytes, "committed bytes must come from the validated capsule");

  const duplicatePrompt = first.capsule.capsule_checksum;
  const duplicateAdmission = admit(first.bundle, firstPacket, duplicatePrompt, 1);
  const duplicate = memory.commitChildTypedMemoryDelivery(first.bundle, {
    workerContextPacket: firstPacket,
    dispatchEvidence: dispatchEvidence(duplicateAdmission, duplicatePrompt),
  });
  equal(duplicate.committed, true, "retrying the same lease must replay the committed result");
  equal(duplicate.idempotent, true, "retrying the same lease must be reported as idempotent");
  equal(duplicate.stats.deliveryCount, 1, "same lease retry must not increment delivery count");
  equal(duplicate.stats.deliveredBytes, first.capsule.delivered_bytes, "same lease retry must not increment bytes");

  const second = makeArtifacts({ attemptSequence: 2, sessionDeliveredBytes: committed.stats.deliveredBytes });
  const secondPacket = makePacket(second.bundle);
  ok(second.lease.lease_id !== first.lease.lease_id, "a new task-agent turn must receive a new lease id");
  const secondAdmission = admit(second.bundle, secondPacket, second.capsule.capsule_checksum, 2);
  const secondCommit = memory.commitChildTypedMemoryDelivery(second.bundle, {
    workerContextPacket: secondPacket,
    dispatchEvidence: dispatchEvidence(secondAdmission, second.capsule.capsule_checksum),
  });
  equal(secondCommit.stats.deliveryCount, 2, "a new turn lease must count as a second delivery");
  equal(secondCommit.stats.deliveredBytes, first.capsule.delivered_bytes + second.capsule.delivered_bytes, "new turn bytes must accumulate once");

  const compactScope = `child-agent:${project}:${taskAgentSessionId}:cmp_phase247`;
  equal(typed.getGroupTypedMemoryRecallScopeStats(typedScopeId, compactScope).deliveredBytes, 0, "new compact epoch scope must restore the delivery budget");

  const replayBundle = { ...first.bundle, group_id: `phase247-cross-${nonce}` };
  const replay = memory.commitChildTypedMemoryDelivery(replayBundle, {
    workerContextPacket: firstPacket,
    dispatchEvidence: dispatchEvidence(duplicateAdmission, duplicatePrompt),
  });
  equal(replay.committed, false, "cross-group lease replay must fail closed");
  equal(replay.reason, "memory_bundle_identity_mismatch", "cross-group replay must report identity mismatch");

  const forgedLease = { ...first.lease, task_agent_session_id: "tas_other" };
  equal(kernel.validateWorkerTypedMemoryDeliveryLease(forgedLease, { capsule: first.capsule }).valid_for_commit, false, "cross-task lease mutation must invalidate checksum and binding");

  equal(kernel.buildWorkerTypedMemoryDeliveryLease(null, { query: "ignore memory" }), null, "ignore-memory flow without a capsule must not create a lease");
  equal(kernel.buildWorkerTypedMemoryDeliveryLease({}, { query: "global agent" }), null, "Global Agent context without group capsule must not create a group lease");

  const largeDocs = [makeDoc("project/large.md", "模型容量下降后必须重新预算类型化记忆。".repeat(3000))];
  const large = makeArtifacts({ docs: largeDocs, modelContextWindow: 200_000 });
  ok(large.capsule.delivered_tokens > 1000, "200K capsule must initially be allowed above 1000 tokens");
  const rebudget = kernel.rebuildWorkerTypedMemoryDeliveryForModelContext(large.bundle, 32_000);
  equal(rebudget.rebuilt, true, "200K to 32K must rebuild the typed-memory delivery artifacts");
  equal(rebudget.capsule.budget.model_context_window, 32_000, "rebuilt capsule must bind the current model window");
  equal(rebudget.capsule.budget.effective_max_tokens, 1000, "32K model must reduce memory delivery to 1000 tokens");
  ok(rebudget.capsule.delivered_tokens <= 1000, "rebuilt rows must fit the reduced token budget");
  ok(rebudget.capsule.capsule_checksum !== large.capsule.capsule_checksum, "capacity rebudget must replace the capsule checksum");
  ok(rebudget.lease.lease_id !== large.lease.lease_id, "capacity rebudget must replace the pending lease");
  equal(kernel.validateWorkerTypedMemoryDeliveryCapsule(rebudget.capsule).trusted_for_delivery, true, "rebuilt capsule must pass independent Runtime validation");
  equal(kernel.validateWorkerTypedMemoryDeliveryLease(rebudget.lease, { capsule: rebudget.capsule }).valid_for_commit, true, "rebuilt lease must bind the rebuilt capsule");

  const rebudgetPacket = makePacket(rebudget.memory, 32_000);
  equal(rebudgetPacket.typed_memory_delivery_capsule.trusted_for_delivery, true, "rebuilt WorkerContextPacket must trust the reduced capsule");
  equal(rebudgetPacket.acceptance.typed_memory_delivery_capsule_trusted, true, "rebuilt trust contract must accept the reduced capsule");
  equal(rebudgetPacket.typed_memory_delivery_capsule.capsule_checksum, rebudget.capsule.capsule_checksum, "packet must carry the rebuilt capsule checksum");

  capacityTaskId = `phase247-capacity-task-${nonce}`;
  let capacitySession = sessions.openTaskAgentSession({
    scopeId: capacityTaskId,
    taskId: capacityTaskId,
    groupId,
    project,
    agentType: "claudecode",
  });
  capacitySession = sessions.recordTaskAgentSessionTurn(capacitySession.id, {
    success: true,
    nativeModelCapabilityRecord: {
      recorded: true,
      entry: { model: "phase247-model", contextWindow: 200_000, checksum: "capacity-200000", source: "phase247-selftest", checkedAt: "2026-07-14T00:00:00.000Z" },
    },
  });
  const marked = sessions.markTaskAgentSessionsForCapacityDowngrade({ provider: "claudecode", currentContextWindow: 64_000, currentEvidenceChecksum: "capacity-64000" });
  ok(marked.sessions.some(item => item.sessionId === capacitySession.id), "capacity downgrade must mark the open task-agent session");

  const capacityScope = `child-agent:${project}:${capacitySession.id}:precompact`;
  const capacityLarge = makeArtifacts({ docs: largeDocs, taskSessionId: capacitySession.id, task: capacityTaskId, recallScope: capacityScope, modelContextWindow: 200_000 });
  const oldCapacityPacket = makePacket(capacityLarge.bundle, 64_000, capacitySession.id, capacityTaskId);
  const oldPreparation = sessions.prepareTaskAgentSessionCapacityRevalidation(capacitySession.id, oldCapacityPacket);
  equal(oldPreparation.prepared, false, "old 200K capsule must not prepare a 64K capacity downgrade");
  equal(oldPreparation.reason, "typed_memory_capsule_capacity_not_revalidated", "capacity preparation must identify stale typed-memory budget");

  const capacityRebudget = kernel.rebuildWorkerTypedMemoryDeliveryForModelContext(capacityLarge.bundle, 64_000);
  const capacitySmall = makeArtifacts({ docs: largeDocs.slice(0, 1), taskSessionId: capacitySession.id, task: capacityTaskId, recallScope: capacityScope, modelContextWindow: 64_000 });
  const newCapacityPacket = {
    packet_id: `wcp-capacity-${nonce}`,
    model_context_capacity: modelCapacity(64_000),
    context_usage: { status: "normal" },
    memory: { schema: "ccm-worker-memory-context-v1", summary: "rebuilt under 64K capacity" },
    typed_memory_delivery_capsule: {
      ...capacitySmall.capsule,
      trusted_for_delivery: kernel.validateWorkerTypedMemoryDeliveryCapsule(capacitySmall.capsule).trusted_for_delivery,
    },
  };
  const newPreparation = sessions.prepareTaskAgentSessionCapacityRevalidation(capacitySession.id, newCapacityPacket);
  equal(newPreparation.prepared, true, `rebuilt 64K capsule must prepare the capacity revalidation proof: ${newPreparation.reason || "unknown"} / ${JSON.stringify(capacitySmall.capsule.budget || {})}`);
  equal(newPreparation.session.capacityRevalidationRequired, true, "preparation alone must keep the downgrade gate active");
  const prematureCommit = sessions.commitTaskAgentSessionCapacityRevalidation(capacitySession.id, newPreparation.proof, {});
  equal(prematureCommit.acknowledged, false, "missing durable dispatch witness must not clear the downgrade gate");
  const newAck = sessions.commitTaskAgentSessionCapacityRevalidation(capacitySession.id, newPreparation.proof, {
    typedMemoryDispatchWalRecordChecksum: "a".repeat(64),
    typedMemoryDispatchWalState: "dispatch_started",
  });
  equal(newAck.acknowledged, true, "durably dispatched rebuilt 64K capsule must pass the capacity commit");
  equal(newAck.session.capacityRevalidationRequired, false, "successful two-phase commit must clear the downgrade gate");
  equal(sessions.verifyTaskAgentSessionCapacityRevalidationCommitReceipt(newAck.receipt, newPreparation.proof).valid, true, "capacity revalidation commit receipt must validate");

  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf8");
  const mainCall = collaborationSource.indexOf("const attemptOutput = await ctx.callAgentForGroupStream");
  const mainCommit = collaborationSource.indexOf("const typedMemoryDeliveryCommit = commitChildTypedMemoryDelivery", mainCall);
  ok(mainCall >= 0 && mainCommit > mainCall, "group worker lease commit must occur after the streaming runner returns");
  const directCall = collaborationSource.indexOf("output = await ctx.callAgent(task.target_project, message");
  const directCommit = collaborationSource.indexOf("const directTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery", directCall);
  ok(directCall >= 0 && directCommit > directCall, "direct task lease commit must occur after callAgent returns");
  const autoCall = collaborationSource.indexOf("const taskResult = await ctx.callAgent(");
  const autoCommit = collaborationSource.indexOf("const autoAssignTypedMemoryDeliveryCommit = commitChildTypedMemoryDelivery", autoCall);
  ok(autoCall >= 0 && autoCommit > autoCall, "auto-assign lease commit must occur after callAgent returns");
  ok(collaborationSource.indexOf("commitChildTypedMemoryDelivery", mainCall) > collaborationSource.indexOf("recordTaskAgentMemoryContextDelivery", mainCall), "group worker lease commit must follow the strong memory delivery receipt");

  console.log(JSON.stringify({
    pass: true,
    checks,
    firstLeaseId: first.lease.lease_id,
    idempotentDeliveryCount: duplicate.stats.deliveryCount,
    reducedTokenBudget: rebudget.capsule.effective_max_tokens,
    oldCapsuleAckRejected: oldPreparation.prepared === false,
    rebuiltCapsuleAckAccepted: newAck.acknowledged === true,
  }, null, 2));
} finally {
  if (capacityTaskId) sessions.purgeTaskAgentSessions(capacityTaskId);
  cleanupRuntimeResidue();
}
