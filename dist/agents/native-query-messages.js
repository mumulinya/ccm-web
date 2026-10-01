"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelVisibleNativeToolResult = modelVisibleNativeToolResult;
exports.dedupeNativeToolResultsForModel = dedupeNativeToolResultsForModel;
exports.nativeQueryFamily = nativeQueryFamily;
exports.appendNativeAssistantTurn = appendNativeAssistantTurn;
exports.appendNativeToolResults = appendNativeToolResults;
exports.insertBeforeDynamicSystemTail = insertBeforeDynamicSystemTail;
exports.appendNativeTurnTranscript = appendNativeTurnTranscript;
exports.nativeTranscriptHasToolResult = nativeTranscriptHasToolResult;
exports.applyCompactedToolResultsToMessages = applyCompactedToolResultsToMessages;
const responses_output_replay_1 = require("../system/responses-output-replay");
const model_tool_attachments_1 = require("./model-tool-attachments");
const group_orchestrator_llm_client_1 = require("../modules/collaboration/group-orchestrator-llm-client");
const tool_result_storage_1 = require("../tools/tool-result-storage");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const completed_tool_result_reuse_1 = require("../system/completed-tool-result-reuse");
/** Remove backend-only audit data before a JSON-protocol result is appended to a model message. */
function modelVisibleNativeToolResult(result) {
    const visible = result.modelOutput !== undefined ? result.modelOutput : result.output;
    return {
        callId: result.callId,
        name: result.name,
        ok: result.ok,
        output: (0, workspace_model_result_projection_1.canonicalModelValue)(visible),
        ...(result.error ? { error: result.error } : {}),
    };
}
function toolResultFingerprint(result) {
    const visible = modelVisibleNativeToolResult(result);
    return (0, completed_tool_result_reuse_1.toolResultFingerprint)({
        name: visible.name,
        ok: visible.ok,
        output: visible.output,
        ...(visible.error ? { error: visible.error } : {}),
        ...(result.modelAttachments?.length ? { attachments: result.modelAttachments } : {}),
    });
}
function parseSerializedToolOutput(value) {
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
/** Collect only complete tool bodies still present in the effective transcript. */
function fullToolResultFingerprints(messages) {
    const found = new Map();
    const names = new Map();
    for (const message of messages) {
        for (const call of message?.tool_calls || []) {
            if (call.id && call.function?.name)
                names.set(String(call.id), String(call.function.name));
        }
        for (const part of Array.isArray(message?.content) ? message.content : []) {
            if (part?.type === 'tool_use' && part.id && part.name)
                names.set(String(part.id), String(part.name));
            if (part?.functionCall?.id && part.functionCall.name)
                names.set(String(part.functionCall.id), String(part.functionCall.name));
        }
    }
    const add = (row) => {
        const visible = row.modelOutput !== undefined ? row.modelOutput : row.output;
        if (!row.callId || (0, completed_tool_result_reuse_1.isToolResultReference)(visible))
            return;
        const fingerprint = toolResultFingerprint(row);
        if (!found.has(fingerprint))
            found.set(fingerprint, String(row.callId));
    };
    for (const message of Array.isArray(messages) ? messages : []) {
        if (String(message?.role || "") === "tool") {
            const output = parseSerializedToolOutput(message.content);
            if (!(0, completed_tool_result_reuse_1.isToolResultReference)(output))
                add({
                    callId: String(message.tool_call_id || ""),
                    name: String(message.name || names.get(String(message.tool_call_id || '')) || "tool"),
                    ok: true,
                    output,
                });
            continue;
        }
        const content = message?.content;
        if (typeof content === "string") {
            const parsed = parseSerializedToolOutput(content);
            for (const row of (Array.isArray(parsed?.toolResults) ? parsed.toolResults : [])) {
                const output = row?.modelOutput !== undefined ? row.modelOutput : row?.output;
                if (!(0, completed_tool_result_reuse_1.isToolResultReference)(output))
                    add({
                        callId: String(row?.callId || ""),
                        name: String(row?.name || "tool"),
                        ok: row?.ok !== false,
                        output,
                        error: row?.error,
                    });
            }
            continue;
        }
        if (!Array.isArray(content))
            continue;
        for (const part of content) {
            if (part?.type === "tool_result") {
                const output = parseSerializedToolOutput(part.content);
                if (!(0, completed_tool_result_reuse_1.isToolResultReference)(output))
                    add({
                        callId: String(part.tool_use_id || ""),
                        name: String(part.name || names.get(String(part.tool_use_id || '')) || "tool"),
                        ok: part.is_error !== true,
                        output: part.is_error === true ? undefined : output,
                        error: part.is_error === true && output && typeof output === "object" ? String(output.error || "tool_failed") : undefined,
                    });
            }
            else if (part?.functionResponse && !(0, completed_tool_result_reuse_1.isToolResultReference)(part.functionResponse.response)) {
                const response = part.functionResponse.response;
                const output = response && typeof response === "object" && Object.keys(response).length === 1 && typeof response.result === "string"
                    ? parseSerializedToolOutput(response.result)
                    : response;
                add({ callId: String(part.functionResponse.id || ""), name: String(part.functionResponse.name || "tool"), ok: true, output });
            }
        }
    }
    return found;
}
/**
 * Keep one full copy of an exactly repeated tool result per model turn while
 * retaining one protocol result for every native call id. Audit receipts and
 * persisted rows are untouched; only the model-visible payload is replaced by
 * a deterministic reference for later duplicates.
 */
function dedupeNativeToolResultsForModel(results, existingMessages = []) {
    const seen = fullToolResultFingerprints(existingMessages);
    return (Array.isArray(results) ? results : []).map(result => {
        const visible = modelVisibleNativeToolResult(result);
        const fingerprint = toolResultFingerprint(result);
        const priorCallId = seen.get(fingerprint);
        if (!priorCallId || priorCallId === String(result.callId || "")) {
            if (!priorCallId)
                seen.set(fingerprint, String(result.callId || ""));
            return result;
        }
        const reference = {
            schema: "ccm-tool-result-reference-v1",
            name: visible.name,
            ok: visible.ok,
            checksum: fingerprint,
            duplicateOfCallId: priorCallId,
        };
        return { ...result, output: reference, modelOutput: reference };
    });
}
function nativeQueryFamily(config) {
    if ((0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config))
        return "anthropic";
    if ((0, group_orchestrator_llm_client_1.shouldUseGemini)(config))
        return "gemini";
    return "openai";
}
function stringifyToolOutput(result) {
    if (result.error || result.ok === false)
        return (0, workspace_model_result_projection_1.stableModelJson)(errorToolOutput(result));
    const visible = result.modelOutput !== undefined ? result.modelOutput : result.output;
    if ((0, tool_result_storage_1.isPersistedToolResult)(visible))
        return (0, tool_result_storage_1.modelVisiblePersistedToolResult)(visible);
    if ((0, tool_result_storage_1.isPersistedToolResult)(visible?.observation))
        return (0, tool_result_storage_1.modelVisiblePersistedToolResult)(visible.observation);
    if (typeof visible === "string")
        return visible;
    return (0, workspace_model_result_projection_1.stableModelJson)(visible ?? { ok: true });
}
function errorToolOutput(result) {
    const visible = result.modelOutput !== undefined ? result.modelOutput : result.output;
    return { ok: false, error: result.error || result.reason || "tool_failed",
        ...(visible !== undefined ? { output: (0, tool_result_storage_1.isPersistedToolResult)(visible) ? (0, tool_result_storage_1.modelVisiblePersistedToolResult)(visible) : (0, workspace_model_result_projection_1.canonicalModelValue)(visible) } : {}) };
}
function openaiAssistantMessage(turn) {
    const toolCalls = (turn.toolCalls || []).map((item) => ({
        id: item.id,
        type: "function",
        function: { name: item.name, arguments: JSON.stringify(item.arguments ?? {}) },
    }));
    return (0, responses_output_replay_1.attachResponsesReplay)({
        role: "assistant",
        content: String(turn.text || "") || (toolCalls.length ? null : ""),
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    }, turn.responsesOutput);
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
                    ? errorToolOutput(result)
                    : ((result.modelOutput ?? result.output) && typeof (result.modelOutput ?? result.output) === "object" && !(0, tool_result_storage_1.isPersistedToolResult)(result.modelOutput ?? result.output) ? (0, workspace_model_result_projection_1.canonicalModelValue)(result.modelOutput ?? result.output) : { result: stringifyToolOutput(result) }),
            },
        })),
    };
}
function appendNativeAssistantTurn(messages, turn, family) {
    const next = messages.slice();
    const message = family === "anthropic" ? anthropicAssistantMessage(turn)
        : family === "gemini" ? geminiAssistantMessage(turn) : openaiAssistantMessage(turn);
    return insertBeforeDynamicSystemTail(next, [message]);
}
function appendNativeToolResults(messages, results, family) {
    if (!results.length)
        return messages;
    const modelResults = dedupeNativeToolResultsForModel(results, messages);
    const additions = family === "anthropic" ? [anthropicToolResultMessage(modelResults)]
        : family === "gemini" ? [geminiToolResultMessage(modelResults)] : openaiToolMessages(modelResults);
    const next = insertBeforeDynamicSystemTail(messages.slice(), additions);
    return (0, model_tool_attachments_1.appendModelToolAttachments)(next, modelResults, family);
}
/**
 * Runtime catalog/session blocks are request metadata. Keep them as one
 * trailing block in the source transcript while conversation/tool events are
 * appended before them. Otherwise the next wire projection has to move the
 * metadata across committed tool history and loses the Provider prefix.
 */
