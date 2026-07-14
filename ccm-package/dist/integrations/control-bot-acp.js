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
const requestTimeoutMs = Math.max(1_000, Math.min(10 * 60 * 1000, Number(process.env.CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS || 90_000)));
const sessions = new Set();
const inFlightRequests = new Map();
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
function extractPrompt(params) {
    const prompt = params?.prompt || params?.content || params?.messages || [];
    if (typeof prompt === "string")
        return { text: prompt.trim(), unsupported: [] };
    if (!Array.isArray(prompt))
        return { text: "", unsupported: [] };
    const parts = [];
    const unsupported = [];
    const collect = (block) => {
        if (typeof block === "string") {
            parts.push(block);
            return;
        }
        if (!block || typeof block !== "object")
            return;
        if (block.type === "text" && block.text) {
            parts.push(String(block.text));
            return;
        }
        if (typeof block.content === "string") {
            parts.push(block.content);
            return;
        }
        if (Array.isArray(block.content)) {
            for (const nested of block.content)
                collect(nested);
            return;
        }
        const kind = String(block.type || block.mimeType || "attachment").toLowerCase();
        if (/image|audio|video|file|resource|attachment/.test(kind) || block.uri || block.data)
            unsupported.push(kind);
    };
    for (const item of prompt) {
        collect(item);
    }
    return { text: parts.join("\n").trim(), unsupported: [...new Set(unsupported)] };
}
async function callGlobalAgent(text, sessionId = "default", messageId = "") {
    const controller = new AbortController();
    // 消息是否引导、排队或停止由 CCM 后端统一决定，适配层不能静默打断上一回合。
    inFlightRequests.set(sessionId, controller);
    const timeout = setTimeout(() => controller.abort(new Error("control bot request timeout")), requestTimeoutMs);
    try {
        const response = await fetch(`${baseUrl}/api/feishu/control-bot/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CCM-ACP": "1" },
            body: JSON.stringify({ text, sessionId, messageId, source: "cc-connect-acp" }),
            signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || data?.success === false)
            throw new Error(data?.error || `全局 Agent 请求失败 (${response.status})`);
        return String(data.reply || data.message || "已处理");
    }
    finally {
        clearTimeout(timeout);
        if (inFlightRequests.get(sessionId) === controller)
            inFlightRequests.delete(sessionId);
    }
}
function requestFailureReply(error) {
    const timedOut = error?.name === "AbortError" || /timeout|aborted/i.test(String(error?.message || error || ""));
    if (timedOut) {
        return `这次处理超过 ${Math.ceil(requestTimeoutMs / 1000)} 秒仍未返回，我已经结束了卡住的会话。请重新发送一次，未完成的操作不会被标记为成功。`;
    }
    return "这次消息没有处理成功，我已经结束了异常会话。请稍后重新发送一次。";
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
            const prompt = extractPrompt(params);
            const text = prompt.text;
            if (prompt.unsupported.length > 0) {
                sendTextUpdate(sessionId, "我看到了附件，但当前飞书控制通道还不能可靠读取附件内容。请把任务目标和附件中的关键信息用文字发给我，我会继续处理。附件不会被当作已读取或已验收。");
                respond(id, { stopReason: "end_turn" });
                return;
            }
            if (!text) {
                sendTextUpdate(sessionId, "请发送文字指令。");
                respond(id, { stopReason: "end_turn" });
                return;
            }
            const reply = await callGlobalAgent(text, sessionId, String(id ?? ""));
            sendTextUpdate(sessionId, reply);
            respond(id, { stopReason: "end_turn" });
            return;
        }
        if (method === "session/cancel" || method === "session/close" || method === "session/delete") {
            const sessionId = String(params?.sessionId || params?.id || "default");
            inFlightRequests.get(sessionId)?.abort(new Error("session cancelled"));
            inFlightRequests.delete(sessionId);
            respond(id, {});
            return;
        }
        if (id !== undefined)
            respondError(id, -32601, `Unsupported method: ${method}`);
    }
    catch (error) {
        process.stderr.write(`[CCM control bot ACP] request failed: ${error?.message || String(error)}\n`);
        if (method === "session/prompt" && id !== undefined) {
            const sessionId = String(params?.sessionId || "default");
            sendTextUpdate(sessionId, requestFailureReply(error));
            respond(id, { stopReason: "end_turn" });
            return;
        }
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