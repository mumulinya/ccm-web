import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "post-compact-closure-feedback-exact-session-selftest");
const home = path.join(scratch, "home");
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));
const collaborationMemory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const memoryCenter = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));

const groupId = "phase310-closure-feedback-group";
const sessionA = "gcs_phase310_a";
const sessionB = "gcs_phase310_b";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
const resolutionDoc = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";
const rankingTask = "phase310 deployment schema validation current source sentinel";
const conflictTask = "phase310 release receipt arbitration current source sentinel";
const shared = {
  workItemId: "phase310-shared-work-item",
  packetId: "phase310-shared-packet",
  bindingId: "phase310-shared-binding",
  taskId: "phase310-shared-task",
  executionId: "phase310-shared-execution",
  failedRetryId: "phase310-shared-failed-retry",
  failedOutcomeId: "phase310-shared-failed-outcome",
  correctedRetryId: "phase310-shared-corrected-retry",
  correctedOutcomeId: "phase310-shared-corrected-outcome",
};

function closureRow(groupSessionId, sentinel) {
  return {
    groupId,
    groupSessionId,
    source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair",
    component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
    target_project: "api",
    work_item_id: shared.workItemId,
    assignment_id: "phase310-shared-assignment",
    dispatch_key: "phase310-shared-dispatch",
    worker_context_packet_id: shared.packetId,
    binding_id: shared.bindingId,
    compact_retry_id: shared.failedRetryId,
    compact_outcome_id: shared.failedOutcomeId,
    corrected_compact_retry_id: shared.correctedRetryId,
    corrected_compact_outcome_id: shared.correctedOutcomeId,
    completion_preservation_completion_doc_rel_paths: [closureDoc, `${sentinel}.md`],
    completion_preservation_required_doc_rel_paths: [closureDoc],
    completion_preservation_work_item_ids: ["phase310-shared-completion-work"],
    completion_preservation_timeline_binding_ids: ["phase310-shared-timeline"],
    completion_preservation_historical_task_agent_session_ids: ["phase310-shared-historical-task"],
    completion_preservation_historical_native_session_ids: ["phase310-shared-historical-native"],
    completion_preservation_current_session_binding_id: `phase310-current-binding-${groupSessionId}`,
    completion_preservation_current_task_agent_session_id: `phase310-current-task-${groupSessionId}`,
    completion_preservation_current_native_session_id: `phase310-current-native-${groupSessionId}`,
    corrected_retry_proof: {
      failed_retry_id: shared.failedRetryId,
      failed_outcome_id: shared.failedOutcomeId,
      corrected_retry_id: shared.correctedRetryId,
      corrected_outcome_id: shared.correctedOutcomeId,
      exact_identity_restored: true,
      current_session_boundary_restored: true,
      historical_sessions_remain_evidence_only: true,
    },
    completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
    resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
    completedAt: "2026-07-15T18:00:00.000Z",
  };
}

function distillClosure(scopeId, groupSessionId, sentinel) {
  return typed.distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(scopeId, {
    rows: [closureRow(groupSessionId, sentinel)],
  }, {
    sourceGroupId: groupId,
    groupSessionId,
    reason: `phase310-${groupSessionId}-closure`,
    updatedAt: "2026-07-15T18:00:00.000Z",
  });
}

function usageRow(taskText, usageState, marker, options = {}) {
  return {
    target_project: "api",
    agent: options.agent || "codex",
    task_id: shared.taskId,
    task_text: taskText,
    execution_id: shared.executionId,
    worker_context_packet_id: options.packetId || `${shared.packetId}-${marker}`,
    binding_id: shared.bindingId,
    task_agent_session_id: options.taskSessionId || `phase310-task-${marker}`,
    native_session_id: options.nativeSessionId || `phase310-native-${marker}`,
    receipt_source: options.receiptSource || "task.receipt",
    receipt_status: "verified",
    rel_path: closureDoc,
    usage_state: usageState,
    current_source_verified: ["used", "verified"].includes(usageState),
    compliant: true,
    reason: usageState === "ignored" ? `${marker} not relevant after current-source inspection` : `${marker} current source reverified`,
    conflict_resolution: options.conflictResolution === true,
    conflict_parent_arbitration_state: options.parentState || "",
    conflict_parent_fingerprint: options.parentFingerprint || "",
    conflict_parent_ratio: options.parentRatio || 0,
    conflict_parent_positive_weight: options.parentPositiveWeight || 0,
    conflict_parent_ignored_weight: options.parentIgnoredWeight || 0,
  };
}

function record(scopeId, groupSessionId, rows, generatedAt) {
  return typed.recordPostCompactCompletionMemoryPreservationClosureUsage(scopeId, {
    sourceGroupId: groupId,
    groupSessionId,
    rows,
    generatedAt,
  });
}

