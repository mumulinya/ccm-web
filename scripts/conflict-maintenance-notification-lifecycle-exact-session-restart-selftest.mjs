import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, "scratch", "conflict-maintenance-notification-lifecycle-exact-session-restart-selftest");
const home = path.join(scratch, "home");
fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(home, { recursive: true });
process.env.HOME = home;
process.env.USERPROFILE = home;

const require = createRequire(import.meta.url);
const typed = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-memory-index.js"));
const orchestrator = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "group-orchestrator.js"));
const memory = require(path.join(root, "ccm-package", "dist", "modules", "collaboration", "memory.js"));
const cron = require(path.join(root, "ccm-package", "dist", "modules", "scheduling", "cron.js"));

const groupId = "phase312-maintenance-notification-group";
const sessionA = "gcs_phase312_a";
const sessionB = "gcs_phase312_b";
const staleSession = "gcs_phase312_stale";
const scopeA = `${groupId}--${sessionA}`;
const scopeB = `${groupId}--${sessionB}`;
const staleScope = `${groupId}--${staleSession}`;
const stateFile = path.join(home, ".cc-connect", "memory-control", "conflict-resolution-maintenance-scheduler.json");
const group = { id: groupId, name: "Phase 312", members: [] };

function conflictRow(groupSessionId, marker) {
  return {
    group_id: groupId,
    group_session_id: groupSessionId,
    target_project: "api",
    task_id: "phase312-shared-task",
    task_text: "phase312 exact maintenance notification lifecycle",
    task_family_key: "phase312-shared-family",
    task_family_tokens: ["phase312", "maintenance", "notification"],
    entry_id: "phase312-shared-resolution-entry",
    conflict_resolution_state: "verified",
    usage_state: "verified",
    current_source_verified: true,
    reason: `${marker} current source verified`,
    worker_context_packet_id: "phase312-shared-packet",
    binding_id: "phase312-shared-binding",
    task_agent_session_id: "phase312-shared-task-session",
    native_session_id: "phase312-shared-native-session",
    execution_id: "phase312-shared-execution",
    receipt_source: "task.receipt",
    receipt_status: "verified",
    conflict_parent_arbitration_state: "contradictory_reverify_current_session",
    conflict_parent_fingerprint: "phase312-shared-conflict",
    conflict_parent_ratio: 1,
    conflict_parent_positive_weight: 1,
    conflict_parent_ignored_weight: 1,
    conflict_resolution_reversible: true,
    generated_at: "2026-07-15T21:00:00.000Z",
  };
}

for (const [scopeId, groupSessionId, marker] of [[scopeA, sessionA, "a"], [scopeB, sessionB, "b"]]) {
  typed.distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(scopeId, {
    rows: [conflictRow(groupSessionId, marker)],
  }, {
    sourceGroupId: groupId,
    groupSessionId,
    updatedAt: "2026-07-15T21:00:00.000Z",
  });
}

const safe = () => ({ destructive_action_authorized: false, created_task_count: 0, created_approval_receipt_count: 0, deleted_count: 0, status: "ok" });
const cleanup = () => ({ ...safe(), ledger_checksum_valid: true, commit_ledger_checksum_valid: true, group_ledger_lock_valid: true, candidate_claim_conflict_count: 0, invalid_commit_transaction_count: 0 });
const repair = () => ({ ...safe(), ledger_checksum_valid: true, contained_invalid_transaction_count: 0, uncontained_invalid_transaction_count: 0, recoverable_transaction_count: 0, open_transaction_count: 0, invalid_transaction_count: 0 });
const schedulerOptions = {
  groupIds: [groupId],
  force: true,
  persist: true,
  stateFile,
  at: "2026-07-15T21:00:00.000Z",
  runTelemetryRecovery: safe,
  runTelemetryOrphanReconciliation: safe,
  runTelemetryQuarantineRetention: safe,
  runTelemetryCleanupJournalReconciliation: cleanup,
  runTelemetryCleanupCommitDiscovery: safe,
  runTelemetryCleanupCommitRepairResolutionReconciliation: repair,
  runTelemetryRetention: safe,
};
const firstTick = cron.runConflictResolutionMemoryMaintenanceSchedulerTick(schedulerOptions);

function coordinatorContext(groupSessionId, marker, recordDelivery = true) {
  return orchestrator.buildCoordinatorMaintenanceNotificationInstructions(group, {
    groupSessionId,
    at: "2026-07-15T21:01:00.000Z",
    contextId: `phase312-context-${marker}`,
    sessionId: `group-main-agent:${groupId}:${groupSessionId || "legacy"}`,
    recordDelivery,
  });
}

const contextA = coordinatorContext(sessionA, "a");
const contextB = coordinatorContext(sessionB, "b");
const rootContext = coordinatorContext("", "root", false);
const notificationA = contextA.context?.notifications?.[0] || {};
const notificationB = contextB.context?.notifications?.[0] || {};

