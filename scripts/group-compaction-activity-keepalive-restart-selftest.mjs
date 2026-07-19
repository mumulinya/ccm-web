import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const marker = "PHASE387_STAGE_";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    activity: require(dist("modules", "collaboration", "group-compaction-activity.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    lifecycle: require(dist("modules", "collaboration", "group-session-lifecycle-head.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function operationId(seed) {
  return `acba_${crypto.createHash("sha256").update(String(seed)).digest("hex").slice(0, 24)}`;
}

function lifecycleFence(lifecycle, groupId, groupSessionId) {
  const head = lifecycle.readGroupSessionLifecycleHead(groupId, groupSessionId);
  return {
    required: true,
    groupId,
    groupSessionId,
    lifecycleGeneration: head.generation,
    lifecycleStatus: head.status,
    lifecycleHeadId: head.lifecycle_head_id,
    lifecycleHeadChecksum: head.head_checksum,
  };
}

function fixtureMessages(groupSessionId, label) {
  return Array.from({ length: 34 }, (_, index) => ({
    id: `${label}-${index}`,
    group_session_id: groupSessionId,
    role: index % 2 ? "assistant" : "user",
    target: index % 2 ? undefined : "all",
    agent: index % 2 ? "group-main" : undefined,
    timestamp: new Date(Date.parse("2026-07-17T07:00:00.000Z") + index * 60_000).toISOString(),
    content: `${label} keep-alive requirement ${index}; preserve pending work and src/${label}-${index}.ts. ${"context ".repeat(1200)}`,
  }));
}

async function delayedModelServer(delayMs = 240) {
  let requests = 0;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => {
      requests += 1;
      setTimeout(() => {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
          choices: [{ message: { content: JSON.stringify({
            primaryRequest: "Keep compact activity alive.",
            userMessages: [],
            keyConcepts: ["compaction activity lease"],
            filesAndCode: [],
            errorsAndFixes: [],
            decisions: ["Only one process compacts an exact group session."],
            completedWork: [],
            pendingTasks: ["Verify restart recovery."],
            currentWork: "Keep compact activity alive.",
            nextStep: "Verify restart recovery.",
            participantState: [],
            taskStates: [],
          }) } }],
          usage: { prompt_tokens: 1600, completion_tokens: 180, total_tokens: 1780 },
        }));
      }, delayMs);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return { server, port: server.address().port, requests: () => requests };
}

function parseStage(output, stage) {
  const prefix = `${marker}${stage}=`;
  const line = String(output || "").split(/\r?\n/).find(row => row.startsWith(prefix));
  if (!line) throw new Error(`missing ${prefix}:\n${output}`);
  return JSON.parse(line.slice(prefix.length));
}

