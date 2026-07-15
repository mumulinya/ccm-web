import { sendJson } from "../../core/utils";
import * as fs from "fs";
import * as path from "path";
import {
  loadAutoDevNotifyConfig,
  loadCronJobs,
  loadDevReports,
  loadDevWeeklyReports,
  loadTasks,
  saveTasks,
} from "../../core/db";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import {
  claimReadyDailyDevBacklog,
  continueDailyDevTasksFromGaps,
  createAndQueueTask,
  removeTaskFromQueues,
  retryTask,
  updateTask,
  importSharedDocsToDailyDevBacklog,
  markDailyDevBacklogStatus,
  type CollabCtx,
} from "../collaboration/collaboration";
import {
  acquireIdempotency,
  completeIdempotency,
  failIdempotency,
  getIdempotencyRecord,
} from "../../system/reliability-ledger";
import {
  computeNextRun,
  createCronJob,
  deleteCronJob,
  appendCronRun,
  findCronRunForTask,
  matchesCron,
  minuteKey,
  normalizeCronJob,
  normalizeTargetType,
  patchCronJob,
  patchCronRun,
  purgeCronJob,
  restoreCronJob,
  syncCronRunTask,
  updateCronJob,
  validateCronJobPayload,
} from "./cron-job-store";
import {
  dispatchAutoDevReport,
  localDateKey,
  normalizeAutoDevNotifyConfig,
  saveNormalizedNotifyConfig,
  tickAutoDevReportNotifications,
  upsertAutoDevDailyReport,
  upsertAutoDevWeeklyReport,
} from "./cron-dev-reports";
import {
  getWorkJournalAudit,
  listWorkJournalEvents,
} from "./work-journal";
import { loadGroups } from "../collaboration/storage";
import { tickFeishuNotificationOutbox } from "../collaboration/feishu-channel";
import { sendFeishuReportMessage } from "../collaboration/feishu";
import { cancelTestAgentRunsForTask } from "../collaboration/test-agent-runner";
import { requestTaskCancellation } from "../../agents/execution-kernel";
import { listTestAgentArtifactCatalogForTasks } from "../../test-agent/artifact-retention";
import {
  discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits,
  discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions,
  listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds,
  reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans,
  reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals,
  recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger,
  runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance,
  runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention,
  runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention,
} from "../collaboration/group-memory-index";

const runningCronJobs = new Set<string>();
let schedulerTimer: NodeJS.Timeout | null = null;
const CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE = path.join(CCM_DIR, "memory-control", "conflict-resolution-maintenance-scheduler.json");
let latestConflictResolutionMaintenanceTick: any = null;

function readConflictResolutionMaintenanceSchedulerState(file = CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE) {
  return readJsonWithBackup(file, { schema: "ccm-conflict-resolution-maintenance-scheduler-state-v1", version: 1, groups: {}, updated_at: "" });
}

function writeConflictResolutionMaintenanceSchedulerState(value: any, file = CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE) {
  writeJsonAtomic(file, value);
}

function conflictResolutionMaintenanceSchedulerScopeIdentity(scopeId: any) {
  const value = String(scopeId || "").trim();
  const match = value.match(/^(.*)--(gcs_[a-zA-Z0-9._-]+)$/);
  return {
    typedScopeId: value,
    rootGroupId: match?.[1] || value,
    groupSessionId: match?.[2] || "",
    exactSession: !!match,
  };
}

export function deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId: string, groupSessionId: string, options: any = {}) {
  const rootGroupId = String(groupId || "").trim();
  const exactSessionId = String(groupSessionId || "").trim();
  if (!rootGroupId || !/^gcs_[a-zA-Z0-9._-]+$/.test(exactSessionId)) throw new Error("exact group session is required for maintenance scheduler cleanup");
  const typedScopeId = `${rootGroupId}--${exactSessionId}`;
  const stateFile = String(options.stateFile || options.state_file || CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE);
  if (options.stateLockHeld !== true) {
    return withFileLock(stateFile, () => deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(rootGroupId, exactSessionId, {
      ...options,
      stateFile,
      stateLockHeld: true,
    }), {
      timeoutMs: options.stateLockTimeoutMs || options.state_lock_timeout_ms,
      staleMs: options.stateLockStaleMs || options.state_lock_stale_ms,
    });
  }
  const state = readConflictResolutionMaintenanceSchedulerState(stateFile);
  const groups = { ...(state.groups || {}) };
  const existed = Object.prototype.hasOwnProperty.call(groups, typedScopeId);
  delete groups[typedScopeId];
  const value = {
    schema: "ccm-conflict-resolution-maintenance-scheduler-state-v1",
    version: 1,
    groups,
    updated_at: String(options.at || new Date().toISOString()),
  };
  if (existed || options.persistEmpty === true || options.persist_empty === true) {
    writeConflictResolutionMaintenanceSchedulerState(value, stateFile);
    try { fs.copyFileSync(stateFile, `${stateFile}.bak`); } catch {}
  }
  return {
    schema: "ccm-conflict-resolution-maintenance-scheduler-session-cleanup-v1",
    source_group_id: rootGroupId,
    group_session_id: exactSessionId,
    typed_scope_id: typedScopeId,
    removed: existed,
    remaining_scope_count: Object.keys(groups).length,
    state_file: stateFile,
  };
}

