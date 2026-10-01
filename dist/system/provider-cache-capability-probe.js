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
exports.scheduleProviderCacheCapabilityProbe = scheduleProviderCacheCapabilityProbe;
exports.runProviderCacheCapabilityProbeSelfTest = runProviderCacheCapabilityProbeSelfTest;
const crypto = __importStar(require("crypto"));
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const provider_cache_capability_registry_1 = require("./provider-cache-capability-registry");
const provider_context_cache_adapters_1 = require("./provider-context-cache-adapters");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const openai_responses_transport_1 = require("./openai-responses-transport");
const unified_model_call_config_1 = require("./unified-model-call-config");
const probeFlights = new Map();
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
function providerInputTokens(usage) {
    return Math.max(0, Number(usage?.inputTokens || usage?.input_tokens || usage?.promptTokens || usage?.prompt_tokens || 0));
}
function classifyProbeError(error) {
    const reason = String(error?.message || error || "provider_probe_failed").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500);
    if (/previous[_ -]?response[_ -]?id.*(?:only supported|websocket)|(?:websocket).*previous[_ -]?response[_ -]?id/i.test(reason)) {
        return { status: "unsupported", reason };
    }
    if ((0, provider_context_cache_adapters_1.isProviderContextCacheFieldRejection)(error))
        return { status: "unsupported", reason };
    if (/HTTP\s+(408|425|429|5\d\d)|abort|timeout|timed out|ECONN|ENOTFOUND|fetch failed|socket/i.test(reason))
        return { status: "degraded", reason };
    return { status: "unproven", reason };
}
function stableProbeMessages(dynamicSuffix) {
    const stablePrefix = Array.from({ length: 160 }, (_, index) => `CCM cache capability probe stable line ${String(index + 1).padStart(3, "0")}: immutable prefix verification only.`).join("\n");
    return {
        system: `You are checking whether the configured provider reports prompt-prefix cache usage. Reply with OK only.\n${stablePrefix}`,
        messages: [{ role: "user", content: `Reply with OK only. Dynamic suffix ${dynamicSuffix}.` }],
        nativeTools: [{
                name: "ccm_cache_probe_status",
                description: "Stable no-op schema used only to verify provider prefix-cache behavior.",
                inputSchema: { type: "object", properties: {}, additionalProperties: false },
            }],
    };
}
async function defaultProbeCaller(config, request) {
    let usage = null;
    let responseId = "";
    let previousResponseIdUsed = false;
    let toolCalls = [];
    const options = {
        system: request.system,
        messages: request.messages,
        maxTokens: 8,
        temperature: 0,
        timeoutMs: Math.min(60_000, Math.max(15_000, Number(config.timeoutMs || config.requestTimeoutMs || config.modelTimeoutMs || 45_000))),
        defaultTimeoutMs: 45_000,
        retry: false,
        nativeTools: request.nativeTools,
        providerContextCache: request.providerContextCache,
        onUsage: (value) => { usage = value; },
        onResponseMetadata: (value) => {
            responseId = String(value?.responseId || "");
            previousResponseIdUsed = value?.previousResponseIdUsed === true;
        },
        nativeToolChoice: request.nativeToolChoice,
        onProviderAgentTurn: (turn) => { toolCalls = Array.isArray(turn?.toolCalls) ? turn.toolCalls : []; },
        httpErrorPrefix: "缓存能力探测失败",
    };
    const content = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config)
        ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(config, options)
        : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(config, { ...options, messages: [{ role: "system", content: request.system }, ...request.messages], system: undefined });
    return { content, usage, responseId, previousResponseIdUsed, toolCalls };
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
async function probeProviderCacheCapabilityOnce(config, options = {}) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const caller = options.caller || defaultProbeCaller;
    const requestA = stableProbeMessages("A");
    const requestB = stableProbeMessages("B");
    // Start with the smallest Responses-compatible cache probe. A relay may
    // support prompt_cache_key while rejecting prompt_cache_options or a
    // required native tool choice; combining those fields would make a healthy
    // cache capability look like a generic upstream 400.
    const cacheRequestA = { ...requestA, nativeTools: [], nativeToolChoice: undefined };
    const cacheRequestB = { ...requestB, nativeTools: [], nativeToolChoice: undefined };
    const providerContextCache = {
        scope: "other",
        scopeId: "provider-cache-capability",
        sessionId: `cache-probe-${identity.identityChecksum.slice(0, 24)}`,
        generation: 1,
        boundaryGeneration: 0,
        source: "provider_cache_capability_probe",
        responsesContinuationProbeInProgress: true,
    };
    const probeConfig = {
        ...config,
        reasoningEffort: (0, unified_model_call_config_1.resolveUnifiedModelConfig)({ callSource: "cache_probe" }).reasoningEffort,
        providerCacheProbeInProgress: true,
        // Probe optional Responses fields in isolation.  Foreground requests
        // still require persisted capability evidence before sending them.
        providerCacheDisableOptions: false,
        providerCacheDisableBreakpoints: false,
        providerCacheForceBreakpointsProbe: true,
    };
    let providerCallCount = 0;
    let firstCallOk = false;
    let secondCallOk = false;
    let thirdCallOk = false;
    let firstUsage = null;
    let secondUsage = null;
    let thirdUsage = null;
    let continuationUsed = false;
    let toolLoopContinuationUsed = false;
    let firstToolCallObserved = false;
    let continuationAttempted = false;
    let continuationFailureStatus = "unproven";
    let continuationResponseId = "";
    let status = "unproven";
    let explicitFieldStatus = "unproven";
    let exactReplayStatus = "unproven";
    let prefixExtensionStatus = "unproven";
    let reason = "provider_accepted_requests_without_cache_usage_receipt";
    try {
        providerCallCount += 1;
        const first = await caller(probeConfig, { ...cacheRequestA, providerContextCache });
        firstCallOk = !!String(first.content || "").trim() || (first.toolCalls || []).length > 0;
        firstUsage = first.usage || null;
        if (!firstCallOk)
            throw new Error("模型返回了空响应");
        continuationResponseId = String(first.responseId || "");
        if (continuationResponseId)
            (0, openai_responses_transport_1.rememberResponsesResponseId)((0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).normalizedEndpoint, providerContextCache, continuationResponseId, probeConfig, {
                inputItemChecksums: (0, openai_responses_transport_1.responsesInputItemChecksums)([
                    { role: "system", content: requestA.system },
                    ...requestA.messages,
                ]),
                continuationFingerprint: "",
                providerToolCalls: first.toolCalls || [],
            });
        providerCallCount += 1;
        const firstToolCall = Array.isArray(first.toolCalls) ? first.toolCalls[0] : null;
        firstToolCallObserved = !!firstToolCall;
        const secondRequest = firstToolCall
            ? {
                ...cacheRequestB,
                messages: [{
                        role: "tool",
                        tool_call_id: String(firstToolCall.id || firstToolCall.callId || "probe-call"),
                        content: "OK",
                    }],
                nativeToolChoice: "none",
            }
            : cacheRequestB;
        // The transport only attempted `previous_response_id` when a response id
        // was persisted from the first request. A normal full-transcript fallback
        // is not a continuation failure and must not be reported as one.
        continuationAttempted = !!continuationResponseId;
        const second = await caller(probeConfig, { ...secondRequest, providerContextCache });
        secondCallOk = !!String(second.content || "").trim() || (second.toolCalls || []).length > 0;
        secondUsage = second.usage || null;
        continuationUsed = second.previousResponseIdUsed === true;
        toolLoopContinuationUsed = !!firstToolCall && continuationUsed;
        if (!secondCallOk)
            throw new Error("模型返回了空响应");
        explicitFieldStatus = "confirmed";
        status = "confirmed";
        if (cacheReadTokens(secondUsage) > 0) {
            prefixExtensionStatus = "confirmed";
            reason = "dynamic_suffix_request_reported_cached_prefix_tokens";
        }
        else {
            providerCallCount += 1;
            const third = await caller(probeConfig, { ...cacheRequestA, providerContextCache });
            thirdCallOk = !!String(third.content || "").trim();
            thirdUsage = third.usage || null;
            if (!thirdCallOk)
                throw new Error("模型返回了空响应");
            if (cacheReadTokens(thirdUsage) > 0) {
                exactReplayStatus = "confirmed";
                prefixExtensionStatus = "exact_only";
                reason = "exact_replay_hit_but_dynamic_suffix_missed";
            }
            else {
                reason = "provider_accepted_cache_fields_without_reported_prefix_reuse";
            }
        }
    }
    catch (error) {
        const classified = classifyProbeError(error);
        if (continuationAttempted)
            continuationFailureStatus = classified.status;
        if (!secondCallOk) {
            status = classified.status;
            explicitFieldStatus = classified.status;
        }
        else {
            status = "confirmed";
            explicitFieldStatus = "confirmed";
            prefixExtensionStatus = classified.status === "unsupported" ? "unsupported" : "degraded";
            if (thirdCallOk)
                exactReplayStatus = "degraded";
        }
        reason = classified.reason;
    }
    const backendMetrics = await inspectBackendMetrics(config, options.fetchImpl || fetch);
    const recorded = (0, provider_cache_capability_registry_1.recordProviderCacheCapabilityEvidence)(config, {
        status,
        explicitFieldStatus,
        implicitCacheStatus: Math.max(cacheReadTokens(secondUsage), cacheReadTokens(thirdUsage)) > 0 ? "confirmed" : "unproven",
        exactReplayStatus,
        prefixExtensionStatus,
        explicitCacheKeyStatus: ["chat_completions", "responses"].includes((0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol) ? explicitFieldStatus : "unproven",
        // The base probe intentionally disables optional cache options and explicit
        // breakpoints. Do not write an `unproven` value here, otherwise a cache-only
        // probe would overwrite a previously confirmed result from the dedicated
        // options/breakpoint probes. Those capabilities are recorded only by the
        // probe that actually sends the corresponding field.
        ...((0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol === "responses" && !probeConfig.providerCacheDisableOptions
            ? { promptCacheOptionsStatus: explicitFieldStatus }
            : {}),
        ...((0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol === "responses" && !probeConfig.providerCacheDisableBreakpoints && prefixExtensionStatus === "confirmed"
            ? { explicitBreakpointsStatus: "confirmed" }
            : {}),
        blockCacheControlStatus: (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol === "anthropic_messages" ? explicitFieldStatus : "unproven",
        cacheUsageReportingStatus: firstUsage || secondUsage || thirdUsage ? "confirmed" : "unproven",
        // This base probe sends no explicit breakpoint field. A cached prefix hit
        // therefore cannot prove that breakpoint metadata is accepted; explicitly
        // clear any legacy confirmation so the next request does not reuse stale
        // breakpoint state against a relay that rejects it.
        explicitBreakpointsVerified: (0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol === "responses"
            && !probeConfig.providerCacheDisableBreakpoints
            && prefixExtensionStatus === "confirmed",
        ...((0, provider_cache_protocol_1.resolveProviderCacheProtocol)(config).protocol === "responses" && (secondCallOk || continuationAttempted) ? {
            // Only judge continuation after the request that could exercise it actually
            // completed. A first-call transport/400 failure must not be mislabeled as a
            // provider refusing previous_response_id.
            responsesContinuationStatus: continuationUsed ? "confirmed" : continuationFailureStatus,
            responsesToolLoopContinuationStatus: firstToolCallObserved
                ? (toolLoopContinuationUsed ? "confirmed" : "degraded")
                : undefined,
            ...(continuationAttempted && !continuationUsed && continuationFailureStatus !== "unproven"
                ? { lastContinuationFailureReason: reason || "previous_response_id_continuation_failed" }
                : {}),
        } : {}),
        stablePrefixChecksum: digest({ system: cacheRequestA.system, nativeTools: cacheRequestA.nativeTools }),
        promptCacheKeyChecksum: digest(providerContextCache),
        providerCallCount,
        cacheReadInputTokens: Math.max(cacheReadTokens(secondUsage), cacheReadTokens(thirdUsage)),
        cacheCreationInputTokens: cacheCreationTokens(firstUsage) + cacheCreationTokens(secondUsage) + cacheCreationTokens(thirdUsage),
        backendMetricsVerified: backendMetrics.verified,
        reason,
    });
    const checkedAt = new Date().toISOString();
    const receipt = {
        schema: "ccm-provider-cache-probe-receipt-v2",
        version: 2,
        id: `pcpr_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`,
        identityChecksum: identity.identityChecksum,
        status,
        providerCallCount,
        firstCallOk,
        secondCallOk,
        thirdCallOk,
        explicitFieldStatus,
        exactReplayStatus,
        prefixExtensionStatus,
        stablePrefixChecksum: digest({ system: cacheRequestA.system, nativeTools: cacheRequestA.nativeTools }),
        promptCacheKeyChecksum: digest(providerContextCache),
        providerInputTokens: providerInputTokens(firstUsage) + providerInputTokens(secondUsage) + providerInputTokens(thirdUsage),
        cacheReadInputTokens: Math.max(cacheReadTokens(secondUsage), cacheReadTokens(thirdUsage)),
        cacheCreationInputTokens: cacheCreationTokens(firstUsage) + cacheCreationTokens(secondUsage) + cacheCreationTokens(thirdUsage),
        continuationUsed,
        toolLoopContinuationUsed,
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
function probeProviderCacheCapability(config, options = {}) {
    const identity = (0, provider_cache_capability_registry_1.providerCacheCapabilityIdentity)(config);
    const existing = probeFlights.get(identity.identityChecksum);
    if (existing)
        return existing;
    const flight = probeProviderCacheCapabilityOnce(config, options)
        .finally(() => { if (probeFlights.get(identity.identityChecksum) === flight)
        probeFlights.delete(identity.identityChecksum); });
    probeFlights.set(identity.identityChecksum, flight);
    return flight;
}
function scheduleProviderCacheCapabilityProbe(config, options = {}) {
    if (!String(config?.apiUrl || "").trim() || !String(config?.apiKey || "").trim() || !String(config?.model || "").trim()) {
        return { scheduled: false, reason: "provider_config_incomplete" };
    }
    const state = (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config);
    const expiresAt = Date.parse(String(state?.evidence?.expiresAt || state?.latestAttempt?.expiresAt || ""));
    const fresh = Number.isFinite(expiresAt) && expiresAt > Date.now();
    if (options.force !== true && fresh && ["confirmed", "unsupported", "degraded"].includes(String(state?.status || ""))) {
        return { scheduled: false, reason: "fresh_capability_evidence" };
    }
    const delayMs = Math.max(0, Math.min(5_000, Number(options.delayMs ?? 50)));
    const timer = setTimeout(() => {
        void probeProviderCacheCapability(config).catch(() => undefined);
    }, delayMs);
    timer.unref?.();
    return { scheduled: true, reason: options.force === true ? "manual_redetect" : "automatic_detection" };
}
async function runProviderCacheCapabilityProbeSelfTest() {
    // Keep the self-test independent from capability receipts left by an
    // earlier run. Production identities remain unchanged; only fixtures get a
    // per-run model suffix so a stale continuation status cannot mask the probe.
    const runId = crypto.randomBytes(3).toString("hex");
    const base = { apiUrl: "https://mock.example/v1", format: "openai-compatible", model: `mock-${runId}` };
    let calls = 0;
    const confirmedRequests = [];
    const confirmed = await probeProviderCacheCapability(base, {
        caller: async (_config, request) => {
            confirmedRequests.push(request);
            return { content: "OK", usage: ++calls === 2 ? { cacheReadInputTokens: 2048 } : { cacheCreationInputTokens: 2048 } };
        },
    });
    calls = 0;
    const exactOnly = await probeProviderCacheCapability({ ...base, model: `mock-exact-only-${runId}` }, {
        caller: async () => ({ content: "OK", usage: ++calls === 3 ? { cacheReadInputTokens: 1536 } : { inputTokens: 2048 } }),
    });
    calls = 0;
    const degraded = await probeProviderCacheCapability({ ...base, model: `mock-degraded-${runId}` }, {
        caller: async () => { calls += 1; throw new Error("HTTP 503 temporary"); },
    });
    calls = 0;
    const unsupported = await probeProviderCacheCapability({ ...base, model: `mock-unsupported-${runId}` }, {
        caller: async () => { calls += 1; throw new Error("HTTP 400 unknown prompt_cache_key field"); },
    });
    const responsesFirstCallFailure = await probeProviderCacheCapability({ ...base, format: "openai-responses", model: `mock-responses-first-call-failure-${runId}` }, {
        caller: async () => { calls += 1; throw new Error("HTTP 400 Upstream request failed"); },
    });
    let continuationCalls = 0;
    const continuation = await probeProviderCacheCapability({ ...base, format: "openai-responses", model: `mock-continuation-${runId}` }, {
        caller: async (_config, request) => {
            continuationCalls += 1;
            if (continuationCalls === 1)
                return {
                    content: "tool call",
                    responseId: "resp-probe-1",
                    toolCalls: [{ id: "call-probe-1", name: "ccm_cache_probe_status" }],
                    usage: { cacheCreationInputTokens: 2048 },
                };
            return {
                content: "OK",
                responseId: "resp-probe-2",
                previousResponseIdUsed: request.messages?.[0]?.role === "tool",
                usage: { cacheReadInputTokens: 2048 },
            };
        },
    });
    calls = 0;
    const singleflightConfig = { ...base, model: `mock-singleflight-${runId}` };
    const singleflightCaller = async () => {
        calls += 1;
        await new Promise(resolve => setTimeout(resolve, 5));
        return { content: "OK", usage: calls >= 2 ? { cacheReadInputTokens: 1024 } : { cacheCreationInputTokens: 1024 } };
    };
    const [singleflightA, singleflightB] = await Promise.all([
        probeProviderCacheCapability(singleflightConfig, { caller: singleflightCaller }),
        probeProviderCacheCapability(singleflightConfig, { caller: singleflightCaller }),
    ]);
    const checks = {
        confirmedNeedsRealCachedTokens: confirmed.receipt.status === "confirmed" && confirmed.receipt.cacheReadInputTokens === 2048,
        confirmedUsesExactlyTwoCalls: confirmed.receipt.providerCallCount === 2,
        probeChangesOnlyDynamicSuffix: confirmedRequests.length === 2
            && confirmedRequests[0].system === confirmedRequests[1].system
            && JSON.stringify(confirmedRequests[0].nativeTools) === JSON.stringify(confirmedRequests[1].nativeTools)
            && JSON.stringify(confirmedRequests[0].messages) !== JSON.stringify(confirmedRequests[1].messages),
        prefixHitIsConfirmed: confirmed.receipt.prefixExtensionStatus === "confirmed",
        exactReplayIsNotPrefixCapability: exactOnly.receipt.providerCallCount === 3
            && exactOnly.receipt.exactReplayStatus === "confirmed"
            && exactOnly.receipt.prefixExtensionStatus === "exact_only",
        networkFailureStopsAfterOneCall: degraded.receipt.status === "degraded" && degraded.receipt.providerCallCount === 1,
        explicitFieldRejectionUnsupported: unsupported.receipt.status === "unsupported" && unsupported.receipt.providerCallCount === 1,
        firstCallFailureDoesNotImplyContinuationRejection: responsesFirstCallFailure.receipt.providerCallCount === 1
            && responsesFirstCallFailure.capability?.responsesContinuationStatus !== "degraded"
            && responsesFirstCallFailure.capability?.lastContinuationFailureReason !== "provider_did_not_use_previous_response_id",
        responsesContinuationIsProbed: continuation.receipt.continuationUsed === true
            && continuation.receipt.toolLoopContinuationUsed === true
            && continuation.receipt.providerCallCount === 2
            && continuation.capability?.responsesContinuationStatus === "confirmed"
            && continuation.capability?.responsesToolLoopContinuationStatus === "confirmed",
        matchingProbeUsesSingleflight: calls === 2 && singleflightA.receipt.checksum === singleflightB.receipt.checksum,
        receiptsContainNoPrompt: !JSON.stringify([confirmed.receipt, exactOnly.receipt, degraded.receipt, unsupported.receipt, singleflightA.receipt]).includes("stable line"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-capability-probe.js.map