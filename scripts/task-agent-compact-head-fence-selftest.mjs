import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-compact-head-fence-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const soak = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-continuation-soak.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const compactHeads = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `group-phase264-${nonce}`;
const groupSessionId = `gcs_phase264_${nonce.replace(/[^a-z0-9]/gi, "")}`;
const taskId = `task-phase264-${nonce}`;
const project = "phase264-project";
let checks = 0;

function equal(actual, expected, message) {
  checks += 1;
  assert.equal(actual, expected, message);
}

function ok(value, message) {
  checks += 1;
  assert.ok(value, message);
}

function buildMemoryContext(taskAgentSessionId, receipt = null, head = null) {
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: project,
    memory_policy: { use: "session", ignored: false },
    session_binding: {
      binding_id: `gmb_phase264_${nonce}`,
      task_id: taskId,
      task_agent_session_id: taskAgentSessionId,
    },
    compact_head: head,
    compaction: receipt ? { compactTransactionReceipt: receipt } : {},
    group_state: {
      goal: "Every Task Agent must use only the current group-session compact generation.",
      typedMemory: { ledger: { compactEpoch: receipt?.compact_epoch || "precompact" } },
    },
  };
}

async function compactAndCommit(label) {
  const messages = Array.from({ length: 72 }, (_, index) => ({
    id: `${label}-message-${index}-${nonce}`,
    role: index % 2 === 0 ? "user" : "assistant",
    agent: index % 2 === 0 ? "user" : project,
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0
      ? `Persistent requirement ${label}: bind every worker to ${groupId} + ${groupSessionId}.`
      : `${label} compact source ${index}: preserve current memory evidence. ${"context ".repeat(260)}`,
  }));
  const transcriptFile = path.join(tempRoot, `${label}-transcript.json`);
  fs.writeFileSync(transcriptFile, JSON.stringify(messages, null, 2), "utf-8");
  const result = await compaction.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages,
    memory: { goal: `phase264-${label}` },
    transcriptPath: transcriptFile,
    force: true,
  });
  equal(result.compacted, true, `${label} must execute a real compact transaction`);
  const verification = compaction.verifyGroupCompactTransactionReceipt(result.compactTransactionReceipt, {
    groupId,
    groupSessionId,
    boundaryId: result.boundary.id,
    compactEpoch: result.compactTransactionReceipt.compact_epoch,
  });
  equal(verification.valid, true, `${label} compact receipt must validate: ${verification.issues.join(",")}`);
  return {
    result,
    receipt: result.compactTransactionReceipt,
    commit: compactHeads.commitGroupCompactHead({ groupId, groupSessionId, compactTransactionReceipt: result.compactTransactionReceipt }),
  };
}

