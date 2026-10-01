"use strict";
// Background memory maintenance scheduler. This module is independent from task automation.
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
exports.latestConflictResolutionMaintenanceTick = void 0;
exports.readConflictResolutionMaintenanceSchedulerState = readConflictResolutionMaintenanceSchedulerState;
exports.writeConflictResolutionMaintenanceSchedulerState = writeConflictResolutionMaintenanceSchedulerState;
exports.conflictResolutionMaintenanceSchedulerScopeIdentity = conflictResolutionMaintenanceSchedulerScopeIdentity;
exports.deleteConflictResolutionMemoryMaintenanceSchedulerSessionState = deleteConflictResolutionMemoryMaintenanceSchedulerSessionState;
exports.runConflictResolutionMemoryMaintenanceSchedulerTick = runConflictResolutionMemoryMaintenanceSchedulerTick;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const storage_1 = require("../collaboration/storage");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const group_memory_index_1 = require("../collaboration/group-memory-index");
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
//# sourceMappingURL=maintenance-scheduler.js.map