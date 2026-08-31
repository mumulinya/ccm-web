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
exports.buildCcmCachePromptSegmentsV1 = buildCcmCachePromptSegmentsV1;
const crypto = __importStar(require("crypto"));
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
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
    const stableBlocks = blocks.filter(block => block?.role === "system" && block?.prefixEligible === true).map(metadata);
    const toolBlocks = blocks.filter(block => ["tool_use", "tool_result"].includes(String(block?.kind || ""))).map(metadata);
    const directoryBlocks = blocks.filter(block => ["skill", "mcp", "dynamic_context", "long_term_memory"].includes(String(block?.kind || ""))).map(metadata);
    const resultBlocks = blocks.filter(block => String(block?.kind || "") === "tool_result").map(metadata);
    const currentUserIndex = messages.reduce((found, message, index) => String(message?.role || "").toLowerCase() === "user" ? index : found, -1);
    const turn = currentUserIndex >= 0 ? [safeMessage(messages[currentUserIndex], currentUserIndex)] : [];
    const toolMessages = messages.filter((message, index) => index !== currentUserIndex && ["tool", "function"].includes(String(message?.role || "").toLowerCase())).map(safeMessage);
    const session = messages
        .map((message, index) => ({ message, index }))
        .filter(row => row.index !== currentUserIndex && !["tool", "function"].includes(String(row.message?.role || "").toLowerCase()))
        .map(row => safeMessage(row.message, row.index));
    const stableCore = { blocks: stableBlocks, checksum: String(input.stablePrefixChecksum || digest(stableBlocks)), contentStored: false };
    const stableTools = {
        schemaChecksum: String(input.toolSchemaChecksum || ""),
        tokens: Math.max(0, Number(input.toolSchemaTokens || 0)),
        blocks: toolBlocks.filter(block => block.kind !== "tool_result"),
        contentStored: false,
    };
    const scopeDirectory = { blocks: directoryBlocks, checksum: digest(directoryBlocks), contentStored: false };
    const sessionContext = { messages: session, checksum: digest(session), contentStored: false };
    const turnContext = { messages: turn, checksum: digest(turn), contentStored: false };
    const toolResults = { blocks: resultBlocks, messages: toolMessages, checksum: digest({ resultBlocks, toolMessages }), contentStored: false };
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
        contentStored: false,
    };
}
//# sourceMappingURL=provider-cache-prompt-segments.js.map