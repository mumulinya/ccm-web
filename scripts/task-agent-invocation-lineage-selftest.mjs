import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-invocation-lineage-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const postTurn = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-post-turn-summary.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime-kernel.js"));

const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const edgeOptions = edge => ({
  invocationEdgeId: edge.invocation_edge_id,
  parentInvocationEdgeId: edge.parent_invocation_edge_id,
  rootInvocationEdgeId: edge.root_invocation_edge_id,
  branchId: edge.branch_id,
  parentBranchId: edge.parent_branch_id,
  branchKind: edge.branch_kind,
  expectedLineageHeadChecksum: edge.expected_lineage_head_checksum,
});

try {
  const groupId = "phase254-group";
  const otherGroupId = "phase254-other";
  const groupSessionId = storage.createGroupChatSession(groupId, "current").id;
  const otherSessionId = storage.createGroupChatSession(groupId, "other session").id;
  const messages = [
    { id: "u1", role: "user", content: "implement durable invocation lineage", timestamp: new Date().toISOString() },
    { id: "a1", role: "assistant", agent: "api", content: "prepared lineage work", task_id: "task-254", timestamp: new Date().toISOString() },
  ];
  const transcriptBefore = digest(messages);
  storage.saveGroupMessages(groupId, messages, groupSessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, groupSessionId), groupSessionId);
  postTurn.backfillGroupPostTurnSummaries(groupId, groupSessionId, messages, { maxMessages: 20 });

  const taskSession = sessions.openTaskAgentSession({ scopeId: "task-254", taskId: "task-254", groupId, project: "api", agentType: "codex" });
  const rootEdge = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254", targetProject: "api", taskAgentSessionId: taskSession.id,
    executionId: "exec-1", attemptSequence: 1, providerAttempt: 1, invocationKind: "spawn", branchKind: "main",
  });
  const bundle = memory.buildAgentMemoryContextBundle(groupId, "api", "implement lineage", {
    groupSessionId, taskId: "task-254", taskAgentSessionId: taskSession.id, executionId: "exec-1",
    taskAgentSessionTurn: 1, agentType: "codex", ...edgeOptions(rootEdge),
  });
  const packet = runtime.buildWorkerContextPacket({
    group: { id: groupId, name: "Phase 254", members: [{ project: "api" }] },
    project: "api", task: "implement lineage", taskId: "task-254", groupSessionId,
    taskAgentSessionId: taskSession.id, memory: bundle,
  });
  const prompt = runtime.renderWorkerContextPacket(packet);
  const snapshot = sessions.bindTaskAgentMemoryContextSnapshot(taskSession.id, {
    taskId: "task-254", groupId, project: "api", turn: 1, executionId: "exec-1",
    workerContextPacket: packet, memoryContext: bundle, renderedPrompt: prompt, invocationLineage: rootEdge,
  });
  let rootCurrent = lineage.bindTaskAgentInvocationContext(rootEdge, {
    workerContextPacketId: packet.packet_id,
    memoryContextSnapshotId: snapshot.snapshot.snapshot_id,
    memoryContextSnapshotChecksum: snapshot.snapshot.checksum,
    summaryCapsuleChecksum: bundle.post_turn_summary_delivery_capsule?.capsule_checksum || "",
    renderedPrompt: prompt,
  });
  rootCurrent = lineage.dispatchTaskAgentInvocationEdge(rootCurrent, { transport: "codex" });
  const duplicateDispatch = lineage.dispatchTaskAgentInvocationEdge(rootCurrent, { transport: "codex" });
  rootCurrent = lineage.bindTaskAgentInvocationRunnerRequest(rootCurrent, "adr_phase254_root");
  rootCurrent = lineage.completeTaskAgentInvocationEdge(rootCurrent, { success: true, runnerRequestId: "adr_phase254_root", output: "done" });

  const resumeEdge = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254", targetProject: "api", taskAgentSessionId: taskSession.id,
    executionId: "exec-2", attemptSequence: 2, providerAttempt: 1, invocationKind: "resume", branchKind: "main", parentInvocationEdge: rootCurrent,
  });
  let resumeCurrent = lineage.bindTaskAgentInvocationContext(resumeEdge, { workerContextPacketId: "wcp_resume", memoryContextSnapshotId: "tams_resume", renderedPrompt: "edge prompt resume" });
  resumeCurrent = lineage.dispatchTaskAgentInvocationEdge(resumeCurrent, { transport: "codex" });
  resumeCurrent = lineage.bindTaskAgentInvocationRunnerRequest(resumeCurrent, "adr_phase254_resume");
  resumeCurrent = lineage.completeTaskAgentInvocationEdge(resumeCurrent, { success: false, runnerRequestId: "adr_phase254_resume", output: "native session failed", reason: "native_session_recovery" });

  const nativeRetryEdge = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254", targetProject: "api", taskAgentSessionId: taskSession.id,
    executionId: "exec-3", attemptSequence: 3, providerAttempt: 2, invocationKind: "resume", branchKind: "native_recovery", parentInvocationEdge: resumeCurrent,
  });
  const switchedSession = sessions.openTaskAgentSession({ scopeId: "task-254", taskId: "task-254", groupId, project: "api", agentType: "cursor" });
  const providerSwitchEdge = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254", targetProject: "api", taskAgentSessionId: switchedSession.id,
    executionId: "exec-4", attemptSequence: 1, providerAttempt: 3, invocationKind: "spawn", branchKind: "provider_switch",
    parentInvocationEdge: resumeCurrent, retryOfInvocationEdgeId: resumeCurrent.invocation_edge_id, forkReason: "codex_to_cursor",
  });
  const forkSession = sessions.openTaskAgentSession({ scopeId: "task-254-fork", taskId: "task-254", groupId, project: "api", agentType: "cursor" });
  const forkEdge = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254", targetProject: "api", taskAgentSessionId: forkSession.id,
    executionId: "exec-5", attemptSequence: 1, providerAttempt: 1, invocationKind: "spawn", branchKind: "fork",
    parentInvocationEdge: rootCurrent, forkReason: "independent_verification",
  });

  const staleChild = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254-stale", targetProject: "web", taskAgentSessionId: "tas_stale_phase254",
    executionId: "exec-stale", attemptSequence: 1, invocationKind: "spawn", branchKind: "main",
  });
  let staleParent = lineage.bindTaskAgentInvocationContext(staleChild, { workerContextPacketId: "wcp_stale", memoryContextSnapshotId: "tams_stale", renderedPrompt: "stale parent" });
  staleParent = lineage.dispatchTaskAgentInvocationEdge(staleParent, { transport: "codex" });
  staleParent = lineage.completeTaskAgentInvocationEdge(staleParent, { success: true, runnerRequestId: "adr_stale", output: "v1" });
  const staleGrandchild = lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId, taskId: "task-254-stale", targetProject: "web", taskAgentSessionId: "tas_stale_phase254",
    executionId: "exec-stale-2", attemptSequence: 2, invocationKind: "resume", branchKind: "main", parentInvocationEdge: staleParent,
  });
  staleParent = lineage.completeTaskAgentInvocationEdge(staleParent, { success: true, runnerRequestId: "adr_stale", output: "v2" });
  let headDriftRejected = false;
  try { lineage.bindTaskAgentInvocationContext(staleGrandchild, { workerContextPacketId: "wcp_child", memoryContextSnapshotId: "tams_child", renderedPrompt: "child" }); } catch (error) { headDriftRejected = /head changed/.test(String(error?.message || error)); }
  lineage.deleteTaskAgentInvocationLineageArtifacts(groupId, groupSessionId, "tas_stale_phase254");

  const deletedSessionId = storage.createGroupChatSession(groupId, "delete with lineage").id;
  const deletedTaskSession = sessions.openTaskAgentSession({ scopeId: "task-254-delete", taskId: "task-254-delete", groupId, project: "api", agentType: "codex" });
  lineage.prepareTaskAgentInvocationEdge({
    groupId, groupSessionId: deletedSessionId, taskId: "task-254-delete", targetProject: "api", taskAgentSessionId: deletedTaskSession.id,
    executionId: "exec-delete", attemptSequence: 1, invocationKind: "spawn", branchKind: "main",
  });
  const deletionReportBefore = lineage.buildTaskAgentInvocationLineageReport({ groupId, groupSessionId: deletedSessionId });
  const deletedArtifacts = memory.deleteGroupSessionMemoryArtifacts(groupId, deletedSessionId);
  const deletionReportAfter = lineage.buildTaskAgentInvocationLineageReport({ groupId, groupSessionId: deletedSessionId });

  const capsule = bundle.post_turn_summary_delivery_capsule;
  const crossGroup = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { group_id: otherGroupId } });
  const crossSession = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { group_session_id: otherSessionId } });
  const crossTas = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { task_agent_session_id: switchedSession.id } });
  const crossBranch = postTurn.validateGroupPostTurnSummaryDeliveryCapsule(capsule, { expectedBinding: { branch_id: providerSwitchEdge.branch_id } });
  const missingParent = lineage.verifyTaskAgentInvocationEdge({ ...rootCurrent, invocation_edge_id: "tie_missing_parent_case", parent_invocation_edge_id: "tie_does_not_exist", edge_checksum: "invalid" });
  const selfParent = lineage.verifyTaskAgentInvocationEdge({ ...rootCurrent, parent_invocation_edge_id: rootCurrent.invocation_edge_id });
  const report = lineage.buildTaskAgentInvocationLineageReport({ groupId });
  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId });
  const snapshotRow = inventory.rows.find(row => row.snapshotId === snapshot.snapshot.snapshot_id) || {};
  const ignoredBundle = memory.buildAgentMemoryContextBundle(groupId, "api", "ignore memory", { groupSessionId, taskId: "ignore", taskAgentSessionId: taskSession.id, taskAgentSessionTurn: 1, ignoreMemory: true });
  const globalBundle = memory.buildGlobalGroupMemoryContext("route only", { groups: [{ id: groupId, name: "Phase 254" }], disableLedger: true });
  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");

  const checks = {
    rootSpawnEdgeDurable: rootCurrent.status === "completed" && rootCurrent.invocation_kind === "spawn" && rootCurrent.invocation_edge_id.startsWith("tie_"),
    resumeChildEdge: resumeCurrent.parent_invocation_edge_id === rootCurrent.invocation_edge_id && resumeCurrent.root_invocation_edge_id === rootCurrent.invocation_edge_id,
    sameRuntimeNativeRetry: nativeRetryEdge.task_agent_session_id === taskSession.id && nativeRetryEdge.branch_kind === "native_recovery" && nativeRetryEdge.parent_invocation_edge_id === resumeCurrent.invocation_edge_id,
    providerSwitchCreatesTasAndBranch: providerSwitchEdge.task_agent_session_id !== taskSession.id && providerSwitchEdge.branch_id !== resumeCurrent.branch_id && providerSwitchEdge.parent_branch_id === resumeCurrent.branch_id,
    forkKeepsStableParent: forkEdge.parent_invocation_edge_id === rootCurrent.invocation_edge_id && forkEdge.branch_id !== rootCurrent.branch_id,
    duplicateDispatchIdempotent: duplicateDispatch.invocation_edge_id === rootCurrent.invocation_edge_id && duplicateDispatch.status === "dispatched",
    runnerRequestBound: rootCurrent.runner_request_id === "adr_phase254_root",
    packetPromptSnapshotBound: packet.task_agent_invocation_lineage?.invocation_edge_id === rootEdge.invocation_edge_id && prompt.includes(rootEdge.invocation_edge_id) && snapshot.snapshot.context.invocation_edge_id === rootEdge.invocation_edge_id,
    capsuleBindsLineage: capsule.invocation_edge_id === rootEdge.invocation_edge_id && capsule.branch_id === rootEdge.branch_id && capsule.expected_lineage_head_checksum === rootEdge.expected_lineage_head_checksum,
    snapshotLedgerBound: snapshotRow.invocationLineageBound === true && snapshotRow.invocationLedgerBound === true,
    crossGroupRejected: crossGroup.validation_issues.includes("group_id_mismatch"),
    crossSessionRejected: crossSession.validation_issues.includes("group_session_id_mismatch"),
    crossTasRejected: crossTas.validation_issues.includes("task_agent_session_id_mismatch"),
    crossBranchRejected: crossBranch.validation_issues.includes("branch_id_mismatch"),
    lineageHeadDriftRejected: headDriftRejected,
    missingParentRejected: missingParent.issues.includes("parent_edge_missing"),
    selfParentRejected: selfParent.issues.includes("self_parent_cycle"),
    reportExposesBranches: report.overall.edgeCount >= 5 && report.overall.branchCount >= 3 && report.overall.providerSwitchCount >= 1,
    fallbackRebuildsFullContext: /groupMemoryBundle = buildAgentMemoryContextBundle[\s\S]{0,5000}workerHandoff = buildChildAgentWorkerHandoff[\s\S]{0,5000}tPrompt = renderCrossAgentPrompt\(\)/.test(collaborationSource),
    ignoreAndGlobalHaveNoLineage: !JSON.stringify(ignoredBundle).includes("ccm-task-agent-invocation-lineage-binding-v1") && !JSON.stringify(globalBundle).includes("ccm-task-agent-invocation-lineage-binding-v1"),
    deletingGroupSessionDeletesLineage: deletionReportBefore.overall.edgeCount === 1 && deletedArtifacts.invocationLineageArtifacts?.deleted === 1 && deletionReportAfter.overall.edgeCount === 0,
    rawTranscriptUnchanged: digest(storage.getGroupMessages(groupId, groupSessionId)) === transcriptBefore,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, report: report.overall, snapshotRow, missingParent, selfParent }, null, 2));
  console.log(JSON.stringify({ pass: true, checks, report: report.overall, inventory: inventory.summary }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
