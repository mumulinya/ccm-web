"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishContextUsageDelta = publishContextUsageDelta;
exports.publishContextUsageFromPayload = publishContextUsageFromPayload;
exports.resetContextUsageEventSequencesForTest = resetContextUsageEventSequencesForTest;
const runtime_events_1 = require("./runtime-events");
const counters = new Map();
function safeInt(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function identityKey(scope, scopeId, sessionId) {
    return `${scope}\u0000${scopeId}\u0000${sessionId}`;
}
function nextSequence(key) {
    const value = (counters.get(key) || 0) + 1;
    counters.set(key, value);
    return value;
}
function compactBreakdown(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const aliases = {
        systemPrompt: "system", system: "system", systemTools: "tools", toolDefinitions: "tools",
        mcpAndDynamicTools: "mcpTools", memoryAndLoadedContext: "memory", summarizedConversation: "summary",
        recentMessages: "conversation", currentRequest: "currentRequest",
    };
    const output = {};
    for (const [key, raw] of Object.entries(value)) {
        const target = aliases[key] || key;
        const n = safeInt(raw);
        if (n > 0)
            output[target] = (output[target] || 0) + n;
    }
    return Object.keys(output).length ? output : undefined;
}
function publishContextUsageDelta(input) {
    const scopeId = String(input.scopeId || "");
    const exactSessionId = String(input.exactSessionId || "");
    if (!scopeId || !exactSessionId)
        return null;
    const key = identityKey(input.scope, scopeId, exactSessionId);
    const event = {
        schema: "ccm-context-usage-delta-v1",
        scope: input.scope,
        scopeId,
        exactSessionId,
        ...(input.requestId ? { requestId: String(input.requestId) } : {}),
        sequence: nextSequence(key),
        currentTokens: safeInt(input.currentTokens),
        predictedNextRequestTokens: safeInt(input.predictedNextRequestTokens ?? input.currentTokens),
        contextWindow: safeInt(input.contextWindow),
        autoCompactThreshold: safeInt(input.autoCompactThreshold),
        tokenSource: input.tokenSource,
        ...(compactBreakdown(input.tokenBreakdown) ? { tokenBreakdown: compactBreakdown(input.tokenBreakdown) } : {}),
        reason: input.reason,
        contentStored: false,
    };
    return (0, runtime_events_1.publishRuntimeEvent)(input.scope, "context.usage.delta", event);
}
function publishContextUsageFromPayload(input) {
    const payload = input.payload;
    if (!payload)
        return null;
    return publishContextUsageDelta({
        ...input,
        currentTokens: safeInt(payload.totalTokens),
        predictedNextRequestTokens: safeInt(payload.predictedNextRequestTokens || payload.totalTokens),
        tokenSource: input.tokenSource || "canonical_payload_estimate",
        tokenBreakdown: payload.tokenBreakdown || payload.primaryTokenBreakdown,
    });
}
function resetContextUsageEventSequencesForTest() { counters.clear(); }
//# sourceMappingURL=context-usage-events.js.map