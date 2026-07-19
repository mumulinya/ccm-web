import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const compact = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));

const groupId = `phase330-${process.pid}-${Date.now()}`;
const groupSessionId = "gcs_phase330_primary";
const siblingSessionId = "gcs_phase330_sibling";
const scopeId = `${groupId}--${groupSessionId}`;
const memoryDir = path.join(os.homedir(), ".cc-connect", "group-session-memory", scopeId);
const snapshotFile = path.join(memoryDir, "snapshot.json");
const summaryFile = path.join(memoryDir, "summary.md");
const journalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase330-journal-"));
const messages = Array.from({ length: 80 }, (_, index) => ({
  id: `phase330-message-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  target: index % 2 === 0 ? "coordinator" : undefined,
  agent: index % 2 === 1 ? "phase330-worker" : undefined,
  content: `phase330 message ${index} ${"session memory retained context ".repeat(120)}`,
}));
const markdown = [
  "# CCM Group Session Memory",
  "",
  "## Goal",
  "PHASE330_SESSION_MEMORY_REUSED_SENTINEL",
  "",
  "## Session Summary",
  "The exact group session memory is authoritative for this compact selection test.",
].join("\n");
const checksum = crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24);

function mockModelSummary({ user }) {
  const marker = "保真校验参考（最终摘要必须由模型生成并完整覆盖这些事实）：\n";
  const start = user.indexOf(marker) + marker.length;
  const ends = [
    user.indexOf("\n用户本次 /compact 的附加要求", start),
    user.indexOf("\n\n本次被压缩区间内的全部用户消息", start),
  ].filter(index => index >= 0);
  const end = Math.min(...ends);
  return { summary: JSON.parse(user.slice(start, end)), provider: "mock", model: "mock-group-summary" };
}

function writeSnapshot(content = markdown, declaredChecksum = checksum) {
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(summaryFile, content, "utf8");
  fs.writeFileSync(snapshotFile, JSON.stringify({
    schema: "ccm-group-session-memory-snapshot-v1",
    version: 1,
    groupId: scopeId,
    snapshotFile,
    summaryFile,
    hasSummary: true,
    markdownChecksum: declaredChecksum,
    lastSummarizedMessageId: "phase330-message-50",
    extractionTransaction: { schema: "ccm-group-session-memory-extraction-transaction-v1", status: "completed" },
  }, null, 2), "utf8");
}

async function run(sessionId, config = {}) {
  return compact.compactGroupConversationMemory({
    groupId,
    groupSessionId: sessionId,
    messages,
    memory: { goal: "phase330 selection selftest", groupId, groupSessionId: sessionId },
    transcriptPath: `phase330-${sessionId}.json`,
    force: true,
    config: {
      memoryCompactionUseModel: true,
      apiUrl: "http://127.0.0.1:1/v1",
      apiKey: "must-not-be-used",
      model: "must-not-be-called",
      memoryCompactionMode: "model-required",
      compactionModelCall: mockModelSummary,
      minKeepMessages: 5,
      minKeepTokens: 10_000,
      maxKeepTokens: 40_000,
      sessionMemoryCompactWaitTimeoutMs: 250,
      ...config,
    },
  });
}

try {
  writeSnapshot();
  const selected = await run(groupSessionId);
  const selection = selected.sessionMemoryCompactSelection;
  const selectionVerification = compact.verifyGroupSessionMemoryCompactSelectionReceipt(selection, { groupId, groupSessionId });
  const checks = {
    verifiedSessionMemorySelected: selection.selected === true && selection.status === "selected",
    exactSessionBound: selection.group_id === groupId && selection.group_session_id === groupSessionId && selection.scope_id === scopeId,
    cursorResolved: selection.cursor_status === "resolved" && selection.last_summarized_message_id === "phase330-message-50",
    ccKeepWindowApplied: selected.keepIndex === 51 && selection.preserved_message_count === messages.length - 51,
    modelApiSkipped: selected.memory.compaction.modelAttempted === false && selected.compactionUsage == null && selection.compaction_api_called === false,
    markdownUsedAsDigest: selected.memory.messageDigest.includes("PHASE330_SESSION_MEMORY_REUSED_SENTINEL"),
    noDuplicateSessionMemoryBudget: selected.truePostCompactPayloadBudget.components.session_memory_restore === 0,
    receiptValid: selectionVerification.valid === true,
    receiptStoredEverywhere: selected.memory.compactBoundary.sessionMemoryCompactSelection.selection_checksum === selection.selection_checksum
      && selected.memory.compactBoundary.compactMetadata.sessionMemoryCompactSelection.selection_checksum === selection.selection_checksum
      && selected.memory.compactBoundary.post_compact_restore.sessionMemoryCompactSelection.selection_checksum === selection.selection_checksum
      && selected.memory.messageCompression.sessionMemoryCompactSelection.selection_checksum === selection.selection_checksum,
    rawTranscriptUntouched: messages.every((message, index) => message.id === `phase330-message-${index}`),
  };

  boundary.commitGroupMemoryCompactBoundary({
    groupId,
    sessionId: groupSessionId,
    messages,
    memory: selected.memory,
    transcriptPath: "phase330-primary.json",
    rootDir: journalRoot,
  });
  const resumed = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: groupSessionId,
    messages,
    memory: selected.memory,
    rootDir: journalRoot,
  });
  checks.restartProjectionVerified = resumed.verified === true
    && resumed.boundary.sessionMemoryCompactSelectionChecksum === selection.selection_checksum;

  const tampered = JSON.parse(JSON.stringify(selected.memory));
  tampered.compactBoundary.sessionMemoryCompactSelection.preserved_message_count += 1;
  const tamperedProjection = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: groupSessionId,
    messages,
    memory: tampered,
    rootDir: journalRoot,
  });
  checks.selectionTamperFailsClosed = tamperedProjection.status === "fail_closed_rebuild_required"
    && String(tamperedProjection.reason).includes("session_memory_selection");

  const sibling = await run(siblingSessionId, { memoryCompactionUseModel: false });
  checks.siblingSessionCannotReuse = sibling.sessionMemoryCompactSelection.selected === false
    && sibling.sessionMemoryCompactSelection.fallback_reason === "snapshot_missing_or_invalid";

  writeSnapshot(`${markdown}\nTAMPERED`, checksum);
  const checksumFallback = await run(groupSessionId, { memoryCompactionUseModel: false });
  checks.markdownTamperFallsBack = checksumFallback.sessionMemoryCompactSelection.selected === false
    && checksumFallback.sessionMemoryCompactSelection.fallback_reason === "summary_markdown_checksum_mismatch";

  writeSnapshot();
  const customFallback = await run(groupSessionId, { customInstructions: "Only summarize errors" });
  checks.customInstructionsSkipReuse = customFallback.sessionMemoryCompactSelection == null
    && customFallback.memory.compaction.modelAttempted === true
    && customFallback.memory.compaction.summarySource === "model";

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`PHASE330_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  fs.rmSync(memoryDir, { recursive: true, force: true });
  fs.rmSync(journalRoot, { recursive: true, force: true });
}
