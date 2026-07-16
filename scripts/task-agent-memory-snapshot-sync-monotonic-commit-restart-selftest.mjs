import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function parseStageOutput(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE351_STAGE_${stage}=`));
  if (!line) throw new Error(`phase351 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-monotonic-commit-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE351_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstResult = parseStageOutput(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const secondResult = parseStageOutput(second.stdout, "restart");
    const checks = Number(firstResult.checks || 0) + Number(secondResult.checks || 0);
    console.log(`PHASE351_RESULT=${JSON.stringify({ checks, passed: checks, prepare: firstResult, restart: secondResult })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE351_HOME;
if (!tempRoot) throw new Error("PHASE351_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const stateFile = path.join(tempRoot, "phase351-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function memoryContext(state, groupSessionId) {
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: state.project,
    memory_policy: { use: "session", ignored: true },
    session_binding: {
      binding_id: `gmb_phase351_${groupSessionId}`,
      task_id: state.taskId,
      task_agent_session_id: state.taskAgentSessionId,
    },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
    typed_memory_recall: [{ rel_path: "stable-rule.md", checksum: "memory-stable", body: "stable rule" }],
  };
}

function bind(state, groupSessionId, turn) {
  const context = memoryContext(state, groupSessionId);
  const prompt = `PHASE351 turn=${turn} session=${groupSessionId}`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: { packet_id: `wcp_phase351_${turn}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
  });
  return { ...bound, prompt };
}

function deliver(state, bound, turn, dispatched) {
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: bound.prompt,
    snapshotRenderedPrompt: bound.prompt,
    executionId: `${state.taskId}-turn-${turn}-${dispatched ? "success" : "late-failure"}`,
    runtime: "codex",
    dispatched,
    executionSucceeded: dispatched,
    output: dispatched ? `PHASE351 delivered turn ${turn}` : "",
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase351-${nonce}`,
    groupSessionId: `gcs_phase351_a_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    siblingGroupSessionId: `gcs_phase351_b_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `task-phase351-${nonce}`,
    project: "phase351-project",
  };
  const taskSession = sessions.openTaskAgentSession({
    scopeId: state.taskId,
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
  });
  state.taskAgentSessionId = taskSession.id;

  const first = bind(state, state.groupSessionId, 1);
  const committed = deliver(state, first, 1, true);
  const commitBeforeLateFailure = fs.readFileSync(committed.syncCommit.commit_file, "utf8");
  const lateFailure = deliver(state, first, 1, false);
  equal(lateFailure.syncCommitDisposition, "preserved_committed", "late failure must preserve an existing committed baseline");
  equal(lateFailure.receipt.delivered, false, "latest attempt must retain its failure result");
  equal(lateFailure.syncCommit.commit_checksum, committed.syncCommit.commit_checksum, "canonical commit checksum must remain unchanged");
  equal(lateFailure.ref.deliveryReceiptId, committed.receipt.receiptId, "canonical delivery receipt must remain the successful receipt");
  equal(lateFailure.ref.latestDeliveryAttemptReceiptId, lateFailure.receipt.receiptId, "latest attempt must remain independently auditable");
  equal(lateFailure.session.memoryContextDeliveryStatus, "delivered", "session canonical delivery status must not be downgraded");
  equal(fs.readFileSync(committed.syncCommit.commit_file, "utf8"), commitBeforeLateFailure, "late failure must not rewrite the commit sidecar");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memorySnapshotSyncLateFailurePreservedCount, 1, "inventory must count preserved late failures");
  ok(inventory.rows.some(row => row.memorySnapshotSyncLateFailurePreserved && row.latestDeliveryAttemptValid), "inventory must expose valid latest-attempt evidence");
  const second = bind(state, state.groupSessionId, 2);
  equal(second.snapshot.context.memory_snapshot_sync.action, "none", "late failure must not force unnecessary reinjection");
  const secondCommit = deliver(state, second, 2, true);
  equal(secondCommit.syncCommitDisposition, "committed", "next snapshot must establish its own committed baseline");

  state.secondSnapshotId = second.snapshot.snapshot_id;
  state.secondPrompt = second.prompt;
  state.secondCommitChecksum = secondCommit.syncCommit.commit_checksum;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE351_STAGE_prepare=${JSON.stringify({ checks, preserved: inventory.summary.memorySnapshotSyncLateFailurePreservedCount })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const restored = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(restored.id, state.taskAgentSessionId, "task Agent session must survive restart");
  equal(restored.memorySnapshotSyncCommitChecksum, state.secondCommitChecksum, "canonical commit must survive restart");
  const secondSnapshot = sessions.listTaskAgentMemoryContextSnapshots({ sessionId: state.taskAgentSessionId })
    .find(row => row.snapshot_id === state.secondSnapshotId);
  ok(secondSnapshot, "committed snapshot must survive restart");

  const lateFailure = deliver(state, { snapshot: secondSnapshot, prompt: state.secondPrompt }, 2, false);
  equal(lateFailure.syncCommitDisposition, "preserved_committed", "post-restart late failure must preserve commit");
  equal(lateFailure.syncCommit.commit_checksum, state.secondCommitChecksum, "post-restart canonical checksum must remain stable");
  const third = bind(state, state.groupSessionId, 3);
  equal(third.snapshot.context.memory_snapshot_sync.action, "none", "post-restart continuation must trust the preserved baseline");

  let crossSessionError = null;
  try { bind(state, state.siblingGroupSessionId, 4); } catch (error) { crossSessionError = error; }
  equal(crossSessionError?.code, "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED", "monotonic commit must preserve exact gcs isolation");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memorySnapshotSyncLateFailurePreservedCount, 2, "restart inventory must recover both preserved late failures");
  equal(inventory.summary.memorySnapshotSyncCommitInvalidCount, 0, "preserved commits must remain valid");
  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.memorySnapshotSyncLateFailurePreservedCount, 2, "Memory Center must expose preserved late failures");
  ok(report.rows.some(row => row.latestDeliveryAttemptStatus === "binding_failed" && row.memorySnapshotSyncCommitted), "Memory Center row must retain success and latest failure together");
  console.log(`PHASE351_STAGE_restart=${JSON.stringify({ checks, preserved: report.overall.memorySnapshotSyncLateFailurePreservedCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase351 mode: ${mode}`);
