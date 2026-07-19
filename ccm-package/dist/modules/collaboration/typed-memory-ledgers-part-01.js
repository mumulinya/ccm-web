"use strict";
// Behavior-freeze split from typed-memory-ledgers.ts (part 1/4).
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.readGroupTypedMemoryPressureRecallUsageLedger = readGroupTypedMemoryPressureRecallUsageLedger;
exports.writeGroupTypedMemoryPressureRecallUsageLedger = writeGroupTypedMemoryPressureRecallUsageLedger;
exports.recordGroupTypedMemoryPressureRecallUsageLedger = recordGroupTypedMemoryPressureRecallUsageLedger;
exports.getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile = getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile;
exports.normalizePostCompactCompletionMemoryPreservationClosureUsageState = normalizePostCompactCompletionMemoryPreservationClosureUsageState;
exports.normalizePostCompactCompletionMemoryPreservationClosureTaskFamily = normalizePostCompactCompletionMemoryPreservationClosureTaskFamily;
exports.postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance = postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance;
exports.normalizePostCompactCompletionMemoryPreservationClosureUsageAging = normalizePostCompactCompletionMemoryPreservationClosureUsageAging;
exports.postCompactCompletionMemoryPreservationClosureEvidenceSessionKey = postCompactCompletionMemoryPreservationClosureEvidenceSessionKey;
exports.clusterPostCompactCompletionMemoryPreservationClosureEvidence = clusterPostCompactCompletionMemoryPreservationClosureEvidence;
exports.scorePostCompactCompletionMemoryPreservationClosureEvidence = scorePostCompactCompletionMemoryPreservationClosureEvidence;
exports.arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict = arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict;
exports.postCompactCompletionMemoryPreservationClosureUsageRecommendation = postCompactCompletionMemoryPreservationClosureUsageRecommendation;
exports.readPostCompactCompletionMemoryPreservationClosureUsageLedger = readPostCompactCompletionMemoryPreservationClosureUsageLedger;
exports.recordPostCompactCompletionMemoryPreservationClosureUsage = recordPostCompactCompletionMemoryPreservationClosureUsage;
exports.buildPostCompactCompletionMemoryPreservationClosureUsageSummary = buildPostCompactCompletionMemoryPreservationClosureUsageSummary;
exports.listGroupTypedMemoryPressureRecallUsageLedgers = listGroupTypedMemoryPressureRecallUsageLedgers;
exports.getGroupTypedMemoryRecallLedgerFile = getGroupTypedMemoryRecallLedgerFile;
exports.getGroupTypedMemoryConsumptionLedgerFile = getGroupTypedMemoryConsumptionLedgerFile;
exports.getGroupTypedMemoryStaleCandidateLedgerFile = getGroupTypedMemoryStaleCandidateLedgerFile;
exports.getGroupTypedMemoryPressureRecallUsageLedgerFile = getGroupTypedMemoryPressureRecallUsageLedgerFile;
exports.cleanupGroupTypedMemoryArtifactStage = cleanupGroupTypedMemoryArtifactStage;
exports.postCompactCompletionMemoryPreservationRepairClosureInputRows = postCompactCompletionMemoryPreservationRepairClosureInputRows;
exports.postCompactCompletionMemoryPreservationRepairClosureRowId = postCompactCompletionMemoryPreservationRepairClosureRowId;
exports.normalizePostCompactCompletionMemoryPreservationRepairClosureRows = normalizePostCompactCompletionMemoryPreservationRepairClosureRows;
exports.mergePostCompactCompletionMemoryPreservationRepairClosureRows = mergePostCompactCompletionMemoryPreservationRepairClosureRows;
exports.postCompactCompletionMemoryPreservationRepairClosureArchive = postCompactCompletionMemoryPreservationRepairClosureArchive;
exports.renderPostCompactCompletionMemoryPreservationRepairClosureBody = renderPostCompactCompletionMemoryPreservationRepairClosureBody;
exports.normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows = normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows;
exports.renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody = renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir;
exports.conflictResolutionColdArchiveShardFile = conflictResolutionColdArchiveShardFile;
exports.readAndVerifyConflictResolutionColdArchiveShard = readAndVerifyConflictResolutionColdArchiveShard;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile;
exports.listConflictResolutionColdArchiveShardFiles = listConflictResolutionColdArchiveShardFiles;
exports.readStandaloneConflictResolutionColdArchiveShard = readStandaloneConflictResolutionColdArchiveShard;
exports.reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile;
exports.conflictResolutionMaintenanceScopeMetadata = conflictResolutionMaintenanceScopeMetadata;
exports.conflictResolutionMaintenanceState = conflictResolutionMaintenanceState;
exports.acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification = suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification;
exports.conflictResolutionMaintenanceNotificationDeliveryChecksum = conflictResolutionMaintenanceNotificationDeliveryChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryCompactChecksum = conflictResolutionMaintenanceNotificationDeliveryCompactChecksum;
exports.conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum = conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum;
exports.getConflictResolutionMaintenanceNotificationDeliveryPreviousFile = getConflictResolutionMaintenanceNotificationDeliveryPreviousFile;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile;
exports.getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir = getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir;
exports.verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate = verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile;
exports.cleanupGroupLedgerLockChecksum = cleanupGroupLedgerLockChecksum;
exports.readCleanupGroupLedgerLock = readCleanupGroupLedgerLock;
exports.cleanupMetadataBackoffWait = cleanupMetadataBackoffWait;
exports.pruneCleanupMetadataArchives = pruneCleanupMetadataArchives;
exports.acquireCleanupGroupLedgerLock = acquireCleanupGroupLedgerLock;
exports.cleanupGroupLedgerLockHeld = cleanupGroupLedgerLockHeld;
exports.releaseCleanupGroupLedgerLock = releaseCleanupGroupLedgerLock;
exports.withCleanupGroupLedgerLock = withCleanupGroupLedgerLock;
exports.appendConflictResolutionMaintenanceNotificationDeliveryQuarantine = appendConflictResolutionMaintenanceNotificationDeliveryQuarantine;
exports.conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum;
exports.retainConflictResolutionMaintenanceNotificationDeliveryQuarantine = retainConflictResolutionMaintenanceNotificationDeliveryQuarantine;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_ledgers_part_02_1 = require("./typed-memory-ledgers-part-02");
const typed_memory_ledgers_part_03_1 = require("./typed-memory-ledgers-part-03");
function readGroupTypedMemoryPressureRecallUsageLedger(groupId) {
    return require("./group-memory-recall-usage").readGroupTypedMemoryPressureRecallUsageLedger(groupId);
}
function writeGroupTypedMemoryPressureRecallUsageLedger(groupId, ledger) {
    const file = getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
    const entries = (Array.isArray(ledger.entries) ? ledger.entries : []).slice(-260);
    (0, typed_memory_shared_1.writeJsonAtomic)(file, {
        schema: "ccm-group-typed-memory-pressure-recall-usage-ledger-v1",
        version: 1,
        groupId,
        stats: ledger.stats || {},
        entries,
        totals: ledger.totals || { used: 0, ignored: 0, verified: 0, mentioned: 0, total: 0 },
        updatedAt: ledger.updatedAt || (0, typed_memory_shared_1.now)(),
    });
}
function recordGroupTypedMemoryPressureRecallUsageLedger(groupId, input = {}) {
    return require("./group-memory-recall-usage").recordGroupTypedMemoryPressureRecallUsageLedger(groupId, input);
}
function getPostCompactCompletionMemoryPreservationClosureUsageLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER);
}
function normalizePostCompactCompletionMemoryPreservationClosureUsageState(value) {
    const state = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (["used", "applied", "consumed"].includes(state))
        return "used";
    if (["verified", "checked", "reverified"].includes(state))
        return "verified";
    if (["ignored", "not_used", "skipped"].includes(state))
        return "ignored";
    if (["mentioned", "missing", "unclassified"].includes(state))
        return "mentioned";
    return "";
}
function normalizePostCompactCompletionMemoryPreservationClosureTaskFamily(text, explicitKey = "") {
    const explicit = String(explicitKey || "").trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
    const source = (0, typed_memory_shared_1.compactText)(text || "", 1200).toLowerCase();
    const asciiTokens = (source.match(/[a-z0-9_./:-]{3,}/g) || [])
        .flatMap((token) => token.split(/[./:_-]+/g))
        .map((token) => token.trim())
        .filter((token) => token.length >= 3
        && token.length <= 48
        && !typed_memory_shared_1.POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS.has(token)
        && !/^(phase)?\d+$/.test(token)
        && !/^[a-f0-9]{16,}$/.test(token));
    const chineseTokens = [];
    for (const run of source.match(/[\u3400-\u9fff]{2,}/g) || []) {
        for (let index = 0; index < run.length - 1 && chineseTokens.length < 32; index += 1) {
            const token = run.slice(index, index + 2);
            if (!typed_memory_shared_1.POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS.has(token))
                chineseTokens.push(token);
        }
    }
    const tokens = (0, typed_memory_shared_1.uniqueStrings)([...asciiTokens, ...chineseTokens], 40).sort();
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-task-family-v1",
        key: explicit || (tokens.length ? `task-family-${(0, typed_memory_shared_1.checksum)(tokens, 18)}` : ""),
        tokens,
        source_available: !!source,
    };
}
function postCompactCompletionMemoryPreservationClosureTaskFamilyRelevance(entry = {}, queryFamily = {}, options = {}) {
    const entryKey = String(entry.task_family_key || entry.taskFamilyKey || "").trim();
    const entryTokens = (0, typed_memory_shared_1.uniqueStrings)(entry.task_family_tokens || entry.taskFamilyTokens || [], 40);
    const queryKey = String(queryFamily.key || "").trim();
    const queryTokens = (0, typed_memory_shared_1.uniqueStrings)(queryFamily.tokens || [], 40);
    if (!queryKey && queryTokens.length === 0)
        return { score: 1, matched: true, reason: "no_task_family_filter" };
    if (entryKey && queryKey && entryKey === queryKey)
        return { score: 1, matched: true, reason: "exact_task_family" };
    if (entryTokens.length === 0)
        return { score: 1, matched: true, reason: "legacy_global_feedback" };
    if (queryTokens.length === 0)
        return { score: 1, matched: true, reason: "query_family_unavailable" };
    const querySet = new Set(queryTokens);
    const overlap = entryTokens.filter((token) => querySet.has(token));
    const score = (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(overlap.length / Math.max(1, Math.min(entryTokens.length, queryTokens.length)), 4);
    const threshold = Math.max(0.1, Math.min(1, Number(options.taskFamilyRelevanceThreshold
        ?? options.task_family_relevance_threshold
        ?? options.postCompactClosureTaskFamilyRelevanceThreshold
        ?? options.post_compact_closure_task_family_relevance_threshold
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD)));
    return {
        score,
        matched: score >= threshold,
        reason: score >= threshold ? "related_task_family" : "unrelated_task_family",
        overlap_tokens: overlap,
        threshold,
    };
}
function normalizePostCompactCompletionMemoryPreservationClosureUsageAging(options = {}) {
    return (0, typed_memory_recall_1.normalizeWorkerContextPressureRecallUsageAging)({
        ...options,
        usageHalfLifeDays: options.postCompactClosureUsageHalfLifeDays
            ?? options.post_compact_closure_usage_half_life_days
            ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS,
        usageStaleAfterDays: options.postCompactClosureUsageStaleAfterDays
            ?? options.post_compact_closure_usage_stale_after_days
            ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS,
        usageMinDecayWeight: options.postCompactClosureUsageMinDecayWeight
            ?? options.post_compact_closure_usage_min_decay_weight
            ?? 0,
    });
}
function postCompactCompletionMemoryPreservationClosureEvidenceSessionKey(entry = {}) {
    const taskSession = String(entry.task_agent_session_id || entry.taskAgentSessionId || "").trim();
    const nativeSession = String(entry.native_session_id || entry.nativeSessionId || "").trim();
    if (!taskSession && !nativeSession)
        return "";
    return `${taskSession || "missing-task"}|${nativeSession || "missing-native"}`;
}
function clusterPostCompactCompletionMemoryPreservationClosureEvidence(entries = []) {
    const clusters = [];
    for (const entry of entries) {
        const sessionKey = postCompactCompletionMemoryPreservationClosureEvidenceSessionKey(entry);
        const packetKey = String(entry.worker_context_packet_id || entry.workerContextPacketId || "").trim();
        const matchingIndexes = [];
        clusters.forEach((cluster, index) => {
            if (sessionKey && cluster.session_keys.has(sessionKey))
                matchingIndexes.push(index);
            else if (packetKey && cluster.packet_keys.has(packetKey))
                matchingIndexes.push(index);
        });
        if (!matchingIndexes.length) {
            clusters.push({
                entries: [entry],
                session_keys: new Set(sessionKey ? [sessionKey] : []),
                packet_keys: new Set(packetKey ? [packetKey] : []),
            });
            continue;
        }
        const targetIndex = matchingIndexes[0];
        const target = clusters[targetIndex];
        target.entries.push(entry);
        if (sessionKey)
            target.session_keys.add(sessionKey);
        if (packetKey)
            target.packet_keys.add(packetKey);
        for (const index of matchingIndexes.slice(1).sort((a, b) => b - a)) {
            const merged = clusters[index];
            target.entries.push(...merged.entries);
            for (const key of merged.session_keys)
                target.session_keys.add(key);
            for (const key of merged.packet_keys)
                target.packet_keys.add(key);
            clusters.splice(index, 1);
        }
    }
    return clusters.map((cluster, index) => {
        const ordered = [...cluster.entries].sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
        const representative = ordered[ordered.length - 1] || {};
        return {
            ...representative,
            evidence_cluster_id: `closure-evidence-${(0, typed_memory_shared_1.checksum)([
                ...[...cluster.session_keys].sort(),
                ...[...cluster.packet_keys].sort(),
                representative.entry_id || index,
            ], 18)}`,
            correlated_entry_count: cluster.entries.length,
            correlated_duplicate_count: Math.max(0, cluster.entries.length - 1),
            evidence_session_keys: [...cluster.session_keys],
            evidence_packet_keys: [...cluster.packet_keys],
        };
    });
}
function scorePostCompactCompletionMemoryPreservationClosureEvidence(entries = [], options = {}) {
    const independentEntries = clusterPostCompactCompletionMemoryPreservationClosureEvidence(entries).map((entry) => {
        const sourceReliability = (0, typed_memory_distillation_receipts_1.postCompactCompletionMemoryPreservationClosureReceiptSourceReliability)(entry, options);
        return {
            ...entry,
            receipt_source_reliability: sourceReliability,
            independent_effective_weight: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(Number(entry.effective_weight || 0) * sourceReliability.reliability, 4),
        };
    });
    const independentSessionKeys = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.flatMap((entry) => entry.evidence_session_keys || []), 320);
    const independentPacketKeys = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.flatMap((entry) => entry.evidence_packet_keys || []), 320);
    const providers = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.map((entry) => String(entry.agent || "").trim().toLowerCase()).filter(Boolean), 64);
    const receiptSources = (0, typed_memory_shared_1.uniqueStrings)(independentEntries.map((entry) => entry.receipt_source_reliability?.source).filter(Boolean), 32);
    const weightedEvidence = independentEntries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
    const baseConfidence = 1 - Math.exp(-weightedEvidence / 1.5);
    const sessionFactor = independentSessionKeys.length >= 2 ? 1 : independentSessionKeys.length === 1 ? 0.55 : 0.4;
    const providerFactor = providers.length >= 2 ? 1 : 0.9;
    const sourceFactor = receiptSources.length >= 2 ? 1 : 0.92;
    const confidence = (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(baseConfidence * sessionFactor * providerFactor * sourceFactor, 4);
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-independent-evidence-v1",
        independentEntries,
        rawEntryCount: entries.length,
        independentEvidenceCount: independentEntries.length,
        correlatedDuplicateCount: Math.max(0, entries.length - independentEntries.length),
        independentSessionCount: independentSessionKeys.length,
        independentPacketCount: independentPacketKeys.length,
        distinctProviderCount: providers.length,
        distinctReceiptSourceCount: receiptSources.length,
        providers,
        receiptSources,
        weightedEvidence: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(weightedEvidence, 4),
        averageSourceReliability: independentEntries.length
            ? (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(independentEntries.reduce((sum, entry) => sum + Number(entry.receipt_source_reliability?.reliability || 0), 0) / independentEntries.length, 4)
            : 0,
        confidence,
        confidenceThreshold: Math.max(0.1, Math.min(1, Number(options.evidenceConfidenceThreshold
            ?? options.evidence_confidence_threshold
            ?? options.postCompactClosureEvidenceConfidenceThreshold
            ?? options.post_compact_closure_evidence_confidence_threshold
            ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD))),
    };
}
function arbitratePostCompactCompletionMemoryPreservationClosureEvidenceConflict(independentEntries = [], options = {}) {
    const compliant = independentEntries.filter((entry) => entry.compliant === true);
    const positiveEntries = compliant.filter((entry) => ["used", "verified"].includes(String(entry.usage_state || "")));
    const ignoredEntries = compliant.filter((entry) => entry.usage_state === "ignored");
    const summarizeBranch = (entries) => {
        const weight = entries.reduce((sum, entry) => sum + Number(entry.independent_effective_weight || 0), 0);
        const sessions = (0, typed_memory_shared_1.uniqueStrings)(entries.flatMap((entry) => entry.evidence_session_keys || []), 320);
        return {
            entry_count: entries.length,
            independent_session_count: sessions.length,
            independent_packet_count: (0, typed_memory_shared_1.uniqueStrings)(entries.flatMap((entry) => entry.evidence_packet_keys || []), 320).length,
            weighted_evidence: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(weight, 4),
            confidence: (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(1 - Math.exp(-weight / 1.5), 4),
            providers: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.agent).filter(Boolean), 32),
            receipt_sources: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.receipt_source_reliability?.source).filter(Boolean), 24),
            entry_ids: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.entry_id).filter(Boolean), 32),
            task_agent_session_ids: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.task_agent_session_id).filter(Boolean), 32),
            native_session_ids: (0, typed_memory_shared_1.uniqueStrings)(entries.map((entry) => entry.native_session_id).filter(Boolean), 32),
        };
    };
    const positive = summarizeBranch(positiveEntries);
    const ignored = summarizeBranch(ignoredEntries);
    const maxWeight = Math.max(positive.weighted_evidence, ignored.weighted_evidence);
    const minWeight = Math.min(positive.weighted_evidence, ignored.weighted_evidence);
    const conflictRatio = maxWeight > 0 ? (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(minWeight / maxWeight, 4) : 0;
    const minBranchWeight = Math.max(0.1, Number(options.conflictMinBranchWeight
        ?? options.conflict_min_branch_weight
        ?? options.postCompactClosureConflictMinBranchWeight
        ?? options.post_compact_closure_conflict_min_branch_weight
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT));
    const ratioThreshold = Math.max(0.05, Math.min(1, Number(options.conflictRatioThreshold
        ?? options.conflict_ratio_threshold
        ?? options.postCompactClosureConflictRatioThreshold
        ?? options.post_compact_closure_conflict_ratio_threshold
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD)));
    const active = positive.independent_session_count > 0
        && ignored.independent_session_count > 0
        && positive.weighted_evidence >= minBranchWeight
        && ignored.weighted_evidence >= minBranchWeight
        && conflictRatio >= ratioThreshold;
    return {
        schema: "ccm-post-compact-completion-memory-preservation-closure-feedback-conflict-v1",
        active,
        arbitration_state: active
            ? "contradictory_reverify_current_session"
            : positive.weighted_evidence > ignored.weighted_evidence
                ? "consistent_used_or_verified"
                : ignored.weighted_evidence > positive.weighted_evidence
                    ? "consistent_ignored"
                    : "insufficient_evidence",
        ranking_action: active ? "neutralize_historical_promotion_and_suppression" : "use_confidence_gated_recommendation",
        current_session_verification_required: active,
        historical_majority_authorization_allowed: false,
        conflict_ratio: conflictRatio,
        conflict_confidence: active ? (0, typed_memory_recall_1.roundPressureRecallUsageWeight)(Math.min(positive.confidence, ignored.confidence) * conflictRatio, 4) : 0,
        min_branch_weight: minBranchWeight,
        ratio_threshold: ratioThreshold,
        positive,
        ignored,
    };
}
function postCompactCompletionMemoryPreservationClosureUsageRecommendation(stats = {}, options = {}) {
    const ignoredThreshold = Math.max(1, Number(options.weightedIgnoredThreshold || options.weighted_ignored_threshold || 1.5));
    const used = Number(stats.weighted_used_count ?? stats.used_count ?? 0);
    const verified = Number(stats.weighted_verified_count ?? stats.verified_count ?? 0);
    const ignored = Number(stats.weighted_ignored_count ?? stats.ignored_count ?? 0);
    const stale = Number(stats.stale_count || 0);
    if (stats.active_receipt_repair_required === true)
        return "require_receipt_repair_before_reuse";
    if (stats.conflict_resolution_active === true) {
        return ["used", "verified"].includes(String(stats.conflict_resolution_usage_state || ""))
            ? "resolved_conflict_promote_but_reverify_future_session"
            : "resolved_conflict_neutral_reverify_future_session";
    }
    if (stats.feedback_conflict_active === true)
        return "surface_conflict_reverify_current_session";
    const confidenceThreshold = Number(stats.evidence_confidence_threshold
        ?? options.evidenceConfidenceThreshold
        ?? options.evidence_confidence_threshold
        ?? typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD);
    const ignoredEvidenceConfident = Number(stats.independent_session_count || 0) >= 2
        && Number(stats.evidence_confidence || 0) >= confidenceThreshold;
    if (ignored >= ignoredThreshold && ignored > used + verified && ignoredEvidenceConfident)
        return "deprioritize_closure_recall";
    if (["used", "verified"].includes(String(stats.last_usage_state || ""))
        && stats.last_current_source_verified === true
        && stats.last_feedback_fresh !== false)
        return "promote_but_reverify_current_source";
    if (used + verified > ignored && stale === 0)
        return "promote_but_reverify_current_source";
    if (stale > 0)
        return "caution_stale_history_reverify_current_source";
    return "neutral_reverify_current_source";
}
function readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId, options = {}) {
    return require("./group-memory-recall-usage").readPostCompactCompletionMemoryPreservationClosureUsageLedger(groupId, options);
}
function recordPostCompactCompletionMemoryPreservationClosureUsage(groupId, input = {}) {
    return require("./group-memory-recall-usage").recordPostCompactCompletionMemoryPreservationClosureUsage(groupId, input);
}
function buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, options = {}) {
    return require("./group-memory-recall-usage").buildPostCompactCompletionMemoryPreservationClosureUsageSummary(groupId, options);
}
function listGroupTypedMemoryPressureRecallUsageLedgers(options = {}) {
    const explicitGroupIds = Array.isArray(options.groupIds || options.group_ids || options.crossGroupIds || options.cross_group_ids)
        ? (options.groupIds || options.group_ids || options.crossGroupIds || options.cross_group_ids).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const maxGroups = Math.max(1, Number(options.maxGroups || options.max_groups || options.maxCrossGroupPressureRecallUsageGroups || options.max_cross_group_pressure_recall_usage_groups || typed_memory_shared_1.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS));
    const exclude = new Set((Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : [])
        .map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const candidates = explicitGroupIds.length
        ? explicitGroupIds.map((groupId) => ({
            groupId,
            file: getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId),
        }))
        : (() => {
            try {
                return fs.readdirSync(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
                    .filter(entry => entry.isDirectory())
                    .map(entry => ({
                    groupId: entry.name,
                    file: path.join(typed_memory_shared_1.GROUP_TYPED_MEMORY_DIR, entry.name, typed_memory_shared_1.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER),
                }));
            }
            catch {
                return [];
            }
        })();
    return candidates
        .filter((item) => item.file && fs.existsSync(item.file))
        .map((item) => {
        try {
            const stat = fs.statSync(item.file);
            return { ...item, mtimeMs: stat.mtimeMs || 0 };
        }
        catch {
            return { ...item, mtimeMs: 0 };
        }
    })
        .filter((item) => !exclude.has(String(item.groupId || "").toLowerCase()))
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
        .slice(0, maxGroups);
}
function getGroupTypedMemoryRecallLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_RECALL_LEDGER);
}
function getGroupTypedMemoryConsumptionLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_CONSUMPTION_LEDGER);
}
function getGroupTypedMemoryStaleCandidateLedgerFile(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_TYPED_MEMORY_STALE_CANDIDATE_LEDGER);
}
function getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId) {
    return require("./group-memory-recall-usage").getGroupTypedMemoryPressureRecallUsageLedgerFile(groupId);
}
function cleanupGroupTypedMemoryArtifactStage(groupId, leaseId) {
    const dir = (0, typed_memory_shared_1.groupTypedMemoryArtifactStageDir)(groupId, leaseId);
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    catch { }
    const root = (0, typed_memory_index_build_1.getGroupTypedMemoryArtifactTransactionStageRoot)(groupId);
    try {
        if (fs.existsSync(root) && fs.readdirSync(root).length === 0)
            fs.rmdirSync(root);
    }
    catch { }
}
function postCompactCompletionMemoryPreservationRepairClosureInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const direct = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.completions) ? input.completions : []),
    ];
    if (direct.length)
        return direct;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => (Array.isArray(group.items) ? group.items : []).map((row) => ({
        ...row,
        groupId: row.groupId || row.group_id || group.groupId || group.group_id || "",
        groupSessionId: row.groupSessionId || row.group_session_id || group.groupSessionId || group.group_session_id || "",
    })));
}
function postCompactCompletionMemoryPreservationRepairClosureRowId(row = {}) {
    return `post-compact-completion-memory-preservation-repair-closure:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.groupSessionId,
        row.work_item_id,
        row.failed_outcome_id,
        row.corrected_outcome_id,
        row.completion_doc_rel_paths,
        row.completion_work_item_ids,
        row.completion_timeline_binding_ids,
        row.current_session_binding_id,
        row.current_task_agent_session_id,
        row.current_native_session_id,
    ], 24)}`;
}
function normalizePostCompactCompletionMemoryPreservationRepairClosureRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    const forcedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    return postCompactCompletionMemoryPreservationRepairClosureInputRows(input).map((raw, index) => {
        const item = raw?.item || raw?.completion || raw || {};
        const proof = item.corrected_retry_proof || item.correctedRetryProof || {};
        const historicalTaskSessions = (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_historical_task_agent_session_ids || item.completionPreservationHistoricalTaskAgentSessionIds || [], 32);
        const historicalNativeSessions = (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_historical_native_session_ids || item.completionPreservationHistoricalNativeSessionIds || [], 32);
        const row = {
            schema: "ccm-post-compact-completion-memory-preservation-repair-closure-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION,
            groupId: String(item.groupId || item.group_id || item.scopeId || item.scope_id || fallbackGroupId).trim(),
            groupSessionId: forcedGroupSessionId || String(item.groupSessionId || item.group_session_id || "").trim(),
            source: String(item.source || "").trim(),
            component: String(item.component || "").trim(),
            project: String(item.target_project || item.project || item.target || "").trim(),
            work_item_id: String(item.work_item_id || item.id || "").trim(),
            assignment_id: String(item.assignment_id || item.taskId || "").trim(),
            dispatch_key: String(item.dispatch_key || "").trim(),
            worker_context_packet_id: String(item.worker_context_packet_id || "").trim(),
            binding_id: String(item.binding_id || item.worker_context_packet_binding_id || "").trim(),
            failed_retry_id: String(item.compact_retry_id || proof.failed_retry_id || "").trim(),
            failed_outcome_id: String(item.compact_outcome_id || proof.failed_outcome_id || "").trim(),
            failed_hook_run_id: String(item.compact_hook_run_id || "").trim(),
            corrected_retry_id: String(item.corrected_compact_retry_id || proof.corrected_retry_id || "").trim(),
            corrected_outcome_id: String(item.corrected_compact_outcome_id || proof.corrected_outcome_id || "").trim(),
            corrected_hook_run_id: String(item.corrected_compact_hook_run_id || proof.corrected_hook_run_id || "").trim(),
            completion_doc_rel_paths: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_completion_doc_rel_paths || item.completionPreservationCompletionDocRelPaths || [], 24),
            required_doc_rel_paths: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_required_doc_rel_paths || item.completionPreservationRequiredDocRelPaths || [], 24),
            completion_work_item_ids: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_work_item_ids || item.completionPreservationWorkItemIds || [], 32),
            completion_timeline_binding_ids: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_timeline_binding_ids || item.completionPreservationTimelineBindingIds || [], 32),
            historical_task_agent_session_ids: historicalTaskSessions,
            historical_native_session_ids: historicalNativeSessions,
            current_session_binding_id: String(item.completion_preservation_current_session_binding_id || item.completionPreservationCurrentSessionBindingId || "").trim(),
            current_task_agent_session_id: String(item.completion_preservation_current_task_agent_session_id || item.completionPreservationCurrentTaskAgentSessionId || "").trim(),
            current_native_session_id: String(item.completion_preservation_current_native_session_id || item.completionPreservationCurrentNativeSessionId || "").trim(),
            original_gap_codes: (0, typed_memory_shared_1.uniqueStrings)(item.completion_preservation_gap_codes || item.completionPreservationGapCodes || [], 32),
            exact_identity_restored: proof.exact_identity_restored === true || proof.exactIdentityRestored === true,
            current_session_boundary_restored: proof.current_session_boundary_restored === true || proof.currentSessionBoundaryRestored === true,
            historical_sessions_remain_evidence_only: proof.historical_sessions_remain_evidence_only === true || proof.historicalSessionsRemainEvidenceOnly === true,
            completion_source: String(item.completion_source || "").trim(),
            resolution_reason: String(item.resolutionReason || item.resolution_reason || "").trim(),
            completed_at: String(item.completedAt || item.completed_at || proof.verified_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            reuse_policy: "historical_compaction_repair_closure_requires_new_session_current_source_reverification",
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        row.row_id = postCompactCompletionMemoryPreservationRepairClosureRowId(row);
        return row;
    })
        .filter((row) => row.groupId === fallbackGroupId || (!fallbackGroupId && !!row.groupId))
        .filter((row) => !forcedGroupSessionId || row.groupSessionId === forcedGroupSessionId)
        .filter((row) => row.source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair")
        .filter((row) => row.component === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation")
        .filter((row) => row.completion_source === "post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry")
        .filter((row) => row.resolution_reason === "completion_memory_compaction_preservation_corrected_retry_verified")
        .filter((row) => row.exact_identity_restored && row.current_session_boundary_restored && row.historical_sessions_remain_evidence_only)
        .filter((row) => row.work_item_id && row.failed_retry_id && row.failed_outcome_id && row.corrected_retry_id && row.corrected_outcome_id)
        .filter((row) => row.failed_retry_id !== row.corrected_retry_id && row.failed_outcome_id !== row.corrected_outcome_id)
        .filter((row) => row.completion_doc_rel_paths.length > 0 && row.required_doc_rel_paths.length > 0)
        .filter((row) => row.completion_work_item_ids.length > 0 && row.completion_timeline_binding_ids.length > 0)
        .filter((row) => row.current_session_binding_id && row.current_task_agent_session_id && row.current_native_session_id)
        .filter((row) => !row.historical_task_agent_session_ids.includes(row.current_task_agent_session_id))
        .filter((row) => !row.historical_native_session_ids.includes(row.current_native_session_id));
}
function mergePostCompactCompletionMemoryPreservationRepairClosureRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing) {
        const id = String(row.row_id || postCompactCompletionMemoryPreservationRepairClosureRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    const incomingIds = new Set();
    for (const row of incoming) {
        const id = String(row.row_id || postCompactCompletionMemoryPreservationRepairClosureRowId(row));
        incomingIds.add(id);
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.completed_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(300, Number(options.limit || options.maxRows || options.max_rows || 160)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incomingIds.has(row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function postCompactCompletionMemoryPreservationRepairClosureArchive(rows = [], options = {}) {
    return require("./group-memory-distillation").postCompactCompletionMemoryPreservationRepairClosureArchive(rows, options);
}
function renderPostCompactCompletionMemoryPreservationRepairClosureBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Completion Memory Preservation Repair Closures",
        "",
        `Generated by CCM compact-preservation repair closure distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId
            ? `Exact group-chat session: ${options.groupSessionId}. Root group: ${options.sourceGroupId || "unknown"}.`
            : "Legacy unscoped group memory: no exact group-chat session was recorded.",
        "Each row records a failed compact outcome whose corrected-receipt completion memory was restored only by a newer, different compact retry/outcome with exact identity and current-session authority proof.",
        "Stable boundary: historical repair completion is recovery evidence, not permanent repository truth. Every future child Agent session must reverify the current source and classify this recalled MEMORY.md in memoryUsed or memoryIgnored.",
        "All task/native sessions listed here are historical evidence in a future child session and never authorize that future session.",
        "",
        "## Verified Closure Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [verified] repair_work_item=${row.work_item_id}; failed_retry=${row.failed_retry_id}; failed_outcome=${row.failed_outcome_id}; corrected_retry=${row.corrected_retry_id}; corrected_outcome=${row.corrected_outcome_id}; completion_source=${row.completion_source}; resolution_reason=${row.resolution_reason}.`);
        lines.push(`  Restored identity: completion_docs=${(row.completion_doc_rel_paths || []).join(",")}; required_docs=${(row.required_doc_rel_paths || []).join(",")}; completion_work_items=${(row.completion_work_item_ids || []).join(",")}; timelines=${(row.completion_timeline_binding_ids || []).join(",")}.`);
        lines.push(`  Historical closure session: binding=${row.current_session_binding_id}; task_agent_session=${row.current_task_agent_session_id}; native_session=${row.current_native_session_id}; exactIdentityRestored=${row.exact_identity_restored === true}; currentSessionBoundaryRestored=${row.current_session_boundary_restored === true}; historicalSessionsRemainEvidenceOnly=${row.historical_sessions_remain_evidence_only === true}.`);
        if (row.original_gap_codes?.length)
            lines.push(`  Original preservation gaps: ${row.original_gap_codes.join(", ")}.`);
    }
    lines.push("");
    lines.push("## Reuse Rule");
    lines.push("- Use this history to avoid reopening the identical failed retry/outcome after its exact corrected outcome is still applicable.");
    lines.push("- Never use this history as current repository truth or current-session authority; re-read current sources and produce a fresh memory usage receipt.");
    return lines.join("\n").trim() + "\n";
}
function normalizePostCompactCompletionMemoryPreservationClosureConflictResolutionRows(groupId, input = {}, options = {}) {
    const rows = Array.isArray(input) ? input : Array.isArray(input.rows) ? input.rows : [];
    const scopeIdentity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(groupId, options);
    const sourceGroupId = String(options.sourceGroupId || options.source_group_id || scopeIdentity.rootGroupId || groupId).trim();
    const groupSessionId = String(options.groupSessionId || options.group_session_id || scopeIdentity.groupSessionId || "").trim();
    return rows.map((entry) => {
        const row = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-row-v1",
            version: typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION,
            group_id: String(entry.group_id || entry.groupId || sourceGroupId || "").trim(),
            source_group_id: sourceGroupId,
            group_session_id: String(entry.group_session_id || entry.groupSessionId || groupSessionId || "").trim(),
            typed_scope_id: groupId,
            target_project: String(entry.target_project || entry.targetProject || "").trim(),
            task_id: String(entry.task_id || entry.taskId || "").trim(),
            task_text: (0, typed_memory_shared_1.compactText)(entry.task_text || entry.taskText || "", 900),
            task_family_key: String(entry.task_family_key || entry.taskFamilyKey || "").trim(),
            task_family_tokens: (0, typed_memory_shared_1.uniqueStrings)(entry.task_family_tokens || entry.taskFamilyTokens || [], 40),
            resolution_entry_id: String(entry.entry_id || "").trim(),
            resolution_usage_state: normalizePostCompactCompletionMemoryPreservationClosureUsageState(entry.conflict_resolution_state || entry.usage_state),
            current_source_verified: entry.current_source_verified === true,
            reason: (0, typed_memory_shared_1.compactText)(entry.reason || "", 700),
            worker_context_packet_id: String(entry.worker_context_packet_id || "").trim(),
            binding_id: String(entry.binding_id || "").trim(),
            task_agent_session_id: String(entry.task_agent_session_id || "").trim(),
            native_session_id: String(entry.native_session_id || "").trim(),
            execution_id: String(entry.execution_id || "").trim(),
            receipt_source: String(entry.receipt_source || "").trim(),
            receipt_status: String(entry.receipt_status || "").trim(),
            parent_arbitration_state: String(entry.conflict_parent_arbitration_state || "").trim(),
            parent_conflict_fingerprint: String(entry.conflict_parent_fingerprint || "").trim(),
            parent_conflict_ratio: Number(entry.conflict_parent_ratio || 0),
            parent_positive_weight: Number(entry.conflict_parent_positive_weight || 0),
            parent_ignored_weight: Number(entry.conflict_parent_ignored_weight || 0),
            reversible: entry.conflict_resolution_reversible === true,
            historical_branches_preserved: true,
            historical_majority_authorization_allowed: false,
            resolved_at: String(entry.generated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
        };
        row.row_id = `post-compact-closure-conflict-resolution:${(0, typed_memory_shared_1.checksum)([
            row.group_id,
            row.group_session_id,
            row.typed_scope_id,
            row.task_family_key,
            row.resolution_entry_id,
            row.task_agent_session_id,
            row.native_session_id,
            row.parent_conflict_fingerprint,
        ], 24)}`;
        return row;
    }).filter((row) => row.group_id === sourceGroupId && row.typed_scope_id === groupId)
        .filter((row) => groupSessionId ? row.group_session_id === groupSessionId : !row.group_session_id)
        .filter((row) => row.resolution_entry_id && row.task_family_key)
        .filter((row) => row.task_agent_session_id && row.native_session_id)
        .filter((row) => row.parent_arbitration_state === "contradictory_reverify_current_session" && row.parent_conflict_fingerprint)
        .filter((row) => row.reversible === true)
        .filter((row) => row.resolution_usage_state === "ignored" ? !!row.reason : ["used", "verified"].includes(row.resolution_usage_state) && row.current_source_verified === true);
}
function renderPostCompactCompletionMemoryPreservationClosureConflictResolutionBody(archive = {}, options = {}) {
    const rows = Array.isArray(archive.rows) ? archive.rows : [];
    const lines = [
        "# Post-Compact Completion Memory Preservation Closure Conflict Resolutions",
        "",
        `Generated by CCM closure conflict-resolution distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        options.groupSessionId
            ? `Exact group-chat session: ${options.groupSessionId}. Root group: ${options.sourceGroupId || "unknown"}.`
            : "Legacy unscoped group memory: automatic fresh-child injection remains blocked until exact session ownership is known.",
        "Each row records a newer current-session decision that resolved a contradictory used/verified versus ignored closure-memory history for one task family.",
        "Stable boundary: the resolution is session-bound recovery evidence, not permanent repository truth or authorization. Historical branches remain immutable and a later reliable contradiction may reopen arbitration.",
        "",
        "## Session-Bound Resolution Rows",
    ];
    for (const row of rows.slice(-100).reverse()) {
        lines.push(`- [resolved:${row.resolution_usage_state}] task_family=${row.task_family_key}; resolution_entry=${row.resolution_entry_id}; parent=${row.parent_conflict_fingerprint}; resolved_at=${row.resolved_at}.`);
        lines.push(`  Current resolution session: packet=${row.worker_context_packet_id}; binding=${row.binding_id}; task_agent_session=${row.task_agent_session_id}; native_session=${row.native_session_id}; execution=${row.execution_id || ""}.`);
        lines.push(`  Verification: currentSourceVerified=${row.current_source_verified === true}; reason=${row.reason || ""}; parentState=${row.parent_arbitration_state}; parentRatio=${row.parent_conflict_ratio}; positiveWeight=${row.parent_positive_weight}; ignoredWeight=${row.parent_ignored_weight}.`);
        lines.push("  Reuse boundary: reversible=true; historicalBranchesPreserved=true; historicalMajorityAuthorizationAllowed=false.");
    }
    lines.push("");
    lines.push("## Future Session Rule");
    lines.push("- Use the newest valid resolution as ranking guidance for the same task family only, then reverify current source and return a fresh memoryUsed or memoryIgnored decision.");
    lines.push("- Never erase either historical conflict branch; reopen conflict arbitration when newer reliable opposing evidence appears.");
    return lines.join("\n").trim() + "\n";
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId) {
    return path.join((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId), typed_memory_shared_1.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR);
}
function conflictResolutionColdArchiveShardFile(groupId, relPath) {
    const typedDir = path.resolve((0, typed_memory_shared_1.getGroupTypedMemoryDir)(groupId));
    const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
    const file = path.resolve(typedDir, String(relPath || ""));
    if (file !== coldDir && !file.startsWith(`${coldDir}${path.sep}`))
        throw new Error("conflict-resolution cold archive shard path escapes group archive directory");
    return file;
}
function readAndVerifyConflictResolutionColdArchiveShard(groupId, descriptor = {}) {
    try {
        const file = conflictResolutionColdArchiveShardFile(groupId, descriptor.rel_path || descriptor.relPath || "");
        const shard = (0, typed_memory_shared_1.readJson)(file, null);
        const rows = Array.isArray(shard?.rows) ? shard.rows : [];
        const calculatedChecksum = (0, typed_memory_shared_1.checksum)(rows, 48);
        const valid = shard?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1"
            && String(shard.group_id || "") === groupId
            && String(shard.bucket || "") === String(descriptor.bucket || "")
            && calculatedChecksum === String(descriptor.content_checksum || "")
            && calculatedChecksum === String(shard.content_checksum || "")
            && rows.length === Number(descriptor.row_count || 0)
            && rows.every((row) => String(row.group_id || "") === groupId);
        return {
            valid,
            file,
            descriptor,
            shard,
            rows,
            calculatedChecksum,
            error: valid ? "" : "cold archive shard schema/group/checksum/count mismatch",
        };
    }
    catch (error) {
        return { valid: false, file: "", descriptor, shard: null, rows: [], calculatedChecksum: "", error: String(error?.message || error) };
    }
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options = {}) {
    return require("./group-memory-distillation").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchive(groupId, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveQuarantineFile(groupId);
}
function listConflictResolutionColdArchiveShardFiles(groupId) {
    const root = path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "shards");
    const files = [];
    const visit = (dir) => {
        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && entry.name.endsWith(".json"))
                files.push(file);
        }
    };
    visit(root);
    return files.sort();
}
function readStandaloneConflictResolutionColdArchiveShard(groupId, file) {
    try {
        const coldDir = path.resolve(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId));
        const resolved = path.resolve(file);
        if (!resolved.startsWith(`${coldDir}${path.sep}`))
            throw new Error("orphan shard path escapes cold archive");
        const shard = (0, typed_memory_shared_1.readJson)(resolved, null);
        const rows = Array.isArray(shard?.rows) ? shard.rows : [];
        const calculatedChecksum = (0, typed_memory_shared_1.checksum)(rows, 48);
        const filenameChecksum = path.basename(resolved, ".json");
        const valid = shard?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-cold-shard-v1"
            && String(shard.group_id || "") === groupId
            && calculatedChecksum === String(shard.content_checksum || "")
            && calculatedChecksum === filenameChecksum
            && rows.length === Number(shard.row_count || 0)
            && rows.every((row) => String(row.group_id || "") === groupId && row.row_id);
        return { valid, file: resolved, shard, rows, calculatedChecksum, error: valid ? "" : "standalone orphan shard checksum/group/count mismatch" };
    }
    catch (error) {
        return { valid: false, file, shard: null, rows: [], calculatedChecksum: "", error: String(error?.message || error) };
    }
}
function reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, options = {}) {
    return require("./group-memory-maintenance").reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, options);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceLedgerFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionGcApprovalLedgerFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationFile(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryFile(groupId);
}
function conflictResolutionMaintenanceScopeMetadata(scopeId) {
    const ledger = (0, typed_memory_shared_1.readJson)((0, typed_memory_distillation_receipts_1.getGroupTypedMemoryDistillationLedgerFile)(scopeId), {});
    const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(scopeId, ledger);
    return {
        source_group_id: identity.rootGroupId,
        group_session_id: identity.groupSessionId,
        typed_scope_id: identity.ledgerScopeId || scopeId,
        exact_session: identity.exactSession,
    };
}
function conflictResolutionMaintenanceState(groupId, options = {}) {
    const at = String(options.at || options.now || (0, typed_memory_shared_1.now)());
    const generation = (0, typed_memory_index_build_1.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations)(groupId);
    const quarantine = reconcilePostCompactCompletionMemoryPreservationClosureConflictResolutionOrphanShards(groupId, {
        dryRun: true,
        at,
        gracePeriodMs: options.gracePeriodMs ?? options.grace_period_ms,
    });
    const recommendation = (0, typed_memory_ledgers_part_03_1.conflictResolutionMaintenanceRecommendation)(generation, quarantine);
    const stateFingerprint = (0, typed_memory_shared_1.checksum)([
        groupId,
        generation.currentManifestChecksum || "",
        generation.previousManifestChecksum || "",
        quarantine.quarantine_checksum || "",
        recommendation.severity || "",
        recommendation.action || "",
    ], 32);
    return {
        at,
        group_id: groupId,
        ...conflictResolutionMaintenanceScopeMetadata(groupId),
        current_manifest_checksum: generation.currentManifestChecksum || "",
        previous_manifest_checksum: generation.previousManifestChecksum || "",
        quarantine_checksum: quarantine.quarantine_checksum || "",
        grace_period_ms: Number(quarantine.grace_period_ms || 0),
        recommendation,
        state_fingerprint: stateFingerprint,
        revalidated: !!generation && !!quarantine && !!quarantine.quarantine_checksum,
        healthy: generation.valid === true && quarantine.quarantine_input_valid !== false,
        valid: generation.valid === true && quarantine.quarantine_input_valid !== false,
        generation,
        quarantine,
    };
}
function acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return require("./group-memory-maintenance").acknowledgePostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input);
}
function suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input = {}) {
    return require("./group-memory-maintenance").suppressPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotification(groupId, input);
}
function conflictResolutionMaintenanceNotificationDeliveryChecksum(entry = {}) {
    return (0, typed_memory_shared_1.checksum)({
        delivery_id: entry.delivery_id || "",
        group_id: entry.group_id || "",
        audience: entry.audience || "",
        notification_id: entry.notification_id || "",
        state_fingerprint: entry.state_fingerprint || "",
        context_id: entry.context_id || "",
        consumer_session_id: entry.consumer_session_id || "",
        channel: entry.channel || "",
        first_delivered_at: entry.first_delivered_at || "",
        last_delivered_at: entry.last_delivered_at || "",
        delivery_count: Number(entry.delivery_count || 0),
        advisory_only: entry.advisory_only === true,
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry = {}) {
    return (0, typed_memory_shared_1.checksum)({
        compact_id: entry.compact_id || "",
        group_id: entry.group_id || "",
        audience: entry.audience || "",
        notification_id: entry.notification_id || "",
        state_fingerprint: entry.state_fingerprint || "",
        first_delivered_at: entry.first_delivered_at || "",
        last_delivered_at: entry.last_delivered_at || "",
        delivery_count: Number(entry.delivery_count || 0),
        detailed_entry_count: Number(entry.detailed_entry_count || 0),
        context_ids_root_checksum: entry.context_ids_root_checksum || "",
        source_delivery_checksums_root: entry.source_delivery_checksums_root || "",
    }, 48);
}
function conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        schema: value.schema || "",
        version: Number(value.version || 0),
        group_id: value.group_id || "",
        retention_generation: Number(value.retention_generation || 0),
        previous_ledger_checksum: value.previous_ledger_checksum || "",
        entries: (value.entries || []).map((entry) => ({ delivery_id: entry.delivery_id || "", delivery_checksum: entry.delivery_checksum || "" })),
        compacted_entries: (value.compacted_entries || []).map((entry) => ({ compact_id: entry.compact_id || "", compact_checksum: entry.compact_checksum || "" })),
        updated_at: value.updated_at || "",
    }, 48);
}
function getConflictResolutionMaintenanceNotificationDeliveryPreviousFile(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "maintenance-notification-deliveries.previous.json");
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
}
function getConflictResolutionMaintenanceNotificationDeliveryRecoveryEvidenceDir(groupId) {
    return path.join(getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir(groupId), "delivery-telemetry-recovery-evidence");
}
function verifyConflictResolutionMaintenanceNotificationDeliveryLedgerCandidate(groupId, file) {
    const present = fs.existsSync(file);
    const value = (0, typed_memory_shared_1.readJson)(file, null);
    const detailed = Array.isArray(value?.entries) ? value.entries : [];
    const compacted = Array.isArray(value?.compacted_entries) ? value.compacted_entries : [];
    const detailedValid = detailed.every((entry) => entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-v1"
        && String(entry.group_id || "") === groupId
        && entry.delivery_checksum === conflictResolutionMaintenanceNotificationDeliveryChecksum(entry));
    const compactedValid = compacted.every((entry) => entry?.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-compact-v1"
        && String(entry.group_id || "") === groupId
        && entry.compact_checksum === conflictResolutionMaintenanceNotificationDeliveryCompactChecksum(entry));
    const ledgerChecksumValid = !!value
        && value.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-ledger-v2"
        && value.ledger_checksum === conflictResolutionMaintenanceNotificationDeliveryLedgerChecksum(value);
    const valid = present
        && String(value?.group_id || "") === groupId
        && ledgerChecksumValid
        && detailedValid
        && compactedValid;
    return {
        file,
        present,
        value,
        valid,
        group_valid: String(value?.group_id || "") === groupId,
        ledger_checksum_valid: ledgerChecksumValid,
        detailed_valid: detailedValid,
        compacted_valid: compactedValid,
        retention_generation: Number(value?.retention_generation || 0),
        ledger_checksum: value?.ledger_checksum || "",
        error: valid ? "" : !present ? "delivery_ledger_missing" : !value ? "delivery_ledger_json_invalid" : String(value?.group_id || "") !== groupId ? "delivery_ledger_group_mismatch" : !ledgerChecksumValid ? "delivery_ledger_checksum_invalid" : !detailedValid ? "delivery_detail_invalid" : "delivery_compact_invalid",
    };
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId) {
    return require("./group-memory-maintenance").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryGenerations(groupId);
}
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId);
}
function cleanupGroupLedgerLockChecksum(lock = {}) {
    return (0, typed_memory_shared_1.checksum)({
        lock_id: lock.lock_id || "",
        group_id: lock.group_id || "",
        owner_instance_id: lock.owner_instance_id || "",
        owner_pid: Number(lock.owner_pid || 0),
        owner_hostname: lock.owner_hostname || "",
        owner_role: lock.owner_role || "",
        acquired_at: lock.acquired_at || "",
        expires_at: lock.expires_at || "",
    }, 48);
}
function readCleanupGroupLedgerLock(groupId, at) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId);
    const lock = (0, typed_memory_shared_1.readJson)(file, null);
    if (!lock)
        return { file, present: false, valid: true, active: false, abandoned: false, lock: null };
    const checksumValid = lock.lock_checksum === cleanupGroupLedgerLockChecksum(lock);
    const identityValid = lock.schema === "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-group-ledger-lock-v1"
        && String(lock.group_id || "") === groupId;
    const atMs = Date.parse(at);
    const expiresAtMs = Date.parse(String(lock.expires_at || ""));
    const ownerLocal = String(lock.owner_hostname || "") === os.hostname();
    const ownerAlive = !ownerLocal || (0, typed_memory_ledgers_part_02_1.cleanupLeaseProcessAlive)(Number(lock.owner_pid || 0));
    const active = checksumValid && identityValid && Number.isFinite(atMs) && Number.isFinite(expiresAtMs) && atMs < expiresAtMs && ownerAlive;
    return { file, present: true, valid: checksumValid && identityValid, active, abandoned: checksumValid && identityValid && !active, owner_alive: ownerAlive, lock };
}
function cleanupMetadataBackoffWait(ms) {
    if (!Number.isFinite(ms) || ms <= 0)
        return;
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(1, Math.floor(ms)));
    }
    catch { }
}
function pruneCleanupMetadataArchives(directory, prefix, maxEntries) {
    let files = [];
    try {
        files = fs.readdirSync(directory, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.startsWith(prefix))
            .map(entry => {
            const file = path.join(directory, entry.name);
            let mtimeMs = 0;
            try {
                mtimeMs = fs.statSync(file).mtimeMs;
            }
            catch { }
            return { file, mtimeMs };
        })
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
    }
    catch { }
    let pruned = 0;
    for (const row of files.slice(Math.max(1, maxEntries))) {
        try {
            fs.unlinkSync(row.file);
            pruned++;
        }
        catch { }
    }
    return pruned;
}
function acquireCleanupGroupLedgerLock(groupId, at, options = {}) {
    const atMs = Date.parse(at);
    const effectiveAtMs = Number.isFinite(atMs) ? atMs : Date.now();
    const ttlMs = Math.max(5_000, Math.min(60_000, Number(options.ttlMs || 15_000)));
    const maxWaitMs = Math.max(0, Math.min(2_000, Number(options.maxWaitMs ?? options.max_wait_ms ?? 120)));
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryCleanupGroupLedgerLockFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let waitedMs = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
        const status = readCleanupGroupLedgerLock(groupId, at);
        if (status.present) {
            if (!status.valid)
                return { acquired: false, reason: "cleanup_group_ledger_lock_invalid", status };
            if (status.active) {
                if (waitedMs >= maxWaitMs)
                    return { acquired: false, reason: "cleanup_group_ledger_lock_busy", status, waited_ms: waitedMs, retryable: true };
                const waitMs = Math.min(maxWaitMs - waitedMs, Math.max(4, Math.min(48, 4 * Math.pow(2, attempt))));
                cleanupMetadataBackoffWait(waitMs);
                waitedMs += waitMs;
                continue;
            }
            try {
                fs.renameSync(file, `${file}.abandoned.${(0, typed_memory_shared_1.checksum)(status.lock?.lock_id || String(Date.now()), 16)}.${crypto.randomBytes(3).toString("hex")}`);
            }
            catch {
                if (fs.existsSync(file))
                    continue;
            }
        }
        let fd = -1;
        try {
            fd = fs.openSync(file, "wx+");
            const lock = {
                schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-cleanup-group-ledger-lock-v1",
                version: 1,
                lock_id: `delivery-cleanup-ledger-lock:${(0, typed_memory_shared_1.checksum)([groupId, effectiveAtMs, process.pid, crypto.randomBytes(8).toString("hex")], 32)}`,
                group_id: groupId,
                owner_instance_id: String(options.ownerInstanceId || typed_memory_shared_1.DELIVERY_CLEANUP_EXECUTOR_INSTANCE_ID),
                owner_pid: process.pid,
                owner_hostname: os.hostname(),
                owner_role: String(options.ownerRole || "cleanup-ledger-writer"),
                acquired_at: at,
                expires_at: new Date(effectiveAtMs + ttlMs).toISOString(),
            };
            lock.lock_checksum = cleanupGroupLedgerLockChecksum(lock);
            fs.writeSync(fd, JSON.stringify(lock, null, 2), 0, "utf-8");
            fs.fsyncSync(fd);
            const prunedHistoryCount = pruneCleanupMetadataArchives(path.dirname(file), `${path.basename(file)}.abandoned.`, 32);
            return { acquired: true, waited_ms: waitedMs, handle: { fd, file, lock, released: false, waitedMs, prunedHistoryCount } };
        }
        catch (error) {
            if (fd >= 0)
                try {
                    fs.closeSync(fd);
                }
                catch { }
            if (error?.code === "EEXIST")
                continue;
            return { acquired: false, reason: "cleanup_group_ledger_lock_acquire_failed", error: String(error?.message || error) };
        }
    }
    return { acquired: false, reason: "cleanup_group_ledger_lock_contended" };
}
function cleanupGroupLedgerLockHeld(groupId, handle) {
    if (!handle || handle.released === true || Number(handle.fd) < 0)
        return false;
    const current = (0, typed_memory_shared_1.readJson)(handle.file, null);
    return !!current
        && String(current.group_id || "") === groupId
        && current.lock_id === handle.lock.lock_id
        && current.lock_checksum === cleanupGroupLedgerLockChecksum(current);
}
function releaseCleanupGroupLedgerLock(groupId, handle) {
    if (!handle || handle.released === true)
        return;
    const owned = cleanupGroupLedgerLockHeld(groupId, handle);
    try {
        fs.closeSync(handle.fd);
    }
    catch { }
    handle.released = true;
    handle.fd = -1;
    if (owned)
        try {
            fs.unlinkSync(handle.file);
        }
        catch { }
}
function withCleanupGroupLedgerLock(groupId, at, options, run) {
    const existing = options?.groupLedgerLockHandle || null;
    if (existing) {
        if (!cleanupGroupLedgerLockHeld(groupId, existing))
            throw new Error("cleanup_group_ledger_lock_lost");
        return run(existing);
    }
    const acquired = acquireCleanupGroupLedgerLock(groupId, at, options || {});
    if (!acquired.acquired)
        throw new Error(acquired.reason || "cleanup_group_ledger_lock_unavailable");
    try {
        return run(acquired.handle);
    }
    finally {
        releaseCleanupGroupLedgerLock(groupId, acquired.handle);
    }
}
function appendConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entry, at) {
    return withCleanupGroupLedgerLock(groupId, at, { ownerRole: "quarantine-append" }, groupLedgerLockHandle => {
        const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionMaintenanceNotificationDeliveryQuarantineFile(groupId);
        const ledger = (0, typed_memory_shared_1.readJson)(file, {});
        const previous = Array.isArray(ledger.entries) ? ledger.entries : [];
        const quarantineId = String(entry.quarantine_id || `delivery-telemetry-quarantine:${(0, typed_memory_shared_1.checksum)([groupId, entry.source_path, entry.content_checksum, entry.reason], 24)}`);
        const normalized = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-entry-v1",
            quarantine_id: quarantineId,
            group_id: groupId,
            source_path: entry.source_path || "",
            evidence_path: entry.evidence_path || "",
            content_checksum: entry.content_checksum || "",
            reason: entry.reason || "unknown",
            status: entry.status || "quarantined",
            recovery_eligible: entry.recovery_eligible === true,
            first_seen_at: entry.first_seen_at || at,
            last_seen_at: at,
        };
        const byId = new Map(previous.map((row) => [String(row.quarantine_id || ""), row]));
        const existing = byId.get(quarantineId);
        byId.set(quarantineId, { ...existing, ...normalized, first_seen_at: existing?.first_seen_at || normalized.first_seen_at });
        const value = (0, typed_memory_ledgers_part_02_1.writeConflictResolutionMaintenanceNotificationDeliveryQuarantine)(groupId, [...byId.values()], at, {
            compactedEntries: Array.isArray(ledger.compacted_entries) ? ledger.compacted_entries : [],
            expectedQuarantineChecksum: ledger.quarantine_checksum || "",
            groupLedgerLockHandle,
        });
        return { ...value, file, entry: value.entries.find((row) => row.quarantine_id === quarantineId) || byId.get(quarantineId) };
    });
}
function conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(value = {}) {
    return (0, typed_memory_shared_1.checksum)({
        compact_id: value.compact_id || "",
        group_id: value.group_id || "",
        reason: value.reason || "",
        cleaned_count: Number(value.cleaned_count || 0),
        first_seen_at: value.first_seen_at || "",
        last_cleaned_at: value.last_cleaned_at || "",
        quarantine_ids_root: value.quarantine_ids_root || "",
        cleanup_receipt_ids_root: value.cleanup_receipt_ids_root || "",
    }, 48);
}
function retainConflictResolutionMaintenanceNotificationDeliveryQuarantine(groupId, entries, compactedEntries, at, options = {}) {
    const unresolved = entries.filter((entry) => String(entry.status || "") !== "cleaned");
    const cleaned = entries.filter((entry) => String(entry.status || "") === "cleaned");
    const compactById = new Map();
    for (const entry of compactedEntries) {
        if (entry?.schema !== "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1"
            || String(entry.group_id || "") !== groupId
            || entry.compact_checksum !== conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(entry))
            continue;
        compactById.set(String(entry.compact_id || ""), entry);
    }
    const cleanedByReason = new Map();
    for (const entry of cleaned) {
        const reason = String(entry.reason || "unknown");
        cleanedByReason.set(reason, [...(cleanedByReason.get(reason) || []), entry]);
    }
    for (const [reason, rows] of cleanedByReason) {
        const compactId = `delivery-telemetry-quarantine-compact:${(0, typed_memory_shared_1.checksum)([groupId, reason], 24)}`;
        const existing = compactById.get(compactId) || null;
        const quarantineIds = rows.map((row) => row.quarantine_id).filter(Boolean).sort();
        const receiptIds = rows.map((row) => row.cleanup_receipt_id).filter(Boolean).sort();
        const compact = {
            schema: "ccm-post-compact-completion-memory-preservation-closure-conflict-resolution-maintenance-notification-delivery-quarantine-compact-v1",
            version: 1,
            compact_id: compactId,
            group_id: groupId,
            reason,
            cleaned_count: Number(existing?.cleaned_count || 0) + rows.length,
            first_seen_at: [existing?.first_seen_at, ...rows.map((row) => row.first_seen_at)].filter(Boolean).sort()[0] || at,
            last_cleaned_at: [existing?.last_cleaned_at, ...rows.map((row) => row.cleaned_at)].filter(Boolean).sort().slice(-1)[0] || at,
            quarantine_ids_root: (0, typed_memory_shared_1.checksum)([existing?.quarantine_ids_root || "", quarantineIds], 48),
            cleanup_receipt_ids_root: (0, typed_memory_shared_1.checksum)([existing?.cleanup_receipt_ids_root || "", receiptIds], 48),
            terminal: true,
            compacted_at: at,
        };
        compact.compact_checksum = conflictResolutionMaintenanceNotificationDeliveryQuarantineCompactChecksum(compact);
        compactById.set(compactId, compact);
    }
    const maxCompactedEntries = Math.max(20, Math.min(500, Number(options.maxCompactedEntries || options.max_compacted_entries || 120)));
    const compacted = [...compactById.values()]
        .sort((a, b) => String(a.last_cleaned_at || "").localeCompare(String(b.last_cleaned_at || "")))
        .slice(-maxCompactedEntries);
    const recoveryProofs = unresolved.filter((entry) => entry.status === "quarantined_corrupt_current")
        .sort((a, b) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || "")));
    return {
        entries: unresolved.sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || ""))),
        compacted_entries: compacted,
        retention: {
            policy: "preserve_all_unresolved_and_latest_recovery_proof_compact_cleaned_terminal_only",
            unresolved_count: unresolved.length,
            cleaned_compacted_this_run_count: cleaned.length,
            compacted_summary_count: compacted.length,
            latest_recovery_proof_id: recoveryProofs[0]?.quarantine_id || "",
            max_compacted_entries: maxCompactedEntries,
        },
    };
}
//# sourceMappingURL=typed-memory-ledgers-part-01.js.map