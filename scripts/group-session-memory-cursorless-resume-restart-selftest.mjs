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

const groupId = `phase337-${process.pid}-${Date.now()}`;
const groupSessionId = "gcs_phase337_resumed";
const siblingSessionId = "gcs_phase337_sibling";
const scopeId = `${groupId}--${groupSessionId}`;
const memoryDir = path.join(os.homedir(), ".cc-connect", "group-session-memory", scopeId);
const snapshotFile = path.join(memoryDir, "snapshot.json");
const summaryFile = path.join(memoryDir, "summary.md");
const journalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase337-journal-"));
const messages = Array.from({ length: 90 }, (_, index) => ({
  id: `phase337-message-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  target: index % 2 === 0 ? "coordinator" : undefined,
  agent: index % 2 === 1 ? "phase337-worker" : undefined,
  content: `phase337 resumed message ${index} ${"tail window context ".repeat(100)}`,
}));
const markdown = [
  "# Resumed Session Memory",
  "PHASE337_CURSORLESS_MEMORY_SENTINEL",
  "",
  "# Pending",
  "Continue the exact resumed group session without invoking the compact model.",
].join("\n");
const checksum = crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24);

function writeSnapshot(lastSummarizedMessageId) {
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(summaryFile, markdown, "utf8");
  fs.writeFileSync(snapshotFile, JSON.stringify({
    schema: "ccm-group-session-memory-snapshot-v1",
    version: 1,
    groupId: scopeId,
    snapshotFile,
    summaryFile,
    hasSummary: true,
    markdownChecksum: checksum,
    ...(lastSummarizedMessageId === undefined ? {} : { lastSummarizedMessageId }),
    extractionTransaction: { schema: "ccm-group-session-memory-extraction-transaction-v1", status: "completed" },
  }, null, 2), "utf8");
}

async function run(sessionId) {
  return compact.compactGroupConversationMemory({
    groupId,
    groupSessionId: sessionId,
    messages,
    memory: { goal: "phase337 cursorless resumed compact", groupId, groupSessionId: sessionId },
    transcriptPath: `phase337-${sessionId}.json`,
    force: true,
    config: {
      memoryCompactionUseModel: false,
      minKeepMessages: 5,
      minKeepTokens: 10_000,
      maxKeepTokens: 40_000,
      sessionMemoryCompactWaitTimeoutMs: 250,
    },
  });
}

try {
  writeSnapshot(undefined);
  const sourceBefore = fs.readFileSync(summaryFile);
  const resumed = await run(groupSessionId);
  const selection = resumed.sessionMemoryCompactSelection;
  const verification = compact.verifyGroupSessionMemoryCompactSelectionReceipt(selection, {
    groupId,
    groupSessionId,
  });
  const checks = {
    cursorlessMemorySelected: selection.selected === true
      && selection.status === "selected"
      && selection.cursor_status === "resumed_without_cursor",
    resumedTailModeBound: selection.cursor_mode === "resumed_session_tail"
      && selection.resumed_without_cursor === true
      && selection.last_summarized_message_id === ""
      && selection.resume_seed_message_id === "phase337-message-89",
    boundedTailPreserved: resumed.keepIndex > 0
      && resumed.keepIndex < messages.length
      && selection.preserved_message_count === messages.length - resumed.keepIndex
      && selection.preserved_token_estimate >= 10_000,
    sessionMemoryUsedWithoutModel: resumed.memory.messageDigest.includes("PHASE337_CURSORLESS_MEMORY_SENTINEL")
      && resumed.memory.compaction.modelAttempted === false
      && selection.compaction_api_called === false,
    projectionStillApplied: selection.compact_projection?.schema === "ccm-group-session-memory-compact-projection-v1"
      && resumed.truePostCompactPayloadBudget.will_retrigger_next_turn === false,
    selectionReceiptValid: verification.valid === true,
    sourceUnchanged: fs.readFileSync(summaryFile).equals(sourceBefore)
      && crypto.createHash("sha256").update(fs.readFileSync(summaryFile)).digest("hex").slice(0, 24) === checksum,
  };

  const tampered = { ...selection, cursor_mode: "snapshot_cursor" };
  const tamperedVerification = compact.verifyGroupSessionMemoryCompactSelectionReceipt(tampered, {
    groupId,
    groupSessionId,
  });
  checks.resumedContractTamperFailsClosed = tamperedVerification.valid === false
    && tamperedVerification.issues.includes("session_memory_selection_resumed_cursor_contract_invalid");

  boundary.commitGroupMemoryCompactBoundary({
    groupId,
    sessionId: groupSessionId,
    messages,
    memory: resumed.memory,
    transcriptPath: "phase337-resumed.json",
    rootDir: journalRoot,
  });
  const restartProjection = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: groupSessionId,
    messages,
    memory: resumed.memory,
    rootDir: journalRoot,
  });
  checks.restartProjectionVerified = restartProjection.verified === true
    && restartProjection.boundary.sessionMemoryCompactSelectionChecksum === selection.selection_checksum;

  const sibling = await run(siblingSessionId);
  checks.siblingSessionCannotReuse = sibling.sessionMemoryCompactSelection.selected === false
    && sibling.sessionMemoryCompactSelection.fallback_reason === "snapshot_missing_or_invalid";

  writeSnapshot("phase337-message-does-not-exist");
  const invalidCursor = await run(groupSessionId);
  checks.invalidExplicitCursorStillFails = invalidCursor.sessionMemoryCompactSelection.selected === false
    && invalidCursor.sessionMemoryCompactSelection.fallback_reason === "last_summarized_cursor_not_found"
    && invalidCursor.sessionMemoryCompactSelection.cursor_mode === "snapshot_cursor";

  const memorySource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "memory.ts"), "utf8");
  const centerSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");
  checks.childContextShowsResumeMode = memorySource.includes("selection.cursor_mode")
    && memorySource.includes("selection.cursor_status");
  checks.memoryCenterShowsResumeMode = centerSource.includes("resumed_without_cursor")
    && centerSource.includes("恢复会话尾部窗口");
  checks.globalAgentBoundaryPreserved = !globalSource.includes("group-session-memory");

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, selection, verification, tamperedVerification }, null, 2));
  process.stdout.write(`PHASE337_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  fs.rmSync(memoryDir, { recursive: true, force: true });
  fs.rmSync(journalRoot, { recursive: true, force: true });
}