function insertBeforeDynamicSystemTail(messages, additions) {
    const isDynamic = (message) => String(message?.role || '').toLowerCase() === 'system'
        && (String(message?.contextBlockType || message?.context_block_type || '').toLowerCase() === 'dynamic_context'
            || ['tool_catalog', 'tool_catalog_update', 'session', 'scope_instructions', 'skills', 'availability', 'planning_control', 'runtime_context']
                .includes(String(message?.promptPart || message?.prompt_part || '').toLowerCase()));
    let boundary = messages.length;
    while (boundary > 0 && isDynamic(messages[boundary - 1]))
        boundary -= 1;
    return [...messages.slice(0, boundary), ...additions, ...messages.slice(boundary)];
}
function appendNativeTurnTranscript(messages, turn, results, family) {
    const byCallId = new Map();
    for (const result of Array.isArray(results) ? results : []) {
        const callId = String(result?.callId || "").trim();
        if (callId && !byCallId.has(callId))
            byCallId.set(callId, result);
    }
    // Provider-native protocols require an exact one-to-one pairing between
    // assistant function calls and tool results. Never forward an orphan result
    // or omit a result for a call that CCM blocked/deduplicated internally.
    const boundResults = (turn.toolCalls || []).map(call => byCallId.get(String(call.id || "")) || {
        callId: String(call.id || ""),
        name: String(call.name || "tool"),
        ok: false,
        error: "CCM_NATIVE_TOOL_RESULT_MISSING",
        reason: "该工具调用未产生可用结果，已由CCM安全终止。",
    });
    return appendNativeToolResults(appendNativeAssistantTurn(messages, turn, family), boundResults, family);
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
        modelOutput: row?.modelOutput,
        auditReceipt: row?.auditReceipt,
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
                    ? errorToolOutput(result)
                    : ((result.modelOutput ?? result.output) && typeof (result.modelOutput ?? result.output) === "object" && !(0, tool_result_storage_1.isPersistedToolResult)(result.modelOutput ?? result.output) ? (0, workspace_model_result_projection_1.canonicalModelValue)(result.modelOutput ?? result.output) : { result: stringifyToolOutput(result) }),
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