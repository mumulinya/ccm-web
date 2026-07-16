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

function hashValue(value, len = 24) {
  const seen = new WeakSet();
  const text = typeof value === "string" ? value : JSON.stringify(value || {}, (_key, item) => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    return item;
  });
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, len);
}

function recomputeSnapshotChecksum(snapshot) {
  const payload = { ...snapshot };
  delete payload.checksum;
  delete payload.snapshot_file;
  if (payload.context?.worker_context_packet?.memory) {
    payload.context.memory_context = payload.context.worker_context_packet.memory;
  }
  return hashValue(payload);
}

function parseStageOutput(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE349_STAGE_${stage}=`));
  if (!line) throw new Error(`phase349 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-snapshot-sync-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE349_HOME: tempRoot };
  try {
    const first = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr || first.stdout);
    const firstResult = parseStageOutput(first.stdout, "prepare");
    const second = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(second.status, 0, second.stderr || second.stdout);
    const secondResult = parseStageOutput(second.stdout, "restart");
    const checks = Number(firstResult.checks || 0) + Number(secondResult.checks || 0);
    console.log(`PHASE349_RESULT=${JSON.stringify({ checks, passed: checks, prepare: firstResult, restart: secondResult })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE349_HOME;
if (!tempRoot) throw new Error("PHASE349_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const stateFile = path.join(tempRoot, "phase349-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function memoryContext(state, groupSessionId, revision) {
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: state.project,
    memory_policy: { use: "session", ignored: true },
    session_binding: { binding_id: `gmb_phase349_${groupSessionId}`, task_id: state.taskId, task_agent_session_id: state.taskAgentSessionId },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
    typed_memory_recall: [{ rel_path: "stable-rule.md", checksum: `memory-${revision}`, body: `revision ${revision}` }],
  };
}

function bind(state, groupSessionId, revision, turn) {
  const context = memoryContext(state, groupSessionId, revision);
  const prompt = `PHASE349 turn=${turn} revision=${revision} session=${groupSessionId}`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: { packet_id: `wcp_phase349_${turn}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
  });
  return { ...bound, prompt };
}

