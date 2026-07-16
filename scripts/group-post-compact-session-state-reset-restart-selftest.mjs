import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase332-post-compact-reset-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const require = createRequire(import.meta.url);
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const compact = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = `phase332-${process.pid}-${Date.now().toString(36)}`;
const reuseSessionId = `gcs_phase332_reuse_${process.pid}`;
const traditionalSessionId = `gcs_phase332_traditional_${process.pid}`;
const sentinel = "PHASE332_MESSAGE_BODY_MUST_NOT_ENTER_RESET_RECEIPT";

function transcript(sessionId) {
  return Array.from({ length: 130 }, (_, index) => ({
    id: `${sessionId}-message-${index}`,
    group_session_id: sessionId,
    role: index % 2 === 0 ? "user" : "assistant",
    timestamp: new Date(Date.now() + index * 1000).toISOString(),
    content: index === 0 ? sentinel : `Phase 332 context ${index} ${"retained ".repeat(80)}`,
  }));
}

function seedSessionMemory(sessionId, cursor) {
  const scopeId = `${groupId}--${sessionId}`;
  memory.saveGroupMemory(groupId, { goal: "Phase 332 session memory reuse", messageDigest: "Stable session summary" }, sessionId);
  const dir = path.join(tempRoot, ".cc-connect", "group-session-memory", scopeId);
  const snapshotFile = path.join(dir, "snapshot.json");
  const summaryFile = path.join(dir, "summary.md");
  const markdown = "# CCM Group Session Memory\n\n## Session Summary\nPHASE332_REUSE";
  const markdownChecksum = crypto.createHash("sha256").update(markdown).digest("hex").slice(0, 24);
  fs.writeFileSync(summaryFile, markdown, "utf8");
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  fs.writeFileSync(snapshotFile, JSON.stringify({
    ...snapshot,
    groupId: scopeId,
    hasSummary: true,
    markdownChecksum,
    lastSummarizedMessageId: cursor,
  }, null, 2), "utf8");
}

async function run(sessionId, reuse) {
  const messages = transcript(sessionId);
  storage.saveGroupMessages(groupId, messages, sessionId);
  if (reuse) seedSessionMemory(sessionId, messages[90].id);
  const result = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId,
    force: true,
    rebuild: true,
    reason: `phase332-${reuse ? "reuse" : "traditional"}`,
    config: {
      memoryCompactionUseModel: false,
      minKeepMessages: 5,
      minKeepTokens: 1,
      maxKeepTokens: 40_000,
      sessionMemoryCompactWaitTimeoutMs: 250,
    },
  });
  return { messages, result };
}

