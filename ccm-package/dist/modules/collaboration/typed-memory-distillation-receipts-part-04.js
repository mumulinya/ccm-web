"use strict";
// Behavior-freeze split from typed-memory-distillation-receipts.ts (part 4/5).
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
exports.loadProviderDispatchReliabilitySources = loadProviderDispatchReliabilitySources;
exports.buildProviderDispatchReliabilitySignalFromSources = buildProviderDispatchReliabilitySignalFromSources;
exports.buildCrossGroupProviderDispatchReliabilitySignal = buildCrossGroupProviderDispatchReliabilitySignal;
exports.providerDispatchReliabilitySourceProvenance = providerDispatchReliabilitySourceProvenance;
exports.buildGlobalProviderDispatchReliabilitySignals = buildGlobalProviderDispatchReliabilitySignals;
exports.getGlobalProviderDispatchReliabilitySnapshotFile = getGlobalProviderDispatchReliabilitySnapshotFile;
exports.globalProviderDispatchReliabilitySnapshotPayloadChecksum = globalProviderDispatchReliabilitySnapshotPayloadChecksum;
exports.globalProviderDispatchReliabilitySnapshotChecksum = globalProviderDispatchReliabilitySnapshotChecksum;
exports.writeGlobalProviderDispatchReliabilitySnapshot = writeGlobalProviderDispatchReliabilitySnapshot;
exports.validateGlobalProviderDispatchReliabilitySnapshot = validateGlobalProviderDispatchReliabilitySnapshot;
exports.readGlobalProviderDispatchReliabilitySnapshot = readGlobalProviderDispatchReliabilitySnapshot;
exports.getOrRefreshGlobalProviderDispatchReliabilitySnapshot = getOrRefreshGlobalProviderDispatchReliabilitySnapshot;
exports.contextUsageRepairInputRows = contextUsageRepairInputRows;
exports.contextUsageRepairRowId = contextUsageRepairRowId;
exports.normalizeContextUsageRepairStatus = normalizeContextUsageRepairStatus;
exports.normalizeContextUsageRepairRows = normalizeContextUsageRepairRows;
exports.mergeContextUsageRepairRows = mergeContextUsageRepairRows;
exports.contextUsageRepairArchive = contextUsageRepairArchive;
exports.renderContextUsageRepairBody = renderContextUsageRepairBody;
exports.distillContextUsageRepairToTypedMemory = distillContextUsageRepairToTypedMemory;
exports.compactStrategyInputStrategy = compactStrategyInputStrategy;
exports.compactStrategyInputOutcomes = compactStrategyInputOutcomes;
exports.normalizeCompactStrategyCategories = normalizeCompactStrategyCategories;
exports.normalizeCompactStrategyOutcomeRows = normalizeCompactStrategyOutcomeRows;
exports.compactStrategyTypedArchive = compactStrategyTypedArchive;
exports.renderCompactStrategyReferenceBody = renderCompactStrategyReferenceBody;
exports.renderCompactStrategyCautionBody = renderCompactStrategyCautionBody;
exports.distillCompactStrategyToTypedMemory = distillCompactStrategyToTypedMemory;
exports.normalizePtlEmergencyHintForTypedMemory = normalizePtlEmergencyHintForTypedMemory;
exports.normalizePtlEmergencyOutcomeRows = normalizePtlEmergencyOutcomeRows;
exports.ptlEmergencyTypedArchive = ptlEmergencyTypedArchive;
exports.renderPtlEmergencyTypedBody = renderPtlEmergencyTypedBody;
exports.distillPtlEmergencyDowngradeToTypedMemory = distillPtlEmergencyDowngradeToTypedMemory;
exports.addDistillationQualityCheck = addDistillationQualityCheck;
exports.distillationQualityPenalty = distillationQualityPenalty;
exports.collectDistilledFacts = collectDistilledFacts;
exports.evaluateGroupTypedMemoryDistillationQuality = evaluateGroupTypedMemoryDistillationQuality;
exports.groupTypedMemoryDistillationArchiveFingerprint = groupTypedMemoryDistillationArchiveFingerprint;
exports.buildGroupTypedMemoryDistillationWorkState = buildGroupTypedMemoryDistillationWorkState;
exports.inspectGroupTypedMemoryDistillationWork = inspectGroupTypedMemoryDistillationWork;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_distillation_receipts_part_01_1 = require("./typed-memory-distillation-receipts-part-01");
const typed_memory_distillation_receipts_part_03_1 = require("./typed-memory-distillation-receipts-part-03");
function loadProviderDispatchReliabilitySources(options = {}) {
    const targetGroupId = String(options.targetGroupId || options.target_group_id || options.groupId || options.group_id || "").trim();
    const targetKeys = new Set([targetGroupId, (0, typed_memory_shared_1.safeSegment)(targetGroupId)].map(item => item.toLowerCase()).filter(Boolean));
    const ledgers = (0, typed_memory_distillation_receipts_part_03_1.listProviderDispatchReliabilityDistillationLedgers)({
        ...options,
        excludeGroupIds: [
            ...(Array.isArray(options.excludeGroupIds || options.exclude_group_ids) ? (options.excludeGroupIds || options.exclude_group_ids) : []),
            ...(targetGroupId ? [targetGroupId] : []),
        ],
    });
    const sources = [];
    for (const item of ledgers) {
        try {
            const parsed = (0, typed_memory_shared_1.readJson)(item.file, {});
            const ledgerGroupId = String(parsed.groupId || parsed.group_id || item.groupId || "").trim();
            const archive = parsed.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive || {};
            const rows = Array.isArray(archive.rows) ? archive.rows : [];
            if (!rows.length)
                continue;
            const identity = (0, typed_memory_shared_1.typedMemorySessionScopeIdentity)(ledgerGroupId || item.groupId, {
                ...parsed,
                sourceGroupId: parsed.sourceGroupId || parsed.source_group_id || archive.sourceGroupId || archive.source_group_id || rows[0]?.groupId || rows[0]?.group_id || "",
                groupSessionId: parsed.groupSessionId || parsed.group_session_id || archive.groupSessionId || archive.group_session_id || rows[0]?.groupSessionId || rows[0]?.group_session_id || "",
            });
            if (targetKeys.has(identity.rootGroupId.toLowerCase()) || targetKeys.has((0, typed_memory_shared_1.safeSegment)(identity.rootGroupId).toLowerCase()))
                continue;
            sources.push({
                sourceKey: (0, typed_memory_shared_1.checksum)([ledgerGroupId || item.groupId, item.file], 18),
                sourceRootGroupKey: identity.rootGroupKey,
                sourceSessionKey: identity.sourceSessionKey,
                exactSession: identity.exactSession,
                rows,
                attributions: Array.isArray(archive.attributions) ? archive.attributions : [],
                updatedAt: archive.updatedAt || parsed.updatedAt || "",
            });
        }
        catch { }
    }
    return sources;
}
function buildProviderDispatchReliabilitySignalFromSources(sources = [], options = {}) {
    const agentType = String(options.agentType || options.agent_type || "unknown").trim().toLowerCase() || "unknown";
    const failureThreshold = Math.max(1, Number(options.failureThreshold || options.failure_threshold || options.providerOverrideFollowupReceiptValidationFailureThreshold || options.provider_override_followup_receipt_validation_failure_threshold || 2));
    const minSourceGroups = Math.max(1, Number(options.minSourceGroups || options.min_source_groups || 2));
    const minFreshSourceGroups = Math.max(1, Number(options.minFreshSourceGroups || options.min_fresh_source_groups || minSourceGroups));
    const minSourceWeightedEvidence = Math.max(0.01, Number(options.minSourceWeightedEvidence || options.min_source_weighted_evidence || 0.25));
    const minWeightedEvidence = Math.max(0.01, Number(options.minWeightedEvidence || options.min_weighted_evidence || 0.5));
    const maxSourceGroupEvidenceShare = Math.max(0.5, Math.min(1, Number(options.maxSourceGroupEvidenceShare || options.max_source_group_evidence_share || 0.8)));
    const matchingSources = (sources || []).map((source) => {
        const rows = (Array.isArray(source.rows) ? source.rows : []).filter((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase() === agentType);
        const attributions = (Array.isArray(source.attributions) ? source.attributions : []).filter((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase() === agentType);
        return { ...source, rows, attributions };
    }).filter((source) => source.rows.length > 0);
    const score = (0, typed_memory_distillation_receipts_part_03_1.scoreProviderDispatchReliabilityRows)(matchingSources.flatMap((source) => source.rows), options);
    const groupedSources = new Map();
    for (const source of matchingSources) {
        const key = String(source.sourceRootGroupKey || source.sourceKey || "");
        groupedSources.set(key, [...(groupedSources.get(key) || []), source]);
    }
    const groupScores = [...groupedSources.entries()].map(([sourceRootGroupKey, groupSources]) => ({
        sourceRootGroupKey,
        sources: groupSources,
        score: (0, typed_memory_distillation_receipts_part_03_1.scoreProviderDispatchReliabilityRows)(groupSources.flatMap((source) => source.rows), options),
        activeFailure: groupSources.some((source) => source.attributions.some((row) => Number(row.consecutive_failure_count || row.consecutiveFailureCount || 0) >= failureThreshold)),
    }));
    const sourceGroupCount = groupScores.length;
    const sourceSessionCount = new Set(matchingSources.map((source) => source.sourceSessionKey || source.sourceKey).filter(Boolean)).size;
    const sourceLedgerCount = matchingSources.length;
    const freshSourceGroupCount = groupScores.filter(item => item.score.weightedEvidence >= minSourceWeightedEvidence).length;
    const activeFailureSourceCount = groupScores.filter(item => item.activeFailure).length;
    const maxObservedSourceGroupEvidence = Math.max(0, ...groupScores.map(item => Number(item.score.weightedEvidence || 0)));
    const maxObservedSourceGroupEvidenceShare = score.weightedEvidence > 0
        ? (0, typed_memory_distillation_receipts_part_03_1.providerDispatchReliabilityRound)(maxObservedSourceGroupEvidence / score.weightedEvidence)
        : 0;
    const promotionStatus = !score.attemptCount
        ? "empty"
        : sourceGroupCount < minSourceGroups
            ? "insufficient_independent_group_diversity"
            : freshSourceGroupCount < minFreshSourceGroups
                ? "insufficient_fresh_group_diversity"
                : score.weightedEvidence < minWeightedEvidence
                    ? "insufficient_decayed_evidence"
                    : maxObservedSourceGroupEvidenceShare > maxSourceGroupEvidenceShare
                        ? "single_group_evidence_dominance"
                        : "eligible_guidance";
    const actionable = promotionStatus === "eligible_guidance";
    const riskStatus = !score.attemptCount
        ? "empty"
        : actionable && (activeFailureSourceCount >= 2 || score.riskScore >= 0.67 && score.confidence >= 0.35)
            ? "high"
            : actionable && (activeFailureSourceCount >= 1 || score.riskScore >= 0.4)
                ? "medium"
                : "low";
    return {
        schema: "ccm-cross-group-provider-dispatch-reliability-signal-v1",
        version: 1,
        source: "privacy-redacted:cross-group-provider-receipt-validation-aggregate",
        agent_type: agentType,
        risk_status: riskStatus,
        risk_score: score.riskScore,
        confidence: score.confidence,
        weighted_failure_score: score.weightedFailureScore,
        weighted_passed_score: score.weightedPassedScore,
        weighted_evidence: score.weightedEvidence,
        attempt_count: score.attemptCount,
        failed_count: score.failedCount,
        passed_count: score.passedCount,
        source_group_count: sourceGroupCount,
        source_session_count: sourceSessionCount,
        source_ledger_count: sourceLedgerCount,
        fresh_source_group_count: freshSourceGroupCount,
        active_failure_source_count: activeFailureSourceCount,
        half_life_days: score.halfLifeDays,
        recovery_credit: score.recoveryCredit,
        minimum_source_groups: minSourceGroups,
        promotion_contract: {
            schema: "ccm-provider-reliability-cross-session-promotion-contract-v1",
            status: promotionStatus,
            exact_session_evidence_preserved: matchingSources.some((source) => source.exactSession === true),
            distinct_root_groups_required: minSourceGroups,
            distinct_root_groups_observed: sourceGroupCount,
            distinct_source_sessions_observed: sourceSessionCount,
            source_ledgers_observed: sourceLedgerCount,
            fresh_root_groups_required: minFreshSourceGroups,
            fresh_root_groups_observed: freshSourceGroupCount,
            minimum_source_weighted_evidence: minSourceWeightedEvidence,
            minimum_total_weighted_evidence: minWeightedEvidence,
            maximum_single_group_evidence_share: maxSourceGroupEvidenceShare,
            observed_maximum_single_group_evidence_share: maxObservedSourceGroupEvidenceShare,
            time_decay_applied: true,
            privacy_redaction_required: true,
            same_group_sessions_count_as_one_group: true,
        },
        actionable,
        guidance_only: true,
        local_policy_override_allowed: false,
        contains_private_memory: false,
        recommendation: riskStatus === "high"
            ? "increase_receipt_sampling_and_prefer_safer_provider_when_local_policy_allows"
            : riskStatus === "medium"
                ? "sample_receipts_and_monitor_provider_reliability"
                : riskStatus === "low"
                    ? "observe_provider_reliability_without_changing_local_gate"
                    : "no_cross_group_provider_reliability_evidence",
        privacy: {
            group_ids_included: false,
            project_names_included: false,
            memory_paths_included: false,
            task_or_execution_ids_included: false,
            receipt_evidence_included: false,
        },
        generated_at: new Date((0, typed_memory_distillation_receipts_part_03_1.providerDispatchReliabilityNowMs)(options)).toISOString(),
    };
}
function buildCrossGroupProviderDispatchReliabilitySignal(groupId, options = {}) {
    const sources = loadProviderDispatchReliabilitySources({ ...options, targetGroupId: groupId });
    return buildProviderDispatchReliabilitySignalFromSources(sources, options);
}
function providerDispatchReliabilitySourceProvenance(sources = []) {
    const rows = (sources || []).map((source) => ({
        source_key: source.sourceKey || "",
        source_root_group_key: source.sourceRootGroupKey || source.sourceKey || "",
        source_session_key: source.sourceSessionKey || source.sourceKey || "",
        exact_session: source.exactSession === true,
        updated_at: source.updatedAt || "",
        attempt_count: Array.isArray(source.rows) ? source.rows.length : 0,
        content_checksum: (0, typed_memory_shared_1.checksum)((source.rows || []).map((row) => ({
            row_id: row.row_id || "",
            attempt_status: row.attempt_status || "",
            attempt_at: row.attempt_at || "",
            agent_type: row.agent_type || "",
        })), 32),
    })).sort((a, b) => String(a.source_key || "").localeCompare(String(b.source_key || "")));
    const sourceGroupCount = new Set(rows.map((row) => row.source_root_group_key).filter(Boolean)).size;
    const sourceSessionCount = new Set(rows.map((row) => row.source_session_key).filter(Boolean)).size;
    const totalAttempts = rows.reduce((sum, row) => sum + Number(row.attempt_count || 0), 0);
    const attemptsByGroup = new Map();
    for (const row of rows)
        attemptsByGroup.set(row.source_root_group_key, Number(attemptsByGroup.get(row.source_root_group_key) || 0) + Number(row.attempt_count || 0));
    const maxGroupAttemptShare = totalAttempts > 0 ? Math.max(0, ...attemptsByGroup.values()) / totalAttempts : 0;
    return {
        schema: "ccm-provider-dispatch-reliability-source-provenance-v1",
        source_ledger_count: rows.length,
        source_group_count: sourceGroupCount,
        source_session_count: sourceSessionCount,
        exact_session_ledger_count: rows.filter((row) => row.exact_session).length,
        attempt_count: totalAttempts,
        maximum_group_attempt_share: (0, typed_memory_distillation_receipts_part_03_1.providerDispatchReliabilityRound)(maxGroupAttemptShare),
        latest_source_updated_at: rows.map((row) => row.updated_at).filter(Boolean).sort().slice(-1)[0] || "",
        generation_checksum: (0, typed_memory_shared_1.checksum)(rows, 40),
        source_group_diversity_checksum: (0, typed_memory_shared_1.checksum)([...attemptsByGroup.keys()].sort(), 32),
        source_keys_hashed: true,
        group_ids_included: false,
        project_names_included: false,
        private_evidence_included: false,
    };
}
function buildGlobalProviderDispatchReliabilitySignals(options = {}) {
    const sources = loadProviderDispatchReliabilitySources({ ...options, targetGroupId: "" });
    const agentTypes = (0, typed_memory_shared_1.uniqueStrings)(sources.flatMap((source) => source.rows.map((row) => String(row.agent_type || row.agentType || "unknown").trim().toLowerCase()).filter(Boolean)), 64);
    const signals = agentTypes.map(agentType => buildProviderDispatchReliabilitySignalFromSources(sources, { ...options, agentType }));
    return {
        schema: "ccm-global-provider-dispatch-reliability-signals-v1",
        version: 1,
        source: "privacy-redacted:global-provider-receipt-validation-aggregate",
        signal_count: signals.length,
        actionable_signal_count: signals.filter((signal) => signal.actionable).length,
        high_risk_signal_count: signals.filter((signal) => signal.risk_status === "high").length,
        guidance_only: true,
        local_policy_override_allowed: false,
        contains_private_memory: false,
        source_provenance: providerDispatchReliabilitySourceProvenance(sources),
        signals,
        privacy: {
            group_ids_included: false,
            project_names_included: false,
            memory_paths_included: false,
            task_or_execution_ids_included: false,
            receipt_evidence_included: false,
        },
        generated_at: new Date((0, typed_memory_distillation_receipts_part_03_1.providerDispatchReliabilityNowMs)(options)).toISOString(),
    };
}
function getGlobalProviderDispatchReliabilitySnapshotFile(options = {}) {
    return String(options.snapshotFile || options.snapshot_file || path.join(typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR, "snapshot.json"));
}
function globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshot = {}) {
    return (0, typed_memory_shared_1.checksum)({
        signals: snapshot.signals || null,
        source_provenance: snapshot.source_provenance || null,
        generated_at: snapshot.generated_at || "",
        expires_at: snapshot.expires_at || "",
        ttl_ms: Number(snapshot.ttl_ms || 0),
    }, 48);
}
function globalProviderDispatchReliabilitySnapshotChecksum(snapshot = {}) {
    const comparable = { ...snapshot };
    delete comparable.snapshot_checksum;
    delete comparable.file;
    delete comparable.validation;
    return (0, typed_memory_shared_1.checksum)(comparable, 48);
}
function writeGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const file = getGlobalProviderDispatchReliabilitySnapshotFile(options);
    const generatedAtMs = (0, typed_memory_distillation_receipts_part_03_1.providerDispatchReliabilityNowMs)(options);
    const ttlMs = Math.max(30_000, Math.min(24 * 60 * 60 * 1000, Number(options.ttlMs || options.ttl_ms || typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS)));
    const signals = buildGlobalProviderDispatchReliabilitySignals({
        ...options,
        generatedAt: new Date(generatedAtMs).toISOString(),
        nowMs: generatedAtMs,
    });
    const sourceProvenance = signals.source_provenance || {};
    const snapshotBase = {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-v1",
        version: typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION,
        snapshot_id: `provider-reliability-snapshot:${(0, typed_memory_shared_1.checksum)([
            generatedAtMs,
            sourceProvenance.generation_checksum || "",
            signals.signals || [],
        ], 20)}`,
        generation_id: `provider-reliability-generation:${String(sourceProvenance.generation_checksum || "empty").slice(0, 24)}`,
        generated_at: new Date(generatedAtMs).toISOString(),
        expires_at: new Date(generatedAtMs + ttlMs).toISOString(),
        ttl_ms: ttlMs,
        source: "privacy-redacted:global-provider-reliability-snapshot",
        guidance_only: true,
        local_policy_override_allowed: false,
        contains_private_memory: false,
        source_provenance: sourceProvenance,
        signals,
    };
    snapshotBase.payload_checksum = globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshotBase);
    snapshotBase.snapshot_checksum = globalProviderDispatchReliabilitySnapshotChecksum(snapshotBase);
    try {
        if (fs.existsSync(file))
            fs.copyFileSync(file, `${file}.bak`);
    }
    catch { }
    (0, typed_memory_shared_1.writeJsonAtomic)(file, snapshotBase);
    return { ...snapshotBase, file };
}
function validateGlobalProviderDispatchReliabilitySnapshot(snapshot = {}, options = {}) {
    const nowMs = (0, typed_memory_distillation_receipts_part_03_1.providerDispatchReliabilityNowMs)(options);
    const gaps = [];
    if (snapshot.schema !== "ccm-global-provider-dispatch-reliability-snapshot-v1")
        gaps.push("schema");
    if (Number(snapshot.version || 0) !== typed_memory_shared_1.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION)
        gaps.push("version");
    if (!snapshot.snapshot_id)
        gaps.push("snapshot_id");
    if (!snapshot.generation_id)
        gaps.push("generation_id");
    if (snapshot.guidance_only !== true)
        gaps.push("guidance_only");
    if (snapshot.local_policy_override_allowed !== false)
        gaps.push("local_policy_override_allowed");
    if (snapshot.contains_private_memory !== false)
        gaps.push("contains_private_memory");
    const payloadChecksum = globalProviderDispatchReliabilitySnapshotPayloadChecksum(snapshot);
    if (!snapshot.payload_checksum || snapshot.payload_checksum !== payloadChecksum)
        gaps.push("payload_checksum");
    const snapshotChecksum = globalProviderDispatchReliabilitySnapshotChecksum(snapshot);
    if (!snapshot.snapshot_checksum || snapshot.snapshot_checksum !== snapshotChecksum)
        gaps.push("snapshot_checksum");
    const expiresMs = Date.parse(String(snapshot.expires_at || ""));
    const expired = !Number.isFinite(expiresMs) || expiresMs <= nowMs;
    if (expired)
        gaps.push("expired");
    let sourceGenerationMatches = true;
    let currentSourceProvenance = null;
    if (options.verifySourceGeneration !== false && options.verify_source_generation !== false && snapshot.source_provenance?.generation_checksum) {
        const current = buildGlobalProviderDispatchReliabilitySignals({
            ...options,
            generatedAt: new Date(nowMs).toISOString(),
            nowMs,
        });
        currentSourceProvenance = current.source_provenance || {};
        sourceGenerationMatches = currentSourceProvenance.generation_checksum === snapshot.source_provenance.generation_checksum;
        if (!sourceGenerationMatches)
            gaps.push("source_generation");
    }
    const integrityGaps = gaps.filter(gap => !["expired", "source_generation"].includes(gap));
    const status = integrityGaps.length
        ? "tampered"
        : expired
            ? "expired"
            : !sourceGenerationMatches
                ? "stale_source_generation"
                : "fresh";
    return {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-validation-v1",
        status,
        usable: status === "fresh",
        integrity_ok: integrityGaps.length === 0,
        freshness_ok: !expired,
        source_generation_matches: sourceGenerationMatches,
        gaps,
        checked_at: new Date(nowMs).toISOString(),
        current_source_provenance: currentSourceProvenance,
    };
}
function readGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const file = getGlobalProviderDispatchReliabilitySnapshotFile(options);
    const candidates = options.allowBackupRecovery === false || options.allow_backup_recovery === false
        ? [{ file, recoveredFromBackup: false }]
        : [{ file, recoveredFromBackup: false }, { file: `${file}.bak`, recoveredFromBackup: true }];
    let firstInvalid = null;
    for (const candidate of candidates) {
        if (!fs.existsSync(candidate.file))
            continue;
        const snapshot = (0, typed_memory_shared_1.readJson)(candidate.file, null);
        if (!snapshot || typeof snapshot !== "object") {
            if (!firstInvalid)
                firstInvalid = { status: "tampered", usable: false, gaps: ["parse"], file: candidate.file };
            continue;
        }
        const validation = validateGlobalProviderDispatchReliabilitySnapshot(snapshot, options);
        const result = {
            schema: "ccm-global-provider-dispatch-reliability-snapshot-read-v1",
            file: candidate.file,
            recovered_from_backup: candidate.recoveredFromBackup,
            status: validation.status,
            usable: validation.usable,
            validation,
            snapshot,
        };
        if (validation.usable)
            return result;
        if (!firstInvalid)
            firstInvalid = result;
    }
    return firstInvalid || {
        schema: "ccm-global-provider-dispatch-reliability-snapshot-read-v1",
        file,
        recovered_from_backup: false,
        status: "missing",
        usable: false,
        validation: { status: "missing", usable: false, gaps: ["missing"] },
        snapshot: null,
    };
}
function getOrRefreshGlobalProviderDispatchReliabilitySnapshot(options = {}) {
    const current = readGlobalProviderDispatchReliabilitySnapshot(options);
    if (current.usable)
        return { ...current, refreshed: false };
    if (options.allowRefresh === false || options.allow_refresh === false)
        return { ...current, refreshed: false };
    const written = writeGlobalProviderDispatchReliabilitySnapshot(options);
    const verified = readGlobalProviderDispatchReliabilitySnapshot({
        ...options,
        allowBackupRecovery: false,
    });
    return {
        ...verified,
        refreshed: true,
        refresh_reason: current.status || "missing",
        previous_status: current.status || "missing",
        written_snapshot_id: written.snapshot_id || "",
    };
}
function contextUsageRepairInputRows(input = {}) {
    if (Array.isArray(input))
        return input;
    const rows = [
        ...(Array.isArray(input.rows) ? input.rows : []),
        ...(Array.isArray(input.items) ? input.items : []),
        ...(Array.isArray(input.packets) ? input.packets : []),
        ...(Array.isArray(input.gaps) ? input.gaps : []),
    ];
    if (rows.length)
        return rows;
    const groups = Array.isArray(input.report?.groups) ? input.report.groups : Array.isArray(input.groups) ? input.groups : [];
    return groups.flatMap((group) => [
        ...(Array.isArray(group.items) ? group.items : []),
        ...(Array.isArray(group.packets) ? group.packets : []),
        ...(Array.isArray(group.gaps) ? group.gaps : []),
    ].map((row) => ({ ...row, groupId: row.groupId || group.groupId || group.group_id || "" })));
}
function contextUsageRepairRowId(row = {}) {
    return `context-usage-repair:${(0, typed_memory_shared_1.checksum)([
        row.groupId,
        row.worker_context_packet_id,
        row.binding_id,
        row.work_item_id,
        row.project,
        row.usage_status,
        row.pressure,
    ], 24)}`;
}
function normalizeContextUsageRepairStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    if (["over_budget", "critical", "compact_recommended", "warn", "ok", "completed", "cancelled", "pending", "in_progress", "blocked"].includes(status))
        return status;
    return status ? "unknown" : "compact_recommended";
}
function normalizeContextUsageRepairRows(input = {}, options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || input.groupId || input.group_id || "").trim();
    return contextUsageRepairInputRows(input).map((raw, index) => {
        const entry = raw?.entry || raw?.item || raw?.packet || raw || {};
        const usageStatus = normalizeContextUsageRepairStatus(entry.worker_context_packet_usage_status
            || entry.usage_status
            || entry.status
            || entry.workerContextPacketUsageStatus
            || raw?.usage_status
            || raw?.status);
        const topCategories = Array.isArray(entry.worker_context_packet_top_categories)
            ? entry.worker_context_packet_top_categories
            : Array.isArray(entry.top_categories)
                ? entry.top_categories
                : [];
        const reductions = Array.isArray(entry.worker_context_packet_suggested_reductions)
            ? entry.worker_context_packet_suggested_reductions
            : Array.isArray(entry.suggested_reductions)
                ? entry.suggested_reductions
                : [];
        const row = {
            schema: "ccm-context-usage-repair-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || raw?.groupId || raw?.group_id || fallbackGroupId || "").trim(),
            work_item_id: String(entry.work_item_id || entry.workItemId || entry.id || raw?.work_item_id || raw?.id || "").trim(),
            worker_context_packet_id: String(entry.worker_context_packet_id || entry.workerContextPacketId || entry.packet_id || raw?.packet_id || raw?.worker_context_packet_id || "").trim(),
            binding_id: String(entry.worker_context_packet_binding_id || entry.binding_id || entry.bindingId || raw?.binding_id || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || raw?.assignment_id || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || raw?.project || "").trim(),
            source: String(entry.source || raw?.source || "worker_context_packet_context_usage_repair").trim(),
            status: String(entry.status || raw?.status || "pending").trim().toLowerCase(),
            usage_status: usageStatus,
            pressure: Number(entry.worker_context_packet_pressure ?? entry.pressure ?? raw?.pressure ?? 0),
            total_tokens: Number(entry.worker_context_packet_total_tokens ?? entry.total_tokens ?? raw?.total_tokens ?? 0),
            max_tokens: Number(entry.worker_context_packet_max_tokens ?? entry.max_tokens ?? raw?.max_tokens ?? 0),
            free_tokens: Number(entry.worker_context_packet_free_tokens ?? entry.free_tokens ?? raw?.free_tokens ?? 0),
            autocompact_buffer_tokens: Number(entry.worker_context_packet_autocompact_buffer_tokens ?? entry.autocompact_buffer_tokens ?? raw?.autocompact_buffer_tokens ?? 0),
            top_categories: topCategories.slice(0, 8).map((item) => ({
                id: String(item.id || item.category_id || item.categoryId || item.name || "").trim(),
                name: String(item.name || item.label || item.id || item.category_id || "").trim(),
                tokens: Number(item.tokens || 0),
            })),
            suggested_reductions: reductions.slice(0, 8).map((item) => ({
                category_id: String(item.category_id || item.categoryId || item.id || item.name || "").trim(),
                name: String(item.name || item.label || item.category_id || item.id || "").trim(),
                tokens: Number(item.tokens || 0),
                suggestion: (0, typed_memory_shared_1.compactText)(item.suggestion || item.instruction || item.reason || "", 360),
            })),
            instruction: (0, typed_memory_shared_1.compactText)(entry.instruction || raw?.instruction || "", 1200),
            expected: (0, typed_memory_shared_1.compactText)(entry.expected || raw?.expected || "context_usage.status<=warn; free_tokens>=autocompact_buffer_tokens; rendered Context usage budget present", 700),
            reason: (0, typed_memory_shared_1.compactText)(entry.source_reason || entry.description || raw?.reason || raw?.source_reason || "", 700),
            first_seen_at: String(entry.first_seen_at || entry.createdAt || entry.created_at || entry.at || raw?.first_seen_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            last_seen_at: String(entry.updated_at || entry.updatedAt || entry.lastSeenAt || entry.at || raw?.updated_at || raw?.at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(raw?.source_index || raw?.sourceIndex || index),
        };
        return { ...row, row_id: contextUsageRepairRowId(row) };
    })
        .filter((row) => row.groupId || fallbackGroupId)
        .filter((row) => row.source === "worker_context_packet_context_usage_repair" || /context usage|Context usage budget|free_tokens|autocompact_buffer|typed MEMORY/i.test(`${row.reason}\n${row.instruction}\n${row.expected}`));
}
function mergeContextUsageRepairRows(existing = [], incoming = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const merged = new Map();
    for (const row of existing || []) {
        const id = String(row.row_id || contextUsageRepairRowId(row));
        merged.set(id, { ...row, row_id: id });
    }
    const previousIds = new Set(merged.keys());
    for (const row of incoming || []) {
        const id = String(row.row_id || contextUsageRepairRowId(row));
        const previous = merged.get(id);
        merged.set(id, {
            ...(previous || {}),
            ...row,
            row_id: id,
            first_seen_at: previous?.first_seen_at || row.first_seen_at || updatedAt,
            last_seen_at: updatedAt,
            seen_count: Number(previous?.seen_count || 0) + 1,
        });
    }
    const limit = Math.max(1, Math.min(260, Number(options.limit || options.maxRows || options.max_rows || 100)));
    const rows = [...merged.values()]
        .sort((a, b) => String(a.last_seen_at || "").localeCompare(String(b.last_seen_at || "")) || Number(a.source_index || 0) - Number(b.source_index || 0))
        .slice(-limit);
    return {
        rows,
        newRowCount: rows.filter((row) => !previousIds.has(row.row_id)).length,
        updatedRowCount: rows.filter((row) => previousIds.has(row.row_id) && incoming.some((item) => String(item.row_id || "") === row.row_id)).length,
        prunedRowCount: Math.max(0, merged.size - rows.length),
    };
}
function contextUsageRepairArchive(rows = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const overBudgetRows = rows.filter((row) => row.usage_status === "over_budget");
    const criticalRows = rows.filter((row) => row.usage_status === "critical");
    const compactRows = rows.filter((row) => row.usage_status === "compact_recommended");
    return {
        schema: "ccm-context-usage-repair-distillation-v1",
        version: typed_memory_shared_1.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION,
        archived_count: rows.length,
        over_budget_count: overBudgetRows.length,
        critical_count: criticalRows.length,
        compact_recommended_count: compactRows.length,
        open_count: rows.filter((row) => ["pending", "in_progress", "blocked", "warn", "fail"].includes(String(row.status || ""))).length,
        packet_bound_count: rows.filter((row) => row.worker_context_packet_id).length,
        max_pressure: rows.reduce((max, row) => Math.max(max, Number(row.pressure || 0)), 0),
        rows,
        updatedAt,
    };
}
function renderContextUsageRepairBody(rows = [], options = {}) {
    const categoryCounts = new Map();
    for (const row of rows) {
        for (const category of row.top_categories || []) {
            const id = String(category.id || category.category_id || category.name || "").trim();
            if (!id)
                continue;
            categoryCounts.set(id, Number(categoryCounts.get(id) || 0) + 1);
        }
    }
    const hotCategories = [...categoryCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([id, count]) => `${id}:${count}`)
        .join("; ");
    const lines = [
        "# WorkerContextPacket Context Usage Repair Discipline",
        "",
        `Generated by CCM context usage repair distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        "This feedback memory records repeated WorkerContextPacket context pressure repairs before third-party child Agent dispatch.",
        "When context_usage.status is compact_recommended, critical, or over_budget, compact/crop the WorkerContextPacket before child-Agent dispatch.",
        "Keep task_goal, verification_and_acceptance, required proof/receipt identifiers, and the rendered Context usage budget visible.",
        "Target context_usage.status<=warn and free_tokens>=autocompact_buffer_tokens. Prefer replacing full group_memory_rendered with the newest compact summary, deduping typed_memory_recall, suppressing irrelevant global_memory, and trimming replay_repair_dispatch_briefs to IDs and required proof facts.",
        hotCategories ? `Hot pressure categories: ${hotCategories}.` : "",
        "",
        "## Pressure Repair Rows",
    ].filter(line => line !== "");
    for (const row of rows) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.worker_context_packet_id ? `packet=${row.worker_context_packet_id}` : "",
            row.binding_id ? `binding=${row.binding_id}` : "",
            row.work_item_id ? `work_item=${row.work_item_id}` : "",
        ].filter(Boolean).join("; ");
        const categories = (row.top_categories || []).slice(0, 4).map((item) => `${item.id || item.name}:${item.tokens || 0}`).join("; ");
        const reductions = (row.suggested_reductions || []).slice(0, 3).map((item) => `${item.category_id || item.name}: ${item.suggestion || ""}`).join(" ");
        lines.push(`- [${row.usage_status || "pressure"}] ${ids || row.row_id}; pressure=${Number(row.pressure || 0)}%; tokens=${Number(row.total_tokens || 0)}/${Number(row.max_tokens || 0)}; free=${Number(row.free_tokens || 0)}; buffer=${Number(row.autocompact_buffer_tokens || 0)}.`);
        if (categories)
            lines.push(`  Top categories: ${categories}.`);
        if (reductions)
            lines.push(`  Suggested reductions: ${(0, typed_memory_shared_1.compactText)(reductions, 700).replace(/\n/g, " ")}`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillContextUsageRepairToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillContextUsageRepairToTypedMemory(groupId, input, options);
}
function compactStrategyInputStrategy(input = {}) {
    return input.strategy || input.compactStrategy || input.compact_strategy || {};
}
function compactStrategyInputOutcomes(input = {}) {
    if (Array.isArray(input))
        return input;
    if (Array.isArray(input.outcomes))
        return input.outcomes;
    if (Array.isArray(input.entries))
        return input.entries;
    if (Array.isArray(input.outcomeEntries))
        return input.outcomeEntries;
    if (Array.isArray(input.outcome_entries))
        return input.outcome_entries;
    if (Array.isArray(input.outcomeLedger?.entries))
        return input.outcomeLedger.entries;
    if (Array.isArray(input.outcome_ledger?.entries))
        return input.outcome_ledger.entries;
    return [];
}
function normalizeCompactStrategyCategories(strategy = {}) {
    return (Array.isArray(strategy.categories) ? strategy.categories : []).map((row) => ({
        category: String(row.category || row.id || row.name || "").trim(),
        attempts: Number(row.attempts || 0),
        recovered: Number(row.recovered || 0),
        blocked: Number(row.blocked || 0),
        recovery_rate: Number(row.recovery_rate || row.recoveryRate || 0),
        task_preserved: Number(row.task_preserved || row.taskPreserved || 0),
        task_compacted: Number(row.task_compacted || row.taskCompacted || 0),
        avg_token_delta: Number(row.avg_token_delta || row.avgTokenDelta || 0),
        avg_free_token_delta: Number(row.avg_free_token_delta || row.avgFreeTokenDelta || 0),
        avg_partial_omitted_chars: Number(row.avg_partial_omitted_chars || row.avgPartialOmittedChars || 0),
        strategy_score: Number(row.strategy_score || row.strategyScore || 0),
        recommendation: String(row.recommendation || "observe").trim() || "observe",
        latest_at: String(row.latest_at || row.latestAt || ""),
    })).filter((row) => row.category);
}
function normalizeCompactStrategyOutcomeRows(rows = [], options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || "").trim();
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    return rows.map((entry, index) => {
        const categories = [
            ...(Array.isArray(entry.partial_compact_policy?.selected_categories) ? entry.partial_compact_policy.selected_categories : []),
            ...(Array.isArray(entry.partial_compaction_categories) ? entry.partial_compaction_categories : []),
        ].map((item) => String(item || "").trim()).filter(Boolean);
        const row = {
            schema: "ccm-compact-strategy-outcome-distilled-row-v1",
            version: typed_memory_shared_1.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || entry.group || fallbackGroupId || "").trim(),
            groupSessionId: String(entry.groupSessionId || entry.group_session_id || fallbackGroupSessionId || "").trim(),
            outcome_id: String(entry.outcome_id || entry.outcomeId || "").trim(),
            retry_id: String(entry.retry_id || entry.retryId || "").trim(),
            hook_run_id: String(entry.hook_run_id || entry.hookRunId || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || "").trim(),
            method: String(entry.method || entry.retry_method || entry.retryMethod || "metadata_partial_compact").trim(),
            status: String(entry.status || (entry.dispatch_ready === true ? "recovered" : entry.dispatch_ready === false ? "blocked" : "")).trim().toLowerCase(),
            dispatch_ready: entry.dispatch_ready === true || entry.dispatchReady === true,
            from_total_tokens: Number(entry.from_total_tokens || entry.fromTotalTokens || 0),
            retry_total_tokens: Number(entry.retry_total_tokens || entry.retryTotalTokens || 0),
            from_free_tokens: Number(entry.from_free_tokens || entry.fromFreeTokens || 0),
            retry_free_tokens: Number(entry.retry_free_tokens || entry.retryFreeTokens || 0),
            token_delta: Number(entry.token_delta || entry.tokenDelta || 0),
            free_token_delta: Number(entry.free_token_delta || entry.freeTokenDelta || 0),
            partial_compact: entry.partial_compact === true || entry.partialCompact === true,
            task_compacted: entry.task_compacted === true || entry.taskCompacted === true,
            task_hash_unchanged: entry.task_hash_unchanged === true || entry.taskHashUnchanged === true,
            selected_categories: [...new Set(categories)],
            partial_omitted_chars: Number(entry.partial_omitted_chars || entry.partialOmittedChars || entry.omitted_chars || 0),
            distillation_candidate: entry.distillation_candidate !== false,
            at: String(entry.at || entry.updatedAt || entry.updated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(entry.source_index || entry.sourceIndex || index),
        };
        return {
            ...row,
            row_id: `compact-strategy-outcome:${(0, typed_memory_shared_1.checksum)([
                row.groupId,
                row.groupSessionId,
                row.outcome_id,
                row.retry_id,
                row.hook_run_id,
                row.assignment_id,
                row.selected_categories.join(","),
                row.status,
            ], 24)}`,
        };
    }).filter((row) => row.distillation_candidate !== false && row.selected_categories.length > 0);
}
function compactStrategyTypedArchive(strategy = {}, outcomes = [], options = {}) {
    const updatedAt = String(options.updatedAt || (0, typed_memory_shared_1.now)());
    const categories = normalizeCompactStrategyCategories(strategy);
    const preferred = Array.isArray(strategy.preferred_categories || strategy.preferredCategories)
        ? (strategy.preferred_categories || strategy.preferredCategories).map((item) => String(item || "").trim()).filter(Boolean)
        : categories.filter((item) => item.recommendation === "prefer").map((item) => item.category);
    const avoid = Array.isArray(strategy.avoid_categories || strategy.avoidCategories)
        ? (strategy.avoid_categories || strategy.avoidCategories).map((item) => String(item || "").trim()).filter(Boolean)
        : categories.filter((item) => item.recommendation === "avoid").map((item) => item.category);
    const groupSessionId = String(strategy.groupSessionId || strategy.group_session_id || options.groupSessionId || options.group_session_id || "").trim();
    const outcomeRows = normalizeCompactStrategyOutcomeRows(outcomes, {
        ...options,
        groupId: strategy.groupId || strategy.group_id,
        groupSessionId,
    });
    return {
        schema: "ccm-compact-strategy-typed-memory-distillation-v1",
        version: typed_memory_shared_1.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId: String(strategy.groupId || strategy.group_id || options.groupId || options.group_id || "").trim(),
        groupSessionId,
        strategy_id: String(strategy.strategy_id || strategy.strategyId || ""),
        strategy_sample_count: Number(strategy.sample_count || strategy.sampleCount || 0),
        category_count: categories.length,
        preferred_count: preferred.length,
        avoid_count: avoid.length,
        outcome_count: outcomeRows.length,
        recovered_outcome_count: outcomeRows.filter((row) => row.status === "recovered" || row.dispatch_ready === true).length,
        blocked_outcome_count: outcomeRows.filter((row) => row.status === "blocked" || row.dispatch_ready === false).length,
        task_preserved_outcome_count: outcomeRows.filter((row) => row.task_hash_unchanged === true).length,
        total_token_delta: outcomeRows.reduce((sum, row) => sum + Number(row.token_delta || 0), 0),
        total_free_token_delta: outcomeRows.reduce((sum, row) => sum + Number(row.free_token_delta || 0), 0),
        preferred_categories: preferred,
        avoid_categories: avoid,
        categories,
        outcome_rows: outcomeRows,
        source_strategy_file: String(strategy.file || ""),
        source_ledger_file: String(strategy.source_ledger_file || strategy.sourceLedgerFile || ""),
        updatedAt,
    };
}
function renderCompactStrategyReferenceBody(archive = {}, options = {}) {
    const lines = [
        "# WorkerContextPacket Compact Strategy Memory",
        "",
        `Generated by CCM compact strategy typed-memory distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped compact strategy memory.",
        "Use this memory when a future WorkerContextPacket is near or over budget and needs compact/crop before child-Agent dispatch.",
        "Prefer compact categories with proven recovery, positive free_token_delta, and task_hash_unchanged=true. Avoid categories that repeatedly block or compact the task body.",
        "",
        `Samples: strategy=${archive.strategy_sample_count || 0}; outcomes=${archive.outcome_count || 0}; recovered=${archive.recovered_outcome_count || 0}; blocked=${archive.blocked_outcome_count || 0}; task_preserved=${archive.task_preserved_outcome_count || 0}.`,
        archive.preferred_categories?.length ? `Preferred categories: ${archive.preferred_categories.join(", ")}.` : "",
        archive.avoid_categories?.length ? `Avoid categories: ${archive.avoid_categories.join(", ")}.` : "",
        "",
        "## Category Strategy",
    ].filter(line => line !== "");
    for (const row of archive.categories || []) {
        lines.push(`- [${row.recommendation || "observe"}] ${row.category}: attempts=${row.attempts || 0}; recovered=${row.recovered || 0}; blocked=${row.blocked || 0}; recovery_rate=${row.recovery_rate || 0}; avg_free_token_delta=${row.avg_free_token_delta || 0}; task_preserved=${row.task_preserved || 0}; task_compacted=${row.task_compacted || 0}; score=${row.strategy_score || 0}.`);
    }
    lines.push("", "## Outcome Samples");
    for (const row of (archive.outcome_rows || []).slice(-12)) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.assignment_id ? `assignment=${row.assignment_id}` : "",
            row.retry_id ? `retry=${row.retry_id}` : "",
            row.hook_run_id ? `hook=${row.hook_run_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "unknown"}] ${ids || row.row_id}; method=${row.method}; categories=${(row.selected_categories || []).join(",")}; token_delta=${row.token_delta || 0}; free_token_delta=${row.free_token_delta || 0}; task_hash_unchanged=${row.task_hash_unchanged === true}.`);
    }
    return lines.join("\n").trim() + "\n";
}
function renderCompactStrategyCautionBody(archive = {}, options = {}) {
    const avoidRows = (archive.categories || []).filter((row) => archive.avoid_categories?.includes(row.category) || row.recommendation === "avoid" || Number(row.blocked || 0) > 0);
    const blockedOutcomes = (archive.outcome_rows || []).filter((row) => row.status === "blocked" || row.dispatch_ready === false);
    const lines = [
        "# WorkerContextPacket Compact Strategy Cautions",
        "",
        `Generated by CCM compact strategy typed-memory distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped compact strategy memory.",
        "These categories or outcomes should not be blindly reused for future WorkerContextPacket compaction. Verify current task shape before applying them.",
        "",
        "## Avoid Or Review Categories",
    ];
    for (const row of avoidRows) {
        lines.push(`- ${row.category}: recommendation=${row.recommendation || "observe"}; attempts=${row.attempts || 0}; recovered=${row.recovered || 0}; blocked=${row.blocked || 0}; avg_free_token_delta=${row.avg_free_token_delta || 0}; task_compacted=${row.task_compacted || 0}.`);
    }
    lines.push("", "## Blocked Outcomes");
    for (const row of blockedOutcomes.slice(-12)) {
        lines.push(`- ${row.project || row.assignment_id || row.row_id}: categories=${(row.selected_categories || []).join(",")}; token_delta=${row.token_delta || 0}; free_token_delta=${row.free_token_delta || 0}; task_compacted=${row.task_compacted === true}; task_hash_unchanged=${row.task_hash_unchanged === true}.`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillCompactStrategyToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillCompactStrategyToTypedMemory(groupId, input, options);
}
function normalizePtlEmergencyHintForTypedMemory(input = {}, options = {}) {
    const raw = input.hint || input.ptlEmergencyHint || input.ptl_emergency_hint || input || {};
    const retryOptions = raw.recommended_retry_options || raw.recommendedRetryOptions || {};
    return {
        schema: "ccm-ptl-emergency-typed-memory-hint-v1",
        version: typed_memory_shared_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId: String(raw.groupId || raw.group_id || options.groupId || options.group_id || "").trim(),
        groupSessionId: String(raw.groupSessionId || raw.group_session_id || options.groupSessionId || options.group_session_id || "").trim(),
        hint_id: String(raw.hint_id || raw.hintId || "").trim(),
        engaged: raw.engaged === true,
        emergency_level: String(raw.emergency_level || raw.emergencyLevel || (raw.engaged ? "warning" : "none")).trim(),
        reason: (0, typed_memory_shared_1.compactText)(raw.reason || "", 900),
        blocked_outcome_count: Number(raw.blocked_outcome_count || raw.blockedOutcomeCount || 0),
        task_compacted_blocked_count: Number(raw.task_compacted_blocked_count || raw.taskCompactedBlockedCount || 0),
        repeated_failed_categories: (0, typed_memory_shared_1.uniqueStrings)((Array.isArray(raw.repeated_failed_categories || raw.repeatedFailedCategories)
            ? (raw.repeated_failed_categories || raw.repeatedFailedCategories)
            : []).map((item) => String(item || "").trim()).filter(Boolean), 30),
        recommended_retry_options: {
            memory: retryOptions.memory || retryOptions.memoryOptions || {},
            replayRepairDispatchBriefs: retryOptions.replayRepairDispatchBriefs || retryOptions.replay_repair_dispatch_briefs || {},
            metadata: retryOptions.metadata || retryOptions.metadataPartialCompact || {},
            maxTaskChars: Number(retryOptions.maxTaskChars || retryOptions.max_task_chars || 0),
        },
        source_ledger_file: String(raw.source_ledger_file || raw.sourceLedgerFile || "").trim(),
        source_strategy_file: String(raw.source_strategy_file || raw.sourceStrategyFile || "").trim(),
        generated_at: String(raw.generated_at || raw.generatedAt || options.updatedAt || (0, typed_memory_shared_1.now)()),
    };
}
function normalizePtlEmergencyOutcomeRows(rows = [], options = {}) {
    const fallbackGroupId = String(options.groupId || options.group_id || "").trim();
    const fallbackGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    return rows.map((entry, index) => {
        const categories = [
            ...(Array.isArray(entry.partial_compact_policy?.selected_categories) ? entry.partial_compact_policy.selected_categories : []),
            ...(Array.isArray(entry.partial_compaction_categories) ? entry.partial_compaction_categories : []),
        ].map((item) => String(item || "").trim()).filter(Boolean);
        const row = {
            schema: "ccm-ptl-emergency-typed-memory-outcome-row-v1",
            version: typed_memory_shared_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
            groupId: String(entry.groupId || entry.group_id || entry.group || fallbackGroupId || "").trim(),
            groupSessionId: String(entry.groupSessionId || entry.group_session_id || fallbackGroupSessionId || "").trim(),
            outcome_id: String(entry.outcome_id || entry.outcomeId || "").trim(),
            assignment_id: String(entry.assignment_id || entry.assignmentId || "").trim(),
            project: String(entry.project || entry.target_project || entry.targetProject || "").trim(),
            method: String(entry.method || "metadata_partial_compact_then_deterministic_head_tail_critical_lines").trim(),
            status: String(entry.status || (entry.dispatch_ready === false ? "blocked" : entry.dispatch_ready === true ? "recovered" : "")).trim().toLowerCase(),
            dispatch_ready: entry.dispatch_ready === true || entry.dispatchReady === true,
            task_compacted: entry.task_compacted === true || entry.taskCompacted === true,
            task_hash_unchanged: entry.task_hash_unchanged === true || entry.taskHashUnchanged === true,
            token_delta: Number(entry.token_delta || entry.tokenDelta || 0),
            free_token_delta: Number(entry.free_token_delta || entry.freeTokenDelta || 0),
            from_total_tokens: Number(entry.from_total_tokens || entry.fromTotalTokens || 0),
            retry_total_tokens: Number(entry.retry_total_tokens || entry.retryTotalTokens || 0),
            from_free_tokens: Number(entry.from_free_tokens || entry.fromFreeTokens || 0),
            retry_free_tokens: Number(entry.retry_free_tokens || entry.retryFreeTokens || 0),
            selected_categories: (0, typed_memory_shared_1.uniqueStrings)(categories, 20),
            partial_omitted_chars: Number(entry.partial_omitted_chars || entry.partialOmittedChars || entry.omitted_chars || 0),
            distillation_candidate: entry.distillation_candidate !== false,
            at: String(entry.at || entry.updatedAt || entry.updated_at || options.updatedAt || (0, typed_memory_shared_1.now)()),
            source_index: Number(entry.source_index || entry.sourceIndex || index),
        };
        return {
            ...row,
            row_id: `ptl-emergency-outcome:${(0, typed_memory_shared_1.checksum)([
                row.groupId,
                row.groupSessionId,
                row.outcome_id,
                row.assignment_id,
                row.selected_categories.join(","),
                row.status,
                row.task_compacted,
            ], 24)}`,
        };
    }).filter((row) => row.distillation_candidate !== false && (row.status === "blocked" || row.dispatch_ready === false || row.task_compacted === true));
}
function ptlEmergencyTypedArchive(groupId, input = {}, options = {}) {
    const hint = normalizePtlEmergencyHintForTypedMemory(input, { ...options, groupId });
    const outcomeRows = normalizePtlEmergencyOutcomeRows(Array.isArray(input.outcomes) ? input.outcomes
        : Array.isArray(input.entries) ? input.entries
            : Array.isArray(input.outcomeLedger?.entries) ? input.outcomeLedger.entries
                : [], { ...options, groupId, groupSessionId: hint.groupSessionId || options.groupSessionId || options.group_session_id || "" });
    const failedCategories = (0, typed_memory_shared_1.uniqueStrings)([
        ...(hint.repeated_failed_categories || []),
        ...outcomeRows.flatMap((row) => row.selected_categories || []),
    ], 40);
    return {
        schema: "ccm-ptl-emergency-typed-memory-distillation-v1",
        version: typed_memory_shared_1.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION,
        groupId,
        groupSessionId: hint.groupSessionId || String(options.groupSessionId || options.group_session_id || ""),
        hint,
        engaged: hint.engaged === true,
        emergency_level: hint.emergency_level || "",
        blocked_outcome_count: Math.max(Number(hint.blocked_outcome_count || 0), outcomeRows.filter((row) => row.status === "blocked" || row.dispatch_ready === false).length),
        task_compacted_blocked_count: Math.max(Number(hint.task_compacted_blocked_count || 0), outcomeRows.filter((row) => row.task_compacted === true && (row.status === "blocked" || row.dispatch_ready === false)).length),
        failed_category_count: failedCategories.length,
        failed_categories: failedCategories,
        outcome_count: outcomeRows.length,
        rows: outcomeRows,
        source_ledger_file: hint.source_ledger_file || "",
        source_strategy_file: hint.source_strategy_file || "",
        updatedAt: String(options.updatedAt || (0, typed_memory_shared_1.now)()),
    };
}
function renderPtlEmergencyTypedBody(archive = {}, options = {}) {
    const retry = archive.hint?.recommended_retry_options || {};
    const memory = retry.memory || {};
    const replay = retry.replayRepairDispatchBriefs || {};
    const metadata = retry.metadata || {};
    const lines = [
        "# WorkerContextPacket PTL Emergency Downgrade Discipline",
        "",
        `Generated by CCM PTL emergency typed-memory distillation at ${options.updatedAt || (0, typed_memory_shared_1.now)()}.`,
        archive.groupSessionId ? `Exact group-chat session: ${archive.groupSessionId}.` : "Legacy unscoped PTL emergency memory.",
        "This feedback memory records repeated compact failures where normal WorkerContextPacket retry was not enough before child-Agent dispatch.",
        "When similar pressure appears, switch to PTL emergency downgrade: shrink memory, replay repair briefs, metadata, and task body budgets before creating another child Agent session.",
        "",
        `Emergency level: ${archive.emergency_level || "unknown"}.`,
        `Reason: ${archive.hint?.reason || "repeated compact failure"}`,
        `Blocked outcomes: ${archive.blocked_outcome_count || 0}; task_compacted_blocked: ${archive.task_compacted_blocked_count || 0}.`,
        archive.failed_categories?.length ? `Repeated failed categories: ${archive.failed_categories.join(", ")}.` : "",
        "",
        "## Recommended Retry Budgets",
        `- memory.maxRenderedChars=${Number(memory.maxRenderedChars || memory.max_rendered_chars || 0)}; memory.maxJsonChars=${Number(memory.maxJsonChars || memory.max_json_chars || 0)}; memory.maxRecallItems=${Number(memory.maxRecallItems || memory.max_recall_items || 0)}.`,
        `- replayRepairDispatchBriefs.maxBriefs=${Number(replay.maxBriefs || replay.max_briefs || 0)}; maxStringChars=${Number(replay.maxStringChars || replay.max_string_chars || 0)}; maxIdChars=${Number(replay.maxIdChars || replay.max_id_chars || 0)}.`,
        `- metadata.maxCategories=${Number(metadata.maxCategories || metadata.max_categories || 0)}; maxItems=${Number(metadata.maxItems || metadata.max_items || 0)}; maxStringChars=${Number(metadata.maxStringChars || metadata.max_string_chars || 0)}.`,
        `- maxTaskChars=${Number(retry.maxTaskChars || retry.max_task_chars || 0)}.`,
        "",
        "## Blocked Outcome Samples",
    ];
    for (const row of archive.rows || []) {
        const ids = [
            row.project ? `project=${row.project}` : "",
            row.assignment_id ? `assignment=${row.assignment_id}` : "",
            row.outcome_id ? `outcome=${row.outcome_id}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`- [${row.status || "blocked"}] ${ids || row.row_id}; method=${row.method}; categories=${(row.selected_categories || []).join(",")}; retry_total=${row.retry_total_tokens || 0}; retry_free=${row.retry_free_tokens || 0}; task_compacted=${row.task_compacted === true}; task_hash_unchanged=${row.task_hash_unchanged === true}.`);
    }
    return lines.join("\n").trim() + "\n";
}
function distillPtlEmergencyDowngradeToTypedMemory(groupId, input = {}, options = {}) {
    return require("./group-memory-distillation").distillPtlEmergencyDowngradeToTypedMemory(groupId, input, options);
}
function addDistillationQualityCheck(checks, input) {
    checks.push({
        id: input.id,
        label: input.label,
        pass: input.pass,
        severity: input.severity || "medium",
        detail: input.detail || "",
        evidence: input.evidence || [],
        gaps: input.gaps || [],
        score: input.pass ? 100 : 0,
    });
}
function distillationQualityPenalty(severity) {
    if (severity === "fatal")
        return 45;
    if (severity === "high")
        return 28;
    if (severity === "medium")
        return 14;
    return 7;
}
function collectDistilledFacts(ledger) {
    const facts = [];
    for (const type of ["user", "project", "feedback", "reference"]) {
        for (const fact of Object.values(ledger?.facts?.[type] || {}))
            facts.push({ ...fact, category: type });
    }
    return facts;
}
function evaluateGroupTypedMemoryDistillationQuality(groupId, options = {}) {
    return require("./group-memory-distillation").evaluateGroupTypedMemoryDistillationQuality(groupId, options);
}
function groupTypedMemoryDistillationArchiveFingerprint(archive = {}) {
    return (0, typed_memory_shared_1.checksum)((Array.isArray(archive?.rows) ? archive.rows : []).map((row) => [
        row?.candidate_id || "",
        row?.value || "",
        row?.recommendation || "",
        Number(row?.used_count || 0),
        Number(row?.verified_count || 0),
        Number(row?.ignored_count || 0),
        Number(row?.mentioned_count || 0),
    ]), 40);
}
function buildGroupTypedMemoryDistillationWorkState(groupId, messages = [], options = {}) {
    const maxMessages = Math.max(1, Math.min(5000, Number(options.maxMessages || options.max_messages || typed_memory_shared_1.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES)));
    const ledger = (0, typed_memory_distillation_receipts_part_01_1.readGroupTypedMemoryDistillationLedger)(groupId);
    const eligibleRows = (messages || [])
        .filter(message => !String(message?.content || "").startsWith("📤"))
        .map((message, index) => ({ message, index, id: (0, typed_memory_shared_1.messageIdentity)(message, index) }));
    const previousCursorMessageId = String(ledger.distillationCursor?.lastCommittedMessageId
        || ledger.distillation_cursor?.last_committed_message_id
        || ledger.lastDistilledMessageId
        || "");
    const cursorIndex = previousCursorMessageId
        ? eligibleRows.findIndex(row => row.id === previousCursorMessageId)
        : -1;
    const forceRescan = options.forceDistillationRescan === true || options.force_distillation_rescan === true;
    const cursorMissing = !!previousCursorMessageId && cursorIndex < 0;
    const pendingRows = forceRescan || !previousCursorMessageId || cursorMissing
        ? eligibleRows
        : eligibleRows.slice(cursorIndex + 1);
    const selectedRows = pendingRows.slice(0, maxMessages);
    const existingAdmission = (0, typed_memory_distillation_receipts_part_01_1.filterExistingDistilledFactsByAdmission)(ledger.facts || {});
    const inflatedFactCount = Object.values(ledger.facts || {}).reduce((total, bucket) => total + Object.values(bucket || {}).filter((fact) => Number(fact?.count || 1) > 1).length, 0);
    const inflatedAdmissionObservationCount = (Array.isArray(ledger.admission?.observations) ? ledger.admission.observations : [])
        .filter((row) => Number(row?.count || 1) > 1).length;
    const postCompactUsageArchive = (0, typed_memory_shared_1.buildPostCompactCandidateUsageArchive)(options);
    const previousPostCompactUsageArchive = ledger.postCompactUsageArchive || {};
    const postCompactUsageArchiveChanged = postCompactUsageArchive.archived_count > 0
        && groupTypedMemoryDistillationArchiveFingerprint(postCompactUsageArchive) !== groupTypedMemoryDistillationArchiveFingerprint(previousPostCompactUsageArchive);
    const transactionState = (0, typed_memory_distillation_receipts_part_01_1.readGroupTypedMemoryDistillationTransactionState)(groupId);
    const artifactTransaction = (0, typed_memory_index_build_1.inspectGroupTypedMemoryArtifactTransaction)(groupId);
    const artifactStagePresent = fs.existsSync((0, typed_memory_index_build_1.getGroupTypedMemoryArtifactTransactionStageRoot)(groupId));
    const artifactRecoveryRequired = artifactTransaction.present
        && (!artifactTransaction.valid || String(artifactTransaction.journal?.status || "") === "prepared" || artifactStagePresent);
    const recoveryReasons = [
        fs.existsSync((0, typed_memory_distillation_receipts_part_01_1.getGroupTypedMemoryDistillationLockFile)(groupId)) ? "distillation_lock_present" : "",
        artifactRecoveryRequired
            ? !artifactTransaction.valid
                ? "artifact_journal_corrupt"
                : String(artifactTransaction.journal?.status || "") === "prepared"
                    ? "artifact_journal_prepared"
                    : "artifact_stage_present"
            : "",
        transactionState.valid && ["started", "in_progress", "failed"].includes(String(transactionState.state?.status || ""))
            ? `transaction_state_${String(transactionState.state?.status || "unknown")}`
            : "",
    ].filter(Boolean);
    const maintenanceReasons = [
        existingAdmission.rejected.length > 0 ? "inadmissible_existing_facts" : "",
        postCompactUsageArchiveChanged ? "post_compact_usage_archive_changed" : "",
        inflatedFactCount > 0 ? "inflated_fact_counts" : "",
        inflatedAdmissionObservationCount > 0 ? "inflated_admission_observations" : "",
    ].filter(Boolean);
    const disabled = options.disabled === true || options.disableDistillation === true || options.disable_distillation === true;
    const runRequired = recoveryReasons.length > 0
        || (!disabled && (forceRescan || pendingRows.length > 0 || maintenanceReasons.length > 0));
    return {
        ledger,
        eligibleRows,
        previousCursorMessageId,
        cursorIndex,
        forceRescan,
        cursorMissing,
        pendingRows,
        selectedRows,
        existingAdmission,
        inflatedFactCount,
        inflatedAdmissionObservationCount,
        postCompactUsageArchive,
        postCompactUsageArchiveChanged,
        artifactTransaction,
        artifactStagePresent,
        recoveryReasons,
        maintenanceReasons,
        disabled,
        runRequired,
        maxMessages,
    };
}
function inspectGroupTypedMemoryDistillationWork(groupId, messages = [], options = {}) {
    return require("./group-memory-distillation").inspectGroupTypedMemoryDistillationWork(groupId, messages, options);
}
//# sourceMappingURL=typed-memory-distillation-receipts-part-04.js.map