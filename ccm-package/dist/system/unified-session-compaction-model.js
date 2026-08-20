"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUnifiedCompactionJson = extractUnifiedCompactionJson;
exports.normalizeUnifiedOpenAiUrl = normalizeUnifiedOpenAiUrl;
exports.normalizeUnifiedAnthropicUrl = normalizeUnifiedAnthropicUrl;
exports.normalizeUnifiedGeminiUrl = normalizeUnifiedGeminiUrl;
exports.callUnifiedCompactionModelOnce = callUnifiedCompactionModelOnce;
exports.callUnifiedCompactionModel = callUnifiedCompactionModel;
const model_call_retry_1 = require("./model-call-retry");
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
    if (/:(?:generateContent|streamGenerateContent)(?:\?|$)/i.test(base))
        return base.replace(/:streamGenerateContent/i, ":generateContent");
    const cleanModel = String(model || "").trim().replace(/^models\//i, "");
    if (/\/models\/[^/]+$/i.test(base))
        return `${base}:generateContent`;
    if (/\/v1(?:beta)?$/i.test(base))
        return `${base}/models/${encodeURIComponent(cleanModel)}:generateContent`;
    return `${base}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`;
}
function isGemini(config) {
    const format = String(config?.format || "auto").toLowerCase();
    const url = String(config?.apiUrl || "").toLowerCase();
    return format === "gemini-compatible" || format === "auto" && /generativelanguage\.googleapis\.com|:generatecontent/.test(url);
}
function isAnthropic(config) {
    return config?.format === "anthropic-compatible"
        || config?.format === "auto" && String(config?.apiUrl || "").toLowerCase().includes("anthropic")
        || /\/anthropic(?:\/|$)/i.test(String(config?.apiUrl || ""));
}
async function callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, attemptTimeoutMs, audit = {}) {
    const anthropic = isAnthropic(config);
    const gemini = isGemini(config);
    const provider = anthropic ? "anthropic" : gemini ? "gemini" : "openai";
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
        const geminiEndpoint = gemini ? new URL(normalizeUnifiedGeminiUrl(config.apiUrl, config.model)) : null;
        if (geminiEndpoint && !geminiEndpoint.searchParams.has("key"))
            geminiEndpoint.searchParams.set("key", config.apiKey);
        let response;
        try {
            response = await fetch(anthropic ? normalizeUnifiedAnthropicUrl(config.apiUrl)
                : gemini ? geminiEndpoint.toString()
                    : normalizeUnifiedOpenAiUrl(config.apiUrl), {
                method: "POST",
                headers: anthropic
                    ? { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }
                    : gemini ? { "Content-Type": "application/json" }
                        : { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
                body: JSON.stringify(anthropic ? {
                    model: config.model,
                    max_tokens: maxOutputTokens,
                    temperature: 0.1,
                    system,
                    messages: [{ role: "user", content: user }],
                } : gemini ? {
                    systemInstruction: { parts: [{ text: system }] },
                    contents: [{ role: "user", parts: [{ text: user }] }],
                    generationConfig: { maxOutputTokens, temperature: 0.1 },
                } : {
                    model: config.model,
                    max_tokens: maxOutputTokens,
                    temperature: 0.1,
                    messages: [{ role: "system", content: system }, { role: "user", content: user }],
                }),
                signal: controller.signal,
            });
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
        const body = await response.text();
        if (!response.ok)
            throw new Error(`session compaction HTTP ${response.status}: ${body.slice(0, 180)}`);
        const data = JSON.parse(body);
        const content = anthropic
            ? (data?.content || []).map((part) => part?.type === "text" ? part.text : "").join("")
            : gemini
                ? (data?.candidates || []).flatMap((candidate) => candidate?.content?.parts || []).map((part) => part?.text || "").join("")
                : data?.choices?.[0]?.message?.content || "";
        const summary = extractUnifiedCompactionJson(content);
        if (!summary)
            throw new Error("Session compaction model returned invalid JSON");
        const responseId = String(data?.id || response.headers.get("request-id") || response.headers.get("x-request-id") || "");
        await audit.afterResponse?.({ provider, model: String(data?.model || config.model || ""), responseId, usage: data?.usage || data?.usageMetadata || null });
        return {
            summary,
            usage: data?.usage || data?.usageMetadata || null,
            provider,
            model: String(data?.model || config.model || ""),
            responseId,
            stopReason: String(anthropic ? data?.stop_reason || "" : gemini ? data?.candidates?.[0]?.finishReason || "" : data?.choices?.[0]?.finish_reason || ""),
        };
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
        return mockCall({ system, user, maxOutputTokens });
    if (!config?.enabled || !config?.apiUrl || !config?.apiKey || !config?.model)
        return null;
    return (0, model_call_retry_1.runModelCallWithRetry)(context => callUnifiedCompactionModelOnce(config, system, user, maxOutputTokens, context.attemptTimeoutMs, audit), {
        scope: "session memory compaction model call",
        baseDelayMs: config.modelRetryBaseDelayMs ?? config.model_retry_base_delay_ms,
        onRetry: notice => {
            try {
                config.onCompactionActivity?.({ stage: "model_summary_retry", heartbeat: false, attempt: notice.attempt + 1, maxAttempts: notice.maxAttempts });
            }
            catch { }
            console.warn(`[model retry] session compaction attempt ${notice.attempt + 1}/${notice.maxAttempts}: ${String(notice.error?.message || notice.error || "").slice(0, 240)}`);
        },
    });
}
//# sourceMappingURL=unified-session-compaction-model.js.map