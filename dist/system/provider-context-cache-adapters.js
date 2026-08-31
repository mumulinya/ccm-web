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
exports.isProviderContextCacheFieldRejection = isProviderContextCacheFieldRejection;
exports.classifyProviderCacheFieldRejection = classifyProviderCacheFieldRejection;
exports.detectProviderCacheFamily = detectProviderCacheFamily;
exports.resolveProviderContextCacheAdapter = resolveProviderContextCacheAdapter;
exports.resolveProviderCacheBreakpointMessageIndexes = resolveProviderCacheBreakpointMessageIndexes;
exports.buildProviderContextCacheAdapterRequestPatch = buildProviderContextCacheAdapterRequestPatch;
exports.providerCacheAdapterPublicSummary = providerCacheAdapterPublicSummary;
exports.runProviderContextCacheAdapterSelfTest = runProviderContextCacheAdapterSelfTest;
const crypto = __importStar(require("crypto"));
const provider_cache_capability_matrix_1 = require("./provider-cache-capability-matrix");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const provider_cache_strategy_1 = require("./provider-cache-strategy");
const automatic_provider_cache_optimization_1 = require("./automatic-provider-cache-optimization");
function isProviderContextCacheFieldRejection(error) {
    const reason = String(error?.message || error || "");
    return /HTTP\s+(400|404|422).*?(prompt[_ -]?cache|cache[_ -]?(control|reference|edits?)|context[_ -]?management|cached[_ -]?content)|(?:unknown|unsupported|unrecognized|invalid).*?(cache|context_management|prompt_cache)/i.test(reason);
}
function classifyProviderCacheFieldRejection(error, protocol = "") {
    const reason = String(error?.message || error || "").toLowerCase();
    if (/prompt[_ -]?cache[_ -]?(?:breakpoint|control)|cache[_ -]?breakpoint|breakpoint/.test(reason))
        return "prompt_cache_breakpoint";
    if (/prompt[_ -]?cache[_ -]?(?:options?|retention)|cache[_ -]?options?|prompt_cache_options/.test(reason))
        return "prompt_cache_options";
    if (/prompt[_ -]?cache[_ -]?key|cache[_ -]?key/.test(reason))
        return "prompt_cache_key";
    if (protocol === "anthropic_messages" && /cache[_ -]?control/.test(reason))
        return "cache_control";
    if (/cache[_ -]?control|cache_control/.test(reason))
        return "cache_control";
    return "unknown";
}
function shortHash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, 32);
}
/** @deprecated Compatibility only. Healthy cache routing uses protocol + evidence. */
function detectProviderCacheFamily(config = {}, _hint = "") {
    const protocol = (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol;
    if (["chat_completions", "responses"].includes(protocol))
        return "openai";
    if (protocol === "anthropic_messages")
        return "anthropic";
    if (protocol === "gemini_generate_content")
        return "gemini";
    return "compatible";
}
function adapterForProtocol(protocol, enabled, execution) {
    if (!enabled)
        return "stable_prefix";
    if (protocol === "chat_completions" || protocol === "responses") {
        return execution?.keyMode === "session_key" || execution?.breakpointMode !== "none"
            ? "openai_prompt_cache"
            : "stable_prefix";
    }
    if (protocol === "anthropic_messages") {
        return execution?.breakpointMode !== "none" || execution?.editingMode === "native"
            ? "anthropic_context_management"
            : "stable_prefix";
    }
    if (protocol === "gemini_generate_content")
        return "gemini_implicit_cache";
    return "stable_prefix";
}
function resolveProviderContextCacheAdapter(config = {}, _hint = "", evidenceInput) {
    const internalMode = String(config?.providerCacheInternalMode || "").toLowerCase();
    const requestedMode = (0, automatic_provider_cache_optimization_1.automaticProviderCacheEnabled)()
        ? (["controlled", "off"].includes(internalMode) ? internalMode : "auto")
        : "off";
    const capabilityState = evidenceInput || (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config);
    const capabilityMatrix = (0, provider_cache_capability_matrix_1.buildProviderCacheCapabilityMatrix)(config, capabilityState);
    const strategy = (0, provider_cache_strategy_1.resolveProviderCacheStrategyV3)(config, { capabilityMatrix, capabilityState });
    const execution = strategy.execution;
    const explicitCapability = execution.keyMode !== "none" || execution.breakpointMode !== "none" || execution.editingMode === "native";
    const implicitCapability = capabilityMatrix.capabilities.implicitPrefix === "confirmed";
    const probeInProgress = config.providerCacheProbeInProgress === true;
    const forceNative = probeInProgress;
    const evidenceUnsupported = Object.values(capabilityMatrix.capabilities).some(value => value === "unsupported");
    const enabled = requestedMode !== "off" && (explicitCapability || implicitCapability || probeInProgress || (forceNative && !evidenceUnsupported));
    const adapter = requestedMode === "off" ? "disabled" : requestedMode === "controlled" ? "stable_prefix" : adapterForProtocol(capabilityMatrix.protocol, enabled, execution);
    const providerNative = adapter !== "stable_prefix" && adapter !== "disabled";
    const evidence = capabilityState?.evidence || null;
    return {
        schema: "ccm-provider-context-cache-adapter-capability-v3",
        version: 3,
        family: detectProviderCacheFamily(config),
        protocol: capabilityMatrix.protocol,
        protocolResolution: (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config),
        adapter,
        providerNative,
        providerManagedKvCache: providerNative,
        requestLayerOwned: capabilityMatrix.protocol !== "custom" || forceNative,
        capabilitySource: probeInProgress ? "capability_probe" : explicitCapability ? "confirmed_capability_evidence" : implicitCapability ? "provider_usage" : "ccm_safe_default",
        capabilityStatus: capabilityState?.status || "unproven",
        capabilityEvidenceId: evidence?.id || "",
        capabilityEvidenceExpiresAt: evidence?.expiresAt || "",
        capabilityReason: evidence?.reason || "cache_capability_not_proven",
        requestedMode,
        supportsPromptCacheKey: execution.keyMode === "session_key",
        supportsPromptCacheRetention: execution.keyMode === "session_key",
        supportsImplicitCache: implicitCapability,
        supportsContextManagement: capabilityMatrix.capabilities.blockCacheControl === "confirmed" || capabilityMatrix.capabilities.nativeCacheEditing === "confirmed",
        supportsCacheReferenceEdits: capabilityMatrix.capabilities.nativeCacheEditing === "confirmed",
        customCompatibleEndpoint: capabilityMatrix.protocol === "custom",
        safeToSendProviderFields: explicitCapability || probeInProgress || (forceNative && !evidenceUnsupported),
        forcedWithoutEvidence: forceNative && !explicitCapability && !probeInProgress,
        unsupportedEvidenceBlocksForce: evidenceUnsupported && !probeInProgress,
        capabilityEvidence: evidence,
        capabilityState,
        capabilityMatrix,
        resolvedExecution: execution,
        explicitBreakpointsVerified: capabilityMatrix.capabilities.explicitBreakpoints === "confirmed",
    };
}
function toolCallIds(message) {
    return (Array.isArray(message?.tool_calls) ? message.tool_calls : [])
        .map((call) => String(call?.id || ""))
        .filter(Boolean);
}
function hasCacheableInputBoundary(message) {
    const role = String(message?.role || "");
    // Responses attaches explicit breakpoints to input_text blocks.  A tool
    // message is encoded as function_call_output and cannot carry the marker;
    // assistant tool-call items likewise have no input_text boundary.
    if (role !== "user" && role !== "system")
        return false;
    if (Array.isArray(message?.content))
        return message.content.some((item) => {
            if (typeof item === "string")
                return item.trim().length > 0;
            return ["text", "input_text"].includes(String(item?.type || "")) && String(item?.text || "").trim().length > 0;
        });
    return String(message?.content ?? "").trim().length > 0;
}
function resolveProviderCacheBreakpointMessageIndexes(messagesInput, staticIndexes = [], maxBreakpoints = 4) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const pending = new Set();
    let rolling = -1;
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index] || {};
        if (String(message.role || "") === "assistant")
            for (const id of toolCallIds(message))
                pending.add(id);
        if (String(message.role || "") === "tool")
            pending.delete(String(message.tool_call_id || message.toolCallId || ""));
        if (pending.size === 0 && hasCacheableInputBoundary(message))
            rolling = index;
    }
    const validStatic = staticIndexes.filter(index => Number.isInteger(index)
        && index >= 0
        && index < messages.length
        && hasCacheableInputBoundary(messages[index]));
    const result = [...new Set([...validStatic, ...(rolling >= 0 ? [rolling] : [])])].sort((a, b) => a - b);
    return result.slice(-Math.max(1, maxBreakpoints));
}
function buildProviderContextCacheAdapterRequestPatch(config, plan, capabilityInput, messagesInput) {
    const capability = capabilityInput || resolveProviderContextCacheAdapter(config, plan?.provider || "");
    const strategy = (0, provider_cache_strategy_1.resolveProviderCacheStrategyV3)(config, capability);
    if (!plan || ["disabled", "stable_prefix"].includes(capability.adapter) || capability.safeToSendProviderFields !== true) {
        return { capability, strategy, body: {}, headers: {}, patchChecksum: "", promptCacheKeyChecksum: "", breakpointMessageIndexes: [], breakpointChecksums: [], breakpointDiagnostic: null };
    }
    let body = {};
    let breakpointMessageIndexes = [];
    if (strategy.execution.keyMode === "session_key") {
        body.prompt_cache_key = (0, automatic_provider_cache_optimization_1.buildAutomaticProviderCacheKey)(config, plan, strategy.capabilityMatrix);
    }
    if (strategy.execution.breakpointMode !== "none" && strategy.capabilityMatrix.protocol === "responses") {
        const stableCount = Math.max(0, Number(plan.stablePrefixBlockCount || 0));
        const staticIndexes = Array.from({ length: Math.min(3, stableCount) }, (_, offset) => stableCount - Math.min(3, stableCount) + offset);
        breakpointMessageIndexes = resolveProviderCacheBreakpointMessageIndexes(messagesInput || [], staticIndexes, 4);
    }
    if (strategy.transport === "responses_explicit") {
        body.prompt_cache_options = (0, provider_cache_strategy_1.responsesPromptCacheOptions)(strategy, breakpointMessageIndexes.length);
    }
    if (strategy.transport === "chat_completions_key" && strategy.ttl === "24h")
        body.prompt_cache_retention = "24h";
    if (config?.providerCacheDisableKey === true)
        delete body.prompt_cache_key;
    if (config?.providerCacheDisableOptions === true) {
        delete body.prompt_cache_options;
        delete body.prompt_cache_retention;
    }
    if (config?.providerCacheDisableBreakpoints === true)
        breakpointMessageIndexes = [];
    if (strategy.capabilityMatrix?.capabilities?.promptCacheOptions === "unsupported") {
        delete body.prompt_cache_options;
        delete body.prompt_cache_retention;
    }
    const breakpointChecksums = breakpointMessageIndexes.map(index => shortHash({
        index,
        role: String(messagesInput?.[index]?.role || ""),
        contentChecksum: shortHash(messagesInput?.[index]?.content || plan.blocks?.[index]?.contentChecksum || ""),
    }));
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const omittedCandidates = [];
    for (const [index, message] of messages.entries()) {
        if (String(message?.role || "") === "tool")
            omittedCandidates.push({ index, reason: "tool_message_unencodable" });
    }
    const breakpointDiagnostic = {
        schema: "ccm-cache-breakpoint-diagnostic-v2",
        mode: breakpointMessageIndexes.length
            ? "implicit_with_explicit_breakpoints"
            : body.prompt_cache_options?.mode === "explicit" ? "explicit" : "implicit",
        selectedIndexes: breakpointMessageIndexes.slice(),
        selectedRoles: breakpointMessageIndexes.map(index => String(messages[index]?.role || "")),
        encodedBreakpoints: breakpointMessageIndexes.length,
        omittedCandidates: omittedCandidates.slice(0, 16),
        payloadChecksum: shortHash({
            body,
            messages: messages.map((message) => ({ role: String(message?.role || ""), contentChecksum: shortHash(message?.content || "") })),
        }),
        contentStored: false,
    };
    const patch = { capability, strategy, body, headers: {}, breakpointMessageIndexes, breakpointChecksums };
    return {
        ...patch,
        breakpointDiagnostic,
        patchChecksum: Object.keys(body).length || breakpointMessageIndexes.length ? shortHash(patch) : "",
        promptCacheKeyChecksum: body.prompt_cache_key ? shortHash(String(body.prompt_cache_key)) : "",
    };
}
function providerCacheAdapterPublicSummary(config = {}) {
    const active = resolveProviderContextCacheAdapter(config);
    const automaticOptimization = (0, automatic_provider_cache_optimization_1.buildAutomaticCacheOptimizationProjection)({
        matrix: active.capabilityMatrix,
        execution: active.resolvedExecution,
        fallbackReason: active.capabilityReason,
    });
    return {
        schema: "ccm-provider-context-cache-adapter-summary-v3",
        version: 3,
        active,
        protocol: active.protocol,
        capabilityMatrix: active.capabilityMatrix,
        resolvedExecution: active.resolvedExecution,
        automaticOptimization,
        adapters: [
            { protocol: "chat_completions", capabilities: ["implicit_prefix", "explicit_cache_key"], guarded: true },
            { protocol: "responses", capabilities: ["implicit_prefix", "explicit_cache_key", "explicit_breakpoints"], guarded: true },
            { protocol: "anthropic_messages", capabilities: ["block_cache_control", "native_cache_editing"], guarded: true },
            { protocol: "gemini_generate_content", capabilities: ["implicit_prefix", "cache_usage_reporting"], guarded: true },
            { protocol: "custom", capabilities: ["stable_prefix", "controlled_editing"], guarded: true },
        ],
        falseNativeClaimsForbidden: true,
    };
}
function runProviderContextCacheAdapterSelfTest() {
    const officialChat = resolveProviderContextCacheAdapter({ apiUrl: "https://api.openai.com/v1", format: "openai-compatible" });
    const arbitraryNames = ["gpt", "claude", "qwen", "deepseek"].map(model => resolveProviderContextCacheAdapter({ apiUrl: "https://gateway.example/v1", format: "openai-compatible", model }));
    const responses = resolveProviderContextCacheAdapter({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" });
    const relayKeyOnly = resolveProviderContextCacheAdapter({ apiUrl: "https://gateway.example/v1", format: "openai-responses", model: "gpt-5.6" }, "", {
        status: "confirmed",
        explicitFieldStatus: "confirmed",
        implicitCacheStatus: "confirmed",
        evidence: { explicitFieldStatus: "confirmed", implicitCacheStatus: "confirmed", explicitBreakpointsVerified: false },
    });
    const messages = [
        { role: "system", content: "stable" },
        { role: "user", content: "old" },
        { role: "assistant", content: "done" },
        { role: "user", content: "current" },
    ];
    const patch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "s", generation: 1, boundaryGeneration: 0, stablePrefixBlockCount: 1, blocks: [{ contentChecksum: "a" }],
    }, responses, messages);
    const relayKeyOnlyPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://gateway.example/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "s", generation: 1, boundaryGeneration: 0, stablePrefixBlockCount: 1, blocks: [{ contentChecksum: "a" }],
    }, relayKeyOnly, messages);
    const siblingSessionPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "p", sessionId: "another-session", generation: 9, boundaryGeneration: 4, stablePrefixBlockCount: 1,
    }, responses, messages);
    const siblingProjectPatch = buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
        scope: "project", scopeId: "other-project", sessionId: "s", generation: 1, boundaryGeneration: 0, stablePrefixBlockCount: 1,
    }, responses, messages);
    const unfinished = resolveProviderCacheBreakpointMessageIndexes([
        { role: "user", content: "old" },
        { role: "assistant", tool_calls: [{ id: "t1" }] },
        { role: "user", content: "current" },
    ], [], 4);
    const checks = {
        officialChatUsesProtocolCapability: officialChat.protocol === "chat_completions" && officialChat.supportsPromptCacheKey,
        arbitraryModelNamesDoNotChangeProtocol: arbitraryNames.every(value => value.protocol === "chat_completions"),
        responsesAddsStaticAndRollingBreakpoints: patch.breakpointMessageIndexes.includes(0) && patch.breakpointMessageIndexes.includes(3) && !patch.breakpointMessageIndexes.includes(2) && patch.breakpointMessageIndexes.length <= 4,
        responsesUsesGenericExecution: patch.strategy.execution.breakpointMode === "static_and_rolling",
        responsesKeepsImplicitModeWithBreakpoints: patch.body.prompt_cache_options?.mode === "implicit" && patch.breakpointMessageIndexes.length > 0,
        relayCacheKeyWithoutVerifiedBreakpointsUsesImplicitMode: relayKeyOnlyPatch.strategy.execution.keyMode === "session_key"
            && relayKeyOnlyPatch.strategy.execution.breakpointMode === "none"
            && relayKeyOnlyPatch.body.prompt_cache_options?.mode === "implicit"
            && relayKeyOnlyPatch.breakpointMessageIndexes.length === 0,
        emptyEncodedBreakpointSetFallsBackToImplicitMode: buildProviderContextCacheAdapterRequestPatch({ apiUrl: "https://api.openai.com/v1", format: "openai-responses", model: "gpt-5.6" }, {
            scope: "project", scopeId: "p", sessionId: "s", stablePrefixBlockCount: 1, blocks: [{ contentChecksum: "a" }],
        }, responses, [{ role: "assistant", content: "not an input boundary" }]).body.prompt_cache_options?.mode === "implicit",
        unfinishedToolBatchIsNotBreakpoint: !unfinished.includes(1),
        completedToolBatchUsesCurrentInputBoundary: resolveProviderCacheBreakpointMessageIndexes([
            { role: "user", content: "old" },
            { role: "assistant", tool_calls: [{ id: "t1" }] },
            { role: "tool", tool_call_id: "t1", content: "result" },
            { role: "user", content: "current" },
        ], [], 4).includes(3),
        cacheKeyReusesAcrossSameScopeSessions: patch.body.prompt_cache_key === siblingSessionPatch.body.prompt_cache_key,
        cacheKeyIsolatesDifferentScopeIds: patch.body.prompt_cache_key !== siblingProjectPatch.body.prompt_cache_key,
        cacheKeyFitsProviderLimit: String(patch.body.prompt_cache_key || "").length <= 64,
        automaticLegacyFamilyIsIgnored: resolveProviderContextCacheAdapter({ format: "openai-compatible", providerNativeCacheFamily: "anthropic" }).protocol === "chat_completions",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-context-cache-adapters.js.map