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
exports.responsesModelSupportsExplicitBreakpoints = responsesModelSupportsExplicitBreakpoints;
exports.buildProviderCacheCapabilityMatrix = buildProviderCacheCapabilityMatrix;
exports.runProviderCacheCapabilityMatrixSelfTest = runProviderCacheCapabilityMatrixSelfTest;
const crypto = __importStar(require("crypto"));
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function status(value) {
    return ["confirmed", "degraded", "unsupported"].includes(String(value || ""))
        ? String(value)
        : "unproven";
}
function officialEndpoint(config, protocol) {
    if ((0, provider_cache_protocol_1.hasConfiguredProviderProxy)(config))
        return false;
    try {
        const host = new URL(String(config?.apiUrl || "")).hostname.toLowerCase();
        if (protocol === "chat_completions" || protocol === "responses")
            return /(?:^|\.)openai\.com$/.test(host);
        if (protocol === "anthropic_messages")
            return /(?:^|\.)anthropic\.com$/.test(host);
        if (protocol === "gemini_generate_content")
            return /(?:^|\.)googleapis\.com$/.test(host) && /generativelanguage/.test(host);
    }
    catch { }
    return false;
}
/**
 * OpenAI's explicit Responses cache breakpoints are a model capability, not
 * merely a transport capability.  Keep unknown/relay model names on the
 * implicit path until a real capability probe can prove otherwise.
 */
