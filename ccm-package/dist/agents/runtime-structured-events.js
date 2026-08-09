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
exports.AGENT_RUNTIME_EVENT_SCHEMA = void 0;
exports.createAgentRuntimeStructuredEventParser = createAgentRuntimeStructuredEventParser;
exports.runAgentRuntimeStructuredEventSelfTest = runAgentRuntimeStructuredEventSelfTest;
const crypto = __importStar(require("crypto"));
const runtime_1 = require("./runtime");
exports.AGENT_RUNTIME_EVENT_SCHEMA = "ccm-agent-runtime-event-v1";
const MAX_BUFFER = 256 * 1024;
const MAX_SUMMARY = 600;
const HIDDEN_EVENT_PATTERN = /thinking|reasoning|chain.?of.?thought|analysis|system.?prompt|developer.?prompt/i;
const SECRET_PATTERN = /(api[_-]?key|authorization|bearer|password|secret|credential|private[_-]?key)\s*[:=]/i;
function checksum(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function compact(value, max = MAX_SUMMARY) {
    const text = String(value ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
    if (!text || SECRET_PATTERN.test(text))
        return "";
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}
function valueAt(event, paths) {
    for (const path of paths) {
        let current = event;
        for (const key of path.split("."))
            current = current?.[key];
        if (current !== undefined && current !== null && current !== "")
            return current;
    }
    return undefined;
}
function safeAssistantText(event) {
    const type = compact(event?.type || event?.event || event?.kind, 100).toLowerCase();
    if (HIDDEN_EVENT_PATTERN.test(type))
        return "";
    const role = compact(event?.role || event?.message?.role || event?.item?.role, 40).toLowerCase();
    const assistantLike = role === "assistant"
        || ["assistant", "assistant_message", "agent_message", "text", "message"].includes(type)
        || ["message.completed", "item.completed"].includes(type);
    if (!assistantLike)
        return "";
    const itemType = compact(event?.item?.type || event?.message?.type, 80).toLowerCase();
    if (HIDDEN_EVENT_PATTERN.test(itemType))
        return "";
    const raw = valueAt(event, [
        "text", "message.text", "message.content", "item.text", "item.content", "part.text", "response",
    ]);
    if (typeof raw === "string")
        return compact(raw);
    if (Array.isArray(raw)) {
        return compact(raw.filter(item => !HIDDEN_EVENT_PATTERN.test(String(item?.type || "")))
            .map(item => item?.text || item?.content || "").filter(Boolean).join(" "));
    }
    return "";
}
function toolDescriptor(event) {
    const type = compact(event?.type || event?.event || event?.kind, 120).toLowerCase();
    const item = event?.item || event?.message || event?.tool || event?.part || {};
    const itemType = compact(item?.type || event?.subtype || "", 120).toLowerCase();
    const toolName = compact(valueAt(event, [
        "tool_name", "toolName", "name", "tool.name", "item.name", "item.tool_name", "message.name", "part.name",
    ]), 160);
    const callId = compact(valueAt(event, [
        "tool_call_id", "toolCallId", "call_id", "callId", "item.id", "message.id", "id",
    ]), 240);
    const toolLike = !!toolName || /tool|command_execution|mcp|function_call/.test(`${type} ${itemType}`);
    if (!toolLike || HIDDEN_EVENT_PATTERN.test(`${type} ${itemType}`))
        return null;
    const failed = /fail|error/.test(`${type} ${event?.status || ""} ${item?.status || ""}`);
    const completed = failed || /completed|complete|result|success|done|finished/.test(`${type} ${event?.status || ""} ${item?.status || ""}`);
    const args = valueAt(event, ["arguments", "args", "input", "tool.arguments", "item.arguments", "item.input"]);
    const target = compact(typeof args === "string" ? args : args?.path || args?.file || args?.query || args?.command || args?.target || "", 240);
    return {
        eventType: failed ? "tool_failed" : completed ? "tool_completed" : "tool_started",
        status: failed ? "failed" : completed ? "success" : "running",
        toolName: toolName || compact(itemType || type || "Tool", 160),
        callId: callId || checksum(JSON.stringify({ type, itemType, toolName, target })).slice(0, 24),
        target,
    };
}
function fileDescriptor(event) {
    const type = compact(event?.type || event?.event || event?.kind, 100).toLowerCase();
    const itemType = compact(event?.item?.type || event?.message?.type || "", 100).toLowerCase();
    if (!/file_change|file.changed|patch|edit/.test(`${type} ${itemType}`))
        return null;
    const target = compact(valueAt(event, ["path", "file", "file_path", "item.path", "item.file", "message.path"]), 300);
    return target ? { target } : null;
}
function verificationDescriptor(event) {
    const type = compact(event?.type || event?.event || event?.kind, 100).toLowerCase();
    const name = compact(valueAt(event, ["name", "command", "item.command", "message.command"]), 240);
    const haystack = `${type} ${name}`;
    if (!/test|build|lint|typecheck|verification/.test(haystack))
        return null;
    const failed = /fail|error/.test(`${haystack} ${event?.status || ""}`);
    const completed = failed || /completed|result|success|done/.test(`${haystack} ${event?.status || ""}`);
    return {
        eventType: completed ? "verification_completed" : "verification_started",
        status: failed ? "failed" : completed ? "success" : "running",
        target: name || "验证",
    };
}
function runtimeRecognizesJson(runtime, event) {
    const type = compact(event?.type || event?.event || event?.kind, 120).toLowerCase();
    if (!type)
        return false;
    const known = {
        claudecode: /^(assistant|user|result|system|stream_event|tool|message|text)/,
        codex: /^(thread\.|turn\.|item\.|agent_message|message|error)/,
        cursor: /^(system|assistant|user|tool|result|error|message)/,
        gemini: /^(text|message|assistant|result|response|error|tool|function)/,
        opencode: /^(text|message|assistant|result|error|tool|step|part)/,
        qoder: /^(text|message|assistant|result|error|tool|status)/,
    };
    return known[runtime]?.test(type) === true;
}
function expandStructuredEvents(event) {
    const content = Array.isArray(event?.message?.content) ? event.message.content
        : Array.isArray(event?.content) ? event.content
            : Array.isArray(event?.parts) ? event.parts
                : Array.isArray(event?.response?.candidates?.[0]?.content?.parts) ? event.response.candidates[0].content.parts
                    : [];
    if (!content.length)
        return [event];
    return content.map((item, itemIndex) => {
        const functionCall = item?.functionCall || item?.function_call || null;
        return {
            ...event,
            type: item?.type || (functionCall ? "function_call" : item?.text ? "text" : event?.type),
            item: functionCall ? { ...functionCall, type: "function_call", id: functionCall.id || `${event?.id || "event"}:${itemIndex}` } : item,
            text: item?.text,
            name: functionCall?.name || item?.name,
            arguments: functionCall?.args || functionCall?.arguments || item?.input || item?.arguments,
        };
    });
}
function createAgentRuntimeStructuredEventParser(options) {
    const runtime = (0, runtime_1.normalizeAgentRuntimeId)(options.runtime);
    let buffer = "";
    let index = 0;
    const seen = new Set();
    const emit = (rawLine, rawEvent) => {
        const sourceEventChecksum = checksum(rawLine);
        if (seen.has(sourceEventChecksum))
            return;
        seen.add(sourceEventChecksum);
        if (!runtimeRecognizesJson(runtime, rawEvent)) {
            options.onContractDrift?.({ runtime, reason: "unknown_runtime_event_shape", sourceEventChecksum });
            return;
        }
        const createdAt = new Date().toISOString();
        const base = {
            schema: exports.AGENT_RUNTIME_EVENT_SCHEMA,
            eventId: `are_${sourceEventChecksum.slice(0, 28)}`,
            runtime,
            runtimeVersion: compact(options.runtimeVersion, 120),
            ...options.identity,
            progressSource: "runtime_structured",
            confidence: "observed",
            sourceEventChecksum,
            createdAt,
            contentStored: false,
        };
        const tool = toolDescriptor(rawEvent);
        if (tool) {
            options.onEvent({ ...base, eventType: tool.eventType, toolCallId: tool.callId, safeSummary: tool.toolName, target: tool.target, status: tool.status });
            return;
        }
        const verification = verificationDescriptor(rawEvent);
        if (verification) {
            options.onEvent({ ...base, eventType: verification.eventType, safeSummary: verification.target, target: verification.target, status: verification.status });
            return;
        }
        const file = fileDescriptor(rawEvent);
        if (file) {
            options.onEvent({ ...base, eventType: "file_changed", safeSummary: "文件已变更", target: file.target, status: "success" });
            return;
        }
        const assistantText = safeAssistantText(rawEvent);
        if (assistantText) {
            options.onEvent({ ...base, eventType: "assistant_progress", safeSummary: assistantText, status: "running", confidence: "declared" });
            return;
        }
        index += 1;
    };
    const consumeLine = (line) => {
        const text = line.trim().replace(/^data:\s*/i, "");
        if (!text || text === "[DONE]")
            return;
        try {
            const parsed = JSON.parse(text);
            for (const expanded of expandStructuredEvents(parsed))
                emit(JSON.stringify(expanded), expanded);
        }
        catch {
            // Free-form stdout is intentionally ignored. It can still be normalized
            // after process completion, but never becomes a user-visible fact.
        }
    };
    return {
        push(chunk) {
            buffer = (buffer + String(chunk || "")).slice(-MAX_BUFFER);
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";
            for (const line of lines)
                consumeLine(line);
        },
        flush() {
            if (buffer.trim())
                consumeLine(buffer);
            buffer = "";
        },
        stats() { return { runtime, seen: seen.size, pendingBytes: Buffer.byteLength(buffer), index }; },
    };
}
function runAgentRuntimeStructuredEventSelfTest() {
    const events = [];
    const identity = {
        taskId: "task-1", workItemId: "work-1", scope: "group", scopeId: "group-1",
        exactSessionId: "session-1", anchorMessageId: "message-1", agentRunId: "acm-1",
        generation: 2, attempt: 1, leaseId: "acl-1",
    };
    const fixtures = [
        ["claudecode", ['{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"先检查入口。"},{"type":"tool_use","id":"claude-tool","name":"Read","input":{"path":"src/a.ts"}}]}}']],
        ["codex", ['{"type":"item.started","item":{"id":"codex-tool","type":"command_execution","name":"Shell","arguments":{"command":"npm test"}}}', '{"type":"agent_message","text":"开始验证。"}']],
        ["cursor", ['{"type":"assistant","text":"检查引用。"}', '{"type":"tool_started","id":"cursor-tool","name":"Grep","arguments":{"query":"symbol"}}']],
        ["gemini", ['{"type":"response","response":{"candidates":[{"content":{"parts":[{"text":"读取配置。"},{"functionCall":{"id":"gemini-tool","name":"read_file","args":{"path":"config.json"}}}]}}]}}']],
        ["opencode", ['{"type":"text","role":"assistant","text":"定位模块。"}', '{"type":"tool","id":"opencode-tool","name":"glob","status":"running"}']],
        ["qoder", ['{"type":"assistant","text":"准备修改。"}', '{"type":"tool","id":"qoder-tool","name":"read","status":"running"}']],
    ];
    for (const [runtime, lines] of fixtures) {
        const parser = createAgentRuntimeStructuredEventParser({ runtime, identity: { ...identity, agentRunId: `acm-${runtime}` }, onEvent: event => events.push(event) });
        for (const line of lines)
            parser.push(`${line}\n`);
        parser.push('{"type":"reasoning","text":"SECRET_CHAIN_OF_THOUGHT"}\n');
        parser.push('free form stdout should be ignored\n');
        parser.flush();
    }
    const runtimeSet = new Set(events.map(event => event.runtime));
    return {
        pass: runtimeSet.size === 6
            && [...runtimeSet].every(runtime => events.some(event => event.runtime === runtime && event.eventType === "tool_started"))
            && [...runtimeSet].every(runtime => events.some(event => event.runtime === runtime && event.eventType === "assistant_progress"))
            && !JSON.stringify(events).includes("SECRET_CHAIN_OF_THOUGHT"),
        events,
    };
}
//# sourceMappingURL=runtime-structured-events.js.map