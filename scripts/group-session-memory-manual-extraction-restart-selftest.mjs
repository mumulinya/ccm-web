import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(root, "ccm-package", "dist", "modules");
const memory = require(path.join(distRoot, "collaboration", "memory.js"));
const model = require(path.join(distRoot, "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(distRoot, "knowledge", "memory-control-center.js"));
const storage = require(path.join(distRoot, "collaboration", "storage.js"));

const groupId = `phase345-manual-extraction-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_manual_a`;
const sessionB = `gcs_${Date.now().toString(36)}_manual_b`;
const sessionEmpty = `gcs_${Date.now().toString(36)}_manual_empty`;
const scopeA = `${groupId}--${sessionA}`;
const marker = "PHASE345_EXACT_SESSION_A_CONSTRAINT";
const siblingMarker = "PHASE345_SIBLING_SESSION_B_MUST_NOT_CHANGE";
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- ${marker}_${index}: retained from the exact group session.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

function cleanupSession(sessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
  }
}

function callOperation(payload) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = "POST";
    const res = {
      status: 0,
      headers: {},
      body: "",
      writeHead(status, headers) { this.status = status; this.headers = headers; },
      end(body) {
        this.body = String(body || "");
        try { resolve({ status: this.status, headers: this.headers, body: JSON.parse(this.body || "{}") }); }
        catch (error) { reject(error); }
      },
    };
    const handled = center.handleMemoryCenterApi("/api/memory-center/operation", req, res, { query: {} });
    if (!handled) return reject(new Error("Memory Center operation route was not handled"));
    queueMicrotask(() => {
      req.emit("data", Buffer.from(JSON.stringify(payload)));
      req.emit("end");
    });
  });
}

function readReceipt() {
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  return JSON.parse(fs.readFileSync(path.join(path.dirname(snapshot.snapshotFile), "model-extraction-receipt.json"), "utf-8"));
}

