"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKER_CONTEXT_REPLAY_BRIEF_PARTIAL_COMPACT_FIELDS = exports.WORKER_CONTEXT_COMPACT_OUTCOME_RECENT_RETENTION_LIMIT = void 0;
exports.workerContextCompactOutcomeCategoriesForCoordinator = workerContextCompactOutcomeCategoriesForCoordinator;
exports.normalizeWorkerContextCompactStrategyMemoryForCoordinator = normalizeWorkerContextCompactStrategyMemoryForCoordinator;
exports.buildWorkerContextCompactStrategyMemoryForCoordinator = buildWorkerContextCompactStrategyMemoryForCoordinator;
exports.writeWorkerContextCompactStrategyMemoryForCoordinator = writeWorkerContextCompactStrategyMemoryForCoordinator;
exports.readWorkerContextCompactStrategyMemoryForCoordinator = readWorkerContextCompactStrategyMemoryForCoordinator;
exports.normalizeWorkerContextPtlEmergencyHintForCoordinator = normalizeWorkerContextPtlEmergencyHintForCoordinator;
exports.buildWorkerContextPtlEmergencyHintForCoordinator = buildWorkerContextPtlEmergencyHintForCoordinator;
exports.writeWorkerContextPtlEmergencyHintForCoordinator = writeWorkerContextPtlEmergencyHintForCoordinator;
exports.readWorkerContextPtlEmergencyHintForCoordinator = readWorkerContextPtlEmergencyHintForCoordinator;
exports.mergeWorkerContextRetryOptionsForCoordinator = mergeWorkerContextRetryOptionsForCoordinator;
exports.readWorkerContextCompactOutcomeLedgerForCoordinator = readWorkerContextCompactOutcomeLedgerForCoordinator;
exports.compactOutcomeCompletionSummaryCoveredForRetention = compactOutcomeCompletionSummaryCoveredForRetention;
exports.compactOutcomeHasStrictCorrectedCompletionProofForRetention = compactOutcomeHasStrictCorrectedCompletionProofForRetention;
exports.retainWorkerContextCompactOutcomeEntriesForCoordinator = retainWorkerContextCompactOutcomeEntriesForCoordinator;
exports.appendWorkerContextCompactOutcomeEntriesForCoordinator = appendWorkerContextCompactOutcomeEntriesForCoordinator;
exports.compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator = compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator;
exports.readWorkerContextCompactSessionArtifactsForCoordinator = readWorkerContextCompactSessionArtifactsForCoordinator;
exports.deleteWorkerContextCompactSessionArtifactsForCoordinator = deleteWorkerContextCompactSessionArtifactsForCoordinator;
exports.workerContextUsagePressureStatusForCoordinator = workerContextUsagePressureStatusForCoordinator;
exports.workerContextUsageTopCategoriesForCoordinator = workerContextUsageTopCategoriesForCoordinator;
exports.compactWorkerContextTaskForRetry = compactWorkerContextTaskForRetry;
exports.replayBriefPartialCompactValue = replayBriefPartialCompactValue;
exports.compactReplayRepairDispatchBriefsForWorkerContextRetry = compactReplayRepairDispatchBriefsForWorkerContextRetry;
exports.combineWorkerContextPartialCompactionSummariesForCoordinator = combineWorkerContextPartialCompactionSummariesForCoordinator;
exports.workerContextPartialCompactMethodForCoordinator = workerContextPartialCompactMethodForCoordinator;
exports.compactWorkerContextMetadataStringsForCoordinator = compactWorkerContextMetadataStringsForCoordinator;
exports.workerContextPressureRecallUsageSummaryForCompactPolicy = workerContextPressureRecallUsageSummaryForCompactPolicy;
exports.workerContextCompactStrategyPressureUsageBiasForCoordinator = workerContextCompactStrategyPressureUsageBiasForCoordinator;
exports.buildWorkerContextMetadataPartialCompactPolicyForCoordinator = buildWorkerContextMetadataPartialCompactPolicyForCoordinator;
exports.compactWorkerContextMetadataCategoriesForRetry = compactWorkerContextMetadataCategoriesForRetry;
exports.buildWorkerContextPacketForAssignment = buildWorkerContextPacketForAssignment;
exports.pressureProvenanceProviderDispatchPolicyForCoordinator = pressureProvenanceProviderDispatchPolicyForCoordinator;
exports.pressureProvenanceProviderHealthForCoordinator = pressureProvenanceProviderHealthForCoordinator;
exports.providerReliabilityConfiguredCandidatesForCoordinator = providerReliabilityConfiguredCandidatesForCoordinator;
exports.providerReliabilityHealthRankForCoordinator = providerReliabilityHealthRankForCoordinator;
exports.providerReliabilityRiskRankForCoordinator = providerReliabilityRiskRankForCoordinator;
exports.providerSwitchExecutionRankPenaltyForCoordinator = providerSwitchExecutionRankPenaltyForCoordinator;
exports.providerSwitchExecutionRankingProvenanceForCoordinator = providerSwitchExecutionRankingProvenanceForCoordinator;
exports.providerReliabilitySignalForAgentForCoordinator = providerReliabilitySignalForAgentForCoordinator;
const atomic_json_file_1 = require("../../core/atomic-json-file");
const group_memory_index_1 = require("./group-memory-index");
const group_orchestrator_prompts_1 = require("./group-orchestrator-prompts");
const group_orchestrator_coded_part_01_1 = require("./group-orchestrator-coded-part-01");
const group_orchestrator_coded_part_03_1 = require("./group-orchestrator-coded-part-03");
function workerContextCompactOutcomeCategoriesForCoordinator(entry = {}) {
    const selected = Array.isArray(entry.partial_compact_policy?.selected_categories)
        ? entry.partial_compact_policy.selected_categories
        : [];
    const fallback = Array.isArray(entry.partial_compaction_categories)
        ? entry.partial_compaction_categories
        : [];
    const supported = new Set(group_orchestrator_coded_part_01_1.WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES);
    return [...new Set([...selected, ...fallback]
            .map((item) => String(item || "").trim())
            .filter((item) => supported.has(item)))];
}
function normalizeWorkerContextCompactStrategyMemoryForCoordinator(raw = {}, groupId = "", groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId || raw.groupSessionId || raw.group_session_id || "");
    const categories = Array.isArray(raw.categories) ? raw.categories.map((item = {}) => ({
        category: String(item.category || ""),
        attempts: Number(item.attempts || 0),
        recovered: Number(item.recovered || 0),
        blocked: Number(item.blocked || 0),
        recovery_rate: Number(item.recovery_rate || 0),
        task_preserved: Number(item.task_preserved || 0),
        task_compacted: Number(item.task_compacted || 0),
        avg_token_delta: Number(item.avg_token_delta || 0),
        avg_free_token_delta: Number(item.avg_free_token_delta || 0),
        avg_partial_omitted_chars: Number(item.avg_partial_omitted_chars || 0),
        strategy_score: Number(item.strategy_score || 0),
        recommendation: String(item.recommendation || "observe"),
        latest_at: String(item.latest_at || ""),
    })).filter((item) => item.category) : [];
    return {
        schema: "ccm-worker-context-compact-strategy-memory-v1",
        version: 1,
        strategy_id: String(raw.strategy_id || raw.strategyId || `wccs:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([groupId || raw.groupId || raw.group_id || "", categories], 14)}`),
        groupId: String(raw.groupId || raw.group_id || groupId || ""),
        groupSessionId: exactSessionId,
        scopeId: (0, group_orchestrator_coded_part_01_1.workerContextCompactScopeIdForCoordinator)(groupId || raw.groupId || raw.group_id || "", exactSessionId),
        file: String(raw.file || ""),
        source_ledger_file: String(raw.source_ledger_file || raw.sourceLedgerFile || ""),
        source_ledger_updated_at: String(raw.source_ledger_updated_at || raw.sourceLedgerUpdatedAt || ""),
        sample_count: Number(raw.sample_count || raw.sampleCount || 0),
        category_count: Number(raw.category_count || raw.categoryCount || categories.length),
        preferred_categories: Array.isArray(raw.preferred_categories || raw.preferredCategories)
            ? (raw.preferred_categories || raw.preferredCategories).map((item) => String(item || "")).filter(Boolean)
            : categories.filter((item) => item.recommendation === "prefer").map((item) => item.category),
        avoid_categories: Array.isArray(raw.avoid_categories || raw.avoidCategories)
            ? (raw.avoid_categories || raw.avoidCategories).map((item) => String(item || "")).filter(Boolean)
            : categories.filter((item) => item.recommendation === "avoid").map((item) => item.category),
        categories,
        generated_at: String(raw.generated_at || raw.generatedAt || new Date().toISOString()),
        updatedAt: String(raw.updatedAt || raw.updated_at || raw.generated_at || raw.generatedAt || new Date().toISOString()),
    };
}
function buildWorkerContextCompactStrategyMemoryForCoordinator(groupId, entries = [], options = {}) {
    const groupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || "");
    const file = (0, group_orchestrator_coded_part_01_1.getWorkerContextCompactStrategyMemoryFileForCoordinator)(groupId, groupSessionId);
    const sourceLedgerFile = String(options.sourceLedgerFile || options.source_ledger_file || (0, group_orchestrator_coded_part_01_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId, groupSessionId));
    const sourceLedgerUpdatedAt = String(options.sourceLedgerUpdatedAt || options.source_ledger_updated_at || "");
    const nowIso = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const supported = new Set(group_orchestrator_coded_part_01_1.WORKER_CONTEXT_METADATA_COMPACT_CATEGORIES);
    const byCategory = {};
    let sampleCount = 0;
    for (const entry of entries || []) {
        if (entry?.distillation_candidate === false)
            continue;
        const categories = workerContextCompactOutcomeCategoriesForCoordinator(entry).filter((category) => supported.has(category));
        if (!categories.length)
            continue;
        sampleCount++;
        for (const category of categories) {
            const row = byCategory[category] || {
                category,
                attempts: 0,
                recovered: 0,
                blocked: 0,
                task_preserved: 0,
                task_compacted: 0,
                total_token_delta: 0,
                total_free_token_delta: 0,
                total_partial_omitted_chars: 0,
                latest_at: "",
            };
            row.attempts += 1;
            if (entry.status === "recovered" || entry.dispatch_ready === true)
                row.recovered += 1;
            if (entry.status === "blocked" || entry.dispatch_ready === false)
                row.blocked += 1;
            if (entry.task_hash_unchanged === true)
                row.task_preserved += 1;
            if (entry.task_compacted === true)
                row.task_compacted += 1;
            row.total_token_delta += Math.max(0, Number(entry.token_delta || 0));
            row.total_free_token_delta += Math.max(0, Number(entry.free_token_delta || 0));
            row.total_partial_omitted_chars += Math.max(0, Number(entry.partial_omitted_chars || 0));
            if (entry.at && (!row.latest_at || String(entry.at) > row.latest_at))
                row.latest_at = String(entry.at);
            byCategory[category] = row;
        }
    }
    const categories = Object.values(byCategory).map((row) => {
        const attempts = Math.max(1, Number(row.attempts || 0));
        const recoveryRate = Number(row.recovered || 0) / attempts;
        const taskPreservedRate = Number(row.task_preserved || 0) / attempts;
        const blockedRate = Number(row.blocked || 0) / attempts;
        const avgTokenDelta = Math.round(Number(row.total_token_delta || 0) / attempts);
        const avgFreeTokenDelta = Math.round(Number(row.total_free_token_delta || 0) / attempts);
        const avgPartialOmittedChars = Math.round(Number(row.total_partial_omitted_chars || 0) / attempts);
        const strategyScore = Math.round(recoveryRate * 1000
            + Math.min(500, avgFreeTokenDelta / 8)
            + taskPreservedRate * 120
            - blockedRate * 300
            - Number(row.task_compacted || 0) * 35);
        const recommendation = Number(row.recovered || 0) > 0 && avgFreeTokenDelta > 0
            ? "prefer"
            : Number(row.attempts || 0) >= 2 && Number(row.recovered || 0) === 0 ? "avoid" : "observe";
        return {
            category: row.category,
            attempts: Number(row.attempts || 0),
            recovered: Number(row.recovered || 0),
            blocked: Number(row.blocked || 0),
            recovery_rate: Math.round(recoveryRate * 1000) / 1000,
            task_preserved: Number(row.task_preserved || 0),
            task_compacted: Number(row.task_compacted || 0),
            avg_token_delta: avgTokenDelta,
            avg_free_token_delta: avgFreeTokenDelta,
            avg_partial_omitted_chars: avgPartialOmittedChars,
            strategy_score: strategyScore,
            recommendation,
            latest_at: row.latest_at || "",
        };
    }).sort((a, b) => Number(b.strategy_score || 0) - Number(a.strategy_score || 0)
        || Number(b.avg_free_token_delta || 0) - Number(a.avg_free_token_delta || 0)
        || a.category.localeCompare(b.category));
    const preferred = categories
        .filter((item) => item.recommendation === "prefer")
        .map((item) => item.category);
    const avoid = categories
        .filter((item) => item.recommendation === "avoid")
        .map((item) => item.category);
    return normalizeWorkerContextCompactStrategyMemoryForCoordinator({
        schema: "ccm-worker-context-compact-strategy-memory-v1",
        version: 1,
        strategy_id: `wccs:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([groupId, groupSessionId, sourceLedgerUpdatedAt, categories], 14)}`,
        groupId,
        groupSessionId,
        file,
        source_ledger_file: sourceLedgerFile,
        source_ledger_updated_at: sourceLedgerUpdatedAt,
        sample_count: sampleCount,
        category_count: categories.length,
        preferred_categories: preferred.length ? preferred : categories.map((item) => item.category),
        avoid_categories: avoid,
        categories,
        generated_at: nowIso,
        updatedAt: nowIso,
    }, groupId, groupSessionId);
}
function writeWorkerContextCompactStrategyMemoryForCoordinator(groupId, entries = [], options = {}) {
    const groupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || "");
    const strategy = buildWorkerContextCompactStrategyMemoryForCoordinator(groupId, entries, options);
    (0, group_orchestrator_coded_part_01_1.writeJsonAtomicForCoordinator)(strategy.file || (0, group_orchestrator_coded_part_01_1.getWorkerContextCompactStrategyMemoryFileForCoordinator)(groupId, groupSessionId), strategy);
    return strategy;
}
function readWorkerContextCompactStrategyMemoryForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").readWorkerContextCompactStrategyMemoryForCoordinator(groupId, groupSessionId);
}
function normalizeWorkerContextPtlEmergencyHintForCoordinator(raw = {}, groupId = "", groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId || raw.groupSessionId || raw.group_session_id || "");
    const recommendedRetryOptions = raw.recommended_retry_options || raw.recommendedRetryOptions || {};
    return {
        schema: "ccm-worker-context-ptl-emergency-hint-v1",
        version: 1,
        hint_id: String(raw.hint_id || raw.hintId || `wcptl:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([groupId || raw.groupId || raw.group_id || "", raw.reason || "", raw.generated_at || Date.now()], 14)}`),
        groupId: String(raw.groupId || raw.group_id || groupId || ""),
        groupSessionId: exactSessionId,
        scopeId: (0, group_orchestrator_coded_part_01_1.workerContextCompactScopeIdForCoordinator)(groupId || raw.groupId || raw.group_id || "", exactSessionId),
        file: String(raw.file || (0, group_orchestrator_coded_part_01_1.getWorkerContextPtlEmergencyHintFileForCoordinator)(groupId || raw.groupId || raw.group_id || "", exactSessionId)),
        engaged: raw.engaged === true,
        emergency_level: String(raw.emergency_level || raw.emergencyLevel || (raw.engaged ? "warning" : "none")),
        reason: String(raw.reason || ""),
        blocked_outcome_count: Number(raw.blocked_outcome_count || raw.blockedOutcomeCount || 0),
        task_compacted_blocked_count: Number(raw.task_compacted_blocked_count || raw.taskCompactedBlockedCount || 0),
        repeated_failed_categories: Array.isArray(raw.repeated_failed_categories || raw.repeatedFailedCategories)
            ? (raw.repeated_failed_categories || raw.repeatedFailedCategories).map((item) => String(item || "")).filter(Boolean)
            : [],
        source_ledger_file: String(raw.source_ledger_file || raw.sourceLedgerFile || ""),
        source_strategy_file: String(raw.source_strategy_file || raw.sourceStrategyFile || ""),
        recommended_retry_options: {
            memory: recommendedRetryOptions.memory || recommendedRetryOptions.memoryOptions || {},
            replayRepairDispatchBriefs: recommendedRetryOptions.replayRepairDispatchBriefs || recommendedRetryOptions.replay_repair_dispatch_briefs || {},
            metadata: recommendedRetryOptions.metadata || recommendedRetryOptions.metadataPartialCompact || {},
            maxTaskChars: Number(recommendedRetryOptions.maxTaskChars || recommendedRetryOptions.max_task_chars || 0),
        },
        generated_at: String(raw.generated_at || raw.generatedAt || new Date().toISOString()),
        updatedAt: String(raw.updatedAt || raw.updated_at || raw.generated_at || raw.generatedAt || new Date().toISOString()),
    };
}
function buildWorkerContextPtlEmergencyHintForCoordinator(groupId, entries = [], strategy = {}, options = {}) {
    const groupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || strategy?.groupSessionId || "");
    const file = (0, group_orchestrator_coded_part_01_1.getWorkerContextPtlEmergencyHintFileForCoordinator)(groupId, groupSessionId);
    const sourceLedgerFile = String(options.sourceLedgerFile || options.source_ledger_file || (0, group_orchestrator_coded_part_01_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId, groupSessionId));
    const sourceStrategyFile = String(options.sourceStrategyFile || options.source_strategy_file || strategy?.file || (0, group_orchestrator_coded_part_01_1.getWorkerContextCompactStrategyMemoryFileForCoordinator)(groupId, groupSessionId));
    const nowIso = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const distillable = (entries || []).filter((entry) => entry?.distillation_candidate !== false);
    const blocked = distillable.filter((entry) => entry.status === "blocked" || entry.dispatch_ready === false);
    const taskCompactedBlocked = blocked.filter((entry) => entry.task_compacted === true);
    const repeatedFailedCategories = (Array.isArray(strategy?.categories) ? strategy.categories : [])
        .filter((item) => Number(item.attempts || 0) >= 2
        && (Number(item.recovered || 0) === 0 || String(item.recommendation || "") === "avoid"))
        .map((item) => String(item.category || ""))
        .filter(Boolean);
    const engaged = blocked.length >= 2 || taskCompactedBlocked.length > 0 || repeatedFailedCategories.length > 0;
    const emergencyLevel = taskCompactedBlocked.length > 0 || blocked.length >= 3 ? "critical" : engaged ? "warning" : "none";
    const reasonParts = [
        blocked.length >= 2 ? `blocked_outcomes=${blocked.length}` : "",
        taskCompactedBlocked.length > 0 ? `task_compacted_still_blocked=${taskCompactedBlocked.length}` : "",
        repeatedFailedCategories.length ? `failed_categories=${repeatedFailedCategories.join(",")}` : "",
    ].filter(Boolean);
    return normalizeWorkerContextPtlEmergencyHintForCoordinator({
        schema: "ccm-worker-context-ptl-emergency-hint-v1",
        version: 1,
        hint_id: `wcptl:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([groupId, groupSessionId, sourceLedgerFile, sourceStrategyFile, blocked.length, taskCompactedBlocked.length, repeatedFailedCategories], 14)}`,
        groupId,
        groupSessionId,
        file,
        engaged,
        emergency_level: emergencyLevel,
        reason: engaged
            ? `WorkerContextPacket repeated compact failure requires PTL emergency downgrade: ${reasonParts.join("; ")}`
            : "WorkerContextPacket compact outcomes do not require PTL emergency downgrade.",
        blocked_outcome_count: blocked.length,
        task_compacted_blocked_count: taskCompactedBlocked.length,
        repeated_failed_categories: repeatedFailedCategories,
        source_ledger_file: sourceLedgerFile,
        source_strategy_file: sourceStrategyFile,
        recommended_retry_options: {
            memory: {
                maxRenderedChars: emergencyLevel === "critical" ? 900 : 1400,
                maxJsonChars: emergencyLevel === "critical" ? 700 : 1000,
                maxRecallItems: emergencyLevel === "critical" ? 3 : 5,
            },
            replayRepairDispatchBriefs: {
                maxBriefs: emergencyLevel === "critical" ? 4 : 6,
                maxStringChars: emergencyLevel === "critical" ? 120 : 180,
                maxIdChars: emergencyLevel === "critical" ? 100 : 140,
            },
            metadata: {
                maxCategories: 1,
                maxItems: emergencyLevel === "critical" ? 2 : 3,
                maxStringChars: emergencyLevel === "critical" ? 100 : 140,
                maxDependencyReasonChars: emergencyLevel === "critical" ? 100 : 140,
                maxContractSummaryChars: emergencyLevel === "critical" ? 100 : 140,
            },
            maxTaskChars: emergencyLevel === "critical" ? 1400 : 2200,
        },
        generated_at: nowIso,
        updatedAt: nowIso,
    }, groupId, groupSessionId);
}
function writeWorkerContextPtlEmergencyHintForCoordinator(groupId, entries = [], strategy = {}, options = {}) {
    const groupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || strategy?.groupSessionId || "");
    const hint = buildWorkerContextPtlEmergencyHintForCoordinator(groupId, entries, strategy, options);
    if (hint.engaged || options.writeEmpty === true || options.write_empty === true) {
        (0, group_orchestrator_coded_part_01_1.writeJsonAtomicForCoordinator)((0, group_orchestrator_coded_part_01_1.getWorkerContextPtlEmergencyHintFileForCoordinator)(groupId, groupSessionId), hint);
    }
    return hint;
}
function readWorkerContextPtlEmergencyHintForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").readWorkerContextPtlEmergencyHintForCoordinator(groupId, groupSessionId);
}
function mergeWorkerContextRetryOptionsForCoordinator(base = {}, override = {}) {
    return {
        ...base,
        ...override,
        memory: { ...(base.memory || base.memoryOptions || {}), ...(override.memory || {}) },
        memoryOptions: { ...(base.memoryOptions || base.memory || {}), ...(override.memory || {}) },
        replayRepairDispatchBriefs: {
            ...(base.replayRepairDispatchBriefs || base.replay_repair_dispatch_briefs || {}),
            ...(override.replayRepairDispatchBriefs || override.replay_repair_dispatch_briefs || {}),
        },
        replay_repair_dispatch_briefs: {
            ...(base.replay_repair_dispatch_briefs || base.replayRepairDispatchBriefs || {}),
            ...(override.replayRepairDispatchBriefs || override.replay_repair_dispatch_briefs || {}),
        },
        metadata: { ...(base.metadata || base.metadataPartialCompact || base.metadata_partial_compact || {}), ...(override.metadata || {}) },
        metadataPartialCompact: { ...(base.metadataPartialCompact || base.metadata || {}), ...(override.metadata || {}) },
        metadata_partial_compact: { ...(base.metadata_partial_compact || base.metadata || {}), ...(override.metadata || {}) },
        maxTaskChars: Number(override.maxTaskChars || override.max_task_chars || base.maxTaskChars || base.max_task_chars || 0) || undefined,
        max_task_chars: Number(override.maxTaskChars || override.max_task_chars || base.max_task_chars || base.maxTaskChars || 0) || undefined,
    };
}
function readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId = "") {
    return require("./group-orchestrator-worker-context").readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, groupSessionId);
}
exports.WORKER_CONTEXT_COMPACT_OUTCOME_RECENT_RETENTION_LIMIT = 800;
function compactOutcomeCompletionSummaryCoveredForRetention(expected = {}, actual = {}) {
    const listFields = [
        "completion_doc_rel_paths", "required_doc_rel_paths", "work_item_ids", "timeline_binding_ids",
        "historical_task_agent_session_ids", "historical_native_session_ids", "conflict_resolution_doc_rel_paths",
    ];
    for (const field of listFields) {
        const expectedValues = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(expected[field] || []);
        const actualValues = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(actual[field] || []);
        if (expectedValues.some((value) => !actualValues.includes(value)))
            return false;
    }
    const completionCovered = actual.present === true
        && String(actual.current_session_binding_id || "") === String(expected.current_session_binding_id || "")
        && String(actual.current_task_agent_session_id || "") === String(expected.current_task_agent_session_id || "")
        && String(actual.current_native_session_id || "") === String(expected.current_native_session_id || "")
        && actual.usage_acceptance_required === true
        && actual.current_session_acceptance_required === true
        && actual.authority_boundary_valid === true;
    if (!completionCovered || expected.conflict_resolution_present !== true)
        return completionCovered;
    return actual.conflict_resolution_present === true
        && String(actual.conflict_resolution_entry_id || "") === String(expected.conflict_resolution_entry_id || "")
        && String(actual.conflict_resolution_state || "") === String(expected.conflict_resolution_state || "")
        && String(actual.conflict_resolution_usage_state || "") === String(expected.conflict_resolution_usage_state || "")
        && String(actual.conflict_resolution_task_agent_session_id || "") === String(expected.conflict_resolution_task_agent_session_id || "")
        && String(actual.conflict_resolution_native_session_id || "") === String(expected.conflict_resolution_native_session_id || "")
        && actual.conflict_resolution_active === (expected.conflict_resolution_active === true)
        && actual.conflict_resolution_reopened === (expected.conflict_resolution_reopened === true)
        && actual.conflict_resolution_reversible === true
        && actual.conflict_resolution_historical_branches_preserved === true
        && actual.conflict_resolution_reverification_acceptance_required === (expected.conflict_resolution_reverification_acceptance_required === true)
        && actual.conflict_resolution_reversible_acceptance_required === (expected.conflict_resolution_reversible_acceptance_required === true)
        && actual.conflict_verification_acceptance_required === (expected.conflict_verification_acceptance_required === true);
}
function compactOutcomeHasStrictCorrectedCompletionProofForRetention(entry = {}, expected = {}) {
    const proof = entry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
    return proof.schema === "ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1"
        && proof.required === true
        && proof.preserved === true
        && entry.post_compact_receipt_memory_usage_repair_completion_preserved === true
        && !(proof.gaps || []).length
        && compactOutcomeCompletionSummaryCoveredForRetention(expected, proof.before || {})
        && compactOutcomeCompletionSummaryCoveredForRetention(expected, proof.after || {});
}
function retainWorkerContextCompactOutcomeEntriesForCoordinator(groupId, input = [], options = {}) {
    const groupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(options.groupSessionId || options.group_session_id || "");
    const recentLimit = Math.max(100, Number(options.recentLimit || options.recent_limit || exports.WORKER_CONTEXT_COMPACT_OUTCOME_RECENT_RETENTION_LIMIT));
    const rejected = [];
    const crossSessionRejected = [];
    const accepted = [];
    for (const [index, entry] of (Array.isArray(input) ? input : []).entries()) {
        const entryGroupId = String(entry?.group_id || entry?.groupId || groupId || "").trim();
        if (entryGroupId && entryGroupId !== groupId) {
            rejected.push(entry);
            continue;
        }
        const entryGroupSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(entry?.group_session_id || entry?.groupSessionId || "");
        if (groupSessionId && entryGroupSessionId !== groupSessionId) {
            crossSessionRejected.push(entry);
            continue;
        }
        const normalized = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactOutcomeEntryForCoordinator)({
            ...entry,
            group_id: groupId,
            group_session_id: groupSessionId || "",
        });
        const key = String(normalized.outcome_id || "").trim() || `anonymous:${(0, group_orchestrator_coded_part_01_1.hashCoordinator)([normalized.assignment_id, normalized.retry_id, normalized.at, index], 20)}`;
        accepted.push({ entry: normalized, key, index });
    }
    const latestByKey = new Map();
    for (const row of accepted)
        latestByKey.set(row.key, row);
    const rows = [...latestByKey.values()].sort((a, b) => a.index - b.index);
    const unresolvedFailures = [];
    for (const row of rows) {
        const proof = row.entry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
        const failed = proof.required === true && (proof.preserved !== true
            || row.entry.post_compact_receipt_memory_usage_repair_completion_preserved !== true
            || (proof.gaps || []).length > 0);
        if (!failed)
            continue;
        const expected = proof.before || {};
        const corrected = rows.some(candidate => candidate.index > row.index
            && String(candidate.entry.assignment_id || "") === String(row.entry.assignment_id || "")
            && (!row.entry.project || !candidate.entry.project || candidate.entry.project === row.entry.project)
            && candidate.entry.outcome_id !== row.entry.outcome_id
            && candidate.entry.retry_id !== row.entry.retry_id
            && compactOutcomeHasStrictCorrectedCompletionProofForRetention(candidate.entry, expected));
        if (!corrected)
            unresolvedFailures.push(row.key);
    }
    const latestAssignment = new Map();
    const latestResolution = new Map();
    for (const row of rows) {
        const assignmentKey = String(row.entry.assignment_id || row.entry.dispatch_key || "").trim();
        if (assignmentKey)
            latestAssignment.set(assignmentKey, row.key);
        const proof = row.entry.post_compact_receipt_memory_usage_repair_completion_preservation || {};
        const resolutionEntryId = String(proof.before?.conflict_resolution_entry_id || proof.after?.conflict_resolution_entry_id || "").trim();
        if (resolutionEntryId)
            latestResolution.set(resolutionEntryId, row.key);
    }
    const keep = new Set([
        ...rows.slice(-recentLimit).map(row => row.key),
        ...unresolvedFailures,
        ...latestAssignment.values(),
        ...latestResolution.values(),
    ]);
    const retained = rows.filter(row => keep.has(row.key));
    const dropped = rows.filter(row => !keep.has(row.key));
    return {
        entries: retained.map(row => row.entry),
        retention: {
            schema: "ccm-worker-context-compact-outcome-retention-v1",
            policy: "recent_plus_unresolved_failures_latest_assignment_and_resolution",
            group_id: groupId,
            group_session_id: groupSessionId,
            input_count: Array.isArray(input) ? input.length : 0,
            accepted_count: accepted.length,
            deduplicated_count: rows.length,
            retained_count: retained.length,
            dropped_count: dropped.length,
            recent_limit: recentLimit,
            protected_unresolved_failure_count: new Set(unresolvedFailures).size,
            protected_latest_assignment_count: new Set(latestAssignment.values()).size,
            protected_latest_resolution_count: new Set(latestResolution.values()).size,
            dropped_unresolved_failure_count: dropped.filter(row => unresolvedFailures.includes(row.key)).length,
            cross_group_rejected_count: rejected.length,
            cross_session_rejected_count: crossSessionRejected.length,
            dropped_digest: (0, group_orchestrator_coded_part_01_1.hashCoordinator)(dropped.map(row => [row.key, row.entry.status, row.entry.retry_id]), 32),
            cross_group_rejected_digest: (0, group_orchestrator_coded_part_01_1.hashCoordinator)(rejected.map((entry) => entry.outcome_id || entry.retry_id || ""), 32),
            cross_session_rejected_digest: (0, group_orchestrator_coded_part_01_1.hashCoordinator)(crossSessionRejected.map((entry) => entry.outcome_id || entry.retry_id || ""), 32),
            compacted_at: String(options.at || new Date().toISOString()),
        },
    };
}
function appendWorkerContextCompactOutcomeEntriesForCoordinator(groupId, entries = [], groupSessionId = "") {
    const exactSessionId = (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactGroupSessionIdForCoordinator)(groupSessionId);
    const normalized = entries
        .map((entry) => (0, group_orchestrator_coded_part_01_1.normalizeWorkerContextCompactOutcomeEntryForCoordinator)({
        ...entry,
        group_id: entry.group_id || groupId,
        group_session_id: exactSessionId || "",
    }))
        .filter((entry) => entry.group_id === groupId && (!exactSessionId || entry.group_session_id === exactSessionId));
    if (!normalized.length)
        return readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
    const file = (0, group_orchestrator_coded_part_01_1.getWorkerContextCompactOutcomeLedgerFileForCoordinator)(groupId, exactSessionId);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const ledger = readWorkerContextCompactOutcomeLedgerForCoordinator(groupId, exactSessionId);
        const retained = retainWorkerContextCompactOutcomeEntriesForCoordinator(groupId, [...(ledger.entries || []), ...normalized], {
            groupSessionId: exactSessionId,
            at: normalized[normalized.length - 1]?.at || new Date().toISOString(),
        });
        const nextEntries = retained.entries;
        const next = {
            schema: "ccm-worker-context-compact-outcome-ledger-v1",
            version: 1,
            groupId,
            groupSessionId: exactSessionId,
            scopeId: (0, group_orchestrator_coded_part_01_1.workerContextCompactScopeIdForCoordinator)(groupId, exactSessionId),
            file,
            entries: nextEntries,
            stats: (0, group_orchestrator_coded_part_01_1.buildWorkerContextCompactOutcomeStatsForCoordinator)(nextEntries),
            retention: retained.retention,
            updatedAt: normalized[normalized.length - 1]?.at || new Date().toISOString(),
        };
        (0, group_orchestrator_coded_part_01_1.writeJsonAtomicForCoordinator)(file, next);
        try {
            const strategy = writeWorkerContextCompactStrategyMemoryForCoordinator(groupId, nextEntries, {
                groupSessionId: exactSessionId,
                sourceLedgerFile: file,
                sourceLedgerUpdatedAt: next.updatedAt,
            });
            writeWorkerContextPtlEmergencyHintForCoordinator(groupId, nextEntries, strategy, {
                groupSessionId: exactSessionId,
                sourceLedgerFile: file,
                sourceStrategyFile: strategy.file,
                sourceLedgerUpdatedAt: next.updatedAt,
            });
        }
        catch { }
        return next;
    });
}
function compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId, options = {}) {
    return require("./group-orchestrator-worker-context").compactWorkerContextCompactOutcomeLedgerRetentionForCoordinator(groupId, options);
}
function readWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId) {
    return require("./group-orchestrator-worker-context").readWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId);
}
function deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId) {
    return require("./group-orchestrator-worker-context").deleteWorkerContextCompactSessionArtifactsForCoordinator(groupId, groupSessionId);
}
function workerContextUsagePressureStatusForCoordinator(usage = {}) {
    const status = String(usage.status || "").trim();
    if (["compact_recommended", "critical", "over_budget"].includes(status))
        return status;
    const pressure = Number(usage.pressure || 0);
    const freeTokens = Number(usage.free_tokens || 0);
    if (usage.compact_recommended === true || pressure >= 82 || freeTokens < 0) {
        if (pressure >= 100 || freeTokens < 0)
            return "over_budget";
        if (pressure >= 90)
            return "critical";
        return "compact_recommended";
    }
    return "";
}
function workerContextUsageTopCategoriesForCoordinator(usage = {}) {
    const explicit = Array.isArray(usage.top_categories || usage.topCategories)
        ? (usage.top_categories || usage.topCategories)
        : [];
    const fallback = Array.isArray(usage.categories) ? usage.categories : [];
    return (explicit.length ? explicit : fallback)
        .filter((item) => Number(item.tokens || 0) > 0 && !["free_space", "autocompact_buffer"].includes(String(item.id || item.category_id || "")))
        .sort((a, b) => Number(b.tokens || 0) - Number(a.tokens || 0))
        .slice(0, 8)
        .map((item) => ({
        id: String(item.id || item.category_id || item.categoryId || ""),
        name: String(item.name || item.label || item.id || item.category_id || ""),
        tokens: Number(item.tokens || 0),
        chars: Number(item.chars || 0),
    }));
}
function compactWorkerContextTaskForRetry(task, options = {}) {
    const text = String(task || "").trim();
    const maxChars = Math.max(1200, Number(options.maxTaskChars || options.max_task_chars || 6000));
    if (text.length <= maxChars) {
        return {
            compacted: false,
            text,
            originalChars: text.length,
            compactedChars: text.length,
            omittedChars: 0,
            criticalLines: [],
        };
    }
    const headChars = Math.max(600, Math.floor(maxChars * 0.42));
    const tailChars = Math.max(500, Math.floor(maxChars * 0.28));
    const criticalPattern = /CCM_AGENT_RECEIPT|ACK gate|验证要求|验收|交付物|本次任务|需求理解|用户约束|文档依据|Replay repair|brief_id|work_item_id|proof|request_patch_checksum|runner|execution|Context usage budget|WorkerContextPacket/i;
    const criticalLines = (0, group_orchestrator_coded_part_03_1.uniqueCoordinatorStrings)(text.split(/\r?\n/g)
        .map(line => line.trim())
        .filter(line => line && criticalPattern.test(line))
        .map(line => (0, group_orchestrator_prompts_1.compactText)(line, 220)))
        .slice(0, 18);
    const marker = [
        "",
        `[AUTO_CONTEXT_COMPACT omitted_chars=${Math.max(0, text.length - headChars - tailChars)} original_sha=${(0, group_orchestrator_coded_part_01_1.hashCoordinator)(text, 24)}]`,
        "Preserved critical dispatch lines:",
        ...(criticalLines.length ? criticalLines.map(line => `- ${line}`) : ["- ACK gate / CCM_AGENT_RECEIPT / verification contract retained by WorkerContextPacket acceptance fields."]),
        "[/AUTO_CONTEXT_COMPACT]",
        "",
    ].join("\n");
    let compacted = `${text.slice(0, headChars).trimEnd()}${marker}${text.slice(-tailChars).trimStart()}`.trim();
    if (compacted.length > maxChars + 600) {
        const markerBudget = Math.min(1800, marker.length);
        const compactHead = Math.max(500, Math.floor((maxChars - markerBudget) * 0.58));
        const compactTail = Math.max(400, Math.floor((maxChars - markerBudget) * 0.30));
        compacted = `${text.slice(0, compactHead).trimEnd()}${marker}${text.slice(-compactTail).trimStart()}`.trim();
    }
    return {
        compacted: true,
        text: compacted,
        originalChars: text.length,
        compactedChars: compacted.length,
        omittedChars: Math.max(0, text.length - compacted.length),
        criticalLines,
    };
}
exports.WORKER_CONTEXT_REPLAY_BRIEF_PARTIAL_COMPACT_FIELDS = [
    "brief_id",
    "work_item_id",
    "source",
    "component",
    "target_project",
    "reinjection_gate_id",
    "post_compact_candidate_id",
    "post_compact_candidate_kind",
    "post_compact_candidate_value",
    "post_compact_candidate_source_message_id",
    "proof_entry_id",
    "request_patch_checksum",
    "provider_reproof_status",
    "provider_reproof_reason",
    "reproof_candidate_id",
    "timeline_binding_id",
    "original_work_item_id",
    "request_telemetry_session_status",
    "request_telemetry_dispatch_status",
    "runner_request_id",
    "execution_id",
];
function replayBriefPartialCompactValue(raw = {}, key) {
    const aliases = {
        brief_id: ["brief_id", "briefId"],
        work_item_id: ["work_item_id", "workItemId"],
        target_project: ["target_project", "targetProject"],
        reinjection_gate_id: ["reinjection_gate_id", "reinjectionGateId"],
        post_compact_candidate_id: ["post_compact_candidate_id", "postCompactCandidateId"],
        post_compact_candidate_kind: ["post_compact_candidate_kind", "postCompactCandidateKind"],
        post_compact_candidate_value: ["post_compact_candidate_value", "postCompactCandidateValue"],
        post_compact_candidate_source_message_id: ["post_compact_candidate_source_message_id", "postCompactCandidateSourceMessageId"],
        proof_entry_id: ["proof_entry_id", "proofEntryId"],
        request_patch_checksum: ["request_patch_checksum", "requestPatchChecksum"],
        provider_reproof_status: ["provider_reproof_status", "providerReproofStatus"],
        provider_reproof_reason: ["provider_reproof_reason", "providerReproofReason"],
        reproof_candidate_id: ["reproof_candidate_id", "reproofCandidateId"],
        timeline_binding_id: ["timeline_binding_id", "timelineBindingId"],
        original_work_item_id: ["original_work_item_id", "originalWorkItemId"],
        request_telemetry_session_status: ["request_telemetry_session_status", "requestTelemetrySessionStatus"],
        request_telemetry_dispatch_status: ["request_telemetry_dispatch_status", "requestTelemetryDispatchStatus"],
        runner_request_id: ["runner_request_id", "runnerRequestId"],
        execution_id: ["execution_id", "executionId"],
    };
    for (const alias of aliases[key] || [key]) {
        if (raw[alias] !== undefined && raw[alias] !== null && raw[alias] !== "")
            return raw[alias];
    }
    return "";
}
function compactReplayRepairDispatchBriefsForWorkerContextRetry(briefs = [], options = {}) {
    return require("./group-orchestrator-replay-repair").compactReplayRepairDispatchBriefsForWorkerContextRetry(briefs, options);
}
function combineWorkerContextPartialCompactionSummariesForCoordinator(summaries = []) {
    const items = (summaries || []).filter((item) => item?.schema);
    if (items.length <= 1)
        return items[0] || null;
    return {
        schema: "ccm-worker-context-partial-compaction-set-v1",
        method: "ordered_category_partial_compactions_before_task_compaction",
        category: "multi_category",
        status: items.every((item) => item.status === "compacted") ? "compacted" : "attempted",
        categories: items.map((item) => item.category || "").filter(Boolean),
        item_count: items.length,
        items,
        omitted_chars: items.reduce((sum, item) => sum + Number(item.omitted_chars || 0), 0),
        preserves_receipt_reference: items.every((item) => item.preserves_receipt_reference !== false),
        preserves_real_task_suppression: items.every((item) => item.preserves_real_task_suppression !== false),
        generated_at: new Date().toISOString(),
    };
}
function workerContextPartialCompactMethodForCoordinator(memoryCompacted, summaries = [], taskCompacted = false) {
    const categories = (summaries || []).map((item) => String(item?.category || "")).filter(Boolean);
    const parts = [];
    if (memoryCompacted)
        parts.push("memory_first");
    if (categories.includes("replay_repair_dispatch_briefs"))
        parts.push("replay_brief_partial");
    if (categories.includes("worker_context_metadata"))
        parts.push("metadata_partial");
    if (taskCompacted)
        parts.push("deterministic_head_tail_critical_lines");
    return parts.length ? `${parts.join("_then_")}_compact`.replace("_critical_lines_compact", "_critical_lines") : "deterministic_head_tail_critical_lines";
}
function compactWorkerContextMetadataStringsForCoordinator(values = [], options = {}, defaults = {}) {
    const list = Array.isArray(values) ? values.map((item) => String(item || "").trim()).filter(Boolean) : [];
    const maxItems = Math.max(1, Number(options.maxItems || options.max_items || defaults.maxItems || 8));
    const maxStringChars = Math.max(80, Number(options.maxStringChars || options.max_string_chars || defaults.maxStringChars || 260));
    return list.slice(0, maxItems).map((item) => (0, group_orchestrator_prompts_1.compactText)(item, maxStringChars));
}
function workerContextPressureRecallUsageSummaryForCompactPolicy(options = {}) {
    const explicit = options.pressureRecallUsageSummary
        || options.pressure_recall_usage_summary
        || options.workerContextPressureRecallUsageSummary
        || options.worker_context_pressure_recall_usage_summary
        || null;
    if (explicit?.schema)
        return explicit;
    const groupId = String(options.groupId || options.group_id || options.group?.id || "").trim();
    if (!groupId || options.disablePressureRecallUsageStrategy === true || options.disable_pressure_recall_usage_strategy === true)
        return null;
    try {
        const summary = (0, group_memory_index_1.buildGroupTypedMemoryPressureRecallUsageSummary)(groupId, {
            targetProject: options.targetProject || options.target_project || options.project || "",
            nowMs: options.nowMs || options.now_ms,
            now: options.now,
            generatedAt: options.generatedAt || options.generated_at,
            usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
            usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
            disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
        });
        if (summary?.has_history === true || Number(summary?.memory_count || 0) > 0)
            return summary;
        if (options.disableCrossGroupPressureRecallUsage === true
            || options.disable_cross_group_pressure_recall_usage === true
            || options.crossGroupPressureRecallUsage === false
            || options.cross_group_pressure_recall_usage === false)
            return null;
        const crossGroupSummary = (0, group_memory_index_1.buildGroupTypedMemoryPressureRecallUsageProjectSummary)(groupId, {
            targetProject: options.targetProject || options.target_project || options.project || "",
            nowMs: options.nowMs || options.now_ms,
            now: options.now,
            generatedAt: options.generatedAt || options.generated_at,
            usageHalfLifeDays: options.usageHalfLifeDays || options.usage_half_life_days,
            usageStaleAfterDays: options.usageStaleAfterDays || options.usage_stale_after_days,
            disableUsageAging: options.disableUsageAging || options.disable_usage_aging,
            groupIds: options.crossGroupPressureRecallUsageGroupIds
                || options.cross_group_pressure_recall_usage_group_ids
                || options.crossGroupIds
                || options.cross_group_ids,
            maxGroups: options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups,
        });
        return crossGroupSummary?.has_history === true || Number(crossGroupSummary?.memory_count || 0) > 0 ? crossGroupSummary : null;
    }
    catch {
        return null;
    }
}
function workerContextCompactStrategyPressureUsageBiasForCoordinator(summary = null) {
    const rows = [
        ...(Array.isArray(summary?.rows) ? summary.rows : []),
        ...(Array.isArray(summary?.useful_pressure_memories) ? summary.useful_pressure_memories : []),
        ...(Array.isArray(summary?.ignored_pressure_memories) ? summary.ignored_pressure_memories : []),
        ...(Array.isArray(summary?.stale_pressure_memories) ? summary.stale_pressure_memories : []),
    ];
    const compactStrategyRows = rows.filter((row = {}) => {
        const relPath = String(row.rel_path || row.relPath || "").toLowerCase();
        const name = String(row.name || "").toLowerCase();
        return relPath === "worker-context-compact-strategy-memory.md"
            || /worker-context-compact-strategy-memory|compact strategy memory/.test(`${relPath}\n${name}`);
    });
    const row = compactStrategyRows
        .sort((a, b) => Number(b.weighted_total_count || b.total_count || 0) - Number(a.weighted_total_count || a.total_count || 0))[0] || null;
    if (!row) {
        return {
            schema: "ccm-worker-context-partial-compact-pressure-recall-usage-bias-v1",
            active: false,
            reason: "no_compact_strategy_pressure_usage_feedback",
            category_adjustment_cap: 0,
            summary_source: summary?.source || "",
            source_group_count: Number(summary?.source_group_count || 0),
        };
    }
    const weightedUsed = Number(row.weighted_used_count || row.used_count || 0);
    const weightedVerified = Number(row.weighted_verified_count || row.verified_count || 0);
    const weightedIgnored = Number(row.weighted_ignored_count || row.ignored_count || 0);
    const weightedMentioned = Number(row.weighted_mentioned_count || row.mentioned_count || 0);
    const weightedTotal = Number(row.weighted_total_count || weightedUsed + weightedVerified + weightedIgnored + weightedMentioned || 0);
    const useful = weightedUsed + weightedVerified * 1.2;
    const ignored = weightedIgnored + weightedMentioned * 0.35;
    const trustScore = Math.round((useful - ignored) * 100) / 100;
    const recommendation = String(row.recommendation || "");
    const active = recommendation === "promote_pressure_recall"
        || trustScore >= 1.25;
    const suppressed = recommendation === "deprioritize_pressure_recall" || trustScore <= -1.25;
    const stale = recommendation === "stale_pressure_recall_history"
        || (Number(row.stale_count || 0) > 0 && Number(row.fresh_count || 0) === 0);
    return {
        schema: "ccm-worker-context-partial-compact-pressure-recall-usage-bias-v1",
        active: active && !stale,
        suppressed: suppressed || stale,
        stale,
        rel_path: row.rel_path || row.relPath || "",
        recommendation: recommendation || "neutral_verify_current_pressure",
        weighted_used_count: Math.round(weightedUsed * 1000) / 1000,
        weighted_verified_count: Math.round(weightedVerified * 1000) / 1000,
        weighted_ignored_count: Math.round(weightedIgnored * 1000) / 1000,
        weighted_mentioned_count: Math.round(weightedMentioned * 1000) / 1000,
        weighted_total_count: Math.round(weightedTotal * 1000) / 1000,
        stale_count: Number(row.stale_count || 0),
        fresh_count: Number(row.fresh_count || 0),
        avg_decay_weight: Number(row.avg_decay_weight || row.decay_weight || 0),
        trust_score: trustScore,
        category_adjustment_cap: active && !stale ? Math.min(1200, Math.max(160, Math.round((useful + Math.max(0, trustScore)) * 260))) : 0,
        reason: active && !stale
            ? "compact_strategy_pressure_memory_recently_used"
            : stale
                ? "compact_strategy_pressure_memory_feedback_is_stale"
                : suppressed
                    ? "compact_strategy_pressure_memory_recently_ignored"
                    : "compact_strategy_pressure_memory_feedback_neutral",
        summary_ledger_file: summary?.ledger_file || "",
        summary_source: summary?.source || "",
        source_group_count: Number(summary?.source_group_count || 0),
        source_groups: Array.isArray(summary?.source_groups) ? summary.source_groups.slice(0, 8) : [],
    };
}
function buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet = {}, options = {}) {
    return require("./group-orchestrator-worker-context").buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet, options);
}
function compactWorkerContextMetadataCategoriesForRetry(packet = {}, baseOptions = {}, options = {}) {
    const policy = buildWorkerContextMetadataPartialCompactPolicyForCoordinator(packet, options);
    const selectedCategories = new Set(policy.selected_categories || []);
    const constraints = Array.isArray(packet.constraints) ? packet.constraints : [];
    const documentFindings = Array.isArray(packet.document_findings) ? packet.document_findings : [];
    const dependencies = Array.isArray(packet.dependencies) ? packet.dependencies : [];
    const contractInjections = Array.isArray(packet.contract_injections) ? packet.contract_injections : [];
    const beforeValue = {
        constraints: selectedCategories.has("constraints_and_documents") ? constraints : [],
        document_findings: selectedCategories.has("constraints_and_documents") ? documentFindings : [],
        dependencies: selectedCategories.has("dependencies") ? dependencies : [],
        contract_injections: selectedCategories.has("contract_injections") ? contractInjections : [],
    };
    const beforeText = JSON.stringify(beforeValue);
    if (!policy.selected_categories.length || !beforeText || beforeText === "{}")
        return { compacted: false, options: baseOptions, summary: null, policy };
    const maxItems = Math.max(1, Number(options.maxItems || options.max_items || 8));
    const maxStringChars = Math.max(80, Number(options.maxStringChars || options.max_string_chars || 260));
    const maxDependencyReasonChars = Math.max(80, Number(options.maxDependencyReasonChars || options.max_dependency_reason_chars || maxStringChars));
    const maxContractSummaryChars = Math.max(80, Number(options.maxContractSummaryChars || options.max_contract_summary_chars || maxStringChars));
    const compactedConstraints = selectedCategories.has("constraints_and_documents")
        ? compactWorkerContextMetadataStringsForCoordinator(constraints, { maxItems, maxStringChars }, { maxItems: 8, maxStringChars: 220 })
        : constraints;
    const compactedDocumentFindings = selectedCategories.has("constraints_and_documents")
        ? compactWorkerContextMetadataStringsForCoordinator(documentFindings, { maxItems, maxStringChars }, { maxItems: 8, maxStringChars: 260 })
        : documentFindings;
    const compactedDependencies = selectedCategories.has("dependencies") ? dependencies.slice(0, maxItems).map((item = {}) => ({
        project: String(item.project || item.target_project || item.targetProject || item.name || "").trim(),
        reason: (0, group_orchestrator_prompts_1.compactText)(String(item.reason || item.summary || item.blocker || "前置依赖").trim(), maxDependencyReasonChars),
        dependency_id: item.dependency_id || item.dependencyId || item.id || "",
        required_receipt_reference: item.required_receipt_reference === true || item.requiredReceiptReference === true,
    })) : dependencies;
    const compactedContractInjections = selectedCategories.has("contract_injections") ? contractInjections.slice(0, Math.max(1, Number(options.maxContractItems || options.max_contract_items || maxItems))).map((item = {}) => ({
        injection_id: item.injection_id || item.injectionId || "",
        source_agent: item.source_agent || item.sourceAgent || item.source || "",
        target_agent: item.target_agent || item.targetAgent || item.target || packet.project || "",
        endpoint: item.endpoint || item.type || "",
        summary: (0, group_orchestrator_prompts_1.compactText)(String(item.summary || item.change || "").trim(), maxContractSummaryChars),
        required_receipt_reference: true,
    })) : contractInjections;
    const afterValue = {
        constraints: selectedCategories.has("constraints_and_documents") ? compactedConstraints : [],
        document_findings: selectedCategories.has("constraints_and_documents") ? compactedDocumentFindings : [],
        dependencies: selectedCategories.has("dependencies") ? compactedDependencies : [],
        contract_injections: selectedCategories.has("contract_injections") ? compactedContractInjections : [],
    };
    const afterText = JSON.stringify(afterValue);
    const compacted = afterText.length < beforeText.length;
    const compactedOptions = compacted ? {
        ...baseOptions,
        analysis: {
            ...(baseOptions.analysis || {}),
            constraints: compactedConstraints,
            documentFindings: compactedDocumentFindings,
        },
        workerContextDependencies: compactedDependencies,
        contractInjections: compactedContractInjections,
    } : baseOptions;
    const summary = compacted ? {
        schema: "ccm-worker-context-metadata-partial-compaction-v1",
        method: "top_category_metadata_field_compaction",
        category: "worker_context_metadata",
        categories: (policy.selected_categories || []).filter((category) => {
            if (category === "constraints_and_documents")
                return constraints.length || documentFindings.length;
            if (category === "contract_injections")
                return contractInjections.length;
            if (category === "dependencies")
                return dependencies.length;
            return false;
        }),
        partial_compact_policy: policy,
        selected_from_top_categories: policy.selected_categories || [],
        skipped_categories: policy.skipped_categories || [],
        status: "compacted",
        original_metadata_hash: (0, group_orchestrator_coded_part_01_1.hashCoordinator)(beforeText, 24),
        compacted_metadata_hash: (0, group_orchestrator_coded_part_01_1.hashCoordinator)(afterText, 24),
        original_metadata_chars: beforeText.length,
        compacted_metadata_chars: afterText.length,
        omitted_chars: Math.max(0, beforeText.length - afterText.length),
        original_counts: {
            constraints: constraints.length,
            document_findings: documentFindings.length,
            dependencies: dependencies.length,
            contract_injections: contractInjections.length,
        },
        compacted_counts: {
            constraints: compactedConstraints.length,
            document_findings: compactedDocumentFindings.length,
            dependencies: compactedDependencies.length,
            contract_injections: compactedContractInjections.length,
        },
        max_items: maxItems,
        max_string_chars: maxStringChars,
        max_dependency_reason_chars: maxDependencyReasonChars,
        max_contract_summary_chars: maxContractSummaryChars,
        preserved_fields: [
            "constraints",
            "documentFindings",
            "dependency.project",
            "dependency.reason",
            "dependency.dependency_id",
            "contract.injection_id",
            "contract.source_agent",
            "contract.target_agent",
            "contract.endpoint",
            "contract.required_receipt_reference",
        ],
        preserves_receipt_reference: true,
        preserves_real_task_suppression: true,
        generated_at: new Date().toISOString(),
    } : null;
    return { compacted, options: compactedOptions, summary, policy };
}
function buildWorkerContextPacketForAssignment(baseAssignment, dependsOn, replayRepairDispatchBriefs, options = {}) {
    return require("./group-orchestrator-worker-context").buildWorkerContextPacketForAssignment(baseAssignment, dependsOn, replayRepairDispatchBriefs, options);
}
function pressureProvenanceProviderDispatchPolicyForCoordinator(healthStatus) {
    if (healthStatus === "critical")
        return "hold_until_repair";
    if (healthStatus === "warning")
        return "strict_review_before_dispatch";
    if (healthStatus === "monitor")
        return "allow_with_receipt_sampling";
    if (healthStatus === "watch")
        return "allow_with_monitoring";
    return "preferred";
}
function pressureProvenanceProviderHealthForCoordinator(policy = {}, row = {}) {
    if (policy?.active === true && (row?.provider_switch_execution_mismatch_escalated === true || row?.providerSwitchExecutionMismatchEscalated === true))
        return "critical";
    if (policy?.active === true && (row?.provider_override_followup_receipt_validation_escalated === true || row?.providerOverrideFollowupReceiptValidationEscalated === true))
        return "critical";
    if (policy?.active === true && row?.relapsed === true)
        return "critical";
    if (policy?.active === true)
        return "warning";
    if (Number(row?.provider_switch_execution_mismatch_count || row?.providerSwitchExecutionMismatchCount || 0) > 0)
        return "monitor";
    if (row?.recovered === true)
        return "monitor";
    if (row?.provider_override_followup_repaired === true || row?.providerOverrideFollowupRepaired === true)
        return "monitor";
    if (Number(row?.violation_count || row?.violationCount || 0) > 0)
        return "watch";
    if (row?.cross_group_provider_reliability_actionable === true || row?.crossGroupProviderReliabilityActionable === true) {
        return ["high", "medium"].includes(String(row?.cross_group_provider_reliability_risk_status || row?.crossGroupProviderReliabilityRiskStatus || "")) ? "monitor" : "watch";
    }
    return "healthy";
}
function providerReliabilityConfiguredCandidatesForCoordinator(project, selectedAgentType, options = {}) {
    const group = options.group && typeof options.group === "object" ? options.group : null;
    const member = Array.isArray(group?.members)
        ? group.members.find((item) => String(item.project || "").trim().toLowerCase() === String(project || "").trim().toLowerCase())
        : null;
    const raw = [
        ...(Array.isArray(options.providerCandidates || options.provider_candidates) ? (options.providerCandidates || options.provider_candidates) : []),
        ...(Array.isArray(options.configuredProviderCandidates || options.configured_provider_candidates) ? (options.configuredProviderCandidates || options.configured_provider_candidates) : []),
        ...(Array.isArray(member?.providerCandidates || member?.provider_candidates) ? (member.providerCandidates || member.provider_candidates) : []),
        ...(Array.isArray(member?.alternativeAgents || member?.alternative_agents) ? (member.alternativeAgents || member.alternative_agents) : []),
        ...(Array.isArray(member?.agents) ? member.agents : []),
    ];
    const seen = new Set();
    const selectedKey = String(selectedAgentType || "").trim().toLowerCase();
    const candidates = [];
    for (const item of raw) {
        const row = typeof item === "string" ? { agent_type: item } : item || {};
        const agentType = String(row.agent_type || row.agentType || row.agent || row.provider || row.runner || "").trim();
        const candidateProject = String(row.project || row.target_project || row.targetProject || project || "").trim();
        const key = `${agentType.toLowerCase()}|${candidateProject.toLowerCase()}`;
        if (!agentType || agentType.toLowerCase() === selectedKey || candidateProject.toLowerCase() !== String(project || "").trim().toLowerCase())
            continue;
        if (row.enabled === false || row.configured === false || seen.has(key))
            continue;
        seen.add(key);
        candidates.push({
            agent_type: agentType,
            project: candidateProject,
            configured: true,
            source: "explicit_same_project_provider_candidate",
        });
    }
    return candidates.slice(0, 12);
}
function providerReliabilityHealthRankForCoordinator(healthStatus) {
    const rank = {
        healthy: 0,
        watch: 1,
        monitor: 2,
        warning: 3,
        critical: 4,
    };
    return rank[String(healthStatus || "healthy")] ?? 5;
}
function providerReliabilityRiskRankForCoordinator(riskStatus) {
    const rank = {
        low: 0,
        empty: 1,
        medium: 2,
        high: 3,
    };
    return rank[String(riskStatus || "empty")] ?? 4;
}
function providerSwitchExecutionRankPenaltyForCoordinator(row = {}) {
    const weightedRiskScore = Math.max(0, Number(row.provider_switch_execution_weighted_risk_score
        || row.providerSwitchExecutionWeightedRiskScore
        || 0));
    const riskScore = Math.max(0, Number(row.provider_switch_execution_risk_score || row.providerSwitchExecutionRiskScore || 0));
    const confidence = Math.max(0, Math.min(1, Number(row.provider_switch_execution_risk_confidence || row.providerSwitchExecutionRiskConfidence || 0)));
    const mismatchCount = Math.max(0, Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0));
    if (!weightedRiskScore && !riskScore && !mismatchCount)
        return 0;
    const weightedPenalty = Math.min(8, weightedRiskScore * 4);
    const confidencePenalty = Math.min(4, riskScore * confidence * 4);
    const mismatchFloor = mismatchCount > 0 ? 1 : 0;
    return Math.max(mismatchFloor, Math.round(weightedPenalty + confidencePenalty));
}
function providerSwitchExecutionRankingProvenanceForCoordinator(row = {}, role = "candidate") {
    const memoryRelPaths = Array.isArray(row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths)
        ? (row.provider_switch_execution_memory_rel_paths || row.providerSwitchExecutionMemoryRelPaths).slice(0, 8)
        : [];
    const rowIds = Array.isArray(row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds)
        ? (row.provider_switch_execution_row_ids || row.providerSwitchExecutionRowIds).slice(0, 12)
        : [];
    const receiptIds = Array.isArray(row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds)
        ? (row.provider_switch_execution_receipt_ids || row.providerSwitchExecutionReceiptIds).slice(0, 8)
        : [];
    const decisionIds = Array.isArray(row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds)
        ? (row.provider_switch_execution_decision_receipt_ids || row.providerSwitchExecutionDecisionReceiptIds).slice(0, 8)
        : [];
    const hasExecutionEvidence = memoryRelPaths.length > 0
        || rowIds.length > 0
        || Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0) > 0;
    return {
        schema: "ccm-provider-ranking-provenance-v1",
        role,
        source: hasExecutionEvidence ? "typed-memory:provider-switch-execution-memory" : "none",
        typed_memory_rel_paths: memoryRelPaths,
        typed_memory_row_ids: rowIds,
        execution_receipt_ids: receiptIds,
        decision_receipt_ids: decisionIds,
        provider_switch_execution_executed_count: Number(row.provider_switch_execution_executed_count || row.providerSwitchExecutionExecutedCount || 0),
        provider_switch_execution_mismatch_count: Number(row.provider_switch_execution_mismatch_count || row.providerSwitchExecutionMismatchCount || 0),
        provider_switch_execution_weighted_risk_score: Number(row.provider_switch_execution_weighted_risk_score || row.providerSwitchExecutionWeightedRiskScore || 0),
        provider_switch_execution_risk_score: Number(row.provider_switch_execution_risk_score || row.providerSwitchExecutionRiskScore || 0),
        provider_switch_execution_risk_confidence: Number(row.provider_switch_execution_risk_confidence || row.providerSwitchExecutionRiskConfidence || 0),
        local_execution_rank_penalty: Number(row.local_execution_rank_penalty || row.localExecutionRankPenalty || 0),
        composite_rank: Number(row.composite_rank || row.compositeRank || 0),
        selected_composite_rank: Number(row.selected_composite_rank || row.selectedCompositeRank || 0),
        compact_safe: true,
        boundary: "ranking evidence only; passed history is not future switch authorization",
    };
}
function providerReliabilitySignalForAgentForCoordinator(snapshotRead = {}, agentType = "") {
    const envelope = snapshotRead?.snapshot?.signals || {};
    const signals = Array.isArray(envelope.signals) ? envelope.signals : [];
    return signals.find((signal) => String(signal.agent_type || signal.agentType || "").trim().toLowerCase() === String(agentType || "").trim().toLowerCase()) || null;
}
//# sourceMappingURL=group-orchestrator-coded-part-02.js.map