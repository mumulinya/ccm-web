import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const model = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-model-extraction.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase339-${suffix}`;
const safeSessionId = storage.createGroupChatSession(groupId, "Phase 339 safe cursor").id;
const heldSessionId = storage.createGroupChatSession(groupId, "Phase 339 held cursor").id;
const siblingSessionId = storage.createGroupChatSession(groupId, "Phase 339 sibling").id;
const safeScopeId = `${groupId}--${safeSessionId}`;
const heldScopeId = `${groupId}--${heldSessionId}`;
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE339_EVIDENCE_${index}: exact-session cursor safety retained.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

const safeMessages = [
  { id: "phase339-safe-user", role: "user", content: "start safe extraction", group_session_id: safeSessionId },
  { id: "phase339-safe-assistant", role: "assistant", content: "natural break reached", group_session_id: safeSessionId },
];
const heldMessages = [
  { id: "phase339-held-user", role: "user", content: "start tool extraction", group_session_id: heldSessionId },
  {
    id: "phase339-held-assistant-tool",
    role: "assistant",
    group_session_id: heldSessionId,
    content: [1, 2, 3].map(index => ({ type: "tool_use", id: `phase339-tool-${index}`, name: "Read", input: { file_path: `file-${index}.ts` } })),
  },
];

function seedCadence(scopeId, cursor) {
  return memory.persistGroupSessionMemoryCadenceObservation(scopeId, {
    schema: "ccm-group-session-memory-update-cadence-v1",
    version: 1,
    initialized: true,
    status: "waiting_update_tokens",
    shouldExtract: false,
    currentContextTokens: 10_000,
    tokensAtLastExtraction: 10_000,
    lastExtractionMessageId: cursor,
    extractionCount: 2,
    observedAt: "2026-07-15T00:00:00.000Z",
  });
}

async function extract(sessionId, messages, completedAt) {
  const scopeId = `${groupId}--${sessionId}`;
  const previous = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const cadence = memory.evaluateGroupSessionMemoryUpdateCadence(messages, previous, { currentContextTokens: 16_000 });
  assert.equal(cadence.shouldExtract, true);
  const result = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    cadenceDecision: cadence,
    completedAt,
    disableDirectMemoryWriteSuppression: true,
    executor: async request => ({
      output: validOutput,
      project: "phase339-extractor",
      agentType: "codex",
      model: "phase339-stub",
      nativeSessionId: `native-${request.executionId}`,
    }),
  });
  assert.equal(result.committed, true, JSON.stringify(result, null, 2));
  return { cadence, result, snapshot: memory.readGroupSessionMemorySnapshotSummary(scopeId) };
}

try {
  storage.saveGroupMessages(groupId, safeMessages, safeSessionId);
  storage.saveGroupMessages(groupId, heldMessages, heldSessionId);
  storage.saveGroupMessages(groupId, [{ id: "phase339-sibling", role: "user", content: "isolated", group_session_id: siblingSessionId }], siblingSessionId);
  for (const sessionId of [safeSessionId, heldSessionId, siblingSessionId]) {
    memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionId), sessionId);
  }
  seedCadence(safeScopeId, safeMessages[0].id);
  seedCadence(heldScopeId, heldMessages[0].id);

  const safe = await extract(safeSessionId, safeMessages, "2026-07-15T01:00:00.000Z");
  const held = await extract(heldSessionId, heldMessages, "2026-07-15T01:01:00.000Z");
  const heldReceiptFile = path.join(path.dirname(held.snapshot.snapshotFile), "model-extraction-receipt.json");
  const heldReceipt = JSON.parse(fs.readFileSync(heldReceiptFile, "utf8"));
  const tamperedReceipt = structuredClone(heldReceipt);
  tamperedReceipt.cursorAfter.lastExtractionMessageId = heldMessages[1].id;

  const toolResult = {
    id: "phase339-held-tool-result",
    role: "user",
    group_session_id: heldSessionId,
    content: [{ type: "tool_result", tool_use_id: "phase339-tool-3", content: "done" }],
  };
  const resumedMessages = [...heldMessages, toolResult];
  storage.saveGroupMessages(groupId, resumedMessages, heldSessionId);
  const nextCadence = memory.evaluateGroupSessionMemoryUpdateCadence(resumedMessages, held.snapshot, { currentContextTokens: 22_000 });
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const heldRow = fleet.groups.find(row => row.groupSessionId === heldSessionId);
  const childContext = memory.buildGroupMemoryContext({
    groupId: heldScopeId,
    goal: "phase339 child context",
    sessionMemory: { ...held.snapshot, hasSummary: true, markdownExists: true },
  });
  const replay = model.replayGroupSessionMemoryModelExtraction(heldScopeId, heldReceipt.executionId);
  const sibling = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${siblingSessionId}`);
  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");

  const checks = {
    naturalBreakAdvancesCursor: safe.snapshot.updateCadence.cursorAdvanceStatus === "advanced"
      && safe.snapshot.updateCadence.cursorAdvanceSafe === true
      && safe.snapshot.updateCadence.lastExtractionMessageId === safeMessages[1].id,
    toolUseBoundaryHoldsCursor: held.snapshot.updateCadence.cursorAdvanceStatus === "held_tool_use_boundary"
      && held.snapshot.updateCadence.cursorAdvanceSafe === false
      && held.snapshot.updateCadence.cursorHeldReason === "last_assistant_turn_has_tool_calls"
      && held.snapshot.updateCadence.lastExtractionMessageId === heldMessages[0].id,
    extractionProgressStillCommits: held.snapshot.updateCadence.tokensAtLastExtraction === 16_000
      && held.snapshot.updateCadence.extractionCount === 3
      && held.snapshot.updateCadence.extractedThisObservation === true,
    nextRoundPreservesToolBoundary: nextCadence.lastExtractionMessageId === heldMessages[0].id
      && resumedMessages.slice(resumedMessages.findIndex(row => row.id === nextCadence.lastExtractionMessageId) + 1).some(row => row.id === heldMessages[1].id)
      && resumedMessages.slice(resumedMessages.findIndex(row => row.id === nextCadence.lastExtractionMessageId) + 1).some(row => row.id === toolResult.id),
    receiptMatchesSnapshotCursor: heldReceipt.cursorAdvanceStatus === "held_tool_use_boundary"
      && heldReceipt.cursorAdvanceSafe === false
      && heldReceipt.cursorAfter.lastExtractionMessageId === held.snapshot.updateCadence.lastExtractionMessageId,
    receiptTamperRejected: model.verifyGroupSessionMemoryModelExtractionReceipt(tamperedReceipt) === false,
    replayVerifiesSnapshotCursor: replay.pass === true
      && replay.checks.currentSnapshotCursorMatchesReceipt === true
      && replay.checks.factSupersessionGraphReplays === true,
    exactSessionRestartStable: memory.readGroupSessionMemorySnapshotSummary(heldScopeId).updateCadence.lastExtractionMessageId === heldMessages[0].id,
    siblingSessionIsolated: sibling.hasSummary !== true && sibling.updateCadence?.cursorAdvanceStatus !== "held_tool_use_boundary",
    memoryCenterVisible: heldRow?.cadenceCursorAdvanceStatus === "held_tool_use_boundary"
      && heldRow?.cadenceCursorHeldReason === "last_assistant_turn_has_tool_calls"
      && heldRow?.modelReceiptChecksumValid === true
      && fleet.overall?.cadenceCursorHeldToolBoundaryCount === 1,
    childContextVisible: childContext.includes("本轮 Session Memory 已更新")
      && childContext.includes("完整 tool_use/tool_result 边界"),
    globalAgentBoundaryPreserved: !globalSource.includes("group-session-memory"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, safe: safe.snapshot.updateCadence, held: held.snapshot.updateCadence, heldReceipt, nextCadence, heldRow, replay }, null, 2));
  process.stdout.write(`PHASE339_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  for (const sessionId of [safeSessionId, heldSessionId, siblingSessionId]) {
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
    try { storage.deleteGroupChatSession(groupId, sessionId, { force: true }); } catch {}
  }
}
