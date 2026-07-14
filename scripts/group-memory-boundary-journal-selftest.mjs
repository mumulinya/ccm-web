import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-boundary-journal-"));

function messages(...ids) {
  return ids.map((id, index) => ({ id, role: index % 2 ? "assistant" : "user", content: `message ${id}` }));
}

function memoryFor(groupId, sessionId, rows, throughIndex, boundaryId) {
  const summary = { primaryRequest: `summary through ${rows[throughIndex].id}`, decisions: ["keep durable boundary"] };
  const base = { groupId, groupSessionId: sessionId, conversationSummary: summary, messageDigest: `summary ${rows[throughIndex].id}` };
  const summaryChecksum = api.calculateGroupMemorySummaryChecksum(base);
  const kept = rows.slice(throughIndex + 1);
  const segment = {
    schema: "ccm-group-preserved-segment-v1",
    keepIndex: throughIndex + 1,
    preservedMessageCount: kept.length,
    preservedMessageIds: kept.map(row => row.id),
    omittedPreservedMessageIds: 0,
    firstPreservedMessageId: kept[0]?.id || "",
    lastPreservedMessageId: kept.at(-1)?.id || "",
    summarizedThroughMessageId: rows[throughIndex].id,
    summaryChecksum,
  };
  const boundary = {
    id: boundaryId,
    summarizedThroughMessageId: rows[throughIndex].id,
    summaryChecksum,
    preservedSegment: segment,
    post_compact_restore: { summaryChecksum, preservedSegment: segment },
  };
  return { ...base, compactBoundary: boundary, compaction: { summaryChecksum, lastCompactedMessageId: rows[throughIndex].id } };
}

function projection(input, rootDir = tempRoot) {
  return api.buildGroupMemoryResumeProjection({ ...input, rootDir });
}

