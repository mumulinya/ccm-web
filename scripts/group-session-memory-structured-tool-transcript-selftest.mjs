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
const groupId = `phase341-${suffix}`;
const sessionId = storage.createGroupChatSession(groupId, "Phase 341 structured tools").id;
const siblingSessionId = storage.createGroupChatSession(groupId, "Phase 341 sibling").id;
const scopeId = `${groupId}--${sessionId}`;
const siblingScopeId = `${groupId}--${siblingSessionId}`;
const toolUse = {
  type: "tool_use",
  id: "phase341-tool-read",
  name: "Read",
  input: { file_path: "C:/workspace/PHASE341_TOOL_INPUT.ts", offset: 7, limit: 19 },
};
const toolResult = {
  type: "tool_result",
  tool_use_id: "phase341-tool-read",
  is_error: false,
  content: [{ type: "text", text: "PHASE341_TOOL_RESULT_SENTINEL" }],
};
const messages = [
  { id: "phase341-user", role: "user", content: "inspect the file", group_session_id: sessionId },
  { id: "phase341-assistant-tool", role: "assistant", content: [toolUse], group_session_id: sessionId },
  { id: "phase341-user-result", role: "user", content: [toolResult], group_session_id: sessionId },
  { id: "phase341-assistant-break", role: "assistant", content: [{ type: "text", text: "tool round complete" }], group_session_id: sessionId },
];
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE341_STRUCTURED_${index}: tool evidence retained.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

