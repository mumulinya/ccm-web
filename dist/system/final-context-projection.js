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
exports.DEFAULT_FINAL_DYNAMIC_CONTEXT_BUDGET = exports.FINAL_CONTEXT_PROJECTION_SCHEMA = void 0;
exports.finalContextProjectionEnabled = finalContextProjectionEnabled;
exports.resolveFinalContextBudget = resolveFinalContextBudget;
exports.projectFinalContextMessages = projectFinalContextMessages;
exports.runFinalContextProjectionSelfTest = runFinalContextProjectionSelfTest;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
const completed_tool_result_reuse_1 = require("./completed-tool-result-reuse");
const tool_result_projection_1 = require("./tool-result-projection");
exports.FINAL_CONTEXT_PROJECTION_SCHEMA = "ccm-final-context-projection-v1";
// A fixed dynamic-token ceiling is intentionally not used. Providers and
// models have different context windows; an absent limit means no proactive
// projection and preserves the largest cacheable prefix.
exports.DEFAULT_FINAL_DYNAMIC_CONTEXT_BUDGET = 0;
function stableJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value ?? null);
}
function digest(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex").slice(0, 32);
}
function contentText(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return String(value ?? "");
    }
}
function messageTokens(message) {
    return (0, context_budget_1.estimateTextTokens)(contentText(message?.content ?? message?.text ?? ""));
}
function isToolMessage(message) {
    const role = String(message?.role || "").toLowerCase();
    return role === "tool" || role === "function" || Array.isArray(message?.tool_calls)
        || (Array.isArray(message?.content) && message.content.some((part) => ["tool_result", "tool_use"].includes(String(part?.type || ""))));
}
function compactText(source, maxChars, label) {
    if (source.length <= maxChars)
        return source;
    const head = Math.max(80, Math.floor(maxChars * 0.58));
    const tail = Math.max(60, maxChars - head - 96);
    return `${source.slice(0, head)}\n[${label} omitted; sha256=${digest(source)}]\n${source.slice(-tail)}`;
}
function compactMessage(message, maxChars, reason) {
    if (!message || typeof message !== "object")
        return message;
    const content = contentText(message.content ?? message.text ?? "");
    if (content.length <= maxChars)
        return message;
    const next = { ...message };
    const compacted = compactText(content, maxChars, reason);
    if (message.content !== undefined)
        next.content = compacted;
    else
        next.text = compacted;
    return next;
}
function dynamicTokenCount(messages) {
    let firstNonSystem = 0;
    while (firstNonSystem < messages.length && String(messages[firstNonSystem]?.role || "").toLowerCase() === "system")
        firstNonSystem += 1;
    const stable = messages.slice(0, firstNonSystem);
    const dynamic = messages.slice(firstNonSystem);
    return {
        stableTokens: stable.reduce((sum, message) => sum + messageTokens(message), 0),
        dynamicTokens: dynamic.reduce((sum, message) => sum + messageTokens(message), 0),
    };
}
const DEFAULT_MICRO_COMPACT_TURN_THRESHOLD = 6;
const DEFAULT_MICRO_COMPACT_TOKEN_THRESHOLD = 12_000;
const DEFAULT_MICRO_COMPACT_RETAIN_RECENT = 4;
function microCompactConfig(config = {}) {
    const rawEnabled = config?.microCompact ?? config?.micro_compact ?? process.env.CCM_MICRO_COMPACT;
    const enabled = rawEnabled === undefined || rawEnabled === null
        ? true
        : !["0", "false", "off", "disabled", "no"].includes(String(rawEnabled).trim().toLowerCase());
    const number = (value, fallback, minimum = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= minimum ? Math.floor(parsed) : fallback;
    };
    return {
        enabled,
        turnThreshold: number(config?.microCompactTurnThreshold ?? config?.micro_compact_turn_threshold ?? process.env.CCM_MICRO_COMPACT_TURN_THRESHOLD, DEFAULT_MICRO_COMPACT_TURN_THRESHOLD, 1),
        tokenThreshold: number(config?.microCompactTokenThreshold ?? config?.micro_compact_token_threshold ?? process.env.CCM_MICRO_COMPACT_TOKEN_THRESHOLD, DEFAULT_MICRO_COMPACT_TOKEN_THRESHOLD, 1),
        retainRecent: number(config?.microCompactRetainRecent ?? config?.micro_compact_retain_recent ?? process.env.CCM_MICRO_COMPACT_RETAIN_RECENT, DEFAULT_MICRO_COMPACT_RETAIN_RECENT, 0),
    };
}
function messageRole(message) {
    return String(message?.role || "").toLowerCase();
}
function toolResultCallId(message) {
    return String(message?.tool_call_id || message?.toolCallId || message?.tool_use_id || message?.toolUseId || "");
}
function toolResultContent(message) {
    return contentText(message?.content ?? message?.text ?? "");
}
function isToolResultMessage(message) {
    const role = messageRole(message);
    return role === "tool" || role === "function"
        || (Array.isArray(message?.content) && message.content.some((part) => String(part?.type || "") === "tool_result"));
}
function isToolDeclarationMessage(message) {
    return Array.isArray(message?.tool_calls)
        || (Array.isArray(message?.content) && message.content.some((part) => String(part?.type || "") === "tool_use"));
}
function replaceToolResultContent(message, replacement) {
    if (!message || typeof message !== "object")
        return message;
    const next = { ...message };
    if (Array.isArray(message.content)) {
        next.content = message.content.map((part) => {
            if (!part || typeof part !== "object" || String(part.type || "") !== "tool_result")
                return part;
            return { ...part, content: replacement };
        });
    }
    else if (message.content !== undefined)
        next.content = replacement;
    else
        next.text = replacement;
    return next;
}
function microCompactToolResults(messages, config = {}, options = {}) {
    const policy = microCompactConfig(config);
    const toolRows = messages
        .map((message, index) => ({ message, index }))
        .filter(row => isToolResultMessage(row.message));
    const userIndexes = messages
        .map((message, index) => (0, completed_tool_result_reuse_1.isConversationUserMessage)(message) ? index : -1)
        .filter(index => index >= 0);
    const latestUserIndex = userIndexes.at(-1) ?? -1;
    const completedTurns = Math.max(0, userIndexes.length - (latestUserIndex >= 0 ? 1 : 0));
    const activeCallIds = new Set();
    messages.forEach((message, index) => {
        if (latestUserIndex >= 0 && index < latestUserIndex)
            return;
        if (isToolDeclarationMessage(message)) {
            for (const call of Array.isArray(message?.tool_calls) ? message.tool_calls : []) {
                const id = String(call?.id || call?.tool_call_id || "");
                if (id)
                    activeCallIds.add(id);
            }
            for (const part of Array.isArray(message?.content) ? message.content : []) {
                const id = String(part?.id || part?.tool_use_id || "");
                if (String(part?.type || "") === "tool_use" && id)
                    activeCallIds.add(id);
            }
        }
    });
    const activeIndexes = new Set(toolRows
        .filter(row => latestUserIndex < 0 || row.index >= latestUserIndex || activeCallIds.has(toolResultCallId(row.message)))
        .map(row => row.index));
    const completedRows = toolRows.filter(row => !activeIndexes.has(row.index));
    const completedTokens = completedRows.reduce((sum, row) => sum + messageTokens(row.message), 0);
    const activeTokens = toolRows.filter(row => activeIndexes.has(row.index)).reduce((sum, row) => sum + messageTokens(row.message), 0);
    const references = (0, completed_tool_result_reuse_1.completedToolResultReferences)(messages, policy.enabled ? latestUserIndex : -1);
    const duplicateIndexes = new Set(references.keys());
    const referencedIndexes = (0, completed_tool_result_reuse_1.completedToolResultAnchors)(messages, latestUserIndex);
    const shouldCompact = policy.enabled && completedTurns >= policy.turnThreshold && completedTokens >= policy.tokenThreshold;
    const eligibleRows = shouldCompact
        ? completedRows.filter(row => !duplicateIndexes.has(row.index) && !referencedIndexes.has(row.index)).slice(0, Math.max(0, completedRows.length - policy.retainRecent))
        : [];
    const clearIndexes = new Set(eligibleRows.map(row => row.index));
    // A normal agent turn must keep already-committed tool results byte-for-byte
    // stable. Replacing an old duplicate with a reference is logically lossless
    // but still moves the Provider prefix and commonly reduces the next request
    // to the provider's baseline fragment. Callers that own an append-only
    // transcript may therefore defer this optimization until real pressure.
    if (!options.preserveAppendOnlyPrefix || shouldCompact) {
        for (const index of duplicateIndexes)
            clearIndexes.add(index);
    }
    if (!clearIndexes.size) {
        return {
            messages,
            applied: false,
            reason: policy.enabled ? "none" : "disabled",
            clearedCount: 0,
            clearedTokens: 0,
            retainedTokens: completedTokens,
            activeTokens,
            duplicateTokens: 0,
            boundaryChecksum: "",
        };
    }
    const next = messages.slice();
    let clearedTokens = 0;
    let duplicateTokens = 0;
    for (const row of toolRows) {
        if (!clearIndexes.has(row.index))
            continue;
        const original = messageTokens(row.message);
        const checksum = digest(toolResultContent(row.message));
        const duplicate = duplicateIndexes.has(row.index);
        const reference = references.get(row.index);
        const replacement = reference
            ? JSON.stringify({ schema: 'ccm-tool-result-reference-v1', name: reference.name, ok: true, checksum: reference.checksum, duplicateOfCallId: reference.callId })
            : String((0, tool_result_projection_1.projectCompletedToolResult)(toolResultContent(row.message), { source: 'completed_tool_result' }).value);
        next[row.index] = replaceToolResultContent(row.message, replacement);
        const compacted = Math.max(0, original - messageTokens(next[row.index]));
        clearedTokens += compacted;
        if (duplicate)
            duplicateTokens += original;
    }
    const boundaryChecksum = digest([...clearIndexes].sort((a, b) => a - b).map(index => ({ index, checksum: digest(toolResultContent(messages[index])) })));
    return {
        messages: next,
        applied: true,
        reason: shouldCompact ? "pressure_or_completed_turn_threshold" : "duplicate_result_deduplication",
        clearedCount: clearIndexes.size,
        clearedTokens,
        retainedTokens: Math.max(0, completedTokens - clearedTokens),
        activeTokens,
        duplicateTokens,
        boundaryChecksum,
    };
}
function finalContextProjectionEnabled(config = {}) {
    const raw = String(config?.finalContextProjection ?? config?.final_context_projection ?? process.env.CCM_FINAL_CONTEXT_PROJECTION ?? "on").trim().toLowerCase();
    return !["0", "false", "off", "disabled", "no"].includes(raw);
}
function resolveFinalContextBudget(config = {}, stableTokens = 0) {
    const configuredRaw = config?.finalContextProjectionBudgetTokens
        ?? config?.final_context_projection_budget_tokens
        ?? process.env.CCM_FINAL_CONTEXT_PROJECTION_BUDGET_TOKENS;
    if (configuredRaw !== undefined && configuredRaw !== null && String(configuredRaw).trim() !== "") {
        const configured = Number(configuredRaw);
        return Number.isFinite(configured) && configured > 0 ? Math.max(4_000, Math.floor(configured)) : 0;
    }
    const contextWindow = Number(config?.contextWindowTokens ?? config?.context_window_tokens ?? config?.modelContextWindow ?? config?.model_context_window ?? 0);
    if (!Number.isFinite(contextWindow) || contextWindow <= 0)
        return 0;
    const maxOutput = Math.max(0, Number(config?.maxOutputTokens ?? config?.max_output_tokens ?? config?.modelMaxOutputTokens ?? config?.model_max_output_tokens ?? 0));
    const reserved = Math.max(0, Number(config?.reservedTokens ?? config?.reserved_tokens ?? config?.contextPlanReservedTokens ?? config?.context_plan_reserved_tokens ?? 2_000));
    const safetyMargin = Math.max(512, Math.min(4_096, Math.floor(contextWindow * 0.01)));
    const availableDynamic = Math.floor(contextWindow - maxOutput - reserved - safetyMargin - Math.max(0, Number(stableTokens || 0)));
    return availableDynamic > 0 ? Math.max(4_000, availableDynamic) : 4_000;
}
/**
 * Compact only model-visible message content. Protocol roles, tool call IDs,
 * assistant tool declarations and the authoritative execution ledger remain
 * untouched. The same input always produces the same output.
 */
