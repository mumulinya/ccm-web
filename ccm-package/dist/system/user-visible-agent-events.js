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
exports.USER_VISIBLE_AGENT_RESULT_SCHEMA = exports.USER_VISIBLE_AGENT_EVENT_SCHEMA = void 0;
exports.sanitizeUserVisibleAgentDetail = sanitizeUserVisibleAgentDetail;
exports.normalizeUserVisibleAgentEvent = normalizeUserVisibleAgentEvent;
exports.appendUserVisibleAgentEvent = appendUserVisibleAgentEvent;
exports.listUserVisibleAgentEvents = listUserVisibleAgentEvents;
exports.subscribeUserVisibleAgentEvents = subscribeUserVisibleAgentEvents;
exports.publishEphemeralUserVisibleAgentEvent = publishEphemeralUserVisibleAgentEvent;
exports.buildUserVisibleAgentResult = buildUserVisibleAgentResult;
exports.appendToolProjection = appendToolProjection;
exports.clearUserVisibleAgentEventsForTest = clearUserVisibleAgentEventsForTest;
exports.runUserVisibleAgentEventSelfTest = runUserVisibleAgentEventSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
exports.USER_VISIBLE_AGENT_EVENT_SCHEMA = "ccm-user-visible-agent-event-v1";
exports.USER_VISIBLE_AGENT_RESULT_SCHEMA = "ccm-user-visible-agent-result-v1";
const STORE_ROOT = path.resolve(process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR || path.join(os.homedir(), ".cc-connect", "agent-execution-events"));
const MAX_EVENTS_PER_SESSION = 3_000;
const listeners = new Set();
const SECRET_KEY = /(?:^|_)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key)(?:$|_)/i;
const BODY_KEY = /^(?:prompt|systemPrompt|system_prompt|rawPrompt|raw_prompt|body|content|text|output|rawOutput|raw_output|context|sourceCode|source_code|webpage|html|notebookOutput|notebook_output)$/i;
const NATIVE_ID_KEY = /(?:native[_-]?session|provider[_-]?request[_-]?id|lease[_-]?id|trace[_-]?id)/i;
const INLINE_SECRET = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;
function now() { return new Date().toISOString(); }
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function compactText(value, max = 500) {
    return String(value ?? "")
        .replace(INLINE_SECRET, "$1[redacted]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
        .replace(/[\0\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, max);
}
function uniqueStrings(value, max = 100) {
    return [...new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(item => compactText(item, 500)).filter(Boolean))].slice(0, max);
}
function sanitizeUserVisibleAgentDetail(value, depth = 0, seen = new WeakSet()) {
    if (depth > 7)
        return "[depth-limited]";
    if (typeof value === "string")
        return compactText(value, 1_500);
    if (value == null || typeof value !== "object")
        return value;
    if (seen.has(value))
        return "[circular]";
    seen.add(value);
    if (Buffer.isBuffer(value) || value instanceof Uint8Array)
        return `[binary:${value.byteLength}]`;
    if (Array.isArray(value))
        return value.slice(0, 40).map(item => sanitizeUserVisibleAgentDetail(item, depth + 1, seen));
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
        if (SECRET_KEY.test(key))
            output[key] = "[redacted]";
        else if (BODY_KEY.test(key))
            output[`${key}Checksum`] = hash(nested).slice(0, 24);
        else if (NATIVE_ID_KEY.test(key))
            output[`${key}Checksum`] = hash(nested).slice(0, 24);
        else
            output[key] = sanitizeUserVisibleAgentDetail(nested, depth + 1, seen);
    }
    return output;
}
function normalizeScope(value) {
    const scope = String(value || "").toLowerCase();
    if (scope === "project" || scope === "group")
        return scope;
    return "global";
}
function eventStoreFile(scope, scopeId, exactSessionId) {
    const identity = `${scope}:${scopeId}:${exactSessionId}`;
    return path.join(STORE_ROOT, scope, `${hash(identity).slice(0, 32)}.json`);
}
function emptyStore(scope, scopeId, exactSessionId) {
    return {
        schema: "ccm-user-visible-agent-event-store-v1",
        revision: 0,
        scope,
        scopeId,
        exactSessionId,
        events: [],
        updatedAt: "",
        checksum: "",
    };
}
function storeChecksum(store) {
    const { checksum: _checksum, ...stable } = store;
    return hash(stable);
}
function readStore(scope, scopeId, exactSessionId) {
    const fallback = emptyStore(scope, scopeId, exactSessionId);
    const file = eventStoreFile(scope, scopeId, exactSessionId);
    const value = (0, atomic_json_file_1.readJsonWithBackup)(file, fallback);
    const store = {
        ...fallback,
        revision: Math.max(0, Number(value?.revision || 0)),
        events: Array.isArray(value?.events) ? value.events.filter((item) => item?.schema === exports.USER_VISIBLE_AGENT_EVENT_SCHEMA) : [],
        updatedAt: compactText(value?.updatedAt, 40),
        checksum: compactText(value?.checksum, 80),
    };
    if (store.checksum && store.checksum !== storeChecksum(store))
        return fallback;
    return store;
}
function toolPresentation(toolNameInput, args = {}) {
    const toolName = compactText(toolNameInput, 160) || "tool";
    const normalized = toolName.toLowerCase();
    const title = normalized.includes("find_definition") ? "Find definition"
        : normalized.includes("find_references") ? "Find references"
            : normalized.includes("find_implementations") ? "Find implementations"
                : normalized.includes("find_type_definition") ? "Find type definition"
                    : normalized.includes("incoming_calls") ? "Incoming calls"
                        : normalized.includes("outgoing_calls") ? "Outgoing calls"
                            : normalized.includes("diagnostic") ? "Diagnostics"
                                : /read_file|read_project_source|read_shared|read_knowledge/.test(normalized) ? "Read"
                                    : /grep|search|query_knowledge|workspace_symbols|document_symbols/.test(normalized) ? "Search"
                                        : normalized === "tool_search" ? "Tool search"
                                            : normalized === "invoke_skill" ? "Skill"
                                                : normalized.includes("dispatch") ? "Agent"
                                                    : normalized.includes("test_agent") ? "TestAgent"
                                                        : toolName;
    const target = compactText(args?.path || args?.file_path || args?.filePath || args?.symbol || args?.query || args?.pattern
        || args?.skill || args?.skill_name || args?.tool_name || args?.toolName || args?.work_item_id || args?.workItemId || "", 300);
    return { title, target };
}
function normalizeEventType(input) {
    const source = String(input || "").toLowerCase();
    if ([
        "turn_started", "thinking_status", "assistant_text_delta",
        "tool_started", "tool_progress", "tool_completed", "tool_failed",
        "agent_started", "agent_progress", "agent_completed", "agent_failed",
        "permission_required", "clarification_required", "context_compacted", "result",
    ].includes(source))
        return source;
    if (["tool_use", "tool_started"].includes(source))
        return "tool_started";
    if (["tool_result", "tool_completed"].includes(source))
        return "tool_completed";
    if (source === "tool_failed")
        return "tool_failed";
    if (source === "tool_activity" || source === "progress")
        return "tool_progress";
    if (source === "started")
        return "turn_started";
    if (["decision", "planning", "thinking"].includes(source))
        return "thinking_status";
    if (["clarification_required", "waiting_clarification"].includes(source))
        return "clarification_required";
    if (["waiting_confirmation", "permission_required"].includes(source))
        return "permission_required";
    if (["compacted", "context_compacted"].includes(source))
        return "context_compacted";
    if (["completed", "failed", "cancelled", "blocked", "result"].includes(source))
        return "result";
    if (source.startsWith("agent_"))
        return source;
    return "thinking_status";
}
function normalizeUserVisibleAgentEvent(input, sequence = 0) {
    const scope = normalizeScope(input?.scope);
    const scopeId = compactText(input?.scopeId || input?.scope_id || (scope === "global" ? "global" : ""), 240);
    const exactSessionId = compactText(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id, 240);
    if (!scopeId || !exactSessionId)
        throw new Error("用户可见Agent事件缺少精确作用域或会话身份");
    const toolName = input?.toolName || input?.tool_name || input?.tool?.name || input?.tool || "";
    const args = input?.arguments || input?.args || input?.tool?.arguments || input?.detail?.safeArguments || {};
    let eventType = normalizeEventType(input?.eventType || input?.event_type || input?.type);
    if (/dispatch|test_agent|skill_fork/i.test(String(toolName))) {
        if (eventType === "tool_started")
            eventType = "agent_started";
        if (eventType === "tool_progress")
            eventType = "agent_progress";
        if (eventType === "tool_completed")
            eventType = "agent_completed";
        if (eventType === "tool_failed")
            eventType = "agent_failed";
    }
    const presentation = toolPresentation(toolName, args);
    const status = input?.display?.status || (eventType.endsWith("_failed") ? "failed"
        : eventType.endsWith("_completed") || eventType === "context_compacted" || (eventType === "result" && !input?.error) ? "success"
            : ["permission_required", "clarification_required"].includes(eventType) ? "waiting" : "running");
    const createdAt = compactText(input?.createdAt || input?.created_at || input?.timestamp || input?.at, 40) || now();
    const display = {
        title: compactText(input?.display?.title || input?.title || presentation.title || "Agent", 200),
        ...(compactText(input?.display?.target || input?.target || presentation.target, 300) ? { target: compactText(input?.display?.target || input?.target || presentation.target, 300) } : {}),
        ...(compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 500) ? { summary: compactText(input?.display?.summary || input?.summary || input?.message || input?.error, 500) } : {}),
        status,
        ...(Number.isFinite(Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms)) ? { durationMs: Math.max(0, Number(input?.display?.durationMs ?? input?.durationMs ?? input?.duration_ms)) } : {}),
        ...(Number.isFinite(Number(input?.display?.toolUseCount ?? input?.toolUseCount ?? input?.tool_use_count)) ? { toolUseCount: Math.max(0, Number(input?.display?.toolUseCount ?? input?.toolUseCount ?? input?.tool_use_count)) } : {}),
        ...(Number.isFinite(Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens)) ? { tokenCount: Math.max(0, Number(input?.display?.tokenCount ?? input?.tokenCount ?? input?.token_count ?? input?.outputTokens)) } : {}),
    };
    const detailSource = input?.detail || {};
    const detail = {
        ...(args && Object.keys(args).length ? { safeArguments: sanitizeUserVisibleAgentDetail(args) } : {}),
        ...(detailSource.safeResult != null || input?.observation != null || input?.result != null
            ? { safeResult: sanitizeUserVisibleAgentDetail(detailSource.safeResult ?? input?.observation ?? input?.result) } : {}),
        ...(uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids).length
            ? { evidenceIds: uniqueStrings(detailSource.evidenceIds || input?.evidenceIds || input?.evidence_ids) } : {}),
        ...(Array.isArray(detailSource.fileChanges || input?.fileChanges || input?.file_changes)
            ? { fileChanges: sanitizeUserVisibleAgentDetail(detailSource.fileChanges || input?.fileChanges || input?.file_changes) } : {}),
        ...(detailSource.usage || input?.usage ? { usage: sanitizeUserVisibleAgentDetail(detailSource.usage || input?.usage) } : {}),
    };
    const stableIdentity = {
        scope, scopeId, exactSessionId, generation: Math.max(0, Number(input?.generation || 0)),
        taskId: input?.taskId || input?.task_id || "", workItemId: input?.workItemId || input?.work_item_id || "",
        toolCallId: input?.toolCallId || input?.tool_call_id || "", eventType, createdAt,
    };
    return {
        schema: exports.USER_VISIBLE_AGENT_EVENT_SCHEMA,
        eventId: compactText(input?.eventId || input?.event_id, 240) || `uve_${hash(stableIdentity).slice(0, 28)}`,
        sequence: Math.max(0, Number((input?.sequence ?? sequence) || 0)),
        eventType,
        scope,
        scopeId,
        exactSessionId,
        generation: Math.max(0, Number(input?.generation || 0)),
        ...(compactText(input?.taskId || input?.task_id, 240) ? { taskId: compactText(input?.taskId || input?.task_id, 240) } : {}),
        ...(compactText(input?.workItemId || input?.work_item_id, 240) ? { workItemId: compactText(input?.workItemId || input?.work_item_id, 240) } : {}),
        ...(compactText(input?.toolCallId || input?.tool_call_id, 240) ? { toolCallId: compactText(input?.toolCallId || input?.tool_call_id, 240) } : {}),
        ...(compactText(input?.parentEventId || input?.parent_event_id, 240) ? { parentEventId: compactText(input?.parentEventId || input?.parent_event_id, 240) } : {}),
        ...(compactText(input?.parallelGroupId || input?.parallel_group_id, 240) ? { parallelGroupId: compactText(input?.parallelGroupId || input?.parallel_group_id, 240) } : {}),
        display,
        ...(Object.keys(detail).length ? { detail } : {}),
        visibility: ["default", "transcript", "technical"].includes(String(input?.visibility)) ? input.visibility : "default",
        contentStored: false,
        createdAt,
    };
}
function appendUserVisibleAgentEvent(input) {
    const initial = normalizeUserVisibleAgentEvent(input);
    const file = eventStoreFile(initial.scope, initial.scopeId, initial.exactSessionId);
    let event = initial;
    let appended = false;
    (0, atomic_json_file_1.withFileLock)(file, () => {
        const store = readStore(initial.scope, initial.scopeId, initial.exactSessionId);
        const existing = store.events.find(item => item.eventId === initial.eventId);
        if (existing) {
            event = existing;
            return;
        }
        event = { ...initial, sequence: Math.max(store.revision, ...store.events.map(item => item.sequence), 0) + 1 };
        appended = true;
        store.events = [...store.events, event].slice(-MAX_EVENTS_PER_SESSION);
        store.revision = event.sequence;
        store.updatedAt = now();
        store.checksum = storeChecksum(store);
        (0, atomic_json_file_1.writeJsonAtomic)(file, store);
    });
    if (appended) {
        for (const listener of [...listeners]) {
            try {
                listener(event);
            }
            catch { }
        }
    }
    return event;
}
function listUserVisibleAgentEvents(filter) {
    const scope = normalizeScope(filter?.scope);
    const scopeId = compactText(filter?.scopeId || filter?.scope_id || (scope === "global" ? "global" : ""), 240);
    const exactSessionId = compactText(filter?.exactSessionId || filter?.exact_session_id || filter?.sessionId || filter?.session_id, 240);
    if (!scopeId || !exactSessionId)
        throw new Error("查询执行记录必须指定scope、scopeId和exactSessionId");
    const cursor = Math.max(0, Number(filter?.cursor || filter?.after || 0));
    const limit = Math.max(1, Math.min(500, Number(filter?.limit || 200)));
    const store = readStore(scope, scopeId, exactSessionId);
    const rows = store.events.filter(item => item.sequence > cursor).slice(0, limit);
    return {
        schema: "ccm-user-visible-agent-event-list-v1",
        events: rows,
        nextCursor: rows.at(-1)?.sequence || cursor,
        hasMore: store.events.some(item => item.sequence > (rows.at(-1)?.sequence || cursor)),
        contentStored: false,
    };
}
function subscribeUserVisibleAgentEvents(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler);
}
/** Live-only text/progress events. They deliberately bypass the projection store. */
function publishEphemeralUserVisibleAgentEvent(input) {
    const event = normalizeUserVisibleAgentEvent({ ...input, contentStored: false }, 0);
    for (const listener of [...listeners]) {
        try {
            listener(event);
        }
        catch { }
    }
    return event;
}
function buildUserVisibleAgentResult(input) {
    return {
        schema: exports.USER_VISIBLE_AGENT_RESULT_SCHEMA,
        status: compactText(input?.status, 80) || "success",
        text: compactText(input?.text || input?.reply || input?.summary, 4_000),
        durationMs: Math.max(0, Number(input?.durationMs || input?.duration_ms || 0)),
        modelDurationMs: Math.max(0, Number(input?.modelDurationMs || input?.duration_api_ms || 0)),
        turns: Math.max(0, Number(input?.turns || input?.numTurns || input?.num_turns || 0)),
        toolCalls: Math.max(0, Number(input?.toolCalls || input?.tool_calls || 0)),
        stopReason: compactText(input?.stopReason || input?.stop_reason, 120),
        agentStats: sanitizeUserVisibleAgentDetail(input?.agentStats || input?.agent_stats || input?.agents || {}),
        fileChanges: sanitizeUserVisibleAgentDetail(input?.fileChanges || input?.file_changes || input?.filesChanged || input?.files_changed || []),
        verification: sanitizeUserVisibleAgentDetail(input?.verification || input?.verificationResults || input?.verification_results || []),
        unfinished: uniqueStrings(input?.unfinished || input?.incomplete || input?.blockers),
        usage: sanitizeUserVisibleAgentDetail(input?.usage || {}),
        contentStored: false,
    };
}
function appendToolProjection(input) {
    return appendUserVisibleAgentEvent({
        ...input,
        eventType: input?.error ? "tool_failed" : input?.eventType || input?.type,
        detail: {
            ...(input?.detail || {}),
            safeArguments: input?.arguments || input?.args || input?.detail?.safeArguments,
            safeResult: input?.observation ?? input?.result ?? input?.detail?.safeResult,
        },
    });
}
function clearUserVisibleAgentEventsForTest() {
    if (!process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR || !fs.existsSync(STORE_ROOT))
        return;
    fs.rmSync(STORE_ROOT, { recursive: true, force: true });
}
function runUserVisibleAgentEventSelfTest() {
    const event = normalizeUserVisibleAgentEvent({
        scope: "project", scopeId: "demo", exactSessionId: "session-1", eventType: "tool_started",
        toolName: "find_definition", toolCallId: "call-1", arguments: { symbol: "hello", api_key: "SENTINEL" },
        detail: { safeResult: { content: "SOURCE_SENTINEL", count: 2 } },
    }, 1);
    const serialized = JSON.stringify(event);
    const checks = {
        schema: event.schema === exports.USER_VISIBLE_AGENT_EVENT_SCHEMA,
        ccLabel: event.display.title === "Find definition",
        secretRedacted: !serialized.includes("SENTINEL"),
        bodyProjected: !serialized.includes("SOURCE_SENTINEL") && serialized.includes("contentChecksum"),
        noContent: event.contentStored === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks, event };
}
//# sourceMappingURL=user-visible-agent-events.js.map