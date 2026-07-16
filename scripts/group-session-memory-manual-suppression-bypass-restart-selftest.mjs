import assert from "node:assert/strict";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase346-manual-suppression-bypass-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const dist = path.join(root, "ccm-package", "dist", "modules");
const storage = require(path.join(dist, "collaboration", "storage.js"));
const typed = require(path.join(dist, "collaboration", "group-memory-index.js"));
const memory = require(path.join(dist, "collaboration", "memory.js"));
const model = require(path.join(dist, "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(dist, "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase346-manual-bypass-${nonce}`;
const session = storage.createGroupChatSession(groupId, "Phase 346 manual bypass");
const sibling = storage.createGroupChatSession(groupId, "Phase 346 sibling");
const scopeId = `${groupId}--${session.id}`;
const markerA = "PHASE346_AUTOMATIC_SUPPRESSION_PROOF";
const markerB = "PHASE346_MANUAL_MODEL_MUST_RUN";
const siblingMarker = "PHASE346_SIBLING_MUST_REMAIN_UNCHANGED";
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- ${markerA}_${index}; ${markerB}_${index}.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

function appendCommittedDirectMemory(messageId, content) {
  const action = typed.buildGroupDirectMemoryAction(scopeId, {
    action: "remember",
    messageId,
    content,
    memoryType: "user",
  });
  storage.appendGroupMessage(groupId, {
    id: messageId,
    role: "user",
    content,
    group_session_id: session.id,
    memory_direct_action: action,
  });
  const commit = typed.commitGroupDirectMemoryAction(scopeId, storage.getGroupMessages(groupId, session.id), {
    requestId: action.requestId,
    reason: "phase346-direct-memory-proof",
  });
  storage.appendGroupMessage(groupId, {
    id: `${messageId}-receipt`,
    role: "assistant",
    content: `memory ${commit.receipt?.status || "unknown"}`,
    group_session_id: session.id,
    memory_receipt: commit.receipt,
  });
  return { action, commit };
}

function callManualApi() {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = "POST";
    const res = {
      status: 0,
      writeHead(status) { this.status = status; },
      end(body) {
        try { resolve({ status: this.status, body: JSON.parse(String(body || "{}")) }); }
        catch (error) { reject(error); }
      },
    };
    center.handleMemoryCenterApi("/api/memory-center/operation", req, res, { query: {} });
    queueMicrotask(() => {
      req.emit("data", Buffer.from(JSON.stringify({
        scope: "group",
        scope_id: `${groupId}::${session.id}`,
        operation: "extract_session_memory_now",
        reason: "phase346 manual suppression bypass",
        explicitExecution: true,
      })));
      req.emit("end");
    });
  });
}

function receiptChecksum(receipt) {
  const payload = { ...receipt };
  delete payload.checksum;
  delete payload.receiptFile;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function inspectFreshProcess() {
  const code = `const fs=require('fs');const path=require('path');const m=require(${JSON.stringify(path.join(dist, "collaboration", "memory.js"))});const x=require(${JSON.stringify(path.join(dist, "collaboration", "group-session-memory-model-extraction.js"))});const s=m.readGroupSessionMemorySnapshotSummary(${JSON.stringify(scopeId)});const r=JSON.parse(fs.readFileSync(path.join(path.dirname(s.snapshotFile),'model-extraction-receipt.json'),'utf8'));const h=x.readGroupSessionMemoryModelExtractionHistory(${JSON.stringify(scopeId)});process.stdout.write(JSON.stringify({valid:x.verifyGroupSessionMemoryModelExtractionReceipt(r),receipt:r,historyValid:h.integrityValid,latest:h.latest}));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], {
      cwd: root,
      windowsHide: true,
      env: { ...process.env, USERPROFILE: tempRoot, HOME: tempRoot },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", codeValue => codeValue === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(`fresh process ${codeValue}: ${stderr}`)));
  });
}

