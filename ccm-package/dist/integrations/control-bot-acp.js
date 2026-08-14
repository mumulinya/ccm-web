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
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const feishu_conversation_v2_1 = require("../modules/collaboration/feishu-conversation-v2");
const internal_api_auth_1 = require("../modules/system/internal-api-auth");
const feishu_inbound_attachments_1 = require("./feishu-inbound-attachments");
const port = Number(process.env.CCM_PORT || process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] || 3080);
const baseUrl = `http://127.0.0.1:${port}`;
const project = String(process.argv.find((arg) => arg.startsWith("--project="))?.slice("--project=".length) || "").trim();
const projectMode = !!project;
const requestTimeoutMs = Math.max(1_000, Math.min(15 * 60 * 1000, Number(projectMode
    ? process.env.CCM_PROJECT_BOT_REQUEST_TIMEOUT_MS || 180_000
    : process.env.CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS || 180_000)));
const heartbeatDelayMs = Math.max(100, Math.min(60_000, Number(process.env.CCM_BOT_HEARTBEAT_DELAY_MS || 12_000)));
const heartbeatIntervalMs = Math.max(100, Math.min(60_000, Number(process.env.CCM_BOT_HEARTBEAT_INTERVAL_MS || 20_000)));
const adapterBuildId = (() => {
    try {
        return crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex").slice(0, 12);
    }
    catch {
        return "unknown";
    }
})();
const sessions = new Set();
const inFlightRequests = new Map();
let seq = 0;
let stdoutWriteQueue = Promise.resolve();
function enqueueOutput(payload) {
    const pending = stdoutWriteQueue.then(() => new Promise((resolve, reject) => {
        process.stdout.write(payload, (error) => {
            if (error)
                reject(error);
            else
                resolve();
        });
    }));
    stdoutWriteQueue = pending.catch((error) => {
        process.stderr.write(`[CCM control bot ACP] stdout write failed: ${String(error?.message || error)}\n`);
    });
    return pending;
}
function write(message) {
    void enqueueOutput(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
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
function writeAsync(message) {
    return enqueueOutput(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
}
function writeBatchAsync(messages) {
    const payload = messages.map(message => JSON.stringify({ jsonrpc: "2.0", ...message })).join("\n") + "\n";
    return enqueueOutput(payload);
}
function extractPrompt(params) {
    const prompt = params?.prompt || params?.content || params?.messages || [];
    if (typeof prompt === "string")
        return { ...(0, feishu_inbound_attachments_1.extractCcConnectInboundAttachmentPaths)(prompt), unsupported: [] };
    if (!Array.isArray(prompt))
        return { text: "", refs: [], unsupported: [] };
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
    return { ...(0, feishu_inbound_attachments_1.extractCcConnectInboundAttachmentPaths)(parts.join("\n")), unsupported: [...new Set(unsupported)] };
}
function extractPlatformContext(params = {}) {
    const sources = [params, params?._meta, params?.metadata, params?.context, params?.channelContext, params?.channel_context].filter(Boolean);
    const read = (...keys) => {
        for (const source of sources)
            for (const key of keys)
                if (source?.[key])
                    return String(source[key]);
        return "";
    };
    return {
        chat_id: read("chat_id", "chatId"),
        open_id: read("open_id", "openId", "sender_open_id"),
        user_id: read("user_id", "userId", "sender_user_id"),
        root_id: read("root_id", "rootId", "root_message_id", "rootMessageId"),
        thread_id: read("thread_id", "threadId"),
        platform_message_id: read("message_id", "messageId", "open_message_id"),
    };
}
async function postFeishuReactionFeedback(action, platformContext, status) {
    const messageId = String(platformContext?.platform_message_id || "").trim();
    if (!/^om_[a-z0-9_-]{8,200}$/i.test(messageId))
        return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_500);
    timeout.unref?.();
    try {
        const response = await fetch(`${baseUrl}/api/internal/feishu-reaction/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(0, internal_api_auth_1.buildInternalApiHeaders)("feishu-acp", "POST", `/api/internal/feishu-reaction/${action}`) },
            body: JSON.stringify({
                scope: projectMode ? "project" : "global",
                project: projectMode ? project : "",
                message_id: messageId,
                ...(status ? { status } : {}),
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data?.error || `HTTP ${response.status}`);
        }
        return true;
    }
    catch (error) {
        process.stderr.write(`[CCM control bot ACP] reaction feedback failed action=${action} mode=${projectMode ? "project" : "global"} reason=${String(error?.message || error).slice(0, 160)}\n`);
        return false;
    }
    finally {
        clearTimeout(timeout);
    }
}
function beginFeishuReactionFeedback(platformContext) {
    const messageId = String(platformContext?.platform_message_id || "").trim();
    if (!/^om_[a-z0-9_-]{8,200}$/i.test(messageId))
        return (_status) => { };
    const started = postFeishuReactionFeedback("start", platformContext);
    let finished = false;
    return (status) => {
        if (finished)
            return;
        finished = true;
        void started.then(() => postFeishuReactionFeedback("finish", platformContext, status));
    };
}
async function callGlobalAgent(text, sessionId = "default", messageId = "", platformContext = {}, attachmentRefs = [], onDelta) {
    const controller = new AbortController();
    // 消息是否引导、排队或停止由 CCM 后端统一决定，适配层不能静默打断上一回合。
    inFlightRequests.set(sessionId, controller);
    let timeout = null;
    const hardTimeout = new Promise((_, reject) => {
        timeout = setTimeout(() => {
            controller.abort(new Error("control bot request timeout"));
            reject(Object.assign(new Error("control bot request timeout"), { code: "CCM_ACP_TIMEOUT" }));
        }, requestTimeoutMs);
    });
    try {
        const run = (async () => {
            const response = await fetch(`${baseUrl}/api/feishu/control-bot/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "text/event-stream", ...(0, internal_api_auth_1.buildInternalApiHeaders)("feishu-acp", "POST", "/api/feishu/control-bot/message") },
                body: JSON.stringify({
                    text,
                    sessionId,
                    acpSessionId: sessionId,
                    messageId: platformContext.platform_message_id || `acp:${sessionId}:${messageId || "turn"}:${Date.now()}`,
                    ...platformContext,
                    target_type: "global_agent",
                    source: "cc-connect-acp",
                    cc_connect_attachment_refs: attachmentRefs,
                    stream: true,
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || `全局 Agent 请求失败 (${response.status})`);
            }
            return readProjectSseResponse(response, onDelta);
        })();
        return await Promise.race([run, hardTimeout]);
    }
    finally {
        clearTimeout(timeout);
        if (inFlightRequests.get(sessionId) === controller)
            inFlightRequests.delete(sessionId);
    }
}
function projectTargetMatches(target, context) {
    const chatId = String(context.chat_id || "");
    const openId = String(context.open_id || "");
    const rootId = String(context.root_id || context.thread_id || "");
    if (!chatId || String(target?.chat_id || "") !== chatId)
        return false;
    if (rootId)
        return String(target?.thread_id || "") === rootId;
    if (openId)
        return String(target?.open_id || "") === openId;
    return true;
}
async function jsonRequest(pathname, init = {}) {
    const method = String(init.method || "GET").toUpperCase();
    const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers: { ...(init.headers || {}), ...(0, internal_api_auth_1.buildInternalApiHeaders)("feishu-acp", method, pathname) } });
    const text = await response.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    }
    catch { }
    if (!response.ok || data?.success === false)
        throw new Error(data?.error || `CCM 请求失败 (${response.status})`);
    return data;
}
async function notifyProjectSessionChanged(projectSessionId, status) {
    if (!projectMode || !projectSessionId)
        return;
    try {
        await jsonRequest("/api/projects/session-runtime-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project, sessionId: projectSessionId, status }),
        });
    }
    catch (error) {
        process.stderr.write(`[CCM control bot ACP] session refresh notification failed mode=project session=${projectSessionId} status=${status} reason=${String(error?.message || error).slice(0, 160)}\n`);
    }
}
function projectReplyFromSse(payload) {
    const chunks = [];
    let error = "";
    let fallback = "";
    for (const line of String(payload || "").split(/\r?\n/)) {
        if (!line.startsWith("data:"))
            continue;
        try {
            const event = JSON.parse(line.slice(5).trim());
            if (["chunk", "response_delta", "assistant_text_delta"].includes(String(event?.type || ""))) {
                const delta = String(event.text || event.delta || event.content || "");
                if (delta)
                    chunks.push(delta);
            }
            if (event?.type === "error")
                error = String(event.text || event.error || event.message || "项目主 Agent 处理失败");
            if (event?.type === "route_required") {
                fallback = [
                    "这条消息可能与刚才的任务有关。",
                    String(event?.turn?.routing?.reason || "请确认如何处理这条消息。"),
                    event?.turn?.routing?.candidateTaskId ? "1. 继续原任务" : "1. 继续原任务（当前不可用）",
                    "2. 作为新任务",
                    "3. 仅回答问题",
                    "请直接回复 1、2 或 3。",
                ].join("\n");
            }
            if (event?.type === "result")
                fallback = String(event.reply || event.run?.final_reply || event.run?.finalReply || event.message || fallback || "");
            if (event?.type === "done")
                fallback = String(event.final_text || event.finalText || event.taskExperience?.final_summary || event.taskExperience?.finalSummary || event.message || fallback || "");
        }
        catch { }
    }
    const reply = chunks.join("").trim() || fallback.trim();
    if (!reply && error)
        throw new Error(error);
    if (!reply)
        throw new Error("项目主 Agent 未返回可展示内容");
    return reply;
}
async function readProjectSseResponse(response, onDelta) {
    const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
    const reader = contentType.includes("text/event-stream") ? response.body?.getReader?.() : null;
    if (!reader) {
        const body = await response.text();
        let reply = "";
        let data = null;
        try {
            data = JSON.parse(body);
        }
        catch { }
        if (data) {
            if (data?.success === false)
                throw new Error(data?.error || "Agent 请求失败");
            reply = String(data?.reply || data?.run?.final_reply || data?.message || "").trim();
        }
        if (!reply)
            reply = projectReplyFromSse(body);
        if (onDelta)
            await onDelta(reply);
        return reply;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    const chunks = [];
    let fallback = "";
    let failure = "";
    const consumeEvent = async (rawEvent) => {
        const dataText = rawEvent
            .split(/\r?\n/)
            .filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trimStart())
            .join("\n");
        if (!dataText)
            return;
        let event = null;
        try {
            event = JSON.parse(dataText);
        }
        catch {
            return;
        }
        if (["chunk", "response_delta", "assistant_text_delta"].includes(String(event?.type || "")) && (event.text || event.delta || event.content)) {
            const delta = String(event.text || event.delta || event.content);
            chunks.push(delta);
            await onDelta?.(delta);
        }
        else if (event?.type === "error") {
            failure = String(event.text || event.error || event.message || "项目主 Agent 处理失败");
        }
        else if (event?.type === "route_required") {
            fallback = [
                "这条消息可能与刚才的任务有关。",
                String(event?.turn?.routing?.reason || "请确认如何处理这条消息。"),
                event?.turn?.routing?.candidateTaskId ? "1. 继续原任务" : "1. 继续原任务（当前不可用）",
                "2. 作为新任务",
                "3. 仅回答问题",
                "请直接回复 1、2 或 3。",
            ].join("\n");
        }
        else if (event?.type === "done") {
            fallback = String(event.final_text || event.finalText || event.taskExperience?.final_summary || event.taskExperience?.finalSummary || event.message || fallback || "");
        }
        else if (event?.type === "result") {
            fallback = String(event.reply || event.run?.final_reply || event.run?.finalReply || event.message || fallback || "");
        }
    };
    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
            const rawEvent = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            await consumeEvent(rawEvent);
            boundary = buffer.indexOf("\n\n");
        }
        if (done)
            break;
    }
    if (buffer.trim())
        await consumeEvent(buffer);
    const reply = chunks.join("").trim() || fallback.trim();
    if (!reply && failure)
        throw new Error(failure);
    if (!reply)
        throw new Error("项目主 Agent 未返回可展示内容");
    return reply;
}
async function callProjectAgent(text, sessionId = "default", messageId = "", platformContext = {}, attachmentRefs = [], onResolvedPlatformContext, onDelta) {
    const controller = new AbortController();
    inFlightRequests.set(sessionId, controller);
    let timeout = null;
    const hardTimeout = new Promise((_, reject) => {
        timeout = setTimeout(() => {
            controller.abort(new Error("project bot request timeout"));
            reject(Object.assign(new Error("project bot request timeout"), { code: "CCM_ACP_TIMEOUT" }));
        }, requestTimeoutMs);
    });
    try {
        const run = (async () => {
            const targets = await jsonRequest(`/api/sessions/feishu-targets?project=${encodeURIComponent(project)}&acp_session_id=${encodeURIComponent(sessionId)}`, { signal: controller.signal });
            const metadataMatches = (targets.targets || []).filter((target) => projectTargetMatches(target, platformContext));
            const resolvedTarget = targets.resolved_target || (metadataMatches.length === 1 ? metadataMatches[0] : null);
            if (!resolvedTarget)
                throw new Error(metadataMatches.length > 1 ? "当前飞书目标匹配到多个项目会话" : "当前 ACP 会话尚未绑定项目会话");
            if (metadataMatches.length === 1 && metadataMatches[0].id !== resolvedTarget.id) {
                throw new Error("ACP 会话映射与飞书消息身份不一致，已拒绝跨会话路由");
            }
            const projectSessionId = String(resolvedTarget.active_session_id || "").trim();
            if (!projectSessionId)
                throw new Error("当前飞书目标尚未绑定活动项目会话");
            const resolvedPlatformContext = {
                ...platformContext,
                chat_id: platformContext.chat_id || String(resolvedTarget.chat_id || ""),
                open_id: platformContext.open_id || String(resolvedTarget.open_id || ""),
                user_id: platformContext.user_id || String(resolvedTarget.user_id || ""),
                root_id: platformContext.root_id || String(resolvedTarget.root_message_id || resolvedTarget.thread_id || ""),
                thread_id: platformContext.thread_id || String(resolvedTarget.thread_id || ""),
                platform_message_id: platformContext.platform_message_id || String(resolvedTarget.latest_message_id || ""),
                platform_session_key: String(resolvedTarget.platform_session_key || resolvedTarget.id || ""),
                target_type: "project_agent",
                project,
                conversation_key_v2: String(resolvedTarget.conversation_key_v2 || ""),
            };
            onResolvedPlatformContext?.(resolvedPlatformContext);
            const stableMessageId = String(resolvedPlatformContext.platform_message_id || resolvedPlatformContext.message_id || `acp:${sessionId}:${messageId}:${crypto.createHash("sha256").update(text).digest("hex").slice(0, 16)}`);
            const inboundEnvelope = (0, feishu_conversation_v2_1.buildFeishuInboundEnvelopeV2)({
                payload: { ...resolvedPlatformContext, message_id: stableMessageId },
                targetType: "project_agent",
                projectId: project,
                transport: "acp",
                messageId: stableMessageId,
            });
            const inboundClaim = (0, feishu_conversation_v2_1.acquireFeishuInboundReceipt)(inboundEnvelope, requestTimeoutMs + 30_000);
            if (!inboundClaim.acquired) {
                if (inboundClaim.receipt.processing_state === "completed" && inboundClaim.receipt.result?.reply) {
                    return { reply: inboundClaim.receipt.result.reply, projectSessionId, duplicate: true };
                }
                throw new Error("这条项目飞书消息正在处理中，请稍后查看原会话结果");
            }
            const originReceipt = (0, feishu_conversation_v2_1.buildFeishuOriginReceiptV2)({ envelope: inboundEnvelope, sessionId: projectSessionId });
            (0, feishu_conversation_v2_1.updateFeishuInboundReceipt)(inboundClaim.receipt.id, "agent_processing");
            void notifyProjectSessionChanged(projectSessionId, "inbound");
            try {
                const response = await fetch(`${baseUrl}/api/send-stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(0, internal_api_auth_1.buildInternalApiHeaders)("feishu-acp", "POST", "/api/send-stream") },
                    body: JSON.stringify({
                        project,
                        sessionId: projectSessionId,
                        message: text,
                        cc_connect_attachment_refs: attachmentRefs,
                        source: "feishu",
                        target_type: "project_agent",
                        platform_context: { ...resolvedPlatformContext, platform_message_id: stableMessageId, feishu_inbound_envelope: inboundEnvelope, feishu_origin_receipt: originReceipt },
                    }),
                    signal: controller.signal,
                });
                if (!response.ok) {
                    const body = await response.text();
                    let failure = {};
                    try {
                        failure = JSON.parse(body);
                    }
                    catch { }
                    throw new Error(failure.error || `项目主 Agent 请求失败 (${response.status})`);
                }
                const reply = await readProjectSseResponse(response, onDelta);
                (0, feishu_conversation_v2_1.completeFeishuInboundReceipt)(inboundClaim.receipt.id, { reply });
                return { reply, projectSessionId, originReceipt };
            }
            catch (error) {
                (0, feishu_conversation_v2_1.failFeishuInboundReceipt)(inboundClaim.receipt.id, error, true);
                throw error;
            }
        })();
        return await Promise.race([run, hardTimeout]);
    }
    finally {
        if (timeout)
            clearTimeout(timeout);
        if (inFlightRequests.get(sessionId) === controller)
            inFlightRequests.delete(sessionId);
    }
}
function requestFailureReply(error) {
    const timedOut = error?.name === "AbortError" || /timeout|aborted/i.test(String(error?.message || error || ""));
    if (timedOut) {
        return `这次${projectMode ? "项目主 Agent" : "全局 Agent"}处理超过 ${Math.ceil(requestTimeoutMs / 1000)} 秒仍未返回，我已经结束了卡住的回合。请重新发送一次，未完成的操作不会被标记为成功。`;
    }
    const reason = String(error?.message || "").trim().slice(0, 240);
    return `这次${projectMode ? "项目主 Agent" : "全局 Agent"}消息没有处理成功${reason ? `：${reason}` : ""}。异常回合已经结束，可以直接重新发送。`;
}
function textUpdateMessage(sessionId, text) {
    return { method: "session/update", params: {
            sessionId,
            update: {
                sessionUpdate: "agent_message_chunk",
                content: { type: "text", text },
                messageId: `ccm-${Date.now()}`,
            },
        } };
}
function thinkingUpdateMessage(sessionId) {
    return { method: "session/update", params: {
            sessionId,
            update: {
                sessionUpdate: "agent_thinking_chunk",
                // cc-connect treats an ellipsis-only thinking event as activity without
                // rendering it, so the idle timer stays fresh without polluting Feishu.
                content: { type: "text", text: "..." },
                messageId: `ccm-heartbeat-${Date.now()}`,
            },
        } };
}
function startTurnHeartbeat(sessionId) {
    let active = true;
    let timer = null;
    let pending = Promise.resolve();
    const schedule = (delay) => {
        timer = setTimeout(() => {
            if (!active)
                return;
            pending = writeAsync(thinkingUpdateMessage(sessionId)).catch((error) => {
                process.stderr.write(`[CCM control bot ACP] heartbeat failed session=${sessionId} reason=${String(error?.message || error)}\n`);
            });
            schedule(heartbeatIntervalMs);
        }, delay);
        timer.unref?.();
    };
    schedule(heartbeatDelayMs);
    return async () => {
        active = false;
        if (timer)
            clearTimeout(timer);
        await pending;
    };
}
async function sendTextUpdate(sessionId, text) {
    await writeAsync(textUpdateMessage(sessionId, text));
}
async function completeTurnWithText(id, sessionId, text) {
    const normalized = String(text || "").trim();
    if (!normalized)
        throw new Error("ACP turn cannot complete without visible text");
    // cc-connect 1.4.x derives the final reply exclusively from session/update.
    // Flush the text notification and prompt result in one ordered pipe write so
    // its synchronous JSON-RPC reader must enqueue EventText before EventResult.
    await writeBatchAsync([
        textUpdateMessage(sessionId, normalized),
        { id, result: { stopReason: "end_turn" } },
    ]);
    process.stderr.write(`[CCM control bot ACP] turn terminal mode=${projectMode ? "project" : "global"} session=${sessionId} request=${String(id ?? "")} build=${adapterBuildId} chars=${normalized.length}\n`);
}
async function completeStreamedTurn(id, sessionId) {
    await writeAsync({ id, result: { stopReason: "end_turn" } });
    process.stderr.write(`[CCM control bot ACP] streamed turn terminal mode=${projectMode ? "project" : "global"} session=${sessionId} request=${String(id ?? "")} build=${adapterBuildId}\n`);
}
async function handleRequest(message) {
    const { id, method, params } = message;
    try {
        if (method === "initialize") {
            respond(id, {
                protocolVersion: params?.protocolVersion || 1,
                agentCapabilities: {
                    loadSession: true,
                    promptCapabilities: { image: false, audio: false, embeddedContext: false },
                    mcpCapabilities: { http: false, sse: false },
                    sessionCapabilities: {},
                    auth: {},
                },
                agentInfo: { name: projectMode ? `CCM Project Main Agent (${project})` : "CCM Global Agent", version: `1.1.0+${adapterBuildId}` },
                authMethods: [],
            });
            return;
        }
        if (method === "session/new") {
            const sessionId = `ccm-${projectMode ? "project" : "global"}-${Date.now().toString(36)}-${++seq}`;
            sessions.add(sessionId);
            respond(id, { sessionId, configOptions: null, modes: null });
            return;
        }
        if (method === "session/load") {
            const sessionId = String(params?.sessionId || params?.id || `ccm-${projectMode ? "project" : "global"}-${Date.now().toString(36)}-${++seq}`);
            sessions.add(sessionId);
            respond(id, { sessionId, configOptions: null, modes: null });
            return;
        }
        if (method === "session/prompt") {
            const sessionId = String(params?.sessionId || "default");
            sessions.add(sessionId);
            const prompt = extractPrompt(params);
            const text = prompt.text;
            const platformContext = extractPlatformContext(params);
            process.stderr.write(`[CCM control bot ACP] prompt received mode=${projectMode ? "project" : "global"} session=${sessionId} request=${String(id ?? "")} chars=${text.length} attachments=${prompt.refs.length} unsupported=${prompt.unsupported.length}\n`);
            if (prompt.unsupported.length > 0) {
                await completeTurnWithText(id, sessionId, "我看到了附件，但当前飞书控制通道还不能可靠读取附件内容。请把任务目标和附件中的关键信息用文字发给我，我会继续处理。附件不会被当作已读取或已验收。");
                return;
            }
            if (!text && prompt.refs.length === 0) {
                await completeTurnWithText(id, sessionId, "请发送文字指令。");
                return;
            }
            let finishReaction = (_status) => { };
            let reactionStatus = "failed";
            const stopHeartbeat = startTurnHeartbeat(sessionId);
            try {
                let projectResult = null;
                let reply = "";
                let streamedReply = false;
                try {
                    projectResult = projectMode
                        ? await callProjectAgent(text, sessionId, String(id ?? ""), platformContext, prompt.refs, undefined, async (delta) => {
                            if (!delta)
                                return;
                            streamedReply = true;
                            await sendTextUpdate(sessionId, delta);
                        })
                        : null;
                    reply = projectResult?.reply
                        || await callGlobalAgent(text, sessionId, String(id ?? ""), platformContext, prompt.refs, async (delta) => {
                            if (!delta)
                                return;
                            streamedReply = true;
                            await sendTextUpdate(sessionId, delta);
                        });
                }
                finally {
                    await stopHeartbeat();
                }
                if (streamedReply)
                    await completeStreamedTurn(id, sessionId);
                else
                    await completeTurnWithText(id, sessionId, reply);
                reactionStatus = "completed";
                if (projectResult?.projectSessionId) {
                    const projectSessionId = projectResult.projectSessionId;
                    const timer = setTimeout(() => void notifyProjectSessionChanged(projectSessionId, "reply"), 250);
                    timer.unref?.();
                }
                return;
            }
            finally {
                finishReaction(reactionStatus);
            }
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
            try {
                await completeTurnWithText(id, sessionId, requestFailureReply(error));
            }
            catch (deliveryError) {
                process.stderr.write(`[CCM control bot ACP] terminal delivery failed session=${sessionId} request=${String(id)} reason=${String(deliveryError?.message || deliveryError)}\n`);
                respondError(id, -32001, "ACP terminal reply delivery failed");
            }
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