function summary(scopeId, groupSessionId, task, now = "2026-07-15T18:20:00.000Z") {
  return typed.buildPostCompactCompletionMemoryPreservationClosureUsageSummary(scopeId, {
    sourceGroupId: groupId,
    groupSessionId,
    targetProject: "api",
    task,
    now,
  });
}

function buildBundle(groupSessionId, task, marker) {
  return collaborationMemory.buildAgentMemoryContextBundle(groupId, "api", task, {
    groupSessionId,
    includeGlobalClaudeMemory: false,
    includeProjectMemory: false,
    maxTypedMemory: 8,
    maxRenderedChars: 18000,
    taskId: `phase310-bundle-${marker}`,
    taskAgentSessionId: `phase310-bundle-task-${marker}`,
    nativeSessionId: `phase310-bundle-native-${marker}`,
    executionId: `phase310-bundle-execution-${marker}`,
    forcePostCompactCompletionMemoryPreservationRepairClosureRecall: true,
    generatedAt: "2026-07-15T18:20:00.000Z",
  });
}

distillClosure(scopeA, sessionA, "PHASE310_SESSION_A_SENTINEL");
distillClosure(scopeB, sessionB, "PHASE310_SESSION_B_SENTINEL");

record(scopeA, sessionA, [
  usageRow(rankingTask, "ignored", "ranking-a-1"),
  usageRow(rankingTask, "ignored", "ranking-a-2", { agent: "claudecode", receiptSource: "timeline_binding" }),
], "2026-07-15T18:01:00.000Z");
record(scopeB, sessionB, [
  usageRow(rankingTask, "verified", "ranking-b-1"),
  usageRow(rankingTask, "used", "ranking-b-2", { agent: "claudecode", receiptSource: "timeline_binding" }),
], "2026-07-15T18:02:00.000Z");

record(scopeA, sessionA, [
  usageRow(conflictTask, "used", "conflict-a-positive"),
  usageRow(conflictTask, "ignored", "conflict-a-ignored", { agent: "cursor", receiptSource: "timeline_binding" }),
], "2026-07-15T18:03:00.000Z");
record(scopeB, sessionB, [
  usageRow(conflictTask, "verified", "conflict-b-positive"),
], "2026-07-15T18:04:00.000Z");

const rankingA = summary(scopeA, sessionA, rankingTask);
const rankingB = summary(scopeB, sessionB, rankingTask);
const conflictBeforeA = summary(scopeA, sessionA, conflictTask);
const conflictBeforeB = summary(scopeB, sessionB, conflictTask);
const bundleRankingA = buildBundle(sessionA, rankingTask, "ranking-a");
const bundleRankingB = buildBundle(sessionB, rankingTask, "ranking-b");
const recallRankingA = bundleRankingA.post_compact_reinjection_repair_receipt_recall || {};
const recallRankingB = bundleRankingB.post_compact_reinjection_repair_receipt_recall || {};

const conflictFingerprint = "phase310-session-a-conflict-fingerprint";
record(scopeA, sessionA, [usageRow(conflictTask, "verified", "conflict-a-resolution", {
  conflictResolution: true,
  parentState: "contradictory_reverify_current_session",
  parentFingerprint: conflictFingerprint,
  parentRatio: conflictBeforeA.feedbackConflict?.conflict_ratio || 1,
  parentPositiveWeight: conflictBeforeA.feedbackConflict?.positive?.weighted_evidence || 1,
  parentIgnoredWeight: conflictBeforeA.feedbackConflict?.ignored?.weighted_evidence || 1,
})], "2026-07-15T18:05:00.000Z");

const conflictAfterA = summary(scopeA, sessionA, conflictTask);
const conflictAfterB = summary(scopeB, sessionB, conflictTask);
const usageLedgerA = typed.readPostCompactCompletionMemoryPreservationClosureUsageLedger(scopeA, { sourceGroupId: groupId, groupSessionId: sessionA });
const usageLedgerB = typed.readPostCompactCompletionMemoryPreservationClosureUsageLedger(scopeB, { sourceGroupId: groupId, groupSessionId: sessionB });
const legacyUsage = typed.readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId);
const typedLedgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
const typedLedgerB = typed.readGroupTypedMemoryDistillationLedger(scopeB);
const resolutionRowsA = typedLedgerA.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive?.rows || [];
const resolutionRowsB = typedLedgerB.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive?.rows || [];
const docsA = typed.scanGroupTypedMemoryDocuments(scopeA);
const docsB = typed.scanGroupTypedMemoryDocuments(scopeB);

