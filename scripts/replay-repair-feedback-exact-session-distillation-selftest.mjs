import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "replay-repair-feedback-exact-session-distillation-selftest");
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

const groupId = "phase307-replay-repair-feedback-group";
const sessionA = "gcs_phase307_a";
const sessionB = "gcs_phase307_b";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const at = "2026-07-15T12:00:00.000Z";
const requiredEvents = ["dispatch", "child_agent_start", "worker_handoff_ready", "task_agent_memory_context_snapshot", "child_agent_receipt"];

function scopeOptions(groupSessionId) {
  return {
    sourceGroupId: groupId,
    groupSessionId,
    updatedAt: at,
    reason: "phase307-replay-repair-feedback-exact-session-selftest",
  };
}

function providerReproof(groupSessionId, marker) {
  return {
    groupId,
    groupSessionId,
    timeline_binding_id: "phase307-shared-provider-reproof-timeline",
    brief_id: "phase307-shared-provider-reproof-brief",
    work_item_id: "phase307-shared-provider-reproof-work",
    source: "api_microcompact_native_apply_provider_reproof",
    project: "api",
    task_id: "phase307-shared-provider-reproof-task",
    receipt_status: "done",
    replay_repair_consumption_status: "used",
    replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
    replay_repair_consumption_reason: `${marker} provider re-proof exact-session evidence`,
    provider_reproof_status: "needed",
    provider_reproof_reason: "missing_native_request_adapter_telemetry",
    request_patch_checksum: "phase307-shared-provider-request-checksum",
    runner_request_id: "phase307-shared-provider-runner-request",
  };
}

function providerRanking(groupSessionId, marker) {
  return {
    groupId,
    groupSessionId,
    timeline_binding_id: "phase307-shared-provider-ranking-timeline",
    brief_id: "phase307-shared-provider-ranking-brief",
    work_item_id: "phase307-shared-provider-ranking-work",
    source: "worker_context_provider_ranking_provenance_compact_repair",
    project: "api",
    task_id: "phase307-shared-provider-ranking-task",
    receipt_status: "completed",
    replay_repair_consumption_status: "verified",
    replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
    replay_repair_consumption_reason: `${marker} provider ranking exact-session evidence`,
    provider_switch_decision_receipt_id: "phase307-shared-provider-switch-receipt",
    provider_switch_decision_receipt_checksum: "phase307-shared-provider-switch-checksum",
    provider_ranking_provenance_rel_paths: ["provider-switch-execution-memory.md"],
    provider_ranking_provenance_row_ids: ["phase307-shared-provider-ranking-row"],
    provider_ranking_provenance_preserved: true,
    provider_ranking_provenance_receipt_consumption_verified: true,
    provider_ranking_provenance_repair_status: "completed",
    provider_ranking_provenance_repair_gap_type: "provider_ranking_provenance_compact",
  };
}

function reinjection(groupSessionId, marker) {
  return {
    groupId,
    groupSessionId,
    timeline_binding_id: "phase307-shared-reinjection-timeline",
    brief_id: "phase307-shared-reinjection-brief",
    work_item_id: "phase307-shared-reinjection-work",
    source: "compact_boundary_replay_repair",
    component: "post_compact_reinject",
    project: "api",
    task_id: "phase307-shared-reinjection-task",
    assignment_id: "phase307-shared-reinjection-assignment",
    dispatch_key: "phase307-shared-reinjection-dispatch",
    reinjection_gate_id: "phase307-shared-reinjection-gate",
    post_compact_candidate_id: "phase307-shared-reinjection-candidate",
    post_compact_candidate_kind: "file",
    post_compact_candidate_value: `src/${marker}.ts`,
    post_compact_candidate_source_message_id: "phase307-shared-source-message",
    post_compact_reinjection_receipt_usage_state: "verified",
    post_compact_reinjection_receipt_reason: `${marker} post-compact reinjection exact-session evidence`,
    post_compact_reinjection_current_source_verified: true,
    post_compact_reinjection_memory_receipt_matched: true,
    post_compact_reinjection_task_session_matched: true,
    post_compact_reinjection_native_session_matched: true,
    post_compact_reinjection_receipt_verified: true,
    receipt_status: "done",
    replay_repair_consumption_status: "verified",
    replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
    worker_context_packet_id: "phase307-shared-wcp",
    worker_handoff_id: "phase307-shared-handoff",
    memory_context_snapshot_id: "phase307-shared-snapshot",
    memory_context_snapshot_checksum: "phase307-shared-snapshot-checksum",
    task_agent_session_id: "phase307-shared-task-agent-session",
    native_session_id: "phase307-shared-native-session",
    execution_id: "phase307-shared-execution",
    event_types: requiredEvents,
    completion_source: "post_compact_reinjection_replay_repair_receipt_consumption",
    resolution_reason: "post_compact_reinjection_repair_receipt_verified",
    completed_at: at,
  };
}

