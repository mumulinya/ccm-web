"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeChatCompletionsUrl = normalizeChatCompletionsUrl;
exports.normalizeAnthropicMessagesUrl = normalizeAnthropicMessagesUrl;
exports.shouldUseAnthropic = shouldUseAnthropic;
exports.extractJsonObject = extractJsonObject;
exports.callOpenAiCompatibleChat = callOpenAiCompatibleChat;
exports.callAnthropicCompatibleChat = callAnthropicCompatibleChat;
exports.callOpenAiCompatibleJson = callOpenAiCompatibleJson;
exports.callAnthropicCompatibleJson = callAnthropicCompatibleJson;
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
async function callOpenAiCompatibleChat(config, options) {
    const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
    assertLlmConfig(config, endpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(config, options.defaultTimeoutMs || 30000));
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                temperature: options.temperature ?? resolveTemperature(config, 0.2),
                messages: options.messages,
            }),
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
        }
        const data = JSON.parse(text);
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
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: options.maxTokens || 1500,
                temperature: options.temperature ?? resolveTemperature(config, 0.2),
                system,
                messages: userMessages,
            }),
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(formatHttpError(options.httpErrorPrefix || "HTTP", response.status, text));
        }
        const data = JSON.parse(text);
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
//# sourceMappingURL=group-orchestrator-llm-client.js.map