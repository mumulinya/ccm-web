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
exports.detectDynamicPrefixLeak = detectDynamicPrefixLeak;
exports.buildCcmCachePromptSegmentsV1 = buildCcmCachePromptSegmentsV1;
exports.runProviderCachePromptSegmentsSelfTest = runProviderCachePromptSegmentsSelfTest;
const crypto = __importStar(require("crypto"));
const workspace_model_result_projection_1 = require("../tools/workspace-model-result-projection");
const completed_tool_result_reuse_1 = require("./completed-tool-result-reuse");
function detectDynamicPrefixLeak(value) {
    const textValue = typeof value === 'string' ? value : (0, workspace_model_result_projection_1.stableModelJson)(value);
    return /(request[_-]?id|trace[_-]?id|started[_-]?at|updated[_-]?at|duration[_-]?ms|retry[_-]?count|progress|timestamp)\s*["']?\s*[:=]/i.test(textValue);
}
function digest(value) {
    return crypto.createHash("sha256").update((0, workspace_model_result_projection_1.stableModelJson)(value ?? null)).digest("hex");
}
function text(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return String(value ?? "");
    }
}
function metadata(block) {
    return {
        id: String(block?.id || ""),
        kind: String(block?.kind || ""),
        role: String(block?.role || ""),
        tokens: Math.max(0, Number(block?.tokens || 0)),
        checksum: String(block?.contentChecksum || block?.checksum || ""),
        immutableAddress: String(block?.immutableAddress || ""),
        protected: block?.protected === true,
        contentStored: false,
    };
}
function safeMessage(message, index) {
    const content = text(message?.content ?? message?.text ?? "");
    return {
        index,
        id: String(message?.id || message?.uuid || message?.messageId || message?.tool_call_id || message?.toolCallId || ""),
        role: String(message?.role || ""),
        type: String(message?.type || ""),
        checksum: digest(content),
        tokens: Math.max(0, Math.ceil(content.length / 4)),
        contentStored: false,
    };
}
/**
 * Build the cache-facing prompt layout without retaining prompt bodies. The
 * raw transcript remains owned by the execution ledger; this projection is
 * safe to persist and is only used for cache diagnostics and routing.
 */
