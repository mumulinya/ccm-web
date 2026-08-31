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
exports.compactionMessageId = compactionMessageId;
exports.normalizeManualCompactionRequest = normalizeManualCompactionRequest;
exports.selectPartialCompactionProjection = selectPartialCompactionProjection;
const crypto = __importStar(require("crypto"));
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function compactionMessageId(message, index = 0) {
    return String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
}
function messageRole(message) {
    return String(message?.role || message?.message?.role || "");
}
function messageBlocks(message) {
    const content = message?.message?.content ?? message?.content;
    return Array.isArray(content) ? content : [];
}
function toolUseIds(message) {
    return messageBlocks(message).filter((block) => block?.type === "tool_use" && block?.id).map((block) => String(block.id));
}
function toolResultIds(message) {
    return messageBlocks(message).filter((block) => block?.type === "tool_result" && (block?.tool_use_id || block?.toolUseId)).map((block) => String(block.tool_use_id || block.toolUseId));
}
function assistantMessageIdentity(message) {
    return messageRole(message) === "assistant" ? String(message?.message?.id || message?.assistantMessageId || "") : "";
}
function safeBoundaryIndex(messages, pivotIndex) {
    let boundary = pivotIndex;
    const requiredToolUses = new Set(messages.slice(boundary).flatMap(toolResultIds));
    const availableToolUses = new Set(messages.slice(boundary).flatMap(toolUseIds));
    for (const id of availableToolUses)
        requiredToolUses.delete(id);
    for (let index = boundary - 1; index >= 0 && requiredToolUses.size; index -= 1) {
        const ids = toolUseIds(messages[index]);
        if (ids.some(id => requiredToolUses.has(id))) {
            boundary = index;
            for (const id of ids)
                requiredToolUses.delete(id);
        }
    }
    const firstAssistantId = assistantMessageIdentity(messages[boundary]);
    if (firstAssistantId) {
        while (boundary > 0 && assistantMessageIdentity(messages[boundary - 1]) === firstAssistantId)
            boundary -= 1;
    }
    if (requiredToolUses.size)
        throw new Error("partial_compaction_would_split_tool_pair");
    return boundary;
}
function filterReason(message) {
    const type = String(message?.type || message?.kind || "").toLowerCase();
    if (type === "progress" || message?.isProgress === true || message?.is_progress === true)
        return "progress";
    if (type === "compact_boundary" || type === "context_compacted" || message?.isCompactBoundary === true || message?.is_compact_boundary === true)
        return "old_boundary";
    if (type === "compact_summary" || message?.isCompactSummary === true || message?.is_compact_summary === true)
        return "old_summary";
    return "";
}
function latestBoundaryId(messages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (filterReason(messages[index]) === "old_boundary")
            return compactionMessageId(messages[index], index);
    }
    return "";
}
function normalizeManualCompactionRequest(input, expected) {
    const mode = String(input?.mode || (input?.pivotMessageId || input?.pivot_message_id ? "partial" : "full")) === "partial" ? "partial" : "full";
    const direction = String(input?.direction || "up_to") === "from" ? "from" : "up_to";
    const triggerValue = String(input?.trigger || (input?.promptTooLong || input?.prompt_too_long ? "prompt_too_long" : input?.force ? "manual" : "auto"));
    const trigger = triggerValue === "prompt_too_long" ? "prompt_too_long" : triggerValue === "auto" ? "auto" : "manual";
    const request = {
        schema: "ccm-manual-compaction-request-v2",
        scope: expected.scope,
        exactSessionId: expected.exactSessionId,
        trigger,
        mode,
        ...(mode === "partial" ? {
            pivotMessageId: String(input?.pivotMessageId || input?.pivot_message_id || "").trim(),
            direction,
        } : {}),
        ...(String(input?.customInstructions || input?.custom_instructions || "").trim()
            ? { customInstructions: String(input?.customInstructions || input?.custom_instructions || "").trim().slice(0, 4_000) }
            : {}),
        expectedGeneration: Math.max(0, Math.floor(Number(input?.expectedGeneration ?? input?.expected_generation ?? expected.generation ?? 0))),
        expectedPayloadChecksum: String(input?.expectedPayloadChecksum || input?.expected_payload_checksum || expected.payloadChecksum || ""),
    };
    if (mode === "partial" && !request.pivotMessageId)
        throw new Error("partial_compaction_pivot_required");
    if (mode === "partial" && !String(expected.payloadChecksum || "").trim()) {
        throw new Error("compaction_canonical_payload_unavailable");
    }
    if (mode === "full" && (input?.pivotMessageId || input?.pivot_message_id))
        throw new Error("full_compaction_must_not_include_pivot");
    if (request.expectedGeneration !== expected.generation)
        throw new Error("compaction_generation_mismatch");
    if (expected.payloadChecksum && request.expectedPayloadChecksum !== expected.payloadChecksum)
        throw new Error("compaction_payload_checksum_mismatch");
    return request;
}
function selectPartialCompactionProjection(messagesInput, request) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    if (request.mode !== "partial")
        return null;
    const pivotIndex = messages.findIndex((message, index) => compactionMessageId(message, index) === request.pivotMessageId);
    if (pivotIndex < 0)
        throw new Error("partial_compaction_pivot_not_in_active_context");
    if (messageRole(messages[pivotIndex]) !== "user")
        throw new Error("partial_compaction_pivot_must_be_user_message");
    const direction = request.direction === "from" ? "from" : "up_to";
    const boundaryIndex = safeBoundaryIndex(messages, pivotIndex);
    const summarized = direction === "up_to" ? messages.slice(0, boundaryIndex) : messages.slice(boundaryIndex);
    const rawPreserved = direction === "up_to" ? messages.slice(boundaryIndex) : messages.slice(0, boundaryIndex);
    const filteredReasons = {};
    const preserved = rawPreserved.filter((message, relativeIndex) => {
        const reason = filterReason(message);
        const shouldFilter = reason === "progress" || direction === "up_to" && (reason === "old_boundary" || reason === "old_summary");
        if (!shouldFilter)
            return true;
        filteredReasons[compactionMessageId(message, direction === "up_to" ? boundaryIndex + relativeIndex : relativeIndex)] = reason;
        return false;
    });
    if (!summarized.length)
        throw new Error(direction === "up_to" ? "nothing_to_compact_before_pivot" : "nothing_to_compact_after_pivot");
    if (!preserved.length && direction === "up_to")
        throw new Error("partial_compaction_preserved_context_empty");
    const projection = {
        schema: "ccm-partial-compaction-projection-v2",
        mode: "partial",
        direction,
        pivotMessageId: request.pivotMessageId,
        pivotIndex,
        safeBoundaryIndex: boundaryIndex,
        summaryPlacement: direction === "up_to" ? "before_preserved" : "after_preserved",
        summarizedMessageIds: summarized.map(compactionMessageId),
        preservedMessageIds: preserved.map(compactionMessageId),
        filteredMessageIds: Object.keys(filteredReasons),
        filteredReasons,
        sourceBoundaryGeneration: Math.max(0, Number(request.expectedGeneration || 0)),
        previousBoundaryId: latestBoundaryId(messages),
        firstPreservedMessageId: preserved.length ? compactionMessageId(preserved[0], 0) : "",
        lastPreservedMessageId: preserved.length ? compactionMessageId(preserved.at(-1), preserved.length - 1) : "",
        sourceChecksum: digest(messages.map((message, index) => [compactionMessageId(message, index), message?.role, message?.content ?? message?.text ?? ""])),
        contentStored: false,
    };
    return { projection, summarized, preserved };
}
//# sourceMappingURL=manual-session-compaction.js.map