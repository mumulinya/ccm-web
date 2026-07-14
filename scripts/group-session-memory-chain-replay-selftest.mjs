import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const groupId = `phase231-chain-replay-${process.pid}-${Date.now().toString(36)}`;
const sessionId = `gcs_${Date.now().toString(36)}_chain_replay`;
const overBudgetSessionId = `gcs_${Date.now().toString(36)}_over_budget`;
const scopeId = `${groupId}--${sessionId}`;
const overBudgetScopeId = `${groupId}--${overBudgetSessionId}`;
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE231_REPLAY_FACT_${index}: verified evidence.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;
const messages = Array.from({ length: 48 }, (_, index) => ({
  id: `phase231-message-${index + 1}`,
  role: index % 2 === 0 ? "user" : "assistant",
  content: `PHASE231_SOURCE_${index + 1} ${"会话提炼输入必须有界且保留最新证据。".repeat(650)}`,
  group_session_id: sessionId,
}));

function cleanup() {
  const deleted = [];
  for (const targetSessionId of [sessionId, overBudgetSessionId]) {
    deleted.push(memory.deleteGroupSessionMemoryArtifacts(groupId, targetSessionId));
    const messageFile = storage.getGroupChatSessionMessagesFile(groupId, targetSessionId);
    for (const file of [messageFile, `${messageFile}.bak`]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
  try { fs.rmdirSync(path.dirname(memory.getGroupMemoryFile(groupId, sessionId))); } catch {}
  return deleted;
}

function writeHistory(file, rows) {
  fs.writeFileSync(file, `${rows.map(row => JSON.stringify(row)).join("\n")}\n`, "utf-8");
}

try {
  storage.saveGroupMessages(groupId, messages, sessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionId), sessionId);

  const fitted = model.buildGroupSessionMemoryModelExtractionPrompt({
    currentNotes: model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE,
    messages,
    maxInputTokens: 12000,
  });
  assert.equal(fitted.audit.inputBudgetExceeded, false);
  assert.equal(fitted.audit.inputBudgetStatus, "degraded_bounded");

  const committed = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    force: true,
    maxInputTokens: 12000,
    executor: async request => ({
      output: validOutput,
      project: "phase231-replay-stub",
      agentType: "codex",
      nativeSessionId: `phase231-${request.executionId}`,
    }),
  });
  assert.equal(committed.committed, true);

  const failedMessages = [...messages, {
    id: "phase231-failed-update",
    role: "assistant",
    content: "PHASE231_FAILED_OUTPUT_SOURCE",
    group_session_id: sessionId,
  }];
  storage.saveGroupMessages(groupId, failedMessages, sessionId);
  const failed = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    force: true,
    respectBackoff: false,
    executor: async () => "invalid session memory output",
  });
  assert.equal(failed.status, "failed");

  let overBudgetExecutorCalled = false;
  storage.saveGroupMessages(groupId, [{
    id: "phase231-over-budget-message",
    role: "user",
    content: "PHASE231_OVER_BUDGET",
    group_session_id: overBudgetSessionId,
  }], overBudgetSessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, overBudgetSessionId), overBudgetSessionId);
  const overBudget = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: overBudgetSessionId,
    force: true,
    maxInputTokens: 10,
    executor: async () => {
      overBudgetExecutorCalled = true;
      return { output: validOutput };
    },
  });

  const committedReplay = model.replayGroupSessionMemoryModelExtraction(scopeId, committed.executionId);
  const failedReplay = model.replayGroupSessionMemoryModelExtraction(scopeId, failed.executionId);
  const committedRequest = model.readGroupSessionMemoryModelExtractionArtifact(scopeId, committed.executionId, "request");
  const committedResult = model.readGroupSessionMemoryModelExtractionArtifact(scopeId, committed.executionId, "result");
  const failedRequest = model.readGroupSessionMemoryModelExtractionArtifact(scopeId, failed.executionId, "request");
  const failedResult = model.readGroupSessionMemoryModelExtractionArtifact(scopeId, failed.executionId, "result");
  const historyFile = model.getGroupSessionMemoryModelExtractionHistoryFile(scopeId);
  const originalHistory = fs.readFileSync(historyFile, "utf-8");
  const historyRows = originalHistory.trim().split(/\r?\n/).map(line => JSON.parse(line));

  writeHistory(historyFile, historyRows.slice(1));
  const deletedLineHistory = model.readGroupSessionMemoryModelExtractionHistory(scopeId, { maxRows: 100 });
  writeHistory(historyFile, [historyRows[1], historyRows[0], ...historyRows.slice(2)]);
  const reorderedHistory = model.readGroupSessionMemoryModelExtractionHistory(scopeId, { maxRows: 100 });
  writeHistory(historyFile, historyRows.slice(0, -1));
  const truncatedHistory = model.readGroupSessionMemoryModelExtractionHistory(scopeId, { maxRows: 100 });
  fs.writeFileSync(historyFile, originalHistory, "utf-8");

  const resultFile = committedResult.file;
  const originalResult = fs.readFileSync(resultFile);
  const corruptedResult = Buffer.from(originalResult);
  corruptedResult[Math.max(0, corruptedResult.length - 8)] ^= 0xff;
  fs.writeFileSync(resultFile, corruptedResult);
  const corruptArtifactReplay = model.replayGroupSessionMemoryModelExtraction(scopeId, committed.executionId);
  fs.writeFileSync(resultFile, originalResult);

  const restoredHistory = model.readGroupSessionMemoryModelExtractionHistory(scopeId, { maxRows: 100 });
  const restoredReplay = model.replayGroupSessionMemoryModelExtraction(scopeId, committed.executionId);
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const row = report.groups.find(item => item.groupSessionId === sessionId);
  const overBudgetRow = report.groups.find(item => item.groupSessionId === overBudgetSessionId);

  const checks = {
    newestEvidenceSurvivesBoundedInput: fitted.audit.omittedMessageCount > 0
      && fitted.audit.clipped === true
      && fitted.audit.sourceLastMessageId === messages.at(-1).id
      && fitted.audit.estimatedInputTokens <= fitted.audit.maxInputTokens,
    committedExtractionReplaysExactly: committedReplay.pass === true
      && committedReplay.checks.promptRebuildMatches === true
      && committedReplay.checks.outputRevalidates === true
      && committedReplay.checks.mergeQualityReplays === true,
    failedExtractionReplaysExactly: failedReplay.pass === true
      && failedReplay.checks.failureClassMatches === true
      && failedReplay.checks.failedOutputDoesNotClaimCommit === true,
    gzipArtifactsAreChecksumBound: [committedRequest, committedResult, failedRequest, failedResult]
      .every(artifact => artifact.valid === true && artifact.compressedBytes > 0 && artifact.uncompressedBytes > artifact.compressedBytes),
    deletedLineDetectedWithValidEventChecksums: deletedLineHistory.checksumInvalidCount === 0
      && deletedLineHistory.chainInvalidCount > 0
      && deletedLineHistory.integrityValid === false,
    reorderedLinesDetectedWithValidEventChecksums: reorderedHistory.checksumInvalidCount === 0
      && reorderedHistory.chainInvalidCount > 0
      && reorderedHistory.integrityValid === false,
    tailTruncationDetectedBySignedHead: truncatedHistory.checksumInvalidCount === 0
      && truncatedHistory.chainInvalidCount === 0
      && truncatedHistory.headMatches === false
      && truncatedHistory.integrityValid === false,
    artifactCorruptionFailsClosed: corruptArtifactReplay.pass === false
      && corruptArtifactReplay.checks.resultArtifactValid === false,
    historyAndReplayRecoverAfterRestoration: restoredHistory.integrityValid === true
      && restoredReplay.pass === true,
    impossibleBudgetDefersWithoutModelCall: overBudget.status === "model_input_budget_exceeded"
      && overBudget.requestAudit?.inputBudgetStatus === "over_budget"
      && overBudgetExecutorCalled === false,
    fleetExposesChainReplayAndBudgetAudit: row?.modelExtractionHistoryValid === true
      && row?.modelExtractionHistoryChainValid === true
      && row?.modelExtractionHistoryHeadChecksumValid === true
      && row?.modelExtractionHistoryHeadMatches === true
      && row?.modelExtractionReplayValid === true
      && row?.modelInputBudgetStatus === "full_fidelity"
      && row?.modelInputOmittedMessageCount === 0
      && row?.modelInputDegradedEventCount === 1
      && overBudgetRow?.modelInputBudgetStatus === "over_budget"
      && overBudgetRow?.modelInputOverBudgetEventCount === 1
      && report.overall?.modelExtractionHistoryChainInvalidCount === 0
      && report.overall?.modelExtractionReplayInvalidCount === 0
      && report.overall?.modelInputDegradedCount === 1
      && report.overall?.modelInputOverBudgetCount === 1,
    noLegacyDefaultScopeCreated: report.overall?.legacyDefaultSessionCount === 0
      && !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    fleetDiagnostics: {
      row: row && {
        chainValid: row.modelExtractionHistoryChainValid,
        headChecksumValid: row.modelExtractionHistoryHeadChecksumValid,
        headMatches: row.modelExtractionHistoryHeadMatches,
        replayValid: row.modelExtractionReplayValid,
        inputBudgetStatus: row.modelInputBudgetStatus,
        omittedMessageCount: row.modelInputOmittedMessageCount,
        degradedEventCount: row.modelInputDegradedEventCount,
      },
      overBudgetRow: overBudgetRow && {
        inputBudgetStatus: overBudgetRow.modelInputBudgetStatus,
        historyLatest: overBudgetRow.modelExtractionHistory?.latest?.status,
      },
      overall: report.overall,
    },
  }, null, 2));

  const cleanupResults = cleanup();
  process.stdout.write(`${JSON.stringify({
    pass: true,
    checks,
    historyEvents: restoredHistory.totalCount,
    cleanup: cleanupResults.map(item => item.deletedFiles),
  }, null, 2)}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { cleanup(); } catch {}
}