function prepareInvocation(taskSession, label, receipt = null, head = null) {
  const prompt = `PHASE264=${label} GROUP_SESSION=${groupSessionId} GENERATION=${head?.generation || 0}`;
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
    compactEpoch: receipt?.compact_epoch || "precompact",
  });
  const snapshot = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId,
    groupId,
    project,
    agentType: "codex",
    turn: label.length,
    executionId: `${taskId}-${label}`,
    workerContextPacket: {
      packet_id: `wcp_phase264_${label}_${nonce}`,
      memory: buildMemoryContext(taskSession.id, receipt, head),
      task_agent_invocation_lineage: { invocation_edge_id: edge.invocation_edge_id },
    },
    memoryContext: buildMemoryContext(taskSession.id, receipt, head),
    renderedPrompt: prompt,
    invocationLineage: { invocation_edge_id: edge.invocation_edge_id },
  });
  const binding = snapshot.snapshot.context.group_session_memory_binding;
  edge = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp_phase264_${label}_${nonce}`,
    memoryContextSnapshotId: snapshot.snapshot.snapshot_id,
    memoryContextSnapshotChecksum: snapshot.snapshot.checksum,
    renderedPrompt: prompt,
    compactEpoch: receipt?.compact_epoch || "precompact",
    compactTransactionReceipt: receipt,
    groupSessionMemoryBinding: binding,
  });
  return { label, prompt, edge, snapshot, binding };
}

function recordDelivery(taskSession, invocation, runnerRequestId) {
  return sessions.recordTaskAgentMemoryContextDelivery(taskSession.id, {
    snapshotId: invocation.snapshot.snapshot.snapshot_id,
    renderedPrompt: invocation.prompt,
    snapshotRenderedPrompt: invocation.prompt,
    executionId: `${taskId}-${invocation.label}`,
    runtime: "codex",
    attempt: invocation.label.length,
    runnerRequestId,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: `phase264 ${invocation.label} output`,
    fileChanges: { files: [{ path: `src/${invocation.label}.ts`, status: "modified", diff: `+${invocation.label}` }] },
    nativeContinuationEvidence: {
      providerContractId: "pcc_phase264",
      providerRuntimeVersion: "phase264-fixture-1",
      providerRuntimeIdentityChecksum: "phase264-runtime-checksum",
    },
    invocationEdgeId: invocation.edge.invocation_edge_id,
  });
}

try {
  const taskSession = sessions.openTaskAgentSession({
    scopeId: taskId,
    taskId,
    groupId,
    project,
    agentType: "codex",
  });

  const precompact = prepareInvocation(taskSession, "precompact");
  equal(precompact.binding.compactHeadFenceValid, true, "a new group session must start at current precompact generation zero");

  const firstCompact = await compactAndCommit("generation-one");
  equal(firstCompact.commit.committed, true, "the first compact must commit a durable head");
  equal(firstCompact.commit.head.generation, 1, "the first compact head must be generation one");

  let staleDispatchError = null;
  try {
    lineage.dispatchTaskAgentInvocationEdge(precompact.edge, { runnerRequestId: `runner-old-${nonce}`, transport: "phase264-fixture" });
  } catch (error) {
    staleDispatchError = error;
  }
  equal(staleDispatchError?.code, "TASK_AGENT_COMPACT_HEAD_STALE", "a precompact snapshot must not dispatch after generation one commits");
  ok(staleDispatchError?.compactHeadValidation?.issues?.includes("compact_head_generation_stale"), "stale dispatch must report generation drift");
  const precompactDelivery = recordDelivery(taskSession, precompact, `runner-old-${nonce}`);
  equal(precompactDelivery.receipt.status, "compact_head_stale", "a stale precompact output must be rejected at delivery");
  equal(precompactDelivery.receipt.taskArtifactProven, false, "a stale precompact output must not become a proven artifact");

  let generationOne = prepareInvocation(taskSession, "generation-one", firstCompact.receipt, firstCompact.commit.head);
  equal(generationOne.binding.compactHeadGeneration, 1, "the fresh snapshot must capture generation one");
  generationOne.edge = lineage.dispatchTaskAgentInvocationEdge(generationOne.edge, {
    runnerRequestId: `runner-generation-one-${nonce}`,
    transport: "phase264-fixture",
  });
  equal(generationOne.edge.compact_head_dispatch_fence_valid, true, "generation one must pass the pre-dispatch fence while current");

  await new Promise(resolve => setTimeout(resolve, 2));
  const secondCompact = await compactAndCommit("generation-two");
  equal(secondCompact.commit.committed, true, "the second compact must advance the durable head");
  equal(secondCompact.commit.head.generation, 2, "the second compact head must be generation two");
  equal(secondCompact.commit.head.previous_head_checksum, firstCompact.commit.head.head_checksum, "generation two must chain to generation one");

  generationOne.edge = lineage.completeTaskAgentInvocationEdge(generationOne.edge, {
    success: true,
    runnerRequestId: `runner-generation-one-${nonce}`,
    output: "generation one finished after generation two committed",
  });
  const generationOneDelivery = recordDelivery(taskSession, generationOne, `runner-generation-one-${nonce}`);
  equal(generationOneDelivery.receipt.status, "compact_head_stale", "output from a task crossed by compaction must be rejected");
  equal(generationOneDelivery.receipt.taskArtifactProven, false, "cross-generation output must not become memory-delivered proof");
  generationOne.edge = lineage.bindTaskAgentInvocationMemoryDelivery(generationOne.edge, { deliveryReceipt: generationOneDelivery.receipt });
  equal(generationOne.edge.reinjection_status, "unverified", "cross-generation output must not prove memory reinjection");

  let generationTwo = prepareInvocation(taskSession, "generation-two", secondCompact.receipt, secondCompact.commit.head);
  equal(generationTwo.binding.compactHeadGeneration, 2, "the rerun snapshot must capture generation two");
  equal(generationTwo.binding.compactHeadChecksum, secondCompact.commit.head.head_checksum, "the rerun snapshot must capture the exact head checksum");
  generationTwo.edge = lineage.dispatchTaskAgentInvocationEdge(generationTwo.edge, {
    runnerRequestId: `runner-generation-two-${nonce}`,
    transport: "phase264-fixture",
  });
  generationTwo.edge = lineage.completeTaskAgentInvocationEdge(generationTwo.edge, {
    success: true,
    runnerRequestId: `runner-generation-two-${nonce}`,
    output: "generation two completed",
  });
  const generationTwoDelivery = recordDelivery(taskSession, generationTwo, `runner-generation-two-${nonce}`);
  equal(generationTwoDelivery.receipt.status, "delivered", "the generation two rerun must deliver current memory");
  equal(generationTwoDelivery.receipt.taskArtifactProven, true, "the generation two rerun must prove its changed-file artifact");
  generationTwo.edge = lineage.bindTaskAgentInvocationMemoryDelivery(generationTwo.edge, { deliveryReceipt: generationTwoDelivery.receipt });
  equal(generationTwo.edge.reinjection_status, "proven", "the current generation must prove memory reinjection");
  equal(lineage.verifyTaskAgentInvocationReinjectionProof(generationTwo.edge.reinjection_proof, generationTwo.edge).valid, true, "the current-generation reinjection proof must verify");

  const lineageReport = lineage.buildTaskAgentInvocationLineageReport({ groupId, groupSessionId });
  equal(lineageReport.overall.compactHeadFenceRequiredCount, 3, "all three Task Agent invocations must require a compact-head fence");
  equal(lineageReport.overall.compactHeadFenceStaleCount, 1, "the precompact dispatch must remain visible as stale");
  ok(lineageReport.overall.compactHeadFenceValidatedCount >= 2, "both postcompact dispatches must record a valid pre-dispatch fence");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId, sessionId: taskSession.id });
  equal(inventory.summary.compactHeadFenceRequiredCount, 3, "snapshot inventory must expose all compact-head bindings");
  equal(inventory.summary.compactHeadFenceStaleCount, 2, "snapshot inventory must expose both stale delivery generations");
  equal(inventory.summary.compactHeadFenceValidCount, 1, "only the current generation snapshot may remain valid");

  const soakReport = soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId, taskAgentSessionId: taskSession.id });
  ok(soakReport.overall.postCompactArtifactCompactHeadFenceMismatchCount >= 1, "soak closure must classify the crossed-generation artifact mismatch");
  ok(soakReport.overall.postCompactArtifactClosureProvenCount >= 1, "soak closure must prove the generation two artifact");
  ok(soakReport.rows.some(row => row.postCompactArtifactClosures.some(closure => closure.compactHeadGeneration === 2 && closure.proven)), "the proven artifact closure must bind generation two");

  const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, groupSessionId);
  ok(deletion.compactHeadArtifacts.deleted >= 1, "deleting a group session must delete its compact-head sidecar");
  equal(compactHeads.readGroupCompactHead(groupId, groupSessionId), null, "a deleted historical group session must not restore its compact head");
  equal(lineage.buildTaskAgentInvocationLineageReport({ groupId, groupSessionId }).overall.edgeCount, 0, "session deletion must remove invocation lineage artifacts");
  equal(soak.buildTaskAgentContinuationSoakReport({ groupId, groupSessionId }).overall.chainCount, 0, "session deletion must remove continuation soak artifacts");

  console.log(JSON.stringify({
    pass: true,
    checks,
    generations: [firstCompact.commit.head.generation, secondCompact.commit.head.generation],
    lineage: lineageReport.overall,
    inventory: inventory.summary,
    soak: soakReport.overall,
    deletion,
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
