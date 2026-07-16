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
exports.normalizeLlmTokenUsage = normalizeLlmTokenUsage;
exports.normalizeChatCompletionsUrl = normalizeChatCompletionsUrl;
exports.normalizeAnthropicMessagesUrl = normalizeAnthropicMessagesUrl;
exports.shouldUseAnthropic = shouldUseAnthropic;
exports.extractJsonObject = extractJsonObject;
exports.fetchWithNodeHttpFallback = fetchWithNodeHttpFallback;
exports.callOpenAiCompatibleChat = callOpenAiCompatibleChat;
exports.callAnthropicCompatibleChat = callAnthropicCompatibleChat;
exports.callOpenAiCompatibleJson = callOpenAiCompatibleJson;
exports.callAnthropicCompatibleJson = callAnthropicCompatibleJson;
exports.runLlmTokenUsageSelfTest = runLlmTokenUsageSelfTest;
exports.runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest = runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
function finiteTokenCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
function normalizeLlmTokenUsage(value, provider = "openai") {
    const usage = value && typeof value === "object" ? value : {};
    const outputTokens = Math.max(finiteTokenCount(usage.output_tokens), finiteTokenCount(usage.outputTokens), finiteTokenCount(usage.completion_tokens), finiteTokenCount(usage.completionTokens));
    const directInputTokens = Math.max(finiteTokenCount(usage.input_tokens), finiteTokenCount(usage.inputTokens), finiteTokenCount(usage.prompt_tokens), finiteTokenCount(usage.promptTokens));
    const cacheCreationTokens = provider === "anthropic"
        ? Math.max(finiteTokenCount(usage.cache_creation_input_tokens), finiteTokenCount(usage.cacheCreationInputTokens))
        : 0;
    const cacheReadTokens = provider === "anthropic"
        ? Math.max(finiteTokenCount(usage.cache_read_input_tokens), finiteTokenCount(usage.cacheReadInputTokens))
        : 0;
    const inputTokens = directInputTokens + cacheCreationTokens + cacheReadTokens;
    const reported = inputTokens > 0 || outputTokens > 0;
    return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        reported,
        directInputTokens,
        cacheCreationInputTokens: cacheCreationTokens,
        cacheReadInputTokens: cacheReadTokens,
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
function shouldUseAnthropic(config) {
    const format = String(config.format || "auto");
    const apiUrl = String(config.apiUrl || "").toLowerCase();
    return format === "anthropic-compatible"
        || format === "auto" && apiUrl.includes("anthropic")
        || format === "openai-compatible" && /\/anthropic(?:\/|$)/i.test(apiUrl);
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
function resolveTimeoutMs(config, defaultTimeoutMs) {
    return Math.max(5000, Number(config.timeoutMs) || defaultTimeoutMs);
}
function resolveTemperature(config, fallback) {
    return Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : fallback;
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
            const chunks = [];
            response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            response.on("error", reject);
            response.on("end", () => {
                const body = Buffer.concat(chunks);
                resolve({
                    ok: status >= 200 && status < 300,
                    status,
                    url: url.toString(),
                    headers: {
                        get(name) {
                            const value = response.headers[String(name || "").toLowerCase()];
                            return Array.isArray(value) ? value.join(", ") : String(value || "");
                        },
                    },
                    async text() { return body.toString("utf-8"); },
                    async arrayBuffer() { return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength); },
                });
            });
        });
        request.on("error", reject);
        if (init.body !== undefined && init.body !== null)
            request.write(init.body);
        request.end();
    });
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
async function callOpenAiCompatibleChat(config, options) {
    const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
    assertLlmConfig(config, endpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(config, options.defaultTimeoutMs || 30000));
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
                messages: options.messages,
            }),
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
        }
        const data = JSON.parse(text);
        reportTokenUsage(options, normalizeLlmTokenUsage(data?.usage, "openai"));
        return String(data?.choices?.[0]?.message?.content || "");
    }
    finally {
        clearTimeout(timeout);
    }
}
async function callAnthropicCompatibleChat(config, options) {
    const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
    assertLlmConfig(config, endpoint);
    const messages = options.messages || [];
    const system = options.system ?? (messages.find((m) => m.role === "system")?.content || "");
    const userMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(config, options.defaultTimeoutMs || 30000));
    try {
        const patched = applyApiMicrocompactNativeRequestPatch({
            model: config.model,
            max_tokens: options.maxTokens || 1500,
            temperature: options.temperature ?? resolveTemperature(config, 0.2),
            system,
            messages: userMessages,
        }, {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
        }, options);
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
        const text = await response.text();
        if (!response.ok) {
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
        reportTokenUsage(options, normalizeLlmTokenUsage(data?.usage, "anthropic"));
        return (data?.content || [])
            .map((part) => part?.type === "text" ? part.text : "")
            .join("")
            .trim();
    }
    finally {
        clearTimeout(timeout);
    }
}
async function callOpenAiCompatibleJson(config, options) {
    const content = await callOpenAiCompatibleChat(config, options);
    const parsed = extractJsonObject(content);
    if (!parsed)
        throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
    return parsed;
}
async function callAnthropicCompatibleJson(config, options) {
    const content = await callAnthropicCompatibleChat(config, options);
    const parsed = extractJsonObject(content);
    if (!parsed)
        throw new Error(options.invalidJsonMessage || "主 Agent API 未返回有效 JSON");
    return parsed;
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
            anthropicInputIncludesCacheTokens: anthropicUsage?.inputTokens === 420,
            anthropicOutputTokensCaptured: anthropicUsage?.outputTokens === 40,
        };
        return { pass: Object.values(checks).every(Boolean), checks, openAiUsage, anthropicUsage };
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