function runChild(stage, home, stateFile) {
  const result = spawnSync(process.execPath, [file, stage, stateFile], {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${stage} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return parseStage(result.stdout, stage);
}

async function createStage(stateFile) {
  const { activity, memory, storage, lifecycle, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase387-group-${nonce}`;
  const modelSession = storage.createGroupChatSession(groupId, "Phase 387 model heartbeat");
  const contentionSession = storage.createGroupChatSession(groupId, "Phase 387 contention");
  const crashSession = storage.createGroupChatSession(groupId, "Phase 387 crash recovery");
  const deleteSession = storage.createGroupChatSession(groupId, "Phase 387 delete cleanup");
  for (const [session, label] of [[modelSession, "model"], [contentionSession, "contention"], [crashSession, "crash"], [deleteSession, "delete"]]) {
    storage.saveGroupMessages(groupId, fixtureMessages(session.id, label), session.id);
    memory.saveGroupMemory(groupId, { goal: `${label} activity test`, decisions: [{ decision: `${label}-baseline` }] }, session.id);
  }

  const modelServer = await delayedModelServer();
  let modelResult;
  try {
    modelResult = await memory.runGroupMemoryAutoCompactionNow(groupId, {
      sessionId: modelSession.id,
      force: true,
      reason: "phase387_model_wait_keepalive",
      config: {
        enabled: true,
        format: "openai-compatible",
        apiUrl: `http://127.0.0.1:${modelServer.port}/v1`,
        apiKey: "phase387-local-fixture-key",
        model: "phase387-local-model",
        timeoutMs: 30_000,
        memoryCompactionUseModel: true,
        sessionMemoryCompactEnabled: false,
        modelContextWindow: 200_000,
        modelAutoCompactTokenLimit: 167_000,
        memoryCompactionMaxInputTokens: 120_000,
        compactionActivityHeartbeatMs: 40,
        compactionActivityLeaseMs: 1_000,
      },
    });
  } finally {
    await new Promise(resolve => modelServer.server.close(resolve));
  }
  const modelLedger = activity.readGroupCompactionActivity(groupId, modelSession.id);
  const modelTerminal = modelLedger.recent.at(-1);

  const contentionFence = lifecycleFence(lifecycle, groupId, contentionSession.id);
  const contentionOperation = operationId(`${nonce}:contention-owner`);
  const contentionOwner = activity.startGroupCompactionActivity({ lifecycleFence: contentionFence, operationId: contentionOperation, leaseMs: 30_000, reason: "phase387_parent_owner" });
  fs.writeFileSync(stateFile, `${JSON.stringify({ groupId, modelSessionId: modelSession.id, contentionSessionId: contentionSession.id, crashSessionId: crashSession.id, deleteSessionId: deleteSession.id }, null, 2)}\n`, "utf8");
  const contender = runChild("contender", process.env.USERPROFILE || process.env.HOME, stateFile);
  const contentionFinish = activity.finishGroupCompactionActivity({ groupId, groupSessionId: contentionSession.id, operationId: contentionOperation, status: "skipped", reason: "contention test complete" });

  const crash = runChild("crash-holder", process.env.USERPROFILE || process.env.HOME, stateFile);
  const crashBefore = activity.readGroupCompactionActivity(groupId, crashSession.id);
  const crashAfter = activity.reconcileGroupCompactionActivity(groupId, crashSession.id);

  const deleteFence = lifecycleFence(lifecycle, groupId, deleteSession.id);
  const deleteOperation = operationId(`${nonce}:delete-owner`);
  activity.startGroupCompactionActivity({ lifecycleFence: deleteFence, operationId: deleteOperation, leaseMs: 30_000, reason: "phase387_delete_owner" });
  storage.deleteGroupChatSession(groupId, deleteSession.id, { force: true, reason: "phase387_delete_activity" });
  const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, deleteSession.id);
  let deletedPulseRejected = false;
  try {
    activity.pulseGroupCompactionActivity({ lifecycleFence: deleteFence, operationId: deleteOperation, stage: "model_summary_wait", leaseMs: 30_000 });
  } catch (error) {
    deletedPulseRejected = error?.code === "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
  }

  const tampered = { ...modelLedger, revision: modelLedger.revision + 1 };
  const checks = {
    realModelRequestCompleted: modelServer.requests() === 1 && modelResult.success === true && modelResult.compacted === true,
    modelActivityTerminalCompleted: modelLedger.current === null && modelTerminal?.status === "completed",
    modelWaitHeartbeatRepeated: Number(modelTerminal?.model_wait_heartbeat_count || 0) >= 2 && Number(modelTerminal?.heartbeat_sequence || 0) >= 6,
    terminalBindsCompactTransaction: modelTerminal?.boundary_id === modelResult.boundary?.id && modelTerminal?.compact_transaction_receipt_checksum === modelResult.lifecycleCommitProof?.compact_transaction_receipt_checksum,
    activityLedgerValidAndBodyFree: activity.verifyGroupCompactionActivityLedger(modelLedger, { groupId, groupSessionId: modelSession.id }).valid === true && !JSON.stringify(modelLedger).includes("Keep compact activity alive"),
    tamperedLedgerRejected: activity.verifyGroupCompactionActivityLedger(tampered).valid === false,
    contentionOwnerStarted: contentionOwner.started === true,
    secondProcessBlockedBeforeCompact: contender.reason === "cross_process_compaction_active" && contender.scheduled === true && contender.currentOperationId === contentionOperation,
    contentionOwnerFinished: contentionFinish.finished === true && contentionFinish.terminal.status === "skipped",
    crashHolderStarted: crash.started === true && crash.operationId === crashBefore.current?.operation_id,
    deadOwnerRecoveredInterrupted: crashAfter.current === null && crashAfter.recent.at(-1)?.status === "interrupted" && crashAfter.recent.at(-1)?.terminal_reason === "owner_dead_or_lease_expired",
    deletedActivityArtifactRemoved: deletion.compactionActivityArtifacts?.deleted >= 1 && !fs.existsSync(activity.getGroupCompactionActivityFile(groupId, deleteSession.id)),
    deletedHeartbeatRejectedAndCannotRecreate: deletedPulseRejected && !fs.existsSync(activity.getGroupCompactionActivityFile(groupId, deleteSession.id)),
    exactSessionLedgersRemainIndependent: modelLedger.group_session_id === modelSession.id && crashAfter.group_session_id === crashSession.id && contentionFinish.ledger.group_session_id === contentionSession.id,
  };
  if (Object.values(checks).some(pass => pass !== true)) {
    console.error(JSON.stringify({ checks, modelResult, modelLedger, modelVerification: activity.verifyGroupCompactionActivityLedger(modelLedger), contender, crash, crashBefore, crashAfter, deletion }, null, 2));
  }
  for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, name);
  fs.writeFileSync(stateFile, `${JSON.stringify({ groupId, modelSessionId: modelSession.id, contentionSessionId: contentionSession.id, crashSessionId: crashSession.id, deleteSessionId: deleteSession.id, modelOperationId: modelTerminal.operation_id }, null, 2)}\n`, "utf8");
  console.log(`${marker}create=${JSON.stringify({ checks: Object.keys(checks).length, ...checks })}`);
}

