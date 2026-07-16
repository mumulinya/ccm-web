import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));

const groupId = `phase338-${process.pid}-${Date.now()}`;
const groupSessionId = storage.createGroupChatSession(groupId, "Phase 338 cadence cursor miss").id;
const siblingSessionId = "gcs_phase338_sibling";
const scopeId = `${groupId}--${groupSessionId}`;
const memoryDir = path.join(os.homedir(), ".cc-connect", "group-session-memory", scopeId);
const toolUse = index => ({
  id: `phase338-assistant-${index}`,
  role: "assistant",
  content: [{ type: "tool_use", id: `tool-${index}`, name: "Read", input: { file_path: `file-${index}.ts` } }],
});
const baseMessages = [
  { id: "phase338-user-0", role: "user", content: "start" },
  toolUse(1),
  toolUse(2),
  toolUse(3),
  toolUse(4),
];
const previous = lastExtractionMessageId => ({
  updateCadence: {
    schema: "ccm-group-session-memory-update-cadence-v1",
    initialized: true,
    tokensAtLastExtraction: 10_000,
    extractionCount: 1,
    lastExtractionMessageId,
  },
});

try {
  storage.saveGroupMessages(groupId, baseMessages.map(message => ({ ...message, group_session_id: groupSessionId })), groupSessionId);
  const missingCursor = memory.evaluateGroupSessionMemoryUpdateCadence(
    baseMessages,
    previous("phase338-pruned-cursor"),
    { currentContextTokens: 16_000 },
  );
  const noCursor = memory.evaluateGroupSessionMemoryUpdateCadence(
    baseMessages,
    previous(""),
    { currentContextTokens: 16_000 },
  );
  const resolvedCursor = memory.evaluateGroupSessionMemoryUpdateCadence(
    baseMessages,
    previous("phase338-assistant-2"),
    { currentContextTokens: 16_000, toolCallsBetweenUpdates: 2 },
  );
  const naturalBreakMessages = [
    ...baseMessages,
    { id: "phase338-assistant-natural-break", role: "assistant", content: "tools finished; waiting for next step" },
  ];
  const missingCursorNaturalBreak = memory.evaluateGroupSessionMemoryUpdateCadence(
    naturalBreakMessages,
    previous("phase338-pruned-cursor"),
    { currentContextTokens: 16_000 },
  );
  const missingCursorBelowDelta = memory.evaluateGroupSessionMemoryUpdateCadence(
    baseMessages,
    previous("phase338-pruned-cursor"),
    { currentContextTokens: 14_000 },
  );

  memory.saveGroupMemory(
    groupId,
    memory.createEmptyGroupMemory(groupId, groupSessionId),
    groupSessionId,
    { sessionMemoryCadenceDecision: missingCursor },
  );
  const persisted = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const reloaded = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const sibling = memory.readGroupSessionMemorySnapshotSummary(`${groupId}--${siblingSessionId}`);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const fleetRow = fleet.groups.find(row => row.groupSessionId === groupSessionId);
  const rendered = memory.buildGroupMemoryContext({
    groupId: scopeId,
    goal: "phase338 cadence cursor context",
    sessionMemory: { ...persisted, hasSummary: true, markdownExists: true },
  });
  const centerSource = fs.readFileSync(path.join(root, "backend", "modules", "knowledge", "memory-control-center.ts"), "utf8");
  const centerUiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");

  const checks = {
    missingCursorDoesNotCountWholeHistory: missingCursor.lastExtractionCursorStatus === "not_found"
      && missingCursor.toolCallsSinceLastExtraction === 0
      && missingCursor.toolCallScanMessageCount === 0,
    missingCursorWithToolTurnWaits: missingCursor.shouldExtract === false
      && missingCursor.status === "waiting_natural_break_after_cursor_miss"
      && missingCursor.lastAssistantTurnHasToolCalls === true,
    noCursorScansCurrentWindow: noCursor.lastExtractionCursorStatus === "not_set"
      && noCursor.toolCallsSinceLastExtraction === 4
      && noCursor.toolCallScanMessageCount === baseMessages.length
      && noCursor.shouldExtract === true,
    resolvedCursorCountsOnlySuffix: resolvedCursor.lastExtractionCursorStatus === "resolved"
      && resolvedCursor.lastExtractionCursorIndex === 2
      && resolvedCursor.toolCallsSinceLastExtraction === 2
      && resolvedCursor.toolCallScanMessageCount === 2
      && resolvedCursor.shouldExtract === true,
    naturalBreakStillExtracts: missingCursorNaturalBreak.lastExtractionCursorStatus === "not_found"
      && missingCursorNaturalBreak.toolCallsSinceLastExtraction === 0
      && missingCursorNaturalBreak.naturalBreak === true
      && missingCursorNaturalBreak.shouldExtract === true,
    tokenThresholdStillRequired: missingCursorBelowDelta.shouldExtract === false
      && missingCursorBelowDelta.status === "waiting_update_tokens",
    exactSessionPersistence: reloaded?.updateCadence?.lastExtractionCursorStatus === "not_found"
      && reloaded?.updateCadence?.toolCallsSinceLastExtraction === 0,
    siblingSessionIsolated: sibling?.hasSummary !== true
      && sibling?.updateCadence?.lastExtractionCursorStatus !== "not_found"
      && !fs.existsSync(path.join(os.homedir(), ".cc-connect", "group-session-memory", `${groupId}--${siblingSessionId}`, "snapshot.json")),
    childContextVisible: rendered.includes("cursor=not_found")
      && rendered.includes("toolCalls=0")
      && rendered.includes("scan=0 messages"),
    memoryCenterBackendVisible: centerSource.includes("cadenceLastExtractionCursorStatus")
      && centerSource.includes("cadenceCursorMissCount")
      && fleetRow?.cadenceLastExtractionCursorStatus === "not_found"
      && fleetRow?.cadenceToolCallScanMessageCount === 0
      && fleet.overall?.cadenceCursorMissCount === 1,
    memoryCenterUiVisible: centerUiSource.includes("cadence cursor")
      && centerUiSource.includes("cadenceToolCallScanMessageCount"),
    globalAgentBoundaryPreserved: !globalSource.includes("group-session-memory"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, missingCursor, noCursor, resolvedCursor, missingCursorNaturalBreak, fleetRow, fleetOverall: fleet.overall }, null, 2));
  process.stdout.write(`PHASE338_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  try { storage.deleteGroupChatSession(groupId, groupSessionId, { force: true }); } catch {}
  fs.rmSync(memoryDir, { recursive: true, force: true });
}