export function runConflictResolutionMemoryMaintenanceSchedulerTick(options: any = {}) {
  const stateFile = String(options.stateFile || options.state_file || CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE);
  if (options.persist !== false && options.stateLockHeld !== true) {
    return withFileLock(stateFile, () => runConflictResolutionMemoryMaintenanceSchedulerTick({ ...options, stateFile, stateLockHeld: true }), {
      timeoutMs: options.stateLockTimeoutMs || options.state_lock_timeout_ms,
      staleMs: options.stateLockStaleMs || options.state_lock_stale_ms,
    });
  }
  const at = String(options.at || options.now || new Date().toISOString());
  const atMs = Date.parse(at);
  const state = readConflictResolutionMaintenanceSchedulerState(stateFile);
  const explicitGroupIds: any[] = Array.isArray(options.groupIds || options.group_ids) ? (options.groupIds || options.group_ids) : [];
  const rootGroupIds: string[] = [...new Set<string>((explicitGroupIds.length ? explicitGroupIds : loadGroups().map((group: any) => group.id || group.groupId))
    .map((value: any) => String(value || "").trim())
    .filter(Boolean))];
  const groupIds = listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds(rootGroupIds, {
    maxScopes: options.maxScopes || options.max_scopes || 1000,
  });
  const activeScopeIds = new Set(groupIds);
  const selectedRootGroupIds = new Set(rootGroupIds.map(value => conflictResolutionMaintenanceSchedulerScopeIdentity(value).rootGroupId));
  const prunedScopeIds: string[] = [];
  const nextStateGroups = { ...(state.groups || {}) };
  for (const scopeId of Object.keys(nextStateGroups)) {
    const identity = conflictResolutionMaintenanceSchedulerScopeIdentity(scopeId);
    if (!identity.exactSession || !selectedRootGroupIds.has(identity.rootGroupId) || activeScopeIds.has(scopeId)) continue;
    delete nextStateGroups[scopeId];
    prunedScopeIds.push(scopeId);
  }
  state.groups = nextStateGroups;
  const tickWindowMs = Math.max(60_000, Number(options.tickWindowMs || options.tick_window_ms || 5 * 60 * 1000));
  const baseBackoffMs = Math.max(1_000, Number(options.baseBackoffMs || options.base_backoff_ms || 60_000));
  const maxBackoffMs = Math.max(baseBackoffMs, Number(options.maxBackoffMs || options.max_backoff_ms || 6 * 60 * 60 * 1000));
  const runner = typeof options.runMaintenance === "function"
    ? options.runMaintenance
    : (ids: string[], runOptions: any) => runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(ids, runOptions);
  const telemetryRetentionRunner = typeof options.runTelemetryRetention === "function"
    ? options.runTelemetryRetention
    : (groupId: string, runOptions: any) => runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupId, runOptions);
  const telemetryRecoveryRunner = typeof options.runTelemetryRecovery === "function"
    ? options.runTelemetryRecovery
    : (groupId: string, runOptions: any) => recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupId, runOptions);
  const telemetryOrphanRunner = typeof options.runTelemetryOrphanReconciliation === "function"
    ? options.runTelemetryOrphanReconciliation
    : (groupId: string, runOptions: any) => reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, runOptions);
  const telemetryQuarantineRetentionRunner = typeof options.runTelemetryQuarantineRetention === "function"
    ? options.runTelemetryQuarantineRetention
    : (groupId: string, runOptions: any) => runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupId, runOptions);
  const telemetryCleanupJournalRunner = typeof options.runTelemetryCleanupJournalReconciliation === "function"
    ? options.runTelemetryCleanupJournalReconciliation
    : (groupId: string, runOptions: any) => reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupId, runOptions);
  const telemetryCleanupCommitDiscoveryRunner = typeof options.runTelemetryCleanupCommitDiscovery === "function"
    ? options.runTelemetryCleanupCommitDiscovery
    : (groupId: string, runOptions: any) => discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupId, runOptions);
  const telemetryCleanupCommitRepairResolutionRunner = typeof options.runTelemetryCleanupCommitRepairResolutionReconciliation === "function"
    ? options.runTelemetryCleanupCommitRepairResolutionReconciliation
    : (groupId: string, runOptions: any) => discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions(groupId, { ...runOptions, persist: true, recover: true });
  const rows: any[] = [];
  for (const groupId of groupIds) {
    const groupState = state.groups?.[groupId] || {};
    const scopeIdentity = conflictResolutionMaintenanceSchedulerScopeIdentity(groupId);
    const nextRetryMs = Date.parse(String(groupState.next_retry_at || ""));
    if (Number.isFinite(nextRetryMs) && Number.isFinite(atMs) && atMs < nextRetryMs) {
      rows.push({ groupId, status: "backoff", skipped: true, nextRetryAt: groupState.next_retry_at, destructiveActionAuthorized: false, deletedCount: 0 });
      continue;
    }
    const windowKey = Number.isFinite(atMs) ? Math.floor(atMs / tickWindowMs) : Math.floor(Date.now() / tickWindowMs);
    const operationKey = `${groupId}:${windowKey}`;
    const operation = acquireIdempotency({
      scope: "conflict-resolution-memory-maintenance",
      key: operationKey,
      leaseMs: Math.max(30_000, Math.min(tickWindowMs, 10 * 60 * 1000)),
      metadata: {
        group_id: groupId,
        source_group_id: scopeIdentity.rootGroupId,
        group_session_id: scopeIdentity.groupSessionId,
        typed_scope_id: scopeIdentity.typedScopeId,
        exact_session: scopeIdentity.exactSession,
        maintenance_window: windowKey,
        scheduler: true,
        destructive_action_authorized: false,
      },
    });
    if (!operation.acquired) {
      rows.push({
        groupId,
        status: "duplicate_suppressed",
        skipped: true,
        duplicate: true,
        inProgress: operation.inProgress === true,
        operationKey,
        destructiveActionAuthorized: false,
        deletedCount: 0,
      });
      continue;
    }
    try {
      const result = runner([groupId], {
        at,
        force: options.force === true,
        persist: true,
        emitNotifications: true,
        intervalMs: options.intervalMs || options.interval_ms,
        gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
      });
      if (result?.destructiveActionAuthorized !== false || Number(result?.deletedCount || 0) !== 0) {
        throw new Error("background maintenance violated non-destructive scheduler boundary");
      }
      const telemetryRecovery = telemetryRecoveryRunner(groupId, { at, apply: true, trigger: "background" });
      const telemetryOrphans = telemetryOrphanRunner(groupId, { at, persist: true, trigger: "background" });
      const telemetryCleanupCommitRepairResolutionTransactions = telemetryCleanupCommitRepairResolutionRunner(groupId, { at, persist: true, trigger: "startup-scheduler" });
      const telemetryCleanupCommitDiscovery = telemetryCleanupCommitDiscoveryRunner(groupId, { at, persist: true, recover: true, trigger: "startup-scheduler" });
      const telemetryCleanupJournals = telemetryCleanupJournalRunner(groupId, { at, persist: true, trigger: "background" });
      const telemetryQuarantineRetention = telemetryQuarantineRetentionRunner(groupId, { at, trigger: "background" });
      for (const telemetryResult of [telemetryRecovery, telemetryOrphans, telemetryCleanupCommitDiscovery, telemetryCleanupCommitRepairResolutionTransactions, telemetryCleanupJournals, telemetryQuarantineRetention]) {
        if (telemetryResult?.destructive_action_authorized !== false
          || Number(telemetryResult?.created_task_count || 0) !== 0
          || Number(telemetryResult?.created_approval_receipt_count || 0) !== 0
          || Number(telemetryResult?.deleted_count || 0) !== 0) {
          throw new Error("background delivery telemetry recovery violated non-destructive scheduler boundary");
        }
      }
      if (telemetryCleanupJournals?.ledger_checksum_valid === false
        || telemetryCleanupJournals?.commit_ledger_checksum_valid === false
        || Number(telemetryCleanupJournals?.invalid_commit_transaction_count || 0) !== 0
        || telemetryCleanupJournals?.group_ledger_lock_valid === false
        || Number(telemetryCleanupJournals?.candidate_claim_conflict_count || 0) !== 0) {
        throw new Error("background delivery cleanup ledger CAS integrity check failed");
      }
      if (telemetryCleanupCommitRepairResolutionTransactions?.ledger_checksum_valid === false
        && Number(telemetryCleanupCommitRepairResolutionTransactions?.contained_invalid_transaction_count || 0) === 0
        || Number(telemetryCleanupCommitRepairResolutionTransactions?.uncontained_invalid_transaction_count || 0) !== 0
        || Number(telemetryCleanupCommitRepairResolutionTransactions?.recoverable_transaction_count || 0) !== 0
        || telemetryCleanupCommitRepairResolutionTransactions?.status === "blocked") {
        throw new Error("background cleanup commit repair resolution transaction recovery failed");
      }
      const telemetryRetention = telemetryRetentionRunner(groupId, {
        at,
        terminalAgeMs: options.deliveryTerminalAgeMs || options.delivery_terminal_age_ms,
        maxHotEntries: options.deliveryMaxHotEntries || options.delivery_max_hot_entries,
        maxCompactedEntries: options.deliveryMaxCompactedEntries || options.delivery_max_compacted_entries,
      });
      if (telemetryRetention?.destructive_action_authorized !== false
        || Number(telemetryRetention?.created_task_count || 0) !== 0
        || Number(telemetryRetention?.created_approval_receipt_count || 0) !== 0
        || Number(telemetryRetention?.deleted_count || 0) !== 0) {
        throw new Error("background delivery telemetry retention violated non-destructive scheduler boundary");
      }
      completeIdempotency("conflict-resolution-memory-maintenance", operationKey, {
        success: true,
        group_id: groupId,
        due_count: Number(result?.dueCount || 0),
        skipped_count: Number(result?.skippedCount || 0),
        destructive_action_authorized: false,
        deleted_count: 0,
        delivery_retention_status: telemetryRetention?.status || "",
        delivery_retention_generation: Number(telemetryRetention?.retention_generation || 0),
        delivery_recovery_status: telemetryRecovery?.status || "",
        delivery_orphan_candidate_count: Number(telemetryOrphans?.candidate_count || 0),
        delivery_quarantine_retention_status: telemetryQuarantineRetention?.status || "",
        delivery_cleanup_open_journal_count: Number(telemetryCleanupJournals?.open_journal_count || 0),
        delivery_cleanup_leased_journal_count: Number(telemetryCleanupJournals?.leased_journal_count || 0),
        delivery_cleanup_abandoned_journal_count: Number(telemetryCleanupJournals?.abandoned_journal_count || 0),
        delivery_cleanup_reconciled_journal_count: Number(telemetryCleanupJournals?.reconciled_journal_count || 0),
        delivery_cleanup_recovered_executor_count: Number(telemetryCleanupJournals?.recovered_executor_count || 0),
        delivery_cleanup_journal_ledger_revision: Number(telemetryCleanupJournals?.ledger_revision || 0),
        delivery_cleanup_journal_ledger_checksum_valid: telemetryCleanupJournals?.ledger_checksum_valid !== false,
        delivery_cleanup_candidate_claim_conflict_count: Number(telemetryCleanupJournals?.candidate_claim_conflict_count || 0),
        delivery_cleanup_commit_ledger_revision: Number(telemetryCleanupJournals?.commit_ledger_revision || 0),
        delivery_cleanup_open_commit_transaction_count: Number(telemetryCleanupJournals?.open_commit_transaction_count || 0),
        delivery_cleanup_invalid_commit_transaction_count: Number(telemetryCleanupJournals?.invalid_commit_transaction_count || 0),
        delivery_cleanup_recovered_commit_transaction_count: Number(telemetryCleanupJournals?.recovered_commit_transaction_count || 0),
        delivery_cleanup_discovered_commit_transaction_count: Number(telemetryCleanupCommitDiscovery?.transaction_count || 0),
        delivery_cleanup_invalid_discovered_commit_transaction_count: Number(telemetryCleanupCommitDiscovery?.invalid_transaction_count || 0),
        delivery_cleanup_commit_repair_work_item_count: Number(telemetryCleanupCommitDiscovery?.repair_work_item_count || 0),
        delivery_cleanup_commit_repair_dispatch_brief_count: Number(telemetryCleanupCommitDiscovery?.repair_dispatch_brief_count || 0),
        delivery_cleanup_commit_repair_resolution_transaction_count: Number(telemetryCleanupCommitRepairResolutionTransactions?.transaction_count || 0),
        delivery_cleanup_commit_repair_resolution_recovered_now_count: Number(telemetryCleanupCommitRepairResolutionTransactions?.recovered_now_count || 0),
        delivery_cleanup_commit_repair_resolution_open_transaction_count: Number(telemetryCleanupCommitRepairResolutionTransactions?.open_transaction_count || 0),
        delivery_cleanup_commit_repair_resolution_invalid_transaction_count: Number(telemetryCleanupCommitRepairResolutionTransactions?.invalid_transaction_count || 0),
        delivery_cleanup_commit_repair_resolution_contained_invalid_transaction_count: Number(telemetryCleanupCommitRepairResolutionTransactions?.contained_invalid_transaction_count || 0),
        delivery_cleanup_commit_repair_resolution_compacted_transaction_count: Number(telemetryCleanupCommitRepairResolutionTransactions?.compacted_transaction_count || 0),
      });
      state.groups = { ...(state.groups || {}), [groupId]: {
        source_group_id: scopeIdentity.rootGroupId,
        group_session_id: scopeIdentity.groupSessionId,
        typed_scope_id: scopeIdentity.typedScopeId,
        exact_session: scopeIdentity.exactSession,
        failure_count: 0,
        next_retry_at: "",
        last_success_at: at,
        last_operation_key: operationKey,
        last_status: Number(result?.dueCount || 0) > 0 ? "completed" : "not_due",
      } };
      rows.push({ groupId, status: Number(result?.dueCount || 0) > 0 ? "completed" : "not_due", skipped: Number(result?.dueCount || 0) === 0, operationKey, result, telemetryRecovery, telemetryOrphans, telemetryCleanupCommitDiscovery, telemetryCleanupCommitRepairResolutionTransactions, telemetryCleanupJournals, telemetryQuarantineRetention, telemetryRetention, destructiveActionAuthorized: false, deletedCount: 0 });
    } catch (error: any) {
      failIdempotency("conflict-resolution-memory-maintenance", operationKey, error);
      const failureCount = Number(groupState.failure_count || 0) + 1;
      const backoffMs = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, Math.max(0, failureCount - 1)));
      const nextRetryAt = new Date((Number.isFinite(atMs) ? atMs : Date.now()) + backoffMs).toISOString();
      state.groups = { ...(state.groups || {}), [groupId]: {
        ...groupState,
        source_group_id: scopeIdentity.rootGroupId,
        group_session_id: scopeIdentity.groupSessionId,
        typed_scope_id: scopeIdentity.typedScopeId,
        exact_session: scopeIdentity.exactSession,
        failure_count: failureCount,
        next_retry_at: nextRetryAt,
        last_failure_at: at,
        last_error: String(error?.message || error).slice(0, 1000),
        last_operation_key: operationKey,
        last_status: "failed",
      } };
      rows.push({ groupId, status: "failed", skipped: false, operationKey, error: String(error?.message || error), failureCount, nextRetryAt, destructiveActionAuthorized: false, deletedCount: 0 });
    }
  }
  const value = {
    schema: "ccm-conflict-resolution-maintenance-scheduler-state-v1",
    version: 1,
    groups: state.groups || {},
    updated_at: at,
  };
  if (options.persist !== false) writeConflictResolutionMaintenanceSchedulerState(value, stateFile);
  const report = {
    schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
    at,
    groupCount: groupIds.length,
    exactSessionCount: groupIds.filter(groupId => conflictResolutionMaintenanceSchedulerScopeIdentity(groupId).exactSession).length,
    legacyScopeCount: groupIds.filter(groupId => !conflictResolutionMaintenanceSchedulerScopeIdentity(groupId).exactSession).length,
    prunedScopeCount: prunedScopeIds.length,
    prunedScopeIds,
    completedCount: rows.filter(row => row.status === "completed").length,
    notDueCount: rows.filter(row => row.status === "not_due").length,
    duplicateSuppressedCount: rows.filter(row => row.status === "duplicate_suppressed").length,
    backoffCount: rows.filter(row => row.status === "backoff").length,
    failedCount: rows.filter(row => row.status === "failed").length,
    destructiveActionAuthorized: false,
    deletedCount: 0,
    createdTaskCount: 0,
    createdApprovalReceiptCount: 0,
    deliveryRetentionCount: rows.filter(row => row.telemetryRetention).length,
    deliveryRetentionBlockedCount: rows.filter(row => row.telemetryRetention?.status === "blocked").length,
    deliveryRecoveryCount: rows.filter(row => row.telemetryRecovery?.recovered === true).length,
    deliveryRecoveryBlockedCount: rows.filter(row => row.telemetryRecovery?.status === "blocked").length,
    deliveryOrphanCandidateCount: rows.reduce((sum, row) => sum + Number(row.telemetryOrphans?.candidate_count || 0), 0),
    deliveryQuarantineRetentionCount: rows.filter(row => row.telemetryQuarantineRetention && row.telemetryQuarantineRetention.status !== "empty").length,
    deliveryQuarantineRetentionBlockedCount: rows.filter(row => row.telemetryQuarantineRetention?.status === "blocked").length,
    deliveryCleanupOpenJournalCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.open_journal_count || 0), 0),
    deliveryCleanupLeasedJournalCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.leased_journal_count || 0), 0),
    deliveryCleanupAbandonedJournalCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.abandoned_journal_count || 0), 0),
    deliveryCleanupReconciledJournalCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.reconciled_journal_count || 0), 0),
    deliveryCleanupRecoveredExecutorCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.recovered_executor_count || 0), 0),
    deliveryCleanupCandidateClaimConflictCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.candidate_claim_conflict_count || 0), 0),
    deliveryCleanupInvalidLedgerCount: rows.filter(row => row.telemetryCleanupJournals?.ledger_checksum_valid === false || row.telemetryCleanupJournals?.group_ledger_lock_valid === false).length,
    deliveryCleanupOpenCommitTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.open_commit_transaction_count || 0), 0),
    deliveryCleanupInvalidCommitTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.invalid_commit_transaction_count || 0), 0),
    deliveryCleanupRecoveredCommitTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupJournals?.recovered_commit_transaction_count || 0), 0),
    deliveryCleanupDiscoveredCommitTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitDiscovery?.transaction_count || 0), 0),
    deliveryCleanupInvalidDiscoveredCommitTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitDiscovery?.invalid_transaction_count || 0), 0),
    deliveryCleanupCommitRepairWorkItemCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitDiscovery?.repair_work_item_count || 0), 0),
    deliveryCleanupCommitRepairDispatchBriefCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitDiscovery?.repair_dispatch_brief_count || 0), 0),
    deliveryCleanupCommitRepairResolutionTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitRepairResolutionTransactions?.transaction_count || 0), 0),
    deliveryCleanupCommitRepairResolutionRecoveredNowCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitRepairResolutionTransactions?.recovered_now_count || 0), 0),
    deliveryCleanupCommitRepairResolutionOpenTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitRepairResolutionTransactions?.open_transaction_count || 0), 0),
    deliveryCleanupCommitRepairResolutionInvalidTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitRepairResolutionTransactions?.invalid_transaction_count || 0), 0),
    deliveryCleanupCommitRepairResolutionContainedInvalidTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitRepairResolutionTransactions?.contained_invalid_transaction_count || 0), 0),
    deliveryCleanupCommitRepairResolutionCompactedTransactionCount: rows.reduce((sum, row) => sum + Number(row.telemetryCleanupCommitRepairResolutionTransactions?.compacted_transaction_count || 0), 0),
    deliveryCleanupDeletedCount: 0,
    rows,
    stateFile,
  };
  latestConflictResolutionMaintenanceTick = report;
  return report;
}

