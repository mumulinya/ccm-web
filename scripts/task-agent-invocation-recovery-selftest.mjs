import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-invocation-recovery-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const lineage = require(path.join(root, "ccm-package", "dist", "tasks", "task-agent-invocation-lineage.js"));
const spool = require(path.join(root, "ccm-package", "dist", "agents", "direct-dispatch-spool.js"));
const wal = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "typed-memory-dispatch-wal.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));

const sha = (value, length = 64) => crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, length);
const nonce = `${process.pid}-${Date.now().toString(36)}`;
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function prepareBoundEdge(label, options = {}) {
  const groupId = options.groupId || `phase255-${label}-${nonce}`;
  const groupSessionId = options.groupSessionId || `gcs_phase255_${label}_${nonce}`;
  const taskId = options.taskId || `task-phase255-${label}-${nonce}`;
  const taskAgentSessionId = options.taskAgentSessionId || `tas_phase255_${label}_${nonce}`;
  const prompt = `phase255 ${label} prompt`;
  let edge = lineage.prepareTaskAgentInvocationEdge({
    groupId,
    groupSessionId,
    taskId,
    targetProject: "phase255-project",
    taskAgentSessionId,
    executionId: taskId,
    attemptSequence: options.attemptSequence || 1,
    invocationKind: options.invocationKind || "spawn",
    branchKind: options.branchKind || "main",
    parentInvocationEdge: options.parentInvocationEdge,
    preparedAt: options.preparedAt,
  });
  edge = lineage.bindTaskAgentInvocationContext(edge, {
    workerContextPacketId: `wcp_${label}_${nonce}`,
    memoryContextSnapshotId: `tams_${label}_${nonce}`,
    renderedPrompt: prompt,
  });
  return { groupId, groupSessionId, taskId, taskAgentSessionId, prompt, edge };
}

function dispatchWithDirect(fixture, input = {}) {
  let edge = lineage.dispatchTaskAgentInvocationEdge(fixture.edge, { transport: "codex" });
  const direct = spool.createDirectAgentDispatchRequest({
    projectName: "phase255-project",
    message: fixture.prompt,
    workDir: root,
    agentType: "codex",
    taskId: fixture.taskId,
    executionId: fixture.taskId,
    taskAgentSessionId: fixture.taskAgentSessionId,
    groupId: fixture.groupId,
  });
  spool.markDirectAgentDispatchStarted(direct.id, { runnerPid: input.runnerPid ?? process.pid });
  edge = lineage.bindTaskAgentInvocationRunnerRequest(edge, direct.id);
  return { ...fixture, edge, direct };
}

