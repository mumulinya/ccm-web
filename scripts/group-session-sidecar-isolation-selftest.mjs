import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const storage = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "storage.js"));
const center = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const groupId = `phase224-sidecars-${process.pid}-${Date.now().toString(36)}`;
const sessionA = `gcs_${Date.now().toString(36)}_sidecar_a`;
const sessionB = `gcs_${Date.now().toString(36)}_sidecar_b`;

function rowsFor(sessionId, sentinel, targetPath) {
  return Array.from({ length: 18 }, (_, index) => ({
    id: `${sessionId}-message-${index + 1}`,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "main" : undefined,
    content: `${sentinel} ${targetPath} ${`session context ${index + 1} `.repeat(220)}`,
    group_session_id: sessionId,
    timestamp: new Date(Date.UTC(2026, 6, 13, 2, index)).toISOString(),
  }));
}

const rowsA = rowsFor(sessionA, "PHASE224_SESSION_A_SENTINEL", "src/session-a.ts");
const rowsB = rowsFor(sessionB, "PHASE224_SESSION_B_SENTINEL", "src/session-b.ts");
const messageFiles = [
  storage.getGroupChatSessionMessagesFile(groupId, sessionA),
  storage.getGroupChatSessionMessagesFile(groupId, sessionB),
];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

