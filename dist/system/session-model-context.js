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
exports.resolveSessionModelMicroCompactPolicy = resolveSessionModelMicroCompactPolicy;
exports.sessionModelMessageContent = sessionModelMessageContent;
exports.sessionModelMicroCompactReceiptChecksum = sessionModelMicroCompactReceiptChecksum;
exports.verifySessionModelMicroCompactReceipt = verifySessionModelMicroCompactReceipt;
exports.sessionModelReplacementTextMap = sessionModelReplacementTextMap;
exports.verifySessionModelContentReplacementReceipt = verifySessionModelContentReplacementReceipt;
exports.buildUnifiedSessionModelContextProjection = buildUnifiedSessionModelContextProjection;
exports.runUnifiedSessionModelContextSelfTest = runUnifiedSessionModelContextSelfTest;
const crypto = __importStar(require("crypto"));
const context_budget_1 = require("./context-budget");
const session_memory_window_1 = require("./session-memory-window");
const session_execution_ledger_1 = require("./session-execution-ledger");
const unified_session_compaction_1 = require("./unified-session-compaction");
const session_task_timeline_1 = require("../tasks/session-task-timeline");
const task_aware_session_projection_1 = require("./task-aware-session-projection");
const session_start_hook_context_1 = require("./session-start-hook-context");
function resolveSessionModelMicroCompactPolicy(config = {}, overrides = {}) {
    const unified = (0, unified_session_compaction_1.resolveUnifiedCompactionPolicy)(config, { pressureFirst: true });
    return {
        // Legacy projector-side MicroCompact is permanently retired. Keep the
        // shape readable for old receipts, but never let configuration or a caller
        // reactivate it in a new model-context projection.
        enabled: false,
        trigger: "context_pressure",
        mainThread: true,
        gapThresholdMinutes: 0,
        keepRecent: 0,
        contextTokens: 0,
        pressureThresholdTokens: Math.max(0, Number(unified.autoCompactThreshold || 0)),
        contextPressureEnabled: false,
        now: overrides.now,
    };
}
function sessionModelMessageContent(value) {
    const content = value && typeof value === "object"
        ? value.content ?? value.message?.content ?? value.text ?? ""
        : value;
    if (typeof content === "string")
        return content;
    try {
        return JSON.stringify(content);
    }
    catch {
        return String(content || "");
    }
}
function sessionModelMicroCompactReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receiptChecksum;
    delete payload.receipt_checksum;
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function verifySessionModelMicroCompactReceipt(receipt, expected = {}) {
    const issues = [
        receipt?.schema !== "ccm-session-microcompact-receipt-v1" ? "schema_invalid" : "",
        expected.scope && String(receipt?.scope || "") !== expected.scope ? "scope_mismatch" : "",
        expected.sessionId && String(receipt?.sessionId || "") !== expected.sessionId ? "session_mismatch" : "",
        expected.scopeId && String(receipt?.scopeId || "") !== expected.scopeId ? "scope_id_mismatch" : "",
        receipt?.rawLedgerPreserved !== true ? "raw_ledger_preservation_missing" : "",
        String(receipt?.receiptChecksum || "") !== sessionModelMicroCompactReceiptChecksum(receipt) ? "checksum_invalid" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues };
}
function messageId(message, index) {
    return String(message?.id || message?.uuid || message?.messageId || `message-${index}`);
}
function requestContent(value) {
    if (value == null || value === "")
        return "";
    return sessionModelMessageContent(value);
}
function excludePendingRequest(messages, currentRequest) {
    const content = requestContent(currentRequest);
    if (!content)
        return { messages, deduplicated: false };
    const last = messages.at(-1);
    if (String(last?.role || "") === "user" && sessionModelMessageContent(last) === content) {
        return { messages: messages.slice(0, -1), deduplicated: true };
    }
    return { messages, deduplicated: false };
}
function contentReplacementReceiptChecksum(receipt) {
    const payload = { ...(receipt || {}) };
    delete payload.receiptChecksum;
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function sessionModelReplacementTextMap(contentReplacement) {
    const map = new Map();
    for (const row of Array.isArray(contentReplacement?.replacements) ? contentReplacement.replacements : []) {
        const id = String(row?.toolCallId || "").trim();
        const text = String(row?.projectedText || "").trim();
        if (id && text)
            map.set(id, text);
    }
    return map;
}
function verifySessionModelContentReplacementReceipt(receipt, expected = {}) {
    const issues = [
        receipt?.schema !== "ccm-session-tool-result-content-replacement-v1" ? "schema_invalid" : "",
        expected.scope && String(receipt?.scope || "") !== expected.scope ? "scope_mismatch" : "",
        expected.sessionId && String(receipt?.sessionId || "") !== expected.sessionId ? "session_mismatch" : "",
        expected.scopeId && String(receipt?.scopeId || "") !== expected.scopeId ? "scope_id_mismatch" : "",
        receipt?.rawLedgerPreserved !== true ? "raw_ledger_preservation_missing" : "",
        String(receipt?.receiptChecksum || "") !== contentReplacementReceiptChecksum(receipt) ? "checksum_invalid" : "",
    ].filter(Boolean);
    return { valid: issues.length === 0, issues };
}
function normalizeProjectedMessage(message, index) {
    return {
        id: messageId(message, index),
        role: String(message?.role || "user") === "assistant" ? "assistant" : "user",
        content: sessionModelMessageContent(message),
        timestamp: String(message?.timestamp || message?.created_at || message?.createdAt || ""),
        type: String(message?.type || "message"),
        hidden_execution: message?.hidden_execution === true,
        tool_call_id: String(message?.tool_call_id || ""),
        tool_name: String(message?.tool_name || ""),
    };
}
function renderProjection(input, projection) {
    const label = input.heading || (input.scope === "group" ? "当前精确群聊会话连续性" : input.scope === "project" ? "当前精确项目会话连续性" : "当前精确全局会话连续性");
    return [
        `【${label}】`,
        `- scope=${input.scopeId || input.sessionId}`,
        `- mode=${projection.mode}`,
        "- raw_transcript_preserved=true；会话按完整轮次投影，不使用字符截断。",
        projection.canonicalSummary
            ? `- 正式摘要来源=${projection.summarySource || "model"}；boundary_generation=${projection.boundaryGeneration}`
            : "- 尚未发生正式模型压缩，以下包含当前精确会话全部完整轮次。",
        `- current_request_deduplicated=${projection.currentRequestDeduplicated === true}`,
        projection.taskProjection?.currentTaskId ? `- current_task_id=${projection.taskProjection.currentTaskId}；当前任务区间保持完整可见。` : "",
        projection.taskProjection?.priorTaskSummaries?.length ? `\n【之前任务安全摘要】\n${JSON.stringify(projection.taskProjection.priorTaskSummaries, null, 2)}` : "",
        projection.canonicalSummary && projection.summaryPlacement !== "after_preserved"
            ? `\n【正式模型摘要】\n${JSON.stringify(projection.summary, null, 2)}`
            : "",
        projection.visibleMessagesBeforeSummary?.length
            ? `\n【局部压缩前保留原文 · ${projection.visibleMessagesBeforeSummary.length} 条】\n${JSON.stringify(projection.visibleMessagesBeforeSummary)}`
            : "",
        projection.canonicalSummary && projection.summaryPlacement === "after_preserved"
            ? `\n【正式模型摘要】\n${JSON.stringify(projection.summary, null, 2)}`
            : "",
        projection.sessionStartHookText
            ? `\n【SessionStart Hook 恢复上下文 · 仅本轮】\n${projection.sessionStartHookText}`
            : "",
        `\n【${projection.canonicalSummary ? "压缩后保留原文" : "压缩前完整会话原文"} · ${projection.visibleMessagesAfterSummary.length}/${projection.historyMessageCount} 条】\n${JSON.stringify(projection.visibleMessagesAfterSummary)}`,
    ].filter(Boolean).join("\n");
}
function buildUnifiedSessionModelContextProjection(input) {
    const sessionId = String(input.sessionId || "").trim();
    if (!sessionId)
        throw new Error("exact_session_required_for_model_context");
    const taskProjectionInput = (0, task_aware_session_projection_1.buildTaskAwareSessionProjection)({ messages: Array.isArray(input.messages) ? input.messages : [], sessionTaskIndex: input.sessionTaskIndex, currentTaskId: input.currentTaskId || input.taskContext?.taskId });
    const allMessages = taskProjectionInput.messages
        .filter(message => ["user", "assistant"].includes(String(message?.role || "")))
        .filter(message => message?.modelVisible !== false && message?.model_visible !== false)
        .filter(message => !["local_command", "command_result"].includes(String(message?.type || "")));
    const pending = excludePendingRequest(allMessages, input.currentRequest);
    const history = pending.messages;
    const canonicalSummary = input.canonicalSummary != null;
    const hookExactSessionId = input.scope === "project"
        ? String(input.scopeId || sessionId).replace("::", ":")
        : input.scope === "group" && String(input.scopeId || "").includes("::")
            ? String(input.scopeId).replace("::", ":")
            : sessionId;
    const sessionStartHook = input.consumeSessionStartHookContext === true
        ? (0, session_start_hook_context_1.takeSessionStartHookContext)(input.scope, hookExactSessionId, Math.max(0, Number(input.boundaryGeneration || 0)))
        : null;
    const partial = canonicalSummary && input.partialCompaction?.schema === "ccm-partial-compaction-projection-v2"
        ? input.partialCompaction
        : null;
    const floorIndex = canonicalSummary ? Math.max(0, Number(input.summarizedThroughIndex ?? -1) + 1) : 0;
    const recentWindow = canonicalSummary && !partial ? (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(history, {
        floorIndex,
        lastSummarizedMessageId: String(input.lastSummarizedMessageId || ""),
    }) : {
        startIndex: 0,
        preservedTokenCount: history.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(sessionModelMessageContent(message)), 0),
        preservedMessageCount: history.length,
        preservedTextMessageCount: history.filter(message => sessionModelMessageContent(message).trim()).length,
    };
    const summarizedIds = new Set((partial?.summarizedMessageIds || []).map(String));
    const preservedIds = new Set((partial?.preservedMessageIds || []).map(String));
    const indexedHistory = history.map((message, index) => ({ message, id: messageId(message, index) }));
    const archivedConversation = partial
        ? indexedHistory.filter(item => summarizedIds.has(item.id)).map(item => item.message)
        : canonicalSummary ? history.slice(recentWindow.startIndex) : [];
    const preservedConversation = partial
        ? indexedHistory.filter(item => preservedIds.has(item.id)).map(item => item.message)
        : canonicalSummary ? history.slice(recentWindow.startIndex) : history;
    // Messages appended after a partial boundary are never consumed by the old
    // summary. They remain visible after the summary in both directions.
    const postBoundaryConversation = partial
        ? indexedHistory.filter(item => !summarizedIds.has(item.id) && !preservedIds.has(item.id)).map(item => item.message)
        : [];
    const visibleConversation = [...preservedConversation, ...postBoundaryConversation];
    const visibleIds = new Set(visibleConversation.map((message, index) => messageId(message, index)));
    const archiveIds = new Set(archivedConversation.map((message, index) => messageId(message, index)));
    const events = Array.isArray(input.executionEvents) ? input.executionEvents : [];
    const visibleEvents = events.filter(event => visibleIds.has(String(event.anchorMessageId || "")));
    const archivedEvents = events.filter(event => archiveIds.has(String(event.anchorMessageId || "")));
    // Model-context projection is deliberately lossless. Tool-result retirement
    // now has a single owner: the V2 pre-request state machine after the final
    // Provider payload has been assembled and measured. These V1 receipts remain
    // as inert shapes so historical pages can still render old records.
    const selectedMicroCompact = {
        schema: "ccm-session-microcompact-receipt-v1",
        applied: false,
        trigger: "none",
        reason: "legacy_runtime_retired",
        gapMinutes: 0,
        gapThresholdMinutes: 0,
        keepRecent: 0,
        clearedToolCallIds: [],
        clearedResultTokens: 0,
        rawLedgerPreserved: true,
    };
    const microCompactCore = {
        ...selectedMicroCompact,
        scope: input.scope,
        scopeId: String(input.scopeId || sessionId),
        sessionId,
        evaluatedAt: new Date(input.microCompact?.now || Date.now()).toISOString(),
    };
    const microCompact = { ...microCompactCore, receiptChecksum: sessionModelMicroCompactReceiptChecksum(microCompactCore) };
    const contentReplacementCore = {
        schema: "ccm-session-tool-result-content-replacement-v1",
        applied: false,
        reason: "legacy_runtime_retired",
        maxResultTokens: 0,
        keepRecent: 0,
        rawLedgerPreserved: true,
        replacements: [],
        scope: input.scope,
        scopeId: String(input.scopeId || sessionId),
        sessionId,
        evaluatedAt: new Date(input.microCompact?.now || Date.now()).toISOString(),
    };
    delete contentReplacementCore.receiptChecksum;
    const contentReplacement = {
        ...contentReplacementCore,
        receiptChecksum: contentReplacementReceiptChecksum(contentReplacementCore),
    };
    const mergedVisibleMessages = (0, session_execution_ledger_1.mergeConversationWithExecution)(visibleConversation, visibleEvents)
        .map(normalizeProjectedMessage);
    const archiveMessages = (0, session_execution_ledger_1.mergeConversationWithExecution)(archivedConversation, archivedEvents)
        .map(normalizeProjectedMessage);
    const preservedMessageIdSet = new Set((partial?.preservedMessageIds || []).map(String));
    const visibleMessagesBeforeSummary = partial?.summaryPlacement === "after_preserved"
        ? mergedVisibleMessages.filter(message => preservedMessageIdSet.has(String(message.id || "")) || (message.hidden_execution === true && preservedMessageIdSet.has(String(visibleEvents.find(event => event.toolCallId === message.tool_call_id)?.anchorMessageId || ""))))
        : [];
    const beforeIds = new Set(visibleMessagesBeforeSummary.map(message => String(message.id || "")));
    const beforeToolIds = new Set(visibleMessagesBeforeSummary.map(message => String(message.tool_call_id || "")).filter(Boolean));
    const visibleMessagesAfterSummary = partial?.summaryPlacement === "after_preserved"
        ? mergedVisibleMessages.filter(message => !beforeIds.has(String(message.id || "")) && !beforeToolIds.has(String(message.tool_call_id || "")))
        : mergedVisibleMessages;
    const visibleMessages = [...visibleMessagesBeforeSummary, ...visibleMessagesAfterSummary];
    const toolUses = visibleMessages.filter(message => message.type === "tool_use").map(message => message.tool_call_id);
    const toolResults = new Set(visibleMessages.filter(message => message.type === "tool_result").map(message => message.tool_call_id));
    const projection = {
        schema: "ccm-unified-session-model-context-v1",
        version: 1,
        scope: input.scope,
        scopeId: String(input.scopeId || sessionId),
        sessionId,
        mode: partial
            ? partial.direction === "from" ? "partial_raw_summary_new_raw" : "partial_summary_recent_raw"
            : canonicalSummary ? "canonical_summary_recent_raw" : "precompact_full_raw",
        canonicalSummary,
        summary: input.canonicalSummary ?? null,
        summarySource: canonicalSummary ? String(input.summarySource || "model") : "",
        summaryChecksum: canonicalSummary ? String(input.summaryChecksum || "") : "",
        boundaryGeneration: Math.max(0, Number(input.boundaryGeneration || 0)),
        currentRequestDeduplicated: pending.deduplicated,
        historyMessageCount: allMessages.length,
        conversationMessageCount: history.length,
        executionMessageCount: events.length,
        visibleMessages,
        visibleMessagesBeforeSummary,
        visibleMessagesAfterSummary,
        archiveMessages,
        partialCompaction: partial,
        sessionStartHookContext: sessionStartHook?.projection || null,
        sessionStartHookText: sessionStartHook?.text || "",
        summaryPlacement: partial?.summaryPlacement || "before_preserved",
        visibleMessageTokens: visibleMessages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(message.content), 0),
        archiveMessageTokens: archiveMessages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(message.content), 0),
        recentWindow,
        microCompact,
        contentReplacement,
        postTurnToolContextCompaction: {
            receipts: [],
            evidence: [],
            compactedToolCallIds: [],
            preservedToolCallIds: [],
            compatibilityOnly: true,
            contentStored: false,
        },
        preRequestToolContextEvaluation: null,
        contextRetentionMetrics: null,
        completeTurnProjection: true,
        taskProjection: {
            currentTaskId: String(input.currentTaskId || input.taskContext?.taskId || ""),
            currentTaskContextChecksum: String(input.taskContext?.checksum || ""),
            currentTaskSpanChecksum: String(input.taskContext?.timelineSpans?.find((span) => span.taskId === String(input.currentTaskId || input.taskContext?.taskId || ""))?.checksum || ""),
            priorTaskSummaries: input.sessionTaskIndex ? (0, session_task_timeline_1.projectPriorTaskSummaries)(input.sessionTaskIndex, String(input.currentTaskId || input.taskContext?.taskId || "")) : [],
            currentTaskMessageIds: taskProjectionInput.currentTaskMessageIds,
            priorTaskMessageIds: taskProjectionInput.priorTaskMessageIds,
            currentTaskFullTimeline: Boolean(input.currentTaskId || input.taskContext?.taskId),
            contentStored: false,
        },
        toolPairInvariant: {
            valid: toolUses.every(id => toolResults.has(id)),
            toolUseCount: toolUses.length,
            toolResultCount: toolResults.size,
        },
        transcriptChecksum: crypto.createHash("sha256").update(JSON.stringify([
            ...history.map((message, index) => [messageId(message, index), message?.role, sessionModelMessageContent(message)]),
            ...events.map(event => [event.id, event.type, event.toolCallId, event.payload]),
        ])).digest("hex"),
    };
    const unifiedPolicy = (0, unified_session_compaction_1.resolveUnifiedCompactionPolicy)({}, { microCompactEnabled: false, idleAssistEnabled: false });
    projection.unifiedCompaction = (0, unified_session_compaction_1.buildUnifiedCompactionReceipt)({
        scope: input.scope,
        exactSessionId: sessionId,
        stage: microCompact.applied ? "microcompact" : canonicalSummary ? "post_gate" : "idle",
        beforeTokens: projection.visibleMessageTokens + projection.archiveMessageTokens,
        afterTokens: projection.visibleMessageTokens,
        microCompactApplied: microCompact.applied,
        microCompactTrigger: microCompact.trigger === "context_pressure" ? "pressure" : microCompact.applied ? "idle" : "none",
        summarySource: canonicalSummary ? "reused" : "none",
        gateStatus: "ready",
        boundaryGeneration: projection.boundaryGeneration,
        summaryChecksum: projection.summaryChecksum,
    });
    projection.unifiedCompaction.policy = unifiedPolicy;
    projection.rendered = renderProjection(input, projection);
    projection.renderedTokens = (0, context_budget_1.estimateTextTokens)(projection.rendered);
    return projection;
}
function runUnifiedSessionModelContextSelfTest() {
    const messages = [
        { id: "u1", role: "user", content: "第一轮", timestamp: "2026-01-01T00:00:00.000Z" },
        { id: "a1", role: "assistant", content: "第一轮回复", timestamp: "2026-01-01T00:00:01.000Z" },
        { id: "u2", role: "user", content: "第二轮", timestamp: "2026-01-01T00:00:02.000Z" },
        { id: "a2", role: "assistant", content: "第二轮回复", timestamp: "2026-01-01T00:00:03.000Z" },
    ];
    const executionEvents = Array.from({ length: 6 }, (_, index) => {
        const toolCallId = `tool-${index + 1}`;
        const base = {
            runId: "run-1",
            traceId: "trace-1",
            anchorMessageId: "u1",
            hidden: true,
            toolCallId,
            toolName: "read_file",
        };
        return [
            { ...base, id: `use-${index + 1}`, type: "tool_use", status: "running", timestamp: `2026-01-01T00:00:${10 + index * 2}.000Z`, payload: { path: `src/${index}.ts` } },
            { ...base, id: `result-${index + 1}`, type: "tool_result", status: "ok", timestamp: `2026-01-01T00:00:${11 + index * 2}.000Z`, payload: { content: `result-${index + 1}` } },
        ];
    }).flat();
    const raw = buildUnifiedSessionModelContextProjection({ scope: "project", sessionId: "p:s", messages });
    const fresh = buildUnifiedSessionModelContextProjection({
        scope: "project",
        sessionId: "p:s",
        messages,
        executionEvents,
        microCompact: { enabled: true, trigger: "auto", mainThread: true, now: "2026-01-01T00:30:00.000Z", gapThresholdMinutes: 60, keepRecent: 5 },
    });
    const old = buildUnifiedSessionModelContextProjection({
        scope: "project",
        sessionId: "p:s",
        messages,
        executionEvents,
        microCompact: { enabled: true, trigger: "auto", mainThread: true, now: "2026-01-01T02:00:00.000Z", gapThresholdMinutes: 60, keepRecent: 5 },
    });
    const pressured = buildUnifiedSessionModelContextProjection({
        scope: "project",
        sessionId: "p:s",
        messages,
        executionEvents,
        microCompact: { enabled: true, trigger: "auto", mainThread: true, now: "2026-01-01T00:30:00.000Z", contextPressureEnabled: true, contextTokens: 900, pressureThresholdTokens: 1_000, keepRecent: 5 },
    });
    const largeExecutionEvents = executionEvents.map(event => event.id === "result-1"
        ? { ...event, payload: { content: "large-result-sentinel-".repeat(6_000) } }
        : event);
    const replaced = buildUnifiedSessionModelContextProjection({
        scope: "project",
        sessionId: "p:s",
        messages,
        executionEvents: largeExecutionEvents,
        contentReplacement: { enabled: true, maxResultTokens: 2_000, keepRecent: 5 },
    });
    const checks = {
        precompactKeepsEveryTurn: raw.visibleMessages.length === messages.length,
        precompactUsesNoCharacterCut: raw.visibleMessages[0].content === "第一轮",
        microCompactDisabledByDefault: raw.microCompact.applied === false,
        exactScopeBound: raw.scopeId === "p:s" && raw.sessionId === "p:s",
        tokenAccountingPresent: raw.visibleMessageTokens > 0 && raw.renderedTokens >= raw.visibleMessageTokens,
        freshToolResultsRemainRaw: fresh.microCompact.applied === false && fresh.visibleMessages.some(message => message.content.includes("result-1")),
        timeGapDoesNotCompactToolResults: old.microCompact.applied === false
            && old.visibleMessages.some(message => message.content.includes("result-1"))
            && old.visibleMessages.some(message => message.content.includes("result-6")),
        projectorPressureDoesNotCompactToolResults: pressured.microCompact.applied === false
            && pressured.visibleMessages.some(message => message.content.includes("result-1")),
        largeToolResultStaysRawUntilPreRequestPressure: replaced.contentReplacement.applied === false
            && replaced.contentReplacement.replacements.length === 0
            && replaced.visibleMessages.some(message => message.content.includes("large-result-sentinel"))
            && String(largeExecutionEvents.find(event => event.id === "result-1")?.payload?.content || "").includes("large-result-sentinel"),
        contentReplacementReceiptVerifies: verifySessionModelContentReplacementReceipt(replaced.contentReplacement, {
            scope: "project",
            sessionId: "p:s",
        }).valid === true,
        toolPairsStayBound: old.toolPairInvariant.valid === true,
        configuredPolicyCanDisableMicroCompact: resolveSessionModelMicroCompactPolicy({ timeBasedMicrocompactEnabled: false }).enabled === false,
        legacyConfigCannotReactivateMicroCompact: (() => {
            const policy = resolveSessionModelMicroCompactPolicy({
                timeBasedMicrocompactEnabled: true,
                timeBasedMicrocompactGapMinutes: 90,
                timeBasedMicrocompactKeepRecent: 8,
            });
            return policy.enabled === false;
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=session-model-context.js.map