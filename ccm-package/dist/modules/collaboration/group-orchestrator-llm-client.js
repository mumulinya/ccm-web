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
exports.MODEL_LONG_REQUEST_TOTAL_TIMEOUT_MS = void 0;
exports.normalizeLlmTokenUsage = normalizeLlmTokenUsage;
exports.normalizeChatCompletionsUrl = normalizeChatCompletionsUrl;
exports.normalizeAnthropicMessagesUrl = normalizeAnthropicMessagesUrl;
exports.normalizeGeminiGenerateContentUrl = normalizeGeminiGenerateContentUrl;
exports.shouldUseAnthropic = shouldUseAnthropic;
exports.shouldUseGemini = shouldUseGemini;
exports.extractJsonObject = extractJsonObject;
exports.resolveLlmTimeoutMs = resolveLlmTimeoutMs;
exports.resolveReasoningEffort = resolveReasoningEffort;
exports.buildOpenAiReasoningFields = buildOpenAiReasoningFields;
exports.parseOpenAiStreamText = parseOpenAiStreamText;
exports.buildAnthropicThinkingFields = buildAnthropicThinkingFields;
exports.fetchWithNodeHttpFallback = fetchWithNodeHttpFallback;
exports.applyAnthropicCacheReferenceEditing = applyAnthropicCacheReferenceEditing;
exports.resolveLlmRetryOptions = resolveLlmRetryOptions;
exports.callOpenAiCompatibleChat = callOpenAiCompatibleChat;
exports.callGeminiCompatibleChat = callGeminiCompatibleChat;
exports.callAnthropicCompatibleChat = callAnthropicCompatibleChat;
exports.callOpenAiCompatibleJson = callOpenAiCompatibleJson;
exports.callGeminiCompatibleJson = callGeminiCompatibleJson;
exports.callAnthropicCompatibleJson = callAnthropicCompatibleJson;
exports.runLlmTokenUsageSelfTest = runLlmTokenUsageSelfTest;
exports.runLlmStreamingSelfTest = runLlmStreamingSelfTest;
exports.runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest = runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const model_call_retry_1 = require("../../system/model-call-retry");
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const provider_neutral_context_cache_1 = require("../../system/provider-neutral-context-cache");
const provider_context_cache_adapters_1 = require("../../system/provider-context-cache-adapters");
function providerContextCacheOptions(config, options, provider) {
    const explicit = options.providerContextCache || options.provider_context_cache || null;
    const tracking = options.promptCacheTracking || options.prompt_cache_tracking || null;
    let fallback = null;
    if (tracking?.groupSessionId || tracking?.group_session_id) {
        const groupId = String(tracking?.groupId || tracking?.group_id || "");
        const sessionId = String(tracking?.groupSessionId || tracking?.group_session_id || "");
        let boundaryGeneration = Math.max(0, Number(tracking?.boundaryGeneration || tracking?.boundary_generation || 0));
        if (!boundaryGeneration && groupId && sessionId.startsWith("gcs_")) {
            try {
                const memory = require("./group-memory-storage").loadGroupMemory(groupId, sessionId);
                boundaryGeneration = Math.max(0, Number(memory?.compaction?.boundaryGeneration || memory?.compaction?.boundary_generation || memory?.compactBoundary?.generation || 0));
            }
            catch { }
        }
        fallback = {
            scope: "group",
            scopeId: groupId,
            sessionId,
            boundaryGeneration,
            source: String(tracking?.source || "group_main_model"),
        };
    }
    if (!fallback && config.contextEngineSessionId) {
        fallback = {
            scope: String(config.contextEngineScope || "other"),
            scopeId: String(config.contextEngineScopeId || config.contextEngineSessionId),
            sessionId: String(config.contextEngineSessionId),
            generation: Math.max(0, Number(config.contextEngineGeneration || 0)),
            boundaryGeneration: Math.max(0, Number(config.contextEngineBoundaryGeneration || 0)),
            source: String(config.contextEngineSource || "unified_model_consumer"),
        };
    }
    const binding = explicit || fallback;
    if (!binding?.sessionId)
        return null;
    const adapterCapability = (0, provider_context_cache_adapters_1.resolveProviderContextCacheAdapter)(config, (0, provider_context_cache_adapters_1.detectProviderCacheFamily)(config, provider));
    return {
        ...binding,
        enabled: binding.enabled ?? (config.providerContextCacheMode !== "off" && config.provider_context_cache_mode !== "off"),
        mode: binding.mode || config.providerContextCacheMode || config.provider_context_cache_mode || "auto",
        provider,
        model: String(config.model || ""),
        apiUrl: String(config.apiUrl || ""),
        format: String(config.format || "auto"),
        providerNativeCacheFamily: String(config.providerNativeCacheFamily || "auto"),
        inferenceBackendKind: String(config.inferenceBackendKind || "remote_api"),
        contextWindowTokens: Math.max(0, Number(config.modelContextWindow || config.model_context_window || 0)),
        maxOutputTokens: Math.max(0, Number(options.maxTokens || config.modelMaxOutputTokens || config.model_max_output_tokens || 0)),
        reservedTokens: Math.max(0, Number(config.contextPlanReservedTokens || config.context_plan_reserved_tokens || 2_000)),
        formalCompactionStatus: String(binding.formalCompactionStatus || binding.formal_compaction_status || "not_required_or_completed"),
        adaptiveStablePrefix: binding.adaptiveStablePrefix ?? binding.adaptive_stable_prefix ?? config.contextAdaptiveStablePrefix !== false,
        providerPromptCacheRetention: String(config.providerPromptCacheRetention || config.provider_prompt_cache_retention || "in_memory"),
        inputCostPerMillionTokens: Math.max(0, Number(config.inputCostPerMillionTokens || config.input_cost_per_million_tokens || 0)),
        cacheReadCostPerMillionTokens: Math.max(0, Number(config.cacheReadCostPerMillionTokens || config.cache_read_cost_per_million_tokens || 0)),
        cacheCreationCostPerMillionTokens: Math.max(0, Number(config.cacheCreationCostPerMillionTokens || config.cache_creation_cost_per_million_tokens || 0)),
        nativeApplyPlan: getApiMicrocompactNativeApplyPlan(options),
        adapterCapability,
    };
}
async function prepareContextCache(config, options, provider) {
    const sourceMessages = options.system != null
        && !(options.messages || []).some(message => String(message?.role || "") === "system")
        ? [{ role: "system", content: options.system }, ...(options.messages || [])]
        : options.messages || [];
    const cacheOptions = providerContextCacheOptions(config, options, provider);
    if (provider === "anthropic" && cacheOptions && !cacheOptions.nativeApplyPlan) {
        const requested = String(cacheOptions.mode || "auto").toLowerCase();
        const officialAnthropic = /(?:^|\.)anthropic\.com$/i.test((() => {
            try {
                return new URL(String(config.apiUrl || "")).hostname;
            }
            catch {
                return "";
            }
        })());
        const nativeAllowed = requested === "native"
            || config.supportsApiContextManagement === true
            || config.supports_api_context_management === true
            || requested === "auto" && officialAnthropic;
        if (nativeAllowed && requested !== "controlled" && requested !== "off") {
            const activeTokens = sourceMessages.reduce((sum, message) => sum + Math.max(0, Math.ceil(JSON.stringify(message?.content ?? "").length / 4)), 0);
            const maxInputTokens = Math.max(32_000, Number(config.modelContextWindow || config.model_context_window || 200_000));
            const targetInputTokens = Math.max(20_000, Math.min(maxInputTokens - 3_000, Number(config.modelAutoCompactTokenLimit || config.model_auto_compact_token_limit || Math.floor(maxInputTokens * 0.8))));
            const editPlan = (0, group_memory_compaction_1.buildGroupApiMicroCompactEditPlan)(sourceMessages, {
                groupId: String(cacheOptions.scopeId || ""),
                activeTokens,
                maxInputTokens,
                targetInputTokens,
                canApplyNatively: true,
                advisoryOnly: false,
            });
            const nativePlan = (0, group_memory_compaction_1.buildGroupApiMicrocompactNativeApplyPlan)(editPlan, {
                groupId: String(cacheOptions.scopeId || ""),
                groupSessionId: String(cacheOptions.sessionId || ""),
                agentType: "anthropic-api",
                transport: "anthropic_api",
                provider: "anthropic",
                supportsApiContextManagement: true,
                nativeApiRequestLayer: true,
                contextManagementBetaHeaderEnabled: true,
            });
            if (nativePlan.nativeApplyReady === true) {
                options.apiMicrocompactNativeApplyPlan = nativePlan;
                cacheOptions.nativeApplyPlan = nativePlan;
            }
        }
    }
    if (!cacheOptions)
        return { messages: sourceMessages, plan: null, adapterPatch: null };
    const prepared = await (0, provider_neutral_context_cache_1.prepareProviderNeutralContextCacheRequestSingleflight)(sourceMessages, cacheOptions);
    const result = {
        ...prepared,
        adapterPatch: (0, provider_context_cache_adapters_1.buildProviderContextCacheAdapterRequestPatch)(config, prepared.plan, cacheOptions.adapterCapability),
    };
    if (result.plan)
        Object.defineProperty(result.plan, "_runtimeProviderStartedAtMs", { value: Date.now(), enumerable: false, configurable: true });
    return result;
}
function finishContextCache(options, plan, input) {
    const receipt = (0, provider_neutral_context_cache_1.completeProviderNeutralContextCacheRequest)(plan, input);
    if (receipt) {
        try {
            options.onProviderContextCache?.(receipt);
        }
        catch { }
    }
    return receipt;
}
function providerAdapterEvidence(cache) {
    const fields = Object.keys(cache?.adapterPatch?.body || {});
    return {
        applied: cache?.plan?.providerNative === true,
        adapter: String(cache?.plan?.adapterKind || ""),
        requestPatchApplied: fields.length > 0,
        requestFields: fields,
        reason: fields.length > 0 ? "provider_request_fields_applied" : cache?.plan?.providerNative === true ? "provider_implicit_cache" : "stable_prefix_or_ccm_projection",
    };
}
function finiteTokenCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function normalizeLlmTokenUsage(value, provider = "openai") {
    const usage = value && typeof value === "object" ? value : {};
    const outputTokens = Math.max(finiteTokenCount(usage.output_tokens), finiteTokenCount(usage.outputTokens), finiteTokenCount(usage.completion_tokens), finiteTokenCount(usage.completionTokens), finiteTokenCount(usage.candidatesTokenCount), finiteTokenCount(usage.candidates_token_count));
    const reportedInputTokens = Math.max(finiteTokenCount(usage.input_tokens), finiteTokenCount(usage.inputTokens), finiteTokenCount(usage.prompt_tokens), finiteTokenCount(usage.promptTokens), finiteTokenCount(usage.promptTokenCount), finiteTokenCount(usage.prompt_token_count));
    const cacheCreationTokens = provider === "anthropic"
        ? Math.max(finiteTokenCount(usage.cache_creation_input_tokens), finiteTokenCount(usage.cacheCreationInputTokens))
        : 0;
    const cacheReadTokens = Math.max(finiteTokenCount(usage.cache_read_input_tokens), finiteTokenCount(usage.cacheReadInputTokens), finiteTokenCount(usage.prompt_tokens_details?.cached_tokens), finiteTokenCount(usage.promptTokensDetails?.cachedTokens), finiteTokenCount(usage.input_tokens_details?.cached_tokens), finiteTokenCount(usage.inputTokensDetails?.cachedTokens), finiteTokenCount(usage.cachedContentTokenCount), finiteTokenCount(usage.cached_content_token_count), finiteTokenCount(usage.total_cached_tokens));
    const directInputTokens = provider === "anthropic"
        ? reportedInputTokens
        : Math.max(0, reportedInputTokens - cacheReadTokens);
    const cacheDeletedInputTokens = provider === "anthropic"
        ? Math.max(finiteTokenCount(usage.cache_deleted_input_tokens), finiteTokenCount(usage.cacheDeletedInputTokens))
        : 0;
    const cacheCreation5mInputTokens = provider === "anthropic"
        ? Math.max(finiteTokenCount(usage.cache_creation?.ephemeral_5m_input_tokens), finiteTokenCount(usage.cacheCreation?.ephemeral5mInputTokens))
        : 0;
    const cacheCreation1hInputTokens = provider === "anthropic"
        ? Math.max(finiteTokenCount(usage.cache_creation?.ephemeral_1h_input_tokens), finiteTokenCount(usage.cacheCreation?.ephemeral1hInputTokens))
        : 0;
    // Anthropic reports uncached input and cache buckets separately. Keep
    // inputTokens as the direct-input component so the shared CC-style
    // measurement can add each bucket exactly once.
    const inputTokens = directInputTokens;
    const reported = inputTokens > 0 || cacheCreationTokens > 0 || cacheReadTokens > 0 || outputTokens > 0;
    const costUsd = Math.max(0, Number(usage.cost_usd
        ?? usage.costUsd
        ?? usage.estimated_cost_usd
        ?? usage.estimatedCostUsd
        ?? usage.cost?.usd
        ?? 0) || 0);
    return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + cacheCreationTokens + cacheReadTokens + outputTokens,
        reported,
        directInputTokens,
        cacheCreationInputTokens: cacheCreationTokens,
        cacheReadInputTokens: cacheReadTokens,
        cacheDeletedInputTokens,
        cacheCreation5mInputTokens,
        cacheCreation1hInputTokens,
        costUsd,
    };
}
function reportTokenUsage(options, usage) {
    try {
        options.onUsage?.(usage);
    }
    catch { }
}
function normalizeChatCompletionsUrl(apiUrl) {
    const base = String(apiUrl || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    if (/\/chat\/completions$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/chat/completions`;
    if (/\/v1\//i.test(base))
        return base;
    return `${base}/v1/chat/completions`;
}
function normalizeAnthropicMessagesUrl(apiUrl) {
    const base = String(apiUrl || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    if (/\/v1\/messages$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/messages`;
    if (/\/v1\//i.test(base))
        return base;
    return `${base}/v1/messages`;
}
function normalizeGeminiGenerateContentUrl(apiUrl, model, stream = false) {
    const base = String(apiUrl || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    const method = stream ? "streamGenerateContent" : "generateContent";
    if (/:(?:generateContent|streamGenerateContent)(?:\?|$)/i.test(base)) {
        return base.replace(/:(?:generateContent|streamGenerateContent)/i, `:${method}`);
    }
    const cleanModel = String(model || "").trim().replace(/^models\//i, "");
    if (!cleanModel)
        return "";
    if (/\/models\/[^/]+$/i.test(base))
        return `${base}:${method}`;
    if (/\/v1(?:beta)?$/i.test(base))
        return `${base}/models/${encodeURIComponent(cleanModel)}:${method}`;
    return `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:${method}`;
}
function shouldUseAnthropic(config) {
    const format = String(config.format || "auto");
    const apiUrl = String(config.apiUrl || "").toLowerCase();
    return format === "anthropic-compatible"
        || format === "auto" && apiUrl.includes("anthropic")
        || format === "openai-compatible" && /\/anthropic(?:\/|$)/i.test(apiUrl);
}
function shouldUseGemini(config) {
    const format = String(config.format || "auto").toLowerCase();
    const apiUrl = String(config.apiUrl || "").toLowerCase();
    return format === "gemini-compatible"
        || format === "auto" && /generativelanguage\.googleapis\.com|:generatecontent|:streamgeneratecontent/.test(apiUrl);
}
function extractJsonObject(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        try {
            return JSON.parse(fenced[1].trim());
        }
        catch { }
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    }
    return null;
}
function resolveLlmTimeoutMs(config, defaultTimeoutMs, callTimeoutMs) {
    const scopedTimeout = Number(callTimeoutMs);
    if (Number.isFinite(scopedTimeout) && scopedTimeout > 0)
        return Math.max(5000, scopedTimeout);
    return Math.max(5000, Number(config.timeoutMs) || defaultTimeoutMs);
}
function resolveTemperature(config, fallback) {
    return Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : fallback;
}
const REASONING_EFFORTS = new Set(["low", "medium", "high"]);
const ANTHROPIC_THINKING_BUDGETS = {
    low: 1024,
    medium: 4096,
    high: 16000,
};
function resolveReasoningEffort(config) {
    const effort = String(config?.reasoningEffort ?? config?.reasoning_effort ?? "off").trim().toLowerCase();
    return REASONING_EFFORTS.has(effort) ? effort : "off";
}
function buildOpenAiReasoningFields(config) {
    const effort = resolveReasoningEffort(config);
    if (effort === "off")
        return {};
    // Chat Completions historically used flat reasoning_effort; GPT-5 / many relays
    // also accept (or only honor) the nested Responses-style reasoning.effort.
    // Send both with lowercase values — OpenAI enums are lowercase, not "High".
    return {
        reasoning_effort: effort,
        reasoning: { effort },
    };
}
function callReasoningConfig(config, options) {
    const effort = String(options.reasoningEffort || "").trim().toLowerCase();
    return effort ? { ...config, reasoningEffort: effort, reasoning_effort: effort } : config;
}
function streamDeltaText(value) {
    if (typeof value === "string")
        return value;
    if (!Array.isArray(value))
        return "";
    return value.map(item => typeof item === "string" ? item : String(item?.text || item?.content || "")).join("");
}
function emitStreamDelta(options, value) {
    const delta = streamDeltaText(value);
    if (!delta)
        return "";
    options.onDelta?.(delta);
    return delta;
}
function markStreamInterrupted(error, emitted) {
    if (!emitted)
        return error;
    const normalized = error instanceof Error ? error : new Error(String(error || "模型流式响应中断"));
    normalized.code = "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA";
    return normalized;
}
function parseOpenAiStreamText(text) {
    const raw = String(text || "");
    if (!/^\s*(?:data:|event:)/m.test(raw))
        return null;
    let content = "";
    let usage = null;
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:"))
            continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]")
            continue;
        try {
            const event = JSON.parse(payload);
            const choice = event?.choices?.[0];
            content += streamDeltaText(choice?.delta?.content ?? choice?.message?.content ?? "");
            if (event?.usage)
                usage = event.usage;
        }
        catch { }
    }
    return { content, usage };
}
function buildAnthropicThinkingFields(config) {
    const effort = resolveReasoningEffort(config);
    if (effort === "off")
        return {};
    return {
        thinking: {
            type: "enabled",
            budget_tokens: ANTHROPIC_THINKING_BUDGETS[effort] || ANTHROPIC_THINKING_BUDGETS.medium,
        },
    };
}
function assertLlmConfig(config, endpoint) {
    if (!endpoint)
        throw new Error("主 Agent API URL 未配置");
    if (!config.apiKey)
        throw new Error("主 Agent API Key 未配置");
    if (!config.model)
        throw new Error("主 Agent 模型未配置");
}
function formatHttpError(prefix, status, text) {
    const detail = String(text || "").slice(0, 300);
    return detail ? `${prefix} HTTP ${status}: ${detail}` : `${prefix} HTTP ${status}`;
}
function nativeHttpRequest(endpoint, init = {}, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const url = endpoint instanceof URL ? endpoint : new URL(String(endpoint));
        const transport = url.protocol === "https:" ? https : http;
        const request = transport.request(url, {
            method: init.method || "GET",
            headers: init.headers || {},
            signal: init.signal,
        }, response => {
            const status = Number(response.statusCode || 0);
            const location = String(response.headers.location || "");
            if (location && [301, 302, 303, 307, 308].includes(status) && init.redirect !== "manual" && redirectCount < 5) {
                response.resume();
                const redirected = new URL(location, url);
                const nextInit = [301, 302, 303].includes(status) && String(init.method || "GET").toUpperCase() !== "GET"
                    ? { ...init, method: "GET", body: undefined }
                    : init;
                nativeHttpRequest(redirected, nextInit, redirectCount + 1).then(resolve, reject);
                return;
            }
            response.on("error", reject);
            let buffered = null;
            const readAll = () => {
                if (!buffered) {
                    buffered = (async () => {
                        const chunks = [];
                        for await (const chunk of response) {
                            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                        }
                        return Buffer.concat(chunks);
                    })();
                }
                return buffered;
            };
            resolve({
                ok: status >= 200 && status < 300,
                status,
                url: url.toString(),
                body: response,
                headers: {
                    get(name) {
                        const value = response.headers[String(name || "").toLowerCase()];
                        return Array.isArray(value) ? value.join(", ") : String(value || "");
                    },
                },
                async text() { return (await readAll()).toString("utf-8"); },
                async arrayBuffer() {
                    const body = await readAll();
                    return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
                },
            });
        });
        request.on("error", reject);
        if (init.body !== undefined && init.body !== null)
            request.write(init.body);
        request.end();
    });
}
async function* responseTextChunks(response) {
    const body = response?.body;
    const decoder = new TextDecoder();
    if (body?.getReader) {
        const reader = body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const text = decoder.decode(value, { stream: true });
                if (text)
                    yield text;
            }
            const tail = decoder.decode();
            if (tail)
                yield tail;
        }
        finally {
            try {
                reader.releaseLock?.();
            }
            catch { }
        }
        return;
    }
    if (body && typeof body[Symbol.asyncIterator] === "function") {
        for await (const value of body) {
            const bytes = typeof value === "string" ? Buffer.from(value) : value;
            const text = decoder.decode(bytes, { stream: true });
            if (text)
                yield text;
        }
        const tail = decoder.decode();
        if (tail)
            yield tail;
        return;
    }
    const text = await response.text();
    if (text)
        yield text;
}
async function consumeSseJson(response, onPayload) {
    let lineBuffer = "";
    let dataLines = [];
    let rawText = "";
    let payloadCount = 0;
    const flush = () => {
        if (!dataLines.length)
            return false;
        const payloadText = dataLines.join("\n").trim();
        dataLines = [];
        if (!payloadText || payloadText === "[DONE]")
            return payloadText === "[DONE]";
        onPayload(JSON.parse(payloadText));
        payloadCount += 1;
        return false;
    };
    for await (const chunk of responseTextChunks(response)) {
        rawText += chunk;
        lineBuffer += chunk;
        while (true) {
            const newline = lineBuffer.indexOf("\n");
            if (newline < 0)
                break;
            const line = lineBuffer.slice(0, newline).replace(/\r$/, "");
            lineBuffer = lineBuffer.slice(newline + 1);
            if (!line) {
                if (flush())
                    return;
            }
            else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trimStart());
            }
        }
    }
    const finalLine = lineBuffer.replace(/\r$/, "");
    if (finalLine.startsWith("data:"))
        dataLines.push(finalLine.slice(5).trimStart());
    flush();
    if (payloadCount === 0 && rawText.trim()) {
        onPayload(JSON.parse(rawText));
    }
}
async function fetchWithNodeHttpFallback(endpoint, init = {}) {
    try {
        return await fetch(endpoint, init);
    }
    catch (fetchError) {
        if (init.signal?.aborted)
            throw fetchError;
        try {
            return await nativeHttpRequest(endpoint, init);
        }
        catch (nativeError) {
            const fetchCause = fetchError?.cause?.message || fetchError?.cause?.code || fetchError?.message || String(fetchError);
            const nativeCause = nativeError?.message || String(nativeError);
            throw new Error(`网络请求失败：${fetchCause}；原生 HTTP/HTTPS 重试失败：${nativeCause}`);
        }
    }
}
function getApiMicrocompactNativeApplyPlan(options) {
    return options.apiMicrocompactNativeApplyPlan || options.api_microcompact_native_apply_plan || null;
}
function getApiMicrocompactNativeTelemetryOptions(options) {
    return options.apiMicrocompactNativeApplyTelemetry || options.api_microcompact_native_apply_telemetry || {};
}
function getHeaderKey(headers, name) {
    const wanted = name.toLowerCase();
    return Object.keys(headers).find(key => key.toLowerCase() === wanted) || name;
}
function appendCsvHeader(headers, name, values) {
    const cleanValues = values.map(value => String(value || "").trim()).filter(Boolean);
    if (!cleanValues.length)
        return headers;
    const key = getHeaderKey(headers, name);
    const existing = String(headers[key] || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
    headers[key] = Array.from(new Set([...existing, ...cleanValues])).join(",");
    return headers;
}
function applyApiMicrocompactNativeRequestPatch(bodyObj, headers, options) {
    const plan = getApiMicrocompactNativeApplyPlan(options);
    const requestPatch = plan?.requestPatch || plan?.request_patch || null;
    const contextManagement = requestPatch?.body?.context_management;
    const betaHeaders = Array.isArray(requestPatch?.beta_headers || requestPatch?.betaHeaders)
        ? (requestPatch.beta_headers || requestPatch.betaHeaders).map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    const verification = (0, group_memory_compaction_1.verifyGroupApiMicrocompactNativeApplyPlan)(plan || {});
    const canApply = plan?.nativeApplyReady === true
        && plan?.mode === "native_api_context_management"
        && verification.valid
        && !!contextManagement;
    if (!canApply) {
        return { applied: false, plan, requestPatch, verification, body: bodyObj, headers };
    }
    const nextBody = {
        ...bodyObj,
        ...(requestPatch.body || {}),
        context_management: contextManagement,
    };
    const nextHeaders = appendCsvHeader({ ...headers }, "anthropic-beta", betaHeaders);
    return { applied: true, plan, requestPatch, verification, body: nextBody, headers: nextHeaders };
}
function anthropicBlockText(block) {
    if (typeof block === "string")
        return block;
    const value = block?.content ?? block?.text ?? block?.output ?? block?.result ?? "";
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value);
    }
    catch {
        return "";
    }
}
function insertAfterLeadingToolResults(blocks, value) {
    let index = 0;
    while (index < blocks.length && ["tool_result", "web_search_tool_result"].includes(String(blocks[index]?.type || "")))
        index += 1;
    return [...blocks.slice(0, index), value, ...blocks.slice(index)];
}
function applyAnthropicCacheReferenceEditing(bodyInput, config = {}) {
    if (config.anthropicCacheReferenceEnabled !== true && config.anthropic_cache_reference_enabled !== true) {
        return { body: bodyInput, applied: false, cacheReferenceCount: 0, cacheEditCount: 0, reason: "disabled" };
    }
    const messages = (Array.isArray(bodyInput?.messages) ? bodyInput.messages : []).map((message) => ({
        ...message,
        content: Array.isArray(message?.content)
            ? message.content.map((block) => block && typeof block === "object" ? { ...block } : block)
            : [{ type: "text", text: String(message?.content || "") }],
    }));
    const lastUserIndex = (() => {
        for (let index = messages.length - 1; index >= 0; index -= 1)
            if (messages[index]?.role === "user")
                return index;
        return -1;
    })();
    if (lastUserIndex < 0)
        return { body: bodyInput, applied: false, cacheReferenceCount: 0, cacheEditCount: 0, reason: "user_message_missing" };
    const deletions = new Set();
    let cacheReferenceCount = 0;
    for (let index = 0; index < lastUserIndex; index += 1) {
        const message = messages[index];
        if (message?.role !== "user")
            continue;
        message.content = message.content.map((block) => {
            if (!block || !["tool_result", "web_search_tool_result"].includes(String(block.type || "")))
                return block;
            const reference = String(block.cache_reference || block.tool_use_id || block.toolUseId || "").trim();
            if (!reference)
                return block;
            cacheReferenceCount += 1;
            if (/Old tool result content cleared|Large old tool result replaced|旧工具结果.*清理/i.test(anthropicBlockText(block)))
                deletions.add(reference);
            return { ...block, cache_reference: reference };
        });
    }
    const markerMessage = messages[lastUserIndex];
    if (markerMessage.content.length === 0)
        markerMessage.content.push({ type: "text", text: "" });
    const markerIndex = markerMessage.content.length - 1;
    const markerBlock = markerMessage.content[markerIndex];
    if (markerBlock && typeof markerBlock === "object" && markerBlock.type !== "cache_edits") {
        markerMessage.content[markerIndex] = { ...markerBlock, cache_control: markerBlock.cache_control || { type: "ephemeral" } };
    }
    if (deletions.size > 0) {
        markerMessage.content = insertAfterLeadingToolResults(markerMessage.content, {
            type: "cache_edits",
            edits: [...deletions].map(cacheReference => ({ type: "delete", cache_reference: cacheReference })),
        });
    }
    const applied = cacheReferenceCount > 0 || deletions.size > 0;
    return {
        body: applied ? { ...bodyInput, messages } : bodyInput,
        applied,
        cacheReferenceCount,
        cacheEditCount: deletions.size,
        reason: applied ? "verified_block_placement" : "no_eligible_tool_results_before_cache_boundary",
    };
}
function responseHeader(response, name) {
    try {
        return String(response?.headers?.get?.(name) || "");
    }
    catch {
        return "";
    }
}
function providerRequestId(response) {
    return responseHeader(response, "request-id")
        || responseHeader(response, "x-request-id")
        || responseHeader(response, "anthropic-request-id")
        || responseHeader(response, "x-anthropic-request-id");
}
function recordAnthropicPromptCacheState(config, options, body, headers) {
    const tracking = options.promptCacheTracking || options.prompt_cache_tracking || null;
    const groupId = String(tracking?.groupId || tracking?.group_id || "").trim();
    const groupSessionId = String(tracking?.groupSessionId || tracking?.group_session_id || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_"))
        return null;
    const betaHeader = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === "anthropic-beta")?.[1] || "";
    try {
        return (0, group_prompt_cache_break_detection_1.recordGroupPromptCacheState)({
            ...tracking,
            groupId,
            groupSessionId,
            provider: "anthropic",
            model: config.model,
            system: body?.system || "",
            toolSchemas: body?.tools || tracking?.toolSchemas || tracking?.tool_schemas || [],
            betaHeaders: String(betaHeader).split(",").map(value => value.trim()).filter(Boolean),
            cachedMicrocompactEnabled: !!body?.context_management,
            extraBodyParams: tracking?.extraBodyParams || tracking?.extra_body_params || {},
        });
    }
    catch {
        return null;
    }
}
function recordApiMicrocompactNativeAdapterTelemetry(options, input = {}) {
    const plan = getApiMicrocompactNativeApplyPlan(options);
    if (!plan?.schema)
        return null;
    const nativeInput = {
        ...getApiMicrocompactNativeTelemetryOptions(options),
        apiMicrocompactNativeApplyPlan: plan,
        telemetrySource: "native_request_adapter",
        transport: plan?.executor?.transport || "anthropic_api",
        ...input,
    };
    let executionReceipt = null;
    let cacheDeletionNotification = null;
    try {
        executionReceipt = (0, provider_native_compact_execution_receipt_1.recordProviderNativeCompactExecutionReceipt)(nativeInput);
    }
    catch { }
    const appliedReceipt = executionReceipt?.receipt;
    if (executionReceipt?.verification?.valid === true
        && appliedReceipt?.status === "native_applied"
        && appliedReceipt?.strong_proof === true
        && appliedReceipt?.provider_outcome_verified === true
        && Number(appliedReceipt?.applied_edit_count || 0) >= 1
        && Number(appliedReceipt?.cleared_input_tokens || 0) > 0
        && String(appliedReceipt?.group_session_id || "").startsWith("gcs_")) {
        try {
            cacheDeletionNotification = (0, group_prompt_cache_break_detection_1.notifyGroupPromptCacheDeletion)({ executionReceipt: appliedReceipt });
        }
        catch { }
    }
    try {
        const api = require("./memory");
        if (typeof api.recordGroupApiMicrocompactNativeApplyAdapterTelemetry !== "function")
            return { executionReceipt, cacheDeletionNotification };
        const requestTelemetry = api.recordGroupApiMicrocompactNativeApplyAdapterTelemetry(nativeInput);
        return { executionReceipt, requestTelemetry, cacheDeletionNotification };
    }
    catch {
        return { executionReceipt, cacheDeletionNotification };
    }
}
async function callOpenAiCompatibleChatOnce(config, options) {
    const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
    assertLlmConfig(config, endpoint);
    const streaming = options.stream === true || typeof options.onDelta === "function";
    let emitted = false;
    const cache = await prepareContextCache(config, options, "openai");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveLlmTimeoutMs(config, options.defaultTimeoutMs || 30000, options.timeoutMs));
    try {
        const response = await fetchWithNodeHttpFallback(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                temperature: options.temperature ?? resolveTemperature(config, 0.2),
                ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
                ...(streaming ? { stream: true } : {}),
                ...buildOpenAiReasoningFields(callReasoningConfig(config, options)),
                ...(cache.adapterPatch?.body || {}),
                messages: cache.messages,
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
        }
        if (streaming) {
            let content = "";
            let usage = null;
            await consumeSseJson(response, event => {
                const choice = event?.choices?.[0];
                const delta = emitStreamDelta(options, choice?.delta?.content ?? choice?.message?.content ?? "");
                if (delta) {
                    emitted = true;
                    content += delta;
                }
                if (event?.usage)
                    usage = event.usage;
            });
            if (!content.trim())
                throw new Error("模型返回空响应");
            const normalizedUsage = normalizeLlmTokenUsage(usage, "openai");
            reportTokenUsage(options, normalizedUsage);
            finishContextCache(options, cache.plan, { ok: true, usage: normalizedUsage, providerRequestId: providerRequestId(response), adapterEvidence: providerAdapterEvidence(cache) });
            return content;
        }
        const text = await response.text();
        const data = JSON.parse(text);
        const content = String(data?.choices?.[0]?.message?.content || "");
        if (!content.trim())
            throw new Error("模型返回空响应");
        const normalizedUsage = normalizeLlmTokenUsage(data?.usage, "openai");
        reportTokenUsage(options, normalizedUsage);
        finishContextCache(options, cache.plan, { ok: true, usage: normalizedUsage, providerRequestId: providerRequestId(response), adapterEvidence: providerAdapterEvidence(cache) });
        return content;
    }
    catch (error) {
        finishContextCache(options, cache.plan, { ok: false, error });
        throw markStreamInterrupted(error, emitted);
    }
    finally {
        clearTimeout(timeout);
    }
}
function geminiContentText(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return value.map(item => typeof item === "string" ? item : item?.text || JSON.stringify(item)).join("\n");
    }
    return value == null ? "" : JSON.stringify(value);
}
function geminiResponseText(data) {
    return (data?.candidates || [])
        .flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => String(part?.text || ""))
        .join("");
}
function geminiEndpointWithKey(endpoint, apiKey, stream) {
    const url = new URL(endpoint);
    if (!url.searchParams.has("key"))
        url.searchParams.set("key", apiKey);
    if (stream && !url.searchParams.has("alt"))
        url.searchParams.set("alt", "sse");
    return url.toString();
}
async function callGeminiCompatibleChatOnce(config, options) {
    const streaming = options.stream === true || typeof options.onDelta === "function";
    const endpoint = normalizeGeminiGenerateContentUrl(config.apiUrl, config.model, streaming);
    assertLlmConfig(config, endpoint);
    const cache = await prepareContextCache(config, options, "gemini");
    const system = cache.messages.filter((message) => String(message?.role || "") === "system")
        .map((message) => geminiContentText(message?.content)).filter(Boolean).join("\n\n");
    const contents = cache.messages
        .filter((message) => String(message?.role || "") !== "system")
        .map((message) => ({
        role: String(message?.role || "") === "assistant" ? "model" : "user",
        parts: [{ text: geminiContentText(message?.content) }],
    }))
        .filter((message) => message.parts[0].text.trim());
    const body = {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
            temperature: options.temperature ?? resolveTemperature(config, 0.2),
            ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
        },
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveLlmTimeoutMs(config, options.defaultTimeoutMs || 30000, options.timeoutMs));
    let emitted = false;
    try {
        const response = await fetchWithNodeHttpFallback(geminiEndpointWithKey(endpoint, config.apiKey, streaming), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) {
            const detail = await response.text();
            throw new Error(formatHttpError(options.httpErrorPrefix || "Gemini HTTP", response.status, detail));
        }
        if (streaming) {
            let content = "";
            let usage = null;
            await consumeSseJson(response, payload => {
                for (const event of Array.isArray(payload) ? payload : [payload]) {
                    const delta = emitStreamDelta(options, geminiResponseText(event));
                    if (delta) {
                        emitted = true;
                        content += delta;
                    }
                    if (event?.usageMetadata || event?.usage)
                        usage = event.usageMetadata || event.usage;
                }
            });
            if (!content.trim())
                throw new Error("模型返回空响应");
            const normalizedUsage = normalizeLlmTokenUsage(usage, "gemini");
            reportTokenUsage(options, normalizedUsage);
            finishContextCache(options, cache.plan, { ok: true, usage: normalizedUsage, providerRequestId: providerRequestId(response), adapterEvidence: providerAdapterEvidence(cache) });
            return content;
        }
        const data = JSON.parse(await response.text());
        const content = geminiResponseText(data).trim();
        if (!content)
            throw new Error("模型返回空响应");
        const normalizedUsage = normalizeLlmTokenUsage(data?.usageMetadata || data?.usage, "gemini");
        reportTokenUsage(options, normalizedUsage);
        finishContextCache(options, cache.plan, { ok: true, usage: normalizedUsage, providerRequestId: providerRequestId(response), adapterEvidence: providerAdapterEvidence(cache) });
        return content;
    }
    catch (error) {
        finishContextCache(options, cache.plan, { ok: false, error });
        throw markStreamInterrupted(error, emitted);
    }
    finally {
        clearTimeout(timeout);
    }
}
async function callAnthropicCompatibleChatOnce(config, options) {
    const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
    assertLlmConfig(config, endpoint);
    const streaming = options.stream === true || typeof options.onDelta === "function";
    let emitted = false;
    const cache = await prepareContextCache(config, options, "anthropic");
    const messages = cache.messages;
    const system = options.system ?? (messages.find((m) => m.role === "system")?.content || "");
    const userMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveLlmTimeoutMs(config, options.defaultTimeoutMs || 30000, options.timeoutMs));
    try {
        const patched = applyApiMicrocompactNativeRequestPatch({
            model: config.model,
            max_tokens: options.maxTokens || 1500,
            temperature: options.temperature ?? resolveTemperature(config, 0.2),
            system,
            messages: userMessages,
            ...(streaming ? { stream: true } : {}),
            ...buildAnthropicThinkingFields(callReasoningConfig(config, options)),
        }, {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
        }, options);
        const cacheReferenceEditing = applyAnthropicCacheReferenceEditing(patched.body, config);
        patched.body = cacheReferenceEditing.body;
        recordAnthropicPromptCacheState(config, options, patched.body, patched.headers);
        const sentAt = new Date().toISOString();
        let response = null;
        try {
            response = await fetchWithNodeHttpFallback(endpoint, {
                method: "POST",
                headers: patched.headers,
                body: JSON.stringify(patched.body),
                signal: controller.signal,
            });
        }
        catch (error) {
            recordApiMicrocompactNativeAdapterTelemetry(options, {
                requestPatch: patched.requestPatch,
                requestBody: patched.body,
                headers: patched.headers,
                provider: "anthropic",
                model: config.model,
                endpoint,
                method: "POST",
                sentAt,
                ok: false,
                error: error?.message || String(error),
            });
            throw error;
        }
        if (!response.ok) {
            const text = await response.text();
            recordApiMicrocompactNativeAdapterTelemetry(options, {
                requestPatch: patched.requestPatch,
                requestBody: patched.body,
                headers: patched.headers,
                provider: "anthropic",
                model: config.model,
                endpoint,
                method: "POST",
                responseStatus: response.status,
                requestId: providerRequestId(response),
                sentAt,
                ok: false,
                error: `HTTP ${response.status}`,
            });
            throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
        }
        if (streaming) {
            let content = "";
            let usage = {};
            await consumeSseJson(response, event => {
                if (event?.usage) {
                    usage = { ...usage, ...event.usage };
                }
                if (event?.type === "message_start" && event?.message?.usage) {
                    usage = { ...usage, ...event.message.usage };
                }
                if (event?.type === "message_delta" && event?.usage) {
                    usage = { ...usage, ...event.usage };
                }
                const textDelta = Array.isArray(event?.content)
                    ? event.content.map((part) => part?.type === "text" ? part.text : "").join("")
                    : event?.type === "content_block_start" && event?.content_block?.type === "text"
                        ? event.content_block.text
                        : event?.type === "content_block_delta" && event?.delta?.type === "text_delta"
                            ? event.delta.text
                            : "";
                const delta = emitStreamDelta(options, textDelta);
                if (delta) {
                    emitted = true;
                    content += delta;
                }
            });
            recordApiMicrocompactNativeAdapterTelemetry(options, {
                requestPatch: patched.requestPatch,
                requestBody: patched.body,
                headers: patched.headers,
                provider: "anthropic",
                model: config.model,
                endpoint,
                method: "POST",
                responseStatus: response.status,
                requestId: providerRequestId(response),
                responseBody: { type: "stream", content_length: content.length, usage },
                sentAt,
                ok: true,
            });
            if (!content.trim())
                throw new Error("模型返回空响应");
            const normalizedUsage = normalizeLlmTokenUsage(usage, "anthropic");
            reportTokenUsage(options, normalizedUsage);
            finishContextCache(options, cache.plan, { ok: true, usage: normalizedUsage, providerRequestId: providerRequestId(response), adapterEvidence: cacheReferenceEditing });
            return content;
        }
        const text = await response.text();
        let data = null;
        try {
            data = JSON.parse(text);
        }
        catch (error) {
            recordApiMicrocompactNativeAdapterTelemetry(options, {
                requestPatch: patched.requestPatch,
                requestBody: patched.body,
                headers: patched.headers,
                provider: "anthropic",
                model: config.model,
                endpoint,
                method: "POST",
                responseStatus: response.status,
                requestId: providerRequestId(response),
                sentAt,
                ok: true,
                responseParseError: error?.message || String(error),
            });
            throw error;
        }
        recordApiMicrocompactNativeAdapterTelemetry(options, {
            requestPatch: patched.requestPatch,
            requestBody: patched.body,
            headers: patched.headers,
            provider: "anthropic",
            model: config.model,
            endpoint,
            method: "POST",
            responseStatus: response.status,
            requestId: providerRequestId(response),
            responseBody: data,
            sentAt,
            ok: true,
        });
        const content = (data?.content || [])
            .map((part) => part?.type === "text" ? part.text : "")
            .join("")
            .trim();
        if (!content)
            throw new Error("模型返回空响应");
        const normalizedUsage = normalizeLlmTokenUsage(data?.usage, "anthropic");
        reportTokenUsage(options, normalizedUsage);
        finishContextCache(options, cache.plan, { ok: true, usage: normalizedUsage, providerRequestId: providerRequestId(response), adapterEvidence: cacheReferenceEditing });
        return content;
    }
    catch (error) {
        finishContextCache(options, cache.plan, { ok: false, error });
        throw markStreamInterrupted(error, emitted);
    }
    finally {
        clearTimeout(timeout);
    }
}
exports.MODEL_LONG_REQUEST_TOTAL_TIMEOUT_MS = 360_000;
function resolveLlmRetryOptions(config, options, fallbackScope) {
    const configuredTimeoutMs = resolveLlmTimeoutMs(config, options.defaultTimeoutMs || model_call_retry_1.UNIFIED_MODEL_ATTEMPT_TIMEOUT_MS, options.timeoutMs);
    const attempts = Math.max(1, Math.min(model_call_retry_1.UNIFIED_MODEL_MAX_ATTEMPTS, Math.floor(Number(options.retryAttempts) || model_call_retry_1.UNIFIED_MODEL_MAX_ATTEMPTS)));
    const configuredTotalTimeoutMs = Number(options.retryTotalTimeoutMs);
    const derivedTotalTimeoutMs = Math.max(model_call_retry_1.UNIFIED_MODEL_TOTAL_TIMEOUT_MS, Math.min(exports.MODEL_LONG_REQUEST_TOTAL_TIMEOUT_MS, configuredTimeoutMs * Math.min(3, attempts)));
    return {
        attempts,
        // timeoutMs is a per-provider-request contract. Do not silently replace a
        // user configured 120 second request with the historical 30 second default.
        attemptTimeoutMs: configuredTimeoutMs,
        baseDelayMs: options.retryBaseDelayMs,
        // Long reasoning requests get up to six minutes overall, while transient
        // fast failures can still consume all five attempts.
        totalTimeoutMs: Number.isFinite(configuredTotalTimeoutMs) && configuredTotalTimeoutMs > 0
            ? Math.max(configuredTimeoutMs, configuredTotalTimeoutMs)
            : derivedTotalTimeoutMs,
        scope: options.retryScope || fallbackScope,
        onRetry: options.onRetry || ((notice) => {
            const message = String(notice.error?.message || notice.error || "temporary model error").slice(0, 240);
            console.warn(`[模型重试] ${options.retryScope || fallbackScope} 暂时失败，将执行第 ${notice.attempt + 1}/${notice.maxAttempts} 次尝试：${message}`);
        }),
    };
}
async function callOpenAiCompatibleChat(config, options) {
    if (shouldUseGemini(config))
        return callGeminiCompatibleChat(config, options);
    if (options.retry === false)
        return callOpenAiCompatibleChatOnce(config, options);
    return (0, model_call_retry_1.runModelCallWithRetry)(context => callOpenAiCompatibleChatOnce(config, { ...options, timeoutMs: context.attemptTimeoutMs, retry: false }), resolveLlmRetryOptions(config, options, "OpenAI-compatible model call"));
}
async function callGeminiCompatibleChat(config, options) {
    if (options.retry === false)
        return callGeminiCompatibleChatOnce(config, options);
    return (0, model_call_retry_1.runModelCallWithRetry)(context => callGeminiCompatibleChatOnce(config, { ...options, timeoutMs: context.attemptTimeoutMs, retry: false }), resolveLlmRetryOptions(config, options, "Gemini-compatible model call"));
}
async function callAnthropicCompatibleChat(config, options) {
    if (options.retry === false)
        return callAnthropicCompatibleChatOnce(config, options);
    return (0, model_call_retry_1.runModelCallWithRetry)(context => callAnthropicCompatibleChatOnce(config, { ...options, timeoutMs: context.attemptTimeoutMs, retry: false }), resolveLlmRetryOptions(config, options, "Anthropic-compatible model call"));
}
async function callOpenAiCompatibleJson(config, options) {
    if (shouldUseGemini(config))
        return callGeminiCompatibleJson(config, options);
    if (options.retry === false) {
        const content = await callOpenAiCompatibleChatOnce(config, options);
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
        return parsed;
    }
    return (0, model_call_retry_1.runModelCallWithRetry)(async (context) => {
        let usage = null;
        const content = await callOpenAiCompatibleChatOnce(config, {
            ...options,
            retry: false,
            timeoutMs: context.attemptTimeoutMs,
            onUsage: value => { usage = value; },
        });
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
        if (usage)
            reportTokenUsage(options, usage);
        return parsed;
    }, resolveLlmRetryOptions(config, options, "OpenAI-compatible JSON model call"));
}
async function callGeminiCompatibleJson(config, options) {
    if (options.retry === false) {
        const content = await callGeminiCompatibleChatOnce(config, options);
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
        return parsed;
    }
    return (0, model_call_retry_1.runModelCallWithRetry)(async (context) => {
        let usage = null;
        const content = await callGeminiCompatibleChatOnce(config, {
            ...options,
            retry: false,
            timeoutMs: context.attemptTimeoutMs,
            onUsage: value => { usage = value; },
        });
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
        if (usage)
            reportTokenUsage(options, usage);
        return parsed;
    }, resolveLlmRetryOptions(config, options, "Gemini-compatible JSON model call"));
}
async function callAnthropicCompatibleJson(config, options) {
    if (options.retry === false) {
        const content = await callAnthropicCompatibleChatOnce(config, options);
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
        return parsed;
    }
    return (0, model_call_retry_1.runModelCallWithRetry)(async (context) => {
        let usage = null;
        const content = await callAnthropicCompatibleChatOnce(config, {
            ...options,
            retry: false,
            timeoutMs: context.attemptTimeoutMs,
            onUsage: value => { usage = value; },
        });
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
        if (usage)
            reportTokenUsage(options, usage);
        return parsed;
    }, resolveLlmRetryOptions(config, options, "Anthropic-compatible JSON model call"));
}
async function runLlmTokenUsageSelfTest() {
    const originalFetch = globalThis.fetch;
    let openAiUsage = null;
    let anthropicUsage = null;
    try {
        globalThis.fetch = async () => ({
            ok: true,
            status: 200,
            headers: { get: () => "" },
            async text() {
                return JSON.stringify({
                    choices: [{ message: { content: "openai ok" } }],
                    usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
                });
            },
        });
        const openAiContent = await callOpenAiCompatibleChat({
            apiUrl: "https://example.com/v1",
            apiKey: "selftest-key",
            model: "selftest-model",
        }, {
            messages: [{ role: "user", content: "selftest" }],
            onUsage: usage => { openAiUsage = usage; },
        });
        globalThis.fetch = async () => ({
            ok: true,
            status: 200,
            headers: { get: () => "" },
            async text() {
                return JSON.stringify({
                    content: [{ type: "text", text: "anthropic ok" }],
                    usage: {
                        input_tokens: 100,
                        cache_creation_input_tokens: 20,
                        cache_read_input_tokens: 300,
                        output_tokens: 40,
                    },
                });
            },
        });
        const anthropicContent = await callAnthropicCompatibleChat({
            apiUrl: "https://example.com/v1",
            apiKey: "selftest-key",
            model: "selftest-model",
        }, {
            messages: [{ role: "user", content: "selftest" }],
            onUsage: usage => { anthropicUsage = usage; },
        });
        const checks = {
            openAiContentPreserved: openAiContent === "openai ok",
            openAiInputTokensCaptured: openAiUsage?.inputTokens === 120,
            openAiOutputTokensCaptured: openAiUsage?.outputTokens === 30,
            anthropicContentPreserved: anthropicContent === "anthropic ok",
            anthropicDirectInputTokensCaptured: anthropicUsage?.inputTokens === 100,
            anthropicCacheTokensCaptured: anthropicUsage?.cacheCreationInputTokens === 20 && anthropicUsage?.cacheReadInputTokens === 300,
            anthropicTotalIncludesCacheTokens: anthropicUsage?.totalTokens === 460,
            anthropicOutputTokensCaptured: anthropicUsage?.outputTokens === 40,
        };
        return { pass: Object.values(checks).every(Boolean), checks, openAiUsage, anthropicUsage };
    }
    finally {
        globalThis.fetch = originalFetch;
    }
}
async function runLlmStreamingSelfTest() {
    const originalFetch = globalThis.fetch;
    const encoder = new TextEncoder();
    const createResponse = (chunks, onClosed) => ({
        ok: true,
        status: 200,
        headers: { get: () => "text/event-stream" },
        body: new ReadableStream({
            start(controller) {
                chunks.forEach((chunk, index) => {
                    setTimeout(() => {
                        controller.enqueue(encoder.encode(chunk));
                        if (index === chunks.length - 1) {
                            setTimeout(() => {
                                onClosed();
                                controller.close();
                            }, 5);
                        }
                    }, index * 5);
                });
            },
        }),
        async text() { return ""; },
    });
    try {
        const openAiDeltas = [];
        let openAiClosed = false;
        let openAiDeltaBeforeClose = false;
        let openAiUsage = null;
        globalThis.fetch = async () => createResponse([
            "data: {\"choices\":[{\"delta\":{\"content\":\"你\"}}]}\n",
            "\ndata: {\"choices\":[{\"delta\":{\"content\":\"好\"}}],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":2}}\n\n",
            "data: [DONE]\n\n",
        ], () => { openAiClosed = true; });
        const openAiContent = await callOpenAiCompatibleChat({
            apiUrl: "https://example.com/v1",
            apiKey: "selftest-key",
            model: "selftest-model",
        }, {
            messages: [{ role: "user", content: "selftest" }],
            stream: true,
            retry: false,
            onDelta: delta => {
                openAiDeltas.push(delta);
                if (!openAiClosed)
                    openAiDeltaBeforeClose = true;
            },
            onUsage: usage => { openAiUsage = usage; },
        });
        const anthropicDeltas = [];
        let anthropicClosed = false;
        let anthropicDeltaBeforeClose = false;
        let anthropicUsage = null;
        globalThis.fetch = async () => createResponse([
            "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":12}}}\n\n",
            "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"流\"}}\n\n",
            "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"式\"}}\n\n",
            "event: message_delta\ndata: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":2}}\n\n",
        ], () => { anthropicClosed = true; });
        const anthropicContent = await callAnthropicCompatibleChat({
            apiUrl: "https://example.com/v1",
            apiKey: "selftest-key",
            model: "selftest-model",
        }, {
            messages: [{ role: "user", content: "selftest" }],
            stream: true,
            retry: false,
            onDelta: delta => {
                anthropicDeltas.push(delta);
                if (!anthropicClosed)
                    anthropicDeltaBeforeClose = true;
            },
            onUsage: usage => { anthropicUsage = usage; },
        });
        let interruptedCalls = 0;
        let interruptedErrorCode = "";
        globalThis.fetch = async () => {
            interruptedCalls += 1;
            return {
                ok: true,
                status: 200,
                headers: { get: () => "text/event-stream" },
                body: new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode("data: {\"choices\":[{\"delta\":{\"content\":\"已\"}}]}\n\n"));
                        setTimeout(() => controller.error(new Error("socket closed during stream")), 5);
                    },
                }),
                async text() { return ""; },
            };
        };
        try {
            await callOpenAiCompatibleChat({
                apiUrl: "https://example.com/v1",
                apiKey: "selftest-key",
                model: "selftest-model",
            }, {
                messages: [{ role: "user", content: "selftest" }],
                stream: true,
                retryAttempts: 5,
                retryBaseDelayMs: 0,
                onDelta: () => { },
            });
        }
        catch (error) {
            interruptedErrorCode = String(error?.code || "");
        }
        const checks = {
            openAiContent: openAiContent === "你好",
            openAiDeltas: openAiDeltas.join("") === "你好" && openAiDeltas.length === 2,
            openAiIncremental: openAiDeltaBeforeClose,
            openAiUsage: openAiUsage?.inputTokens === 10 && openAiUsage?.outputTokens === 2,
            anthropicContent: anthropicContent === "流式",
            anthropicDeltas: anthropicDeltas.join("") === "流式" && anthropicDeltas.length === 2,
            anthropicIncremental: anthropicDeltaBeforeClose,
            anthropicUsage: anthropicUsage?.inputTokens === 12 && anthropicUsage?.outputTokens === 2,
            interruptedStreamDoesNotRetry: interruptedCalls === 1 && interruptedErrorCode === "CCM_MODEL_STREAM_INTERRUPTED_AFTER_DELTA",
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        globalThis.fetch = originalFetch;
    }
}
async function runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest() {
    const groupId = `group-orchestrator-api-microcompact-native-adapter-selftest-${process.pid}-${Date.now()}`;
    const groupSessionId = `gcs-${groupId}`;
    const taskId = `task-${groupId}`;
    const executionId = `execution-${groupId}`;
    const runnerRequestId = `runner-${groupId}`;
    const memoryApi = require("./memory");
    const compactionApi = require("./group-memory-compaction");
    const editPlan = compactionApi.buildGroupApiMicroCompactEditPlan([
        {
            id: "adapter-telemetry-thinking",
            role: "assistant",
            content: [{ type: "thinking", thinking: "ADAPTER_TELEMETRY_THINKING" }],
        },
        {
            id: "adapter-telemetry-tool",
            role: "assistant",
            content: [{ type: "tool_use", id: "adapter-read", name: "Read", input: { file_path: "src/adapter.ts" } }],
        },
        {
            id: "adapter-telemetry-tool-result",
            role: "user",
            content: [{ type: "tool_result", tool_use_id: "adapter-read", content: "adapter result" }],
        },
    ], {
        groupId,
        groupSessionId,
        targetProject: "api",
        activeTokens: 220000,
        force: true,
        now: "2026-07-08T09:00:00.000Z",
    });
    const nativePlan = compactionApi.buildGroupApiMicrocompactNativeApplyPlan(editPlan, {
        groupId,
        groupSessionId,
        targetProject: "api",
        agentType: "anthropic-api",
        transport: "anthropic_api",
        provider: "anthropic",
        supportsApiContextManagement: true,
        nativeApiRequestLayer: true,
        betaHeaders: ["context-management-2025-06-27"],
        sessionBinding: {
            schema: "ccm-child-agent-memory-session-binding-v1",
            binding_id: `csm-${groupId}`,
            task_agent_session_id: `tas-${groupId}`,
            native_session_id: `native-${groupId}`,
        },
        memoryContextSnapshotId: `snapshot-${groupId}`,
        memoryContextSnapshotChecksum: `snapshot-checksum-${groupId}`,
        executionId,
        runnerRequestId,
        now: "2026-07-08T09:01:00.000Z",
    });
    const ledgerFile = memoryApi.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile(groupId, groupSessionId);
    const executionReceiptApi = require("./provider-native-compact-execution-receipt");
    const executionReceiptFile = executionReceiptApi.getProviderNativeCompactExecutionReceiptLedgerFile(groupId, groupSessionId);
    const originalFetch = globalThis.fetch;
    let captured = null;
    try {
        globalThis.fetch = async (url, init = {}) => {
            captured = {
                url: String(url || ""),
                headers: init.headers || {},
                body: JSON.parse(String(init.body || "{}")),
            };
            return {
                ok: true,
                status: 200,
                headers: {
                    get(name) {
                        return String(name || "").toLowerCase().includes("request-id") ? "req-api-microcompact-adapter-selftest" : "";
                    },
                },
                async text() {
                    return JSON.stringify({
                        content: [{ type: "text", text: "adapter ok" }],
                        context_management: {
                            applied_edits: [{ type: "clear_tool_uses_20250919", cleared_tool_uses: 4, cleared_input_tokens: 24000 }],
                        },
                    });
                },
            };
        };
        const content = await callAnthropicCompatibleChat({
            apiUrl: "https://api.anthropic.com/v1",
            apiKey: "selftest-key",
            model: "claude-selftest",
            timeoutMs: 5000,
        }, {
            messages: [{ role: "user", content: "adapter telemetry selftest" }],
            apiMicrocompactNativeApplyPlan: nativePlan,
            apiMicrocompactNativeApplyTelemetry: {
                groupId,
                groupSessionId,
                targetProject: "api",
                taskId,
                executionId,
                runnerRequestId,
                taskAgentSessionId: nativePlan.task_agent_session_id,
                nativeSessionId: nativePlan.native_session_id,
                memoryContextSnapshotId: nativePlan.memory_context_snapshot_id,
                memoryContextSnapshotChecksum: nativePlan.memory_context_snapshot_checksum,
            },
        });
        const ledger = memoryApi.readGroupApiMicrocompactNativeApplyRequestTelemetryLedger(groupId, groupSessionId);
        const executionReceiptLedger = executionReceiptApi.readProviderNativeCompactExecutionReceiptLedger(groupId, groupSessionId);
        const executionReceipt = executionReceiptLedger.entries?.at(-1);
        const entry = (ledger.entries || []).find((item) => item.task_id === taskId);
        const checks = {
            modelReturned: content === "adapter ok",
            requestBodyIncludesContextManagement: !!captured?.body?.context_management
                && captured.body.context_management.edits?.length === editPlan.editCount,
            requestHeaderIncludesBeta: String(captured?.headers?.["anthropic-beta"] || captured?.headers?.["Anthropic-Beta"] || "").includes("context-management-2025-06-27"),
            ledgerRecordedAdapterTelemetry: entry?.telemetry_source === "native_request_adapter"
                && entry?.telemetry_status === "matched_contract"
                && entry?.request_patch_checksum === nativePlan.requestPatchChecksum,
            ledgerBindsSessionAndSnapshot: entry?.task_agent_session_id === nativePlan.task_agent_session_id
                && entry?.memory_context_snapshot_id === nativePlan.memory_context_snapshot_id,
            platformExecutionReceiptIsStrong: executionReceipt?.status === "native_applied"
                && executionReceipt?.strong_proof === true
                && executionReceipt?.provider_outcome_verified === true
                && executionReceipt?.applied_edit_count === 1
                && executionReceipt?.execution_id === executionId
                && executionReceipt?.runner_request_id === runnerRequestId,
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            captured: {
                hasContextManagement: !!captured?.body?.context_management,
                beta: captured?.headers?.["anthropic-beta"] || captured?.headers?.["Anthropic-Beta"] || "",
            },
            entry: entry ? {
                telemetryStatus: entry.telemetry_status,
                telemetrySource: entry.telemetry_source,
                requestPatchChecksum: entry.request_patch_checksum,
            } : null,
        };
    }
    finally {
        globalThis.fetch = originalFetch;
        for (const file of [ledgerFile, `${ledgerFile}.bak`, executionReceiptFile, `${executionReceiptFile}.bak`]) {
            try {
                if (file && require("fs").existsSync(file))
                    require("fs").unlinkSync(file);
            }
            catch { }
        }
    }
}
//# sourceMappingURL=group-orchestrator-llm-client.js.map