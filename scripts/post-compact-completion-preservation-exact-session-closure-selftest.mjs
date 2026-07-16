import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "post-compact-completion-preservation-exact-session-closure-selftest");
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

const groupId = "phase308-completion-preservation-group";
const sessionA = "gcs_phase308_a";
const sessionB = "gcs_phase308_b";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const at = "2026-07-15T14:00:00.000Z";
const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
const shared = {
  assignmentId: "phase308-shared-assignment",
  dispatchKey: "phase308-shared-dispatch",
  packetId: "phase308-shared-packet",
  failedRetryId: "phase308-shared-failed-retry",
  failedOutcomeId: "phase308-shared-failed-outcome",
  correctedRetryId: "phase308-shared-corrected-retry",
  correctedOutcomeId: "phase308-shared-corrected-outcome",
};

function fixture(groupSessionId, marker) {
  const completionWorkItemId = `post-compact-receipt-memory-usage-repair:${marker}`;
  const completionTimelineId = `replay-repair-brief-timeline:${marker}`;
  const summary = {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
    present: true,
    completion_doc_rel_paths: [completionDoc],
    required_doc_rel_paths: [completionDoc],
    work_item_ids: [completionWorkItemId],
    timeline_binding_ids: [completionTimelineId],
    historical_task_agent_session_ids: [`historical-task-${marker}`],
    historical_native_session_ids: [`historical-native-${marker}`],
    current_session_binding_id: `current-binding-${marker}`,
    current_task_agent_session_id: `current-task-${marker}`,
    current_native_session_id: `current-native-${marker}`,
    usage_acceptance_required: true,
    current_session_acceptance_required: true,
    authority_boundary_valid: true,
  };
  const failedAfter = {
    ...summary,
    completion_doc_rel_paths: [],
    work_item_ids: [],
    timeline_binding_ids: [],
    current_task_agent_session_id: summary.historical_task_agent_session_ids[0],
    authority_boundary_valid: false,
  };
  const failedPreservation = {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
    required: true,
    preserved: false,
    source: "worker_context_packet_compaction_retry",
    retry_id: shared.failedRetryId,
    before: summary,
    after: failedAfter,
    missing_completion_doc_rel_paths: [completionDoc],
    missing_required_doc_rel_paths: [],
    missing_work_item_ids: [completionWorkItemId],
    missing_timeline_binding_ids: [completionTimelineId],
    missing_historical_task_agent_session_ids: [],
    missing_historical_native_session_ids: [],
    gaps: [
      "completion_doc_rel_paths_missing_after_compact",
      "completion_work_item_ids_missing_after_compact",
      "completion_timeline_binding_ids_missing_after_compact",
      "current_task_agent_session_changed_after_compact",
      "historical_session_promoted_to_current_authority",
    ],
  };
  const correctedPreservation = {
    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
    required: true,
    preserved: true,
    source: "worker_context_packet_compaction_retry",
    retry_id: shared.correctedRetryId,
    before: summary,
    after: summary,
    missing_completion_doc_rel_paths: [],
    missing_required_doc_rel_paths: [],
    missing_work_item_ids: [],
    missing_timeline_binding_ids: [],
    missing_historical_task_agent_session_ids: [],
    missing_historical_native_session_ids: [],
    gaps: [],
  };
  const baseOutcome = {
    schema: "ccm-worker-context-compact-outcome-entry-v1",
    group_id: groupId,
    group_session_id: groupSessionId,
    assignment_id: shared.assignmentId,
    dispatch_key: shared.dispatchKey,
    project: "api",
    method: "memory_first_deterministic_context_compaction",
  };
  return {
    marker,
    failedPreservation,
    failedOutcome: {
      ...baseOutcome,
      outcome_id: shared.failedOutcomeId,
      hook_run_id: "phase308-shared-failed-hook",
      retry_id: shared.failedRetryId,
      status: "blocked",
      dispatch_ready: false,
      post_compact_receipt_memory_usage_repair_completion_preservation: failedPreservation,
      post_compact_receipt_memory_usage_repair_completion_preserved: false,
      at,
    },
    correctedOutcome: {
      ...baseOutcome,
      outcome_id: shared.correctedOutcomeId,
      hook_run_id: "phase308-shared-corrected-hook",
      retry_id: shared.correctedRetryId,
      status: "recovered",
      dispatch_ready: true,
      post_compact_receipt_memory_usage_repair_completion_preservation: correctedPreservation,
      post_compact_receipt_memory_usage_repair_completion_preserved: true,
      at: "2026-07-15T14:01:00.000Z",
    },
  };
}