function buildTaskFromCronJob(job: any, trigger: "manual" | "schedule" | "recovery" | "retry" | "resume") {
  const targetType = normalizeTargetType(job);
  const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
  const requiresCodeChanges = workflowType === "daily_dev"
    ? (job.requires_code_changes ?? job.requiresCodeChanges ?? true)
    : false;
  const triggerText = trigger === "manual" ? "手动执行" : "计划执行";
  const buildCronSourceDocuments = (extra = "") => [
    `[定时任务 ${job.name || job.id || "未命名"}]`,
    `触发方式：${triggerText}`,
    `Cron 表达式：${job.schedule || ""}`,
    "定时任务提示词：",
    job.prompt || "",
    extra ? "\n已认领/生成的业务文档：" : "",
    extra,
  ].filter(Boolean).join("\n");
  const cronMeta: any = {
    workflow_type: workflowType,
    imported_shared_docs: null,
    claimed_backlogs: [],
  };
  const buildBacklogTask = (backlog: any, batchIndex = 0, batchTotal = 1) => {
    const description = [
      `定时任务来源：${job.name}`,
      `触发方式：${triggerText}`,
      `Cron 表达式：${job.schedule}`,
      `工作流类型：业务开发 daily_dev`,
      `需求池文件：${backlog.backlog_file}`,
      batchTotal > 1 ? `批量认领：第 ${batchIndex + 1}/${batchTotal} 条` : "",
      `代码变更要求：${requiresCodeChanges && backlog.requires_code_changes !== false ? "必须有实际文件变更才能完成" : "允许无代码变更"}`,
      "",
      "定时任务提示词：",
      job.prompt,
      "",
      "已认领的需求池内容：",
      backlog.documents,
      "",
      "主 Agent 执行要求：",
      "- 按已认领需求拆分给对应项目子 Agent。",
      "- 子 Agent 必须返回 CCM_AGENT_RECEIPT。",
      "- 最终报告必须覆盖完成内容、涉及文件、验证结果、风险和仍需用户确认的事项。",
    ].filter(line => line !== "").join("\n");

    return {
      title: `[定时] ${backlog.title}`,
      description,
      target_project: "coordinator",
      group_id: job.group_id,
      assign_type: "group",
      priority: backlog.priority || job.priority || "normal",
      auto_execute: true,
      workflow_type: "daily_dev",
      requires_code_changes: requiresCodeChanges && backlog.requires_code_changes !== false,
      requires_verification: true,
      business_goal: backlog.business_goal || backlog.title || String(job.prompt || job.name || "").slice(0, 500),
      acceptance_criteria: backlog.acceptance || "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。",
      source_documents: buildCronSourceDocuments(backlog.documents),
      workflow_meta: {
        intake: {
          backlog_file: backlog.backlog_file,
          claimed_by_cron_job_id: job.id,
          cron_trigger: trigger,
          claimed_at: new Date().toISOString(),
        },
        batch: batchTotal > 1 ? { index: batchIndex + 1, total: batchTotal } : null,
        cron: cronMeta,
      },
      cron_job_id: job.id,
      cron_trigger: trigger,
    };
  };

  if (workflowType === "daily_dev" && targetType === "group") {
    const shouldImportSharedDocs = job.import_shared_docs !== false && job.importSharedDocs !== false;
    if (shouldImportSharedDocs) {
      const importResult = importSharedDocsToDailyDevBacklog({
        group_id: job.group_id,
        limit: Math.max(1, Math.min(20, Number(job.import_shared_docs_limit || job.importSharedDocsLimit || job.backlog_batch_limit || job.backlogBatchLimit || 1))),
        priority: job.priority || "normal",
        requires_code_changes: requiresCodeChanges,
        source: "cron",
      });
      cronMeta.imported_shared_docs = {
        imported: importResult.imported || 0,
        skipped: importResult.skipped || 0,
        items: (importResult.items || []).map((item: any) => ({
          source: item.source,
          backlog: item.backlog,
          title: item.title,
        })),
      };
    }
    const batchLimit = Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1)));
    const claimed: any[] = [];
    for (let i = 0; i < batchLimit; i++) {
      const backlog = claimReadyDailyDevBacklog(job.group_id, { source: "cron", cron_job_id: job.id, trigger });
      if (!backlog) break;
      claimed.push(backlog);
    }
    if (claimed.length > 0) {
      const total = claimed.length;
      cronMeta.claimed_backlogs = claimed.map((backlog: any) => ({
        backlog_file: backlog.backlog_file,
        title: backlog.title,
        priority: backlog.priority,
      }));
      const drafts = claimed.map((backlog, index) => buildBacklogTask(backlog, index, total));
      return { drafts: batchLimit > 1 ? drafts : [drafts[0]], meta: cronMeta };
    }
  }

  if (workflowType === "daily_dev" && targetType === "group" && job.run_without_backlog !== true && job.allow_empty_run !== true) {
    return { drafts: [], meta: cronMeta };
  }

  const description = [
    `定时任务来源：${job.name}`,
    `触发方式：${triggerText}`,
    `Cron 表达式：${job.schedule}`,
    workflowType === "daily_dev" ? "工作流类型：业务开发 daily_dev" : "",
    workflowType === "daily_dev"
      ? `代码变更要求：${requiresCodeChanges ? "必须有实际文件变更才能完成" : "允许无代码变更"}`
      : "",
    "",
    job.prompt,
  ].filter(line => line !== "").join("\n");

  const draft = {
    title: `[定时] ${job.name}`,
    description,
    target_project: targetType === "group" ? "coordinator" : job.project,
    group_id: targetType === "group" ? job.group_id : null,
    assign_type: targetType === "group" ? "group" : "project",
    priority: job.priority || "normal",
    auto_execute: true,
    workflow_type: workflowType,
    requires_code_changes: requiresCodeChanges,
    requires_verification: workflowType === "daily_dev",
    business_goal: workflowType === "daily_dev" ? String(job.prompt || job.name || "").slice(0, 500) : "",
    acceptance_criteria: workflowType === "daily_dev" ? "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。" : "",
    source_documents: workflowType === "daily_dev" ? buildCronSourceDocuments("来自定时任务提示词、群聊共享文件或 backlog 文档。") : "",
    cron_job_id: job.id,
    cron_trigger: trigger,
  };
  return { drafts: [draft], meta: cronMeta };
}

