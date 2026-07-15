import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptFile = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptFile), "..");
const phase = process.argv.find(arg => arg.startsWith("--phase="))?.slice("--phase=".length) || "parent";
const stateFile = process.env.CCM_PHASE295_STATE_FILE || "";
const groupId = process.env.CCM_PHASE295_GROUP_ID || "";
const sessionId = process.env.CCM_PHASE295_SESSION_ID || "";

function rowsForSession() {
  return Array.from({ length: 28 }, (_, index) => ({
    id: `phase295-message-${index + 1}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "group-main" : undefined,
    content: `${index === 0 ? "PHASE295_RESTART_SENTINEL " : ""}${`durable restart context ${index + 1} `.repeat(420)}`,
    group_session_id: sessionId,
    timestamp: new Date(Date.UTC(2026, 6, 15, 3, index)).toISOString(),
  }));
}

if (phase === "crash") {
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
  const compaction = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-compaction.js"));
  const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
  const compactHead = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));
  const rows = rowsForSession();
  storage.saveGroupMessages(groupId, rows, sessionId);
  const transcriptPath = storage.getGroupChatSessionMessagesFile(groupId, sessionId);
  const result = await compaction.compactGroupConversationMemory({
    groupId,
    groupSessionId: sessionId,
    messages: rows,
    memory: memory.createEmptyGroupMemory(groupId, sessionId),
    transcriptPath,
    force: true,
    config: { minKeepMessages: 6, minKeepTokens: 3000, maxKeepTokens: 7000 },
  });
  assert.equal(result.compacted, true);
  const saved = memory.saveGroupMemory(groupId, result.memory, sessionId);
  const journal = boundary.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const headBeforeCrash = compactHead.readGroupCompactHead(groupId, sessionId);
  fs.writeFileSync(stateFile, JSON.stringify({
    schema: "ccm-phase295-crash-window-v1",
    ccmDir: path.dirname(path.dirname(transcriptPath)),
    transcriptPath,
    boundaryFile: journal.file,
    memoryBoundaryId: saved.compactBoundary?.id || "",
    receiptChecksum: saved.compaction?.compactTransactionReceipt?.receipt_checksum || "",
    journalCommitCount: journal.commitCount,
    journalBoundaryId: journal.latestCommit?.boundaryId || "",
    compactHeadBeforeCrash: headBeforeCrash,
    rawMessageCount: rows.length,
  }, null, 2), "utf-8");
  process.exit(73);
}

if (phase === "restart") {
  const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
  const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
  const boundary = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-boundary-journal.js"));
  const compactHead = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-compact-head.js"));
  const rows = storage.getGroupMessages(groupId, sessionId);
  const stored = memory.loadGroupMemory(groupId, sessionId);
  const headBeforeResume = compactHead.readGroupCompactHead(groupId, sessionId);
  const journalBefore = boundary.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const first = memory.prepareGroupMemoryResumeProjection(groupId, sessionId, rows, stored, {
    recentLimit: 6,
    olderLimit: 10,
    minKeepMessages: 6,
    minKeepTokens: 3000,
    maxKeepTokens: 7000,
  });
  const headAfterFirst = compactHead.readGroupCompactHead(groupId, sessionId);
  const journalAfterFirst = boundary.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const second = memory.prepareGroupMemoryResumeProjection(groupId, sessionId, rows, memory.loadGroupMemory(groupId, sessionId), {
    recentLimit: 6,
    olderLimit: 10,
    minKeepMessages: 6,
    minKeepTokens: 3000,
    maxKeepTokens: 7000,
  });
  const headAfterSecond = compactHead.readGroupCompactHead(groupId, sessionId);
  const tamperedStored = memory.loadGroupMemory(groupId, sessionId);
  const tamperedReceipt = {
    ...(tamperedStored.compaction?.compactTransactionReceipt || {}),
    receipt_checksum: "tampered-restart-receipt",
  };
  const tamperedRecovery = compactHead.reconcileGroupCompactHeadFromMemory({
    groupId,
    groupSessionId: sessionId,
    memory: {
      ...tamperedStored,
      compaction: { ...(tamperedStored.compaction || {}), compactTransactionReceipt: tamperedReceipt },
      compactBoundary: {
        ...(tamperedStored.compactBoundary || {}),
        compactTransactionReceipt: tamperedReceipt,
      },
    },
  });
  const headAfterTamper = compactHead.readGroupCompactHead(groupId, sessionId);
  const journalAfterSecond = boundary.readGroupMemoryBoundaryJournal(groupId, sessionId);
  const proofs = boundary.readGroupMemoryResumeProjectionProofs(groupId, sessionId);
  const bundle = memory.buildAgentMemoryContextBundle(groupId, "phase295-worker", "verify crash restart context", {
    groupSessionId: sessionId,
    taskAgentSessionId: "tas_phase295_restart",
  });
  fs.writeFileSync(stateFile, JSON.stringify({
    schema: "ccm-phase295-restart-result-v1",
    ccmDir: path.dirname(path.dirname(storage.getGroupChatSessionMessagesFile(groupId, sessionId))),
    rawMessageCount: rows.length,
    headBeforeResume,
    headAfterFirst,
    headAfterSecond,
    headAfterTamper,
    tamperedRecovery,
    journalBefore: { commitCount: journalBefore.commitCount, boundaryId: journalBefore.latestCommit?.boundaryId || "" },
    journalAfterFirst: { commitCount: journalAfterFirst.commitCount, boundaryId: journalAfterFirst.latestCommit?.boundaryId || "" },
    journalAfterSecond: { commitCount: journalAfterSecond.commitCount, boundaryId: journalAfterSecond.latestCommit?.boundaryId || "" },
    first: {
      boundaryId: first.projection?.boundary?.boundaryId || "",
      projectionChecksum: first.projection?.projectionChecksum || "",
      consistency: first.projection?.roundTripConsistency || null,
      compactHeadRecovery: first.compactHeadRecovery || null,
      skippedFullSnapshotRefresh: first.skippedFullSnapshotRefresh,
    },
    second: {
      boundaryId: second.projection?.boundary?.boundaryId || "",
      projectionChecksum: second.projection?.projectionChecksum || "",
      consistency: second.projection?.roundTripConsistency || null,
      compactHeadRecovery: second.compactHeadRecovery || null,
      skippedFullSnapshotRefresh: second.skippedFullSnapshotRefresh,
    },
    proofs: {
      valid: proofs.valid,
      proofCount: proofs.proofCount,
      recent: proofs.recentProofs.map(item => ({
        boundaryId: item.boundary?.boundaryId || "",
        compactHeadRecovery: item.compactHeadRecovery || null,
        roundTripConsistency: item.roundTripConsistency || null,
      })),
    },
    bundle: {
      compactHeadId: bundle.compact_head?.head_id || "",
      compactHeadGeneration: Number(bundle.compact_head?.generation || 0),
      boundaryId: bundle.compaction?.resumeProjection?.boundary?.boundaryId || "",
      consistencyDelta: Number(bundle.compaction?.resumeProjection?.roundTripConsistency?.delta || 0),
      renderedCarriesRecovery: String(bundle.rendered_text || "").includes("compact-head restart recovery"),
    },
  }, null, 2), "utf-8");
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase295-restart-home-"));
const crashState = path.join(tempHome, "crash-state.json");
const restartState = path.join(tempHome, "restart-state.json");
const testGroupId = `phase295-restart-${process.pid}-${Date.now().toString(36)}`;
const testSessionId = `gcs_phase295_${Date.now().toString(36)}`;
const childEnv = {
  ...process.env,
  HOME: tempHome,
  USERPROFILE: tempHome,
  CCM_PHASE295_GROUP_ID: testGroupId,
  CCM_PHASE295_SESSION_ID: testSessionId,
};

try {
  const crash = spawnSync(process.execPath, [scriptFile, "--phase=crash"], {
    cwd: root,
    env: { ...childEnv, CCM_PHASE295_STATE_FILE: crashState },
    encoding: "utf-8",
    timeout: 60_000,
  });
  assert.equal(crash.status, 73, JSON.stringify({ status: crash.status, stdout: crash.stdout, stderr: crash.stderr }, null, 2));
  assert.equal(fs.existsSync(crashState), true, "crash process must durably write its window evidence before exit");
  const before = JSON.parse(fs.readFileSync(crashState, "utf-8"));

  const restart = spawnSync(process.execPath, [scriptFile, "--phase=restart"], {
    cwd: root,
    env: { ...childEnv, CCM_PHASE295_STATE_FILE: restartState },
    encoding: "utf-8",
    timeout: 60_000,
  });
  assert.equal(restart.status, 0, JSON.stringify({ status: restart.status, stdout: restart.stdout, stderr: restart.stderr }, null, 2));
  assert.equal(fs.existsSync(restartState), true, "restart process must write recovery evidence");
  const after = JSON.parse(fs.readFileSync(restartState, "utf-8"));

  const homePrefix = path.join(tempHome, ".cc-connect").toLowerCase();
  const checks = {
    childProcessesUseIsolatedHome: String(before.ccmDir || "").toLowerCase().startsWith(homePrefix)
      && String(after.ccmDir || "").toLowerCase().startsWith(homePrefix),
    crashWindowCommitsMemoryAndJournalOnly: before.journalCommitCount === 1
      && before.memoryBoundaryId === before.journalBoundaryId
      && before.receiptChecksum.length === 64
      && before.compactHeadBeforeCrash === null,
    restartBeginsWithoutCompactHead: after.headBeforeResume === null,
    restartRecoversHeadFromDurableReceipt: after.first.compactHeadRecovery?.status === "recovered"
      && after.first.compactHeadRecovery?.recovered === true
      && after.headAfterFirst?.boundary_id === before.memoryBoundaryId
      && after.headAfterFirst?.compact_transaction_receipt_checksum === before.receiptChecksum
      && after.headAfterFirst?.generation === 1,
    secondResumeIsIdempotent: after.second.compactHeadRecovery?.status === "current"
      && after.second.compactHeadRecovery?.recovered === false
      && after.headAfterSecond?.generation === 1
      && after.headAfterSecond?.head_checksum === after.headAfterFirst?.head_checksum,
    tamperedReceiptCannotAdvanceHead: after.tamperedRecovery?.status === "fail_closed"
      && after.tamperedRecovery?.issues?.includes("compact_transaction_receipt_checksum_invalid")
      && after.headAfterTamper?.generation === 1
      && after.headAfterTamper?.head_checksum === after.headAfterSecond?.head_checksum,
    boundaryJournalDoesNotChurnAcrossRestart: after.journalBefore.commitCount === 1
      && after.journalAfterFirst.commitCount === 1
      && after.journalAfterSecond.commitCount === 1
      && after.first.boundaryId === before.memoryBoundaryId
      && after.second.boundaryId === before.memoryBoundaryId,
    writeLoadRoundTripIsConsistent: after.first.consistency?.status === "consistent"
      && after.first.consistency?.delta === 0
      && after.second.consistency?.status === "consistent"
      && after.second.consistency?.delta === 0,
    rawTranscriptRemainsComplete: before.rawMessageCount === 28 && after.rawMessageCount === 28,
    restartProofsCarryRecoveryAndConsistency: after.proofs.valid === true
      && after.proofs.proofCount >= 2
      && after.proofs.recent.some(item => item.compactHeadRecovery?.status === "recovered")
      && after.proofs.recent.every(item => item.roundTripConsistency?.delta === 0),
    childAgentBundleUsesRecoveredHead: after.bundle.compactHeadId === after.headAfterSecond?.head_id
      && after.bundle.compactHeadGeneration === 1
      && after.bundle.boundaryId === before.memoryBoundaryId
      && after.bundle.consistencyDelta === 0
      && after.bundle.renderedCarriesRecovery === true,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, before, after }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase295-compact-restart-soak-selftest-v1", checks }, null, 2)}\n`);
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
