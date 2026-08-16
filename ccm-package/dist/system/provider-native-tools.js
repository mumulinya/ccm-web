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
exports.providerToolsRequestPatch = providerToolsRequestPatch;
exports.parseOpenAiAgentTurn = parseOpenAiAgentTurn;
exports.parseGeminiAgentTurn = parseGeminiAgentTurn;
exports.parseAnthropicAgentTurn = parseAnthropicAgentTurn;
exports.turnForLegacyJsonLoop = turnForLegacyJsonLoop;
exports.createOpenAiStreamTurnAccumulator = createOpenAiStreamTurnAccumulator;
exports.createAnthropicStreamTurnAccumulator = createAnthropicStreamTurnAccumulator;
const crypto = __importStar(require("crypto"));
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function providerContentText(value) {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return value.map(item => typeof item === "string" ? item : String(item?.text || item?.content || "")).join("");
    }
    if (value && typeof value === "object")
        return String(value.text || value.content || "");
    return "";
}
function parseArguments(value) {
    if (value && typeof value === "object")
        return value;
    try {
        const parsed = JSON.parse(String(value || "{}"));
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return { _malformedJson: String(value || "").slice(0, 4000) };
    }
}
function call(id, name, args) {
    const parsed = parseArguments(args);
    return { id: String(id || `call_${checksum({ name, parsed }).slice(0, 16)}`), name: String(name || ""), arguments: parsed, argumentsChecksum: checksum(parsed) };
}
function providerToolsRequestPatch(family, tools, nativeToolReference = false) {
    const filtered = tools.filter(tool => tool?.name && tool.deferred !== true);
    if (family === "openai")
        return { body: { tools: filtered.map(tool => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.inputSchema || { type: "object", properties: {} } } })), tool_choice: "auto" }, headers: {} };
    if (family === "gemini")
        return { body: { tools: [{ functionDeclarations: filtered.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.inputSchema || { type: "object", properties: {} } })) }] }, headers: {} };
    return {
        body: { tools: tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema || { type: "object", properties: {} }, ...(nativeToolReference && tool.deferred === true ? { defer_loading: true } : {}) })) },
        headers: nativeToolReference ? { "anthropic-beta": "advanced-tool-use-2025-11-20" } : {},
    };
}
function parseOpenAiAgentTurn(data, usage) {
    const message = data?.choices?.[0]?.message || {};
    return {
        text: providerContentText(message.content),
        toolCalls: (message.tool_calls || []).map((item) => call(item.id, item.function?.name, item.function?.arguments)),
        toolReferences: [],
        stopReason: String(data?.choices?.[0]?.finish_reason || ""),
        usage,
    };
}
function parseGeminiAgentTurn(data, usage) {
    const parts = (data?.candidates || []).flatMap((candidate) => candidate?.content?.parts || []);
    return {
        text: parts.map((part) => String(part?.text || "")).join(""),
        toolCalls: parts.filter((part) => part?.functionCall).map((part) => call(part.functionCall.id, part.functionCall.name, part.functionCall.args)),
        toolReferences: [],
        stopReason: String(data?.candidates?.[0]?.finishReason || ""),
        usage,
    };
}
function parseAnthropicAgentTurn(data, usage) {
    const parts = Array.isArray(data?.content) ? data.content : [];
    return {
        text: parts.filter((part) => part?.type === "text").map((part) => String(part.text || "")).join(""),
        toolCalls: parts.filter((part) => part?.type === "tool_use").map((part) => call(part.id, part.name, part.input)),
        toolReferences: parts.filter((part) => part?.type === "tool_reference").map((part) => String(part.tool_name || part.name || "")).filter(Boolean),
        stopReason: String(data?.stop_reason || ""),
        usage,
    };
}
function turnForLegacyJsonLoop(turn) {
    if (turn.toolCalls.length)
        return JSON.stringify({
            responseType: "tool_calls",
            ...(turn.text.trim() ? { progressUpdate: turn.text.trim(), progressKind: "before_tools" } : {}),
            toolRequests: turn.toolCalls.map(item => ({ name: item.name, arguments: item.arguments, reason: "Provider原生工具调用" })),
            providerToolCallIds: turn.toolCalls.map(item => item.id),
            toolReferences: turn.toolReferences,
        });
    return turn.text.trim();
}
function tryCompleteToolCall(row, emitted, onToolCallReady) {
    if (!row.name || !String(row.arguments || "").trim() || emitted.has(`${row.id}:${row.name}`))
        return;
    try {
        const parsed = JSON.parse(String(row.arguments));
        if (!parsed || typeof parsed !== "object")
            return;
        const item = call(row.id, row.name, parsed);
        emitted.add(`${row.id}:${row.name}`);
        onToolCallReady?.(item);
    }
    catch { }
}
function createOpenAiStreamTurnAccumulator(onToolCallReady) {
    const calls = new Map();
    const emitted = new Set();
    let text = "";
    let stopReason = "";
    return {
        push(event) {
            const choice = event?.choices?.[0];
            text += providerContentText(choice?.delta?.content);
            stopReason = String(choice?.finish_reason || stopReason || "");
            for (const item of choice?.delta?.tool_calls || []) {
                const index = Number(item.index || 0);
                const row = calls.get(index) || { id: "", name: "", arguments: "" };
                row.id += String(item.id || "");
                row.name += String(item.function?.name || "");
                row.arguments += String(item.function?.arguments || "");
                calls.set(index, row);
                tryCompleteToolCall(row, emitted, onToolCallReady);
            }
        },
        finish(usage) { return { text, toolCalls: [...calls.values()].map(row => call(row.id, row.name, row.arguments)), toolReferences: [], stopReason, usage }; },
    };
}
function createAnthropicStreamTurnAccumulator(onToolCallReady) {
    const blocks = new Map();
    const emitted = new Set();
    let text = "";
    let stopReason = "";
    return {
        push(event) {
            if (event?.type === "content_block_start")
                blocks.set(Number(event.index || 0), { ...(event.content_block || {}), partial: "" });
            if (event?.type === "content_block_delta") {
                const block = blocks.get(Number(event.index || 0)) || { type: event?.delta?.type === "input_json_delta" ? "tool_use" : "text", partial: "" };
                if (event?.delta?.type === "text_delta") {
                    block.text = String(block.text || "") + String(event.delta.text || "");
                    text += String(event.delta.text || "");
                }
                if (event?.delta?.type === "input_json_delta")
                    block.partial += String(event.delta.partial_json || "");
                blocks.set(Number(event.index || 0), block);
                if (block.type === "tool_use")
                    tryCompleteToolCall({ id: String(block.id || ""), name: String(block.name || ""), arguments: String(block.partial || "") }, emitted, onToolCallReady);
            }
            if (event?.type === "content_block_stop") {
                const block = blocks.get(Number(event.index || 0));
                if (block?.type === "tool_use") {
                    const item = call(block.id, block.name, block.input || block.partial);
                    if (!emitted.has(`${item.id}:${item.name}`)) {
                        emitted.add(`${item.id}:${item.name}`);
                        onToolCallReady?.(item);
                    }
                }
            }
            stopReason = String(event?.delta?.stop_reason || event?.stop_reason || stopReason || "");
        },
        finish(usage) {
            const values = [...blocks.values()];
            return { text, toolCalls: values.filter(row => row.type === "tool_use").map(row => call(row.id, row.name, row.input || row.partial)), toolReferences: values.filter(row => row.type === "tool_reference").map(row => String(row.tool_name || row.name || "")).filter(Boolean), stopReason, usage };
        },
    };
}
//# sourceMappingURL=provider-native-tools.js.map