function readReceiptInFreshProcess() {
  const code = `const m=require(${JSON.stringify(path.join(distRoot, "collaboration", "memory.js"))});const x=require(${JSON.stringify(path.join(distRoot, "collaboration", "group-session-memory-model-extraction.js"))});const s=m.readGroupSessionMemorySnapshotSummary(${JSON.stringify(scopeA)});const fs=require('fs');const path=require('path');const r=JSON.parse(fs.readFileSync(path.join(path.dirname(s.snapshotFile),'model-extraction-receipt.json'),'utf8'));process.stdout.write(JSON.stringify({valid:x.verifyGroupSessionMemoryModelExtractionReceipt(r),trigger:r.trigger,scopeId:r.scopeId,executionId:r.executionId}));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { cwd: root, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", exitCode => exitCode === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(`fresh process failed ${exitCode}: ${stderr}`)));
  });
}

try {
  storage.saveGroupMessages(groupId, [
    { id: "phase345-a-user", role: "user", content: `${marker}: keep this exact-session requirement.`, group_session_id: sessionA },
    { id: "phase345-a-assistant", role: "assistant", content: "The exact-session implementation is ready for extraction.", group_session_id: sessionA },
  ], sessionA);
  storage.saveGroupMessages(groupId, [
    { id: "phase345-b-user", role: "user", content: siblingMarker, group_session_id: sessionB },
  ], sessionB);
  for (const sessionId of [sessionA, sessionB, sessionEmpty]) {
    memory.saveGroupMemory(groupId, {
      ...memory.createEmptyGroupMemory(groupId, sessionId),
      persistentRequirements: sessionId === sessionB ? [siblingMarker] : [],
    }, sessionId);
  }

  let executorCalls = 0;
  model.configureGroupSessionMemoryModelExecutor(async request => {
    executorCalls += 1;
    return {
      output: validOutput,
      project: "phase345-manual-extractor",
      agentType: "codex",
      model: "phase345-stub-model",
      nativeSessionId: `phase345-${request.executionId}`,
    };
  });
  const siblingBefore = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionB}`);
  const exactApi = await callOperation({
    scope: "group",
    scope_id: `${groupId}::${sessionA}`,
    operation: "extract_session_memory_now",
    reason: "phase345 exact-session manual extraction",
    explicitExecution: true,
  });
  const firstReceipt = readReceipt();
  const siblingAfter = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionB}`);
  const noNewApi = await callOperation({
    scope: "group",
    scope_id: `${groupId}::${sessionA}`,
    operation: "extract_session_memory_now",
    reason: "phase345 no-new-message rejection",
    explicitExecution: true,
  });
  const noNewReceipt = noNewApi.body?.result?.value?.receipt || null;
  const emptyApi = await callOperation({
    scope: "group",
    scope_id: `${groupId}::${sessionEmpty}`,
    operation: "extract_session_memory_now",
    reason: "phase345 empty transcript rejection",
    explicitExecution: true,
  });
  const groupOnlyApi = await callOperation({
    scope: "group",
    scope_id: groupId,
    operation: "extract_session_memory_now",
    reason: "phase345 group-only rejection",
    explicitExecution: true,
  });
  const globalApi = await callOperation({
    scope: "global",
    scope_id: "global-agent",
    operation: "extract_session_memory_now",
    reason: "phase345 global rejection",
    explicitExecution: true,
  });

  const currentMessages = storage.getGroupMessages(groupId, sessionA);
  storage.saveGroupMessages(groupId, [...currentMessages, {
    id: "phase345-a-concurrent-update",
    role: "assistant",
    content: `${marker}: concurrent update must commit exactly once.`,
    group_session_id: sessionA,
  }], sessionA);
  let releaseExecutor;
  let markExecutorStarted;
  const executorStarted = new Promise(resolve => { markExecutorStarted = resolve; });
  const executorRelease = new Promise(resolve => { releaseExecutor = resolve; });
  model.configureGroupSessionMemoryModelExecutor(async request => {
    executorCalls += 1;
    markExecutorStarted();
    await executorRelease;
    return { output: validOutput, project: "phase345-concurrency", agentType: "codex", nativeSessionId: request.executionId };
  });
  const firstConcurrent = model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    manual: true,
    respectBackoff: false,
  });
  await executorStarted;
  const secondConcurrent = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    manual: true,
    respectBackoff: false,
  });
  releaseExecutor();
  const firstConcurrentResult = await firstConcurrent;
  const finalReceipt = readReceipt();
  const freshProcess = await readReceiptInFreshProcess();
  const globalContext = memory.buildGlobalGroupMemoryContext("route group agents only");
  const backendSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf-8");
  const frontendSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf-8");

  const checks = {
    exactSessionApiRunsRealExecutor: exactApi.status === 200 && exactApi.body?.result?.committed === true && executorCalls >= 2,
    manualReceiptIsSignedAndExact: firstReceipt.trigger === "manual" && firstReceipt.scopeId === scopeA && model.verifyGroupSessionMemoryModelExtractionReceipt(firstReceipt) === true,
    cadenceThresholdWasBypassed: exactApi.body?.result?.cadence?.shouldExtract === false || exactApi.body?.result?.cadence?.status === "initialized",
    siblingSessionWasNotMutated: siblingAfter.markdownChecksum === siblingBefore.markdownChecksum && siblingAfter.markdownExcerpt.includes(siblingMarker),
    noNewMessagesTriggerFullSessionRefresh: noNewApi.status === 200
      && noNewApi.body?.result?.committed === true
      && noNewApi.body?.result?.modelInvoked === true
      && noNewReceipt?.sourceRangeMode === "full_session_refresh"
      && noNewReceipt?.manualRefreshWithoutNewMessages === true
      && noNewReceipt?.incrementalSourceMessageCount === 0
      && noNewReceipt?.cursorBefore?.lastExtractionMessageId === noNewReceipt?.cursorAfter?.lastExtractionMessageId,
    emptyTranscriptFailsClosed: emptyApi.status === 400 && emptyApi.body?.error === "manual_extraction_empty_transcript",
    groupOnlyScopeRejected: groupOnlyApi.status === 400 && String(groupOnlyApi.body?.error || "").includes("group::gcs_*"),
    globalScopeRejected: globalApi.status === 400 && String(globalApi.body?.error || "").includes("Global Agent"),
    concurrentExtractionCommitsOnce: firstConcurrentResult.committed === true && secondConcurrent.committed === false && ["lease_busy", "lease_contended", "active_lease_present", "lease_unavailable"].includes(String(secondConcurrent.status || "")),
    finalCursorAdvancesToSafeMessage: finalReceipt.cursorAfter?.lastExtractionMessageId === "phase345-a-concurrent-update" && finalReceipt.cursorAdvanceSafe === true,
    restartVerifiesDurableReceipt: freshProcess.valid === true && freshProcess.trigger === "manual" && freshProcess.scopeId === scopeA && freshProcess.executionId === finalReceipt.executionId,
    memoryCenterExposesRunningState: frontendSource.includes("sessionMemoryManualExtractionRunning") && frontendSource.includes("extractSessionMemoryNow") && frontendSource.includes("立即抽取"),
    apiUsesExactExistingScope: backendSource.includes("extract_session_memory_now") && backendSource.includes("modelExtractionScopeId") && backendSource.includes("globalContextUsed: false"),
    globalAgentReceivesNoSessionBody: !JSON.stringify(globalContext).includes(marker) && !JSON.stringify(globalContext).includes(siblingMarker),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, exactApi, noNewApi, noNewReceipt, emptyApi, groupOnlyApi, globalApi, firstConcurrentResult, secondConcurrent, firstReceipt, finalReceipt, freshProcess }, null, 2));
  process.stdout.write(`PHASE345_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  for (const sessionId of [sessionA, sessionB, sessionEmpty]) cleanupSession(sessionId);
}