function projectFinalContextMessages(messagesInput, options = {}) {
    const messages = Array.isArray(messagesInput) ? messagesInput : [];
    const enabled = finalContextProjectionEnabled(options.config || {});
    const micro = microCompactToolResults(messages, enabled ? (options.config || {}) : { ...(options.config || {}), microCompact: false }, {
        preserveAppendOnlyPrefix: options.preserveAppendOnlyPrefix === true,
    });
    const sourceMessages = micro.messages;
    const original = dynamicTokenCount(messages);
    const projectedSource = dynamicTokenCount(sourceMessages);
    const resolvedBudget = options.budgetTokens !== undefined
        ? Number(options.budgetTokens)
        : resolveFinalContextBudget(options.config || {}, original.stableTokens);
    const budgetTokens = resolvedBudget > 0 ? Math.max(4_000, Math.floor(resolvedBudget)) : 0;
    const originalTokens = original.stableTokens + original.dynamicTokens;
    if (!enabled || budgetTokens <= 0 || projectedSource.dynamicTokens <= budgetTokens) {
        const projectionChecksum = digest(sourceMessages);
        return {
            schema: exports.FINAL_CONTEXT_PROJECTION_SCHEMA,
            messages: sourceMessages,
            changed: micro.applied,
            enabled,
            originalTokens,
            projectedTokens: projectedSource.stableTokens + projectedSource.dynamicTokens,
            originalDynamicTokens: original.dynamicTokens,
            projectedDynamicTokens: projectedSource.dynamicTokens,
            budgetTokens,
            compactedMessageCount: 0,
            preservedRecentMessageCount: Math.max(0, Number(options.preserveRecentMessages || 8)),
            omittedContentChecksum: "",
            projectionChecksum,
            microCompactApplied: micro.applied,
            microCompactReason: micro.reason,
            clearedToolResultCount: micro.clearedCount,
            clearedToolResultTokens: micro.clearedTokens,
            retainedToolResultTokens: micro.retainedTokens,
            activeToolResultTokens: micro.activeTokens,
            duplicateToolResultTokens: micro.duplicateTokens,
            boundaryChecksum: micro.boundaryChecksum,
            contentStored: false,
        };
    }
    const preserveRecent = Math.max(1, Number(options.preserveRecentMessages || 8));
    const currentUserIndex = messages.reduce((last, message, index) => (0, completed_tool_result_reuse_1.isConversationUserMessage)(message) ? index : last, -1);
    const referenceAnchors = (0, completed_tool_result_reuse_1.completedToolResultAnchors)(messages, currentUserIndex);
    const protectedEvidence = (index) => referenceAnchors.has(index) || currentUserIndex < 0 || index >= currentUserIndex
        || Array.isArray(sourceMessages[index]?.content);
    const firstDynamic = sourceMessages.findIndex(message => String(message?.role || "").toLowerCase() !== "system");
    const dynamicStart = firstDynamic < 0 ? sourceMessages.length : firstDynamic;
    const recentStart = Math.max(dynamicStart, sourceMessages.length - preserveRecent);
    const next = sourceMessages.map((message, index) => {
        if (index < dynamicStart || index >= recentStart || protectedEvidence(index))
            return message;
        const protocol = isToolMessage(message);
        const maxChars = protocol ? 1_600 : 2_400;
        return compactMessage(message, maxChars, protocol ? "older tool evidence" : "older context");
    });
    // If compacting individual messages is insufficient, tighten older content
    // in deterministic source order while always preserving the recent window.
    let projected = dynamicTokenCount(next);
    const compactedIndexes = [];
    for (let index = dynamicStart; index < recentStart && projected.dynamicTokens > budgetTokens; index += 1) {
        if (protectedEvidence(index))
            continue;
        const message = next[index];
        const content = contentText(message?.content ?? message?.text ?? "");
        if (!content)
            continue;
        const currentTokens = messageTokens(message);
        const excess = Math.max(0, projected.dynamicTokens - budgetTokens);
        const targetTokens = Math.max(48, currentTokens - excess);
        const targetChars = Math.max(192, targetTokens * 4);
        const compacted = compactMessage(message, targetChars, isToolMessage(message) ? "older tool evidence" : "older context");
        if (compacted !== message) {
            next[index] = compacted;
            compactedIndexes.push(index);
            projected = dynamicTokenCount(next);
        }
    }
    // The active turn and referenced evidence must remain complete. If older
    // content cannot free enough room, the existing token gate owns compaction.
    for (let index = dynamicStart; index < messages.length && projected.dynamicTokens > budgetTokens; index += 1) {
        if (protectedEvidence(index))
            continue;
        const message = next[index];
        const content = contentText(message?.content ?? message?.text ?? "");
        if (!content)
            continue;
        const currentTokens = messageTokens(message);
        const excess = Math.max(0, projected.dynamicTokens - budgetTokens);
        const targetTokens = Math.max(48, currentTokens - excess);
        const targetChars = Math.max(192, targetTokens * 4);
        const compacted = compactMessage(message, targetChars, isToolMessage(message) ? "tool evidence" : "context");
        if (compacted !== message) {
            next[index] = compacted;
            compactedIndexes.push(index);
            projected = dynamicTokenCount(next);
        }
    }
    // Converge on the budget when a single recent message is much larger than
    // the remaining allowance. The earlier passes use a token-to-character
    // estimate, so perform a deterministic proportional pass based on the
    // measured result. Only historical, unreferenced content is eligible.
    let convergencePass = 0;
    while (projected.dynamicTokens > budgetTokens && convergencePass < 24) {
        convergencePass += 1;
        let candidateIndex = -1;
        let candidateLength = 0;
        for (let index = dynamicStart; index < next.length; index += 1) {
            if (protectedEvidence(index))
                continue;
            const content = contentText(next[index]?.content ?? next[index]?.text ?? "");
            if (content.length > candidateLength) {
                candidateIndex = index;
                candidateLength = content.length;
            }
        }
        if (candidateIndex < 0 || candidateLength <= 192)
            break;
        const allowanceRatio = Math.max(0.01, Math.min(0.92, budgetTokens / Math.max(1, projected.dynamicTokens)));
        const targetChars = Math.max(192, Math.floor(candidateLength * allowanceRatio * 0.9));
        const message = next[candidateIndex];
        const compacted = compactMessage(message, targetChars, isToolMessage(message) ? "tool evidence" : "context");
        if (compacted === message)
            break;
        next[candidateIndex] = compacted;
        compactedIndexes.push(candidateIndex);
        projected = dynamicTokenCount(next);
    }
    const projectedTokens = projected.stableTokens + projected.dynamicTokens;
    const omittedContentChecksum = digest([
        ...compactedIndexes.map(index => ({ index, checksum: digest(contentText(sourceMessages[index]?.content ?? sourceMessages[index]?.text ?? "")) })),
        ...(micro.boundaryChecksum ? [{ boundaryChecksum: micro.boundaryChecksum }] : []),
    ]);
    return {
        schema: exports.FINAL_CONTEXT_PROJECTION_SCHEMA,
        messages: next,
        changed: compactedIndexes.length > 0 || micro.applied,
        enabled,
        originalTokens,
        projectedTokens,
        originalDynamicTokens: original.dynamicTokens,
        projectedDynamicTokens: projected.dynamicTokens,
        budgetTokens,
        compactedMessageCount: compactedIndexes.length,
        preservedRecentMessageCount: sourceMessages.length - recentStart,
        omittedContentChecksum,
        projectionChecksum: digest(next),
        microCompactApplied: micro.applied,
        microCompactReason: micro.reason,
        clearedToolResultCount: micro.clearedCount,
        clearedToolResultTokens: micro.clearedTokens,
        retainedToolResultTokens: micro.retainedTokens,
        activeToolResultTokens: micro.activeTokens,
        duplicateToolResultTokens: micro.duplicateTokens,
        boundaryChecksum: micro.boundaryChecksum,
        contentStored: false,
    };
}
function runFinalContextProjectionSelfTest() {
    const messages = [
        { role: "system", content: "stable system" },
        { role: "user", content: "goal" },
        { role: "assistant", tool_calls: [{ id: "call-1", type: "function", function: { name: "read_file", arguments: "{}" } }], content: "" },
        { role: "tool", tool_call_id: "call-1", content: "x".repeat(40_000) },
        { role: "user", content: "latest evidence and final answer requirements" },
    ];
    const first = projectFinalContextMessages(messages, { budgetTokens: 2_000, preserveRecentMessages: 1 });
    const second = projectFinalContextMessages(messages, { budgetTokens: 2_000, preserveRecentMessages: 1 });
    const checks = {
        stableSystemPreserved: first.messages[0]?.content === "stable system",
        recentMessagePreserved: first.messages.at(-1)?.content === messages.at(-1)?.content,
        toolProtocolPreserved: first.messages[2]?.tool_calls?.[0]?.id === "call-1" && first.messages[3]?.tool_call_id === "call-1",
        reduced: first.projectedDynamicTokens < first.originalDynamicTokens,
        deterministic: first.projectionChecksum === second.projectionChecksum && JSON.stringify(first.messages) === JSON.stringify(second.messages),
        contentNotStored: first.contentStored === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, result: first };
}
//# sourceMappingURL=final-context-projection.js.map