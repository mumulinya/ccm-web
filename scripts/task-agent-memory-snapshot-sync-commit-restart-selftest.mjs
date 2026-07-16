import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const mode = process.argv[2] || "orchestrate";

function hashValue(value, len = 64) {
  const seen = new WeakSet();
  const text = typeof value === "string" ? value : JSON.stringify(value || {}, (_key, item) => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    return item;
  });
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, len);
}

function recomputeCommitChecksum(commit) {
  const payload = { ...commit };
  delete payload.commit_checksum;
  delete payload.commit_file;
  delete payload.checksum_valid;
  delete payload.issues;
  return hashValue(payload);
}

function parseStageOutput(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE350_STAGE_${stage}=`));
  if (!line) throw new Error(`phase350 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-sync-commit-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE350_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstResult = parseStageOutput(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const secondResult = parseStageOutput(second.stdout, "restart");
    const checks = Number(firstResult.checks || 0) + Number(secondResult.checks || 0);
    console.log(`PHASE350_RESULT=${JSON.stringify({ checks, passed: checks, prepare: firstResult, restart: secondResult })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE350_HOME;
if (!tempRoot) throw new Error("PHASE350_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const stateFile = path.join(tempRoot, "phase350-state.json");
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
      binding_id: `gmb_phase350_${groupSessionId}`,
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
  const prompt = `PHASE350 turn=${turn} session=${groupSessionId}`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: { packet_id: `wcp_phase350_${turn}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
  });
  return { ...bound, prompt };
}

