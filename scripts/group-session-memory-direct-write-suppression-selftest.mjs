import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inspectMode = process.argv.includes("--inspect");
const inspectInput = process.env.PHASE274_INSPECT_INPUT ? JSON.parse(process.env.PHASE274_INSPECT_INPUT) : null;

if (inspectMode) {
  process.env.USERPROFILE = inspectInput.tempRoot;
  process.env.HOME = inspectInput.tempRoot;
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
  const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(inspectInput.scopeId);
  const history = model.readGroupSessionMemoryModelExtractionHistory(inspectInput.scopeId);
  const fleet = center.buildGroupSessionMemorySnapshotReport({
    groupIds: [inspectInput.groupId],
    groupSessionId: inspectInput.groupSessionId,
  });
  process.stdout.write(`${JSON.stringify({ pass: true, snapshot, history, fleet })}\n`);
  process.exit(0);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase274-direct-write-suppression-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const nonce = `${process.pid}-${Date.now().toString(36)}`;

function createScope(label) {
  const groupId = `group-phase274-${label}-${nonce}`;
  const session = storage.createGroupChatSession(groupId, `Phase 274 ${label}`);
  memory.saveGroupMemory(groupId, memory.loadGroupMemory(groupId, session.id), session.id);
  return { groupId, sessionId: session.id, scopeId: `${groupId}--${session.id}` };
}

function appendDirect(scope, input) {
  const messageId = input.messageId;
  const action = typed.buildGroupDirectMemoryAction(input.claimedScopeId || scope.scopeId, {
    action: input.action,
    messageId,
    content: input.content,
    targetMemoryId: input.targetMemoryId || "",
    memoryType: input.memoryType || "user",
  });
  if (input.tamperChecksum) action.requestChecksum = "0".repeat(64);
  storage.appendGroupMessage(scope.groupId, {
    id: messageId,
    role: "user",
    content: input.content,
    timestamp: new Date().toISOString(),
    group_session_id: scope.sessionId,
    memory_direct_action: action,
  });
  let commit = null;
  if (input.commit !== false) {
    commit = typed.commitGroupDirectMemoryAction(scope.scopeId, storage.getGroupMessages(scope.groupId, scope.sessionId), {
      requestId: action.requestId,
      reason: `phase274-${input.action}`,
    });
    storage.appendGroupMessage(scope.groupId, {
      id: `${messageId}-receipt`,
      role: "assistant",
      content: `memory ${commit.receipt?.status || "unknown"}`,
      timestamp: new Date().toISOString(),
      group_session_id: scope.sessionId,
      memory_receipt: commit.receipt,
    });
  }
  return { action, commit };
}

async function runWithModelProbe(scope, label) {
  let calls = 0;
  const result = await model.runGroupSessionMemoryModelExtractionNow(scope.groupId, {
    groupSessionId: scope.sessionId,
    force: true,
    respectBackoff: false,
    executor: async () => {
      calls += 1;
      throw new Error(`phase274_model_probe_invoked:${label}`);
    },
  });
  return { result, calls };
}

function spawnInspector(scope) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--inspect"], {
    cwd: root,
    env: { ...process.env, PHASE274_INSPECT_INPUT: JSON.stringify({ tempRoot, scopeId: scope.scopeId, groupId: scope.groupId, groupSessionId: scope.sessionId }) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", code => {
      if (code !== 0) return reject(new Error(`phase274_inspector_failed:${code}:${stderr || stdout}`));
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      resolve(JSON.parse(lines.at(-1)));
    });
  });
}

