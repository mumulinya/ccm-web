import assert from "node:assert/strict";
import crypto from "node:crypto";
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

const hash = value => crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 32);
const suffix = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase340-${suffix}`;
const sessionId = storage.createGroupChatSession(groupId, "Phase 340 canonical replay").id;
const siblingSessionId = storage.createGroupChatSession(groupId, "Phase 340 sibling").id;
const scopeId = `${groupId}--${sessionId}`;
const siblingScopeId = `${groupId}--${siblingSessionId}`;
const messages = [
  { id: "phase340-user", role: "user", content: "preserve canonical replay evidence", group_session_id: sessionId },
  { id: "phase340-assistant", role: "assistant", content: "natural break", group_session_id: sessionId },
];
const validMarkdown = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE
  .split("\n")
  .map((line, index) => line.startsWith("_") ? `${line}\n- PHASE340_CANONICAL_${index}: replay-stable exact-session evidence.` : line)
  .join("\n")
  .trim();
const validOutput = `<session_memory>\n${validMarkdown}\n</session_memory>`;

try {
  storage.saveGroupMessages(groupId, messages, sessionId);
  storage.saveGroupMessages(groupId, [{ id: "phase340-sibling-user", role: "user", content: "isolated", group_session_id: siblingSessionId }], siblingSessionId);
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
    observedAt: "2026-07-16T00:00:00.000Z",
  });
  const previous = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const cadence = memory.evaluateGroupSessionMemoryUpdateCadence(messages, previous, { currentContextTokens: 10_000 });
  const extraction = await model.runGroupSessionMemoryModelExtractionNow(groupId, {
    groupSessionId: sessionId,
    cadenceDecision: cadence,
    completedAt: "2026-07-16T00:01:00.000Z",
    disableDirectMemoryWriteSuppression: true,
    disableTypedMemoryRetrySchedule: true,
    executor: async request => ({
      output: validOutput,
      project: "phase340-extractor",
      agentType: "codex",
      model: "phase340-stub",
      nativeSessionId: `native-${request.executionId}`,
    }),
  });
  assert.equal(extraction.committed, true, JSON.stringify(extraction, null, 2));

  const snapshot = memory.readGroupSessionMemorySnapshotSummary(scopeId);
  const receiptFile = path.join(path.dirname(snapshot.snapshotFile), "model-extraction-receipt.json");
  const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
  const replay = model.replayGroupSessionMemoryModelExtraction(scopeId, receipt.executionId);
  const canonicalTemplate = model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE.trim();
  const normalizedRequest = model.buildGroupSessionMemoryModelExtractionPrompt({
    currentNotes: model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE,
    messages: [],
  });
  const legacy = model.resolveGroupSessionMemoryReplayCurrentNotes(canonicalTemplate, hash(model.GROUP_SESSION_MEMORY_MODEL_TEMPLATE));
  const mismatch = model.resolveGroupSessionMemoryReplayCurrentNotes(canonicalTemplate, "0".repeat(32));
  const tamperedReceipt = structuredClone(receipt);
  tamperedReceipt.mergeQualityInput.currentNotesChecksum = "f".repeat(32);
  const restartedReplay = model.replayGroupSessionMemoryModelExtraction(scopeId, receipt.executionId);
  const fleet = center.buildGroupSessionMemorySnapshotReport({ groupIds: [groupId] });
  const row = fleet.groups.find(item => item.groupSessionId === sessionId);
  const sibling = memory.readGroupSessionMemorySnapshotSummary(siblingScopeId);
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");

  const checks = {
    requestRecordsCanonicalization: normalizedRequest.audit.currentNotesCanonicalization === "trim"
      && normalizedRequest.audit.currentNotesNormalized === true
      && normalizedRequest.audit.currentNotesRawChecksum !== normalizedRequest.audit.currentNotesChecksum
      && receipt.requestAudit.currentNotesCanonicalization === "trim",
    receiptBindsCanonicalInput: receipt.mergeQualityInput.canonicalization === "trim"
      && receipt.mergeQualityInput.currentNotesChecksum === receipt.requestAudit.currentNotesChecksum,
    mergeQualityUsesCanonicalInput: receipt.mergeQuality.currentNotesChecksum === receipt.requestAudit.currentNotesChecksum,
    factGraphUsesCanonicalInput: receipt.factSupersessionGraph.currentNotesChecksum === receipt.requestAudit.currentNotesChecksum,
    freshReplayFullyVerifies: replay.pass === true
      && replay.checks.mergeQualityReplays === true
      && replay.checks.factSupersessionGraphReplays === true,
    canonicalReplayModeVisible: replay.mergeQualityInput.mode === "canonical_request"
      && replay.mergeQualityInput.checksumMatches === true,
    legacyTrailingLfCompatible: legacy.mode === "legacy_trailing_lf"
      && legacy.legacyCompatible === true
      && legacy.checksumMatches === true,
    arbitraryChecksumRejected: mismatch.checksumMatches === false && mismatch.legacyCompatible === false,
    signedReceiptTamperRejected: model.verifyGroupSessionMemoryModelExtractionReceipt(tamperedReceipt) === false,
    restartReplayStable: restartedReplay.pass === true
      && restartedReplay.mergeQualityInput.checksum === replay.mergeQualityInput.checksum,
    siblingSessionIsolated: sibling.modelExtracted !== true
      && sibling.modelExtractionReceipt == null
      && sibling.markdownChecksum !== snapshot.markdownChecksum,
    memoryCenterVisible: row?.modelMergeQualityReplayInputMode === "canonical_request"
      && row?.modelMergeQualityInputChecksumValid === true
      && fleet.overall?.modelMergeQualityInputVerifiedCount === 1,
    memoryCenterUiVisible: uiSource.includes("modelMergeQualityReplayInputMode")
      && uiSource.includes("modelMergeQualityInputChecksumValid"),
    globalAgentBoundaryPreserved: !globalSource.includes("group-session-memory"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, receipt, replay, legacy, mismatch, row, fleetOverall: fleet.overall }, null, 2));
  process.stdout.write(`PHASE340_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  for (const targetSessionId of [sessionId, siblingSessionId]) {
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, targetSessionId); } catch {}
    try { storage.deleteGroupChatSession(groupId, targetSessionId, { force: true }); } catch {}
  }
}