function correctedReceipt(groupSessionId, marker) {
  const requiredDoc = "post-compact-reinjection-repair-receipt-memory.md";
  return {
    groupId,
    groupSessionId,
    source: "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair",
    project: "api",
    task_id: "phase307-shared-corrected-receipt-task",
    work_item_id: "phase307-shared-corrected-receipt-work",
    brief_id: "phase307-shared-corrected-receipt-brief",
    timeline_binding_id: "phase307-shared-corrected-receipt-timeline",
    assignment_id: "phase307-shared-corrected-receipt-assignment",
    dispatch_key: "phase307-shared-corrected-receipt-dispatch",
    original_worker_context_packet_id: `phase307-${marker}-original-packet`,
    original_binding_id: "phase307-shared-original-binding",
    original_assignment_id: "phase307-shared-original-assignment",
    original_dispatch_key: "phase307-shared-original-dispatch",
    original_task_agent_session_id: "phase307-shared-original-task-session",
    original_native_session_id: "phase307-shared-original-native-session",
    task_agent_session_id: "phase307-shared-repair-task-session",
    native_session_id: "phase307-shared-repair-native-session",
    execution_id: "phase307-shared-repair-execution",
    post_compact_receipt_memory_gap_codes: ["receipt_usage_state_or_reverify"],
    post_compact_receipt_memory_usage_repair_required_doc_rel_paths: [requiredDoc],
    post_compact_receipt_memory_usage_repair_covered_doc_rel_paths: [requiredDoc],
    post_compact_receipt_memory_usage_repair_coverage_rows: [{
      relPath: requiredDoc,
      usageState: "verified",
      covered: true,
      compliant: true,
      currentSourceVerified: true,
      ignoredReasonCovered: false,
      reason: marker,
    }],
    post_compact_receipt_memory_usage_repair_all_docs_compliant: true,
    post_compact_receipt_memory_usage_repair_historical_boundary_covered: true,
    post_compact_receipt_memory_usage_repair_task_session_matched: true,
    post_compact_receipt_memory_usage_repair_native_session_matched: true,
    post_compact_receipt_memory_usage_repair_verified: true,
    receipt_status: "done",
    replay_repair_consumption_status: "verified",
    replay_repair_consumption_source: "receipt.replayRepairDispatchBriefUsage",
    event_types: requiredEvents,
    completion_source: "post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption",
    resolution_reason: "post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified",
    completed_at: at,
  };
}

function distillSession(groupSessionId, scopeId, marker) {
  typed.distillProviderReproofReceiptConsumptionToTypedMemory(scopeId, { rows: [providerReproof(groupSessionId, marker)] }, scopeOptions(groupSessionId));
  typed.distillProviderRankingProvenanceCompactRepairReceiptConsumptionToTypedMemory(scopeId, { rows: [providerRanking(groupSessionId, marker)] }, scopeOptions(groupSessionId));
  typed.distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory(scopeId, { rows: [reinjection(groupSessionId, marker)] }, scopeOptions(groupSessionId));
  typed.distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory(scopeId, { rows: [correctedReceipt(groupSessionId, marker)] }, scopeOptions(groupSessionId));
}

distillSession(sessionA, scopeA, "PHASE307_SESSION_A_SENTINEL");
distillSession(sessionB, scopeB, "PHASE307_SESSION_B_SENTINEL");