export function runCronDailyDevProtocolSelfTest() {
  const job = {
    id: "cron-daily-dev-self-test",
    name: "退款审核定时开发",
    schedule: "*/30 * * * *",
    target_type: "group",
    group_id: "demo-group",
    workflow_type: "daily_dev",
    run_without_backlog: true,
    prompt: "按接口文档实现退款审核，接口 POST /api/refunds/:id/audit，字段 approved、reason。",
  };
  const result = buildTaskFromCronJob(job, "manual");
  const draft = Array.isArray(result?.drafts) ? result.drafts[0] : null;
  const sourceDocs = String(draft?.source_documents || "");
  const checks = {
    hasDraft: !!draft,
    workflowDailyDev: draft?.workflow_type === "daily_dev",
    targetCoordinatorGroup: draft?.assign_type === "group" && draft?.target_project === "coordinator",
    requiresVerification: draft?.requires_verification === true,
    sourceDocumentsIncludePrompt: sourceDocs.includes("/api/refunds") && sourceDocs.includes("approved"),
    hasCronMeta: draft?.cron_job_id === job.id && draft?.cron_trigger === "manual",
  };
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    source_documents_preview: sourceDocs.slice(0, 500),
  };
}

function formatCronMetaSummary(meta: any = {}) {
  const imported = meta?.imported_shared_docs;
  const continued = meta?.continued_gap_tasks;
  const parts: string[] = [];
  if (continued) parts.push(`续跑缺口任务 ${Number(continued.continued || 0)} 个`);
  if (imported) parts.push(`导入共享文档 ${Number(imported.imported || 0)} 个`);
  if (Array.isArray(meta?.claimed_backlogs)) parts.push(`认领需求 ${meta.claimed_backlogs.length} 条`);
  return parts.length ? `；${parts.join("，")}` : "";
}

function attachCronRunToTasks(taskIds: string[], cronJobId: string, cronRunId: string) {
  const wanted = new Set((taskIds || []).map(item => String(item || "").trim()).filter(Boolean));
  if (!wanted.size) return;
  const tasks = loadTasks();
  let changed = false;
  for (const task of tasks) {
    if (!wanted.has(String(task.id || ""))) continue;
    task.cron_job_id = cronJobId;
    task.cron_run_id = cronRunId;
    task.workflow_meta = {
      ...(task.workflow_meta || {}),
      cron_run_id: cronRunId,
    };
    changed = true;
  }
  if (changed) saveTasks(tasks);
}

function cronFriendlyText(value: any, fallback = "", limit = 220) {
  const text = String(value || "")
    .replace(/<task-notification>[\s\S]*?<\/task-notification>/gi, "")
    .replace(/CCM_AGENT_(?:RECEIPT|REQUESTS)[\s\S]*/gi, "")
    .replace(/主\s*Agent\s*计划[:：][\s\S]*/gi, "")
    .replace(/用户本地执行[:：][\s\S]*/gi, "仍有一项本地操作需要用户处理，详情请在任务中查看。")
    .replace(/[A-Za-z]:[\\/][^\r\n；;，。)]*/g, "技术详情里的证据文件")
    .replace(/\b(?:trace_id|session_id|run_id)\s*[:=]\s*[^\s,;]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return fallback;
  return text.length > limit ? `${text.slice(0, Math.max(1, limit - 1))}…` : text;
}

function taskTodoSummary(task: any) {
  const plans = [
    task?.live_todo_plan,
    task?.todo_plan,
    task?.mainAgentDecision?.todo_plan,
    task?.main_agent_decision?.todo_plan,
  ].filter(Boolean);
  const candidateSteps = [
    task?.user_plan_steps,
    task?.mainAgentDecision?.user_plan_steps,
    task?.main_agent_decision?.user_plan_steps,
    ...plans.map(plan => plan?.steps || plan?.items),
  ].find(value => Array.isArray(value) && value.length > 0) || [];
  const steps = candidateSteps.slice(0, 12).map((step: any, index: number) => ({
    id: String(step?.id || index + 1),
    label: cronFriendlyText(step?.label || step?.title || step?.text || step?.description, `步骤 ${index + 1}`, 100),
    status: String(step?.status || "pending"),
  }));
  if (!steps.length) return null;
  const completed = steps.filter((step: any) => ["completed", "done", "passed", "skipped"].includes(step.status)).length;
  const current = steps.find((step: any) => !["completed", "done", "passed", "skipped", "cancelled"].includes(step.status)) || steps.at(-1);
  return { total: steps.length, completed, current, steps };
}

function taskTestAgentSummary(task: any, artifactRuns: any[]) {
  const runs = [...(artifactRuns || [])].sort((left, right) => String(right.finished_at || right.started_at || "").localeCompare(String(left.finished_at || left.started_at || "")));
  const latest = runs[0];
  const direct = task?.test_agent_report || task?.testAgentReport || task?.receipt?.test_agent_report || task?.receipt?.testAgentReport || null;
  const verdict = task?.test_agent_verdict || task?.testAgentVerdict || direct?.verdict || null;
  if (!latest && !direct && !verdict) return null;
  const artifacts = runs.flatMap(run => Array.isArray(run.artifacts) ? run.artifacts : []);
  return {
    status: String(latest?.status || verdict?.status || direct?.status || "recorded"),
    recommendation: String(latest?.recommendation || verdict?.recommendation || direct?.recommendation || ""),
    summary: cronFriendlyText(latest?.summary || direct?.summary || verdict?.reason, "TestAgent 已保存验收记录", 180),
    run_count: runs.length || 1,
    evidence_count: artifacts.length,
    screenshot_count: artifacts.filter(item => item.preview_kind === "image" || /screenshot/i.test(String(item.type || ""))).length,
    evidence_available: artifacts.some(item => item.available === true),
  };
}

function synthesizedTaskTodo(task: any, testAgent: any) {
  const status = String(task?.status || "pending");
  const done = ["done", "completed", "passed"].includes(status);
  const failed = ["failed", "cancelled"].includes(status);
  const active = ["in_progress", "running", "reviewing"].includes(status);
  const waiting = ["waiting", "needs_user", "paused", "blocked"].includes(status);
  const testPassed = ["passed", "done", "completed"].includes(String(testAgent?.status || "")) || testAgent?.recommendation === "accept";
  const steps = [
    { id: "intake", label: "理解本次任务要求", status: "completed" },
    { id: "plan", label: "群聊主 Agent 制定并派发计划", status: active || waiting || done || failed ? "completed" : "in_progress" },
    { id: "execution", label: "项目子 Agent 完成任务", status: done || testAgent ? "completed" : failed ? "failed" : active ? "in_progress" : waiting ? "needs_confirmation" : "pending" },
    { id: "test", label: "TestAgent 独立验收", status: testPassed ? "completed" : testAgent ? "reviewing" : failed ? "failed" : "pending" },
    { id: "delivery", label: "群聊主 Agent 复盘并交付总结", status: done ? "completed" : failed ? "failed" : waiting ? "needs_confirmation" : "pending" },
  ];
  const completed = steps.filter(step => ["completed", "done", "passed", "skipped"].includes(step.status)).length;
  const current = steps.find(step => !["completed", "done", "passed", "skipped", "cancelled"].includes(step.status)) || steps.at(-1);
  return { total: steps.length, completed, current, steps, synthesized: true };
}

