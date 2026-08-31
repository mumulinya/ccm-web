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
exports.buildCcmRollingSessionMemoryV1 = buildCcmRollingSessionMemoryV1;
exports.finalizeSharedRollingSessionMemory = finalizeSharedRollingSessionMemory;
exports.validateCcmRollingSessionMemoryV1 = validateCcmRollingSessionMemoryV1;
exports.selectRollingSessionMemoryForCompaction = selectRollingSessionMemoryForCompaction;
exports.runRollingSessionMemoryExtraction = runRollingSessionMemoryExtraction;
const crypto = __importStar(require("crypto"));
const unified_session_compaction_summary_1 = require("./unified-session-compaction-summary");
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function idOf(message, index = 0) {
    return String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
}
function coreChecksum(value) {
    return digest(value);
}
function buildCcmRollingSessionMemoryV1(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const sourceMessageIds = messages.map(idOf).slice(-512);
    const summary = (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(input.summary, sourceMessageIds);
    const core = {
        schema: "ccm-rolling-session-memory-v1",
        scope: input.scope,
        exactSessionId: input.exactSessionId,
        generation: Math.max(0, Math.floor(Number(input.generation || 0))),
        summarizedThroughMessageId: messages.length ? idOf(messages.at(-1), messages.length - 1) : "",
        summarizedMessageCount: messages.length,
        tokensAtLastExtraction: Math.max(0, Math.floor(Number(input.cadence?.totalTokens || 0))),
        toolCallsAtLastExtraction: Math.max(0, Math.floor(Number(input.cadence?.toolCallsSinceLastExtraction || 0))),
        ...(input.cadence?.tokenBasis?.schema === "ccm-session-memory-token-basis-v1" ? { tokenBasis: input.cadence.tokenBasis } : {}),
        summary,
        summaryChecksum: digest(summary),
        sourceMessageIds,
        provider: String(input.provider || ""),
        model: String(input.model || ""),
        updatedAt: new Date().toISOString(),
        sourceContentStored: false,
        extractionCore: "ccm_shared",
    };
    return { ...core, checksum: coreChecksum(core) };
}
function finalizeSharedRollingSessionMemory(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const cursor = String(input.summarizedThroughMessageId || "").trim();
    const cursorIndex = messages.findIndex((message, index) => idOf(message, index) === cursor);
    if (!cursor || cursorIndex < 0) {
        const error = new Error("rolling session memory cursor is stale");
        error.code = "CCM_SESSION_MEMORY_CURSOR_MISMATCH";
        throw error;
    }
    const covered = messages.slice(0, cursorIndex + 1);
    const shape = (0, unified_session_compaction_summary_1.runUnifiedSummaryShapeCheck)((0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(input.summary, covered.map(idOf)));
    if (!shape.valid) {
        const error = new Error(`rolling session memory validation failed: ${shape.missing.join(",")}`);
        error.code = "CCM_SESSION_MEMORY_QUALITY_GATE_FAILED";
        throw error;
    }
    return buildCcmRollingSessionMemoryV1({
        scope: input.scope,
        exactSessionId: input.exactSessionId,
        generation: input.generation,
        summary: input.summary,
        messages: covered,
        cadence: input.cadence,
        provider: input.provider,
        model: input.model,
    });
}
function validateCcmRollingSessionMemoryV1(value, input) {
    const memory = value && typeof value === "object" ? value : null;
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const cursorIndex = memory?.summarizedThroughMessageId
        ? messages.findIndex((message, index) => idOf(message, index) === memory.summarizedThroughMessageId)
        : -1;
    const { checksum: _checksum, ...core } = memory || {};
    const issues = [
        memory?.schema !== "ccm-rolling-session-memory-v1" ? "schema_mismatch" : "",
        memory?.scope !== input.scope ? "scope_mismatch" : "",
        memory?.exactSessionId !== input.exactSessionId ? "session_mismatch" : "",
        input.generation != null && Number(memory?.generation || 0) !== Number(input.generation || 0) ? "generation_mismatch" : "",
        !(0, unified_session_compaction_summary_1.runUnifiedSummaryShapeCheck)(memory?.summary).valid ? "summary_invalid" : "",
        memory?.summaryChecksum !== digest(memory?.summary) ? "summary_checksum_mismatch" : "",
        memory?.checksum !== coreChecksum(core) ? "checksum_mismatch" : "",
        messages.length > 0 && cursorIndex < 0 ? "cursor_missing" : "",
        input.requiredThroughIndex != null && cursorIndex < input.requiredThroughIndex ? "coverage_insufficient" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues, memory, cursorIndex };
}
function selectRollingSessionMemoryForCompaction(value, snapshot, requiredThroughIndex) {
    return validateCcmRollingSessionMemoryV1(value, {
        scope: snapshot.scope,
        exactSessionId: snapshot.exactSessionId,
        generation: snapshot.boundaryGeneration,
        messages: snapshot.messages,
        requiredThroughIndex,
    });
}
async function runRollingSessionMemoryExtraction(input) {
    const messages = Array.isArray(input.messages) ? input.messages : [];
    if (!messages.length)
        throw new Error("rolling session memory requires an authoritative transcript");
    const previous = input.previous || null;
    const cursorIndex = previous?.summarizedThroughMessageId
        ? messages.findIndex((message, index) => idOf(message, index) === previous.summarizedThroughMessageId)
        : -1;
    if (previous && cursorIndex < 0) {
        const error = new Error("rolling session memory cursor is stale");
        error.code = "CCM_SESSION_MEMORY_CURSOR_MISMATCH";
        throw error;
    }
    const sourceMessages = cursorIndex >= 0 ? messages.slice(cursorIndex + 1) : messages;
    if (!sourceMessages.length)
        return previous;
    const sourceMessageIds = messages.map(idOf);
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
            const raw = await input.modelCall({
                system: unified_session_compaction_summary_1.UNIFIED_COMPACTION_SYSTEM_PROMPT,
                user: (0, unified_session_compaction_summary_1.buildUnifiedSummaryPrompt)({
                    snapshot: { messages: sourceMessages, executionEvents: input.executionEvents || [] },
                    previousSummary: previous?.summary || null,
                    reason: input.reason || "rolling_session_memory",
                    customInstructions: "Merge the new facts into the previous summary. Preserve unresolved work and user corrections. Do not repeat superseded facts.",
                }),
                maxOutputTokens: 5000,
                attempt,
                scope: input.scope,
                exactSessionId: input.exactSessionId,
            });
            const summary = (0, unified_session_compaction_summary_1.normalizeCcmUnifiedSummary)(raw?.summary || raw, sourceMessageIds);
            const shape = (0, unified_session_compaction_summary_1.runUnifiedSummaryShapeCheck)(summary);
            const hasFacts = ["userGoals", "corrections", "decisions", "completedWork", "pendingWork", "risksAndBlockers", "nextActions"]
                .some(key => Array.isArray(summary[key]) && summary[key].length > 0);
            if (!shape.valid || !hasFacts)
                throw new Error(`rolling session memory validation failed: ${shape.missing.join(",") || "summary_core_empty"}`);
            return buildCcmRollingSessionMemoryV1({
                scope: input.scope,
                exactSessionId: input.exactSessionId,
                generation: input.generation,
                summary,
                messages,
                cadence: input.cadence,
                provider: raw?.provider,
                model: raw?.model,
            });
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("rolling session memory extraction failed");
}
//# sourceMappingURL=rolling-session-memory.js.map