try {
  storage.saveGroupMessages(groupId, rowsA, sessionA);
  storage.saveGroupMessages(groupId, rowsB, sessionB);
  memory.prepareGroupMemoryResumeProjection(groupId, sessionA, rowsA, memory.createEmptyGroupMemory(groupId, sessionA), {
    recentLimit: 5, olderLimit: 8, minKeepMessages: 5, minKeepTokens: 2500, maxKeepTokens: 5000,
  });
  memory.prepareGroupMemoryResumeProjection(groupId, sessionB, rowsB, memory.createEmptyGroupMemory(groupId, sessionB), {
    recentLimit: 5, olderLimit: 8, minKeepMessages: 5, minKeepTokens: 2500, maxKeepTokens: 5000,
  });
  const planChecksumA = String(memory.loadGroupMemory(groupId, sessionA)?.compaction?.apiMicroCompactEditPlan?.planChecksum || "");
  assert.ok(planChecksumA, "session A compact plan checksum must be available");

  memory.recordGroupPostCompactCandidateUsageLedger(groupId, {
    groupSessionId: sessionA,
    targetProject: "api",
    taskId: "phase224-task-a",
    rows: [{ candidate_id: "phase224-candidate-a", kind: "file", value: "src/session-a.ts", usage_state: "used", referenced: true }],
  });
  memory.recordGroupPostCompactCandidateUsageLedger(groupId, {
    groupSessionId: sessionB,
    targetProject: "api",
    taskId: "phase224-task-b",
    rows: [{ candidate_id: "phase224-candidate-b", kind: "file", value: "src/session-b.ts", usage_state: "ignored", referenced: true }],
  });

  const replayLedgerA = center.getGroupCompactBoundaryReplayRepairLedgerFile(groupId, sessionA);
  const replayWorkA = center.getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId, sessionA);
  writeJson(replayLedgerA, {
    schema: "ccm-compact-boundary-replay-repair-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: sessionA,
    entries: [{ attempt_id: "phase224-replay-a", status: "warn", score: 80, target_project: "api", required_action_count: 1, gap_count: 1, rendered_hash: "session-a-hash", at: new Date().toISOString() }],
    stats: {},
    updatedAt: new Date().toISOString(),
  });
  writeJson(replayWorkA, {
    schema: "ccm-compact-boundary-replay-repair-work-items-v1",
    version: 1,
    groupId,
    groupSessionId: sessionA,
    items: [{ id: "phase224-replay-work-a", group_id: groupId, group_session_id: sessionA, status: "pending", priority: "high", source: "compact_boundary_replay_repair", target_project: "api", instruction: "PHASE224_REPLAY_A_ONLY" }],
    stats: { total: 1, openItemCount: 1, pendingCount: 1 },
    updatedAt: new Date().toISOString(),
  });

  const proofFileA = memory.getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionA);
  writeJson(proofFileA, {
    schema: "ccm-group-api-microcompact-native-apply-proof-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: sessionA,
    entries: [{ entry_id: "phase224-proof-a", group_id: groupId, group_session_id: sessionA, target_project: "api", plan_checksum: planChecksumA, proof_status: "advisory", generated_at: new Date().toISOString() }],
    stats: {},
    totals: { advisory: 1, total: 1 },
    updatedAt: new Date().toISOString(),
  });

  const bundleA = memory.buildAgentMemoryContextBundle(groupId, "api", "继续 PHASE224_SESSION_A_SENTINEL", { groupSessionId: sessionA, maxRenderedChars: 30000, includeGlobalClaudeMemory: false });
  const bundleB = memory.buildAgentMemoryContextBundle(groupId, "api", "继续 PHASE224_SESSION_B_SENTINEL", { groupSessionId: sessionB, maxRenderedChars: 30000, includeGlobalClaudeMemory: false });
  const candidateA = memory.buildGroupPostCompactCandidateUsageSummary(groupId, { groupSessionId: sessionA, targetProject: "api" });
  const candidateB = memory.buildGroupPostCompactCandidateUsageSummary(groupId, { groupSessionId: sessionB, targetProject: "api" });
  const centerA = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerB = center.getMemoryCenterScope("group", `${groupId}::${sessionB}`);

  const reloadA = memory.getGroupMemoryReloadLedgerFile(groupId, sessionA);
  const reloadB = memory.getGroupMemoryReloadLedgerFile(groupId, sessionB);
  const dispatchA = memory.getGroupPostCompactDispatchLedgerFile(groupId, sessionA);
  const dispatchB = memory.getGroupPostCompactDispatchLedgerFile(groupId, sessionB);
  const candidateFileA = memory.getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionA);
  const candidateFileB = memory.getGroupPostCompactCandidateUsageLedgerFile(groupId, sessionB);
  const proofFileB = memory.getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId, sessionB);
  const legacyFiles = [
    memory.getGroupMemoryReloadLedgerFile(groupId),
    memory.getGroupPostCompactDispatchLedgerFile(groupId),
    memory.getGroupPostCompactCandidateUsageLedgerFile(groupId),
    memory.getGroupReplayRepairLedgerFile(groupId),
    memory.getGroupReplayRepairWorkItemsFile(groupId),
    memory.getGroupApiMicrocompactNativeApplyProofLedgerFile(groupId),
  ];

  const checks = {
    sidecarPathsAreSessionScoped: [reloadA, reloadB, dispatchA, dispatchB, candidateFileA, candidateFileB, proofFileA, proofFileB, replayLedgerA, replayWorkA].every(file => file.includes(`${path.sep}${groupId}${path.sep}`)),
    reloadLedgersAreIndependent: reloadA !== reloadB && JSON.parse(fs.readFileSync(reloadA, "utf-8")).groupSessionId === sessionA && JSON.parse(fs.readFileSync(reloadB, "utf-8")).groupSessionId === sessionB,
    dispatchLedgersAreIndependent: dispatchA !== dispatchB && fs.existsSync(dispatchA) && fs.existsSync(dispatchB),
    candidateUsageDoesNotCrossSessions: candidateA.candidate_count === 1
      && candidateA.recent_entries?.[0]?.candidate_id === "phase224-candidate-a"
      && !candidateA.recent_entries?.some(entry => entry.candidate_id === "phase224-candidate-b")
      && candidateB.candidate_count === 1
      && candidateB.recent_entries?.[0]?.candidate_id === "phase224-candidate-b"
      && !candidateB.recent_entries?.some(entry => entry.candidate_id === "phase224-candidate-a"),
    replayRepairOnlyEntersOwningSession: bundleA.compaction.replayRepairLedger?.latestAttemptId === "phase224-replay-a" && bundleA.compaction.replayRepairWorkItems?.openItemCount === 1 && !bundleB.compaction.replayRepairLedger && !bundleB.compaction.replayRepairWorkItems,
    apiProofOnlyEntersOwningSession: bundleA.compaction.apiMicrocompactNativeApplyProofLedger.entry_count === 1
      && bundleA.compaction.apiMicrocompactNativeApplyProofLedger.recent_entries?.[0]?.entry_id === "phase224-proof-a"
      && bundleB.compaction.apiMicrocompactNativeApplyProofLedger.entry_count === 0,
    memoryCenterProofUsesSelectedSession: centerA.postCompactUsage?.apiMicrocompactNativeApplyProof?.groupSessionId === sessionA
      && centerA.postCompactUsage?.apiMicrocompactNativeApplyProof?.ledgerFile === proofFileA
      && centerA.postCompactUsage?.apiMicrocompactNativeApplyProof?.ledgerEntryCount === 1
      && centerB.postCompactUsage?.apiMicrocompactNativeApplyProof?.groupSessionId === sessionB
      && centerB.postCompactUsage?.apiMicrocompactNativeApplyProof?.ledgerFile === proofFileB
      && centerB.postCompactUsage?.apiMicrocompactNativeApplyProof?.ledgerEntryCount === 0,
    memoryCenterReplayUsesSelectedSession: centerA.postCompactUsage?.boundaryReplay?.repairLedger?.file === replayLedgerA
      && centerA.postCompactUsage?.boundaryReplay?.repairWorkItems?.file === replayWorkA
      && centerB.postCompactUsage?.boundaryReplay?.repairLedger?.file === memory.getGroupReplayRepairLedgerFile(groupId, sessionB)
      && centerB.postCompactUsage?.boundaryReplay?.repairWorkItems?.file === memory.getGroupReplayRepairWorkItemsFile(groupId, sessionB),
    renderedContextDoesNotCrossSessionSentinels: String(bundleA.rendered_text).includes("PHASE224_SESSION_A_SENTINEL") && !String(bundleA.rendered_text).includes("PHASE224_SESSION_B_SENTINEL") && String(bundleB.rendered_text).includes("PHASE224_SESSION_B_SENTINEL") && !String(bundleB.rendered_text).includes("PHASE224_SESSION_A_SENTINEL"),
    legacyGroupLevelHotLedgersRemainAbsent: legacyFiles.every(file => !fs.existsSync(file)),
    rawSourcesPointToSessionLedgers: bundleA.raw_sources.group_memory_reload_ledger_file === reloadA && bundleA.raw_sources.group_post_compact_dispatch_ledger_file === dispatchA && bundleA.raw_sources.group_post_compact_candidate_usage_ledger_file === candidateFileA && bundleA.raw_sources.group_replay_repair_ledger_file === replayLedgerA,
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, candidateA, candidateB, bundleA: { compaction: bundleA.compaction, raw_sources: bundleA.raw_sources }, bundleB: { compaction: bundleB.compaction, raw_sources: bundleB.raw_sources } }, null, 2));

  const deletedA = memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
  const deletionChecks = {
    deletingSessionARemovesItsHotSidecars: [reloadA, dispatchA, candidateFileA, proofFileA, replayLedgerA, replayWorkA].every(file => !fs.existsSync(file)),
    deletingSessionAKeepsSessionB: [reloadB, dispatchB, candidateFileB, memory.getGroupMemoryFile(groupId, sessionB)].every(file => fs.existsSync(file)),
    deletionReportsBoundaryAndSidecars: deletedA.deletedFiles >= 8,
  };
  assert.equal(Object.values(deletionChecks).every(Boolean), true, JSON.stringify({ deletionChecks, deletedA }, null, 2));
  process.stdout.write(`${JSON.stringify({ pass: true, checks: { ...checks, ...deletionChecks } }, null, 2)}\n`);
} finally {
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
  try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
  for (const file of messageFiles.flatMap(file => [file, `${file}.bak`])) {
    try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
  }
  for (const dir of [...new Set(messageFiles.map(file => path.dirname(file)))]) {
    try { if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); } catch {}
  }
}