function responsesModelSupportsExplicitBreakpoints(modelInput) {
    const model = String(modelInput || "").trim().toLowerCase();
    const match = /^gpt-(\d+)(?:\.(\d+))?(?:$|[-_])/.exec(model);
    if (!match)
        return false;
    const major = Number(match[1]);
    const minor = Number(match[2] || 0);
    return major > 5 || (major === 5 && minor >= 6);
}
function buildProviderCacheCapabilityMatrix(config = {}, stateInput) {
    const protocolResolution = (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config);
    const state = stateInput || (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config);
    const evidence = state?.evidence || {};
    const official = officialEndpoint(config, protocolResolution.protocol);
    const implicit = status(state?.implicitCacheStatus || evidence?.implicitCacheStatus);
    const explicit = status(state?.explicitFieldStatus || evidence?.explicitFieldStatus);
    const explicitKeyEvidence = status(state?.promptCacheKeyStatus || evidence?.promptCacheKeyStatus || state?.explicitCacheKeyStatus || evidence?.explicitCacheKeyStatus || explicit);
    const explicitOptionsEvidence = status(state?.promptCacheOptionsStatus || evidence?.promptCacheOptionsStatus);
    const explicitBreakpointEvidence = status(state?.explicitBreakpointsStatus || evidence?.explicitBreakpointsStatus || explicit);
    const responsesContinuationEvidence = status(state?.responsesContinuationStatus || evidence?.responsesContinuationStatus);
    const responsesToolLoopContinuationEvidence = status(state?.responsesToolLoopContinuationStatus || evidence?.responsesToolLoopContinuationStatus);
    const responsesWebSocketEvidence = status(state?.responsesWebSocketStatus || evidence?.responsesWebSocketStatus);
    const responsesWebSocketResponseCreateEvidence = status(state?.responsesWebSocketResponseCreateStatus || evidence?.responsesWebSocketResponseCreateStatus);
    const responsesWebSocketContinuationEvidence = status(state?.responsesWebSocketContinuationStatus || evidence?.responsesWebSocketContinuationStatus);
    const responsesWebSocketToolLoopEvidence = status(state?.responsesWebSocketToolLoopStatus || evidence?.responsesWebSocketToolLoopStatus);
    const blockCacheEvidence = status(state?.blockCacheControlStatus || evidence?.blockCacheControlStatus);
    const usage = Number(state?.hitCount || evidence?.hitCount || 0) > 0 || implicit === "confirmed"
        ? "confirmed"
        : status(evidence?.cacheUsageReportingStatus || (state?.latestAttempt?.reason === "provider_cache_usage_not_reported" ? "degraded" : "unproven"));
    let explicitCacheKey = "unproven";
    let explicitBreakpoints = "unproven";
    let blockCacheControl = "unproven";
    let nativeCacheEditing = "unproven";
    let responsesContinuation = "unproven";
    let responsesToolLoopContinuation = "unproven";
    let responsesWebSocketStatus = responsesWebSocketEvidence;
    let responsesWebSocketResponseCreateStatus = responsesWebSocketResponseCreateEvidence;
    let responsesWebSocketContinuationStatus = responsesWebSocketContinuationEvidence;
    let responsesWebSocketToolLoopStatus = responsesWebSocketToolLoopEvidence;
    let supportedTtls = ["provider_default"];
    if (protocolResolution.protocol === "chat_completions") {
        // `prompt_cache_key` is a standard optional routing hint for the OpenAI
        // wire protocol.  Use it immediately for a configured Chat Completions
        // endpoint instead of waiting for a separate probe; if a relay rejects
        // the field, the existing field-scoped retry path records `unsupported`
        // and removes it on subsequent requests.
        explicitCacheKey = explicitKeyEvidence === "unsupported" ? "unsupported" : "confirmed";
        supportedTtls = ["provider_default"];
    }
    else if (protocolResolution.protocol === "responses") {
        // Responses providers likewise support the stable routing key without
        // requiring explicit breakpoint support.  Breakpoints remain separately
        // capability-gated below.
        explicitCacheKey = explicitKeyEvidence === "unsupported" ? "unsupported" : "confirmed";
        const modelSupportsExplicitBreakpoints = responsesModelSupportsExplicitBreakpoints(config?.model);
        // A relay can temporarily report a degraded breakpoint sample (for
        // example, a tiny baseline fragment) even though the same transport has
        // already returned substantial cached prefixes for requests carrying a
        // breakpoint.  Do not throw that proven path away permanently: the
        // registry keeps the cumulative prefix-extension streak and token totals
        // specifically so a restart can re-enable the previously useful layout.
        const historicalSamples = [
            ...(Array.isArray(state?.recentForegroundSamples) ? state.recentForegroundSamples : []),
            ...(Array.isArray(evidence?.recentForegroundSamples) ? evidence.recentForegroundSamples : []),
        ];
        const historicalMeaningfulUsage = historicalSamples.some((sample) => {
            const cacheRead = Math.max(0, Number(sample?.cacheReadTokens || 0));
            const providerInput = Math.max(0, Number(sample?.providerInputTokens || 0));
            // Compare against the Provider's own reported input instead of a fixed
            // token floor. This recognizes a genuinely reused prefix while ignoring
            // a small baseline fragment without assuming that every Provider uses
            // the same cache block size.
            return cacheRead > 0 && providerInput > 0 && cacheRead >= providerInput * 0.5;
        });
        const historicalPrefixReuseObserved = String(state?.prefixExtensionStatus
            ?? evidence?.prefixExtensionStatus
            ?? "") === "confirmed" || historicalMeaningfulUsage;
        // A previous large prefix hit is stronger evidence than the latest
        // capability label. The label can be downgraded by a later 192-token
        // baseline sample, but that sample must not disable the breakpoint path
        // that produced the earlier 20k+ reuse. Keep it enabled unless the
        // Provider explicitly rejected the field.
        const historicalPrefixReuseCanUseBreakpoints = explicitBreakpointEvidence !== "unsupported"
            && explicitKeyEvidence !== "unsupported"
            && historicalPrefixReuseObserved;
        // A successful, provider-specific capability probe is authoritative even
        // when the relay exposes a model name that does not follow OpenAI's
        // `gpt-*` naming convention (for example grok-4.6).  The model-name gate
        // remains the safe default for official endpoints, while verified
        // evidence is explicitly opt-in and scoped to this exact transport/model
        // identity by the capability registry.
        explicitBreakpoints = explicitBreakpointEvidence === "unsupported"
            ? "unsupported"
            : evidence?.explicitBreakpointsVerified === true
                || (modelSupportsExplicitBreakpoints && official)
                || historicalPrefixReuseCanUseBreakpoints
                ? "confirmed"
                : "unproven";
        responsesContinuation = official
            ? "confirmed"
            : responsesContinuationEvidence;
        responsesToolLoopContinuation = official
            ? "confirmed"
            : responsesToolLoopContinuationEvidence;
        // A routing key proves neither retention support nor a selected lifetime.
        supportedTtls = ["provider_default"];
    }
    else if (protocolResolution.protocol === "anthropic_messages") {
        blockCacheControl = blockCacheEvidence === "unsupported" ? "unsupported" : official ? "confirmed" : blockCacheEvidence;
        nativeCacheEditing = evidence?.nativeCacheEditingStatus === "confirmed"
            ? "confirmed"
            : evidence?.nativeCacheEditingStatus === "unsupported" ? "unsupported" : "unproven";
        supportedTtls = ["provider_default"];
    }
    const transportIdentityChecksum = String(state?.identity?.transportIdentityChecksum || hash({
        protocol: protocolResolution.protocol,
        transportParametersChecksum: protocolResolution.transportParametersChecksum,
        model: String(config?.model || ""),
    }));
    return {
        schema: "ccm-provider-cache-capability-matrix-v1",
        transportIdentityChecksum,
        protocol: protocolResolution.protocol,
        capabilities: {
            implicitPrefix: implicit === "unsupported" ? "unsupported" : official ? "confirmed" : implicit,
            explicitCacheKey,
            promptCacheOptions: explicitOptionsEvidence === "unsupported" ? "unsupported" : official ? "confirmed" : explicitOptionsEvidence,
            explicitBreakpoints,
            responsesContinuation,
            responsesToolLoopContinuation,
            responsesWebSocketStatus,
            responsesWebSocketResponseCreateStatus,
            responsesWebSocketContinuationStatus,
            responsesWebSocketToolLoopStatus,
            blockCacheControl,
            nativeCacheEditing,
            cacheUsageReporting: usage,
        },
        supportedTtls,
        evidenceUpdatedAt: String(evidence?.checkedAt || state?.latestAttempt?.checkedAt || ""),
        contentStored: false,
    };
}
function runProviderCacheCapabilityMatrixSelfTest() {
    const models = ["gpt-any", "claude-any", "gemini-any", "qwen-any", "deepseek-any"];
    const matrices = models.map(model => buildProviderCacheCapabilityMatrix({
        format: "openai-compatible",
        apiUrl: "https://gateway.example/v1/chat/completions",
        model,
    }, { identity: { transportIdentityChecksum: `id-${model}` }, implicitCacheStatus: "confirmed", explicitFieldStatus: "unproven" }));
    const checks = {
        modelNamesShareProtocolDecision: matrices.every(value => value.protocol === "chat_completions"),
        implicitEvidenceIsSharedRule: matrices.every(value => value.capabilities.implicitPrefix === "confirmed"),
        standardProtocolUsesStableKeyWithoutProbe: matrices.every(value => value.capabilities.explicitCacheKey === "confirmed"),
        responsesRequiresSupportedModel: buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://api.openai.com/v1", model: "gpt-5.6" }, {}).capabilities.explicitBreakpoints === "confirmed"
            && buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://api.openai.com/v1", model: "gpt-5.5" }, {}).capabilities.explicitBreakpoints !== "confirmed",
        verifiedRelayModelUsesExplicitBreakpoints: buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://relay.example/v1", model: "grok-4.6" }, {
            identity: { transportIdentityChecksum: "relay-grok" },
            explicitBreakpointsStatus: "confirmed",
            explicitBreakpointsVerified: true,
            evidence: { explicitBreakpointsStatus: "confirmed", explicitBreakpointsVerified: true },
        }).capabilities.explicitBreakpoints === "confirmed",
        degradedRelayWithHistoricalReuseCanRetryBreakpoints: buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://relay.example/v1", model: "grok-4.6" }, {
            identity: { transportIdentityChecksum: "relay-grok-degraded" },
            explicitBreakpointsStatus: "degraded",
            explicitCacheKeyStatus: "confirmed",
            implicitCacheStatus: "confirmed",
            prefixExtensionStatus: "confirmed",
            lastCacheReadTokens: 192,
            foregroundCacheReadTokens: 8192,
        }).capabilities.explicitBreakpoints === "confirmed",
        baselineOnlyRelayDoesNotRecoverBreakpoints: buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://relay.example/v1", model: "grok-4.6" }, {
            identity: { transportIdentityChecksum: "relay-grok-baseline" },
            explicitBreakpointsStatus: "degraded",
            explicitCacheKeyStatus: "confirmed",
            implicitCacheStatus: "confirmed",
            prefixExtensionStatus: "degraded",
            prefixExtensionSuccessStreak: 8,
            lastCacheReadTokens: 192,
            foregroundCacheReadTokens: 8192,
        }).capabilities.explicitBreakpoints !== "confirmed",
        proxiedOfficialEndpointKeepsStandardKeyButNotBreakpoints: buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://api.openai.com/v1", proxyUrl: "https://relay.example", model: "gpt-5.6" }, {}).capabilities.explicitCacheKey === "confirmed"
            && buildProviderCacheCapabilityMatrix({ format: "openai-responses", apiUrl: "https://api.openai.com/v1", proxyUrl: "https://relay.example", model: "gpt-5.6" }, {}).capabilities.explicitBreakpoints !== "confirmed",
        anthropicProtocolUsesGenericBlockCapability: buildProviderCacheCapabilityMatrix({ format: "anthropic-compatible", apiUrl: "https://api.anthropic.com/v1" }, {}).capabilities.blockCacheControl === "confirmed",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-capability-matrix.js.map