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
exports.buildResponsesContinuationFingerprint = buildResponsesContinuationFingerprint;
exports.responsesInputItemChecksums = responsesInputItemChecksums;
exports.prepareResponsesContinuationRequest = prepareResponsesContinuationRequest;
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
const responses_output_replay_1 = require("./responses-output-replay");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const provider_native_tools_1 = require("./provider-native-tools");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const sse_json_parser_1 = require("./sse-json-parser");
const provider_cache_protocol_1 = require("./provider-cache-protocol");
const runtime_paths_1 = require("../core/runtime-paths");
const responsesWithoutMaxOutputTokens = new Set();
const responsesWithoutTemperature = new Set();
const responsesSessionState = new Map();
const RESPONSES_SESSION_STATE_FILE = path.join(runtime_paths_1.CCM_DIR, "provider-context-cache", "responses-sessions.json");
// Existing state created before CCM_DIR was introduced remains readable, but
// writes always go to the active runtime home. This also keeps explicit test
// homes isolated from the user's default ~/.ccm store.
const LEGACY_RESPONSES_SESSION_STATE_FILE = path.join(runtime_paths_1.DEFAULT_CCM_DIR, "provider-context-cache", "responses-sessions.json");
function loadResponsesSessionState() {
    const files = [RESPONSES_SESSION_STATE_FILE];
    if (LEGACY_RESPONSES_SESSION_STATE_FILE !== RESPONSES_SESSION_STATE_FILE)
        files.push(LEGACY_RESPONSES_SESSION_STATE_FILE);
    for (const file of files) {
        try {
            const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                continue;
            for (const [key, value] of Object.entries(parsed)) {
                const state = value;
                if (!key || !state || typeof state !== "object" || !String(state.responseId || ""))
                    continue;
                responsesSessionState.set(key, {
                    responseId: String(state.responseId),
                    boundaryGeneration: Math.max(0, Number(state.boundaryGeneration || 0)),
                    updatedAt: Math.max(0, Number(state.updatedAt || 0)),
                    inputItemChecksums: Array.isArray(state.inputItemChecksums) ? state.inputItemChecksums.slice(-2048).map(String) : [],
                    outputItemChecksums: Array.isArray(state.outputItemChecksums) ? state.outputItemChecksums.slice(-256).map(String) : [],
                    continuationFingerprint: String(state.continuationFingerprint || ""),
                });
            }
            // An existing active store is authoritative, including an empty store
            // after forgetResponsesPreviousId. Never resurrect deleted legacy keys.
            return;
        }
        catch { /* missing or corrupt state is equivalent to a cold continuation */ }
    }
}
function persistResponsesSessionState() {
    try {
        fs.mkdirSync(path.dirname(RESPONSES_SESSION_STATE_FILE), { recursive: true });
        const rows = {};
        for (const [key, state] of responsesSessionState.entries())
            rows[key] = state;
        fs.writeFileSync(RESPONSES_SESSION_STATE_FILE, `${JSON.stringify(rows)}\n`, "utf8");
    }
    catch { /* persistence is best effort; prompt cache identity remains authoritative */ }
}
loadResponsesSessionState();
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
function continuationAllowed(endpoint, config, cache) {
    if (["0", "false", "off", "disabled", "no"].includes(String(process.env.CCM_RESPONSES_CONTINUATION || "").trim().toLowerCase()))
        return false;
    // Provider conversation continuation is an explicit transport optimization,
    // not the prompt-cache path.  Keep it disabled for normal requests even on
    // the first-party endpoint so every request remains a full append-only
    // transcript.  The isolated capability probe is the only implicit opt-in.
    return config?.providerCacheUseResponsesContinuation === true
        || cache?.responsesContinuationProbeInProgress === true
        || cache?.responsesContinuationConfirmed === true;
}
function buildResponsesContinuationFingerprint(input = {}) {
    return digest({
        instructions: input.instructions || "",
        tools: input.tools || [],
        cacheKey: input.cacheKey || "",
        reasoning: input.reasoning || "",
        model: input.model || "",
    });
}
function inputItemChecksums(inputItems) {
    return (Array.isArray(inputItems) ? inputItems : []).map(item => digest(item));
}
/**
 * A Responses continuation already contains the previous assistant output on
 * the provider side.  Re-sending assistant messages/function calls in the
 * delta both wastes input tokens and can make a relay reject the request as a
 * forked transcript.  User items and function_call_output remain additive.
 */