try {
  const groupId = "group-a";
  const sessionId = "session-a";
  const initialRows = messages("m1", "m2", "m3", "m4", "m5");
  const initialMemory = memoryFor(groupId, sessionId, initialRows, 1, "boundary-1");
  const firstCommit = api.commitGroupMemoryCompactBoundary({ groupId, sessionId, messages: initialRows, memory: initialMemory, rootDir: tempRoot });
  const normal = projection({ groupId, sessionId, messages: initialRows, memory: initialMemory });
  const appendedRows = [...initialRows, { id: "m6", role: "user", content: "new after compact" }];
  const appended = projection({ groupId, sessionId, messages: appendedRows, memory: initialMemory });
  const headMissing = projection({ groupId, sessionId, messages: initialRows.filter(row => row.id !== "m3"), memory: initialMemory });
  const tailMissing = projection({ groupId, sessionId, messages: initialRows.filter(row => row.id !== "m5"), memory: initialMemory });
  const summaryTamperedMemory = { ...initialMemory, conversationSummary: { primaryRequest: "tampered" } };
  const summaryTampered = projection({ groupId, sessionId, messages: initialRows, memory: summaryTamperedMemory });

  const secondMemory = memoryFor(groupId, sessionId, appendedRows, 2, "boundary-2");
  const secondCommit = api.commitGroupMemoryCompactBoundary({ groupId, sessionId, messages: appendedRows, memory: secondMemory, rootDir: tempRoot });
  const latest = api.readGroupMemoryBoundaryJournal(groupId, sessionId, { rootDir: tempRoot });
  const latestProjection = projection({ groupId, sessionId, messages: appendedRows, memory: secondMemory });

  const crashRoot = path.join(tempRoot, "crash");
  api.commitGroupMemoryCompactBoundary({ groupId, sessionId, messages: initialRows, memory: initialMemory, rootDir: crashRoot });
  const uncommittedMemory = memoryFor(groupId, sessionId, appendedRows, 2, "boundary-uncommitted");
  const crashWindow = projection({ groupId, sessionId, messages: appendedRows, memory: uncommittedMemory }, crashRoot);

  const crossRoot = path.join(tempRoot, "cross-session");
  api.commitGroupMemoryCompactBoundary({ groupId, sessionId: "session-a", messages: initialRows, memory: initialMemory, rootDir: crossRoot });
  const sessionBMemory = memoryFor(groupId, "session-b", initialRows, 1, "boundary-b");
  const sessionAProjection = projection({ groupId, sessionId: "session-a", messages: initialRows, memory: initialMemory }, crossRoot);
  const sessionBProjection = projection({ groupId, sessionId: "session-b", messages: initialRows, memory: sessionBMemory }, crossRoot);

  const tamperRoot = path.join(tempRoot, "tamper");
  api.commitGroupMemoryCompactBoundary({ groupId, sessionId, messages: initialRows, memory: initialMemory, rootDir: tamperRoot });
  const tamperFile = api.getGroupMemoryBoundaryJournalFile(groupId, sessionId, { rootDir: tamperRoot });
  const tamperedRow = JSON.parse(fs.readFileSync(tamperFile, "utf-8").trim());
  tamperedRow.boundaryChecksum = "tampered-boundary-checksum";
  fs.writeFileSync(tamperFile, `${JSON.stringify(tamperedRow)}\n`, "utf-8");
  const tampered = projection({ groupId, sessionId, messages: initialRows, memory: initialMemory }, tamperRoot);
  const quarantined = api.quarantineInvalidGroupMemoryBoundaryJournal(groupId, sessionId, { rootDir: tamperRoot });

  const proof = api.recordGroupMemoryResumeProjectionProof(appended, { rootDir: tempRoot });
  const proofs = api.readGroupMemoryResumeProjectionProofs(groupId, sessionId, { rootDir: tempRoot });
  const deletionRoot = path.join(tempRoot, "delete");
  api.commitGroupMemoryCompactBoundary({ groupId, sessionId, messages: initialRows, memory: initialMemory, rootDir: deletionRoot });
  api.recordGroupMemoryResumeProjectionProof(projection({ groupId, sessionId, messages: initialRows, memory: initialMemory }, deletionRoot), { rootDir: deletionRoot });
  const deleted = api.deleteGroupMemoryBoundaryArtifacts(groupId, sessionId, { rootDir: deletionRoot });

  const checks = {
    boundaryCommitIsDurable: firstCommit.committed === true && fs.existsSync(firstCommit.journal.file),
    normalResumeUsesProjection: normal.status === "verified" && normal.useProjection === true && normal.omittedMessageCount === 2,
    preBoundaryMessagesAreNotProjected: normal.projectedMessageIds.join(",") === "m3,m4,m5",
    appendAfterCompactKeepsCommittedPrefixValid: appended.status === "verified" && appended.messagesAfterBoundaryCount === 1 && appended.projectedMessageIds.at(-1) === "m6",
    missingHeadFailsClosed: headMissing.status === "fail_closed_rebuild_required" && headMissing.mustUseFullRawTranscript === true,
    missingTailFailsClosed: tailMissing.status === "fail_closed_rebuild_required" && tailMissing.mustUseFullRawTranscript === true,
    summaryTamperFailsClosed: summaryTampered.status === "fail_closed_rebuild_required" && summaryTampered.reason.includes("summary_checksum_matches"),
    multipleBoundariesUseLatestCommit: secondCommit.committed === true && latest.commitCount === 2 && latest.latestCommit.boundaryId === "boundary-2" && latestProjection.status === "verified",
    saveBeforeCommitCrashFailsClosed: crashWindow.status === "fail_closed_rebuild_required" && crashWindow.reason === "uncommitted_memory_boundary",
    sessionAJournalDoesNotAuthorizeSessionB: sessionAProjection.status === "verified" && sessionBProjection.reason === "boundary_commit_missing",
    tamperedBoundaryChecksumIsRejected: tampered.status === "fail_closed_rebuild_required" && tampered.reason === "boundary_journal_invalid",
    invalidJournalCanBeQuarantined: quarantined.rotated === true && fs.existsSync(quarantined.target) && !fs.existsSync(tamperFile),
    resumeProofIsDurable: proof.proofId && proofs.valid === true && proofs.proofCount === 1 && proofs.latestProof.projectionChecksum === appended.projectionChecksum,
    sessionDeletionRemovesBoundaryArtifacts: deleted.deletedFiles === 2 && deleted.files.every(file => !fs.existsSync(file)),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, normal, appended, headMissing, tailMissing, summaryTampered, latest, latestProjection, crashWindow, sessionAProjection, sessionBProjection, tampered, quarantined, proofs, deleted }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks }, null, 2)}\n`);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
