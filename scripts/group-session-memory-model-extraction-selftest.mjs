import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const extraction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-extraction.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const groupId = `phase229-model-memory-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_model_a`;
const sessionB = `gcs_${Date.now().toString(36)}_model_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE229_MODEL_EVIDENCE_${index}: retained from the current group session.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;
const initialMessages = Array.from({ length: 36 }, (_, index) => ({
  id: `phase229-a-${index + 1}`,
  role: index % 2 === 0 ? "user" : "assistant",
  content: `PHASE229_SESSION_A_${index + 1} ${"会话 A 的原始实现事实和约束必须保留。".repeat(110)}`,
  group_session_id: sessionA,
}));
const sessionBMessages = [
  { id: "phase229-b-user", role: "user", content: "PHASE229_SESSION_B_SENTINEL", group_session_id: sessionB },
  { id: "phase229-b-assistant", role: "assistant", content: "会话 B 保持独立。", group_session_id: sessionB },
];

function cleanupTestSessions() {
  const results = [];
  for (const sessionId of [sessionA, sessionB]) {
    results.push(memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId));
    const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
    for (const target of [file, `${file}.bak`]) {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }
  try { fs.rmdirSync(path.dirname(memory.getGroupMemoryFile(groupId, sessionA))); } catch {}
  return results;
}

try {
  storage.saveGroupMessages(groupId, initialMessages, sessionA);
  storage.saveGroupMessages(groupId, sessionBMessages, sessionB);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionA),
    persistentRequirements: ["PHASE229_SESSION_A_MEMORY"],
  }, sessionA);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionB),
    persistentRequirements: ["PHASE229_SESSION_B_MEMORY"],
  }, sessionB);
  const beforeDue = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const beforeB = memory.readGroupSessionMemorySnapshotSummary(scopeB);
  const due = memory.evaluateGroupSessionMemoryUpdateCadence(initialMessages, beforeDue, { currentContextTokens: 10000 });
  memory.saveGroupMemory(groupId, memory.loadGroupMemory(groupId, sessionA), sessionA, {
    sessionMemoryCadenceDecision: due,
  });
  const queued = memory.readGroupSessionMemorySnapshotSummary(scopeA);

  const success = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    executor: async request => ({
      output: validOutput,
      project: "phase229-model-extractor",
      agentType: "codex",
      model: "stub-model",
      nativeSessionId: `stub-${request.executionId}`,
    }),
  });
  const first = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const receipt = JSON.parse(fs.readFileSync(path.join(path.dirname(first.snapshotFile), "model-extraction-receipt.json"), "utf-8"));
  const firstState = extraction.readGroupSessionMemoryExtractionState(scopeA);
  const afterSuccessB = memory.readGroupSessionMemorySnapshotSummary(scopeB);

  const addedMessages = [...initialMessages, {
    id: "phase229-a-update",
    role: "assistant",
    content: `PHASE229_FAILED_UPDATE_SENTINEL ${"新的会话事实需要模型提炼。".repeat(750)}`,
    group_session_id: sessionA,
  }];
  storage.saveGroupMessages(groupId, addedMessages, sessionA);
  const failed = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    executor: async () => "not a valid Session Memory template",
  });
  const afterFailure = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const failedState = extraction.readGroupSessionMemoryExtractionState(scopeA);
  const successReceiptAfterFailure = JSON.parse(fs.readFileSync(path.join(path.dirname(first.snapshotFile), "model-extraction-receipt.json"), "utf-8"));
  const failureReceipt = JSON.parse(fs.readFileSync(path.join(path.dirname(first.snapshotFile), "model-extraction-failure-receipt.json"), "utf-8"));
  const immediateRetry = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    executor: async () => ({ output: validOutput }),
  });
  const retryAfter = new Date((Date.parse(failedState.nextRetryAt) || Date.now()) + 1000).toISOString();
  const retry = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    at: retryAfter,
    executor: async () => ({ output: validOutput, project: "phase229-model-extractor", agentType: "codex" }),
  });
  const afterRetry = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const retryState = extraction.readGroupSessionMemoryExtractionState(scopeA);
  const timeoutFailure = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    modelTimeoutMs: 1000,
    executor: async () => new Promise(() => {}),
  });
  const afterTimeout = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const timeoutState = extraction.readGroupSessionMemoryExtractionState(scopeA);
  const legacyDefault = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: "default",
    force: true,
    executor: async () => ({ output: validOutput }),
  });
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const rowA = report.groups.find(row => row.groupSessionId === sessionA);
  const rowB = report.groups.find(row => row.groupSessionId === sessionB);
  const sectionEvidence = first.sectionEvidence || {};
  const checks = {
    cadenceQueuesModelWithoutAdvancingCursor: due.shouldExtract === true
      && queued.updateCadence?.status === "model_extraction_due"
      && Number(queued.updateCadence?.extractionCount || 0) === Number(beforeDue.updateCadence?.extractionCount || 0)
      && queued.markdownChecksum === beforeDue.markdownChecksum,
    validForkedModelCommitsSnapshot: success.committed === true
      && first.modelExtracted === true
      && first.extractionMethod === "forked_model_session_memory"
      && first.strategy === "cc-session-memory-forked-model-v1"
      && first.markdownChecksum === receipt.markdownChecksum,
    exactClaudeCodeTemplateAndBudget: model.validateGroupSessionMemoryModelOutput(validOutput).markdown === validMarkdown
      && first.memoryBudget?.totalTokens <= 12000
      && first.memoryBudget?.oversizedSectionCount === 0,
    signedReceiptBindsModelSourceLeaseAndCursor: model.verifyGroupSessionMemoryModelExtractionReceipt(receipt) === true
      && receipt.requestAudit?.promptChecksum
      && receipt.requestAudit?.sourceTranscriptChecksum
      && receipt.leaseId
      && receipt.fencingToken > 0
      && receipt.cursorAfter?.lastExtractionMessageId === initialMessages.at(-1).id
      && firstState.status === "completed",
    sectionEvidenceIsStableAndReceiptBound: sectionEvidence.schema === "ccm-group-session-memory-section-evidence-v1"
      && sectionEvidence.sections?.length === 10
      && sectionEvidence.sections.every(item => item.evidenceId && item.sectionChecksum && item.sourceTranscriptChecksum === receipt.requestAudit.sourceTranscriptChecksum)
      && receipt.sectionEvidenceChecksum === sectionEvidence.checksum,
    invalidOutputPreservesSuccessfulSnapshotAndCursor: failed.committed === false
      && failed.status === "failed"
      && afterFailure.markdownChecksum === first.markdownChecksum
      && afterFailure.updateCadence?.lastExtractionMessageId === first.updateCadence?.lastExtractionMessageId
      && failedState.status === "failed"
      && failedState.lastFailureClass === "invalid_model_output"
      && successReceiptAfterFailure.checksum === receipt.checksum
      && successReceiptAfterFailure.status === "committed"
      && failureReceipt.status === "failed"
      && model.verifyGroupSessionMemoryModelExtractionReceipt(failureReceipt) === true,
    failureStartsDurableBackoff: failedState.consecutiveFailures === 1
      && failedState.retryBackoffMs >= 30000
      && immediateRetry.status === "retry_backoff",
    retryAfterBackoffCommitsAndResetsFailure: retry.committed === true
      && afterRetry.modelExtracted === true
      && retryState.status === "completed"
      && retryState.consecutiveFailures === 0
      && !retryState.nextRetryAt,
    timedOutModelCannotCommitOrReplaceLastSuccess: timeoutFailure.status === "failed"
      && timeoutFailure.failureClass === "timeout"
      && timeoutState.lastFailureClass === "timeout"
      && afterTimeout.markdownChecksum === afterRetry.markdownChecksum
      && afterTimeout.updateCadence?.lastExtractionMessageId === afterRetry.updateCadence?.lastExtractionMessageId,
    sessionIsolationPreservesB: afterSuccessB.markdownChecksum === beforeB.markdownChecksum
      && afterSuccessB.markdownExcerpt.includes("PHASE229_SESSION_B_MEMORY")
      && rowB?.groupSessionId === sessionB,
    fleetAuditsModelReceipt: rowA?.modelExtracted === true
      && rowA?.modelReceiptChecksumValid === true
      && report.overall?.modelExtractedSessionCount === 1
      && report.overall?.modelReceiptVerifiedCount === 1,
    legacyDefaultRejected: legacyDefault.status === "legacy_default_session_rejected"
      && report.overall?.legacyDefaultSessionCount === 0
      && !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, due, queued, success, first, receipt, failed, failedState, immediateRetry, retry, retryState, report }, null, 2));
  const cleanup = cleanupTestSessions();
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, sessionA)), false, "session A test memory must be deleted");
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, sessionB)), false, "session B test memory must be deleted");
  process.stdout.write(`${JSON.stringify({ pass: true, checks, fleet: report.overall, cleanup: cleanup.map(item => item.deletedFiles) }, null, 2)}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { cleanupTestSessions(); } catch {}
}