function publicCronTaskSummary(task: any, artifactRuns: any[]) {
  const delivery = task?.delivery_summary || task?.deliverySummary || {};
  const testAgent = taskTestAgentSummary(task, artifactRuns);
  const todo = taskTodoSummary(task) || synthesizedTaskTodo(task, testAgent);
  return {
    id: String(task?.id || ""),
    title: cronFriendlyText(task?.title, "定时任务", 120),
    status: String(task?.status || "pending"),
    phase: String(task?.collaboration_state?.phase || task?.phase || ""),
    status_detail: cronFriendlyText(task?.status_detail || delivery?.detail || delivery?.headline || task?.result, "等待主 Agent 更新进度", 180),
    trace_id: String(task?.trace_id || ""),
    group_id: String(task?.group_id || ""),
    todo,
    main_agent: {
      headline: cronFriendlyText(delivery?.headline || task?.status_detail, "主 Agent 正在跟进", 120),
      summary: cronFriendlyText(delivery?.detail || task?.final_report || task?.result, "等待主 Agent 汇总", 200),
      acceptance_passed: delivery?.acceptance_gate_passed === true || task?.status === "done",
    },
    test_agent: testAgent,
    replay_available: !!task?.id,
  };
}

function publicCronJobs(rawJobs: any[]) {
  const jobs = rawJobs.map(normalizeCronJob);
  const taskIds = [...new Set(jobs.flatMap(job => job.run_history || []).flatMap((run: any) => run.task_ids || []).map((id: any) => String(id || "")).filter(Boolean))];
  const taskMap = new Map(loadTasks().filter(task => taskIds.includes(String(task.id || ""))).map(task => [String(task.id), task]));
  const artifacts = taskIds.length ? listTestAgentArtifactCatalogForTasks(taskIds) : [];
  const artifactsByTask = new Map<string, any[]>();
  for (const run of artifacts) artifactsByTask.set(run.task_id, [...(artifactsByTask.get(run.task_id) || []), run]);
  return jobs.map(job => ({
    ...job,
    last_result: cronFriendlyText(job.last_result, "暂无结果", 220),
    run_history: (job.run_history || []).map((run: any) => ({
      ...run,
      result: cronFriendlyText(run.result, "等待执行结果", 220),
      task_states: Object.fromEntries(Object.entries(run.task_states || {}).map(([taskId, state]: any) => [taskId, {
        status: String(state?.status || ""),
        result: cronFriendlyText(state?.result, "", 160),
        updated_at: state?.updated_at || "",
      }])),
      tasks: (run.task_ids || []).map((taskId: string) => taskMap.get(taskId)).filter(Boolean).map((task: any) => publicCronTaskSummary(task, artifactsByTask.get(String(task.id)) || [])),
    })),
  }));
}

const CRON_RUN_ACTIVE_STATUSES = new Set(["triggering", "running", "queued", "running_task", "waiting", "retry_waiting"]);

function cronRetryPatch(job: any, run: any, now = new Date()) {
  const retryLimit = Math.max(0, Number(job?.retry_limit ?? 2));
  const attempt = Math.max(1, Number(run?.attempt || 1));
  if (attempt > retryLimit || run?.retry_child_run_id) return { next_retry_at: null };
  const interval = Math.max(1, Number(job?.retry_interval_minutes || 10));
  return {
    next_retry_at: new Date(now.getTime() + interval * 60_000).toISOString(),
    retry_reason: String(run?.result || "本轮执行失败"),
  };
}

async function sendCronRunNotification(jobId: string, runId: string, event: string) {
  const job = loadCronJobs().find(item => item.id === jobId);
  const run = job?.run_history?.find((item: any) => item.id === runId);
  const normalized = job ? normalizeCronJob(job) : null;
  if (!job || !run || !normalized?.notification_enabled || !normalized.notify_on.includes(event)) return { skipped: true };
  const previous = run.notifications?.[event];
  if (["sending", "sent"].includes(String(previous?.status || ""))) return { skipped: true, duplicate: true };
  patchCronRun(jobId, runId, { notifications: { ...(run.notifications || {}), [event]: { status: "sending", at: new Date().toISOString() } } });
  const eventLabel: Record<string, string> = { started: "已开始", done: "已完成", failed: "执行失败", waiting: "等待处理", recovered: "已补跑", cancelled: "已取消" };
  const result = await sendFeishuReportMessage({
    title: `定时任务${eventLabel[event] || event}：${job.name}`,
    markdown: [`**${job.name}** ${eventLabel[event] || event}`, `- 状态：${String(run.status || event)}`, `- 结果：${String(run.result || "暂无结果").slice(0, 500)}`, `- 目标：${job.target_type === "group" ? "群聊协作" : "项目 Agent"}`, `- 时区：${normalized.timezone}`].join("\n"),
  });
  const latest = loadCronJobs().find(item => item.id === jobId)?.run_history?.find((item: any) => item.id === runId);
  patchCronRun(jobId, runId, { notifications: { ...(latest?.notifications || {}), [event]: { status: result?.success ? "sent" : "failed", at: new Date().toISOString(), error: result?.success ? "" : String(result?.error || "通知发送失败") } } });
  return result;
}

function notifyCronRun(jobId: string, runId: string, event: string) {
  void sendCronRunNotification(jobId, runId, event).catch(error => console.error("[Cron] 飞书通知失败", error?.message || error));
}

function scheduleFailedCronRunRetry(job: any, run: any, now = new Date()) {
  if (!job || !run || run.status !== "failed") return run;
  const retry = cronRetryPatch(job, run, now);
  const updated = patchCronRun(job.id, run.id, retry.next_retry_at ? { ...retry, status: "retry_waiting" } : retry);
  if (retry.next_retry_at) patchCronJob(job.id, { last_status: "retry_waiting", last_result: `执行失败，将在 ${retry.next_retry_at} 自动重试` });
  return updated;
}

async function retryCronRun(jobId: string, runId: string, ctx: CollabCtx, trigger: "retry" | "resume" = "retry") {
  const job = loadCronJobs().find(item => item.id === jobId);
  if (!job) throw new Error("定时任务不存在");
  const parent = normalizeCronJob(job).run_history.find((item: any) => item.id === runId);
  if (!parent) throw new Error("运行记录不存在");
  if (parent.retry_child_run_id) {
    const existing = normalizeCronJob(loadCronJobs().find(item => item.id === jobId)).run_history.find((item: any) => item.id === parent.retry_child_run_id);
    if (existing && CRON_RUN_ACTIVE_STATUSES.has(existing.status)) return { success: true, duplicate: true, run: existing };
  }
  const tasks = loadTasks().filter(task => (parent.task_ids || []).includes(String(task.id || "")));
  const retryable = tasks.filter(task => !["done", "completed"].includes(String(task.status || "").toLowerCase()));
  if (!retryable.length) {
    return runCronJob(jobId, ctx, trigger, { parentRunId: parent.id, attempt: Number(parent.attempt || 1) + 1 });
  }
  const child = appendCronRun(jobId, {
    trigger,
    parent_run_id: parent.id,
    attempt: Number(parent.attempt || 1) + 1,
    scheduled_for: parent.scheduled_for,
    status: "triggering",
    result: trigger === "resume" ? "正在从未完成任务继续" : "正在重新执行失败任务",
    task_ids: retryable.map(task => task.id),
  });
  if (!child) throw new Error("重试运行记录创建失败");
  attachCronRunToTasks(retryable.map(task => task.id), jobId, child.id);
  const results = retryable.map(task => ({ taskId: task.id, ...retryTask(task.id, ctx, trigger === "resume" ? "从定时任务运行记录继续" : "定时任务自动重试", true) }));
  const taskIds = results.filter(item => item.success).map(item => item.taskId);
  const queued = results.filter(item => item.queued).length;
  const failed = results.filter(item => !item.success).length;
  const status = failed === results.length ? "failed" : queued > 0 ? "queued" : "waiting";
  const result = failed ? `${taskIds.length}/${results.length} 个任务已重新执行` : `${taskIds.length} 个任务已重新执行`;
  const updated = patchCronRun(jobId, child.id, {
    status,
    result,
    task_ids: taskIds,
    primary_task_id: taskIds[0] || "",
    task_states: Object.fromEntries(results.map(item => [item.taskId, { status: item.success ? (item.queued ? "queued" : "waiting") : "failed", result: item.error || result, updated_at: new Date().toISOString() }])),
    dispatched_at: new Date().toISOString(),
    completed_at: status === "failed" ? new Date().toISOString() : null,
  });
  patchCronRun(jobId, parent.id, { retry_child_run_id: child.id, next_retry_at: null });
  patchCronJob(jobId, { last_status: status, last_result: result, last_task_ids: taskIds, last_task_id: taskIds[0] || null });
  notifyCronRun(jobId, child.id, trigger === "resume" ? "recovered" : "started");
  if (status === "failed") scheduleFailedCronRunRetry(loadCronJobs().find(item => item.id === jobId), updated);
  return { success: status !== "failed", run: updated, results };
}

function cancelCronRun(jobId: string, runId: string, reason = "用户取消本轮定时任务") {
  const job = loadCronJobs().find(item => item.id === jobId);
  const run = normalizeCronJob(job || {}).run_history.find((item: any) => item.id === runId);
  if (!job || !run) throw new Error("运行记录不存在");
  const tasks = loadTasks().filter(task => (run.task_ids || []).includes(String(task.id || "")));
  const results = tasks.map(task => {
    if (["done", "completed", "cancelled"].includes(String(task.status || "").toLowerCase())) return { task_id: task.id, skipped: true };
    removeTaskFromQueues(task.id);
    try { requestTaskCancellation(task.id, reason, "cron-run"); } catch {}
    try { cancelTestAgentRunsForTask(task.id, reason); } catch {}
    updateTask(task.id, { status: "cancelled", auto_execute: false, is_paused: true, paused: true, cancelled_at: new Date().toISOString(), status_detail: reason });
    return { task_id: task.id, cancelled: true };
  });
  const updated = patchCronRun(jobId, runId, { status: "cancelled", result: reason, completed_at: new Date().toISOString(), next_retry_at: null, cancellation_requested_at: new Date().toISOString() });
  patchCronJob(jobId, { last_status: "cancelled", last_result: reason });
  notifyCronRun(jobId, runId, "cancelled");
  return { success: true, run: updated, results };
}

