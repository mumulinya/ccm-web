"use strict";
// Behavior-freeze split from group-memory-loading.ts (part 2/3).
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.verifyGroupTypedMemoryManifestSelectorCalibration = verifyGroupTypedMemoryManifestSelectorCalibration;
exports.buildGroupTypedMemoryManifestSelectorCalibration = buildGroupTypedMemoryManifestSelectorCalibration;
exports.verifyGroupTypedMemoryManifestSelectorShape = verifyGroupTypedMemoryManifestSelectorShape;
exports.recordGroupTypedMemoryManifestSelectorShape = recordGroupTypedMemoryManifestSelectorShape;
exports.summarizeGroupTypedMemoryManifestSelectorShapes = summarizeGroupTypedMemoryManifestSelectorShapes;
exports.verifyGroupTypedMemoryManifestSelection = verifyGroupTypedMemoryManifestSelection;
exports.configureGroupTypedMemoryManifestSelector = configureGroupTypedMemoryManifestSelector;
exports.buildGroupTypedMemoryManifest = buildGroupTypedMemoryManifest;
exports.selectGroupTypedMemoryManifest = selectGroupTypedMemoryManifest;
exports.summarizeGroupTypedMemoryManifestSelectorOutcomes = summarizeGroupTypedMemoryManifestSelectorOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorDecisions = summarizeGroupTypedMemoryManifestSelectorDecisions;
const group_memory_loading_part_01_1 = require("./group-memory-loading-part-01");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const group_memory_index_1 = require("./group-memory-index");
const group_memory_loading_part_01_2 = require("./group-memory-loading-part-01");
function verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId = "", expectedQueryChecksum = "") {
    const hints = Array.isArray(calibration?.hints) ? calibration.hints : [];
    const checksumValid = !!calibration
        && String(calibration.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectorCalibrationChecksum)(calibration);
    const hintsValid = hints.length <= 12 && hints.every((hint) => typeof hint?.relPath === "string"
        && path.basename(hint.relPath) === hint.relPath
        && hint.relPath.toLowerCase().endsWith(".md")
        && ["support", "caution", "mixed"].includes(String(hint.calibration || ""))
        && Number(hint.evidenceCount || 0) > 0
        && Number(hint.strongReceiptCount || 0) === Number(hint.evidenceCount || 0));
    const valid = !!calibration
        && calibration.schema === "ccm-group-typed-memory-manifest-selector-calibration-v1"
        && Number(calibration.version || 0) === 1
        && calibration.advisoryOnly === true
        && calibration.autoSuppression === false
        && calibration.crossSessionReuse === false
        && calibration.validScope === true
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(calibration.scopeId || ""))
        && (!expectedScopeId || String(calibration.scopeId || "") === expectedScopeId)
        && !!String(calibration.queryChecksum || "")
        && (!expectedQueryChecksum || String(calibration.queryChecksum || "") === expectedQueryChecksum)
        && new Set(hints.map((hint) => String(hint.relPath || "").toLowerCase())).size === hints.length
        && hintsValid
        && checksumValid;
    return {
        valid,
        checksumValid,
        scopeValid: !expectedScopeId || String(calibration?.scopeId || "") === expectedScopeId,
        queryValid: !expectedQueryChecksum || String(calibration?.queryChecksum || "") === expectedQueryChecksum,
        hintsValid,
        hintCount: hints.length,
    };
}
function buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options = {}) {
    const requestedNowMs = Number(options.nowMs || options.now_ms || Date.now());
    const nowMs = Number.isFinite(requestedNowMs) ? requestedNowMs : Date.now();
    const generatedAt = String(options.generatedAt || options.generated_at || new Date(nowMs).toISOString());
    const queryChecksum = (0, group_memory_index_1.checksum)(String(query || ""), 64);
    const lookbackDays = Math.max(1, Math.min(180, Number(options.lookbackDays || options.lookback_days || 30)));
    const halfLifeDays = Math.max(1, Math.min(90, Number(options.halfLifeDays || options.half_life_days || 14)));
    const maxHints = Math.max(1, Math.min(12, Number(options.maxHints || options.max_hints || 12)));
    const candidateRelPaths = new Set((options.candidateRelPaths || options.candidate_rel_paths || [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean));
    const base = {
        schema: "ccm-group-typed-memory-manifest-selector-calibration-v1",
        version: 1,
        scopeId,
        queryChecksum,
        advisoryOnly: true,
        autoSuppression: false,
        crossSessionReuse: false,
        evidencePolicy: "exact_session_exact_query_strong_receipt_latest_per_request",
        lookbackDays,
        halfLifeDays,
        candidateBound: candidateRelPaths.size > 0,
        candidateCount: candidateRelPaths.size,
        generatedAt,
    };
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId)) {
        const core = { ...base, validScope: false, evidenceCount: 0, excludedCount: 0, hintCount: 0, hints: [] };
        return { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorCalibrationChecksum)(core) };
    }
    const rows = [];
    let excludedCount = 0;
    const exclusionCounts = {};
    const exclude = (reason) => {
        excludedCount += 1;
        exclusionCounts[reason] = Number(exclusionCounts[reason] || 0) + 1;
    };
    try {
        for (const name of fs.readdirSync((0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorConsumptionDir)(scopeId)).filter(name => name.endsWith(".json"))) {
            try {
                const consumption = JSON.parse(fs.readFileSync(path.join((0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorConsumptionDir)(scopeId), name), "utf-8"));
                const chain = (0, group_memory_index_1.readGroupTypedMemoryManifestSelectorChain)(scopeId, String(consumption.requestId || ""));
                const verified = chain.valid === true
                    && (0, group_memory_loading_part_01_2.verifyGroupTypedMemoryManifestSelectorConsumptionOutcome)(consumption, scopeId, chain.committed).valid === true;
                if (!verified) {
                    exclude("invalid_chain_or_outcome");
                    continue;
                }
                if (consumption.receiptBindingValid !== true) {
                    exclude("weak_receipt_binding");
                    continue;
                }
                if (Number(consumption.unexpectedClaimedRelPaths?.length || 0) > 0) {
                    exclude("unexpected_claim");
                    continue;
                }
                if (String(chain.selection?.queryChecksum || "") !== queryChecksum) {
                    exclude("query_mismatch");
                    continue;
                }
                rows.push({ ...consumption, selection: chain.selection });
            }
            catch {
                exclude("unreadable");
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")) || String(b.checksum || "").localeCompare(String(a.checksum || "")));
    const latestByRequestId = new Map();
    for (const row of rows)
        if (!latestByRequestId.has(String(row.requestId || "")))
            latestByRequestId.set(String(row.requestId || ""), row);
    const aggregates = new Map();
    let evidenceCount = 0;
    for (const row of latestByRequestId.values()) {
        const recordedMs = Date.parse(String(row.recordedAt || ""));
        if (!Number.isFinite(recordedMs)) {
            exclude("recorded_at_invalid");
            continue;
        }
        const ageDays = Math.max(0, (nowMs - recordedMs) / 86_400_000);
        if (ageDays > lookbackDays) {
            exclude("outside_lookback");
            continue;
        }
        const decayWeight = Math.pow(0.5, ageDays / halfLifeDays);
        for (const document of Array.isArray(row.documents) ? row.documents : []) {
            const relPath = String(document.relPath || "");
            const relKey = relPath.toLowerCase();
            const usageState = String(document.usageState || "");
            if (!relPath || !["used", "verified", "ignored"].includes(usageState))
                continue;
            if (candidateRelPaths.size > 0 && !candidateRelPaths.has(relKey))
                continue;
            const current = aggregates.get(relKey) || {
                relPath,
                usedCount: 0,
                verifiedCount: 0,
                ignoredCount: 0,
                evidenceCount: 0,
                strongReceiptCount: 0,
                weightedUsed: 0,
                weightedVerified: 0,
                weightedIgnored: 0,
                lastObservedAt: "",
            };
            current[`${usageState}Count`] = Number(current[`${usageState}Count`] || 0) + 1;
            current[`weighted${usageState[0].toUpperCase()}${usageState.slice(1)}`] = Number(current[`weighted${usageState[0].toUpperCase()}${usageState.slice(1)}`] || 0) + decayWeight;
            current.evidenceCount += 1;
            current.strongReceiptCount += 1;
            if (!current.lastObservedAt || String(row.recordedAt || "") > current.lastObservedAt)
                current.lastObservedAt = String(row.recordedAt || "");
            aggregates.set(relKey, current);
            evidenceCount += 1;
        }
    }
    const hints = [...aggregates.values()].map((row) => {
        const weightedUseful = Number(row.weightedUsed || 0) + Number(row.weightedVerified || 0) * 1.5;
        const weightedIgnored = Number(row.weightedIgnored || 0);
        const calibration = weightedUseful >= 0.5 && weightedUseful >= weightedIgnored
            ? "support"
            : Number(row.ignoredCount || 0) >= 2 && weightedIgnored > weightedUseful * 1.5
                ? "caution"
                : "mixed";
        return {
            relPath: row.relPath,
            calibration,
            evidenceCount: Number(row.evidenceCount || 0),
            strongReceiptCount: Number(row.strongReceiptCount || 0),
            usedCount: Number(row.usedCount || 0),
            verifiedCount: Number(row.verifiedCount || 0),
            ignoredCount: Number(row.ignoredCount || 0),
            weightedUseful: Number(weightedUseful.toFixed(6)),
            weightedIgnored: Number(weightedIgnored.toFixed(6)),
            lastObservedAt: String(row.lastObservedAt || ""),
        };
    }).sort((a, b) => Number(b.weightedUseful + b.weightedIgnored) - Number(a.weightedUseful + a.weightedIgnored)
        || String(b.lastObservedAt || "").localeCompare(String(a.lastObservedAt || ""))
        || String(a.relPath || "").localeCompare(String(b.relPath || "")))
        .slice(0, maxHints);
    const core = {
        ...base,
        validScope: true,
        evidenceCount,
        excludedCount,
        exclusionCounts,
        hintCount: hints.length,
        supportHintCount: hints.filter((hint) => hint.calibration === "support").length,
        cautionHintCount: hints.filter((hint) => hint.calibration === "caution").length,
        mixedHintCount: hints.filter((hint) => hint.calibration === "mixed").length,
        hints,
    };
    return { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorCalibrationChecksum)(core) };
}
function verifyGroupTypedMemoryManifestSelectorShape(shape, expectedScopeId = "", decision = null) {
    const checksumValid = !!shape && String(shape.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectorShapeChecksum)(shape);
    const decisionValid = !decision || (verifyGroupTypedMemoryManifestSelection(decision, expectedScopeId || String(shape?.scopeId || "")).valid === true
        && String(shape?.requestId || "") === String(decision.requestId || "")
        && String(shape?.decisionChecksum || "") === String(decision.checksum || "")
        && String(shape?.queryChecksum || "") === String(decision.queryChecksum || "")
        && String(shape?.manifestChecksum || "") === String(decision.manifestChecksum || "")
        && Number(shape?.candidateCount || 0) === Number(decision.candidateCount || 0)
        && Number(shape?.selectedCount || 0) === Number(decision.selectedRelPaths?.length || 0));
    const candidateCount = Number(shape?.candidateCount || 0);
    const selectedCount = Number(shape?.selectedCount || 0);
    const expectedRate = candidateCount > 0 ? Number((selectedCount / candidateCount).toFixed(6)) : 0;
    const selectedAge = shape?.selectedAgeDays || {};
    const selectedAgeSentinelValid = selectedCount > 0
        ? [selectedAge.newest, selectedAge.oldest, selectedAge.average].every((value) => Number(value) >= 0)
        : Number(selectedAge.newest) === -1 && Number(selectedAge.oldest) === -1 && Number(selectedAge.average) === -1;
    const valid = !!shape
        && shape.schema === "ccm-group-typed-memory-manifest-selector-shape-v1"
        && Number(shape.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION
        && shape.selectorRan === true
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(shape.scopeId || ""))
        && (!expectedScopeId || String(shape.scopeId || "") === expectedScopeId)
        && !!String(shape.requestId || "")
        && !!String(shape.decisionChecksum || "")
        && candidateCount > 0
        && selectedCount >= 0
        && selectedCount <= Math.min(candidateCount, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION)
        && Number(shape.selectionRate || 0) === expectedRate
        && selectedAgeSentinelValid
        && shape.bodyFree === true
        && checksumValid
        && decisionValid;
    return {
        valid,
        checksumValid,
        decisionValid,
        scopeValid: !expectedScopeId || String(shape?.scopeId || "") === expectedScopeId,
        selectedAgeSentinelValid,
        candidateCount,
        selectedCount,
    };
}
function recordGroupTypedMemoryManifestSelectorShape(scopeId, decision, candidates = [], input = {}) {
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { recorded: false, reason: "exact_group_gcs_scope_required" };
    const decisionVerification = verifyGroupTypedMemoryManifestSelection(decision, scopeId);
    if (!decisionVerification.valid)
        throw new Error("typed_memory_manifest_selector_shape_decision_invalid");
    if (decision.selectorRan !== true || decision.shapeTelemetryExpected !== true)
        return { recorded: false, reason: "selector_not_run" };
    const candidateRows = Array.isArray(candidates) ? candidates : [];
    if (!candidateRows.length || candidateRows.length !== Number(decision.candidateCount || 0)) {
        throw new Error("typed_memory_manifest_selector_shape_candidates_invalid");
    }
    const completedMs = Date.parse(String(decision.completedAt || ""));
    const nowMs = Number(input.nowMs || input.now_ms || (Number.isFinite(completedMs) ? completedMs : Date.now()));
    const selectedSet = new Set((decision.selectedRelPaths || []).map((item) => String(item || "").toLowerCase()));
    const selectedCandidates = candidateRows.filter((candidate) => selectedSet.has(String(candidate.filename || "").toLowerCase()));
    const selectedCount = selectedCandidates.length;
    const candidateCount = candidateRows.length;
    const core = {
        schema: "ccm-group-typed-memory-manifest-selector-shape-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION,
        scopeId,
        requestId: String(decision.requestId || ""),
        decisionChecksum: String(decision.checksum || ""),
        queryChecksum: String(decision.queryChecksum || ""),
        manifestChecksum: String(decision.manifestChecksum || ""),
        selectorStatus: String(decision.status || ""),
        selectorRan: true,
        candidateCount,
        selectedCount,
        selectionRate: candidateCount ? Number((selectedCount / candidateCount).toFixed(6)) : 0,
        candidateAgeDays: (0, group_memory_index_1.groupTypedMemoryManifestSelectorAgeStats)(candidateRows, nowMs),
        selectedAgeDays: (0, group_memory_index_1.groupTypedMemoryManifestSelectorAgeStats)(selectedCandidates, nowMs),
        selectedFreshCount: selectedCandidates.filter((candidate) => nowMs - Number(candidate.mtimeMs || nowMs) <= 86_400_000).length,
        selectedStaleCount: selectedCandidates.filter((candidate) => nowMs - Number(candidate.mtimeMs || nowMs) > 86_400_000).length,
        emptySelectionAgeSentinel: selectedCount === 0,
        bodyFree: true,
        recordedAt: String(input.recordedAt || input.recorded_at || decision.completedAt || (0, group_memory_index_1.now)()),
    };
    const shape = { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorShapeChecksum)(core) };
    if (!verifyGroupTypedMemoryManifestSelectorShape(shape, scopeId, decision).valid) {
        throw new Error("typed_memory_manifest_selector_shape_invalid");
    }
    if (input.recordShape === false || input.record_shape === false)
        return { ...shape, recorded: false };
    const dir = path.resolve((0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorShapeDir)(scopeId));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.resolve(dir, `${(0, group_memory_index_1.safeSegment)(decision.requestId, "selection")}.json`);
    if (path.dirname(file).toLowerCase() !== dir.toLowerCase())
        throw new Error("typed_memory_manifest_selector_shape_path_invalid");
    const contributeTrend = (value) => {
        try {
            return {
                value: (0, group_memory_index_1.recordGroupTypedMemoryShapeTrendContribution)(scopeId, {
                    kind: "selector",
                    eventKey: value.requestId,
                    recordedAt: value.recordedAt,
                    metrics: {
                        candidateCount: value.candidateCount,
                        selectedCount: value.selectedCount,
                        selectedAgeAverage: value.selectedAgeDays?.average,
                        freshCount: value.selectedFreshCount,
                        staleCount: value.selectedStaleCount,
                    },
                }),
                error: "",
            };
        }
        catch (error) {
            return { value: null, error: (0, group_memory_index_1.compactText)(error?.message || error, 240) };
        }
    };
    if (fs.existsSync(file)) {
        try {
            const existing = JSON.parse(fs.readFileSync(file, "utf-8"));
            if (verifyGroupTypedMemoryManifestSelectorShape(existing, scopeId, decision).valid) {
                const trend = contributeTrend(existing);
                return { ...existing, shapeFile: file, recorded: true, idempotent: true, trendContribution: trend.value, trendContributionError: trend.error };
            }
        }
        catch { }
        throw new Error("typed_memory_manifest_selector_shape_conflict");
    }
    (0, group_memory_index_1.writeTextAtomicRaw)(file, JSON.stringify(shape, null, 2));
    const trend = contributeTrend(shape);
    return { ...shape, shapeFile: file, recorded: true, idempotent: false, trendContribution: trend.value, trendContributionError: trend.error };
}
function summarizeGroupTypedMemoryManifestSelectorShapes(scopeId, options = {}) {
    const decisions = Array.isArray(options.decisions) ? options.decisions : [];
    const decisionsByRequestId = new Map(decisions.map((row) => {
        const decision = { ...row };
        delete decision.valid;
        delete decision.decisionFile;
        delete decision.recallShapeTelemetry;
        delete decision.recallShapeTelemetryFile;
        delete decision.recallShapeTelemetryError;
        return [String(row.requestId || ""), decision];
    }));
    const rows = [];
    let unreadableCount = 0;
    try {
        for (const name of fs.readdirSync((0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorShapeDir)(scopeId)).filter(name => name.endsWith(".json"))) {
            const file = path.join((0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorShapeDir)(scopeId), name);
            try {
                const shape = JSON.parse(fs.readFileSync(file, "utf-8"));
                const decision = decisionsByRequestId.get(String(shape.requestId || "")) || null;
                const verification = verifyGroupTypedMemoryManifestSelectorShape(shape, scopeId, decision);
                rows.push({ ...shape, shapeFile: file, valid: !!decision && verification.valid === true });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")) || String(b.requestId || "").localeCompare(String(a.requestId || "")));
    const expectedRequestIds = new Set(decisions.filter((decision) => decision.shapeTelemetryExpected === true).map((decision) => String(decision.requestId || "")));
    const observedRequestIds = new Set(rows.filter(row => row.valid === true).map(row => String(row.requestId || "")));
    const missingExpectedShapeCount = [...expectedRequestIds].filter(requestId => !observedRequestIds.has(requestId)).length;
    const invalidShapeCount = rows.filter(row => row.valid !== true).length + unreadableCount;
    const validRows = rows.filter(row => row.valid === true);
    const consumption = (0, group_memory_loading_part_01_2.summarizeGroupTypedMemoryManifestSelectorConsumption)(scopeId, { includeRows: true });
    const latestConsumptionByRequestId = new Map();
    for (const row of Array.isArray(consumption.rows) ? consumption.rows.filter((item) => item.valid === true) : []) {
        const requestId = String(row.requestId || "");
        const previous = latestConsumptionByRequestId.get(requestId);
        if (!previous || String(row.recordedAt || "") > String(previous.recordedAt || ""))
            latestConsumptionByRequestId.set(requestId, row);
    }
    const linkedRows = validRows.map(row => ({ ...row, consumption: latestConsumptionByRequestId.get(String(row.requestId || "")) || null }));
    const documents = linkedRows.flatMap(row => row.consumption?.documents || []);
    const candidateTotal = validRows.reduce((sum, row) => sum + Number(row.candidateCount || 0), 0);
    const selectedTotal = validRows.reduce((sum, row) => sum + Number(row.selectedCount || 0), 0);
    const usedCount = documents.filter(row => row.usageState === "used").length;
    const verifiedCount = documents.filter(row => row.usageState === "verified").length;
    const ignoredCount = documents.filter(row => row.usageState === "ignored").length;
    const unreportedCount = documents.filter(row => row.usageState === "unreported").length;
    const declaredCount = usedCount + verifiedCount + ignoredCount;
    const selectedAges = validRows.map(row => Number(row.selectedAgeDays?.average ?? -1)).filter(age => age >= 0);
    return {
        schema: "ccm-group-typed-memory-manifest-selector-shape-summary-v1",
        version: 1,
        scopeId,
        dir: (0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorShapeDir)(scopeId),
        present: rows.length > 0 || unreadableCount > 0 || expectedRequestIds.size > 0,
        valid: invalidShapeCount === 0 && missingExpectedShapeCount === 0,
        shapeCount: rows.length + unreadableCount,
        validShapeCount: validRows.length,
        invalidShapeCount,
        expectedShapeCount: expectedRequestIds.size,
        missingExpectedShapeCount,
        selectorRunCount: validRows.length,
        emptySelectionCount: validRows.filter(row => Number(row.selectedCount || 0) === 0).length,
        emptySelectionAgeSentinelCount: validRows.filter(row => Number(row.selectedCount || 0) === 0 && row.emptySelectionAgeSentinel === true && Number(row.selectedAgeDays?.average) === -1).length,
        candidateTotal,
        selectedTotal,
        selectionRate: candidateTotal ? Number((selectedTotal / candidateTotal).toFixed(6)) : null,
        averageEventSelectionRate: validRows.length ? Number((validRows.reduce((sum, row) => sum + Number(row.selectionRate || 0), 0) / validRows.length).toFixed(6)) : null,
        averageSelectedAgeDays: selectedAges.length ? Number((selectedAges.reduce((sum, age) => sum + age, 0) / selectedAges.length).toFixed(6)) : -1,
        selectedFreshCount: validRows.reduce((sum, row) => sum + Number(row.selectedFreshCount || 0), 0),
        selectedStaleCount: validRows.reduce((sum, row) => sum + Number(row.selectedStaleCount || 0), 0),
        consumptionLinkedRunCount: linkedRows.filter(row => !!row.consumption).length,
        consumedDeliveredDocumentCount: documents.length,
        consumedUsedDocumentCount: usedCount,
        consumedVerifiedDocumentCount: verifiedCount,
        consumedIgnoredDocumentCount: ignoredCount,
        consumedUnreportedDocumentCount: unreportedCount,
        consumptionReceiptCoverageRate: documents.length ? Number(((documents.length - unreportedCount) / documents.length).toFixed(6)) : null,
        consumedUtilityRate: declaredCount ? Number(((usedCount + verifiedCount) / declaredCount).toFixed(6)) : null,
        latest: linkedRows[0] || null,
        rows: options.includeRows === true ? linkedRows : undefined,
    };
}
function verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId = "") {
    const selected = Array.isArray(selection?.selectedRelPaths) ? selection.selectedRelPaths : [];
    const calibration = selection?.calibration || null;
    const calibrationVerification = calibration
        ? verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId || String(selection?.scopeId || ""), String(selection?.queryChecksum || ""))
        : { valid: true, checksumValid: true, scopeValid: true, queryValid: true, hintCount: 0 };
    const valid = !!selection
        && selection.schema === "ccm-group-typed-memory-manifest-selection-v1"
        && Number(selection.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(selection.scopeId || ""))
        && (!expectedScopeId || String(selection.scopeId || "") === expectedScopeId)
        && selected.length <= group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION
        && selected.every((item) => typeof item === "string" && path.basename(item) === item && item.toLowerCase().endsWith(".md"))
        && calibrationVerification.valid === true
        && (!calibration || String(selection.calibrationChecksum || "") === String(calibration.checksum || ""))
        && String(selection.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectionChecksum)(selection);
    return {
        valid,
        scopeValid: !expectedScopeId || String(selection?.scopeId || "") === expectedScopeId,
        checksumValid: !!selection && String(selection.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectionChecksum)(selection),
        calibrationValid: calibrationVerification.valid === true,
        calibrationChecksumValid: calibrationVerification.checksumValid === true,
        calibrationHintCount: Number(calibrationVerification.hintCount || 0),
        selectedCount: selected.length,
    };
}
function configureGroupTypedMemoryManifestSelector(executor) {
    (0, group_memory_loading_part_01_1.setConfiguredGroupTypedMemoryManifestSelectorExecutor)(typeof executor === "function" ? executor : null);
    return { configured: !!group_memory_loading_part_01_2.configuredGroupTypedMemoryManifestSelectorExecutor };
}
function buildGroupTypedMemoryManifest(scopeId, query, options = {}) {
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId)) {
        return {
            schema: "ccm-group-typed-memory-selection-manifest-v1",
            version: 1,
            scopeId,
            validScope: false,
            candidates: [],
            manifest: "",
            candidateCount: 0,
            filteredCount: 0,
            filterCounts: { invalid_scope: 1 },
            calibration: null,
            calibrationText: "",
            checksum: "",
        };
    }
    const text = String(query || "");
    const generatedAt = String(options.generatedAt || options.generated_at || (0, group_memory_index_1.now)());
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(scopeId);
    const already = new Set((options.alreadySurfaced || options.already_surfaced || [])
        .map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const targetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(text, options.targetPaths || options.target_paths || []);
    const topicIndex = (0, group_memory_index_1.buildGroupSessionModelExtractionTopicRecallIndex)(scopeId);
    const staleIndex = (0, group_memory_index_1.buildGroupTypedMemoryPendingStaleConflictIndex)(scopeId);
    const filterCounts = {};
    const filtered = (reason) => { filterCounts[reason] = Number(filterCounts[reason] || 0) + 1; };
    const candidates = index.docs
        .filter((doc) => {
        const relPath = String(doc.relPath || "");
        const relKey = relPath.toLowerCase();
        const fileKey = String(doc.file || "").toLowerCase();
        if (already.has(relKey) || already.has(fileKey)) {
            filtered("already_surfaced");
            return false;
        }
        if ((staleIndex.byRelPath.get(relKey) || []).length > 0) {
            filtered("pending_stale_conflict");
            return false;
        }
        if (String(doc.source || "") === "auto:model-extraction-evidence-admission"
            && (!topicIndex.valid || !topicIndex.byRelPath.has(relKey))) {
            filtered("model_topic_archive_invalid_or_unbound");
            return false;
        }
        const pathCondition = (0, group_memory_index_1.evaluateTypedMemoryPathCondition)(doc, targetPaths);
        if (pathCondition.conditional && !pathCondition.matched) {
            filtered("path_condition_miss");
            return false;
        }
        return true;
    })
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0) || String(a.relPath).localeCompare(String(b.relPath)))
        .slice(0, Math.max(1, Math.min(group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES, Number(options.maxFiles || options.max_files || group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES))))
        .map((doc) => ({
        filename: String(doc.relPath || ""),
        filePath: String(doc.file || ""),
        mtimeMs: Number(doc.mtimeMs || 0),
        mtime: new Date(Number(doc.mtimeMs || Date.now())).toISOString(),
        description: doc.description ? (0, group_memory_index_1.compactText)(doc.description, 300) : "",
        type: (0, group_memory_index_1.normalizeMemoryType)(doc.type),
        source: String(doc.source || ""),
    }));
    const manifest = candidates.map((item) => {
        const tag = item.type ? `[${item.type}] ` : "";
        return item.description
            ? `- ${tag}${item.filename} (${item.mtime}): ${item.description}`
            : `- ${tag}${item.filename} (${item.mtime})`;
    }).join("\n");
    const calibration = buildGroupTypedMemoryManifestSelectorCalibration(scopeId, text, {
        nowMs: options.nowMs || options.now_ms,
        generatedAt,
        lookbackDays: options.calibrationLookbackDays || options.calibration_lookback_days,
        halfLifeDays: options.calibrationHalfLifeDays || options.calibration_half_life_days,
        maxHints: options.calibrationMaxHints || options.calibration_max_hints,
        candidateRelPaths: candidates.map((item) => item.filename),
    });
    const calibrationText = (calibration.hints || []).map((hint) => `- ${hint.relPath}: ${hint.calibration}; strong outcomes used=${hint.usedCount}, verified=${hint.verifiedCount}, ignored=${hint.ignoredCount}`).join("\n");
    const manifestCore = {
        schema: "ccm-group-typed-memory-selection-manifest-v1",
        version: 1,
        scopeId,
        validScope: true,
        candidates,
        manifest,
        candidateCount: candidates.length,
        sourceDocumentCount: index.docs.length,
        filteredCount: Object.values(filterCounts).reduce((sum, count) => sum + Number(count || 0), 0),
        filterCounts,
        targetPaths,
        alreadySurfacedCount: already.size,
        calibration,
        calibrationText,
        generatedAt,
    };
    return { ...manifestCore, checksum: (0, group_memory_index_1.checksum)(JSON.stringify(manifestCore), 64) };
}
async function selectGroupTypedMemoryManifest(scopeId, query, options = {}) {
    const startedAt = (0, group_memory_index_1.now)();
    const requestId = `ms_${(0, group_memory_index_1.checksum)([scopeId, query, startedAt, crypto.randomBytes(8).toString("hex")], 24)}`;
    const queryChecksum = (0, group_memory_index_1.checksum)(String(query || ""), 64);
    const recentTools = (0, group_memory_index_1.uniqueStrings)((options.recentTools || options.recent_tools || []).map(String), 20);
    const manifest = buildGroupTypedMemoryManifest(scopeId, query, options);
    const finish = (input) => {
        const selectorRan = input.selectorRan === true;
        const decision = (0, group_memory_index_1.finalizeGroupTypedMemoryManifestSelection)(scopeId, {
            requestId,
            queryChecksum,
            manifestChecksum: manifest.checksum || "",
            candidateCount: manifest.candidateCount || 0,
            filterCounts: manifest.filterCounts || {},
            calibration: manifest.calibration || null,
            calibrationChecksum: manifest.calibration?.checksum || "",
            calibrationHintCount: Number(manifest.calibration?.hintCount || 0),
            calibrationEvidenceCount: Number(manifest.calibration?.evidenceCount || 0),
            recentTools,
            startedAt,
            completedAt: (0, group_memory_index_1.now)(),
            ...input,
            selectorRan,
            shapeTelemetryExpected: selectorRan && options.recordDecision !== false,
        }, options);
        if (selectorRan) {
            try {
                const shape = recordGroupTypedMemoryManifestSelectorShape(scopeId, decision, manifest.candidates || [], {
                    recordShape: options.recordDecision !== false,
                });
                decision.recallShapeTelemetry = shape;
                decision.recallShapeTelemetryFile = shape.shapeFile || "";
            }
            catch (error) {
                decision.recallShapeTelemetryError = (0, group_memory_index_1.compactText)(error?.message || error, 240);
            }
        }
        return decision;
    };
    if (!manifest.validScope)
        return finish({ status: "invalid_scope", reason: "exact_group_gcs_scope_required", selectedRelPaths: [] });
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options))
        return finish({ status: "ignored", reason: "user_requested_ignore_memory", selectedRelPaths: [] });
    if (!manifest.candidateCount)
        return finish({ status: "no_candidates", reason: "manifest_empty_after_filters", selectedRelPaths: [] });
    if (options.signal?.aborted)
        return finish({ status: "aborted", reason: "selector_aborted_before_call", selectedRelPaths: [] });
    const executor = options.executor || group_memory_loading_part_01_2.configuredGroupTypedMemoryManifestSelectorExecutor;
    if (typeof executor !== "function")
        return finish({ status: "unavailable", reason: "manifest_selector_executor_not_configured", selectedRelPaths: [] });
    const toolsSection = recentTools.length ? `\n\nRecently used tools: ${recentTools.join(", ")}` : "";
    const calibrationSection = manifest.calibrationText
        ? `\n\nHistorical outcomes for this exact group-chat session and exact query (advisory only; do not auto-select or auto-reject):\n${manifest.calibrationText}`
        : "";
    try {
        const response = await executor({
            schema: "ccm-group-typed-memory-manifest-selector-request-v1",
            version: 1,
            requestId,
            scopeId,
            groupId: String(options.groupId || options.group_id || scopeId.slice(0, scopeId.lastIndexOf("--gcs_"))),
            groupSessionId: String(options.groupSessionId || options.group_session_id || scopeId.slice(scopeId.lastIndexOf("--") + 2)),
            query: (0, group_memory_index_1.compactText)(query, 6000),
            systemPrompt: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SYSTEM_PROMPT,
            userPrompt: `Query: ${(0, group_memory_index_1.compactText)(query, 6000)}\n\nAvailable memories:\n${manifest.manifest}${toolsSection}${calibrationSection}`,
            recentTools,
            manifest: manifest.manifest,
            manifestChecksum: manifest.checksum,
            calibration: manifest.calibration,
            calibrationChecksum: manifest.calibration?.checksum || "",
            maxTokens: 256,
            maxSelection: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION,
            outputSchema: {
                type: "object",
                properties: { selected_memories: { type: "array", items: { type: "string" } } },
                required: ["selected_memories"],
                additionalProperties: false,
            },
            signal: options.signal,
        });
        if (options.signal?.aborted)
            return finish({ status: "aborted", reason: "selector_aborted_after_call", selectedRelPaths: [], selectorRan: true });
        const rawSelected = (0, group_memory_index_1.parseGroupTypedMemoryManifestSelectorOutput)(response);
        const validNames = new Set(manifest.candidates.map((item) => item.filename));
        const selectedRelPaths = [];
        const unknownFilenames = [];
        let invalidFilenameCount = 0;
        for (const raw of rawSelected) {
            if (typeof raw !== "string" || path.basename(raw) !== raw || !raw.toLowerCase().endsWith(".md")) {
                invalidFilenameCount += 1;
                continue;
            }
            if (!validNames.has(raw)) {
                unknownFilenames.push(raw);
                continue;
            }
            if (!selectedRelPaths.includes(raw))
                selectedRelPaths.push(raw);
            if (selectedRelPaths.length >= group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION)
                break;
        }
        return finish({
            status: selectedRelPaths.length ? "selected" : "empty",
            reason: selectedRelPaths.length ? "selector_returned_certain_memories" : "selector_returned_empty",
            selectedRelPaths,
            unknownFilenames,
            invalidFilenameCount,
            selectorProject: response?.project || "",
            selectorAgentType: response?.agentType || "",
            selectorModel: response?.model || "",
            selectorRan: true,
        });
    }
    catch (error) {
        return finish({ status: "failed", reason: (0, group_memory_index_1.compactText)(error?.message || error, 240), selectedRelPaths: [], selectorRan: true });
    }
}
function summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options = {}) {
    const dir = (0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorOutcomeDir)(scopeId);
    const decisions = Array.isArray(options.decisions) ? options.decisions : [];
    const decisionsByRequestId = new Map(decisions.map((row) => {
        const selection = { ...row };
        delete selection.valid;
        delete selection.decisionFile;
        return [String(row.requestId || ""), selection];
    }));
    const rows = [];
    let unreadableCount = 0;
    try {
        for (const name of fs.readdirSync(dir).filter(name => name.toLowerCase().endsWith(".json"))) {
            const file = path.join(dir, name);
            try {
                const outcome = JSON.parse(fs.readFileSync(file, "utf-8"));
                const selection = decisionsByRequestId.get(String(outcome.requestId || "")) || null;
                const verification = (0, group_memory_loading_part_01_2.verifyGroupTypedMemoryManifestSelectorOutcome)(outcome, scopeId, selection);
                rows.push({ ...outcome, outcomeFile: file, valid: verification.valid === true && !!selection });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || String(b.requestId || "").localeCompare(String(a.requestId || "")));
    const attachedByRequestId = new Map(rows.filter(row => row.stage === "attached").map(row => [String(row.requestId || ""), row]));
    for (const row of rows.filter(row => row.stage === "committed")) {
        const attached = attachedByRequestId.get(String(row.requestId || ""));
        if (!attached
            || attached.valid !== true
            || String(row.attachedOutcomeChecksum || "") !== String(attached.checksum || "")
            || String(row.capsuleChecksum || "") !== String(attached.capsuleChecksum || "")) {
            row.valid = false;
            row.chainInvalid = true;
        }
    }
    const validRows = rows.filter(row => row.valid === true);
    const attachedRows = validRows.filter(row => row.stage === "attached");
    const committedRows = validRows.filter(row => row.stage === "committed");
    const attachedRequestIds = new Set(attachedRows.map(row => String(row.requestId || "")));
    const committedRequestIds = new Set(committedRows.map(row => String(row.requestId || "")));
    const selectedDecisions = decisions.filter((row) => row.valid === true && String(row.status || "") === "selected");
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const staleAfterMs = Math.max(1_000, Number(options.staleAfterMs || options.stale_after_ms || 5 * 60_000));
    const staleUnattachedDecisionCount = selectedDecisions.filter((row) => {
        if (attachedRequestIds.has(String(row.requestId || "")))
            return false;
        const completedMs = Date.parse(String(row.completedAt || ""));
        return Number.isFinite(completedMs) && nowMs - completedMs >= staleAfterMs;
    }).length;
    const staleUncommittedAttachmentCount = attachedRows.filter(row => {
        if (committedRequestIds.has(String(row.requestId || "")))
            return false;
        const createdMs = Date.parse(String(row.createdAt || ""));
        return Number.isFinite(createdMs) && nowMs - createdMs >= staleAfterMs;
    }).length;
    const selectedAttachedDocumentCount = attachedRows.reduce((sum, row) => sum + Number(row.attachedSelectedRelPaths?.length || 0), 0);
    const selectedCommittedDocumentCount = committedRows.reduce((sum, row) => sum + Number(row.attachedSelectedRelPaths?.length || 0), 0);
    const selectedNotRecalledDocumentCount = attachedRows.reduce((sum, row) => sum + Number(row.selectedNotRecalledRelPaths?.length || 0), 0);
    const recalledNotAttachedDocumentCount = attachedRows.reduce((sum, row) => sum + Number(row.recalledNotAttachedRelPaths?.length || 0), 0);
    const invalidOutcomeCount = rows.filter(row => row.valid !== true).length + unreadableCount;
    return {
        schema: "ccm-group-typed-memory-manifest-selector-outcome-summary-v1",
        version: 1,
        scopeId,
        dir,
        present: rows.length > 0 || unreadableCount > 0,
        valid: invalidOutcomeCount === 0,
        closureValid: invalidOutcomeCount === 0 && staleUnattachedDecisionCount === 0 && staleUncommittedAttachmentCount === 0,
        outcomeCount: rows.length + unreadableCount,
        attachedOutcomeCount: attachedRows.length,
        committedOutcomeCount: committedRows.length,
        invalidOutcomeCount,
        selectedAttachedDocumentCount,
        selectedCommittedDocumentCount,
        selectedNotRecalledDocumentCount,
        recalledNotAttachedDocumentCount,
        selectedDecisionWithoutAttachmentCount: selectedDecisions.filter((row) => !attachedRequestIds.has(String(row.requestId || ""))).length,
        attachmentWithoutCommitCount: attachedRows.filter(row => !committedRequestIds.has(String(row.requestId || ""))).length,
        staleUnattachedDecisionCount,
        staleUncommittedAttachmentCount,
        closureGapCount: invalidOutcomeCount + staleUnattachedDecisionCount + staleUncommittedAttachmentCount,
        latest: rows[0] ? {
            requestId: String(rows[0].requestId || ""),
            stage: String(rows[0].stage || ""),
            valid: rows[0].valid === true,
            selectedCount: Number(rows[0].selectedRelPaths?.length || 0),
            recalledCount: Number(rows[0].recalledSelectedRelPaths?.length || 0),
            attachedCount: Number(rows[0].attachedSelectedRelPaths?.length || 0),
            createdAt: String(rows[0].createdAt || ""),
        } : null,
        rows: options.includeRows === true ? rows : undefined,
    };
}
function summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options = {}) {
    const dir = (0, group_memory_loading_part_01_2.getGroupTypedMemoryManifestSelectorDecisionDir)(scopeId);
    const limit = Math.max(1, Math.min(200, Number(options.limit || 200)));
    const rows = [];
    let unreadableCount = 0;
    try {
        const files = fs.readdirSync(dir)
            .filter(name => name.toLowerCase().endsWith(".json"))
            .map(name => path.join(dir, name));
        for (const file of files) {
            try {
                const decision = JSON.parse(fs.readFileSync(file, "utf-8"));
                const verification = verifyGroupTypedMemoryManifestSelection(decision, scopeId);
                rows.push({ ...decision, decisionFile: file, valid: verification.valid === true });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")) || String(b.requestId || "").localeCompare(String(a.requestId || "")));
    const bounded = rows.slice(0, limit);
    const validRows = bounded.filter(row => row.valid === true);
    const calibratedRows = validRows.filter(row => row.calibration?.schema === "ccm-group-typed-memory-manifest-selector-calibration-v1");
    const calibrationHints = calibratedRows.flatMap(row => Array.isArray(row.calibration?.hints) ? row.calibration.hints : []);
    const statusCounts = {};
    for (const row of validRows)
        statusCounts[String(row.status || "unknown")] = Number(statusCounts[String(row.status || "unknown")] || 0) + 1;
    const selectedDocumentCount = validRows.reduce((sum, row) => sum + Number(row.selectedRelPaths?.length || 0), 0);
    const latest = bounded[0] || null;
    const outcomeSummary = summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, {
        decisions: validRows,
        nowMs: options.nowMs || options.now_ms,
        staleAfterMs: options.staleAfterMs || options.stale_after_ms,
        includeRows: options.includeOutcomeRows === true || options.include_outcome_rows === true,
    });
    const consumptionSummary = (0, group_memory_loading_part_01_2.summarizeGroupTypedMemoryManifestSelectorConsumption)(scopeId, {
        nowMs: options.nowMs || options.now_ms,
        staleAfterMs: options.staleAfterMs || options.stale_after_ms,
        includeRows: options.includeConsumptionRows === true || options.include_consumption_rows === true,
    });
    const shapeSummary = summarizeGroupTypedMemoryManifestSelectorShapes(scopeId, {
        decisions: validRows,
        includeRows: true,
    });
    const writeShapeSummary = (0, group_memory_index_1.summarizeGroupTypedMemoryWriteShapes)(scopeId, { includeRows: true });
    const shapeDrift = (0, group_memory_index_1.buildGroupTypedMemoryShapeDrift)(scopeId, shapeSummary.rows || [], writeShapeSummary.rows || [], {
        nowMs: options.nowMs || options.now_ms,
        recentWindowDays: options.recentWindowDays || options.recent_window_days,
        baselineWindowDays: options.baselineWindowDays || options.baseline_window_days,
        minimumSelectorRuns: options.minimumSelectorRuns || options.minimum_selector_runs,
        minimumConsumptionDocuments: options.minimumConsumptionDocuments || options.minimum_consumption_documents,
    });
    const shapeTrend = (0, group_memory_index_1.summarizeGroupTypedMemoryShapeTrend)(scopeId, {
        nowMs: options.nowMs || options.now_ms,
        recentWindowDays: options.recentWindowDays || options.recent_window_days,
        baselineWindowDays: options.baselineWindowDays || options.baseline_window_days,
        includeBuckets: options.includeTrendBuckets === true || options.include_trend_buckets === true,
    });
    const shapeTrendIncidents = (0, group_memory_index_1.summarizeGroupTypedMemoryShapeTrendIncidents)(scopeId, {
        includeEvents: options.includeTrendIncidentEvents === true || options.include_trend_incident_events === true,
    });
    const publicShapeSummary = options.includeShapeRows === true || options.include_shape_rows === true
        ? shapeSummary
        : { ...shapeSummary, rows: undefined };
    const publicWriteShapeSummary = options.includeWriteShapeRows === true || options.include_write_shape_rows === true
        ? writeShapeSummary
        : { ...writeShapeSummary, rows: undefined };
    return {
        schema: "ccm-group-typed-memory-manifest-selector-summary-v1",
        version: 1,
        scopeId,
        dir,
        present: rows.length > 0 || unreadableCount > 0,
        valid: unreadableCount === 0 && rows.every(row => row.valid === true) && outcomeSummary.valid === true && consumptionSummary.valid === true && shapeSummary.valid === true && writeShapeSummary.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeDrift)(shapeDrift, scopeId).valid === true && shapeTrend.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendSummary)(shapeTrend, scopeId).valid === true && shapeTrendIncidents.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendIncidentSummary)(shapeTrendIncidents, scopeId).valid === true,
        closureValid: outcomeSummary.closureValid === true,
        consumptionClosureValid: consumptionSummary.closureValid === true,
        decisionCount: rows.length + unreadableCount,
        validDecisionCount: rows.filter(row => row.valid === true).length,
        invalidDecisionCount: rows.filter(row => row.valid !== true).length + unreadableCount,
        selectedDecisionCount: Number(statusCounts.selected || 0),
        emptyDecisionCount: Number(statusCounts.empty || 0) + Number(statusCounts.no_candidates || 0),
        failedDecisionCount: Number(statusCounts.failed || 0) + Number(statusCounts.unavailable || 0) + Number(statusCounts.aborted || 0),
        ignoredDecisionCount: Number(statusCounts.ignored || 0),
        selectedDocumentCount,
        averageSelectedDocuments: validRows.length ? Number((selectedDocumentCount / validRows.length).toFixed(3)) : 0,
        calibrationObservedDecisionCount: calibratedRows.length,
        calibrationHintedDecisionCount: calibratedRows.filter(row => Number(row.calibrationHintCount || row.calibration?.hintCount || 0) > 0).length,
        calibrationEvidenceCount: calibratedRows.reduce((sum, row) => sum + Number(row.calibrationEvidenceCount || row.calibration?.evidenceCount || 0), 0),
        calibrationHintCount: calibrationHints.length,
        calibrationSupportHintCount: calibrationHints.filter((hint) => hint.calibration === "support").length,
        calibrationCautionHintCount: calibrationHints.filter((hint) => hint.calibration === "caution").length,
        calibrationMixedHintCount: calibrationHints.filter((hint) => hint.calibration === "mixed").length,
        shapeSummary: publicShapeSummary,
        shapeValid: shapeSummary.valid === true,
        shapeCount: Number(shapeSummary.shapeCount || 0),
        shapeInvalidCount: Number(shapeSummary.invalidShapeCount || 0),
        shapeMissingExpectedCount: Number(shapeSummary.missingExpectedShapeCount || 0),
        shapeSelectorRunCount: Number(shapeSummary.selectorRunCount || 0),
        shapeEmptySelectionCount: Number(shapeSummary.emptySelectionCount || 0),
        shapeCandidateTotal: Number(shapeSummary.candidateTotal || 0),
        shapeSelectedTotal: Number(shapeSummary.selectedTotal || 0),
        shapeSelectionRate: shapeSummary.selectionRate,
        shapeAverageSelectedAgeDays: Number(shapeSummary.averageSelectedAgeDays ?? -1),
        shapeSelectedFreshCount: Number(shapeSummary.selectedFreshCount || 0),
        shapeSelectedStaleCount: Number(shapeSummary.selectedStaleCount || 0),
        shapeConsumptionLinkedRunCount: Number(shapeSummary.consumptionLinkedRunCount || 0),
        shapeConsumedDeliveredDocumentCount: Number(shapeSummary.consumedDeliveredDocumentCount || 0),
        shapeConsumedUsedDocumentCount: Number(shapeSummary.consumedUsedDocumentCount || 0),
        shapeConsumedVerifiedDocumentCount: Number(shapeSummary.consumedVerifiedDocumentCount || 0),
        shapeConsumedIgnoredDocumentCount: Number(shapeSummary.consumedIgnoredDocumentCount || 0),
        shapeConsumedUnreportedDocumentCount: Number(shapeSummary.consumedUnreportedDocumentCount || 0),
        shapeConsumptionReceiptCoverageRate: shapeSummary.consumptionReceiptCoverageRate,
        shapeConsumedUtilityRate: shapeSummary.consumedUtilityRate,
        writeShapeSummary: publicWriteShapeSummary,
        writeShapePresent: writeShapeSummary.present === true,
        writeShapeValid: writeShapeSummary.valid === true,
        writeShapeCount: Number(writeShapeSummary.shapeCount || 0),
        writeShapeInvalidCount: Number(writeShapeSummary.invalidShapeCount || 0),
        writeShapeCreateCount: Number(writeShapeSummary.createCount || 0),
        writeShapeUpdateCount: Number(writeShapeSummary.updateCount || 0),
        writeShapeNoopCount: Number(writeShapeSummary.noopCount || 0),
        writeShapeChangedCount: Number(writeShapeSummary.changedCount || 0),
        writeShapeBodyTruncatedCount: Number(writeShapeSummary.bodyTruncatedCount || 0),
        writeShapeNearBodyLimitCount: Number(writeShapeSummary.nearBodyLimitCount || 0),
        writeShapeTotalGrowthBytes: Number(writeShapeSummary.totalGrowthBytes || 0),
        writeShapeAverageAfterBytes: Number(writeShapeSummary.averageAfterBytes || 0),
        writeShapeMaxAfterBytes: Number(writeShapeSummary.maxAfterBytes || 0),
        shapeDrift,
        shapeDriftValid: (0, group_memory_index_1.verifyGroupTypedMemoryShapeDrift)(shapeDrift, scopeId).valid === true,
        shapeDriftStatus: String(shapeDrift.status || "unobserved"),
        shapeDriftSignalCount: Number(shapeDrift.signalCount || 0),
        shapeDriftWarningSignalCount: Number(shapeDrift.warningSignalCount || 0),
        shapeTrend,
        shapeTrendPresent: shapeTrend.ledgerPresent === true,
        shapeTrendValid: shapeTrend.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendSummary)(shapeTrend, scopeId).valid === true,
        shapeTrendStatus: String(shapeTrend.status || "unobserved"),
        shapeTrendBucketCount: Number(shapeTrend.bucketCount || 0),
        shapeTrendMutableBucketCount: Number(shapeTrend.mutableBucketCount || 0),
        shapeTrendSealedBucketCount: Number(shapeTrend.sealedBucketCount || 0),
        shapeTrendGeneration: Number(shapeTrend.generation || 0),
        shapeTrendSignalCount: Number(shapeTrend.signalCount || 0),
        shapeTrendWarningSignalCount: Number(shapeTrend.warningSignalCount || 0),
        shapeTrendRecoveredFromBackup: shapeTrend.recoveredFromBackup === true,
        shapeTrendExtendsBeyondHotRetention: shapeTrend.extendsBeyondHotRetention === true,
        shapeTrendIncidents,
        shapeTrendIncidentPresent: shapeTrendIncidents.ledgerPresent === true,
        shapeTrendIncidentValid: shapeTrendIncidents.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendIncidentSummary)(shapeTrendIncidents, scopeId).valid === true,
        shapeTrendIncidentStatus: String(shapeTrendIncidents.status || "unobserved"),
        shapeTrendIncidentEventCount: Number(shapeTrendIncidents.eventCount || 0),
        shapeTrendIncidentCount: Number(shapeTrendIncidents.incidentCount || 0),
        shapeTrendIncidentPendingCount: Number(shapeTrendIncidents.pendingCount || 0),
        shapeTrendIncidentAcknowledgedCount: Number(shapeTrendIncidents.acknowledgedCount || 0),
        shapeTrendIncidentResolvedCount: Number(shapeTrendIncidents.resolvedCount || 0),
        shapeTrendIncidentRecoveredFromBackup: shapeTrendIncidents.recoveredFromBackup === true,
        shapeTrendActiveIncident: shapeTrendIncidents.activeIncident || null,
        outcomeSummary,
        attachedOutcomeCount: outcomeSummary.attachedOutcomeCount,
        committedOutcomeCount: outcomeSummary.committedOutcomeCount,
        invalidOutcomeCount: outcomeSummary.invalidOutcomeCount,
        selectedAttachedDocumentCount: outcomeSummary.selectedAttachedDocumentCount,
        selectedCommittedDocumentCount: outcomeSummary.selectedCommittedDocumentCount,
        selectedNotRecalledDocumentCount: outcomeSummary.selectedNotRecalledDocumentCount,
        recalledNotAttachedDocumentCount: outcomeSummary.recalledNotAttachedDocumentCount,
        selectedDecisionWithoutAttachmentCount: outcomeSummary.selectedDecisionWithoutAttachmentCount,
        attachmentWithoutCommitCount: outcomeSummary.attachmentWithoutCommitCount,
        staleUnattachedDecisionCount: outcomeSummary.staleUnattachedDecisionCount,
        staleUncommittedAttachmentCount: outcomeSummary.staleUncommittedAttachmentCount,
        closureGapCount: outcomeSummary.closureGapCount,
        consumptionSummary,
        consumptionOutcomeCount: consumptionSummary.outcomeCount,
        consumptionDeliveredDocumentCount: consumptionSummary.deliveredDocumentCount,
        consumptionUsedDocumentCount: consumptionSummary.usedDocumentCount,
        consumptionVerifiedDocumentCount: consumptionSummary.verifiedDocumentCount,
        consumptionIgnoredDocumentCount: consumptionSummary.ignoredDocumentCount,
        consumptionUnreportedDocumentCount: consumptionSummary.unreportedDocumentCount,
        consumptionWeakReceiptBindingCount: consumptionSummary.weakReceiptBindingCount,
        consumptionUnexpectedClaimCount: consumptionSummary.unexpectedClaimCount,
        consumptionStaleCommittedWithoutConsumptionCount: consumptionSummary.staleCommittedWithoutConsumptionCount,
        consumptionClosureGapCount: consumptionSummary.closureGapCount,
        latest: latest ? {
            requestId: String(latest.requestId || ""),
            status: String(latest.status || ""),
            valid: latest.valid === true,
            candidateCount: Number(latest.candidateCount || 0),
            selectedCount: Number(latest.selectedRelPaths?.length || 0),
            selectedRelPaths: Array.isArray(latest.selectedRelPaths) ? latest.selectedRelPaths.slice(0, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION) : [],
            completedAt: String(latest.completedAt || ""),
            selectorProject: String(latest.selectorProject || ""),
            selectorAgentType: String(latest.selectorAgentType || ""),
            selectorModel: String(latest.selectorModel || ""),
            calibrationChecksum: String(latest.calibrationChecksum || ""),
            calibrationHintCount: Number(latest.calibrationHintCount || latest.calibration?.hintCount || 0),
            calibrationEvidenceCount: Number(latest.calibrationEvidenceCount || latest.calibration?.evidenceCount || 0),
            calibration: latest.calibration || null,
            decisionFile: String(latest.decisionFile || ""),
        } : null,
        rows: options.includeRows === true ? bounded.map(row => ({
            requestId: String(row.requestId || ""),
            status: String(row.status || ""),
            valid: row.valid === true,
            candidateCount: Number(row.candidateCount || 0),
            selectedCount: Number(row.selectedRelPaths?.length || 0),
            calibrationHintCount: Number(row.calibrationHintCount || row.calibration?.hintCount || 0),
            calibrationEvidenceCount: Number(row.calibrationEvidenceCount || row.calibration?.evidenceCount || 0),
            completedAt: String(row.completedAt || ""),
        })) : undefined,
    };
}
//# sourceMappingURL=group-memory-loading-part-02.js.map