function writeOutcomeLedger(groupSessionId, entries, updatedAt) {
  const ledger = orchestrator.readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId);
  fs.mkdirSync(path.dirname(ledger.file), { recursive: true });
  fs.writeFileSync(ledger.file, `${JSON.stringify({
    schema: "ccm-worker-context-compact-outcome-ledger-v1",
    version: 1,
    groupId,
    groupSessionId,
    scopeId: `${groupId}::${groupSessionId}`,
    file: ledger.file,
    entries,
    updatedAt,
  }, null, 2)}\n`, "utf8");
}

function recordBinding(groupSessionId, failedPreservation) {
  return orchestrator.recordWorkerContextPacketAssignmentBindingForCoordinator(groupId, {
    project: "api",
    groupSessionId,
    assignmentId: shared.assignmentId,
    dispatchKey: shared.dispatchKey,
    agentType: "codex",
    worker_context_packet: {
      packet_id: shared.packetId,
      group_session_id: groupSessionId,
      context_compaction_retry: {
        schema: "ccm-worker-context-compaction-retry-v1",
        retry_id: shared.failedRetryId,
        method: "memory_first_deterministic_context_compaction",
        status: "blocked",
        from_packet_id: "phase308-shared-from-packet",
        retry_packet_id: shared.packetId,
        compact_hook_run_id: "phase308-shared-failed-hook",
        post_compact_receipt_memory_usage_repair_completion_preservation: failedPreservation,
        post_compact_receipt_memory_usage_repair_completion_preserved: false,
      },
    },
  }, { at });
}

function quality(checkIds) {
  return memoryCenter.buildMemoryQualityReport({
    checkIds,
    groupIds: [groupId],
    groupSessionIds: [sessionA, sessionB],
    tasks: [],
    generatedAt: at,
    refresh: true,
  });
}

function check(report, id) {
  return (report.checks || []).find(row => row.id === id) || {};
}

const a = fixture(sessionA, "PHASE308_SESSION_A_SENTINEL");
const b = fixture(sessionB, "PHASE308_SESSION_B_SENTINEL");
const bindingA = recordBinding(sessionA, a.failedPreservation);
const bindingB = recordBinding(sessionB, b.failedPreservation);
writeOutcomeLedger(sessionA, [a.failedOutcome], at);
writeOutcomeLedger(sessionB, [b.failedOutcome], at);

const workId = "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_work_items";
const candidateId = "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_dispatch_candidates";
const briefId = "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_dispatch_briefs";
const openQuality = quality([workId, candidateId, briefId]);
const openWork = check(openQuality, workId);
const openCandidates = check(openQuality, candidateId);
const openBriefs = check(openQuality, briefId);

writeOutcomeLedger(sessionA, [a.failedOutcome, a.correctedOutcome], "2026-07-15T14:01:00.000Z");
writeOutcomeLedger(sessionB, [b.failedOutcome, b.correctedOutcome], "2026-07-15T14:01:00.000Z");

const closureId = "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure";
const typedId = "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure_typed_memory";
const workerId = "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure_worker_context_recall";
const closedQuality = quality([workId, closureId, typedId, workerId]);
const closedWork = check(closedQuality, workId);
const closure = check(closedQuality, closureId);
const typedCheck = check(closedQuality, typedId);
const worker = check(closedQuality, workerId);

const ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
const ledgerB = typed.readGroupTypedMemoryDistillationLedger(scopeB);
const legacyLedger = typed.readGroupTypedMemoryDistillationLedger(groupId);
const rowsA = ledgerA.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
const rowsB = ledgerB.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
const legacyRows = legacyLedger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || [];
const docsA = typed.scanGroupTypedMemoryDocuments(scopeA);
const docsB = typed.scanGroupTypedMemoryDocuments(scopeB);
const textA = docsA.map(row => row.body || "").join("\n");
const textB = docsB.map(row => row.body || "").join("\n");
const typedScopes = typedCheck.report?.groups || [];
const workerScopes = worker.report?.groups || [];
const rootBindings = orchestrator.readReplayRepairDispatchBindingLedgerForCoordinator(groupId).entries || [];