export function syncCronTaskStatus(task: any, status: string, result = "") {
  const cronJobId = task?.cron_job_id;
  if (!cronJobId) return;

  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === cronJobId);
  if (!job) return;

  const resultText = String(result || task.result || "").trim();
  const preferredRunId = String(task?.cron_run_id || task?.workflow_meta?.cron_run_id || "");
  const matchedRun = findCronRunForTask(job, String(task?.id || ""), preferredRunId);
  const syncedRun = matchedRun
    ? syncCronRunTask(cronJobId, matchedRun.id, String(task?.id || ""), status, resultText, task?.updated_at || new Date().toISOString())
    : null;
  const patch: any = {
    last_task_id: task.id || job.last_task_id || null,
    last_task_ids: syncedRun?.task_ids || job.last_task_ids || [],
    next_run: job.enabled === false ? null : computeNextRun(job.schedule, new Date(), normalizeCronJob(job).timezone),
  };

  if (syncedRun) {
    patch.last_status = syncedRun.status;
    patch.last_result = syncedRun.result || resultText || job.last_result || "任务状态已更新";
  } else if (status === "in_progress") {
    patch.last_status = "running_task";
    patch.last_result = "任务已进入执行阶段";
  } else if (status === "done") {
    patch.last_status = "done";
    patch.last_result = resultText || "任务执行完成";
  } else if (status === "waiting") {
    patch.last_status = "waiting";
    patch.last_result = resultText || "任务仍在进行，等待下一步处理";
  } else if (status === "failed") {
    patch.last_status = "failed";
    patch.last_result = resultText || "任务执行失败";
  } else {
    patch.last_status = status || "queued";
    patch.last_result = resultText || patch.last_result || "";
  }

  patchCronJob(cronJobId, patch);
  if (syncedRun?.status === "failed") {
    const retried = scheduleFailedCronRunRetry(loadCronJobs().find(item => item.id === cronJobId), syncedRun);
    notifyCronRun(cronJobId, syncedRun.id, "failed");
    if (!retried?.next_retry_at) patchCronJob(cronJobId, { last_status: "failed", last_result: resultText || "任务执行失败" });
  } else if (syncedRun?.status === "done") {
    notifyCronRun(cronJobId, syncedRun.id, "done");
  } else if (syncedRun?.status === "waiting") {
    notifyCronRun(cronJobId, syncedRun.id, "waiting");
  } else if (syncedRun?.status === "cancelled") {
    notifyCronRun(cronJobId, syncedRun.id, "cancelled");
  }
  const backlogFile = task?.workflow_meta?.intake?.backlog_file;
  if (task?.group_id && backlogFile) {
    const backlogStatus = status === "done"
      ? "done"
      : status === "failed"
        ? "blocked"
        : status === "waiting"
          ? "blocked"
          : status === "in_progress"
            ? "in_progress"
            : "queued";
    markDailyDevBacklogStatus(task.group_id, backlogFile, backlogStatus, {
      task_id: task.id,
      result: resultText || patch.last_result || status,
    });
  }
}

type CronRunTrigger = "manual" | "schedule" | "recovery" | "retry" | "resume";

async function runCronJobCore(id: string, ctx: CollabCtx, trigger: CronRunTrigger, reliability: any = null, options: any = {}) {
  const jobs = loadCronJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) throw new Error("定时任务不存在");
  if (job.archived || job.deleted_at) throw new Error("定时任务已归档，请先恢复后再运行");

  if (runningCronJobs.has(id)) {
    return { success: false, message: "定时任务正在触发中，请稍后再试" };
  }

  const now = new Date();
  const normalizedJob = normalizeCronJob(job);
  const scheduledFor = options.scheduledFor || (trigger === "schedule" || trigger === "recovery" ? job.next_run : null);
  const nextRun = computeNextRun(job.schedule, now, normalizedJob.timezone);
  runningCronJobs.add(id);
  const cronRun = appendCronRun(id, {
    trigger,
    started_at: now.toISOString(),
    status: "triggering",
    result: "正在创建并派发任务...",
    parent_run_id: options.parentRunId || "",
    attempt: options.attempt || 1,
    scheduled_for: scheduledFor,
    meta: { reliability_trace_id: reliability?.traceId || "", recovered_misfire: trigger === "recovery" },
  });
  if (!cronRun) {
    runningCronJobs.delete(id);
    throw new Error("定时任务运行记录创建失败");
  }
  patchCronJob(id, {
    last_run: now.toISOString(),
    last_run_key: minuteKey(scheduledFor ? new Date(scheduledFor) : now, normalizedJob.timezone),
    last_scheduled_at: scheduledFor || null,
    last_status: "running",
    last_result: "正在创建并派发任务...",
  });
  notifyCronRun(id, cronRun.id, trigger === "recovery" ? "recovered" : "started");

  let taskDraft: any = null;
  let taskDrafts: any[] = [];
  let cronMeta: any = {};
  let gapContinueResult: any = null;
  try {
    validateCronJobPayload(job);
    const targetType = normalizeTargetType(job);
    const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
    const shouldContinueGaps = targetType === "group" && workflowType === "daily_dev"
      && job.continue_gaps !== false
      && job.continueGaps !== false;
    if (shouldContinueGaps) {
      gapContinueResult = continueDailyDevTasksFromGaps(ctx, {
        group_id: job.group_id,
        limit: Math.max(1, Math.min(20, Number(job.gap_continue_limit || job.gapContinueLimit || 3))),
        auto_execute: true,
        source: "cron_gap_rework",
      });
    }
    taskDraft = buildTaskFromCronJob(job, trigger);
    cronMeta = taskDraft?.meta || {};
    if (gapContinueResult) {
      cronMeta.continued_gap_tasks = {
        continued: gapContinueResult.continued || 0,
        queued: gapContinueResult.queued || 0,
        blocked: gapContinueResult.blocked || 0,
        failed: gapContinueResult.failed || 0,
        task_ids: (gapContinueResult.results || []).filter((item: any) => item.success).map((item: any) => item.task_id),
      };
    }
    taskDrafts = Array.isArray(taskDraft?.drafts)
      ? taskDraft.drafts
      : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean));
    taskDrafts = taskDrafts.map((draft: any) => ({
      ...draft,
      cron_run_id: cronRun.id,
      workflow_meta: {
        ...(draft?.workflow_meta || {}),
        cron_run_id: cronRun.id,
      },
    }));
    if (reliability?.operationKey) {
      taskDrafts = taskDrafts.map((draft: any, index: number) => ({
        ...draft,
        trace_id: reliability.traceId,
        idempotency_key: `cron:${reliability.operationKey}:draft:${index}:${draft?.workflow_meta?.intake?.backlog_file || draft?.title || "task"}`,
      }));
    }
    if (taskDrafts.length === 0) {
      const continuedCount = Number(gapContinueResult?.continued || 0);
      const queuedCount = Number(gapContinueResult?.queued || 0);
      const blockedCount = Number(gapContinueResult?.blocked || 0);
      const continuedTaskIds = cronMeta.continued_gap_tasks?.task_ids || [];
      attachCronRunToTasks(continuedTaskIds, id, cronRun.id);
      const result = continuedCount > 0
        ? `本次定时任务续跑 ${continuedCount} 个交付缺口任务，入队 ${queuedCount} 个；没有 ready 状态的新需求池文件${formatCronMetaSummary(cronMeta)}`
        : `没有 ready 状态的业务需求池文件，本次定时任务跳过且未创建空任务${formatCronMetaSummary(cronMeta)}`;
      const updated = patchCronJob(id, {
        last_status: continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "continued")) : "skipped",
        last_result: result,
        last_run_meta: cronMeta,
        last_task_ids: continuedCount > 0 ? (cronMeta.continued_gap_tasks?.task_ids || []) : job.last_task_ids,
        run_count: Number(job.run_count || 0) + 1,
        next_run: nextRun,
      });
      const runStatus = continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "done")) : "skipped";
      const run = patchCronRun(id, cronRun.id, {
        status: runStatus,
        result,
        task_ids: continuedTaskIds,
        primary_task_id: continuedTaskIds[0] || "",
        task_states: Object.fromEntries(continuedTaskIds.map((taskId: string) => [taskId, { status: queuedCount > 0 ? "queued" : "waiting", result, updated_at: new Date().toISOString() }])),
        dispatched_at: continuedCount > 0 ? new Date().toISOString() : null,
        completed_at: runStatus === "skipped" || runStatus === "done" ? new Date().toISOString() : null,
        meta: cronMeta,
      });
      if (runStatus === "done" || runStatus === "skipped") notifyCronRun(id, cronRun.id, "done");
      return { success: true, queued: queuedCount > 0, skipped: continuedCount === 0, continued: continuedCount, message: result, job: updated, run, gap_continue_result: gapContinueResult };
    }
    const created = taskDrafts.map((draft) => {
      const { task, queueResult } = createAndQueueTask(draft, ctx);
      const backlogFile = task?.workflow_meta?.intake?.backlog_file;
      if (task?.group_id && backlogFile) {
        markDailyDevBacklogStatus(task.group_id, backlogFile, "queued", {
          task_id: task.id,
          result: `${queueResult?.message || "任务已创建"}：${task.title}`,
        });
      }
      return { task, queueResult, queued: !!queueResult?.queued };
    });
    const continuedTaskIds = (cronMeta.continued_gap_tasks?.task_ids || []).map((taskId: any) => String(taskId));
    const createdTaskIds = [...new Set([...continuedTaskIds, ...created.map(item => String(item.task.id))])];
    attachCronRunToTasks(createdTaskIds, id, cronRun.id);
    const queuedCount = created.filter(item => item.queued).length;
    if (created.length > 1) {
      const status = queuedCount > 0 ? "queued" : (created.some(item => item.queueResult?.blocked) ? "waiting" : "skipped");
      const result = `批量创建 ${created.length} 个业务开发任务，已入队 ${queuedCount} 个${formatCronMetaSummary(cronMeta)}`;
      const updated = patchCronJob(id, {
        last_status: status,
        last_result: result,
        last_run_meta: cronMeta,
        last_task_id: created[created.length - 1]?.task?.id || null,
        last_task_ids: created.map(item => item.task.id),
        run_count: Number(job.run_count || 0) + 1,
        next_run: nextRun,
      });
      const run = patchCronRun(id, cronRun.id, {
        status,
        result,
        task_ids: createdTaskIds,
        primary_task_id: createdTaskIds[0] || "",
        task_states: Object.fromEntries([
          ...continuedTaskIds.map((taskId: string) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
          ...created.map(item => [String(item.task.id), { status: item.queued ? "queued" : (item.queueResult?.blocked ? "waiting" : "skipped"), result: item.queueResult?.message || result, updated_at: new Date().toISOString() }]),
        ]),
        dispatched_at: new Date().toISOString(),
        completed_at: status === "skipped" ? new Date().toISOString() : null,
        meta: cronMeta,
      });
      return {
        success: true,
        queued: queuedCount > 0,
        queued_count: queuedCount,
        task_count: created.length,
        tasks: created.map(item => item.task),
        results: created,
        job: updated,
        run,
      };
    }
    const { task, queueResult, queued } = created[0];
    const status = queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped");
    const result = `${queueResult?.message || "任务已创建"}：${task.title}${formatCronMetaSummary(cronMeta)}`;
    const updated = patchCronJob(id, {
      last_status: status,
      last_result: result,
      last_run_meta: cronMeta,
      last_task_id: task.id,
      run_count: Number(job.run_count || 0) + 1,
      next_run: nextRun,
    });
    const run = patchCronRun(id, cronRun.id, {
      status,
      result,
      task_ids: createdTaskIds,
      primary_task_id: String(task.id),
      task_states: Object.fromEntries([
        ...continuedTaskIds.map((taskId: string) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
        [String(task.id), { status: queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped"), result: queueResult?.message || result, updated_at: new Date().toISOString() }],
      ]),
      dispatched_at: new Date().toISOString(),
      completed_at: status === "skipped" ? new Date().toISOString() : null,
      meta: cronMeta,
    });
    return { success: true, queued, task, queue_result: queueResult, job: updated, run };
  } catch (e: any) {
    const drafts = taskDrafts.length ? taskDrafts : (Array.isArray(taskDraft?.drafts) ? taskDraft.drafts : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean)));
    for (const draft of drafts) {
      const backlogFile = draft?.workflow_meta?.intake?.backlog_file;
      if (!draft?.group_id || !backlogFile) continue;
      markDailyDevBacklogStatus(draft.group_id, backlogFile, "ready", {
        result: `定时任务创建失败，已恢复为 ready：${e.message}`,
      });
    }
    const updated = patchCronJob(id, {
      last_status: "failed",
      last_result: e.message,
      last_run_meta: cronMeta,
      run_count: Number(job.run_count || 0) + 1,
      next_run: nextRun,
    });
    let run = patchCronRun(id, cronRun.id, {
      status: "failed",
      result: e.message,
      completed_at: new Date().toISOString(),
      meta: cronMeta,
    });
    run = scheduleFailedCronRunRetry(updated, run);
    notifyCronRun(id, cronRun.id, "failed");
    return { success: false, error: e.message, job: updated, run };
  } finally {
    try { upsertAutoDevDailyReport(localDateKey()); } catch (reportError: any) { console.error("[Cron] 生成开发日报失败", reportError?.message || reportError); }
    runningCronJobs.delete(id);
  }
}

