"use strict";
// 跨会话记忆升格通道。
//
// 群会话的 typed memory 目录按 `groupId--gcs_*` 分片，memory_policy 明确
// cross_session_memory_allowed=false——这保证了会话隔离，但也意味着一个会话里
// 蒸馏出来的用户长期规则，换个会话就全部归零，用户得重新说一遍。
//
// 这里补上反向通道：把「高置信 + 真被召回用过」的持久规则升格到项目级的
// 升格库，新会话开场时再作为 typed memory 文档导入。升格库是唯一事实源，
// 带来源引用、幂等键与撤销状态，不直接改写项目记忆/全局记忆的既有结构。
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
exports.PROMOTED_MEMORY_MAX_ENTRIES = exports.PROMOTION_MIN_USAGE_WEIGHT = exports.PROMOTION_ASSISTED_MIN_CONFIDENCE = exports.PROMOTION_MIN_CONFIDENCE = exports.PROMOTABLE_MEMORY_TYPES = exports.PROMOTED_MEMORY_SCHEMA = exports.PROMOTED_MEMORY_DIR = exports.PROMOTED_MEMORY_VERSION = void 0;
exports.getPromotedMemoryFile = getPromotedMemoryFile;
exports.readPromotedMemoryStore = readPromotedMemoryStore;
exports.listActivePromotedMemory = listActivePromotedMemory;
exports.promotionId = promotionId;
exports.summarizePromotionUsage = summarizePromotionUsage;
exports.evaluatePromotionCandidate = evaluatePromotionCandidate;
exports.buildTypedMemoryPromotionCandidates = buildTypedMemoryPromotionCandidates;
exports.promoteTypedMemoryCandidates = promoteTypedMemoryCandidates;
exports.revokePromotedMemory = revokePromotedMemory;
exports.promoteTypedMemoryCandidatesWithModel = promoteTypedMemoryCandidatesWithModel;
exports.safeMemoryPromotionWithModel = safeMemoryPromotionWithModel;
exports.safeMemoryPromotion = safeMemoryPromotion;
exports.safePromotedMemoryImport = safePromotedMemoryImport;
exports.importPromotedMemoryToGroupTypedMemory = importPromotedMemoryToGroupTypedMemory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const main_agent_context_source_continuity_1 = require("../../system/main-agent-context-source-continuity");
exports.PROMOTED_MEMORY_VERSION = 1;
exports.PROMOTED_MEMORY_DIR = path.join(utils_1.CCM_DIR, "promoted-memory");
exports.PROMOTED_MEMORY_SCHEMA = "ccm-promoted-memory-store-v1";
/** 只有这些类别值得跨会话继承；reference 多为一次性链接，不升格。 */
exports.PROMOTABLE_MEMORY_TYPES = ["user", "feedback", "project"];
exports.PROMOTION_MIN_CONFIDENCE = Number(process.env.CCM_MEMORY_PROMOTION_MIN_CONFIDENCE || 0.9);
exports.PROMOTION_ASSISTED_MIN_CONFIDENCE = Number(process.env.CCM_MEMORY_PROMOTION_ASSISTED_MIN_CONFIDENCE || 0.8);
exports.PROMOTION_MIN_USAGE_WEIGHT = Number(process.env.CCM_MEMORY_PROMOTION_MIN_USAGE_WEIGHT || 1);
exports.PROMOTED_MEMORY_MAX_ENTRIES = Math.max(20, Number(process.env.CCM_MEMORY_PROMOTION_MAX_ENTRIES || 200));
// 蒸馏产物的类别 → 文档名，用于把 fact 与消费台账里的 rel_path 对上。
const TYPE_DOC_SLUG = {
    user: "distilled-log-user-requirements.md",
    project: "distilled-log-project-context.md",
    feedback: "distilled-log-feedback-failures.md",
    reference: "distilled-log-reference-artifacts.md",
};
function now() { return new Date().toISOString(); }
function checksum(value, length = 24) {
    return require("crypto").createHash("sha256")
        .update(typeof value === "string" ? value : JSON.stringify(value))
        .digest("hex").slice(0, length);
}
function safeSegment(value, fallback = "default") {
    const text = String(value || "").trim().replace(/[^a-zA-Z0-9._@-]+/g, "-").slice(0, 120);
    return text || fallback;
}
function compactText(value, max = 900) {
    const text = String(value || "").replace(/\r/g, "").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function normalizeComparable(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function getPromotedMemoryFile(projectKey) {
    return path.join(exports.PROMOTED_MEMORY_DIR, `${safeSegment(projectKey, "unassigned")}.json`);
}
function emptyStore(projectKey, file) {
    return {
        schema: exports.PROMOTED_MEMORY_SCHEMA,
        version: exports.PROMOTED_MEMORY_VERSION,
        project: String(projectKey || ""),
        entries: [],
        updatedAt: "",
        file,
    };
}
function readPromotedMemoryStore(projectKey) {
    const file = getPromotedMemoryFile(projectKey);
    const state = (0, atomic_json_file_1.readJsonWithBackup)(file, null);
    if (!state || state.schema !== exports.PROMOTED_MEMORY_SCHEMA)
        return emptyStore(projectKey, file);
    return {
        ...emptyStore(projectKey, file),
        ...state,
        entries: Array.isArray(state.entries) ? state.entries : [],
        file,
    };
}
function listActivePromotedMemory(projectKey) {
    return readPromotedMemoryStore(projectKey).entries
        .filter((entry) => String(entry?.status || "active") === "active");
}
/** 升格幂等键：同一项目 + 类别 + 正文，只会有一条。 */
function promotionId(projectKey, type, text) {
    return `pm_${checksum([safeSegment(projectKey, "unassigned"), String(type || ""), normalizeComparable(text)], 20)}`;
}
/**
 * 汇总一个群会话 scope 里每个蒸馏文档的使用热度。
 * 消费台账带 30 天半衰期，这里按 rel_path 聚合衰减权重，
 * 「被反复召回并真的用上」的记忆权重更高。
 */
function summarizePromotionUsage(scopeId, options = {}) {
    const usageByDoc = new Map();
    let summary = null;
    try {
        summary = require("./typed-memory-ledgers").buildGroupTypedMemoryConsumptionSummary(scopeId, {
            targetProject: options.targetProject || options.target_project || "",
            nowMs: options.nowMs,
        });
    }
    catch {
        return { usageByDoc, ledgerValid: false, entryCount: 0 };
    }
    for (const row of summary?.rows || []) {
        const key = String(row.rel_path || row.relPath || "").toLowerCase();
        if (!key)
            continue;
        const current = usageByDoc.get(key) || { recallCount: 0, usedCount: 0, weight: 0 };
        current.recallCount += 1;
        if (["used", "verified"].includes(String(row.usage_state || "")))
            current.usedCount += 1;
        current.weight += Number(row.decay_weight || 0);
        usageByDoc.set(key, current);
    }
    return {
        usageByDoc,
        ledgerValid: summary?.ledger_checksum_valid === true,
        entryCount: Number(summary?.entry_count || 0),
    };
}
/** 单条候选是否够格升格。分成「本身足够确定」与「置信稍低但被反复用过」两条路径。 */
function evaluatePromotionCandidate(input = {}) {
    const confidence = Number(input.confidence || 0);
    const usageWeight = Number(input.usageWeight || 0);
    const minConfidence = Number(input.minConfidence ?? exports.PROMOTION_MIN_CONFIDENCE);
    const assistedMinConfidence = Number(input.assistedMinConfidence ?? exports.PROMOTION_ASSISTED_MIN_CONFIDENCE);
    const minUsageWeight = Number(input.minUsageWeight ?? exports.PROMOTION_MIN_USAGE_WEIGHT);
    if (!exports.PROMOTABLE_MEMORY_TYPES.includes(String(input.type || ""))) {
        return { promote: false, reason: "type_not_promotable", confidence, usageWeight };
    }
    if (!String(input.text || "").trim())
        return { promote: false, reason: "empty_text", confidence, usageWeight };
    if (confidence >= minConfidence) {
        return { promote: true, reason: "high_confidence_durable_rule", confidence, usageWeight };
    }
    if (confidence >= assistedMinConfidence && usageWeight >= minUsageWeight) {
        return { promote: true, reason: "repeatedly_used_durable_rule", confidence, usageWeight };
    }
    return {
        promote: false,
        reason: confidence < assistedMinConfidence ? "confidence_below_threshold" : "insufficient_usage_evidence",
        confidence,
        usageWeight,
    };
}
/** 从一个群会话 scope 的蒸馏台账里挑出升格候选。 */
function buildTypedMemoryPromotionCandidates(scopeId, options = {}) {
    const scope = String(scopeId || "").trim();
    const projectKey = safeSegment(options.project || options.projectKey || "unassigned", "unassigned");
    let ledger = { facts: {} };
    try {
        ledger = require("./group-memory-distillation").readGroupTypedMemoryDistillationLedger(scope);
    }
    catch { }
    const usage = summarizePromotionUsage(scope, { targetProject: options.targetProject || projectKey, nowMs: options.nowMs });
    const [groupId, groupSessionId] = scope.includes("--") ? [scope.slice(0, scope.indexOf("--")), scope.slice(scope.indexOf("--") + 2)] : [scope, ""];
    const candidates = [];
    for (const type of exports.PROMOTABLE_MEMORY_TYPES) {
        const bucket = ledger?.facts?.[type] || {};
        const docKey = String(TYPE_DOC_SLUG[type] || "").toLowerCase();
        const docUsage = usage.usageByDoc.get(docKey) || { recallCount: 0, usedCount: 0, weight: 0 };
        for (const [factChecksum, fact] of Object.entries(bucket)) {
            const text = compactText(fact?.text, 900);
            const admission = fact?.admission || {};
            const decision = evaluatePromotionCandidate({
                type,
                text,
                confidence: Number(admission.confidence || 0),
                usageWeight: Number(docUsage.weight || 0),
                minConfidence: options.minConfidence,
                assistedMinConfidence: options.assistedMinConfidence,
                minUsageWeight: options.minUsageWeight,
            });
            candidates.push({
                promotionId: promotionId(projectKey, type, text),
                project: projectKey,
                type,
                text,
                why: compactText(admission.why, 400),
                howToApply: compactText(admission.howToApply, 400),
                confidence: Number(admission.confidence || 0),
                admissionReason: String(admission.reason || ""),
                sourceRefs: (0, main_agent_context_source_continuity_1.extractStructuredContextSourceRefs)(fact?.sourceRefs, fact?.source_refs, fact?.contextSourceRefs, fact?.context_source_refs, fact?.evidence, fact?.memoryUsed, text, admission?.why, admission?.howToApply),
                usage: { ...docUsage },
                source: {
                    scopeId: scope,
                    groupId,
                    groupSessionId,
                    relPath: TYPE_DOC_SLUG[type] || "",
                    factChecksum,
                    messageId: String(fact?.messageId || ""),
                    firstSeenAt: String(fact?.firstSeenAt || ""),
                    lastSeenAt: String(fact?.lastSeenAt || ""),
                },
                decision,
            });
        }
    }
    return {
        schema: "ccm-typed-memory-promotion-candidates-v1",
        scopeId: scope,
        project: projectKey,
        usageLedgerValid: usage.ledgerValid,
        candidateCount: candidates.length,
        promotableCount: candidates.filter(item => item.decision.promote).length,
        candidates,
        generatedAt: now(),
    };
}
/**
 * 提交升格。幂等：同一 promotionId 重复提交只更新证据与时间戳，
 * 不会产生第二条；已被用户撤销的条目不会被自动重新升格。
 */
function promoteTypedMemoryCandidates(scopeId, options = {}) {
    const inspection = buildTypedMemoryPromotionCandidates(scopeId, options);
    const projectKey = inspection.project;
    const file = getPromotedMemoryFile(projectKey);
    // candidateFilter 用于让模型判定收窄本地初筛出的候选集。
    const candidateFilter = typeof options.candidateFilter === "function" ? options.candidateFilter : null;
    const promotable = inspection.candidates
        .filter((item) => item.decision.promote)
        .filter((item) => !candidateFilter || candidateFilter(item) === true);
    if (!promotable.length) {
        return { ...inspection, promoted: 0, updated: 0, skippedRevoked: 0, file, entries: listActivePromotedMemory(projectKey) };
    }
    const committed = (0, atomic_json_file_1.withFileLock)(file, () => {
        const store = readPromotedMemoryStore(projectKey);
        const entries = [...store.entries];
        const byId = new Map(entries.map((entry, index) => [String(entry.promotionId || ""), index]));
        const at = now();
        let promoted = 0;
        let updated = 0;
        let skippedRevoked = 0;
        // 升格在每次派工时都会被调用，绝大多数时候内容没有任何变化。
        // 只有真正新增条目/新增来源/正文变化时才落盘，否则空转即可。
        let changed = false;
        for (const candidate of promotable) {
            const index = byId.get(candidate.promotionId);
            if (index === undefined) {
                entries.push({
                    promotionId: candidate.promotionId,
                    project: projectKey,
                    type: candidate.type,
                    text: candidate.text,
                    why: candidate.why,
                    howToApply: candidate.howToApply,
                    confidence: candidate.confidence,
                    promotionReason: candidate.decision.reason,
                    usageWeightAtPromotion: candidate.decision.usageWeight,
                    sources: [candidate.source],
                    sourceRefs: candidate.sourceRefs,
                    status: "active",
                    createdAt: at,
                    updatedAt: at,
                    revokedAt: "",
                    revokedReason: "",
                    actor: String(options.actor || "memory-promotion"),
                });
                promoted += 1;
                changed = true;
                continue;
            }
            const existing = entries[index];
            // 用户手动撤销过的规则不再自动回来，否则「撤销」形同虚设。
            if (String(existing.status || "active") === "revoked") {
                skippedRevoked += 1;
                continue;
            }
            const sources = Array.isArray(existing.sources) ? existing.sources : [];
            const known = new Set(sources.map((item) => `${item?.scopeId}:${item?.factChecksum}`));
            const sourceKnown = known.has(`${candidate.source.scopeId}:${candidate.source.factChecksum}`);
            const nextSources = sourceKnown ? sources : [...sources, candidate.source].slice(-12);
            if (!sourceKnown
                || normalizeComparable(existing.text) !== normalizeComparable(candidate.text)
                || Number(existing.confidence || 0) < candidate.confidence) {
                changed = true;
            }
            entries[index] = {
                ...existing,
                text: candidate.text,
                why: candidate.why || existing.why,
                howToApply: candidate.howToApply || existing.howToApply,
                confidence: Math.max(Number(existing.confidence || 0), candidate.confidence),
                usageWeightAtPromotion: Math.max(Number(existing.usageWeightAtPromotion || 0), candidate.decision.usageWeight),
                sources: nextSources,
                sourceRefs: (0, main_agent_context_source_continuity_1.extractStructuredContextSourceRefs)(existing.sourceRefs, candidate.sourceRefs),
                updatedAt: at,
            };
            updated += 1;
        }
        if (!changed) {
            return {
                ...inspection,
                promoted: 0,
                updated: 0,
                skippedRevoked,
                unchanged: true,
                file,
                entries: entries.filter((entry) => String(entry.status || "active") === "active"),
            };
        }
        // 超量时优先保留置信高、被用得多的条目。
        const bounded = entries
            .sort((left, right) => Number(right.confidence || 0) - Number(left.confidence || 0)
            || Number(right.usageWeightAtPromotion || 0) - Number(left.usageWeightAtPromotion || 0)
            || String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")))
            .slice(0, exports.PROMOTED_MEMORY_MAX_ENTRIES);
        (0, atomic_json_file_1.writeJsonAtomic)(file, {
            schema: exports.PROMOTED_MEMORY_SCHEMA,
            version: exports.PROMOTED_MEMORY_VERSION,
            project: projectKey,
            entries: bounded,
            updatedAt: at,
        });
        return {
            ...inspection,
            promoted,
            updated,
            skippedRevoked,
            file,
            entries: bounded.filter((entry) => String(entry.status || "active") === "active"),
        };
    });
    const activeIds = new Set((committed.entries || []).map((entry) => String(entry?.promotionId || "")));
    const committedCandidates = promotable.filter((candidate) => activeIds.has(String(candidate.promotionId || "")));
    const promotionResults = [];
    for (const candidate of committedCandidates) {
        const sourceRefs = (0, main_agent_context_source_continuity_1.extractStructuredContextSourceRefs)(candidate.sourceRefs);
        if (!sourceRefs.length || !candidate.source?.groupId || !candidate.source?.groupSessionId)
            continue;
        const admissionChecksum = checksum({
            promotionId: candidate.promotionId,
            factChecksum: candidate.source.factChecksum,
            admissionReason: candidate.admissionReason,
            decision: candidate.decision,
        }, 64);
        try {
            promotionResults.push({ memoryId: candidate.promotionId, ...(0, main_agent_context_source_continuity_1.promoteContextSourceReceipts)({
                    identity: {
                        agentKind: "group",
                        scope: "group",
                        scopeId: candidate.source.groupId,
                        exactSessionId: candidate.source.groupSessionId,
                        generation: Math.max(0, Number(options.generation || options.boundaryGeneration || 0)),
                    },
                    sourceRefs,
                    memoryKind: "group_typed_memory",
                    memoryId: candidate.promotionId,
                    admissionChecksum,
                }) });
        }
        catch (error) {
            promotionResults.push({ memoryId: candidate.promotionId, retryable: true, error: compactText(error?.message || error, 300), contentStored: false });
        }
    }
    return { ...committed, committedCandidates: committedCandidates.map((candidate) => ({
            memoryId: candidate.promotionId,
            factChecksum: candidate.source.factChecksum,
            sourceRefs: candidate.sourceRefs,
            admissionChecksum: checksum({ promotionId: candidate.promotionId, factChecksum: candidate.source.factChecksum, admissionReason: candidate.admissionReason, decision: candidate.decision }, 64),
            contentStored: false,
        })), sourcePromotion: { attempted: promotionResults.length, results: promotionResults, contentStored: false } };
}
/** 撤销一条已升格记忆；撤销后不会被自动升格流程重新写回。 */
function revokePromotedMemory(projectKey, targetPromotionId, options = {}) {
    const key = safeSegment(projectKey, "unassigned");
    const reason = String(options.reason || "").trim();
    if (!reason)
        throw new Error("撤销升格记忆必须填写原因");
    const file = getPromotedMemoryFile(key);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const store = readPromotedMemoryStore(key);
        const index = store.entries.findIndex((entry) => String(entry.promotionId || "") === String(targetPromotionId || ""));
        if (index < 0)
            throw new Error("升格记忆不存在");
        const at = now();
        const entries = [...store.entries];
        entries[index] = {
            ...entries[index],
            status: options.restore === true ? "active" : "revoked",
            revokedAt: options.restore === true ? "" : at,
            revokedReason: options.restore === true ? "" : reason,
            updatedAt: at,
            actor: String(options.actor || "memory-promotion"),
        };
        (0, atomic_json_file_1.writeJsonAtomic)(file, {
            schema: exports.PROMOTED_MEMORY_SCHEMA,
            version: exports.PROMOTED_MEMORY_VERSION,
            project: key,
            entries,
            updatedAt: at,
        });
        return { project: key, entry: entries[index], file };
    });
}
/**
 * 模型把关的升格：本地阈值只做初筛（挑出「可能值得跨会话记住」的候选），
 * 最终「这条规则是否真的该跨会话继承」交给模型判断。模型不可用时退回纯本地
 * 阈值，并在结果里标注 degraded，降级可见。
 */
async function promoteTypedMemoryCandidatesWithModel(scopeId, options = {}) {
    const judgment = require("./typed-memory-model-judgment");
    // 初筛放宽到 assisted 门槛，把判断空间交给模型。
    const inspection = buildTypedMemoryPromotionCandidates(scopeId, {
        ...options,
        minConfidence: options.minConfidence ?? exports.PROMOTION_ASSISTED_MIN_CONFIDENCE,
        minUsageWeight: 0,
    });
    const shortlist = inspection.candidates.filter((item) => item.decision.promote);
    if (!shortlist.length) {
        return { ...promoteTypedMemoryCandidates(scopeId, options), modelJudgment: { applied: false, reason: "empty_shortlist" } };
    }
    const judged = await judgment.judgeMemoryAdmissionWithModel(scopeId, shortlist.map((item) => ({
        id: item.promotionId,
        category: item.type,
        type: item.admissionReason,
        text: item.text,
    })), options.modelConfig || options.model_config || {});
    if (judged.degraded) {
        return {
            ...promoteTypedMemoryCandidates(scopeId, options),
            modelJudgment: { applied: false, degraded: true, reason: judged.degradedReason },
        };
    }
    // 模型判定通过的才升格；模型没给出判定的条目不升格（宁缺毋滥）。
    const admittedIds = new Set();
    for (const [id, verdict] of judged.byId.entries()) {
        if (verdict?.admit === true)
            admittedIds.add(String(id));
    }
    const result = promoteTypedMemoryCandidates(scopeId, {
        ...options,
        candidateFilter: (candidate) => admittedIds.has(String(candidate.promotionId)),
        minConfidence: options.minConfidence ?? exports.PROMOTION_ASSISTED_MIN_CONFIDENCE,
        minUsageWeight: 0,
    });
    return {
        ...result,
        modelJudgment: {
            applied: true,
            degraded: false,
            shortlisted: shortlist.length,
            admitted: admittedIds.size,
            cacheHits: judged.cacheHits,
            modelCalls: judged.modelCalls,
            invalidJudgments: judged.invalidJudgments,
        },
    };
}
/**
 * 派工路径上的安全包装：升格/继承是增强能力，任何失败都不应该让整次派工失败，
 * 但必须把失败原因带回上下文包，避免静默降级。
 */
async function safeMemoryPromotionWithModel(scopeId, projectKey, options = {}) {
    try {
        return await promoteTypedMemoryCandidatesWithModel(scopeId, { ...options, project: projectKey });
    }
    catch (error) {
        return {
            schema: "ccm-typed-memory-promotion-candidates-v1",
            scopeId: String(scopeId || ""),
            project: safeSegment(projectKey, "unassigned"),
            promoted: 0,
            updated: 0,
            failed: true,
            error: compactText(error?.message || error, 300),
        };
    }
}
function safeMemoryPromotion(scopeId, projectKey, options = {}) {
    try {
        return promoteTypedMemoryCandidates(scopeId, { ...options, project: projectKey });
    }
    catch (error) {
        return {
            schema: "ccm-typed-memory-promotion-candidates-v1",
            scopeId: String(scopeId || ""),
            project: safeSegment(projectKey, "unassigned"),
            promoted: 0,
            updated: 0,
            failed: true,
            error: compactText(error?.message || error, 300),
        };
    }
}
function safePromotedMemoryImport(scopeId, projectKey, options = {}) {
    try {
        return importPromotedMemoryToGroupTypedMemory(scopeId, projectKey, options);
    }
    catch (error) {
        return {
            schema: "ccm-promoted-memory-import-v1",
            scopeId: String(scopeId || ""),
            project: safeSegment(projectKey, "unassigned"),
            imported: 0,
            failed: true,
            error: compactText(error?.message || error, 300),
        };
    }
}
function renderPromotedMemoryBody(projectKey, entries) {
    const lines = [
        `# Promoted Cross-Session Memory: ${projectKey}`,
        "",
        "These durable rules were promoted from earlier group sessions of this project.",
        "They survived because they were high-confidence user rules or were repeatedly recalled and used.",
        "Verify current repository state before acting on any of them.",
        "",
    ];
    for (const entry of entries) {
        lines.push(`## [${entry.type}] ${compactText(entry.text, 600)}`);
        if (entry.why)
            lines.push(`- Why: ${entry.why}`);
        if (entry.howToApply)
            lines.push(`- How to apply: ${entry.howToApply}`);
        lines.push(`- Confidence: ${Number(entry.confidence || 0)} · Promoted at: ${entry.createdAt}`);
        const origin = (entry.sources || [])[0];
        if (origin?.groupSessionId)
            lines.push(`- Origin session: ${origin.groupSessionId}`);
        lines.push("");
    }
    return lines.join("\n");
}
/**
 * 把项目的已升格记忆导入某个群会话 scope 的 typed memory。
 * 与 importProjectMemoryFilesToGroupTypedMemory 同层，让新会话开场即可继承。
 */
function importPromotedMemoryToGroupTypedMemory(scopeId, projectKey, options = {}) {
    const scope = String(scopeId || "").trim();
    const key = safeSegment(projectKey, "unassigned");
    const entries = listActivePromotedMemory(key)
        .slice(0, Math.max(1, Math.min(exports.PROMOTED_MEMORY_MAX_ENTRIES, Number(options.maxEntries || 60))));
    const slug = `promoted-memory-${key}`;
    const targetFile = path.join(require("./typed-memory-shared").getGroupTypedMemoryDir(scope), `${slug}.md`);
    if (!entries.length) {
        // 项目没有已升格记忆（或全部被撤销）时，清掉上一轮导入的残留文档。
        let removed = false;
        try {
            if (fs.existsSync(targetFile)) {
                fs.unlinkSync(targetFile);
                removed = true;
            }
        }
        catch { }
        return { schema: "ccm-promoted-memory-import-v1", scopeId: scope, project: key, imported: 0, removed, write: null };
    }
    const write = require("./typed-memory-index-build").upsertGroupTypedMemoryDocument(scope, {
        type: "user",
        slug,
        name: `Promoted cross-session memory: ${key}`,
        description: `Durable rules promoted from earlier ${key} group sessions (${entries.length} entries).`,
        source: `promoted-memory:${key}`,
        updatedAt: now(),
        body: renderPromotedMemoryBody(key, entries),
    });
    return {
        schema: "ccm-promoted-memory-import-v1",
        scopeId: scope,
        project: key,
        imported: entries.length,
        removed: false,
        write,
    };
}
//# sourceMappingURL=typed-memory-promotion.js.map