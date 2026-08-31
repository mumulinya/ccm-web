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
exports.isOfficialOpenAiResponsesEndpoint = isOfficialOpenAiResponsesEndpoint;
exports.getReusableResponsesPreviousId = getReusableResponsesPreviousId;
exports.rememberResponsesResponseId = rememberResponsesResponseId;
exports.forgetResponsesPreviousId = forgetResponsesPreviousId;
exports.shouldOmitOpenAiResponsesMaxOutputTokens = shouldOmitOpenAiResponsesMaxOutputTokens;
exports.rememberOpenAiResponsesMaxOutputTokensUnsupported = rememberOpenAiResponsesMaxOutputTokensUnsupported;
exports.shouldOmitOpenAiResponsesTemperature = shouldOmitOpenAiResponsesTemperature;
exports.rememberOpenAiResponsesTemperatureUnsupported = rememberOpenAiResponsesTemperatureUnsupported;
exports.shouldRetryOpenAiResponsesWithoutMaxOutputTokens = shouldRetryOpenAiResponsesWithoutMaxOutputTokens;
exports.shouldRetryOpenAiResponsesWithoutTemperature = shouldRetryOpenAiResponsesWithoutTemperature;
exports.isOpenAiResponsesSse = isOpenAiResponsesSse;
exports.normalizeOpenAiResponsesUrl = normalizeOpenAiResponsesUrl;
exports.encodeOpenAiResponsesInput = encodeOpenAiResponsesInput;
exports.buildOpenAiResponsesTools = buildOpenAiResponsesTools;
exports.buildOpenAiResponsesBody = buildOpenAiResponsesBody;
exports.safeProviderHttpDetail = safeProviderHttpDetail;
exports.consumeOpenAiResponsesSse = consumeOpenAiResponsesSse;
const crypto = __importStar(require("crypto"));
const sse_json_parser_1 = require("./sse-json-parser");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const responsesWithoutMaxOutputTokens = new Set();
const responsesWithoutTemperature = new Set();
const responsesSessionState = new Map();
const RESPONSES_SESSION_STATE_TTL_MS = 6 * 60 * 60 * 1000;
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 32);
}
function responsesSessionStateKey(cache, transport) {
    if (!cache || !String(cache.scope || "") || !String(cache.scopeId || "") || !String(cache.sessionId || ""))
        return "";
    const identity = transport ? {
        endpoint: String(transport.endpoint || "").trim().toLowerCase(),
        model: String(transport.model || "").trim().toLowerCase(),
        proxy: String(transport.proxy || "").trim(),
        credential: transport.credential ? digest(String(transport.credential)) : "",
    } : {};
    return `${String(cache.scope)}\0${String(cache.scopeId)}\0${String(cache.sessionId)}\0${digest(identity)}`;
}
function isOfficialOpenAiResponsesEndpoint(endpoint, config) {
    if (config && (0, provider_cache_protocol_1.hasConfiguredProviderProxy)(config))
        return false;
    try {
        return /(?:^|\.)openai\.com$/i.test(new URL(String(endpoint || "")).hostname);
    }
    catch {
        return false;
    }
}
/**
 * Responses conversation state is used only for first-party endpoints and
 * only by ordinary no-tool turns. Tool loops continue to send the explicit
 * transcript because CCM must preserve its local execution ledger and
 * permission boundaries.
 */