const qualityIds = [
  "post_compact_completion_memory_preservation_closure_usage_feedback",
  "post_compact_completion_memory_preservation_closure_recall_priority",
  "post_compact_completion_memory_preservation_closure_feedback_aging_task_family",
  "post_compact_completion_memory_preservation_closure_feedback_evidence_confidence",
  "post_compact_completion_memory_preservation_closure_conflict_resolution",
];
const quality = memoryCenter.buildMemoryQualityReport({
  checkIds: qualityIds,
  groupIds: [groupId],
  groupSessionIds: [sessionA, sessionB],
  targetProject: "api",
  task: conflictTask,
  tasks: [],
  generatedAt: "2026-07-15T18:20:00.000Z",
  refresh: true,
});
const qualityChecks = Object.fromEntries(qualityIds.map(id => [id, (quality.checks || []).find(row => row.id === id) || {}]));
const reportsUseExactScopes = Object.values(qualityChecks).every(check => {
  const rows = check.report?.groups || [];
  return rows.length === 2 && rows.every(row => row.exactSession === true && [sessionA, sessionB].includes(row.groupSessionId));
});

function badBinding(groupSessionId) {
  const contract = {
    schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1",
    active: true,
    current_task_agent_session_id: "phase310-shared-receipt-task-session",
    current_native_session_id: "phase310-shared-receipt-native-session",
    memory_receipt_required_doc_rel_paths: [closureDoc],
  };
  return {
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
    binding_id: shared.bindingId,
    assignment_id: "phase310-shared-assignment",
    dispatch_key: "phase310-shared-dispatch",
    groupId,
    groupSessionId,
    group_session_id: groupSessionId,
    project: "api",
    task: "phase310 receipt repair exact session sentinel",
    worker_context_packet_id: shared.packetId,
    post_compact_reinjection_repair_receipt_memory_contract: contract,
    worker_context_packet: {
      packet_id: shared.packetId,
      group_session_id: groupSessionId,
      post_compact_reinjection_repair_receipt_memory_contract: contract,
      acceptance: { post_compact_reinjection_repair_receipt_memory_usage_required: true },
    },
    worker_context_packet_receipt: {
      worker_context_packet_id: shared.packetId,
      project: "api",
      status: "completed",
      task_agent_session_id: "phase310-shared-receipt-task-session",
      native_session_id: "phase310-shared-receipt-native-session",
      memoryUsed: [`${closureDoc}; usageState=verified`],
      memoryIgnored: [],
    },
    at: "2026-07-15T18:10:00.000Z",
  };
}

const bindingLedger = orchestrator.readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
fs.mkdirSync(path.dirname(bindingLedger.file), { recursive: true });
fs.writeFileSync(bindingLedger.file, `${JSON.stringify({
  schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
  version: 1,
  groupId,
  file: bindingLedger.file,
  entries: [badBinding(sessionA), badBinding(sessionB)],
  updatedAt: "2026-07-15T18:10:00.000Z",
}, null, 2)}\n`, "utf8");

