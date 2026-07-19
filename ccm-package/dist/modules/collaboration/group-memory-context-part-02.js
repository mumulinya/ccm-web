"use strict";
// Behavior-freeze split from group-memory-context.ts (part 2/5).
// Behavior-freeze module extracted mechanically from the former facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPostCompactReinjectionRepairReceiptWorkerContextRecall = buildPostCompactReinjectionRepairReceiptWorkerContextRecall;
const group_memory_index_1 = require("./group-memory-index");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_context_part_01_1 = require("./group-memory-context-part-01");
function buildPostCompactReinjectionRepairReceiptWorkerContextRecall(groupId, task = "", memory = {}, options = {}) {
    const disabled = options.disablePostCompactReinjectionRepairReceiptRecall === true
        || options.disable_post_compact_reinjection_repair_receipt_recall === true;
    const empty = {
        schema: "ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1",
        version: 1,
        active: false,
        disabled,
        reason: disabled ? "disabled" : "no_verified_archive",
        archivedCount: 0,
        restoredCount: 0,
        cautionCount: 0,
        usedCount: 0,
        verifiedCount: 0,
        ignoredCount: 0,
        completionArchivedCount: 0,
        completionVerifiedCount: 0,
        preservationClosureArchivedCount: 0,
        preservationClosureVerifiedCount: 0,
        preservationClosureFeedbackConflict: null,
        preservationClosureFeedbackConflictActive: false,
        taskMatched: false,
        recalledThisTurn: false,
        docRelPaths: [],
        repeatableRelPaths: [],
        targetPaths: [],
        gateIds: [],
        candidateIds: [],
        completionWorkItemIds: [],
        completionTimelineBindingIds: [],
        completionOriginalWorkerContextPacketIds: [],
        preservationRepairWorkItemIds: [],
        preservationFailedRetryIds: [],
        preservationFailedOutcomeIds: [],
        preservationCorrectedRetryIds: [],
        preservationCorrectedOutcomeIds: [],
        taskAgentSessionIds: [],
        nativeSessionIds: [],
        originalTaskAgentSessionIds: [],
        originalNativeSessionIds: [],
        repairTaskAgentSessionIds: [],
        repairNativeSessionIds: [],
        queryAppend: "",
        freshnessBoundary: "historical repair completion is recovery evidence, not permanent repository truth; future use must reverify the current source",
        requiredReceiptFields: ["memoryUsed", "memoryIgnored"],
        rows: []
    };
    if (disabled)
        return empty;
    let archive = {};
    let completionArchive = {};
    let preservationClosureArchive = {};
    let preservationClosureConflictResolutionArchive = {};
    let archiveReadError = "";
    try {
        const ledger = (0, group_memory_index_1.readGroupTypedMemoryDistillationLedger)(groupId);
        archive = ledger.postCompactReinjectionRepairReceiptConsumptionArchive || {};
        completionArchive = ledger.postCompactReceiptMemoryUsageRepairCompletionArchive || {};
        preservationClosureArchive = ledger.postCompactCompletionMemoryPreservationRepairClosureArchive || {};
        preservationClosureConflictResolutionArchive = ledger.postCompactCompletionMemoryPreservationClosureConflictResolutionArchive || {};
    }
    catch (error) {
        archive = {};
        completionArchive = {};
        preservationClosureArchive = {};
        preservationClosureConflictResolutionArchive = {};
        archiveReadError = (0, group_memory_shared_1.compactMemoryText)(error?.message || error || "typed memory distillation ledger read failed", 500);
    }
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const completionRows = Array.isArray(completionArchive.rows) ? completionArchive.rows : [];
    const preservationClosureRows = Array.isArray(preservationClosureArchive.rows) ? preservationClosureArchive.rows : [];
    const preservationClosureConflictResolutionRows = Array.isArray(preservationClosureConflictResolutionArchive.rows) ? preservationClosureConflictResolutionArchive.rows : [];
    const repairArchivedCount = Number(archive.archived_count || rows.length || 0);
    const completionArchivedCount = Number(completionArchive.archived_count || completionRows.length || 0);
    const preservationClosureArchivedCount = Number(preservationClosureArchive.archived_count || preservationClosureRows.length || 0);
    const preservationClosureConflictResolutionArchivedCount = Number(preservationClosureConflictResolutionArchive.archived_count || preservationClosureConflictResolutionRows.length || 0);
    const archivedCount = repairArchivedCount + completionArchivedCount + preservationClosureArchivedCount + preservationClosureConflictResolutionArchivedCount;
    if (archivedCount <= 0)
        return archiveReadError ? { ...empty, reason: "archive_read_failed", archiveReadError } : empty;
    const recentRows = rows.slice(-12);
    const recentCompletionRows = completionRows.slice(-12);
    const recentPreservationClosureRows = preservationClosureRows.slice(-12);
    const taskText = [
        task,
        memory.goal,
        memory.currentPhase,
        memory.messageDigest,
        options.targetPaths,
        options.target_paths,
    ].map((item) => typeof item === "string" ? item : JSON.stringify(item || "")).join("\n");
    const preservationClosureUsageFeedback = (0, group_memory_index_1.buildPostCompactCompletionMemoryPreservationClosureUsageSummary)(groupId, {
        targetProject: options.targetProject || options.target_project || "",
        task,
        ignoredThreshold: options.postCompactClosureIgnoredThreshold || options.post_compact_closure_ignored_threshold || 2,
        postCompactClosureUsageHalfLifeDays: options.postCompactClosureUsageHalfLifeDays || options.post_compact_closure_usage_half_life_days,
        postCompactClosureUsageStaleAfterDays: options.postCompactClosureUsageStaleAfterDays || options.post_compact_closure_usage_stale_after_days,
        taskFamilyRelevanceThreshold: options.postCompactClosureTaskFamilyRelevanceThreshold || options.post_compact_closure_task_family_relevance_threshold,
        now: options.now || options.generatedAt || options.generated_at
    });
    const preservationClosureFeedbackConflict = preservationClosureUsageFeedback.feedbackConflict || null;
    const preservationClosureConflictResolution = preservationClosureUsageFeedback.feedbackConflictResolution || null;
    const preservationClosureConflictResolutionEntryId = String(preservationClosureConflictResolution?.resolution_entry_id || "");
    const recalledPreservationClosureConflictResolutionRows = preservationClosureConflictResolutionEntryId
        ? preservationClosureConflictResolutionRows.filter((row) => row.resolution_entry_id === preservationClosureConflictResolutionEntryId).slice(-4)
        : [];
    const effectivePreservationClosureConflictResolutionArchivedCount = recalledPreservationClosureConflictResolutionRows.length;
    const exactPreservationClosureIdentityMatched = recentPreservationClosureRows.some((row) => [
        row.work_item_id,
        row.failed_retry_id,
        row.failed_outcome_id,
        row.corrected_retry_id,
        row.corrected_outcome_id,
    ].some((token) => {
        const normalized = String(token || "").trim().toLowerCase();
        return normalized.length >= 4 && taskText.toLowerCase().includes(normalized);
    }));
    const preservationClosureRecallSuppressed = [
        "deprioritize_closure_recall",
        "require_receipt_repair_before_reuse",
    ].includes(String(preservationClosureUsageFeedback.recommendation || "")) && !exactPreservationClosureIdentityMatched;
    const recalledPreservationClosureRows = preservationClosureRecallSuppressed ? [] : recentPreservationClosureRows;
    const effectivePreservationClosureArchivedCount = preservationClosureRecallSuppressed ? 0 : preservationClosureArchivedCount;
    const taskMatched = options.forcePostCompactReinjectionRepairReceiptRecall === true
        || options.force_post_compact_reinjection_repair_receipt_recall === true
        || options.forcePostCompactReceiptMemoryUsageRepairCompletionRecall === true
        || options.force_post_compact_receipt_memory_usage_repair_completion_recall === true
        || options.forcePostCompactCompletionMemoryPreservationRepairClosureRecall === true
        || options.force_post_compact_completion_memory_preservation_repair_closure_recall === true
        || (0, group_memory_context_part_01_1.isPostCompactReinjectionRepairReceiptRecallQuery)(taskText, recentRows)
        || (0, group_memory_shared_1.isPostCompactReceiptMemoryUsageRepairCompletionRecallQuery)(taskText, recentCompletionRows)
        || (0, group_memory_shared_1.isPostCompactCompletionMemoryPreservationRepairClosureRecallQuery)(taskText, recalledPreservationClosureRows);
    const restoredCount = Number(archive.restored_count || rows.filter((row) => row.category !== "caution").length || 0);
    const cautionCount = Number(archive.caution_count || rows.filter((row) => row.category === "caution").length || 0);
    const docRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        restoredCount > 0 ? group_memory_shared_1.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_MEMORY_REL_PATH : "",
        cautionCount > 0 ? group_memory_shared_1.POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CAUTION_REL_PATH : "",
        completionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH : "",
        effectivePreservationClosureArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH : "",
        effectivePreservationClosureConflictResolutionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH : "",
    ], 5);
    if (repairArchivedCount + completionArchivedCount + effectivePreservationClosureArchivedCount + effectivePreservationClosureConflictResolutionArchivedCount <= 0) {
        return {
            ...empty,
            reason: preservationClosureRecallSuppressed ? "closure_recall_deprioritized_by_usage_feedback" : "no_recallable_verified_archive",
            archivedCount,
            preservationClosureArchivedCount,
            preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
            preservationClosureRecallSuppressed,
            exactPreservationClosureIdentityMatched,
            preservationClosureUsageFeedback,
            preservationClosureFeedbackConflict,
            preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
            preservationClosureConflictResolution,
            preservationClosureConflictResolutionArchivedCount,
            immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0
        };
    }
    if (!taskMatched) {
        return {
            ...empty,
            reason: "verified_archive_available_but_task_not_matched",
            archivedCount,
            restoredCount,
            cautionCount,
            usedCount: Number(archive.used_count || 0),
            verifiedCount: Number(archive.verified_count || 0),
            ignoredCount: Number(archive.ignored_count || 0),
            completionArchivedCount,
            completionVerifiedCount: Number(completionArchive.verified_count || 0),
            preservationClosureArchivedCount,
            preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
            preservationClosureRecallSuppressed,
            exactPreservationClosureIdentityMatched,
            preservationClosureUsageFeedback,
            preservationClosureFeedbackConflict,
            preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
            preservationClosureConflictResolution,
            preservationClosureConflictResolutionArchivedCount,
            immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0,
            taskMatched: false,
            docRelPaths
        };
    }
    const gateIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.reinjection_gate_id), 16);
    const candidateIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.post_compact_candidate_id), 16);
    const candidateValues = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.post_compact_candidate_value), 16);
    const sourceMessageIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.post_compact_candidate_source_message_id), 16);
    const taskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.task_agent_session_id), 16);
    const nativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentRows.map((row) => row.native_session_id), 16);
    const completionWorkItemIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.work_item_id), 16);
    const completionTimelineBindingIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.timeline_binding_id), 16);
    const completionOriginalWorkerContextPacketIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.original_worker_context_packet_id), 16);
    const preservationRepairWorkItemIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.work_item_id), 16);
    const preservationFailedRetryIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.failed_retry_id), 16);
    const preservationFailedOutcomeIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.failed_outcome_id), 16);
    const preservationCorrectedRetryIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.corrected_retry_id), 16);
    const preservationCorrectedOutcomeIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.map((row) => row.corrected_outcome_id), 16);
    const preservationCompletionDocRelPaths = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => row.completion_doc_rel_paths || []), 16);
    const preservationCompletionWorkItemIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => row.completion_work_item_ids || []), 24);
    const preservationCompletionTimelineBindingIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => row.completion_timeline_binding_ids || []), 24);
    const originalTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.original_task_agent_session_id), 16);
    const originalNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.original_native_session_id), 16);
    const repairTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.repair_task_agent_session_id), 16);
    const repairNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recentCompletionRows.map((row) => row.repair_native_session_id), 16);
    const preservationHistoricalTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => [
        ...(Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids : []),
        row.current_task_agent_session_id,
    ]), 24);
    const preservationHistoricalNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureRows.flatMap((row) => [
        ...(Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids : []),
        row.current_native_session_id,
    ]), 24);
    const preservationConflictResolutionEntryIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureConflictResolutionRows.map((row) => row.resolution_entry_id), 16);
    const preservationConflictResolutionTaskAgentSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureConflictResolutionRows.map((row) => row.task_agent_session_id), 16);
    const preservationConflictResolutionNativeSessionIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)(recalledPreservationClosureConflictResolutionRows.map((row) => row.native_session_id), 16);
    const rowIds = (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
        recentRows.map((row) => row.row_id),
        recentCompletionRows.map((row) => row.row_id),
        recalledPreservationClosureRows.map((row) => row.row_id),
        recalledPreservationClosureConflictResolutionRows.map((row) => row.row_id),
    ], 24);
    const queryAppend = [
        "post-compact reinjection repair receipt typed MEMORY.md",
        ...docRelPaths,
        "postCompactCandidateUsage memoryUsed memoryIgnored currentSourceVerified",
        "historical repair completion is recovery evidence, not permanent repository truth",
        "future use must reverify the current source",
        completionArchivedCount > 0 ? "corrected receipt completion memory per-session memoryUsed memoryIgnored" : "",
        preservationClosureArchivedCount > 0 ? "post-compact completion memory preservation repair closure newer corrected retry outcome exact identity current-session authority" : "",
        ...gateIds,
        ...candidateIds,
        ...candidateValues,
        ...sourceMessageIds,
        ...completionWorkItemIds,
        ...completionTimelineBindingIds,
        ...completionOriginalWorkerContextPacketIds,
        ...preservationRepairWorkItemIds,
        ...preservationFailedRetryIds,
        ...preservationFailedOutcomeIds,
        ...preservationCorrectedRetryIds,
        ...preservationCorrectedOutcomeIds,
        ...preservationCompletionWorkItemIds,
        ...preservationCompletionTimelineBindingIds,
        ...preservationConflictResolutionEntryIds,
        ...rowIds,
    ].filter(Boolean).join("\n");
    return {
        ...empty,
        active: true,
        reason: "task_matched_verified_archive",
        archivedCount,
        restoredCount,
        cautionCount,
        usedCount: Number(archive.used_count || 0),
        verifiedCount: Number(archive.verified_count || 0),
        ignoredCount: Number(archive.ignored_count || 0),
        completionArchivedCount,
        completionVerifiedCount: Number(completionArchive.verified_count || 0),
        preservationClosureArchivedCount,
        preservationClosureVerifiedCount: Number(preservationClosureArchive.verified_count || 0),
        preservationClosureRecallSuppressed,
        exactPreservationClosureIdentityMatched,
        preservationClosureUsageFeedback,
        preservationClosureFeedbackConflict,
        preservationClosureFeedbackConflictActive: preservationClosureFeedbackConflict?.active === true,
        preservationClosureConflictResolution,
        preservationClosureConflictResolutionArchivedCount,
        preservationClosureConflictResolutionEntryIds: preservationConflictResolutionEntryIds,
        immutableClosureHistoryPreserved: preservationClosureArchivedCount > 0,
        currentSourceVerifiedCount: Number(archive.current_source_verified_count || 0),
        taskMatched: true,
        docRelPaths,
        repeatableRelPaths: docRelPaths,
        targetPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            ...docRelPaths,
            ...candidateValues,
        ], 24),
        gateIds,
        candidateIds,
        candidateValues,
        sourceMessageIds,
        completionWorkItemIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([completionWorkItemIds, preservationRepairWorkItemIds, preservationCompletionWorkItemIds], 32),
        completionTimelineBindingIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([completionTimelineBindingIds, preservationCompletionTimelineBindingIds], 32),
        completionOriginalWorkerContextPacketIds,
        completionDocRelPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            completionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_REL_PATH : "",
            preservationClosureArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_REL_PATH : "",
            effectivePreservationClosureConflictResolutionArchivedCount > 0 ? group_memory_shared_1.POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_REL_PATH : "",
            preservationCompletionDocRelPaths,
        ], 24),
        preservationRepairWorkItemIds,
        preservationFailedRetryIds,
        preservationFailedOutcomeIds,
        preservationCorrectedRetryIds,
        preservationCorrectedOutcomeIds,
        taskAgentSessionIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([taskAgentSessionIds, originalTaskAgentSessionIds, repairTaskAgentSessionIds, preservationHistoricalTaskAgentSessionIds, preservationConflictResolutionTaskAgentSessionIds], 32),
        nativeSessionIds: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([nativeSessionIds, originalNativeSessionIds, repairNativeSessionIds, preservationHistoricalNativeSessionIds, preservationConflictResolutionNativeSessionIds], 32),
        originalTaskAgentSessionIds,
        originalNativeSessionIds,
        repairTaskAgentSessionIds,
        repairNativeSessionIds,
        preservationHistoricalTaskAgentSessionIds,
        preservationHistoricalNativeSessionIds,
        rowIds,
        queryAppend: (0, group_memory_shared_1.compactMemoryText)(queryAppend, 4200),
        rows: [
            ...recentRows.map((row) => ({
                row_kind: "reinjection_repair_receipt",
                row_id: row.row_id || "",
                timeline_binding_id: row.timeline_binding_id || "",
                brief_id: row.brief_id || "",
                work_item_id: row.work_item_id || "",
                reinjection_gate_id: row.reinjection_gate_id || "",
                post_compact_candidate_id: row.post_compact_candidate_id || "",
                post_compact_candidate_kind: row.post_compact_candidate_kind || "",
                post_compact_candidate_value: row.post_compact_candidate_value || "",
                post_compact_candidate_source_message_id: row.post_compact_candidate_source_message_id || "",
                usage_state: row.usage_state || "",
                current_source_verified: row.current_source_verified === true,
                historical_task_agent_session_id: row.task_agent_session_id || "",
                historical_native_session_id: row.native_session_id || "",
                completion_source: row.completion_source || "",
                resolution_reason: row.resolution_reason || ""
            })),
            ...recentCompletionRows.map((row) => ({
                row_kind: "receipt_memory_usage_repair_completion",
                row_id: row.row_id || "",
                timeline_binding_id: row.timeline_binding_id || "",
                brief_id: row.brief_id || "",
                work_item_id: row.work_item_id || "",
                original_worker_context_packet_id: row.original_worker_context_packet_id || "",
                required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
                coverage_rows: Array.isArray(row.coverage_rows) ? row.coverage_rows.slice(0, 8) : [],
                historical_task_agent_session_id: row.original_task_agent_session_id || "",
                historical_native_session_id: row.original_native_session_id || "",
                repair_task_agent_session_id: row.repair_task_agent_session_id || "",
                repair_native_session_id: row.repair_native_session_id || "",
                completion_source: row.completion_source || "",
                resolution_reason: row.resolution_reason || ""
            })),
            ...recalledPreservationClosureRows.map((row) => ({
                row_kind: "completion_memory_preservation_repair_closure",
                row_id: row.row_id || "",
                work_item_id: row.work_item_id || "",
                failed_retry_id: row.failed_retry_id || "",
                failed_outcome_id: row.failed_outcome_id || "",
                corrected_retry_id: row.corrected_retry_id || "",
                corrected_outcome_id: row.corrected_outcome_id || "",
                completion_doc_rel_paths: Array.isArray(row.completion_doc_rel_paths) ? row.completion_doc_rel_paths.slice(0, 8) : [],
                required_doc_rel_paths: Array.isArray(row.required_doc_rel_paths) ? row.required_doc_rel_paths.slice(0, 8) : [],
                completion_work_item_ids: Array.isArray(row.completion_work_item_ids) ? row.completion_work_item_ids.slice(0, 12) : [],
                completion_timeline_binding_ids: Array.isArray(row.completion_timeline_binding_ids) ? row.completion_timeline_binding_ids.slice(0, 12) : [],
                historical_task_agent_session_ids: Array.isArray(row.historical_task_agent_session_ids) ? row.historical_task_agent_session_ids.slice(0, 12) : [],
                historical_native_session_ids: Array.isArray(row.historical_native_session_ids) ? row.historical_native_session_ids.slice(0, 12) : [],
                historical_task_agent_session_id: row.current_task_agent_session_id || "",
                historical_native_session_id: row.current_native_session_id || "",
                exact_identity_restored: row.exact_identity_restored === true,
                current_session_boundary_restored: row.current_session_boundary_restored === true,
                historical_sessions_remain_evidence_only: row.historical_sessions_remain_evidence_only === true,
                completion_source: row.completion_source || "",
                resolution_reason: row.resolution_reason || ""
            })),
            ...recalledPreservationClosureConflictResolutionRows.map((row) => ({
                row_kind: "completion_memory_preservation_closure_conflict_resolution",
                row_id: row.row_id || "",
                resolution_entry_id: row.resolution_entry_id || "",
                task_family_key: row.task_family_key || "",
                resolution_usage_state: row.resolution_usage_state || "",
                current_source_verified: row.current_source_verified === true,
                reason: row.reason || "",
                historical_task_agent_session_id: row.task_agent_session_id || "",
                historical_native_session_id: row.native_session_id || "",
                parent_conflict_fingerprint: row.parent_conflict_fingerprint || "",
                reversible: row.reversible === true,
                historical_branches_preserved: row.historical_branches_preserved === true,
                historical_majority_authorization_allowed: false
            })),
        ].slice(-28)
    };
}
//# sourceMappingURL=group-memory-context-part-02.js.map