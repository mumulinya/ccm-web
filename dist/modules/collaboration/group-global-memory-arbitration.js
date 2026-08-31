"use strict";
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
exports.getGroupGlobalMemoryArbitrationLedgerFile = getGroupGlobalMemoryArbitrationLedgerFile;
exports.buildChildGlobalAgentMemoryHealthGate = buildChildGlobalAgentMemoryHealthGate;
exports.buildChildGlobalAgentMemoryContext = buildChildGlobalAgentMemoryContext;
exports.globalMemorySuppressionKey = globalMemorySuppressionKey;
exports.listGroupGlobalMemoryArbitrationLedgerFiles = listGroupGlobalMemoryArbitrationLedgerFiles;
exports.buildCrossGroupGlobalMemorySuppressionIndex = buildCrossGroupGlobalMemorySuppressionIndex;
exports.buildCrossGroupGlobalMemorySuppressionForItem = buildCrossGroupGlobalMemorySuppressionForItem;
exports.applyCrossGroupGlobalMemorySuppression = applyCrossGroupGlobalMemorySuppression;
exports.summarizeCrossGroupGlobalMemorySuppression = summarizeCrossGroupGlobalMemorySuppression;
exports.readGroupGlobalMemoryArbitrationLedger = readGroupGlobalMemoryArbitrationLedger;
exports.globalMemoryArbitrationSignature = globalMemoryArbitrationSignature;
exports.summarizeGroupGlobalMemoryArbitrationLedger = summarizeGroupGlobalMemoryArbitrationLedger;
exports.recordGroupGlobalMemoryArbitrationLedger = recordGroupGlobalMemoryArbitrationLedger;
exports.renderGlobalMemoryArbitrationTypedMemoryBody = renderGlobalMemoryArbitrationTypedMemoryBody;
exports.distillGroupGlobalMemoryArbitrationToTypedMemory = distillGroupGlobalMemoryArbitrationToTypedMemory;
exports.memoryArbitrationTokens = memoryArbitrationTokens;
exports.memoryArbitrationTimestamp = memoryArbitrationTimestamp;
exports.memoryArbitrationTextForItem = memoryArbitrationTextForItem;
exports.collectChildGlobalMemoryLocalEvidence = collectChildGlobalMemoryLocalEvidence;
exports.uniqueMemoryArbitrationValues = uniqueMemoryArbitrationValues;
exports.memoryArbitrationEntities = memoryArbitrationEntities;
exports.memoryArbitrationSignals = memoryArbitrationSignals;
exports.scoreMemorySemanticContradiction = scoreMemorySemanticContradiction;
exports.arbitrateChildGlobalAgentMemoryItem = arbitrateChildGlobalAgentMemoryItem;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("../../system/context-budget");
const group_memory_index_1 = require("./group-memory-index");
const memory_1 = require("../../agents/global/memory");
const group_memory_shared_1 = require("./group-memory-shared");
function getGroupGlobalMemoryArbitrationLedgerFile(groupId) {
    return path.join(group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, `${String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown"}.json`);
}
function buildChildGlobalAgentMemoryHealthGate(input = {}) {
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const selftestBypass = input.allowSelftestGlobalMemoryForSelfTest === true || input.allow_selftest_global_memory_for_selftest === true;
    let scan = null;
    let error = "";
    try {
        scan = (0, memory_1.scanGlobalAgentMemorySelfTestContamination)({
            includeResidue: input.includeResidue !== false && input.include_residue !== false,
            limit: input.limit || 40,
        });
    }
    catch (err) {
        error = err?.message || String(err);
    }
    const activeCount = Number(scan?.active_contamination_count || 0);
    const residueCount = Number(scan?.residue_contamination_count || 0);
    const status = selftestBypass ? "ok" : error ? "fail" : activeCount > 0 ? "fail" : residueCount > 0 ? "warn" : "ok";
    const action = status === "fail"
        ? "block_global_agent_memory_recall"
        : status === "warn"
            ? "use_active_global_memory_with_residue_warning"
            : selftestBypass
                ? "allow_global_agent_memory_recall_for_selftest_fixture"
                : "allow_global_agent_memory_recall";
    const summarizeRow = (row = {}) => ({
        file: row.file || "",
        role: row.role || "",
        kind: row.kind || "",
        id: row.id || "",
        active: row.active === true,
    });
    const rows = Array.isArray(scan?.rows) ? scan.rows : [];
    const gate = {
        schema: "ccm-child-global-agent-memory-health-gate-v1",
        version: group_memory_shared_1.GROUP_GLOBAL_MEMORY_HEALTH_GATE_VERSION,
        gate_id: `ggmh_${crypto.createHash("sha256").update(JSON.stringify([
            input.groupId || input.group_id || "",
            input.targetProject || input.target_project || "",
            input.task || input.query || "",
            activeCount,
            residueCount,
            scan?.generatedAt || generatedAt,
        ])).digest("hex").slice(0, 18)}`,
        generated_at: generatedAt,
        group_id: String(input.groupId || input.group_id || ""),
        target_project: String(input.targetProject || input.target_project || ""),
        status,
        pass: status !== "fail",
        action,
        selftest_bypass: selftestBypass,
        file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
        scan_status: scan?.status || (error ? "error" : "unknown"),
        active_contamination_count: activeCount,
        residue_contamination_count: residueCount,
        error: (0, group_memory_shared_1.compactMemoryText)(error, 420),
        active_rows: rows.filter((row) => row.active === true).slice(0, 8).map(summarizeRow),
        residue_rows: rows.filter((row) => row.active !== true).slice(0, 8).map(summarizeRow),
        policy: {
            fail_blocks_global_memory_recall: true,
            residue_warn_allows_active_memory: true,
            child_agent_must_verify_current_source: true,
            no_contaminated_preview_in_context: true,
        },
        receipt_contract: {
            required_fields: ["globalMemoryUsage", "memoryUsed", "memoryIgnored"],
            on_fail: "memoryIgnored must mention this gate and no global_memory_id should be used",
            on_warn: "globalMemoryUsage may use active memory but should acknowledge residue warning if relevant",
        },
    };
    return {
        ...gate,
        context_budget: (0, context_budget_1.buildContextBudget)({ context: gate, maxChars: 5000, maxTokens: 12_000 }),
    };
}
function buildChildGlobalAgentMemoryContext(query, options = {}) {
    if (options.includeGlobalAgentMemory === false || options.include_global_agent_memory === false) {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            included: false,
            ignored: false,
            reason: "disabled_by_options",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            items: [],
            citations: [],
            itemCount: 0,
        };
    }
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options)) {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            included: false,
            ignored: true,
            reason: "user_requested_ignore_memory",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            items: [],
            citations: [],
            itemCount: 0,
        };
    }
    const memoryHealthGate = buildChildGlobalAgentMemoryHealthGate({
        groupId: options.groupId || options.group_id,
        targetProject: options.targetProject || options.target_project,
        query,
        generatedAt: options.generatedAt || options.generated_at,
        allowSelftestGlobalMemoryForSelfTest: options.allowSelftestGlobalMemoryForSelfTest || options.allow_selftest_global_memory_for_selftest,
    });
    if (memoryHealthGate.status === "fail") {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            version: 1,
            included: false,
            ignored: false,
            healthBlocked: true,
            reason: "global_agent_memory_health_gate_failed",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            memory_health_gate: memoryHealthGate,
            arbitration: {
                schema: "ccm-child-global-agent-memory-arbitration-summary-v1",
                status: "health_blocked",
                localEvidenceCount: 0,
                demotedCount: 0,
                conflictCount: 0,
                crossGroupSuppressedCount: 0,
                crossGroupScannedLedgerCount: 0,
                activeCount: 0,
                authorityOrder: ["current_task_explicit_user_instruction", "current_group_memory", "typed_MEMORY.md", "global_agent_memory"],
            },
            crossGroupSuppression: {
                schema: "ccm-cross-group-global-memory-suppression-summary-v1",
                sourceDir: group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
                scannedLedgerCount: 0,
                indexedMemoryCount: 0,
                suppressedCount: 0,
                advisoryCount: 0,
                supersededCount: 0,
                decayedCount: 0,
                conflictCount: 0,
                demotedCount: 0,
                items: [],
                advisoryItems: [],
            },
            items: [],
            citations: [],
            itemCount: 0,
        };
    }
    const recall = (0, memory_1.recallGlobalAgentMemory)(query, {
        sessionId: options.globalAgentSessionId || options.global_agent_session_id || options.sessionId || options.session_id,
        limit: Number(options.maxGlobalAgentMemory || options.max_global_agent_memory || 5),
    });
    if (recall?.ignored) {
        return {
            schema: "ccm-child-global-agent-memory-recall-v1",
            included: false,
            ignored: true,
            reason: "user_requested_ignore_memory",
            file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
            items: [],
            citations: [],
            itemCount: 0,
            memory_health_gate: memoryHealthGate,
        };
    }
    const currentGroupId = String(options.groupId || options.group_id || "");
    const localEvidence = collectChildGlobalMemoryLocalEvidence(options);
    const crossGroupSuppressionIndex = buildCrossGroupGlobalMemorySuppressionIndex(currentGroupId, options);
    const items = (Array.isArray(recall?.items) ? recall.items : []).slice(0, 8).map((item) => {
        const source = item.source || {};
        const crossGroupSuppression = buildCrossGroupGlobalMemorySuppressionForItem(item, crossGroupSuppressionIndex, options);
        const arbitration = applyCrossGroupGlobalMemorySuppression(arbitrateChildGlobalAgentMemoryItem(item, localEvidence), crossGroupSuppression);
        return {
            id: item.id || "",
            type: item.type || "",
            text: (0, group_memory_shared_1.compactMemoryText)(item.text || "", 900),
            why: (0, group_memory_shared_1.compactMemoryText)(item.why || "", 320),
            howToApply: (0, group_memory_shared_1.compactMemoryText)(item.howToApply || item.how_to_apply || "", 360),
            importance: Number(item.importance || 0),
            confidence: Number(item.confidence || 0),
            score: Math.round(Number(item.score || 0) * 10) / 10,
            matchedTerms: (Array.isArray(item.matchedTerms) ? item.matchedTerms : []).slice(0, 12),
            updatedAt: item.updatedAt || item.createdAt || "",
            source: {
                sessionId: source.sessionId || "",
                messageIds: (Array.isArray(source.messageIds) ? source.messageIds : []).slice(0, 8),
                missionId: source.missionId || "",
                traceId: source.traceId || "",
                source: source.source || "",
                timestamp: source.timestamp || "",
            },
            arbitration,
            crossGroupSuppression,
        };
    });
    const demotedItems = items.filter((item) => item.arbitration?.demoted === true);
    const conflictItems = items.filter((item) => item.arbitration?.conflict === true);
    const crossGroupSuppressedItems = items.filter((item) => item.crossGroupSuppression?.suppressed === true);
    const crossGroupSuppressionSummary = summarizeCrossGroupGlobalMemorySuppression(items, crossGroupSuppressionIndex);
    return {
        schema: "ccm-child-global-agent-memory-recall-v1",
        version: 1,
        included: items.length > 0,
        ignored: false,
        reason: conflictItems.length ? "global_memory_conflicts_with_newer_group_evidence"
            : crossGroupSuppressedItems.length ? "global_memory_suppressed_by_cross_group_arbitration"
                : demotedItems.length ? "global_memory_demoted_by_newer_group_evidence"
                    : items.length ? "relevant_global_agent_memory" : "no_relevant_global_agent_memory",
        file: memory_1.GLOBAL_AGENT_MEMORY_FILE,
        memory_health_gate: memoryHealthGate,
        sessionSummary: recall?.sessionSummary || null,
        boundary: recall?.boundary || null,
        arbitration: {
            schema: "ccm-child-global-agent-memory-arbitration-summary-v1",
            status: conflictItems.length ? "conflict" : demotedItems.length ? "demoted" : items.length ? "ok" : "empty",
            localEvidenceCount: localEvidence.length,
            demotedCount: demotedItems.length,
            conflictCount: conflictItems.length,
            crossGroupSuppressedCount: crossGroupSuppressedItems.length,
            crossGroupScannedLedgerCount: crossGroupSuppressionSummary.scannedLedgerCount,
            activeCount: items.length - demotedItems.length,
            authorityOrder: ["current_task_explicit_user_instruction", "current_group_memory", "typed_MEMORY.md", "global_agent_memory"],
        },
        crossGroupSuppression: crossGroupSuppressionSummary,
        items,
        citations: Array.isArray(recall?.citations) ? recall.citations.slice(0, 12) : [],
        itemCount: items.length,
    };
}
function globalMemorySuppressionKey(value = {}) {
    const id = String(value.globalMemoryId || value.global_memory_id || value.id || value.memoryId || value.memory_id || "").trim();
    if (id)
        return id;
    const text = [value.globalText, value.text, value.why, value.howToApply || value.how_to_apply].filter(Boolean).join("\n");
    return text ? `text:${(0, group_memory_shared_1.hashSessionMemoryText)(text, 18)}` : "";
}
function listGroupGlobalMemoryArbitrationLedgerFiles(limit = 80) {
    try {
        return fs.readdirSync(group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR)
            .filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-"))
            .map(name => {
            const file = path.join(group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR, name);
            try {
                const stat = fs.statSync(file);
                return stat.isFile() ? { file, mtimeMs: stat.mtimeMs } : null;
            }
            catch {
                return null;
            }
        })
            .filter(Boolean)
            .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
            .slice(0, Math.max(1, limit))
            .map((item) => item.file);
    }
    catch {
        return [];
    }
}
function buildCrossGroupGlobalMemorySuppressionIndex(currentGroupId, options = {}) {
    if (options.includeCrossGroupGlobalMemorySuppression === false || options.include_cross_group_global_memory_suppression === false) {
        return {
            schema: "ccm-cross-group-global-memory-suppression-index-v1",
            enabled: false,
            currentGroupId,
            sourceDir: group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
            scannedLedgerCount: 0,
            itemCount: 0,
            items: [],
            byMemoryId: new Map(),
        };
    }
    const current = String(currentGroupId || "").trim();
    const maxLedgers = Math.max(10, Number(options.maxCrossGroupGlobalMemoryLedgers || options.max_cross_group_global_memory_ledgers || 80));
    const rows = new Map();
    let scannedLedgerCount = 0;
    for (const file of listGroupGlobalMemoryArbitrationLedgerFiles(maxLedgers)) {
        let ledger = null;
        try {
            ledger = JSON.parse(fs.readFileSync(file, "utf-8"));
        }
        catch {
            continue;
        }
        const ledgerGroupId = String(ledger?.groupId || path.basename(file, ".json") || "").trim();
        if (current && ledgerGroupId === current)
            continue;
        const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
        if (!entries.length)
            continue;
        scannedLedgerCount += 1;
        for (const entry of entries) {
            const key = globalMemorySuppressionKey(entry);
            if (!key)
                continue;
            const statusText = String(entry.status || "");
            const conflict = entry.conflict === true || /conflict/i.test(statusText);
            const demoted = entry.demoted === true || conflict || /demoted|suppress/i.test(statusText);
            if (!conflict && !demoted)
                continue;
            const occurrenceCount = Math.max(1, Number(entry.occurrenceCount || 1));
            const row = rows.get(key) || {
                schema: "ccm-cross-group-global-memory-suppression-row-v1",
                globalMemoryId: key,
                groupIds: new Set(),
                conflictGroupIds: new Set(),
                demotedGroupIds: new Set(),
                sourceLedgers: new Map(),
                typedMemoryDocs: new Map(),
                targetProjects: new Set(),
                totalOccurrenceCount: 0,
                conflictCount: 0,
                demotedCount: 0,
                latestEvidence: [],
            };
            row.groupIds.add(ledgerGroupId);
            if (entry.targetProject)
                row.targetProjects.add(String(entry.targetProject));
            row.totalOccurrenceCount += occurrenceCount;
            if (conflict) {
                row.conflictGroupIds.add(ledgerGroupId);
                row.conflictCount += occurrenceCount;
            }
            if (demoted) {
                row.demotedGroupIds.add(ledgerGroupId);
                row.demotedCount += occurrenceCount;
            }
            row.sourceLedgers.set(file, { file, groupId: ledgerGroupId });
            if (entry.typedMemoryDoc)
                row.typedMemoryDocs.set(String(entry.typedMemoryDoc), {
                    file: entry.typedMemoryDoc,
                    slug: entry.typedMemorySlug || "",
                    type: entry.typedMemoryType || "",
                });
            row.latestEvidence.push({
                groupId: ledgerGroupId,
                ledgerFile: file,
                status: entry.status || "",
                conflict,
                demoted,
                occurrenceCount,
                targetProject: entry.targetProject || "",
                lastSeenAt: entry.lastSeenAt || entry.at || "",
                localRuleText: (0, group_memory_shared_1.compactMemoryText)(entry.localRuleText || "", 260),
                globalText: (0, group_memory_shared_1.compactMemoryText)(entry.globalText || "", 260),
                typedMemoryDoc: entry.typedMemoryDoc || "",
            });
            rows.set(key, row);
        }
    }
    const items = [...rows.values()].map((row) => {
        const latestEvidence = row.latestEvidence
            .slice()
            .sort((a, b) => Date.parse(b.lastSeenAt || "") - Date.parse(a.lastSeenAt || ""))
            .slice(0, 6);
        return {
            schema: row.schema,
            globalMemoryId: row.globalMemoryId,
            groupCount: row.groupIds.size,
            groupIds: [...row.groupIds].slice(0, 12),
            conflictGroupCount: row.conflictGroupIds.size,
            conflictGroupIds: [...row.conflictGroupIds].slice(0, 12),
            demotedGroupCount: row.demotedGroupIds.size,
            demotedGroupIds: [...row.demotedGroupIds].slice(0, 12),
            totalOccurrenceCount: row.totalOccurrenceCount,
            conflictCount: row.conflictCount,
            demotedCount: row.demotedCount,
            targetProjects: [...row.targetProjects].slice(0, 12),
            sourceLedgers: [...row.sourceLedgers.values()].slice(0, 12),
            typedMemoryDocs: [...row.typedMemoryDocs.values()].slice(0, 12),
            latestEvidence,
            latestSeenAt: latestEvidence[0]?.lastSeenAt || "",
        };
    });
    return {
        schema: "ccm-cross-group-global-memory-suppression-index-v1",
        enabled: true,
        currentGroupId: current,
        sourceDir: group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount,
        itemCount: items.length,
        items,
        byMemoryId: new Map(items.map((item) => [item.globalMemoryId, item])),
    };
}
function buildCrossGroupGlobalMemorySuppressionForItem(item, index = {}, options = {}) {
    const key = globalMemorySuppressionKey(item);
    const row = key && index?.byMemoryId instanceof Map ? index.byMemoryId.get(key) : null;
    const conflictGroupThreshold = Math.max(1, Number(options.crossGroupGlobalMemoryConflictGroupThreshold || options.cross_group_global_memory_conflict_group_threshold || 1));
    const occurrenceThreshold = Math.max(2, Number(options.crossGroupGlobalMemoryOccurrenceThreshold || options.cross_group_global_memory_occurrence_threshold || 2));
    const rawSuppressed = !!row && (Number(row.conflictGroupCount || 0) >= conflictGroupThreshold
        || Number(row.totalOccurrenceCount || 0) >= occurrenceThreshold);
    const globalUpdatedAt = String(item.updatedAt || item.updated_at || item.source?.timestamp || item.createdAt || item.created_at || "");
    const globalUpdatedAtMs = Date.parse(globalUpdatedAt || "");
    const latestEvidenceAt = String(row?.latestSeenAt || "");
    const latestEvidenceAtMs = Date.parse(latestEvidenceAt || "");
    const newerGlobalGraceMs = Math.max(0, Number(options.crossGroupGlobalMemoryNewerGraceMs || options.cross_group_global_memory_newer_grace_ms || 1000));
    const maxEvidenceAgeDays = Number(options.crossGroupGlobalMemoryMaxEvidenceAgeDays || options.cross_group_global_memory_max_evidence_age_days || 90);
    const maxEvidenceAgeMs = Number.isFinite(maxEvidenceAgeDays) && maxEvidenceAgeDays > 0 ? maxEvidenceAgeDays * 24 * 60 * 60 * 1000 : 0;
    const nowMs = Date.now();
    const globalNewerByMs = Number.isFinite(globalUpdatedAtMs) && Number.isFinite(latestEvidenceAtMs)
        ? globalUpdatedAtMs - latestEvidenceAtMs
        : 0;
    const supersededByNewerGlobalMemory = rawSuppressed && globalNewerByMs > newerGlobalGraceMs;
    const evidenceAgeMs = Number.isFinite(latestEvidenceAtMs) ? Math.max(0, nowMs - latestEvidenceAtMs) : 0;
    const decayedToAdvisory = rawSuppressed
        && !supersededByNewerGlobalMemory
        && maxEvidenceAgeMs > 0
        && Number.isFinite(latestEvidenceAtMs)
        && evidenceAgeMs > maxEvidenceAgeMs;
    const suppressed = rawSuppressed && !supersededByNewerGlobalMemory && !decayedToAdvisory;
    const advisory = !!row && !suppressed && (rawSuppressed || supersededByNewerGlobalMemory || decayedToAdvisory);
    const reason = suppressed
        ? "global_memory_conflicted_or_demoted_in_other_groups"
        : supersededByNewerGlobalMemory
            ? "cross_group_evidence_superseded_by_newer_global_memory"
            : decayedToAdvisory
                ? "cross_group_evidence_decayed_to_advisory"
                : row ? "cross_group_evidence_below_threshold" : "no_cross_group_arbitration_evidence";
    return {
        schema: "ccm-cross-group-global-memory-suppression-v1",
        globalMemoryId: key,
        suppressed,
        rawSuppressed,
        advisory,
        reason,
        action: suppressed
            ? "treat_as_background_only_verify_current_group_before_use"
            : supersededByNewerGlobalMemory
                ? "use_newer_global_memory_as_context_after_current_source_verification"
                : decayedToAdvisory
                    ? "treat_cross_group_evidence_as_advisory_only"
                    : "no_cross_group_demotion",
        sourceDir: index?.sourceDir || group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount: Number(index?.scannedLedgerCount || 0),
        groupCount: Number(row?.groupCount || 0),
        conflictGroupCount: Number(row?.conflictGroupCount || 0),
        demotedGroupCount: Number(row?.demotedGroupCount || 0),
        totalOccurrenceCount: Number(row?.totalOccurrenceCount || 0),
        conflictCount: Number(row?.conflictCount || 0),
        demotedCount: Number(row?.demotedCount || 0),
        sourceLedgers: Array.isArray(row?.sourceLedgers) ? row.sourceLedgers.slice(0, 6) : [],
        typedMemoryDocs: Array.isArray(row?.typedMemoryDocs) ? row.typedMemoryDocs.slice(0, 6) : [],
        latestEvidence: Array.isArray(row?.latestEvidence) ? row.latestEvidence.slice(0, 3) : [],
        freshness: {
            schema: "ccm-cross-group-global-memory-suppression-freshness-v1",
            globalUpdatedAt,
            latestEvidenceAt,
            globalNewerByMs,
            evidenceAgeMs,
            maxEvidenceAgeMs,
            newerGlobalGraceMs,
            supersededByNewerGlobalMemory,
            decayedToAdvisory,
        },
        thresholds: {
            conflictGroupThreshold,
            occurrenceThreshold,
        },
    };
}
function applyCrossGroupGlobalMemorySuppression(arbitration = {}, suppression = {}) {
    if (suppression?.suppressed !== true) {
        return {
            ...arbitration,
            crossGroupSuppressed: false,
            crossGroupSuppression: suppression,
        };
    }
    const active = arbitration.status === "active_global_context";
    const crossEvidence = (Array.isArray(suppression.latestEvidence) ? suppression.latestEvidence : []).slice(0, 2).map((evidence) => ({
        source: "cross_group.global_memory_arbitration_ledger",
        type: "cross_group_global_memory_suppression",
        text: (0, group_memory_shared_1.compactMemoryText)([
            `group=${evidence.groupId || ""}`,
            `status=${evidence.status || ""}`,
            evidence.localRuleText ? `rule=${evidence.localRuleText}` : "",
            evidence.typedMemoryDoc ? `typed=${evidence.typedMemoryDoc}` : "",
        ].filter(Boolean).join("; "), 360),
        updatedAt: evidence.lastSeenAt || "",
        messageId: "",
        matchedTerms: [],
        newer: true,
        conflict: evidence.conflict === true,
    }));
    return {
        ...arbitration,
        status: active ? "suppressed_by_cross_group_arbitration" : arbitration.status,
        authority: active ? "cross_group_arbitration_ledger" : arbitration.authority,
        action: active ? "do_not_apply_directly_treat_as_background_verify_current_group_and_sources" : arbitration.action,
        demoted: arbitration.demoted === true || active,
        conflict: arbitration.conflict === true,
        crossGroupSuppressed: true,
        crossGroupConflictCount: Number(suppression.conflictCount || 0),
        crossGroupSuppression: suppression,
        decisiveEvidence: [
            ...(Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : []),
            ...crossEvidence,
        ].slice(0, 6),
    };
}
function summarizeCrossGroupGlobalMemorySuppression(items = [], index = {}) {
    const suppressedItems = items.filter((item) => item.crossGroupSuppression?.suppressed === true);
    const advisoryItems = items.filter((item) => item.crossGroupSuppression?.advisory === true);
    const supersededItems = items.filter((item) => item.crossGroupSuppression?.freshness?.supersededByNewerGlobalMemory === true);
    const decayedItems = items.filter((item) => item.crossGroupSuppression?.freshness?.decayedToAdvisory === true);
    return {
        schema: "ccm-cross-group-global-memory-suppression-summary-v1",
        sourceDir: index?.sourceDir || group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR,
        scannedLedgerCount: Number(index?.scannedLedgerCount || 0),
        indexedMemoryCount: Number(index?.itemCount || 0),
        suppressedCount: suppressedItems.length,
        advisoryCount: advisoryItems.length,
        supersededCount: supersededItems.length,
        decayedCount: decayedItems.length,
        conflictCount: suppressedItems.reduce((sum, item) => sum + Number(item.crossGroupSuppression?.conflictCount || 0), 0),
        demotedCount: suppressedItems.reduce((sum, item) => sum + Number(item.crossGroupSuppression?.demotedCount || 0), 0),
        items: suppressedItems.slice(0, 8).map((item) => ({
            globalMemoryId: item.id || item.crossGroupSuppression?.globalMemoryId || "",
            status: item.arbitration?.status || "",
            groupCount: item.crossGroupSuppression?.groupCount || 0,
            conflictGroupCount: item.crossGroupSuppression?.conflictGroupCount || 0,
            totalOccurrenceCount: item.crossGroupSuppression?.totalOccurrenceCount || 0,
            sourceLedgers: item.crossGroupSuppression?.sourceLedgers || [],
            typedMemoryDocs: item.crossGroupSuppression?.typedMemoryDocs || [],
        })),
        advisoryItems: advisoryItems.slice(0, 8).map((item) => ({
            globalMemoryId: item.id || item.crossGroupSuppression?.globalMemoryId || "",
            reason: item.crossGroupSuppression?.reason || "",
            action: item.crossGroupSuppression?.action || "",
            groupCount: item.crossGroupSuppression?.groupCount || 0,
            conflictGroupCount: item.crossGroupSuppression?.conflictGroupCount || 0,
            totalOccurrenceCount: item.crossGroupSuppression?.totalOccurrenceCount || 0,
            freshness: item.crossGroupSuppression?.freshness || {},
        })),
    };
}
function readGroupGlobalMemoryArbitrationLedger(groupId) {
    const file = getGroupGlobalMemoryArbitrationLedgerFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        return {
            ...parsed,
            file,
            entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
            totals: parsed?.totals && typeof parsed.totals === "object" ? parsed.totals : {},
        };
    }
    catch {
        return {
            schema: "ccm-group-global-memory-arbitration-ledger-v1",
            version: group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
            groupId,
            file,
            entries: [],
            totals: { total: 0, demoted: 0, conflict: 0, repeatedConflict: 0 },
            updatedAt: "",
        };
    }
}
function globalMemoryArbitrationSignature(groupId, targetProject, item = {}, arbitration = {}) {
    const decisive = Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : [];
    const groupEvidence = decisive.filter((evidence) => String(evidence.source || "").startsWith("group."));
    const groupMessageIds = [...new Set(groupEvidence.map((evidence) => String(evidence.messageId || "").trim()).filter(Boolean))].sort();
    const signatureEvidence = groupMessageIds.length
        ? [["messageIds", groupMessageIds.join(",")]]
        : (groupEvidence.length ? groupEvidence : decisive.slice(0, 1))
            .map((evidence) => [
            "",
            (0, group_memory_shared_1.compactMemoryText)(evidence.text || "", 120),
        ]);
    return crypto.createHash("sha256").update(JSON.stringify([
        groupId,
        targetProject,
        item.id || "",
        arbitration.status || "",
        signatureEvidence,
    ])).digest("hex").slice(0, 18);
}
function summarizeGroupGlobalMemoryArbitrationLedger(groupId, ledger, recordedRows = []) {
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const conflicts = entries.filter((entry) => entry.conflict === true);
    const demoted = entries.filter((entry) => entry.demoted === true);
    const semanticRiskEntries = entries.filter((entry) => Number(entry.semanticRiskScore || 0) > 0);
    const repeatedConflicts = conflicts.filter((entry) => Number(entry.occurrenceCount || 0) > 1);
    const distilledConflicts = repeatedConflicts.filter((entry) => entry.distilledAt || entry.typedMemoryDoc);
    const pendingDistillation = repeatedConflicts.filter((entry) => !entry.distilledAt && !entry.typedMemoryDoc);
    return {
        schema: "ccm-group-global-memory-arbitration-ledger-summary-v1",
        groupId,
        file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId),
        entryCount: entries.length,
        recordedCount: recordedRows.length,
        demotedCount: demoted.length,
        conflictCount: conflicts.length,
        semanticRiskCount: semanticRiskEntries.length,
        semanticConflictCount: semanticRiskEntries.filter((entry) => Number(entry.semanticRiskScore || 0) >= 60).length,
        maxSemanticRiskScore: semanticRiskEntries.reduce((max, entry) => Math.max(max, Number(entry.semanticRiskScore || 0)), 0),
        repeatedConflictCount: repeatedConflicts.length,
        distilledConflictCount: distilledConflicts.length,
        pendingDistillationCount: pendingDistillation.length,
        typedMemoryDocs: (0, group_memory_shared_1.uniqueByKey)(distilledConflicts.map((entry) => ({
            file: entry.typedMemoryDoc || "",
            slug: entry.typedMemorySlug || "",
            type: entry.typedMemoryType || "",
        })).filter((item) => item.file), (item) => item.file, 12),
        updatedAt: ledger.updatedAt || "",
        latestEntries: entries
            .slice()
            .sort((a, b) => Date.parse(b.lastSeenAt || b.at || "") - Date.parse(a.lastSeenAt || a.at || ""))
            .slice(0, 8)
            .map((entry) => ({
            entry_id: entry.entry_id,
            status: entry.status,
            globalMemoryId: entry.globalMemoryId,
            targetProject: entry.targetProject,
            semanticRiskScore: Number(entry.semanticRiskScore || 0),
            semanticRiskLevel: entry.semanticRiskLevel || "",
            semanticReasons: (Array.isArray(entry.semanticReasons) ? entry.semanticReasons : []).slice(0, 6),
            occurrenceCount: entry.occurrenceCount || 1,
            lastSeenAt: entry.lastSeenAt || entry.at || "",
            distilledAt: entry.distilledAt || "",
            typedMemoryDoc: entry.typedMemoryDoc || "",
            localEvidence: (entry.decisiveEvidence || []).slice(0, 2).map((evidence) => ({
                source: evidence.source || "",
                messageId: evidence.messageId || "",
                text: (0, group_memory_shared_1.compactMemoryText)(evidence.text || "", 180),
                semanticRiskScore: Number(evidence.semanticRiskScore || 0),
                semanticReasons: (Array.isArray(evidence.semanticReasons) ? evidence.semanticReasons : []).slice(0, 4),
            })),
        })),
        distillationCandidates: repeatedConflicts.slice(0, 8).map((entry) => ({
            globalMemoryId: entry.globalMemoryId,
            targetProject: entry.targetProject,
            occurrenceCount: entry.occurrenceCount || 1,
            semanticRiskScore: Number(entry.semanticRiskScore || 0),
            semanticReasons: (Array.isArray(entry.semanticReasons) ? entry.semanticReasons : []).slice(0, 6),
            suggestedMemoryType: entry.conflict ? "decision" : "fact",
            reason: "同一全局记忆多次被群聊新证据降权/冲突，可蒸馏为 typed MEMORY.md 规则。",
            candidateText: (0, group_memory_shared_1.compactMemoryText)(entry.localRuleText || entry.globalText || "", 320),
            distilled: !!(entry.distilledAt || entry.typedMemoryDoc),
            typedMemoryDoc: entry.typedMemoryDoc || "",
        })),
    };
}
function recordGroupGlobalMemoryArbitrationLedger(groupId, input = {}) {
    const recall = input.globalAgentMemoryRecall || input.global_agent_memory_recall || {};
    const targetProject = String(input.targetProject || input.target_project || "");
    const generatedAt = String(input.generatedAt || input.generated_at || new Date().toISOString());
    const task = (0, group_memory_shared_1.compactMemoryText)(input.task || input.query || "", 320);
    const rows = (Array.isArray(recall.items) ? recall.items : [])
        .filter((item) => item?.arbitration?.demoted === true || item?.arbitration?.conflict === true)
        .map((item) => {
        const arbitration = item.arbitration || {};
        const signature = globalMemoryArbitrationSignature(groupId, targetProject, item, arbitration);
        const decisiveEvidence = (Array.isArray(arbitration.decisiveEvidence) ? arbitration.decisiveEvidence : []).slice(0, 6);
        const localRuleText = decisiveEvidence.map((evidence) => evidence.text).filter(Boolean).join("\n");
        return {
            schema: "ccm-group-global-memory-arbitration-ledger-entry-v1",
            entry_id: `gma:${signature}`,
            signature,
            at: generatedAt,
            groupId,
            targetProject,
            task,
            globalMemoryId: item.id || "",
            globalMemoryType: item.type || "",
            status: arbitration.status || "",
            authority: arbitration.authority || "",
            action: arbitration.action || "",
            demoted: arbitration.demoted === true,
            conflict: arbitration.conflict === true,
            matchedLocalEvidenceCount: Number(arbitration.matchedLocalEvidenceCount || 0),
            semanticRiskScore: Number(arbitration.semanticRiskScore || arbitration.semanticRisk?.score || 0),
            semanticRiskLevel: arbitration.semanticRisk?.level || "",
            semanticReasons: (Array.isArray(arbitration.semanticReasons) ? arbitration.semanticReasons : arbitration.semanticRisk?.reasons || []).slice(0, 10),
            globalText: (0, group_memory_shared_1.compactMemoryText)(item.text || "", 700),
            globalHowToApply: (0, group_memory_shared_1.compactMemoryText)(item.howToApply || item.how_to_apply || "", 300),
            localRuleText: (0, group_memory_shared_1.compactMemoryText)(localRuleText, 700),
            crossGroupSuppression: item.crossGroupSuppression || arbitration.crossGroupSuppression || null,
            decisiveEvidence: decisiveEvidence.map((evidence) => ({
                source: evidence.source || "",
                type: evidence.type || "",
                text: (0, group_memory_shared_1.compactMemoryText)(evidence.text || "", 360),
                updatedAt: evidence.updatedAt || "",
                messageId: evidence.messageId || "",
                matchedTerms: (Array.isArray(evidence.matchedTerms) ? evidence.matchedTerms : []).slice(0, 8),
                newer: evidence.newer === true,
                conflict: evidence.conflict === true,
                semanticRiskScore: Number(evidence.semanticRiskScore || evidence.semanticRisk?.score || 0),
                semanticReasons: (Array.isArray(evidence.semanticReasons) ? evidence.semanticReasons : evidence.semanticRisk?.reasons || []).slice(0, 8),
                semanticRisk: evidence.semanticRisk || null,
            })),
            source: item.source || {},
            distillationCandidate: {
                shouldDistill: true,
                suggestedMemoryType: arbitration.conflict ? "decision" : "fact",
                reason: arbitration.conflict
                    ? "全局记忆和群聊新证据冲突；应把最新群聊规则蒸馏成 typed memory。"
                    : "全局记忆被更新群聊证据降权；应把更新后的本地事实蒸馏成 typed memory。",
            },
        };
    });
    const ledger = readGroupGlobalMemoryArbitrationLedger(groupId);
    if (!rows.length)
        return summarizeGroupGlobalMemoryArbitrationLedger(groupId, ledger, []);
    const bySignature = new Map((ledger.entries || []).map((entry) => [String(entry.signature || entry.entry_id || ""), entry]));
    const evidenceMessageIds = (entry = {}) => new Set((Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence : [])
        .map((evidence) => String(evidence.messageId || "").trim())
        .filter(Boolean));
    for (const row of rows) {
        const rowMessageIds = evidenceMessageIds(row);
        const previous = bySignature.get(row.signature) || [...bySignature.values()].find((entry) => {
            if (entry.globalMemoryId !== row.globalMemoryId || entry.targetProject !== row.targetProject || entry.status !== row.status)
                return false;
            const previousMessageIds = evidenceMessageIds(entry);
            return [...rowMessageIds].some(messageId => previousMessageIds.has(messageId));
        });
        const signature = previous?.signature || row.signature;
        bySignature.set(signature, previous ? {
            ...previous,
            ...row,
            entry_id: previous.entry_id || row.entry_id,
            signature,
            firstSeenAt: previous.firstSeenAt || previous.at || row.at,
            lastSeenAt: generatedAt,
            occurrenceCount: Number(previous.occurrenceCount || 1) + 1,
        } : {
            ...row,
            firstSeenAt: generatedAt,
            lastSeenAt: generatedAt,
            occurrenceCount: 1,
        });
    }
    const entries = [...bySignature.values()]
        .sort((a, b) => Date.parse(a.lastSeenAt || a.at || "") - Date.parse(b.lastSeenAt || b.at || ""))
        .slice(-240);
    const totals = {
        total: entries.length,
        demoted: entries.filter((entry) => entry.demoted === true).length,
        conflict: entries.filter((entry) => entry.conflict === true).length,
        repeatedConflict: entries.filter((entry) => entry.conflict === true && Number(entry.occurrenceCount || 0) > 1).length,
    };
    const nextLedger = {
        schema: "ccm-group-global-memory-arbitration-ledger-v1",
        version: group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
        groupId,
        entries,
        totals,
        updatedAt: generatedAt,
    };
    (0, group_memory_shared_1.writeJsonAtomic)(ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId), nextLedger);
    return summarizeGroupGlobalMemoryArbitrationLedger(groupId, { ...nextLedger, file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId) }, rows);
}
function renderGlobalMemoryArbitrationTypedMemoryBody(entries = [], options = {}) {
    const lines = [
        "# Global/Group Memory Arbitration Decisions",
        "",
        "This document is generated from repeated Global Agent memory arbitration conflicts.",
        "When these rows apply, current group memory and typed MEMORY.md override stale Global Agent memory. Treat the global item as background only and verify current source before acting.",
        "",
        `Generated at: ${options.updatedAt || new Date().toISOString()}`,
        "",
    ];
    for (const entry of entries.slice(0, 24)) {
        lines.push(`## ${entry.globalMemoryId || "global-memory"} -> ${entry.targetProject || "project"}`);
        lines.push("");
        lines.push(`- status: ${entry.status || ""}`);
        lines.push(`- occurrence_count: ${entry.occurrenceCount || 1}`);
        if (Number(entry.semanticRiskScore || 0) > 0) {
            lines.push(`- semantic_risk: ${entry.semanticRiskScore}; level=${entry.semanticRiskLevel || "unknown"}; reasons=${(entry.semanticReasons || []).join(",")}`);
        }
        lines.push(`- first_seen: ${entry.firstSeenAt || entry.at || ""}`);
        lines.push(`- last_seen: ${entry.lastSeenAt || entry.at || ""}`);
        if (entry.task)
            lines.push(`- task: ${(0, group_memory_shared_1.compactMemoryText)(entry.task, 260)}`);
        if (entry.globalText)
            lines.push(`- stale_global_memory: ${(0, group_memory_shared_1.compactMemoryText)(entry.globalText, 520)}`);
        if (entry.localRuleText)
            lines.push(`- current_group_rule: ${(0, group_memory_shared_1.compactMemoryText)(entry.localRuleText, 700)}`);
        const evidence = Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence : [];
        if (evidence.length) {
            lines.push("- decisive_evidence:");
            for (const item of evidence.slice(0, 4)) {
                const semantic = Number(item.semanticRiskScore || item.semanticRisk?.score || 0) > 0
                    ? ` semantic_risk=${item.semanticRiskScore || item.semanticRisk?.score}; reasons=${(item.semanticReasons || item.semanticRisk?.reasons || []).slice(0, 4).join(",")};`
                    : "";
                lines.push(`  - ${item.source || "group"}${item.messageId ? `#${item.messageId}` : ""}:${semantic} ${(0, group_memory_shared_1.compactMemoryText)(item.text || "", 420)}`);
            }
        }
        lines.push("- application_rule: do_not_apply_the_stale_global_memory_directly; use_current_group_rule_after_current-source verification.");
        lines.push("");
    }
    return lines.join("\n").trim();
}
function distillGroupGlobalMemoryArbitrationToTypedMemory(groupId, input = {}) {
    const threshold = Math.max(2, Number(input.threshold || input.minOccurrences || input.min_occurrences || 2));
    const updatedAt = String(input.updatedAt || input.updated_at || input.generatedAt || input.generated_at || new Date().toISOString());
    const ledger = readGroupGlobalMemoryArbitrationLedger(groupId);
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const candidates = entries.filter((entry) => entry.conflict === true && Number(entry.occurrenceCount || 0) >= threshold);
    if (!candidates.length) {
        return {
            schema: "ccm-group-global-memory-arbitration-distillation-v1",
            groupId,
            skipped: true,
            reason: "no_repeated_conflicts",
            threshold,
            candidateCount: 0,
            writeCount: 0,
            ledgerFile: ledger.file,
        };
    }
    const body = renderGlobalMemoryArbitrationTypedMemoryBody(candidates, { updatedAt });
    const paths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(body, candidates.flatMap((entry) => [
        entry.targetProject,
        ...(Array.isArray(entry.decisiveEvidence) ? entry.decisiveEvidence.flatMap((evidence) => evidence.matchedTerms || []) : []),
    ]));
    const write = (0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
        type: "project",
        slug: "global-memory-arbitration-decisions",
        name: "Global memory arbitration decisions",
        description: "Repeated conflicts where current group evidence overrides stale Global Agent memory.",
        source: "auto:global-memory-arbitration-ledger",
        updatedAt,
        paths,
        body,
        maxBodyChars: Number(input.maxBodyChars || input.max_body_chars || 24_000),
    });
    const nextEntries = entries.map((entry) => {
        const match = candidates.some((candidate) => candidate.entry_id === entry.entry_id || candidate.signature === entry.signature);
        if (!match)
            return entry;
        return {
            ...entry,
            distilledAt: entry.distilledAt || updatedAt,
            distillationStatus: "typed_memory_written",
            typedMemoryDoc: write.file,
            typedMemorySlug: write.slug,
            typedMemoryType: write.type,
            typedMemoryChanged: write.changed === true,
        };
    });
    const nextLedger = {
        schema: "ccm-group-global-memory-arbitration-ledger-v1",
        version: group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_LEDGER_VERSION,
        groupId,
        entries: nextEntries,
        totals: {
            total: nextEntries.length,
            demoted: nextEntries.filter((entry) => entry.demoted === true).length,
            conflict: nextEntries.filter((entry) => entry.conflict === true).length,
            repeatedConflict: nextEntries.filter((entry) => entry.conflict === true && Number(entry.occurrenceCount || 0) >= threshold).length,
            distilled: nextEntries.filter((entry) => entry.distilledAt || entry.typedMemoryDoc).length,
        },
        distillation: {
            schema: "ccm-group-global-memory-arbitration-distillation-state-v1",
            threshold,
            lastDistilledAt: updatedAt,
            candidateCount: candidates.length,
            typedMemoryDoc: write.file,
            typedMemorySlug: write.slug,
            changed: write.changed === true,
        },
        updatedAt,
    };
    (0, group_memory_shared_1.writeJsonAtomic)(ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId), nextLedger);
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    const summary = summarizeGroupGlobalMemoryArbitrationLedger(groupId, { ...nextLedger, file: ledger.file || getGroupGlobalMemoryArbitrationLedgerFile(groupId) }, []);
    return {
        schema: "ccm-group-global-memory-arbitration-distillation-v1",
        groupId,
        skipped: false,
        reason: "repeated_global_group_conflict",
        threshold,
        candidateCount: candidates.length,
        writeCount: write.changed ? 1 : 0,
        write,
        index,
        ledgerFile: ledger.file,
        summary,
        distilledAt: updatedAt,
    };
}
function memoryArbitrationTokens(value) {
    const text = String(value || "").toLowerCase().replace(/\\/g, "/");
    const englishStopWords = new Set([
        "the", "and", "for", "with", "global", "agent", "memory", "context",
        "current", "goal", "goals", "requirement", "requirements", "constraint", "constraints", "acceptance",
    ]);
    const chineseStopWords = new Set(["当前", "记忆", "目标", "需求", "约束", "验收", "任务", "群聊", "全局", "验证", "用户", "阶段"]);
    const tokens = new Set();
    for (const match of text.matchAll(/[a-z0-9_./:-]{3,}/g)) {
        const token = match[0];
        if (englishStopWords.has(token))
            continue;
        tokens.add(token);
    }
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1) {
        const token = chinese.slice(index, index + 2);
        if (chineseStopWords.has(token))
            continue;
        tokens.add(token);
    }
    return [...tokens].slice(0, 120);
}
function memoryArbitrationTimestamp(value, messagesById = new Map()) {
    const direct = value?.updatedAt || value?.updated_at || value?.timestamp || value?.time || value?.createdAt || value?.created_at || "";
    if (direct && Number.isFinite(Date.parse(String(direct))))
        return String(direct);
    const messageId = value?.messageId || value?.message_id || value?.sourceMessageId || value?.source_message_id || value?.source?.messageId || value?.source?.message_id;
    const message = messageId ? messagesById.get(String(messageId)) : null;
    return message?.timestamp || message?.time || "";
}
function memoryArbitrationTextForItem(type, item) {
    if (!item)
        return "";
    if (typeof item === "string")
        return item;
    return [
        item.text,
        item.decision,
        item.summary,
        item.reason,
        item.action,
        item.question,
        item.value,
        item.description,
        item.body,
    ].filter(Boolean).join("\n");
}
function collectChildGlobalMemoryLocalEvidence(options = {}) {
    const memory = options.groupMemory || options.group_memory || {};
    const messages = Array.isArray(options.groupMessages || options.group_messages) ? (options.groupMessages || options.group_messages) : [];
    const messagesById = new Map(messages.map((message) => [String(message.id || message.uuid || ""), message]));
    const rows = [];
    const push = (source, item, type = source) => {
        const text = memoryArbitrationTextForItem(type, item);
        if (!String(text || "").trim())
            return;
        rows.push({
            source,
            type,
            text: (0, group_memory_shared_1.compactMemoryText)(text, 900),
            updatedAt: memoryArbitrationTimestamp(item, messagesById) || memory.updated_at || "",
            messageId: item?.messageId || item?.message_id || item?.sourceMessageId || item?.source_message_id || item?.source?.messageId || "",
            authority: source.startsWith("typed") ? "typed_memory" : "group_memory",
        });
    };
    for (const key of ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "nextActions", "openQuestions"]) {
        for (const item of Array.isArray(memory[key]) ? memory[key] : [])
            push(`group.${key}`, item, key);
    }
    const recall = options.typedMemoryRecall || options.typed_memory_recall || {};
    for (const doc of Array.isArray(recall.recalled) ? recall.recalled : []) {
        const text = [doc.name, doc.description, doc.snippet, doc.body].filter(Boolean).join("\n");
        push("typed.recall", {
            text,
            updatedAt: doc.updatedAt || doc.updated_at || (Number(doc.mtimeMs || 0) ? new Date(Number(doc.mtimeMs)).toISOString() : ""),
            messageId: doc.sourceMessageId || "",
        }, doc.type || "typed_memory");
    }
    return rows.slice(-120);
}
function uniqueMemoryArbitrationValues(values = [], limit = 24) {
    return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}
