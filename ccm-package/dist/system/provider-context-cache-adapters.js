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
exports.detectProviderCacheFamily = detectProviderCacheFamily;
exports.resolveProviderContextCacheAdapter = resolveProviderContextCacheAdapter;
exports.buildProviderContextCacheAdapterRequestPatch = buildProviderContextCacheAdapterRequestPatch;
exports.providerCacheAdapterPublicSummary = providerCacheAdapterPublicSummary;
exports.runProviderContextCacheAdapterSelfTest = runProviderContextCacheAdapterSelfTest;
const crypto = __importStar(require("crypto"));
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
function hostOf(value) {
    try {
        return new URL(String(value || "")).hostname.toLowerCase();
    }
    catch {
        return "";
    }
}
function shortHash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, 32);
}
function detectProviderCacheFamily(config = {}, hint = "") {
    const declared = String(config.providerNativeCacheFamily || config.provider_native_cache_family || "auto").toLowerCase();
    if (["anthropic", "openai", "gemini", "compatible"].includes(declared))
        return declared;
    const format = String(config.format || "auto").toLowerCase();
    const host = hostOf(config.apiUrl);
    const value = `${hint} ${format} ${host}`.toLowerCase();
    if (format === "gemini-compatible" || /generativelanguage\.googleapis\.com|\bgemini\b/.test(value))
        return "gemini";
    if (format === "anthropic-compatible" || /(?:^|\.)anthropic\.com$/.test(host) || /\banthropic\b|\bclaude\b/.test(value))
        return "anthropic";
    if (/(?:^|\.)openai\.com$/.test(host) || format === "openai" || format === "openai-responses" || hint === "openai")
        return "openai";
    return "compatible";
}
function resolveProviderContextCacheAdapter(config = {}, hint = "", evidenceInput) {
    const family = detectProviderCacheFamily(config, hint);
    const requestedMode = String(config.providerContextCacheMode || config.provider_context_cache_mode || "auto").toLowerCase();
    const host = hostOf(config.apiUrl);
    const explicitNative = config.providerNativeCacheEnabled === true || config.provider_native_cache_enabled === true;
    const forceNative = explicitNative || requestedMode === "native";
    const capabilityState = evidenceInput || (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config);
    const evidenceStatus = String(capabilityState?.evidence?.status || capabilityState?.status || "unproven");
    const probeInProgress = config.providerCacheProbeInProgress === true;
    const officialOpenAi = /(?:^|\.)openai\.com$/.test(host);
    const officialAnthropic = /(?:^|\.)anthropic\.com$/.test(host);
    const officialGemini = /(?:^|\.)googleapis\.com$/.test(host) && /generativelanguage/.test(host);
    const officialEndpoint = officialOpenAi || officialAnthropic || officialGemini;
    const evidenceConfirmed = evidenceStatus === "confirmed";
    const evidenceUnsupported = evidenceStatus === "unsupported";
    const nativeAllowed = officialEndpoint
        || evidenceConfirmed
        || probeInProgress
        || (forceNative && !evidenceUnsupported);
    let adapter = "stable_prefix";
    let providerNative = false;
    let capabilitySource = "ccm_safe_default";
    if (requestedMode === "off")
        adapter = "disabled";
    else if (requestedMode === "controlled") {
        adapter = "stable_prefix";
        capabilitySource = "ccm_controlled_by_user";
    }
    else if (family === "anthropic" && nativeAllowed) {
        adapter = "anthropic_context_management";
        providerNative = true;
        capabilitySource = officialAnthropic ? "official_endpoint" : evidenceConfirmed ? "confirmed_capability_evidence" : probeInProgress ? "capability_probe" : "explicit_force_unproven";
    }
    else if (family === "openai" && nativeAllowed) {
        adapter = "openai_prompt_cache";
        providerNative = true;
        capabilitySource = officialOpenAi ? "official_endpoint" : evidenceConfirmed ? "confirmed_capability_evidence" : probeInProgress ? "capability_probe" : "explicit_force_unproven";
    }
    else if (family === "gemini" && nativeAllowed) {
        adapter = "gemini_implicit_cache";
        providerNative = true;
        capabilitySource = officialGemini ? "official_endpoint" : evidenceConfirmed ? "confirmed_capability_evidence" : probeInProgress ? "capability_probe" : "explicit_force_unproven";
    }
    else if (evidenceUnsupported) {
        capabilitySource = "explicit_unsupported_evidence";
    }
    return {
        schema: "ccm-provider-context-cache-adapter-capability-v2",
        version: 2,
        family,
        adapter,
        providerNative,
        providerManagedKvCache: providerNative,
        requestLayerOwned: family !== "compatible" || explicitNative,
        capabilitySource,
        capabilityStatus: officialEndpoint ? "confirmed" : evidenceStatus,
        capabilityEvidenceId: capabilityState?.evidence?.id || "",
        capabilityEvidenceExpiresAt: capabilityState?.evidence?.expiresAt || "",
        capabilityReason: capabilityState?.evidence?.reason || (evidenceUnsupported ? "native_fields_rejected" : "native_cache_not_proven"),
        requestedMode,
        supportsPromptCacheKey: adapter === "openai_prompt_cache",
        supportsPromptCacheRetention: adapter === "openai_prompt_cache",
        supportsImplicitCache: adapter === "gemini_implicit_cache",
        supportsContextManagement: adapter === "anthropic_context_management",
        supportsCacheReferenceEdits: adapter === "anthropic_context_management" && config.anthropicCacheReferenceEnabled === true,
        customCompatibleEndpoint: family === "compatible",
        safeToSendProviderFields: providerNative,
        forcedWithoutEvidence: providerNative && !officialEndpoint && !evidenceConfirmed && !probeInProgress,
        unsupportedEvidenceBlocksForce: evidenceUnsupported && !probeInProgress,
    };
}
function buildProviderContextCacheAdapterRequestPatch(config, plan, capabilityInput) {
    const capability = capabilityInput || resolveProviderContextCacheAdapter(config, plan?.provider || "");
    if (!plan || capability.adapter === "disabled" || capability.safeToSendProviderFields !== true) {
        return { capability, body: {}, headers: {}, patchChecksum: "" };
    }
    let body = {};
    if (capability.adapter === "openai_prompt_cache") {
        const retention = String(config.providerPromptCacheRetention || config.provider_prompt_cache_retention || "in_memory").toLowerCase();
        body = {
            prompt_cache_key: `ccm-${shortHash({ scope: plan.scope, scopeId: plan.scopeId, sessionId: plan.sessionId, generation: plan.generation, boundaryGeneration: plan.boundaryGeneration })}`,
            ...(retention === "24h" ? { prompt_cache_retention: "24h" } : {}),
        };
    }
    const patch = { capability, body, headers: {} };
    return { ...patch, patchChecksum: Object.keys(body).length ? shortHash(patch) : "" };
}
function providerCacheAdapterPublicSummary(config = {}) {
    const active = resolveProviderContextCacheAdapter(config);
    return {
        schema: "ccm-provider-context-cache-adapter-summary-v2",
        version: 2,
        active,
        adapters: [
            { family: "anthropic", mode: "native_context_management", fields: ["context_management", "cache_reference", "cache_edits"], guarded: true },
            { family: "openai", mode: "native_prompt_cache", fields: ["prompt_cache_key", "prompt_cache_retention"], guarded: true },
            { family: "gemini", mode: "native_implicit_cache", fields: ["cachedContentTokenCount"], guarded: true },
            { family: "compatible", mode: "stable_prefix_or_ccm_projection", fields: [], guarded: true },
        ],
        falseNativeClaimsForbidden: true,
    };
}
function runProviderContextCacheAdapterSelfTest() {
    const openai = resolveProviderContextCacheAdapter({ apiUrl: "https://api.openai.com/v1", format: "openai-compatible" });
    const anthropic = resolveProviderContextCacheAdapter({ apiUrl: "https://api.anthropic.com/v1", format: "anthropic-compatible" });
    const gemini = resolveProviderContextCacheAdapter({ apiUrl: "https://generativelanguage.googleapis.com/v1beta", format: "gemini-compatible" });
    const compatible = resolveProviderContextCacheAdapter({ apiUrl: "https://gateway.example/v1", format: "openai-compatible" });
    const declaredOpenAiGateway = resolveProviderContextCacheAdapter({
        apiUrl: "https://gateway.example/v1",
        format: "openai-compatible",
        providerNativeCacheEnabled: true,
        providerNativeCacheFamily: "openai",
    });
    const openAiPatch = buildProviderContextCacheAdapterRequestPatch({
        apiUrl: "https://api.openai.com/v1",
        format: "openai-compatible",
        providerPromptCacheRetention: "24h",
    }, { scope: "project", scopeId: "p", sessionId: "s", generation: 1, provider: "openai" }, openai);
    const checks = {
        officialOpenAiUsesNativePromptCache: openai.adapter === "openai_prompt_cache" && openai.providerNative === true,
        openAiPatchHasStableKeyAndRetention: /^ccm-/.test(openAiPatch.body.prompt_cache_key) && openAiPatch.body.prompt_cache_retention === "24h",
        officialAnthropicUsesContextManagement: anthropic.adapter === "anthropic_context_management" && anthropic.supportsContextManagement === true,
        officialGeminiUsesImplicitCache: gemini.adapter === "gemini_implicit_cache" && gemini.supportsImplicitCache === true,
        unknownGatewayDoesNotReceiveNativeFields: compatible.adapter === "stable_prefix" && compatible.safeToSendProviderFields === false,
        declaredCompatibleGatewayCanUseSelectedAdapter: declaredOpenAiGateway.adapter === "openai_prompt_cache" && declaredOpenAiGateway.capabilitySource === "explicit_force_unproven",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-context-cache-adapters.js.map