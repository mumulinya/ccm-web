"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractJsonObject = exports.normalizeOpenAiResponsesUrl = exports.UNIFIED_COMPACTION_MODEL_TOTAL_TIMEOUT_MS = exports.UNIFIED_COMPACTION_MODEL_ATTEMPT_TIMEOUT_MS = void 0;
exports.resolveUnifiedCompactionRetryOptions = resolveUnifiedCompactionRetryOptions;
exports.extractUnifiedCompactionJson = extractUnifiedCompactionJson;
exports.normalizeUnifiedOpenAiUrl = normalizeUnifiedOpenAiUrl;
exports.normalizeUnifiedAnthropicUrl = normalizeUnifiedAnthropicUrl;
exports.normalizeUnifiedGeminiUrl = normalizeUnifiedGeminiUrl;
exports.callUnifiedCompactionModelOnce = callUnifiedCompactionModelOnce;
exports.callUnifiedCompactionModel = callUnifiedCompactionModel;
exports.callCompactionModelOnce = callCompactionModelOnce;
exports.callCompactionModel = callCompactionModel;
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const openai_responses_transport_1 = require("./openai-responses-transport");
Object.defineProperty(exports, "normalizeOpenAiResponsesUrl", { enumerable: true, get: function () { return openai_responses_transport_1.normalizeOpenAiResponsesUrl; } });
const model_call_retry_1 = require("./model-call-retry");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
exports.UNIFIED_COMPACTION_MODEL_ATTEMPT_TIMEOUT_MS = 120_000;
exports.UNIFIED_COMPACTION_MODEL_TOTAL_TIMEOUT_MS = 360_000;
function resolveUnifiedCompactionRetryOptions(config = {}) {
    const attemptTimeoutMs = Math.max(30_000, Math.min(360_000, Number(config?.compactionModelAttemptTimeoutMs
        ?? config?.compaction_model_attempt_timeout_ms
        ?? exports.UNIFIED_COMPACTION_MODEL_ATTEMPT_TIMEOUT_MS) || exports.UNIFIED_COMPACTION_MODEL_ATTEMPT_TIMEOUT_MS));
    const totalTimeoutMs = Math.max(attemptTimeoutMs, Math.min(360_000, Number(config?.compactionModelTotalTimeoutMs
        ?? config?.compaction_model_total_timeout_ms
        ?? exports.UNIFIED_COMPACTION_MODEL_TOTAL_TIMEOUT_MS) || exports.UNIFIED_COMPACTION_MODEL_TOTAL_TIMEOUT_MS));
    return {
        profile: "long_running_task",
        attemptTimeoutMs,
        totalTimeoutMs,
    };
}
function extractUnifiedCompactionJson(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced)
        try {
            return JSON.parse(fenced[1].trim());
        }
        catch { }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start)
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    return null;
}
function normalizeUnifiedOpenAiUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/\/chat\/completions$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/chat/completions`;
    return /\/v1\//i.test(base) ? base : `${base}/v1/chat/completions`;
}
function normalizeUnifiedAnthropicUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/\/v1\/messages$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/messages`;
    return /\/v1\//i.test(base) ? base : `${base}/v1/messages`;
}
function normalizeUnifiedGeminiUrl(value, model) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (/(?::generateContent|:streamGenerateContent)(?:\?|$)/i.test(base))
        return base.replace(/:streamGenerateContent/i, ":generateContent");
    const cleanModel = String(model || "").trim().replace(/^models\//i, "");
    if (/\/models\/[^/]+$/i.test(base))
        return `${base}:generateContent`;
    if (/\/v1(?:beta)?$/i.test(base))
        return `${base}/models/${encodeURIComponent(cleanModel)}:generateContent`;
    return `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
}
async function callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, attemptTimeoutMs, audit = {}) {
    const transport = (0, provider_cache_protocol_1.assertProviderTransportResolution)(config);
    const anthropic = transport.protocol === "anthropic_messages";
    const provider = { anthropic_messages: "anthropic", gemini_generate_content: "gemini", responses: "openai-responses", chat_completions: "openai", custom: "custom" }[transport.protocol] || "custom";
    const controller = new AbortController();
    const externalSignal = config?.compactionAbortSignal || config?.compaction_abort_signal || null;
    const abortFromExternal = () => controller.abort(externalSignal?.reason);
    if (externalSignal?.aborted)
        abortFromExternal();
    else
        externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
    const timeout = setTimeout(() => controller.abort(), Math.max(1_000, attemptTimeoutMs));
    let activityError = null;
    const activitySignal = typeof config?.onCompactionActivity === "function" ? config.onCompactionActivity : null;
    const heartbeatMs = Math.max(25, Math.min(Number(config?.compactionActivityHeartbeatMs || config?.compaction_activity_heartbeat_ms || 30_000), 60_000));
    const heartbeat = activitySignal ? setInterval(() => {
        try {
            activitySignal({ stage: "model_summary_wait", heartbeat: true });
        }
        catch (error) {
            activityError = error;
            controller.abort();
        }
    }, heartbeatMs) : null;
    heartbeat?.unref?.();
    try {
        await audit.beforeRequest?.({ provider, model: String(config?.model || ""), system });
        activitySignal?.({ stage: "model_summary_request", heartbeat: false });
        let usage = null;
        let responseMetadata = null;
        try {
            const call = anthropic ? group_orchestrator_llm_client_1.callAnthropicCompatibleChat : group_orchestrator_llm_client_1.callOpenAiCompatibleChat;
            const content = await call(config, {
                system,
                messages: [{ role: "user", content: user }],
                maxTokens: maxOutputTokens,
                temperature: 0.1,
                defaultTimeoutMs: attemptTimeoutMs,
                timeoutMs: attemptTimeoutMs,
                retry: false,
                signal: controller.signal,
                onUsage: value => { usage = value; },
                onResponseMetadata: value => { responseMetadata = value; },
            });
            if (activityError) {
                const failed = new Error(String(activityError?.message || activityError || "Compaction activity callback failed"));
                failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
                throw failed;
            }
            if (externalSignal?.aborted) {
                const cancelled = new Error(String(externalSignal.reason?.message || "Compaction model call cancelled"));
                cancelled.code = "CCM_MODEL_CALL_CANCELLED";
                throw cancelled;
            }
            const summary = extractUnifiedCompactionJson(content);
            if (!summary)
                throw new Error("Session compaction model returned invalid JSON");
            const responseId = String(responseMetadata?.responseId || "");
            await audit.afterResponse?.({ provider: String(responseMetadata?.provider || provider), model: String(responseMetadata?.model || config.model || ""), responseId, usage });
            return { summary, usage, provider: String(responseMetadata?.provider || provider), model: String(responseMetadata?.model || config.model || ""), responseId, stopReason: String(responseMetadata?.status || "") };
        }
        catch (error) {
            if (activityError) {
                const failed = new Error(String(activityError?.message || activityError || "Compaction activity callback failed"));
                failed.code = "CCM_MODEL_CALL_ACTIVITY_FAILED";
                throw failed;
            }
            if (externalSignal?.aborted) {
                const cancelled = new Error(String(externalSignal.reason?.message || "Compaction model call cancelled"));
                cancelled.code = "CCM_MODEL_CALL_CANCELLED";
                throw cancelled;
            }
            throw error;
        }
    }
    finally {
        clearTimeout(timeout);
        if (heartbeat)
            clearInterval(heartbeat);
        externalSignal?.removeEventListener("abort", abortFromExternal);
    }
}
async function callUnifiedCompactionModel(config, system, user, maxOutputTokens = 16_000, audit = {}) {
    const mockCall = config?.compactionModelCall || config?.compaction_model_call || config?.modelCall || config?.model_call;
    if (typeof mockCall === "function")
        return mockCall({ system, user, maxOutputTokens, signal: config?.compactionAbortSignal || config?.compaction_abort_signal });
    if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model)
        return null;
    const retryOptions = resolveUnifiedCompactionRetryOptions(config);
    return (0, model_call_retry_1.runModelCallWithRetry)(context => callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, context.attemptTimeoutMs, audit), {
        scope: "session memory compaction model call",
        ...retryOptions,
        baseDelayMs: config.modelRetryBaseDelayMs ?? config.model_retry_base_delay_ms,
        onRetry: notice => {
            try {
                config.onCompactionActivity?.({ stage: "model_summary_retry", heartbeat: false, attempt: notice.attempt + 1, maxAttempts: notice.maxAttempts });
            }
            catch { }
            console.warn(`[model retry] session compaction attempt ${notice.attempt + 1}/${notice.maxAttempts}: ${String(notice.error?.message || notice.error || "").slice(0, 240)}`);
        },
        signal: config?.compactionAbortSignal || config?.compaction_abort_signal,
    });
}
// Compatibility-shaped adapters for non-session callers.  The transport and
// retry policy above are the single implementation; callers must not create
// their own provider-specific compaction requests.
async function callCompactionModelOnce(config, system, user, maxOutputTokens, attemptTimeoutMs) {
    return callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, attemptTimeoutMs, {
        beforeRequest: ({ provider, model }) => {
            try {
                config?.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false });
            }
            catch { }
        },
    });
}
async function callCompactionModel(config, system, user, maxOutputTokens = 16_000) {
    return callUnifiedCompactionModel(config, system, user, maxOutputTokens, {
        beforeRequest: ({ provider, model }) => {
            try {
                config?.onCompactionActivity?.({ stage: "model_summary_request", provider, model, heartbeat: false });
            }
            catch { }
        },
    });
}
exports.extractJsonObject = extractUnifiedCompactionJson;
//# sourceMappingURL=unified-session-compaction-model.js.map