function buildCcmCachePromptSegmentsV1(input) {
    const blocks = Array.isArray(input.blocks) ? input.blocks : [];
    const messages = Array.isArray(input.messages) ? input.messages : [];
    let stableCount = 0;
    // Stable prefix is an explicit allow-list. Unmarked system blocks belong to
    // the dynamic suffix so runtime state can never silently poison the cache.
    const isStableSystemBlock = (block) => block?.role === 'system' && block?.prefixEligible === true;
    while (stableCount < blocks.length && isStableSystemBlock(blocks[stableCount]))
        stableCount += 1;
    const stableBlocks = blocks.slice(0, stableCount).map(metadata);
    const toolBlocks = blocks.filter(block => ["tool_use", "tool_result"].includes(String(block?.kind || ""))).map(metadata);
    const directoryBlocks = blocks.filter(block => ["skill", "mcp", "dynamic_context", "long_term_memory"].includes(String(block?.kind || ""))).map(metadata);
    const resultBlockRows = blocks
        .map((block, index) => ({ block: metadata(block), source: block, index }))
        .filter(row => row.block.kind === "tool_result");
    const currentUserIndex = messages.reduce((found, message, index) => (0, completed_tool_result_reuse_1.isConversationUserMessage)(message) ? index : found, -1);
    const turn = currentUserIndex >= 0 ? [safeMessage(messages[currentUserIndex], currentUserIndex)] : [];
    const isToolRole = completed_tool_result_reuse_1.hasToolResult;
    // Tool outputs that precede the current user turn are completed history and
    // can participate in the rolling cache prefix. Tool outputs after that
    // boundary belong to the active turn and remain in the dynamic suffix.
    const toolMessageRows = messages
        .map((message, index) => ({ message, index }))
        .filter(row => isToolRole(row.message));
    const toolMessages = toolMessageRows
        .filter(row => currentUserIndex < 0 || row.index >= currentUserIndex)
        .map(row => safeMessage(row.message, row.index));
    const rollingToolMessages = toolMessageRows
        .filter(row => currentUserIndex >= 0 && row.index < currentUserIndex)
        .map(row => safeMessage(row.message, row.index));
    const session = messages
        .map((message, index) => ({ message, index }))
        .filter(row => currentUserIndex >= 0 && row.index < currentUserIndex
        && String(row.message?.role || "").toLowerCase() !== "system"
        && (!isToolRole(row.message) || row.index < currentUserIndex))
        .map(row => safeMessage(row.message, row.index));
    const stableCore = { blocks: stableBlocks, checksum: String(input.stablePrefixChecksum || digest(stableBlocks)), contentStored: false };
    const stableTools = {
        schemaChecksum: input.toolSchemaPrefixEligible === false ? "" : String(input.toolSchemaChecksum || ""),
        schemaVersion: input.toolSchemaPrefixEligible === false ? "" : String(input.toolSchemaVersion || "v1"),
        stableRuns: Math.max(0, Number(input.toolSchemaStableRuns || 0)),
        eligible: input.toolSchemaPrefixEligible === true,
        tokens: input.toolSchemaPrefixEligible === true ? Math.max(0, Number(input.toolSchemaTokens || 0)) : 0,
        blocks: toolBlocks.filter(block => block.kind !== "tool_result"),
        contentStored: false,
    };
    const dynamicToolSchema = input.toolSchemaPrefixEligible === true ? null : {
        checksum: String(input.toolSchemaChecksum || ""),
        version: String(input.toolSchemaVersion || "v1"),
        tokens: Math.max(0, Number(input.toolSchemaTokens || 0)),
    };
    const scopeDirectory = { blocks: directoryBlocks, dynamicToolSchema, checksum: digest({ directoryBlocks, dynamicToolSchema }), contentStored: false };
    const sessionContext = { messages: session, checksum: digest(session), contentStored: false };
    const turnContext = { messages: turn, checksum: digest(turn), contentStored: false };
    const activeCallIds = new Set(toolMessageRows.filter(row => currentUserIndex < 0 || row.index >= currentUserIndex)
        .map(row => String(row.message?.tool_call_id || row.message?.toolCallId || "")).filter(Boolean));
    const isActiveBlock = (row) => {
        const id = String(row.block?.id || "");
        const callId = id.replace(/^tool_result:/, "");
        const sourceMessageIndex = Number(row.source?.messageIndex ?? row.source?.message_index ?? row.source?.position);
        const hasMessageBoundary = Number.isFinite(sourceMessageIndex);
        return currentUserIndex < 0 || (!!callId && activeCallIds.has(callId))
            || (currentUserIndex >= 0 && hasMessageBoundary && sourceMessageIndex >= currentUserIndex);
    };
    const activeResultBlocks = resultBlockRows.filter(isActiveBlock).map(row => row.block);
    const rollingResultBlocks = resultBlockRows.filter(row => !isActiveBlock(row)).map(row => row.block);
    const allResultBlocks = resultBlockRows.map(row => row.block);
    const toolResults = {
        blocks: allResultBlocks,
        rollingBlocks: rollingResultBlocks,
        activeBlocks: activeResultBlocks,
        messages: toolMessages,
        rollingMessages: rollingToolMessages,
        checksum: digest({ allResultBlocks, rollingToolMessages, toolMessages }),
        contentStored: false,
    };
    const stableCoreTokens = stableBlocks.reduce((sum, block) => sum + Math.max(0, Number(block.tokens || 0)), 0);
    const stableToolSchemaTokens = input.toolSchemaPrefixEligible === true ? Math.max(0, Number(input.toolSchemaTokens || 0)) : 0;
    const tokensAt = (message, index) => {
        const block = blocks.find(block => Number(block.position ?? block.messageIndex) === index);
        return block ? Math.max(0, Number(block.tokens || 0)) : safeMessage(message, index).tokens;
    };
    const rows = messages.map((message, index) => ({ message, index, tokens: tokensAt(message, index) }));
    // Tool messages are accounted for by rollingToolResultTokens below. Keep
    // them out of the general history bucket so the same committed provider
    // bytes are not counted twice in the local candidate estimate.
    const rollingHistoryTokens = rows.filter(row => currentUserIndex >= 0 && row.index < currentUserIndex
        && row.message?.role !== 'system' && !isToolRole(row.message))
        .reduce((sum, row) => sum + row.tokens, 0);
    // Blocks are metadata for messages, not a second copy of model input.
    const actualToolRows = rows.filter(row => isToolRole(row.message));
    const rollingToolResultTokens = actualToolRows.filter(row => currentUserIndex >= 0 && row.index < currentUserIndex).reduce((sum, row) => sum + row.tokens, 0);
    const activeToolResultTokens = actualToolRows.filter(row => currentUserIndex < 0 || row.index >= currentUserIndex).reduce((sum, row) => sum + row.tokens, 0);
    const duplicateResults = (0, completed_tool_result_reuse_1.completedToolResultReferences)(messages, messages.length);
    const duplicateToolResultTokens = actualToolRows.reduce((sum, row) => sum + (duplicateResults.has(row.index) ? row.tokens : 0), 0);
    // Completed tool results are part of the committed conversation prefix once
    // they precede the current user turn. They are not active-turn output and
    // must participate in the local candidate estimate; otherwise the second
    // message after a tool batch is reported as having a much smaller reusable
    // prefix than the wire actually preserves.
    const cacheablePrefixTokens = stableCoreTokens + stableToolSchemaTokens + rollingHistoryTokens + rollingToolResultTokens;
    const uncachedSuffixTokens = rows.filter(row => row.message?.role === 'system' ? row.index >= stableCount : currentUserIndex < 0 || row.index >= currentUserIndex)
        .reduce((sum, row) => sum + row.tokens, 0) + (input.toolSchemaPrefixEligible === true ? 0 : Math.max(0, Number(input.toolSchemaTokens || 0)));
    return {
        schema: "ccm-cache-prompt-segments-v1",
        stableCore,
        stableTools,
        scopeDirectory,
        sessionContext,
        turnContext,
        toolResults,
        stablePrefixChecksum: String(input.stablePrefixChecksum || digest(stableCore)),
        dynamicSuffixChecksum: String(input.dynamicSuffixChecksum || digest({ scopeDirectory, sessionContext, turnContext, toolResults })),
        cacheEpoch: Math.max(0, Number(input.cacheEpoch || 0)),
        cacheablePrefixTokens,
        uncachedSuffixTokens,
        stableCoreTokens,
        stableToolSchemaTokens,
        rollingHistoryTokens,
        rollingToolResultTokens,
        activeToolResultTokens,
        duplicateToolResultTokens,
        breakpointEligibility: input.breakpointEligibility || "unknown",
        breakpointApplied: input.breakpointApplied === true,
        rollingBreakpointIndex: Math.max(-1, Number(input.rollingBreakpointIndex ?? -1)),
        rollingBreakpointReason: String(input.rollingBreakpointReason || ""),
        firstDivergenceKind: String(input.firstDivergenceKind || ""),
        firstDivergenceIndex: Math.max(-1, Number(input.firstDivergenceIndex ?? -1)),
        routeFingerprint: String(input.routeFingerprint || ""),
        providerCacheReadTokens: Math.max(0, Number(input.providerCacheReadTokens || 0)),
        microCompactApplied: input.microCompactApplied === true,
        microCompactReason: String(input.microCompactReason || ""),
        clearedToolResultCount: Math.max(0, Number(input.clearedToolResultCount || 0)),
        clearedToolResultTokens: Math.max(0, Number(input.clearedToolResultTokens || 0)),
        retainedToolResultTokens: Math.max(0, Number(input.retainedToolResultTokens || 0)),
        boundaryChecksum: String(input.boundaryChecksum || ""),
        contentStored: false,
    };
}
function runProviderCachePromptSegmentsSelfTest() {
    const base = [
        { role: "system", content: "stable", prefixEligible: true, kind: "system", tokens: 10 },
        { role: "tool", tool_call_id: "old", content: "old-result" },
        { role: "user", content: "latest" },
        { role: "tool", tool_call_id: "active", content: "active-result" },
    ];
    const first = buildCcmCachePromptSegmentsV1({
        messages: base,
        blocks: [
            { role: "system", kind: "system", prefixEligible: true, contentChecksum: digest("stable"), tokens: 10 },
            { role: "tool", kind: "tool_result", id: "tool_result:old", position: 1, contentChecksum: digest("old-result"), tokens: 3 },
            { role: "tool", kind: "tool_result", id: "tool_result:active", position: 3, contentChecksum: digest("active-result"), tokens: 3 },
        ],
        stablePrefixChecksum: digest("stable"),
        toolSchemaPrefixEligible: true,
        toolSchemaChecksum: "tools",
        toolSchemaTokens: 5,
    });
    const second = buildCcmCachePromptSegmentsV1({
        messages: base,
        blocks: [
            { role: "system", kind: "system", prefixEligible: true, contentChecksum: digest("stable"), tokens: 10 },
            { role: "tool", kind: "tool_result", id: "tool_result:old", position: 1, contentChecksum: digest("old-result"), tokens: 3 },
            { role: "tool", kind: "tool_result", id: "tool_result:active", position: 3, contentChecksum: digest("active-result"), tokens: 3 },
        ],
        stablePrefixChecksum: digest("stable"),
        toolSchemaPrefixEligible: true,
        toolSchemaChecksum: "tools",
        toolSchemaTokens: 5,
    });
    const checks = {
        deterministic: first.dynamicSuffixChecksum === second.dynamicSuffixChecksum,
        rollingToolResultRecorded: first.rollingToolResultTokens > 0,
        activeToolResultRecorded: first.activeToolResultTokens > 0,
        noNegativeDuplicateTokens: first.duplicateToolResultTokens >= 0,
        contentNotStored: first.contentStored === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, result: first };
}
//# sourceMappingURL=provider-cache-prompt-segments.js.map