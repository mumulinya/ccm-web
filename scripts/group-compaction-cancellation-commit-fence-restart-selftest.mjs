import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const marker = "PHASE389_STAGE_";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    activity: require(dist("modules", "collaboration", "group-compaction-activity.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    compactHead: require(dist("modules", "collaboration", "group-compact-head.js")),
    circuit: require(dist("modules", "collaboration", "group-memory-auto-compact-circuit-breaker.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
  };
}

function fixtureMessages(groupSessionId, label) {
  return Array.from({ length: 36 }, (_, index) => ({
    id: `${label}-${index}`,
    group_session_id: groupSessionId,
    role: index % 2 ? "assistant" : "user",
    target: index % 2 ? undefined : "all",
    agent: index % 2 ? "group-main" : undefined,
    timestamp: new Date(Date.parse("2026-07-17T10:00:00.000Z") + index * 60_000).toISOString(),
    content: `${label} atomic commit fence requirement ${index}; preserve src/${label}-${index}.ts. ${"context ".repeat(1200)}`,
  }));
}

function artifact(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function parseStage(output, stage) {
  const prefix = `${marker}${stage}=`;
  const row = String(output || "").split(/\r?\n/).find(line => line.startsWith(prefix));
  if (!row) throw new Error(`missing ${prefix}:\n${output}`);
  return JSON.parse(row.slice(prefix.length));
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
  const { activity, memory, storage, compactHead, circuit, center } = modules();
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `phase389-group-${nonce}`;
  const cancelWinsSession = storage.createGroupChatSession(groupId, "Phase 389 cancellation wins");
  const commitWinsSession = storage.createGroupChatSession(groupId, "Phase 389 commit wins");
  for (const [session, label] of [[cancelWinsSession, "cancel-wins"], [commitWinsSession, "commit-wins"]]) {
    storage.saveGroupMessages(groupId, fixtureMessages(session.id, label), session.id);
    memory.saveGroupMemory(groupId, { goal: `${label} baseline`, decisions: [{ decision: `${label}-decision` }] }, session.id);
  }

  const cancelMemoryFile = memory.getGroupMemoryFile(groupId, cancelWinsSession.id);
  const cancelHeadFile = compactHead.getGroupCompactHeadFile(groupId, cancelWinsSession.id);
  const cancelCircuitFile = circuit.getGroupMemoryAutoCompactCircuitBreakerFile(groupId, cancelWinsSession.id);
  const cancelBaseline = {
    memory: artifact(cancelMemoryFile),
    head: artifact(cancelHeadFile),
    circuit: artifact(cancelCircuitFile),
  };
  let competingCancellation = null;
  const cancelWinsResult = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: cancelWinsSession.id,
    force: true,
    reason: "phase389_cancel_before_commit",
    config: { memoryCompactionUseModel: false, sessionMemoryCompactEnabled: false, compactionCancellationPollMs: 25 },
    beforeCompactionCommit(info) {
      fs.writeFileSync(stateFile, `${JSON.stringify({
        groupId,
        groupSessionId: cancelWinsSession.id,
        operationId: info.operationId,
      }, null, 2)}\n`, "utf8");
      competingCancellation = runChild("cancel", process.env.USERPROFILE || process.env.HOME, stateFile);
    },
  });
  const cancelLedger = activity.readGroupCompactionActivity(groupId, cancelWinsSession.id);
  const cancelTerminal = cancelLedger.recent.at(-1);

  const commitWinsResult = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: commitWinsSession.id,
    force: true,
    reason: "phase389_commit_before_cancel",
    config: { memoryCompactionUseModel: false, sessionMemoryCompactEnabled: false, compactionCancellationPollMs: 25 },
  });
  const commitLedger = activity.readGroupCompactionActivity(groupId, commitWinsSession.id);
  const commitTerminal = commitLedger.recent.at(-1);
  const lateCancellation = activity.requestGroupCompactionCancellation({
    groupId,
    groupSessionId: commitWinsSession.id,
    operationId: commitTerminal.operation_id,
    reason: "late cancellation must not rewrite committed result",
    actor: "phase389-late-canceller",
  });
  const commitLedgerAfterLateCancel = activity.readGroupCompactionActivity(groupId, commitWinsSession.id);
  const checks = {
    crossProcessCancellationReachedCommitWindow: competingCancellation?.requested === true && competingCancellation?.operationId === cancelTerminal.operation_id,
    cancellationWinsWithDedicatedOutcome: cancelWinsResult.cancelled === true && cancelWinsResult.reason === "compaction_cancelled",
    cancellationWinnerLeavesMemoryByteStable: artifact(cancelMemoryFile) === cancelBaseline.memory,
    cancellationWinnerLeavesHeadByteStable: artifact(cancelHeadFile) === cancelBaseline.head,
    cancellationWinnerLeavesCircuitByteStable: artifact(cancelCircuitFile) === cancelBaseline.circuit,
    cancellationTerminalHasNoCommitSeal: cancelTerminal.status === "cancelled" && !cancelTerminal.commit_fence_status,
    cancellationLedgerRemainsValid: activity.verifyGroupCompactionActivityLedger(cancelLedger).valid === true,
    commitWinnerSucceeds: commitWinsResult.success === true && commitWinsResult.compacted === true,
    commitWinnerSealsActivityAtomically: commitTerminal.status === "completed" && commitTerminal.commit_fence_status === "sealed" && !!commitTerminal.commit_sealed_at,
    commitWinnerBindsBoundaryAndTransaction: commitTerminal.boundary_id === commitWinsResult.boundary?.id && commitTerminal.compact_transaction_receipt_checksum === commitWinsResult.lifecycleCommitProof?.compact_transaction_receipt_checksum,
    returnedCommitFenceIsBodyFreeAndBound: commitWinsResult.compactionActivity?.commitFence?.status === "sealed" && commitWinsResult.compactionActivity?.commitFence?.body_free === true && commitWinsResult.compactionActivity?.commitFence?.operation_id === commitTerminal.operation_id,
    lateCancellationRejectedAsSealed: lateCancellation.requested === false && lateCancellation.reason === "compact_commit_already_sealed" && lateCancellation.terminal?.operation_id === commitTerminal.operation_id,
    lateCancellationCannotRewriteTerminal: JSON.stringify(commitLedgerAfterLateCancel.recent.at(-1)) === JSON.stringify(commitTerminal),
    commitWinnerPersistsMemoryAndHead: artifact(memory.getGroupMemoryFile(groupId, commitWinsSession.id)) !== null && artifact(compactHead.getGroupCompactHeadFile(groupId, commitWinsSession.id)) !== null,
    commitLedgerRemainsValid: activity.verifyGroupCompactionActivityLedger(commitLedgerAfterLateCancel).valid === true,
    exactSessionsRemainIndependent: cancelLedger.group_session_id === cancelWinsSession.id && commitLedger.group_session_id === commitWinsSession.id && cancelTerminal.operation_id !== commitTerminal.operation_id,
  };
  if (Object.values(checks).some(value => value !== true)) {
    console.error(JSON.stringify({ checks, competingCancellation, cancelWinsResult, cancelLedger, commitWinsResult, commitLedger, lateCancellation, commitLedgerAfterLateCancel }, null, 2));
  }
  for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, name);
  fs.writeFileSync(stateFile, `${JSON.stringify({
    groupId,
    cancelWinsSessionId: cancelWinsSession.id,
    commitWinsSessionId: commitWinsSession.id,
    cancelOperationId: cancelTerminal.operation_id,
    commitOperationId: commitTerminal.operation_id,
  }, null, 2)}\n`, "utf8");
  console.log(`${marker}create=${JSON.stringify({ checks: Object.keys(checks).length, ...checks })}`);
}