const repairQualityIds = [
  "post_compact_reinjection_repair_receipt_memory_usage_receipt",
  "post_compact_reinjection_repair_receipt_memory_usage_repair_work_items",
  "post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_candidates",
  "post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_briefs",
];
const repairQuality = memoryCenter.buildMemoryQualityReport({
  checkIds: repairQualityIds,
  groupIds: [groupId],
  groupSessionIds: [sessionA, sessionB],
  targetProject: "api",
  tasks: [],
  generatedAt: "2026-07-15T18:20:00.000Z",
  refresh: true,
});
const repairChecks = Object.fromEntries(repairQualityIds.map(id => [id, (repairQuality.checks || []).find(row => row.id === id) || {}]));
const repairReportsUseExactScopes = Object.values(repairChecks).every(check => {
  const rows = check.report?.groups || [];
  return rows.length === 2 && rows.every(row => row.exactSession === true && [sessionA, sessionB].includes(row.groupSessionId));
});
const repairWorkA = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionA);
const repairWorkB = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionB);
const repairRowsA = (repairWorkA.items || []).filter(row => row.source === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair");
const repairRowsB = (repairWorkB.items || []).filter(row => row.source === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair");
const repairPlanA = orchestrator.readReplayRepairDispatchPlanLedgerForCoordinator(groupId, sessionA);
const repairPlanB = orchestrator.readReplayRepairDispatchPlanLedgerForCoordinator(groupId, sessionB);

const beforeDeleteB = {
  usageEntries: typed.readPostCompactCompletionMemoryPreservationClosureUsageLedger(scopeB, { sourceGroupId: groupId, groupSessionId: sessionB }).entries.length,
  docs: docsB.length,
  resolutionRows: resolutionRowsB.length,
  repairRows: repairRowsB.length,
  repairBriefs: (repairPlanB.briefs || []).length,
};
collaborationMemory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
const afterDeleteB = {
  usageEntries: typed.readPostCompactCompletionMemoryPreservationClosureUsageLedger(scopeB, { sourceGroupId: groupId, groupSessionId: sessionB }).entries.length,
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
  resolutionRows: (typed.readGroupTypedMemoryDistillationLedger(scopeB).postCompactCompletionMemoryPreservationClosureConflictResolutionArchive?.rows || []).length,
  repairRows: (memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionB).items || []).filter(row => row.source === "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair").length,
  repairBriefs: (orchestrator.readReplayRepairDispatchPlanLedgerForCoordinator(groupId, sessionB).briefs || []).length,
};

const checks = {
  usageLedgersUseSeparatePhysicalFiles: usageLedgerA.file !== usageLedgerB.file
    && usageLedgerA.groupSessionId === sessionA && usageLedgerB.groupSessionId === sessionB,
  sameLogicalIdsRemainSessionDistinct: usageLedgerA.entries.length >= 5 && usageLedgerB.entries.length >= 3
    && new Set(usageLedgerA.entries.map(row => row.entry_id)).size === usageLedgerA.entries.length
    && !usageLedgerA.entries.some(a => usageLedgerB.entries.some(b => a.entry_id === b.entry_id)),
  noBareGroupUsagePollution: legacyUsage.entries.length === 0,
  rankingFeedbackDoesNotCrossSessions: rankingA.recommendation === "deprioritize_closure_recall"
    && rankingB.recommendation === "promote_but_reverify_current_source",
  workerContextUsesExactRanking: recallRankingA.preservationClosureRecallSuppressed === true
    && !(recallRankingA.docRelPaths || []).includes(closureDoc)
    && recallRankingB.preservationClosureRecallSuppressed !== true
    && (recallRankingB.docRelPaths || []).includes(closureDoc),
  conflictExistsOnlyInSessionA: conflictBeforeA.feedbackConflictActive === true
    && conflictBeforeA.recommendation === "surface_conflict_reverify_current_session"
    && conflictBeforeB.feedbackConflictActive !== true,
  resolutionDistillsOnlyToSessionA: conflictAfterA.feedbackConflictResolution?.active === true
    && conflictAfterA.feedbackConflictResolution?.parent_conflict_fingerprint === conflictFingerprint
    && resolutionRowsA.length === 1
    && resolutionRowsB.length === 0
    && docsA.some(row => row.relPath === resolutionDoc)
    && !docsB.some(row => row.relPath === resolutionDoc),
  siblingSummaryUnaffectedByResolution: conflictAfterB.feedbackConflictActive === conflictBeforeB.feedbackConflictActive
    && conflictAfterB.recommendation === conflictBeforeB.recommendation
    && conflictAfterB.entryCount === conflictBeforeB.entryCount,
  qualityReportsEnumerateExactScopes: reportsUseExactScopes,
  receiptRepairChainUsesExactScopes: repairChecks[repairQualityIds[0]].status === "fail"
    && repairQualityIds.slice(1).every(id => repairChecks[id].status === "ok")
    && repairReportsUseExactScopes,
  receiptRepairArtifactsAreSessionOwned: repairRowsA.length === 1 && repairRowsB.length === 1
    && repairRowsA[0].id !== repairRowsB[0].id
    && repairRowsA[0].groupSessionId === sessionA && repairRowsB[0].groupSessionId === sessionB
    && repairPlanA.file !== repairPlanB.file
    && (repairPlanA.briefs || []).length === 1 && (repairPlanB.briefs || []).length === 1,
  deletingOneSessionPreservesSibling: JSON.stringify(afterDeleteB) === JSON.stringify(beforeDeleteB)
    && typed.scanGroupTypedMemoryDocuments(scopeA).length === 0,
  ledgersRemainBodyFree: !JSON.stringify({ usageLedgerA, usageLedgerB, typedLedgerA, typedLedgerB }).includes("raw_transcript_body"),
};

const failed = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const result = {
  schema: "ccm-post-compact-closure-feedback-exact-session-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    recommendations: {
      rankingA: rankingA.recommendation,
      rankingB: rankingB.recommendation,
      conflictBeforeA: conflictBeforeA.recommendation,
      conflictBeforeB: conflictBeforeB.recommendation,
      conflictAfterA: conflictAfterA.recommendation,
      conflictAfterB: conflictAfterB.recommendation,
    },
    usageFiles: [usageLedgerA.file, usageLedgerB.file],
    quality: Object.fromEntries(qualityIds.map(id => [id, {
      status: qualityChecks[id].status || "",
      scopes: (qualityChecks[id].report?.groups || []).map(row => row.groupSessionId || "legacy"),
    }])),
    repairQuality: Object.fromEntries(repairQualityIds.map(id => [id, {
      status: repairChecks[id].status || "",
      scopes: (repairChecks[id].report?.groups || []).map(row => row.groupSessionId || "legacy"),
    }])),
  },
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