try {
  const reused = await run(reuseSessionId, true);
  const traditional = await run(traditionalSessionId, false);
  const storedReuse = memory.loadGroupMemory(groupId, reuseSessionId);
  const storedTraditional = memory.loadGroupMemory(groupId, traditionalSessionId);
  const reuseReceipt = storedReuse.compaction?.postCompactSessionStateReset || {};
  const traditionalReceipt = storedTraditional.compaction?.postCompactSessionStateReset || {};
  const reuseVerification = compact.verifyGroupPostCompactSessionStateResetReceipt(reuseReceipt, {
    groupId,
    groupSessionId: reuseSessionId,
    boundaryId: storedReuse.compactBoundary?.id,
    summaryChecksum: storedReuse.compaction?.summaryChecksum,
  });
  const traditionalVerification = compact.verifyGroupPostCompactSessionStateResetReceipt(traditionalReceipt, {
    groupId,
    groupSessionId: traditionalSessionId,
    boundaryId: storedTraditional.compactBoundary?.id,
    summaryChecksum: storedTraditional.compaction?.summaryChecksum,
  });
  const reuseProjection = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: reuseSessionId,
    messages: reused.messages,
    memory: storedReuse,
  });
  const traditionalProjection = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: traditionalSessionId,
    messages: traditional.messages,
    memory: storedTraditional,
  });
  const tamperedMemory = structuredClone(storedReuse);
  tamperedMemory.compaction.postCompactSessionStateReset.cache_read_baseline.generation += 1;
  tamperedMemory.compactBoundary.postCompactSessionStateReset.cache_read_baseline.generation += 1;
  tamperedMemory.compactBoundary.compactMetadata.postCompactSessionStateReset.cache_read_baseline.generation += 1;
  tamperedMemory.compactBoundary.post_compact_restore.postCompactSessionStateReset.cache_read_baseline.generation += 1;
  const tamperedProjection = boundary.buildGroupMemoryResumeProjection({
    groupId,
    sessionId: reuseSessionId,
    messages: reused.messages,
    memory: tamperedMemory,
  });
  const scopeDir = path.join(tempRoot, ".cc-connect", "group-session-memory", `${groupId}--${reuseSessionId}`);
  const snapshot = JSON.parse(fs.readFileSync(path.join(scopeDir, "snapshot.json"), "utf8"));
  const detail = center.getMemoryCenterScope("group", `${groupId}::${reuseSessionId}`);
  const centerReset = detail.postCompactUsage?.postCompactSessionStateReset || {};
  const checks = {
    bothCompactionsSucceeded: reused.result.success === true && reused.result.compacted === true
      && traditional.result.success === true && traditional.result.compacted === true,
    bothPathsRecorded: reuseReceipt.compact_path === "session_memory_reuse"
      && traditionalReceipt.compact_path === "traditional",
    receiptsVerifyAfterReload: reuseVerification.valid === true && traditionalVerification.valid === true,
    durableBoundaryCursorPreserved: reuseReceipt.durable_boundary_cursor?.message_id === storedReuse.compaction?.lastCompactedMessageId,
    providerCursorCleared: reuseReceipt.provider_active_cursor?.status === "cleared"
      && reuseReceipt.provider_active_cursor?.message_id === "",
    extractionCursorRebased: reuseReceipt.session_memory_extraction_cursor?.message_id === storedReuse.compaction?.lastCompactedMessageId
      && snapshot.lastSummarizedMessageId === storedReuse.compaction?.lastCompactedMessageId,
    snapshotSeparatesProviderCursor: snapshot.providerActiveLastSummarizedMessageId === ""
      && snapshot.providerActiveCursorStatus === "cleared_after_compact"
      && snapshot.postCompactSessionStateResetValid === true,
    cacheWarningAndFailuresReset: reuseReceipt.cache_read_baseline?.status === "reset"
      && reuseReceipt.compact_warning?.suppressed === true
      && reuseReceipt.auto_compact_failure_state?.consecutive_failures === 0,
    providerCapacityResetLinked: reuseReceipt.provider_capacity_reset?.reset === true
      && reuseReceipt.provider_capacity_reset?.generation > 0,
    exactSessionsOwnIndependentGenerations: reuseReceipt.scope_id.endsWith(`--${reuseSessionId}`)
      && traditionalReceipt.scope_id.endsWith(`--${traditionalSessionId}`)
      && reuseReceipt.post_compact_mark?.generation === 1
      && traditionalReceipt.post_compact_mark?.generation === 1,
    restartProjectionVerifiesJournalBinding: reuseProjection.verified === true
      && traditionalProjection.verified === true
      && reuseProjection.boundary?.postCompactSessionStateResetChecksum === reuseReceipt.receipt_checksum,
    tamperingFailsClosed: tamperedProjection.verified === false
      && tamperedProjection.mustUseFullRawTranscript === true,
    memoryCenterExposesVerifiedReset: centerReset.status === "verified"
      && centerReset.checksum_valid === true
      && centerReset.group_session_id === reuseSessionId,
    receiptRemainsBodyFree: !JSON.stringify(reuseReceipt).includes(sentinel)
      && !JSON.stringify(traditionalReceipt).includes(sentinel),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, reuseVerification, traditionalVerification, reuseProjection, traditionalProjection, tamperedProjection }, null, 2));
  process.stdout.write(`PHASE332_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    if (!['EBUSY', 'EPERM'].includes(String(error?.code || ''))) throw error;
  }
}
