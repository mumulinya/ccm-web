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
const tool_result_storage_1 = require("../tools/tool-result-storage");
function resolveSessionModelMicroCompactPolicy(config = {}, overrides = {}) {
    const configuredEnabled = config?.timeBasedMicrocompactEnabled ?? config?.time_based_microcompact_enabled;
    const configuredGap = config?.timeBasedMicrocompactGapMinutes ?? config?.time_based_microcompact_gap_minutes;
    const configuredKeepRecent = config?.timeBasedMicrocompactKeepRecent ?? config?.time_based_microcompact_keep_recent;
    return {
        enabled: overrides.enabled ?? configuredEnabled === true,
        trigger: overrides.trigger || "time_based",
        mainThread: overrides.mainThread ?? true,
        gapThresholdMinutes: Math.max(1, Number(overrides.gapThresholdMinutes ?? configuredGap ?? 60)),
        keepRecent: Math.max(1, Number(overrides.keepRecent ?? configuredKeepRecent ?? 5)),
        contextTokens: Math.max(0, Number(overrides.contextTokens || 0)),
        pressureThresholdTokens: Math.max(0, Number(overrides.pressureThresholdTokens || 0)),
        contextPressureEnabled: false,
        now: overrides.now,
    };
}
const CC_TIME_BASED_CLEARED_MESSAGE = "[Old tool result content cleared]";
const CC_COMPACTABLE_TOOL = /(?:^|[_-])(?:read|shell|bash|command|grep|glob|search|fetch|edit|write|inspect|list|query)(?:$|[_-])|^invoke_mcp$/i;
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
function completedCompactableToolCalls(events) {
    const uses = new Map();
    const results = new Map();
    for (const event of events) {
        if (!event.toolCallId || !CC_COMPACTABLE_TOOL.test(String(event.toolName || "")))
            continue;
        if (event.type === "tool_use")
            uses.set(event.toolCallId, event);
        else
            results.set(event.toolCallId, event);
    }
    return [...results.values()]
        .filter(result => uses.has(result.toolCallId))
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}
function selectTimeBasedMicroCompact(events, messages, policy = {}) {
    const receipt = {
        schema: "ccm-session-microcompact-receipt-v1",
        applied: false,
        trigger: "none",
        reason: "disabled",
        gapMinutes: 0,
        gapThresholdMinutes: Math.max(1, Number(policy.gapThresholdMinutes || 60)),
        keepRecent: Math.max(1, Number(policy.keepRecent || 5)),
        clearedToolCallIds: [],
        clearedResultTokens: 0,
        rawLedgerPreserved: true,
    };
    if (policy.enabled !== true)
        return receipt;
    if (!policy.trigger || !["time_based", "context_pressure", "auto"].includes(policy.trigger) || policy.mainThread !== true) {
        return { ...receipt, reason: "main_thread_supported_trigger_required" };
    }
    const lastAssistant = [...messages].reverse().find(message => String(message?.role || "") === "assistant");
    const assistantAt = Date.parse(String(lastAssistant?.timestamp || lastAssistant?.created_at || lastAssistant?.createdAt || ""));
    const now = policy.now instanceof Date ? policy.now.getTime() : new Date(policy.now || Date.now()).getTime();
    const gapMinutes = Number.isFinite(assistantAt) ? Math.max(0, (now - assistantAt) / 60_000) : 0;
    const timeTriggered = ["time_based", "auto"].includes(policy.trigger)
        && Number.isFinite(assistantAt)
        && gapMinutes >= receipt.gapThresholdMinutes;
    const contextTokens = Math.max(0, Number(policy.contextTokens || 0));
    const pressureThresholdTokens = Math.max(0, Number(policy.pressureThresholdTokens || 0));
    // CC only clears ordinary projected tool results after a cold-cache time gap.
    // Context pressure belongs to formal compaction unless a Provider performs
    // genuine native cache edits, which this content projector never emulates.
    const pressureRequested = ["context_pressure", "auto"].includes(policy.trigger)
        && policy.contextPressureEnabled === true
        && pressureThresholdTokens > 0
        && contextTokens >= Math.floor(pressureThresholdTokens * 0.9);
    const pressureTriggered = false;
    if (!timeTriggered && !pressureTriggered) {
        return {
            ...receipt,
            reason: pressureRequested && !timeTriggered
                ? "context_pressure_requires_formal_compaction"
                : !Number.isFinite(assistantAt) ? "trigger_evidence_missing" : "trigger_below_threshold",
            gapMinutes,
        };
    }
    const completed = completedCompactableToolCalls(events);
    const clear = completed.slice(0, Math.max(0, completed.length - receipt.keepRecent));
    if (!clear.length)
        return { ...receipt, reason: "no_old_completed_tool_results", gapMinutes };
    return {
        ...receipt,
        applied: true,
        trigger: timeTriggered ? "time_based" : "context_pressure",
        reason: timeTriggered ? "cold_prompt_cache_old_tool_results" : "context_pressure_old_tool_results",
        gapMinutes,
        clearedToolCallIds: clear.map(event => event.toolCallId),
        clearedResultTokens: clear.reduce((sum, event) => sum + (0, context_budget_1.estimateTextTokens)(JSON.stringify(event.payload ?? null)), 0),
    };
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
function selectRecoverableToolResultReplacements(events, policy = {}) {
    const maxResultTokens = Math.max(2_000, Number(policy.maxResultTokens || 20_000));
    const keepRecent = Math.max(1, Number(policy.keepRecent || 5));
    const base = {
        schema: "ccm-session-tool-result-content-replacement-v1",
        applied: false,
        reason: policy.enabled === false ? "disabled" : "no_eligible_old_large_tool_results",
        maxResultTokens,
        keepRecent,
        rawLedgerPreserved: true,
        replacements: [],
    };
    if (policy.enabled === false)
        return { receipt: { ...base, receiptChecksum: contentReplacementReceiptChecksum(base) }, replacements: new Map() };
    const completed = completedCompactableToolCalls(events);
    const protectedIds = new Set(completed.slice(-keepRecent).map(event => event.toolCallId));
    const replacementMap = new Map();
    for (const event of completed) {
        if (protectedIds.has(event.toolCallId))
            continue;
        if ((0, tool_result_storage_1.isPersistedToolResult)(event.payload) || (0, tool_result_storage_1.isPersistedToolResult)(event.payload?.observation))
            continue;
        const raw = JSON.stringify(event.payload ?? null);
        const rawTokens = (0, context_budget_1.estimateTextTokens)(raw);
        if (rawTokens <= maxResultTokens)
            continue;
        const checksum = crypto.createHash("sha256").update(raw).digest("hex");
        const head = raw.slice(0, 1800);
        const tail = raw.slice(-900);
        const locator = `execution-ledger:${event.id}`;
        const text = [
            `[Large old tool result replaced in model projection; raw result retained and recoverable]`,
            `tool_call_id=${event.toolCallId}; raw_tokens=${rawTokens}; checksum=${checksum}; locator=${locator}`,
            head,
            "...[middle content omitted from projection]...",
            tail,
        ].join("\n");
        replacementMap.set(event.toolCallId, text);
        base.replacements.push({
            toolCallId: event.toolCallId,
            eventId: event.id,
            toolName: event.toolName,
            rawTokens,
            projectedTokens: (0, context_budget_1.estimateTextTokens)(text),
            projectedText: text,
            checksum,
            locator,
        });
    }
    base.applied = base.replacements.length > 0;
    base.reason = base.applied ? "old_large_completed_tool_results_replaced" : base.reason;
    return {
        receipt: { ...base, receiptChecksum: contentReplacementReceiptChecksum(base) },
        replacements: replacementMap,
    };
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
        projection.microCompact.applied
            ? `- CC MicroCompact=${projection.microCompact.trigger}；仅清理 ${projection.microCompact.clearedToolCallIds.length} 个已完成旧工具结果，原始执行账本仍完整保留。`
            : "- CC MicroCompact=not_applied。",
        projection.contentReplacement?.applied
            ? `- Tool result content replacement=applied；替换 ${projection.contentReplacement.replacements.length} 个旧且超大的结果，均可由账本定位恢复。`
            : "- Tool result content replacement=not_applied。",
        projection.canonicalSummary ? `\n【正式模型摘要】\n${JSON.stringify(projection.summary, null, 2)}` : "",
        `\n【${projection.canonicalSummary ? "压缩后近期完整原文" : "压缩前完整会话原文"} · ${projection.visibleMessages.length}/${projection.historyMessageCount} 条】\n${JSON.stringify(projection.visibleMessages)}`,
    ].filter(Boolean).join("\n");
}
function buildUnifiedSessionModelContextProjection(input) {
    const sessionId = String(input.sessionId || "").trim();
    if (!sessionId)
        throw new Error("exact_session_required_for_model_context");
    const allMessages = (Array.isArray(input.messages) ? input.messages : [])
        .filter(message => ["user", "assistant"].includes(String(message?.role || "")))
        .filter(message => message?.modelVisible !== false && message?.model_visible !== false)
        .filter(message => !["local_command", "command_result"].includes(String(message?.type || "")));
    const pending = excludePendingRequest(allMessages, input.currentRequest);
    const history = pending.messages;
    const canonicalSummary = input.canonicalSummary != null;
    const floorIndex = canonicalSummary ? Math.max(0, Number(input.summarizedThroughIndex ?? -1) + 1) : 0;
    const recentWindow = canonicalSummary ? (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(history, {
        floorIndex,
        lastSummarizedMessageId: String(input.lastSummarizedMessageId || ""),
    }) : {
        startIndex: 0,
        preservedTokenCount: history.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(sessionModelMessageContent(message)), 0),
        preservedMessageCount: history.length,
        preservedTextMessageCount: history.filter(message => sessionModelMessageContent(message).trim()).length,
    };
    const visibleConversation = canonicalSummary ? history.slice(recentWindow.startIndex) : history;
    const archivedConversation = canonicalSummary ? history.slice(0, recentWindow.startIndex) : [];
    const visibleIds = new Set(visibleConversation.map((message, index) => messageId(message, index)));
    const archiveIds = new Set(archivedConversation.map((message, index) => messageId(message, index)));
    const events = Array.isArray(input.executionEvents) ? input.executionEvents : [];
    const visibleEvents = events.filter(event => visibleIds.has(String(event.anchorMessageId || "")));
    const archivedEvents = events.filter(event => archiveIds.has(String(event.anchorMessageId || "")));
    const selectedMicroCompact = selectTimeBasedMicroCompact(visibleEvents, visibleConversation, input.microCompact);
    const microCompactCore = {
        ...selectedMicroCompact,
        scope: input.scope,
        scopeId: String(input.scopeId || sessionId),
        sessionId,
        evaluatedAt: new Date(input.microCompact?.now || Date.now()).toISOString(),
    };
    const microCompact = { ...microCompactCore, receiptChecksum: sessionModelMicroCompactReceiptChecksum(microCompactCore) };
    const clearedToolCallIds = new Set(microCompact.clearedToolCallIds);
    const replacementSelection = selectRecoverableToolResultReplacements(visibleEvents.filter(event => !clearedToolCallIds.has(event.toolCallId)), input.contentReplacement);
    const contentReplacementCore = {
        ...replacementSelection.receipt,
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
    const visibleMessages = (0, session_execution_ledger_1.mergeConversationWithExecution)(visibleConversation, visibleEvents, {
        clearedToolCallIds,
        replacedToolResults: replacementSelection.replacements,
    })
        .map(normalizeProjectedMessage);
    const archiveMessages = (0, session_execution_ledger_1.mergeConversationWithExecution)(archivedConversation, archivedEvents)
        .map(normalizeProjectedMessage);
    const toolUses = visibleMessages.filter(message => message.type === "tool_use").map(message => message.tool_call_id);
    const toolResults = new Set(visibleMessages.filter(message => message.type === "tool_result").map(message => message.tool_call_id));
    const projection = {
        schema: "ccm-unified-session-model-context-v1",
        version: 1,
        scope: input.scope,
        scopeId: String(input.scopeId || sessionId),
        sessionId,
        mode: canonicalSummary ? "canonical_summary_recent_raw" : "precompact_full_raw",
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
        archiveMessages,
        visibleMessageTokens: visibleMessages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(message.content), 0),
        archiveMessageTokens: archiveMessages.reduce((sum, message) => sum + (0, context_budget_1.estimateTextTokens)(message.content), 0),
        recentWindow,
        microCompact,
        contentReplacement,
        completeTurnProjection: true,
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
        oldCompletedToolResultClearedSelectively: old.microCompact.applied === true
            && old.microCompact.clearedToolCallIds.length === 1
            && old.visibleMessages.some(message => message.content.includes(CC_TIME_BASED_CLEARED_MESSAGE))
            && old.visibleMessages.some(message => message.content.includes("result-6")),
        pressureTriggerDefersToFormalCompaction: pressured.microCompact.applied === false
            && pressured.microCompact.reason === "context_pressure_requires_formal_compaction",
        oldLargeToolResultReplacedRecoverably: replaced.contentReplacement.applied === true
            && replaced.contentReplacement.replacements.length === 1
            && replaced.visibleMessages.some(message => message.content.includes("raw result retained and recoverable"))
            && String(largeExecutionEvents.find(event => event.id === "result-1")?.payload?.content || "").includes("large-result-sentinel"),
        contentReplacementReceiptVerifies: verifySessionModelContentReplacementReceipt(replaced.contentReplacement, {
            scope: "project",
            sessionId: "p:s",
        }).valid === true,
        toolPairsStayBound: old.toolPairInvariant.valid === true,
        configuredPolicyCanDisableMicroCompact: resolveSessionModelMicroCompactPolicy({ timeBasedMicrocompactEnabled: false }).enabled === false,
        configuredPolicyControlsTimeAndRetention: (() => {
            const policy = resolveSessionModelMicroCompactPolicy({
                timeBasedMicrocompactEnabled: true,
                timeBasedMicrocompactGapMinutes: 90,
                timeBasedMicrocompactKeepRecent: 8,
            });
            return policy.enabled === true && policy.gapThresholdMinutes === 90 && policy.keepRecent === 8;
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=session-model-context.js.map