async function runCronJob(id: string, ctx: CollabCtx, trigger: CronRunTrigger, options: any = {}) {
  if (trigger !== "schedule" && trigger !== "recovery") return runCronJobCore(id, ctx, trigger, null, options);
  const job = normalizeCronJob(loadCronJobs().find(item => item.id === id) || {});
  const scheduledFor = options.scheduledFor || job.next_run || new Date().toISOString();
  const operationKey = `${id}:${minuteKey(new Date(scheduledFor), job.timezone)}`;
  const operation = acquireIdempotency({ scope: "cron-schedule", key: operationKey, leaseMs: 10 * 60 * 1000, metadata: { cron_job_id: id, minute_key: operationKey.split(":").slice(1).join(":") } });
  if (!operation.acquired) {
    return operation.record?.result || { success: true, duplicate: true, skipped: true, message: operation.inProgress ? "相同定时周期正在执行" : "相同定时周期已执行" };
  }
  try {
    const result = await runCronJobCore(id, ctx, trigger, { operationKey, traceId: operation.traceId }, { ...options, scheduledFor });
    if (result?.success === false) {
      failIdempotency("cron-schedule", operationKey, result.error || result.message || "定时任务执行失败");
      return result;
    }
    completeIdempotency("cron-schedule", operationKey, {
      success: true,
      queued: !!result?.queued,
      task_id: result?.task?.id || null,
      task_ids: result?.tasks?.map((task: any) => task.id) || [],
      message: result?.message || result?.error || "",
    });
    return result;
  } catch (error: any) {
    failIdempotency("cron-schedule", operationKey, error);
    throw error;
  }
}

export function reconcileCronRunsOnStartup(now = new Date()) {
  const jobs = loadCronJobs();
  const tasks = loadTasks();
  const summary = { jobs: jobs.length, recovered_runs: 0, failed_stale_runs: 0, schedules_initialized: 0 };
  for (const rawJob of jobs) {
    const job = normalizeCronJob(rawJob);
    if (job.enabled && !rawJob.next_run && !job.schedule_error) {
      patchCronJob(job.id, { next_run: computeNextRun(job.schedule, now, job.timezone) });
      summary.schedules_initialized++;
    }
    for (const run of job.run_history || []) {
      if (!CRON_RUN_ACTIVE_STATUSES.has(run.status) || run.status === "retry_waiting" || run.status === "waiting") continue;
      const boundTasks = tasks.filter(task => (run.task_ids || []).includes(String(task.id || "")));
      if (boundTasks.length) {
        let updated: any = run;
        for (const task of boundTasks) updated = syncCronRunTask(job.id, run.id, task.id, task.status, task.result || task.status_detail || "", task.updated_at || now.toISOString()) || updated;
        if (updated?.status !== run.status) summary.recovered_runs++;
        continue;
      }
      const age = now.getTime() - Date.parse(run.started_at || "");
      if (Number.isFinite(age) && age >= 5 * 60_000) {
        const failed = patchCronRun(job.id, run.id, { status: "failed", result: "服务重启时发现本轮未完成派发，已转入恢复流程", completed_at: now.toISOString(), recovered_after_restart: true });
        scheduleFailedCronRunRetry(rawJob, failed, now);
        notifyCronRun(job.id, run.id, "failed");
        summary.failed_stale_runs++;
      }
    }
  }
  return summary;
}

async function processDueCronRetries(ctx: CollabCtx, now: Date) {
  for (const rawJob of loadCronJobs()) {
    const job = normalizeCronJob(rawJob);
    if (!job.enabled || rawJob.archived || rawJob.deleted_at) continue;
    for (const run of job.run_history || []) {
      if (run.status !== "retry_waiting" || !run.next_retry_at || run.retry_child_run_id) continue;
      if (Date.parse(run.next_retry_at) > now.getTime() || runningCronJobs.has(job.id)) continue;
      try { await retryCronRun(job.id, run.id, ctx, "retry"); }
      catch (error: any) { console.error("[Cron][Retry]", job.name, error?.message || error); }
    }
  }
}

async function tickCronScheduler(ctx: CollabCtx) {
  const now = new Date();
  await processDueCronRetries(ctx, now);
  const jobs = loadCronJobs();

  for (const rawJob of jobs) {
    if (rawJob.archived || rawJob.deleted_at) continue;
    const job = normalizeCronJob(rawJob);
    if (!job.enabled) continue;
    if (job.schedule_error) {
      if (rawJob.last_status !== "invalid_schedule" || rawJob.last_result !== job.schedule_error) {
        patchCronJob(job.id, {
          last_status: "invalid_schedule",
          last_result: job.schedule_error,
          next_run: null,
        });
      }
      continue;
    }
    if (runningCronJobs.has(job.id)) continue;
    const scheduledFor = job.next_run;
    if (!scheduledFor) {
      patchCronJob(job.id, { next_run: computeNextRun(job.schedule, now, job.timezone) });
      continue;
    }
    const dueAt = Date.parse(scheduledFor);
    if (!Number.isFinite(dueAt) || dueAt > now.getTime()) continue;
    const lateMinutes = Math.max(0, (now.getTime() - dueAt) / 60_000);
    const shouldRecover = lateMinutes > 1.5;
    const withinGrace = lateMinutes <= Number(job.misfire_grace_minutes || 1440);
    if (shouldRecover && (job.misfire_policy === "skip" || !withinGrace)) {
      const reason = withinGrace ? "服务停机期间错过执行，已按任务策略跳过" : "错过执行时间已超过补跑窗口，已跳过";
      const run = appendCronRun(job.id, { trigger: "recovery", scheduled_for: scheduledFor, started_at: now.toISOString(), completed_at: now.toISOString(), status: "skipped", result: reason, meta: { missed_by_minutes: Math.round(lateMinutes), misfire_policy: job.misfire_policy } });
      patchCronJob(job.id, { last_run: now.toISOString(), last_scheduled_at: scheduledFor, last_status: "skipped", last_result: reason, next_run: computeNextRun(job.schedule, now, job.timezone), run_count: Number(job.run_count || 0) + 1 });
      if (run) notifyCronRun(job.id, run.id, "done");
      continue;
    }
    const result = await runCronJob(job.id, ctx, shouldRecover ? "recovery" : "schedule", { scheduledFor });
    if (!result?.success) console.error("[Cron]", job.name, result?.error || result?.message);
  }
  await tickAutoDevReportNotifications(now);
  await tickFeishuNotificationOutbox(now);
  try {
    runConflictResolutionMemoryMaintenanceSchedulerTick({ at: now.toISOString() });
  } catch (error: any) {
    console.error("[Cron][MemoryMaintenance]", error?.message || error);
  }
}