try {
  const completed = dispatchWithDirect(prepareBoundEdge("completed"));
  spool.completeDirectAgentDispatch(completed.direct.id, { success: true, output: "recovered output", nativeSessionId: "native-phase255", exitCode: 0 });

  const failed = dispatchWithDirect(prepareBoundEdge("failed"));
  spool.completeDirectAgentDispatch(failed.direct.id, { success: false, error: "provider failed", exitCode: 1 });

  const active = dispatchWithDirect(prepareBoundEdge("active"), { runnerPid: process.pid });
  const uncertain = dispatchWithDirect(prepareBoundEdge("uncertain"), { runnerPid: 99999999 });
  const abandoned = prepareBoundEdge("abandoned");

  const walFixture = prepareBoundEdge("wal-cancelled");
  const ticket = {
    ticket_id: `cmdt_phase255_${nonce}`,
    ticket_checksum: sha(`ticket-${nonce}`),
    lease_id: `lease_${nonce}`,
    lease_checksum: sha(`lease-${nonce}`),
    capsule_checksum: sha(`capsule-${nonce}`),
    compact_epoch: "precompact",
    attempt_sequence: 1,
    worker_context_packet_id: `wcp_wal-cancelled_${nonce}`,
    prompt_checksum: sha(walFixture.prompt, 32),
    admitted_at: new Date().toISOString(),
    dispatch_not_after: new Date(Date.now() + 60_000).toISOString(),
  };
  const createdWal = wal.createTypedMemoryDispatchWal({
    dispatchTicket: ticket,
    deliveryLease: {
      group_id: walFixture.groupId,
      group_session_id: walFixture.groupSessionId,
      target_project: "phase255-project",
      task_id: walFixture.taskId,
      task_agent_session_id: walFixture.taskAgentSessionId,
      compact_epoch: "precompact",
    },
    deliveryCapsule: { capsule_checksum: ticket.capsule_checksum },
    workerContextPacket: { packet_id: ticket.worker_context_packet_id },
    memoryBundle: { group_id: walFixture.groupId, group_session_id: walFixture.groupSessionId, target_project: "phase255-project" },
    renderedPrompt: walFixture.prompt,
    snapshotRenderedPrompt: walFixture.prompt,
    executionId: walFixture.taskId,
  });
  const cancelledWal = wal.transitionTypedMemoryDispatchWal(createdWal.record, "cancelled", { terminal_reason: "cancelled_before_runner" });
  walFixture.edge = lineage.dispatchTaskAgentInvocationEdge(walFixture.edge, {
    transport: "codex",
    dispatchTicketId: ticket.ticket_id,
    dispatchTicketChecksum: ticket.ticket_checksum,
    typedMemoryDispatchWalFile: cancelledWal.file,
    typedMemoryDispatchWalRecordChecksum: cancelledWal.record_checksum,
    typedMemoryDispatchWalState: cancelledWal.state,
  });

  const recovery = lineage.reconcileTaskAgentInvocationRecovery({ minimumAgeMs: 0 });
  const recoveredCompleted = lineage.findTaskAgentInvocationEdge(completed.edge.invocation_edge_id);
  const recoveredFailed = lineage.findTaskAgentInvocationEdge(failed.edge.invocation_edge_id);
  const recoveredActive = lineage.findTaskAgentInvocationEdge(active.edge.invocation_edge_id);
  const recoveredUncertain = lineage.findTaskAgentInvocationEdge(uncertain.edge.invocation_edge_id);
  const recoveredAbandoned = lineage.findTaskAgentInvocationEdge(abandoned.edge.invocation_edge_id);
  const recoveredWalCancelled = lineage.findTaskAgentInvocationEdge(walFixture.edge.invocation_edge_id);

  equal(recoveredCompleted.status, "completed", "durable successful runner pair must recover completed edge");
  equal(recoveredCompleted.recovery_outcome, "recovered_completed", "successful pair must record recovery outcome");
  equal(recoveredFailed.status, "failed", "durable failed runner pair must recover failed edge");
  equal(recoveredFailed.recovery_outcome, "recovered_failed", "failed pair must record recovery outcome");
  equal(recoveredActive.status, "dispatched", "live runner PID must remain active");
  ok(recovery.rows.some(row => row.invocation_edge_id === active.edge.invocation_edge_id && row.action === "left_active_runner"), "active runner must be reported");
  equal(recoveredUncertain.status, "failed", "dead runner without result must terminate fail closed");
  equal(recoveredUncertain.recovery_outcome, "uncertain", "missing terminal evidence must never guess success");
  equal(recoveredAbandoned.recovery_outcome, "abandoned_before_dispatch", "prepared edge without dispatch witness must be abandoned");
  equal(recoveredWalCancelled.status, "failed", "cancelled WAL must close invocation edge as failed");
  equal(recoveredWalCancelled.dispatch_ticket_id, ticket.ticket_id, "invocation edge must bind exact dispatch ticket");
  ok(recoveredWalCancelled.typed_memory_dispatch_wal_record_checksum, "invocation edge must bind WAL checksum witness");

  const recoveryStatus = lineage.buildTaskAgentInvocationRecoveryStatus({ groupId: completed.groupId });
  equal(recoveryStatus.overall.session_count, 1, "recovery status must be isolated by group session");
  equal(recoveryStatus.rows[0].checksum_valid, true, "recovery latest status checksum must validate");
  const historyFile = lineage.TASK_AGENT_INVOCATION_RECOVERY_DIR + path.sep + `${completed.groupId}--${completed.groupSessionId}.jsonl`;
  ok(fs.existsSync(historyFile), "recovery audit must be append-only and durable");

  const graphGroup = `phase255-graph-${nonce}`;
  const graphSession = `gcs_phase255_graph_${nonce}`;
  const graphTask = `task-phase255-graph-${nonce}`;
  const graphClock = Date.now() + 120_000;
  const rootFixture = prepareBoundEdge("graph-root", { groupId: graphGroup, groupSessionId: graphSession, taskId: graphTask, taskAgentSessionId: `tas_phase255_graph_root_${nonce}`, preparedAt: new Date(graphClock).toISOString() });
  let rootEdge = lineage.dispatchTaskAgentInvocationEdge(rootFixture.edge, { transport: "codex" });
  rootEdge = lineage.bindTaskAgentInvocationRunnerRequest(rootEdge, "adr_phase255_graph_root");
  rootEdge = lineage.completeTaskAgentInvocationEdge(rootEdge, { success: true, runnerRequestId: "adr_phase255_graph_root", output: "root" });
  const parentFixture = prepareBoundEdge("graph-parent", { groupId: graphGroup, groupSessionId: graphSession, taskId: graphTask, taskAgentSessionId: `tas_phase255_graph_parent_${nonce}`, branchKind: "provider_switch", parentInvocationEdge: rootEdge, preparedAt: new Date(graphClock + 1_000).toISOString() });
  let parentEdge = lineage.dispatchTaskAgentInvocationEdge(parentFixture.edge, { transport: "cursor" });
  parentEdge = lineage.bindTaskAgentInvocationRunnerRequest(parentEdge, "adr_phase255_graph_parent");
  parentEdge = lineage.completeTaskAgentInvocationEdge(parentEdge, { success: true, runnerRequestId: "adr_phase255_graph_parent", output: "parent" });
  const childFixture = prepareBoundEdge("graph-child", { groupId: graphGroup, groupSessionId: graphSession, taskId: graphTask, taskAgentSessionId: `tas_phase255_graph_child_${nonce}`, branchKind: "provider_switch", parentInvocationEdge: parentEdge, preparedAt: new Date(graphClock + 2_000).toISOString() });
  const grandchildFixture = prepareBoundEdge("graph-grandchild", { groupId: graphGroup, groupSessionId: graphSession, taskId: graphTask, taskAgentSessionId: `tas_phase255_graph_grandchild_${nonce}`, branchKind: "provider_switch", parentInvocationEdge: childFixture.edge, preparedAt: new Date(graphClock + 3_000).toISOString() });
  lineage.deleteTaskAgentInvocationLineageArtifacts(graphGroup, graphSession, parentFixture.taskAgentSessionId);
  const graphRecovery = lineage.reconcileTaskAgentInvocationRecovery({ groupId: graphGroup, groupSessionId: graphSession, minimumAgeMs: 60_000 });
  const relinkedChild = lineage.findTaskAgentInvocationEdge(childFixture.edge.invocation_edge_id);
  equal(relinkedChild.parent_invocation_edge_id, rootEdge.invocation_edge_id, "dangling parent must relink to nearest checksum-verified ancestor");
  ok(graphRecovery.rows.some(row => row.action === "parent_relinked"), "parent relink must be present in recovery report");
  equal(lineage.verifyTaskAgentInvocationEdge(relinkedChild).valid, true, "relinked child edge must validate");
  equal(relinkedChild.recovery_original_parent_invocation_edge_id, parentEdge.invocation_edge_id, "repair must preserve original dangling parent identity");
  const reboundGrandchild = lineage.findTaskAgentInvocationEdge(grandchildFixture.edge.invocation_edge_id);
  equal(reboundGrandchild.parent_invocation_edge_id, relinkedChild.invocation_edge_id, "descendant must keep the recovered parent edge");
  equal(reboundGrandchild.expected_lineage_head_checksum, relinkedChild.edge_checksum, "descendant head must cascade to recovered parent checksum");
  ok(graphRecovery.rows.some(row => row.invocation_edge_id === reboundGrandchild.invocation_edge_id && row.action === "parent_head_rebound"), "recovered parent checksum must cascade through descendants");
  equal(lineage.verifyTaskAgentInvocationEdge(reboundGrandchild).valid, true, "cascaded descendant edge must validate");

  const deletion = memory.deleteGroupSessionMemoryArtifacts(graphGroup, graphSession);
  equal(deletion.invocationLineageArtifacts.recoveryDeleted, 2, "group session deletion must remove recovery history and latest status");
  equal(lineage.buildTaskAgentInvocationRecoveryStatus({ groupId: graphGroup, groupSessionId: graphSession }).overall.session_count, 0, "deleted group session must leave no recovery status");

  const walDeletion = memory.deleteGroupSessionMemoryArtifacts(walFixture.groupId, walFixture.groupSessionId);
  ok(walDeletion.typedMemoryDispatchWalArtifacts.deletedFiles >= 1, "group session deletion must remove typed-memory dispatch WAL directory");
  equal(fs.existsSync(cancelledWal.file), false, "deleted group session must leave no dispatch WAL file");

  const serverSource = fs.readFileSync(path.join(root, "backend", "server.ts"), "utf-8");
  const walRecoveryIndex = serverSource.indexOf("recoverChildTypedMemoryDispatchWal()")
  const invocationRecoveryIndex = serverSource.indexOf("reconcileTaskAgentInvocationRecovery()")
  const queueResumeIndex = serverSource.indexOf("resumeTaskQueues(startupCollabCtx)")
  ok(walRecoveryIndex >= 0 && walRecoveryIndex < invocationRecoveryIndex && invocationRecoveryIndex < queueResumeIndex, "startup must recover WAL then invocation lineage before queue resume");
  const collaborationSource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "collaboration.ts"), "utf-8");
  for (const marker of ["typedMemoryDispatchWalRecord", "directTypedMemoryDispatchWalRecord", "autoAssignTypedMemoryDispatchWalRecord"]) {
    ok(collaborationSource.includes(`typedMemoryDispatchWalRecord: ${marker}?.record_checksum`) || collaborationSource.includes(`typedMemoryDispatchWalRecordChecksum: ${marker}?.record_checksum`), `${marker} must bind WAL checksum into invocation edge`);
  }
  const globalSource = fs.readFileSync(path.join(root, "backend", "agents", "global", "loop.ts"), "utf-8");
  equal(globalSource.includes("task-agent-invocation-recovery"), false, "Global Agent must remain outside group invocation recovery context");

  console.log(JSON.stringify({
    pass: true,
    checks,
    recovery: {
      checked: recovery.checked,
      recovered: recovery.recovered,
      uncertain: recovery.uncertain,
      active: recovery.active,
      relinked: graphRecovery.relinked,
      quarantined: recovery.quarantined + graphRecovery.quarantined,
    },
  }, null, 2));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
