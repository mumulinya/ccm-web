import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const compact = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));

const groupId = `phase336-${process.pid}-${Date.now()}`;
const groupSessionId = "gcs_phase336_primary";
const siblingSessionId = "gcs_phase336_sibling";
const scopeId = `${groupId}--${groupSessionId}`;
const memoryDir = path.join(os.homedir(), ".cc-connect", "group-session-memory", scopeId);
const snapshotFile = path.join(memoryDir, "snapshot.json");
const summaryFile = path.join(memoryDir, "summary.md");
const journalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase336-journal-"));
const configHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase336-config-"));
const messages = Array.from({ length: 84 }, (_, index) => ({
  id: `phase336-message-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  target: index % 2 === 0 ? "coordinator" : undefined,
  agent: index % 2 === 1 ? "phase336-worker" : undefined,
  content: `phase336 message ${index} ${"preserved exact-session context ".repeat(110)}`,
}));
const markdown = [
  "# Goal",
  "PHASE336_PRIMARY_SENTINEL",
  ...Array.from({ length: 260 }, (_, index) => `goal line ${index} ${"alpha context ".repeat(18)}`),
  "# Decisions",
  ...Array.from({ length: 260 }, (_, index) => `decision line ${index} ${"beta context ".repeat(18)}`),
  "# Pending",
  ...Array.from({ length: 260 }, (_, index) => `pending line ${index} ${"gamma context ".repeat(18)}`),
].join("\n").trim();
const checksum = crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24);

function writeSnapshot() {
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
    lastSummarizedMessageId: "phase336-message-54",
    extractionTransaction: { schema: "ccm-group-session-memory-extraction-transaction-v1", status: "completed" },
  }, null, 2), "utf8");
}

async function run(sessionId) {
  return compact.compactGroupConversationMemory({
    groupId,
    groupSessionId: sessionId,
    messages,
    memory: { goal: "phase336 compact projection", groupId, groupSessionId: sessionId },
    transcriptPath: `phase336-${sessionId}.json`,
    force: true,
    config: {
      memoryCompactionUseModel: false,
      minKeepMessages: 5,
      minKeepTokens: 10_000,
      maxKeepTokens: 40_000,
      sessionMemoryCompactWaitTimeoutMs: 250,
      sessionMemoryCompactMaxSectionTokens: 700,
      sessionMemoryCompactMaxTotalTokens: 1500,
    },
  });
}

try {
  const defaults = orchestrator.defaultOrchestratorConfig();
  const configProbe = spawnSync(process.execPath, ["-e", `
    const orchestrator = require(${JSON.stringify(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"))});
    const saved = orchestrator.saveOrchestratorConfig({
      sessionMemoryCompactMaxSectionTokens: 3000,
      sessionMemoryCompactMaxTotalTokens: 18000,
    });
    let invalidRejected = false;
    try {
      orchestrator.saveOrchestratorConfig({
        sessionMemoryCompactMaxSectionTokens: 4000,
        sessionMemoryCompactMaxTotalTokens: 2000,
      });
    } catch { invalidRejected = true; }
    process.stdout.write(JSON.stringify({
      section: saved.sessionMemoryCompactMaxSectionTokens,
      total: saved.sessionMemoryCompactMaxTotalTokens,
      invalidRejected,
    }));
  `], {
    encoding: "utf8",
    env: { ...process.env, HOME: configHome, USERPROFILE: configHome },
  });
  const configProbeResult = JSON.parse(configProbe.stdout || "{}");
  const single = compact.buildGroupSessionMemoryCompactProjection({
    groupId,
    groupSessionId,
    summaryFile,
    markdown: `# Huge\n${"one very long line ".repeat(4000)}\nTAIL_MUST_NOT_SURVIVE`,
    maxSectionTokens: 500,
    maxTotalTokens: 1000,
  });
  const custom = compact.buildGroupSessionMemoryCompactProjection({
    groupId,
    groupSessionId,
    summaryFile,
    markdown,
    originalMarkdownChecksum: checksum,
    maxSectionTokens: 700,
    maxTotalTokens: 1500,
  });
  const customVerification = compact.verifyGroupSessionMemoryCompactProjection(custom.receipt, {
    groupId,
    groupSessionId,
    summaryFile,
    originalMarkdownChecksum: checksum,
    projectedMarkdown: custom.markdown,
  });
  const checks = {
    ccDefaults: defaults.sessionMemoryCompactMaxSectionTokens === 2000
      && defaults.sessionMemoryCompactMaxTotalTokens === 12000,
    customConfigPersistsAndValidates: configProbe.status === 0
      && configProbeResult.section === 3000
      && configProbeResult.total === 18000
      && configProbeResult.invalidRejected === true,
    singleSectionLineBoundary: single.receipt.truncated_section_count === 1
      && single.markdown.includes("[... section truncated for length ...]")
      && !single.markdown.includes("TAIL_MUST_NOT_SURVIVE"),
    fullSourcePathSurfaced: single.markdown.includes(summaryFile)
      && custom.receipt.source_reference_included === true,
    multiSectionBudgetsApplied: custom.receipt.section_count === 3
      && custom.receipt.truncated_section_count >= 2
      && custom.receipt.projected_token_estimate <= 1500
      && custom.receipt.max_section_tokens === 700,
    projectionReceiptValid: customVerification.valid === true,
    projectionBodyFree: custom.receipt.body_free === true
      && !JSON.stringify(custom.receipt).includes("PHASE336_PRIMARY_SENTINEL"),
  };

  const tamperedProjection = { ...custom.receipt, projected_token_estimate: custom.receipt.projected_token_estimate + 1 };
  checks.projectionTamperFailsClosed = compact.verifyGroupSessionMemoryCompactProjection(tamperedProjection, {
    groupId,
    groupSessionId,
  }).valid === false;

  writeSnapshot();
  const sourceBytesBefore = fs.readFileSync(summaryFile);
  const selected = await run(groupSessionId);
  const selection = selected.sessionMemoryCompactSelection;
  checks.largeMemoryStillSelected = selection.selected === true
    && selection.compact_projection?.truncated_section_count > 0
    && selected.memory.messageDigest.length < markdown.length;
  checks.truePayloadUsesProjection = selected.truePostCompactPayloadBudget.components.summary <= 1500
    && selected.truePostCompactPayloadBudget.will_retrigger_next_turn === false;
  checks.selectionReceiptValid = compact.verifyGroupSessionMemoryCompactSelectionReceipt(selection, {
    groupId,
    groupSessionId,
  }).valid === true;
  checks.originalFileUnchanged = fs.readFileSync(summaryFile).equals(sourceBytesBefore)
    && crypto.createHash("sha256").update(fs.readFileSync(summaryFile)).digest("hex").slice(0, 24) === checksum;

  boundary.commitGroupMemoryCompactBoundary({
    groupId,
    sessionId: groupSessionId,
    messages,
    memory: selected.memory,
    transcriptPath: "phase336-primary.json",
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

  const sibling = await run(siblingSessionId);
  checks.siblingSessionIsolated = sibling.sessionMemoryCompactSelection.selected === false
    && sibling.sessionMemoryCompactSelection.fallback_reason === "snapshot_missing_or_invalid";

  const memorySource = fs.readFileSync(path.join(root, "backend", "modules", "collaboration", "memory.ts"), "utf8");
  const centerSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const globalSource = fs.readFileSync(path.join(root, "backend", "modules", "global", "global-agent.ts"), "utf8");
  checks.childContextVisible = memorySource.includes("Session Memory compact 投影")
    && memorySource.includes("projection.summary_file");
  checks.memoryCenterVisible = centerSource.includes("compact_projection.original_token_estimate")
    && centerSource.includes("sessionMemoryCompactMaxTotalTokens");
  checks.globalAgentBoundaryPreserved = !globalSource.includes("group-session-memory");

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    selection: {
      status: selection.status,
      fallbackReason: selection.fallback_reason,
      projectedPostCompactTokens: selection.projected_post_compact_tokens,
      declaredChecksum: selection.declared_markdown_checksum,
      actualChecksum: selection.actual_markdown_checksum,
      expectedChecksum: checksum,
      projection: selection.compact_projection,
      payload: selected.truePostCompactPayloadBudget,
    },
  }, null, 2));
  process.stdout.write(`PHASE336_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  fs.rmSync(memoryDir, { recursive: true, force: true });
  fs.rmSync(journalRoot, { recursive: true, force: true });
  fs.rmSync(configHome, { recursive: true, force: true });
}