try {
  const committedScope = createScope("committed");
  const remembered = appendDirect(committedScope, {
    action: "remember",
    messageId: "phase274-remember",
    content: "Always preserve the exact PHASE274_DIRECT_MEMORY_RULE in this group session.",
  });
  assert.equal(remembered.commit.receipt.status, "committed");
  const rememberSuppression = await model.runGroupSessionMemoryModelExtractionNow(committedScope.groupId, {
    groupSessionId: committedScope.sessionId,
    force: true,
    respectBackoff: false,
  });
  assert.equal(rememberSuppression.status, "direct_memory_write_suppressed");
  assert.equal(rememberSuppression.modelInvoked, false);
  assert.equal(rememberSuppression.suppressionReceipt.directMemoryProofs[0].requestId, remembered.action.requestId);
  assert.equal(rememberSuppression.suppressionReceipt.cursorAfter, "phase274-remember-receipt");

  const forgotten = appendDirect(committedScope, {
    action: "forget",
    messageId: "phase274-forget",
    content: remembered.commit.receipt.memoryId,
    targetMemoryId: remembered.commit.receipt.memoryId,
  });
  assert.equal(forgotten.commit.receipt.status, "committed");
  const forgetSuppression = await model.runGroupSessionMemoryModelExtractionNow(committedScope.groupId, {
    groupSessionId: committedScope.sessionId,
    force: true,
    respectBackoff: false,
  });
  assert.equal(forgetSuppression.status, "direct_memory_write_suppressed");
  assert.equal(forgetSuppression.suppressionReceipt.directMemoryProofs[0].action, "forget");
  assert.equal(forgetSuppression.suppressionReceipt.cursorBefore, "phase274-remember-receipt");
  assert.equal(forgetSuppression.suppressionReceipt.cursorAfter, "phase274-forget-receipt");

  const restarted = await spawnInspector(committedScope);
  assert.equal(restarted.snapshot.updateCadence.lastExtractionMessageId, "phase274-forget-receipt");
  assert.equal(restarted.snapshot.updateCadence.directMemorySuppressionCount, 2);
  assert.equal(restarted.snapshot.updateCadence.directMemorySuppression.checksum, forgetSuppression.suppressionReceipt.checksum);
  assert.equal(restarted.history.integrityValid, true);
  assert.equal(restarted.history.rows.filter(event => event.status === "suppressed").length, 2);
  const fleetRow = restarted.fleet.groups.find(row => row.modelExtractionScopeId === committedScope.scopeId);
  assert.equal(fleetRow.directMemorySuppressionActive, true);
  assert.equal(fleetRow.directMemorySuppressionChecksumValid, true);
  assert.equal(fleetRow.directMemorySuppressionCount, 2);
  assert.equal(fleetRow.modelExtractionPending, false);
  assert.equal(restarted.fleet.overall.directMemorySuppressionCount, 2);
  assert.equal(restarted.fleet.overall.modelExtractionPendingCount, 0);

  const duplicate = appendDirect(committedScope, {
    action: "remember",
    messageId: "phase274-duplicate",
    content: "Temporary duplicate probe after the committed memory was forgotten and re-added.",
  });
  assert.equal(duplicate.commit.receipt.status, "committed");
  await model.runGroupSessionMemoryModelExtractionNow(committedScope.groupId, {
    groupSessionId: committedScope.sessionId,
    force: true,
    respectBackoff: false,
  });
  const duplicateAgain = appendDirect(committedScope, {
    action: "remember",
    messageId: "phase274-duplicate-again",
    content: "Temporary duplicate probe after the committed memory was forgotten and re-added.",
  });
  assert.equal(duplicateAgain.commit.receipt.status, "duplicate");
  const duplicateProbe = await runWithModelProbe(committedScope, "duplicate");
  assert.equal(duplicateProbe.calls, 1);
  assert.notEqual(duplicateProbe.result.status, "direct_memory_write_suppressed");

  const rejectedScope = createScope("rejected");
  const rejected = appendDirect(rejectedScope, {
    action: "remember",
    messageId: "phase274-rejected",
    content: "PHASE274_REJECTED_REQUEST",
    tamperChecksum: true,
  });
  assert.equal(rejected.commit.receipt.status, "rejected");
  const rejectedProbe = await runWithModelProbe(rejectedScope, "rejected");
  assert.equal(rejectedProbe.calls, 1);
  assert.notEqual(rejectedProbe.result.status, "direct_memory_write_suppressed");

  const uncommittedScope = createScope("uncommitted");
  appendDirect(uncommittedScope, {
    action: "remember",
    messageId: "phase274-uncommitted",
    content: "PHASE274_UNCOMMITTED_REQUEST",
    commit: false,
  });
  const uncommittedProbe = await runWithModelProbe(uncommittedScope, "uncommitted");
  assert.equal(uncommittedProbe.calls, 1);
  assert.notEqual(uncommittedProbe.result.status, "direct_memory_write_suppressed");

  const crossA = createScope("cross-a");
  const crossB = createScope("cross-b");
  const cross = appendDirect(crossB, {
    action: "remember",
    messageId: "phase274-cross-session",
    content: "PHASE274_CROSS_SESSION_REQUEST",
    claimedScopeId: crossA.scopeId,
  });
  assert.equal(cross.commit.receipt.status, "rejected");
  const crossProbe = await runWithModelProbe(crossB, "cross-session");
  assert.equal(crossProbe.calls, 1);
  assert.notEqual(crossProbe.result.status, "direct_memory_write_suppressed");

  const corruptScope = createScope("corrupt-receipt");
  appendDirect(corruptScope, {
    action: "remember",
    messageId: "phase274-corrupt-receipt",
    content: "PHASE274_CORRUPT_SUPPRESSION_RECEIPT",
  });
  const corruptSuppression = await model.runGroupSessionMemoryModelExtractionNow(corruptScope.groupId, {
    groupSessionId: corruptScope.sessionId,
    force: true,
    respectBackoff: false,
  });
  assert.equal(corruptSuppression.status, "direct_memory_write_suppressed");
  const corruptSnapshotFile = memory.readGroupSessionMemorySnapshotSummary(corruptScope.scopeId).snapshotFile;
  const corruptSnapshot = JSON.parse(fs.readFileSync(corruptSnapshotFile, "utf-8"));
  corruptSnapshot.updateCadence.directMemorySuppression.checksum = "0".repeat(64);
  fs.writeFileSync(corruptSnapshotFile, `${JSON.stringify(corruptSnapshot, null, 2)}\n`, "utf-8");
  const corruptInspection = await spawnInspector(corruptScope);
  const corruptFleetRow = corruptInspection.fleet.groups.find(row => row.modelExtractionScopeId === corruptScope.scopeId);
  assert.equal(corruptFleetRow.directMemorySuppressionPresent, true);
  assert.equal(corruptFleetRow.directMemorySuppressionChecksumValid, false);
  assert.equal(corruptFleetRow.status, "fail");

  const checks = {
    committedRememberSkipsModel: rememberSuppression.status === "direct_memory_write_suppressed" && rememberSuppression.modelInvoked === false,
    committedForgetSkipsModel: forgetSuppression.status === "direct_memory_write_suppressed" && forgetSuppression.modelInvoked === false,
    suppressionBindsLedgerProof: rememberSuppression.suppressionReceipt.ledgerMutationFence > 0
      && rememberSuppression.suppressionReceipt.directMemoryProofs[0].requestChecksum === remembered.action.requestChecksum,
    cursorAdvancesAcrossSuppressedRange: forgetSuppression.suppressionReceipt.cursorAfter === "phase274-forget-receipt",
    restartPreservesCursorAndReceipt: restarted.snapshot.updateCadence.directMemorySuppressionCount === 2,
    historyChainRecordsSuppression: restarted.history.integrityValid === true
      && restarted.history.rows.filter(event => event.status === "suppressed").length === 2,
    memoryCenterShowsVerifiedSuppression: fleetRow.directMemorySuppressionActive === true
      && fleetRow.directMemorySuppressionProofCount === 1
      && fleetRow.directMemorySuppressionLedgerFence > 0,
    suppressionIsNotModelPendingOrFailure: fleetRow.modelExtractionPending === false
      && fleetRow.extractionFailed === false
      && restarted.fleet.overall.modelExtractionPendingCount === 0,
    duplicateDoesNotSuppressModel: duplicateAgain.commit.receipt.status === "duplicate" && duplicateProbe.calls === 1,
    rejectedDoesNotSuppressModel: rejectedProbe.calls === 1,
    uncommittedDoesNotSuppressModel: uncommittedProbe.calls === 1,
    crossSessionDoesNotSuppressModel: crossProbe.calls === 1,
    corruptSuppressionReceiptFailsClosed: corruptFleetRow.status === "fail"
      && corruptInspection.fleet.overall.directMemorySuppressionInvalidCount === 1,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`${JSON.stringify({
    pass: true,
    schema: "ccm-phase274-group-session-memory-direct-write-suppression-selftest-v1",
    checks,
    remember: {
      requestId: remembered.action.requestId,
      cursorAfter: rememberSuppression.suppressionReceipt.cursorAfter,
      ledgerFence: rememberSuppression.suppressionReceipt.ledgerMutationFence,
    },
    forget: {
      requestId: forgotten.action.requestId,
      cursorAfter: forgetSuppression.suppressionReceipt.cursorAfter,
      suppressionCount: restarted.snapshot.updateCadence.directMemorySuppressionCount,
    },
  }, null, 2)}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
