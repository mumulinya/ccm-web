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

const groupId = `phase331-${process.pid}-${Date.now()}`;
const selectedSessionId = "gcs_phase331_selected";
const blockedSessionId = "gcs_phase331_floor_blocked";
const journalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase331-journal-"));
const sessionDirs = [];

function messages() {
  const rows = Array.from({ length: 60 }, (_, index) => ({
    id: `phase331-message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    content: `phase331 context ${index} ${"retained ".repeat(30)}`,
  }));
  rows[45] = { id: "phase331-message-45", role: "user", task_id: "phase331-task", content: "start exact task transaction" };
  rows[46] = {
    id: "phase331-message-46",
    role: "assistant",
    task_id: "phase331-task",
    content: "thinking fragment",
    message: { id: "provider-phase331", content: [{ type: "thinking", thinking: "body-free test thinking" }] },
  };
  rows[47] = {
    id: "phase331-message-47",
    role: "assistant",
    task_id: "phase331-task",
    content: "tool use fragment",
    message: { id: "provider-phase331", content: [{ type: "tool_use", id: "tool-phase331", name: "Read", input: { file_path: "phase331.ts" } }] },
  };
  rows[48] = {
    id: "phase331-message-48",
    role: "user",
    task_id: "phase331-task",
    content: "tool result fragment",
    message: { content: [{ type: "tool_result", tool_use_id: "tool-phase331", content: "result body remains in raw transcript" }] },
  };
  return rows;
}

function writeSnapshot(sessionId) {
  const scopeId = `${groupId}--${sessionId}`;
  const dir = path.join(os.homedir(), ".cc-connect", "group-session-memory", scopeId);
  const snapshotFile = path.join(dir, "snapshot.json");
  const summaryFile = path.join(dir, "summary.md");
  const markdown = "# CCM Group Session Memory\n\n## Session Summary\nPHASE331_API_INVARIANT_CLOSURE";
  const markdownChecksum = crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(summaryFile, markdown, "utf8");
  fs.writeFileSync(snapshotFile, JSON.stringify({
    schema: "ccm-group-session-memory-snapshot-v1",
    version: 1,
    groupId: scopeId,
    snapshotFile,
    summaryFile,
    hasSummary: true,
    markdownChecksum,
    lastSummarizedMessageId: "phase331-message-47",
  }, null, 2), "utf8");
  sessionDirs.push(dir);
}

async function run(sessionId, memory = {}) {
  const source = messages();
  const result = await compact.compactGroupConversationMemory({
    groupId,
    groupSessionId: sessionId,
    messages: source,
    memory: { goal: "phase331 API invariant closure", groupId, groupSessionId: sessionId, ...memory },
    transcriptPath: `phase331-${sessionId}.json`,
    force: true,
    config: {
      memoryCompactionUseModel: false,
      minKeepMessages: 1,
      minKeepTokens: 1,
      maxKeepTokens: 40_000,
      sessionMemoryCompactWaitTimeoutMs: 250,
    },
  });
  return { source, result };
}

try {
  writeSnapshot(selectedSessionId);
  const selected = await run(selectedSessionId);
  const selection = selected.result.sessionMemoryCompactSelection;
  const closure = selection.api_invariant_closure;
  const explicitClosure = compact.adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants([
    { id: "explicit-0", role: "assistant", message: { id: "provider-explicit", content: [{ type: "thinking", thinking: "thinking" }] } },
    { id: "explicit-1", role: "assistant", providerMessageId: "provider-explicit", tool_calls: [{ id: "tool-explicit", name: "Read" }] },
    { id: "explicit-2", role: "user", tool_results: [{ tool_use_id: "tool-explicit", content: "result" }] },
  ], 2, { floorIndex: 0 });
  const checks = {
    sessionMemorySelected: selection.selected === true,
    closureReceiptValid: compact.verifyGroupSessionMemoryApiInvariantClosure(closure).valid === true,
    keepWindowExpandedToTransactionStart: closure.original_keep_index === 48 && closure.adjusted_keep_index === 45 && selected.result.keepIndex === 45,
    toolPairClosed: closure.included_tool_use_ids.includes("tool-phase331") && closure.unresolved_tool_use_ids.length === 0,
    providerThinkingFragmentsClosed: closure.included_provider_message_ids.includes("provider-phase331") && closure.split_provider_message_ids.length === 0,
    taskTransactionClosed: closure.included_task_ids.includes("phase331-task") && closure.split_task_transaction === false,
    explicitToolArraysClosed: explicitClosure.keepIndex === 0
      && explicitClosure.receipt.included_tool_use_ids.includes("tool-explicit")
      && explicitClosure.receipt.unresolved_tool_use_ids.length === 0,
    providerFragmentClosureWorksWithoutTaskIds: explicitClosure.receipt.included_provider_message_ids.includes("provider-explicit")
      && explicitClosure.receipt.split_provider_message_ids.length === 0,
    strategyInvariantsPass: selected.result.compactStrategyDecision.invariantPass === true
      && selected.result.compactStrategyDecision.invariants.noSplitToolResultPairs === true
      && selected.result.compactStrategyDecision.invariants.noSplitThinkingBlocks === true
      && selected.result.compactStrategyDecision.invariants.noSplitTaskTransactions === true,
    modelStillSkipped: selected.result.memory.compaction.modelAttempted === false && selection.compaction_api_called === false,
    rawTranscriptUntouched: selected.source[47].message.content[0].id === "tool-phase331"
      && selected.source[48].message.content[0].tool_use_id === "tool-phase331",
  };

  boundary.commitGroupMemoryCompactBoundary({
    groupId,
    sessionId: selectedSessionId,
    messages: selected.source,
    memory: selected.result.memory,
    transcriptPath: "phase331-selected.json",
    rootDir: journalRoot,
  });
  const resumed = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: selectedSessionId,
    messages: selected.source,
    memory: selected.result.memory,
    rootDir: journalRoot,
  });
  checks.restartProjectionPreservesClosure = resumed.verified === true
    && resumed.boundary.sessionMemoryCompactSelectionChecksum === selection.selection_checksum;

  const tamperedClosure = { ...closure, adjusted_keep_index: 46 };
  checks.closureTamperRejected = compact.verifyGroupSessionMemoryApiInvariantClosure(tamperedClosure).valid === false;

  writeSnapshot(blockedSessionId);
  const blocked = await run(blockedSessionId, {
    compaction: {
      version: 3,
      modelMode: "session-memory-first",
      lastCompactedMessageId: "phase331-message-47",
    },
  });
  const blockedSelection = blocked.result.sessionMemoryCompactSelection;
  checks.previousBoundaryFloorFailsClosed = blockedSelection.selected === false
    && blockedSelection.fallback_reason === "api_invariant_closure_unresolved"
    && blockedSelection.api_invariant_closure.pass === false
    && blockedSelection.api_invariant_closure.unresolved_tool_use_ids.includes("tool-phase331");

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`PHASE331_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  for (const dir of sessionDirs) fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(journalRoot, { recursive: true, force: true });
}