function continuationDeltaItems(inputItems) {
    return (Array.isArray(inputItems) ? inputItems : []).filter(item => {
        const type = String(item?.type || "").toLowerCase();
        const role = String(item?.role || "").toLowerCase();
        if (type === "function_call")
            return false;
        if (role === "assistant")
            return false;
        return true;
    });
}
function responsesInputItemChecksums(inputItems) {
    return inputItemChecksums(inputItems);
}
function prepareResponsesContinuationRequest(endpoint, cache, config, input) {
    const inputItems = Array.isArray(input?.inputItems) ? input.inputItems : [];
    const checksums = inputItemChecksums(inputItems);
    const fingerprint = buildResponsesContinuationFingerprint(input);
    const key = responsesSessionStateKey(cache, {
        endpoint,
        model: config?.model,
        proxy: config?.proxyUrl || config?.proxy_url || config?.proxyEndpoint || config?.proxy_endpoint || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy,
        credential: config?.apiKey || config?.api_key,
    });
    const state = key ? responsesSessionState.get(key) : undefined;
    if (!continuationAllowed(endpoint, config, cache))
        return { previousResponseId: "", inputItems, mode: "full", reason: "provider_not_confirmed" };
    const boundaryGeneration = Math.max(0, Number(cache?.boundaryGeneration || 0));
    if (!state || !state.responseId) {
        if (key)
            responsesSessionState.delete(key);
        return { previousResponseId: "", inputItems, mode: "full", reason: "no_previous_response" };
    }
    if (state.boundaryGeneration !== boundaryGeneration) {
        if (key)
            responsesSessionState.delete(key);
        return { previousResponseId: "", inputItems, mode: "full", reason: "compaction_boundary_changed" };
    }
    if (state.continuationFingerprint && state.continuationFingerprint !== fingerprint) {
        if (key)
            responsesSessionState.delete(key);
        return { previousResponseId: "", inputItems, mode: "full", reason: "continuation_fingerprint_changed" };
    }
    const prior = state.inputItemChecksums || [];
    const appendOnly = checksums.length >= prior.length && prior.every((value, index) => value === checksums[index]);
    if (!appendOnly) {
        if (cache?.responsesContinuationProbeInProgress === true) {
            return {
                previousResponseId: state.responseId,
                inputItems: inputItems.length ? [inputItems[inputItems.length - 1]] : [],
                mode: "incremental",
                reason: "probe_previous_response_id",
            };
        }
        if (key)
            responsesSessionState.delete(key);
        return { previousResponseId: "", inputItems, mode: "full", reason: "transcript_not_append_only" };
    }
    return {
        previousResponseId: state.responseId,
        inputItems: continuationDeltaItems(inputItems.slice(prior.length)),
        mode: "incremental",
        reason: "append_only_transcript",
    };
}
/**
 * Responses conversation state is used for first-party endpoints and for
 * proxied endpoints only after an isolated capability probe confirms it.
 * The local execution ledger remains authoritative; this state only decides
 * whether the provider request can be reduced to an append-only input suffix.
 */
