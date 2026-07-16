import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase347-manual-full-refresh-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;
const dist = path.join(root, "ccm-package", "dist", "modules");
const storage = require(path.join(dist, "collaboration", "storage.js"));
const memory = require(path.join(dist, "collaboration", "memory.js"));
const model = require(path.join(dist, "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(dist, "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase347-full-refresh-${nonce}`;
const sessionA = storage.createGroupChatSession(groupId, "Phase 347 A");
const sessionB = storage.createGroupChatSession(groupId, "Phase 347 B");
const scopeA = `${groupId}--${sessionA.id}`;
const marker = "PHASE347_COMPLETE_SESSION_REFRESH";
const siblingMarker = "PHASE347_SIBLING_SESSION_UNCHANGED";
const initialMessages = [
  { id: "phase347-user-1", role: "user", content: `${marker}: requirement`, group_session_id: sessionA.id },
  { id: "phase347-assistant-1", role: "assistant", content: `${marker}: implementation`, group_session_id: sessionA.id },
  { id: "phase347-user-2", role: "user", content: `${marker}: correction`, group_session_id: sessionA.id },
];
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- ${marker}_${index}: complete-session evidence retained.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

function receiptChecksum(receipt) {
  const payload = { ...receipt };
  delete payload.checksum;
  delete payload.receiptFile;
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function freshInspect(expectedExecutionId) {
  const code = `const fs=require('fs');const path=require('path');const m=require(${JSON.stringify(path.join(dist, "collaboration", "memory.js"))});const x=require(${JSON.stringify(path.join(dist, "collaboration", "group-session-memory-model-extraction.js"))});const s=m.readGroupSessionMemorySnapshotSummary(${JSON.stringify(scopeA)});const r=JSON.parse(fs.readFileSync(path.join(path.dirname(s.snapshotFile),'model-extraction-receipt.json'),'utf8'));process.stdout.write(JSON.stringify({valid:x.verifyGroupSessionMemoryModelExtractionReceipt(r),executionMatches:r.executionId===${JSON.stringify(expectedExecutionId)},range:r.sourceRangeMode,noNew:r.manualRefreshWithoutNewMessages,cursorBefore:r.cursorBefore,cursorAfter:r.cursorAfter}));`;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], { cwd: root, windowsHide: true, env: { ...process.env, USERPROFILE: tempRoot, HOME: tempRoot } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk);
    child.stderr.on("data", chunk => stderr += chunk);
    child.on("error", reject);
    child.on("exit", codeValue => codeValue === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(`fresh inspect ${codeValue}: ${stderr}`)));
  });
}

try {
  storage.saveGroupMessages(groupId, initialMessages, sessionA.id);
  storage.saveGroupMessages(groupId, [{ id: "phase347-b", role: "user", content: siblingMarker, group_session_id: sessionB.id }], sessionB.id);
  memory.saveGroupMemory(groupId, memory.loadGroupMemory(groupId, sessionA.id), sessionA.id);
  memory.saveGroupMemory(groupId, { ...memory.loadGroupMemory(groupId, sessionB.id), persistentRequirements: [siblingMarker] }, sessionB.id);
  const rawTranscriptFile = storage.getGroupChatSessionMessagesFile(groupId, sessionA.id);
  const rawBefore = fs.readFileSync(rawTranscriptFile);
  const requests = [];
  const executor = async request => {
    requests.push(request);
    return { output: validOutput, project: "phase347", agentType: "codex", nativeSessionId: request.executionId };
  };

  const first = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA.id,
    force: true,
    manual: true,
    respectBackoff: false,
    executor,
  });
  const firstReceipt = first.value?.receipt;
  const second = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA.id,
    force: true,
    manual: true,
    respectBackoff: false,
    executor,
  });
  const secondReceipt = second.value?.receipt;
  const fleetAfterRefresh = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA.id });
  const fleetRow = fleetAfterRefresh.groups.find(row => row.modelExtractionScopeId === scopeA);
  const fresh = await freshInspect(second.executionId);
  const siblingBeforeAutomatic = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionB.id}`);

  const addedMessage = { id: "phase347-assistant-new", role: "assistant", content: `${marker}: one incremental update`, group_session_id: sessionA.id };
  storage.saveGroupMessages(groupId, [...initialMessages, addedMessage], sessionA.id);
  const automatic = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA.id,
    force: true,
    respectBackoff: false,
    executor,
  });
  const automaticReceipt = automatic.value?.receipt;
  const siblingAfterAutomatic = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${sessionB.id}`);
  const rawAfter = fs.readFileSync(rawTranscriptFile);
  const tampered = { ...secondReceipt, sourceRangeMode: "incremental_after_safe_cursor" };
  tampered.checksum = receiptChecksum(tampered);
  const legacyV2 = { ...secondReceipt, version: 2 };
  delete legacyV2.sourceRangeMode;
  delete legacyV2.incrementalSourceMessageCount;
  delete legacyV2.manualRefreshWithoutNewMessages;
  legacyV2.checksum = receiptChecksum(legacyV2);
  const frontendSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf-8");
  const globalContext = memory.buildGlobalGroupMemoryContext("global route only");

  const checks = {
    firstManualUsesFullSession: first.committed === true && first.modelInvoked === true && requests[0]?.requestAudit?.sourceRangeMode === "full_session_refresh" && requests[0]?.requestAudit?.sourceMessageCount === initialMessages.length && firstReceipt?.incrementalSourceMessageCount === initialMessages.length,
    secondManualRefreshesWithoutNewMessages: second.committed === true && second.modelInvoked === true && requests[1]?.requestAudit?.sourceMessageCount === initialMessages.length && secondReceipt?.manualRefreshWithoutNewMessages === true && secondReceipt?.incrementalSourceMessageCount === 0,
    repeatedRefreshKeepsSafeCursor: secondReceipt?.cursorBefore?.lastExtractionMessageId === initialMessages.at(-1).id && secondReceipt?.cursorAfter?.lastExtractionMessageId === initialMessages.at(-1).id && secondReceipt?.cursorAdvanceSafe === true,
    repeatedRefreshCreatesNewReceipt: first.executionId !== second.executionId && firstReceipt?.checksum !== secondReceipt?.checksum && secondReceipt?.cursorAfter?.extractionCount === 2,
    v3ManualReceiptVerifies: secondReceipt?.version === 3 && secondReceipt?.sourceRangeMode === "full_session_refresh" && model.verifyGroupSessionMemoryModelExtractionReceipt(secondReceipt) === true,
    semanticRangeTamperFailsWithRecomputedChecksum: model.verifyGroupSessionMemoryModelExtractionReceipt(tampered) === false,
    legacyV2RemainsCompatible: model.verifyGroupSessionMemoryModelExtractionReceipt(legacyV2) === true,
    restartPreservesNoNewRefreshProof: fresh.valid === true && fresh.executionMatches === true && fresh.range === "full_session_refresh" && fresh.noNew === true && fresh.cursorBefore?.lastExtractionMessageId === fresh.cursorAfter?.lastExtractionMessageId,
    memoryCenterSurfacesNoNewRefresh: fleetRow?.modelReceiptVersion === 3 && fleetRow?.modelReceiptSourceRangeMode === "full_session_refresh" && fleetRow?.modelManualRefreshWithoutNewMessages === true && fleetAfterRefresh.overall?.modelManualNoNewMessageRefreshCount === 1,
    automaticRemainsIncremental: automatic.committed === true && requests[2]?.requestAudit?.sourceRangeMode === "incremental_after_safe_cursor" && requests[2]?.requestAudit?.sourceMessageCount === 1 && requests[2]?.requestAudit?.sourceMessageIds?.[0] === addedMessage.id && automaticReceipt?.manualRefreshWithoutNewMessages === false,
    rawTranscriptOnlyChangesForExplicitAppend: rawAfter.length > rawBefore.length && JSON.parse(rawAfter).length === initialMessages.length + 1,
    siblingSessionUnchanged: siblingAfterAutomatic.markdownChecksum === siblingBeforeAutomatic.markdownChecksum && siblingAfterAutomatic.markdownExcerpt.includes(siblingMarker),
    uiExplainsCompleteCurrentSession: frontendSource.includes("完整当前记录重新提炼") && frontendSource.includes("完整记录重新提炼 Session Memory") && frontendSource.includes("manual refresh"),
    globalAgentReceivesNoGroupSessionBody: !JSON.stringify(globalContext).includes(marker) && !JSON.stringify(globalContext).includes(siblingMarker),
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first: { status: first.status, receipt: firstReceipt }, second: { status: second.status, receipt: secondReceipt }, automatic: { status: automatic.status, receipt: automaticReceipt }, fleetRow, fresh }, null, 2));
  process.stdout.write(`PHASE347_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