try {
  memory.saveGroupMemory(groupId, memory.loadGroupMemory(groupId, session.id), session.id);
  memory.saveGroupMemory(groupId, {
    ...memory.loadGroupMemory(groupId, sibling.id),
    persistentRequirements: [siblingMarker],
  }, sibling.id);
  const firstDirect = appendCommittedDirectMemory("phase346-direct-a", markerA);
  assert.equal(firstDirect.commit.receipt.status, "committed");
  let executorCalls = 0;
  const automatic = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: session.id,
    force: true,
    respectBackoff: false,
    executor: async () => {
      executorCalls += 1;
      return { output: validOutput };
    },
  });
  const siblingBefore = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sibling.id}`);
  const secondDirect = appendCommittedDirectMemory("phase346-direct-b", markerB);
  assert.equal(secondDirect.commit.receipt.status, "committed");
  model.configureGroupSessionMemoryModelExecutor(async request => {
    executorCalls += 1;
    return {
      output: validOutput,
      project: "phase346-manual-extractor",
      agentType: "codex",
      model: "phase346-stub",
      nativeSessionId: `phase346-${request.executionId}`,
    };
  });
  const manualApi = await callManualApi();
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const receipt = JSON.parse(fs.readFileSync(path.join(path.dirname(snapshot.snapshotFile), "model-extraction-receipt.json"), "utf-8"));
  const history = model.readGroupSessionMemoryModelExtractionHistory(scopeId);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: session.id });
  const fleetRow = fleet.groups.find(row => row.modelExtractionScopeId === scopeId);
  const siblingAfter = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sibling.id}`);
  const fresh = await inspectFreshProcess();
  const tampered = { ...receipt, modelInvoked: false };
  tampered.checksum = receiptChecksum(tampered);
  const legacy = { ...receipt, version: 1 };
  delete legacy.modelInvoked;
  delete legacy.directMemorySuppressionEligible;
  delete legacy.directMemorySuppressionBypassedForManualExtraction;
  delete legacy.directMemoryProofCount;
  delete legacy.directMemoryChecksum;
  delete legacy.directMemoryLedgerMutationFence;
  legacy.checksum = receiptChecksum(legacy);
  const globalContext = memory.buildGlobalGroupMemoryContext("route only");
  const backendSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf-8");
  const frontendSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf-8");

  const checks = {
    automaticDirectWriteStillSuppresses: automatic.committed === true && automatic.status === "direct_memory_write_suppressed" && automatic.modelInvoked === false && executorCalls === 1,
    manualApiActuallyRunsModel: manualApi.status === 200 && manualApi.body?.result?.committed === true && manualApi.body?.result?.modelInvoked === true,
    v3ReceiptProvesManualFullSessionBypass: receipt.version === 3 && receipt.trigger === "manual" && receipt.modelInvoked === true && receipt.sourceRangeMode === "full_session_refresh" && receipt.directMemorySuppressionEligible === true && receipt.directMemorySuppressionBypassedForManualExtraction === true,
    bypassBindsDirectProofWithoutBody: receipt.directMemoryProofCount > 0 && /^[a-f0-9]{64}$/i.test(receipt.directMemoryChecksum) && receipt.directMemoryLedgerMutationFence > 0 && !receipt.directMemoryProofs && !JSON.stringify(receipt).includes(secondDirect.action.requestId),
    signedReceiptVerifies: model.verifyGroupSessionMemoryModelExtractionReceipt(receipt) === true,
    semanticTamperFailsEvenWithRecomputedChecksum: model.verifyGroupSessionMemoryModelExtractionReceipt(tampered) === false,
    legacyV1ReceiptRemainsCompatible: model.verifyGroupSessionMemoryModelExtractionReceipt(legacy) === true,
    historyRecordsEligibleManualAttempt: history.integrityValid === true && history.rows.some(event => event.status === "attempt_started" && event.trigger === "manual" && event.requestAudit?.directMemorySuppressionBypassedForManualExtraction === true),
    cursorAdvancesAfterActualModelCommit: receipt.cursorAfter?.lastExtractionMessageId === "phase346-direct-b-receipt" && receipt.cursorAdvanceSafe === true,
    restartPreservesBypassProof: fresh.valid === true && fresh.receipt.checksum === receipt.checksum && fresh.receipt.directMemorySuppressionBypassedForManualExtraction === true && fresh.historyValid === true,
    memoryCenterSurfacesManualBypass: fleetRow?.modelReceiptVersion === 3 && fleetRow?.modelReceiptTrigger === "manual" && fleetRow?.modelReceiptSourceRangeMode === "full_session_refresh" && fleetRow?.modelReceiptModelInvoked === true && fleetRow?.modelManualSuppressionBypassed === true && fleet.overall?.modelManualSuppressionBypassCount === 1,
    siblingSessionUnchanged: siblingAfter.markdownChecksum === siblingBefore.markdownChecksum && siblingAfter.markdownExcerpt.includes(siblingMarker),
    apiRejectsModelLessSuccessContract: backendSource.includes("result.committed !== true || result.modelInvoked !== true") && backendSource.includes("manual_extraction_model_not_invoked"),
    uiPromisesExplicitModelInvocation: frontendSource.includes("绕过自动周期与自动抑制，调用模型") && frontendSource.includes("已拒绝假成功"),
    globalAgentReceivesNoGroupMemory: !JSON.stringify(globalContext).includes(markerA) && !JSON.stringify(globalContext).includes(markerB) && !JSON.stringify(globalContext).includes(siblingMarker),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, automatic, manualApi: { status: manualApi.status, result: manualApi.body?.result && { committed: manualApi.body.result.committed, status: manualApi.body.result.status, modelInvoked: manualApi.body.result.modelInvoked } }, receipt, history, fleetRow, fresh }, null, 2));
  process.stdout.write(`PHASE346_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