function deliver(state, bound, turn, dispatched = true) {
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: bound.prompt,
    snapshotRenderedPrompt: bound.prompt,
    executionId: `${state.taskId}-turn-${turn}`,
    runtime: "codex",
    dispatched,
    executionSucceeded: dispatched,
    output: dispatched ? `PHASE350 delivered turn ${turn}` : "",
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase350-${nonce}`,
    groupSessionId: `gcs_phase350_a_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    siblingGroupSessionId: `gcs_phase350_b_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `task-phase350-${nonce}`,
    project: "phase350-project",
  };
  const taskSession = sessions.openTaskAgentSession({
    scopeId: state.taskId,
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
  });
  state.taskAgentSessionId = taskSession.id;

  const preparedOnly = bind(state, state.groupSessionId, 1);
  const afterMissingDelivery = bind(state, state.groupSessionId, 2);
  equal(preparedOnly.snapshot.context.memory_snapshot_sync.action, "initialize", "first snapshot must initialize");
  equal(afterMissingDelivery.snapshot.context.memory_snapshot_sync.action, "prompt_update", "prepared-only snapshot must force reinjection");
  equal(afterMissingDelivery.snapshot.context.memory_snapshot_sync.reason, "previous_snapshot_uncommitted", "missing delivery must be explicit");

  const rejected = deliver(state, afterMissingDelivery, 2, false);
  equal(rejected.syncCommit.status, "rejected", "failed delivery must create a rejected commit");
  ok(fs.existsSync(rejected.syncCommit.commit_file), "rejected commit sidecar must be durable");
  const afterRejected = bind(state, state.groupSessionId, 3);
  equal(afterRejected.snapshot.context.memory_snapshot_sync.action, "prompt_update", "rejected delivery must force reinjection");
  equal(afterRejected.snapshot.context.memory_snapshot_sync.reason, "previous_snapshot_uncommitted", "rejected baseline must remain uncommitted");

  const committed = deliver(state, afterRejected, 3, true);
  equal(committed.syncCommit.status, "committed", "successful delivery must commit the snapshot baseline");
  ok(sessions.verifyTaskAgentMemorySnapshotSyncCommit(committed.syncCommit, {
    groupId: state.groupId,
    groupSessionId: state.groupSessionId,
    taskId: state.taskId,
    taskAgentSessionId: state.taskAgentSessionId,
    targetProject: state.project,
    snapshotId: afterRejected.snapshot.snapshot_id,
    snapshotChecksum: afterRejected.snapshot.checksum,
    syncChecksum: afterRejected.snapshot.context.memory_snapshot_sync.sync_checksum,
    syncAction: afterRejected.snapshot.context.memory_snapshot_sync.action,
    deliveryReceiptId: committed.receipt.receiptId,
    deliveryReceiptChecksum: committed.receipt.checksum,
  }).valid, "commit must bind snapshot, sync decision, and delivery receipt");

  const unchanged = bind(state, state.groupSessionId, 4);
  equal(unchanged.snapshot.context.memory_snapshot_sync.action, "none", "only a committed equal baseline may skip reinjection");
  equal(unchanged.snapshot.context.memory_snapshot_sync.previous_snapshot_committed, true, "none decision must carry committed evidence");
  ok(unchanged.snapshot.context.memory_snapshot_sync.previous_sync_commit_checksum, "none decision must bind prior commit checksum");
  const finalCommit = deliver(state, unchanged, 4, true);
  equal(finalCommit.syncCommit.status, "committed", "unchanged snapshot delivery must also be committed");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memorySnapshotSyncCommittedCount, 2, "inventory must count committed baselines");
  equal(inventory.summary.memorySnapshotSyncCommitPendingCount, 1, "inventory must expose prepared-only snapshots");
  equal(inventory.summary.memorySnapshotSyncCommitRejectedCount, 1, "inventory must expose rejected delivery commits");
  equal(inventory.summary.memorySnapshotSyncCommitInvalidCount, 0, "valid sidecars must not be reported invalid");

  state.lastCommitFile = finalCommit.syncCommit.commit_file;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE350_STAGE_prepare=${JSON.stringify({ checks, committed: inventory.summary.memorySnapshotSyncCommittedCount })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const restored = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(restored.id, state.taskAgentSessionId, "task Agent session must survive restart");
  equal(restored.memorySnapshotSyncCommitStatus, "committed", "latest commit status must survive restart");

  const resumed = bind(state, state.groupSessionId, 5);
  equal(resumed.snapshot.context.memory_snapshot_sync.action, "none", "restart must restore the committed baseline");
  const resumedDelivery = deliver(state, resumed, 5, true);
  const tampered = JSON.parse(fs.readFileSync(resumedDelivery.syncCommit.commit_file, "utf8"));
  tampered.delivery_receipt_checksum = "tampered-receipt-checksum";
  tampered.commit_checksum = recomputeCommitChecksum(tampered);
  fs.writeFileSync(resumedDelivery.syncCommit.commit_file, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");

  const afterTamper = bind(state, state.groupSessionId, 6);
  equal(afterTamper.snapshot.context.memory_snapshot_sync.action, "prompt_update", "tampered commit must force reinjection");
  equal(afterTamper.snapshot.context.memory_snapshot_sync.reason, "previous_snapshot_uncommitted", "tampered commit must fail closed as uncommitted");

  let crossSessionError = null;
  try { bind(state, state.siblingGroupSessionId, 7); } catch (error) { crossSessionError = error; }
  equal(crossSessionError?.code, "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED", "commit flow must preserve exact gcs isolation");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memorySnapshotSyncCommitInvalidCount, 1, "inventory must count tampered commit sidecars");
  ok(inventory.rows.some(row => row.memorySnapshotSyncCommitIssues?.includes("delivery_receipt_checksum_mismatch")), "inventory must expose exact receipt binding mismatch");

  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.memorySnapshotSyncCommitInvalidCount, 1, "Memory Center must expose invalid commits");
  ok(report.overall.memorySnapshotSyncCommittedCount >= 2, "Memory Center must expose committed sync baselines");

  const repaired = deliver(state, afterTamper, 6, true);
  equal(repaired.syncCommit.status, "committed", "forced reinjection must establish a fresh committed baseline");
  console.log(`PHASE350_STAGE_restart=${JSON.stringify({ checks, invalid: report.overall.memorySnapshotSyncCommitInvalidCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase350 mode: ${mode}`);
