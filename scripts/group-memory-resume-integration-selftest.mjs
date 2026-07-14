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
  const proofs = boundaryApi.readGroupMemoryResumeProjectionProofs(groupId, sessionId);

  const checks = {
    firstSnapshotCreatesCommittedBoundary: first.projection.status === "verified" && firstJournal.commitCount === 1,
    projectionActuallyOmitsSummarizedPrefix: first.projection.omittedMessageCount > 0 && first.projection.projectedMessageCount < rows.length,
    repeatResumeDoesNotChurnBoundary: second.projection.status === "verified" && second.projection.boundary.boundaryId === first.projection.boundary.boundaryId && secondJournal.commitCount === firstJournal.commitCount,
    brokenPreservedHeadTriggersRecovery: recovered.recovered === true && recovered.recoveryReason.includes("projection_validation_failed"),
    failClosedRecoveryRebuildsFromCurrentRawTranscript: recovered.projection.status === "verified" && recovered.projection.rawMessageCount === brokenRows.length,
    recoveredBoundaryGetsNewCommit: recoveredJournal.commitCount === secondJournal.commitCount + 1 && recoveredJournal.latestCommit.boundaryId === recovered.projection.boundary.boundaryId,
    recoveryProofIsRecorded: proofs.valid === true && proofs.proofCount === 3 && proofs.latestProof.recovered === true,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, first: first.projection, second: second.projection, recovered: recovered.projection, firstJournal, secondJournal, recoveredJournal, proofs }, null, 2));
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
