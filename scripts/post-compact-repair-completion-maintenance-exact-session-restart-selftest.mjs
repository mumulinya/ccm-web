import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "post-compact-repair-completion-maintenance-exact-session-restart-selftest");
const home = path.join(scratch, "home");
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));
const memoryCenter = require(path.join(root, "ccm-package", "dist", "modules", "knowledge", "memory-control-center.js"));
const collaborationMemory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));

const groupId = "phase311-repair-completion-maintenance-group";
const sessionA = "gcs_phase311_a";
const sessionB = "gcs_phase311_b";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const requiredDoc = "post-compact-completion-memory-preservation-repair-closures.md";
const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
const shared = {
  workItemId: "phase311-shared-work-item",
  briefId: "phase311-shared-brief",
  taskId: "phase311-shared-task",
  assignmentId: "phase311-shared-assignment",
  dispatchKey: "phase311-shared-dispatch",
  packetId: "phase311-shared-packet",
  originalBindingId: "phase311-shared-original-binding",
  originalTaskSessionId: "phase311-shared-original-task-session",
  originalNativeSessionId: "phase311-shared-original-native-session",
  repairTaskSessionId: "phase311-shared-repair-task-session",
  repairNativeSessionId: "phase311-shared-repair-native-session",
  executionId: "phase311-shared-execution",
};
const requiredEvents = [
  "dispatch",
  "child_agent_start",
  "worker_handoff_ready",
  "task_agent_memory_context_snapshot",
  "child_agent_receipt",
];

function exactWorkFile(groupSessionId) {
  return memoryCenter.getGroupCompactBoundaryReplayRepairWorkItemsFile(groupId, groupSessionId);
}

function workItem(groupSessionId, sentinel) {
  return {
    schema: "ccm-replay-repair-work-item-v1",
    id: shared.workItemId,
    work_item_id: shared.workItemId,
    group_id: groupId,
    groupSessionId,
    group_session_id: groupSessionId,
    scopeId: `${groupId}::${groupSessionId}`,
    typedScopeId: `${groupId}--${groupSessionId}`,
    status: "pending",
    source: "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair",
    component: "post_compact_reinjection_repair_receipt_memory_usage_contract",
    target_project: "api",
    assignment_id: shared.assignmentId,
    dispatch_key: shared.dispatchKey,
    worker_context_packet_id: shared.packetId,
    original_worker_context_packet_id: shared.packetId,
    original_binding_id: shared.originalBindingId,
    original_assignment_id: shared.assignmentId,
    original_dispatch_key: shared.dispatchKey,
    original_task_agent_session_id: shared.originalTaskSessionId,
    original_native_session_id: shared.originalNativeSessionId,
    post_compact_receipt_memory_required_doc_rel_paths: [requiredDoc],
    evidence: [`${sentinel} exact-session repair evidence`],
    createdAt: "2026-07-15T20:00:00.000Z",
    updatedAt: "2026-07-15T20:00:00.000Z",
  };
}