const receiptA = typed.acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(scopeA, {
  groupId: scopeA,
  audience: "group-main-agent",
  actorRole: "group-main-agent",
  actorId: "phase312-main-agent-a",
  sessionId: `group-main-agent:${groupId}:${sessionA}`,
  notificationId: notificationA.notification_id,
  at: "2026-07-15T21:02:00.000Z",
});
const contextAfterAckA = coordinatorContext(sessionA, "a-after", false);
const contextAfterAckB = coordinatorContext(sessionB, "b-after", false);

const notificationFileA = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(scopeA);
const notificationFileB = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(scopeB);
const receiptFileA = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(scopeA);
const receiptFileB = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationReceiptFile(scopeB);
const deliveryFileA = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(scopeA);
const deliveryFileB = typed.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(scopeB);
const beforeDeleteB = {
  notification: fs.readFileSync(notificationFileB, "utf8"),
  delivery: fs.readFileSync(deliveryFileB, "utf8"),
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
};
const exactFilesBeforeDelete = {
  notificationsSeparate: notificationFileA !== notificationFileB && fs.existsSync(notificationFileA) && fs.existsSync(notificationFileB),
  receiptAExists: fs.existsSync(receiptFileA),
  receiptBExists: fs.existsSync(receiptFileB),
};
const stateBeforeDelete = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const deletion = memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA);
const stateAfterDelete = JSON.parse(fs.readFileSync(stateFile, "utf8"));
const backupAfterDelete = JSON.parse(fs.readFileSync(`${stateFile}.bak`, "utf8"));
const afterDeleteB = {
  notification: fs.readFileSync(notificationFileB, "utf8"),
  delivery: fs.readFileSync(deliveryFileB, "utf8"),
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
};

stateAfterDelete.groups[staleScope] = {
  source_group_id: groupId,
  group_session_id: staleSession,
  typed_scope_id: staleScope,
  exact_session: true,
  last_status: "stale-test-fixture",
};
fs.writeFileSync(stateFile, `${JSON.stringify(stateAfterDelete, null, 2)}\n`, "utf8");
fs.writeFileSync(`${stateFile}.bak`, `${JSON.stringify(stateAfterDelete, null, 2)}\n`, "utf8");

const childCode = `
const path=require('node:path');
const cron=require(path.join(${JSON.stringify(root)},'ccm-package','dist','modules','scheduling','cron.js'));
const orchestrator=require(path.join(${JSON.stringify(root)},'ccm-package','dist','modules','collaboration','group-orchestrator.js'));
const safe=()=>({destructive_action_authorized:false,created_task_count:0,created_approval_receipt_count:0,deleted_count:0,status:'ok'});
const cleanup=()=>({...safe(),ledger_checksum_valid:true,commit_ledger_checksum_valid:true,group_ledger_lock_valid:true,candidate_claim_conflict_count:0,invalid_commit_transaction_count:0});
const repair=()=>({...safe(),ledger_checksum_valid:true,contained_invalid_transaction_count:0,uncontained_invalid_transaction_count:0,recoverable_transaction_count:0,open_transaction_count:0,invalid_transaction_count:0});
const tick=cron.runConflictResolutionMemoryMaintenanceSchedulerTick({groupIds:[${JSON.stringify(groupId)}],force:true,persist:true,stateFile:${JSON.stringify(stateFile)},at:'2026-07-15T21:05:00.000Z',runTelemetryRecovery:safe,runTelemetryOrphanReconciliation:safe,runTelemetryQuarantineRetention:safe,runTelemetryCleanupJournalReconciliation:cleanup,runTelemetryCleanupCommitDiscovery:safe,runTelemetryCleanupCommitRepairResolutionReconciliation:repair,runTelemetryRetention:safe});
const context=orchestrator.buildCoordinatorMaintenanceNotificationInstructions({id:${JSON.stringify(groupId)},members:[]},{groupSessionId:${JSON.stringify(sessionB)},at:'2026-07-15T21:06:00.000Z',contextId:'phase312-restart-b',sessionId:'group-main-agent:${groupId}:${sessionB}',recordDelivery:false});
process.stdout.write(JSON.stringify({tick,context,state:require(${JSON.stringify(stateFile)})}));`;
const child = spawnSync(process.execPath, ["-e", childCode], {
  cwd: root,
  env: { ...process.env, HOME: home, USERPROFILE: home },
  encoding: "utf8",
  timeout: 120000,
});
let restart = null;
try { restart = JSON.parse(String(child.stdout || "")); } catch {}

const afterRestartB = {
  notification: fs.readFileSync(notificationFileB, "utf8"),
  delivery: fs.readFileSync(deliveryFileB, "utf8"),
  docs: typed.scanGroupTypedMemoryDocuments(scopeB).length,
};
const exactContext = (context, sessionId, scopeId) => context?.context?.group_session_id === sessionId
  && context?.context?.source_group_id === groupId
  && context?.context?.typed_scope_id === scopeId
  && context?.context?.exact_session === true
  && context?.typed_scope_id === scopeId;
