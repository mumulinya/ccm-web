"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_MEMORY_MAX_KEEP_TOKENS = exports.SESSION_MEMORY_MIN_TEXT_MESSAGES = exports.SESSION_MEMORY_MIN_KEEP_TOKENS = void 0;
exports.adjustSessionWindowForApiInvariants = adjustSessionWindowForApiInvariants;
exports.buildCompleteConversationRounds = buildCompleteConversationRounds;
exports.peelOldestCompleteConversationRound = peelOldestCompleteConversationRound;
exports.calculateSessionMemoryKeepWindow = calculateSessionMemoryKeepWindow;
const context_budget_1 = require("./context-budget");
exports.SESSION_MEMORY_MIN_KEEP_TOKENS = 10_000;
exports.SESSION_MEMORY_MIN_TEXT_MESSAGES = 5;
exports.SESSION_MEMORY_MAX_KEEP_TOKENS = 40_000;
function messageId(message) {
    return String(message?.uuid || message?.id || message?.messageId || "");
}
function messageText(message) {
    if (typeof message === "string")
        return message;
    if (typeof message?.content === "string")
        return message.content;
    return message?.content == null ? "" : JSON.stringify(message.content);
}
function messageRole(message) {
    return String(message?.role || message?.type || "").toLowerCase();
}
function assistantResponseId(message) {
    if (messageRole(message) !== "assistant")
        return "";
    return String(message?.message?.id || message?.responseId || message?.response_id || message?.assistantResponseId || "");
}
function contentBlocks(message) {
    const content = message?.content ?? message?.message?.content;
    return Array.isArray(content) ? content : [];
}
function toolResultIds(message) {
    const ids = contentBlocks(message)
        .filter((block) => ["tool_result", "web_search_tool_result"].includes(String(block?.type || "")))
        .map((block) => String(block?.tool_use_id || block?.toolUseId || block?.id || ""));
    for (const result of Array.isArray(message?.tool_results || message?.toolResults) ? (message.tool_results || message.toolResults) : []) {
        ids.push(String(result?.tool_use_id || result?.toolUseId || result?.id || ""));
    }
    return ids.filter(Boolean);
}
function toolUseIds(message) {
    const ids = contentBlocks(message)
        .filter((block) => ["tool_use", "server_tool_use", "tool_call", "function_call"].includes(String(block?.type || "")))
        .map((block) => String(block?.id || block?.tool_use_id || block?.toolUseId || ""));
    for (const call of Array.isArray(message?.tool_calls) ? message.tool_calls : [])
        ids.push(String(call?.id || call?.tool_use_id || ""));
    return ids.filter(Boolean);
}
function adjustToConversationTurnStart(messages, startIndex, floorIndex) {
    if (startIndex >= messages.length || messageRole(messages[startIndex]) === "user")
        return startIndex;
    let adjustedIndex = startIndex;
    while (adjustedIndex > floorIndex) {
        adjustedIndex -= 1;
        if (messageRole(messages[adjustedIndex]) === "user")
            return adjustedIndex;
    }
    return adjustedIndex;
}
function adjustSessionWindowForApiInvariants(messages, startIndex, floorIndex = 0) {
    if (startIndex <= floorIndex || startIndex >= messages.length)
        return Math.max(floorIndex, startIndex);
    let adjusted = startIndex;
    for (;;) {
        const before = adjusted;
        const results = new Set(messages.slice(adjusted).flatMap(toolResultIds));
        const presentUses = new Set(messages.slice(adjusted).flatMap(toolUseIds));
        for (const id of presentUses)
            results.delete(id);
        for (let index = adjusted - 1; index >= floorIndex && results.size; index -= 1) {
            const uses = toolUseIds(messages[index]);
            if (uses.some(id => results.has(id))) {
                adjusted = index;
                for (const id of uses)
                    results.delete(id);
            }
        }
        const responseIds = new Set(messages.slice(adjusted).map(assistantResponseId).filter(Boolean));
        for (let index = adjusted - 1; index >= floorIndex; index -= 1) {
            const id = assistantResponseId(messages[index]);
            if (id && responseIds.has(id))
                adjusted = index;
        }
        adjusted = adjustToConversationTurnStart(messages, adjusted, floorIndex);
        if (adjusted === before || adjusted <= floorIndex)
            return adjusted;
    }
}
function buildCompleteConversationRounds(messagesInput) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const rounds = [];
    for (const message of messages) {
        if (!rounds.length || messageRole(message) === "user")
            rounds.push([]);
        rounds.at(-1).push(message);
    }
    return rounds.filter(round => round.length > 0);
}
function peelOldestCompleteConversationRound(messagesInput) {
    const rounds = buildCompleteConversationRounds(messagesInput);
    if (rounds.length <= 1)
        return { peeled: false, messages: Array.isArray(messagesInput) ? [...messagesInput] : [], removed: [] };
    const removed = rounds.shift() || [];
    return { peeled: true, messages: rounds.flat(), removed };
}
function calculateSessionMemoryKeepWindow(messages, options = {}) {
    const rows = Array.isArray(messages) ? messages : [];
    const floorIndex = Math.max(0, Math.min(rows.length, Math.floor(Number(options.floorIndex || 0))));
    const minTokens = Math.max(1, Math.floor(Number(options.minTokens || exports.SESSION_MEMORY_MIN_KEEP_TOKENS)));
    const minTextMessages = Math.max(1, Math.floor(Number(options.minTextMessages || exports.SESSION_MEMORY_MIN_TEXT_MESSAGES)));
    const maxTokens = Math.max(minTokens, Math.floor(Number(options.maxTokens || exports.SESSION_MEMORY_MAX_KEEP_TOKENS)));
    const estimate = options.estimateMessageTokens || ((message) => (0, context_budget_1.estimateTextTokens)(messageText(message)));
    const requestedCursor = String(options.lastSummarizedMessageId || "");
    const cursorIndex = requestedCursor ? rows.findIndex(message => messageId(message) === requestedCursor) : -1;
    let startIndex = cursorIndex >= floorIndex ? cursorIndex + 1 : rows.length;
    let tokenCount = 0;
    let textMessageCount = 0;
    for (let index = startIndex; index < rows.length; index += 1) {
        tokenCount += Math.max(0, Number(estimate(rows[index])) || 0);
        if (messageText(rows[index]).trim())
            textMessageCount += 1;
    }
    for (let index = startIndex - 1; index >= floorIndex && tokenCount < maxTokens && (tokenCount < minTokens || textMessageCount < minTextMessages); index -= 1) {
        tokenCount += Math.max(0, Number(estimate(rows[index])) || 0);
        if (messageText(rows[index]).trim())
            textMessageCount += 1;
        startIndex = index;
    }
    const tokenSelectedStartIndex = startIndex;
    startIndex = adjustSessionWindowForApiInvariants(rows, startIndex, floorIndex);
    if (startIndex !== tokenSelectedStartIndex) {
        tokenCount = 0;
        textMessageCount = 0;
        for (let index = startIndex; index < rows.length; index += 1) {
            tokenCount += Math.max(0, Number(estimate(rows[index])) || 0);
            if (messageText(rows[index]).trim())
                textMessageCount += 1;
        }
    }
    return {
        schema: "ccm-session-memory-dynamic-window-v1",
        strategy: "cc_session_memory_token_window",
        startIndex,
        floorIndex,
        preservedMessageCount: Math.max(0, rows.length - startIndex),
        preservedTextMessageCount: textMessageCount,
        preservedTokenCount: tokenCount,
        minTokens,
        minTextMessages,
        maxTokens,
        lastSummarizedMessageId: requestedCursor,
        lastSummarizedMessageIndex: cursorIndex,
        cursorValid: !requestedCursor || cursorIndex >= floorIndex,
        tokenSelectedStartIndex,
        expandedForConversationTurn: startIndex < tokenSelectedStartIndex,
        maxExceededForAtomicBoundary: tokenCount > maxTokens,
        minimumSatisfied: tokenCount >= minTokens && textMessageCount >= minTextMessages,
    };
}
//# sourceMappingURL=session-memory-window.js.map