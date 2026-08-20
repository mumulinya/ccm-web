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
exports.UNIFIED_COMPACTION_SYSTEM_PROMPT = exports.runUnifiedSummaryShapeCheck = exports.buildUnifiedSummaryPrompt = exports.buildUnifiedSummaryReference = exports.unifiedSummaryChecksum = exports.normalizeCcmUnifiedSummary = exports.runUnifiedScopeCompaction = exports.createUnifiedScopeAdapter = exports.CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA = exports.projectUnifiedSessionCompactionState = exports.buildUnifiedSessionCompactionStateV1 = exports.verifyUnifiedRecoveryAttachment = exports.buildUnifiedRecoveryAttachment = exports.createUnifiedSessionCompactionEngine = exports.UnifiedSessionCompactionEngine = void 0;
exports.resolveUnifiedCompactionPolicy = resolveUnifiedCompactionPolicy;
exports.shouldRunUnifiedFullCompaction = shouldRunUnifiedFullCompaction;
exports.buildUnifiedRecoveryContext = buildUnifiedRecoveryContext;
exports.buildUnifiedCompactionReceipt = buildUnifiedCompactionReceipt;
exports.estimateRecoveryContextTokens = estimateRecoveryContextTokens;
exports.orchestrateUnifiedCompaction = orchestrateUnifiedCompaction;
exports.projectUnifiedCompactionReceipt = projectUnifiedCompactionReceipt;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function positive(value, fallback, min = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.floor(n)) : fallback;
}
function resolveUnifiedCompactionPolicy(config = {}, overrides = {}) {
    const contextWindow = positive(config?.modelContextWindow || config?.model_context_window, 200_000, 18_000);
    const reserved = positive(config?.reservedOutputTokens || config?.reserved_output_tokens, 20_000);
    const threshold = positive(overrides.autoCompactThreshold
        ?? config?.autoCompactThreshold
        ?? config?.auto_compact_threshold
        ?? config?.modelAutoCompactTokenLimit
        ?? config?.model_auto_compact_token_limit, (0, context_budget_1.getAutoCompactThreshold)({ maxTokens: contextWindow, reservedOutputTokens: reserved }), overrides.autoCompactThreshold !== undefined ? 1 : 18_000);
    return {
        strategy: "cc_two_stage",
        // The unified default is enabled. Existing explicit false remains respected.
        microCompactEnabled: overrides.microCompactEnabled ?? (config?.timeBasedMicrocompactEnabled !== false && config?.time_based_microcompact_enabled !== false),
        pressureFirst: overrides.pressureFirst ?? true,
        idleAssistEnabled: overrides.idleAssistEnabled ?? (config?.timeBasedMicrocompactEnabled !== false && config?.time_based_microcompact_enabled !== false),
        idleGapMinutes: positive(overrides.idleGapMinutes ?? config?.timeBasedMicrocompactGapMinutes ?? config?.time_based_microcompact_gap_minutes, 60, 1),
        keepRecentToolResults: positive(overrides.keepRecentToolResults ?? config?.timeBasedMicrocompactKeepRecent ?? config?.time_based_microcompact_keep_recent, 5, 1),
        minKeepTokens: positive(overrides.minKeepTokens ?? config?.minKeepTokens ?? config?.min_keep_tokens, 10_000, 1),
        minKeepTextMessages: positive(overrides.minKeepTextMessages ?? config?.minKeepMessages ?? config?.min_keep_messages, 5, 1),
        maxKeepTokens: positive(overrides.maxKeepTokens ?? config?.maxKeepTokens ?? config?.max_keep_tokens, 40_000, 10_000),
        autoCompactThreshold: threshold,
    };
}
function shouldRunUnifiedFullCompaction(input) {
    const activeTokens = Math.max(0, Number(input.activeTokens || 0));
    const threshold = Math.max(1, Number(input.threshold || 0));
    return {
        required: input.force === true || input.promptTooLong === true || activeTokens >= threshold,
        activeTokens,
        threshold,
        pressure: threshold > 0 ? Math.round(activeTokens / threshold * 1000) / 10 : 0,
    };
}
function buildUnifiedRecoveryContext(input) {
    const clean = (value, max = 240) => String(value ?? "").trim().slice(0, max);
    const taskBindings = (Array.isArray(input.taskBindings) ? input.taskBindings : []).map(row => ({
        taskId: clean(row?.taskId || row?.task_id),
        ...(Number.isFinite(Number(row?.generation)) ? { generation: Number(row.generation) } : {}),
        ...(Number.isFinite(Number(row?.attempt)) ? { attempt: Number(row.attempt) } : {}),
        ...(row?.leaseId || row?.lease_id ? { leaseId: clean(row?.leaseId || row?.lease_id) } : {}),
    })).filter(row => row.taskId).slice(-32);
    const planBindings = (Array.isArray(input.planBindings) ? input.planBindings : []).map(row => ({
        planId: clean(row?.planId || row?.plan_id),
        ...(Number.isFinite(Number(row?.revision)) ? { revision: Number(row.revision) } : {}),
        ...(row?.checksum ? { checksum: clean(row.checksum, 128) } : {}),
    })).filter(row => row.planId).slice(-16);
    const result = {
        schema: "ccm-unified-recovery-context-v1",
        scope: input.scope,
        exactSessionId: clean(input.exactSessionId, 320),
        taskBindings,
        planBindings,
        fileReferences: (Array.isArray(input.fileReferences) ? input.fileReferences : []).map(row => clean(typeof row === "string" ? row : row?.path || row?.file)).filter(Boolean).slice(-48),
        verificationEvidence: (Array.isArray(input.verificationEvidence) ? input.verificationEvidence : []).map(row => clean(typeof row === "string" ? row : row?.id || row?.summary)).filter(Boolean).slice(-48),
        pendingActions: (Array.isArray(input.pendingActions) ? input.pendingActions : []).map(row => clean(typeof row === "string" ? row : row?.title || row?.action)).filter(Boolean).slice(-24),
        permissionBoundary: clean(input.permissionBoundary, 800),
        contentStored: false,
    };
    return { ...result, checksum: checksum(result) };
}
function buildUnifiedCompactionReceipt(input) {
    const core = {
        schema: "ccm-unified-session-compaction-v1",
        strategy: "cc_two_stage",
        scope: input.scope,
        exactSessionId: String(input.exactSessionId || ""),
        stage: input.stage || "idle",
        beforeTokens: Math.max(0, Number(input.beforeTokens || 0)),
        afterTokens: Math.max(0, Number(input.afterTokens || 0)),
        microCompactApplied: input.microCompactApplied === true,
        microCompactTrigger: input.microCompactTrigger || "none",
        summarySource: input.summarySource || "none",
        gateStatus: input.gateStatus || "ready",
        boundaryGeneration: Math.max(0, Number(input.boundaryGeneration || 0)),
        summaryChecksum: String(input.summaryChecksum || ""),
        recoveryContextChecksum: String(input.recoveryContextChecksum || ""),
        contentStored: false,
        createdAt: String(input.createdAt || new Date().toISOString()),
    };
    return { ...core, checksum: checksum(core) };
}
function estimateRecoveryContextTokens(context) {
    return context ? (0, context_budget_1.estimateTextTokens)(JSON.stringify(context)) : 0;
}
/**
 * Shared decision/receipt boundary used by all three session adapters. The
 * adapter owns model summarisation and transactional persistence; this layer
 * owns only the invariant two-stage policy and safe receipt shape.
 */