const checks = {
  schedulerRunsOnlyExactScopes: firstTick.groupCount === 2 && firstTick.exactSessionCount === 2 && firstTick.legacyScopeCount === 0
    && firstTick.rows.every(row => [scopeA, scopeB].includes(row.groupId) && row.status === "completed"),
  notificationsUseSeparatePhysicalLedgers: exactFilesBeforeDelete.notificationsSeparate,
  coordinatorReadsSessionAOnly: exactContext(contextA, sessionA, scopeA) && contextA.context.pending_count === 1
    && contextA.context.notifications.every(row => row.group_session_id === sessionA && row.typed_scope_id === scopeA),
  coordinatorReadsSessionBOnly: exactContext(contextB, sessionB, scopeB) && contextB.context.pending_count === 1
    && contextB.context.notifications.every(row => row.group_session_id === sessionB && row.typed_scope_id === scopeB),
  bareGroupCannotSeeExactNotifications: rootContext.context.pending_count === 0 && rootContext.context.exact_session === false,
  deliveriesRemainSessionOwned: deliveryFileA !== deliveryFileB
    && contextA.context.delivery?.recorded_count === 1 && contextB.context.delivery?.recorded_count === 1
    && contextA.context.delivery.entries[0].group_session_id === sessionA
    && contextB.context.delivery.entries[0].group_session_id === sessionB,
  acknowledgingADoesNotHideB: receiptA.group_session_id === sessionA && contextAfterAckA.context.pending_count === 0
    && contextAfterAckB.context.pending_count === 1 && contextAfterAckB.context.notifications[0].notification_id === notificationB.notification_id,
  receiptLedgerIsExactAndSiblingUntouched: exactFilesBeforeDelete.receiptAExists && !exactFilesBeforeDelete.receiptBExists
    && receiptA.typed_scope_id === scopeA && receiptA.notification_id === notificationA.notification_id,
  schedulerStateCarriesExactOwnership: [scopeA, scopeB].every(scopeId => stateBeforeDelete.groups[scopeId]?.exact_session === true
    && stateBeforeDelete.groups[scopeId]?.typed_scope_id === scopeId
    && stateBeforeDelete.groups[scopeId]?.source_group_id === groupId),
  deletionCleansStateAndBackupImmediately: deletion.conflictResolutionMaintenanceSchedulerArtifacts?.removed === true
    && !stateAfterDelete.groups[scopeA] && !backupAfterDelete.groups[scopeA]
    && !!stateAfterDelete.groups[scopeB] && !!backupAfterDelete.groups[scopeB],
  deletingAPreservesSiblingArtifacts: JSON.stringify(beforeDeleteB) === JSON.stringify(afterDeleteB)
    && !fs.existsSync(notificationFileA) && typed.scanGroupTypedMemoryDocuments(scopeA).length === 0,
  restartPrunesStaleScopeAndRunsOnlyB: child.status === 0 && restart?.tick?.prunedScopeCount === 1
    && restart.tick.prunedScopeIds.includes(staleScope) && restart.tick.groupCount === 1
    && restart.tick.rows[0]?.groupId === scopeB && restart.tick.rows[0]?.status === "completed"
    && !restart.state.groups[scopeA] && !restart.state.groups[staleScope] && !!restart.state.groups[scopeB],
  restartKeepsBNotificationContextExact: exactContext(restart?.context, sessionB, scopeB)
    && restart.context.context.pending_count === 1
    && restart.context.context.notifications.every(row => row.group_session_id === sessionB),
  persistedArtifactsRemainBodyFree: !JSON.stringify({ stateBeforeDelete, stateAfterDelete, restart, receiptA }).includes("raw_transcript_body"),
};

const failed = Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key);
const result = {
  schema: "ccm-conflict-maintenance-notification-lifecycle-exact-session-restart-selftest-v1",
  pass: failed.length === 0,
  checks,
  failed,
  observations: {
    scopes: firstTick.rows.map(row => row.groupId),
    notificationFiles: [notificationFileA, notificationFileB],
    deliveryFiles: [deliveryFileA, deliveryFileB],
    pending: { a: contextA.context?.pending_count, b: contextB.context?.pending_count, root: rootContext.context?.pending_count, afterAckA: contextAfterAckA.context?.pending_count, afterAckB: contextAfterAckB.context?.pending_count },
    deletion: deletion.conflictResolutionMaintenanceSchedulerArtifacts,
    siblingAfterRestart: { notificationBytes: afterRestartB.notification.length, deliveryBytes: afterRestartB.delivery.length, docs: afterRestartB.docs },
    restart: { status: child.status, stderr: String(child.stderr || ""), prunedScopeIds: restart?.tick?.prunedScopeIds || [], rows: restart?.tick?.rows?.map(row => ({ groupId: row.groupId, status: row.status })) || [] },
  },
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
