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

const groupId = `phase230-history-${process.pid}-${Date.now().toString(36)}`;
const mergeSession = `gcs_${Date.now().toString(36)}_merge_quality`;
const coldSession = `gcs_${Date.now().toString(36)}_cold_recovery`;
const mergeScope = `${groupId}--${mergeSession}`;
const coldScope = `${groupId}--${coldSession}`;
const currentStateDescription = "_What is actively being worked on right now? Pending tasks not yet completed. Immediate next steps._";
const genericMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE230_GENERIC_FACT_${index}` : line)
  .join("\n")
  .trim();
const constrainedMarkdown = genericMarkdown.replace(
  `${currentStateDescription}\n- PHASE230_GENERIC_FACT_4`,
  `${currentStateDescription}\n- 必须保留 PHASE230_HARD_CONSTRAINT。\n- 当前文件 C:\\repo\\src\\phase230-memory.ts。\n- 核心符号 \`phase230MergeGuard\`。\n- 未完成：继续验证冷启动恢复。\n- PHASE230_GENERIC_FACT_4`,
);
const output = markdown => `<session_memory>\n${markdown}\n</session_memory>`;
const mergeMessages = Array.from({ length: 30 }, (_, index) => ({
  id: `phase230-merge-${index + 1}`,
  role: index % 2 ? "assistant" : "user",
  content: `PHASE230_MERGE_SOURCE_${index + 1} ${"模型增量记忆来源。".repeat(180)}`,
  group_session_id: mergeSession,
}));
const coldMessages = Array.from({ length: 30 }, (_, index) => ({
  id: `phase230-cold-${index + 1}`,
  role: index % 2 ? "assistant" : "user",
  content: `PHASE230_COLD_SOURCE_${index + 1} ${"冷启动待恢复会话。".repeat(180)}`,
  group_session_id: coldSession,
}));

function cleanup() {
  const deleted = [];
  for (const sessionId of [mergeSession, coldSession]) {
    deleted.push(memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId));
    const messageFile = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
    for (const file of [messageFile, `${messageFile}.bak`]) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  try { fs.rmdirSync(path.dirname(memory.getGroupMemoryFile(groupId, mergeSession))); } catch {}
  return deleted;
}

