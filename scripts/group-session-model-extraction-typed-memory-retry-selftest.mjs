import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase279-typed-retry-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_retry_a`;
const sessionB = `gcs_${Date.now().toString(36)}_retry_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const firstRule = "必须长期保留 PHASE279_ARTIFACT_ONLY_RULE";
const restartRule = "必须长期保留 PHASE279_RESTART_RECOVERY_RULE";
let modelCalls = 0;

function markdown(rules) {
  const populated = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
    .split("\n")
    .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE279_BASE_${index}` : line)
    .join("\n");
  const marker = "_What did the user ask to build? Any design decisions or other explanatory context_";
  return populated.replace(marker, `${marker}\n${rules.map(rule => `- ${rule}`).join("\n")}`).trim();
}

const execute = rules => async () => {
  modelCalls += 1;
  return { output: `<session_memory>\n${markdown(rules)}\n</session_memory>`, project: "phase279-stub", agentType: "codex" };
};

function cleanup(sessionId) {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  const file = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
  }
}

try {
  const messages = [{ id: "phase279-user-a", role: "user", content: `${firstRule}。`, group_session_id: sessionA }];
  storage.saveGroupMessages(groupId, messages, sessionA);
  storage.saveGroupMessages(groupId, [{ id: "phase279-b", role: "user", content: "PHASE279_SESSION_B_ONLY", group_session_id: sessionB }], sessionB);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB);

  const failed = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    disableTypedMemoryRetrySchedule: true,
    __modelExtractionTypedMemoryFailAfterSnapshot: true,
    executor: execute([firstRule]),
  });
  const failedExecutionId = failed.executionId;
  const pendingAfterFailure = model.readGroupSessionMemoryTypedMemoryRetryState(scopeA);
  const snapshotAfterFailure = memory.readGroupSessionMemorySnapshotSummary(scopeA);

  const laterMessage = { id: "phase279-later-assistant", role: "assistant", content: "A later extraction overwrites the current receipt.", group_session_id: sessionA };
  storage.saveGroupMessages(groupId, [...messages, laterMessage], sessionA);
  const later = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    executor: execute([firstRule]),
  });
  const currentReceiptExecutionId = later.value?.receipt?.executionId;
  const snapshotBeforeRetry = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const callsBeforeRetry = modelCalls;
  const recovered = model.retryGroupSessionModelExtractionTypedMemory(scopeA, failedExecutionId, { schedule: false });
  const snapshotAfterRetry = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const stateAfterRetry = model.readGroupSessionMemoryTypedMemoryRetryState(scopeA);
  const duplicateRetry = model.retryGroupSessionModelExtractionTypedMemory(scopeA, failedExecutionId, { schedule: false });
  const recallAfterRetry = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE279_ARTIFACT_ONLY_RULE", { max: 8 });
  const otherRecall = typed.buildGroupTypedMemoryRecall(scopeB, "PHASE279_ARTIFACT_ONLY_RULE", { max: 8 });

  const restartMessage = { id: "phase279-user-restart", role: "user", content: `${restartRule}。`, group_session_id: sessionA };
  storage.saveGroupMessages(groupId, [...messages, laterMessage, restartMessage], sessionA);
  const restartFailure = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionA,
    force: true,
    respectBackoff: false,
    disableTypedMemoryRetrySchedule: true,
    __modelExtractionTypedMemoryFailAfterSnapshot: true,
    executor: execute([firstRule, restartRule]),
  });
  const callsBeforeRecoveryScan = modelCalls;
  const startupRecovery = model.recoverPendingGroupSessionMemoryTypedMemoryRetries({ runNow: true, schedule: false });
  const stateAfterStartupRecovery = model.readGroupSessionMemoryTypedMemoryRetryState(scopeA);
  const recallAfterStartupRecovery = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE279_RESTART_RECOVERY_RULE", { max: 8 });
  const history = model.readGroupSessionMemoryModelExtractionHistory(scopeA, { maxRows: 200 });
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId], groupSessionId: sessionA });
  const row = report.groups?.[0] || {};

  const retryFile = model.getGroupSessionMemoryTypedMemoryRetryFile(scopeA);
  const originalRetryText = fs.readFileSync(retryFile, "utf-8");
  const tampered = JSON.parse(originalRetryText);
  tampered.entries[0].attempts += 99;
  fs.writeFileSync(retryFile, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");
  const tamperedState = model.readGroupSessionMemoryTypedMemoryRetryState(scopeA);
  fs.writeFileSync(retryFile, originalRetryText, "utf-8");

  const checks = {
    failedCommitPersistsRetryLedger: failed.committed === true
      && failed.typedMemoryCommit?.status === "failed_retriable"
      && pendingAfterFailure.valid === true
      && pendingAfterFailure.pendingCount === 1
      && pendingAfterFailure.entries[0]?.executionId === failedExecutionId,
    laterExtractionReplacesCurrentReceipt: later.committed === true
      && currentReceiptExecutionId
      && currentReceiptExecutionId !== failedExecutionId,
    artifactOnlyRetryCommitsOldExecution: recovered.committed === true
      && recovered.status === "recovered"
      && recovered.modelInvoked === false
      && recovered.executionId === failedExecutionId,
    retryNeverRerunsModelOrMutatesSnapshot: modelCalls === callsBeforeRecoveryScan
      && callsBeforeRetry === 2
      && snapshotAfterRetry.markdownChecksum === snapshotBeforeRetry.markdownChecksum
      && snapshotAfterFailure.markdownChecksum !== "",
    recoveredRuleBecomesRecallableAndIsolated: JSON.stringify(recallAfterRetry.recalled || []).includes("PHASE279_ARTIFACT_ONLY_RULE")
      && !JSON.stringify(otherRecall).includes("PHASE279_ARTIFACT_ONLY_RULE"),
    completedRetryIsIdempotent: stateAfterRetry.completedCount === 1
      && duplicateRetry.status === "already_completed",
    startupScanRecoversPendingWithoutModel: restartFailure.typedMemoryCommit?.status === "failed_retriable"
      && startupRecovery.pendingCount >= 1
      && startupRecovery.recoveredCount >= 1
      && modelCalls === callsBeforeRecoveryScan
      && stateAfterStartupRecovery.pendingCount === 0
      && stateAfterStartupRecovery.completedCount === 2
      && JSON.stringify(recallAfterStartupRecovery.recalled || []).includes("PHASE279_RESTART_RECOVERY_RULE"),
    recoveryHistoryIsAuditable: history.integrityValid === true
      && history.rows.filter(event => event.status === "typed_memory_commit_recovered").length >= 2,
    memoryCenterShowsRetryRecovery: row.modelExtractionTypedMemoryRetryValid === true
      && row.modelExtractionTypedMemoryRetryPendingCount === 0
      && row.modelExtractionTypedMemoryRetryCompletedCount === 2
      && row.modelExtractionTypedMemoryRetryExhaustedCount === 0,
    retryLedgerTamperingFailsClosed: tamperedState.valid === false,
    noLegacyDefaultCreated: !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, failed, pendingAfterFailure, later, recovered, stateAfterRetry, restartFailure, startupRecovery, stateAfterStartupRecovery, row }, null, 2));
  console.log(JSON.stringify({ pass: true, checks }, null, 2));
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  cleanup(sessionA);
  cleanup(sessionB);
}