function writeWorkLedger(groupSessionId, sentinel) {
  const file = exactWorkFile(groupSessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({
    schema: "ccm-compact-boundary-replay-repair-work-items-v1",
    version: 1,
    groupId,
    groupSessionId,
    file,
    items: [workItem(groupSessionId, sentinel)],
    stats: { total: 1, openItemCount: 1, pendingCount: 1, completedCount: 0 },
    updatedAt: "2026-07-15T20:00:00.000Z",
  }, null, 2)}\n`, "utf8");
}

function brief(groupSessionId) {
  return {
    schema: "ccm-replay-repair-main-agent-dispatch-brief-v1",
    brief_id: shared.briefId,
    work_item_id: shared.workItemId,
    groupId,
    groupSessionId,
    group_session_id: groupSessionId,
    source: "post_compact_reinjection_repair_receipt_memory_usage_receipt_repair",
    component: "post_compact_reinjection_repair_receipt_memory_usage_contract",
    target_project: "api",
    original_worker_context_packet_id: shared.packetId,
    original_binding_id: shared.originalBindingId,
    original_assignment_id: shared.assignmentId,
    original_dispatch_key: shared.dispatchKey,
    original_task_agent_session_id: shared.originalTaskSessionId,
    original_native_session_id: shared.originalNativeSessionId,
    post_compact_receipt_memory_required_doc_rel_paths: [requiredDoc],
    post_compact_receipt_memory_gap_codes: ["receipt_usage_state_or_reverify"],
    should_create_real_task: false,
    status: "ready",
  };
}

function correctedReceipt() {
  return {
    status: "done",
    task_agent_session_id: shared.repairTaskSessionId,
    native_session_id: shared.repairNativeSessionId,
    replayRepairDispatchBriefUsage: [{
      briefId: shared.briefId,
      workItemId: shared.workItemId,
      usageState: "verified",
      reason: "Re-read current source in the new repair session.",
    }],
    memoryUsed: [`${requiredDoc}; usageState=verified; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`],
    memoryIgnored: [],
    blockers: [],
    needs: [],
  };
}

function recordTimeline(groupSessionId, marker) {
  let finalResult = null;
  for (const [index, eventType] of requiredEvents.entries()) {
    finalResult = orchestrator.recordReplayRepairDispatchBriefTimelineBinding(groupId, {
      groupSessionId,
      brief: brief(groupSessionId),
      task_id: shared.taskId,
      project: "api",
      assignment_id: shared.assignmentId,
      dispatch_key: shared.dispatchKey,
      worker_context_packet_id: shared.packetId,
      worker_handoff_id: "phase311-shared-handoff",
      memory_context_snapshot_id: "phase311-shared-snapshot",
      memory_context_snapshot_checksum: "phase311-shared-snapshot-checksum",
      task_agent_session_id: shared.repairTaskSessionId,
      native_session_id: shared.repairNativeSessionId,
      execution_id: shared.executionId,
      receipt_status: eventType === "child_agent_receipt" ? "done" : "",
      receipt: eventType === "child_agent_receipt" ? correctedReceipt() : null,
      timeline_event: {
        id: `phase311-${marker}-${eventType}`,
        type: eventType,
        at: `2026-07-15T20:0${index}:00.000Z`,
      },
    }, { at: `2026-07-15T20:0${index}:00.000Z` });
  }
  return finalResult;
}

function conflictResolutionEntry(groupSessionId, marker) {
  return {
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: "api",
    task_id: shared.taskId,
    task_text: "phase311 exact maintenance resolution current source",
    task_family_key: "phase311-maintenance-family",
    task_family_tokens: ["phase311", "maintenance", "resolution"],
    entry_id: `phase311-resolution-entry-${marker}`,
    conflict_resolution_state: "verified",
    usage_state: "verified",
    current_source_verified: true,
    reason: `${marker} current source verified`,
    worker_context_packet_id: shared.packetId,
    binding_id: shared.originalBindingId,
    task_agent_session_id: shared.repairTaskSessionId,
    native_session_id: shared.repairNativeSessionId,
    execution_id: shared.executionId,
    receipt_source: "task.receipt",
    receipt_status: "verified",
    conflict_parent_arbitration_state: "contradictory_reverify_current_session",
    conflict_parent_fingerprint: `phase311-conflict-${marker}`,
    conflict_parent_ratio: 1,
    conflict_parent_positive_weight: 1,
    conflict_parent_ignored_weight: 1,
    conflict_resolution_reversible: true,
    generated_at: "2026-07-15T20:05:00.000Z",
  };
}

writeWorkLedger(sessionA, "PHASE311_SESSION_A_SENTINEL");
writeWorkLedger(sessionB, "PHASE311_SESSION_B_SENTINEL");
const completionA = recordTimeline(sessionA, "a");
const completionB = recordTimeline(sessionB, "b");

typed.distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(scopeA, {
  rows: [conflictResolutionEntry(sessionA, "a")],
}, { sourceGroupId: groupId, groupSessionId: sessionA, updatedAt: "2026-07-15T20:05:00.000Z" });
typed.distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(scopeB, {
  rows: [conflictResolutionEntry(sessionB, "b")],
}, { sourceGroupId: groupId, groupSessionId: sessionB, updatedAt: "2026-07-15T20:05:00.000Z" });

const workA = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionA);
const workB = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionB);
const rootWork = memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId);
const itemA = (workA.items || [])[0] || {};
const itemB = (workB.items || [])[0] || {};
const ledgerA = typed.readGroupTypedMemoryDistillationLedger(scopeA);
const ledgerB = typed.readGroupTypedMemoryDistillationLedger(scopeB);
const rootLedger = typed.readGroupTypedMemoryDistillationLedger(groupId);
const completionRowsA = ledgerA.postCompactReceiptMemoryUsageRepairCompletionArchive?.rows || [];
const completionRowsB = ledgerB.postCompactReceiptMemoryUsageRepairCompletionArchive?.rows || [];
const rootCompletionRows = rootLedger.postCompactReceiptMemoryUsageRepairCompletionArchive?.rows || [];

const qualityIds = [
  "post_compact_reinjection_repair_receipt_memory_usage_repair_receipt_consumption",
  "post_compact_reinjection_repair_receipt_memory_usage_repair_completion_typed_memory",
  "post_compact_reinjection_repair_receipt_memory_usage_repair_completion_worker_context_usage",
];
const quality = memoryCenter.buildMemoryQualityReport({
  checkIds: qualityIds,
  groupIds: [groupId],
  groupSessionIds: [sessionA, sessionB],
  targetProject: "api",
  task: "continue phase311 corrected receipt completion and reverify current source",
  tasks: [],
  generatedAt: "2026-07-15T20:06:00.000Z",
  refresh: true,
});
const qualityChecks = Object.fromEntries(qualityIds.map(id => [id, (quality.checks || []).find(row => row.id === id) || {}]));

const stateFile = path.join(scratch, "scheduler-state.json");
const childCode = `
const path=require('node:path');
const typed=require(path.join(${JSON.stringify(root)},'ccm-package','dist','modules','collaboration','group-memory-index.js'));
const cron=require(path.join(${JSON.stringify(root)},'ccm-package','dist','modules','scheduling','cron.js'));
const safe=()=>({destructive_action_authorized:false,created_task_count:0,created_approval_receipt_count:0,deleted_count:0,status:'ok'});
const cleanup=()=>({...safe(),ledger_checksum_valid:true,commit_ledger_checksum_valid:true,group_ledger_lock_valid:true,candidate_claim_conflict_count:0,invalid_commit_transaction_count:0});
const repair=()=>({...safe(),ledger_checksum_valid:true,contained_invalid_transaction_count:0,uncontained_invalid_transaction_count:0,recoverable_transaction_count:0,open_transaction_count:0,invalid_transaction_count:0});
const scopes=typed.listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds([${JSON.stringify(groupId)}]);
const tick=cron.runConflictResolutionMemoryMaintenanceSchedulerTick({groupIds:[${JSON.stringify(groupId)}],force:true,persist:true,stateFile:${JSON.stringify(stateFile)},at:'2026-07-15T20:10:00.000Z',runTelemetryRecovery:safe,runTelemetryOrphanReconciliation:safe,runTelemetryQuarantineRetention:safe,runTelemetryCleanupJournalReconciliation:cleanup,runTelemetryCleanupCommitDiscovery:safe,runTelemetryCleanupCommitRepairResolutionReconciliation:repair,runTelemetryRetention:safe});
process.stdout.write(JSON.stringify({scopes,tick}));`;
const child = spawnSync(process.execPath, ["-e", childCode], {
  cwd: root,
  env: { ...process.env, HOME: home, USERPROFILE: home },
  encoding: "utf8",
  timeout: 120000,
});
let restart = null;
try { restart = JSON.parse(String(child.stdout || "")); } catch {}

const maintenanceFileA = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(scopeA);
const maintenanceFileB = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(scopeB);
const beforeDeleteA = {
  completionDoc: typed.scanGroupTypedMemoryDocuments(scopeA).some(row => row.relPath === completionDoc),
  maintenance: fs.existsSync(maintenanceFileA),
};
const beforeDeleteB = {
  workStatus: itemB.status,
  completionRows: completionRowsB.length,
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
  completionDoc: typed.scanGroupTypedMemoryDocuments(scopeB).some(row => row.relPath === completionDoc),
  maintenance: fs.existsSync(maintenanceFileB),
};
collaborationMemory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
const afterDeleteB = {
  workStatus: (memoryCenter.readGroupCompactBoundaryReplayRepairWorkItems(groupId, sessionB).items || [])[0]?.status || "",
  completionRows: (typed.readGroupTypedMemoryDistillationLedger(scopeB).postCompactReceiptMemoryUsageRepairCompletionArchive?.rows || []).length,
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
  completionDoc: typed.scanGroupTypedMemoryDocuments(scopeB).some(row => row.relPath === completionDoc),
  maintenance: fs.existsSync(maintenanceFileB),
};

const exactQualityReports = Object.values(qualityChecks).every(check => {
  const rows = check.report?.groups || [];
  return rows.length === 2
    && rows.every(row => row.exactSession === true && [sessionA, sessionB].includes(row.groupSessionId));
});
const restartRows = restart?.tick?.rows || [];
const checks = {
  timelineCompletionClosesExactLedgers: completionA?.repair_work_item_completion?.closed === 1
    && completionB?.repair_work_item_completion?.closed === 1
    && itemA.status === "completed" && itemB.status === "completed",
  sameLogicalIdsDoNotCrossClose: itemA.work_item_id === shared.workItemId
    && itemB.work_item_id === shared.workItemId
    && workA.file !== workB.file,
  rootWorkLedgerRemainsUntouched: (rootWork.items || []).length === 0,
  completionProofCarriesExactSession: itemA.post_compact_receipt_memory_usage_repair_receipt?.groupSessionId === sessionA
    && itemB.post_compact_receipt_memory_usage_repair_receipt?.groupSessionId === sessionB,
  runtimeDistillsCompletionToExactTypedMemory: completionRowsA.length === 1 && completionRowsB.length === 1
    && rootCompletionRows.length === 0
    && beforeDeleteA.completionDoc
    && beforeDeleteB.completionDoc,
  completionRowsRemainSessionDistinct: completionRowsA[0]?.row_id && completionRowsB[0]?.row_id
    && completionRowsA[0].row_id !== completionRowsB[0].row_id,
  memoryCenterReportsExactScopes: qualityIds.every(id => qualityChecks[id].status === "ok")
    && exactQualityReports,
  restartDiscoversOnlyExactMaintenanceScopes: child.status === 0 && restart
    && restart.scopes.length === 2
    && restart.scopes.includes(scopeA) && restart.scopes.includes(scopeB)
    && !restart.scopes.includes(groupId),
  schedulerRunsEachExactScope: restartRows.length === 2
    && restartRows.every(row => [scopeA, scopeB].includes(row.groupId) && row.status === "completed")
    && beforeDeleteA.maintenance && beforeDeleteB.maintenance,
  schedulerStateUsesExactKeys: (() => {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      const keys = Object.keys(state.groups || {});
      return keys.length === 2 && keys.includes(scopeA) && keys.includes(scopeB) && !keys.includes(groupId);
    } catch { return false; }
  })(),
  deletingOneSessionPreservesSibling: JSON.stringify(afterDeleteB) === JSON.stringify(beforeDeleteB)
    && !fs.existsSync(exactWorkFile(sessionA))
    && typed.scanGroupTypedMemoryDocuments(scopeA).length === 0,
  persistedArtifactsRemainBodyFree: !JSON.stringify({ workA, workB, ledgerA, ledgerB, restart }).includes("raw_transcript_body"),
};

const failed = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const result = {
  schema: "ccm-post-compact-repair-completion-maintenance-exact-session-restart-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    workFiles: [workA.file, workB.file],
    completionRowIds: [completionRowsA[0]?.row_id || "", completionRowsB[0]?.row_id || ""],
    quality: Object.fromEntries(qualityIds.map(id => [id, {
      status: qualityChecks[id].status || "",
      scopes: (qualityChecks[id].report?.groups || []).map(row => row.groupSessionId || "legacy"),
    }])),
    restart: {
      status: child.status,
      stderr: String(child.stderr || ""),
      scopes: restart?.scopes || [],
      rows: restartRows.map(row => ({ groupId: row.groupId, status: row.status, error: row.error || "" })),
    },
  },
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
