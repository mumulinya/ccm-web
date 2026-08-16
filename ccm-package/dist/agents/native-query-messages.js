"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeQueryFamily = nativeQueryFamily;
exports.appendNativeAssistantTurn = appendNativeAssistantTurn;
exports.appendNativeToolResults = appendNativeToolResults;
exports.appendNativeTurnTranscript = appendNativeTurnTranscript;
exports.nativeTranscriptHasToolResult = nativeTranscriptHasToolResult;
exports.applyCompactedToolResultsToMessages = applyCompactedToolResultsToMessages;
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const tool_result_storage_1 = require("../tools/tool-result-storage");
function nativeQueryFamily(config) {
    if ((0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config))
        return "anthropic";
    if ((0, group_orchestrator_llm_client_1.shouldUseGemini)(config))
        return "gemini";
    return "openai";
}
function stringifyToolOutput(result) {
    if (result.error)
        return JSON.stringify({ ok: false, error: result.error, reason: result.reason || "" });
    if ((0, tool_result_storage_1.isPersistedToolResult)(result.output))
        return (0, tool_result_storage_1.modelVisiblePersistedToolResult)(result.output);
    if ((0, tool_result_storage_1.isPersistedToolResult)(result.output?.observation))
        return (0, tool_result_storage_1.modelVisiblePersistedToolResult)(result.output.observation);
    if (typeof result.output === "string")
        return result.output;
    try {
        return JSON.stringify(result.output ?? { ok: result.ok !== false });
    }
    catch {
        return String(result.output ?? "");
    }
}
function openaiAssistantMessage(turn) {
    const toolCalls = (turn.toolCalls || []).map((item) => ({
        id: item.id,
        type: "function",
        function: { name: item.name, arguments: JSON.stringify(item.arguments ?? {}) },
    }));
    return {
        role: "assistant",
        content: String(turn.text || "") || (toolCalls.length ? null : ""),
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    };
}
function anthropicAssistantMessage(turn) {
    const content = [];
    if (String(turn.text || "").trim())
        content.push({ type: "text", text: String(turn.text) });
    for (const item of turn.toolCalls || []) {
        content.push({ type: "tool_use", id: item.id, name: item.name, input: item.arguments || {} });
    }
    if (!content.length)
        content.push({ type: "text", text: "" });
    return { role: "assistant", content };
}
function geminiAssistantMessage(turn) {
    const parts = [];
    if (String(turn.text || "").trim())
        parts.push({ text: String(turn.text) });
    for (const item of turn.toolCalls || []) {
        parts.push({ functionCall: { id: item.id, name: item.name, args: item.arguments || {} } });
    }
    if (!parts.length)
        parts.push({ text: "" });
    return { role: "assistant", content: parts };
}
function openaiToolMessages(results) {
    return results.map(result => ({
        role: "tool",
        tool_call_id: result.callId,
        name: result.name,
        content: stringifyToolOutput(result),
    }));
}
function anthropicToolResultMessage(results) {
    return {
        role: "user",
        content: results.map(result => ({
            type: "tool_result",
            tool_use_id: result.callId,
            content: stringifyToolOutput(result),
            is_error: result.ok === false,
        })),
    };
}
function geminiToolResultMessage(results) {
    return {
        role: "user",
        content: results.map(result => ({
            functionResponse: {
                name: result.name,
                id: result.callId,
                response: result.ok === false
                    ? { ok: false, error: result.error || result.reason || "tool_failed" }
                    : (result.output && typeof result.output === "object" && !(0, tool_result_storage_1.isPersistedToolResult)(result.output) ? result.output : { result: stringifyToolOutput(result) }),
            },
        })),
    };
}
function appendNativeAssistantTurn(messages, turn, family) {
    const next = messages.slice();
    if (family === "anthropic")
        next.push(anthropicAssistantMessage(turn));
    else if (family === "gemini")
        next.push(geminiAssistantMessage(turn));
    else
        next.push(openaiAssistantMessage(turn));
    return next;
}
function appendNativeToolResults(messages, results, family) {
    if (!results.length)
        return messages;
    const next = messages.slice();
    if (family === "anthropic")
        next.push(anthropicToolResultMessage(results));
    else if (family === "gemini")
        next.push(geminiToolResultMessage(results));
    else
        next.push(...openaiToolMessages(results));
    return next;
}
function appendNativeTurnTranscript(messages, turn, results, family) {
    return appendNativeToolResults(appendNativeAssistantTurn(messages, turn, family), results, family);
}
function nativeTranscriptHasToolResult(messages) {
    return messages.some(message => {
        if (String(message?.role || "") === "tool")
            return true;
        const content = message?.content;
        if (!Array.isArray(content))
            return false;
        return content.some((part) => part?.type === "tool_result" || part?.functionResponse);
    });
}
function nativeResultFromCompactRow(row) {
    const callId = String(row?.callId || row?.toolCallId || row?.tool_call_id || "").trim();
    if (!callId)
        return null;
    return {
        callId,
        name: String(row?.name || row?.toolName || "tool"),
        ok: row?.ok !== false,
        output: row?.output,
        error: row?.error,
        reason: row?.reason,
    };
}
function replaceToolResultPart(part, byId) {
    if (part?.type === "tool_result") {
        const result = byId.get(String(part.tool_use_id || ""));
        if (!result)
            return part;
        return { ...part, content: stringifyToolOutput(result), is_error: result.ok === false };
    }
    if (part?.functionResponse) {
        const result = byId.get(String(part.functionResponse.id || ""));
        if (!result)
            return part;
        return {
            ...part,
            functionResponse: {
                ...part.functionResponse,
                response: result.ok === false
                    ? { ok: false, error: result.error || result.reason || "tool_failed" }
                    : (result.output && typeof result.output === "object" && !(0, tool_result_storage_1.isPersistedToolResult)(result.output) ? result.output : { result: stringifyToolOutput(result) }),
            },
        };
    }
    return part;
}
function applyCompactedToolResultsToMessages(messages, results) {
    const byId = new Map();
    for (const row of Array.isArray(results) ? results : []) {
        const mapped = nativeResultFromCompactRow(row);
        if (mapped)
            byId.set(mapped.callId, mapped);
    }
    if (!byId.size)
        return messages;
    return (Array.isArray(messages) ? messages : []).map(message => {
        const role = String(message?.role || "");
        if (role === "tool") {
            const result = byId.get(String(message.tool_call_id || ""));
            if (!result)
                return message;
            return { ...message, content: stringifyToolOutput(result) };
        }
        if (!Array.isArray(message?.content))
            return message;
        let changed = false;
        const content = message.content.map((part) => {
            const next = replaceToolResultPart(part, byId);
            if (next !== part)
                changed = true;
            return next;
        });
        return changed ? { ...message, content } : message;
    });
}
//# sourceMappingURL=native-query-messages.js.map