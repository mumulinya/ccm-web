import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const boundaryApi = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const groupId = `resume-integration-${process.pid}-${Date.now().toString(36)}`;
const sessionId = `gcs_${Date.now().toString(36)}_resume`;
const rows = Array.from({ length: 18 }, (_, index) => ({
  id: `resume-message-${index + 1}`,
  role: index % 2 ? "assistant" : "user",
  agent: index % 2 ? "main" : undefined,
  content: `${index === 0 ? "RESUME_INTEGRATION_SENTINEL " : ""}${`context block ${index + 1} `.repeat(220)}`,
  group_session_id: sessionId,
  timestamp: new Date(Date.UTC(2026, 6, 13, 1, index)).toISOString(),
}));
rows[13] = {
  ...rows[13],
  usage: { input_tokens: 100_000, output_tokens: 10_000, cache_read_input_tokens: 20_000 },
  message: { usage: { input_tokens: 50_000, cache_creation_input_tokens: 10_000 } },
};
const messageFile = storage.getGroupChatSessionMessagesFile(groupId, sessionId);

try {
  storage.saveGroupMessages(groupId, rows, sessionId);
  const first = memory.prepareGroupMemoryResumeProjection(
    groupId,
    sessionId,
    rows,
    memory.createEmptyGroupMemory(groupId, sessionId),
    { recentLimit: 5, olderLimit: 8, minKeepMessages: 5, minKeepTokens: 2500, maxKeepTokens: 5000 }
  );
  const firstJournal = boundaryApi.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const second = memory.prepareGroupMemoryResumeProjection(
    groupId,
    sessionId,
    rows,
    memory.loadGroupMemory(groupId, sessionId),
    { recentLimit: 5, olderLimit: 8, minKeepMessages: 5, minKeepTokens: 2500, maxKeepTokens: 5000 }
  );
  const secondJournal = boundaryApi.readGroupMemoryBoundaryJournal(groupId, sessionId);

  const headId = second.projection.boundary?.firstPreservedMessageId;
  const brokenRows = rows.filter(row => row.id !== headId);
  storage.saveGroupMessages(groupId, brokenRows, sessionId);
  const recovered = memory.prepareGroupMemoryResumeProjection(
    groupId,
    sessionId,
    brokenRows,
    memory.loadGroupMemory(groupId, sessionId),
    { recentLimit: 5, olderLimit: 8, minKeepMessages: 5, minKeepTokens: 2500, maxKeepTokens: 5000 }
  );
  const recoveredJournal = boundaryApi.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const grownRows = [
    ...brokenRows,
    {
      id: "resume-real-growth",
      role: "user",
      content: `REAL_EFFECTIVE_GROWTH_SENTINEL ${"real context growth ".repeat(90_000)}`,
      group_session_id: sessionId,
      timestamp: new Date(Date.UTC(2026, 6, 13, 3, 0)).toISOString(),
    },
  ];
  storage.saveGroupMessages(groupId, grownRows, sessionId);
  const grown = memory.prepareGroupMemoryResumeProjection(
    groupId,
    sessionId,
    grownRows,
    memory.loadGroupMemory(groupId, sessionId),
    { recentLimit: 5, olderLimit: 8, minKeepMessages: 5, minKeepTokens: 2500, maxKeepTokens: 5000 }
  );
  const grownJournal = boundaryApi.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const proofs = boundaryApi.readGroupMemoryResumeProjectionProofs(groupId, sessionId);

  const firstBaseline = first.resumeBaseline || first.memory?.compaction?.resumeEffectiveTokenBaseline || {};
  const secondBaseline = second.resumeBaseline || second.memory?.compaction?.resumeEffectiveTokenBaseline || {};

  const checks = {
    firstSnapshotCreatesCommittedBoundary: first.projection.status === "verified" && firstJournal.commitCount === 1,
    projectionActuallyOmitsSummarizedPrefix: first.projection.omittedMessageCount > 0 && first.projection.projectedMessageCount < rows.length,
    repeatResumeUsesVerifiedEffectiveBaseline: second.skippedFullSnapshotRefresh === true
      && memory.validateGroupMemoryResumeEffectiveTokenBaseline(secondBaseline) === true,
    repeatResumeDoesNotChurnBoundary: second.projection.status === "verified"
      && second.projection.boundary.boundaryId === first.projection.boundary.boundaryId
      && secondJournal.commitCount === firstJournal.commitCount
      && (second.memory.compaction?.boundaries || []).length === (first.memory.compaction?.boundaries || []).length,
    effectiveTokenBaselineExcludesCompactedPrefix: firstBaseline.rawTranscriptTokens > firstBaseline.effectiveContextTokens
      && firstBaseline.omittedRawTokens > 0
      && firstBaseline.effectiveContextTokens === firstBaseline.summaryTokens + firstBaseline.projectedMessageTokens,
    pressureSampleUsesEffectiveTokens: second.memory.compaction?.contextPressureWarning?.tokenUsage === secondBaseline.effectiveContextTokens
      && second.sessionMemoryCadenceDecision?.currentContextTokens === secondBaseline.effectiveContextTokens
      && second.sessionMemoryCadenceDecision?.tokenBasis === "verified_resume_effective_context",
    preservedProviderUsageDoesNotReinflateResume: second.projection.staleProviderUsageTokensExcluded === 190_000
      && second.projection.usageSanitizedMessageCount === 1
      && rows[13].usage.input_tokens === 100_000,
    brokenPreservedHeadTriggersRecovery: recovered.recovered === true && recovered.recoveryReason.includes("projection_validation_failed"),
    failClosedRecoveryRebuildsFromCurrentRawTranscript: recovered.projection.status === "verified" && recovered.projection.rawMessageCount === brokenRows.length,
    recoveredBoundaryGetsNewCommit: recoveredJournal.commitCount === secondJournal.commitCount + 1 && recoveredJournal.latestCommit.boundaryId === recovered.projection.boundary.boundaryId,
    realEffectiveGrowthCanAdvanceBoundary: grown.skippedFullSnapshotRefresh === false
      && grownJournal.commitCount === recoveredJournal.commitCount + 1
      && grownJournal.latestCommit.boundaryId === grown.projection.boundary.boundaryId
      && grown.projection.boundary.boundaryId !== recovered.projection.boundary.boundaryId,
    recoveryAndGrowthProofsAreRecorded: proofs.valid === true
      && proofs.proofCount === 4
      && proofs.recentProofs.some(proof => proof.recovered === true)
      && proofs.latestProof.boundary?.boundaryId === grown.projection.boundary.boundaryId
      && proofs.latestProof.resumeEffectiveTokenBaseline?.baselineChecksum === grown.resumeBaseline?.baselineChecksum,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({
    checks,
    first: { projection: first.projection, baseline: firstBaseline },
    second: { projection: second.projection, baseline: secondBaseline, skippedFullSnapshotRefresh: second.skippedFullSnapshotRefresh },
    recovered: recovered.projection,
    grown: {
      boundary: grown.projection?.boundary,
      skippedFullSnapshotRefresh: grown.skippedFullSnapshotRefresh,
      effectiveContextTokens: grown.resumeBaseline?.effectiveContextTokens,
      rawTranscriptTokens: grown.resumeBaseline?.rawTranscriptTokens,
    },
    firstJournal,
    secondJournal,
    recoveredJournal,
    grownJournal,
    proofs,
  }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks }, null, 2)}\n`);
} finally {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  for (const file of [messageFile, `${messageFile}.bak`]) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
  try {
    const dir = path.dirname(messageFile);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {}
}
