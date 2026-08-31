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
exports.normalizeCcmContextCapacity = normalizeCcmContextCapacity;
exports.checksumCcmContextAccounting = checksumCcmContextAccounting;
exports.buildCcmProviderIdentityChecksum = buildCcmProviderIdentityChecksum;
exports.normalizeCcmPrimaryTokenBreakdown = normalizeCcmPrimaryTokenBreakdown;
exports.normalizeCcmTechnicalTokenBreakdown = normalizeCcmTechnicalTokenBreakdown;
exports.sumCcmPrimaryTokenBreakdown = sumCcmPrimaryTokenBreakdown;
const crypto = __importStar(require("crypto"));
function normalizeCcmContextCapacity(input = {}) {
    const configuredWindow = Math.max(0, Math.floor(Number(input.rawWindowTokens
        ?? input.raw_window_tokens
        ?? input.contextWindow
        ?? input.context_window
        ?? input.modelContextWindow
        ?? input.model_context_window
        ?? 0)));
    // CCM's evidence-free baseline is a 200K total context window with a 20K
    // output reservation. Never turn missing provider evidence into an
    // artificially precise 18K capacity.
    const rawWindowTokens = configuredWindow > 0 ? configuredWindow : 200_000;
    const requestedSemantics = String(input.windowSemantics || input.window_semantics || "").toLowerCase();
    const windowSemantics = requestedSemantics === "max_input"
        ? "max_input"
        : requestedSemantics === "total_context"
            ? "total_context"
            : input.maxInputTokens !== undefined || input.max_input_tokens !== undefined
                ? "max_input"
                : "total_context";
    const reservedOutputTokens = windowSemantics === "max_input"
        ? 0
        : Math.min(20_000, Math.max(0, Math.floor(Number(input.reservedOutputTokens ?? input.reserved_output_tokens ?? input.maxOutputTokens ?? input.max_output_tokens ?? 20_000))));
    const effectiveInputWindowTokens = Math.max(18_000, windowSemantics === "max_input" ? rawWindowTokens : rawWindowTokens - reservedOutputTokens);
    const autoCompactBufferTokens = Math.max(0, Math.floor(Number(input.autoCompactBufferTokens ?? input.auto_compact_buffer_tokens ?? 13_000)));
    const sourceValue = String(input.source || "");
    const source = sourceValue === "provider_capability" || sourceValue === "user_setting" || sourceValue === "conservative_fallback"
        ? sourceValue
        : "conservative_fallback";
    return {
        schema: "ccm-context-capacity-v2",
        provider: String(input.provider || ""),
        model: String(input.model || ""),
        rawWindowTokens,
        windowSemantics,
        reservedOutputTokens,
        effectiveInputWindowTokens,
        autoCompactBufferTokens,
        autoCompactThresholdTokens: Math.max(18_000, effectiveInputWindowTokens - autoCompactBufferTokens),
        source,
        confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 0))),
        ...(input.evidenceId || input.evidence_id ? { evidenceId: String(input.evidenceId || input.evidence_id) } : {}),
    };
}
function checksumCcmContextAccounting(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function buildCcmProviderIdentityChecksum(input = {}) {
    const endpoint = String(input.endpoint || input.apiUrl || input.api_url || "").trim().replace(/\/+$/, "");
    const protocol = String(input.protocol || input.format || "").trim().toLowerCase();
    const provider = String(input.provider || "").trim().toLowerCase();
    const model = String(input.model || "").trim();
    return checksumCcmContextAccounting({ endpoint, protocol, provider, model });
}
function normalizeCcmPrimaryTokenBreakdown(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    // Tool calls and tool results already live in the conversation timeline.
    // Legacy mcpResults fields are intentionally ignored here so they cannot
    // inflate the canonical primary total a second time.
    const conversation = Math.max(0, Math.floor(Number(source.conversation ?? source.recentMessages ?? source.recent_messages ?? 0)));
    return {
        systemPrompt: Math.max(0, Math.floor(Number(source.systemPrompt ?? source.system ?? 0))),
        rules: Math.max(0, Math.floor(Number(source.rules || 0))),
        skills: Math.max(0, Math.floor(Number(source.skills || 0))),
        systemTools: Math.max(0, Math.floor(Number(source.systemTools ?? source.system_tools ?? source.tools ?? source.toolDefinitions ?? source.tool_definitions ?? 0))),
        mcpAndDynamicTools: Math.max(0, Math.floor(Number(source.mcpAndDynamicTools ?? source.mcpTools ?? source.mcp ?? 0))),
        subagentDefinitions: Math.max(0, Math.floor(Number(source.subagentDefinitions ?? source.subagents ?? 0))),
        memoryAndLoadedContext: Math.max(0, Math.floor(Number(source.memoryAndLoadedContext ?? source.memory_and_loaded_context ?? source.loadedContext ?? source.loaded_context ?? 0))),
        summarizedConversation: Math.max(0, Math.floor(Number(source.summarizedConversation ?? source.summary ?? 0))),
        conversation,
        currentRequest: Math.max(0, Math.floor(Number(source.currentRequest ?? source.current_request ?? 0))),
    };
}
function normalizeCcmTechnicalTokenBreakdown(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    return {
        recoveryContext: Math.max(0, Math.floor(Number(source.recoveryContext ?? source.recovery_context ?? 0))),
        hooks: Math.max(0, Math.floor(Number(source.hooks ?? source.hookResults ?? source.hook_results ?? 0))),
        workerBootstrap: Math.max(0, Math.floor(Number(source.workerBootstrap ?? source.worker_bootstrap ?? 0))),
        hydratedContext: Math.max(0, Math.floor(Number(source.hydratedContext ?? source.hydrated_context ?? 0))),
        providerEnvelope: Math.max(0, Math.floor(Number(source.providerEnvelope ?? source.provider_envelope ?? 0))),
        providerUnpartitionedRemainder: Math.max(0, Math.floor(Number(source.providerUnpartitionedRemainder ?? source.provider_remainder ?? 0))),
    };
}
function sumCcmPrimaryTokenBreakdown(value) {
    return Object.values(value).reduce((sum, tokenCount) => sum + Math.max(0, Math.floor(Number(tokenCount || 0))), 0);
}
//# sourceMappingURL=ccm-context-accounting-v2.js.map