function cancelStage(stateFile) {
  const { activity } = modules();
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const result = activity.requestGroupCompactionCancellation({
    groupId: state.groupId,
    groupSessionId: state.groupSessionId,
    operationId: state.operationId,
    reason: "cross-process cancellation wins before commit fence",
    actor: "phase389-cross-process-canceller",
  });
  console.log(`${marker}cancel=${JSON.stringify({ requested: result.requested === true, operationId: result.current?.operation_id || "" })}`);
}

function restartStage(stateFile) {
  const { activity, center } = modules();
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const cancelled = activity.readGroupCompactionActivity(state.groupId, state.cancelWinsSessionId);
  const committed = activity.readGroupCompactionActivity(state.groupId, state.commitWinsSessionId);
  const checks = {
    cancellationWinnerSurvivesRestart: cancelled.recent.at(-1)?.operation_id === state.cancelOperationId && cancelled.recent.at(-1)?.status === "cancelled",
    sealedCommitSurvivesRestart: committed.recent.at(-1)?.operation_id === state.commitOperationId && committed.recent.at(-1)?.commit_fence_status === "sealed",
    bothLedgersVerifyAfterRestart: activity.verifyGroupCompactionActivityLedger(cancelled).valid === true && activity.verifyGroupCompactionActivityLedger(committed).valid === true,
  };
  for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, name);
  console.log(`${marker}restart=${JSON.stringify({ checks: Object.keys(checks).length, ...checks })}`);
}

const stage = process.argv[2] || "orchestrate";
if (stage === "create") await createStage(process.argv[3]);
else if (stage === "cancel") cancelStage(process.argv[3]);
else if (stage === "restart") restartStage(process.argv[3]);
else {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase389-cancel-commit-fence-"));
  const stateFile = path.join(home, "phase389-state.json");
  try {
    const create = runChild("create", home, stateFile);
    const restart = runChild("restart", home, stateFile);
    console.log(JSON.stringify({ pass: true, checks: create.checks + restart.checks, create, restart }, null, 2));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}
