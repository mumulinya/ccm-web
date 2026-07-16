import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "provider-ranking-memory-usage-exact-session-repair-selftest");
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

const groupId = "phase309-provider-ranking-memory-usage-group";
const sessionA = "gcs_phase309_a";
const sessionB = "gcs_phase309_b";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const at = "2026-07-15T16:00:00.000Z";
const primaryDoc = "provider-ranking-provenance-compact-repair-receipt-memory.md";
const disciplineDoc = "provider-ranking-memory-usage-receipt-discipline.md";
const shared = {
  bindingId: "phase309-shared-binding",
  assignmentId: "phase309-shared-assignment",
  dispatchKey: "phase309-shared-dispatch",
  packetId: "phase309-shared-packet",
  workItemId: "phase309-shared-ranking-repair-work",
  briefId: "phase309-shared-ranking-repair-brief",
  timelineId: "phase309-shared-ranking-repair-timeline",
};

const contract = {
  schema: "ccm-provider-ranking-compact-repair-receipt-memory-usage-contract-v1",
  active: true,
  doc_rel_path: primaryDoc,
  required_receipt_fields: ["memoryUsed", "memoryIgnored"],
  authorization_boundary: "ranking evidence only, not authorization; fresh valid provider switch decision receipt required",
};

function baseTypedRow(groupSessionId, marker) {
  return {
    groupId,
    groupSessionId,
    timeline_binding_id: shared.timelineId,
    brief_id: shared.briefId,
    work_item_id: shared.workItemId,
    source: "worker_context_provider_ranking_provenance_compact_repair",
    project: "api",
    task_id: "phase309-shared-task",
    receipt_status: "completed",
    replay_repair_consumption_status: "verified",
    replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
    replay_repair_consumption_reason: `${marker} exact-session provider ranking evidence`,
    provider_switch_decision_receipt_id: "phase309-shared-switch-receipt",
    provider_switch_decision_receipt_checksum: "phase309-shared-switch-checksum",
    provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
    provider_ranking_provenance_row_ids: ["phase309-shared-ranking-row"],
    provider_ranking_provenance_preserved: true,
    provider_ranking_provenance_required: true,
    provider_ranking_provenance_repair_status: "completed",
    provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
    provider_ranking_provenance_receipt_consumption_verified: true,
    at,
  };
}

function badBinding(groupSessionId) {
  return {
    schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-binding-v1",
    binding_id: shared.bindingId,
    assignment_id: shared.assignmentId,
    dispatch_key: shared.dispatchKey,
    groupId,
    groupSessionId,
    group_session_id: groupSessionId,
    project: "api",
    worker_context_packet_id: shared.packetId,
    provider_ranking_compact_repair_receipt_memory_contract: contract,
    worker_context_packet: {
      packet_id: shared.packetId,
      project: "api",
      group_session_id: groupSessionId,
      provider_ranking_compact_repair_receipt_memory_contract: contract,
      acceptance: {
        provider_ranking_compact_repair_receipt_memory_usage_required: true,
        provider_ranking_compact_repair_receipt_memory_authorization_boundary_required: true,
      },
    },
    worker_context_packet_receipt: {
      worker_context_packet_id: shared.packetId,
      project: "api",
      status: "completed",
      memoryUsed: [`${primaryDoc}; usageState=verified`],
      memoryIgnored: [],
    },
    at,
  };
}

typed.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(scopeA, { rows: [baseTypedRow(sessionA, "PHASE309_SESSION_A_SENTINEL")] }, {
  sourceGroupId: groupId,
  groupSessionId: sessionA,
  reason: "phase309-provider-ranking-memory-usage-exact-session-a",
  updatedAt: at,
});
typed.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(scopeB, { rows: [baseTypedRow(sessionB, "PHASE309_SESSION_B_SENTINEL")] }, {
  sourceGroupId: groupId,
  groupSessionId: sessionB,
  reason: "phase309-provider-ranking-memory-usage-exact-session-b",
  updatedAt: at,
});

const bindingLedger = orchestrator.readReplayRepairDispatchBindingLedgerForCoordinator(groupId);
fs.mkdirSync(path.dirname(bindingLedger.file), { recursive: true });
fs.writeFileSync(bindingLedger.file, `${JSON.stringify({
  schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
  version: 1,
  groupId,
  file: bindingLedger.file,
  updatedAt: at,
  bindingCount: 2,
  entries: [badBinding(sessionA), badBinding(sessionB)],
}, null, 2)}\n`, "utf8");

const checkIds = [
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_contract",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_required_docs",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_work_items",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_candidates",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_briefs",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_dispatch_brief_required_docs",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_typed_memory",
  "worker_context_provider_ranking_provenance_compact_repair_receipt_memory_usage_receipt_repair_worker_context_injection",
];
const quality = memoryCenter.buildMemoryQualityReport({
  checkIds,
  groupIds: [groupId],
  groupSessionIds: [sessionA, sessionB],
  targetProject: "api",
  task: "provider ranking memory usage receipt discipline memoryUsed memoryIgnored usageState ranking evidence only not authorization fresh valid provider switch decision receipt",
  tasks: [],
  generatedAt: at,
  refresh: true,
});
const check = id => (quality.checks || []).find(row => row.id === id) || {};
const reports = Object.fromEntries(checkIds.map(id => [id, check(id)]));
const exactReportIds = checkIds.filter(id => !id.endsWith("receipt_required_docs"));
const reportUsesExactScopes = report => report.report?.overall?.groupCount === 1
  && report.report?.overall?.scopeCount === 2
  && report.report?.overall?.exactSessionCount === 2
  && report.report?.overall?.legacyScopeCount === 0
  && (report.report?.groups || []).length === 2
  && (report.report?.groups || []).every(row => row.exactSession === true && [sessionA, sessionB].includes(row.groupSessionId));

