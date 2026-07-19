"use strict";
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const collaboration_1 = require("../collaboration/collaboration");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const cron_job_store_1 = require("./cron-job-store");
const storage_1 = require("../collaboration/storage");
const feishu_1 = require("../collaboration/feishu");
const test_agent_runner_1 = require("../collaboration/test-agent-runner");
const execution_kernel_1 = require("../../agents/execution-kernel");
const artifact_retention_1 = require("../../test-agent/artifact-retention");
const group_memory_index_1 = require("../collaboration/group-memory-index");
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
//# sourceMappingURL=cron-part-01.js.map