function getReusableResponsesPreviousId(endpoint, cache, config) {
    if (!continuationAllowed(endpoint, config, cache))
        return "";
    const key = responsesSessionStateKey(cache, {
        endpoint,
        model: config?.model,
        proxy: config?.proxyUrl || config?.proxy_url || config?.proxyEndpoint || config?.proxy_endpoint || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy,
        credential: config?.apiKey || config?.api_key,
    });
    const state = key ? responsesSessionState.get(key) : undefined;
    if (!state) {
        if (key)
            responsesSessionState.delete(key);
        return "";
    }
    const boundaryGeneration = Math.max(0, Number(cache?.boundaryGeneration || 0));
    return state.boundaryGeneration === boundaryGeneration ? state.responseId : "";
}
function rememberResponsesResponseId(endpoint, cache, responseId, config, metadata = {}) {
    if (!continuationAllowed(endpoint, config, cache))
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
    const inputChecksums = Array.isArray(metadata.inputItemChecksums) ? metadata.inputItemChecksums.slice(-2048) : [];
    const toolCallChecksums = (Array.isArray(metadata.providerToolCalls) ? metadata.providerToolCalls : [])
        .map((call) => digest({
        type: "function_call",
        call_id: String(call?.id || ""),
        name: String(call?.name || ""),
        arguments: JSON.stringify(call?.arguments || {}),
    }));
    const assistantText = String(metadata.providerAssistantText || "");
    const assistantChecksums = assistantText.trim()
        ? [digest({ role: "assistant", content: assistantText })]
        : [];
    responsesSessionState.set(key, {
        responseId: id,
        boundaryGeneration: Math.max(0, Number(cache?.boundaryGeneration || 0)),
        updatedAt: Date.now(),
        // Only request input items participate in the append-only comparison.
        // Provider output is tracked separately so assistant text/tool calls can
        // never make the next request look like a rewritten transcript.
        inputItemChecksums: inputChecksums.slice(-2048),
        outputItemChecksums: [...assistantChecksums, ...toolCallChecksums].slice(-256),
        continuationFingerprint: String(metadata.continuationFingerprint || ""),
    });
    persistResponsesSessionState();
    if (responsesSessionState.size > 512) {
        const oldest = [...responsesSessionState.entries()].sort((left, right) => left[1].updatedAt - right[1].updatedAt)[0]?.[0];
        if (oldest)
            responsesSessionState.delete(oldest);
        persistResponsesSessionState();
    }
}
function forgetResponsesPreviousId(cache, endpoint, config) {
    if (!endpoint) {
        const prefix = cache && String(cache.scope || "") && String(cache.scopeId || "") && String(cache.sessionId || "")
            ? `${String(cache.scope)}\0${String(cache.scopeId)}\0${String(cache.sessionId)}\0`
            : "";
        if (prefix) {
            for (const key of responsesSessionState.keys())
                if (key.startsWith(prefix))
                    responsesSessionState.delete(key);
            persistResponsesSessionState();
        }
        return;
    }
    const key = responsesSessionStateKey(cache, {
        endpoint,
        model: config?.model,
        proxy: config?.proxyUrl || config?.proxy_url || config?.proxyEndpoint || config?.proxy_endpoint || config?.httpsProxy || config?.https_proxy || config?.httpProxy || config?.http_proxy,
        credential: config?.apiKey || config?.api_key,
    });
    if (key) {
        responsesSessionState.delete(key);
        persistResponsesSessionState();
    }
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
        // Keep user/system text in the same wire shape whether a breakpoint is
        // present or not. Previously a marked message was encoded as an
        // `input_text` array while the same message without the marker was a raw
        // string. As rolling breakpoints moved, that changed the bytes of the
        // already-committed prefix and reduced the Provider hit to its baseline
        // fragment. Assistant output remains a string for backwards-compatible
        // Responses replay semantics.
        if (role === "assistant")
            return text;
        return [{
                type: "input_text",
                text,
                ...(explicitBreakpoint ? { prompt_cache_breakpoint: { mode: "explicit" } } : {}),
            }];
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
        const replay = (0, responses_output_replay_1.replayResponsesMessage)(message, options.replayIdentity);
        if (replay) {
            input.push(...replay);
            continue;
        }
        const role = String(message?.role || "user");
        if (role === "tool") {
            input.push({
                type: "function_call_output",
                call_id: String(message.tool_call_id || message.toolCallId || ""),
                output: textContent(message?.content),
                // Relays that explicitly confirmed Responses breakpoints can place a
                // boundary on the completed function output. This preserves the
                // entire finished tool batch for the next request; never emit it on
                // the unverified/implicit path because older endpoints reject the
                // optional field.
                ...(breakpoints.has(messageIndex) ? { prompt_cache_breakpoint: { mode: "explicit" } } : {}),
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
                    : (0, workspace_model_result_projection_1.stableModelJson)(toolCall?.function?.arguments || toolCall?.arguments || {}),
            });
        }
    }
    return input;
}
function buildOpenAiResponsesTools(tools = []) {
    return (0, provider_native_tools_1.orderedProviderTools)(tools)
        .filter(tool => tool?.name && tool.deferred !== true)
        .map(tool => (0, workspace_model_result_projection_1.canonicalModelValue)({
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
        input: Array.isArray(input.inputItems)
            ? input.inputItems
            : encodeOpenAiResponsesInput(input.messages, { breakpointMessageIndexes: input.breakpointMessageIndexes, replayIdentity: input.replayIdentity }),
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