try {
  const completeRequest = model.buildGroupSessionMemoryModelExtractionPrompt({ messages });
  const pendingRequest = model.buildGroupSessionMemoryModelExtractionPrompt({
    messages: [{ id: "phase341-pending", role: "assistant", content: [{ ...toolUse, id: "phase341-pending-tool" }] }],
  });
  const orphanRequest = model.buildGroupSessionMemoryModelExtractionPrompt({
    messages: [{ id: "phase341-orphan", role: "user", content: [{ ...toolResult, tool_use_id: "phase341-missing-tool" }] }],
  });
  const clippedRequest = model.buildGroupSessionMemoryModelExtractionPrompt({
    maxInputTokens: 4_000,
    messages: [
      { id: "phase341-clip-use", role: "assistant", content: [{ ...toolUse, id: "phase341-clip-tool" }] },
      { id: "phase341-clip-result", role: "user", content: [{ ...toolResult, tool_use_id: "phase341-clip-tool", content: "X".repeat(40_000) }] },
    ],
  });
  const roundBoundedRequest = model.buildGroupSessionMemoryModelExtractionPrompt({
    maxInputTokens: 4_300,
    messages: [
      { id: "phase341-old-user", role: "user", content: "OLD_ROUND_OMIT_ME ".repeat(1_500) },
      { id: "phase341-round-use", role: "assistant", content: [{ ...toolUse, id: "phase341-round-tool" }] },
      { id: "phase341-round-result", role: "user", content: [{ ...toolResult, tool_use_id: "phase341-round-tool" }] },
      { id: "phase341-round-break", role: "assistant", content: [{ type: "text", text: "done" }] },
    ],
  });

  storage.saveGroupMessages(groupId, messages, sessionId);
  storage.saveGroupMessages(groupId, [{ id: "phase341-sibling", role: "user", content: "isolated", group_session_id: siblingSessionId }], siblingSessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, sessionId), sessionId);
  memory.saveGroupMemory(groupId, memory.createEmptyGroupMemory(groupId, siblingSessionId), siblingSessionId);
  memory.persistGroupSessionMemoryCadenceObservation(scopeId, {
    schema: "ccm-group-session-memory-update-cadence-v1",
    version: 1,
    initialized: true,
    status: "waiting_update_tokens",
    shouldExtract: false,
    currentContextTokens: 0,
    tokensAtLastExtraction: 0,
    lastExtractionMessageId: "",
    extractionCount: 0,
    observedAt: "2026-07-16T01:00:00.000Z",
  });
  const previous = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const cadence = memory.evaluateGroupSessionMemoryUpdateCadence(messages, previous, { currentContextTokens: 10_000 });
  let capturedPrompt = "";
  const extraction = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    cadenceDecision: cadence,
    disableDirectMemoryWriteSuppression: true,
    disableTypedMemoryRetrySchedule: true,
    executor: async request => {
      capturedPrompt = request.prompt;
      return { output: validOutput, project: "phase341-extractor", agentType: "codex", model: "phase341-stub" };
    },
  });
  assert.equal(extraction.committed, true, JSON.stringify(extraction, null, 2));
  const snapshot = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const receipt = JSON.parse(fs.readFileSync(path.join(path.dirname(snapshot.snapshotFile), "model-extraction-receipt.json"), "utf8"));
  const replay = model.replayGroupSessionMemoryModelExtraction(scopeId, receipt.executionId);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const row = fleet.groups.find(item => item.groupSessionId === sessionId);
  const sibling = memory.readGroupSessionMemorySnapshotSummary(siblingScopeId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");

  const checks = {
    directPromptPreservesToolUse: completeRequest.prompt.includes('"type":"tool_use"')
      && completeRequest.prompt.includes('"name":"Read"')
      && completeRequest.prompt.includes("PHASE341_TOOL_INPUT.ts"),
    directPromptPreservesToolResult: completeRequest.prompt.includes('"type":"tool_result"')
      && completeRequest.prompt.includes('"tool_use_id":"phase341-tool-read"')
      && completeRequest.prompt.includes("PHASE341_TOOL_RESULT_SENTINEL"),
    completeBoundaryAudited: completeRequest.audit.sourceContentMode === "structured_blocks_v1"
      && completeRequest.audit.sourceToolUseBlockCount === 1
      && completeRequest.audit.sourceToolResultBlockCount === 1
      && completeRequest.audit.sourceToolBoundaryStatus === "complete",
    pendingBoundaryAudited: pendingRequest.audit.sourcePendingToolUseCount === 1
      && pendingRequest.audit.sourceToolBoundaryStatus === "pending_results",
    orphanBoundaryAudited: orphanRequest.audit.sourceOrphanToolResultCount === 1
      && orphanRequest.audit.sourceToolBoundaryStatus === "orphan_results",
    structuredOversizeClipsSafely: clippedRequest.audit.clipped === true
      && clippedRequest.audit.sourceToolBoundaryStatus === "clipped"
      && clippedRequest.prompt.includes("ccm_clipped_structured_content")
      && !clippedRequest.prompt.includes("[object Object]"),
    apiRoundBudgetKeepsToolPair: roundBoundedRequest.audit.omittedApiRoundCount >= 1
      && roundBoundedRequest.audit.sourceToolUseBlockCount === 1
      && roundBoundedRequest.audit.sourceToolResultBlockCount === 1
      && roundBoundedRequest.audit.sourceOrphanToolResultCount === 0,
    executorReceivesStructuredPrompt: capturedPrompt.includes("phase341-tool-read")
      && capturedPrompt.includes("PHASE341_TOOL_RESULT_SENTINEL")
      && capturedPrompt.includes("PHASE341_TOOL_INPUT.ts"),
    receiptBindsStructuredAudit: receipt.requestAudit.sourceContentMode === "structured_blocks_v1"
      && receipt.requestAudit.sourceToolBoundaryStatus === "complete"
      && receipt.requestAudit.sourceTranscriptChecksum === completeRequest.audit.sourceTranscriptChecksum,
    signedReplayPasses: replay.pass === true && replay.checks.promptRebuildMatches === true,
    restartSnapshotStable: memory.readGroupSessionMemorySnapshotSummary(scopeId).markdownChecksum === snapshot.markdownChecksum,
    siblingSessionIsolated: sibling.modelExtracted !== true && sibling.modelExtractionReceipt == null,
    memoryCenterVisible: row?.modelInputContentMode === "structured_blocks_v1"
      && row?.modelInputToolBoundaryStatus === "complete"
      && row?.modelInputToolUseBlockCount === 1
      && row?.modelInputToolResultBlockCount === 1
      && fleet.overall?.modelInputStructuredSessionCount === 1,
    memoryCenterUiVisible: uiSource.includes("modelInputToolBoundaryStatus")
      && uiSource.includes("modelInputSelectedApiRoundCount"),
    globalAgentBoundaryPreserved: !globalSource.includes("group-session-memory"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, completeAudit: completeRequest.audit, pendingAudit: pendingRequest.audit, orphanAudit: orphanRequest.audit, clippedAudit: clippedRequest.audit, roundAudit: roundBoundedRequest.audit, receiptAudit: receipt.requestAudit, replay, row, fleetOverall: fleet.overall }, null, 2));
  process.stdout.write(`PHASE341_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  for (const targetSessionId of [sessionId, siblingSessionId]) {
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, targetSessionId); } catch {}
    try { storage.deleteGroupChatSession(groupId, targetSessionId, { force: true }); } catch {}
  }
}