function recordProviderRuntime(groupSessionId, marker) {
  const briefId = `phase307-runtime-provider-brief-${groupSessionId}`;
  const workItemId = `phase307-runtime-provider-work-${groupSessionId}`;
  orchestrator.recordReplayRepairDispatchBriefTimelineBinding(groupId, {
    groupSessionId,
    brief: {
      brief_id: briefId,
      work_item_id: workItemId,
      source: "api_microcompact_native_apply_provider_reproof",
      target_project: "api",
      provider_reproof_status: "needed",
      provider_reproof_reason: "missing_native_request_adapter_telemetry",
      request_patch_checksum: `phase307-runtime-request-${groupSessionId}`,
      runner_request_id: `phase307-runtime-runner-${groupSessionId}`,
    },
    task_id: `phase307-runtime-task-${groupSessionId}`,
    project: "api",
    assignment_id: `phase307-runtime-assignment-${groupSessionId}`,
    dispatch_key: `phase307-runtime-dispatch-${groupSessionId}`,
    task_agent_session_id: `phase307-runtime-task-session-${groupSessionId}`,
    native_session_id: `phase307-runtime-native-session-${groupSessionId}`,
    execution_id: `phase307-runtime-execution-${groupSessionId}`,
    receipt_status: "done",
    receipt: {
      status: "done",
      replayRepairDispatchBriefUsage: [{
        briefId,
        workItemId,
        usageState: "used",
        requestPatchChecksum: `phase307-runtime-request-${groupSessionId}`,
        runnerRequestId: `phase307-runtime-runner-${groupSessionId}`,
        reason: `${marker} runtime receipt`,
      }],
    },
    timeline_event: { id: `phase307-runtime-receipt-${groupSessionId}`, type: "child_agent_receipt", at },
  }, { at });
}

recordProviderRuntime(sessionA, "PHASE307_RUNTIME_A_SENTINEL");
recordProviderRuntime(sessionB, "PHASE307_RUNTIME_B_SENTINEL");

const quality = memoryCenter.buildMemoryQualityReport({
  checkIds: [
    "api_microcompact_native_apply_provider_reproof_receipt_consumption_typed_memory",
    "worker_context_provider_ranking_provenance_compact_repair_receipt_worker_context_recall",
  ],
  groupIds: [groupId],
  groupSessionIds: [sessionA, sessionB],
  generatedAt: at,
  refresh: true,
});
const qualityCheck = (quality.checks || []).find(row => row.id === "api_microcompact_native_apply_provider_reproof_receipt_consumption_typed_memory") || {};
const providerRankingWorkerCheck = (quality.checks || []).find(row => row.id === "worker_context_provider_ranking_provenance_compact_repair_receipt_worker_context_recall") || {};
const qualityScopes = qualityCheck.report?.groups || [];
const ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
const ledgerB = typed.readGroupTypedMemoryDistillationLedger(scopeB);
const legacyLedger = typed.readGroupTypedMemoryDistillationLedger(groupId);
const docsA = typed.scanGroupTypedMemoryDocuments(scopeA);
const docsB = typed.scanGroupTypedMemoryDocuments(scopeB);
const textA = docsA.map(doc => doc.body || "").join("\n");
const textB = docsB.map(doc => doc.body || "").join("\n");
const recallA = typed.buildGroupTypedMemoryRecall(scopeA, "PHASE307_SESSION_A_SENTINEL PHASE307_RUNTIME_A_SENTINEL", { disableLedger: true, forceMemory: true, max: 12 });
const recallB = typed.buildGroupTypedMemoryRecall(scopeB, "PHASE307_SESSION_B_SENTINEL PHASE307_RUNTIME_B_SENTINEL", { disableLedger: true, forceMemory: true, max: 12 });
const recallTextA = JSON.stringify(recallA.recalled || []);
const recallTextB = JSON.stringify(recallB.recalled || []);
const archiveNames = [
  "providerReproofReceiptConsumptionArchive",
  "providerRankingProvenanceCompactRepairReceiptConsumptionArchive",
  "postCompactReinjectionRepairReceiptConsumptionArchive",
  "postCompactReceiptMemoryUsageRepairCompletionArchive",
];
const rowsFor = (ledger, name) => ledger[name]?.rows || [];

const beforeDeleteB = typed.scanGroupTypedMemoryDocuments(scopeB).length;
collaborationMemory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
const afterDeleteA = typed.scanGroupTypedMemoryDocuments(scopeA).length;
const afterDeleteB = typed.scanGroupTypedMemoryDocuments(scopeB).length;

const legacyGroup = "phase307-legacy-feedback-group";
typed.distillProviderReproofReceiptConsumptionToTypedMemory(legacyGroup, { rows: [{ ...providerReproof("", "PHASE307_LEGACY_SENTINEL"), groupId: legacyGroup, groupSessionId: "" }] }, { updatedAt: at, reason: "phase307-legacy-compatibility" });
const legacyCompatibility = typed.readGroupTypedMemoryDistillationLedger(legacyGroup);