export function startCronScheduler(ctx: CollabCtx) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  const recovery = reconcileCronRunsOnStartup();
  const tick = () => tickCronScheduler(ctx).catch((e: any) => console.error("[Cron]", e.message));
  tick();
  schedulerTimer = setInterval(tick, 30 * 1000);
  console.log(`[Cron] 定时任务调度器已启动，恢复 ${recovery.recovered_runs} 条运行，修复 ${recovery.failed_stale_runs} 条中断记录`);
}

export function stopCronScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

export function getConflictResolutionMemoryMaintenanceSchedulerStatus() {
  const latest = latestConflictResolutionMaintenanceTick;
  const safe = !latest || (latest.destructiveActionAuthorized === false
    && Number(latest.deletedCount || 0) === 0
    && Number(latest.createdTaskCount || 0) === 0
    && Number(latest.createdApprovalReceiptCount || 0) === 0
    && (latest.rows || []).every((row: any) => row.destructiveActionAuthorized === false && Number(row.deletedCount || 0) === 0));
  return {
    schema: "ccm-conflict-resolution-maintenance-scheduler-status-v1",
    activeWithCronScheduler: !!schedulerTimer,
    safe,
    latest,
    policy: "scheduler_verify_dry_run_only_no_task_no_approval_no_delete",
  };
}

function schedulerStatus() {
  return {
    running: !!schedulerTimer,
    interval_ms: 30 * 1000,
    running_job_ids: Array.from(runningCronJobs),
    conflict_resolution_memory_maintenance: latestConflictResolutionMaintenanceTick || {
      schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
      status: "not_run",
      destructiveActionAuthorized: false,
      deletedCount: 0,
      createdTaskCount: 0,
      createdApprovalReceiptCount: 0,
    },
  };
}

function readJsonBody(req: any, onDone: (payload: any) => void, onError: (error: Error) => void) {
  let body = "";
  req.on("data", (chunk: any) => body += chunk);
  req.on("end", () => {
    try {
      onDone(body ? JSON.parse(body) : {});
    } catch (e: any) {
      onError(e);
    }
  });
}

// === Cron API 路由分流 ===
export function handleCronApi(pathname: string, req: any, res: any, parsed: any, ctx: CollabCtx): boolean {
  if (pathname === "/api/cron" && req.method === "GET") {
    const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
    const onlyArchived = String(parsed.query.archived || "") === "true";
    const allJobs = loadCronJobs();
    const jobs = onlyArchived ? allJobs.filter(job => job.archived || job.deleted_at) : includeArchived ? allJobs : allJobs.filter(job => !job.archived && !job.deleted_at);
    sendJson(res, { jobs: publicCronJobs(jobs), archived_count: allJobs.filter(job => job.archived || job.deleted_at).length, scheduler: schedulerStatus() });
    return true;
  }

  if (pathname === "/api/cron/status" && req.method === "GET") {
    sendJson(res, schedulerStatus());
    return true;
  }

  if (pathname === "/api/cron/create" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = createCronJob(payload);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/update" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const { id, ...updates } = payload;
        const job = updateCronJob(id, updates);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/delete" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = deleteCronJob(payload.id);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, archived: true, job: normalizeCronJob(job) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/restore" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = restoreCronJob(payload.id);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, job: normalizeCronJob(job) });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/purge" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const job = purgeCronJob(payload.id);
        if (!job) return sendJson(res, { error: "定时任务不存在" }, 404);
        sendJson(res, { success: true, purged: true, id: job.id });
      } catch (e: any) { sendJson(res, { error: e.message }, 409); }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/bulk" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const ids = Array.from(new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id: any) => String(id || "")).filter(Boolean)));
        const action = String(payload.action || "");
        if (!ids.length) return sendJson(res, { error: "请选择定时任务" }, 400);
        if (!["archive", "restore", "purge", "enable", "disable"].includes(action)) return sendJson(res, { error: "不支持的批量操作" }, 400);
        const results = ids.map((id: string) => {
          try {
            const job = action === "archive" ? deleteCronJob(id)
              : action === "restore" ? restoreCronJob(id)
              : action === "purge" ? purgeCronJob(id)
              : updateCronJob(id, { enabled: action === "enable" });
            return { id, success: !!job };
          } catch (error: any) { return { id, success: false, error: error.message }; }
        });
        sendJson(res, { success: results.every((item: any) => item.success), results }, results.some((item: any) => item.success) ? 200 : 409);
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/cron/run" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      runCronJob(payload.id, ctx, "manual")
        .then((result) => {
          const status = result.success ? 200 : 400;
          sendJson(res, result, status);
        })
        .catch((e: any) => sendJson(res, { error: e.message }, 500));
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/overview" && req.method === "GET") {
    const today = String(parsed.query.date || localDateKey());
    const report = upsertAutoDevDailyReport(today);
    const reports = loadDevReports().slice(0, 30);
    const jobs = loadCronJobs().map(normalizeCronJob).filter((job: any) => job.workflow_type === "daily_dev");
    const journalAudit = getWorkJournalAudit({ sync: false });
    sendJson(res, {
      success: true,
      scheduler: schedulerStatus(),
      today: report,
      reports,
      weekly_reports: loadDevWeeklyReports().slice(0, 20),
      notification: normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig()),
      daily_dev_jobs: jobs,
      backlog: report.backlog,
      journal: {
        schema: journalAudit.schema,
        append_only: journalAudit.append_only,
        total: journalAudit.total,
        source_counts: journalAudit.source_counts,
        actor_counts: journalAudit.actor_counts,
        earliest_at: journalAudit.earliest_at,
        latest_at: journalAudit.latest_at,
      },
    });
    return true;
  }

  if (["/api/cron/run/retry", "/api/cron/run/resume", "/api/cron/run/cancel"].includes(pathname) && req.method === "POST") {
    readJsonBody(req, (payload) => {
      const jobId = String(payload.job_id || payload.jobId || payload.id || "");
      const runId = String(payload.run_id || payload.runId || "");
      if (!jobId || !runId) return sendJson(res, { error: "缺少定时任务或运行标识" }, 400);
      if (pathname.endsWith("/cancel")) {
        try { sendJson(res, cancelCronRun(jobId, runId, String(payload.reason || "用户取消本轮定时任务"))); }
        catch (error: any) { sendJson(res, { error: error.message }, 409); }
        return;
      }
      retryCronRun(jobId, runId, ctx, pathname.endsWith("/resume") ? "resume" : "retry")
        .then(result => sendJson(res, result, result?.success === false ? 409 : 200))
        .catch((error: any) => sendJson(res, { error: error.message }, 409));
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/work-journal/audit" && req.method === "GET") {
    sendJson(res, getWorkJournalAudit());
    return true;
  }

  if (pathname === "/api/auto-dev/work-journal/events" && req.method === "GET") {
    const events = listWorkJournalEvents({
      start: parsed.query.start,
      end: parsed.query.end,
      task_id: parsed.query.task_id,
      source: parsed.query.source,
      limit: parsed.query.limit,
    });
    sendJson(res, { success: true, count: events.length, events });
    return true;
  }

  if (pathname === "/api/auto-dev/reports" && req.method === "GET") {
    const limit = Math.max(1, Math.min(120, Number(parsed.query.limit || 30)));
    sendJson(res, { success: true, reports: loadDevReports().slice(0, limit) });
    return true;
  }

  if (pathname === "/api/auto-dev/weekly-reports" && req.method === "GET") {
    const limit = Math.max(1, Math.min(80, Number(parsed.query.limit || 20)));
    sendJson(res, { success: true, reports: loadDevWeeklyReports().slice(0, limit) });
    return true;
  }

  if (pathname === "/api/auto-dev/weekly-report/generate" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const report = upsertAutoDevWeeklyReport(payload.date || localDateKey(), { force: payload.force === true });
        sendJson(res, { success: true, report, reports: loadDevWeeklyReports().slice(0, 20) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/notification/config" && req.method === "GET") {
    sendJson(res, { success: true, config: normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig()) });
    return true;
  }

  if (pathname === "/api/auto-dev/notification/config" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const current = normalizeAutoDevNotifyConfig(loadAutoDevNotifyConfig());
        const config = saveNormalizedNotifyConfig({
          ...current,
          daily_enabled: payload.daily_enabled === true,
          daily_time: payload.daily_time ?? current.daily_time,
          weekly_enabled: payload.weekly_enabled === true,
          weekly_day: payload.weekly_day ?? current.weekly_day,
          weekly_time: payload.weekly_time ?? current.weekly_time,
          retry_limit: payload.retry_limit ?? current.retry_limit,
          retry_interval_minutes: payload.retry_interval_minutes ?? current.retry_interval_minutes,
          target_type: "user",
          target_id: "",
        });
        sendJson(res, { success: true, config });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  if (pathname === "/api/auto-dev/notification/send" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      const kind = payload.kind === "weekly" ? "weekly" : "daily";
      dispatchAutoDevReport(kind, { date: payload.date || localDateKey() })
        .then(result => sendJson(res, result, result.success ? 200 : 400))
        .catch((e: any) => sendJson(res, { error: e.message }, 500));
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }
  if (pathname === "/api/auto-dev/report/generate" && req.method === "POST") {
    readJsonBody(req, (payload) => {
      try {
        const report = upsertAutoDevDailyReport(payload.date || localDateKey(), { force: payload.force === true });
        sendJson(res, { success: true, report, reports: loadDevReports().slice(0, 30) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    }, (e) => sendJson(res, { error: e.message }, 400));
    return true;
  }

  return false;
}
