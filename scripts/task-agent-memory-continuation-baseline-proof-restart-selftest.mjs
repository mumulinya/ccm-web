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

function parseStage(output, stage) {
  const line = String(output || "").split(/\r?\n/).find(item => item.startsWith(`PHASE353_STAGE_${stage}=`));
  if (!line) throw new Error(`phase353 ${stage} result missing:\n${output}`);
  return JSON.parse(line.slice(line.indexOf("=") + 1));
}

if (mode === "orchestrate") {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-continuation-baseline-"));
  const env = { ...process.env, HOME: tempRoot, USERPROFILE: tempRoot, PHASE353_HOME: tempRoot };
  try {
    const prepare = spawnSync(process.execPath, [scriptFile, "prepare"], { cwd: root, env, encoding: "utf8" });
    assert.equal(prepare.status, 0, prepare.stderr || prepare.stdout);
    const prepared = parseStage(prepare.stdout, "prepare");
    const restart = spawnSync(process.execPath, [scriptFile, "restart"], { cwd: root, env, encoding: "utf8" });
    assert.equal(restart.status, 0, restart.stderr || restart.stdout);
    const restarted = parseStage(restart.stdout, "restart");
    const checks = Number(prepared.checks || 0) + Number(restarted.checks || 0);
    console.log(`PHASE353_RESULT=${JSON.stringify({ checks, passed: checks, prepare: prepared, restart: restarted })}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

const tempRoot = process.env.PHASE353_HOME;
if (!tempRoot) throw new Error("PHASE353_HOME is required");
process.env.HOME = tempRoot;
process.env.USERPROFILE = tempRoot;
const require = createRequire(import.meta.url);
const sessions = require(path.join(root, "ccm-package", "dist", "tasks", "agent-sessions.js"));
const continuation = require(path.join(root, "ccm-package", "dist", "agents", "native-continuation.js"));
const runtime = require(path.join(root, "ccm-package", "dist", "agents", "runtime.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const stateFile = path.join(tempRoot, "phase353-state.json");
let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.equal(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

function memoryContext(state, groupSessionId = state.groupSessionId) {
  return {
    schema: "ccm-group-memory-context-v1",
    group_id: state.groupId,
    group_session_id: groupSessionId,
    target_project: state.project,
    rendered_text: `[PHASE353_MEMORY]\ngroup=${state.groupId}\nsession=${groupSessionId}\nrule=native continuation must prove unchanged-memory reuse`,
    memory_policy: { use: "session" },
    session_binding: {
      binding_id: `gmb_phase353_${groupSessionId}`,
      task_id: state.taskId,
      task_agent_session_id: state.taskAgentSessionId,
    },
    compaction: {},
    group_state: { typedMemory: { ledger: { compactEpoch: "precompact" } } },
  };
}

function bind(state, turn, includeProjection, groupSessionId = state.groupSessionId) {
  const context = memoryContext(state, groupSessionId);
  const prompt = includeProjection
    ? `PHASE353 turn=${turn}\n${context.rendered_text}\nexecute`
    : `PHASE353 turn=${turn}\ncontinue committed memory without repeating it`;
  const bound = sessions.bindTaskAgentMemoryContextSnapshot(state.taskAgentSessionId, {
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
    turn,
    executionId: `${state.taskId}-turn-${turn}`,
    workerContextPacket: { packet_id: `wcp_phase353_${turn}`, memory: context },
    memoryContext: context,
    renderedPrompt: prompt,
    renderedMemoryContext: context.rendered_text,
    requireMemoryPromptInjectionProof: true,
  });
  return { ...bound, prompt, context };
}

function deliver(state, bound, turn, options = {}) {
  return sessions.recordTaskAgentMemoryContextDelivery(state.taskAgentSessionId, {
    snapshotId: bound.snapshot.snapshot_id,
    renderedPrompt: bound.prompt,
    snapshotRenderedPrompt: bound.prompt,
    executionId: `${state.taskId}-turn-${turn}`,
    runtime: "codex",
    attempt: turn,
    nativeSessionId: options.nativeSessionId || state.nativeSessionId,
    runnerRequestId: options.runnerRequestId || "",
    nativeContinuationEvidence: options.nativeContinuationEvidence || null,
    dispatched: true,
    runnerStarted: true,
    executionSucceeded: true,
    output: `PHASE353 output turn ${turn}`,
  });
}

function nativeEvidence(state, runnerRequestId) {
  const normalized = runtime.normalizeAgentCommandOutput("codex", JSON.stringify({
    type: "thread.started",
    thread_id: state.nativeSessionId,
  }));
  return continuation.buildNativeSessionContinuationEvidence({
    provider: "codex",
    runnerRequestId,
    requestedNativeSessionId: state.nativeSessionId,
    returnedNativeSessionId: state.nativeSessionId,
    providerOutputContractEvidence: normalized.providerOutputContractEvidence,
    nativeResumeRequested: true,
    runnerSuccess: true,
  });
}

if (mode === "prepare") {
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const state = {
    groupId: `group-phase353-${nonce}`,
    groupSessionId: `gcs_phase353_a_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    siblingGroupSessionId: `gcs_phase353_b_${nonce.replace(/[^a-z0-9]/gi, "")}`,
    taskId: `task-phase353-${nonce}`,
    project: "phase353-project",
    nativeSessionId: `thread-phase353-${nonce}`,
  };
  const taskSession = sessions.openTaskAgentSession({
    scopeId: state.taskId,
    taskId: state.taskId,
    groupId: state.groupId,
    project: state.project,
    agentType: "codex",
  });
  state.taskAgentSessionId = taskSession.id;
  const first = bind(state, 1, true);
  equal(first.snapshot.context.memory_snapshot_sync.action, "initialize", "first snapshot must initialize memory");
  const committed = deliver(state, first, 1);
  equal(committed.syncCommit.status, "committed", "full prompt injection must establish the first baseline");
  const advanced = sessions.recordTaskAgentSessionTurn(state.taskAgentSessionId, {
    nativeSessionId: state.nativeSessionId,
    success: true,
  });
  equal(advanced.nativeSessionId, state.nativeSessionId, "first Provider turn must capture the native session id");
  equal(advanced.resumeMode, "native", "captured Provider session must remain native-resumable");
  state.firstCommitChecksum = committed.syncCommit.commit_checksum;
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`PHASE353_STAGE_prepare=${JSON.stringify({ checks, session: state.taskAgentSessionId })}`);
  process.exit(0);
}

