import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-session-lifecycle-fence-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const lifecycle = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-lifecycle-head.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `group-phase265-${nonce}`;
const project = "phase265-project";
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function buildMemoryContext(groupSessionId, taskAgentSessionId, taskId) {
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    memory_policy: { use: "session", ignored: false },
    session_binding: {
      binding_id: `gmb_phase265_${groupSessionId}`,
      task_id: taskId,
      task_agent_session_id: taskAgentSessionId,
    },
    compaction: {},
    group_state: {
      goal: "Deleted group sessions must reject late Task Agent output.",
      typedMemory: { ledger: { compactEpoch: "precompact" } },
    },
  };
}

function prepareInvocation(taskSession, groupSessionId, taskId, label) {
  const prompt = `PHASE265=${label} GROUP_SESSION=${groupSessionId}`;
  let edge = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskAgentSessionId: taskSession.id,
    taskId,
    targetProject: project,
    executionId: `${taskId}-${label}`,
    attemptSequence: label.length,
    invocationKind: "spawn",
    branchKind: "main",
    compactEpoch: "precompact",
  });
  const memoryContext = buildMemoryContext(groupSessionId, taskSession.id, taskId);
  const snapshot = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId,
    groupId,
    project,
    agentType: "codex",
    turn: label.length,
    executionId: `${taskId}-${label}`,
    workerContextPacket: {
      packet_id: `wcp_phase265_${label}_${nonce}`,
      memory: memoryContext,
      task_agent_invocation_lineage: { invocation_edge_id: edge.invocation_edge_id },
    },
    memoryContext,
    renderedPrompt: prompt,
    invocationLineage: { invocation_edge_id: edge.invocation_edge_id },
  });
  const binding = snapshot.snapshot.context.group_session_memory_binding;
  edge = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp_phase265_${label}_${nonce}`,
    memoryContextSnapshotId: snapshot.snapshot.snapshot_id,
    memoryContextSnapshotChecksum: snapshot.snapshot.checksum,
    renderedPrompt: prompt,
    compactEpoch: "precompact",
    groupSessionMemoryBinding: binding,
  });
  return { label, taskId, groupSessionId, prompt, edge, snapshot, binding };
}

function recordDelivery(taskSession, invocation, runnerRequestId) {
  return sessions.recordTaskAgentMemoryContextDelivery(taskSession.id, {
    snapshotId: invocation.snapshot.snapshot.snapshot_id,
    renderedPrompt: invocation.prompt,
    snapshotRenderedPrompt: invocation.prompt,
    executionId: `${invocation.taskId}-${invocation.label}`,
    runtime: "codex",
    attempt: invocation.label.length,
    runnerRequestId,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: `phase265 ${invocation.label} output`,
    fileChanges: { files: [{ path: `src/${invocation.label}.ts`, status: "modified", diff: `+${invocation.label}` }] },
    nativeContinuationEvidence: {
      providerContractId: "pcc_phase265",
      providerRuntimeVersion: "phase265-fixture-1",
      providerRuntimeIdentityChecksum: "phase265-runtime-checksum",
    },
    invocationEdgeId: invocation.edge.invocation_edge_id,
  });
}

try {
  const originalSession = storage.createGroupChatSession(groupId, "Phase 265 original session");
  const originalHead = lifecycle.readGroupSessionLifecycleHead(groupId, originalSession.id);
  equal(originalHead?.status, "active", "a new gcs_* session must have an active lifecycle head");
  equal(originalHead?.generation, 1, "a new session lifecycle must start at generation one");

  const oldTaskId = `task-phase265-old-${nonce}`;
  const oldTaskSession = sessions.openTaskAgentSession({
    scopeId: oldTaskId,
    taskId: oldTaskId,
    groupId,
    project,
    agentType: "codex",
  });
  let running = prepareInvocation(oldTaskSession, originalSession.id, oldTaskId, "running-before-delete");
  equal(running.binding.sessionLifecycleFenceValid, true, "the initial snapshot must bind the active lifecycle generation");
  equal(running.binding.sessionLifecycleGeneration, 1, "the initial snapshot must capture lifecycle generation one");
  running.edge = lineage.dispatchTaskAgentInvocationEdge(running.edge, {
    runnerRequestId: `runner-before-delete-${nonce}`,
    transport: "phase265-fixture",
  });
  equal(running.edge.session_lifecycle_dispatch_fence_valid, true, "the task may dispatch while its group session is active");

  const deletion = storage.deleteGroupChatSession(groupId, originalSession.id, {
    force: true,
    reason: "phase265_delete_while_task_running",
  });
  const tombstone = lifecycle.readGroupSessionLifecycleHead(groupId, originalSession.id);
  equal(tombstone?.status, "deleted", "deleting the session must persist a lifecycle tombstone");
  equal(tombstone?.generation, 2, "deletion must advance the lifecycle generation");
  equal(tombstone?.previous_head_checksum, originalHead?.head_checksum, "the tombstone must chain to the active head");
  ok(deletion.replacement?.id?.startsWith("gcs_"), "deleting the final session must create a replacement gcs_* session");
  ok(deletion.replacement.id !== originalSession.id, "the replacement must use a new session identity");

  running.edge = lineage.completeTaskAgentInvocationEdge(running.edge, {
    success: true,
    runnerRequestId: `runner-before-delete-${nonce}`,
    output: "old session task completed after deletion",
  });
  const staleDelivery = recordDelivery(oldTaskSession, running, `runner-before-delete-${nonce}`);
  equal(staleDelivery.receipt.status, "session_lifecycle_stale", "late output must be rejected by the session lifecycle fence");
  equal(staleDelivery.receipt.delivered, false, "late output must not become memory-delivered");
  equal(staleDelivery.receipt.taskArtifactProven, false, "late output must not become a proven task artifact");
  running.edge = lineage.bindTaskAgentInvocationMemoryDelivery(running.edge, { deliveryReceipt: staleDelivery.receipt });
  equal(running.edge.reinjection_status, "unverified", "late output must not prove memory reinjection");

  const afterDelete = prepareInvocation(oldTaskSession, originalSession.id, oldTaskId, "prepared-after-delete");
  equal(afterDelete.binding.deliveryReady, false, "a deleted session must fail snapshot delivery readiness");
  equal(afterDelete.binding.sessionLifecycleFenceStatus, "deleted", "the snapshot must expose deleted lifecycle status");
  let deletedDispatchError = null;
  try {
    lineage.dispatchTaskAgentInvocationEdge(afterDelete.edge, {
      runnerRequestId: `runner-after-delete-${nonce}`,
      transport: "phase265-fixture",
    });
  } catch (error) {
    deletedDispatchError = error;
  }
  equal(deletedDispatchError?.code, "TASK_AGENT_GROUP_SESSION_STALE", "a deleted session must be rejected immediately before dispatch");
  ok(deletedDispatchError?.sessionLifecycleValidation?.issues?.includes("session_lifecycle_deleted"), "the dispatch rejection must identify the tombstone");

  const replacementHead = lifecycle.readGroupSessionLifecycleHead(groupId, deletion.replacement.id);
  equal(replacementHead?.status, "active", "the replacement session must have an independent active lifecycle head");
  equal(replacementHead?.generation, 1, "the replacement lifecycle must start from generation one, not inherit the tombstone generation");
  const replacementTaskId = `task-phase265-replacement-${nonce}`;
  const replacementTaskSession = sessions.openTaskAgentSession({
    scopeId: replacementTaskId,
    taskId: replacementTaskId,
    groupId,
    project,
    agentType: "codex",
  });
  let replacement = prepareInvocation(replacementTaskSession, deletion.replacement.id, replacementTaskId, "replacement-session");
  replacement.edge = lineage.dispatchTaskAgentInvocationEdge(replacement.edge, {
    runnerRequestId: `runner-replacement-${nonce}`,
    transport: "phase265-fixture",
  });
  replacement.edge = lineage.completeTaskAgentInvocationEdge(replacement.edge, {
    success: true,
    runnerRequestId: `runner-replacement-${nonce}`,
    output: "replacement session completed",
  });
  const replacementDelivery = recordDelivery(replacementTaskSession, replacement, `runner-replacement-${nonce}`);
  equal(replacementDelivery.receipt.status, "delivered", "the replacement session must deliver against its own lifecycle head");
  equal(replacementDelivery.receipt.taskArtifactProven, true, "the replacement session may prove its own changed-file artifact");
  replacement.edge = lineage.bindTaskAgentInvocationMemoryDelivery(replacement.edge, { deliveryReceipt: replacementDelivery.receipt });
  equal(replacement.edge.reinjection_status, "proven", "the replacement session must prove current memory reinjection");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId });
  equal(inventory.summary.sessionLifecycleFenceRequiredCount, 3, "all gcs_* snapshots must require a lifecycle fence");
  equal(inventory.summary.sessionLifecycleFenceStaleCount, 2, "both snapshots tied to the deleted session must remain visibly stale");
  equal(inventory.summary.sessionLifecycleFenceValidCount, 1, "only the replacement snapshot may remain current");

  const lineageReport = lineage.buildTaskAgentInvocationLineageReport({ groupId });
  equal(lineageReport.overall.sessionLifecycleFenceRequiredCount, 3, "all invocation edges must bind lifecycle generations");
  equal(lineageReport.overall.sessionLifecycleFenceStaleCount, 1, "the post-delete dispatch attempt must be classified as stale");
  ok(lineageReport.overall.sessionLifecycleFenceValidatedCount >= 2, "the original pre-delete and replacement dispatches must validate");

  const artifactDeletion = memory.deleteGroupSessionMemoryArtifacts(groupId, originalSession.id);
  equal(lifecycle.readGroupSessionLifecycleHead(groupId, originalSession.id)?.status, "deleted", "memory artifact deletion must retain the lifecycle tombstone");
  equal(artifactDeletion.compactHeadArtifacts.deleted >= 0, true, "memory artifact deletion must complete without owning the lifecycle tombstone");

  console.log(JSON.stringify({
    pass: true,
    checks,
    original: { sessionId: originalSession.id, generation: originalHead.generation },
    tombstone: { status: tombstone.status, generation: tombstone.generation, headChecksum: tombstone.head_checksum },
    replacement: { sessionId: deletion.replacement.id, generation: replacementHead.generation },
    inventory: inventory.summary,
    lineage: lineageReport.overall,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
