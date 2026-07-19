"use strict";
// Behavior-freeze split from typed-memory-ledgers.ts (part 4/4).
// Behavior-freeze module extracted mechanically from the former facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordGroupTypedMemoryConsumptionLedger = recordGroupTypedMemoryConsumptionLedger;
exports.typedMemoryStaleCandidateLedgerChecksum = typedMemoryStaleCandidateLedgerChecksum;
exports.readGroupTypedMemoryStaleCandidateLedger = readGroupTypedMemoryStaleCandidateLedger;
exports.writeGroupTypedMemoryStaleCandidateLedger = writeGroupTypedMemoryStaleCandidateLedger;
exports.typedMemoryConsumptionQueryRelevance = typedMemoryConsumptionQueryRelevance;
exports.buildGroupTypedMemoryConsumptionSummary = buildGroupTypedMemoryConsumptionSummary;
exports.scoreGroupTypedMemoryConsumptionRecall = scoreGroupTypedMemoryConsumptionRecall;
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_1 = require("./typed-memory-shared");
const typed_memory_ledgers_part_01_1 = require("./typed-memory-ledgers-part-01");
const typed_memory_ledgers_part_03_1 = require("./typed-memory-ledgers-part-03");
function recordGroupTypedMemoryConsumptionLedger(groupId, input = {}) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const ledger = (0, typed_memory_ledgers_part_03_1.readGroupTypedMemoryConsumptionLedger)(groupId);
    const scopedGroupId = String(ledger.group_id || groupId);
    const entries = ledger.ledger_checksum_valid === true ? [...ledger.entries] : [];
    const at = String(input.generatedAt || input.generated_at || (0, typed_memory_shared_1.now)());
    let rejectedCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;
    let downgradedVerifiedCount = 0;
    let upgradedObservationCount = 0;
    let recordedCount = 0;
    const existingIds = new Set(entries.map((entry) => String(entry.entry_id || "")));
    const existingObservationStates = new Map(entries.map((entry, index) => [
        String(entry.observation_id || (0, typed_memory_ledgers_part_03_1.typedMemoryConsumptionObservationId)(scopedGroupId, entry, entry)),
        { state: (0, typed_memory_ledgers_part_03_1.normalizeTypedMemoryConsumptionUsageState)(entry.usage_state), index, entryId: String(entry.entry_id || "") },
    ]));
    const incoming = rows.slice(0, 240).map((row) => ({
        row,
        claimedUsageState: (0, typed_memory_ledgers_part_03_1.normalizeTypedMemoryConsumptionUsageState)(row.claimed_usage_state || row.claimedUsageState || row.usage_state || row.usageState || ""),
        observationId: (0, typed_memory_ledgers_part_03_1.typedMemoryConsumptionObservationId)(scopedGroupId, row, input),
    }));
    const incomingStates = new Map();
    for (const candidate of incoming) {
        const states = incomingStates.get(candidate.observationId) || new Set();
        if (candidate.claimedUsageState)
            states.add(candidate.claimedUsageState);
        incomingStates.set(candidate.observationId, states);
    }
    const conflictingIncoming = new Set([...incomingStates.entries()].filter(([, states]) => states.size > 1).map(([id]) => id));
    conflictCount += conflictingIncoming.size;
    const seenIncoming = new Set();
    for (const candidate of incoming) {
        const { row, claimedUsageState, observationId } = candidate;
        const relPath = String(row.rel_path || row.relPath || "").trim();
        const documentChecksum = String(row.document_checksum || row.documentChecksum || "").trim();
        if (conflictingIncoming.has(observationId)) {
            rejectedCount += 1;
            continue;
        }
        if (seenIncoming.has(observationId)) {
            duplicateCount += 1;
            continue;
        }
        seenIncoming.add(observationId);
        const proofValid = row.current_source_proof_valid === true || row.currentSourceProofValid === true;
        const proofPath = String(row.current_source_relative_path || row.currentSourceRelativePath || "").trim();
        const claimedSourceChecksum = String(row.current_source_claimed_checksum || row.currentSourceClaimedChecksum || "").trim().toLowerCase();
        const observedSourceChecksum = String(row.current_source_observed_checksum || row.currentSourceObservedChecksum || "").trim().toLowerCase();
        const proofId = String(row.current_source_proof_id || row.currentSourceProofId || "").trim();
        const structurallyValidProof = proofValid && !!proofPath && /^[a-f0-9]{64}$/.test(claimedSourceChecksum)
            && claimedSourceChecksum === observedSourceChecksum && !!proofId;
        const usageState = claimedUsageState === "verified" && !structurallyValidProof ? "used" : claimedUsageState;
        if (claimedUsageState === "verified" && usageState !== "verified")
            downgradedVerifiedCount += 1;
        const evidenceValid = row.evidence_valid === true || row.evidenceValid === true;
        if (!relPath || !documentChecksum || !usageState || !evidenceValid) {
            rejectedCount += 1;
            continue;
        }
        const taskAgentSessionId = String(row.task_agent_session_id || row.taskAgentSessionId || "").trim();
        const snapshotId = String(row.memory_context_snapshot_id || row.memoryContextSnapshotId || "").trim();
        const snapshotChecksum = String(row.memory_context_snapshot_checksum || row.memoryContextSnapshotChecksum || "").trim();
        const deliveryReceiptChecksum = String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || "").trim();
        if (!taskAgentSessionId || !snapshotId || !snapshotChecksum || !deliveryReceiptChecksum) {
            rejectedCount += 1;
            continue;
        }
        const targetProject = String(row.target_project || row.targetProject || input.targetProject || input.target_project || "").trim();
        const taskId = String(row.task_id || row.taskId || input.taskId || input.task_id || "").trim();
        const executionId = String(row.execution_id || row.executionId || input.executionId || input.execution_id || "").trim();
        const previousObservation = existingObservationStates.get(observationId);
        if (previousObservation) {
            duplicateCount += 1;
            if (previousObservation.state === "mentioned" && usageState !== "mentioned") {
                const previousIndex = entries.findIndex((entry) => String(entry.observation_id || (0, typed_memory_ledgers_part_03_1.typedMemoryConsumptionObservationId)(scopedGroupId, entry, entry)) === observationId);
                if (previousIndex >= 0) {
                    const [removed] = entries.splice(previousIndex, 1);
                    existingIds.delete(String(removed?.entry_id || previousObservation.entryId || ""));
                    upgradedObservationCount += 1;
                    duplicateCount -= 1;
                }
            }
            else if (usageState === "mentioned" || previousObservation.state === usageState) {
                continue;
            }
            else {
                conflictCount += 1;
                rejectedCount += 1;
                continue;
            }
        }
        const receiptEvidenceChecksum = String(row.receipt_evidence_checksum || row.receiptEvidenceChecksum || (0, typed_memory_shared_1.checksum)([
            row.memory_used || row.memoryUsed || [],
            row.memory_ignored || row.memoryIgnored || [],
            row.typed_memory_usage || row.typedMemoryUsage || [],
        ], 64));
        const entryId = `tmcu_${(0, typed_memory_shared_1.checksum)([
            scopedGroupId,
            targetProject,
            taskId,
            executionId,
            taskAgentSessionId,
            snapshotId,
            relPath,
            usageState,
            receiptEvidenceChecksum,
        ], 28)}`;
        if (existingIds.has(entryId)) {
            duplicateCount += 1;
            continue;
        }
        const anomalyCodes = (0, typed_memory_shared_1.uniqueStrings)([
            ...(Array.isArray(row.anomaly_codes || row.anomalyCodes) ? (row.anomaly_codes || row.anomalyCodes) : []),
            ...(claimedUsageState === "verified" && usageState !== "verified" ? ["verified_without_system_current_source_proof"] : []),
        ]).slice(0, 12);
        const evidenceTier = structurallyValidProof && usageState === "verified"
            ? "system_current_source_file_proof"
            : String(row.evidence_tier || row.evidenceTier || (row.direct_reference === true ? "bound_structured_receipt" : "bound_text_receipt"));
        const evidenceConfidence = (0, typed_memory_ledgers_part_03_1.typedMemoryConsumptionEvidenceConfidence)(row, usageState, structurallyValidProof);
        const payload = {
            schema: "ccm-group-typed-memory-consumption-entry-v1",
            version: 3,
            entry_id: entryId,
            observation_id: observationId,
            group_id: scopedGroupId,
            target_project: targetProject,
            agent_type: String(row.agent_type || row.agentType || ""),
            task_id: taskId,
            execution_id: executionId,
            task_agent_session_id: taskAgentSessionId,
            memory_context_snapshot_id: snapshotId,
            memory_context_snapshot_checksum: snapshotChecksum,
            delivery_receipt_checksum: deliveryReceiptChecksum,
            rel_path: relPath,
            name: (0, typed_memory_shared_1.compactText)(row.name || "", 160),
            type: String(row.type || ""),
            document_checksum: documentChecksum,
            usage_state: usageState,
            claimed_usage_state: claimedUsageState,
            current_source_verified: usageState === "verified" && structurallyValidProof,
            current_source_proof_valid: structurallyValidProof,
            current_source_relative_path: proofPath,
            current_source_claimed_checksum: claimedSourceChecksum,
            current_source_observed_checksum: observedSourceChecksum,
            current_source_proof_id: proofId,
            verification_status: structurallyValidProof ? "system_file_checksum_match" : claimedUsageState === "verified" ? "downgraded_missing_or_invalid_proof" : "not_requested",
            evidence_tier: evidenceTier,
            evidence_confidence: evidenceConfidence,
            anomaly_codes: anomalyCodes,
            lifecycle_state: String(row.lifecycle_state || row.lifecycleState || (usageState === "mentioned" ? "delivered_unreported" : usageState)),
            delivery_state: String(row.delivery_state || row.deliveryState || "delivered"),
            access_state: String(row.access_state || row.accessState || "capture_missing"),
            access_event_count: Math.max(0, Number(row.access_event_count || row.accessEventCount || 0)),
            access_evidence_checksum: String(row.access_evidence_checksum || row.accessEvidenceChecksum || ""),
            access_event_checksums: (0, typed_memory_shared_1.uniqueStrings)(row.access_event_checksums || row.accessEventChecksums || []).slice(0, 20),
            access_capture_status: String(row.access_capture_status || row.accessCaptureStatus || "capture_missing"),
            access_evidence_valid: row.access_evidence_valid === true || row.accessEvidenceValid === true,
            direct_reference: row.direct_reference === true || row.directReference === true,
            query_concepts: (0, typed_memory_shared_1.uniqueStrings)(row.query_concepts || row.queryConcepts || []).slice(0, 24),
            query_polarities: (0, typed_memory_shared_1.uniqueStrings)(row.query_polarities || row.queryPolarities || []).slice(0, 12),
            query_relations: (0, typed_memory_shared_1.uniqueStrings)(row.query_relations || row.queryRelations || []).slice(0, 12),
            reason: (0, typed_memory_shared_1.compactText)(row.reason || "", 500),
            receipt_evidence_checksum: receiptEvidenceChecksum,
            generated_at: String(row.generated_at || row.generatedAt || at),
        };
        const entry = { ...payload, checksum: (0, typed_memory_ledgers_part_03_1.typedMemoryConsumptionEntryChecksum)(payload) };
        entries.push(entry);
        existingIds.add(entryId);
        existingObservationStates.set(observationId, { state: usageState, index: entries.length - 1, entryId });
        recordedCount += 1;
    }
    const retained = entries.sort((a, b) => String(a.generated_at || "").localeCompare(String(b.generated_at || ""))).slice(-1200);
    const updatedAt = at;
    const payload = {
        schema: "ccm-group-typed-memory-consumption-ledger-v1",
        version: 1,
        group_id: scopedGroupId,
        entries: retained,
        updated_at: updatedAt,
        checksum: (0, typed_memory_ledgers_part_03_1.typedMemoryConsumptionLedgerChecksum)(retained, updatedAt),
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(ledger.file, payload);
    return {
        ...(0, typed_memory_ledgers_part_03_1.readGroupTypedMemoryConsumptionLedger)(groupId),
        recorded_count: recordedCount,
        rejected_count: rejectedCount,
        duplicate_count: duplicateCount,
        conflict_count: conflictCount,
        downgraded_verified_count: downgradedVerifiedCount,
        upgraded_observation_count: upgradedObservationCount,
    };
}
function typedMemoryStaleCandidateLedgerChecksum(candidates, events, rejections, updatedAt) {
    return (0, typed_memory_shared_1.checksum)([
        1,
        candidates.map(candidate => candidate.checksum || ""),
        events.map(event => event.checksum || ""),
        rejections.map(rejection => rejection.checksum || ""),
        updatedAt,
    ], 64);
}
function readGroupTypedMemoryStaleCandidateLedger(groupId) {
    const scopeId = String(groupId || "").trim();
    const file = (0, typed_memory_ledgers_part_01_1.getGroupTypedMemoryStaleCandidateLedgerFile)(scopeId);
    const state = (0, typed_memory_shared_1.readJson)(file, {
        schema: "ccm-group-typed-memory-stale-candidate-ledger-v1",
        version: 1,
        scope_id: scopeId,
        candidates: [],
        resolution_events: [],
        rejections: [],
        updated_at: "",
        checksum: "",
    });
    const rawCandidates = Array.isArray(state.candidates) ? state.candidates : [];
    const rawEvents = Array.isArray(state.resolution_events) ? state.resolution_events : [];
    const rawRejections = Array.isArray(state.rejections) ? state.rejections : [];
    const updatedAt = String(state.updated_at || "");
    const declaredChecksum = String(state.checksum || "");
    const computedChecksum = typedMemoryStaleCandidateLedgerChecksum(rawCandidates, rawEvents, rawRejections, updatedAt);
    const ledgerChecksumValid = rawCandidates.length === 0 && rawEvents.length === 0 && rawRejections.length === 0 && !declaredChecksum
        ? true
        : !!declaredChecksum && declaredChecksum === computedChecksum;
    const validCandidates = ledgerChecksumValid
        ? rawCandidates.filter((candidate) => String(candidate?.scope_id || "") === scopeId
            && String(candidate?.checksum || "") === (0, typed_memory_recall_1.typedMemoryStaleCandidateChecksum)(candidate || {}))
        : [];
    const validCandidateIds = new Set(validCandidates.map((candidate) => String(candidate.candidate_id || "")));
    const validCandidateChecksums = new Map(validCandidates.map((candidate) => [String(candidate.candidate_id || ""), String(candidate.checksum || "")]));
    const validEvents = ledgerChecksumValid
        ? rawEvents.filter((event) => String(event?.scope_id || "") === scopeId
            && validCandidateIds.has(String(event?.candidate_id || ""))
            && String(event?.candidate_checksum || "") === validCandidateChecksums.get(String(event?.candidate_id || ""))
            && String(event?.checksum || "") === (0, typed_memory_shared_1.typedMemoryStaleResolutionChecksum)(event || {}))
        : [];
    const validRejections = ledgerChecksumValid
        ? rawRejections.filter((rejection) => String(rejection?.scope_id || "") === scopeId
            && String(rejection?.checksum || "") === (0, typed_memory_shared_1.typedMemoryStaleRejectionChecksum)(rejection || {}))
        : [];
    const integrityValid = ledgerChecksumValid
        && String(state.scope_id || "") === scopeId
        && validCandidates.length === rawCandidates.length
        && validEvents.length === rawEvents.length
        && validRejections.length === rawRejections.length;
    const latestEvent = new Map();
    for (const event of validEvents)
        latestEvent.set(String(event.candidate_id || ""), event);
    const candidates = validCandidates.map((candidate) => {
        const resolution = latestEvent.get(String(candidate.candidate_id || ""));
        return {
            ...candidate,
            status: resolution?.status === "applied" ? "applied" : resolution?.status === "rejected" ? "rejected" : "pending",
            resolution: resolution || null,
        };
    });
    return {
        ...state,
        schema: "ccm-group-typed-memory-stale-candidate-ledger-v1",
        version: 1,
        scope_id: scopeId,
        exact_session_scope: (0, typed_memory_shared_1.isExactGroupTypedMemorySessionScope)(scopeId),
        candidates,
        resolution_events: validEvents,
        rejections: validRejections,
        raw_candidate_count: rawCandidates.length,
        valid_candidate_count: validCandidates.length,
        invalid_candidate_count: rawCandidates.length - validCandidates.length,
        invalid_resolution_event_count: rawEvents.length - validEvents.length,
        invalid_rejection_count: rawRejections.length - validRejections.length,
        pending_count: candidates.filter((candidate) => candidate.status === "pending").length,
        applied_count: candidates.filter((candidate) => candidate.status === "applied").length,
        rejected_count: candidates.filter((candidate) => candidate.status === "rejected").length,
        ledger_checksum_valid: integrityValid,
        envelope_checksum_valid: ledgerChecksumValid,
        computed_checksum: computedChecksum,
        file,
    };
}
function writeGroupTypedMemoryStaleCandidateLedger(scopeId, input) {
    const file = (0, typed_memory_ledgers_part_01_1.getGroupTypedMemoryStaleCandidateLedgerFile)(scopeId);
    const candidates = Array.isArray(input.candidates) ? input.candidates : [];
    const resolutionEvents = Array.isArray(input.resolution_events) ? input.resolution_events : [];
    const rejections = Array.isArray(input.rejections) ? input.rejections.slice(-600) : [];
    const updatedAt = String(input.updated_at || (0, typed_memory_shared_1.now)());
    const payload = {
        schema: "ccm-group-typed-memory-stale-candidate-ledger-v1",
        version: 1,
        scope_id: scopeId,
        candidates,
        resolution_events: resolutionEvents,
        rejections,
        updated_at: updatedAt,
        checksum: typedMemoryStaleCandidateLedgerChecksum(candidates, resolutionEvents, rejections, updatedAt),
    };
    (0, typed_memory_shared_1.writeJsonAtomic)(file, payload);
    return readGroupTypedMemoryStaleCandidateLedger(scopeId);
}
function typedMemoryConsumptionQueryRelevance(entry, queryFeatures) {
    const currentConcepts = new Set(queryFeatures?.concepts || []);
    const historicalConcepts = new Set(entry.query_concepts || []);
    const currentRelations = new Set(queryFeatures?.relations || []);
    const historicalRelations = new Set(entry.query_relations || []);
    if (!currentConcepts.size || !historicalConcepts.size)
        return { relevant: false, concept_coverage: 0, relation_match: false };
    const conceptOverlap = [...currentConcepts].filter(concept => historicalConcepts.has(concept)).length;
    const conceptCoverage = conceptOverlap / Math.max(1, Math.min(currentConcepts.size, historicalConcepts.size));
    const relationMatch = [...currentRelations].some(relation => historicalRelations.has(relation));
    return { relevant: conceptCoverage >= 0.5 || relationMatch, concept_coverage: (0, typed_memory_recall_1.roundSemanticRecallScore)(conceptCoverage, 4), relation_match: relationMatch };
}
function buildGroupTypedMemoryConsumptionSummary(groupId, options = {}) {
    const ledger = (0, typed_memory_ledgers_part_03_1.readGroupTypedMemoryConsumptionLedger)(groupId);
    const targetProject = String(options.targetProject || options.target_project || "").trim().toLowerCase();
    const queryFeatures = options.queryFeatures || options.query_features || (0, typed_memory_recall_1.semanticRecallFeatures)(options.query || "");
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const halfLifeDays = Math.max(1, Number(options.halfLifeDays || options.half_life_days || typed_memory_shared_1.GROUP_TYPED_MEMORY_CONSUMPTION_HALF_LIFE_DAYS));
    const staleAfterDays = Math.max(halfLifeDays, Number(options.staleAfterDays || options.stale_after_days || typed_memory_shared_1.GROUP_TYPED_MEMORY_CONSUMPTION_STALE_AFTER_DAYS));
    const rows = (ledger.entries || []).filter((entry) => {
        const entryProject = String(entry.target_project || "").trim().toLowerCase();
        return !targetProject || !entryProject || targetProject === entryProject;
    }).map((entry) => {
        const generatedMs = Date.parse(String(entry.generated_at || ""));
        const ageDays = Number.isFinite(generatedMs) ? Math.max(0, (nowMs - generatedMs) / 86_400_000) : staleAfterDays + 1;
        const decayWeight = ageDays > staleAfterDays ? 0 : Math.pow(0.5, ageDays / halfLifeDays);
        const relevance = typedMemoryConsumptionQueryRelevance(entry, queryFeatures);
        return {
            ...entry,
            age_days: (0, typed_memory_recall_1.roundSemanticRecallScore)(ageDays, 3),
            decay_weight: (0, typed_memory_recall_1.roundSemanticRecallScore)(decayWeight, 4),
            stale: ageDays > staleAfterDays,
            query_relevant: relevance.relevant,
            query_concept_coverage: relevance.concept_coverage,
            query_relation_match: relevance.relation_match,
            evidence_confidence: Number(entry.evidence_confidence ?? (Number(entry.version || 1) >= 2 ? 0.4 : entry.usage_state === "verified" ? 0.65 : 0.75)),
            evidence_tier: String(entry.evidence_tier || (Number(entry.version || 1) >= 2 ? "unknown" : "legacy_bound_receipt")),
            verification_status: String(entry.verification_status || (entry.usage_state === "verified" ? "legacy_unproven" : "not_requested")),
            anomaly_codes: Array.isArray(entry.anomaly_codes) ? entry.anomaly_codes : (entry.usage_state === "verified" && Number(entry.version || 1) < 2 ? ["legacy_verified_without_system_proof"] : []),
        };
    });
    return {
        schema: "ccm-group-typed-memory-consumption-summary-v1",
        version: 1,
        group_id: groupId,
        target_project: targetProject,
        ledger_file: ledger.file,
        ledger_checksum_valid: ledger.ledger_checksum_valid === true,
        invalid_entry_count: Number(ledger.invalid_entry_count || 0),
        entry_count: rows.length,
        relevant_entry_count: rows.filter((row) => row.query_relevant && !row.stale).length,
        stale_entry_count: rows.filter((row) => row.stale).length,
        proof_verified_entry_count: rows.filter((row) => row.usage_state === "verified" && row.current_source_proof_valid === true).length,
        downgraded_verified_entry_count: rows.filter((row) => row.claimed_usage_state === "verified" && row.usage_state !== "verified").length,
        anomaly_entry_count: rows.filter((row) => Array.isArray(row.anomaly_codes) && row.anomaly_codes.length > 0).length,
        average_evidence_confidence: rows.length
            ? (0, typed_memory_recall_1.roundSemanticRecallScore)(rows.reduce((sum, row) => sum + Number(row.evidence_confidence || 0), 0) / rows.length, 4)
            : 0,
        rows,
        query_concepts: queryFeatures.concepts || [],
        query_polarities: queryFeatures.polarities || [],
        query_relations: queryFeatures.relations || [],
        half_life_days: halfLifeDays,
        stale_after_days: staleAfterDays,
    };
}
function scoreGroupTypedMemoryConsumptionRecall(doc, summary) {
    const relPath = String(doc.relPath || doc.rel_path || "").toLowerCase();
    const documentChecksum = String(doc.checksum || "");
    const matches = (summary.rows || []).filter((row) => String(row.rel_path || "").toLowerCase() === relPath
        && String(row.document_checksum || "") === documentChecksum
        && row.query_relevant === true
        && row.stale !== true
        && Number(row.decay_weight || 0) > 0);
    const weighted = { verified: 0, used: 0, ignored: 0, mentioned: 0 };
    for (const row of matches) {
        const state = (0, typed_memory_ledgers_part_03_1.normalizeTypedMemoryConsumptionUsageState)(row.usage_state);
        if (!(state in weighted))
            continue;
        weighted[state] += Number(row.decay_weight || 0) * Number(row.evidence_confidence || 0);
    }
    const positive = weighted.verified * 6 + weighted.used * 4;
    const negative = weighted.ignored * 5;
    const conflictRatio = Math.min(positive, negative) / Math.max(1, Math.max(positive, negative));
    const conflict = positive >= 1 && negative >= 1 && conflictRatio >= 0.35;
    const adjustment = conflict ? 0 : Math.max(-10, Math.min(8, (0, typed_memory_recall_1.roundSemanticRecallScore)(positive - negative, 3)));
    return {
        schema: "ccm-group-typed-memory-consumption-recall-score-v1",
        adjustment,
        matched_count: matches.length,
        weighted: Object.fromEntries(Object.entries(weighted).map(([key, value]) => [key, (0, typed_memory_recall_1.roundSemanticRecallScore)(value, 4)])),
        positive_score: (0, typed_memory_recall_1.roundSemanticRecallScore)(positive, 3),
        negative_score: (0, typed_memory_recall_1.roundSemanticRecallScore)(negative, 3),
        conflict,
        conflict_ratio: (0, typed_memory_recall_1.roundSemanticRecallScore)(conflictRatio, 4),
        current_document_checksum: documentChecksum,
        matched_entries: matches.slice(-8).map((row) => ({
            entry_id: row.entry_id,
            usage_state: row.usage_state,
            age_days: row.age_days,
            decay_weight: row.decay_weight,
            evidence_confidence: row.evidence_confidence,
            evidence_tier: row.evidence_tier,
            verification_status: row.verification_status,
            anomaly_codes: row.anomaly_codes || [],
            task_agent_session_id: row.task_agent_session_id,
            memory_context_snapshot_id: row.memory_context_snapshot_id,
        })),
    };
}
//# sourceMappingURL=typed-memory-ledgers-part-04.js.map