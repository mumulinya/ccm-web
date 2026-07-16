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

const groupId = `phase226-session-memory-cadence-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_cadence_a`;
const sessionB = `gcs_${Date.now().toString(36)}_cadence_b`;
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const integrationGroupId = `phase226-cadence-integration-${process.pid}-${Date.now().toString(36)}`;
const integrationSessionLow = `gcs_${Date.now().toString(36)}_integration_low`;
const integrationSessionHigh = `gcs_${Date.now().toString(36)}_integration_high`;
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE226_MODEL_CADENCE_${index}` : line)
  .join("\n")
  .trim();
const modelExecutor = async () => ({ output: `<session_memory>\n${validMarkdown}\n</session_memory>`, project: "phase226-stub", agentType: "codex" });

const initialMessages = [
  { id: "cadence-user-1", role: "user", content: "开始实现 Session Memory 更新节奏。" },
  { id: "cadence-assistant-1", role: "assistant", content: "已完成第一轮分析。" },
];
const toolMessage = (id, count) => ({
  id,
  role: "assistant",
  content: Array.from({ length: count }, (_, index) => ({ type: "tool_use", id: `${id}-tool-${index + 1}`, name: "Read", input: {} })),
});

try {
  storage.saveGroupMessages(groupId, initialMessages.map(message => ({ ...message, group_session_id: sessionA })), sessionA);
  const belowInit = memory.evaluateGroupSessionMemoryUpdateCadence(initialMessages, {}, { currentContextTokens: 9999, now: "2026-07-13T04:00:00.000Z" });
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionA), sessionA, { sessionMemoryCadenceDecision: belowInit });
  const cadenceOnlyA = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  const summaryExistsBeforeInitialization = fs.existsSync(cadenceOnlyA.summaryFile);

  const initialDue = memory.evaluateGroupSessionMemoryUpdateCadence(initialMessages, cadenceOnlyA, { currentContextTokens: 10000, now: "2026-07-13T04:01:00.000Z" });
  memory.saveGroupMemory(groupId, {
    ...memory.createEmptyGroupMemory(groupId, sessionA),
    persistentRequirements: ["PHASE226_SESSION_A_MEMORY 必须按 CC cadence 更新。"],
  }, sessionA, { sessionMemoryCadenceDecision: initialDue });
  const queuedOnce = memory.readGroupSessionMemorySnapshotSummary(scopeA);
  await model.runGroupSessionMemoryModelExtractionNow(groupId, { groupSessionId: sessionA, force: true, cadenceDecision: initialDue, executor: modelExecutor });
  const extractedOnce = memory.readGroupSessionMemorySnapshotSummary(scopeA);

  const belowDelta = memory.evaluateGroupSessionMemoryUpdateCadence(
    [...initialMessages, toolMessage("cadence-assistant-2", 4)],
    extractedOnce,
    { currentContextTokens: 14999, now: "2026-07-13T04:02:00.000Z" },
  );
  const twoToolsAtDelta = memory.evaluateGroupSessionMemoryUpdateCadence(
    [...initialMessages, toolMessage("cadence-assistant-3", 2)],
    extractedOnce,
    { currentContextTokens: 15000, now: "2026-07-13T04:03:00.000Z" },
  );
  const threeToolsAtDelta = memory.evaluateGroupSessionMemoryUpdateCadence(
    [...initialMessages, toolMessage("cadence-assistant-4", 3)],
    extractedOnce,
    { currentContextTokens: 15000, now: "2026-07-13T04:04:00.000Z" },
  );
  const naturalBreakAtDelta = memory.evaluateGroupSessionMemoryUpdateCadence(
    [...initialMessages, { id: "cadence-assistant-5", role: "assistant", content: "第二轮工作已完成。" }],
    extractedOnce,
    { currentContextTokens: 15000, now: "2026-07-13T04:05:00.000Z" },
  );

  memory.saveGroupMemory(groupId, {
    ...memory.loadGroupMemory(groupId, sessionA),
    persistentRequirements: ["PHASE226_SESSION_A_MEMORY 必须按 CC cadence 更新。", "第二轮提取已完成。"],
  }, sessionA, { sessionMemoryCadenceDecision: threeToolsAtDelta });
  storage.saveGroupMessages(groupId, [...initialMessages, toolMessage("cadence-assistant-4", 3)].map(message => ({ ...message, group_session_id: sessionA })), sessionA);
  await model.runGroupSessionMemoryModelExtractionNow(groupId, { groupSessionId: sessionA, force: true, cadenceDecision: threeToolsAtDelta, executor: modelExecutor });
  const extractedTwice = memory.readGroupSessionMemorySnapshotSummary(scopeA);

  const belowInitB = memory.evaluateGroupSessionMemoryUpdateCadence(
    [{ id: "cadence-b-1", role: "assistant", content: "会话 B 保持独立。" }],
    {},
    { currentContextTokens: 3200, now: "2026-07-13T04:06:00.000Z" },
  );
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionB), sessionB, { sessionMemoryCadenceDecision: belowInitB });
  const snapshotB = memory.readGroupSessionMemorySnapshotSummary(scopeB);
  const report = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const rowA = report.groups.find(row => row.groupSessionId === sessionA);
  const rowB = report.groups.find(row => row.groupSessionId === sessionB);

  storage.saveGroupMessages(integrationGroupId, [
    { id: "integration-low-user", role: "user", content: "短会话不应提前提取 Session Memory。", group_session_id: integrationSessionLow },
    { id: "integration-low-assistant", role: "assistant", content: "继续使用近期原文窗口。", group_session_id: integrationSessionLow },
  ], integrationSessionLow);
  memory.buildGroupContextPacket(integrationGroupId, { groupSessionId: integrationSessionLow });
  const integrationLow = memory.readGroupSessionMemorySnapshotSummary(`${integrationGroupId}--${integrationSessionLow}`);

  const highMessages = Array.from({ length: 28 }, (_, index) => ({
    id: `integration-high-${index + 1}`,
    role: index % 2 ? "assistant" : "user",
    content: `高上下文会话 ${index + 1} ${"需要保留的实现证据".repeat(90)}`,
    group_session_id: integrationSessionHigh,
  }));
  storage.saveGroupMessages(integrationGroupId, highMessages, integrationSessionHigh);
  memory.buildGroupContextPacket(integrationGroupId, { groupSessionId: integrationSessionHigh });
  const integrationHighQueued = memory.readGroupSessionMemorySnapshotSummary(`${integrationGroupId}--${integrationSessionHigh}`);
  await model.runGroupSessionMemoryModelExtractionNow(integrationGroupId, { groupSessionId: integrationSessionHigh, force: true, executor: modelExecutor });
  const integrationHighFirst = memory.readGroupSessionMemorySnapshotSummary(`${integrationGroupId}--${integrationSessionHigh}`);
  memory.buildGroupContextPacket(integrationGroupId, { groupSessionId: integrationSessionHigh });
  const integrationHighSecond = memory.readGroupSessionMemorySnapshotSummary(`${integrationGroupId}--${integrationSessionHigh}`);

  const checks = {
    belowInitializationDoesNotExtract: belowInit.initialized === false && belowInit.shouldExtract === false && belowInit.status === "waiting_initialization_tokens",
    cadenceStatePersistsWithoutSummary: cadenceOnlyA.updateCadence?.currentContextTokens === 9999 && cadenceOnlyA.hasSummary === false && !summaryExistsBeforeInitialization,
    initializationAtTenThousandExtractsAtNaturalBreak: initialDue.initialized === true && initialDue.shouldExtract === true && initialDue.naturalBreak === true,
    dueObservationWaitsForModelWithoutAdvancingCursor: queuedOnce.updateCadence?.status === "model_extraction_due" && queuedOnce.updateCadence?.extractionCount === 0 && queuedOnce.updateCadence?.tokensAtLastExtraction === 0,
    firstExtractionAdvancesDurableCursor: extractedOnce.modelExtracted === true && extractedOnce.updateCadence?.extractionCount === 1 && extractedOnce.updateCadence?.lastExtractionMessageId === "cadence-assistant-1",
    tokenThresholdAlwaysRequired: belowDelta.shouldExtract === false && belowDelta.status === "waiting_update_tokens" && belowDelta.toolCallsSinceLastExtraction === 4,
    twoToolCallsDoNotUpdateAtBusyTurn: twoToolsAtDelta.shouldExtract === false && twoToolsAtDelta.status === "waiting_tool_calls_or_natural_break" && twoToolsAtDelta.lastAssistantTurnHasToolCalls === true,
    threeToolCallsUpdateAtTokenDelta: threeToolsAtDelta.shouldExtract === true && threeToolsAtDelta.toolCallThresholdMet === true && threeToolsAtDelta.tokenThresholdMet === true,
    naturalBreakUpdatesWithoutThreeTools: naturalBreakAtDelta.shouldExtract === true && naturalBreakAtDelta.toolCallsSinceLastExtraction === 0 && naturalBreakAtDelta.naturalBreak === true,
    secondExtractionPreservesToolBoundary: extractedTwice.modelExtracted === true
      && extractedTwice.updateCadence?.extractionCount === 2
      && extractedTwice.updateCadence?.tokensAtLastExtraction === 15000
      && extractedTwice.updateCadence?.lastExtractionMessageId === "cadence-assistant-1"
      && extractedTwice.updateCadence?.cursorAdvanceStatus === "held_tool_use_boundary",
    sessionBCadenceIsIndependent: snapshotB.updateCadence?.initialized === false && snapshotB.updateCadence?.currentContextTokens === 3200 && snapshotB.updateCadence?.extractionCount === 0,
    fleetReportsCadencePerSession: report.overall?.sessionCount === 2 && report.overall?.cadenceInitializedSessionCount === 1 && report.overall?.cadenceWaitingInitializationCount === 1 && report.overall?.totalSessionMemoryExtractionCount === 2 && report.overall?.modelReceiptVerifiedCount === 1 && rowA?.cadenceExtractionCount === 2 && rowB?.cadenceCurrentTokens === 3200,
    noLegacyDefaultScopeCreated: report.overall?.legacyDefaultSessionCount === 0 && !fs.existsSync(memory.getGroupMemoryFile(groupId, "default")),
    contextPacketDefersLowTokenExtraction: integrationLow.updateCadence?.initialized === false && integrationLow.updateCadence?.extractionCount === 0 && !fs.existsSync(integrationLow.summaryFile),
    contextPacketQueuesHighTokenModelExtraction: integrationHighQueued.updateCadence?.status === "model_extraction_due" && integrationHighQueued.updateCadence?.extractionCount === 0,
    contextPacketExtractsHighTokenSessionOnce: integrationHighFirst.modelExtracted === true && integrationHighFirst.updateCadence?.extractionCount === 1 && integrationHighFirst.updateCadence?.tokensAtLastExtraction >= 10000 && fs.existsSync(integrationHighFirst.summaryFile),
    repeatedContextPacketDoesNotRewriteSummary: integrationHighSecond.updateCadence?.extractionCount === 1 && integrationHighSecond.markdownChecksum === integrationHighFirst.markdownChecksum && integrationHighSecond.generatedAt === integrationHighFirst.generatedAt,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, belowInit, initialDue, belowDelta, twoToolsAtDelta, threeToolsAtDelta, naturalBreakAtDelta, extractedOnce, extractedTwice, snapshotB, report }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks, fleet: report.overall }, null, 2)}\n`);
} finally {
  model.configureGroupSessionMemoryModelExecutor(null);
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
  for (const [cleanupGroupId, sessionId] of [[groupId, sessionA], [groupId, sessionB], [integrationGroupId, integrationSessionLow], [integrationGroupId, integrationSessionHigh]]) {
    try { memory.deleteGroupSessionMemoryArtifacts(cleanupGroupId, sessionId); } catch {}
    const file = storage.getGroupChatSessionMessagesFile(cleanupGroupId, sessionId);
    for (const target of [file, `${file}.bak`]) {
      try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
    }
  }
}
