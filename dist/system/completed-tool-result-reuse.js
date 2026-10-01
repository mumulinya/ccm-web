"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolResultFingerprint = toolResultFingerprint;
exports.isToolResultReference = isToolResultReference;
exports.isConversationUserMessage = isConversationUserMessage;
exports.hasToolResult = hasToolResult;
exports.completedToolResultReferences = completedToolResultReferences;
exports.completedToolResultAnchors = completedToolResultAnchors;
const crypto_1 = require("crypto");
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
function toolResultFingerprint(value) {
    return (0, crypto_1.createHash)('sha256').update((0, workspace_model_result_projection_1.stableModelJson)({
        name: value.name, ok: value.ok, output: value.output,
        ...(value.error ? { error: value.error } : {}),
    })).digest('hex').slice(0, 32);
}
function isToolResultReference(value) {
    return !!value && typeof value === 'object' && value.schema === 'ccm-tool-result-reference-v1';
}
function parsed(value) {
    if (typeof value !== 'string')
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
function resultParts(message) {
    if (['tool', 'function'].includes(message?.role))
        return [{
                callId: String(message.tool_call_id || message.toolCallId || ''),
                output: parsed(message.content), ok: true,
            }];
    if (Array.isArray(message?.content))
        return message.content.flatMap((part) => {
            if (part?.type === 'tool_result')
                return [{ callId: String(part.tool_use_id || ''), output: parsed(part.content), ok: !part.is_error }];
            if (part?.functionResponse) {
                const response = part.functionResponse.response;
                return [{ callId: String(part.functionResponse.id || ''), output: parsed(response?.result ?? response), ok: response?.ok !== false }];
            }
            return [];
        });
    const content = parsed(message?.content);
    return Array.isArray(content?.toolResults) ? content.toolResults.map((row) => ({
        callId: String(row.callId || ''), output: row.modelOutput ?? row.output, ok: row.ok !== false,
    })) : [];
}
function isConversationUserMessage(message) {
    // Runtime context, summaries and other metadata are encoded as `role=user`
    // for provider compatibility, but they are not conversation turns.  Treating
    // the synthetic runtime tail as the current user message makes every active
    // tool result before it look like a committed/rolling prefix and inflates the
    // local cache candidate (the provider never reported those tokens as read).
    // Keep the test structural so ordinary user text that happens to match a
    // runtime label is not filtered by content.
    if (message?.role !== 'user' || message?.isMeta === true)
        return false;
    const contextType = String(message?.contextBlockType || message?.context_block_type || '').trim().toLowerCase();
    const promptPart = String(message?.promptPart || message?.prompt_part || '').trim().toLowerCase();
    if (contextType === 'runtime_context' || promptPart === 'runtime_context')
        return false;
    return resultParts(message).length === 0;
}
function hasToolResult(message) {
    return resultParts(message).length > 0;
}
/** Lossless references to identical earlier evidence; active results stay intact. */
function completedToolResultReferences(messages, beforeIndex) {
    const calls = new Map();
    const names = new Map();
    const first = new Map();
    const duplicates = new Map();
    if (beforeIndex < 0)
        return duplicates;
    messages.slice(0, beforeIndex).forEach((message, index) => {
        for (const call of message?.tool_calls || []) {
            let args = call.function?.arguments;
            try {
                if (typeof args === 'string')
                    args = JSON.parse(args);
            }
            catch { }
            if (call.id && call.function?.name)
                calls.set(String(call.id), (0, workspace_model_result_projection_1.stableModelJson)({ name: call.function.name, args }));
            if (call.id && call.function?.name)
                names.set(String(call.id), call.function.name);
        }
        if (!['tool', 'function'].includes(message?.role) || typeof message.content !== 'string')
            return;
        const callId = String(message.tool_call_id || message.toolCallId || '');
        if (!callId || message.content.length < 512)
            return;
        const output = parsed(message.content);
        if (isToolResultReference(output))
            return;
        const signature = calls.get(callId) || `call:${callId}`;
        const key = (0, crypto_1.createHash)('sha256').update(signature).update('\0').update(message.content).digest('hex');
        const original = first.get(key);
        if (original)
            duplicates.set(index, original);
        else {
            const name = String(message.name || names.get(callId) || 'tool');
            first.set(key, { index, callId, name, checksum: toolResultFingerprint({ name, ok: true, output }) });
        }
    });
    return duplicates;
}
function completedToolResultAnchors(messages, beforeIndex) {
    const anchors = new Set([...completedToolResultReferences(messages, beforeIndex).values()].map(row => row.index));
    const rows = messages.flatMap((message, index) => resultParts(message).map((part) => ({ ...part, index })));
    for (const row of rows) {
        const reference = row.output;
        if (!isToolResultReference(reference))
            continue;
        anchors.add(row.index);
        const original = rows.find(candidate => candidate.index < row.index
            && candidate.callId === reference.duplicateOfCallId && !isToolResultReference(candidate.output)
            && toolResultFingerprint({ name: reference.name, ok: candidate.ok, output: candidate.output }) === reference.checksum);
        if (original)
            anchors.add(original.index);
    }
    return anchors;
}
//# sourceMappingURL=completed-tool-result-reuse.js.map