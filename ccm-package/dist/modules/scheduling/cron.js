"use strict";
// cron.ts — merged from 2 part files (behavior-freeze merge).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRON_RUN_ACTIVE_STATUSES = exports.latestConflictResolutionMaintenanceTick = exports.runningCronJobs = void 0;
exports.readConflictResolutionMaintenanceSchedulerState = readConflictResolutionMaintenanceSchedulerState;
exports.writeConflictResolutionMaintenanceSchedulerState = writeConflictResolutionMaintenanceSchedulerState;
exports.conflictResolutionMaintenanceSchedulerScopeIdentity = conflictResolutionMaintenanceSchedulerScopeIdentity;
exports.deleteConflictResolutionMemoryMaintenanceSchedulerSessionState = deleteConflictResolutionMemoryMaintenanceSchedulerSessionState;
exports.runConflictResolutionMemoryMaintenanceSchedulerTick = runConflictResolutionMemoryMaintenanceSchedulerTick;
exports.buildTaskFromCronJob = buildTaskFromCronJob;
exports.runCronDailyDevProtocolSelfTest = runCronDailyDevProtocolSelfTest;
exports.formatCronMetaSummary = formatCronMetaSummary;
exports.attachCronRunToTasks = attachCronRunToTasks;
exports.cronFriendlyText = cronFriendlyText;
exports.taskTodoSummary = taskTodoSummary;
exports.taskTestAgentSummary = taskTestAgentSummary;
exports.synthesizedTaskTodo = synthesizedTaskTodo;
exports.publicCronTaskSummary = publicCronTaskSummary;
exports.publicCronJobs = publicCronJobs;
exports.cronRetryPatch = cronRetryPatch;
exports.notifyCronRun = notifyCronRun;
exports.scheduleFailedCronRunRetry = scheduleFailedCronRunRetry;
exports.cancelCronRun = cancelCronRun;
exports.syncCronTaskStatus = syncCronTaskStatus;
exports.retryCronRun = retryCronRun;
exports.reconcileCronRunsOnStartup = reconcileCronRunsOnStartup;
exports.startCronScheduler = startCronScheduler;
exports.stopCronScheduler = stopCronScheduler;
exports.getConflictResolutionMemoryMaintenanceSchedulerStatus = getConflictResolutionMemoryMaintenanceSchedulerStatus;
exports.handleCronApi = handleCronApi;
const utils_1 = require("../../core/utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const collaboration_1 = require("../collaboration/collaboration");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const cron_job_store_1 = require("./cron-job-store");
const cron_control_plane_1 = require("./cron-control-plane");
const cron_dev_reports_1 = require("./cron-dev-reports");
const work_journal_1 = require("./work-journal");
const storage_1 = require("../collaboration/storage");
const task_intake_preflight_1 = require("../collaboration/task-intake-preflight");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const feishu_1 = require("../collaboration/feishu");
const test_agent_runner_1 = require("../collaboration/test-agent-runner");
const execution_kernel_1 = require("../../agents/execution-kernel");
const artifact_retention_1 = require("../../test-agent/artifact-retention");
const group_memory_index_1 = require("../collaboration/group-memory-index");
const task_attachments_1 = require("../../system/task-attachments");
// ===== merged from cron-part-01.ts =====
exports.runningCronJobs = new Set();
const CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE = path.join(utils_1.CCM_DIR, "memory-control", "conflict-resolution-maintenance-scheduler.json");
exports.latestConflictResolutionMaintenanceTick = null;
function readConflictResolutionMaintenanceSchedulerState(file = CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE) {
    return (0, atomic_json_file_1.readJsonWithBackup)(file, { schema: "ccm-conflict-resolution-maintenance-scheduler-state-v1", version: 1, groups: {}, updated_at: "" });
}
function writeConflictResolutionMaintenanceSchedulerState(value, file = CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE) {
    (0, atomic_json_file_1.writeJsonAtomic)(file, value);
}
function conflictResolutionMaintenanceSchedulerScopeIdentity(scopeId) {
    const value = String(scopeId || "").trim();
    const match = value.match(/^(.*)--(gcs_[a-zA-Z0-9._-]+)$/);
    return {
        typedScopeId: value,
        rootGroupId: match?.[1] || value,
        groupSessionId: match?.[2] || "",
        exactSession: !!match,
    };
}
function deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(groupId, groupSessionId, options = {}) {
    const rootGroupId = String(groupId || "").trim();
    const exactSessionId = String(groupSessionId || "").trim();
    if (!rootGroupId || !/^gcs_[a-zA-Z0-9._-]+$/.test(exactSessionId))
        throw new Error("exact group session is required for maintenance scheduler cleanup");
    const typedScopeId = `${rootGroupId}--${exactSessionId}`;
    const stateFile = String(options.stateFile || options.state_file || CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE);
    if (options.stateLockHeld !== true) {
        return (0, atomic_json_file_1.withFileLock)(stateFile, () => deleteConflictResolutionMemoryMaintenanceSchedulerSessionState(rootGroupId, exactSessionId, {
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
        try {
            fs.copyFileSync(stateFile, `${stateFile}.bak`);
        }
        catch { }
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
function runConflictResolutionMemoryMaintenanceSchedulerTick(options = {}) {
    const stateFile = String(options.stateFile || options.state_file || CONFLICT_RESOLUTION_MAINTENANCE_SCHEDULER_STATE_FILE);
    if (options.persist !== false && options.stateLockHeld !== true) {
        return (0, atomic_json_file_1.withFileLock)(stateFile, () => runConflictResolutionMemoryMaintenanceSchedulerTick({ ...options, stateFile, stateLockHeld: true }), {
            timeoutMs: options.stateLockTimeoutMs || options.state_lock_timeout_ms,
            staleMs: options.stateLockStaleMs || options.state_lock_stale_ms,
        });
    }
    const at = String(options.at || options.now || new Date().toISOString());
    const atMs = Date.parse(at);
    const state = readConflictResolutionMaintenanceSchedulerState(stateFile);
    const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids) ? (options.groupIds || options.group_ids) : [];
    const rootGroupIds = [...new Set((explicitGroupIds.length ? explicitGroupIds : (0, storage_1.loadGroups)().map((group) => group.id || group.groupId))
            .map((value) => String(value || "").trim())
            .filter(Boolean))];
    const groupIds = (0, group_memory_index_1.listPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceScopeIds)(rootGroupIds, {
        maxScopes: options.maxScopes || options.max_scopes || 1000,
    });
    const activeScopeIds = new Set(groupIds);
    const selectedRootGroupIds = new Set(rootGroupIds.map(value => conflictResolutionMaintenanceSchedulerScopeIdentity(value).rootGroupId));
    const prunedScopeIds = [];
    const nextStateGroups = { ...(state.groups || {}) };
    for (const scopeId of Object.keys(nextStateGroups)) {
        const identity = conflictResolutionMaintenanceSchedulerScopeIdentity(scopeId);
        if (!identity.exactSession || !selectedRootGroupIds.has(identity.rootGroupId) || activeScopeIds.has(scopeId))
            continue;
        delete nextStateGroups[scopeId];
        prunedScopeIds.push(scopeId);
    }
    state.groups = nextStateGroups;
    const tickWindowMs = Math.max(60_000, Number(options.tickWindowMs || options.tick_window_ms || 5 * 60 * 1000));
    const baseBackoffMs = Math.max(1_000, Number(options.baseBackoffMs || options.base_backoff_ms || 60_000));
    const maxBackoffMs = Math.max(baseBackoffMs, Number(options.maxBackoffMs || options.max_backoff_ms || 6 * 60 * 60 * 1000));
    const runner = typeof options.runMaintenance === "function"
        ? options.runMaintenance
        : (ids, runOptions) => (0, group_memory_index_1.runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance)(ids, runOptions);
    const telemetryRetentionRunner = typeof options.runTelemetryRetention === "function"
        ? options.runTelemetryRetention
        : (groupId, runOptions) => (0, group_memory_index_1.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention)(groupId, runOptions);
    const telemetryRecoveryRunner = typeof options.runTelemetryRecovery === "function"
        ? options.runTelemetryRecovery
        : (groupId, runOptions) => (0, group_memory_index_1.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger)(groupId, runOptions);
    const telemetryOrphanRunner = typeof options.runTelemetryOrphanReconciliation === "function"
        ? options.runTelemetryOrphanReconciliation
        : (groupId, runOptions) => (0, group_memory_index_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans)(groupId, runOptions);
    const telemetryQuarantineRetentionRunner = typeof options.runTelemetryQuarantineRetention === "function"
        ? options.runTelemetryQuarantineRetention
        : (groupId, runOptions) => (0, group_memory_index_1.runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention)(groupId, runOptions);
    const telemetryCleanupJournalRunner = typeof options.runTelemetryCleanupJournalReconciliation === "function"
        ? options.runTelemetryCleanupJournalReconciliation
        : (groupId, runOptions) => (0, group_memory_index_1.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals)(groupId, runOptions);
    const telemetryCleanupCommitDiscoveryRunner = typeof options.runTelemetryCleanupCommitDiscovery === "function"
        ? options.runTelemetryCleanupCommitDiscovery
        : (groupId, runOptions) => (0, group_memory_index_1.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits)(groupId, runOptions);
    const telemetryCleanupCommitRepairResolutionRunner = typeof options.runTelemetryCleanupCommitRepairResolutionReconciliation === "function"
        ? options.runTelemetryCleanupCommitRepairResolutionReconciliation
        : (groupId, runOptions) => (0, group_memory_index_1.discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitRepairResolutionTransactions)(groupId, { ...runOptions, persist: true, recover: true });
    const rows = [];
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
        const operation = (0, reliability_ledger_1.acquireIdempotency)({
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
            (0, reliability_ledger_1.completeIdempotency)("conflict-resolution-memory-maintenance", operationKey, {
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
        }
        catch (error) {
            (0, reliability_ledger_1.failIdempotency)("conflict-resolution-memory-maintenance", operationKey, error);
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
    if (options.persist !== false)
        writeConflictResolutionMaintenanceSchedulerState(value, stateFile);
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
    exports.latestConflictResolutionMaintenanceTick = report;
    return report;
}
function buildTaskFromCronJob(job, trigger) {
    const templateProjection = (0, cron_control_plane_1.resolveCronTemplate)(job);
    const taskTitle = templateProjection.title || job.name;
    job = { ...job, prompt: templateProjection.instructions || job.prompt };
    const targetType = (0, cron_job_store_1.normalizeTargetType)(job);
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
    const cronMeta = {
        workflow_type: workflowType,
        imported_shared_docs: null,
        claimed_backlogs: [],
        attachment_snapshot: {
            count: Array.isArray(job.source_attachments) ? job.source_attachments.length : 0,
            ids: (Array.isArray(job.source_attachments) ? job.source_attachments : []).map((item) => item.id).filter(Boolean),
            captured_at: new Date().toISOString(),
        },
    };
    const buildBacklogTask = (backlog, batchIndex = 0, batchTotal = 1) => {
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
            group_session_id: backlog.target_session_id,
            assign_type: "group",
            orchestration_scope: "group_session",
            queue_scope: "conversation_serial",
            target_scope: "group_session",
            target_id: job.group_id,
            exact_session_id: backlog.target_session_id,
            priority: backlog.priority || job.priority || "normal",
            auto_execute: true,
            workflow_type: "daily_dev",
            requires_code_changes: requiresCodeChanges && backlog.requires_code_changes !== false,
            requires_verification: true,
            business_goal: backlog.business_goal || backlog.title || String(job.prompt || job.name || "").slice(0, 500),
            acceptance_criteria: backlog.acceptance || "定时业务开发任务必须有子 Agent 回执、主 Agent 复盘、实际文件变更证据、已执行验证记录和交付摘要。",
            source_documents: buildCronSourceDocuments(backlog.documents),
            source_attachments: Array.isArray(job.source_attachments) ? job.source_attachments.map((item) => ({ ...item })) : [],
            source_attachment_contexts: Array.isArray(job.source_attachment_contexts) ? job.source_attachment_contexts.map((item) => ({ ...item })) : [],
            source_attachment_context: String(job.source_attachment_context || ""),
            source_attachment_warnings: Array.isArray(job.source_attachment_warnings) ? [...job.source_attachment_warnings] : [],
            workflow_meta: {
                intake: {
                    backlog_file: backlog.backlog_file,
                    claimed_by_cron_job_id: job.id,
                    cron_trigger: trigger,
                    claimed_at: new Date().toISOString(),
                    target_scope: "group_session",
                    target_id: job.group_id,
                    target_session_id: backlog.target_session_id,
                },
                batch: batchTotal > 1 ? { index: batchIndex + 1, total: batchTotal } : null,
                cron: cronMeta,
            },
            cron_job_id: job.id,
            cron_trigger: trigger,
            task_template_id: templateProjection.template?.id || null,
            task_template_revision: templateProjection.template?.revision || null,
            template_variables: templateProjection.rendered?.values || null,
        };
    };
    if (workflowType === "daily_dev" && targetType === "group") {
        const shouldImportSharedDocs = job.import_shared_docs !== false && job.importSharedDocs !== false;
        if (shouldImportSharedDocs) {
            const importResult = (0, collaboration_1.importSharedDocsToDailyDevBacklog)({
                group_id: job.group_id,
                limit: Math.max(1, Math.min(20, Number(job.import_shared_docs_limit || job.importSharedDocsLimit || job.backlog_batch_limit || job.backlogBatchLimit || 1))),
                priority: job.priority || "normal",
                requires_code_changes: requiresCodeChanges,
                source: "cron",
            });
            cronMeta.imported_shared_docs = {
                imported: importResult.imported || 0,
                skipped: importResult.skipped || 0,
                items: (importResult.items || []).map((item) => ({
                    source: item.source,
                    backlog: item.backlog,
                    title: item.title,
                })),
            };
        }
        const batchLimit = Math.max(1, Math.min(20, Number(job.backlog_batch_limit || job.backlogBatchLimit || 1)));
        const claimed = [];
        for (let i = 0; i < batchLimit; i++) {
            const backlog = (0, collaboration_1.claimReadyDailyDevBacklog)(job.group_id, { source: "cron", cron_job_id: job.id, trigger });
            if (!backlog)
                break;
            claimed.push(backlog);
        }
        if (claimed.length > 0) {
            const total = claimed.length;
            cronMeta.claimed_backlogs = claimed.map((backlog) => ({
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
        title: `[定时] ${taskTitle}`,
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
        source_attachments: Array.isArray(job.source_attachments) ? job.source_attachments.map((item) => ({ ...item })) : [],
        source_attachment_contexts: Array.isArray(job.source_attachment_contexts) ? job.source_attachment_contexts.map((item) => ({ ...item })) : [],
        source_attachment_context: String(job.source_attachment_context || ""),
        source_attachment_warnings: Array.isArray(job.source_attachment_warnings) ? [...job.source_attachment_warnings] : [],
        cron_job_id: job.id,
        cron_trigger: trigger,
        task_template_id: templateProjection.template?.id || null,
        task_template_revision: templateProjection.template?.revision || null,
        template_variables: templateProjection.rendered?.values || null,
    };
    return { drafts: [draft], meta: cronMeta };
}
function runCronDailyDevProtocolSelfTest() {
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
function formatCronMetaSummary(meta = {}) {
    const imported = meta?.imported_shared_docs;
    const continued = meta?.continued_gap_tasks;
    const parts = [];
    if (continued)
        parts.push(`续跑缺口任务 ${Number(continued.continued || 0)} 个`);
    if (imported)
        parts.push(`导入共享文档 ${Number(imported.imported || 0)} 个`);
    if (Array.isArray(meta?.claimed_backlogs))
        parts.push(`认领需求 ${meta.claimed_backlogs.length} 条`);
    return parts.length ? `；${parts.join("，")}` : "";
}
function attachCronRunToTasks(taskIds, cronJobId, cronRunId) {
    const wanted = new Set((taskIds || []).map(item => String(item || "").trim()).filter(Boolean));
    if (!wanted.size)
        return;
    const tasks = (0, db_1.loadTasks)();
    let changed = false;
    for (const task of tasks) {
        if (!wanted.has(String(task.id || "")))
            continue;
        task.cron_job_id = cronJobId;
        task.cron_run_id = cronRunId;
        task.workflow_meta = {
            ...(task.workflow_meta || {}),
            cron_run_id: cronRunId,
        };
        changed = true;
    }
    if (changed)
        (0, db_1.saveTasks)(tasks);
}
function cronFriendlyText(value, fallback = "", limit = 220) {
    const text = String(value || "")
        .replace(/<task-notification>[\s\S]*?<\/task-notification>/gi, "")
        .replace(/CCM_AGENT_(?:RECEIPT|REQUESTS)[\s\S]*/gi, "")
        .replace(/主\s*Agent\s*计划[:：][\s\S]*/gi, "")
        .replace(/用户本地执行[:：][\s\S]*/gi, "仍有一项本地操作需要用户处理，详情请在任务中查看。")
        .replace(/[A-Za-z]:[\\/][^\r\n；;，。)]*/g, "技术详情里的证据文件")
        .replace(/\b(?:trace_id|session_id|run_id)\s*[:=]\s*[^\s,;]+/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    if (!text)
        return fallback;
    return text.length > limit ? `${text.slice(0, Math.max(1, limit - 1))}…` : text;
}
function taskTodoSummary(task) {
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
    const steps = candidateSteps.slice(0, 12).map((step, index) => ({
        id: String(step?.id || index + 1),
        label: cronFriendlyText(step?.label || step?.title || step?.text || step?.description, `步骤 ${index + 1}`, 100),
        status: String(step?.status || "pending"),
    }));
    if (!steps.length)
        return null;
    const completed = steps.filter((step) => ["completed", "done", "passed", "skipped"].includes(step.status)).length;
    const current = steps.find((step) => !["completed", "done", "passed", "skipped", "cancelled"].includes(step.status)) || steps.at(-1);
    return { total: steps.length, completed, current, steps };
}
function taskTestAgentSummary(task, artifactRuns) {
    const runs = [...(artifactRuns || [])].sort((left, right) => String(right.finished_at || right.started_at || "").localeCompare(String(left.finished_at || left.started_at || "")));
    const latest = runs[0];
    const direct = task?.test_agent_report || task?.testAgentReport || task?.receipt?.test_agent_report || task?.receipt?.testAgentReport || null;
    const verdict = task?.test_agent_verdict || task?.testAgentVerdict || direct?.verdict || null;
    if (!latest && !direct && !verdict)
        return null;
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
function synthesizedTaskTodo(task, testAgent) {
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
function publicCronTaskSummary(task, artifactRuns) {
    const delivery = task?.delivery_summary || task?.deliverySummary || {};
    const testAgent = taskTestAgentSummary(task, artifactRuns);
    const todo = taskTodoSummary(task) || synthesizedTaskTodo(task, testAgent);
    return {
        id: String(task?.id || ""),
        title: cronFriendlyText(task?.title, "定时任务", 120),
        status: String(task?.status || "pending"),
        phase: String(task?.collaboration_state?.phase || task?.phase || ""),
        status_detail: cronFriendlyText(task?.status_detail || delivery?.detail || delivery?.headline || task?.result, "等待主 Agent 更新进度", 180),
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
function publicCronJobs(rawJobs) {
    const jobs = rawJobs.map(cron_job_store_1.normalizeCronJob);
    const taskIds = [...new Set(jobs.flatMap(job => job.run_history || []).flatMap((run) => run.task_ids || []).map((id) => String(id || "")).filter(Boolean))];
    const taskMap = new Map((0, db_1.loadTasks)().filter(task => taskIds.includes(String(task.id || ""))).map(task => [String(task.id), task]));
    const artifacts = taskIds.length ? (0, artifact_retention_1.listTestAgentArtifactCatalogForTasks)(taskIds) : [];
    const artifactsByTask = new Map();
    for (const run of artifacts)
        artifactsByTask.set(run.task_id, [...(artifactsByTask.get(run.task_id) || []), run]);
    return jobs.map(job => ({
        ...job,
        last_result: cronFriendlyText(job.last_result, "暂无结果", 220),
        run_history: (job.run_history || []).map((run) => ({
            ...run,
            meta: {
                recovered_misfire: run.meta?.recovered_misfire === true,
                overlap_policy: String(run.meta?.overlap_policy || ""),
                overlap_action: String(run.meta?.overlap_action || ""),
                overlap_reason: cronFriendlyText(run.meta?.overlap_reason, "", 160),
                missed_by_minutes: Number(run.meta?.missed_by_minutes || 0),
                misfire_policy: String(run.meta?.misfire_policy || ""),
            },
            result: cronFriendlyText(run.result, "等待执行结果", 220),
            task_states: Object.fromEntries(Object.entries(run.task_states || {}).map(([taskId, state]) => [taskId, {
                    status: String(state?.status || ""),
                    result: cronFriendlyText(state?.result, "", 160),
                    updated_at: state?.updated_at || "",
                }])),
            tasks: (run.task_ids || []).map((taskId) => taskMap.get(taskId)).filter(Boolean).map((task) => publicCronTaskSummary(task, artifactsByTask.get(String(task.id)) || [])),
        })),
    }));
}
exports.CRON_RUN_ACTIVE_STATUSES = new Set(["triggering", "running", "queued", "running_task", "waiting", "retry_waiting"]);
function cronRetryPatch(job, run, now = new Date()) {
    const retryLimit = Math.max(0, Number(job?.retry_limit ?? 2));
    const attempt = Math.max(1, Number(run?.attempt || 1));
    if (attempt > retryLimit || run?.retry_child_run_id)
        return { next_retry_at: null };
    const interval = Math.max(1, Number(job?.retry_interval_minutes || 10));
    return {
        next_retry_at: new Date(now.getTime() + interval * 60_000).toISOString(),
        retry_reason: String(run?.result || "本轮执行失败"),
    };
}
async function sendCronRunNotification(jobId, runId, event) {
    const job = (0, db_1.loadCronJobs)().find(item => item.id === jobId);
    const run = job?.run_history?.find((item) => item.id === runId);
    const normalized = job ? (0, cron_job_store_1.normalizeCronJob)(job) : null;
    if (!job || !run || !normalized?.notification_enabled || !normalized.notify_on.includes(event))
        return { skipped: true };
    const previous = run.notifications?.[event];
    if (["sending", "sent"].includes(String(previous?.status || "")))
        return { skipped: true, duplicate: true };
    (0, cron_job_store_1.patchCronRun)(jobId, runId, { notifications: { ...(run.notifications || {}), [event]: { status: "sending", at: new Date().toISOString() } } });
    const eventLabel = { started: "已开始", done: "已完成", failed: "执行失败", waiting: "等待处理", recovered: "已补跑", cancelled: "已取消" };
    const result = await (0, feishu_1.sendFeishuReportMessage)({
        title: `定时任务${eventLabel[event] || event}：${job.name}`,
        markdown: [`**${job.name}** ${eventLabel[event] || event}`, `- 状态：${String(run.status || event)}`, `- 结果：${String(run.result || "暂无结果").slice(0, 500)}`, `- 目标：${job.target_type === "group" ? "群聊协作" : "项目 Agent"}`, `- 时区：${normalized.timezone}`].join("\n"),
    });
    const latest = (0, db_1.loadCronJobs)().find(item => item.id === jobId)?.run_history?.find((item) => item.id === runId);
    (0, cron_job_store_1.patchCronRun)(jobId, runId, { notifications: { ...(latest?.notifications || {}), [event]: { status: result?.success ? "sent" : "failed", at: new Date().toISOString(), error: result?.success ? "" : String(result?.error || "通知发送失败") } } });
    return result;
}
function notifyCronRun(jobId, runId, event) {
    void sendCronRunNotification(jobId, runId, event).catch(error => console.error("[Cron] 飞书通知失败", error?.message || error));
}
function scheduleFailedCronRunRetry(job, run, now = new Date()) {
    if (!job || !run || run.status !== "failed")
        return run;
    const retry = cronRetryPatch(job, run, now);
    const updated = (0, cron_job_store_1.patchCronRun)(job.id, run.id, retry.next_retry_at ? { ...retry, status: "retry_waiting" } : retry);
    if (retry.next_retry_at)
        (0, cron_job_store_1.patchCronJob)(job.id, { last_status: "retry_waiting", last_result: `执行失败，将在 ${retry.next_retry_at} 自动重试` });
    return updated;
}
function cancelCronRun(jobId, runId, reason = "用户取消本轮定时任务") {
    const job = (0, db_1.loadCronJobs)().find(item => item.id === jobId);
    const run = (0, cron_job_store_1.normalizeCronJob)(job || {}).run_history.find((item) => item.id === runId);
    if (!job || !run)
        throw new Error("运行记录不存在");
    const tasks = (0, db_1.loadTasks)().filter(task => (run.task_ids || []).includes(String(task.id || "")));
    const results = tasks.map(task => {
        if (["done", "completed", "cancelled"].includes(String(task.status || "").toLowerCase()))
            return { task_id: task.id, skipped: true };
        (0, collaboration_1.removeTaskFromQueues)(task.id);
        try {
            (0, execution_kernel_1.requestTaskCancellation)(task.id, reason, "cron-run");
        }
        catch { }
        try {
            (0, test_agent_runner_1.cancelTestAgentRunsForTask)(task.id, reason);
        }
        catch { }
        (0, collaboration_1.updateTask)(task.id, { status: "cancelled", auto_execute: false, is_paused: true, paused: true, cancelled_at: new Date().toISOString(), status_detail: reason });
        return { task_id: task.id, cancelled: true };
    });
    const updated = (0, cron_job_store_1.patchCronRun)(jobId, runId, { status: "cancelled", result: reason, completed_at: new Date().toISOString(), next_retry_at: null, cancellation_requested_at: new Date().toISOString() });
    (0, cron_job_store_1.patchCronJob)(jobId, { last_status: "cancelled", last_result: reason });
    notifyCronRun(jobId, runId, "cancelled");
    return { success: true, run: updated, results };
}
// ===== merged from cron-part-02.ts =====
let schedulerTimer = null;
let schedulerTickPromise = null;
const CRON_SCHEDULER_TICK_LOCK = path.join(utils_1.CCM_DIR, "scheduler", "cron-tick");
function syncCronTaskStatus(task, status, result = "") {
    const cronJobId = task?.cron_job_id;
    if (!cronJobId)
        return;
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === cronJobId);
    if (!job)
        return;
    const resultText = String(result || task.result || "").trim();
    const preferredRunId = String(task?.cron_run_id || task?.workflow_meta?.cron_run_id || "");
    const matchedRun = (0, cron_job_store_1.findCronRunForTask)(job, String(task?.id || ""), preferredRunId);
    const syncedRun = matchedRun
        ? (0, cron_job_store_1.syncCronRunTask)(cronJobId, matchedRun.id, String(task?.id || ""), status, resultText, task?.updated_at || new Date().toISOString())
        : null;
    const patch = {
        last_task_id: task.id || job.last_task_id || null,
        last_task_ids: syncedRun?.task_ids || job.last_task_ids || [],
        next_run: job.enabled === false ? null : (0, cron_job_store_1.computeNextRun)(job.schedule, new Date(), (0, cron_job_store_1.normalizeCronJob)(job).timezone),
    };
    if (syncedRun) {
        patch.last_status = syncedRun.status;
        patch.last_result = syncedRun.result || resultText || job.last_result || "任务状态已更新";
    }
    else if (status === "in_progress") {
        patch.last_status = "running_task";
        patch.last_result = "任务已进入执行阶段";
    }
    else if (status === "done") {
        patch.last_status = "done";
        patch.last_result = resultText || "任务执行完成";
    }
    else if (status === "waiting") {
        patch.last_status = "waiting";
        patch.last_result = resultText || "任务仍在进行，等待下一步处理";
    }
    else if (status === "failed") {
        patch.last_status = "failed";
        patch.last_result = resultText || "任务执行失败";
    }
    else {
        patch.last_status = status || "queued";
        patch.last_result = resultText || patch.last_result || "";
    }
    (0, cron_job_store_1.patchCronJob)(cronJobId, patch);
    if (syncedRun?.status === "failed") {
        const latestJob = (0, db_1.loadCronJobs)().find(item => item.id === cronJobId);
        const transitionedToFailure = matchedRun?.status !== "failed";
        const failure = transitionedToFailure ? (0, cron_control_plane_1.cronFailureDecision)(latestJob || job) : { paused: false, patch: {} };
        const failedJob = transitionedToFailure ? (0, cron_job_store_1.patchCronJob)(cronJobId, {
            ...failure.patch,
            last_status: failure.paused ? "paused_failure" : "failed",
            last_result: failure.paused ? `${resultText || "任务执行失败"}；${failure.patch.paused_reason || "已自动暂停"}` : (resultText || "任务执行失败"),
        }) : latestJob;
        const retried = failure.paused ? syncedRun : scheduleFailedCronRunRetry(failedJob, syncedRun);
        notifyCronRun(cronJobId, syncedRun.id, "failed");
        if (!retried?.next_retry_at && !failure.paused)
            (0, cron_job_store_1.patchCronJob)(cronJobId, { last_status: "failed", last_result: resultText || "任务执行失败" });
    }
    else if (syncedRun?.status === "done") {
        if (matchedRun?.status !== "done")
            (0, cron_job_store_1.patchCronJob)(cronJobId, (0, cron_control_plane_1.cronSuccessPatch)());
        notifyCronRun(cronJobId, syncedRun.id, "done");
    }
    else if (syncedRun?.status === "waiting") {
        notifyCronRun(cronJobId, syncedRun.id, "waiting");
    }
    else if (syncedRun?.status === "cancelled") {
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
        (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, backlogStatus, {
            task_id: task.id,
            result: resultText || patch.last_result || status,
        });
    }
}
async function runCronJobCore(id, ctx, trigger, reliability = null, options = {}) {
    const jobs = (0, db_1.loadCronJobs)();
    const job = jobs.find(j => j.id === id);
    if (!job)
        throw new Error("定时任务不存在");
    if (job.archived || job.deleted_at)
        throw new Error("定时任务已归档，请先恢复后再运行");
    if (exports.runningCronJobs.has(id)) {
        return { success: false, message: "定时任务正在触发中，请稍后再试" };
    }
    const now = new Date();
    const normalizedJob = (0, cron_job_store_1.normalizeCronJob)(job);
    const scheduledFor = options.scheduledFor || (trigger === "schedule" || trigger === "recovery" ? job.next_run : null);
    const nextRun = (0, cron_job_store_1.computeNextRun)(job.schedule, now, normalizedJob.timezone);
    const target = (0, cron_control_plane_1.cronTarget)(job);
    const occurrenceId = String(options.occurrenceId || (0, cron_job_store_1.cronOccurrenceId)(id, scheduledFor ? (0, cron_control_plane_1.occurrenceSlot)(job, scheduledFor) : options.manualRequestId || now.toISOString(), target.type, target.id));
    const existingOccurrence = normalizedJob.run_history.find((run) => String(run.occurrence_id || "") === occurrenceId);
    if (existingOccurrence)
        return { success: true, duplicate: true, skipped: true, message: "相同计划周期已经创建运行记录", run: existingOccurrence };
    const authorization = (0, cron_control_plane_1.cronExecutionAuthorization)(job);
    if (!authorization.allowed) {
        const result = authorization.reason || "定时任务执行权限已失效";
        const run = (0, cron_job_store_1.appendCronRun)(id, { trigger, occurrence_id: occurrenceId, scheduled_for: scheduledFor, started_at: now.toISOString(), completed_at: now.toISOString(), status: "waiting", result, meta: { authorization: { allowed: false, reason: result } } });
        (0, cron_job_store_1.patchCronJob)(id, { enabled: false, next_run: null, last_status: "waiting", last_result: result, paused_reason: result });
        return { success: false, needs_user: true, code: "CRON_TARGET_ACCESS_REVOKED", error: result, run };
    }
    const overlap = ["retry", "resume"].includes(trigger) ? { action: "proceed", activeRuns: [], dependencyTaskIds: [], parallelSafe: false } : (0, cron_control_plane_1.resolveCronOverlap)(job);
    if (overlap.action === "skip" || overlap.action === "needs_user") {
        const status = overlap.action === "skip" ? "skipped" : "waiting";
        const result = overlap.reason || (status === "skipped" ? "上一轮尚未完成，本轮已跳过" : "上一轮需要人工处理");
        const run = (0, cron_job_store_1.appendCronRun)(id, { trigger, occurrence_id: occurrenceId, scheduled_for: scheduledFor, started_at: now.toISOString(), completed_at: status === "skipped" ? now.toISOString() : null, status, result, meta: { overlap_policy: normalizedJob.overlap_policy, active_run_ids: overlap.activeRuns.map((item) => item.id) } });
        (0, cron_job_store_1.patchCronJob)(id, { last_run: now.toISOString(), last_scheduled_at: scheduledFor || null, last_status: status, last_result: result, next_run: nextRun, run_count: Number(job.run_count || 0) + 1 });
        return { success: status === "skipped", skipped: status === "skipped", needs_user: status === "waiting", message: result, run };
    }
    if (overlap.action === "cancel_previous") {
        for (const activeRun of overlap.activeRuns)
            cancelCronRun(id, activeRun.id, "新一轮已按定时任务并发策略安全替换上一轮");
    }
    exports.runningCronJobs.add(id);
    const cronRun = (0, cron_job_store_1.appendCronRun)(id, {
        trigger,
        occurrence_id: occurrenceId,
        started_at: now.toISOString(),
        status: "triggering",
        result: "正在创建并派发任务...",
        parent_run_id: options.parentRunId || "",
        attempt: options.attempt || 1,
        scheduled_for: scheduledFor,
        meta: { reliability_trace_id: reliability?.traceId || "", recovered_misfire: trigger === "recovery", overlap_policy: normalizedJob.overlap_policy, overlap_action: overlap.action, overlap_reason: overlap.reason || "" },
    });
    if (!cronRun) {
        exports.runningCronJobs.delete(id);
        throw new Error("定时任务运行记录创建失败");
    }
    (0, cron_job_store_1.patchCronJob)(id, {
        last_run: now.toISOString(),
        last_run_key: (0, cron_job_store_1.minuteKey)(scheduledFor ? new Date(scheduledFor) : now, normalizedJob.timezone),
        last_scheduled_at: scheduledFor || null,
        last_status: "running",
        last_result: "正在创建并派发任务...",
    });
    notifyCronRun(id, cronRun.id, trigger === "recovery" ? "recovered" : "started");
    let taskDraft = null;
    let taskDrafts = [];
    let cronMeta = {};
    let gapContinueResult = null;
    try {
        (0, cron_job_store_1.validateCronJobPayload)(job);
        const targetType = (0, cron_job_store_1.normalizeTargetType)(job);
        const workflowType = targetType === "group" ? (job.workflow_type || job.workflowType || "general") : "general";
        const shouldContinueGaps = targetType === "group" && workflowType === "daily_dev"
            && job.continue_gaps !== false
            && job.continueGaps !== false;
        if (shouldContinueGaps) {
            gapContinueResult = (0, collaboration_1.continueDailyDevTasksFromGaps)(ctx, {
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
                task_ids: (gapContinueResult.results || []).filter((item) => item.success).map((item) => item.task_id),
            };
        }
        taskDrafts = Array.isArray(taskDraft?.drafts)
            ? taskDraft.drafts
            : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean));
        taskDrafts = taskDrafts.map((draft) => ({
            ...draft,
            cron_run_id: cronRun.id,
            cron_occurrence_id: occurrenceId,
            cron_scheduled_for: scheduledFor || null,
            mission_dependencies: overlap.action === "queue" ? [...new Set([...(draft.mission_dependencies || []), ...overlap.dependencyTaskIds])] : (draft.mission_dependencies || []),
            queue_scope: overlap.parallelSafe ? "isolated_parallel" : (draft.queue_scope || "conversation_serial"),
            child_agent_isolation: overlap.parallelSafe ? "worktree" : (draft.child_agent_isolation || ""),
            workflow_meta: {
                ...(draft?.workflow_meta || {}),
                cron_run_id: cronRun.id,
                cron_occurrence_id: occurrenceId,
                cron_scheduled_for: scheduledFor || null,
                cron_overlap: { policy: normalizedJob.overlap_policy, action: overlap.action, dependency_task_ids: overlap.dependencyTaskIds || [], parallel_safe: overlap.parallelSafe === true },
            },
        }));
        for (const draft of taskDrafts) {
            const preflight = (0, task_intake_preflight_1.buildTaskPreflight)({ ...draft, source_channel: "schedule" }, {
                ccmAuth: {
                    kind: authorization.legacy ? "system" : "browser",
                    userId: authorization.ownerId,
                    role: authorization.role === "system" ? "admin" : authorization.role,
                },
            });
            const blockingWarning = preflight.warnings.find((item) => ["WORKSPACE_DIRTY", "AGENT_RUNTIME_UNAVAILABLE", "GROUP_AGENT_UNAVAILABLE"].includes(item.code));
            if (!preflight.allowed || blockingWarning) {
                const error = new Error(preflight.errors[0]?.message || blockingWarning?.message || "定时任务执行前预检未通过");
                error.code = preflight.errors[0]?.code || blockingWarning?.code || "CRON_PREFLIGHT_FAILED";
                error.needsUser = true;
                throw error;
            }
        }
        if (reliability?.operationKey) {
            taskDrafts = taskDrafts.map((draft, index) => ({
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
            const updated = (0, cron_job_store_1.patchCronJob)(id, {
                last_status: continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "continued")) : "skipped",
                last_result: result,
                last_run_meta: cronMeta,
                last_task_ids: continuedCount > 0 ? (cronMeta.continued_gap_tasks?.task_ids || []) : job.last_task_ids,
                run_count: Number(job.run_count || 0) + 1,
                next_run: nextRun,
            });
            const runStatus = continuedCount > 0 ? (queuedCount > 0 ? "queued" : (blockedCount > 0 ? "waiting" : "done")) : "skipped";
            const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
                status: runStatus,
                result,
                task_ids: continuedTaskIds,
                primary_task_id: continuedTaskIds[0] || "",
                task_states: Object.fromEntries(continuedTaskIds.map((taskId) => [taskId, { status: queuedCount > 0 ? "queued" : "waiting", result, updated_at: new Date().toISOString() }])),
                dispatched_at: continuedCount > 0 ? new Date().toISOString() : null,
                completed_at: runStatus === "skipped" || runStatus === "done" ? new Date().toISOString() : null,
                meta: cronMeta,
            });
            if (runStatus === "done" || runStatus === "skipped")
                notifyCronRun(id, cronRun.id, "done");
            return { success: true, queued: queuedCount > 0, skipped: continuedCount === 0, continued: continuedCount, message: result, job: updated, run, gap_continue_result: gapContinueResult };
        }
        const created = taskDrafts.map((draft) => {
            const { task, queueResult } = (0, collaboration_1.createAndQueueTask)(draft, ctx);
            const backlogFile = task?.workflow_meta?.intake?.backlog_file;
            if (task?.group_id && backlogFile) {
                (0, collaboration_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, "queued", {
                    task_id: task.id,
                    result: `${queueResult?.message || "任务已创建"}：${task.title}`,
                });
            }
            return { task, queueResult, queued: !!queueResult?.queued };
        });
        const continuedTaskIds = (cronMeta.continued_gap_tasks?.task_ids || []).map((taskId) => String(taskId));
        const createdTaskIds = [...new Set([...continuedTaskIds, ...created.map(item => String(item.task.id))])];
        attachCronRunToTasks(createdTaskIds, id, cronRun.id);
        const queuedCount = created.filter(item => item.queued).length;
        if (created.length > 1) {
            const status = queuedCount > 0 ? "queued" : (created.some(item => item.queueResult?.blocked) ? "waiting" : "skipped");
            const result = `批量创建 ${created.length} 个业务开发任务，已入队 ${queuedCount} 个${formatCronMetaSummary(cronMeta)}`;
            const updated = (0, cron_job_store_1.patchCronJob)(id, {
                last_status: status,
                last_result: result,
                last_run_meta: cronMeta,
                last_task_id: created[created.length - 1]?.task?.id || null,
                last_task_ids: created.map(item => item.task.id),
                run_count: Number(job.run_count || 0) + 1,
                next_run: nextRun,
            });
            const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
                status,
                result,
                task_ids: createdTaskIds,
                primary_task_id: createdTaskIds[0] || "",
                task_states: Object.fromEntries([
                    ...continuedTaskIds.map((taskId) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
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
        const updated = (0, cron_job_store_1.patchCronJob)(id, {
            last_status: status,
            last_result: result,
            last_run_meta: cronMeta,
            last_task_id: task.id,
            run_count: Number(job.run_count || 0) + 1,
            next_run: nextRun,
        });
        const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
            status,
            result,
            task_ids: createdTaskIds,
            primary_task_id: String(task.id),
            task_states: Object.fromEntries([
                ...continuedTaskIds.map((taskId) => [taskId, { status: "queued", result: "交付缺口任务已重新入队", updated_at: new Date().toISOString() }]),
                [String(task.id), { status: queued ? "queued" : (queueResult?.blocked ? "waiting" : "skipped"), result: queueResult?.message || result, updated_at: new Date().toISOString() }],
            ]),
            dispatched_at: new Date().toISOString(),
            completed_at: status === "skipped" ? new Date().toISOString() : null,
            meta: cronMeta,
        });
        return { success: true, queued, task, queue_result: queueResult, job: updated, run };
    }
    catch (e) {
        const drafts = taskDrafts.length ? taskDrafts : (Array.isArray(taskDraft?.drafts) ? taskDraft.drafts : (Array.isArray(taskDraft) ? taskDraft : [taskDraft].filter(Boolean)));
        for (const draft of drafts) {
            const backlogFile = draft?.workflow_meta?.intake?.backlog_file;
            if (!draft?.group_id || !backlogFile)
                continue;
            (0, collaboration_1.markDailyDevBacklogStatus)(draft.group_id, backlogFile, "ready", {
                result: `定时任务创建失败，已恢复为 ready：${e.message}`,
            });
        }
        if (e?.needsUser === true) {
            const result = `执行前预检需要处理：${e.message}`;
            const updated = (0, cron_job_store_1.patchCronJob)(id, { enabled: false, next_run: null, last_status: "waiting", last_result: result, paused_reason: result });
            const run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, { status: "waiting", result, completed_at: null, meta: { ...cronMeta, preflight_code: e.code || "CRON_PREFLIGHT_FAILED" } });
            notifyCronRun(id, cronRun.id, "waiting");
            return { success: false, needs_user: true, code: e.code || "CRON_PREFLIGHT_FAILED", error: result, job: updated, run };
        }
        const failure = (0, cron_control_plane_1.cronFailureDecision)((0, db_1.loadCronJobs)().find(item => item.id === id) || job);
        const updated = (0, cron_job_store_1.patchCronJob)(id, {
            ...failure.patch,
            last_status: failure.paused ? "paused_failure" : "failed",
            last_result: e.message,
            last_run_meta: cronMeta,
            run_count: Number(job.run_count || 0) + 1,
            next_run: failure.paused ? null : nextRun,
        });
        let run = (0, cron_job_store_1.patchCronRun)(id, cronRun.id, {
            status: "failed",
            result: e.message,
            completed_at: new Date().toISOString(),
            meta: cronMeta,
        });
        run = failure.paused ? run : scheduleFailedCronRunRetry(updated, run);
        notifyCronRun(id, cronRun.id, "failed");
        return { success: false, error: e.message, job: updated, run };
    }
    finally {
        try {
            (0, cron_dev_reports_1.upsertAutoDevDailyReport)((0, cron_dev_reports_1.localDateKey)());
        }
        catch (reportError) {
            console.error("[Cron] 生成开发日报失败", reportError?.message || reportError);
        }
        exports.runningCronJobs.delete(id);
    }
}
async function runCronJob(id, ctx, trigger, options = {}) {
    if (trigger !== "schedule" && trigger !== "recovery")
        return runCronJobCore(id, ctx, trigger, null, options);
    const job = (0, cron_job_store_1.normalizeCronJob)((0, db_1.loadCronJobs)().find(item => item.id === id) || {});
    const scheduledFor = options.scheduledFor || job.next_run || new Date().toISOString();
    const operationKey = `${id}:${(0, cron_job_store_1.minuteKey)(new Date(scheduledFor), job.timezone)}`;
    const operation = (0, reliability_ledger_1.acquireIdempotency)({ scope: "cron-schedule", key: operationKey, leaseMs: 10 * 60 * 1000, metadata: { cron_job_id: id, minute_key: operationKey.split(":").slice(1).join(":") } });
    if (!operation.acquired) {
        return operation.record?.result || { success: true, duplicate: true, skipped: true, message: operation.inProgress ? "相同定时周期正在执行" : "相同定时周期已执行" };
    }
    try {
        const result = await runCronJobCore(id, ctx, trigger, { operationKey, traceId: operation.traceId }, { ...options, scheduledFor });
        if (result?.success === false) {
            (0, reliability_ledger_1.failIdempotency)("cron-schedule", operationKey, result.error || result.message || "定时任务执行失败");
            return result;
        }
        (0, reliability_ledger_1.completeIdempotency)("cron-schedule", operationKey, {
            success: true,
            queued: !!result?.queued,
            task_id: result?.task?.id || null,
            task_ids: result?.tasks?.map((task) => task.id) || [],
            message: result?.message || result?.error || "",
        });
        return result;
    }
    catch (error) {
        (0, reliability_ledger_1.failIdempotency)("cron-schedule", operationKey, error);
        throw error;
    }
}
async function retryCronRunCore(jobId, runId, ctx, trigger = "retry") {
    const job = (0, db_1.loadCronJobs)().find(item => item.id === jobId);
    if (!job)
        throw new Error("定时任务不存在");
    const parent = (0, cron_job_store_1.normalizeCronJob)(job).run_history.find((item) => item.id === runId);
    if (!parent)
        throw new Error("运行记录不存在");
    if (parent.retry_child_run_id) {
        const existing = (0, cron_job_store_1.normalizeCronJob)((0, db_1.loadCronJobs)().find(item => item.id === jobId)).run_history.find((item) => item.id === parent.retry_child_run_id);
        if (existing && exports.CRON_RUN_ACTIVE_STATUSES.has(existing.status))
            return { success: true, duplicate: true, run: existing };
    }
    const tasks = (0, db_1.loadTasks)().filter(task => (parent.task_ids || []).includes(String(task.id || "")));
    const retryable = tasks.filter(task => !["done", "completed"].includes(String(task.status || "").toLowerCase()));
    if (!retryable.length) {
        return runCronJob(jobId, ctx, trigger, { parentRunId: parent.id, attempt: Number(parent.attempt || 1) + 1 });
    }
    const child = (0, cron_job_store_1.appendCronRun)(jobId, {
        trigger,
        parent_run_id: parent.id,
        attempt: Number(parent.attempt || 1) + 1,
        scheduled_for: parent.scheduled_for,
        status: "triggering",
        result: trigger === "resume" ? "正在从未完成任务继续" : "正在重新执行失败任务",
        task_ids: retryable.map(task => task.id),
    });
    if (!child)
        throw new Error("重试运行记录创建失败");
    attachCronRunToTasks(retryable.map(task => task.id), jobId, child.id);
    const results = retryable.map(task => ({ taskId: task.id, ...(0, collaboration_1.retryTask)(task.id, ctx, trigger === "resume" ? "从定时任务运行记录继续" : "定时任务自动重试", true) }));
    const taskIds = results.filter(item => item.success).map(item => item.taskId);
    const queued = results.filter(item => item.queued).length;
    const failed = results.filter(item => !item.success).length;
    const status = failed === results.length ? "failed" : queued > 0 ? "queued" : "waiting";
    const result = failed ? `${taskIds.length}/${results.length} 个任务已重新执行` : `${taskIds.length} 个任务已重新执行`;
    const updated = (0, cron_job_store_1.patchCronRun)(jobId, child.id, {
        status,
        result,
        task_ids: taskIds,
        primary_task_id: taskIds[0] || "",
        task_states: Object.fromEntries(results.map(item => [item.taskId, { status: item.success ? (item.queued ? "queued" : "waiting") : "failed", result: item.error || result, updated_at: new Date().toISOString() }])),
        dispatched_at: new Date().toISOString(),
        completed_at: status === "failed" ? new Date().toISOString() : null,
    });
    (0, cron_job_store_1.patchCronRun)(jobId, parent.id, { retry_child_run_id: child.id, next_retry_at: null });
    (0, cron_job_store_1.patchCronJob)(jobId, { last_status: status, last_result: result, last_task_ids: taskIds, last_task_id: taskIds[0] || null });
    notifyCronRun(jobId, child.id, trigger === "resume" ? "recovered" : "started");
    if (status === "failed")
        scheduleFailedCronRunRetry((0, db_1.loadCronJobs)().find(item => item.id === jobId), updated);
    return { success: status !== "failed", run: updated, results };
}
async function retryCronRun(jobId, runId, ctx, trigger = "retry") {
    const lockTarget = path.join(utils_1.CCM_DIR, "scheduler", `cron-retry-${String(jobId).replace(/[^a-zA-Z0-9_-]/g, "_")}-${String(runId).replace(/[^a-zA-Z0-9_-]/g, "_")}`);
    let lock = null;
    try {
        lock = (0, atomic_json_file_1.acquireFileLock)(lockTarget, { timeoutMs: 50, retryMs: 10, staleMs: 2 * 60_000 });
    }
    catch (error) {
        if (/file lock timeout/i.test(String(error?.message || "")))
            return { success: true, duplicate: true, queued: true, message: "同一轮定时任务正在恢复或重试" };
        throw error;
    }
    try {
        return await retryCronRunCore(jobId, runId, ctx, trigger);
    }
    finally {
        if (lock)
            (0, atomic_json_file_1.releaseFileLock)(lock);
    }
}
function reconcileCronRunsOnStartup(now = new Date()) {
    const jobs = (0, db_1.loadCronJobs)();
    const tasks = (0, db_1.loadTasks)();
    const summary = { jobs: jobs.length, recovered_runs: 0, failed_stale_runs: 0, schedules_initialized: 0 };
    for (const rawJob of jobs) {
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (job.enabled && !rawJob.next_run && !job.schedule_error) {
            (0, cron_job_store_1.patchCronJob)(job.id, { next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone) });
            summary.schedules_initialized++;
        }
        for (const run of job.run_history || []) {
            if (!exports.CRON_RUN_ACTIVE_STATUSES.has(run.status) || run.status === "retry_waiting" || run.status === "waiting")
                continue;
            const boundTasks = tasks.filter(task => (run.task_ids || []).includes(String(task.id || "")));
            if (boundTasks.length) {
                let updated = run;
                for (const task of boundTasks)
                    updated = (0, cron_job_store_1.syncCronRunTask)(job.id, run.id, task.id, task.status, task.result || task.status_detail || "", task.updated_at || now.toISOString()) || updated;
                if (updated?.status !== run.status)
                    summary.recovered_runs++;
                continue;
            }
            const age = now.getTime() - Date.parse(run.started_at || "");
            if (Number.isFinite(age) && age >= 5 * 60_000) {
                const failed = (0, cron_job_store_1.patchCronRun)(job.id, run.id, { status: "failed", result: "服务重启时发现本轮未完成派发，已转入恢复流程", completed_at: now.toISOString(), recovered_after_restart: true });
                scheduleFailedCronRunRetry(rawJob, failed, now);
                notifyCronRun(job.id, run.id, "failed");
                summary.failed_stale_runs++;
            }
        }
    }
    return summary;
}
async function processDueCronRetries(ctx, now) {
    for (const rawJob of (0, db_1.loadCronJobs)()) {
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (!job.enabled || rawJob.archived || rawJob.deleted_at)
            continue;
        for (const run of job.run_history || []) {
            if (run.status !== "retry_waiting" || !run.next_retry_at || run.retry_child_run_id)
                continue;
            if (Date.parse(run.next_retry_at) > now.getTime() || exports.runningCronJobs.has(job.id))
                continue;
            try {
                await retryCronRun(job.id, run.id, ctx, "retry");
            }
            catch (error) {
                console.error("[Cron][Retry]", job.name, error?.message || error);
            }
        }
    }
}
async function tickCronSchedulerCore(ctx) {
    const now = new Date();
    await processDueCronRetries(ctx, now);
    const jobs = (0, db_1.loadCronJobs)();
    for (const rawJob of jobs) {
        if (rawJob.archived || rawJob.deleted_at)
            continue;
        const job = (0, cron_job_store_1.normalizeCronJob)(rawJob);
        if (!job.enabled)
            continue;
        if (job.schedule_error) {
            if (rawJob.last_status !== "invalid_schedule" || rawJob.last_result !== job.schedule_error) {
                (0, cron_job_store_1.patchCronJob)(job.id, {
                    last_status: "invalid_schedule",
                    last_result: job.schedule_error,
                    next_run: null,
                });
            }
            continue;
        }
        if (exports.runningCronJobs.has(job.id))
            continue;
        const scheduledFor = job.next_run;
        if (!scheduledFor) {
            (0, cron_job_store_1.patchCronJob)(job.id, { next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone) });
            continue;
        }
        const dueAt = Date.parse(scheduledFor);
        if (!Number.isFinite(dueAt) || dueAt > now.getTime())
            continue;
        const lateMinutes = Math.max(0, (now.getTime() - dueAt) / 60_000);
        const shouldRecover = lateMinutes > 1.5;
        const withinGrace = lateMinutes <= Number(job.misfire_grace_minutes || 1440);
        if (shouldRecover && (job.misfire_policy === "skip" || !withinGrace)) {
            const reason = withinGrace ? "服务停机期间错过执行，已按任务策略跳过" : "错过执行时间已超过补跑窗口，已跳过";
            const run = (0, cron_job_store_1.appendCronRun)(job.id, { trigger: "recovery", scheduled_for: scheduledFor, started_at: now.toISOString(), completed_at: now.toISOString(), status: "skipped", result: reason, meta: { missed_by_minutes: Math.round(lateMinutes), misfire_policy: job.misfire_policy } });
            (0, cron_job_store_1.patchCronJob)(job.id, { last_run: now.toISOString(), last_scheduled_at: scheduledFor, last_status: "skipped", last_result: reason, next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone), run_count: Number(job.run_count || 0) + 1 });
            if (run)
                notifyCronRun(job.id, run.id, "done");
            continue;
        }
        if (shouldRecover && job.misfire_policy === "confirm") {
            const pending = (0, cron_control_plane_1.missedCronOccurrences)(job, now);
            const reason = `停机期间错过 ${pending.length || 1} 个执行时间，等待用户确认是否补跑`;
            (0, cron_job_store_1.patchCronJob)(job.id, { pending_misfires: pending.length ? pending : [scheduledFor], last_status: "waiting_confirmation", last_result: reason, next_run: (0, cron_job_store_1.computeNextRun)(job.schedule, now, job.timezone) });
            continue;
        }
        const occurrences = shouldRecover && job.misfire_policy === "catch_up"
            ? (0, cron_control_plane_1.missedCronOccurrences)(job, now)
            : [shouldRecover && job.misfire_policy === "run_once" ? ((0, cron_control_plane_1.latestMissedCronOccurrence)(job, now) || scheduledFor) : scheduledFor];
        for (const occurrence of occurrences) {
            const result = await runCronJob(job.id, ctx, shouldRecover ? "recovery" : "schedule", { scheduledFor: occurrence });
            if (!result?.success && !result?.skipped)
                console.error("[Cron]", job.name, result?.error || result?.message);
        }
    }
    await (0, cron_dev_reports_1.tickAutoDevReportNotifications)(now);
    await (0, feishu_channel_1.tickFeishuNotificationOutbox)(now);
    (0, cron_dev_reports_1.reconcileAutoDevReportDeliveryStatuses)();
    try {
        runConflictResolutionMemoryMaintenanceSchedulerTick({ at: now.toISOString() });
    }
    catch (error) {
        console.error("[Cron][MemoryMaintenance]", error?.message || error);
    }
}
async function tickCronScheduler(ctx) {
    if (schedulerTickPromise)
        return schedulerTickPromise;
    const operation = (async () => {
        let lock = null;
        try {
            lock = (0, atomic_json_file_1.acquireFileLock)(CRON_SCHEDULER_TICK_LOCK, { timeoutMs: 20, retryMs: 5, staleMs: 2 * 60_000 });
        }
        catch (error) {
            if (/file lock timeout/i.test(String(error?.message || "")))
                return { skipped: true, reason: "scheduler_tick_owned_elsewhere" };
            throw error;
        }
        try {
            return await tickCronSchedulerCore(ctx);
        }
        finally {
            if (lock)
                (0, atomic_json_file_1.releaseFileLock)(lock);
        }
    })().finally(() => {
        if (schedulerTickPromise === operation)
            schedulerTickPromise = null;
    });
    schedulerTickPromise = operation;
    return operation;
}
function startCronScheduler(ctx) {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    const recovery = reconcileCronRunsOnStartup();
    const tick = () => tickCronScheduler(ctx).catch((e) => console.error("[Cron]", e.message));
    tick();
    schedulerTimer = setInterval(tick, 30 * 1000);
    console.log(`[Cron] 定时任务调度器已启动，恢复 ${recovery.recovered_runs} 条运行，修复 ${recovery.failed_stale_runs} 条中断记录`);
}
function stopCronScheduler() {
    if (schedulerTimer)
        clearInterval(schedulerTimer);
    schedulerTimer = null;
}
function getConflictResolutionMemoryMaintenanceSchedulerStatus() {
    const latest = exports.latestConflictResolutionMaintenanceTick;
    const safe = !latest || (latest.destructiveActionAuthorized === false
        && Number(latest.deletedCount || 0) === 0
        && Number(latest.createdTaskCount || 0) === 0
        && Number(latest.createdApprovalReceiptCount || 0) === 0
        && (latest.rows || []).every((row) => row.destructiveActionAuthorized === false && Number(row.deletedCount || 0) === 0));
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
        tick_in_progress: !!schedulerTickPromise,
        cross_process_singleflight: true,
        interval_ms: 30 * 1000,
        running_job_ids: Array.from(exports.runningCronJobs),
        conflict_resolution_memory_maintenance: exports.latestConflictResolutionMaintenanceTick || {
            schema: "ccm-conflict-resolution-maintenance-scheduler-tick-v1",
            status: "not_run",
            destructiveActionAuthorized: false,
            deletedCount: 0,
            createdTaskCount: 0,
            createdApprovalReceiptCount: 0,
        },
    };
}
function readJsonBody(req, onDone, onError) {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
        try {
            onDone(body ? JSON.parse(body) : {});
        }
        catch (e) {
            onError(e);
        }
    });
}
// === Cron API 路由分流 ===
function handleCronApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/cron" && req.method === "GET") {
        const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
        const onlyArchived = String(parsed.query.archived || "") === "true";
        const allJobs = (0, db_1.loadCronJobs)();
        const visibleJobs = allJobs.filter(job => (0, cron_control_plane_1.canViewCronJob)(req, job));
        const jobs = onlyArchived ? visibleJobs.filter(job => job.archived || job.deleted_at) : includeArchived ? visibleJobs : visibleJobs.filter(job => !job.archived && !job.deleted_at);
        (0, utils_1.sendJson)(res, { jobs: publicCronJobs(jobs), archived_count: visibleJobs.filter(job => job.archived || job.deleted_at).length, scheduler: schedulerStatus() });
        return true;
    }
    const runHistoryMatch = pathname.match(/^\/api\/cron\/([^/]+)\/runs$/);
    if (runHistoryMatch && req.method === "GET") {
        const job = (0, db_1.loadCronJobs)().find(item => item.id === decodeURIComponent(runHistoryMatch[1]));
        if (!job || !(0, cron_control_plane_1.canViewCronJob)(req, job)) {
            (0, utils_1.sendJson)(res, { success: false, error: "定时任务不存在" }, 404);
            return true;
        }
        const view = publicCronJobs([job])[0];
        (0, utils_1.sendJson)(res, { success: true, job_id: job.id, revision: (0, cron_job_store_1.normalizeCronJob)(job).revision, runs: view?.run_history || [] });
        return true;
    }
    if (pathname === "/api/cron/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, schedulerStatus());
        return true;
    }
    if (pathname === "/api/cron/preview" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                (0, cron_control_plane_1.assertCronTargetAccess)(req, payload, "use");
                (0, cron_control_plane_1.assertCronTemplateAccess)(req, payload);
                (0, cron_job_store_1.validateCronJobPayload)(payload);
                (0, utils_1.sendJson)(res, { success: true, preview: (0, cron_control_plane_1.previewCronSchedule)(payload, 5) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 400);
            }
        }, (error) => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/create" && req.method === "POST") {
        const handleCreate = async (payload, files = []) => {
            try {
                const actor = (0, cron_control_plane_1.cronPrincipal)(req);
                let jobPayload = { ...(payload || {}), owner_id: actor.userId };
                (0, cron_control_plane_1.assertCronTargetAccess)(req, jobPayload, "use");
                (0, cron_control_plane_1.assertCronTemplateAccess)(req, jobPayload);
                if (files.length) {
                    const attachments = await (0, task_attachments_1.buildTaskAttachmentMutation)({ files, retainedIds: [], userText: `${jobPayload.name || ""}\n${jobPayload.prompt || ""}` });
                    jobPayload = {
                        ...jobPayload,
                        source_attachments: attachments.attachments,
                        source_attachment_contexts: attachments.contexts,
                        source_attachment_context: attachments.context,
                        source_attachment_warnings: attachments.warnings,
                    };
                }
                const job = (0, cron_job_store_1.createCronJob)(jobPayload);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, task_attachments_1.removeUploadedFiles)(files);
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        };
        const contentType = String(req.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的定时任务附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                const payload = fields.payload ? JSON.parse(fields.payload) : fields;
                return handleCreate(payload, files || []);
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        readJsonBody(req, (payload) => void handleCreate(payload), (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/update" && req.method === "POST") {
        const handleUpdate = async (payload, files = [], multipart = false) => {
            try {
                const { id, retained_attachment_ids, retainedAttachmentIds, ...incomingUpdates } = payload || {};
                if (incomingUpdates.enabled === true) {
                    incomingUpdates.consecutive_failures = 0;
                    incomingUpdates.paused_reason = "";
                }
                let updates = incomingUpdates;
                const current = (0, db_1.loadCronJobs)().find((item) => item.id === id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, cron_control_plane_1.assertCronManage)(req, current);
                if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(current).revision)
                    return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
                const actor = (0, cron_control_plane_1.cronPrincipal)(req);
                if (String(current.owner_id || current.ownerId || "legacy-system") === "legacy-system" && !actor.admin)
                    incomingUpdates.owner_id = actor.userId;
                (0, cron_control_plane_1.assertCronTargetAccess)(req, { ...current, ...incomingUpdates }, "use");
                (0, cron_control_plane_1.assertCronTemplateAccess)(req, { ...current, ...incomingUpdates });
                if (multipart) {
                    const attachments = await (0, task_attachments_1.buildTaskAttachmentMutation)({
                        files,
                        currentAttachments: current.source_attachments,
                        currentContexts: current.source_attachment_contexts,
                        retainedIds: retained_attachment_ids === undefined && retainedAttachmentIds === undefined
                            ? undefined
                            : (0, task_attachments_1.parseRetainedAttachmentIds)(retained_attachment_ids ?? retainedAttachmentIds),
                        userText: `${updates.name || current.name || ""}\n${updates.prompt || current.prompt || ""}`,
                    });
                    updates = {
                        ...updates,
                        source_attachments: attachments.attachments,
                        source_attachment_contexts: attachments.contexts,
                        source_attachment_context: attachments.context,
                        source_attachment_warnings: attachments.warnings,
                    };
                }
                const job = (0, cron_job_store_1.updateCronJob)(id, updates);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, task_attachments_1.removeUploadedFiles)(files);
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        };
        const contentType = String(req.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的定时任务附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                const payload = fields.payload ? JSON.parse(fields.payload) : fields;
                return handleUpdate(payload, files || [], true);
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        readJsonBody(req, (payload) => void handleUpdate(payload), (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/delete" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = (0, db_1.loadCronJobs)().find((item) => item.id === payload.id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, cron_control_plane_1.assertCronManage)(req, current);
                if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(current).revision)
                    return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
                const job = (0, cron_job_store_1.deleteCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, archived: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/restore" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = (0, db_1.loadCronJobs)().find((item) => item.id === payload.id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, cron_control_plane_1.assertCronManage)(req, current);
                if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(current).revision)
                    return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
                const job = (0, cron_job_store_1.restoreCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, job: (0, cron_job_store_1.normalizeCronJob)(job) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/purge" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = (0, db_1.loadCronJobs)().find((item) => item.id === payload.id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, cron_control_plane_1.assertCronManage)(req, current);
                if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(current).revision)
                    return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
                const job = (0, cron_job_store_1.purgeCronJob)(payload.id);
                if (!job)
                    return (0, utils_1.sendJson)(res, { error: "定时任务不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, id: job.id });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/bulk" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const ids = Array.from(new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id || "")).filter(Boolean)));
                const action = String(payload.action || "");
                if (!ids.length)
                    return (0, utils_1.sendJson)(res, { error: "请选择定时任务" }, 400);
                if (!["archive", "restore", "purge", "enable", "disable"].includes(action))
                    return (0, utils_1.sendJson)(res, { error: "不支持的批量操作" }, 400);
                const results = ids.map((id) => {
                    try {
                        const current = (0, db_1.loadCronJobs)().find((item) => item.id === id);
                        if (!current)
                            throw new Error("定时任务不存在");
                        (0, cron_control_plane_1.assertCronManage)(req, current);
                        if (Number(payload.revisions?.[id]) !== (0, cron_job_store_1.normalizeCronJob)(current).revision)
                            throw new Error("定时任务已经发生变化，请刷新后重试");
                        const job = action === "archive" ? (0, cron_job_store_1.deleteCronJob)(id)
                            : action === "restore" ? (0, cron_job_store_1.restoreCronJob)(id)
                                : action === "purge" ? (0, cron_job_store_1.purgeCronJob)(id)
                                    : (0, cron_job_store_1.updateCronJob)(id, { enabled: action === "enable" });
                        return { id, success: !!job };
                    }
                    catch (error) {
                        return { id, success: false, error: error.message };
                    }
                });
                (0, utils_1.sendJson)(res, { success: results.every((item) => item.success), results }, results.some((item) => item.success) ? 200 : 409);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/run" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const job = (0, db_1.loadCronJobs)().find((item) => item.id === payload.id);
            if (!job || !(0, cron_control_plane_1.canManageCronJob)(req, job))
                return (0, utils_1.sendJson)(res, { success: false, error: "定时任务不存在或无权运行" }, 404);
            if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(job).revision)
                return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
            try {
                (0, cron_control_plane_1.assertCronTargetAccess)(req, job, "use");
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 403);
            }
            runCronJob(payload.id, ctx, "manual", { manualRequestId: String(payload.operation_key || payload.operationKey || crypto.randomUUID()) })
                .then((result) => {
                const status = result.success ? 200 : 400;
                (0, utils_1.sendJson)(res, result, status);
            })
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/overview" && req.method === "GET") {
        const notification = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
        const today = String(parsed.query.date || (0, cron_dev_reports_1.localDateKey)(new Date(), notification.timezone));
        const preview = (0, cron_dev_reports_1.buildAutoDevReportPreview)("daily", today, notification.timezone);
        const stored = (0, db_1.loadDevReports)().find((item) => item.date === today || item.id === today);
        const report = stored
            ? { ...stored, stale: stored.evidence_checksum !== preview.evidence_checksum, generation_status: stored.evidence_checksum !== preview.evidence_checksum ? "stale" : stored.generation_status || (stored.ai_summary ? "generated" : "evidence_ready"), live_evidence_checksum: preview.evidence_checksum }
            : preview;
        const reports = (0, db_1.loadDevReports)().slice(0, 30);
        const jobs = (0, db_1.loadCronJobs)().map(cron_job_store_1.normalizeCronJob).filter((job) => job.workflow_type === "daily_dev");
        const journalAudit = (0, work_journal_1.getWorkJournalAudit)({ sync: false });
        (0, utils_1.sendJson)(res, {
            success: true,
            scheduler: schedulerStatus(),
            today: report,
            reports,
            weekly_reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20),
            notification,
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
            if (!jobId || !runId)
                return (0, utils_1.sendJson)(res, { error: "缺少定时任务或运行标识" }, 400);
            const job = (0, db_1.loadCronJobs)().find((item) => item.id === jobId);
            if (!job || !(0, cron_control_plane_1.canManageCronJob)(req, job))
                return (0, utils_1.sendJson)(res, { success: false, error: "定时任务不存在或无权操作" }, 404);
            if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(job).revision)
                return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
            try {
                (0, cron_control_plane_1.assertCronTargetAccess)(req, job, "use");
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 403);
            }
            if (pathname.endsWith("/cancel")) {
                try {
                    (0, utils_1.sendJson)(res, cancelCronRun(jobId, runId, String(payload.reason || "用户取消本轮定时任务")));
                }
                catch (error) {
                    (0, utils_1.sendJson)(res, { error: error.message }, 409);
                }
                return;
            }
            retryCronRun(jobId, runId, ctx, pathname.endsWith("/resume") ? "resume" : "retry")
                .then(result => (0, utils_1.sendJson)(res, result, result?.success === false ? 409 : 200))
                .catch((error) => (0, utils_1.sendJson)(res, { error: error.message }, 409));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/cron/misfire/confirm" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const job = (0, db_1.loadCronJobs)().find((item) => item.id === String(payload.id || payload.job_id || payload.jobId || ""));
            if (!job || !(0, cron_control_plane_1.canManageCronJob)(req, job))
                return (0, utils_1.sendJson)(res, { success: false, error: "定时任务不存在或无权操作" }, 404);
            if (Number(payload.revision) !== (0, cron_job_store_1.normalizeCronJob)(job).revision)
                return (0, utils_1.sendJson)(res, { success: false, error: "定时任务已经发生变化，请刷新后重试", code: "CRON_REVISION_CONFLICT" }, 409);
            try {
                (0, cron_control_plane_1.assertCronTargetAccess)(req, job, "use");
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, error.status || 403);
            }
            const pending = (Array.isArray(job.pending_misfires) ? job.pending_misfires : []).map(String).filter(Boolean);
            const decision = String(payload.decision || "");
            const shouldRun = decision ? decision === "run" : payload.run !== false;
            const selected = !shouldRun ? [] : ((decision === "run" || payload.mode === "all") ? pending.slice(0, (0, cron_job_store_1.normalizeCronJob)(job).catch_up_limit) : pending.slice(-1));
            (0, cron_job_store_1.patchCronJob)(job.id, { pending_misfires: [], last_status: selected.length ? "recovery_queued" : "skipped", last_result: selected.length ? `已确认补跑 ${selected.length} 轮` : "已确认跳过停机期间错过的执行" });
            if (!selected.length)
                return (0, utils_1.sendJson)(res, { success: true, skipped: true });
            selected.reduce((chain, scheduledFor) => chain.then(async (results) => {
                results.push(await runCronJob(job.id, ctx, "recovery", { scheduledFor }));
                return results;
            }), Promise.resolve([]))
                .then(results => (0, utils_1.sendJson)(res, { success: results.every((item) => item?.success !== false || item?.skipped), results }))
                .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 409));
        }, (error) => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/work-journal/audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, work_journal_1.getWorkJournalAudit)());
        return true;
    }
    if (pathname === "/api/auto-dev/work-journal/events" && req.method === "GET") {
        const events = (0, work_journal_1.listWorkJournalEvents)({
            start: parsed.query.start,
            end: parsed.query.end,
            task_id: parsed.query.task_id,
            source: parsed.query.source,
            limit: parsed.query.limit,
        });
        (0, utils_1.sendJson)(res, { success: true, count: events.length, events });
        return true;
    }
    if (pathname === "/api/auto-dev/reports" && req.method === "GET") {
        const limit = Math.max(1, Math.min(120, Number(parsed.query.limit || 30)));
        (0, utils_1.sendJson)(res, { success: true, reports: (0, db_1.loadDevReports)().slice(0, limit) });
        return true;
    }
    if (pathname === "/api/auto-dev/weekly-reports" && req.method === "GET") {
        const limit = Math.max(1, Math.min(80, Number(parsed.query.limit || 20)));
        (0, utils_1.sendJson)(res, { success: true, reports: (0, db_1.loadDevWeeklyReports)().slice(0, limit) });
        return true;
    }
    if (pathname === "/api/auto-dev/weekly-report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const config = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
            (0, cron_dev_reports_1.generateAndUpsertAutoDevReport)("weekly", payload.date || (0, cron_dev_reports_1.localDateKey)(new Date(), config.timezone), { force: payload.force === true, timezone: config.timezone })
                .then(report => (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevWeeklyReports)().slice(0, 20) }))
                .catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message, report: e.report || null, retryable: true }, 503));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)()) });
        return true;
    }
    if (pathname === "/api/auto-dev/notification/config" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            try {
                const current = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
                const config = (0, cron_dev_reports_1.saveNormalizedNotifyConfig)({
                    ...current,
                    daily_enabled: payload.daily_enabled === true,
                    daily_time: payload.daily_time ?? current.daily_time,
                    weekly_enabled: payload.weekly_enabled === true,
                    weekly_day: payload.weekly_day ?? current.weekly_day,
                    weekly_time: payload.weekly_time ?? current.weekly_time,
                    timezone: payload.timezone ?? current.timezone,
                    retry_limit: payload.retry_limit ?? current.retry_limit,
                    retry_interval_minutes: payload.retry_interval_minutes ?? current.retry_interval_minutes,
                    target_type: "user",
                    target_id: "",
                });
                (0, utils_1.sendJson)(res, { success: true, config });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/notification/send" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const kind = payload.kind === "weekly" ? "weekly" : "daily";
            const config = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
            (0, cron_dev_reports_1.dispatchAutoDevReport)(kind, { date: payload.date || (0, cron_dev_reports_1.localDateKey)(new Date(), config.timezone) })
                .then(result => (0, utils_1.sendJson)(res, result, result.success ? 200 : 400))
                .catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 500));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    if (pathname === "/api/auto-dev/report/generate" && req.method === "POST") {
        readJsonBody(req, (payload) => {
            const config = (0, cron_dev_reports_1.normalizeAutoDevNotifyConfig)((0, db_1.loadAutoDevNotifyConfig)());
            (0, cron_dev_reports_1.generateAndUpsertAutoDevReport)("daily", payload.date || (0, cron_dev_reports_1.localDateKey)(new Date(), config.timezone), { force: payload.force === true, timezone: config.timezone })
                .then(report => (0, utils_1.sendJson)(res, { success: true, report, reports: (0, db_1.loadDevReports)().slice(0, 30) }))
                .catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message, report: e.report || null, retryable: true }, 503));
        }, (e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=cron.js.map