try {
  storage.saveGroupMessages(groupId, mergeMessages, mergeSession);
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, mergeSession),
    persistentRequirements: ["必须保留 PHASE230_HARD_CONSTRAINT。"],
  }, mergeSession);
  const first = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: mergeSession,
    force: true,
    executor: async () => ({ output: output(constrainedMarkdown), project: "phase230-stub", agentType: "codex" }),
  });
  const firstSnapshot = memory.readGroupSessionMemorySnapshotSummary(mergeScope);
  const firstEvidence = firstSnapshot.sectionEvidence || {};

  const updateMessages = [...mergeMessages, {
    id: "phase230-merge-update",
    role: "assistant",
    content: `PHASE230_INCREMENTAL_UPDATE ${"新增事实但没有取消旧约束。".repeat(450)}`,
    group_session_id: mergeSession,
  }];
  storage.saveGroupMessages(groupId, updateMessages, mergeSession);
  const rejected = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: mergeSession,
    force: true,
    respectBackoff: false,
    executor: async () => ({ output: output(genericMarkdown), project: "phase230-stub", agentType: "codex" }),
  });
  const afterRejected = memory.readGroupSessionMemorySnapshotSummary(mergeScope);
  const accepted = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: mergeSession,
    force: true,
    respectBackoff: false,
    executor: async () => ({ output: output(constrainedMarkdown), project: "phase230-stub", agentType: "codex" }),
  });
  const mergedSnapshot = memory.readGroupSessionMemorySnapshotSummary(mergeScope);
  const mergeHistory = model.readGroupSessionMemoryModelExtractionHistory(mergeScope, { maxRows: 100 });
  const mergeReplay = model.replayGroupSessionMemoryModelExtraction(mergeScope, accepted.executionId);

  const correctionQuality = model.analyzeGroupSessionMemoryModelMergeQuality({
    currentNotes: constrainedMarkdown,
    markdown: genericMarkdown,
    sourceText: "用户更正：不再保留旧约束，改为新的实现。",
    sourceTranscriptChecksum: "phase230-correction-source",
  });

  storage.saveGroupMessages(groupId, coldMessages, coldSession);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, coldSession), coldSession);
  const coldBefore = memory.readGroupSessionMemorySnapshotSummary(coldScope);
  const coldDue = memory.evaluateGroupSessionMemoryUpdateCadence(coldMessages, coldBefore, { currentContextTokens: 10000 });
  memory.saveGroupMemory(groupId, memory.loadGroupMemory(groupId, coldSession), coldSession, { sessionMemoryCadenceDecision: coldDue });
  const coldQueued = memory.readGroupSessionMemorySnapshotSummary(coldScope);
  const configure = model.configureGroupSessionMemoryModelExecutor(async () => ({
    output: output(genericMarkdown),
    project: "phase230-cold-stub",
    agentType: "codex",
  }));
  await new Promise(resolve => setTimeout(resolve, 1200));
  const coldRecovered = memory.readGroupSessionMemorySnapshotSummary(coldScope);
  const coldHistory = model.readGroupSessionMemoryModelExtractionHistory(coldScope, { maxRows: 100 });
  const coldReplay = model.replayGroupSessionMemoryModelExtraction(coldScope, coldHistory.latest?.executionId);
  model.configureGroupSessionMemoryModelExecutor(null);

  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const mergeRow = report.groups.find(row => row.groupSessionId === mergeSession);
  const coldRow = report.groups.find(row => row.groupSessionId === coldSession);
  const checks = {
    firstExtractionRecordsPerMessageProvenance: first.committed === true
      && firstEvidence.sections?.length === 10
      && firstEvidence.sections.every(section => section.sourceMessageIds?.length === mergeMessages.length)
      && firstEvidence.sections.every(section => section.sourceMessageIds[0] === mergeMessages[0].id),
    silentConstraintLossIsRejected: rejected.status === "failed"
      && rejected.failureClass === "invalid_model_output"
      && rejected.failureReceipt?.mergeQuality?.status === "fail"
      && rejected.failureReceipt?.mergeQuality?.lostConstraintCount >= 1
      && afterRejected.markdownChecksum === firstSnapshot.markdownChecksum,
    preservedConstraintUpdateCommits: accepted.committed === true
      && mergedSnapshot.modelMergeQuality?.pass === true
      && mergedSnapshot.modelMergeQuality?.anchorRetentionPercent === 100
      && mergedSnapshot.markdownExcerpt.includes("PHASE230_HARD_CONSTRAINT"),
    broadCorrectionCannotSupersedeUnboundOldAnchors: correctionQuality.pass === false
      && correctionQuality.correctionSignal === true
      && correctionQuality.lostAnchorCount >= 1
      && correctionQuality.factSupersessionGraph?.supersededFactCount === 0,
    signedHistoryCapturesEveryAttempt: mergeHistory.startedCount === 3
      && mergeHistory.committedCount === 2
      && mergeHistory.failedCount === 1
      && mergeHistory.totalCount === 6
      && mergeHistory.checksumInvalidCount === 0
      && mergeHistory.chainInvalidCount === 0
      && mergeHistory.integrityValid === true
      && mergeHistory.headChecksumValid === true
      && mergeHistory.headMatches === true
      && mergeHistory.rows.every(event => event.checksumValid === true),
    executorReadyRecoversQueuedColdSession: coldQueued.updateCadence?.status === "model_extraction_due"
      && configure.recoveryScheduled === true
      && coldRecovered.modelExtracted === true
      && coldRecovered.updateCadence?.extractionCount === 1
      && coldHistory.startedCount === 1
      && coldHistory.committedCount === 1
      && coldHistory.integrityValid === true,
    latestTerminalExtractionsReplayExactly: mergeReplay.pass === true
      && mergeReplay.checks.promptRebuildMatches === true
      && mergeReplay.checks.mergeQualityReplays === true
      && coldReplay.pass === true,
    fleetExposesQualityAndTimeline: mergeRow?.modelMergeQualityStatus === "ok"
      && mergeRow?.modelMergeQualityScore > 0
      && mergeRow?.modelExtractionHistoryTotalCount === 6
      && mergeRow?.modelExtractionHistoryValid === true
      && mergeRow?.modelExtractionHistoryChainValid === true
      && mergeRow?.modelExtractionHistoryHeadMatches === true
      && mergeRow?.modelExtractionReplayValid === true
      && coldRow?.modelExtractionHistoryCommittedCount === 1
      && report.overall?.modelExtractionHistoryEventCount === 8
      && report.overall?.modelExtractionHistoryInvalidCount === 0,
    noLegacyDefaultScopeCreated: report.overall?.legacyDefaultSessionCount === 0
      && !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first, rejected, accepted, mergeHistory, mergeReplay, correctionQuality, configure, coldQueued, coldRecovered, coldHistory, coldReplay, report }, null, 2));
  const cleanupResults = cleanup();
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, mergeSession)), false);
  assert.equal(fs.existsSync(memory.getGroupMemoryFile(groupId, coldSession)), false);
  process.stdout.write(`${JSON.stringify({ pass: true, checks, cleanup: cleanupResults.map(item => item.deletedFiles) }, null, 2)}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { cleanup(); } catch {}
}