function deliver(state, bound, turn) {
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: bound.prompt,
    snapshotRenderedPrompt: bound.prompt,
    executionId: `${state.taskId}-turn-${turn}`,
    runtime: "codex",
    dispatched: true,
    executionSucceeded: true,
    output: `PHASE349 delivered turn ${turn}`,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase349-${nonce}`,
    groupSessionId: `gcs_phase349_a_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    siblingGroupSessionId: `gcs_phase349_b_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `task-phase349-${nonce}`,
    project: "phase349-project",
  };
  const taskSession = sessions.openTaskAgentSession({ scopeId: state.taskId, taskId: state.taskId, groupId: state.groupId, project: state.project, agentType: "codex" });
  state.taskAgentSessionId = taskSession.id;

  const initial = bind(state, state.groupSessionId, 1, 1);
  deliver(state, initial, 1);
  const unchanged = bind(state, state.groupSessionId, 1, 2);
  deliver(state, unchanged, 2);
  const updated = bind(state, state.groupSessionId, 2, 3);
  deliver(state, updated, 3);
  equal(initial.snapshot.context.memory_snapshot_sync.action, "initialize", "first child-session snapshot must initialize memory");
  equal(unchanged.snapshot.context.memory_snapshot_sync.action, "none", "unchanged group memory must not claim an update");
  equal(updated.snapshot.context.memory_snapshot_sync.action, "prompt_update", "changed group memory must require prompt update");
  equal(updated.snapshot.context.memory_snapshot_sync.reason, "memory_context_changed", "changed memory must have an explicit reason");
  ok(sessions.verifyTaskAgentMemorySnapshotSyncDecision(updated.snapshot.context.memory_snapshot_sync, {
    groupId: state.groupId,
    groupSessionId: state.groupSessionId,
    taskId: state.taskId,
    taskAgentSessionId: state.taskAgentSessionId,
    targetProject: state.project,
    currentMemoryContextChecksum: updated.snapshot.context.memory_context_checksum,
  }).valid, "snapshot sync decision must be checksum and identity valid");

  let crossSessionError = null;
  try { bind(state, state.siblingGroupSessionId, 3, 4); } catch (error) { crossSessionError = error; }
  equal(crossSessionError?.code, "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED", "one tas_* must never cross gcs_* boundaries");
  equal(sessions.listTaskAgentMemoryContextSnapshots({ sessionId: state.taskAgentSessionId }).length, 3, "rejected cross-session bind must not persist a snapshot");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memorySnapshotSyncInitializeCount, 1, "inventory must count initialize decisions");
  equal(inventory.summary.memorySnapshotSyncUnchangedCount, 1, "inventory must count unchanged decisions");
  equal(inventory.summary.memorySnapshotSyncPromptUpdateCount, 1, "inventory must count prompt updates");
  equal(inventory.summary.memorySnapshotSyncInvalidCount, 0, "valid sync decisions must not be reported invalid");

  const tampered = JSON.parse(fs.readFileSync(updated.snapshot.snapshot_file, "utf8"));
  tampered.context.memory_snapshot_sync.action = "initialize";
  tampered.checksum = recomputeSnapshotChecksum(tampered);
  fs.writeFileSync(updated.snapshot.snapshot_file, `${JSON.stringify(tampered, null, 2)}\n`, "utf8");
  state.initialSnapshotFile = initial.snapshot.snapshot_file;
  state.unchangedSnapshotFile = unchanged.snapshot.snapshot_file;
  state.tamperedSnapshotFile = updated.snapshot.snapshot_file;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE349_STAGE_prepare=${JSON.stringify({ checks, taskAgentSessionId: state.taskAgentSessionId })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const restored = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(restored.id, state.taskAgentSessionId, "task Agent session must survive process restart");
  equal(restored.groupSessionId, state.groupSessionId, "exact gcs_* binding must survive restart");

  const beforeRepair = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(beforeRepair.summary.checksumMismatchCount, 0, "outer snapshot checksum must remain valid in the tamper fixture");
  equal(beforeRepair.summary.memorySnapshotSyncInvalidCount, 1, "inner sync decision tamper must fail independently");
  ok(beforeRepair.rows.some(row => row.memorySnapshotSyncIssues?.includes("checksum_invalid")), "inventory must expose the sync checksum issue");

  const repaired = bind(state, state.groupSessionId, 2, 4);
  equal(repaired.snapshot.context.memory_snapshot_sync.action, "prompt_update", "untrusted previous snapshot must force reinjection after restart");
  equal(repaired.snapshot.context.memory_snapshot_sync.reason, "previous_snapshot_untrusted", "restart recovery must explain the forced update");
  deliver(state, repaired, 4);
  const stable = bind(state, state.groupSessionId, 2, 5);
  equal(stable.snapshot.context.memory_snapshot_sync.action, "none", "a trusted repaired snapshot must become the next unchanged baseline");

  let crossSessionError = null;
  try { bind(state, state.siblingGroupSessionId, 3, 6); } catch (error) { crossSessionError = error; }
  equal(crossSessionError?.code, "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED", "restart must preserve the cross-gcs fail-closed boundary");

  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  ok(report.overall.memorySnapshotSyncPromptUpdateCount >= 1, "Memory Center must expose prompt-update snapshots");
  equal(report.overall.memorySnapshotSyncInvalidCount, 1, "Memory Center must expose invalid sync evidence");
  ok(report.rows.some(row => row.memorySnapshotSyncAction === "none" && row.memorySnapshotSyncValid), "Memory Center rows must expose the stable sync state");
  console.log(`PHASE349_STAGE_restart=${JSON.stringify({ checks, promptUpdates: report.overall.memorySnapshotSyncPromptUpdateCount, invalid: report.overall.memorySnapshotSyncInvalidCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase349 mode: ${mode}`);
