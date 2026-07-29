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
exports.probeProviderCacheCapability = probeProviderCacheCapability;
exports.runProviderCacheCapabilityProbeSelfTest = runProviderCacheCapabilityProbeSelfTest;
const crypto = __importStar(require("crypto"));
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
function digest(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function receiptChecksum(value) {
    const copy = { ...(value || {}) };
    delete copy.checksum;
    return digest(copy);
}
function cacheReadTokens(usage) {
    return Math.max(0, Number(usage?.cacheReadInputTokens || usage?.cache_read_input_tokens || usage?.cachedTokens || usage?.cached_tokens || 0));
}
function cacheCreationTokens(usage) {
    return Math.max(0, Number(usage?.cacheCreationInputTokens || usage?.cache_creation_input_tokens || 0));
}
function classifyProbeError(error) {
    const reason = String(error?.message || error || "provider_probe_failed").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500);
    const explicitFieldRejection = /HTTP\s+(400|404|422).*?(prompt[_ -]?cache|cache[_ -]?(control|reference|edits?)|context[_ -]?management|cached[_ -]?content)|(?:unknown|unsupported|unrecognized|invalid).*?(cache|context_management|prompt_cache)/i.test(reason);
    if (explicitFieldRejection)
        return { status: "unsupported", reason };
    if (/HTTP\s+(408|425|429|5\d\d)|abort|timeout|timed out|ECONN|ENOTFOUND|fetch failed|socket/i.test(reason))
        return { status: "degraded", reason };
    return { status: "unproven", reason };
}
function stableProbeMessages() {
    const stablePrefix = Array.from({ length: 160 }, (_, index) => `CCM cache capability probe stable line ${String(index + 1).padStart(3, "0")}: immutable prefix verification only.`).join("\n");
    return {
        system: `You are checking whether the configured provider reports prompt-prefix cache usage. Reply with OK only.\n${stablePrefix}`,
        messages: [{ role: "user", content: "Reply with OK only." }],
    };
}
async function defaultProbeCaller(config, request) {
    let usage = null;
    const options = {
        system: request.system,
        messages: request.messages,
        maxTokens: 8,
        temperature: 0,
        timeoutMs: Math.min(20_000, Math.max(5_000, Number(config.timeoutMs || 15_000))),
        defaultTimeoutMs: 15_000,
        retry: false,
        providerContextCache: request.providerContextCache,
        onUsage: (value) => { usage = value; },
        httpErrorPrefix: "缓存能力探测失败",
    };
    const content = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, options)
        : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { ...options, messages: [{ role: "system", content: request.system }, ...request.messages], system: undefined });
    return { content, usage };
}
function metricsUrl(config) {
    const kind = String(config?.inferenceBackendKind || "remote_api");
    if (!['vllm', 'sglang'].includes(kind))
        return "";
    const metricsPath = String(config?.metricsPath || "").trim();
    if (!metricsPath || !metricsPath.startsWith("/") || metricsPath.startsWith("//"))
        return "";
    try {
        const base = new URL(String(config.apiUrl || ""));
        return new URL(metricsPath, `${base.protocol}//${base.host}`).toString();
    }
    catch {
        return "";
    }
}
async function inspectBackendMetrics(config, fetchImpl) {
    const url = metricsUrl(config);
    const kind = String(config?.inferenceBackendKind || "remote_api");
    if (!url)
        return { checked: false, verified: false, kind, reason: "metrics_not_configured" };
    try {
        const response = await fetchImpl(url, { method: "GET", signal: AbortSignal.timeout(5_000) });
        if (!response.ok)
            return { checked: true, verified: false, kind, reason: `metrics_http_${response.status}` };
        const text = (await response.text()).slice(0, 2_000_000);
        const verified = kind === "vllm"
            ? /vllm[:_].*(?:prefix_cache|cache_hit)|prefix_cache_(?:hits|queries)/i.test(text)
            : /(?:radix|prefix)[_:].*cache|cache_hit_rate/i.test(text);
        return { checked: true, verified, kind, reason: verified ? "backend_cache_metric_present" : "backend_cache_metric_absent" };
    }
    catch (error) {
        return { checked: true, verified: false, kind, reason: String(error?.message || error || "metrics_failed").slice(0, 240) };
    }
}
async function probeProviderCacheCapability(config, options = {}) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const caller = options.caller || defaultProbeCaller;
    const messages = stableProbeMessages();
    const providerContextCache = {
        scope: "other",
        scopeId: "provider-cache-capability",
        sessionId: `cache-probe-${identity.identityChecksum.slice(0, 24)}`,
        generation: 1,
        boundaryGeneration: 0,
        source: "provider_cache_capability_probe",
    };
    const probeConfig = {
        ...config,
        reasoningEffort: "off",
        providerContextCacheMode: "native",
        providerNativeCacheEnabled: true,
        providerCacheProbeInProgress: true,
    };
    let providerCallCount = 0;
    let firstCallOk = false;
    let secondCallOk = false;
    let firstUsage = null;
    let secondUsage = null;
    let status = "unproven";
    let reason = "provider_accepted_requests_without_cache_usage_receipt";
    try {
        providerCallCount += 1;
        const first = await caller(probeConfig, { ...messages, providerContextCache });
        firstCallOk = !!String(first.content || "").trim();
        firstUsage = first.usage || null;
        if (!firstCallOk)
            throw new Error("模型返回了空响应");
        providerCallCount += 1;
        const second = await caller(probeConfig, { ...messages, providerContextCache });
        secondCallOk = !!String(second.content || "").trim();
        secondUsage = second.usage || null;
        if (!secondCallOk)
            throw new Error("模型返回了空响应");
        if (cacheReadTokens(secondUsage) > 0) {
            status = "confirmed";
            reason = "second_request_reported_cached_input_tokens";
        }
    }
    catch (error) {
        const classified = classifyProbeError(error);
        status = classified.status;
        reason = classified.reason;
    }
    const backendMetrics = await inspectBackendMetrics(config, options.fetchImpl || fetch);
    const recorded = (0, provider_cache_capability_registry_1.recordProviderCacheCapabilityEvidence)(config, {
        status,
        providerCallCount,
        cacheReadInputTokens: cacheReadTokens(secondUsage),
        cacheCreationInputTokens: cacheCreationTokens(firstUsage) + cacheCreationTokens(secondUsage),
        backendMetricsVerified: backendMetrics.verified,
        reason,
    });
    const checkedAt = new Date().toISOString();
    const receipt = {
        schema: "ccm-provider-cache-probe-receipt-v1",
        version: 1,
        id: `pcpr_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`,
        identityChecksum: identity.identityChecksum,
        status,
        providerCallCount,
        firstCallOk,
        secondCallOk,
        cacheReadInputTokens: cacheReadTokens(secondUsage),
        cacheCreationInputTokens: cacheCreationTokens(firstUsage) + cacheCreationTokens(secondUsage),
        backendMetrics,
        preservedConfirmed: recorded.preservedConfirmed,
        reason,
        checkedAt,
        contentStored: false,
        checksum: "",
    };
    receipt.checksum = receiptChecksum(receipt);
    return {
        success: firstCallOk || status === "unsupported",
        connection: { success: firstCallOk || status === "unsupported", providerCallCount, checkedAt },
        receipt,
        capability: (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config),
    };
}
async function runProviderCacheCapabilityProbeSelfTest() {
    const base = { apiUrl: "https://mock.example/v1", format: "openai-compatible", model: "mock", providerNativeCacheFamily: "openai" };
    let calls = 0;
    const confirmed = await probeProviderCacheCapability(base, {
        caller: async () => ({ content: "OK", usage: ++calls === 2 ? { cacheReadInputTokens: 2048 } : { cacheCreationInputTokens: 2048 } }),
    });
    calls = 0;
    const degraded = await probeProviderCacheCapability({ ...base, model: "mock-degraded" }, {
        caller: async () => { calls += 1; throw new Error("HTTP 503 temporary"); },
    });
    calls = 0;
    const unsupported = await probeProviderCacheCapability({ ...base, model: "mock-unsupported" }, {
        caller: async () => { calls += 1; throw new Error("HTTP 400 unknown prompt_cache_key field"); },
    });
    const checks = {
        confirmedNeedsRealCachedTokens: confirmed.receipt.status === "confirmed" && confirmed.receipt.cacheReadInputTokens === 2048,
        confirmedUsesExactlyTwoCalls: confirmed.receipt.providerCallCount === 2,
        networkFailureStopsAfterOneCall: degraded.receipt.status === "degraded" && degraded.receipt.providerCallCount === 1,
        explicitFieldRejectionUnsupported: unsupported.receipt.status === "unsupported" && unsupported.receipt.providerCallCount === 1,
        receiptsContainNoPrompt: !JSON.stringify([confirmed.receipt, degraded.receipt, unsupported.receipt]).includes("stable line"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-capability-probe.js.map