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
const customization = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-session-memory-customization.js"));
const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const memoryModule = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));

const groupId = `phase344-${process.pid}-${Date.now()}`;
const sessionA = "gcs_phase344_a";
const sessionB = "gcs_phase344_b";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const journalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase344-journal-"));
const messages = Array.from({ length: 80 }, (_, index) => ({
  id: `phase344-message-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  target: index % 2 === 0 ? "coordinator" : undefined,
  agent: index % 2 === 1 ? "phase344-worker" : undefined,
  content: `phase344 message ${index} ${"exact session memory compact evidence ".repeat(100)}`,
}));

const templateA = [
  "# Active Contract",
  "_The exact contract and work still in progress_",
  "",
  "# Corrections",
  "_Errors, user corrections, and approaches that must not be repeated_",
].join("\n");
const templateB = [
  "# Sibling State",
  "_State that belongs only to the sibling exact session_",
].join("\n");

function sessionFiles(sessionId) {
  const scopeId = `${groupId}--${sessionId}`;
  const dir = path.join(os.homedir(), ".cc-connect", "group-session-memory", scopeId);
  return { scopeId, dir, snapshotFile: path.join(dir, "snapshot.json"), summaryFile: path.join(dir, "summary.md") };
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
}

function writeSnapshot(sessionId, content, hasSummary = true) {
  const files = sessionFiles(sessionId);
  const persisted = String(content).trim();
  fs.mkdirSync(files.dir, { recursive: true });
  fs.writeFileSync(files.summaryFile, content, "utf8");
  fs.writeFileSync(files.snapshotFile, JSON.stringify({
    schema: "ccm-group-session-memory-snapshot-v1",
    version: 1,
    groupId: files.scopeId,
    snapshotFile: files.snapshotFile,
    summaryFile: files.summaryFile,
    hasSummary,
    markdownChecksum: digest(persisted),
    lastSummarizedMessageId: "phase344-message-50",
    extractionTransaction: { schema: "ccm-group-session-memory-extraction-transaction-v1", status: "completed" },
  }, null, 2), "utf8");
  return files;
}

async function run(sessionId) {
  return compact.compactGroupConversationMemory({
    groupId,
    groupSessionId: sessionId,
    messages,
    memory: { goal: "phase344 dynamic template empty compact", groupId, groupSessionId: sessionId },
    transcriptPath: `phase344-${sessionId}.json`,
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

function legacyV1Receipt(receipt) {
  const legacy = JSON.parse(JSON.stringify(receipt));
  legacy.version = 1;
  for (const key of [
    "template_empty_checked",
    "template_only",
    "template_scope_id",
    "template_source",
    "template_checksum",
    "template_section_count",
  ]) delete legacy[key];
  delete legacy.selection_checksum;
  legacy.selection_checksum = crypto.createHash("sha256").update(JSON.stringify(legacy)).digest("hex");
  return legacy;
}

try {
  const profileA = customization.saveGroupSessionMemoryCustomTemplate(scopeA, templateA);
  const profileB = customization.saveGroupSessionMemoryCustomTemplate(scopeB, templateB);

  writeSnapshot(sessionA, `${templateA.replace(/\n/g, "\r\n")}\r\n`);
  const emptyA = await run(sessionA);
  const emptyReceiptA = emptyA.sessionMemoryCompactSelection;

  const populatedAContent = `${templateA}\n\nPHASE344_EXACT_SESSION_CONTENT must survive compact selection.`;
  writeSnapshot(sessionA, populatedAContent);
  const selectedA = await run(sessionA);
  const selectedReceiptA = selectedA.sessionMemoryCompactSelection;
  const selectedVerification = compact.verifyGroupSessionMemoryCompactSelectionReceipt(selectedReceiptA, { groupId, groupSessionId: sessionA });

  writeSnapshot(sessionB, templateB);
  const emptyB = await run(sessionB);
  const emptyReceiptB = emptyB.sessionMemoryCompactSelection;

  writeSnapshot(sessionA, populatedAContent, false);
  const staleBoolean = await run(sessionA);

  const tampered = JSON.parse(JSON.stringify(selectedReceiptA));
  tampered.template_checksum = "tampered-template-checksum";
  const tamperedVerification = compact.verifyGroupSessionMemoryCompactSelectionReceipt(tampered, { groupId, groupSessionId: sessionA });
  const legacyVerification = compact.verifyGroupSessionMemoryCompactSelectionReceipt(legacyV1Receipt(selectedReceiptA), { groupId, groupSessionId: sessionA });
  const selectedContext = memoryModule.buildGroupMemoryContext(selectedA.memory);
  const fallbackContext = memoryModule.buildGroupMemoryContext(emptyA.memory);
  const memoryCenterSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");

  boundary.commitGroupMemoryCompactBoundary({
    groupId,
    sessionId: sessionA,
    messages,
    memory: selectedA.memory,
    transcriptPath: "phase344-a.json",
    rootDir: journalRoot,
  });
  const resumed = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: sessionA,
    messages,
    memory: selectedA.memory,
    rootDir: journalRoot,
  });

  const checks = {
    exactTemplateOnlyFallsBack: emptyReceiptA.selected === false
      && emptyReceiptA.fallback_reason === "session_memory_empty_template",
    staleHasSummaryCannotBypass: emptyReceiptA.template_only === true
      && emptyReceiptA.template_empty_checked === true,
    crlfAndTrailingWhitespaceCanonicalized: emptyReceiptA.template_checksum === profileA.checksum,
    exactTemplateEvidenceBound: emptyReceiptA.template_scope_id === scopeA
      && emptyReceiptA.template_source === "exact_session"
      && emptyReceiptA.template_section_count === 2,
    populatedExactTemplateSelected: selectedReceiptA.selected === true
      && selectedA.memory.messageDigest.includes("PHASE344_EXACT_SESSION_CONTENT"),
    selectedV2ReceiptVerified: selectedReceiptA.version === 2 && selectedVerification.valid === true,
    selectedReceiptProvesNotTemplateOnly: selectedReceiptA.template_empty_checked === true
      && selectedReceiptA.template_only === false
      && selectedReceiptA.template_checksum === profileA.checksum,
    siblingTemplateOnlyFallsBack: emptyReceiptB.selected === false
      && emptyReceiptB.fallback_reason === "session_memory_empty_template",
    siblingExactTemplateIsolated: emptyReceiptB.template_scope_id === scopeB
      && emptyReceiptB.template_checksum === profileB.checksum
      && emptyReceiptB.template_checksum !== emptyReceiptA.template_checksum,
    falseSnapshotSummaryFallsBackSeparately: staleBoolean.sessionMemoryCompactSelection.fallback_reason === "session_memory_snapshot_has_no_summary"
      && staleBoolean.sessionMemoryCompactSelection.template_only === false,
    templateReceiptTamperRejected: tamperedVerification.valid === false
      && tamperedVerification.issues.includes("session_memory_selection_checksum_invalid"),
    legacyV1ReceiptStillAccepted: legacyVerification.valid === true,
    restartBoundaryAcceptsV2: resumed.verified === true
      && resumed.boundary.sessionMemoryCompactSelectionChecksum === selectedReceiptA.selection_checksum,
    receiptRemainsBodyFree: !JSON.stringify(selectedReceiptA).includes("PHASE344_EXACT_SESSION_CONTENT")
      && !JSON.stringify(selectedReceiptA).includes("# Active Contract"),
    groupAndChildContextExposeTemplateState: selectedContext.includes("source=exact_session")
      && selectedContext.includes("templateOnly=false")
      && fallbackContext.includes("templateOnly=true"),
    memoryCenterExposesTemplateState: memoryCenterSource.includes("template_empty_checked")
      && memoryCenterSource.includes("仅模板，禁止复用")
      && memoryCenterSource.includes("包含有效记忆"),
    rawTranscriptUntouched: messages.every((message, index) => message.id === `phase344-message-${index}`),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  process.stdout.write(`PHASE344_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  try { customization.saveGroupSessionMemoryCustomTemplate(scopeA, "", { reset: true }); } catch {}
  try { customization.saveGroupSessionMemoryCustomTemplate(scopeB, "", { reset: true }); } catch {}
  for (const sessionId of [sessionA, sessionB]) fs.rmSync(sessionFiles(sessionId).dir, { recursive: true, force: true });
  fs.rmSync(journalRoot, { recursive: true, force: true });
}