function contenderStage(stateFile) {
  const { memory, activity } = modules();
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const result = memory.runGroupMemoryAutoCompactionNow(state.groupId, { sessionId: state.contentionSessionId, force: true, reason: "phase387_cross_process_contender" });
  Promise.resolve(result).then(value => {
    const current = activity.readGroupCompactionActivity(state.groupId, state.contentionSessionId).current;
    console.log(`${marker}contender=${JSON.stringify({ reason: value.reason, scheduled: value.scheduled === true, currentOperationId: current?.operation_id || "" })}`);
  });
}

function crashHolderStage(stateFile) {
  const { activity, lifecycle } = modules();
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const fence = lifecycleFence(lifecycle, state.groupId, state.crashSessionId);
  const id = operationId(`${process.pid}:phase387-crash`);
  const started = activity.startGroupCompactionActivity({ lifecycleFence: fence, operationId: id, leaseMs: 30_000, reason: "phase387_crash_without_finish" });
  console.log(`${marker}crash-holder=${JSON.stringify({ started: started.started === true, operationId: id })}`);
}

function restartStage(stateFile) {
  const { activity, center } = modules();
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const model = activity.reconcileGroupCompactionActivity(state.groupId, state.modelSessionId);
  const contention = activity.reconcileGroupCompactionActivity(state.groupId, state.contentionSessionId);
  const crash = activity.reconcileGroupCompactionActivity(state.groupId, state.crashSessionId);
  const checks = {
    completedHeartbeatHistorySurvivesRestart: model.current === null && model.recent.at(-1)?.operation_id === state.modelOperationId && model.recent.at(-1)?.status === "completed",
    heartbeatCountsSurviveRestart: Number(model.recent.at(-1)?.model_wait_heartbeat_count || 0) >= 2,
    contentionHistorySurvivesRestart: contention.current === null && contention.recent.at(-1)?.status === "skipped",
    interruptedCrashSurvivesRestart: crash.current === null && crash.recent.at(-1)?.status === "interrupted",
    allThreeLedgersRemainValid: [model, contention, crash].every(row => activity.verifyGroupCompactionActivityLedger(row).valid === true),
    deletedLedgerDoesNotReturn: !fs.existsSync(activity.getGroupCompactionActivityFile(state.groupId, state.deleteSessionId)),
  };
  for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, name);
  console.log(`${marker}restart=${JSON.stringify({ checks: Object.keys(checks).length, ...checks })}`);
}

const stage = process.argv[2] || "orchestrate";
if (stage === "create") {
  await createStage(process.argv[3]);
} else if (stage === "contender") {
  contenderStage(process.argv[3]);
} else if (stage === "crash-holder") {
  crashHolderStage(process.argv[3]);
} else if (stage === "restart") {
  restartStage(process.argv[3]);
} else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase387-compaction-activity-"));
  const stateFile = path.join(home, "phase387-state.json");
  try {
    const create = runChild("create", home, stateFile);
    const restart = runChild("restart", home, stateFile);
    console.log(JSON.stringify({ pass: true, checks: create.checks + restart.checks, create, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