function orchestrateUnifiedCompaction(input) {
    const decision = shouldRunUnifiedFullCompaction({
        activeTokens: input.activeTokens,
        threshold: input.threshold,
        force: input.force,
        promptTooLong: input.promptTooLong,
    });
    const microApplied = input.microCompactApplied === true;
    const receipt = buildUnifiedCompactionReceipt({
        scope: input.scope,
        exactSessionId: input.exactSessionId,
        stage: decision.required ? (input.afterTokens === undefined ? "full_compaction" : "post_gate") : microApplied ? "microcompact" : "idle",
        beforeTokens: decision.activeTokens,
        afterTokens: Math.max(0, Number(input.afterTokens ?? input.activeTokens)),
        microCompactApplied: microApplied,
        microCompactTrigger: input.microCompactTrigger || "none",
        summarySource: input.summarySource || "none",
        gateStatus: decision.required && input.afterTokens === undefined ? "recompact_required" : "ready",
        boundaryGeneration: input.boundaryGeneration || 0,
        recoveryContextChecksum: input.recoveryContextChecksum || "",
    });
    return { decision, receipt, projection: projectUnifiedCompactionReceipt(receipt, input.summaryQuality) };
}
function projectUnifiedCompactionReceipt(receipt, summaryQuality) {
    if (!receipt || receipt.schema !== "ccm-unified-session-compaction-v1")
        return null;
    return {
        schema: "ccm-unified-session-compaction-projection-v1",
        scope: receipt.scope,
        exactSessionId: receipt.exactSessionId,
        strategy: "cc_two_stage",
        stage: receipt.stage,
        beforeTokens: receipt.beforeTokens,
        afterTokens: receipt.afterTokens,
        microCompactApplied: receipt.microCompactApplied,
        summarySource: receipt.summarySource,
        gateStatus: receipt.gateStatus,
        boundaryGeneration: receipt.boundaryGeneration,
        summaryQuality: summaryQuality ?? null,
        receiptChecksum: receipt.checksum,
        contentStored: false,
    };
}
var unified_session_compaction_engine_1 = require("./unified-session-compaction-engine");
Object.defineProperty(exports, "UnifiedSessionCompactionEngine", { enumerable: true, get: function () { return unified_session_compaction_engine_1.UnifiedSessionCompactionEngine; } });
Object.defineProperty(exports, "createUnifiedSessionCompactionEngine", { enumerable: true, get: function () { return unified_session_compaction_engine_1.createUnifiedSessionCompactionEngine; } });
var unified_session_compaction_recovery_1 = require("./unified-session-compaction-recovery");
Object.defineProperty(exports, "buildUnifiedRecoveryAttachment", { enumerable: true, get: function () { return unified_session_compaction_recovery_1.buildUnifiedRecoveryAttachment; } });
Object.defineProperty(exports, "verifyUnifiedRecoveryAttachment", { enumerable: true, get: function () { return unified_session_compaction_recovery_1.verifyUnifiedRecoveryAttachment; } });
var unified_session_compaction_state_1 = require("./unified-session-compaction-state");
Object.defineProperty(exports, "buildUnifiedSessionCompactionStateV1", { enumerable: true, get: function () { return unified_session_compaction_state_1.buildUnifiedSessionCompactionStateV1; } });
Object.defineProperty(exports, "projectUnifiedSessionCompactionState", { enumerable: true, get: function () { return unified_session_compaction_state_1.projectUnifiedSessionCompactionState; } });
Object.defineProperty(exports, "CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA", { enumerable: true, get: function () { return unified_session_compaction_state_1.CCM_UNIFIED_SESSION_COMPACTION_STATE_SCHEMA; } });
var unified_session_compaction_adapters_1 = require("./unified-session-compaction-adapters");
Object.defineProperty(exports, "createUnifiedScopeAdapter", { enumerable: true, get: function () { return unified_session_compaction_adapters_1.createUnifiedScopeAdapter; } });
Object.defineProperty(exports, "runUnifiedScopeCompaction", { enumerable: true, get: function () { return unified_session_compaction_adapters_1.runUnifiedScopeCompaction; } });
var unified_session_compaction_summary_1 = require("./unified-session-compaction-summary");
Object.defineProperty(exports, "normalizeCcmUnifiedSummary", { enumerable: true, get: function () { return unified_session_compaction_summary_1.normalizeCcmUnifiedSummary; } });
Object.defineProperty(exports, "unifiedSummaryChecksum", { enumerable: true, get: function () { return unified_session_compaction_summary_1.unifiedSummaryChecksum; } });
Object.defineProperty(exports, "buildUnifiedSummaryReference", { enumerable: true, get: function () { return unified_session_compaction_summary_1.buildUnifiedSummaryReference; } });
Object.defineProperty(exports, "buildUnifiedSummaryPrompt", { enumerable: true, get: function () { return unified_session_compaction_summary_1.buildUnifiedSummaryPrompt; } });
Object.defineProperty(exports, "runUnifiedSummaryShapeCheck", { enumerable: true, get: function () { return unified_session_compaction_summary_1.runUnifiedSummaryShapeCheck; } });
Object.defineProperty(exports, "UNIFIED_COMPACTION_SYSTEM_PROMPT", { enumerable: true, get: function () { return unified_session_compaction_summary_1.UNIFIED_COMPACTION_SYSTEM_PROMPT; } });
//# sourceMappingURL=unified-session-compaction.js.map