const checks = {
  fourFamiliesUseExactSessionLedgers: archiveNames.every(name => rowsFor(ledgerA, name).length >= 1 && rowsFor(ledgerB, name).length >= 1),
  ledgerOwnershipIsExact: ledgerA.sourceGroupId === groupId && ledgerA.groupSessionId === sessionA
    && ledgerB.sourceGroupId === groupId && ledgerB.groupSessionId === sessionB
    && archiveNames.every(name => rowsFor(ledgerA, name).every(row => row.groupSessionId === sessionA)
      && rowsFor(ledgerB, name).every(row => row.groupSessionId === sessionB)),
  sameLogicalIdsRemainDistinct: archiveNames.every(name => rowsFor(ledgerA, name)[0]?.row_id
    && rowsFor(ledgerA, name)[0]?.row_id !== rowsFor(ledgerB, name)[0]?.row_id),
  noBareGroupTypedMemoryPollution: archiveNames.every(name => rowsFor(legacyLedger, name).length === 0)
    && typed.scanGroupTypedMemoryDocuments(groupId).length === 0,
  documentsCarryExactSessionProvenance: textA.includes(`Exact group-chat session: ${sessionA}.`)
    && textB.includes(`Exact group-chat session: ${sessionB}.`),
  siblingDocumentsRemainPrivate: textA.includes("PHASE307_SESSION_A_SENTINEL")
    && !textA.includes("PHASE307_SESSION_B_SENTINEL")
    && textB.includes("PHASE307_SESSION_B_SENTINEL")
    && !textB.includes("PHASE307_SESSION_A_SENTINEL"),
  siblingRecallRemainsIsolated: recallTextA.includes("PHASE307_SESSION_A_SENTINEL")
    && !recallTextA.includes("PHASE307_SESSION_B_SENTINEL")
    && recallTextB.includes("PHASE307_SESSION_B_SENTINEL")
    && !recallTextB.includes("PHASE307_SESSION_A_SENTINEL"),
  runtimeFanoutUsesExactSessionScope: rowsFor(ledgerA, "providerReproofReceiptConsumptionArchive").some(row => String(row.reason || "").includes("PHASE307_RUNTIME_A_SENTINEL"))
    && rowsFor(ledgerB, "providerReproofReceiptConsumptionArchive").some(row => String(row.reason || "").includes("PHASE307_RUNTIME_B_SENTINEL")),
  memoryCenterReportsExactScopes: qualityCheck.status === "ok"
    && qualityScopes.length === 2
    && qualityCheck.report?.overall?.groupCount === 1
    && qualityCheck.report?.overall?.scopeCount === 2
    && qualityCheck.report?.overall?.exactSessionCount === 2
    && qualityCheck.report?.overall?.legacyScopeCount === 0
    && qualityScopes.every(row => row.exactSession === true && [scopeA, scopeB].includes(row.typedScopeId))
    && qualityScopes.every(row => row.groupSessionId && row.status === "ok"),
  memoryCenterDoesNotCreateBareCopy: archiveNames.every(name => rowsFor(typed.readGroupTypedMemoryDistillationLedger(groupId), name).length === 0),
  providerRankingWorkerContextUsesExactSessionScopes: providerRankingWorkerCheck.status === "ok"
    && providerRankingWorkerCheck.report?.overall?.groupCount === 1
    && providerRankingWorkerCheck.report?.overall?.scopeCount === 2
    && providerRankingWorkerCheck.report?.overall?.exactSessionCount === 2
    && providerRankingWorkerCheck.report?.overall?.legacyScopeCount === 0
    && providerRankingWorkerCheck.report?.overall?.groupsCovered === 2
    && (providerRankingWorkerCheck.report?.groups || []).every(row => row.exactSession === true && row.status === "ok"),
  deletingOneSessionPreservesSibling: beforeDeleteB > 0 && afterDeleteA === 0 && afterDeleteB === beforeDeleteB,
  legacyUnscopedFeedbackRemainsSupported: rowsFor(legacyCompatibility, "providerReproofReceiptConsumptionArchive").length === 1,
};

const failed = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const summary = {
  schema: "ccm-replay-repair-feedback-exact-session-distillation-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    qualityStatus: qualityCheck.status || "",
    providerRankingWorkerStatus: providerRankingWorkerCheck.status || "",
    qualityScopeCount: qualityScopes.length,
    sessionAArchiveCounts: Object.fromEntries(archiveNames.map(name => [name, rowsFor(ledgerA, name).length])),
    sessionBArchiveCounts: Object.fromEntries(archiveNames.map(name => [name, rowsFor(ledgerB, name).length])),
  },
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exitCode = 1;