function getReusableResponsesPreviousId(endpoint, cache, config) {
    if (!isOfficialOpenAiResponsesEndpoint(endpoint, config))
        return "";
    const key = responsesSessionStateKey(cache, {
        endpoint,
        model: config?.model,
        proxy: config?.proxyUrl || config?.proxy_url || config?.proxyEndpoint || config?.proxy_endpoint || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy,
        credential: config?.apiKey || config?.api_key,
    });
    const state = key ? responsesSessionState.get(key) : undefined;
    if (!state || Date.now() - state.updatedAt > RESPONSES_SESSION_STATE_TTL_MS) {
        if (key)
            responsesSessionState.delete(key);
        return "";
    }
    const boundaryGeneration = Math.max(0, Number(cache?.boundaryGeneration || 0));
    return state.boundaryGeneration === boundaryGeneration ? state.responseId : "";
}
function rememberResponsesResponseId(endpoint, cache, responseId, config) {
    if (!isOfficialOpenAiResponsesEndpoint(endpoint, config))
        return;
    const key = responsesSessionStateKey(cache, {
        endpoint,
        model: config?.model,
        proxy: config?.proxyUrl || config?.proxy_url || config?.proxyEndpoint || config?.proxy_endpoint || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy,
        credential: config?.apiKey || config?.api_key,
    });
    const id = String(responseId || "").trim();
    if (!key || !id)
        return;
    responsesSessionState.set(key, {
        responseId: id,
        boundaryGeneration: Math.max(0, Number(cache?.boundaryGeneration || 0)),
        updatedAt: Date.now(),
    });
    if (responsesSessionState.size > 512) {
        const oldest = [...responsesSessionState.entries()].sort((left, right) => left[1].updatedAt - right[1].updatedAt)[0]?.[0];
        if (oldest)
            responsesSessionState.delete(oldest);
    }
}
function forgetResponsesPreviousId(cache, endpoint, config) {
    if (!endpoint) {
        const prefix = cache && String(cache.scope || "") && String(cache.scopeId || "") && String(cache.sessionId || "")
            ? `${String(cache.scope)}\0${String(cache.scopeId)}\0${String(cache.sessionId)}\0`
            : "";
        if (prefix)
            for (const key of responsesSessionState.keys())
                if (key.startsWith(prefix))
                    responsesSessionState.delete(key);
        return;
    }
    const key = responsesSessionStateKey(cache, {
        endpoint,
        model: config?.model,
        proxy: config?.proxyUrl || config?.proxy_url || config?.proxyEndpoint || config?.proxy_endpoint || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy,
        credential: config?.apiKey || config?.api_key,
    });
    if (key)
        responsesSessionState.delete(key);
}
function responsesCompatibilityKey(endpoint, model) {
    return `${String(endpoint || "").trim().replace(/\/+$/, "").toLowerCase()}\n${String(model || "").trim().toLowerCase()}`;
}
function shouldOmitOpenAiResponsesMaxOutputTokens(endpoint, model) {
    return responsesWithoutMaxOutputTokens.has(responsesCompatibilityKey(endpoint, model));
}
function rememberOpenAiResponsesMaxOutputTokensUnsupported(endpoint, model) {
    responsesWithoutMaxOutputTokens.add(responsesCompatibilityKey(endpoint, model));
}
function shouldOmitOpenAiResponsesTemperature(endpoint, model) {
    return responsesWithoutTemperature.has(responsesCompatibilityKey(endpoint, model));
}
function rememberOpenAiResponsesTemperatureUnsupported(endpoint, model) {
    responsesWithoutTemperature.add(responsesCompatibilityKey(endpoint, model));
}
function shouldRetryOpenAiResponsesWithoutMaxOutputTokens(status, detail) {
    if (Number(status) !== 400)
        return false;
    const message = safeProviderHttpDetail(detail, 500);
    return /upstream request failed/i.test(message)
        || /max[_ -]?output[_ -]?tokens?.{0,100}(?:unknown|unsupported|unrecognized|invalid|not allowed)/i.test(message)
        || /(?:unknown|unsupported|unrecognized|invalid|not allowed).{0,100}max[_ -]?output[_ -]?tokens?/i.test(message);
}
function shouldRetryOpenAiResponsesWithoutTemperature(status, detail) {
    if (Number(status) !== 400)
        return false;
    const message = safeProviderHttpDetail(detail, 500);
    return /upstream request failed/i.test(message)
        || /temperature.{0,100}(?:unknown|unsupported|unrecognized|invalid|not allowed)/i.test(message)
        || /(?:unknown|unsupported|unrecognized|invalid|not allowed).{0,100}temperature/i.test(message);
}
function isOpenAiResponsesSse(response) {
    return /(?:^|;)\s*text\/event-stream(?:\s*;|$)/i.test(String(response?.headers?.get?.("content-type") || ""));
}
function normalizeOpenAiResponsesUrl(value) {
    const base = String(value || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    if (/\/v1\/responses$/i.test(base) || /\/responses$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/responses`;
    return `${base}/v1/responses`;
}
function textContent(value) {
    if (typeof value === "string")
        return value;
    if (!Array.isArray(value))
        return value == null ? "" : JSON.stringify(value);
    return value
        .filter(item => typeof item === "string" || ["text", "input_text", "output_text"].includes(String(item?.type || "")))
        .map(item => typeof item === "string" ? item : String(item?.text || ""))
        .join("\n");
}
function responsesMessageContent(content, role, explicitBreakpoint = false) {
    if (!Array.isArray(content)) {
        const text = String(content ?? "");
        if (!explicitBreakpoint || role === "assistant")
            return text;
        return [{ type: "input_text", text, prompt_cache_breakpoint: { mode: "explicit" } }];
    }
    const parts = content.flatMap((item) => {
        if (typeof item === "string")
            return [{ type: role === "assistant" ? "output_text" : "input_text", text: item }];
        if (!item || typeof item !== "object")
            return [];
        if (["text", "input_text", "output_text"].includes(String(item.type || ""))) {
            return [{ type: role === "assistant" ? "output_text" : "input_text", text: String(item.text || "") }];
        }
        if (item.type === "image_url") {
            const imageUrl = typeof item.image_url === "string" ? item.image_url : item.image_url?.url;
            return imageUrl ? [{ type: "input_image", image_url: imageUrl, ...(item.image_url?.detail ? { detail: item.image_url.detail } : {}) }] : [];
        }
        if (item.type === "input_image" && item.image_url)
            return [item];
        return [];
    });
    if (explicitBreakpoint && role !== "assistant") {
        const lastTextIndex = parts.map((part) => String(part?.type || "")).lastIndexOf("input_text");
        if (lastTextIndex >= 0)
            parts[lastTextIndex] = {
                ...parts[lastTextIndex],
                prompt_cache_breakpoint: { mode: "explicit" },
            };
    }
    return parts.length ? parts : textContent(content);
}
function encodeOpenAiResponsesInput(messages, options = {}) {
    const input = [];
    const breakpoints = new Set((options.breakpointMessageIndexes || []).slice(0, 4).map(value => Math.max(0, Number(value || 0))));
    for (const [messageIndex, message] of (Array.isArray(messages) ? messages : []).entries()) {
        const role = String(message?.role || "user");
        if (role === "tool") {
            input.push({
                type: "function_call_output",
                call_id: String(message.tool_call_id || message.toolCallId || ""),
                output: textContent(message?.content),
            });
            continue;
        }
        const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
        const content = responsesMessageContent(message?.content, role, breakpoints.has(messageIndex));
        const hasContent = typeof content === "string" ? !!content : Array.isArray(content) && content.length > 0;
        if (hasContent || toolCalls.length === 0)
            input.push({ role, content });
        for (const toolCall of toolCalls) {
            input.push({
                type: "function_call",
                call_id: String(toolCall?.id || ""),
                name: String(toolCall?.function?.name || toolCall?.name || ""),
                arguments: typeof toolCall?.function?.arguments === "string"
                    ? toolCall.function.arguments
                    : JSON.stringify(toolCall?.function?.arguments || toolCall?.arguments || {}),
            });
        }
    }
    return input;
}
function buildOpenAiResponsesTools(tools = []) {
    return tools
        .filter(tool => tool?.name && tool.deferred !== true)
        .map(tool => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || { type: "object", properties: {} },
    }));
}
function buildOpenAiResponsesBody(input) {
    const effort = ["low", "medium", "high"].includes(String(input.reasoningEffort || "")) ? String(input.reasoningEffort) : "";
    const tools = buildOpenAiResponsesTools(input.nativeTools || []);
    return {
        model: input.model,
        ...(input.instructions ? { instructions: input.instructions } : {}),
        ...(input.previousResponseId ? { previous_response_id: input.previousResponseId } : {}),
        input: encodeOpenAiResponsesInput(input.messages, { breakpointMessageIndexes: input.breakpointMessageIndexes }),
        ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
        ...(input.stream ? { stream: true } : {}),
        ...(effort ? { reasoning: { effort, ...(input.reasoningSummary === "auto" ? { summary: "auto" } : {}) } } : {}),
        ...(!effort && Number.isFinite(input.temperature) ? { temperature: input.temperature } : {}),
        ...(input.cachePatch || {}),
        ...(tools.length ? { tools, tool_choice: input.nativeToolChoice || "auto" } : {}),
    };
}
function safeProviderHttpDetail(value, limit = 300) {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    if (/<!doctype\s+html|<html\b|<body\b/i.test(raw))
        return "上游网关返回 HTML 错误页";
    try {
        const parsed = JSON.parse(raw);
        const detail = parsed?.error?.message || parsed?.message || parsed?.error || parsed?.code;
        if (detail)
            return String(detail).replace(/[\r\n\t]+/g, " ").slice(0, limit);
    }
    catch { }
    return raw.replace(/[\r\n\t]+/g, " ").slice(0, limit);
}
async function consumeOpenAiResponsesSse(response, onEvent) {
    const body = response?.body;
    if (!body)
        return;
    async function* textChunks() {
        const decoder = new TextDecoder();
        for await (const chunk of body) {
            if (typeof chunk === "string")
                yield chunk;
            else {
                const text = decoder.decode(chunk, { stream: true });
                if (text)
                    yield text;
            }
        }
        const tail = decoder.decode();
        if (tail)
            yield tail;
    }
    await (0, sse_json_parser_1.consumeSseJsonTextChunks)(textChunks(), onEvent);
}
//# sourceMappingURL=openai-responses-transport.js.map