if (mode === "restart") {
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const restored = sessions.listTaskAgentSessions({ taskId: state.taskId })[0];
  equal(restored.nativeSessionId, state.nativeSessionId, "native session id must survive restart");
  equal(restored.memorySnapshotSyncCommitChecksum, state.firstCommitChecksum, "committed memory baseline must survive restart");

  const resumed = bind(state, 2, false);
  const resumedSync = resumed.snapshot.context.memory_snapshot_sync;
  equal(resumedSync.action, "none", "unchanged memory may omit projection only with an eligible native continuation baseline");
  equal(resumedSync.continuation_baseline_eligible, true, "none decision must bind continuation eligibility");
  equal(resumedSync.continuation_native_session_id, state.nativeSessionId, "none decision must bind the exact native session id");
  const resumeRequestId = `adr_phase353_resume_${Date.now().toString(36)}`;
  const resumedDelivery = deliver(state, resumed, 2, {
    runnerRequestId: resumeRequestId,
    nativeContinuationEvidence: nativeEvidence(state, resumeRequestId),
  });
  equal(resumedDelivery.receipt.memoryContinuationBaselineRequired, true, "omitted projection must require continuation proof");
  equal(resumedDelivery.receipt.memoryContinuationBaselineValid, true, "acknowledged native continuation must validate the baseline");
  equal(resumedDelivery.receipt.memoryContinuationBaselineStatus, "acknowledged", "valid continuation must be explicit in the receipt");
  equal(resumedDelivery.syncCommit.status, "committed", "valid native continuation may commit unchanged memory");

  const unverified = bind(state, 3, false);
  equal(unverified.snapshot.context.memory_snapshot_sync.action, "none", "trusted previous native baseline may prepare another continuation");
  const wrongRequestId = `adr_phase353_wrong_${Date.now().toString(36)}`;
  const wrongEvidence = nativeEvidence(state, `${wrongRequestId}_other`);
  const rejected = deliver(state, unverified, 3, {
    runnerRequestId: wrongRequestId,
    nativeContinuationEvidence: wrongEvidence,
  });
  equal(rejected.receipt.delivered, false, "mismatched continuation evidence must fail memory delivery");
  equal(rejected.receipt.status, "continuation_baseline_unverified", "failed continuation must have a dedicated delivery status");
  equal(rejected.syncCommit.status, "rejected", "unverified continuation must not establish a reusable baseline");
  ok(rejected.receipt.memoryContinuationBaselineIssues.includes("runnerRequestId_mismatch"), "receipt must explain the exact continuation mismatch");

  let reinjectionError = null;
  try { bind(state, 4, false); } catch (error) { reinjectionError = error; }
  equal(reinjectionError?.code, "TASK_AGENT_MEMORY_PROMPT_INJECTION_REQUIRED", "rejected continuation must force full memory reinjection next turn");
  const repaired = bind(state, 4, true);
  equal(repaired.snapshot.context.memory_snapshot_sync.action, "prompt_update", "full reinjection must repair the rejected baseline");
  equal(repaired.snapshot.context.memory_snapshot_sync.reason, "previous_snapshot_uncommitted", "repair reason must retain rejected-baseline provenance");
  equal(deliver(state, repaired, 4).syncCommit.status, "committed", "full reinjection must establish a fresh committed baseline");

  let crossSessionError = null;
  try { bind(state, 5, true, state.siblingGroupSessionId); } catch (error) { crossSessionError = error; }
  equal(crossSessionError?.code, "TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED", "continuation baseline must never cross gcs sessions");

  const inventory = sessions.buildTaskAgentMemoryContextSnapshotInventory({ groupId: state.groupId });
  equal(inventory.summary.memoryContinuationBaselineRequiredCount, 2, "inventory must count continuation-dependent snapshots");
  equal(inventory.summary.memoryContinuationBaselineValidCount, 1, "inventory must count acknowledged continuation baselines");
  equal(inventory.summary.memoryContinuationBaselineUnverifiedCount, 1, "inventory must count unverified continuation baselines");
  const report = center.buildTaskAgentMemoryContextSnapshotReport({ groupId: state.groupId });
  equal(report.overall.memoryContinuationBaselineValidCount, 1, "Memory Center must expose acknowledged continuation baselines");
  equal(report.overall.memoryContinuationBaselineUnverifiedCount, 1, "Memory Center must expose rejected continuation baselines");
  ok(report.rows.some(row => row.deliveryStatus === "continuation_baseline_unverified"), "Memory Center rows must retain the failed continuation status");
  console.log(`PHASE353_STAGE_restart=${JSON.stringify({ checks, required: inventory.summary.memoryContinuationBaselineRequiredCount })}`);
  process.exit(0);
}

throw new Error(`unknown phase353 mode: ${mode}`);