const beforeDeleteB = typed.scanGroupTypedMemoryDocuments(scopeB).length;
collaborationMemory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
const afterDeleteA = typed.scanGroupTypedMemoryDocuments(scopeA).length;
const afterDeleteB = typed.scanGroupTypedMemoryDocuments(scopeB).length;

const exactScopeReports = report => (report.report?.groups || []).length === 2
  && report.report?.overall?.groupCount === 1
  && report.report?.overall?.scopeCount === 2
  && report.report?.overall?.exactSessionCount === 2
  && report.report?.overall?.legacyScopeCount === 0
  && (report.report?.groups || []).every(row => row.exactSession === true && [sessionA, sessionB].includes(row.groupSessionId));

const checks = {
  bindingIdentityIncludesExactSession: bindingA?.binding_id && bindingB?.binding_id
    && bindingA.binding_id !== bindingB.binding_id
    && rootBindings.filter(row => row.assignment_id === shared.assignmentId).length === 2,
  openWorkItemsUseTwoExactScopes: openWork.status === "ok" && exactScopeReports(openWork)
    && Number(openWork.report?.overall?.requiredActionCount || 0) === 2,
  dispatchCandidatesUseTwoExactScopes: openCandidates.status === "ok" && exactScopeReports(openCandidates)
    && Number(openCandidates.report?.overall?.expectedCandidateCount || 0) === 2,
  dispatchBriefsUseTwoExactScopes: openBriefs.status === "ok" && exactScopeReports(openBriefs)
    && Number(openBriefs.report?.overall?.expectedBriefCount || 0) === 2,
  correctedOutcomesCloseOnlyTheirExactScopes: closedWork.status === "ok" && exactScopeReports(closedWork)
    && Number(closedWork.report?.overall?.correctedRetryCompletedCount || 0) === 2,
  closureReportUsesTwoExactScopes: closure.status === "ok" && exactScopeReports(closure)
    && Number(closure.report?.overall?.verifiedClosureCount || 0) === 2,
  typedMemoryUsesExactSessionLedgers: typedCheck.status === "ok" && exactScopeReports(typedCheck)
    && rowsA.length === 1 && rowsB.length === 1
    && ledgerA.sourceGroupId === groupId && ledgerA.groupSessionId === sessionA
    && ledgerB.sourceGroupId === groupId && ledgerB.groupSessionId === sessionB,
  sameLogicalOutcomeIdsDoNotCollide: rowsA[0]?.failed_outcome_id === shared.failedOutcomeId
    && rowsB[0]?.failed_outcome_id === shared.failedOutcomeId
    && rowsA[0]?.row_id && rowsA[0]?.row_id !== rowsB[0]?.row_id,
  noBareGroupTypedMemoryPollution: legacyRows.length === 0
    && !typed.scanGroupTypedMemoryDocuments(groupId).some(row => row.relPath === closureDoc),
  documentsCarryExactSessionProvenance: textA.includes(`Exact group-chat session: ${sessionA}.`)
    && textB.includes(`Exact group-chat session: ${sessionB}.`),
  siblingDocumentsRemainPrivate: textA.includes("PHASE308_SESSION_A_SENTINEL")
    && !textA.includes("PHASE308_SESSION_B_SENTINEL")
    && textB.includes("PHASE308_SESSION_B_SENTINEL")
    && !textB.includes("PHASE308_SESSION_A_SENTINEL"),
  freshWorkerRecallUsesExactScopes: worker.status === "ok" && exactScopeReports(worker)
    && workerScopes.every(row => row.status === "ok" && row.firstSessionBindingId && row.secondSessionBindingId),
  deletingOneSessionPreservesSibling: beforeDeleteB > 0 && afterDeleteA === 0 && afterDeleteB === beforeDeleteB,
  ledgersRemainBodyFree: !JSON.stringify({ ledgerA, ledgerB, rootBindings }).includes("raw_transcript_body"),
};

const failed = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const summary = {
  schema: "ccm-post-compact-completion-preservation-exact-session-closure-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    openWork: openWork.report?.overall || {},
    closure: closure.report?.overall || {},
    typedMemory: typedCheck.report?.overall || {},
    workerContext: worker.report?.overall || {},
    typedScopes: typedScopes.map(row => ({ groupSessionId: row.groupSessionId, status: row.status, typedScopeId: row.typedScopeId })),
    workerScopes: workerScopes.map(row => ({ groupSessionId: row.groupSessionId, status: row.status, gaps: row.gaps || [] })),
  },
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