function memoryArbitrationEntities(value) {
    const text = String(value || "");
    const normalized = text.toLowerCase().replace(/\\/g, "/");
    const paths = uniqueMemoryArbitrationValues([...normalized.matchAll(/(?:^|[\s"'`([{])([a-z0-9_./@-]+\.(?:tsx?|jsx?|mjs|cjs|md|json|ya?ml|toml|css|scss|html|py|go|rs|java|kt|cs|php|rb|sh|sql))/gi)].map(match => match[1]));
    const sentinels = uniqueMemoryArbitrationValues([...text.matchAll(/\b[A-Z][A-Z0-9_]{5,}_SENTINEL\b/g)].map(match => match[0].toLowerCase()));
    const ruleTerms = uniqueMemoryArbitrationValues([...normalized.matchAll(/\b[a-z0-9][a-z0-9._-]*(?:rule|policy|mode|strategy|pipeline|provider|adapter|implementation|impl|flow|version)[a-z0-9._-]*\b/g)].map(match => match[0])
        .filter(term => !paths.includes(term) && !sentinels.includes(term) && !/^(user|system|assistant|agent|task|project|memory)[_-]/.test(term)));
    return {
        paths,
        sentinels,
        ruleTerms,
        anchors: uniqueMemoryArbitrationValues([...paths, ...sentinels]),
    };
}
function memoryArbitrationSignals(value) {
    const text = String(value || "");
    return {
        positive: /(必须|务必|需要|应该|保留|继承|使用|优先|启用|must|required|should|use|keep|prefer|enable)/i.test(text),
        negative: /(不要|不再|禁止|取消|废弃|作废|忽略|不能|不可|无需|不需要|停止|revert|rollback|deprecated|do not|never|stop|cancel|disable)/i.test(text),
        replacement: /(改为|替换为|切换到|迁移到|以.+为准|现在使用|当前使用|最新使用|instead|use .+ instead|replace|switch(?:ed)? to|migrate(?:d)? to|supersede(?:d)?)/i.test(text),
        current: /(当前|现在|最新|新规则|新实现|current|latest|new rule|new implementation|source of truth)/i.test(text),
        legacy: /(旧|历史|过时|陈旧|legacy|stale|old|obsolete|deprecated)/i.test(text),
    };
}
function scoreMemorySemanticContradiction(globalText, localText, options = {}) {
    const globalEntities = memoryArbitrationEntities(globalText);
    const localEntities = memoryArbitrationEntities(localText);
    const globalSignals = memoryArbitrationSignals(globalText);
    const localSignals = memoryArbitrationSignals(localText);
    const matchedTerms = uniqueMemoryArbitrationValues(options.matchedTerms || []);
    const sharedPaths = (0, group_memory_shared_1.intersectionValues)(globalEntities.paths, localEntities.paths);
    const sharedSentinels = (0, group_memory_shared_1.intersectionValues)(globalEntities.sentinels, localEntities.sentinels);
    const sharedAnchors = uniqueMemoryArbitrationValues([...sharedPaths, ...sharedSentinels, ...(0, group_memory_shared_1.intersectionValues)(globalEntities.anchors, localEntities.anchors)]);
    const sharedRuleTerms = (0, group_memory_shared_1.intersectionValues)(globalEntities.ruleTerms, localEntities.ruleTerms);
    const differingGlobalRules = globalEntities.ruleTerms.filter(term => !sharedRuleTerms.includes(term));
    const differingLocalRules = localEntities.ruleTerms.filter(term => !sharedRuleTerms.includes(term));
    const differentNamedRules = sharedAnchors.length > 0
        && differingGlobalRules.length > 0
        && differingLocalRules.length > 0;
    const reasons = [];
    let score = 0;
    const add = (points, reason) => {
        score += points;
        reasons.push(reason);
    };
    if (sharedSentinels.length)
        add(25, "shared_sentinel_anchor");
    if (sharedPaths.length)
        add(25, "shared_file_anchor");
    if (!sharedPaths.length && !sharedSentinels.length && matchedTerms.length >= 3)
        add(12, "shared_task_terms");
    if (differentNamedRules)
        add(28, "different_named_rule");
    if (localSignals.replacement)
        add(24, "local_replacement_signal");
    if (localSignals.current && differentNamedRules)
        add(12, "current_local_rule_differs");
    if (globalSignals.positive && localSignals.negative)
        add(34, "local_negates_global_directive");
    if (globalSignals.positive && (localSignals.current || localSignals.replacement) && differentNamedRules)
        add(18, "positive_global_superseded_by_current_local_rule");
    if (globalSignals.legacy || localSignals.legacy)
        add(8, "legacy_or_stale_rule_signal");
    if (options.newer === true && score > 0)
        add(8, "newer_local_evidence");
    if (!sharedAnchors.length && matchedTerms.length < 2)
        score = Math.min(score, 35);
    const normalizedScore = Math.max(0, Math.min(100, score));
    return {
        schema: "ccm-child-global-agent-memory-semantic-arbitration-v1",
        score: normalizedScore,
        level: normalizedScore >= 80 ? "high" : normalizedScore >= 60 ? "medium" : normalizedScore >= 35 ? "low" : "none",
        conflict: normalizedScore >= 60 && (sharedAnchors.length > 0 || matchedTerms.length >= 3),
        reasons: uniqueMemoryArbitrationValues(reasons, 10),
        sharedAnchors: sharedAnchors.slice(0, 8),
        sharedPaths: sharedPaths.slice(0, 6),
        sharedSentinels: sharedSentinels.slice(0, 4),
        differingGlobalRules: differingGlobalRules.slice(0, 8),
        differingLocalRules: differingLocalRules.slice(0, 8),
        matchedTerms: matchedTerms.slice(0, 8),
    };
}
function arbitrateChildGlobalAgentMemoryItem(item, localEvidence = []) {
    const globalText = [item.text, item.why, item.howToApply].filter(Boolean).join("\n");
    const globalTerms = new Set(memoryArbitrationTokens(globalText));
    const globalAt = item.updatedAt || item.source?.timestamp || "";
    const globalAtMs = Date.parse(globalAt || "");
    const matches = localEvidence.map((evidence) => {
        const evidenceTerms = memoryArbitrationTokens(evidence.text);
        const matchedTerms = evidenceTerms.filter(term => globalTerms.has(term));
        const strongMatch = matchedTerms.length >= 2
            || matchedTerms.some(term => /sentinel|[a-z0-9_-]+\.tsx?$|[a-z0-9_-]+\.jsx?$|[a-z0-9_-]+\.md$/.test(term));
        const evidenceAtMs = Date.parse(evidence.updatedAt || "");
        const newer = Number.isFinite(evidenceAtMs) && (!Number.isFinite(globalAtMs) || evidenceAtMs > globalAtMs + 1000);
        const semanticRisk = scoreMemorySemanticContradiction(globalText, evidence.text, { matchedTerms, newer });
        const conflict = strongMatch && semanticRisk.conflict === true;
        return {
            ...evidence,
            matchedTerms,
            strongMatch,
            newer,
            conflict,
            semanticRisk,
        };
    }).filter((evidence) => evidence.strongMatch && (evidence.newer || evidence.conflict));
    const conflicts = matches.filter((evidence) => evidence.conflict);
    const newerMatches = matches.filter((evidence) => evidence.newer);
    const decisive = (conflicts.length ? conflicts : newerMatches)
        .sort((a, b) => {
        const authorityRank = (value) => String(value.source || "").startsWith("group.") ? 0 : 1;
        const rank = authorityRank(a) - authorityRank(b);
        if (rank)
            return rank;
        return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
    })
        .slice(0, 3);
    const status = conflicts.length
        ? "possible_conflict_with_newer_group_memory"
        : newerMatches.length
            ? "demoted_by_newer_group_evidence"
            : "active_global_context";
    const semanticRiskScores = matches.map((evidence) => Number(evidence.semanticRisk?.score || 0)).filter(score => score > 0);
    const semanticRiskScore = semanticRiskScores.length ? Math.max(...semanticRiskScores) : 0;
    const semanticReasons = uniqueMemoryArbitrationValues(matches.flatMap((evidence) => evidence.semanticRisk?.reasons || []), 10);
    return {
        schema: "ccm-child-global-agent-memory-arbitration-v1",
        status,
        authority: status === "active_global_context" ? "global_agent_memory" : "group_memory",
        action: status === "active_global_context" ? "use_as_relevant_context_after_verification" : "do_not_apply_directly_treat_as_background",
        demoted: status !== "active_global_context",
        conflict: conflicts.length > 0,
        matchedLocalEvidenceCount: matches.length,
        semanticRisk: {
            schema: "ccm-child-global-agent-memory-semantic-risk-summary-v1",
            score: semanticRiskScore,
            level: semanticRiskScore >= 80 ? "high" : semanticRiskScore >= 60 ? "medium" : semanticRiskScore >= 35 ? "low" : "none",
            conflictCount: conflicts.filter((evidence) => evidence.semanticRisk?.conflict === true).length,
            reasons: semanticReasons,
        },
        semanticRiskScore,
        semanticReasons,
        decisiveEvidence: decisive.map((evidence) => ({
            source: evidence.source,
            type: evidence.type,
            text: (0, group_memory_shared_1.compactMemoryText)(evidence.text, 360),
            updatedAt: evidence.updatedAt || "",
            messageId: evidence.messageId || "",
            matchedTerms: evidence.matchedTerms.slice(0, 8),
            newer: evidence.newer,
            conflict: evidence.conflict,
            semanticRiskScore: Number(evidence.semanticRisk?.score || 0),
            semanticReasons: (Array.isArray(evidence.semanticRisk?.reasons) ? evidence.semanticRisk.reasons : []).slice(0, 8),
            semanticRisk: evidence.semanticRisk,
        })),
    };
}
//# sourceMappingURL=group-global-memory-arbitration.js.map