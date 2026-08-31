"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyProtocolBlockCacheControl = applyProtocolBlockCacheControl;
exports.runProviderCacheBreakpointEncodingSelfTest = runProviderCacheBreakpointEncodingSelfTest;
function cloneBlocks(content) {
    if (Array.isArray(content))
        return content.map(block => block && typeof block === "object" ? { ...block } : { type: "text", text: String(block || "") });
    return [{ type: "text", text: String(content || "") }];
}
function toolUseIds(blocks) {
    return blocks.filter(block => String(block?.type || "") === "tool_use").map(block => String(block?.id || "")).filter(Boolean);
}
function toolResultIds(blocks) {
    return blocks.filter(block => String(block?.type || "") === "tool_result").map(block => String(block?.tool_use_id || "")).filter(Boolean);
}
function markLastBlock(blocksInput, ttl) {
    const blocks = blocksInput.length ? blocksInput : [{ type: "text", text: "" }];
    const index = blocks.length - 1;
    const block = blocks[index] && typeof blocks[index] === "object" ? blocks[index] : { type: "text", text: String(blocks[index] || "") };
    const cacheControl = ttl === "1h" ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" };
    return blocks.map((value, blockIndex) => blockIndex === index ? { ...block, cache_control: block.cache_control || cacheControl } : value);
}
function applyProtocolBlockCacheControl(bodyInput, strategy) {
    if (strategy?.capabilityMatrix?.protocol !== "anthropic_messages" || strategy?.execution?.breakpointMode === "none") {
        return { body: bodyInput, applied: false, breakpointCount: 0, reason: "block_cache_control_not_enabled" };
    }
    const ttl = String(strategy?.execution?.ttl || "provider_default");
    const systemBlocks = cloneBlocks(bodyInput?.system);
    const messages = (Array.isArray(bodyInput?.messages) ? bodyInput.messages : []).map((message) => ({
        ...message,
        content: cloneBlocks(message?.content),
    }));
    const lastUserIndex = (() => {
        for (let index = messages.length - 1; index >= 0; index -= 1)
            if (String(messages[index]?.role || "") === "user")
                return index;
        return messages.length;
    })();
    const pending = new Set();
    let rollingIndex = -1;
    for (let index = 0; index < lastUserIndex; index += 1) {
        const blocks = messages[index].content;
        for (const id of toolUseIds(blocks))
            pending.add(id);
        for (const id of toolResultIds(blocks))
            pending.delete(id);
        if (pending.size === 0 && String(messages[index]?.role || "") === "assistant")
            rollingIndex = index;
    }
    const nextSystem = markLastBlock(systemBlocks, ttl);
    let breakpointCount = 1;
    if (rollingIndex >= 0) {
        messages[rollingIndex] = { ...messages[rollingIndex], content: markLastBlock(messages[rollingIndex].content, ttl) };
        breakpointCount += 1;
    }
    return {
        body: { ...bodyInput, system: nextSystem, messages },
        applied: true,
        breakpointCount,
        reason: rollingIndex >= 0 ? "static_and_rolling_boundaries_applied" : "static_boundary_applied",
    };
}
function runProviderCacheBreakpointEncodingSelfTest() {
    const strategy = {
        capabilityMatrix: { protocol: "anthropic_messages" },
        execution: { breakpointMode: "static_and_rolling", ttl: "1h" },
    };
    const applied = applyProtocolBlockCacheControl({
        system: "stable",
        messages: [
            { role: "user", content: "old" },
            { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "read" }] },
            { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] },
            { role: "assistant", content: "done" },
            { role: "user", content: "current" },
        ],
    }, strategy);
    const incomplete = applyProtocolBlockCacheControl({
        system: "stable",
        messages: [
            { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "read" }] },
            { role: "user", content: "current" },
        ],
    }, strategy);
    const checks = {
        staticAndRollingApplied: applied.breakpointCount === 2,
        systemBoundaryHasOneHourTtl: applied.body.system.at(-1)?.cache_control?.ttl === "1h",
        completedAssistantGetsRollingBoundary: applied.body.messages[3].content.at(-1)?.cache_control?.type === "ephemeral",
        unfinishedToolBatchDoesNotGetRollingBoundary: incomplete.breakpointCount === 1,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=provider-cache-breakpoint-encoding.js.map