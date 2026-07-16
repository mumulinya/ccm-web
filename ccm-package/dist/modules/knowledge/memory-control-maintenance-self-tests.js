"use strict";
// Category-specific TestAgent self-tests. The compatibility facade remains in self-test.ts.
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
exports.runMemoryCenterPostCompactCompletionMemoryPreservationRepairClosureTypedMemoryWorkerContextSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationRepairClosureTypedMemoryWorkerContextSelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureUsageFeedbackSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureUsageFeedbackSelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackAgingTaskFamilySelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackAgingTaskFamilySelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackEvidenceConfidenceSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackEvidenceConfidenceSelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackConflictArbitrationSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackConflictArbitrationSelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionSelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionSelfTest;
exports.runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest = runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest;
exports.runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionRepairSelfTest = runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionRepairSelfTest;
exports.runMemoryCenterReplayRepairLedgerRetentionSafetySelfTest = runMemoryCenterReplayRepairLedgerRetentionSafetySelfTest;
exports.runMemoryCenterConflictResolutionColdArchiveSelfTest = runMemoryCenterConflictResolutionColdArchiveSelfTest;
exports.runMemoryCenterConflictResolutionManifestGenerationGcSelfTest = runMemoryCenterConflictResolutionManifestGenerationGcSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceControllerSelfTest = runMemoryCenterConflictResolutionMaintenanceControllerSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceSchedulerSelfTest = runMemoryCenterConflictResolutionMaintenanceSchedulerSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationContextSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationContextSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryHealthSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryHealthSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRetentionSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRetentionSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRecoverySelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRecoverySelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLeaseSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLeaseSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupLedgerCasSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupLedgerCasSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitWalSelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitWalSelfTest;
exports.runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscoverySelfTest = runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscoverySelfTest;
exports.runMemoryCenterHistoricalCompactBoundaryReplaySelfTest = runMemoryCenterHistoricalCompactBoundaryReplaySelfTest;
exports.runMemoryCenterChildAgentTypeReplayMatrixSelfTest = runMemoryCenterChildAgentTypeReplayMatrixSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const memory_control_center_1 = require("./memory-control-center");
function runMemoryCenterPostCompactCompletionMemoryPreservationRepairClosureTypedMemoryWorkerContextSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-completion-preservation-closure-a-${suffix}`;
    const groupB = `memory-center-completion-preservation-closure-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
    const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
    const sourceDoc = "post-compact-reinjection-repair-receipt-memory.md";
    const { distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory, runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest, } = require("../collaboration/group-memory-index");
    const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
    const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
    const makeItem = (groupId, marker) => ({
        group_id: groupId,
        source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: `post-compact-completion-preservation-repair:${marker}`,
        assignment_id: `assignment-${marker}`,
        dispatch_key: `dispatch-${marker}`,
        worker_context_packet_id: `failed-packet-${marker}`,
        binding_id: `failed-binding-${marker}`,
        compact_retry_id: `failed-retry-${marker}`,
        compact_outcome_id: `failed-outcome-${marker}`,
        compact_hook_run_id: `failed-hook-${marker}`,
        corrected_compact_retry_id: `corrected-retry-${marker}`,
        corrected_compact_outcome_id: `corrected-outcome-${marker}`,
        corrected_compact_hook_run_id: `corrected-hook-${marker}`,
        completion_preservation_completion_doc_rel_paths: [completionDoc],
        completion_preservation_required_doc_rel_paths: [sourceDoc],
        completion_preservation_work_item_ids: [`receipt-memory-usage-repair:${marker}`],
        completion_preservation_timeline_binding_ids: [`receipt-memory-usage-timeline:${marker}`],
        completion_preservation_historical_task_agent_session_ids: [`original-task-session-${marker}`],
        completion_preservation_historical_native_session_ids: [`original-native-session-${marker}`],
        completion_preservation_current_session_binding_id: `closure-binding-${marker}`,
        completion_preservation_current_task_agent_session_id: `closure-task-session-${marker}`,
        completion_preservation_current_native_session_id: `closure-native-session-${marker}`,
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: `failed-retry-${marker}`,
            failed_outcome_id: `failed-outcome-${marker}`,
            corrected_retry_id: `corrected-retry-${marker}`,
            corrected_outcome_id: `corrected-outcome-${marker}`,
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: "2026-07-12T07:10:00.000Z",
        },
        completedAt: "2026-07-12T07:10:00.000Z",
    });
    try {
        const indexSelfTest = runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest();
        const itemA = makeItem(groupA, "PHASE186_GROUP_A_SENTINEL");
        const itemB = makeItem(groupB, "PHASE186_GROUP_B_SENTINEL");
        const firstA = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupA, { rows: [itemA] }, { reason: "phase186-memory-center-a", updatedAt: "2026-07-12T07:11:00.000Z" });
        const secondA = distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupA, { rows: [itemA] }, { reason: "phase186-memory-center-a-repeat", updatedAt: "2026-07-12T07:12:00.000Z" });
        distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupB, { rows: [itemB] }, { reason: "phase186-memory-center-b", updatedAt: "2026-07-12T07:11:00.000Z" });
        const workItemReport = {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-work-item-report-v1",
            overall: { requiredActionCount: 2, coveredItemCount: 2 },
            groups: [
                { groupId: groupA, status: "ok", file: "", items: [itemA] },
                { groupId: groupB, status: "ok", file: "", items: [itemB] },
            ],
        };
        const typedReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairClosureTypedMemoryReport)({ groupIds: [groupA, groupB], workItemReport });
        const typedQuality = (0, memory_control_center_1.evaluatePostCompactCompletionPreservationRepairClosureTypedMemory)({ groupIds: [groupA, groupB], workItemReport });
        const workerReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairClosureWorkerContextReport)({ groupIds: [groupA, groupB], typedReport, targetProject: "api" });
        const workerQuality = (0, memory_control_center_1.evaluatePostCompactCompletionPreservationRepairClosureWorkerContext)({ groupIds: [groupA, groupB], typedReport, targetProject: "api" });
        const groupAReport = (workerReport.groups || []).find((row) => row.groupId === groupA) || {};
        const groupBReport = (workerReport.groups || []).find((row) => row.groupId === groupB) || {};
        const checks = {
            indexLayerSelfTestPasses: indexSelfTest.pass === true,
            distillationIsIdempotent: firstA.archivedCount === 1 && secondA.archivedCount === 1 && secondA.newRowCount === 0,
            typedMemoryQualityCoversBothGroups: typedReport.overall?.status === "ok"
                && Number(typedReport.overall?.expectedClosureCount || 0) === 2
                && Number(typedReport.overall?.coveredClosureCount || 0) === 2
                && typedQuality.status === "ok",
            legacyMemoryIsNotInjectedIntoUnscopedSessions: workerReport.overall?.status === "empty"
                && Number(workerReport.overall?.checkedGroupCount || 0) === 0
                && Number(workerReport.overall?.legacyScopeCount || 0) === 2
                && workerQuality.status === "empty"
                && groupAReport.status === "legacy"
                && groupAReport.legacyAutoInjectionBlocked === true
                && groupBReport.status === "legacy"
                && groupBReport.legacyAutoInjectionBlocked === true,
            groupRecallIdentityIsIsolated: (groupAReport.correctedOutcomeIds || []).includes(itemA.corrected_compact_outcome_id)
                && !(groupAReport.correctedOutcomeIds || []).includes(itemB.corrected_compact_outcome_id)
                && (groupBReport.correctedOutcomeIds || []).includes(itemB.corrected_compact_outcome_id)
                && !(groupBReport.correctedOutcomeIds || []).includes(itemA.corrected_compact_outcome_id),
            legacyClosureRemainsReadableForMigration: firstA.archivedCount === 1
                && fs.existsSync(path.join(typedDirA, closureDoc))
                && fs.existsSync(path.join(typedDirB, closureDoc)),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            typedMemory: typedReport.overall,
            workerContext: workerReport.overall,
            legacyAutoInjectionBlocked: true,
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureUsageFeedbackSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-closure-feedback-used-${suffix}`;
    const groupB = `memory-center-closure-feedback-ignored-${suffix}`;
    const groupC = `memory-center-closure-feedback-repair-${suffix}`;
    const groupIds = [groupA, groupB, groupC];
    const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
    const bindingFiles = groupIds.map(groupId => (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId));
    const workItemFiles = groupIds.map(groupId => (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId));
    const typedDirs = groupIds.map(groupId => path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)));
    const { buildPostCompactCompletionMemoryPreservationClosureUsageSummary, distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory, readGroupTypedMemoryDistillationLedger, readPostCompactCompletionMemoryPreservationClosureUsageLedger, } = require("../collaboration/group-memory-index");
    const makeClosure = (groupId, marker) => ({
        group_id: groupId,
        source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: `post-compact-completion-preservation-repair:${marker}`,
        assignment_id: `assignment-${marker}`,
        dispatch_key: `dispatch-${marker}`,
        worker_context_packet_id: `failed-packet-${marker}`,
        binding_id: `failed-binding-${marker}`,
        compact_retry_id: `failed-retry-${marker}`,
        compact_outcome_id: `failed-outcome-${marker}`,
        compact_hook_run_id: `failed-hook-${marker}`,
        corrected_compact_retry_id: `corrected-retry-${marker}`,
        corrected_compact_outcome_id: `corrected-outcome-${marker}`,
        corrected_compact_hook_run_id: `corrected-hook-${marker}`,
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: [`receipt-memory-usage-repair:${marker}`],
        completion_preservation_timeline_binding_ids: [`receipt-memory-usage-timeline:${marker}`],
        completion_preservation_historical_task_agent_session_ids: [`historical-task-session-${marker}`],
        completion_preservation_historical_native_session_ids: [`historical-native-session-${marker}`],
        completion_preservation_current_session_binding_id: `closure-binding-${marker}`,
        completion_preservation_current_task_agent_session_id: `closure-task-session-${marker}`,
        completion_preservation_current_native_session_id: `closure-native-session-${marker}`,
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: `failed-retry-${marker}`,
            failed_outcome_id: `failed-outcome-${marker}`,
            corrected_retry_id: `corrected-retry-${marker}`,
            corrected_outcome_id: `corrected-outcome-${marker}`,
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: "2026-07-12T08:00:00.000Z",
        },
        completedAt: "2026-07-12T08:00:00.000Z",
    });
    const makeEntry = (groupId, marker, sessionSuffix, receipt) => {
        const packetId = `phase187-packet-${marker}-${sessionSuffix}`;
        const taskSessionId = `phase187-task-session-${marker}-${sessionSuffix}`;
        const nativeSessionId = `phase187-native-session-${marker}-${sessionSuffix}`;
        const contract = {
            schema: "ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1",
            active: true,
            memory_receipt_required_doc_rel_paths: [closureDoc],
            doc_rel_paths: [closureDoc],
            current_task_agent_session_id: taskSessionId,
            current_native_session_id: nativeSessionId,
            required_receipt_fields: ["memoryUsed", "memoryIgnored"],
            freshness_boundary: "historical repair completion is recovery evidence, not permanent repository truth",
        };
        return {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
            groupId,
            project: "api",
            task_id: `phase187-task-${marker}-${sessionSuffix}`,
            execution_id: `phase187-execution-${marker}-${sessionSuffix}`,
            binding_id: `phase187-binding-${marker}-${sessionSuffix}`,
            assignment_id: `phase187-assignment-${marker}-${sessionSuffix}`,
            dispatch_key: `phase187-dispatch-${marker}-${sessionSuffix}`,
            worker_context_packet_id: packetId,
            post_compact_reinjection_repair_receipt_memory_contract: contract,
            worker_context_packet_post_compact_reinjection_repair_receipt_memory_contract: contract,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: packetId,
                categories: [{ id: "post_compact_reinjection_repair_receipt_memory_contract", required: true, tokens: 80 }],
            },
            worker_context_packet_receipt: {
                status: "done",
                worker_context_packet_id: packetId,
                task_agent_session_id: taskSessionId,
                native_session_id: nativeSessionId,
                memoryUsed: [],
                memoryIgnored: [],
                ...receipt,
            },
        };
    };
    const writeBindings = (groupId, entries, at) => {
        const file = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
        (0, memory_control_center_1.writeJsonAtomic)(file, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file,
            updatedAt: at,
            bindingCount: entries.length,
            entries,
        });
    };
    const historicalBoundary = "historical repair completion is recovery evidence, not permanent repository truth";
    try {
        const tasksBefore = (0, db_1.loadTasks)().length;
        const closureA = makeClosure(groupA, "PHASE187_A");
        const closureB = makeClosure(groupB, "PHASE187_B");
        const closureC = makeClosure(groupC, "PHASE187_C");
        for (const [groupId, closure] of [[groupA, closureA], [groupB, closureB], [groupC, closureC]]) {
            distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, { rows: [closure] }, {
                reason: "phase187-usage-feedback-selftest",
                updatedAt: "2026-07-12T08:01:00.000Z",
            });
        }
        const entryA = makeEntry(groupA, "A", "used", {
            memoryUsed: [`${closureDoc}; usageState=verified; currentSourceVerified=true; ${historicalBoundary}`],
        });
        const entriesB = ["ignored-1", "ignored-2"].map(suffixId => makeEntry(groupB, "B", suffixId, {
            memoryIgnored: [`${closureDoc}; usageState=ignored; reason=not relevant to this child task; ${historicalBoundary}`],
        }));
        const invalidEntryC = makeEntry(groupC, "C", "invalid", {
            memoryUsed: [`${closureDoc}; usageState=verified; ${historicalBoundary}`],
        });
        writeBindings(groupA, [entryA], "2026-07-12T08:02:00.000Z");
        writeBindings(groupB, entriesB, "2026-07-12T08:02:00.000Z");
        writeBindings(groupC, [invalidEntryC], "2026-07-12T08:02:00.000Z");
        const firstReceiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({
            groupIds,
            targetProject: "api",
            tasks: [],
            generatedAt: "2026-07-12T08:03:00.000Z",
        });
        (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({
            groupIds,
            targetProject: "api",
            tasks: [],
            generatedAt: "2026-07-12T08:04:00.000Z",
        });
        const firstSummaries = new Map(groupIds.map(groupId => [groupId, buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, { targetProject: "api" })]));
        const firstUsageLedgers = new Map(groupIds.map(groupId => [groupId, readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId)]));
        const repairLedgerBefore = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupC);
        const repairItemBefore = (repairLedgerBefore.items || []).find(memory_control_center_1.isPostCompactReinjectionRepairReceiptMemoryUsageReceiptRepairWorkItem) || {};
        const archiveCountsBefore = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const firstUsageReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureUsageFeedbackReport)({ groupIds, targetProject: "api" });
        const firstRepairReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureReceiptRepairReport)({ groupIds, targetProject: "api", usageReport: firstUsageReport });
        const firstPriorityReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureRecallPriorityReport)({ groupIds, targetProject: "api" });
        const correctedEntryC = makeEntry(groupC, "C", "invalid", {
            memoryUsed: [`${closureDoc}; usageState=verified; currentSourceVerified=true; ${historicalBoundary}`],
        });
        writeBindings(groupC, [correctedEntryC], "2026-07-12T08:05:00.000Z");
        const correctedReceiptReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({
            groupIds,
            targetProject: "api",
            tasks: [],
            generatedAt: "2026-07-12T08:06:00.000Z",
        });
        const correctedSummaryC = buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupC, { targetProject: "api" });
        const repairLedgerAfter = (0, memory_control_center_1.readGroupCompactBoundaryReplayRepairWorkItems)(groupC);
        const repairItemAfter = (repairLedgerAfter.items || []).find(memory_control_center_1.isPostCompactReinjectionRepairReceiptMemoryUsageReceiptRepairWorkItem) || {};
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: [
                "post_compact_completion_memory_preservation_closure_usage_feedback",
                "post_compact_completion_memory_preservation_closure_receipt_repair",
                "post_compact_completion_memory_preservation_closure_recall_priority",
            ],
            groupIds,
            targetProject: "api",
            tasks: [],
            refresh: true,
        });
        const qualityChecks = new Map((qualityReport.checks || []).map((check) => [check.id, check]));
        const archiveCountsAfter = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const checks = {
            validUsedFeedbackPromotesRecall: firstSummaries.get(groupA)?.recommendation === "promote_but_reverify_current_source"
                && firstSummaries.get(groupA)?.verifiedCount === 1,
            repeatedIgnoredFeedbackDeprioritizesGenericRecall: firstSummaries.get(groupB)?.recommendation === "deprioritize_closure_recall"
                && firstSummaries.get(groupB)?.ignoredCount === 2
                && firstPriorityReport.groups?.find((row) => row.groupId === groupB)?.genericRecallSuppressed === true,
            exactCorrectedOutcomeStillRecalls: firstPriorityReport.groups?.find((row) => row.groupId === groupB)?.exactIdentityPreserved === true,
            invalidReceiptRequiresRepair: firstSummaries.get(groupC)?.recommendation === "require_receipt_repair_before_reuse"
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(repairItemBefore.status)
                && firstRepairReport.overall?.status === "ok",
            duplicateScanIsIdempotent: Number(firstUsageLedgers.get(groupA)?.entries?.length || 0) === 1
                && Number(firstUsageLedgers.get(groupB)?.entries?.length || 0) === 2
                && Number(firstUsageLedgers.get(groupC)?.entries?.length || 0) === 1,
            correctedReceiptClosesRepairAndRecovers: correctedReceiptReport.overall?.status === "ok"
                && (0, memory_control_center_1.replayRepairWorkItemStatus)(repairItemAfter.status) === "completed"
                && correctedSummaryC.recommendation === "promote_but_reverify_current_source"
                && correctedSummaryC.activeReceiptRepairRequired === false,
            feedbackSessionsStayGroupIsolated: firstUsageReport.overall?.status === "ok"
                && firstUsageReport.groups?.every((row) => (row.entries || []).every((entry) => entry.group_id === row.groupId))
                && firstReceiptReport.groups?.find((row) => row.groupId === groupC)?.status === "fail",
            immutableClosureArchivesRemainUnchanged: groupIds.every(groupId => archiveCountsBefore.get(groupId) === 1 && archiveCountsAfter.get(groupId) === 1),
            qualityChecksRegisteredAndPass: [
                "post_compact_completion_memory_preservation_closure_usage_feedback",
                "post_compact_completion_memory_preservation_closure_receipt_repair",
                "post_compact_completion_memory_preservation_closure_recall_priority",
            ].every(id => qualityChecks.get(id)?.status === "ok"),
            memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receiptBefore: firstReceiptReport.overall,
            usageFeedback: firstUsageReport.overall,
            receiptRepair: firstRepairReport.overall,
            recallPriority: firstPriorityReport.overall,
            correctedReceipt: correctedReceiptReport.overall,
            recommendations: {
                used: firstSummaries.get(groupA)?.recommendation || "",
                ignored: firstSummaries.get(groupB)?.recommendation || "",
                invalid: firstSummaries.get(groupC)?.recommendation || "",
                corrected: correctedSummaryC.recommendation || "",
            },
            quality: [...qualityChecks.values()].map((check) => ({ id: check.id, status: check.status, checked: check.checked, passed: check.passed })),
        };
    }
    finally {
        for (const file of [...bindingFiles, ...workItemFiles]) {
            for (const target of [file, `${file}.bak`]) {
                try {
                    if (target && fs.existsSync(target))
                        fs.unlinkSync(target);
                }
                catch { }
            }
        }
        for (const dir of typedDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackAgingTaskFamilySelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-closure-feedback-aging-a-${suffix}`;
    const groupB = `memory-center-closure-feedback-aging-b-${suffix}`;
    const groupIds = [groupA, groupB];
    const typedDirs = groupIds.map(groupId => path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)));
    const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
    const fixedNow = "2026-07-12T12:00:00.000Z";
    const oldAt = "2026-03-01T12:00:00.000Z";
    const recentAt = "2026-07-12T11:30:00.000Z";
    const { buildPostCompactCompletionMemoryPreservationClosureUsageSummary, distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory, readGroupTypedMemoryDistillationLedger, recordPostCompactCompletionMemoryPreservationClosureUsage, } = require("../collaboration/group-memory-index");
    const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
    const makeClosure = (groupId, marker) => ({
        group_id: groupId,
        source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: `post-compact-completion-preservation-repair:${marker}`,
        assignment_id: `assignment-${marker}`,
        dispatch_key: `dispatch-${marker}`,
        worker_context_packet_id: `failed-packet-${marker}`,
        binding_id: `failed-binding-${marker}`,
        compact_retry_id: `failed-retry-${marker}`,
        compact_outcome_id: `failed-outcome-${marker}`,
        compact_hook_run_id: `failed-hook-${marker}`,
        corrected_compact_retry_id: `corrected-retry-${marker}`,
        corrected_compact_outcome_id: `corrected-outcome-${marker}`,
        corrected_compact_hook_run_id: `corrected-hook-${marker}`,
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: [`receipt-memory-usage-repair:${marker}`],
        completion_preservation_timeline_binding_ids: [`receipt-memory-usage-timeline:${marker}`],
        completion_preservation_historical_task_agent_session_ids: [`historical-task-session-${marker}`],
        completion_preservation_historical_native_session_ids: [`historical-native-session-${marker}`],
        completion_preservation_current_session_binding_id: `closure-binding-${marker}`,
        completion_preservation_current_task_agent_session_id: `closure-task-session-${marker}`,
        completion_preservation_current_native_session_id: `closure-native-session-${marker}`,
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: `failed-retry-${marker}`,
            failed_outcome_id: `failed-outcome-${marker}`,
            corrected_retry_id: `corrected-retry-${marker}`,
            corrected_outcome_id: `corrected-outcome-${marker}`,
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: fixedNow,
        },
        completedAt: fixedNow,
    });
    const feedbackRow = (groupId, family, index) => ({
        target_project: "api",
        agent: "codex",
        task_id: `phase188-${family}-task-${index}`,
        task_text: family === "payment" ? "fix payment callback timeout" : "optimize search indexing pipeline",
        execution_id: `phase188-${family}-execution-${index}`,
        worker_context_packet_id: `phase188-${groupId}-${family}-packet-${index}`,
        binding_id: `phase188-${groupId}-${family}-binding-${index}`,
        task_agent_session_id: `phase188-${groupId}-${family}-task-session-${index}`,
        native_session_id: `phase188-${groupId}-${family}-native-session-${index}`,
        receipt_source: "worker_context_packet_receipt",
        receipt_status: "done",
        rel_path: closureDoc,
        usage_state: "ignored",
        current_source_verified: false,
        compliant: true,
        reason: `closure history is not relevant to the ${family} task family`,
    });
    const recall = (groupId, task, suffixId) => {
        const bundle = buildAgentMemoryContextBundle(groupId, "api", task, {
            includeGlobalClaudeMemory: false,
            includeProjectMemory: false,
            maxTypedMemory: 8,
            maxRenderedChars: 18000,
            taskId: `phase188-recall-${suffixId}`,
            taskAgentSessionId: `phase188-recall-task-session-${suffixId}`,
            nativeSessionId: `phase188-recall-native-session-${suffixId}`,
            executionId: `phase188-recall-execution-${suffixId}`,
            generatedAt: fixedNow,
            postCompactClosureUsageHalfLifeDays: 14,
            postCompactClosureUsageStaleAfterDays: 45,
        });
        return bundle.post_compact_reinjection_repair_receipt_recall || bundle.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
    };
    try {
        const tasksBefore = (0, db_1.loadTasks)().length;
        const closureA = makeClosure(groupA, "PHASE188_A");
        const closureB = makeClosure(groupB, "PHASE188_B");
        distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupA, { rows: [closureA] }, { reason: "phase188-aging-a", updatedAt: fixedNow });
        distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupB, { rows: [closureB] }, { reason: "phase188-aging-b", updatedAt: fixedNow });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupA, {
            rows: [feedbackRow(groupA, "payment", 1), feedbackRow(groupA, "payment", 2)],
            generatedAt: oldAt,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupA, {
            rows: [feedbackRow(groupA, "search", 1), feedbackRow(groupA, "search", 2)],
            generatedAt: recentAt,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupB, {
            rows: [feedbackRow(groupB, "payment", 1), feedbackRow(groupB, "payment", 2)],
            generatedAt: recentAt,
        });
        const summary = (groupId, task) => buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, {
            targetProject: "api",
            task,
            now: fixedNow,
            postCompactClosureUsageHalfLifeDays: 14,
            postCompactClosureUsageStaleAfterDays: 45,
        });
        const paymentA = summary(groupA, "fix payment callback timeout");
        const searchA = summary(groupA, "optimize search indexing pipeline");
        const unrelatedA = summary(groupA, "deploy kubernetes ingress certificate rotation");
        const paymentB = summary(groupB, "fix payment callback timeout");
        const paymentRecallA = recall(groupA, "review post-compact completion memory preservation repair closure for fix payment callback timeout", "payment-a");
        const searchRecallA = recall(groupA, "review post-compact completion memory preservation repair closure for optimize search indexing pipeline", "search-a");
        const unrelatedRecallA = recall(groupA, "review post-compact completion memory preservation repair closure for deploy kubernetes ingress certificate rotation", "unrelated-a");
        const exactRecallA = recall(groupA, `review exact corrected outcome ${closureA.corrected_compact_outcome_id} for optimize search indexing pipeline`, "exact-a");
        const paymentRecallB = recall(groupB, "review post-compact completion memory preservation repair closure for fix payment callback timeout", "payment-b");
        const archiveCountsBefore = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const agingReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureFeedbackAgingTaskFamilyReport)({
            groupIds,
            targetProject: "api",
            now: fixedNow,
            postCompactClosureUsageHalfLifeDays: 14,
            postCompactClosureUsageStaleAfterDays: 45,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_feedback_aging_task_family"],
            groupIds,
            targetProject: "api",
            now: fixedNow,
            postCompactClosureUsageHalfLifeDays: 14,
            postCompactClosureUsageStaleAfterDays: 45,
            tasks: [],
            refresh: true,
        });
        const quality = qualityReport.checks?.[0] || {};
        const archiveCountsAfter = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const exactCorrectedIds = (0, memory_control_center_1.normalizeQualityStringList)(exactRecallA.preservationCorrectedOutcomeIds || exactRecallA.preservation_corrected_outcome_ids || []);
        const checks = {
            oldIgnoredFeedbackDecaysOutOfSuppression: paymentA.recommendation === "caution_stale_history_reverify_current_source"
                && paymentA.weightedIgnoredCount < 1.5
                && paymentRecallA.preservationClosureRecallSuppressed !== true,
            recentSameFamilyIgnoredStillSuppresses: searchA.recommendation === "deprioritize_closure_recall"
                && searchA.weightedIgnoredCount >= 1.5
                && searchRecallA.preservationClosureRecallSuppressed === true,
            unrelatedTaskFamilyDoesNotInheritFeedback: unrelatedA.recommendation === "neutral_reverify_current_source"
                && unrelatedA.matchedEntryCount === 0
                && unrelatedRecallA.preservationClosureRecallSuppressed !== true,
            exactIdentityOverridesFamilySuppression: exactRecallA.exactPreservationClosureIdentityMatched === true
                && exactRecallA.preservationClosureRecallSuppressed === false
                && exactCorrectedIds.includes(closureA.corrected_compact_outcome_id),
            groupsRemainIsolated: paymentB.recommendation === "deprioritize_closure_recall"
                && paymentRecallB.preservationClosureRecallSuppressed === true
                && paymentA.recommendation !== paymentB.recommendation,
            agingMetadataIsExplicit: paymentA.aging?.half_life_days === 14
                && paymentA.aging?.stale_after_days === 45
                && paymentA.taskFamily?.tokens?.includes("payment"),
            qualityCheckPasses: agingReport.overall?.status === "ok"
                && agingReport.overall?.checkedGroupCount === 2
                && agingReport.overall?.unrelatedMatchedEntryCount === 0
                && quality.id === "post_compact_completion_memory_preservation_closure_feedback_aging_task_family"
                && quality.status === "ok",
            immutableClosureArchivesRemainUnchanged: groupIds.every(groupId => archiveCountsBefore.get(groupId) === 1 && archiveCountsAfter.get(groupId) === 1),
            memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            summaries: {
                paymentA: { recommendation: paymentA.recommendation, weightedIgnoredCount: paymentA.weightedIgnoredCount, matchedEntryCount: paymentA.matchedEntryCount },
                searchA: { recommendation: searchA.recommendation, weightedIgnoredCount: searchA.weightedIgnoredCount, matchedEntryCount: searchA.matchedEntryCount },
                unrelatedA: { recommendation: unrelatedA.recommendation, matchedEntryCount: unrelatedA.matchedEntryCount },
                paymentB: { recommendation: paymentB.recommendation, weightedIgnoredCount: paymentB.weightedIgnoredCount, matchedEntryCount: paymentB.matchedEntryCount },
            },
            aging: agingReport.overall,
            quality: { id: quality.id || "", status: quality.status || "", checked: quality.checked || 0, passed: quality.passed || 0 },
        };
    }
    finally {
        for (const dir of typedDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackEvidenceConfidenceSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-closure-confidence-duplicate-${suffix}`;
    const groupB = `memory-center-closure-confidence-diverse-${suffix}`;
    const groupC = `memory-center-closure-confidence-low-source-${suffix}`;
    const groupIds = [groupA, groupB, groupC];
    const typedDirs = groupIds.map(groupId => path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)));
    const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
    const fixedNow = "2026-07-12T14:00:00.000Z";
    const { buildPostCompactCompletionMemoryPreservationClosureUsageSummary, distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory, readGroupTypedMemoryDistillationLedger, recordPostCompactCompletionMemoryPreservationClosureUsage, } = require("../collaboration/group-memory-index");
    const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
    const makeClosure = (groupId, marker) => ({
        group_id: groupId,
        source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: `post-compact-completion-preservation-repair:${marker}`,
        assignment_id: `assignment-${marker}`,
        dispatch_key: `dispatch-${marker}`,
        worker_context_packet_id: `failed-packet-${marker}`,
        binding_id: `failed-binding-${marker}`,
        compact_retry_id: `failed-retry-${marker}`,
        compact_outcome_id: `failed-outcome-${marker}`,
        compact_hook_run_id: `failed-hook-${marker}`,
        corrected_compact_retry_id: `corrected-retry-${marker}`,
        corrected_compact_outcome_id: `corrected-outcome-${marker}`,
        corrected_compact_hook_run_id: `corrected-hook-${marker}`,
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: [`receipt-memory-usage-repair:${marker}`],
        completion_preservation_timeline_binding_ids: [`receipt-memory-usage-timeline:${marker}`],
        completion_preservation_historical_task_agent_session_ids: [`historical-task-session-${marker}`],
        completion_preservation_historical_native_session_ids: [`historical-native-session-${marker}`],
        completion_preservation_current_session_binding_id: `closure-binding-${marker}`,
        completion_preservation_current_task_agent_session_id: `closure-task-session-${marker}`,
        completion_preservation_current_native_session_id: `closure-native-session-${marker}`,
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: `failed-retry-${marker}`,
            failed_outcome_id: `failed-outcome-${marker}`,
            corrected_retry_id: `corrected-retry-${marker}`,
            corrected_outcome_id: `corrected-outcome-${marker}`,
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: fixedNow,
        },
        completedAt: fixedNow,
    });
    const feedback = (groupId, index, input = {}) => ({
        target_project: "api",
        agent: input.agent || "codex",
        task_id: `phase189-search-task-${groupId}-${index}`,
        task_text: "optimize search indexing pipeline",
        execution_id: `phase189-search-execution-${groupId}-${index}`,
        worker_context_packet_id: input.packetId || `phase189-${groupId}-packet-${index}`,
        binding_id: `phase189-${groupId}-binding-${index}`,
        task_agent_session_id: input.taskSessionId || `phase189-${groupId}-task-session-${index}`,
        native_session_id: input.nativeSessionId || `phase189-${groupId}-native-session-${index}`,
        receipt_source: input.receiptSource || "assignment_binding",
        receipt_status: "done",
        rel_path: closureDoc,
        usage_state: "ignored",
        current_source_verified: false,
        compliant: true,
        reason: "closure history is not relevant to this search-indexing child task",
    });
    const summary = (groupId) => buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, {
        targetProject: "api",
        task: "optimize search indexing pipeline",
        now: fixedNow,
        postCompactClosureUsageHalfLifeDays: 14,
        postCompactClosureUsageStaleAfterDays: 45,
    });
    const recall = (groupId, task, suffixId) => {
        const bundle = buildAgentMemoryContextBundle(groupId, "api", task, {
            includeGlobalClaudeMemory: false,
            includeProjectMemory: false,
            maxTypedMemory: 8,
            maxRenderedChars: 18000,
            taskId: `phase189-recall-${suffixId}`,
            taskAgentSessionId: `phase189-recall-task-session-${suffixId}`,
            nativeSessionId: `phase189-recall-native-session-${suffixId}`,
            executionId: `phase189-recall-execution-${suffixId}`,
            generatedAt: fixedNow,
        });
        return bundle.post_compact_reinjection_repair_receipt_recall || bundle.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
    };
    try {
        const tasksBefore = (0, db_1.loadTasks)().length;
        const closureA = makeClosure(groupA, "PHASE189_A");
        const closureB = makeClosure(groupB, "PHASE189_B");
        const closureC = makeClosure(groupC, "PHASE189_C");
        for (const [groupId, closure] of [[groupA, closureA], [groupB, closureB], [groupC, closureC]]) {
            distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, { rows: [closure] }, { reason: "phase189-evidence-confidence", updatedAt: fixedNow });
        }
        const duplicateTaskSession = `phase189-${groupA}-reused-task-session`;
        const duplicateNativeSession = `phase189-${groupA}-reused-native-session`;
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupA, {
            rows: Array.from({ length: 5 }, (_, index) => feedback(groupA, index + 1, {
                taskSessionId: duplicateTaskSession,
                nativeSessionId: duplicateNativeSession,
                packetId: `phase189-${groupA}-duplicate-packet-${index + 1}`,
                receiptSource: "timeline_binding.status",
            })),
            generatedAt: fixedNow,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupB, {
            rows: [feedback(groupB, 1), feedback(groupB, 2)],
            generatedAt: fixedNow,
        });
        const sameSourceB = summary(groupB);
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupB, {
            rows: [feedback(groupB, 3, { agent: "cursor", receiptSource: "corrected_repair_receipt" })],
            generatedAt: fixedNow,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupC, {
            rows: [
                feedback(groupC, 1, { receiptSource: "timeline_binding.status" }),
                feedback(groupC, 2, { receiptSource: "timeline_binding.status" }),
            ],
            generatedAt: fixedNow,
        });
        const duplicateA = summary(groupA);
        const diverseB = summary(groupB);
        const lowSourceC = summary(groupC);
        const genericRecallA = recall(groupA, "review post-compact completion memory preservation repair closure for optimize search indexing pipeline", "duplicate-a");
        const genericRecallB = recall(groupB, "review post-compact completion memory preservation repair closure for optimize search indexing pipeline", "diverse-b");
        const genericRecallC = recall(groupC, "review post-compact completion memory preservation repair closure for optimize search indexing pipeline", "low-source-c");
        const exactRecallB = recall(groupB, `review exact corrected outcome ${closureB.corrected_compact_outcome_id} for optimize search indexing pipeline`, "exact-b");
        const archiveCountsBefore = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const confidenceReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureFeedbackEvidenceConfidenceReport)({
            groupIds,
            targetProject: "api",
            now: fixedNow,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_feedback_evidence_confidence"],
            groupIds,
            targetProject: "api",
            now: fixedNow,
            tasks: [],
            refresh: true,
        });
        const quality = qualityReport.checks?.[0] || {};
        const archiveCountsAfter = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const exactCorrectedIds = (0, memory_control_center_1.normalizeQualityStringList)(exactRecallB.preservationCorrectedOutcomeIds || exactRecallB.preservation_corrected_outcome_ids || []);
        const checks = {
            reusedSessionDuplicatesCollapseToOneEvidence: duplicateA.rawMatchedEntryCount === 5
                && duplicateA.independentEvidenceCount === 1
                && duplicateA.correlatedDuplicateCount === 4
                && duplicateA.independentSessionCount === 1,
            duplicateBurstCannotSuppressRecall: duplicateA.recommendation !== "deprioritize_closure_recall"
                && duplicateA.evidenceConfidence < duplicateA.evidenceConfidenceThreshold
                && genericRecallA.preservationClosureRecallSuppressed !== true,
            twoIndependentReliableSessionsCanSuppress: sameSourceB.independentSessionCount === 2
                && sameSourceB.recommendation === "deprioritize_closure_recall"
                && sameSourceB.evidenceConfidence >= sameSourceB.evidenceConfidenceThreshold,
            providerAndSourceDiversityRaiseConfidence: diverseB.distinctProviderCount === 2
                && diverseB.distinctReceiptSourceCount === 2
                && diverseB.evidenceConfidence > sameSourceB.evidenceConfidence
                && diverseB.recommendation === "deprioritize_closure_recall"
                && genericRecallB.preservationClosureRecallSuppressed === true,
            lowReliabilityStatusOnlyEvidenceCannotSuppress: lowSourceC.independentSessionCount === 2
                && lowSourceC.averageSourceReliability === 0.55
                && lowSourceC.recommendation !== "deprioritize_closure_recall"
                && genericRecallC.preservationClosureRecallSuppressed !== true,
            exactIdentityStillOverridesConfidentSuppression: exactRecallB.exactPreservationClosureIdentityMatched === true
                && exactRecallB.preservationClosureRecallSuppressed === false
                && exactCorrectedIds.includes(closureB.corrected_compact_outcome_id),
            evidenceStaysGroupIsolated: duplicateA.rawMatchedEntryCount === 5
                && diverseB.rawMatchedEntryCount === 3
                && lowSourceC.rawMatchedEntryCount === 2,
            qualityCheckPassesWithoutAuthorization: confidenceReport.overall?.status === "ok"
                && confidenceReport.groups?.every((row) => row.rankingEvidenceOnly === true && row.authorizationGranted === false)
                && quality.id === "post_compact_completion_memory_preservation_closure_feedback_evidence_confidence"
                && quality.status === "ok",
            immutableClosureArchivesRemainUnchanged: groupIds.every(groupId => archiveCountsBefore.get(groupId) === 1 && archiveCountsAfter.get(groupId) === 1),
            memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            summaries: {
                duplicateA: { recommendation: duplicateA.recommendation, raw: duplicateA.rawMatchedEntryCount, independent: duplicateA.independentEvidenceCount, duplicates: duplicateA.correlatedDuplicateCount, confidence: duplicateA.evidenceConfidence },
                sameSourceB: { recommendation: sameSourceB.recommendation, sessions: sameSourceB.independentSessionCount, confidence: sameSourceB.evidenceConfidence },
                diverseB: { recommendation: diverseB.recommendation, providers: diverseB.distinctProviderCount, sources: diverseB.distinctReceiptSourceCount, confidence: diverseB.evidenceConfidence },
                lowSourceC: { recommendation: lowSourceC.recommendation, sourceReliability: lowSourceC.averageSourceReliability, confidence: lowSourceC.evidenceConfidence },
            },
            confidence: confidenceReport.overall,
            quality: { id: quality.id || "", status: quality.status || "", checked: quality.checked || 0, passed: quality.passed || 0 },
        };
    }
    finally {
        for (const dir of typedDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackConflictArbitrationSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-closure-conflict-${suffix}`;
    const groupB = `memory-center-closure-consistent-ignored-${suffix}`;
    const groupC = `memory-center-closure-stale-opposition-${suffix}`;
    const groupIds = [groupA, groupB, groupC];
    const typedDirs = groupIds.map(groupId => path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)));
    const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
    const fixedNow = "2026-07-12T16:00:00.000Z";
    const oldAt = "2026-03-01T16:00:00.000Z";
    const { buildPostCompactCompletionMemoryPreservationClosureUsageSummary, distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory, readGroupTypedMemoryDistillationLedger, recordPostCompactCompletionMemoryPreservationClosureUsage, } = require("../collaboration/group-memory-index");
    const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
    const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
    const makeClosure = (groupId, marker) => ({
        group_id: groupId,
        source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: `post-compact-completion-preservation-repair:${marker}`,
        assignment_id: `assignment-${marker}`,
        dispatch_key: `dispatch-${marker}`,
        worker_context_packet_id: `failed-packet-${marker}`,
        binding_id: `failed-binding-${marker}`,
        compact_retry_id: `failed-retry-${marker}`,
        compact_outcome_id: `failed-outcome-${marker}`,
        compact_hook_run_id: `failed-hook-${marker}`,
        corrected_compact_retry_id: `corrected-retry-${marker}`,
        corrected_compact_outcome_id: `corrected-outcome-${marker}`,
        corrected_compact_hook_run_id: `corrected-hook-${marker}`,
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: [`receipt-memory-usage-repair:${marker}`],
        completion_preservation_timeline_binding_ids: [`receipt-memory-usage-timeline:${marker}`],
        completion_preservation_historical_task_agent_session_ids: [`historical-task-session-${marker}`],
        completion_preservation_historical_native_session_ids: [`historical-native-session-${marker}`],
        completion_preservation_current_session_binding_id: `closure-binding-${marker}`,
        completion_preservation_current_task_agent_session_id: `closure-task-session-${marker}`,
        completion_preservation_current_native_session_id: `closure-native-session-${marker}`,
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: `failed-retry-${marker}`,
            failed_outcome_id: `failed-outcome-${marker}`,
            corrected_retry_id: `corrected-retry-${marker}`,
            corrected_outcome_id: `corrected-outcome-${marker}`,
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: fixedNow,
        },
        completedAt: fixedNow,
    });
    const feedback = (groupId, index, usageState) => ({
        target_project: "api",
        agent: index % 2 ? "codex" : "cursor",
        task_id: `phase190-migration-task-${groupId}-${index}`,
        task_text: "migrate account database schema",
        execution_id: `phase190-migration-execution-${groupId}-${index}`,
        worker_context_packet_id: `phase190-${groupId}-packet-${index}`,
        binding_id: `phase190-${groupId}-binding-${index}`,
        task_agent_session_id: `phase190-${groupId}-task-session-${index}`,
        native_session_id: `phase190-${groupId}-native-session-${index}`,
        receipt_source: "assignment_binding",
        receipt_status: "done",
        rel_path: closureDoc,
        usage_state: usageState,
        current_source_verified: ["used", "verified"].includes(usageState),
        compliant: true,
        reason: usageState === "ignored" ? "closure history was not relevant after current migration source inspection" : "",
    });
    const summary = (groupId) => buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, {
        targetProject: "api",
        task: "migrate account database schema",
        now: fixedNow,
        postCompactClosureUsageHalfLifeDays: 14,
        postCompactClosureUsageStaleAfterDays: 45,
    });
    const bundleFor = (groupId, task, suffixId) => buildAgentMemoryContextBundle(groupId, "api", task, {
        includeGlobalClaudeMemory: false,
        includeProjectMemory: false,
        maxTypedMemory: 8,
        maxRenderedChars: 18000,
        taskId: `phase190-recall-${suffixId}`,
        taskAgentSessionId: `phase190-recall-task-session-${suffixId}`,
        nativeSessionId: `phase190-recall-native-session-${suffixId}`,
        executionId: `phase190-recall-execution-${suffixId}`,
        generatedAt: fixedNow,
    });
    try {
        const tasksBefore = (0, db_1.loadTasks)().length;
        const closureA = makeClosure(groupA, "PHASE190_A");
        const closureB = makeClosure(groupB, "PHASE190_B");
        const closureC = makeClosure(groupC, "PHASE190_C");
        for (const [groupId, closure] of [[groupA, closureA], [groupB, closureB], [groupC, closureC]]) {
            distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, { rows: [closure] }, { reason: "phase190-conflict-arbitration", updatedAt: fixedNow });
        }
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupA, {
            rows: [feedback(groupA, 1, "verified"), feedback(groupA, 2, "ignored"), feedback(groupA, 3, "ignored"), feedback(groupA, 4, "ignored")],
            generatedAt: fixedNow,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupB, {
            rows: [feedback(groupB, 1, "ignored"), feedback(groupB, 2, "ignored")],
            generatedAt: fixedNow,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupC, {
            rows: [feedback(groupC, 1, "verified"), feedback(groupC, 2, "verified")],
            generatedAt: oldAt,
        });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupC, {
            rows: [feedback(groupC, 3, "ignored"), feedback(groupC, 4, "ignored")],
            generatedAt: fixedNow,
        });
        const conflictA = summary(groupA);
        const consistentB = summary(groupB);
        const staleOppositionC = summary(groupC);
        const genericTask = "review post-compact completion memory preservation repair closure for migrate account database schema";
        const bundleA = bundleFor(groupA, genericTask, "conflict-a");
        const recallA = bundleA.post_compact_reinjection_repair_receipt_recall || bundleA.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
        const packetA = buildWorkerContextPacket({
            group: { id: groupA, name: "Phase 190 conflict", members: [{ project: "api" }] },
            project: "api",
            task: genericTask,
            taskId: "phase190-conflict-packet",
            traceId: "phase190-conflict-trace",
            agentType: "codex",
            memory: bundleA,
            contextUsageOptions: { maxTokens: 90000 },
        });
        const contractA = packetA.post_compact_reinjection_repair_receipt_memory_contract || {};
        const renderedA = renderWorkerContextPacket(packetA);
        const bundleB = bundleFor(groupB, genericTask, "consistent-b");
        const recallB = bundleB.post_compact_reinjection_repair_receipt_recall || bundleB.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
        const bundleC = bundleFor(groupC, genericTask, "stale-c");
        const recallC = bundleC.post_compact_reinjection_repair_receipt_recall || bundleC.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
        const exactBundleA = bundleFor(groupA, `review exact corrected outcome ${closureA.corrected_compact_outcome_id} for migrate account database schema`, "exact-a");
        const exactRecallA = exactBundleA.post_compact_reinjection_repair_receipt_recall || exactBundleA.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
        const archiveCountsBefore = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const conflictReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureFeedbackConflictReport)({
            groupIds,
            targetProject: "api",
            now: fixedNow,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_feedback_conflict_arbitration"],
            groupIds,
            targetProject: "api",
            now: fixedNow,
            tasks: [],
            refresh: true,
        });
        const quality = qualityReport.checks?.[0] || {};
        const archiveCountsAfter = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, (ledger.postCompactCompletionMemoryPreservationRepairClosureArchive?.rows || []).length];
        }));
        const conflict = conflictA.feedbackConflict || {};
        const exactCorrectedIds = (0, memory_control_center_1.normalizeQualityStringList)(exactRecallA.preservationCorrectedOutcomeIds || exactRecallA.preservation_corrected_outcome_ids || []);
        const checks = {
            reliableOpposingBranchesTriggerConflict: conflict.active === true
                && conflictA.recommendation === "surface_conflict_reverify_current_session"
                && conflict.positive?.independent_session_count === 1
                && conflict.ignored?.independent_session_count === 3,
            historicalMajorityCannotAutoSuppress: conflict.historical_majority_authorization_allowed === false
                && recallA.preservationClosureRecallSuppressed === false
                && recallA.active === true,
            bothEvidenceBranchesRemainAuditable: conflict.positive?.entry_ids?.length === 1
                && conflict.ignored?.entry_ids?.length === 3
                && conflict.positive?.weighted_evidence > 0
                && conflict.ignored?.weighted_evidence > conflict.positive?.weighted_evidence,
            workerContextRequiresCurrentSessionArbitration: contractA.closure_feedback_conflict_active === true
                && contractA.closure_feedback_current_session_verification_required === true
                && contractA.closure_feedback_historical_majority_authorization_allowed === false
                && packetA.acceptance?.post_compact_completion_memory_preservation_closure_feedback_conflict_current_session_verification_required === true
                && /Closure feedback conflict/i.test(renderedA)
                && /current child session|current source/i.test(renderedA),
            consistentIgnoredStillUsesConfidenceGate: consistentB.feedbackConflictActive === false
                && consistentB.recommendation === "deprioritize_closure_recall"
                && recallB.preservationClosureRecallSuppressed === true,
            staleOppositionDoesNotCreateFalseConflict: staleOppositionC.feedbackConflictActive === false
                && staleOppositionC.recommendation === "deprioritize_closure_recall"
                && recallC.preservationClosureRecallSuppressed === true,
            exactIdentityRemainsAvailable: exactRecallA.exactPreservationClosureIdentityMatched === true
                && exactCorrectedIds.includes(closureA.corrected_compact_outcome_id),
            groupsRemainIsolated: conflictReport.overall?.checkedGroupCount === 1
                && conflictReport.groups?.find((row) => row.groupId === groupA)?.conflictFamilyCount === 1
                && conflictReport.groups?.filter((row) => row.groupId !== groupA).every((row) => row.conflictFamilyCount === 0),
            qualityCheckAndImmutableArchivePass: conflictReport.overall?.status === "ok"
                && quality.id === "post_compact_completion_memory_preservation_closure_feedback_conflict_arbitration"
                && quality.status === "ok"
                && groupIds.every(groupId => archiveCountsBefore.get(groupId) === 1 && archiveCountsAfter.get(groupId) === 1),
            memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            summaries: {
                conflictA: { recommendation: conflictA.recommendation, arbitrationState: conflict.arbitration_state, ratio: conflict.conflict_ratio, positiveWeight: conflict.positive?.weighted_evidence, ignoredWeight: conflict.ignored?.weighted_evidence },
                consistentB: { recommendation: consistentB.recommendation, conflictActive: consistentB.feedbackConflictActive },
                staleOppositionC: { recommendation: staleOppositionC.recommendation, conflictActive: staleOppositionC.feedbackConflictActive },
            },
            conflict: conflictReport.overall,
            quality: { id: quality.id || "", status: quality.status || "", checked: quality.checked || 0, passed: quality.passed || 0 },
        };
    }
    finally {
        for (const dir of typedDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-closure-resolution-used-${suffix}`;
    const groupB = `memory-center-closure-resolution-ignored-${suffix}`;
    const groupC = `memory-center-closure-resolution-reopened-${suffix}`;
    const groupIds = [groupA, groupB, groupC];
    const typedDirs = groupIds.map(groupId => path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)));
    const bindingFiles = groupIds.map(groupId => (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId));
    const workItemFiles = groupIds.map(groupId => (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId));
    const closureDoc = "post-compact-completion-memory-preservation-repair-closures.md";
    const resolutionDoc = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";
    const conflictAt = "2026-07-12T17:00:00.000Z";
    const resolvedAt = "2026-07-12T17:10:00.000Z";
    const reopenedAt = "2026-07-12T17:20:00.000Z";
    const { buildPostCompactCompletionMemoryPreservationClosureUsageSummary, distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory, readGroupTypedMemoryDistillationLedger, readPostCompactCompletionMemoryPreservationClosureUsageLedger, recordPostCompactCompletionMemoryPreservationClosureUsage, scanGroupTypedMemoryDocuments, } = require("../collaboration/group-memory-index");
    const { buildAgentMemoryContextBundle } = require("../collaboration/memory");
    const { buildWorkerContextPacket, renderWorkerContextPacket } = require("../../agents/runtime-kernel");
    const makeClosure = (groupId, marker) => ({
        group_id: groupId,
        source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
        component: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation",
        target_project: "api",
        work_item_id: `post-compact-completion-preservation-repair:${marker}`,
        assignment_id: `assignment-${marker}`,
        dispatch_key: `dispatch-${marker}`,
        worker_context_packet_id: `failed-packet-${marker}`,
        binding_id: `failed-binding-${marker}`,
        compact_retry_id: `failed-retry-${marker}`,
        compact_outcome_id: `failed-outcome-${marker}`,
        compact_hook_run_id: `failed-hook-${marker}`,
        corrected_compact_retry_id: `corrected-retry-${marker}`,
        corrected_compact_outcome_id: `corrected-outcome-${marker}`,
        corrected_compact_hook_run_id: `corrected-hook-${marker}`,
        completion_preservation_completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
        completion_preservation_required_doc_rel_paths: ["post-compact-reinjection-repair-receipt-memory.md"],
        completion_preservation_work_item_ids: [`receipt-memory-usage-repair:${marker}`],
        completion_preservation_timeline_binding_ids: [`receipt-memory-usage-timeline:${marker}`],
        completion_preservation_historical_task_agent_session_ids: [`historical-task-session-${marker}`],
        completion_preservation_historical_native_session_ids: [`historical-native-session-${marker}`],
        completion_preservation_current_session_binding_id: `closure-binding-${marker}`,
        completion_preservation_current_task_agent_session_id: `closure-task-session-${marker}`,
        completion_preservation_current_native_session_id: `closure-native-session-${marker}`,
        completion_preservation_gap_codes: ["completion_work_item_ids_missing_after_compact"],
        status: "completed",
        completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
        resolutionReason: "completion_memory_compaction_preservation_corrected_retry_verified",
        corrected_retry_proof: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1",
            failed_retry_id: `failed-retry-${marker}`,
            failed_outcome_id: `failed-outcome-${marker}`,
            corrected_retry_id: `corrected-retry-${marker}`,
            corrected_outcome_id: `corrected-outcome-${marker}`,
            exact_identity_restored: true,
            current_session_boundary_restored: true,
            historical_sessions_remain_evidence_only: true,
            verified_at: conflictAt,
        },
        completedAt: conflictAt,
    });
    const historicalFeedback = (groupId, index, usageState) => ({
        target_project: "api",
        agent: index % 2 ? "codex" : "cursor",
        task_id: `phase191-cache-task-${groupId}-${index}`,
        task_text: "repair distributed cache invalidation",
        execution_id: `phase191-cache-execution-${groupId}-${index}`,
        worker_context_packet_id: `phase191-${groupId}-historical-packet-${index}`,
        binding_id: `phase191-${groupId}-historical-binding-${index}`,
        task_agent_session_id: `phase191-${groupId}-historical-task-session-${index}`,
        native_session_id: `phase191-${groupId}-historical-native-session-${index}`,
        receipt_source: "assignment_binding",
        receipt_status: "done",
        rel_path: closureDoc,
        usage_state: usageState,
        current_source_verified: ["used", "verified"].includes(usageState),
        compliant: true,
        reason: usageState === "ignored" ? "closure history was not relevant after current cache inspection" : "",
    });
    const buildConflictPacket = (groupId, suffixId) => {
        const task = "review post-compact completion memory preservation repair closure for repair distributed cache invalidation";
        const bundle = buildAgentMemoryContextBundle(groupId, "api", task, {
            includeGlobalClaudeMemory: false,
            includeProjectMemory: false,
            maxTypedMemory: 8,
            maxRenderedChars: 18000,
            taskId: `phase191-conflict-${suffixId}`,
            taskAgentSessionId: `phase191-conflict-task-session-${suffixId}`,
            nativeSessionId: `phase191-conflict-native-session-${suffixId}`,
            executionId: `phase191-conflict-execution-${suffixId}`,
            generatedAt: conflictAt,
        });
        const packet = buildWorkerContextPacket({
            group: { id: groupId, name: "Phase 191 conflict resolution", members: [{ project: "api" }] },
            project: "api",
            task,
            taskId: `phase191-conflict-${suffixId}`,
            traceId: `phase191-conflict-trace-${suffixId}`,
            agentType: "codex",
            memory: bundle,
            contextUsageOptions: { maxTokens: 90000 },
        });
        return { task, bundle, packet, contract: packet.post_compact_reinjection_repair_receipt_memory_contract || {} };
    };
    const writeResolutionBinding = (groupId, packetBuild, usageState, validSession, at) => {
        const contract = packetBuild.contract || {};
        const packetId = packetBuild.packet.packet_id;
        const taskSession = validSession ? contract.current_task_agent_session_id : `wrong-${contract.current_task_agent_session_id}`;
        const nativeSession = validSession ? contract.current_native_session_id : `wrong-${contract.current_native_session_id}`;
        const memoryUsed = ["used", "verified"].includes(usageState)
            ? [`${closureDoc}; usageState=${usageState}; currentSourceVerified=true; historical repair completion is recovery evidence, not permanent repository truth`]
            : [];
        const memoryIgnored = usageState === "ignored"
            ? [`${closureDoc}; usageState=ignored; reason=current cache source shows this historical closure is not applicable; historical repair completion is recovery evidence, not permanent repository truth`]
            : [];
        const entry = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
            groupId,
            project: "api",
            agent_type: "codex",
            task: packetBuild.task,
            task_family_key: contract.closure_feedback_task_family_key,
            task_id: `phase191-resolution-${groupId}`,
            execution_id: `phase191-resolution-execution-${groupId}`,
            binding_id: `phase191-resolution-binding-${groupId}`,
            assignment_id: `phase191-resolution-assignment-${groupId}`,
            dispatch_key: `phase191-resolution-dispatch-${groupId}`,
            worker_context_packet_id: packetId,
            post_compact_reinjection_repair_receipt_memory_contract: contract,
            worker_context_packet_post_compact_reinjection_repair_receipt_memory_contract: contract,
            worker_context_packet_context_usage: {
                schema: "ccm-worker-context-usage-v1",
                packet_id: packetId,
                categories: [{ id: "post_compact_reinjection_repair_receipt_memory_contract", required: true, tokens: 100 }],
            },
            worker_context_packet_receipt: {
                status: "done",
                worker_context_packet_id: packetId,
                task_agent_session_id: taskSession,
                native_session_id: nativeSession,
                memoryUsed,
                memoryIgnored,
            },
        };
        const file = (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId);
        (0, memory_control_center_1.writeJsonAtomic)(file, {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
            version: 1,
            groupId,
            file,
            updatedAt: at,
            bindingCount: 1,
            entries: [entry],
        });
    };
    const summary = (groupId, at) => buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, {
        targetProject: "api",
        task: "repair distributed cache invalidation",
        now: at,
    });
    try {
        const tasksBefore = (0, db_1.loadTasks)().length;
        const closures = new Map();
        for (const [groupId, marker] of [[groupA, "PHASE191_A"], [groupB, "PHASE191_B"], [groupC, "PHASE191_C"]]) {
            const closure = makeClosure(groupId, marker);
            closures.set(groupId, closure);
            distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory(groupId, { rows: [closure] }, { reason: "phase191-conflict-resolution", updatedAt: conflictAt });
            recordPostCompactCompletionMemoryPreservationClosureUsage(groupId, {
                rows: [historicalFeedback(groupId, 1, "verified"), historicalFeedback(groupId, 2, "ignored")],
                generatedAt: conflictAt,
            });
        }
        const packetA = buildConflictPacket(groupA, "used-a");
        const packetB = buildConflictPacket(groupB, "ignored-b");
        const packetC = buildConflictPacket(groupC, "reopened-c");
        writeResolutionBinding(groupA, packetA, "verified", true, resolvedAt);
        writeResolutionBinding(groupB, packetB, "ignored", false, resolvedAt);
        writeResolutionBinding(groupC, packetC, "verified", true, resolvedAt);
        const firstReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds, targetProject: "api", tasks: [], generatedAt: resolvedAt });
        const invalidLedgerB = readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupB);
        const invalidResolutionCountB = (invalidLedgerB.entries || []).filter((entry) => entry.conflict_resolution === true).length;
        writeResolutionBinding(groupB, packetB, "ignored", true, "2026-07-12T17:11:00.000Z");
        const correctedReport = (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds, targetProject: "api", tasks: [], generatedAt: "2026-07-12T17:11:00.000Z" });
        (0, memory_control_center_1.buildPostCompactReinjectionRepairReceiptMemoryUsageReceiptReport)({ groupIds, targetProject: "api", tasks: [], generatedAt: "2026-07-12T17:12:00.000Z" });
        recordPostCompactCompletionMemoryPreservationClosureUsage(groupC, {
            rows: [{
                    ...historicalFeedback(groupC, 3, "ignored"),
                    task_agent_session_id: "phase191-group-c-later-opposition-task-session",
                    native_session_id: "phase191-group-c-later-opposition-native-session",
                    worker_context_packet_id: "phase191-group-c-later-opposition-packet",
                }],
            generatedAt: reopenedAt,
        });
        const summaryA = summary(groupA, reopenedAt);
        const summaryB = summary(groupB, reopenedAt);
        const summaryC = summary(groupC, reopenedAt);
        const futureBundleA = buildAgentMemoryContextBundle(groupA, "api", "review post-compact completion memory preservation repair closure for repair distributed cache invalidation", {
            includeGlobalClaudeMemory: false,
            includeProjectMemory: false,
            maxTypedMemory: 8,
            maxRenderedChars: 18000,
            taskId: "phase191-future-a",
            taskAgentSessionId: "phase191-future-task-session-a",
            nativeSessionId: "phase191-future-native-session-a",
            executionId: "phase191-future-execution-a",
            generatedAt: reopenedAt,
        });
        const futureRecallA = futureBundleA.post_compact_reinjection_repair_receipt_recall || futureBundleA.group_state?.typedMemory?.postCompactReinjectionRepairReceiptRecall || {};
        const futurePacketA = buildWorkerContextPacket({
            group: { id: groupA, name: "Phase 191 future", members: [{ project: "api" }] },
            project: "api",
            task: "review post-compact completion memory preservation repair closure for repair distributed cache invalidation",
            taskId: "phase191-future-a",
            traceId: "phase191-future-trace-a",
            agentType: "codex",
            memory: futureBundleA,
            contextUsageOptions: { maxTokens: 90000 },
        });
        const futureContractA = futurePacketA.post_compact_reinjection_repair_receipt_memory_contract || {};
        const futureRenderedA = renderWorkerContextPacket(futurePacketA);
        const resolutionReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationClosureConflictResolutionReport)({ groupIds, targetProject: "api", now: reopenedAt });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution"],
            groupIds,
            targetProject: "api",
            now: reopenedAt,
            tasks: [],
            refresh: true,
        });
        const quality = qualityReport.checks?.[0] || {};
        const archives = new Map(groupIds.map(groupId => {
            const ledger = readGroupTypedMemoryDistillationLedger(groupId);
            return [groupId, ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {}];
        }));
        const resolutionEntriesA = readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupA).entries.filter((entry) => entry.conflict_resolution === true);
        const docsA = scanGroupTypedMemoryDocuments(groupA);
        const checks = {
            wrongSessionCannotCreateResolution: firstReport.groups?.find((row) => row.groupId === groupB)?.status === "fail"
                && invalidResolutionCountB === 0,
            validUsedResolutionIsSessionBound: summaryA.feedbackConflictResolution?.active === true
                && summaryA.feedbackConflictResolution?.resolution_usage_state === "verified"
                && summaryA.feedbackConflictResolution?.task_agent_session_id === packetA.contract.current_task_agent_session_id
                && summaryA.recommendation === "resolved_conflict_promote_but_reverify_future_session",
            validIgnoredResolutionStaysNeutral: summaryB.feedbackConflictResolution?.active === true
                && summaryB.feedbackConflictResolution?.resolution_usage_state === "ignored"
                && summaryB.recommendation === "resolved_conflict_neutral_reverify_future_session",
            resolutionAutomaticallyDistillsTypedMemory: groupIds.every(groupId => Number(archives.get(groupId)?.archived_count || 0) === 1)
                && docsA.some((doc) => doc.relPath === resolutionDoc),
            duplicateReceiptScanIsIdempotent: resolutionEntriesA.length === 1
                && Number(archives.get(groupA)?.rows?.length || 0) === 1,
            futureWorkerContextRecallsResolution: (futureRecallA.docRelPaths || []).includes(resolutionDoc)
                && futureContractA.closure_conflict_resolution_active === true
                && futureContractA.closure_conflict_resolution_entry_id === summaryA.feedbackConflictResolution?.resolution_entry_id
                && futurePacketA.acceptance?.post_compact_completion_memory_preservation_closure_conflict_resolution_reverification_required === true
                && /Closure conflict resolution history/i.test(futureRenderedA),
            historicalBranchesRemainPreserved: summaryA.historicalFeedbackConflict?.positive?.entry_ids?.length >= 1
                && summaryA.historicalFeedbackConflict?.ignored?.entry_ids?.length >= 1
                && archives.get(groupA)?.rows?.[0]?.historical_branches_preserved === true,
            laterReliableOppositionReopensConflict: summaryC.feedbackConflictResolution?.reopened === true
                && summaryC.feedbackConflictResolution?.active === false
                && summaryC.feedbackConflictActive === true
                && summaryC.recommendation === "surface_conflict_reverify_current_session",
            qualityAndGroupIsolationPass: correctedReport.overall?.status === "ok"
                && resolutionReport.overall?.status === "ok"
                && resolutionReport.overall?.checkedGroupCount === 3
                && quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution"
                && quality.status === "ok"
                && groupIds.every(groupId => archives.get(groupId)?.rows?.every((row) => row.group_id === groupId)),
            memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            summaries: {
                used: { recommendation: summaryA.recommendation, resolution: summaryA.feedbackConflictResolution },
                ignored: { recommendation: summaryB.recommendation, resolution: summaryB.feedbackConflictResolution },
                reopened: { recommendation: summaryC.recommendation, resolution: summaryC.feedbackConflictResolution },
            },
            resolution: resolutionReport.overall,
            resolutionGroups: resolutionReport.groups,
            future: {
                docRelPaths: futureRecallA.docRelPaths || [],
                contract: futureContractA,
                acceptance: futurePacketA.acceptance || {},
                renderedHasResolution: /Closure conflict resolution history/i.test(futureRenderedA),
            },
            quality: { id: quality.id || "", status: quality.status || "", checked: quality.checked || 0, passed: quality.passed || 0 },
        };
    }
    finally {
        for (const file of [...bindingFiles, ...workItemFiles]) {
            for (const target of [file, `${file}.bak`]) {
                try {
                    if (target && fs.existsSync(target))
                        fs.unlinkSync(target);
                }
                catch { }
            }
        }
        for (const dir of typedDirs) {
            try {
                if (fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionSelfTest() {
    const tasksBefore = (0, db_1.loadTasks)().length;
    const integration = require("../collaboration/group-orchestrator").runWorkerContextCompletionMemoryCompactionPreservationSelfTest();
    const scenarios = Array.isArray(integration.scenarios) ? integration.scenarios : [];
    const outcomeReport = {
        schema: "ccm-worker-context-compact-outcome-ledger-report-v1",
        overall: { status: "ok", outcomeCount: scenarios.length },
        groups: scenarios.map((scenario, index) => ({
            groupId: `phase192-${scenario.kind}-${index}`,
            status: "ok",
            outcomes: [{
                    assignment_id: `phase192-assignment-${scenario.kind}`,
                    outcome_id: `phase192-outcome-${scenario.kind}`,
                    retry_method: scenario.retry_method,
                    completion_memory_preserved: scenario.preservation_preserved === true,
                    conflict_resolution_preservation_required: scenario.conflict_resolution_present === true,
                    conflict_resolution_present: scenario.conflict_resolution_present === true,
                    conflict_resolution_doc_rel_paths: scenario.conflict_resolution_doc_rel_paths || [],
                    conflict_resolution_active: scenario.conflict_resolution_active === true,
                    conflict_resolution_reopened: scenario.conflict_resolution_reopened === true,
                    conflict_resolution_state: scenario.conflict_resolution_state || "",
                    conflict_resolution_entry_id: scenario.conflict_resolution_entry_id || "",
                    conflict_resolution_usage_state: scenario.conflict_resolution_usage_state || "",
                    conflict_resolution_task_agent_session_id: scenario.conflict_resolution_task_agent_session_id || "",
                    conflict_resolution_native_session_id: scenario.conflict_resolution_native_session_id || "",
                    conflict_resolution_reversible: scenario.conflict_resolution_reversible === true,
                    conflict_resolution_historical_branches_preserved: scenario.conflict_resolution_historical_branches_preserved === true,
                    conflict_resolution_reverification_acceptance_required: scenario.conflict_resolution_reverification_acceptance_required === true,
                    conflict_resolution_reversible_acceptance_required: scenario.conflict_resolution_reversible_acceptance_required === true,
                    conflict_verification_acceptance_required: scenario.conflict_verification_acceptance_required === true,
                    ptl_emergency_engaged: scenario.ptl_emergency_engaged === true,
                }],
            gaps: [],
        })),
        weakGroups: [],
    };
    const report = (0, memory_control_center_1.buildPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionReport)({ outcomeReport });
    const directQuality = (0, memory_control_center_1.evaluatePostCompactCompletionMemoryPreservationClosureConflictResolutionCompaction)({ outcomeReport });
    const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
        checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_compaction"],
        outcomeReport,
        tasks: [],
        refresh: true,
    });
    const quality = qualityReport.checks?.[0] || {};
    const memory = scenarios.find((scenario) => scenario.kind === "memory") || {};
    const replay = scenarios.find((scenario) => scenario.kind === "replay") || {};
    const metadata = scenarios.find((scenario) => scenario.kind === "metadata") || {};
    const ptl = scenarios.find((scenario) => scenario.kind === "ptl") || {};
    const checks = {
        realFourStrategyIntegrationPasses: integration.pass === true
            && scenarios.length === 4
            && integration.checks?.exactConflictResolutionIdentitySurvivesAllStrategies === true,
        exactResolutionIdentitySurvivesEveryStrategy: scenarios.every((scenario) => scenario.conflict_resolution_entry_id === "pccmpu_PHASE192_RESOLUTION_SENTINEL"
            && (scenario.conflict_resolution_doc_rel_paths || []).includes("post-compact-completion-memory-preservation-closure-conflict-resolutions.md")
            && scenario.conflict_resolution_task_agent_session_id === "task-agent-session-phase192-resolution"
            && scenario.conflict_resolution_native_session_id === "native-session-phase192-resolution"),
        reversibleBranchBoundarySurvives: scenarios.every((scenario) => scenario.conflict_resolution_reversible === true
            && scenario.conflict_resolution_historical_branches_preserved === true),
        activeResolutionAcceptanceSurvivesMemoryAndReplay: [memory, replay].every((scenario) => scenario.conflict_resolution_active === true
            && scenario.conflict_resolution_reopened === false
            && scenario.conflict_resolution_reverification_acceptance_required === true
            && scenario.conflict_resolution_reversible_acceptance_required === true),
        reopenedConflictAcceptanceSurvivesMetadataAndPtl: [metadata, ptl].every((scenario) => scenario.conflict_resolution_active === false
            && scenario.conflict_resolution_reopened === true
            && scenario.conflict_verification_acceptance_required === true),
        recoveryBehaviorMatchesCompactStrategy: memory.dispatch_ready === false
            && replay.dispatch_ready === true
            && metadata.dispatch_ready === true
            && ptl.ptl_emergency_engaged === true,
        tamperedResolutionIsRejected: integration.checks?.tamperedCompactPacketIsRejected === true
            && (integration.tampered?.gaps || []).includes("conflict_resolution_contract_missing_after_compact")
            && (integration.tampered?.gaps || []).includes("conflict_resolution_entry_id_changed_after_compact"),
        reportAndQualityPass: report.overall?.status === "ok"
            && report.overall?.requiredOutcomeCount === 4
            && report.overall?.preservedOutcomeCount === 4
            && report.overall?.activeResolutionCount === 2
            && report.overall?.reopenedResolutionCount === 2
            && directQuality.status === "ok"
            && quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_compaction"
            && quality.status === "ok",
        memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        report: report.overall,
        scenarios,
        tampered: integration.tampered,
        quality: { id: quality.id || "", status: quality.status || "", checked: quality.checked || 0, passed: quality.passed || 0 },
    };
}
function runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest() {
    const groupId = `memory-center-compact-file-reference-discipline-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const messageFile = path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    const ledgerFile = (0, memory_control_center_1.getGroupCompactFileReferenceLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    const typedDir = path.join(utils_1.CCM_DIR, "group-memory-md", (0, memory_control_center_1.sidecarFileId)(groupId));
    const sessionDir = path.join(memory_control_center_1.GROUP_SESSION_MEMORY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    const toolDir = path.join(memory_control_center_1.GROUP_TOOL_CONTINUITY_DIR, (0, memory_control_center_1.sidecarFileId)(groupId));
    try {
        const { saveGroupMessages } = require("../collaboration/storage");
        const { saveGroupMemory, buildAgentMemoryContextBundle, buildGroupCompactFileReferences, summarizeGroupCompactFileReferenceAccess, } = require("../collaboration/memory");
        saveGroupMessages(groupId, [
            { id: "cfrd-1", role: "user", target: "coordinator", timestamp: "2026-07-07T14:00:00.000Z", content: "COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL：子 Agent 新会话必须能拿到群聊压缩文件引用。" },
            { id: "cfrd-2", role: "assistant", agent: "api", timestamp: "2026-07-07T14:01:00.000Z", content: "api 将在回执 memoryUsed 中声明实际使用的 reference_id。" },
        ]);
        saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact file reference 下发后必须有 memoryUsed/memoryIgnored 使用声明",
            messageDigest: "COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL：压缩文件引用要被子 Agent 回执闭环。",
            persistentRequirements: [{ messageId: "cfrd-1", text: "compact file reference 使用情况必须可审计。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-file-reference-discipline-summary",
                lastCompactedMessageId: "cfrd-2",
            },
        });
        const childBundle = buildAgentMemoryContextBundle(groupId, "api", "继续处理 COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL");
        const refs = childBundle.compact_file_references || buildGroupCompactFileReferences(groupId, childBundle);
        const usedRef = (refs.references || []).find((item) => item.type === "raw_group_messages_json") || refs.references?.[0] || {};
        const unmentionedRef = (refs.references || []).find((item) => item.reference_id && item.reference_id !== usedRef.reference_id) || {};
        const memory = saveGroupMemory(groupId, {
            groupId,
            goal: "验证 compact file reference 下发后必须有 memoryUsed/memoryIgnored 使用声明",
            messageDigest: "COMPACT_FILE_REFERENCE_DISCIPLINE_SENTINEL：压缩文件引用要被子 Agent 回执闭环。",
            persistentRequirements: [{ messageId: "cfrd-1", text: "compact file reference 使用情况必须可审计。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 2,
                preservedRecentMessages: 1,
                summaryChecksum: "compact-file-reference-discipline-summary",
                lastCompactedMessageId: "cfrd-2",
            },
            workerLedger: [{
                    time: "2026-07-07T14:02:00.000Z",
                    taskId: "compact-file-reference-discipline-task",
                    project: "api",
                    status: "completed",
                    summary: `已按 compact reference 读取 ${usedRef.reference_id || "compact-file-reference"} 并核对原始消息。`,
                    memoryUsed: [`reference_id=${usedRef.reference_id || ""}；path=${usedRef.displayPath || usedRef.path || ""}`],
                    memoryIgnored: [],
                }],
        });
        const access = summarizeGroupCompactFileReferenceAccess(groupId, refs, memory);
        const report = (0, memory_control_center_1.buildCompactFileReferenceUsageDisciplineReport)({ groupIds: [groupId] });
        const group = report.groups?.[0] || {};
        const check = (0, memory_control_center_1.evaluateCompactFileReferenceUsageDiscipline)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const detailDiscipline = detail.postCompactUsage?.compactFileReferenceDiscipline || {};
        const checks = {
            childBundleSurfacesCompactReferences: refs.schema === "ccm-group-compact-file-references-v1"
                && Number(refs.referenceCount || 0) >= 3
                && !!usedRef.reference_id
                && !!unmentionedRef.reference_id,
            surfacingLedgerExists: fs.existsSync(ledgerFile)
                && Number((0, memory_control_center_1.readJson)(ledgerFile, {})?.entries?.length || 0) >= 1,
            accessSummaryFindsUsedReference: access.schema === "ccm-group-compact-file-reference-access-summary-v1"
                && (access.rows || []).some((row) => row.reference_id === usedRef.reference_id && row.mentioned === true),
            disciplineReportChecksSurfacedRefs: report.schema === "ccm-compact-file-reference-usage-discipline-report-v1"
                && Number(group.checked || 0) >= 3
                && Number(group.passed || 0) >= 1,
            unmentionedRefsBecomeGaps: (group.gaps || []).some((gap) => gap.reference_id === unmentionedRef.reference_id)
                && Number(group.missing || 0) >= 1,
            qualityCheckCoversDiscipline: check.id === "compact_file_reference_usage_discipline"
                && Number(check.checked || 0) === Number(group.checked || 0)
                && Number(check.passed || 0) === Number(group.passed || 0),
            memoryCenterDetailExposesDiscipline: detailDiscipline.schema === "ccm-compact-file-reference-usage-discipline-group-v1"
                && Number(detailDiscipline.checked || 0) === Number(group.checked || 0)
                && (detailDiscipline.rows || []).some((row) => row.reference_id === usedRef.reference_id && row.mentioned === true),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            discipline: {
                checked: group.checked,
                passed: group.passed,
                missing: group.missing,
                status: group.status,
                usedReference: usedRef.reference_id,
                unmentionedReference: unmentionedRef.reference_id,
            },
        };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, messageFile, `${messageFile}.bak`, ledgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDir, sessionDir, toolDir]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterPostCompactCompletionMemoryPreservationClosureConflictResolutionCompactionRepairSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const activeGroupId = `memory-center-resolution-compact-repair-active-${suffix}`;
    const reopenedGroupId = `memory-center-resolution-compact-repair-reopened-${suffix}`;
    const decoyGroupId = `memory-center-resolution-compact-repair-decoy-${suffix}`;
    const groupIds = [activeGroupId, reopenedGroupId];
    const tasksBefore = (0, db_1.loadTasks)().length;
    const resolutionDoc = "post-compact-completion-memory-preservation-closure-conflict-resolutions.md";
    const completionDoc = "post-compact-receipt-memory-usage-repair-completions.md";
    const filesFor = (groupId) => ({
        binding: (0, memory_control_center_1.getGroupReplayRepairDispatchBindingLedgerFile)(groupId),
        outcome: (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupId),
        workItems: (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupId),
        dispatch: (0, memory_control_center_1.getGroupReplayRepairDispatchPlanLedgerFile)(groupId),
        typedDir: path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupId)),
    });
    const summaryFor = (marker, reopened) => ({
        schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
        present: true,
        completion_doc_rel_paths: [completionDoc],
        required_doc_rel_paths: [completionDoc, resolutionDoc],
        work_item_ids: [`completion-work-${marker}`],
        timeline_binding_ids: [`completion-timeline-${marker}`],
        historical_task_agent_session_ids: [`historical-task-${marker}`],
        historical_native_session_ids: [`historical-native-${marker}`],
        current_session_binding_id: `current-binding-${marker}`,
        current_task_agent_session_id: `current-task-${marker}`,
        current_native_session_id: `current-native-${marker}`,
        usage_acceptance_required: true,
        current_session_acceptance_required: true,
        authority_boundary_valid: true,
        conflict_resolution_present: true,
        conflict_resolution_doc_rel_paths: [resolutionDoc],
        conflict_resolution_active: !reopened,
        conflict_resolution_reopened: reopened,
        conflict_resolution_state: reopened ? "reopened" : "resolved",
        conflict_resolution_entry_id: `resolution-entry-${marker}`,
        conflict_resolution_usage_state: "verified",
        conflict_resolution_task_agent_session_id: `resolving-task-${marker}`,
        conflict_resolution_native_session_id: `resolving-native-${marker}`,
        conflict_resolution_reversible: true,
        conflict_resolution_historical_branches_preserved: true,
        conflict_resolution_reverification_acceptance_required: !reopened,
        conflict_resolution_reversible_acceptance_required: !reopened,
        conflict_verification_acceptance_required: reopened,
    });
    const scenarioFor = (groupId, marker, reopened) => {
        const summary = summaryFor(marker, reopened);
        const failedRetryId = `failed-retry-${marker}`;
        const failedOutcomeId = `failed-outcome-${marker}`;
        const failedAfter = {
            ...summary,
            conflict_resolution_present: false,
            conflict_resolution_doc_rel_paths: [],
            conflict_resolution_entry_id: "",
            conflict_resolution_state: "",
            conflict_resolution_usage_state: "",
            conflict_resolution_task_agent_session_id: "",
            conflict_resolution_native_session_id: "",
            conflict_resolution_reversible: false,
            conflict_resolution_historical_branches_preserved: false,
            conflict_resolution_reverification_acceptance_required: false,
            conflict_resolution_reversible_acceptance_required: false,
            conflict_verification_acceptance_required: false,
        };
        const preservation = {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
            required: true,
            preserved: false,
            source: "worker_context_packet_compaction_retry",
            retry_id: failedRetryId,
            before: summary,
            after: failedAfter,
            gaps: [
                "conflict_resolution_contract_missing_after_compact",
                "conflict_resolution_doc_rel_paths_missing_after_compact",
                "conflict_resolution_entry_id_changed_after_compact",
            ],
        };
        const assignmentId = `assignment-${marker}`;
        const failedAt = reopened ? "2026-07-12T03:10:01.000Z" : "2026-07-12T03:00:01.000Z";
        const entry = {
            schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-v1",
            binding_id: `binding-${marker}`,
            assignment_id: assignmentId,
            dispatch_key: `dispatch-${marker}`,
            groupId,
            project: "api",
            worker_context_packet_id: `failed-packet-${marker}`,
            dispatch_ready: false,
            worker_context_packet_compact_hook_run_id: `failed-hook-${marker}`,
            worker_context_packet_compaction_retry: {
                schema: "ccm-worker-context-compaction-retry-v1",
                retry_id: failedRetryId,
                retry_packet_id: `failed-packet-${marker}`,
                status: "blocked",
                post_compact_receipt_memory_usage_repair_completion_preservation: preservation,
                post_compact_receipt_memory_usage_repair_completion_preserved: false,
            },
            updatedAt: failedAt,
        };
        const outcome = {
            schema: "ccm-worker-context-compact-outcome-entry-v1",
            outcome_id: failedOutcomeId,
            group_id: groupId,
            assignment_id: assignmentId,
            dispatch_key: `dispatch-${marker}`,
            project: "api",
            hook_run_id: `failed-hook-${marker}`,
            retry_id: failedRetryId,
            status: "blocked",
            dispatch_ready: false,
            post_compact_receipt_memory_usage_repair_completion_preservation: preservation,
            post_compact_receipt_memory_usage_repair_completion_preserved: false,
            at: failedAt,
        };
        return { groupId, marker, reopened, summary, failedRetryId, failedOutcomeId, assignmentId, entry, outcome, failedAt };
    };
    const correctedFor = (scenario, retryId, outcomeId, at) => ({
        ...scenario.outcome,
        outcome_id: outcomeId,
        retry_id: retryId,
        hook_run_id: `corrected-hook-${scenario.marker}`,
        status: "recovered",
        dispatch_ready: true,
        post_compact_receipt_memory_usage_repair_completion_preservation: {
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
            required: true,
            preserved: true,
            source: "worker_context_packet_compaction_retry",
            retry_id: retryId,
            before: scenario.summary,
            after: scenario.summary,
            gaps: [],
        },
        post_compact_receipt_memory_usage_repair_completion_preserved: true,
        at,
    });
    const active = scenarioFor(activeGroupId, "phase193-active", false);
    const reopened = scenarioFor(reopenedGroupId, "phase193-reopened", true);
    const allScenarios = [active, reopened];
    const writeBinding = (scenario) => (0, memory_control_center_1.writeJsonAtomic)(filesFor(scenario.groupId).binding, {
        schema: "ccm-replay-repair-main-agent-dispatch-brief-assignment-ledger-v1",
        version: 1,
        groupId: scenario.groupId,
        entries: [scenario.entry],
        updatedAt: scenario.failedAt,
    });
    const writeOutcomes = (scenario, entries) => (0, memory_control_center_1.writeJsonAtomic)(filesFor(scenario.groupId).outcome, {
        schema: "ccm-worker-context-compact-outcome-ledger-v1",
        version: 1,
        groupId: scenario.groupId,
        entries,
        updatedAt: entries[entries.length - 1]?.at || scenario.failedAt,
    });
    try {
        for (const scenario of allScenarios) {
            writeBinding(scenario);
            writeOutcomes(scenario, [scenario.outcome]);
        }
        const activeFiles = filesFor(activeGroupId);
        fs.mkdirSync(activeFiles.typedDir, { recursive: true });
        (0, memory_control_center_1.writeJsonAtomic)(path.join(activeFiles.typedDir, ".distillation-ledger.json"), {
            schema: "ccm-group-typed-memory-distillation-ledger-v1",
            groupId: activeGroupId,
            postCompactCompletionMemoryPreservationClosureConflictResolutionArchive: {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-archive-v1",
                rows: [{ entry_id: active.summary.conflict_resolution_entry_id, immutable_marker: "PHASE193_ARCHIVE_SENTINEL" }],
                entry_count: 1,
            },
        });
        const firstReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds, generatedAt: "2026-07-12T03:20:00.000Z" });
        const firstIds = Object.fromEntries((firstReport.groups || []).map((group) => [group.groupId, group.items?.[0]?.id || ""]));
        const secondReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds, generatedAt: "2026-07-12T03:20:01.000Z" });
        const secondIds = Object.fromEntries((secondReport.groups || []).map((group) => [group.groupId, group.items?.[0]?.id || ""]));
        const candidateReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairDispatchCandidateReport)({ groupIds, workItemReport: secondReport });
        const briefReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairDispatchBriefReport)({ groupIds, candidateReport, generatedAt: "2026-07-12T03:20:02.000Z" });
        const candidates = (candidateReport.groups || []).flatMap((group) => group.candidates || []);
        const briefs = (briefReport.groups || []).flatMap((group) => group.briefs || []);
        const sameRetry = correctedFor(active, active.failedRetryId, "same-retry-new-outcome-phase193", "2026-07-12T03:21:00.000Z");
        const sameOutcome = correctedFor(active, "different-retry-same-outcome-phase193", active.failedOutcomeId, "2026-07-12T03:21:01.000Z");
        const stale = correctedFor(active, "stale-retry-phase193", "stale-outcome-phase193", "2026-07-12T02:59:59.000Z");
        writeOutcomes(active, [active.outcome, sameRetry, sameOutcome, stale]);
        const decoyCorrected = correctedFor(active, "decoy-retry-phase193", "decoy-outcome-phase193", "2026-07-12T03:22:00.000Z");
        (0, memory_control_center_1.writeJsonAtomic)(filesFor(decoyGroupId).outcome, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId: decoyGroupId,
            entries: [{ ...decoyCorrected, group_id: decoyGroupId }],
            updatedAt: decoyCorrected.at,
        });
        const rejectedReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds, generatedAt: "2026-07-12T03:22:01.000Z" });
        const rejectedActiveItem = rejectedReport.groups?.find((group) => group.groupId === activeGroupId)?.items?.[0] || {};
        const activeCorrected = correctedFor(active, "corrected-retry-phase193-active", "corrected-outcome-phase193-active", "2026-07-12T03:23:00.000Z");
        writeOutcomes(active, [active.outcome, sameRetry, sameOutcome, stale, activeCorrected]);
        const activeOnlyReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds, generatedAt: "2026-07-12T03:23:01.000Z" });
        const activeClosed = activeOnlyReport.groups?.find((group) => group.groupId === activeGroupId)?.items?.[0] || {};
        const reopenedStillOpen = activeOnlyReport.groups?.find((group) => group.groupId === reopenedGroupId)?.items?.[0] || {};
        const reopenedCorrected = correctedFor(reopened, "corrected-retry-phase193-reopened", "corrected-outcome-phase193-reopened", "2026-07-12T03:24:00.000Z");
        writeOutcomes(reopened, [reopened.outcome, reopenedCorrected]);
        const finalReport = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairWorkItemReport)({ groupIds, generatedAt: "2026-07-12T03:24:01.000Z" });
        const finalItems = (finalReport.groups || []).flatMap((group) => group.items || []);
        const finalClosure = (0, memory_control_center_1.buildPostCompactCompletionPreservationRepairClosureReport)({ groupIds, workItemReport: finalReport });
        const preservedArchive = (0, memory_control_center_1.readJson)(path.join(activeFiles.typedDir, ".distillation-ledger.json"), {})
            .postCompactCompletionMemoryPreservationClosureConflictResolutionArchive?.rows || [];
        const checks = {
            idempotentWorkItemsPerGroup: firstReport.overall?.requiredActionCount === 2
                && groupIds.every(groupId => firstIds[groupId] && firstIds[groupId] === secondIds[groupId]),
            candidatesCarryExactResolutionIdentity: candidateReport.overall?.status === "ok"
                && candidates.length === 2
                && candidates.every((candidate) => candidate.shouldCreateRealTask === false
                    && candidate.completion_preservation_conflict_resolution_present === true
                    && candidate.completion_preservation_conflict_resolution_doc_rel_paths?.includes(resolutionDoc)
                    && candidate.completion_preservation_conflict_resolution_entry_id
                    && candidate.completion_preservation_conflict_resolution_reversible === true
                    && candidate.completion_preservation_conflict_resolution_historical_branches_preserved === true),
            briefsAreSelfContainedAndNoRealTask: briefReport.overall?.status === "ok"
                && briefs.length === 2
                && briefs.every((brief) => brief.should_create_real_task === false
                    && brief.completion_preservation_conflict_resolution_entry_id
                    && /conflict.?resolution/i.test(String(brief.worker_task || ""))
                    && /Memory Center must not create/i.test(String(brief.worker_task || ""))),
            staleSameAndCrossGroupOutcomesCannotClose: (0, memory_control_center_1.replayRepairWorkItemOpen)(rejectedActiveItem.status)
                && !rejectedActiveItem.corrected_compact_outcome_id,
            oneGroupClosureCannotCloseAnother: activeClosed.status === "completed"
                && (0, memory_control_center_1.replayRepairWorkItemOpen)(reopenedStillOpen.status)
                && !reopenedStillOpen.corrected_compact_outcome_id,
            activeResolutionStrictlyCloses: activeClosed.corrected_retry_proof?.exact_conflict_resolution_restored === true
                && activeClosed.completion_preservation_conflict_resolution_active === true
                && activeClosed.completion_preservation_conflict_resolution_reopened === false,
            reopenedResolutionStrictlyCloses: finalItems.some((item) => item.group_id === reopenedGroupId
                && item.status === "completed"
                && item.corrected_retry_proof?.exact_conflict_resolution_restored === true
                && item.completion_preservation_conflict_resolution_reopened === true
                && item.completion_preservation_conflict_verification_acceptance_required === true),
            closureReportRequiresStrictResolutionProof: finalClosure.overall?.status === "ok"
                && Number(finalClosure.overall?.verifiedClosureCount || 0) === 2,
            immutableResolutionArchivePreserved: preservedArchive.some((row) => row.immutable_marker === "PHASE193_ARCHIVE_SENTINEL"
                && row.entry_id === active.summary.conflict_resolution_entry_id),
            memoryCenterCreatedNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            workItems: finalReport.overall,
            candidates: candidateReport.overall,
            briefs: briefReport.overall,
            closure: finalClosure.overall,
        };
    }
    finally {
        for (const groupId of [...groupIds, decoyGroupId]) {
            const files = filesFor(groupId);
            for (const file of [files.binding, `${files.binding}.bak`, files.outcome, `${files.outcome}.bak`, files.workItems, `${files.workItems}.bak`, files.dispatch, `${files.dispatch}.bak`]) {
                try {
                    if (file && fs.existsSync(file))
                        fs.unlinkSync(file);
                }
                catch { }
            }
            try {
                if (fs.existsSync(files.typedDir))
                    fs.rmSync(files.typedDir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterReplayRepairLedgerRetentionSafetySelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-retention-a-${suffix}`;
    const groupB = `memory-center-retention-b-${suffix}`;
    const workFileA = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupA);
    const workFileB = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupB);
    const outcomeFileA = (0, memory_control_center_1.getGroupWorkerContextCompactOutcomeLedgerFile)(groupA);
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive, verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive, } = require("../collaboration/group-memory-index");
    const resolutionRows = (groupId, count, marker) => Array.from({ length: count }, (_, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `task-${marker}-${index}`,
        task_text: `Retention task ${marker} ${index}`,
        task_family_key: `family-${marker}-${index}`,
        task_family_tokens: [marker, String(index)],
        entry_id: `resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `verified current source ${index}`,
        worker_context_packet_id: `packet-${marker}-${index}`,
        binding_id: `binding-${marker}-${index}`,
        task_agent_session_id: `task-session-${marker}-${index}`,
        native_session_id: `native-session-${marker}-${index}`,
        execution_id: `execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 4, 0, index)).toISOString(),
    }));
    const terminalNoise = (groupId, marker, index) => ({
        id: `terminal-noise-${marker}-${index}`,
        work_item_id: `terminal-noise-${marker}-${index}`,
        group_id: groupId,
        scopeId: groupId,
        source: "superseded_diagnostic_noise",
        repair_target: `noise-${index}`,
        status: "completed",
        resolutionReason: "superseded_by_newer_diagnostic",
        createdAt: new Date(Date.UTC(2026, 6, 12, 5, 0, index)).toISOString(),
        updatedAt: new Date(Date.UTC(2026, 6, 12, 5, 0, index)).toISOString(),
    });
    try {
        const distilledA = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupA, resolutionRows(groupA, 180, "a"), { updatedAt: "2026-07-12T04:10:00.000Z" });
        const distilledB = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupB, resolutionRows(groupB, 3, "b"), { updatedAt: "2026-07-12T04:11:00.000Z" });
        const oldOpen = {
            id: "old-open-repair-a",
            work_item_id: "old-open-repair-a",
            group_id: groupA,
            scopeId: groupA,
            source: "compact_boundary_replay_repair",
            repair_target: "old-open-boundary",
            status: "blocked",
            priority: "critical",
            createdAt: "2026-07-01T00:00:00.000Z",
            updatedAt: "2026-07-01T00:00:00.000Z",
        };
        const oldStrictProof = {
            id: "old-strict-proof-a",
            work_item_id: "old-strict-proof-a",
            group_id: groupA,
            scopeId: groupA,
            source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
            repair_target: "failed-outcome-retention-a",
            compact_outcome_id: "failed-outcome-retention-a",
            completion_preservation_conflict_resolution_present: true,
            completion_preservation_conflict_resolution_entry_id: "resolution-a-0",
            status: "completed",
            completion_source: "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry",
            corrected_retry_proof: {
                exact_identity_restored: true,
                exact_conflict_resolution_restored: true,
                conflict_resolution_reversible_boundary_restored: true,
            },
            createdAt: "2026-07-01T00:01:00.000Z",
            updatedAt: "2026-07-01T00:01:00.000Z",
        };
        const oldConflictBranch = {
            id: "old-conflict-branch-a",
            work_item_id: "old-conflict-branch-a",
            group_id: groupA,
            scopeId: groupA,
            source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
            repair_target: "failed-outcome-retention-a-branch",
            completion_preservation_conflict_resolution_present: true,
            completion_preservation_conflict_resolution_entry_id: "resolution-a-1",
            status: "completed",
            createdAt: "2026-07-01T00:02:00.000Z",
            updatedAt: "2026-07-01T00:02:00.000Z",
        };
        const crossGroupRow = {
            ...terminalNoise(groupB, "cross", 0),
            id: "cross-group-row-in-a",
            work_item_id: "cross-group-row-in-a",
        };
        const inputA = [oldOpen, oldStrictProof, oldConflictBranch, crossGroupRow, ...Array.from({ length: 220 }, (_, index) => terminalNoise(groupA, "a", index))];
        (0, memory_control_center_1.writeJsonAtomic)(workFileA, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId: groupA,
            items: inputA,
            updatedAt: "2026-07-12T05:10:00.000Z",
        });
        const inputB = Array.from({ length: 20 }, (_, index) => terminalNoise(groupB, "b", index));
        (0, memory_control_center_1.writeJsonAtomic)(workFileB, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId: groupB,
            items: inputB,
            updatedAt: "2026-07-12T05:11:00.000Z",
        });
        const beforeB = JSON.stringify((0, memory_control_center_1.readJson)(workFileB, {}));
        const compactedA = (0, memory_control_center_1.compactGroupReplayRepairWorkItemLedgerRetention)(groupA, { at: "2026-07-12T05:12:00.000Z" });
        const afterAOnlyB = JSON.stringify((0, memory_control_center_1.readJson)(workFileB, {}));
        const compactedB = (0, memory_control_center_1.compactGroupReplayRepairWorkItemLedgerRetention)(groupB, { at: "2026-07-12T05:13:00.000Z" });
        const completionSummary = (entryId) => ({
            schema: "ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1",
            present: true,
            completion_doc_rel_paths: ["post-compact-receipt-memory-usage-repair-completions.md"],
            required_doc_rel_paths: ["post-compact-completion-memory-preservation-closure-conflict-resolutions.md"],
            work_item_ids: [`completion-${entryId}`],
            timeline_binding_ids: [`timeline-${entryId}`],
            historical_task_agent_session_ids: [`historical-task-${entryId}`],
            historical_native_session_ids: [`historical-native-${entryId}`],
            current_session_binding_id: `current-binding-${entryId}`,
            current_task_agent_session_id: `current-task-${entryId}`,
            current_native_session_id: `current-native-${entryId}`,
            conflict_resolution_present: true,
            conflict_resolution_doc_rel_paths: ["post-compact-completion-memory-preservation-closure-conflict-resolutions.md"],
            conflict_resolution_active: true,
            conflict_resolution_reopened: false,
            conflict_resolution_state: "resolved",
            conflict_resolution_entry_id: entryId,
            conflict_resolution_usage_state: "verified",
            conflict_resolution_task_agent_session_id: `resolving-task-${entryId}`,
            conflict_resolution_native_session_id: `resolving-native-${entryId}`,
            conflict_resolution_reversible: true,
            conflict_resolution_historical_branches_preserved: true,
            conflict_resolution_reverification_acceptance_required: true,
            conflict_resolution_reversible_acceptance_required: true,
            conflict_verification_acceptance_required: false,
            usage_acceptance_required: true,
            current_session_acceptance_required: true,
            authority_boundary_valid: true,
        });
        const failedOutcome = (id, assignmentId, entryId) => {
            const before = completionSummary(entryId);
            return {
                schema: "ccm-worker-context-compact-outcome-entry-v1",
                outcome_id: id,
                group_id: groupA,
                assignment_id: assignmentId,
                dispatch_key: assignmentId,
                project: "api",
                hook_run_id: `hook-${id}`,
                retry_id: `retry-${id}`,
                status: "blocked",
                dispatch_ready: false,
                post_compact_receipt_memory_usage_repair_completion_preservation: {
                    schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
                    required: true,
                    preserved: false,
                    before,
                    after: { ...before, conflict_resolution_present: false, conflict_resolution_doc_rel_paths: [], conflict_resolution_entry_id: "" },
                    gaps: ["conflict_resolution_contract_missing_after_compact"],
                },
                post_compact_receipt_memory_usage_repair_completion_preserved: false,
                at: "2026-07-12T05:20:00.000Z",
            };
        };
        const unresolvedOutcome = failedOutcome("unresolved-failure-a", "unresolved-assignment-a", "resolution-a-0");
        const resolvedFailure = failedOutcome("resolved-failure-a", "resolved-assignment-a", "resolution-a-2");
        const resolvedSummary = completionSummary("resolution-a-2");
        const correctedOutcome = {
            ...resolvedFailure,
            outcome_id: "corrected-outcome-a",
            retry_id: "corrected-retry-a",
            hook_run_id: "corrected-hook-a",
            status: "recovered",
            dispatch_ready: true,
            post_compact_receipt_memory_usage_repair_completion_preservation: {
                schema: "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1",
                required: true,
                preserved: true,
                before: resolvedSummary,
                after: resolvedSummary,
                gaps: [],
            },
            post_compact_receipt_memory_usage_repair_completion_preserved: true,
            at: "2026-07-12T05:21:00.000Z",
        };
        const outcomeNoise = Array.from({ length: 150 }, (_, index) => ({
            schema: "ccm-worker-context-compact-outcome-entry-v1",
            outcome_id: `outcome-noise-a-${index}`,
            group_id: groupA,
            assignment_id: "noise-assignment-a",
            dispatch_key: "noise-assignment-a",
            project: "api",
            hook_run_id: `noise-hook-${index}`,
            retry_id: `noise-retry-${index}`,
            status: "recovered",
            dispatch_ready: true,
            at: new Date(Date.UTC(2026, 6, 12, 6, 0, index)).toISOString(),
        }));
        (0, memory_control_center_1.writeJsonAtomic)(outcomeFileA, {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId: groupA,
            entries: [
                unresolvedOutcome,
                resolvedFailure,
                correctedOutcome,
                { ...outcomeNoise[0], outcome_id: "cross-group-outcome-a", group_id: groupB },
                ...outcomeNoise,
            ],
            updatedAt: "2026-07-12T06:10:00.000Z",
        });
        const { compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator } = require("../collaboration/group-orchestrator");
        const compactedOutcomes = compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupA, {
            at: "2026-07-12T06:11:00.000Z",
            recentLimit: 100,
        });
        const outcomeIds = new Set((compactedOutcomes.entries || []).map((entry) => entry.outcome_id));
        const idsA = new Set((compactedA.items || []).map((item) => item.id || item.work_item_id));
        const archiveA = (0, memory_control_center_1.readJson)(path.join(typedDirA, ".distillation-ledger.json"), {})
            .postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
        const coldVerificationA = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA);
        const oldestColdLookupA = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, { resolutionEntryId: "resolution-a-0" }, { limit: 1 });
        const newestColdLookupA = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, { resolutionEntryId: "resolution-a-179" }, { limit: 1 });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["replay_repair_ledger_retention_safety", "worker_context_packet_compact_outcome_retention_safety"],
            groupIds: [groupA, groupB],
            refresh: true,
            writeTargeted: false,
        });
        const repairQuality = (qualityReport.checks || []).find((check) => check.id === "replay_repair_ledger_retention_safety") || {};
        const outcomeQuality = (qualityReport.checks || []).find((check) => check.id === "worker_context_packet_compact_outcome_retention_safety") || {};
        const checks = {
            oldOpenRepairSurvivesTerminalPressure: idsA.has(oldOpen.id)
                && Number(compactedA.retention?.dropped_open_count || 0) === 0,
            latestStrictProofSurvives: idsA.has(oldStrictProof.id)
                && Number(compactedA.retention?.dropped_verified_proof_count || 0) === 0,
            immutableConflictBranchIdentitySurvives: idsA.has(oldConflictBranch.id)
                && Number(compactedA.retention?.dropped_conflict_resolution_count || 0) === 0,
            supersededTerminalNoiseIsCompacted: !idsA.has("terminal-noise-a-0")
                && Number(compactedA.retention?.dropped_count || 0) >= 50
                && !!compactedA.retention?.dropped_digest,
            crossGroupRowsAreRejectedAndAudited: !idsA.has(crossGroupRow.id)
                && Number(compactedA.retention?.cross_group_rejected_count || 0) === 1
                && !!compactedA.retention?.cross_group_rejected_digest,
            compactingOneGroupDoesNotTouchAnother: beforeB === afterAOnlyB
                && compactedB.groupId === groupB,
            allResolutionBranchesRemainArchived: distilledA.archive?.archived_count === 180
                && archiveA.rows?.length === 160
                && !archiveA.rows?.some((row) => row.resolution_entry_id === "resolution-a-0")
                && archiveA.rows?.some((row) => row.resolution_entry_id === "resolution-a-179")
                && oldestColdLookupA.found === true
                && newestColdLookupA.found === true
                && coldVerificationA.valid === true
                && Number(coldVerificationA.rowCount || 0) === 180
                && archiveA.retention_policy === "checksum_addressed_cold_shards_bounded_hot_index_render_latest_100"
                && Number(archiveA.retention_pruned_count || 0) === 0,
            secondGroupArchiveIsIndependent: distilledB.archive?.archived_count === 3,
            unresolvedOutcomeSurvivesPressure: outcomeIds.has(unresolvedOutcome.outcome_id)
                && Number(compactedOutcomes.retention?.protected_unresolved_failure_count || 0) === 1
                && Number(compactedOutcomes.retention?.dropped_unresolved_failure_count || 0) === 0,
            resolvedFailureCanBeCompactedAfterStrictCorrection: !outcomeIds.has(resolvedFailure.outcome_id)
                && outcomeIds.has(correctedOutcome.outcome_id),
            outcomeCrossGroupRowsAreRejected: !outcomeIds.has("cross-group-outcome-a")
                && Number(compactedOutcomes.retention?.cross_group_rejected_count || 0) === 1,
            retentionQualityChecksPass: repairQuality.status === "ok"
                && Number(repairQuality.checked || 0) === 2
                && Number(repairQuality.passed || 0) === 2
                && outcomeQuality.status === "ok"
                && Number(outcomeQuality.checked || 0) === 1
                && Number(outcomeQuality.passed || 0) === 1,
            retentionNeverCreatesRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            retentionA: compactedA.retention,
            retentionB: compactedB.retention,
            archiveA: {
                archivedCount: archiveA.archived_count,
                immutableBranchCount: archiveA.immutable_branch_count,
                retentionPolicy: archiveA.retention_policy,
            },
            outcomeRetention: compactedOutcomes.retention,
            quality: (qualityReport.checks || []).map((check) => ({ id: check.id, status: check.status, checked: check.checked, passed: check.passed })),
        };
    }
    finally {
        for (const file of [workFileA, `${workFileA}.bak`, workFileB, `${workFileB}.bak`, outcomeFileA, `${outcomeFileA}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionColdArchiveSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cold-resolution-a-${suffix}`;
    const groupB = `memory-center-cold-resolution-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile, lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive, readGroupTypedMemoryDistillationLedger, restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows, verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive, } = require("../collaboration/group-memory-index");
    const rowsFor = (groupId, marker, count, offset = 0) => Array.from({ length: count }, (_, rawIndex) => {
        const index = rawIndex + offset;
        return {
            group_id: groupId,
            target_project: "api",
            task_id: `cold-task-${marker}-${index}`,
            task_text: `Cold archive task ${marker} ${index}`,
            task_family_key: `cold-family-${marker}-${index}`,
            task_family_tokens: ["cold", marker, String(index)],
            entry_id: `cold-resolution-${marker}-${index}`,
            conflict_resolution_state: index % 2 === 0 ? "verified" : "ignored",
            current_source_verified: index % 2 === 0,
            reason: `cold archive current-session decision ${marker}-${index}`,
            worker_context_packet_id: `cold-packet-${marker}-${index}`,
            binding_id: `cold-binding-${marker}-${index}`,
            task_agent_session_id: `cold-task-session-${marker}-${index}`,
            native_session_id: `cold-native-session-${marker}-${index}`,
            execution_id: `cold-execution-${marker}-${index}`,
            receipt_source: "child-agent-receipt",
            receipt_status: "completed",
            conflict_parent_arbitration_state: "contradictory_reverify_current_session",
            conflict_parent_fingerprint: `cold-fingerprint-${marker}-${index}`,
            conflict_parent_ratio: 0.5,
            conflict_parent_positive_weight: 1,
            conflict_parent_ignored_weight: 1,
            conflict_resolution_reversible: true,
            generated_at: new Date(Date.UTC(2026, 6, 12, 7, 0, index)).toISOString(),
        };
    });
    try {
        const firstA = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupA, rowsFor(groupA, "a", 400), {
            updatedAt: "2026-07-12T08:00:00.000Z",
            hotRowLimit: 40,
        });
        const firstB = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupB, rowsFor(groupB, "b", 5), {
            updatedAt: "2026-07-12T08:01:00.000Z",
            hotRowLimit: 40,
        });
        const ledgerAfterFirstA = readGroupTypedMemoryDistillationLedger(groupA);
        const archiveAfterFirstA = ledgerAfterFirstA.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
        const verificationAfterFirstA = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA);
        const oldestLookup = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1 });
        const familyLookup = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, {
            taskFamilyKey: "cold-family-a-0",
        }, { limit: 1 });
        const crossGroupLookup = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupB, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1 });
        const restore = restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupA, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1, restoredAt: "2026-07-12T08:02:00.000Z" });
        const archiveAfterRestore = readGroupTypedMemoryDistillationLedger(groupA).postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
        const secondA = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupA, rowsFor(groupA, "a", 1, 400), {
            updatedAt: "2026-07-12T08:03:00.000Z",
            hotRowLimit: 40,
        });
        const verificationAfterAppend = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA);
        const oldestAfterAppend = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1 });
        const manifestFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupA);
        const originalManifest = (0, memory_control_center_1.readJson)(manifestFile, {});
        const oldestDescriptor = (originalManifest.shards || []).find((shard) => (shard.resolution_entry_ids || []).includes("cold-resolution-a-0")) || {};
        const oldestShardFile = path.resolve(typedDirA, String(oldestDescriptor.rel_path || ""));
        const originalShard = (0, memory_control_center_1.readJson)(oldestShardFile, {});
        const shardRows = Array.isArray(originalShard.rows) ? originalShard.rows : [];
        (0, memory_control_center_1.writeJsonAtomic)(oldestShardFile, {
            ...originalShard,
            rows: shardRows.map((row, index) => index === 0 ? { ...row, reason: `${row.reason || ""} TAMPERED_PHASE195` } : row),
        });
        const verificationAfterShardTamper = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA);
        const lookupAfterShardTamper = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1 });
        const restoreAfterShardTamper = restorePostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveRows(groupA, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1 });
        const ledgerBeforeRejectedDistill = JSON.stringify((0, memory_control_center_1.readJson)(path.join(typedDirA, ".distillation-ledger.json"), {}));
        let rejectedTamperedDistill = false;
        try {
            distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupA, rowsFor(groupA, "a", 1, 401), {
                updatedAt: "2026-07-12T08:04:00.000Z",
                hotRowLimit: 40,
            });
        }
        catch {
            rejectedTamperedDistill = true;
        }
        const ledgerAfterRejectedDistill = JSON.stringify((0, memory_control_center_1.readJson)(path.join(typedDirA, ".distillation-ledger.json"), {}));
        (0, memory_control_center_1.writeJsonAtomic)(oldestShardFile, originalShard);
        const verificationAfterShardRestore = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA);
        (0, memory_control_center_1.writeJsonAtomic)(manifestFile, { ...originalManifest, row_count: Number(originalManifest.row_count || 0) + 1 });
        const lookupAfterManifestTamper = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, {
            resolutionEntryId: "cold-resolution-a-0",
        }, { limit: 1 });
        (0, memory_control_center_1.writeJsonAtomic)(manifestFile, originalManifest);
        const finalVerification = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA);
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_cold_archive_integrity"],
            groupIds: [groupA, groupB],
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const checks = {
            hotIndexIsBounded: firstA.archive?.archived_count === 400
                && firstA.archive?.rows?.length === 40
                && archiveAfterFirstA.hot_row_limit === 40
                && !archiveAfterFirstA.rows?.some((row) => row.resolution_entry_id === "cold-resolution-a-0"),
            manifestCoversEveryImmutableBranch: verificationAfterFirstA.valid === true
                && Number(verificationAfterFirstA.rowCount || 0) === 400
                && Number(verificationAfterFirstA.shardCount || 0) > 1
                && verificationAfterFirstA.verifiedShardCount === verificationAfterFirstA.shardCount,
            lazyLookupReadsOnlyMatchingShard: oldestLookup.found === true
                && oldestLookup.rows?.[0]?.resolution_entry_id === "cold-resolution-a-0"
                && oldestLookup.shardsRead === 1
                && familyLookup.found === true
                && familyLookup.shardsRead === 1,
            onDemandRestoreIsAuditOnlyAndBounded: restore.restored === true
                && restore.authorityBoundary === "audit_only_not_current_authority"
                && archiveAfterRestore.rows?.some((row) => row.resolution_entry_id === "cold-resolution-a-0")
                && archiveAfterRestore.rows?.length === 40
                && archiveAfterRestore.cold_restore_mode === "audit_only_not_current_authority",
            appendPreservesColdHistory: secondA.archive?.archived_count === 401
                && secondA.archive?.rows?.length === 40
                && verificationAfterAppend.valid === true
                && Number(verificationAfterAppend.rowCount || 0) === 401
                && oldestAfterAppend.found === true
                && oldestAfterAppend.rows?.[0]?.resolution_entry_id === "cold-resolution-a-0",
            shardsAreContentAddressed: !!oldestDescriptor.content_checksum
                && String(oldestDescriptor.rel_path || "").includes(String(oldestDescriptor.content_checksum || ""))
                && fs.existsSync(oldestShardFile),
            shardTamperIsDetectedAndBlocksRestore: verificationAfterShardTamper.valid === false
                && lookupAfterShardTamper.status === "tampered"
                && restoreAfterShardTamper.status === "blocked",
            tamperedArchiveCannotBeRedistilled: rejectedTamperedDistill === true
                && ledgerBeforeRejectedDistill === ledgerAfterRejectedDistill,
            restoredShardPassesFullVerification: verificationAfterShardRestore.valid === true,
            manifestTamperIsDetected: lookupAfterManifestTamper.status === "tampered"
                && lookupAfterManifestTamper.gaps?.includes("cold_archive_manifest_checksum_mismatch"),
            groupsRemainIsolated: firstB.archive?.archived_count === 5
                && crossGroupLookup.found === false
                && crossGroupLookup.status === "not_found",
            integrityQualityGatePasses: finalVerification.valid === true
                && quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_cold_archive_integrity"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
            coldArchiveCreatesNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            archive: {
                hotRowCount: secondA.archive?.rows?.length || 0,
                archivedCount: secondA.archive?.archived_count || 0,
                shardCount: verificationAfterAppend.shardCount || 0,
                manifestChecksum: verificationAfterAppend.manifest?.manifest_checksum || "",
            },
            lookup: { status: oldestLookup.status, shardsRead: oldestLookup.shardsRead, matchedRowCount: oldestLookup.matchedRowCount },
            tamper: { shardStatus: verificationAfterShardTamper.status, manifestStatus: lookupAfterManifestTamper.status },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionManifestGenerationGcSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cold-gc-a-${suffix}`;
    const groupB = `memory-center-cold-gc-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const workFileA = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairWorkItemsFile)(groupA);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile, lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration, verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations, } = require("../collaboration/group-memory-index");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `gc-task-${marker}-${index}`,
        task_text: `GC manifest task ${marker} ${index}`,
        task_family_key: `gc-family-${marker}-${index}`,
        task_family_tokens: ["gc", marker, String(index)],
        entry_id: `gc-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `gc current source verified ${marker}-${index}`,
        worker_context_packet_id: `gc-packet-${marker}-${index}`,
        binding_id: `gc-binding-${marker}-${index}`,
        task_agent_session_id: `gc-task-session-${marker}-${index}`,
        native_session_id: `gc-native-session-${marker}-${index}`,
        execution_id: `gc-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `gc-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 9, 0, index)).toISOString(),
    });
    const buildThreeGenerations = (groupId, marker) => {
        const initialRows = Array.from({ length: 40 }, (_, index) => rowFor(groupId, marker, index));
        const first = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initialRows, {
            updatedAt: "2026-07-12T09:10:00.000Z",
            hotRowLimit: 30,
        });
        const second = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, [rowFor(groupId, marker, 0)], {
            updatedAt: "2026-07-12T09:11:00.000Z",
            hotRowLimit: 30,
        });
        const third = distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, [rowFor(groupId, marker, 0)], {
            updatedAt: "2026-07-12T09:12:00.000Z",
            hotRowLimit: 30,
        });
        return { first, second, third };
    };
    try {
        const generationsA = buildThreeGenerations(groupA, "a");
        const generationsB = buildThreeGenerations(groupB, "b");
        const healthA = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupA);
        const healthB = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupB);
        (0, memory_control_center_1.writeJsonAtomic)(workFileA, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId: groupA,
            items: [{
                    id: "gc-open-repair-a",
                    work_item_id: "gc-open-repair-a",
                    group_id: groupA,
                    scopeId: groupA,
                    source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
                    status: "blocked",
                    completion_preservation_conflict_resolution_present: true,
                    completion_preservation_conflict_resolution_entry_id: "gc-resolution-a-0",
                }],
            updatedAt: "2026-07-12T09:13:00.000Z",
        });
        const protectedPass = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupA, {
            at: "2026-07-12T09:14:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: true,
        });
        const protectedFiles = (protectedPass.entries || []).filter((entry) => entry.status === "protected_open_repair")
            .map((entry) => path.resolve(typedDirA, entry.rel_path));
        const protectedFilesExistedBeforeRepairClosure = protectedFiles.length >= 1
            && protectedFiles.every((file) => fs.existsSync(file));
        (0, memory_control_center_1.writeJsonAtomic)(workFileA, {
            schema: "ccm-compact-boundary-replay-repair-work-items-v1",
            version: 1,
            groupId: groupA,
            items: [{
                    id: "gc-open-repair-a",
                    work_item_id: "gc-open-repair-a",
                    group_id: groupA,
                    scopeId: groupA,
                    source: memory_control_center_1.POST_COMPACT_COMPLETION_PRESERVATION_REPAIR_SOURCE,
                    status: "completed",
                    completion_preservation_conflict_resolution_present: true,
                    completion_preservation_conflict_resolution_entry_id: "gc-resolution-a-0",
                }],
            updatedAt: "2026-07-12T09:15:00.000Z",
        });
        const deletionPass = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupA, {
            at: "2026-07-12T09:16:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: true,
        });
        const firstDiscoveryB = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupB, {
            at: "2026-07-12T09:17:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: true,
        });
        const firstDiscoveryBFiles = (firstDiscoveryB.entries || []).filter((entry) => entry.status !== "deleted")
            .map((entry) => path.resolve(typedDirB, entry.rel_path));
        const lookupAfterDeletion = lookupPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupA, {
            resolutionEntryId: "gc-resolution-a-0",
        }, { limit: 1 });
        const manifestFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupA);
        const originalCurrentManifestA = (0, memory_control_center_1.readJson)(manifestFileA, {});
        (0, memory_control_center_1.writeJsonAtomic)(manifestFileA, { ...originalCurrentManifestA, row_count: Number(originalCurrentManifestA.row_count || 0) + 10 });
        const blockedDuringCurrentCrash = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupA, {
            at: "2026-07-12T09:18:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: true,
        });
        const recovery = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupA, {
            at: "2026-07-12T09:19:00.000Z",
        });
        const healthAfterRecovery = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupA);
        const previousGenerationFileA = healthAfterRecovery.previous?.manifestFile || healthAfterRecovery.previous?.manifest?.file || "";
        const originalPreviousManifestA = (0, memory_control_center_1.readJson)(previousGenerationFileA, {});
        (0, memory_control_center_1.writeJsonAtomic)(previousGenerationFileA, { ...originalPreviousManifestA, row_count: Number(originalPreviousManifestA.row_count || 0) + 1 });
        const healthAfterPreviousTamper = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupA);
        const blockedDuringPreviousTamper = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupA, {
            at: "2026-07-12T09:20:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: true,
        });
        (0, memory_control_center_1.writeJsonAtomic)(previousGenerationFileA, originalPreviousManifestA);
        const finalHealthA = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupA);
        const quarantineFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupB);
        const originalQuarantineB = (0, memory_control_center_1.readJson)(quarantineFileB, {});
        (0, memory_control_center_1.writeJsonAtomic)(quarantineFileB, {
            ...originalQuarantineB,
            entries: (originalQuarantineB.entries || []).map((entry) => ({ ...entry, first_seen_at: "2000-01-01T00:00:00.000Z" })),
        });
        const blockedDuringQuarantineTamper = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupB, {
            at: "2026-07-12T09:21:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: true,
        });
        const groupBFilesAfterQuarantineTamper = firstDiscoveryBFiles.map((file) => fs.existsSync(file));
        (0, memory_control_center_1.writeJsonAtomic)(quarantineFileB, originalQuarantineB);
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_manifest_generation_gc_safety"],
            groupIds: [groupA, groupB],
            refresh: true,
            writeTargeted: false,
            now: "2026-07-12T09:22:00.000Z",
            gracePeriodMs: 0,
        });
        const quality = qualityReport.checks?.[0] || {};
        const checks = {
            currentAndPreviousGenerationsVerify: healthA.valid === true
                && healthA.generationNumber === 3
                && healthA.currentGenerationCopyValid === true
                && healthA.previous?.valid === true
                && healthA.recoverySimulationPassed === true
                && healthB.valid === true,
            generationChainLinksExactChecksums: healthA.currentManifestChecksum === generationsA.third.archive?.cold_archive_manifest_checksum
                && healthA.previousManifestChecksum === generationsA.second.archive?.cold_archive_manifest_checksum
                && generationsA.first.archive?.cold_archive_manifest_checksum !== generationsA.second.archive?.cold_archive_manifest_checksum,
            openRepairProtectsOrphanShard: Number(protectedPass.protected_open_repair_count || 0) >= 1
                && Number(protectedPass.deleted_count || 0) === 0
                && protectedFiles.length >= 1
                && protectedFilesExistedBeforeRepairClosure,
            secondPassDeletesOnlyAfterRepairClosure: Number(deletionPass.deleted_count || 0) >= 1
                && (deletionPass.entries || []).filter((entry) => entry.status === "deleted").every((entry) => entry.shard_valid === true
                    && entry.recovery_covered === true
                    && entry.referenced_by_open_repair === false),
            deletionPreservesEveryCurrentRow: lookupAfterDeletion.found === true
                && lookupAfterDeletion.rows?.[0]?.resolution_entry_id === "gc-resolution-a-0"
                && verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupA).valid === true,
            firstDiscoveryNeverDeletesSameRun: Number(firstDiscoveryB.deleted_count || 0) === 0
                && Number(firstDiscoveryB.quarantined_count || 0) >= 1
                && firstDiscoveryBFiles.every((file) => fs.existsSync(file)),
            currentManifestCrashBlocksGc: blockedDuringCurrentCrash.generation_chain_valid === false
                && Number(blockedDuringCurrentCrash.deleted_count || 0) === Number(deletionPass.deleted_count || 0),
            latestValidGenerationRecoversCurrentPointer: recovery.recovered === true
                && recovery.selectedGenerationNumber === 3
                && healthAfterRecovery.valid === true
                && healthAfterRecovery.currentManifestChecksum === originalCurrentManifestA.manifest_checksum,
            previousGenerationTamperBlocksGc: healthAfterPreviousTamper.valid === false
                && healthAfterPreviousTamper.gaps?.includes("previous_manifest_generation_invalid")
                && blockedDuringPreviousTamper.generation_chain_valid === false,
            restoringPreviousGenerationRestoresChain: finalHealthA.valid === true
                && finalHealthA.previous?.valid === true
                && finalHealthA.recoverySimulationPassed === true,
            quarantineTamperCannotBypassGrace: blockedDuringQuarantineTamper.quarantine_input_valid === false
                && Number(blockedDuringQuarantineTamper.deleted_count || 0) === 0
                && (blockedDuringQuarantineTamper.entries || []).some((entry) => entry.status === "blocked_quarantine_integrity")
                && groupBFilesAfterQuarantineTamper.every(Boolean),
            quarantineAndGcRemainGroupIsolated: generationsB.third.archive?.archived_count === 40
                && firstDiscoveryB.group_id === groupB
                && deletionPass.group_id === groupA,
            generationGcQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_manifest_generation_gc_safety"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
            manifestGcCreatesNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            generation: {
                current: finalHealthA.currentManifestChecksum,
                previous: finalHealthA.previousManifestChecksum,
                generationNumber: finalHealthA.generationNumber,
                recoverySimulationPassed: finalHealthA.recoverySimulationPassed,
            },
            quarantine: {
                protected: protectedPass.protected_open_repair_count,
                deleted: deletionPass.deleted_count,
                firstDiscoveryDeleted: firstDiscoveryB.deleted_count,
            },
            recovery,
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const file of [workFileA, `${workFileA}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceControllerSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-maintenance-a-${suffix}`;
    const groupB = `memory-center-maintenance-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, } = require("../collaboration/group-memory-index");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `maintenance-task-${marker}-${index}`,
        task_text: `Maintenance controller task ${marker} ${index}`,
        task_family_key: `maintenance-family-${marker}-${index}`,
        task_family_tokens: ["maintenance", marker, String(index)],
        entry_id: `maintenance-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `maintenance current source verified ${marker}-${index}`,
        worker_context_packet_id: `maintenance-packet-${marker}-${index}`,
        binding_id: `maintenance-binding-${marker}-${index}`,
        task_agent_session_id: `maintenance-task-session-${marker}-${index}`,
        native_session_id: `maintenance-native-session-${marker}-${index}`,
        execution_id: `maintenance-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `maintenance-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 10, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 48 }, (_, index) => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, {
            updatedAt: "2026-07-12T10:00:00.000Z",
            hotRowLimit: 30,
        });
        const updates = [0, 1, 2, 3].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, {
            updatedAt: "2026-07-12T10:01:00.000Z",
            hotRowLimit: 30,
        });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, {
            updatedAt: "2026-07-12T10:02:00.000Z",
            hotRowLimit: 30,
        });
        return reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
            at: "2026-07-12T10:03:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: false,
        });
    };
    try {
        const quarantineA = seed(groupA, "a");
        const quarantineB = seed(groupB, "b");
        const dueRun = runDuePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance([groupA, groupB], {
            at: "2026-07-12T10:04:00.000Z",
            force: true,
            gracePeriodMs: 0,
            intervalMs: 60_000,
        });
        const directBackgroundRun = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
            at: "2026-07-12T10:04:30.000Z",
            trigger: "timer",
            gracePeriodMs: 0,
        });
        const statusAfterBackground = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
            at: "2026-07-12T10:04:40.000Z",
            gracePeriodMs: 0,
        });
        let missingExplicitApprovalRejected = false;
        let invalidActorRejected = false;
        try {
            createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
                at: "2026-07-12T10:05:00.000Z",
                actorRole: "group-main-agent",
                actorId: "main-a",
                reason: "missing explicit approval",
                gracePeriodMs: 0,
            });
        }
        catch {
            missingExplicitApprovalRejected = true;
        }
        try {
            createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
                at: "2026-07-12T10:05:00.000Z",
                explicitApproval: true,
                actorRole: "background-timer",
                actorId: "timer-a",
                reason: "invalid actor",
                gracePeriodMs: 0,
            });
        }
        catch {
            invalidActorRejected = true;
        }
        const staleReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:05:00.000Z",
            explicitApproval: true,
            actorRole: "group-main-agent",
            actorId: "main-a",
            reason: "approve exact eligible shards before generation changes",
            gracePeriodMs: 0,
        });
        const backgroundExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:05:10.000Z",
            receiptId: staleReceipt.receipt_id,
            explicitExecution: true,
            trigger: "cron",
            gracePeriodMs: 0,
        });
        const crossGroupExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupB, {
            at: "2026-07-12T10:05:20.000Z",
            receiptId: staleReceipt.receipt_id,
            explicitExecution: true,
            trigger: "manual",
            gracePeriodMs: 0,
        });
        const expiredReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:05:30.000Z",
            explicitApproval: true,
            actorRole: "global-agent",
            actorId: "global-a",
            reason: "short lived approval for expiry test",
            gracePeriodMs: 0,
            expiresInMs: 60_000,
        });
        const expiredExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:07:00.000Z",
            receiptId: expiredReceipt.receipt_id,
            explicitExecution: true,
            trigger: "manual",
            gracePeriodMs: 0,
        });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupA, [rowFor(groupA, "a", 48)], {
            updatedAt: "2026-07-12T10:06:00.000Z",
            hotRowLimit: 30,
        });
        const staleExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:07:10.000Z",
            receiptId: staleReceipt.receipt_id,
            explicitExecution: true,
            trigger: "manual",
            gracePeriodMs: 0,
        });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupA, {
            at: "2026-07-12T10:08:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: false,
        });
        const eligiblePreview = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupA, {
            at: "2026-07-12T10:09:00.000Z",
            gracePeriodMs: 0,
            dryRun: true,
        });
        const selectedCandidate = (eligiblePreview.entries || []).find((entry) => entry.status === "eligible") || {};
        const finalReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:09:10.000Z",
            explicitApproval: true,
            actorRole: "group-main-agent",
            actorId: "main-a",
            reason: "approve one exact shard after current generation revalidation",
            gracePeriodMs: 0,
            candidateRelPaths: [selectedCandidate.rel_path],
            expiresInMs: 10 * 60 * 1000,
        });
        const approvalFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA);
        const originalApprovalLedger = (0, memory_control_center_1.readJson)(approvalFile, {});
        (0, memory_control_center_1.writeJsonAtomic)(approvalFile, {
            ...originalApprovalLedger,
            entries: (originalApprovalLedger.entries || []).map((entry) => entry.receipt_id === finalReceipt.receipt_id ? { ...entry, reason: `${entry.reason} TAMPERED_PHASE197` } : entry),
        });
        const tamperedReceiptExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:09:20.000Z",
            receiptId: finalReceipt.receipt_id,
            explicitExecution: true,
            trigger: "manual",
            gracePeriodMs: 0,
        });
        (0, memory_control_center_1.writeJsonAtomic)(approvalFile, originalApprovalLedger);
        const approvedFile = path.resolve(typedDirA, selectedCandidate.rel_path || "");
        const approvedFileBeforeExecution = !!selectedCandidate.rel_path && fs.existsSync(approvedFile);
        const finalExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:10:00.000Z",
            receiptId: finalReceipt.receipt_id,
            explicitExecution: true,
            trigger: "manual",
            gracePeriodMs: 0,
        });
        const replayExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalReceipt(groupA, {
            at: "2026-07-12T10:10:10.000Z",
            receiptId: finalReceipt.receipt_id,
            explicitExecution: true,
            trigger: "manual",
            gracePeriodMs: 0,
        });
        const finalStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
            at: "2026-07-12T10:10:20.000Z",
            gracePeriodMs: 0,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_controller"],
            groupIds: [groupA, groupB],
            refresh: true,
            writeTargeted: false,
            now: "2026-07-12T10:10:30.000Z",
            gracePeriodMs: 0,
        });
        const quality = qualityReport.checks?.[0] || {};
        const checks = {
            backgroundDueRunIsReadOnly: dueRun.dueCount === 2
                && dueRun.deletedCount === 0
                && dueRun.destructiveActionAuthorized === false
                && dueRun.rows?.every((row) => row.run?.mode === "verify_and_quarantine_dry_run_only"
                    && row.run?.deletion_attempted === false),
            directTimerRunCannotAuthorizeDeletion: directBackgroundRun.background_trigger === true
                && directBackgroundRun.destructive_action_authorized === false
                && directBackgroundRun.deletion_attempted === false,
            recommendationsReachBothAgentsWithoutTasks: statusAfterBackground.latestRun?.group_main_agent_recommendation?.owner === "group-main-agent"
                && statusAfterBackground.latestRun?.group_main_agent_recommendation?.should_create_real_task === false
                && statusAfterBackground.latestRun?.global_agent_recommendation?.owner === "global-agent"
                && statusAfterBackground.latestRun?.global_agent_recommendation?.cross_group_authorization_allowed === false,
            approvalRequiresExplicitTrustedActor: missingExplicitApprovalRejected === true && invalidActorRejected === true,
            approvalBindsExactCurrentState: staleReceipt.group_id === groupA
                && staleReceipt.current_manifest_checksum
                && staleReceipt.previous_manifest_checksum
                && staleReceipt.quarantine_checksum
                && staleReceipt.receipt_checksum
                && staleReceipt.single_use === true
                && staleReceipt.candidates?.length >= 1,
            backgroundExecutionIsBlocked: backgroundExecution.status === "blocked"
                && backgroundExecution.reason === "background_trigger_cannot_authorize_destructive_gc",
            crossGroupReceiptCannotExecute: crossGroupExecution.status === "blocked"
                && crossGroupExecution.reason === "approval_receipt_not_found",
            expiredReceiptCannotExecute: expiredExecution.status === "blocked"
                && expiredExecution.reason === "approval_receipt_expired",
            generationChangeInvalidatesReceipt: staleExecution.status === "blocked"
                && staleExecution.reason === "approval_receipt_generation_stale",
            tamperedReceiptCannotExecute: tamperedReceiptExecution.status === "blocked"
                && tamperedReceiptExecution.reason === "approval_receipt_checksum_invalid",
            validReceiptDeletesOnlyApprovedShard: approvedFileBeforeExecution
                && finalExecution.status === "executed"
                && finalExecution.deleted_count === 1
                && finalExecution.deleted_rel_paths?.length === 1
                && finalExecution.deleted_rel_paths?.[0] === selectedCandidate.rel_path
                && !fs.existsSync(approvedFile),
            consumedReceiptCannotReplay: replayExecution.status === "blocked"
                && replayExecution.reason === "approval_receipt_already_consumed",
            maintenanceStatusAuditsReceiptLifecycle: finalStatus.status === "ok"
                && finalStatus.consumedApprovalCount >= 1
                && finalStatus.invalidApprovalCount === 0
                && finalStatus.backgroundDeletionAuthorized === false,
            maintenanceControllerQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_controller"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
            controllerMaintainsGroupIsolation: quarantineA.group_id === groupA
                && quarantineB.group_id === groupB
                && finalExecution.groupId === groupA,
            maintenanceCreatesNoRealTask: (0, db_1.loadTasks)().length === tasksBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            dueRun: { dueCount: dueRun.dueCount, deletedCount: dueRun.deletedCount },
            receipt: {
                receiptId: finalReceipt.receipt_id,
                candidateCount: finalReceipt.candidates?.length || 0,
                deletedCount: finalExecution.deleted_count || 0,
                replayReason: replayExecution.reason || "",
            },
            recommendations: {
                groupMainAgent: statusAfterBackground.latestRun?.group_main_agent_recommendation,
                globalAgent: statusAfterBackground.latestRun?.global_agent_recommendation,
            },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceSchedulerSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-scheduler-a-${suffix}`;
    const groupB = `memory-center-scheduler-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const stateFile = path.join(memory_control_center_1.CONTROL_DIR, `conflict-resolution-maintenance-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, } = require("../collaboration/group-memory-index");
    const { getConflictResolutionMemoryMaintenanceSchedulerStatus, runConflictResolutionMemoryMaintenanceSchedulerTick, } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `scheduler-task-${marker}-${index}`,
        task_text: `Scheduler maintenance task ${marker} ${index}`,
        task_family_key: `scheduler-family-${marker}-${index}`,
        task_family_tokens: ["scheduler", marker, String(index)],
        entry_id: `scheduler-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `scheduler current source verified ${marker}-${index}`,
        worker_context_packet_id: `scheduler-packet-${marker}-${index}`,
        binding_id: `scheduler-binding-${marker}-${index}`,
        task_agent_session_id: `scheduler-task-session-${marker}-${index}`,
        native_session_id: `scheduler-native-session-${marker}-${index}`,
        execution_id: `scheduler-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `scheduler-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 11, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T10:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
            at: "2026-07-12T10:58:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: false,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA);
        const approvalFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB);
        const firstTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:00:00.000Z",
            groupIds: [groupA, groupB],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const firstStatusA = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, { at: "2026-07-12T11:00:01.000Z", gracePeriodMs: 0 });
        const firstMaintenanceEntryCount = Number(firstStatusA.latestRun ? (0, memory_control_center_1.readJson)(firstStatusA.maintenanceFile, {})?.entries?.length || 0 : 0);
        const secondSameWindowTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:00:20.000Z",
            groupIds: [groupA, groupB],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const simulatedRestartTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:00:40.000Z",
            groupIds: [groupA, groupB],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const maintenanceEntryCountAfterSameWindow = Number((0, memory_control_center_1.readJson)(firstStatusA.maintenanceFile, {})?.entries?.length || 0);
        const nextWindowTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:01:01.000Z",
            groupIds: [groupA, groupB],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const statusAfterNextWindowA = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, { at: "2026-07-12T11:01:02.000Z", gracePeriodMs: 0 });
        const statusAfterNextWindowB = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupB, { at: "2026-07-12T11:01:02.000Z", gracePeriodMs: 0 });
        const failureTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:02:00.000Z",
            groupIds: [groupA],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            baseBackoffMs: 1_000,
            maxBackoffMs: 8_000,
            runMaintenance: () => { throw new Error("PHASE198_INJECTED_MAINTENANCE_FAILURE"); },
        });
        const duringBackoffTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:02:00.500Z",
            groupIds: [groupA],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            baseBackoffMs: 1_000,
            maxBackoffMs: 8_000,
        });
        const recoveredAfterBackoffTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T11:02:02.000Z",
            groupIds: [groupA],
            force: true,
            stateFile,
            tickWindowMs: 60_000,
            baseBackoffMs: 1_000,
            maxBackoffMs: 8_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const finalSchedulerStatus = getConflictResolutionMemoryMaintenanceSchedulerStatus();
        const finalState = (0, memory_control_center_1.readJson)(stateFile, {});
        const finalStatusA = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, { at: "2026-07-12T11:02:03.000Z", gracePeriodMs: 0 });
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesA = (0, memory_control_center_1.readJson)(approvalFileA, {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(approvalFileB, {})?.entries || [];
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_scheduler"],
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const notificationsA = finalStatusA.notifications || [];
        const notificationsB = statusAfterNextWindowB.notifications || [];
        const checks = {
            schedulerFirstTickRunsBothGroupsReadOnly: firstTick.completedCount === 2
                && firstTick.deletedCount === 0
                && firstTick.createdTaskCount === 0
                && firstTick.createdApprovalReceiptCount === 0,
            sameWindowTickIsIdempotentlySuppressed: secondSameWindowTick.duplicateSuppressedCount === 2
                && simulatedRestartTick.duplicateSuppressedCount === 2
                && maintenanceEntryCountAfterSameWindow === firstMaintenanceEntryCount,
            nextWindowRunsWithoutDuplicateNotifications: nextWindowTick.completedCount === 2
                && statusAfterNextWindowA.notificationCount === 2
                && statusAfterNextWindowB.notificationCount === 2
                && (statusAfterNextWindowA.notifications || []).every((entry) => Number(entry.seen_count || 0) >= 2)
                && (statusAfterNextWindowB.notifications || []).every((entry) => Number(entry.seen_count || 0) >= 2),
            notificationsAreAdvisoryAndDeduplicated: notificationsA.length === 2
                && notificationsB.length === 2
                && notificationsA.some((entry) => entry.audience === "group-main-agent")
                && notificationsA.some((entry) => entry.audience === "global-agent")
                && [...notificationsA, ...notificationsB].every((entry) => entry.advisory_only === true
                    && entry.destructive_action_authorized === false
                    && entry.should_create_real_task === false
                    && entry.cross_group_authorization_allowed === false),
            failureEntersPersistentBackoff: failureTick.failedCount === 1
                && duringBackoffTick.backoffCount === 1
                && String(finalState.groups?.[groupA]?.last_error || "").includes("PHASE198_INJECTED_MAINTENANCE_FAILURE") === false,
            retryAfterBackoffRecovers: recoveredAfterBackoffTick.completedCount === 1
                && Number(finalState.groups?.[groupA]?.failure_count || 0) === 0
                && finalState.groups?.[groupA]?.last_status === "completed",
            schedulerNeverCreatesApprovalReceipts: approvalEntriesA.length === 0 && approvalEntriesB.length === 0,
            schedulerNeverDeletesShards: shardCountAfter === shardCountBefore
                && [firstTick, secondSameWindowTick, simulatedRestartTick, nextWindowTick, failureTick, duringBackoffTick, recoveredAfterBackoffTick]
                    .every((tick) => Number(tick.deletedCount || 0) === 0 && tick.destructiveActionAuthorized === false),
            schedulerNeverCreatesTasks: (0, db_1.loadTasks)().length === tasksBefore
                && [firstTick, nextWindowTick, recoveredAfterBackoffTick].every((tick) => Number(tick.createdTaskCount || 0) === 0),
            schedulerStatusPreservesSafetyBoundary: finalSchedulerStatus.safe === true
                && finalSchedulerStatus.policy === "scheduler_verify_dry_run_only_no_task_no_approval_no_delete"
                && finalSchedulerStatus.latest?.destructiveActionAuthorized === false,
            schedulerQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_scheduler"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
            schedulerMaintainsGroupIsolation: firstTick.rows?.some((row) => row.groupId === groupA)
                && firstTick.rows?.some((row) => row.groupId === groupB)
                && notificationsA.every((entry) => entry.group_id === groupA)
                && notificationsB.every((entry) => entry.group_id === groupB),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            ticks: {
                firstCompleted: firstTick.completedCount,
                duplicateSuppressed: secondSameWindowTick.duplicateSuppressedCount,
                restartSuppressed: simulatedRestartTick.duplicateSuppressedCount,
                failed: failureTick.failedCount,
                backoff: duringBackoffTick.backoffCount,
                recovered: recoveredAfterBackoffTick.completedCount,
            },
            notifications: {
                groupA: notificationsA.map((entry) => ({ audience: entry.audience, seenCount: entry.seen_count })),
                groupB: notificationsB.map((entry) => ({ audience: entry.audience, seenCount: entry.seen_count })),
            },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const file of [stateFile, `${stateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationContextSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-notification-a-${suffix}`;
    const groupB = `memory-center-notification-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification, buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification, } = require("../collaboration/group-memory-index");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `notification-task-${marker}-${index}`,
        task_text: `Notification context task ${marker} ${index}`,
        task_family_key: `notification-family-${marker}-${index}`,
        task_family_tokens: ["notification", marker, String(index)],
        entry_id: `notification-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `notification current source verified ${marker}-${index}`,
        worker_context_packet_id: `notification-packet-${marker}-${index}`,
        binding_id: `notification-binding-${marker}-${index}`,
        task_agent_session_id: `notification-task-session-${marker}-${index}`,
        native_session_id: `notification-native-session-${marker}-${index}`,
        execution_id: `notification-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `notification-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 10, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T10:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
            at: "2026-07-12T10:58:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: false,
        });
        return runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, {
            at: "2026-07-12T11:00:00.000Z",
            trigger: "background",
            gracePeriodMs: 0,
            emitNotifications: true,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const at = "2026-07-12T11:01:00.000Z";
        const groupContextBefore = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "group-main-agent", { at });
        const globalContextBeforeA = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "global-agent", { at });
        const mainNotification = groupContextBefore.notifications?.[0] || {};
        const globalNotification = globalContextBeforeA.notifications?.[0] || {};
        const { buildCoordinatorPrompt } = require("../collaboration/group-orchestrator");
        const coordinatorPrompt = buildCoordinatorPrompt({
            group: { id: groupA, name: "Notification A", members: [] },
            context: "self-test context",
            message: "inspect maintenance",
            maintenanceAt: at,
        });
        const { buildAgenticContext } = require("../global/global-agent");
        const globalAgentContext = buildAgenticContext("maintenance", "notification-global-session", {
            groups: [{ id: groupA, name: "Notification A", members: [] }, { id: groupB, name: "Notification B", members: [] }],
            at,
        });
        let suppressionWithoutReasonRejected = false;
        let wrongAudienceRejected = false;
        let crossGroupRejected = false;
        try {
            suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupA, {
                audience: "global-agent", notificationId: globalNotification.notification_id, actorId: "global", sessionId: "global-session", at,
            });
        }
        catch {
            suppressionWithoutReasonRejected = true;
        }
        try {
            acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupA, {
                audience: "global-agent", notificationId: mainNotification.notification_id, actorId: "global", sessionId: "global-session", at,
            });
        }
        catch {
            wrongAudienceRejected = true;
        }
        try {
            acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupB, {
                audience: "group-main-agent", notificationId: mainNotification.notification_id, actorId: "main-b", sessionId: "main-b-session", at,
            });
        }
        catch {
            crossGroupRejected = true;
        }
        const shardCountBeforeReceipts = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const ack = acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupA, {
            audience: "group-main-agent", notificationId: mainNotification.notification_id, actorId: "main-a", sessionId: "main-a-session", at,
        });
        const suppression = suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupA, {
            audience: "global-agent", notificationId: globalNotification.notification_id, actorId: "global", sessionId: "global-session", reason: "operator reviewing archive health", at,
        });
        const groupContextAfterAck = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "group-main-agent", { at: "2026-07-12T11:02:00.000Z" });
        const globalContextAfterSuppression = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "global-agent", { at: "2026-07-12T11:02:00.000Z" });
        const shardCountAfterReceipts = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesAfterReceipts = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const changedRows = Array.from({ length: 8 }, (_, index) => rowFor(groupA, "changed", 100 + index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupA, changedRows, { updatedAt: "2026-07-12T11:03:00.000Z", hotRowLimit: 24 });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
            at: "2026-07-12T11:04:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true,
        });
        const changedGroupContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "group-main-agent", { at: "2026-07-12T11:04:01.000Z" });
        const changedGlobalContext = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "global-agent", { at: "2026-07-12T11:04:01.000Z" });
        let staleReceiptRejected = false;
        try {
            acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupA, {
                audience: "group-main-agent", notificationId: mainNotification.notification_id, actorId: "main-a", sessionId: "main-a-session-2", at: "2026-07-12T11:04:02.000Z",
            });
        }
        catch {
            staleReceiptRejected = true;
        }
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_context"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T11:04:03.000Z",
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const checks = {
            coordinatorPromptReceivesOnlyCurrentGroupNotification: groupContextBefore.pending_count === 1
                && coordinatorPrompt.includes(mainNotification.notification_id)
                && !coordinatorPrompt.includes(groupB),
            globalAgentExcludesGroupMaintenanceAdvisories: globalAgentContext.conflict_resolution_maintenance_notifications == null
                && globalAgentContext.conflict_resolution_maintenance_delivery_health == null,
            acknowledgementHidesExactAudienceState: ack.receipt_kind === "acknowledged"
                && ack.advisory_visibility_only === true
                && groupContextAfterAck.pending_count === 0,
            suppressionRequiresReasonAndHidesExactAudienceState: suppressionWithoutReasonRejected === true
                && suppression.receipt_kind === "suppressed"
                && suppression.reason === "operator reviewing archive health"
                && globalContextAfterSuppression.pending_count === 0,
            wrongAudienceCrossGroupAndStaleUseRejected: wrongAudienceRejected === true && crossGroupRejected === true && staleReceiptRejected === true,
            changedStateReappearsForBothAudiences: changedGroupContext.pending_count === 1
                && changedGlobalContext.pending_count === 1
                && changedGroupContext.notifications?.[0]?.state_fingerprint !== ack.state_fingerprint
                && changedGlobalContext.notifications?.[0]?.state_fingerprint !== suppression.state_fingerprint,
            notificationConsumptionIsNonDestructive: shardCountAfterReceipts === shardCountBeforeReceipts
                && approvalEntriesAfterReceipts.length === 0
                && (0, db_1.loadTasks)().length === tasksBefore,
            notificationSafetyFlagsRemainHardFalse: [...(changedGroupContext.notifications || []), ...(changedGlobalContext.notifications || [])]
                .every((entry) => entry.advisory_only === true
                && entry.destructive_action_authorized === false
                && entry.should_create_real_task === false
                && entry.cross_group_authorization_allowed === false),
            notificationContextQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_context"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            pending: {
                groupBefore: groupContextBefore.pending_count,
                groupAfterAck: groupContextAfterAck.pending_count,
                globalAfterSuppression: globalContextAfterSuppression.pending_count,
                groupAfterStateChange: changedGroupContext.pending_count,
                globalAfterStateChange: changedGlobalContext.pending_count,
            },
            receipts: { acknowledgement: ack.receipt_id, suppression: suppression.receipt_id },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryHealthSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-delivery-a-${suffix}`;
    const groupB = `memory-center-delivery-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, } = require("../collaboration/group-memory-index");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `delivery-task-${marker}-${index}`,
        task_text: `Delivery health task ${marker} ${index}`,
        task_family_key: `delivery-family-${marker}-${index}`,
        task_family_tokens: ["delivery", marker, String(index)],
        entry_id: `delivery-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `delivery current source verified ${marker}-${index}`,
        worker_context_packet_id: `delivery-packet-${marker}-${index}`,
        binding_id: `delivery-binding-${marker}-${index}`,
        task_agent_session_id: `delivery-task-session-${marker}-${index}`,
        native_session_id: `delivery-native-session-${marker}-${index}`,
        execution_id: `delivery-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `delivery-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 10, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T10:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
            at: "2026-07-12T10:58:00.000Z",
            gracePeriodMs: 0,
            deleteEligible: false,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const manifestFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupA);
        const manifestA = (0, memory_control_center_1.readJson)(manifestFileA, {});
        fs.writeFileSync(manifestFileA, JSON.stringify({ ...manifestA, manifest_checksum: "phase200-intentionally-invalid-manifest" }, null, 2), "utf-8");
        for (const at of ["2026-07-12T11:00:00.000Z", "2026-07-12T11:10:00.000Z", "2026-07-12T11:20:00.000Z"]) {
            runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
                at, trigger: "background", gracePeriodMs: 0, emitNotifications: true,
            });
        }
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupB, {
            at: "2026-07-12T11:20:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true,
        });
        const healthBefore = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, {
            at: "2026-07-12T11:31:00.000Z", unseenAfterMs: 5 * 60 * 1000, repeatThreshold: 3,
        });
        const shardCountBeforeDelivery = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const { buildCoordinatorMaintenanceNotificationInstructions } = require("../collaboration/group-orchestrator");
        const mainDelivery = buildCoordinatorMaintenanceNotificationInstructions({ id: groupA, members: [] }, {
            at: "2026-07-12T11:31:01.000Z",
            contextId: "phase200-main-context",
            sessionId: "phase200-main-session",
            recordDelivery: true,
        });
        const repeatedMainDelivery = buildCoordinatorMaintenanceNotificationInstructions({ id: groupA, members: [] }, {
            at: "2026-07-12T11:31:02.000Z",
            contextId: "phase200-main-context",
            sessionId: "phase200-main-session",
            recordDelivery: true,
        });
        const healthAfterMain = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, {
            at: "2026-07-12T11:31:03.000Z", unseenAfterMs: 5 * 60 * 1000, repeatThreshold: 3,
        });
        const { buildAgenticContext } = require("../global/global-agent");
        const globalContext = buildAgenticContext("inspect critical maintenance delivery", "phase200-global-session", {
            at: "2026-07-12T11:31:04.000Z",
            recordDelivery: true,
            contextId: "phase200-global-context",
            groups: [{ id: groupA, name: "Delivery A", members: [] }, { id: groupB, name: "Delivery B", members: [] }],
        });
        const healthAfterGlobal = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, {
            at: "2026-07-12T11:31:05.000Z", unseenAfterMs: 5 * 60 * 1000, repeatThreshold: 3,
        });
        const unsafeCrossGroupRecord = recordPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDelivery(groupB, "group-main-agent", mainDelivery.context?.notifications || [], { at: "2026-07-12T11:31:06.000Z", contextId: "cross-group", consumerSessionId: "cross-group-session" });
        const deliveryLedgerA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA), {});
        const mainDeliveryEntry = (deliveryLedgerA.entries || []).find((entry) => entry.audience === "group-main-agent") || {};
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_health"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T11:31:07.000Z",
            unseenAfterMs: 5 * 60 * 1000,
            repeatThreshold: 3,
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const shardCountAfterDelivery = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const criticalRows = healthBefore.rows?.filter((row) => row.severity === "critical") || [];
        const checks = {
            unhealthyManifestCriticalNotificationRemainsVisible: healthBefore.pending_count === 2
                && criticalRows.length === 2
                && criticalRows.every((row) => row.action === "recover_or_repair_manifest_generation"),
            repeatedUnseenCriticalIsDiagnosedReadOnly: healthBefore.repeated_unseen_count === 2
                && healthBefore.created_task_count === 0
                && healthBefore.created_approval_receipt_count === 0
                && healthBefore.deleted_count === 0,
            realCoordinatorContextHelperRecordsDelivery: mainDelivery.text.includes("recover_or_repair_manifest_generation")
                && mainDelivery.context?.delivery?.recorded_count === 1
                && healthAfterMain.delivered_pending_count === 1
                && healthAfterMain.repeated_unseen_count === 1,
            repeatedContextBuildIsIdempotentlyBounded: repeatedMainDelivery.context?.delivery?.recorded_count === 1
                && (deliveryLedgerA.entries || []).filter((entry) => entry.audience === "group-main-agent").length === 1
                && Number(mainDeliveryEntry.delivery_count || 0) === 2,
            globalAgentDoesNotConsumeGroupDeliveryContext: globalContext.conflict_resolution_maintenance_notifications == null
                && globalContext.conflict_resolution_maintenance_delivery_health == null
                && healthAfterGlobal.delivered_pending_count === healthAfterMain.delivered_pending_count
                && healthAfterGlobal.repeated_unseen_count === healthAfterMain.repeated_unseen_count,
            crossGroupDeliveryCannotBeRecorded: unsafeCrossGroupRecord.recorded_count === 0,
            deliveryObservationIsNonDestructive: shardCountAfterDelivery === shardCountBeforeDelivery
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && (0, db_1.loadTasks)().length === tasksBefore,
            deliveryHealthQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_health"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            health: {
                before: { pending: healthBefore.pending_count, repeatedUnseen: healthBefore.repeated_unseen_count },
                afterMain: { delivered: healthAfterMain.delivered_pending_count, repeatedUnseen: healthAfterMain.repeated_unseen_count },
                afterGlobal: { delivered: healthAfterGlobal.delivered_pending_count, repeatedUnseen: healthAfterGlobal.repeated_unseen_count },
            },
            deliveryLedger: { entries: deliveryLedgerA.entries?.length || 0, mainDeliveryCount: mainDeliveryEntry.delivery_count || 0 },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRetentionSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-delivery-retention-a-${suffix}`;
    const groupB = `memory-center-delivery-retention-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const schedulerStateFile = path.join(memory_control_center_1.CONTROL_DIR, `delivery-retention-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention, } = require("../collaboration/group-memory-index");
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `delivery-retention-task-${marker}-${index}`,
        task_text: `Delivery retention task ${marker} ${index}`,
        task_family_key: `delivery-retention-family-${marker}-${index}`,
        task_family_tokens: ["delivery", "retention", marker, String(index)],
        entry_id: `delivery-retention-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `delivery retention current source verified ${marker}-${index}`,
        worker_context_packet_id: `delivery-retention-packet-${marker}-${index}`,
        binding_id: `delivery-retention-binding-${marker}-${index}`,
        task_agent_session_id: `delivery-retention-task-session-${marker}-${index}`,
        native_session_id: `delivery-retention-native-session-${marker}-${index}`,
        execution_id: `delivery-retention-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `delivery-retention-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 9, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T09:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T09:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T09:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, { at: "2026-07-12T09:58:00.000Z", gracePeriodMs: 0, deleteEligible: false });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const manifestFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupA);
        const manifestA = (0, memory_control_center_1.readJson)(manifestFileA, {});
        fs.writeFileSync(manifestFileA, JSON.stringify({ ...manifestA, manifest_checksum: "phase201-intentionally-invalid-manifest" }, null, 2), "utf-8");
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
            at: "2026-07-12T10:00:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true,
        });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupB, {
            at: "2026-07-12T10:00:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true,
        });
        const initialMain = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "group-main-agent", { at: "2026-07-12T10:00:01.000Z" });
        const initialGlobal = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "global-agent", { at: "2026-07-12T10:00:01.000Z" });
        const currentNotificationIds = [initialMain.notifications?.[0]?.notification_id, initialGlobal.notifications?.[0]?.notification_id].filter(Boolean);
        for (let index = 0; index < 3; index++) {
            const at = new Date(Date.parse("2026-07-12T10:01:00.000Z") + index * 1000).toISOString();
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "group-main-agent", {
                at, recordDelivery: true, contextId: `old-main-context-${index}`, consumerSessionId: `old-main-session-${index}`,
            });
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, "global-agent", {
                at, recordDelivery: true, contextId: `old-global-context-${index}`, consumerSessionId: `old-global-session-${index}`,
            });
        }
        const notificationFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupA);
        const notificationLedgerA = (0, memory_control_center_1.readJson)(notificationFileA, {});
        const syntheticNotifications = Array.from({ length: 300 }, (_, index) => {
            const at = new Date(Date.parse("2026-07-12T11:00:00.000Z") + index * 60_000).toISOString();
            const audience = index % 2 === 0 ? "group-main-agent" : "global-agent";
            return {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-v1",
                version: 1,
                notification_id: `synthetic-terminal-notification:${index}`,
                group_id: groupA,
                audience,
                state_fingerprint: `synthetic-terminal-state-${index}`,
                severity: "info",
                action: "terminal_historical_diagnostic",
                reason: "phase201 retention pressure",
                advisory_only: true,
                destructive_action_authorized: false,
                should_create_real_task: false,
                cross_group_authorization_allowed: false,
                state_observed_at: at,
                first_seen_at: at,
                last_seen_at: at,
                seen_count: 1,
            };
        });
        fs.writeFileSync(notificationFileA, JSON.stringify({ ...notificationLedgerA, entries: [...(notificationLedgerA.entries || []), ...syntheticNotifications], notification_count: 302 }, null, 2), "utf-8");
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupA, {
            at: "2026-07-12T20:00:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true,
        });
        const retainedNotificationLedger = (0, memory_control_center_1.readJson)(notificationFileA, {});
        const healthAfterRecurrence = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, {
            at: "2026-07-12T20:01:00.000Z", unseenAfterMs: 60_000, repeatThreshold: 2,
        });
        const shardCountBeforeRetention = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const firstRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupA, {
            at: "2026-07-12T20:02:00.000Z", terminalAgeMs: 60_000, maxHotEntries: 20, maxCompactedEntries: 20, unseenAfterMs: 60_000, repeatThreshold: 2,
        });
        const restartRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupA, {
            at: "2026-07-12T20:03:00.000Z", terminalAgeMs: 60_000, maxHotEntries: 20, maxCompactedEntries: 20, unseenAfterMs: 60_000, repeatThreshold: 2,
        });
        const healthAfterRetention = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, {
            at: "2026-07-12T20:03:01.000Z", unseenAfterMs: 60_000, repeatThreshold: 2,
        });
        for (const audience of ["group-main-agent", "global-agent"]) {
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, audience, {
                at: "2026-07-12T20:04:00.000Z", recordDelivery: true, contextId: `fresh-${audience}-context`, consumerSessionId: `fresh-${audience}-session`,
            });
        }
        const schedulerTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T20:05:00.000Z",
            groupIds: [groupA, groupB],
            force: true,
            stateFile: schedulerStateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
            deliveryTerminalAgeMs: 60_000,
            deliveryMaxHotEntries: 20,
            deliveryMaxCompactedEntries: 20,
        });
        for (const audience of ["group-main-agent", "global-agent"]) {
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupA, audience, {
                at: "2026-07-12T20:06:00.000Z", recordDelivery: true, contextId: `post-scheduler-${audience}-context`, consumerSessionId: `post-scheduler-${audience}-session`,
            });
        }
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupA, {
            at: "2026-07-12T20:07:00.000Z", terminalAgeMs: 60_000, maxHotEntries: 20, maxCompactedEntries: 20,
        });
        const finalHealthA = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, { at: "2026-07-12T20:07:01.000Z" });
        const deliveryFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB);
        const contextB = buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupB, "group-main-agent", {
            at: "2026-07-12T20:06:00.000Z", recordDelivery: true, contextId: "group-b-context", consumerSessionId: "group-b-session",
        });
        const validDeliveryLedgerB = (0, memory_control_center_1.readJson)(deliveryFileB, {});
        fs.writeFileSync(deliveryFileB, JSON.stringify({ ...validDeliveryLedgerB, ledger_checksum: "tampered-phase201-ledger" }, null, 2), "utf-8");
        const tamperedRetention = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRetention(groupB, { at: "2026-07-12T20:07:00.000Z" });
        fs.writeFileSync(deliveryFileB, JSON.stringify(validDeliveryLedgerB, null, 2), "utf-8");
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_retention"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T20:07:02.000Z",
            unseenAfterMs: 60_000,
            repeatThreshold: 2,
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const shardCountAfterRetention = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const checks = {
            currentOldFingerprintIsPinnedUnderNotificationPressure: retainedNotificationLedger.entries?.length === 240
                && currentNotificationIds.every((id) => retainedNotificationLedger.entries.some((entry) => entry.notification_id === id))
                && currentNotificationIds.every((id) => retainedNotificationLedger.pinned_current_notification_ids?.includes(id)),
            oldDeliveryCannotAuthorizeCurrentRecurrence: healthAfterRecurrence.delivered_pending_count === 0
                && healthAfterRecurrence.repeated_unseen_count === 2,
            terminalDetailsCompactButCurrentCriticalRemainsProtected: firstRetention.status === "ok"
                && Number(firstRetention.retention?.compacted_this_run_count || 0) === 6
                && healthAfterRetention.hot_delivery_entry_count === 0
                && healthAfterRetention.compacted_delivery_entry_count === 2
                && healthAfterRetention.repeated_unseen_count === 2
                && healthAfterRetention.unprotected_repeated_unseen_count === 0
                && healthAfterRetention.compacted_current_delivery_count === 0,
            restartRetentionPreservesChecksumChainWithoutDoubleCounting: restartRetention.status === "ok"
                && restartRetention.retention_generation > firstRetention.retention_generation
                && restartRetention.health?.previous_chain_valid === true
                && restartRetention.health?.compacted_delivery_entry_count === 2,
            schedulerRunsRetentionReadOnlyForBothGroups: schedulerTick.deliveryRetentionCount === 2
                && schedulerTick.deliveryRetentionBlockedCount === 0
                && schedulerTick.rows?.every((row) => row.telemetryRetention?.destructive_action_authorized === false)
                && schedulerTick.createdTaskCount === 0
                && schedulerTick.createdApprovalReceiptCount === 0
                && schedulerTick.deletedCount === 0,
            currentFreshDeliveryIsPinnedAfterScheduler: finalHealthA.delivered_pending_count === 2
                && finalHealthA.hot_delivery_entry_count >= 2
                && finalHealthA.compacted_current_delivery_count === 0,
            tamperedLedgerBlocksRetentionWithoutCrossGroupFallback: contextB.delivery?.recorded_count === 1
                && tamperedRetention.status === "blocked"
                && tamperedRetention.reason === "delivery_ledger_checksum_invalid",
            retentionNeverMutatesTasksApprovalsOrShards: shardCountAfterRetention === shardCountBeforeRetention
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && (0, db_1.loadTasks)().length === tasksBefore,
            retentionQualityGatePassesForBothGroups: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_retention"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            notificationRetention: { count: retainedNotificationLedger.entries?.length || 0, pinned: retainedNotificationLedger.pinned_current_notification_count || 0 },
            deliveryRetention: {
                firstGeneration: firstRetention.retention_generation,
                restartGeneration: restartRetention.retention_generation,
                compacted: healthAfterRetention.compacted_delivery_entry_count,
                finalHot: finalHealthA.hot_delivery_entry_count,
            },
            scheduler: { retentionCount: schedulerTick.deliveryRetentionCount, blocked: schedulerTick.deliveryRetentionBlockedCount },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryRecoverySelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-delivery-recovery-a-${suffix}`;
    const groupB = `memory-center-delivery-recovery-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const schedulerStateFile = path.join(memory_control_center_1.CONTROL_DIR, `delivery-recovery-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations, } = require("../collaboration/group-memory-index");
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `delivery-recovery-task-${marker}-${index}`,
        task_text: `Delivery recovery task ${marker} ${index}`,
        task_family_key: `delivery-recovery-family-${marker}-${index}`,
        task_family_tokens: ["delivery", "recovery", marker, String(index)],
        entry_id: `delivery-recovery-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `delivery recovery current source verified ${marker}-${index}`,
        worker_context_packet_id: `delivery-recovery-packet-${marker}-${index}`,
        binding_id: `delivery-recovery-binding-${marker}-${index}`,
        task_agent_session_id: `delivery-recovery-task-session-${marker}-${index}`,
        native_session_id: `delivery-recovery-native-session-${marker}-${index}`,
        execution_id: `delivery-recovery-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `delivery-recovery-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 8, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T08:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T08:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T08:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, { at: "2026-07-12T08:58:00.000Z", gracePeriodMs: 0, deleteEligible: false });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T09:00:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        for (let index = 0; index < 2; index++) {
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
                at: new Date(Date.parse("2026-07-12T09:01:00.000Z") + index * 1000).toISOString(),
                recordDelivery: true,
                contextId: `${marker}-recovery-context-${index}`,
                consumerSessionId: `${marker}-recovery-session-${index}`,
            });
        }
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const deliveryFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA);
        const deliveryFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB);
        const previousFileA = path.join(path.dirname(deliveryFileA), "maintenance-notification-deliveries.previous.json");
        const previousFileB = path.join(path.dirname(deliveryFileB), "maintenance-notification-deliveries.previous.json");
        const currentA = (0, memory_control_center_1.readJson)(deliveryFileA, {});
        const previousA = (0, memory_control_center_1.readJson)(previousFileA, {});
        const currentB = (0, memory_control_center_1.readJson)(deliveryFileB, {});
        const previousB = (0, memory_control_center_1.readJson)(previousFileB, {});
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const interruptedTempA = `${deliveryFileA}.${process.pid}.interrupted.tmp`;
        const interruptedPreviousTempA = `${previousFileA}.${process.pid}.interrupted.tmp`;
        fs.writeFileSync(interruptedTempA, JSON.stringify({ partial: true, group_id: groupA }), "utf-8");
        fs.writeFileSync(interruptedPreviousTempA, "{partial", "utf-8");
        fs.writeFileSync(deliveryFileA, JSON.stringify({ ...currentA, ledger_checksum: "phase202-corrupt-current" }, null, 2), "utf-8");
        const recoverable = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupA);
        const dryRecovery = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupA, { at: "2026-07-12T09:10:00.000Z" });
        const currentAfterDryRun = (0, memory_control_center_1.readJson)(deliveryFileA, {});
        const schedulerTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T09:11:00.000Z",
            groupIds: [groupA],
            force: true,
            stateFile: schedulerStateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const recoveredGeneration = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupA);
        const recoveryHealthA = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryRecoveryHealth(groupA, { at: "2026-07-12T09:11:01.000Z" });
        const deliveryHealthAfterRecovery = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryHealth(groupA, { at: "2026-07-12T09:11:01.000Z" });
        const quarantineLedger = (0, memory_control_center_1.readJson)(recoveryHealthA.quarantine_file, {});
        const recoveryEvidence = (quarantineLedger.entries || []).find((entry) => entry.status === "quarantined_corrupt_current") || {};
        const savedCurrentA = (0, memory_control_center_1.readJson)(deliveryFileA, {});
        const savedPreviousA = (0, memory_control_center_1.readJson)(previousFileA, {});
        fs.writeFileSync(deliveryFileB, JSON.stringify({ ...currentB, ledger_checksum: "phase202-corrupt-b-current" }, null, 2), "utf-8");
        fs.writeFileSync(previousFileB, JSON.stringify(savedPreviousA, null, 2), "utf-8");
        const crossGroupGeneration = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupB);
        const crossGroupRecovery = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupB, { at: "2026-07-12T09:12:00.000Z", apply: true });
        fs.writeFileSync(deliveryFileB, JSON.stringify(currentB, null, 2), "utf-8");
        fs.writeFileSync(previousFileB, JSON.stringify(previousB, null, 2), "utf-8");
        fs.writeFileSync(deliveryFileB, JSON.stringify({ ...currentB, ledger_checksum: "phase202-corrupt-b-current-2" }, null, 2), "utf-8");
        fs.writeFileSync(previousFileB, JSON.stringify({ ...previousB, ledger_checksum: "phase202-tampered-b-previous" }, null, 2), "utf-8");
        const tamperedPreviousGeneration = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupB);
        const tamperedPreviousRecovery = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupB, { at: "2026-07-12T09:13:00.000Z", apply: true });
        fs.writeFileSync(deliveryFileB, JSON.stringify(currentB, null, 2), "utf-8");
        fs.writeFileSync(previousFileB, JSON.stringify(previousB, null, 2), "utf-8");
        const orphanPreviousCandidate = { ...currentB };
        fs.writeFileSync(previousFileB, JSON.stringify(orphanPreviousCandidate, null, 2), "utf-8");
        const orphanPrevious = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupB, { at: "2026-07-12T09:14:00.000Z", persist: true });
        fs.writeFileSync(previousFileB, JSON.stringify(previousB, null, 2), "utf-8");
        fs.writeFileSync(deliveryFileA, JSON.stringify(savedCurrentA, null, 2), "utf-8");
        fs.writeFileSync(previousFileA, JSON.stringify(savedPreviousA, null, 2), "utf-8");
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_recovery"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T09:15:00.000Z",
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const checks = {
            invalidCurrentWithValidSameGroupPreviousIsRecoverable: recoverable.status === "recoverable"
                && recoverable.current.valid === false
                && recoverable.previous.valid === true,
            dryRunDoesNotOverwriteCurrent: dryRecovery.status === "recoverable"
                && dryRecovery.recovered === false
                && currentAfterDryRun.ledger_checksum === "phase202-corrupt-current",
            schedulerAutomaticallyRecoversWithoutAuthority: schedulerTick.deliveryRecoveryCount === 1
                && schedulerTick.deliveryRecoveryBlockedCount === 0
                && schedulerTick.rows?.[0]?.telemetryRecovery?.status === "recovered"
                && schedulerTick.createdTaskCount === 0
                && schedulerTick.createdApprovalReceiptCount === 0
                && schedulerTick.deletedCount === 0,
            recoveryCreatesNewValidGenerationAndPreservesFreshness: recoveredGeneration.valid === true
                && recoveredGeneration.current.retention_generation > recoverable.previous.retention_generation
                && deliveryHealthAfterRecovery.pending_count >= 1
                && deliveryHealthAfterRecovery.delivered_pending_count === 0,
            corruptCurrentAndInterruptedTempsAreQuarantinedAsEvidence: recoveryHealthA.quarantine_checksum_valid === true
                && recoveryHealthA.quarantine_count >= 3
                && recoveryHealthA.orphans.temp_candidate_count === 2
                && recoveryEvidence.evidence_path
                && fs.existsSync(recoveryEvidence.evidence_path),
            crossGroupPreviousCannotRecover: crossGroupGeneration.recoverable === false
                && crossGroupGeneration.previous.group_valid === false
                && crossGroupRecovery.status === "blocked",
            tamperedPreviousCannotRecover: tamperedPreviousGeneration.recoverable === false
                && tamperedPreviousGeneration.previous.ledger_checksum_valid === false
                && tamperedPreviousRecovery.status === "blocked",
            orphanPreviousIsDiagnosedWithoutDeletion: orphanPrevious.orphan_previous_count === 1
                && orphanPrevious.deleted_count === 0
                && fs.existsSync(previousFileB),
            recoveryNeverMutatesTasksApprovalsOrShards: shardCountAfter === shardCountBefore
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && (0, db_1.loadTasks)().length === tasksBefore,
            recoveryQualityGatePassesForBothGroups: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_recovery"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            recovery: {
                selectedPrevious: dryRecovery.selected_previous_checksum,
                recoveredGeneration: recoveredGeneration.current.retention_generation,
                quarantineCount: recoveryHealthA.quarantine_count,
                tempCandidates: recoveryHealthA.orphans.temp_candidate_count,
            },
            blocked: { crossGroup: crossGroupRecovery.reason, tamperedPrevious: tamperedPreviousRecovery.reason },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-delivery-cleanup-a-${suffix}`;
    const groupB = `memory-center-delivery-cleanup-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const schedulerStateFile = path.join(memory_control_center_1.CONTROL_DIR, `delivery-cleanup-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention, } = require("../collaboration/group-memory-index");
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `delivery-cleanup-task-${marker}-${index}`,
        task_text: `Delivery cleanup task ${marker} ${index}`,
        task_family_key: `delivery-cleanup-family-${marker}-${index}`,
        task_family_tokens: ["delivery", "cleanup", marker, String(index)],
        entry_id: `delivery-cleanup-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `delivery cleanup current source verified ${marker}-${index}`,
        worker_context_packet_id: `delivery-cleanup-packet-${marker}-${index}`,
        binding_id: `delivery-cleanup-binding-${marker}-${index}`,
        task_agent_session_id: `delivery-cleanup-task-session-${marker}-${index}`,
        native_session_id: `delivery-cleanup-native-session-${marker}-${index}`,
        execution_id: `delivery-cleanup-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `delivery-cleanup-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 7, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T07:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T07:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T07:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, { at: "2026-07-12T07:58:00.000Z", gracePeriodMs: 0, deleteEligible: false });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T08:00:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        for (let index = 0; index < 2; index++) {
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
                at: new Date(Date.parse("2026-07-12T08:01:00.000Z") + index * 1000).toISOString(),
                recordDelivery: true,
                contextId: `${marker}-cleanup-context-${index}`,
                consumerSessionId: `${marker}-cleanup-session-${index}`,
            });
        }
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const deliveryFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA);
        const coldDirA = path.dirname(deliveryFileA);
        const deliveryFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB);
        const coldDirB = path.dirname(deliveryFileB);
        const recoveryEvidenceFiles = [];
        for (let index = 0; index < 2; index++) {
            const current = (0, memory_control_center_1.readJson)(deliveryFileA, {});
            fs.writeFileSync(deliveryFileA, JSON.stringify({ ...current, ledger_checksum: `phase203-corrupt-current-${index}` }, null, 2), "utf-8");
            const recovery = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupA, {
                at: new Date(Date.parse("2026-07-12T08:10:00.000Z") + index * 60_000).toISOString(),
                apply: true,
            });
            recoveryEvidenceFiles.push(recovery.evidence_file);
        }
        const tempA1 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.cleanup-a.tmp`);
        const tempA2 = path.join(coldDirA, `maintenance-notification-deliveries.previous.json.${process.pid}.cleanup-b.tmp`);
        fs.writeFileSync(tempA1, "phase203-temp-a", "utf-8");
        fs.writeFileSync(tempA2, "phase203-temp-b", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T08:12:00.000Z", persist: true });
        const tempB = path.join(coldDirB, `maintenance-notification-deliveries.json.${process.pid}.cleanup-group-b.tmp`);
        fs.writeFileSync(tempB, "phase203-temp-group-b", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupB, { at: "2026-07-12T08:12:00.000Z", persist: true });
        const statusBefore = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T08:13:00.000Z" });
        let missingExplicitRejected = false;
        try {
            createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                at: "2026-07-12T08:13:00.000Z", actorRole: "local-user", actorId: "cleanup-user", reason: "missing explicit",
            });
        }
        catch {
            missingExplicitRejected = true;
        }
        const expiredReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:14:00.000Z", explicitApproval: true, actorRole: "local-user", actorId: "cleanup-user", reason: "expiry test", expiresInMs: 60_000,
        });
        const expiredExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:16:00.000Z", receiptId: expiredReceipt.receipt_id, explicitExecution: true,
        });
        const tamperedReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:17:00.000Z", explicitApproval: true, actorRole: "group-main-agent", actorId: "main-a", reason: "tamper test",
        });
        const receiptFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupA);
        const receiptLedgerBeforeTamper = (0, memory_control_center_1.readJson)(receiptFileA, {});
        fs.writeFileSync(receiptFileA, JSON.stringify({
            ...receiptLedgerBeforeTamper,
            entries: (receiptLedgerBeforeTamper.entries || []).map((entry) => entry.receipt_id === tamperedReceipt.receipt_id ? { ...entry, receipt_checksum: "tampered-phase203-receipt" } : entry),
        }, null, 2), "utf-8");
        const tamperedExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:17:30.000Z", receiptId: tamperedReceipt.receipt_id, explicitExecution: true,
        });
        fs.writeFileSync(receiptFileA, JSON.stringify(receiptLedgerBeforeTamper, null, 2), "utf-8");
        const validReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:18:00.000Z", explicitApproval: true, actorRole: "global-agent", actorId: "global-a", reason: "clean eligible old telemetry evidence",
        });
        const backgroundExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:18:30.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true, trigger: "scheduler",
        });
        const crossGroupExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupB, {
            at: "2026-07-12T08:18:30.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
        });
        const shardCountBeforeCleanup = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const finalExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:19:00.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true, trigger: "manual",
        });
        const replayExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:19:01.000Z", receiptId: validReceipt.receipt_id, explicitExecution: true,
        });
        const retentionAfterCleanup = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineRetention(groupA, { at: "2026-07-12T08:20:00.000Z" });
        const statusAfter = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T08:20:01.000Z" });
        const latestEvidencePath = recoveryEvidenceFiles[recoveryEvidenceFiles.length - 1];
        const schedulerTick = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T08:21:00.000Z",
            groupIds: [groupA, groupB],
            force: true,
            stateFile: schedulerStateFile,
            tickWindowMs: 60_000,
            intervalMs: 60_000,
            gracePeriodMs: 0,
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T08:21:01.000Z",
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const shardCountAfterCleanup = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const checks = {
            unresolvedAndLatestRecoveryProofAreProtectedBeforeCleanup: statusBefore.unresolved_quarantine_count === 4
                && statusBefore.latest_recovery_proof_present === true
                && validReceipt.latest_recovery_proof_id === statusBefore.latest_recovery_proof_id
                && validReceipt.candidates.length === 3
                && !validReceipt.candidates.some((candidate) => candidate.target_path === latestEvidencePath),
            cleanupReceiptRequiresExplicitApproval: missingExplicitRejected === true,
            expiredTamperedBackgroundAndCrossGroupExecutionBlocked: expiredExecution.reason === "cleanup_receipt_expired"
                && tamperedExecution.reason === "cleanup_receipt_checksum_invalid"
                && backgroundExecution.reason === "background_trigger_cannot_cleanup_delivery_evidence"
                && crossGroupExecution.reason === "cleanup_receipt_not_found",
            validReceiptDeletesOnlyExactEligibleEvidence: finalExecution.status === "executed"
                && finalExecution.deleted_count === 3
                && validReceipt.candidates.every((candidate) => !fs.existsSync(candidate.target_path))
                && fs.existsSync(latestEvidencePath),
            consumedReceiptCannotReplay: replayExecution.reason === "cleanup_receipt_already_consumed",
            cleanedDiagnosticsCompactWhileLatestProofRemainsHot: retentionAfterCleanup.status === "ok"
                && statusAfter.unresolved_quarantine_count === 1
                && statusAfter.compacted_quarantine_count === 3
                && statusAfter.latest_recovery_proof_present === true,
            schedulerNeverCreatesOrExecutesCleanupReceipt: schedulerTick.deliveryQuarantineRetentionCount >= 1
                && schedulerTick.deliveryQuarantineRetentionBlockedCount === 0
                && schedulerTick.createdTaskCount === 0
                && schedulerTick.createdApprovalReceiptCount === 0
                && schedulerTick.deletedCount === 0
                && fs.existsSync(latestEvidencePath)
                && fs.existsSync(tempB),
            cleanupDoesNotChangeTasksGcApprovalsOrColdShards: shardCountAfterCleanup === shardCountBeforeCleanup
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && (0, db_1.loadTasks)().length === tasksBefore,
            cleanupQualityGatePassesForBothGroups: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            receipt: { candidateCount: validReceipt.candidates.length, deletedCount: finalExecution.deleted_count, replayReason: replayExecution.reason },
            quarantine: { before: statusBefore.unresolved_quarantine_count, after: statusAfter.unresolved_quarantine_count, compacted: statusAfter.compacted_quarantine_count },
            scheduler: { retentionCount: schedulerTick.deliveryQuarantineRetentionCount, deletedCount: schedulerTick.deletedCount },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cleanup-journal-a-${suffix}`;
    const groupB = `memory-center-cleanup-journal-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const schedulerStateFile = path.join(memory_control_center_1.CONTROL_DIR, `cleanup-journal-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards, recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger, revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, } = require("../collaboration/group-memory-index");
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `cleanup-journal-task-${marker}-${index}`,
        task_text: `Cleanup journal task ${marker} ${index}`,
        task_family_key: `cleanup-journal-family-${marker}-${index}`,
        task_family_tokens: ["cleanup", "journal", marker, String(index)],
        entry_id: `cleanup-journal-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `cleanup journal current source verified ${marker}-${index}`,
        worker_context_packet_id: `cleanup-journal-packet-${marker}-${index}`,
        binding_id: `cleanup-journal-binding-${marker}-${index}`,
        task_agent_session_id: `cleanup-journal-task-session-${marker}-${index}`,
        native_session_id: `cleanup-journal-native-session-${marker}-${index}`,
        execution_id: `cleanup-journal-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `cleanup-journal-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 6, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T06:55:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T06:56:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T06:57:00.000Z", hotRowLimit: 24 });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, { at: "2026-07-12T06:58:00.000Z", gracePeriodMs: 0, deleteEligible: false });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T07:00:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        for (let index = 0; index < 2; index++) {
            buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
                at: new Date(Date.parse("2026-07-12T07:01:00.000Z") + index * 1000).toISOString(),
                recordDelivery: true,
                contextId: `${marker}-journal-context-${index}`,
                consumerSessionId: `${marker}-journal-session-${index}`,
            });
        }
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const deliveryFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA);
        const coldDirA = path.dirname(deliveryFileA);
        const deliveryFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB);
        const coldDirB = path.dirname(deliveryFileB);
        for (let index = 0; index < 2; index++) {
            const current = (0, memory_control_center_1.readJson)(deliveryFileA, {});
            fs.writeFileSync(deliveryFileA, JSON.stringify({ ...current, ledger_checksum: `phase204-corrupt-current-${index}` }, null, 2), "utf-8");
            recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryLedger(groupA, {
                at: new Date(Date.parse("2026-07-12T07:10:00.000Z") + index * 60_000).toISOString(), apply: true,
            });
        }
        const tempPathsA = Array.from({ length: 3 }, (_, index) => path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.journal-${index}.tmp`));
        tempPathsA.forEach((file, index) => fs.writeFileSync(file, `phase204-temp-${index}`, "utf-8"));
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T07:12:00.000Z", persist: true });
        const tempB = path.join(coldDirB, `maintenance-notification-deliveries.json.${process.pid}.journal-b.tmp`);
        fs.writeFileSync(tempB, "phase204-temp-b", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupB, { at: "2026-07-12T07:12:00.000Z", persist: true });
        const revokedReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:13:00.000Z", explicitApproval: true, actorRole: "local-user", actorId: "revoker", reason: "revocation test",
        });
        const revoked = revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:13:30.000Z", receiptId: revokedReceipt.receipt_id, explicitRevocation: true, actorId: "revoker", reason: "operator cancelled cleanup",
        });
        const revokedExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:14:00.000Z", receiptId: revokedReceipt.receipt_id, explicitExecution: true,
        });
        const partialReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:15:00.000Z", explicitApproval: true, actorRole: "group-main-agent", actorId: "main-a", reason: "partial cleanup journal test", expiresInMs: 60_000,
        });
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const partialExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:15:30.000Z", receiptId: partialReceipt.receipt_id, explicitExecution: true, simulateCrashAfterDeletes: 1,
        });
        let inProgressRevocationBlocked = false;
        try {
            revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                at: "2026-07-12T07:15:40.000Z", receiptId: partialReceipt.receipt_id, explicitRevocation: true, actorId: "main-a", reason: "should block",
            });
        }
        catch {
            inProgressRevocationBlocked = true;
        }
        const journalStatusBeforeScheduler = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupA, { at: "2026-07-12T07:15:45.000Z", persist: false });
        const journalFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupA);
        const validJournalLedger = (0, memory_control_center_1.readJson)(journalFileA, {});
        fs.writeFileSync(journalFileA, JSON.stringify({
            ...validJournalLedger,
            entries: (validJournalLedger.entries || []).map((entry) => entry.receipt_id === partialReceipt.receipt_id ? { ...entry, journal_checksum: "phase204-tampered-journal" } : entry),
        }, null, 2), "utf-8");
        const tamperedResume = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:15:50.000Z", receiptId: partialReceipt.receipt_id, explicitExecution: true,
        });
        fs.writeFileSync(journalFileA, JSON.stringify(validJournalLedger, null, 2), "utf-8");
        const remainingPathsBeforeScheduler = partialReceipt.candidates.filter((candidate) => fs.existsSync(candidate.target_path)).map((candidate) => candidate.target_path);
        const schedulerDuringPartial = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T07:17:00.000Z", groupIds: [groupA, groupB], force: true, stateFile: schedulerStateFile, tickWindowMs: 60_000, intervalMs: 60_000, gracePeriodMs: 0,
        });
        const remainingPathsPreservedByScheduler = remainingPathsBeforeScheduler.every((file) => fs.existsSync(file));
        const crossGroupResume = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupB, {
            at: "2026-07-12T07:17:10.000Z", receiptId: partialReceipt.receipt_id, explicitExecution: true,
        });
        const resumedExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:18:00.000Z", receiptId: partialReceipt.receipt_id, explicitExecution: true,
        });
        const replayExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:18:01.000Z", receiptId: partialReceipt.receipt_id, explicitExecution: true,
        });
        const finalTemp = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.journal-finalize.tmp`);
        fs.writeFileSync(finalTemp, "phase204-finalize-temp", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T07:19:00.000Z", persist: true });
        const finalizeReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:19:10.000Z", explicitApproval: true, actorRole: "global-agent", actorId: "global-a", reason: "finalization crash test",
        });
        const beforeFinalizeInterruption = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:19:20.000Z", receiptId: finalizeReceipt.receipt_id, explicitExecution: true, simulateCrashBeforeFinalize: true,
        });
        const schedulerFinalize = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T07:20:00.000Z", groupIds: [groupA, groupB], force: true, stateFile: schedulerStateFile, tickWindowMs: 60_000, intervalMs: 60_000, gracePeriodMs: 0,
        });
        const revokedReceiptB = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupB, {
            at: "2026-07-12T07:20:10.000Z", explicitApproval: true, actorRole: "local-user", actorId: "group-b-user", reason: "group b quality coverage",
        });
        revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupB, {
            at: "2026-07-12T07:20:20.000Z", receiptId: revokedReceiptB.receipt_id, explicitRevocation: true, actorId: "group-b-user", reason: "keep group b evidence",
        });
        const finalStatusA = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T07:20:30.000Z" });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_journal"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T07:20:31.000Z",
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const checks = {
            receiptCanBeRevokedOnlyBeforeExecution: revoked.revoked === true
                && revokedExecution.reason === "cleanup_receipt_revoked"
                && inProgressRevocationBlocked === true,
            partialExecutionPersistsResumableExactJournal: partialExecution.status === "interrupted"
                && partialExecution.deleted_count === 1
                && journalStatusBeforeScheduler.open_journal_count === 1
                && (journalStatusBeforeScheduler.resumable_journal_count === 1 || journalStatusBeforeScheduler.leased_journal_count === 1),
            tamperedAndCrossGroupJournalResumeBlocked: tamperedResume.reason === "cleanup_journal_checksum_invalid"
                && crossGroupResume.reason === "cleanup_receipt_not_found",
            schedulerDetectsButDoesNotResumePartialDeletion: schedulerDuringPartial.deliveryCleanupOpenJournalCount === 1
                && schedulerDuringPartial.deliveryCleanupDeletedCount === 0
                && remainingPathsPreservedByScheduler,
            expiredReceiptCanResumeAlreadyStartedJournalAfterGenerationAdvance: resumedExecution.status === "executed"
                && resumedExecution.resumed === true
                && resumedExecution.deleted_count === partialReceipt.candidates.length
                && partialReceipt.candidates.every((candidate) => !fs.existsSync(candidate.target_path)),
            consumedPartialReceiptCannotReplay: replayExecution.reason === "cleanup_receipt_already_consumed",
            schedulerFinalizesMetadataAfterAllDeletesWithoutDeleting: beforeFinalizeInterruption.reason === "simulated_process_interruption_before_finalize"
                && !fs.existsSync(finalTemp)
                && schedulerFinalize.deliveryCleanupReconciledJournalCount >= 1
                && schedulerFinalize.deliveryCleanupDeletedCount === 0,
            latestRecoveryProofAndGroupBUnresolvedEvidenceRemain: finalStatusA.latest_recovery_proof_present === true
                && fs.existsSync(tempB),
            journalRecoveryDoesNotChangeTasksGcApprovalsOrColdShards: shardCountAfter === shardCountBefore
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && (0, db_1.loadTasks)().length === tasksBefore,
            cleanupJournalQualityGatePassesForBothGroups: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_journal"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            partial: { deleted: partialExecution.deleted_count, resumed: resumedExecution.resumed, total: resumedExecution.deleted_count },
            diagnostics: {
                resumedExecution,
                replayExecution,
                schedulerDuringPartial: {
                    open: schedulerDuringPartial.deliveryCleanupOpenJournalCount,
                    reconciled: schedulerDuringPartial.deliveryCleanupReconciledJournalCount,
                    deleted: schedulerDuringPartial.deliveryCleanupDeletedCount,
                    rows: schedulerDuringPartial.rows?.map((row) => ({ groupId: row.groupId, status: row.status, journals: row.telemetryCleanupJournals })),
                },
                qualityWeak: quality.report?.weakGroups || quality.report?.groups || [],
            },
            finalization: { interrupted: beforeFinalizeInterruption.status, reconciled: schedulerFinalize.deliveryCleanupReconciledJournalCount },
            journals: { open: finalStatusA.open_journal_count, invalid: finalStatusA.invalid_journal_count },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupJournalLeaseSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cleanup-lease-a-${suffix}`;
    const groupB = `memory-center-cleanup-lease-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, } = require("../collaboration/group-memory-index");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `cleanup-lease-task-${marker}-${index}`,
        task_text: `Cleanup lease task ${marker} ${index}`,
        task_family_key: `cleanup-lease-family-${marker}-${index}`,
        task_family_tokens: ["cleanup", "lease", marker, String(index)],
        entry_id: `cleanup-lease-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `cleanup lease current source verified ${marker}-${index}`,
        worker_context_packet_id: `cleanup-lease-packet-${marker}-${index}`,
        binding_id: `cleanup-lease-binding-${marker}-${index}`,
        task_agent_session_id: `cleanup-lease-task-session-${marker}-${index}`,
        native_session_id: `cleanup-lease-native-session-${marker}-${index}`,
        execution_id: `cleanup-lease-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `cleanup-lease-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 8, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T07:50:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T07:51:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T07:52:00.000Z", hotRowLimit: 24 });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T07:55:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
            at: "2026-07-12T07:56:00.000Z",
            recordDelivery: true,
            contextId: `${marker}-lease-context`,
            consumerSessionId: `${marker}-lease-session`,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const coldDirA = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA));
        const coldDirB = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB));
        const tempA1 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.lease-concurrent.tmp`);
        const tempB = path.join(coldDirB, `maintenance-notification-deliveries.json.${process.pid}.lease-other-group.tmp`);
        fs.writeFileSync(tempA1, "phase205-concurrent", "utf-8");
        fs.writeFileSync(tempB, "phase205-other-group", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T07:58:00.000Z", persist: true });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupB, { at: "2026-07-12T07:58:00.000Z", persist: true });
        const concurrentReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T07:59:00.000Z", explicitApproval: true, actorRole: "group-main-agent", actorId: "lease-main-a", reason: "concurrent executor exclusion",
        });
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        let competingExecution = null;
        let schedulerWhileLeased = null;
        const winningExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:00:00.000Z",
            receiptId: concurrentReceipt.receipt_id,
            explicitExecution: true,
            leaseTtlMs: 30_000,
            executorId: "phase205-winner",
            onLeaseAcquired: () => {
                competingExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                    at: "2026-07-12T08:00:01.000Z", receiptId: concurrentReceipt.receipt_id, explicitExecution: true, executorId: "phase205-competitor",
                });
            },
            onJournalLeasePersisted: () => {
                schedulerWhileLeased = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupA, {
                    at: "2026-07-12T08:00:02.000Z", persist: true,
                });
            },
        });
        const crossGroupExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupB, {
            at: "2026-07-12T08:00:03.000Z", receiptId: concurrentReceipt.receipt_id, explicitExecution: true,
        });
        const tempA2 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.lease-abandoned.tmp`);
        fs.writeFileSync(tempA2, "phase205-abandoned", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T08:04:00.000Z", persist: true });
        const recoveryReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:04:30.000Z", explicitApproval: true, actorRole: "global-agent", actorId: "lease-global", reason: "abandoned executor recovery",
        });
        const interruptedExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:05:00.000Z", receiptId: recoveryReceipt.receipt_id, explicitExecution: true, leaseTtlMs: 30_000, executorId: "phase205-abandoned", simulateCrashAfterDeletes: 1,
        });
        const firstDeletedPath = recoveryReceipt.candidates.find((candidate) => !fs.existsSync(candidate.target_path))?.target_path || "";
        const immediateRecovery = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:05:05.000Z", receiptId: recoveryReceipt.receipt_id, explicitExecution: true, executorId: "phase205-too-early",
        });
        const activeLeaseStatus = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupA, {
            at: "2026-07-12T08:05:06.000Z", persist: false,
        });
        const recoveredExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:05:40.000Z", receiptId: recoveryReceipt.receipt_id, explicitExecution: true, executorId: "phase205-recovery",
        });
        const replayExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:05:41.000Z", receiptId: recoveryReceipt.receipt_id, explicitExecution: true,
        });
        const tempA3 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.lease-dead-process.tmp`);
        fs.writeFileSync(tempA3, "phase205-dead-process", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T08:07:00.000Z", persist: true });
        const deadProcessReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:07:10.000Z", explicitApproval: true, actorRole: "local-user", actorId: "lease-user", reason: "dead process recovery",
        });
        const childProcess = require("child_process");
        const collaborationModule = path.resolve(__dirname, "../collaboration/group-memory-index.js");
        const childScript = [
            "const m=require(process.argv[1]);",
            "const r=m.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(process.argv[2],{at:'2026-07-12T08:07:20.000Z',receiptId:process.argv[3],explicitExecution:true,leaseTtlMs:300000,simulateCrashAfterDeletes:1});",
            "process.stdout.write(JSON.stringify(r));",
            "process.exit(r.status==='interrupted'?0:1);",
        ].join("");
        const childRun = childProcess.spawnSync(process.execPath, ["-e", childScript, collaborationModule, groupA, deadProcessReceipt.receipt_id], {
            cwd: process.cwd(), encoding: "utf-8", windowsHide: true, timeout: 30_000,
        });
        let deadProcessInterrupted = null;
        try {
            deadProcessInterrupted = JSON.parse(String(childRun.stdout || "{}"));
        }
        catch {
            deadProcessInterrupted = { status: "invalid_child_output", stderr: childRun.stderr };
        }
        const deadProcessRecovered = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:07:21.000Z", receiptId: deadProcessReceipt.receipt_id, explicitExecution: true, executorId: "phase205-parent-recovery",
        });
        const tempA4 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.lease-terminal.tmp`);
        fs.writeFileSync(tempA4, "phase205-terminal-lease", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T08:09:00.000Z", persist: true });
        const terminalReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:09:10.000Z", explicitApproval: true, actorRole: "global-agent", actorId: "lease-terminal", reason: "terminal lease recovery",
        });
        const terminalChildScript = [
            "const m=require(process.argv[1]);",
            "const r=m.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(process.argv[2],{at:'2026-07-12T08:09:20.000Z',receiptId:process.argv[3],explicitExecution:true,leaseTtlMs:300000,simulateCrashAfterFinalize:true});",
            "process.stdout.write(JSON.stringify(r));",
            "process.exit(r.status==='interrupted'&&r.finalized===true?0:1);",
        ].join("");
        const terminalChildRun = childProcess.spawnSync(process.execPath, ["-e", terminalChildScript, collaborationModule, groupA, terminalReceipt.receipt_id], {
            cwd: process.cwd(), encoding: "utf-8", windowsHide: true, timeout: 30_000,
        });
        let terminalInterrupted = null;
        try {
            terminalInterrupted = JSON.parse(String(terminalChildRun.stdout || "{}"));
        }
        catch {
            terminalInterrupted = { status: "invalid_child_output", stderr: terminalChildRun.stderr };
        }
        const terminalReconciliation = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupA, {
            at: "2026-07-12T08:09:21.000Z", persist: true,
        });
        const terminalReplay = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T08:09:22.000Z", receiptId: terminalReceipt.receipt_id, explicitExecution: true,
        });
        const finalStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T08:10:00.000Z" });
        const journalLedger = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupA), {});
        const receiptLedger = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupA), {});
        const recoveryJournal = (journalLedger.entries || []).find((entry) => entry.receipt_id === recoveryReceipt.receipt_id) || {};
        const recoveryReceiptFinal = (receiptLedger.entries || []).find((entry) => entry.receipt_id === recoveryReceipt.receipt_id) || {};
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_journal_lease"],
            groupIds: [groupA, groupB],
            now: "2026-07-12T08:10:01.000Z",
            refresh: true,
            writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const checks = {
            simultaneousExplicitExecutorsAreExclusive: winningExecution.status === "executed"
                && competingExecution?.reason === "cleanup_execution_lease_busy"
                && Number(competingExecution?.competing_fencing_token || 0) === Number(winningExecution.fencing_token || 0),
            schedulerObservesActiveLeaseWithoutMutationOrDeletion: schedulerWhileLeased?.leased_journal_count === 1
                && schedulerWhileLeased?.journal_count === 1
                && schedulerWhileLeased?.reconciled_journal_count === 0
                && Number(schedulerWhileLeased?.deleted_count || 0) === 0,
            crossGroupExecutorCannotUseReceipt: crossGroupExecution.reason === "cleanup_receipt_not_found" && fs.existsSync(tempB),
            interruptedExecutorKeepsExclusiveLeaseUntilExpiry: interruptedExecution.status === "interrupted"
                && immediateRecovery.reason === "cleanup_execution_lease_busy"
                && activeLeaseStatus.leased_journal_count === 1,
            abandonedExecutorIsRecoveredWithHigherFence: recoveredExecution.status === "executed"
                && recoveredExecution.lease_recovered === true
                && Number(recoveredExecution.fencing_token || 0) > Number(interruptedExecution.fencing_token || 0)
                && Number(recoveredExecution.lease_recovery_count || 0) >= 1,
            deadProcessOwnerIsRecoveredBeforeLeaseExpiry: childRun.status === 0
                && deadProcessInterrupted?.status === "interrupted"
                && Date.parse("2026-07-12T08:07:21.000Z") < Date.parse(String(deadProcessInterrupted.lease_expires_at || ""))
                && deadProcessRecovered.status === "executed"
                && deadProcessRecovered.lease_recovered === true
                && Number(deadProcessRecovered.fencing_token || 0) > Number(deadProcessInterrupted.fencing_token || 0),
            terminalAbandonedLeaseIsReconciledWithoutReplay: terminalChildRun.status === 0
                && terminalInterrupted?.status === "interrupted"
                && terminalInterrupted?.executed === true
                && terminalInterrupted?.finalized === true
                && terminalReconciliation.recovered_executor_count >= 1
                && terminalReconciliation.reconciled_journal_count >= 1
                && terminalReconciliation.deleted_count === 0
                && terminalReplay.reason === "cleanup_receipt_already_consumed",
            takeoverDeletesOnlyRemainingCandidates: Number(recoveredExecution.newly_deleted_count || 0) === recoveryReceipt.candidates.length - Number(interruptedExecution.deleted_count || 0)
                && !!firstDeletedPath
                && !fs.existsSync(firstDeletedPath)
                && recoveryReceipt.candidates.every((candidate) => !fs.existsSync(candidate.target_path)),
            receiptConsumedOnceAndJournalNotOverwritten: replayExecution.reason === "cleanup_receipt_already_consumed"
                && (journalLedger.entries || []).filter((entry) => entry.receipt_id === recoveryReceipt.receipt_id).length === 1
                && (receiptLedger.entries || []).filter((entry) => entry.receipt_id === recoveryReceipt.receipt_id && entry.consumed === true).length === 1
                && Number(recoveryReceiptFinal.execution_fencing_token || 0) === Number(recoveryJournal.lease_fencing_token || 0),
            finalLeaseStateAndQualityGateAreHealthy: finalStatus.open_journal_count === 0
                && finalStatus.invalid_journal_count === 0
                && finalStatus.abandoned_journal_count === 0
                && quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_journal_lease"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
            leaseRecoveryDoesNotChangeTasksGcApprovalsOrColdShards: (0, db_1.loadTasks)().length === tasksBefore
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && shardCountAfter === shardCountBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            concurrent: { winner: winningExecution, competitor: competingExecution, scheduler: schedulerWhileLeased },
            recovery: { interrupted: interruptedExecution, immediate: immediateRecovery, recovered: recoveredExecution, replay: replayExecution, deadProcessInterrupted, deadProcessRecovered, terminalInterrupted, terminalReconciliation, terminalReplay },
            final: { open: finalStatus.open_journal_count, invalid: finalStatus.invalid_journal_count, abandoned: finalStatus.abandoned_journal_count },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed, weak: quality.report?.weakGroups || [] },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupLedgerCasSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cleanup-cas-a-${suffix}`;
    const groupB = `memory-center-cleanup-cas-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, } = require("../collaboration/group-memory-index");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `cleanup-cas-task-${marker}-${index}`,
        task_text: `Cleanup CAS task ${marker} ${index}`,
        task_family_key: `cleanup-cas-family-${marker}-${index}`,
        task_family_tokens: ["cleanup", "cas", marker, String(index)],
        entry_id: `cleanup-cas-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `cleanup CAS current source verified ${marker}-${index}`,
        worker_context_packet_id: `cleanup-cas-packet-${marker}-${index}`,
        binding_id: `cleanup-cas-binding-${marker}-${index}`,
        task_agent_session_id: `cleanup-cas-task-session-${marker}-${index}`,
        native_session_id: `cleanup-cas-native-session-${marker}-${index}`,
        execution_id: `cleanup-cas-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `cleanup-cas-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 10, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T09:50:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T09:51:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T09:52:00.000Z", hotRowLimit: 24 });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T09:55:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
            at: "2026-07-12T09:56:00.000Z", recordDelivery: true, contextId: `${marker}-cas-context`, consumerSessionId: `${marker}-cas-session`,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const coldDirA = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA));
        const coldDirB = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB));
        const tempA1 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.cas-a.tmp`);
        const tempA2 = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.cas-b.tmp`);
        const tempB = path.join(coldDirB, `maintenance-notification-deliveries.json.${process.pid}.cas-other-group.tmp`);
        fs.writeFileSync(tempA1, "phase206-cas-a", "utf-8");
        fs.writeFileSync(tempA2, "phase206-cas-b", "utf-8");
        fs.writeFileSync(tempB, "phase206-cas-other-group", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T09:58:00.000Z", persist: true });
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupB, { at: "2026-07-12T09:58:00.000Z", persist: true });
        const quarantineFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupA);
        const quarantineBefore = (0, memory_control_center_1.readJson)(quarantineFileA, {});
        const quarantineIdA = (quarantineBefore.entries || []).find((entry) => path.resolve(String(entry.source_path || "")) === path.resolve(tempA1))?.quarantine_id || "";
        const quarantineIdB = (quarantineBefore.entries || []).find((entry) => path.resolve(String(entry.source_path || "")) === path.resolve(tempA2))?.quarantine_id || "";
        const receiptA = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:00:00.000Z", explicitApproval: true, actorRole: "group-main-agent", actorId: "cas-main-a", reason: "non-overlapping receipt A", quarantineIds: [quarantineIdA],
        });
        const receiptB = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:00:01.000Z", explicitApproval: true, actorRole: "global-agent", actorId: "cas-global-b", reason: "non-overlapping receipt B", quarantineIds: [quarantineIdB],
        });
        const receiptFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceiptFile(groupA);
        const journalFileA = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupA);
        const receiptRevisionBefore = Number((0, memory_control_center_1.readJson)(receiptFileA, {}).revision || 0);
        const journalRevisionBefore = Number((0, memory_control_center_1.readJson)(journalFileA, {}).revision || 0);
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        let executionB = null;
        let receiptLedgerAfterB = null;
        let journalLedgerAfterB = null;
        const executionA = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:01:00.000Z", receiptId: receiptA.receipt_id, explicitExecution: true, executorId: "cas-executor-a",
            onJournalLeasePersisted: () => {
                executionB = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                    at: "2026-07-12T10:01:01.000Z", receiptId: receiptB.receipt_id, explicitExecution: true, executorId: "cas-executor-b",
                });
                receiptLedgerAfterB = (0, memory_control_center_1.readJson)(receiptFileA, {});
                journalLedgerAfterB = (0, memory_control_center_1.readJson)(journalFileA, {});
            },
        });
        const receiptLedgerAfterBoth = (0, memory_control_center_1.readJson)(receiptFileA, {});
        const journalLedgerAfterBoth = (0, memory_control_center_1.readJson)(journalFileA, {});
        const tempOverlap = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.cas-overlap.tmp`);
        fs.writeFileSync(tempOverlap, "phase206-cas-overlap", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T10:02:00.000Z", persist: true });
        const overlapQuarantine = (0, memory_control_center_1.readJson)(quarantineFileA, {});
        const overlapId = (overlapQuarantine.entries || []).find((entry) => path.resolve(String(entry.source_path || "")) === path.resolve(tempOverlap))?.quarantine_id || "";
        const overlapReceiptWinner = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:02:10.000Z", explicitApproval: true, actorRole: "local-user", actorId: "cas-winner", reason: "overlap winner", quarantineIds: [overlapId],
        });
        const overlapReceiptLoser = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:02:11.000Z", explicitApproval: true, actorRole: "local-user", actorId: "cas-loser", reason: "overlap loser", quarantineIds: [overlapId],
        });
        let overlapLoserExecution = null;
        const overlapWinnerExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:03:00.000Z", receiptId: overlapReceiptWinner.receipt_id, explicitExecution: true, executorId: "cas-overlap-winner",
            onJournalLeasePersisted: () => {
                overlapLoserExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                    at: "2026-07-12T10:03:01.000Z", receiptId: overlapReceiptLoser.receipt_id, explicitExecution: true, executorId: "cas-overlap-loser",
                });
            },
        });
        const revokedLoser = revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T10:03:10.000Z", receiptId: overlapReceiptLoser.receipt_id, explicitRevocation: true, actorId: "cas-loser", reason: "candidate claim lost",
        });
        const validReceiptLedger = (0, memory_control_center_1.readJson)(receiptFileA, {});
        fs.writeFileSync(receiptFileA, JSON.stringify({ ...validReceiptLedger, revision: Number(validReceiptLedger.revision || 0) + 1 }, null, 2), "utf-8");
        const tamperedStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T10:04:00.000Z" });
        const tempTamper = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.cas-tamper.tmp`);
        fs.writeFileSync(tempTamper, "phase206-cas-tamper", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T10:04:01.000Z", persist: true });
        let tamperedLedgerWriteBlocked = false;
        try {
            createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                at: "2026-07-12T10:04:02.000Z", explicitApproval: true, actorRole: "local-user", actorId: "cas-tamper", reason: "tampered ledger must block",
            });
        }
        catch (error) {
            tamperedLedgerWriteBlocked = String(error?.message || error).includes("cleanup_receipt_ledger_checksum_invalid");
        }
        fs.writeFileSync(receiptFileA, JSON.stringify(validReceiptLedger, null, 2), "utf-8");
        const finalStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T10:05:00.000Z" });
        const finalReceiptLedger = (0, memory_control_center_1.readJson)(receiptFileA, {});
        const finalJournalLedger = (0, memory_control_center_1.readJson)(journalFileA, {});
        const finalQuarantine = (0, memory_control_center_1.readJson)(quarantineFileA, {});
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_ledger_cas"],
            groupIds: [groupA, groupB], now: "2026-07-12T10:05:01.000Z", refresh: true, writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const receiptAAfter = (finalReceiptLedger.entries || []).find((entry) => entry.receipt_id === receiptA.receipt_id) || {};
        const receiptBAfter = (finalReceiptLedger.entries || []).find((entry) => entry.receipt_id === receiptB.receipt_id) || {};
        const journalAAfter = (finalJournalLedger.entries || []).find((entry) => entry.receipt_id === receiptA.receipt_id) || {};
        const journalBAfter = (finalJournalLedger.entries || []).find((entry) => entry.receipt_id === receiptB.receipt_id) || {};
        const checks = {
            differentReceiptsInterleaveAndBothExecute: executionA.status === "executed" && executionB?.status === "executed",
            receiptLedgerMergesBothConcurrentConsumptions: receiptAAfter.consumed === true
                && receiptBAfter.consumed === true
                && Number(receiptLedgerAfterB?.revision || 0) > receiptRevisionBefore
                && Number(finalReceiptLedger.revision || 0) > Number(receiptLedgerAfterB?.revision || 0),
            journalLedgerMergesBothConcurrentExecutions: journalAAfter.status === "completed"
                && journalBAfter.status === "completed"
                && Number(journalLedgerAfterB?.revision || 0) > journalRevisionBefore
                && Number(finalJournalLedger.revision || 0) > Number(journalLedgerAfterB?.revision || 0),
            quarantineCommitsPreserveBothCandidateCleanups: !fs.existsSync(tempA1)
                && !fs.existsSync(tempA2)
                && Number(finalQuarantine.compacted_quarantine_count || 0) >= 3,
            overlappingCandidateHasSingleJournalClaim: overlapWinnerExecution.status === "executed"
                && overlapLoserExecution?.reason === "cleanup_candidate_claim_conflict"
                && (finalJournalLedger.entries || []).filter((entry) => (entry.candidates || []).some((candidate) => candidate.quarantine_id === overlapId)).length === 1,
            losingOverlappingReceiptRemainsRevocable: revokedLoser.revoked === true
                && (finalReceiptLedger.entries || []).filter((entry) => entry.receipt_id === overlapReceiptLoser.receipt_id).length === 1,
            ledgerChecksumTamperingBlocksFurtherCommit: tamperedStatus.receipt_ledger_checksum_valid === false && tamperedLedgerWriteBlocked,
            revisionsChecksumsClaimsAndLockAreHealthy: finalStatus.receipt_ledger_checksum_valid === true
                && finalStatus.journal_ledger_checksum_valid === true
                && finalStatus.quarantine_checksum_valid === true
                && finalStatus.receipt_ledger_revision > 0
                && finalStatus.journal_ledger_revision > 0
                && finalStatus.quarantine_revision > 0
                && finalStatus.candidate_claim_conflict_count === 0
                && finalStatus.group_ledger_lock?.present === false,
            crossGroupEvidenceRemainsIsolated: fs.existsSync(tempB),
            ledgerCasDoesNotChangeTasksGcApprovalsOrColdShards: (0, db_1.loadTasks)().length === tasksBefore
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && shardCountAfter === shardCountBefore,
            ledgerCasQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_ledger_cas"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            interleaved: { executionA, executionB, receiptRevisionBefore, receiptRevisionAfterB: receiptLedgerAfterB?.revision, receiptRevisionFinal: finalReceiptLedger.revision, journalRevisionBefore, journalRevisionAfterB: journalLedgerAfterB?.revision, journalRevisionFinal: finalJournalLedger.revision },
            overlap: { winner: overlapWinnerExecution, loser: overlapLoserExecution, revoked: revokedLoser.revoked },
            ledgers: { receiptRevision: finalStatus.receipt_ledger_revision, journalRevision: finalStatus.journal_ledger_revision, quarantineRevision: finalStatus.quarantine_revision, claimConflicts: finalStatus.candidate_claim_conflict_count },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed, weak: quality.report?.weakGroups || [] },
        };
    }
    finally {
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitWalSelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cleanup-wal-a-${suffix}`;
    const groupB = `memory-center-cleanup-wal-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const schedulerStateFile = path.join(memory_control_center_1.CONTROL_DIR, `cleanup-wal-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, } = require("../collaboration/group-memory-index");
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `cleanup-wal-task-${marker}-${index}`,
        task_text: `Cleanup WAL task ${marker} ${index}`,
        task_family_key: `cleanup-wal-family-${marker}-${index}`,
        task_family_tokens: ["cleanup", "wal", marker, String(index)],
        entry_id: `cleanup-wal-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `cleanup WAL current source verified ${marker}-${index}`,
        worker_context_packet_id: `cleanup-wal-packet-${marker}-${index}`,
        binding_id: `cleanup-wal-binding-${marker}-${index}`,
        task_agent_session_id: `cleanup-wal-task-session-${marker}-${index}`,
        native_session_id: `cleanup-wal-native-session-${marker}-${index}`,
        execution_id: `cleanup-wal-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `cleanup-wal-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 11, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T10:50:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:51:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T10:52:00.000Z", hotRowLimit: 24 });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T10:55:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
            at: "2026-07-12T10:56:00.000Z", recordDelivery: true, contextId: `${marker}-wal-context`, consumerSessionId: `${marker}-wal-session`,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const coldDirA = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA));
        const coldDirB = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB));
        const tempB = path.join(coldDirB, `maintenance-notification-deliveries.json.${process.pid}.wal-other-group.tmp`);
        fs.writeFileSync(tempB, "phase207-other-group", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupB, { at: "2026-07-12T11:58:00.000Z", persist: true });
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const collaborationModule = path.resolve(__dirname, "../collaboration/group-memory-index.js");
        const childProcess = require("child_process");
        const phases = ["prepared", "quarantine", "receipt", "journal"];
        const phaseRows = [];
        for (let index = 0; index < phases.length; index++) {
            const phase = phases[index];
            const baseMs = Date.parse("2026-07-12T12:00:00.000Z") + index * 120_000;
            const temp = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.wal-${phase}.tmp`);
            fs.writeFileSync(temp, `phase207-${phase}`, "utf-8");
            reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: new Date(baseMs).toISOString(), persist: true });
            const quarantine = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupA), {});
            const quarantineId = (quarantine.entries || []).find((entry) => path.resolve(String(entry.source_path || "")) === path.resolve(temp))?.quarantine_id || "";
            const receipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                at: new Date(baseMs + 10_000).toISOString(), explicitApproval: true, actorRole: "group-main-agent", actorId: `wal-${phase}`, reason: `WAL crash after ${phase}`, quarantineIds: [quarantineId],
            });
            const childScript = [
                "const m=require(process.argv[1]);",
                `const r=m.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(process.argv[2],{at:'${new Date(baseMs + 20_000).toISOString()}',receiptId:process.argv[3],explicitExecution:true,leaseTtlMs:300000,simulateCommitCrashAfter:process.argv[4]});`,
                "process.stdout.write(JSON.stringify(r));",
                "process.exit(r.status==='interrupted'?0:1);",
            ].join("");
            const childRun = childProcess.spawnSync(process.execPath, ["-e", childScript, collaborationModule, groupA, receipt.receipt_id, phase], {
                cwd: process.cwd(), encoding: "utf-8", windowsHide: true, timeout: 30_000,
            });
            let interrupted = null;
            try {
                interrupted = JSON.parse(String(childRun.stdout || "{}"));
            }
            catch {
                interrupted = { status: "invalid_child_output", stderr: childRun.stderr };
            }
            const reconciliation = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournals(groupA, {
                at: new Date(baseMs + 21_000).toISOString(), persist: true,
            });
            const status = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: new Date(baseMs + 22_000).toISOString() });
            const transaction = (status.commit_transactions || []).find((entry) => entry.execution_id === interrupted?.execution_id) || null;
            phaseRows.push({ phase, temp, receipt, childStatus: childRun.status, interrupted, reconciliation, status, transaction });
        }
        const lockTemp = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.wal-lock.tmp`);
        fs.writeFileSync(lockTemp, "phase207-lock", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T12:09:00.000Z", persist: true });
        const lockFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupA);
        for (let index = 0; index < 40; index++)
            fs.writeFileSync(`${lockFile}.abandoned.fake-${index}`, `lock-history-${index}`, "utf-8");
        let nestedLockError = "";
        let nestedLockElapsedMs = 0;
        const lockReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T12:09:10.000Z", explicitApproval: true, actorRole: "local-user", actorId: "wal-lock-owner", reason: "lock backoff and history",
            onGroupLedgerLockAcquired: () => {
                const started = Date.now();
                try {
                    createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                        at: "2026-07-12T12:09:11.000Z", explicitApproval: true, actorRole: "local-user", actorId: "wal-lock-contender", reason: "must back off",
                    });
                }
                catch (error) {
                    nestedLockError = String(error?.message || error);
                }
                nestedLockElapsedMs = Date.now() - started;
            },
        });
        const groupLockArchives = fs.readdirSync(path.dirname(lockFile)).filter((name) => name.startsWith(`${path.basename(lockFile)}.abandoned.`));
        revokePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T12:09:20.000Z", receiptId: lockReceipt.receipt_id, explicitRevocation: true, actorId: "wal-lock-owner", reason: "lock probe complete",
        });
        const leaseTemp = path.join(coldDirA, `maintenance-notification-deliveries.json.${process.pid}.wal-lease-history.tmp`);
        fs.writeFileSync(leaseTemp, "phase207-lease-history", "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupA, { at: "2026-07-12T12:10:00.000Z", persist: true });
        const leaseQuarantine = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupA), {});
        const leaseQuarantineId = (leaseQuarantine.entries || []).find((entry) => path.resolve(String(entry.source_path || "")) === path.resolve(leaseTemp))?.quarantine_id || "";
        const leaseReceipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T12:10:10.000Z", explicitApproval: true, actorRole: "global-agent", actorId: "wal-lease-history", reason: "lease history bound", quarantineIds: [leaseQuarantineId],
        });
        const leaseFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupLeaseFile(groupA, leaseReceipt.receipt_id);
        fs.mkdirSync(path.dirname(leaseFile), { recursive: true });
        for (let index = 0; index < 24; index++)
            fs.writeFileSync(`${leaseFile}.abandoned.fake-${index}`, `lease-history-${index}`, "utf-8");
        const leaseExecution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
            at: "2026-07-12T12:10:20.000Z", receiptId: leaseReceipt.receipt_id, explicitExecution: true,
        });
        const leaseArchives = fs.readdirSync(path.dirname(leaseFile)).filter((name) => name.startsWith(`${path.basename(leaseFile)}.abandoned.`));
        const commitFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile(groupA);
        const validCommitLedger = (0, memory_control_center_1.readJson)(commitFile, {});
        fs.writeFileSync(commitFile, JSON.stringify({
            ...validCommitLedger,
            entries: (validCommitLedger.entries || []).map((entry, index) => index === 0 ? { ...entry, transaction_checksum: "phase207-tampered" } : entry),
        }, null, 2), "utf-8");
        const tamperedStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T12:11:00.000Z" });
        fs.writeFileSync(commitFile, JSON.stringify(validCommitLedger, null, 2), "utf-8");
        const scheduler = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T12:12:00.000Z", groupIds: [groupA, groupB], force: true, stateFile: schedulerStateFile, tickWindowMs: 60_000, intervalMs: 60_000, gracePeriodMs: 0,
        });
        const finalStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T12:12:01.000Z" });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_wal"],
            groupIds: [groupA, groupB], now: "2026-07-12T12:12:02.000Z", refresh: true, writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const phasePass = (phase) => {
            const row = phaseRows.find(item => item.phase === phase);
            return row?.childStatus === 0
                && row?.interrupted?.status === "interrupted"
                && row?.interrupted?.commit_phase === (phase === "prepared" ? "prepared" : `${phase}_committed`)
                && row?.reconciliation?.deleted_count === 0
                && row?.transaction?.status === "completed"
                && row?.transaction?.phase === "completed"
                && row?.transaction?.revision_bindings_valid === true
                && !fs.existsSync(row.temp);
        };
        const checks = {
            preparedCrashRecoversFromWal: phasePass("prepared"),
            quarantineCommitCrashRecoversFromWal: phasePass("quarantine"),
            receiptCommitCrashRecoversFromWal: phasePass("receipt"),
            journalCommitCrashRecoversTerminalWal: phasePass("journal"),
            recoveryNeverRepeatsEvidenceDeletion: phaseRows.every(row => row.reconciliation.deleted_count === 0),
            allTransactionsCloseWithRevisionBindings: finalStatus.open_commit_transaction_count === 0
                && finalStatus.invalid_commit_transaction_count === 0
                && finalStatus.commit_transactions.every((transaction) => transaction.status === "completed" && transaction.revision_bindings_valid === true),
            commitTamperingIsDetected: tamperedStatus.commit_ledger_checksum_valid === false && tamperedStatus.invalid_commit_transaction_count > 0,
            groupLockContentionUsesBoundedBackoff: nestedLockError === "cleanup_group_ledger_lock_busy"
                && nestedLockElapsedMs >= 100
                && nestedLockElapsedMs < 1_500,
            abandonedGroupLockHistoryIsBounded: groupLockArchives.length <= 32,
            abandonedReceiptLeaseHistoryIsBounded: leaseExecution.status === "executed" && leaseArchives.length <= 16,
            schedulerReportsWalHealthWithoutDeletion: scheduler.deliveryCleanupOpenCommitTransactionCount === 0
                && scheduler.deliveryCleanupInvalidCommitTransactionCount === 0
                && scheduler.deliveryCleanupDeletedCount === 0,
            latestWalQualityGatePasses: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_wal"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 1
                && Number(quality.passed || 0) === 1,
            walRecoveryPreservesOtherGroupTasksApprovalsAndShards: fs.existsSync(tempB)
                && (0, db_1.loadTasks)().length === tasksBefore
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0
                && shardCountAfter === shardCountBefore,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            phases: phaseRows.map(row => ({ phase: row.phase, interrupted: row.interrupted, transaction: row.transaction, reconciled: row.reconciliation.reconciled_journal_count, deleted: row.reconciliation.deleted_count })),
            contention: { error: nestedLockError, elapsedMs: nestedLockElapsedMs, groupLockArchiveCount: groupLockArchives.length, leaseArchiveCount: leaseArchives.length },
            wal: { revision: finalStatus.commit_ledger_revision, transactions: finalStatus.commit_transaction_count, open: finalStatus.open_commit_transaction_count, invalid: finalStatus.invalid_commit_transaction_count, recovered: finalStatus.recovered_commit_transaction_count },
            scheduler: { open: scheduler.deliveryCleanupOpenCommitTransactionCount, invalid: scheduler.deliveryCleanupInvalidCommitTransactionCount, recovered: scheduler.deliveryCleanupRecoveredCommitTransactionCount, deleted: scheduler.deliveryCleanupDeletedCount },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed, weak: quality.report?.weakGroups || [] },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscoverySelfTest() {
    const suffix = `${process.pid}-${Date.now()}`;
    const groupA = `memory-center-cleanup-discovery-a-${suffix}`;
    const groupB = `memory-center-cleanup-discovery-b-${suffix}`;
    const typedDirA = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupA));
    const typedDirB = path.join(memory_control_center_1.GROUP_TYPED_MEMORY_MD_DIR, (0, memory_control_center_1.sidecarFileId)(groupB));
    const schedulerStateFile = path.join(memory_control_center_1.CONTROL_DIR, `cleanup-discovery-scheduler-selftest-${suffix}.json`);
    const tasksBefore = (0, db_1.loadTasks)().length;
    const { buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext, createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits, distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory, executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt, getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile, getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile, inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup, reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance, runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery, } = require("../collaboration/group-memory-index");
    const { runConflictResolutionMemoryMaintenanceSchedulerTick } = require("../scheduling/cron");
    const rowFor = (groupId, marker, index) => ({
        group_id: groupId,
        target_project: "api",
        task_id: `cleanup-discovery-task-${marker}-${index}`,
        task_text: `Cleanup discovery task ${marker} ${index}`,
        task_family_key: `cleanup-discovery-family-${marker}-${index}`,
        task_family_tokens: ["cleanup", "discovery", marker, String(index)],
        entry_id: `cleanup-discovery-resolution-${marker}-${index}`,
        conflict_resolution_state: "verified",
        current_source_verified: true,
        reason: `cleanup discovery current source verified ${marker}-${index}`,
        worker_context_packet_id: `cleanup-discovery-packet-${marker}-${index}`,
        binding_id: `cleanup-discovery-binding-${marker}-${index}`,
        task_agent_session_id: `cleanup-discovery-task-session-${marker}-${index}`,
        native_session_id: `cleanup-discovery-native-session-${marker}-${index}`,
        execution_id: `cleanup-discovery-execution-${marker}-${index}`,
        receipt_source: "child-agent-receipt",
        receipt_status: "completed",
        conflict_parent_arbitration_state: "contradictory_reverify_current_session",
        conflict_parent_fingerprint: `cleanup-discovery-fingerprint-${marker}-${index}`,
        conflict_parent_ratio: 0.5,
        conflict_parent_positive_weight: 1,
        conflict_parent_ignored_weight: 1,
        conflict_resolution_reversible: true,
        generated_at: new Date(Date.UTC(2026, 6, 12, 13, 0, index)).toISOString(),
    });
    const seed = (groupId, marker) => {
        const initial = Array.from({ length: 32 }, (_, index) => rowFor(groupId, marker, index));
        const updates = [0, 1, 2].map(index => rowFor(groupId, marker, index));
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, initial, { updatedAt: "2026-07-12T12:50:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T12:51:00.000Z", hotRowLimit: 24 });
        distillPostCompactCompletionMemoryPreservationClosureConflictResolutionToTypedMemory(groupId, updates, { updatedAt: "2026-07-12T12:52:00.000Z", hotRowLimit: 24 });
        runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenance(groupId, { at: "2026-07-12T12:55:00.000Z", trigger: "background", gracePeriodMs: 0, emitNotifications: true });
        buildPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationContext(groupId, "group-main-agent", {
            at: "2026-07-12T12:56:00.000Z", recordDelivery: true, contextId: `${marker}-discovery-context`, consumerSessionId: `${marker}-discovery-session`,
        });
    };
    const countShardFiles = (dir) => {
        let count = 0;
        const visit = (current) => {
            let entries = [];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const file = path.join(current, entry.name);
                if (entry.isDirectory())
                    visit(file);
                else if (entry.isFile() && /[\\/]shards[\\/]/.test(file) && entry.name.endsWith(".json"))
                    count++;
            }
        };
        visit(dir);
        return count;
    };
    const createSingleCandidateReceipt = (groupId, coldDir, label, atMs, actorId) => {
        const temp = path.join(coldDir, `maintenance-notification-deliveries.json.${process.pid}.discovery-${label}.tmp`);
        fs.writeFileSync(temp, `phase208-${label}`, "utf-8");
        reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryOrphans(groupId, { at: new Date(atMs).toISOString(), persist: true });
        const quarantine = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId), {});
        const quarantineId = (quarantine.entries || []).find((entry) => path.resolve(String(entry.source_path || "")) === path.resolve(temp))?.quarantine_id || "";
        const receipt = createPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupId, {
            at: new Date(atMs + 1_000).toISOString(), explicitApproval: true, actorRole: "group-main-agent", actorId, reason: `startup discovery ${label}`, quarantineIds: [quarantineId],
        });
        return { temp, receipt };
    };
    try {
        seed(groupA, "a");
        seed(groupB, "b");
        const coldDirA = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupA));
        const coldDirB = path.dirname(getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupB));
        const shardCountBefore = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const compactExecutions = [];
        for (let index = 0; index < 7; index++) {
            const atMs = Date.parse("2026-07-12T13:00:00.000Z") + index * 20_000;
            const item = createSingleCandidateReceipt(groupA, coldDirA, `compact-${index}`, atMs, `compact-${index}`);
            const execution = executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(groupA, {
                at: new Date(atMs + 2_000).toISOString(), receiptId: item.receipt.receipt_id, explicitExecution: true, commitTerminalLimit: 4,
            });
            compactExecutions.push({ ...item, execution });
        }
        const compactStatus = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupA, { at: "2026-07-12T13:03:00.000Z" });
        const schedulerA = runConflictResolutionMemoryMaintenanceSchedulerTick({
            at: "2026-07-12T13:03:10.000Z", groupIds: [groupA], force: true, stateFile: schedulerStateFile, tickWindowMs: 60_000, intervalMs: 60_000, gracePeriodMs: 0,
        });
        const collaborationModule = path.resolve(__dirname, "../collaboration/group-memory-index.js");
        const childProcess = require("child_process");
        const crashAndParse = (item, at) => {
            const script = [
                "const m=require(process.argv[1]);",
                `const r=m.executePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupReceipt(process.argv[2],{at:'${at}',receiptId:process.argv[3],explicitExecution:true,leaseTtlMs:300000,simulateCommitCrashAfter:'prepared'});`,
                "process.stdout.write(JSON.stringify(r));",
                "process.exit(r.status==='interrupted'?0:1);",
            ].join("");
            const run = childProcess.spawnSync(process.execPath, ["-e", script, collaborationModule, groupB, item.receipt.receipt_id], { cwd: process.cwd(), encoding: "utf-8", windowsHide: true, timeout: 30_000 });
            let result = null;
            try {
                result = JSON.parse(String(run.stdout || "{}"));
            }
            catch {
                result = { status: "invalid_child_output", stderr: run.stderr };
            }
            return { run, result };
        };
        const recoverableItem = createSingleCandidateReceipt(groupB, coldDirB, "recoverable", Date.parse("2026-07-12T13:10:00.000Z"), "recoverable");
        const recoverableCrash = crashAndParse(recoverableItem, "2026-07-12T13:10:02.000Z");
        const automaticDiscovery = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery([groupB], {
            at: "2026-07-12T13:10:03.000Z", persist: true, recover: true, trigger: "startup-selftest",
        });
        const afterAutomatic = inspectPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanup(groupB, { at: "2026-07-12T13:10:04.000Z" });
        const orphanItem = createSingleCandidateReceipt(groupB, coldDirB, "orphan", Date.parse("2026-07-12T13:12:00.000Z"), "orphan");
        const orphanCrash = crashAndParse(orphanItem, "2026-07-12T13:12:02.000Z");
        const journalFileB = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupJournalFile(groupB);
        const validJournalLedger = (0, memory_control_center_1.readJson)(journalFileB, {});
        fs.writeFileSync(journalFileB, JSON.stringify({
            ...validJournalLedger,
            entries: (validJournalLedger.entries || []).filter((entry) => entry.execution_id !== orphanCrash.result.execution_id),
        }, null, 2), "utf-8");
        const orphanDiscovery = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupB, {
            at: "2026-07-12T13:12:03.000Z", persist: true, recover: true, trigger: "startup-selftest",
        });
        const orphanDiscoveryRepeat = discoverPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommits(groupB, {
            at: "2026-07-12T13:12:04.000Z", persist: true, recover: true, trigger: "startup-selftest-repeat",
        });
        const quarantineArtifacts = (0, memory_control_center_1.readJson)(orphanDiscovery.quarantine_file, {});
        const workItems = (0, memory_control_center_1.readJson)(orphanDiscovery.repair_work_item_file, {});
        const briefs = (0, memory_control_center_1.readJson)(orphanDiscovery.repair_dispatch_brief_file, {});
        const startupWide = runPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupCommitStartupDiscovery([groupA, groupB], {
            at: "2026-07-12T13:12:05.000Z", persist: true, recover: true, trigger: "startup-wide-selftest",
        });
        const qualityReport = (0, memory_control_center_1.buildMemoryQualityReport)({
            checkIds: ["post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_startup_discovery"],
            groupIds: [groupA, groupB], now: "2026-07-12T13:12:06.000Z", refresh: true, writeTargeted: false,
        });
        const quality = qualityReport.checks?.[0] || {};
        const approvalEntriesA = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupA), {})?.entries || [];
        const approvalEntriesB = (0, memory_control_center_1.readJson)(getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupB), {})?.entries || [];
        const shardCountAfter = countShardFiles(typedDirA) + countShardFiles(typedDirB);
        const orphanTransactionId = orphanCrash.result.commit_transaction_id;
        const checks = {
            terminalWalHistoryCompactsWithAuditRoot: compactExecutions.every(row => row.execution.status === "executed")
                && compactStatus.commit_transaction_count === 4
                && compactStatus.commit_compacted_transaction_count === 3
                && compactStatus.commit_compacted_history_valid === true
                && !!compactStatus.commit_compacted_history?.transaction_ids_root
                && !!compactStatus.commit_compacted_history?.transaction_checksums_root,
            schedulerRunsIndependentDiscoveryForHealthyGroup: schedulerA.deliveryCleanupDiscoveredCommitTransactionCount === 4
                && schedulerA.deliveryCleanupInvalidDiscoveredCommitTransactionCount === 0
                && schedulerA.deliveryCleanupDeletedCount === 0,
            startupDiscoveryAutomaticallyRecoversExactOpenWal: recoverableCrash.run.status === 0
                && automaticDiscovery.rows?.[0]?.automatic_recovery_attempted === true
                && afterAutomatic.open_commit_transaction_count === 0
                && afterAutomatic.recovered_commit_transaction_count >= 1,
            missingJournalRowIsFoundFromWalNotJournalTraversal: orphanCrash.run.status === 0
                && orphanDiscovery.transaction_count >= 2
                && orphanDiscovery.invalid_transaction_count >= 1
                && orphanDiscovery.rows.some((row) => row.transaction_id === orphanTransactionId && row.gaps.includes("transaction_journal_missing")),
            unprovenWalIsQuarantinedWithoutDeletion: orphanDiscovery.quarantined_transaction_count >= orphanDiscovery.invalid_transaction_count
                && orphanDiscovery.destructive_action_authorized === false
                && orphanDiscovery.deleted_count === 0
                && (quarantineArtifacts.entries || []).some((entry) => entry.transaction_id === orphanTransactionId),
            repairWorkItemAndDispatchBriefAreMaterialized: (workItems.entries || []).some((entry) => entry.transaction_id === orphanTransactionId && entry.status === "pending" && entry.should_create_real_task === false)
                && (briefs.entries || []).some((entry) => entry.transaction_id === orphanTransactionId && entry.target_agent_role === "group-main-agent" && entry.should_create_real_task === false),
            discoveryArtifactsAreIdempotent: orphanDiscoveryRepeat.repair_work_item_count === orphanDiscovery.repair_work_item_count
                && orphanDiscoveryRepeat.repair_dispatch_brief_count === orphanDiscovery.repair_dispatch_brief_count
                && (0, memory_control_center_1.readJson)(orphanDiscovery.repair_work_item_file, {}).entries.length === workItems.entries.length,
            startupWideDiscoveryCoversMultipleGroups: startupWide.group_count === 2
                && startupWide.invalid_transaction_count === orphanDiscovery.invalid_transaction_count
                && startupWide.repair_work_item_count >= orphanDiscovery.invalid_transaction_count
                && startupWide.deleted_count === 0,
            startupDiscoveryQualityAcceptsHealthyOrContainedState: quality.id === "post_compact_completion_memory_preservation_closure_conflict_resolution_maintenance_notification_delivery_cleanup_commit_startup_discovery"
                && quality.status === "ok"
                && Number(quality.checked || 0) === 2
                && Number(quality.passed || 0) === 2,
            discoveryCreatesNoRealTasksOrApprovals: (0, db_1.loadTasks)().length === tasksBefore
                && approvalEntriesA.length === 0
                && approvalEntriesB.length === 0,
            discoveryPreservesColdShardsAndEvidence: shardCountAfter === shardCountBefore
                && !fs.existsSync(orphanItem.temp),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            compact: { retained: compactStatus.commit_transaction_count, compacted: compactStatus.commit_compacted_transaction_count, history: compactStatus.commit_compacted_history },
            automatic: { crash: recoverableCrash.result, discovery: automaticDiscovery.rows?.[0], openAfter: afterAutomatic.open_commit_transaction_count },
            orphan: { crash: orphanCrash.result, discovery: orphanDiscovery, quarantineCount: quarantineArtifacts.entries?.length || 0, workItemCount: workItems.entries?.length || 0, briefCount: briefs.entries?.length || 0 },
            startupWide: { groups: startupWide.group_count, invalid: startupWide.invalid_transaction_count, repairs: startupWide.repair_work_item_count, briefs: startupWide.repair_dispatch_brief_count },
            quality: { id: quality.id, status: quality.status, checked: quality.checked, passed: quality.passed, weak: quality.report?.weakGroups || [] },
        };
    }
    finally {
        for (const file of [schedulerStateFile, `${schedulerStateFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
        for (const dir of [typedDirA, typedDirB]) {
            try {
                if (dir && fs.existsSync(dir))
                    fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
    }
}
function runMemoryCenterHistoricalCompactBoundaryReplaySelfTest() {
    const groupId = `memory-center-historical-replay-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const replayRepairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    try {
        const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
        const boundaries = [
            {
                id: "historical-boundary-a",
                summarizedThroughMessageId: "history-a-10",
                summarizedMessageCount: 10,
                summaryChecksum: "historical-summary-a",
                preCompactTokenCount: 9000,
                postCompactTokenCount: 2100,
                lastCompactedAt: "2026-07-07T06:00:00.000Z",
            },
            {
                id: "historical-boundary-b",
                summarizedThroughMessageId: "history-b-18",
                summarizedMessageCount: 18,
                summaryChecksum: "historical-summary-b",
                preCompactTokenCount: 11200,
                postCompactTokenCount: 2600,
                lastCompactedAt: "2026-07-07T06:10:00.000Z",
            },
        ];
        const memory = {
            groupId,
            goal: "验证历史 compact boundary replay 能覆盖多个旧边界",
            persistentRequirements: [{ messageId: "history-req", text: "必须保留 HISTORICAL_BOUNDARY_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 18,
                preservedRecentMessages: 4,
                summaryChecksum: "historical-summary-b",
                lastCompactedMessageId: "history-b-18",
                lastCompactedAt: "2026-07-07T06:10:00.000Z",
                preCompactTokenCount: 11200,
                postCompactTokenCount: 2600,
                boundaries,
                postCompactReinject: {
                    schema: "ccm-post-compact-reinjection-v1",
                    files: [{ candidate_id: "historical_file", value: "src/historical-boundary.ts", sourceMessageId: "history-a-2" }],
                    verification: [{ candidate_id: "historical_check", value: "npm run test:historical-boundary", sourceMessageId: "history-b-3" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    checkCount: 2,
                    passedChecks: 2,
                    summaryChecksum: "historical-summary-b",
                },
            },
            compactBoundary: boundaries[1],
            agentMemories: { api: { project: "api", frequentFiles: ["src/historical-boundary.ts"] } },
        };
        saveGroupMemory(groupId, memory);
        const direct = (0, memory_control_center_1.buildGroupHistoricalCompactBoundaryReplay)(groupId, memory, {});
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const historical = detail.postCompactUsage?.historicalBoundaryReplay || {};
        const report = (0, memory_control_center_1.buildHistoricalCompactBoundaryReplayReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateHistoricalCompactBoundaryReplay)({ groupIds: [groupId] });
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: memory.goal, currentPhase: "test" },
            compaction: {
                boundaryHistory: {
                    schema: "ccm-compact-boundary-history-summary-v1",
                    boundaryCount: boundaries.length,
                    latest: { summaryChecksum: "historical-summary-b" },
                    rows: boundaries,
                },
            },
        });
        const checks = {
            directReplaysMultipleBoundaries: direct.schema === "ccm-historical-compact-boundary-replay-v1"
                && direct.boundaryCount === 2
                && direct.replayedBoundaryCount === 2
                && direct.passedBoundaryCount === 2
                && Number(direct.score || 0) >= 95,
            detailExposesHistoricalReplay: historical.schema === "ccm-historical-compact-boundary-replay-v1"
                && historical.boundaries?.some((row) => row.summaryChecksum === "historical-summary-a")
                && historical.boundaries?.some((row) => row.summaryChecksum === "historical-summary-b"),
            reportAggregatesHistoricalReplay: report.schema === "ccm-historical-compact-boundary-replay-report-v1"
                && report.overall?.boundaryCount === 2
                && report.overall?.status === "ok",
            qualityCheckPassesHistoricalReplay: check.id === "historical_compact_boundary_replay"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            childAgentRendererMentionsBoundaryHistory: rendered.includes("历史压缩边界")
                && rendered.includes("historical-summary-b"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, historical };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, replayRepairLedgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
function runMemoryCenterChildAgentTypeReplayMatrixSelfTest() {
    const groupId = `memory-center-agent-type-replay-selftest-${process.pid}-${Date.now()}`;
    const groupFile = path.join(memory_control_center_1.GROUP_MEMORY_DIR, `${groupId}.json`);
    const replayRepairLedgerFile = (0, memory_control_center_1.getGroupCompactBoundaryReplayRepairLedgerFile)(groupId);
    const reloadFile = path.join(utils_1.CCM_DIR, "group-memory-reload", `${(0, memory_control_center_1.cleanId)(groupId)}.json`);
    try {
        const { saveGroupMemory, renderGroupMemoryContextBundle } = require("../collaboration/memory");
        const memory = {
            groupId,
            goal: "验证 Claude Code / Cursor / Codex 子 Agent 类型 replay matrix",
            persistentRequirements: [{ messageId: "agent-type-req", text: "必须保留 AGENT_TYPE_REPLAY_SENTINEL。" }],
            compaction: {
                version: 1,
                compactedMessageCount: 16,
                preservedRecentMessages: 5,
                summaryChecksum: "agent-type-summary",
                lastCompactedMessageId: "agent-type-16",
                lastCompactedAt: "2026-07-07T07:00:00.000Z",
                preCompactTokenCount: 9800,
                postCompactTokenCount: 2400,
                postCompactReinject: {
                    schema: "ccm-post-compact-reinjection-v1",
                    files: [{ candidate_id: "agent_type_file", value: "src/agent-type-replay.ts", sourceMessageId: "agent-type-2" }],
                    verification: [{ candidate_id: "agent_type_check", value: "npm run test:agent-type-replay", sourceMessageId: "agent-type-3" }],
                },
                postCompactRecoveryAudit: {
                    schema: "ccm-post-compact-recovery-audit-v1",
                    status: "pass",
                    pass: true,
                    checkCount: 2,
                    passedChecks: 2,
                    summaryChecksum: "agent-type-summary",
                },
            },
            compactBoundary: {
                id: "agent-type-boundary",
                summarizedThroughMessageId: "agent-type-16",
                summarizedMessageCount: 16,
                summaryChecksum: "agent-type-summary",
                preCompactTokenCount: 9800,
                postCompactTokenCount: 2400,
            },
            agentMemories: {
                api: { project: "api", agentType: "claudecode", frequentFiles: ["src/agent-type-replay.ts"] },
                web: { project: "web", agentType: "cursor", frequentFiles: ["src/agent-type-replay.ts"] },
                cli: { project: "cli", agentType: "codex", frequentFiles: ["src/agent-type-replay.ts"] },
            },
            workerLedger: [
                { project: "api", agentType: "claudecode", summary: "Claude Code handled API replay" },
                { project: "web", agentType: "cursor", summary: "Cursor handled UI replay" },
                { project: "cli", agentType: "codex", summary: "Codex handled CLI replay" },
            ],
        };
        saveGroupMemory(groupId, memory);
        const direct = (0, memory_control_center_1.buildGroupChildAgentTypeReplayMatrix)(groupId, memory, {});
        const report = (0, memory_control_center_1.buildChildAgentTypeReplayMatrixReport)({ groupIds: [groupId] });
        const check = (0, memory_control_center_1.evaluateChildAgentTypeReplayMatrix)({ groupIds: [groupId] });
        const detail = (0, memory_control_center_1.getMemoryCenterScope)("group", groupId);
        const matrix = detail.postCompactUsage?.agentTypeReplay || {};
        const rendered = renderGroupMemoryContextBundle({
            schema: "ccm-group-memory-context-v1",
            target_project: "api",
            memory_policy: { use: "must_consider" },
            group_state: { goal: memory.goal, currentPhase: "test" },
            compaction: {
                childAgentTypes: {
                    schema: "ccm-child-agent-type-summary-v1",
                    agentTypeCount: 3,
                    targetCount: 3,
                    rows: [
                        { agentType: "claudecode", targetCount: 1, targets: [{ targetProject: "api" }] },
                        { agentType: "cursor", targetCount: 1, targets: [{ targetProject: "web" }] },
                        { agentType: "codex", targetCount: 1, targets: [{ targetProject: "cli" }] },
                    ],
                },
            },
        });
        const typeNames = JSON.stringify(direct.agentTypes || []);
        const checks = {
            directScoresThreeAgentTypes: direct.schema === "ccm-child-agent-type-replay-matrix-v1"
                && direct.agentTypeCount === 3
                && direct.targetCount === 3
                && ["claudecode", "cursor", "codex"].every(name => typeNames.includes(name))
                && Number(direct.score || 0) >= 95,
            detailExposesTypeMatrix: matrix.schema === "ccm-child-agent-type-replay-matrix-v1"
                && matrix.agentTypes?.some((row) => row.agentType === "claudecode")
                && matrix.agentTypes?.some((row) => row.agentType === "cursor")
                && matrix.agentTypes?.some((row) => row.agentType === "codex"),
            reportAggregatesTypeMatrix: report.schema === "ccm-child-agent-type-replay-matrix-report-v1"
                && report.overall?.targetCount === 3
                && report.overall?.status === "ok",
            qualityCheckPassesTypeMatrix: check.id === "child_agent_type_replay_matrix"
                && Number(check.checked || 0) === 1
                && Number(check.passed || 0) === 1,
            childAgentRendererMentionsTypeMatrix: rendered.includes("子 Agent 类型矩阵")
                && rendered.includes("claudecode")
                && rendered.includes("cursor")
                && rendered.includes("codex"),
        };
        return { pass: Object.values(checks).every(Boolean), checks, matrix };
    }
    finally {
        for (const file of [groupFile, `${groupFile}.bak`, replayRepairLedgerFile, reloadFile, `${reloadFile}.bak`]) {
            try {
                if (file && fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
//# sourceMappingURL=memory-control-maintenance-self-tests.js.map