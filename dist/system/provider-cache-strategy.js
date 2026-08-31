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
exports.resolveProviderCacheExecutionV1 = resolveProviderCacheExecutionV1;
exports.resolveProviderCacheStrategyV3 = resolveProviderCacheStrategyV3;
exports.responsesPromptCacheOptions = responsesPromptCacheOptions;
exports.runProviderCacheStrategySelfTest = runProviderCacheStrategySelfTest;
const crypto = __importStar(require("crypto"));
const provider_cache_capability_matrix_1 = require("./provider-cache-capability-matrix");
const automatic_provider_cache_optimization_1 = require("./automatic-provider-cache-optimization");
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function capabilityDecisionFingerprint(matrix) {
    return {
        schema: matrix.schema,
        transportIdentityChecksum: matrix.transportIdentityChecksum,
        protocol: matrix.protocol,
        capabilities: matrix.capabilities,
        supportedTtls: matrix.supportedTtls,
        contentStored: false,
    };
}
function executionEvidenceChecksum(matrix, execution) {
    // evidenceUpdatedAt changes whenever a real Provider usage receipt refreshes
    // capability evidence. That timestamp does not change the request fields or
    // breakpoint layout and therefore must not invalidate an otherwise stable
    // prompt prefix.
    return hash({ matrix: capabilityDecisionFingerprint(matrix), execution });
}
function normalizedMode(config) {
    void config;
    return "auto";
}
function resolveProviderCacheExecutionV1(config, matrixInput) {
    const matrix = matrixInput || (0, provider_cache_capability_matrix_1.buildProviderCacheCapabilityMatrix)(config);
    const requestedMode = normalizedMode(config);
    const contextMode = String(config?.providerCacheInternalMode || "auto").toLowerCase();
    if (contextMode === "controlled" || contextMode === "off") {
        const base = {
            schema: "ccm-resolved-cache-execution-v1",
            prefixMode: "stable_only",
            keyMode: "none",
            breakpointMode: "none",
            editingMode: contextMode === "controlled" ? "controlled" : "none",
            ttl: "provider_default",
            contentStored: false,
        };
        return { ...base, evidenceChecksum: executionEvidenceChecksum(matrix, base) };
    }
    const explicitKey = matrix.capabilities.explicitCacheKey === "confirmed";
    const explicitBreakpoints = matrix.capabilities.explicitBreakpoints === "confirmed";
    const blockCacheControl = matrix.capabilities.blockCacheControl === "confirmed";
    const implicit = matrix.capabilities.implicitPrefix === "confirmed";
    const nativeEditing = matrix.capabilities.nativeCacheEditing === "confirmed";
    const ttl = (0, automatic_provider_cache_optimization_1.automaticProviderCacheTtl)(matrix);
    // Only the isolated capability probe may optimistically send explicit
    // fields. Persisted user configuration never forces unproven fields.
    const manualForce = config?.providerCacheProbeInProgress === true
        && !Object.values(matrix.capabilities).some(value => value === "unsupported");
    const forcedKey = manualForce && ["chat_completions", "responses"].includes(matrix.protocol);
    const forcedBreakpoints = manualForce && matrix.protocol === "responses" && (0, provider_cache_capability_matrix_1.responsesModelSupportsExplicitBreakpoints)(config?.model);
    const forcedBlockControl = manualForce && matrix.protocol === "anthropic_messages";
    const explicitAllowed = requestedMode !== "implicit" && (explicitKey || explicitBreakpoints || blockCacheControl || manualForce);
    const executionWithoutChecksum = {
        schema: "ccm-resolved-cache-execution-v1",
        prefixMode: explicitAllowed ? "explicit" : implicit ? "implicit" : "stable_only",
        keyMode: explicitAllowed && (explicitKey || forcedKey) ? "session_key" : "none",
        breakpointMode: explicitAllowed && (explicitBreakpoints || blockCacheControl || forcedBreakpoints || forcedBlockControl) ? "static_and_rolling" : "none",
        editingMode: nativeEditing ? "native" : matrix.protocol === "custom" ? "controlled" : "none",
        ttl,
        contentStored: false,
    };
    return { ...executionWithoutChecksum, evidenceChecksum: executionEvidenceChecksum(matrix, executionWithoutChecksum) };
}
function resolveProviderCacheStrategyV3(config, capability) {
    const matrix = capability?.capabilityMatrix || (0, provider_cache_capability_matrix_1.buildProviderCacheCapabilityMatrix)(config, capability?.capabilityState || capability);
    const execution = resolveProviderCacheExecutionV1(config, matrix);
    let transport = "stable_prefix";
    if (matrix.protocol === "responses")
        transport = execution.prefixMode === "explicit" ? "responses_explicit" : "responses_implicit";
    else if (matrix.protocol === "chat_completions")
        transport = execution.keyMode === "session_key" ? "chat_completions_key" : "stable_prefix";
    else if (matrix.protocol === "anthropic_messages")
        transport = execution.breakpointMode !== "none" ? "anthropic_cache_control" : "stable_prefix";
    else if (matrix.protocol === "gemini_generate_content")
        transport = "gemini_implicit";
    return {
        schema: "ccm-provider-cache-strategy-v3",
        mode: normalizedMode(config),
        transport,
        ttl: execution.ttl,
        explicitBreakpointsVerified: matrix.capabilities.explicitBreakpoints === "confirmed",
        execution,
        capabilityMatrix: matrix,
        contentStored: false,
    };
}
function responsesPromptCacheOptions(strategy, explicitBreakpointCount) {
    if (strategy.transport !== "responses_explicit")
        return undefined;
    const ttl = strategy.ttl === "1h" || strategy.ttl === "30m" ? strategy.ttl : "30m";
    // Explicit mode without at least one prompt_cache_breakpoint disables both
    // cache reads and cache writes. A verified cache key on its own must keep
    // Responses in implicit mode so the Provider selects the latest eligible
    // message boundary while still using CCM's stable routing key.
    void explicitBreakpointCount;
    // Explicit breakpoint markers are additive.  Keep Responses in implicit
    // mode so the Provider can still select its rolling prefix boundary; the
    // old explicit mode disabled that fallback for tool-loop requests.
    const mode = "implicit";
    return { mode, ttl };
}
function runProviderCacheStrategySelfTest() {
    const responsesConfig = { format: "openai-responses", apiUrl: "https://api.openai.com/v1", model: "gpt-5.6" };
    const responsesMatrix = (0, provider_cache_capability_matrix_1.buildProviderCacheCapabilityMatrix)(responsesConfig, {});
    const execution = resolveProviderCacheExecutionV1(responsesConfig, responsesMatrix);
    const refreshedEvidenceExecution = resolveProviderCacheExecutionV1({ format: "openai-responses" }, {
        ...responsesMatrix,
        evidenceUpdatedAt: "2099-01-01T00:00:00.000Z",
    });
    const checks = {
        responsesUsesCapabilityCombination: execution.keyMode === "session_key" && execution.breakpointMode === "static_and_rolling",
        evidenceChecksumPresent: execution.evidenceChecksum.length === 64,
        evidenceRefreshDoesNotChangeBreakpointLayout: refreshedEvidenceExecution.evidenceChecksum === execution.evidenceChecksum,
        cacheKeyWithoutBreakpointsUsesImplicitMode: responsesPromptCacheOptions(resolveProviderCacheStrategyV3({ format: "openai-responses" }, {
            capabilityMatrix: {
                ...responsesMatrix,
                capabilities: { ...responsesMatrix.capabilities, explicitCacheKey: "confirmed", explicitBreakpoints: "unproven" },
            },
        }))?.mode === "implicit",
        unprovenCustomStaysStableOnly: resolveProviderCacheExecutionV1({ format: "auto", apiUrl: "https://custom.example/v1" }, (0, provider_cache_capability_matrix_1.buildProviderCacheCapabilityMatrix)({ format: "auto", apiUrl: "https://custom.example/v1" }, {})).prefixMode === "stable_only",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-strategy.js.map