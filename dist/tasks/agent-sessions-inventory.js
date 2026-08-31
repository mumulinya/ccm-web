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
exports.listTaskAgentMemoryContextSnapshots = listTaskAgentMemoryContextSnapshots;
exports.buildTaskAgentMemoryContextSnapshotInventory = buildTaskAgentMemoryContextSnapshotInventory;
const path = __importStar(require("path"));
const agent_sessions_shared_1 = require("./agent-sessions-shared");
const agent_sessions_snapshot_rows_1 = require("./agent-sessions-snapshot-rows");
const agent_sessions_bind_1 = require("./agent-sessions-bind");
const task_agent_memory_transport_usage_cohorts_1 = require("./task-agent-memory-transport-usage-cohorts");
function listTaskAgentMemoryContextSnapshots(filter = {}) {
    const sessions = (0, agent_sessions_shared_1.loadStore)().sessions.filter((item) => (!filter.sessionId || item.id === filter.sessionId)
        && (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!(filter.groupSessionId || filter.group_session_id) || item.groupSessionId === String(filter.groupSessionId || filter.group_session_id))
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
    const snapshots = [];
    for (const session of sessions) {
        const refs = (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)([
            ...(session.memoryContextSnapshots || []),
            session.memoryContextSnapshotId || session.memoryContextSnapshotPath ? {
                snapshotId: session.memoryContextSnapshotId || "",
                snapshotPath: session.memoryContextSnapshotPath || "",
                checksum: session.memoryContextSnapshotChecksum || "",
                workerContextPacketId: session.memoryContextPacketId || "",
                generatedAt: session.memoryContextSnapshotAt || "",
            } : null,
        ].filter(Boolean));
        const seen = new Set();
        for (const ref of refs) {
            const key = ref.snapshotId || ref.snapshotPath;
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            const loaded = (0, agent_sessions_shared_1.safeReadJson)(ref.snapshotPath, null);
            const deliveryReceipt = ref.deliveryReceiptPath ? (0, agent_sessions_shared_1.safeReadJson)(ref.deliveryReceiptPath, null) : null;
            snapshots.push({
                ...(loaded || {}),
                schema: loaded?.schema || "ccm-task-agent-memory-context-snapshot-ref-v1",
                snapshot_id: loaded?.snapshot_id || ref.snapshotId,
                snapshot_file: loaded?.snapshot_file || ref.snapshotPath,
                checksum: loaded?.checksum || ref.checksum,
                generated_at: loaded?.generated_at || ref.generatedAt,
                session: loaded?.session || {
                    id: session.id,
                    scope_id: session.scopeId,
                    task_id: session.taskId,
                    group_id: session.groupId,
                    project: session.project,
                    agent_type: session.agentType,
                    native_session_id: session.nativeSessionId,
                    turn: session.turnCount,
                    resume_mode: session.resumeMode,
                },
                ref,
                delivery_receipt: deliveryReceipt,
                delivery_receipt_checksum_valid: deliveryReceipt ? (0, agent_sessions_shared_1.verifyMemoryContextDeliveryReceiptChecksum)(deliveryReceipt) : false,
            });
        }
    }
    return snapshots.sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
}
function buildTaskAgentMemoryContextSnapshotInventory(filter = {}) {
    const staleDays = Math.max(1, Number(filter.staleAfterDays ?? filter.stale_after_days ?? agent_sessions_shared_1.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS));
    const retentionDays = Math.max(1, Number(filter.retentionDays ?? filter.retention_days ?? agent_sessions_shared_1.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS));
    const keepLatestPerSession = Math.max(1, Number(filter.keepLatestPerSession ?? filter.keep_latest_per_session ?? agent_sessions_shared_1.DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION));
    const nowMs = Number(filter.nowMs || Date.now());
    const store = (0, agent_sessions_shared_1.loadStore)();
    const sessions = store.sessions.filter((item) => (!filter.sessionId || item.id === filter.sessionId)
        && (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!(filter.groupSessionId || filter.group_session_id) || item.groupSessionId === String(filter.groupSessionId || filter.group_session_id))
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
    const allSessionsById = new Map(store.sessions.map((session) => [session.id, session]));
    const policy = {
        staleDays,
        retentionDays,
        keepLatestPerSession,
        memoryEntryRenderLeaseTtlMs: agent_sessions_shared_1.MEMORY_ENTRY_RENDER_LEASE_TTL_MS,
        memoryEntryRenderConflictMaxRetries: agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_MAX_RETRIES,
        memoryEntryRenderConflictBaseDelayMs: agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_BASE_DELAY_MS,
        memoryEntryRenderConflictMaxDelayMs: agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_MAX_DELAY_MS,
        memoryEntryRenderConflictJitterMs: agent_sessions_shared_1.MEMORY_ENTRY_RENDER_CONFLICT_JITTER_MS,
    };
    const memoryEntryRenderLeases = sessions.map((session) => {
        const lastContention = session.memoryEntrySyncRenderLastContention || null;
        const lastContentionVerification = lastContention ? (0, agent_sessions_bind_1.verifyTaskAgentMemoryEntryRenderContentionReceipt)(lastContention, {
            groupId: session.groupId,
            groupSessionId: session.groupSessionId || "",
            taskId: session.taskId,
            taskAgentSessionId: session.id,
            targetProject: session.project,
        }) : { valid: true, issues: [] };
        return {
            sessionId: session.id,
            groupId: session.groupId,
            project: session.project,
            lease: session.memoryEntrySyncRenderLease || null,
            historyCount: Array.isArray(session.memoryEntrySyncRenderLeaseHistory) ? session.memoryEntrySyncRenderLeaseHistory.length : 0,
            takeoverCount: Number(session.memoryEntrySyncRenderLeaseTakeoverCount || 0),
            maxFencingToken: Number(session.memoryEntrySyncRenderFencingToken || 0),
            contentionCount: Number(session.memoryEntrySyncRenderContentionCount || 0),
            waitResolvedCount: Number(session.memoryEntrySyncRenderWaitResolvedCount || 0),
            waitTimeoutCount: Number(session.memoryEntrySyncRenderWaitTimeoutCount || 0),
            sameProcessConflictCount: Number(session.memoryEntrySyncRenderSameProcessConflictCount || 0),
            waitTotalMs: Number(session.memoryEntrySyncRenderWaitTotalMs || 0),
            lastContention,
            lastContentionValid: lastContentionVerification.valid,
            lastContentionIssues: lastContentionVerification.issues,
        };
    });
    const rows = [];
    const referencedFileKeys = new Set();
    const referencedSnapshotIds = new Set();
    for (const session of sessions) {
        const refs = (0, agent_sessions_shared_1.normalizeMemorySnapshotRefs)([
            ...(session.memoryContextSnapshots || []),
            session.memoryContextSnapshotId || session.memoryContextSnapshotPath ? {
                snapshotId: session.memoryContextSnapshotId || "",
                snapshotPath: session.memoryContextSnapshotPath || "",
                checksum: session.memoryContextSnapshotChecksum || "",
                workerContextPacketId: session.memoryContextPacketId || "",
                generatedAt: session.memoryContextSnapshotAt || "",
            } : null,
        ].filter(Boolean));
        const uniqueRefs = [];
        const seen = new Set();
        for (const ref of refs) {
            const key = ref.snapshotPath ? (0, agent_sessions_shared_1.normalizeSnapshotFileKey)(ref.snapshotPath) : ref.snapshotId;
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            uniqueRefs.push(ref);
            if (ref.snapshotPath)
                referencedFileKeys.add((0, agent_sessions_shared_1.normalizeSnapshotFileKey)(ref.snapshotPath));
            if (ref.snapshotId)
                referencedSnapshotIds.add(ref.snapshotId);
        }
        const sortedRefs = [...uniqueRefs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
        const latestRankByKey = new Map();
        sortedRefs.forEach((ref, index) => latestRankByKey.set(ref.snapshotPath ? (0, agent_sessions_shared_1.normalizeSnapshotFileKey)(ref.snapshotPath) : ref.snapshotId, index));
        for (const ref of uniqueRefs) {
            const key = ref.snapshotPath ? (0, agent_sessions_shared_1.normalizeSnapshotFileKey)(ref.snapshotPath) : ref.snapshotId;
            const loaded = (0, agent_sessions_shared_1.safeReadJson)(ref.snapshotPath, null);
            rows.push((0, agent_sessions_snapshot_rows_1.buildTaskAgentMemorySnapshotRow)({
                session,
                ref,
                loaded,
                actualFile: ref.snapshotPath,
                source: "session_ref",
                latestRank: latestRankByKey.get(key) ?? null,
                policy,
                nowMs,
            }));
        }
    }
    if (filter.includeOrphans !== false && filter.include_orphans !== false) {
        for (const disk of (0, agent_sessions_shared_1.listMemoryContextSnapshotFilesOnDisk)()) {
            const fileKey = (0, agent_sessions_shared_1.normalizeSnapshotFileKey)(disk.file);
            if (referencedFileKeys.has(fileKey))
                continue;
            const loaded = (0, agent_sessions_shared_1.safeReadJson)(disk.file, null);
            const snapshotId = String(loaded?.snapshot_id || path.basename(disk.file, ".json"));
            if (referencedSnapshotIds.has(snapshotId))
                continue;
            const loadedSession = loaded?.session || {};
            const session = allSessionsById.get(String(loadedSession.id || disk.sessionId || "")) || null;
            const rowSeed = {
                session: loadedSession,
                context: loaded?.context || {},
                status: session?.status || "",
            };
            if (!(0, agent_sessions_shared_1.taskAgentMemorySnapshotMatchesFilter)(rowSeed, filter))
                continue;
            rows.push((0, agent_sessions_snapshot_rows_1.buildTaskAgentMemorySnapshotRow)({
                session,
                loaded,
                actualFile: disk.file,
                source: "orphan_file",
                latestRank: null,
                policy,
                nowMs,
            }));
        }
    }
    rows.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
    const byGroup = new Map();
    for (const row of rows) {
        const groupId = row.groupId || "unknown";
        const current = byGroup.get(groupId) || { groupId, snapshotCount: 0, okCount: 0, warnCount: 0, failCount: 0, prunableCount: 0, staleCount: 0, deliveredCount: 0, deliveryMissingCount: 0, deliveryFailedCount: 0, compactHeadFenceRequiredCount: 0, compactHeadFenceValidCount: 0, compactHeadFenceStaleCount: 0, sessionLifecycleFenceRequiredCount: 0, sessionLifecycleFenceValidCount: 0, sessionLifecycleFenceStaleCount: 0, postTurnSummaryCapsuleCount: 0, postTurnSummaryCapsuleValidCount: 0, postTurnSummaryCapsuleMissingCount: 0, postTurnSummaryCapsuleInvalidCount: 0, postTurnSummaryCapsulePromptBoundCount: 0, postTurnSummaryCapsuleCompactEpochMismatchCount: 0, postTurnSummaryCapsuleLedgerHeadMismatchCount: 0, invocationEdgeCount: 0, invocationLineageBoundCount: 0, invocationLedgerMissingCount: 0, finalDispatchGateReadyCount: 0, finalDispatchGateBlockedCount: 0, finalDispatchGateMissingCount: 0, finalDispatchGateInvalidCount: 0, finalDispatchPromptBoundCount: 0, finalDispatchLineageProofCount: 0, finalDispatchReactiveCompactRecoveredCount: 0, finalDispatchReactiveCompactBlockedCount: 0, finalDispatchReactiveCompactInvalidCount: 0, finalDispatchReactiveCompactCircuitOpenCount: 0, finalDispatchReactiveCompactCircuitFailureCount: 0, finalDispatchReactiveCompactCircuitInvalidCount: 0, invocationBranchIds: new Set(), projects: new Set() };
        current.memorySnapshotSyncInitializeCount = Number(current.memorySnapshotSyncInitializeCount || 0);
        current.memorySnapshotSyncPromptUpdateCount = Number(current.memorySnapshotSyncPromptUpdateCount || 0);
        current.memorySnapshotSyncUnchangedCount = Number(current.memorySnapshotSyncUnchangedCount || 0);
        current.memorySnapshotSyncInvalidCount = Number(current.memorySnapshotSyncInvalidCount || 0);
        current.memorySnapshotSyncLegacyCount = Number(current.memorySnapshotSyncLegacyCount || 0);
        current.memorySnapshotSyncCommittedCount = Number(current.memorySnapshotSyncCommittedCount || 0);
        current.memorySnapshotSyncCommitPendingCount = Number(current.memorySnapshotSyncCommitPendingCount || 0);
        current.memorySnapshotSyncCommitRejectedCount = Number(current.memorySnapshotSyncCommitRejectedCount || 0);
        current.memorySnapshotSyncCommitInvalidCount = Number(current.memorySnapshotSyncCommitInvalidCount || 0);
        current.memorySnapshotSyncLateFailurePreservedCount = Number(current.memorySnapshotSyncLateFailurePreservedCount || 0);
        current.memoryEntrySyncFullCount = Number(current.memoryEntrySyncFullCount || 0);
        current.memoryEntrySyncDeltaCount = Number(current.memoryEntrySyncDeltaCount || 0);
        current.memoryEntrySyncContinuationCount = Number(current.memoryEntrySyncContinuationCount || 0);
        current.memoryEntrySyncInvalidCount = Number(current.memoryEntrySyncInvalidCount || 0);
        current.memoryEntryChangedCount = Number(current.memoryEntryChangedCount || 0);
        current.memoryEntryRemovedCount = Number(current.memoryEntryRemovedCount || 0);
        current.memoryPromptInjectionProofCount = Number(current.memoryPromptInjectionProofCount || 0);
        current.memoryPromptInjectionEnforcedCount = Number(current.memoryPromptInjectionEnforcedCount || 0);
        current.memoryPromptInjectionPromptBoundCount = Number(current.memoryPromptInjectionPromptBoundCount || 0);
        current.memoryPromptInjectionMissingCount = Number(current.memoryPromptInjectionMissingCount || 0);
        current.memoryPromptInjectionInvalidCount = Number(current.memoryPromptInjectionInvalidCount || 0);
        current.memoryTrustedEnvelopeRequiredCount = Number(current.memoryTrustedEnvelopeRequiredCount || 0);
        current.memoryTrustedEnvelopeValidCount = Number(current.memoryTrustedEnvelopeValidCount || 0);
        current.memoryTrustedEnvelopeUnverifiedCount = Number(current.memoryTrustedEnvelopeUnverifiedCount || 0);
        current.memoryContinuationBaselineRequiredCount = Number(current.memoryContinuationBaselineRequiredCount || 0);
        current.memoryContinuationBaselineValidCount = Number(current.memoryContinuationBaselineValidCount || 0);
        current.memoryContinuationBaselineUnverifiedCount = Number(current.memoryContinuationBaselineUnverifiedCount || 0);
        current.providerMemoryChannelRequiredCount = Number(current.providerMemoryChannelRequiredCount || 0);
        current.providerMemoryAcknowledgementRequiredCount = Number(current.providerMemoryAcknowledgementRequiredCount || 0);
        current.providerMemoryAcknowledgedCount = Number(current.providerMemoryAcknowledgedCount || 0);
        current.providerMemoryAcknowledgementUnverifiedCount = Number(current.providerMemoryAcknowledgementUnverifiedCount || 0);
        current.providerMemoryStructuredAcknowledgedCount = Number(current.providerMemoryStructuredAcknowledgedCount || 0);
        current.providerMemoryExitSuccessAcknowledgedCount = Number(current.providerMemoryExitSuccessAcknowledgedCount || 0);
        current.providerMemoryNativeSystemCount = Number(current.providerMemoryNativeSystemCount || 0);
        current.providerMemoryNativeDeveloperCount = Number(current.providerMemoryNativeDeveloperCount || 0);
        current.providerMemoryUserFallbackCount = Number(current.providerMemoryUserFallbackCount || 0);
        current.providerMemoryChannelUnverifiedCount = Number(current.providerMemoryChannelUnverifiedCount || 0);
        current.memoryContextConsumptionReceiptRequiredCount = Number(current.memoryContextConsumptionReceiptRequiredCount || 0);
        current.memoryContextConsumptionReceiptValidCount = Number(current.memoryContextConsumptionReceiptValidCount || 0);
        current.memoryContextConsumptionReceiptMissingCount = Number(current.memoryContextConsumptionReceiptMissingCount || 0);
        current.memoryContextConsumptionRecoveryCount = Number(current.memoryContextConsumptionRecoveryCount || 0);
        current.memoryContextConsumptionRecoveredCount = Number(current.memoryContextConsumptionRecoveredCount || 0);
        current.memoryContextConsumptionRecoveryBlockedCount = Number(current.memoryContextConsumptionRecoveryBlockedCount || 0);
        current.memoryContextConsumptionRecoveryInvalidCount = Number(current.memoryContextConsumptionRecoveryInvalidCount || 0);
        current.snapshotCount += 1;
        if (row.status === "ok")
            current.okCount += 1;
        if (row.status === "warn")
            current.warnCount += 1;
        if (row.status === "fail")
            current.failCount += 1;
        if (row.memorySnapshotSyncAction === "initialize" && row.memorySnapshotSyncValid)
            current.memorySnapshotSyncInitializeCount += 1;
        if (row.memorySnapshotSyncAction === "prompt_update" && row.memorySnapshotSyncValid)
            current.memorySnapshotSyncPromptUpdateCount += 1;
        if (row.memorySnapshotSyncAction === "none" && row.memorySnapshotSyncValid)
            current.memorySnapshotSyncUnchangedCount += 1;
        if (row.memorySnapshotSyncPresent && !row.memorySnapshotSyncValid)
            current.memorySnapshotSyncInvalidCount += 1;
        if (!row.memorySnapshotSyncPresent)
            current.memorySnapshotSyncLegacyCount += 1;
        if (row.memorySnapshotSyncCommitted)
            current.memorySnapshotSyncCommittedCount += 1;
        if (row.memorySnapshotSyncPresent && !row.memorySnapshotSyncCommitPresent)
            current.memorySnapshotSyncCommitPendingCount += 1;
        if (row.memorySnapshotSyncCommitValid && row.memorySnapshotSyncCommitStatus === "rejected")
            current.memorySnapshotSyncCommitRejectedCount += 1;
        if (row.memorySnapshotSyncCommitPresent && !row.memorySnapshotSyncCommitValid)
            current.memorySnapshotSyncCommitInvalidCount += 1;
        if (row.memorySnapshotSyncLateFailurePreserved)
            current.memorySnapshotSyncLateFailurePreservedCount += 1;
        if (row.memoryEntrySyncValid && row.memoryEntrySyncMode === "full")
            current.memoryEntrySyncFullCount += 1;
        if (row.memoryEntrySyncValid && row.memoryEntrySyncMode === "delta")
            current.memoryEntrySyncDeltaCount += 1;
        if (row.memoryEntrySyncValid && row.memoryEntrySyncMode === "continuation")
            current.memoryEntrySyncContinuationCount += 1;
        if (row.memoryEntrySyncPresent && !row.memoryEntrySyncValid)
            current.memoryEntrySyncInvalidCount += 1;
        current.memoryEntryChangedCount += Number(row.memoryEntryChangedCount || 0);
        current.memoryEntryRemovedCount += Number(row.memoryEntryRemovedCount || 0);
        if (row.memoryPromptInjectionProofPresent)
            current.memoryPromptInjectionProofCount += 1;
        if (row.memoryPromptInjectionEnforced)
            current.memoryPromptInjectionEnforcedCount += 1;
        if (row.memoryPromptInjectionPromptBound)
            current.memoryPromptInjectionPromptBoundCount += 1;
        if (!row.memoryPromptInjectionProofPresent)
            current.memoryPromptInjectionMissingCount += 1;
        if (row.memoryPromptInjectionProofPresent && !row.memoryPromptInjectionProofValid)
            current.memoryPromptInjectionInvalidCount += 1;
        if (row.memoryTrustedEnvelopeRequired)
            current.memoryTrustedEnvelopeRequiredCount += 1;
        if (row.memoryTrustedEnvelopeRequired && row.memoryTrustedEnvelopeValid && row.memoryTrustedEnvelopeBound)
            current.memoryTrustedEnvelopeValidCount += 1;
        if (row.memoryTrustedEnvelopeRequired && row.memoryPromptInjectionRequired && (!row.memoryTrustedEnvelopeValid || !row.memoryTrustedEnvelopeBound))
            current.memoryTrustedEnvelopeUnverifiedCount += 1;
        if (row.memoryContinuationBaselineRequired)
            current.memoryContinuationBaselineRequiredCount += 1;
        if (row.memoryContinuationBaselineRequired && row.memoryContinuationBaselineValid)
            current.memoryContinuationBaselineValidCount += 1;
        if (row.memoryContinuationBaselineRequired && !row.memoryContinuationBaselineValid)
            current.memoryContinuationBaselineUnverifiedCount += 1;
        if (row.providerMemoryChannelRequired)
            current.providerMemoryChannelRequiredCount += 1;
        if (row.providerMemoryChannelAcknowledgementRequired)
            current.providerMemoryAcknowledgementRequiredCount += 1;
        if (row.providerMemoryChannelAcknowledgementRequired && row.providerMemoryChannelAcknowledged)
            current.providerMemoryAcknowledgedCount += 1;
        if (row.providerMemoryChannelAcknowledgementRequired && !row.providerMemoryChannelAcknowledged)
            current.providerMemoryAcknowledgementUnverifiedCount += 1;
        if (row.providerMemoryChannelAcknowledged && ["structured_thread_started", "structured_session_event"].includes(row.providerMemoryChannelAcknowledgementPolicy))
            current.providerMemoryStructuredAcknowledgedCount += 1;
        if (row.providerMemoryChannelAcknowledged && row.providerMemoryChannelAcknowledgementPolicy === "process_exit_success")
            current.providerMemoryExitSuccessAcknowledgedCount += 1;
        if (row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeSystemPrompt)
            current.providerMemoryNativeSystemCount += 1;
        if (row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeDeveloperInstructions)
            current.providerMemoryNativeDeveloperCount += 1;
        if (row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryUserPromptFallback)
            current.providerMemoryUserFallbackCount += 1;
        if (row.providerMemoryChannelRequired && !row.providerMemoryChannelValid)
            current.providerMemoryChannelUnverifiedCount += 1;
        if (row.memoryContextConsumptionReceiptRequired)
            current.memoryContextConsumptionReceiptRequiredCount += 1;
        if (row.memoryContextConsumptionReceiptRequired && row.memoryContextConsumptionReceiptValid)
            current.memoryContextConsumptionReceiptValidCount += 1;
        if (row.memoryContextConsumptionReceiptRequired && !row.memoryContextConsumptionReceiptValid)
            current.memoryContextConsumptionReceiptMissingCount += 1;
        if (row.memoryContextConsumptionRecoveryPresent)
            current.memoryContextConsumptionRecoveryCount += 1;
        if (row.memoryContextConsumptionRecoveryPresent && row.memoryContextConsumptionRecoveryValid && row.memoryContextConsumptionRecoveryStatus === "recovered")
            current.memoryContextConsumptionRecoveredCount += 1;
        if (row.memoryContextConsumptionRecoveryStatus === "blocked")
            current.memoryContextConsumptionRecoveryBlockedCount += 1;
        if (row.memoryContextConsumptionRecoveryPresent && !row.memoryContextConsumptionRecoveryValid)
            current.memoryContextConsumptionRecoveryInvalidCount += 1;
        if (row.providerMemoryTransportUsagePresent)
            current.providerMemoryTransportUsageReceiptCount = Number(current.providerMemoryTransportUsageReceiptCount || 0) + 1;
        if (row.providerMemoryTransportUsageValid)
            current.providerMemoryTransportUsageValidCount = Number(current.providerMemoryTransportUsageValidCount || 0) + 1;
        if (row.providerMemoryTransportUsagePresent && !row.providerMemoryTransportUsageValid)
            current.providerMemoryTransportUsageInvalidCount = Number(current.providerMemoryTransportUsageInvalidCount || 0) + 1;
        if (row.providerMemoryTransportUsageValid && row.providerMemoryTransportUsageStatus === "reported")
            current.providerMemoryTransportUsageReportedCount = Number(current.providerMemoryTransportUsageReportedCount || 0) + 1;
        if (row.providerMemoryTransportUsageValid && row.providerMemoryTransportUsageStatus === "unreported")
            current.providerMemoryTransportUsageUnreportedCount = Number(current.providerMemoryTransportUsageUnreportedCount || 0) + 1;
        if (row.providerMemoryTransportUsageValid && row.providerMemoryTransportUsageStatus === "failed")
            current.providerMemoryTransportUsageFailedCount = Number(current.providerMemoryTransportUsageFailedCount || 0) + 1;
        if (row.providerMemoryTransportUsageValid) {
            current.providerMemoryTransportInputTokens = Number(current.providerMemoryTransportInputTokens || 0) + Number(row.providerMemoryTransportInputTokens || 0);
            current.providerMemoryTransportOutputTokens = Number(current.providerMemoryTransportOutputTokens || 0) + Number(row.providerMemoryTransportOutputTokens || 0);
            current.providerMemoryTransportCacheReadTokens = Number(current.providerMemoryTransportCacheReadTokens || 0) + Number(row.providerMemoryTransportCacheReadTokens || 0);
            current.providerMemoryTransportCacheCreationTokens = Number(current.providerMemoryTransportCacheCreationTokens || 0) + Number(row.providerMemoryTransportCacheCreationTokens || 0);
            current.providerMemoryTransportAccountedTotalTokens = Number(current.providerMemoryTransportAccountedTotalTokens || 0) + Number(row.providerMemoryTransportAccountedTotalTokens || 0);
            current.providerMemoryTransportEstimatedTokens = Number(current.providerMemoryTransportEstimatedTokens || 0) + Number(row.providerMemoryTransportEstimatedTokens || 0);
            const mode = String(row.providerMemoryTransportMode || "legacy");
            if (mode === "full") {
                current.providerMemoryTransportFullCount = Number(current.providerMemoryTransportFullCount || 0) + 1;
                current.providerMemoryTransportFullInputTokens = Number(current.providerMemoryTransportFullInputTokens || 0) + Number(row.providerMemoryTransportInputTokens || 0);
                current.providerMemoryTransportFullCacheReadTokens = Number(current.providerMemoryTransportFullCacheReadTokens || 0) + Number(row.providerMemoryTransportCacheReadTokens || 0);
                current.providerMemoryTransportFullEstimatedTokens = Number(current.providerMemoryTransportFullEstimatedTokens || 0) + Number(row.providerMemoryTransportEstimatedTokens || 0);
            }
            if (mode === "delta") {
                current.providerMemoryTransportDeltaCount = Number(current.providerMemoryTransportDeltaCount || 0) + 1;
                current.providerMemoryTransportDeltaInputTokens = Number(current.providerMemoryTransportDeltaInputTokens || 0) + Number(row.providerMemoryTransportInputTokens || 0);
                current.providerMemoryTransportDeltaCacheReadTokens = Number(current.providerMemoryTransportDeltaCacheReadTokens || 0) + Number(row.providerMemoryTransportCacheReadTokens || 0);
                current.providerMemoryTransportDeltaEstimatedTokens = Number(current.providerMemoryTransportDeltaEstimatedTokens || 0) + Number(row.providerMemoryTransportEstimatedTokens || 0);
            }
            if (mode === "continuation") {
                current.providerMemoryTransportContinuationCount = Number(current.providerMemoryTransportContinuationCount || 0) + 1;
                current.providerMemoryTransportContinuationInputTokens = Number(current.providerMemoryTransportContinuationInputTokens || 0) + Number(row.providerMemoryTransportInputTokens || 0);
                current.providerMemoryTransportContinuationCacheReadTokens = Number(current.providerMemoryTransportContinuationCacheReadTokens || 0) + Number(row.providerMemoryTransportCacheReadTokens || 0);
                current.providerMemoryTransportContinuationEstimatedTokens = Number(current.providerMemoryTransportContinuationEstimatedTokens || 0) + Number(row.providerMemoryTransportEstimatedTokens || 0);
            }
            current.providerMemoryTransportProviders ||= new Set();
            current.providerMemoryTransportModels ||= new Set();
            if (row.providerMemoryTransportProvider)
                current.providerMemoryTransportProviders.add(row.providerMemoryTransportProvider);
            if (row.providerMemoryTransportModel)
                current.providerMemoryTransportModels.add(row.providerMemoryTransportModel);
        }
        if (row.prunable)
            current.prunableCount += 1;
        if (row.stale)
            current.staleCount += 1;
        if (row.memoryContextDelivered)
            current.deliveredCount += 1;
        if (!row.deliveryReceiptId)
            current.deliveryMissingCount += 1;
        if (row.deliveryReceiptId && !row.memoryContextDelivered)
            current.deliveryFailedCount += 1;
        if (row.compactHeadFenceRequired)
            current.compactHeadFenceRequiredCount += 1;
        if (row.compactHeadFenceRequired && row.compactHeadFenceValid)
            current.compactHeadFenceValidCount += 1;
        if (row.compactHeadFenceRequired && !row.compactHeadFenceValid)
            current.compactHeadFenceStaleCount += 1;
        if (row.sessionLifecycleFenceRequired)
            current.sessionLifecycleFenceRequiredCount += 1;
        if (row.sessionLifecycleFenceRequired && row.sessionLifecycleFenceValid)
            current.sessionLifecycleFenceValidCount += 1;
        if (row.sessionLifecycleFenceRequired && !row.sessionLifecycleFenceValid)
            current.sessionLifecycleFenceStaleCount += 1;
        if (row.postTurnSummaryCapsulePresent)
            current.postTurnSummaryCapsuleCount += 1;
        if (row.postTurnSummaryCapsuleValid)
            current.postTurnSummaryCapsuleValidCount += 1;
        if (row.postTurnSummaryExpected && !row.postTurnSummaryCapsulePresent)
            current.postTurnSummaryCapsuleMissingCount += 1;
        if (row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleValid)
            current.postTurnSummaryCapsuleInvalidCount += 1;
        if (row.postTurnSummaryCapsulePromptBound)
            current.postTurnSummaryCapsulePromptBoundCount += 1;
        if (row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleCompactEpochBound)
            current.postTurnSummaryCapsuleCompactEpochMismatchCount += 1;
        if (row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleLedgerHeadBound)
            current.postTurnSummaryCapsuleLedgerHeadMismatchCount += 1;
        if (row.invocationEdgeId)
            current.invocationEdgeCount += 1;
        if (row.invocationLineageExpected && row.invocationLineageBound && row.invocationLedgerBound)
            current.invocationLineageBoundCount += 1;
        if (row.invocationLineageExpected && !row.invocationLedgerBound)
            current.invocationLedgerMissingCount += 1;
        if (row.finalDispatchStatus === "ready")
            current.finalDispatchGateReadyCount += 1;
        if (row.finalDispatchStatus === "recompact_required")
            current.finalDispatchGateBlockedCount += 1;
        if (!row.finalDispatchPayloadGatePresent)
            current.finalDispatchGateMissingCount += 1;
        if (row.finalDispatchPayloadGatePresent && !row.finalDispatchPayloadGateValid)
            current.finalDispatchGateInvalidCount += 1;
        if (row.finalDispatchPromptBound)
            current.finalDispatchPromptBoundCount += 1;
        if (row.finalDispatchLineageProofRequired && row.finalDispatchLineageProofValid)
            current.finalDispatchLineageProofCount += 1;
        if (row.finalDispatchReactiveCompactStatus === "recovered")
            current.finalDispatchReactiveCompactRecoveredCount += 1;
        if (row.finalDispatchReactiveCompactStatus === "blocked")
            current.finalDispatchReactiveCompactBlockedCount += 1;
        if (row.finalDispatchReactiveCompactPresent && !row.finalDispatchReactiveCompactValid)
            current.finalDispatchReactiveCompactInvalidCount += 1;
        if (row.finalDispatchReactiveCompactCircuitBlocked)
            current.finalDispatchReactiveCompactCircuitOpenCount += 1;
        current.finalDispatchReactiveCompactCircuitFailureCount += Number(row.finalDispatchReactiveCompactCircuitFailures || 0);
        if (row.finalDispatchReactiveCompactCircuitBreakerPresent && !row.finalDispatchReactiveCompactCircuitBreakerValid)
            current.finalDispatchReactiveCompactCircuitInvalidCount += 1;
        if (row.invocationBranchId)
            current.invocationBranchIds.add(row.invocationBranchId);
        if (row.project)
            current.projects.add(row.project);
        byGroup.set(groupId, current);
    }
    for (const row of memoryEntryRenderLeases) {
        const groupId = row.groupId || "unknown";
        const current = byGroup.get(groupId) || {
            groupId,
            snapshotCount: 0,
            okCount: 0,
            warnCount: 0,
            failCount: 0,
            prunableCount: 0,
            staleCount: 0,
            invocationBranchIds: new Set(),
            projects: new Set(),
        };
        const leaseActive = row.lease?.status === "prepared"
            && Date.parse(String(row.lease?.expires_at || "")) > nowMs
            && (0, agent_sessions_shared_1.processIsAlive)(Number(row.lease?.owner_pid || 0));
        current.memoryEntryRenderLeasePreparedCount = Number(current.memoryEntryRenderLeasePreparedCount || 0) + (row.lease?.status === "prepared" ? 1 : 0);
        current.memoryEntryRenderLeaseActiveCount = Number(current.memoryEntryRenderLeaseActiveCount || 0) + (leaseActive ? 1 : 0);
        current.memoryEntryRenderLeaseBoundCount = Number(current.memoryEntryRenderLeaseBoundCount || 0) + (row.lease?.status === "bound" ? 1 : 0);
        current.memoryEntryRenderLeaseRejectedCount = Number(current.memoryEntryRenderLeaseRejectedCount || 0) + (row.lease?.status === "rejected" ? 1 : 0);
        current.memoryEntryRenderLeaseStaleCount = Number(current.memoryEntryRenderLeaseStaleCount || 0) + (row.lease?.status === "prepared" && !leaseActive ? 1 : 0);
        current.memoryEntryRenderLeaseTakeoverCount = Number(current.memoryEntryRenderLeaseTakeoverCount || 0) + row.takeoverCount;
        current.memoryEntryRenderLeaseHistoryCount = Number(current.memoryEntryRenderLeaseHistoryCount || 0) + row.historyCount;
        current.memoryEntryRenderLeaseMaxFencingToken = Math.max(Number(current.memoryEntryRenderLeaseMaxFencingToken || 0), row.maxFencingToken);
        current.memoryEntryRenderContentionCount = Number(current.memoryEntryRenderContentionCount || 0) + row.contentionCount;
        current.memoryEntryRenderWaitResolvedCount = Number(current.memoryEntryRenderWaitResolvedCount || 0) + row.waitResolvedCount;
        current.memoryEntryRenderWaitTimeoutCount = Number(current.memoryEntryRenderWaitTimeoutCount || 0) + row.waitTimeoutCount;
        current.memoryEntryRenderSameProcessConflictCount = Number(current.memoryEntryRenderSameProcessConflictCount || 0) + row.sameProcessConflictCount;
        current.memoryEntryRenderWaitTotalMs = Number(current.memoryEntryRenderWaitTotalMs || 0) + row.waitTotalMs;
        current.memoryEntryRenderContentionReceiptValidCount = Number(current.memoryEntryRenderContentionReceiptValidCount || 0) + (row.lastContention && row.lastContentionValid ? 1 : 0);
        current.memoryEntryRenderContentionReceiptInvalidCount = Number(current.memoryEntryRenderContentionReceiptInvalidCount || 0) + (row.lastContention && !row.lastContentionValid ? 1 : 0);
        if (row.project)
            current.projects.add(row.project);
        byGroup.set(groupId, current);
    }
    const groups = Array.from(byGroup.values()).map(group => ({
        ...group,
        invocationBranchCount: group.invocationBranchIds.size,
        invocationBranchIds: Array.from(group.invocationBranchIds).slice(0, 20),
        projects: Array.from(group.projects).slice(0, 12),
        providerMemoryTransportProviderCount: group.providerMemoryTransportProviders?.size || 0,
        providerMemoryTransportProviders: Array.from(group.providerMemoryTransportProviders || []).slice(0, 12),
        providerMemoryTransportModelCount: group.providerMemoryTransportModels?.size || 0,
        providerMemoryTransportModels: Array.from(group.providerMemoryTransportModels || []).slice(0, 20),
        providerMemoryTransportUsageCohorts: (0, task_agent_memory_transport_usage_cohorts_1.buildTaskAgentMemoryTransportUsageCohortReport)(rows.filter(row => row.groupId === group.groupId), { groupId: group.groupId, groupSessionId: filter.groupSessionId || filter.group_session_id || "", generatedAt: new Date(nowMs).toISOString() }),
    })).sort((a, b) => Number(b.failCount + b.warnCount) - Number(a.failCount + a.warnCount));
    const providerMemoryTransportUsageCohorts = (0, task_agent_memory_transport_usage_cohorts_1.buildTaskAgentMemoryTransportUsageCohortReport)(rows, {
        groupId: filter.groupId || "",
        groupSessionId: filter.groupSessionId || filter.group_session_id || "",
        generatedAt: new Date(nowMs).toISOString(),
    });
    return {
        schema: "ccm-task-agent-memory-context-snapshot-inventory-v1",
        generatedAt: new Date(nowMs).toISOString(),
        directory: agent_sessions_shared_1.MEMORY_CONTEXT_SNAPSHOT_DIR,
        filters: {
            scopeId: filter.scopeId || "",
            taskId: filter.taskId || "",
            groupId: filter.groupId || "",
            groupSessionId: filter.groupSessionId || filter.group_session_id || "",
            project: filter.project || "",
            status: filter.status || "",
            sessionId: filter.sessionId || "",
        },
        policy,
        summary: {
            sessionCount: sessions.length,
            snapshotCount: rows.length,
            okCount: rows.filter(row => row.status === "ok").length,
            warnCount: rows.filter(row => row.status === "warn").length,
            failCount: rows.filter(row => row.status === "fail").length,
            referencedCount: rows.filter(row => row.source === "session_ref").length,
            orphanFileCount: rows.filter(row => row.source === "orphan_file").length,
            missingFileCount: rows.filter(row => !row.fileExists).length,
            unreadableCount: rows.filter(row => row.fileExists && !row.readable).length,
            checksumMismatchCount: rows.filter(row => row.readable && !row.checksumMatches).length,
            missingPacketCount: rows.filter(row => row.readable && !row.workerContextPacketId).length,
            missingGateCount: rows.filter(row => row.readable && !row.gateCount).length,
            groupSessionBoundCount: rows.filter(row => !!row.groupSessionScopeId).length,
            memorySnapshotSyncInitializeCount: rows.filter(row => row.memorySnapshotSyncAction === "initialize" && row.memorySnapshotSyncValid).length,
            memorySnapshotSyncPromptUpdateCount: rows.filter(row => row.memorySnapshotSyncAction === "prompt_update" && row.memorySnapshotSyncValid).length,
            memorySnapshotSyncUnchangedCount: rows.filter(row => row.memorySnapshotSyncAction === "none" && row.memorySnapshotSyncValid).length,
            memorySnapshotSyncInvalidCount: rows.filter(row => row.memorySnapshotSyncPresent && !row.memorySnapshotSyncValid).length,
            memorySnapshotSyncLegacyCount: rows.filter(row => !row.memorySnapshotSyncPresent).length,
            memorySnapshotSyncCommittedCount: rows.filter(row => row.memorySnapshotSyncCommitted).length,
            memorySnapshotSyncCommitPendingCount: rows.filter(row => row.memorySnapshotSyncPresent && !row.memorySnapshotSyncCommitPresent).length,
            memorySnapshotSyncCommitRejectedCount: rows.filter(row => row.memorySnapshotSyncCommitValid && row.memorySnapshotSyncCommitStatus === "rejected").length,
            memorySnapshotSyncCommitInvalidCount: rows.filter(row => row.memorySnapshotSyncCommitPresent && !row.memorySnapshotSyncCommitValid).length,
            memorySnapshotSyncLateFailurePreservedCount: rows.filter(row => row.memorySnapshotSyncLateFailurePreserved).length,
            memoryEntrySyncFullCount: rows.filter(row => row.memoryEntrySyncValid && row.memoryEntrySyncMode === "full").length,
            memoryEntrySyncDeltaCount: rows.filter(row => row.memoryEntrySyncValid && row.memoryEntrySyncMode === "delta").length,
            memoryEntrySyncContinuationCount: rows.filter(row => row.memoryEntrySyncValid && row.memoryEntrySyncMode === "continuation").length,
            memoryEntrySyncInvalidCount: rows.filter(row => row.memoryEntrySyncPresent && !row.memoryEntrySyncValid).length,
            memoryEntrySyncLegacyCount: rows.filter(row => !row.memoryEntrySyncPresent).length,
            memoryEntryChangedCount: rows.reduce((sum, row) => sum + Number(row.memoryEntryChangedCount || 0), 0),
            memoryEntryRemovedCount: rows.reduce((sum, row) => sum + Number(row.memoryEntryRemovedCount || 0), 0),
            memoryEntryRenderLeasePreparedCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "prepared").length,
            memoryEntryRenderLeaseActiveCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "prepared" && Date.parse(String(row.lease?.expires_at || "")) > nowMs && (0, agent_sessions_shared_1.processIsAlive)(Number(row.lease?.owner_pid || 0))).length,
            memoryEntryRenderLeaseBoundCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "bound").length,
            memoryEntryRenderLeaseRejectedCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "rejected").length,
            memoryEntryRenderLeaseStaleCount: memoryEntryRenderLeases.filter(row => row.lease?.status === "prepared" && !(Date.parse(String(row.lease?.expires_at || "")) > nowMs && (0, agent_sessions_shared_1.processIsAlive)(Number(row.lease?.owner_pid || 0)))).length,
            memoryEntryRenderLeaseTakeoverCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.takeoverCount, 0),
            memoryEntryRenderLeaseHistoryCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.historyCount, 0),
            memoryEntryRenderLeaseMaxFencingToken: Math.max(0, ...memoryEntryRenderLeases.map(row => row.maxFencingToken)),
            memoryEntryRenderContentionCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.contentionCount, 0),
            memoryEntryRenderWaitResolvedCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.waitResolvedCount, 0),
            memoryEntryRenderWaitTimeoutCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.waitTimeoutCount, 0),
            memoryEntryRenderSameProcessConflictCount: memoryEntryRenderLeases.reduce((sum, row) => sum + row.sameProcessConflictCount, 0),
            memoryEntryRenderWaitTotalMs: memoryEntryRenderLeases.reduce((sum, row) => sum + row.waitTotalMs, 0),
            memoryEntryRenderContentionReceiptValidCount: memoryEntryRenderLeases.filter(row => row.lastContention && row.lastContentionValid).length,
            memoryEntryRenderContentionReceiptInvalidCount: memoryEntryRenderLeases.filter(row => row.lastContention && !row.lastContentionValid).length,
            memoryPromptInjectionProofCount: rows.filter(row => row.memoryPromptInjectionProofPresent).length,
            memoryPromptInjectionEnforcedCount: rows.filter(row => row.memoryPromptInjectionEnforced).length,
            memoryPromptInjectionPromptBoundCount: rows.filter(row => row.memoryPromptInjectionPromptBound).length,
            memoryPromptInjectionMissingCount: rows.filter(row => !row.memoryPromptInjectionProofPresent).length,
            memoryPromptInjectionInvalidCount: rows.filter(row => row.memoryPromptInjectionProofPresent && !row.memoryPromptInjectionProofValid).length,
            memoryTrustedEnvelopeRequiredCount: rows.filter(row => row.memoryTrustedEnvelopeRequired).length,
            memoryTrustedEnvelopeValidCount: rows.filter(row => row.memoryTrustedEnvelopeRequired && row.memoryTrustedEnvelopeValid && row.memoryTrustedEnvelopeBound).length,
            memoryTrustedEnvelopeUnverifiedCount: rows.filter(row => row.memoryTrustedEnvelopeRequired && row.memoryPromptInjectionRequired && (!row.memoryTrustedEnvelopeValid || !row.memoryTrustedEnvelopeBound)).length,
            memoryContinuationBaselineRequiredCount: rows.filter(row => row.memoryContinuationBaselineRequired).length,
            memoryContinuationBaselineValidCount: rows.filter(row => row.memoryContinuationBaselineRequired && row.memoryContinuationBaselineValid).length,
            memoryContinuationBaselineUnverifiedCount: rows.filter(row => row.memoryContinuationBaselineRequired && !row.memoryContinuationBaselineValid).length,
            providerMemoryChannelRequiredCount: rows.filter(row => row.providerMemoryChannelRequired).length,
            providerMemoryAcknowledgementRequiredCount: rows.filter(row => row.providerMemoryChannelAcknowledgementRequired).length,
            providerMemoryAcknowledgedCount: rows.filter(row => row.providerMemoryChannelAcknowledgementRequired && row.providerMemoryChannelAcknowledged).length,
            providerMemoryAcknowledgementUnverifiedCount: rows.filter(row => row.providerMemoryChannelAcknowledgementRequired && !row.providerMemoryChannelAcknowledged).length,
            providerMemoryStructuredAcknowledgedCount: rows.filter(row => row.providerMemoryChannelAcknowledged && ["structured_thread_started", "structured_session_event"].includes(row.providerMemoryChannelAcknowledgementPolicy)).length,
            providerMemoryExitSuccessAcknowledgedCount: rows.filter(row => row.providerMemoryChannelAcknowledged && row.providerMemoryChannelAcknowledgementPolicy === "process_exit_success").length,
            providerMemoryNativeSystemCount: rows.filter(row => row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeSystemPrompt).length,
            providerMemoryNativeDeveloperCount: rows.filter(row => row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryNativeDeveloperInstructions).length,
            providerMemoryUserFallbackCount: rows.filter(row => row.providerMemoryChannelRequired && row.providerMemoryChannelValid && row.providerMemoryUserPromptFallback).length,
            providerMemoryChannelUnverifiedCount: rows.filter(row => row.providerMemoryChannelRequired && !row.providerMemoryChannelValid).length,
            memoryContextConsumptionReceiptRequiredCount: rows.filter(row => row.memoryContextConsumptionReceiptRequired).length,
            memoryContextConsumptionReceiptValidCount: rows.filter(row => row.memoryContextConsumptionReceiptRequired && row.memoryContextConsumptionReceiptValid).length,
            memoryContextConsumptionReceiptMissingCount: rows.filter(row => row.memoryContextConsumptionReceiptRequired && !row.memoryContextConsumptionReceiptValid).length,
            memoryContextConsumptionRecoveryCount: rows.filter(row => row.memoryContextConsumptionRecoveryPresent).length,
            memoryContextConsumptionRecoveredCount: rows.filter(row => row.memoryContextConsumptionRecoveryPresent && row.memoryContextConsumptionRecoveryValid && row.memoryContextConsumptionRecoveryStatus === "recovered").length,
            memoryContextConsumptionRecoveryBlockedCount: rows.filter(row => row.memoryContextConsumptionRecoveryStatus === "blocked").length,
            memoryContextConsumptionRecoveryInvalidCount: rows.filter(row => row.memoryContextConsumptionRecoveryPresent && !row.memoryContextConsumptionRecoveryValid).length,
            providerMemoryTransportUsageReceiptCount: rows.filter(row => row.providerMemoryTransportUsagePresent).length,
            providerMemoryTransportUsageValidCount: rows.filter(row => row.providerMemoryTransportUsageValid).length,
            providerMemoryTransportUsageInvalidCount: rows.filter(row => row.providerMemoryTransportUsagePresent && !row.providerMemoryTransportUsageValid).length,
            providerMemoryTransportUsageReportedCount: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportUsageStatus === "reported").length,
            providerMemoryTransportUsageUnreportedCount: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportUsageStatus === "unreported").length,
            providerMemoryTransportUsageFailedCount: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportUsageStatus === "failed").length,
            providerMemoryTransportInputTokens: rows.filter(row => row.providerMemoryTransportUsageValid).reduce((sum, row) => sum + Number(row.providerMemoryTransportInputTokens || 0), 0),
            providerMemoryTransportOutputTokens: rows.filter(row => row.providerMemoryTransportUsageValid).reduce((sum, row) => sum + Number(row.providerMemoryTransportOutputTokens || 0), 0),
            providerMemoryTransportCacheReadTokens: rows.filter(row => row.providerMemoryTransportUsageValid).reduce((sum, row) => sum + Number(row.providerMemoryTransportCacheReadTokens || 0), 0),
            providerMemoryTransportCacheCreationTokens: rows.filter(row => row.providerMemoryTransportUsageValid).reduce((sum, row) => sum + Number(row.providerMemoryTransportCacheCreationTokens || 0), 0),
            providerMemoryTransportAccountedTotalTokens: rows.filter(row => row.providerMemoryTransportUsageValid).reduce((sum, row) => sum + Number(row.providerMemoryTransportAccountedTotalTokens || 0), 0),
            providerMemoryTransportEstimatedTokens: rows.filter(row => row.providerMemoryTransportUsageValid).reduce((sum, row) => sum + Number(row.providerMemoryTransportEstimatedTokens || 0), 0),
            providerMemoryTransportFullCount: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "full").length,
            providerMemoryTransportFullInputTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "full").reduce((sum, row) => sum + Number(row.providerMemoryTransportInputTokens || 0), 0),
            providerMemoryTransportFullCacheReadTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "full").reduce((sum, row) => sum + Number(row.providerMemoryTransportCacheReadTokens || 0), 0),
            providerMemoryTransportFullEstimatedTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "full").reduce((sum, row) => sum + Number(row.providerMemoryTransportEstimatedTokens || 0), 0),
            providerMemoryTransportDeltaCount: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "delta").length,
            providerMemoryTransportDeltaInputTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "delta").reduce((sum, row) => sum + Number(row.providerMemoryTransportInputTokens || 0), 0),
            providerMemoryTransportDeltaCacheReadTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "delta").reduce((sum, row) => sum + Number(row.providerMemoryTransportCacheReadTokens || 0), 0),
            providerMemoryTransportDeltaEstimatedTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "delta").reduce((sum, row) => sum + Number(row.providerMemoryTransportEstimatedTokens || 0), 0),
            providerMemoryTransportContinuationCount: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "continuation").length,
            providerMemoryTransportContinuationInputTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "continuation").reduce((sum, row) => sum + Number(row.providerMemoryTransportInputTokens || 0), 0),
            providerMemoryTransportContinuationCacheReadTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "continuation").reduce((sum, row) => sum + Number(row.providerMemoryTransportCacheReadTokens || 0), 0),
            providerMemoryTransportContinuationEstimatedTokens: rows.filter(row => row.providerMemoryTransportUsageValid && row.providerMemoryTransportMode === "continuation").reduce((sum, row) => sum + Number(row.providerMemoryTransportEstimatedTokens || 0), 0),
            providerMemoryTransportProviderCount: new Set(rows.filter(row => row.providerMemoryTransportUsageValid).map(row => row.providerMemoryTransportProvider).filter(Boolean)).size,
            providerMemoryTransportModelCount: new Set(rows.filter(row => row.providerMemoryTransportUsageValid).map(row => row.providerMemoryTransportModel).filter(Boolean)).size,
            providerMemoryTransportCohortCount: Number(providerMemoryTransportUsageCohorts.summary.cohort_count || 0),
            providerMemoryTransportComparableCohortCount: Number(providerMemoryTransportUsageCohorts.summary.comparable_cohort_count || 0),
            providerMemoryTransportDriftedCohortCount: Number(providerMemoryTransportUsageCohorts.summary.drifted_cohort_count || 0),
            providerMemoryTransportInsufficientSampleCohortCount: Number(providerMemoryTransportUsageCohorts.summary.insufficient_sample_cohort_count || 0),
            providerMemoryTransportSavingsClaimCount: Number(providerMemoryTransportUsageCohorts.summary.savings_claim_count || 0),
            providerMemoryTransportCohortRejectedRowCount: Number(providerMemoryTransportUsageCohorts.summary.rejected_row_count || 0),
            deliveredCount: rows.filter(row => row.memoryContextDelivered).length,
            deliveryMissingCount: rows.filter(row => !row.deliveryReceiptId).length,
            deliveryFailedCount: rows.filter(row => row.deliveryReceiptId && !row.memoryContextDelivered).length,
            deliveryChecksumMismatchCount: rows.filter(row => row.deliveryReceiptId && !row.deliveryReceiptChecksumValid).length,
            deliveryScopeMismatchCount: rows.filter(row => row.deliveryReceiptId && !row.deliveryGroupSessionBound).length,
            compactHeadFenceRequiredCount: rows.filter(row => row.compactHeadFenceRequired).length,
            compactHeadFenceValidCount: rows.filter(row => row.compactHeadFenceRequired && row.compactHeadFenceValid).length,
            compactHeadFenceStaleCount: rows.filter(row => row.compactHeadFenceRequired && !row.compactHeadFenceValid).length,
            sessionLifecycleFenceRequiredCount: rows.filter(row => row.sessionLifecycleFenceRequired).length,
            sessionLifecycleFenceValidCount: rows.filter(row => row.sessionLifecycleFenceRequired && row.sessionLifecycleFenceValid).length,
            sessionLifecycleFenceStaleCount: rows.filter(row => row.sessionLifecycleFenceRequired && !row.sessionLifecycleFenceValid).length,
            postTurnSummaryCapsuleCount: rows.filter(row => row.postTurnSummaryCapsulePresent).length,
            postTurnSummaryCapsuleValidCount: rows.filter(row => row.postTurnSummaryCapsuleValid).length,
            postTurnSummaryCapsuleMissingCount: rows.filter(row => row.postTurnSummaryExpected && !row.postTurnSummaryCapsulePresent).length,
            postTurnSummaryCapsuleInvalidCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleValid).length,
            postTurnSummaryCapsulePromptBoundCount: rows.filter(row => row.postTurnSummaryCapsulePromptBound).length,
            postTurnSummaryCapsuleSessionBoundCount: rows.filter(row => row.postTurnSummaryCapsuleSessionBound).length,
            postTurnSummaryCapsuleCompactEpochCount: rows.filter(row => !!row.postTurnSummaryCapsuleCompactEpoch).length,
            postTurnSummaryCapsuleCompactEpochMismatchCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleCompactEpochBound).length,
            postTurnSummaryCapsuleLedgerHeadMismatchCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleLedgerHeadBound).length,
            postTurnSummaryCapsuleSelectionMismatchCount: rows.filter(row => row.postTurnSummaryCapsulePresent && !row.postTurnSummaryCapsuleSelectionBound).length,
            invocationEdgeCount: rows.filter(row => row.invocationEdgeId).length,
            invocationLineageExpectedCount: rows.filter(row => row.invocationLineageExpected).length,
            invocationLineageBoundCount: rows.filter(row => row.invocationLineageExpected && row.invocationLineageBound && row.invocationLedgerBound).length,
            invocationLedgerMissingCount: rows.filter(row => row.invocationLineageExpected && !row.invocationLedgerBound).length,
            finalDispatchGateReadyCount: rows.filter(row => row.finalDispatchStatus === "ready").length,
            finalDispatchGateBlockedCount: rows.filter(row => row.finalDispatchStatus === "recompact_required").length,
            finalDispatchGateMissingCount: rows.filter(row => !row.finalDispatchPayloadGatePresent).length,
            finalDispatchGateInvalidCount: rows.filter(row => row.finalDispatchPayloadGatePresent && !row.finalDispatchPayloadGateValid).length,
            finalDispatchPromptBoundCount: rows.filter(row => row.finalDispatchPromptBound).length,
            finalDispatchLineageProofRequiredCount: rows.filter(row => row.finalDispatchLineageProofRequired).length,
            finalDispatchLineageProofCount: rows.filter(row => row.finalDispatchLineageProofRequired && row.finalDispatchLineageProofValid).length,
            finalDispatchReactiveCompactRecoveredCount: rows.filter(row => row.finalDispatchReactiveCompactStatus === "recovered").length,
            finalDispatchReactiveCompactBlockedCount: rows.filter(row => row.finalDispatchReactiveCompactStatus === "blocked").length,
            finalDispatchReactiveCompactInvalidCount: rows.filter(row => row.finalDispatchReactiveCompactPresent && !row.finalDispatchReactiveCompactValid).length,
            finalDispatchReactiveCompactCircuitOpenCount: rows.filter(row => row.finalDispatchReactiveCompactCircuitBlocked).length,
            finalDispatchReactiveCompactCircuitFailureCount: rows.reduce((sum, row) => sum + Number(row.finalDispatchReactiveCompactCircuitFailures || 0), 0),
            finalDispatchReactiveCompactCircuitInvalidCount: rows.filter(row => row.finalDispatchReactiveCompactCircuitBreakerPresent && !row.finalDispatchReactiveCompactCircuitBreakerValid).length,
            invocationBranchCount: new Set(rows.map(row => row.invocationBranchId).filter(Boolean)).size,
            staleCount: rows.filter(row => row.stale).length,
            prunableCount: rows.filter(row => row.prunable).length,
            groupCount: groups.length,
        },
        groups,
        providerMemoryTransportUsageCohorts,
        rows: rows.slice(0, 300),
        weakRows: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 60),
        prunableRows: rows.filter(row => row.prunable),
    };
}
//# sourceMappingURL=agent-sessions-inventory.js.map