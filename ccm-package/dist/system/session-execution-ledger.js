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
exports.sanitizeSessionExecutionValue = sanitizeSessionExecutionValue;
exports.createSessionExecutionEvent = createSessionExecutionEvent;
exports.executionEventModelContent = executionEventModelContent;
exports.executionEventToModelMessage = executionEventToModelMessage;
exports.normalizeSessionExecutionEvents = normalizeSessionExecutionEvents;
exports.findPendingToolCallId = findPendingToolCallId;
exports.eventsAnchoredToMessages = eventsAnchoredToMessages;
exports.mergeConversationWithExecution = mergeConversationWithExecution;
exports.runSessionExecutionLedgerSelfTest = runSessionExecutionLedgerSelfTest;
const crypto = __importStar(require("crypto"));
const context_source_tool_result_projection_1 = require("./context-source-tool-result-projection");
const tool_result_storage_1 = require("../tools/tool-result-storage");
const SECRET_KEY = /(?:^|_)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)(?:$|_)/i;
const BINARY_KEY = /(?:^|_)(?:data|base64|bytes|image[_-]?data|file[_-]?data)(?:$|_)/i;
const DATA_URL = /data:(?:image|application\/pdf)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]{64,}/gi;
const INLINE_SECRET = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}
function sanitizeSessionExecutionValue(value, depth = 0, seen = new WeakSet()) {
    if (depth > 12)
        return "[depth-limited]";
    if (typeof value === "string")
        return value.replace(DATA_URL, "[binary-media]").replace(INLINE_SECRET, "$1[redacted]");
    if (value == null || typeof value !== "object")
        return value;
    if (seen.has(value))
        return "[circular]";
    seen.add(value);
    if (Buffer.isBuffer(value) || value instanceof Uint8Array)
        return `[binary:${value.byteLength}]`;
    if (Array.isArray(value))
        return value.map(item => sanitizeSessionExecutionValue(item, depth + 1, seen));
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
        if (SECRET_KEY.test(key))
            output[key] = "[redacted]";
        else if (BINARY_KEY.test(key) && (typeof nested === "string" || Buffer.isBuffer(nested) || nested instanceof Uint8Array))
            output[key] = "[binary-content]";
        else
            output[key] = sanitizeSessionExecutionValue(nested, depth + 1, seen);
    }
    return output;
}
function createSessionExecutionEvent(input) {
    const timestamp = String(input.timestamp || new Date().toISOString());
    const status = input.status === "error" ? "error" : input.type === "tool_use" ? "running" : "ok";
    const rawPayload = sanitizeSessionExecutionValue(input.type === "tool_result"
        ? (0, context_source_tool_result_projection_1.projectContextSourceToolResultForPersistence)(input.toolName, input.payload ?? null)
        : input.payload ?? null);
    const toolCallId = String(input.toolCallId || "") || `tc_${hash([String(input.runId || ""), String(input.toolName || "tool"), timestamp, input.type])}`;
    const payload = input.type === "tool_result"
        ? (0, tool_result_storage_1.persistPayloadObservation)({
            toolName: String(input.toolName || "tool"),
            toolCallId,
            payload: rawPayload,
            context: input.persistContext || null,
        })
        : rawPayload;
    return {
        type: input.type,
        toolName: String(input.toolName || "tool"),
        toolCallId,
        timestamp,
        runId: String(input.runId || ""),
        traceId: String(input.traceId || ""),
        anchorMessageId: String(input.anchorMessageId || ""),
        status,
        payload,
        id: String(input.id || `exec_${hash([toolCallId, input.type, timestamp])}`),
        hidden: true,
    };
}
function executionEventModelContent(event, options = {}) {
    const serialized = JSON.stringify(event.payload ?? null);
    if (event.type === "tool_use")
        return `[tool_use ${event.toolName} #${event.toolCallId}]\n${serialized}`;
    const persisted = (0, tool_result_storage_1.isPersistedToolResult)(event.payload)
        ? event.payload
        : (0, tool_result_storage_1.isPersistedToolResult)(event.payload?.observation)
            ? event.payload.observation
            : null;
    const projected = options.clearToolResult === true
        ? tool_result_storage_1.TOOL_RESULT_CLEARED_MESSAGE
        : persisted
            ? (0, tool_result_storage_1.modelVisiblePersistedToolResult)(persisted)
            : String(options.replacementText || serialized);
    return `[tool_result ${event.toolName} #${event.toolCallId} status=${event.status}]\n${projected}`;
}
function executionEventToModelMessage(event, options = {}) {
    return {
        id: event.id,
        role: event.type === "tool_use" ? "assistant" : "user",
        content: executionEventModelContent(event, options),
        timestamp: event.timestamp,
        type: event.type,
        tool_call_id: event.toolCallId,
        tool_name: event.toolName,
        hidden_execution: true,
        anchor_message_id: event.anchorMessageId,
    };
}
function normalizeSessionExecutionEvents(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter(item => item && ["tool_use", "tool_result"].includes(String(item.type || "")))
        .map(item => createSessionExecutionEvent({
        ...item,
        type: item.type,
        toolName: item.toolName || item.tool_name,
        toolCallId: item.toolCallId || item.tool_call_id,
        runId: item.runId || item.run_id,
        traceId: item.traceId || item.trace_id,
        anchorMessageId: item.anchorMessageId || item.anchor_message_id,
        payload: item.payload,
    }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
function findPendingToolCallId(events, runId, toolName) {
    const completed = new Set(events.filter(item => item.type === "tool_result").map(item => item.toolCallId));
    return [...events].reverse().find(item => item.type === "tool_use"
        && item.runId === runId
        && item.toolName === toolName
        && !completed.has(item.toolCallId))?.toolCallId || "";
}
function eventsAnchoredToMessages(events, messages) {
    const ids = new Set((messages || []).map(message => String(message?.id || message?.uuid || message?.messageId || "")).filter(Boolean));
    if (!ids.size)
        return [];
    return events.filter(event => ids.has(event.anchorMessageId));
}
function mergeConversationWithExecution(messages, events, options = {}) {
    return [
        ...(messages || []).map((message, index) => ({ ...message, __order: index * 2 })),
        ...events.map((event, index) => ({ ...executionEventToModelMessage(event, {
                clearToolResult: event.type === "tool_result" && options.clearedToolCallIds?.has(event.toolCallId) === true,
                replacementText: event.type === "tool_result" ? options.replacedToolResults?.get(event.toolCallId) : undefined,
            }), __order: index * 2 + 1 })),
    ].sort((left, right) => {
        const byTime = String(left.timestamp || "").localeCompare(String(right.timestamp || ""));
        return byTime || Number(left.__order || 0) - Number(right.__order || 0);
    }).map(({ __order, ...message }) => message);
}
function runSessionExecutionLedgerSelfTest() {
    const use = createSessionExecutionEvent({
        type: "tool_use",
        // Use an ordinary tool here so this self-test exercises the ledger sanitizer.
        // Workspace read tools intentionally persist only a rehydratable receipt and
        // therefore must not retain the raw payload tested below.
        toolName: "custom_tool",
        toolCallId: "tool-selftest",
        runId: "run-selftest",
        anchorMessageId: "user-1",
        timestamp: "2026-01-01T00:00:01.000Z",
        payload: { path: "src/app.ts", api_key: "should-not-survive" },
    });
    const result = createSessionExecutionEvent({
        type: "tool_result",
        toolName: "custom_tool",
        toolCallId: "tool-selftest",
        runId: "run-selftest",
        anchorMessageId: "user-1",
        timestamp: "2026-01-01T00:00:02.000Z",
        payload: { content: `data:image/png;base64,${"a".repeat(100)}\n${"source".repeat(3000)}` },
    });
    const conversation = [
        { id: "user-1", role: "user", content: "检查源码", timestamp: "2026-01-01T00:00:00.000Z" },
        { id: "assistant-1", role: "assistant", content: "已经检查。", timestamp: "2026-01-01T00:00:03.000Z" },
    ];
    const timeline = mergeConversationWithExecution(conversation, [use, result]);
    const checks = {
        secretRedacted: use.payload.api_key === "[redacted]",
        binaryReplaced: String(result.payload.content).includes("[binary-media]"),
        toolPairBound: use.toolCallId === result.toolCallId,
        toolRolesMatchCc: timeline[1]?.role === "assistant" && timeline[2]?.role === "user",
        hiddenFromVisibleTranscript: conversation.every((message) => message.hidden_execution !== true),
        recentResultPreservedRaw: String(timeline[2]?.content || "").includes("source".repeat(3000)),
        anchoredSelectionExact: eventsAnchoredToMessages([use, result], conversation.slice(0, 1)).length === 2,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=session-execution-ledger.js.map