const workA = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionA);
const workB = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionB);
const repairRowsA = (workA.items || []).filter(row => row.source === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair");
const repairRowsB = (workB.items || []).filter(row => row.source === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair");
const planA = orchestrator.readReplayRepairDispatchPlanLedgerForCoordinator(groupId, sessionA);
const planB = orchestrator.readReplayRepairDispatchPlanLedgerForCoordinator(groupId, sessionB);
const ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
const ledgerB = typed.readGroupTypedMemoryDistillationLedger(scopeB);
const rootLedger = typed.readGroupTypedMemoryDistillationLedger(groupId);
const archiveA = ledgerA.providerRankingMemoryUsageReceiptRepairArchive?.rows || [];
const archiveB = ledgerB.providerRankingMemoryUsageReceiptRepairArchive?.rows || [];
const rootArchive = rootLedger.providerRankingMemoryUsageReceiptRepairArchive?.rows || [];
const docsA = typed.scanGroupTypedMemoryDocuments(scopeA);
const docsB = typed.scanGroupTypedMemoryDocuments(scopeB);
const textA = docsA.map(row => row.body || "").join("\n");
const textB = docsB.map(row => row.body || "").join("\n");

const beforeDeleteB = {
  docs: docsB.length,
  work: repairRowsB.length,
  briefs: (planB.briefs || []).length,
};
collaborationMemory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
const afterDeleteB = {
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
  work: (memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionB).items || []).filter(row => row.source === "worker_context_provider_ranking_compact_repair_receipt_memory_usage_receipt_repair").length,
  briefs: (orchestrator.readReplayRepairDispatchPlanLedgerForCoordinator(groupId, sessionB).briefs || []).length,
};

const checks = {
  expectedQualityStatesHold: reports[checkIds[1]].status === "fail"
    && checkIds.filter(id => id !== checkIds[1]).every(id => ["ok", "empty"].includes(String(reports[id].status || ""))),
  allActiveReportsUseExactScopes: exactReportIds.every(id => reportUsesExactScopes(reports[id])),
  contractInjectedPerSession: reports[checkIds[0]].status === "ok"
    && reports[checkIds[0]].report?.overall?.contractActiveCount === 2,
  receiptGapsRemainSessionLocal: reports[checkIds[1]].report?.overall?.receiptContractCount === 2
    && reports[checkIds[1]].report?.overall?.missingReceiptCoverageCount === 2,
  repairWorkItemsAreDistinct: repairRowsA.length === 1 && repairRowsB.length === 1
    && repairRowsA[0].id !== repairRowsB[0].id
    && repairRowsA[0].groupSessionId === sessionA
    && repairRowsB[0].groupSessionId === sessionB,
  dispatchPlansAreSeparateFiles: planA.file !== planB.file
    && (planA.briefs || []).length === 1
    && (planB.briefs || []).length === 1
    && planA.groupSessionId === sessionA
    && planB.groupSessionId === sessionB,
  repairTypedMemoryUsesExactLedgers: archiveA.length >= 1 && archiveB.length >= 1
    && ledgerA.sourceGroupId === groupId && ledgerA.groupSessionId === sessionA
    && ledgerB.sourceGroupId === groupId && ledgerB.groupSessionId === sessionB,
  sameLogicalIdsDoNotCollide: archiveA[0]?.row_id && archiveB[0]?.row_id
    && archiveA[0].row_id !== archiveB[0].row_id,
  noBareGroupTypedMemoryPollution: rootArchive.length === 0
    && !typed.scanGroupTypedMemoryDocuments(groupId).some(row => row.relPath === disciplineDoc),
  documentsCarryExactSessionProvenance: textA.includes(`Exact group-chat session: ${sessionA}.`)
    && textB.includes(`Exact group-chat session: ${sessionB}.`),
  siblingBaseMemoryRemainsPrivate: textA.includes("PHASE309_SESSION_A_SENTINEL")
    && !textA.includes("PHASE309_SESSION_B_SENTINEL")
    && textB.includes("PHASE309_SESSION_B_SENTINEL")
    && !textB.includes("PHASE309_SESSION_A_SENTINEL"),
  workerContextInjectionUsesExactSessions: reports[checkIds[8]].status === "ok"
    && reports[checkIds[8]].report?.overall?.workerContextPacketCoveredCount === 2,
  deletingOneSessionPreservesSibling: afterDeleteB.docs === beforeDeleteB.docs
    && afterDeleteB.work === beforeDeleteB.work
    && afterDeleteB.briefs === beforeDeleteB.briefs
    && typed.scanGroupTypedMemoryDocuments(scopeA).length === 0,
  ledgersRemainBodyFree: !JSON.stringify({ workA, workB, planA, planB, ledgerA, ledgerB }).includes("raw_transcript_body"),
};

const failed = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const summary = {
  schema: "ccm-provider-ranking-memory-usage-exact-session-repair-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    quality: Object.fromEntries(checkIds.map(id => [id, {
      status: reports[id].status || "",
      groupCount: reports[id].report?.overall?.groupCount,
      scopeCount: reports[id].report?.overall?.scopeCount,
      exactSessionCount: reports[id].report?.overall?.exactSessionCount,
      legacyScopeCount: reports[id].report?.overall?.legacyScopeCount,
    }])),
    workItemIds: [repairRowsA[0]?.id || "", repairRowsB[0]?.id || ""],
    dispatchPlanFiles: [planA.file || "", planB.file || ""],
    candidateGroups: (reports[checkIds[4]].report?.groups || []).map(row => ({ groupSessionId: row.groupSessionId, status: row.status, gaps: row.gaps || [] })),
  },
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
