#!/usr/bin/env node
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
const readline = __importStar(require("readline"));
const port = Number(process.env.CCM_PORT || process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] || 3080);
const baseUrl = `http://127.0.0.1:${port}`;
const sessions = new Set();
let seq = 0;
function write(message) {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
}
function respond(id, result) {
    write({ id, result });
}
function respondError(id, code, message) {
    write({ id, error: { code, message } });
}
function notify(method, params) {
    write({ method, params });
}
function extractPromptText(params) {
    const prompt = params?.prompt || params?.content || params?.messages || [];
    if (typeof prompt === "string")
        return prompt.trim();
    if (!Array.isArray(prompt))
        return "";
    const parts = [];
    for (const item of prompt) {
        if (typeof item === "string")
            parts.push(item);
        else if (item?.type === "text" && item.text)
            parts.push(String(item.text));
        else if (item?.content && typeof item.content === "string")
            parts.push(item.content);
        else if (Array.isArray(item?.content)) {
            for (const block of item.content) {
                if (typeof block === "string")
                    parts.push(block);
                else if (block?.type === "text" && block.text)
                    parts.push(String(block.text));
            }
        }
    }
    return parts.join("\n").trim();
}
async function callGlobalAgent(text, sessionId = "default") {
    const response = await fetch(`${baseUrl}/api/feishu/control-bot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CCM-ACP": "1" },
        body: JSON.stringify({ text, sessionId, source: "cc-connect-acp" }),
        signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    const data = await response.json();
    if (!response.ok || data?.success === false)
        throw new Error(data?.error || `全局 Agent 请求失败 (${response.status})`);
    return String(data.reply || data.message || "已处理");
}
function sendTextUpdate(sessionId, text) {
    notify("session/update", {
        sessionId,
        update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text },
            messageId: `ccm-${Date.now()}`,
        },
    });
}
async function handleRequest(message) {
    const { id, method, params } = message;
    try {
        if (method === "initialize") {
            respond(id, {
                protocolVersion: params?.protocolVersion || 1,
                agentCapabilities: {
                    loadSession: false,
                    promptCapabilities: { image: false, audio: false, embeddedContext: false },
                    mcpCapabilities: { http: false, sse: false },
                    sessionCapabilities: {},
                    auth: {},
                },
                agentInfo: { name: "CCM Global Agent", version: "1.0.0" },
                authMethods: [],
            });
            return;
        }
        if (method === "session/new") {
            const sessionId = `ccm-global-${Date.now().toString(36)}-${++seq}`;
            sessions.add(sessionId);
            respond(id, { sessionId, configOptions: null, modes: null });
            return;
        }
        if (method === "session/load") {
            const sessionId = String(params?.sessionId || params?.id || `ccm-global-${Date.now().toString(36)}-${++seq}`);
            sessions.add(sessionId);
            respond(id, { sessionId, configOptions: null, modes: null });
            return;
        }
        if (method === "session/prompt") {
            const sessionId = String(params?.sessionId || "default");
            sessions.add(sessionId);
            const text = extractPromptText(params);
            if (!text) {
                sendTextUpdate(sessionId, "请发送文字指令。");
                respond(id, { stopReason: "end_turn" });
                return;
            }
            const reply = await callGlobalAgent(text, sessionId);
            sendTextUpdate(sessionId, reply);
            respond(id, { stopReason: "end_turn" });
            return;
        }
        if (method === "session/cancel" || method === "session/close" || method === "session/delete") {
            respond(id, {});
            return;
        }
        if (id !== undefined)
            respondError(id, -32601, `Unsupported method: ${method}`);
    }
    catch (error) {
        if (id !== undefined)
            respondError(id, -32000, error?.message || String(error));
    }
}
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
    const text = line.trim();
    if (!text)
        return;
    try {
        void handleRequest(JSON.parse(text));
    }
    catch (error) {
        respondError(null, -32700, error?.message || "Parse error");
    }
});
//# sourceMappingURL=control-bot-acp.js.map