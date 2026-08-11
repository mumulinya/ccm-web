"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectFeishuTurnConversationId = projectFeishuTurnConversationId;
exports.enqueueProjectFeishuTurn = enqueueProjectFeishuTurn;
exports.drainProjectFeishuTurns = drainProjectFeishuTurns;
exports.startProjectFeishuTurnRecoveryForServer = startProjectFeishuTurnRecoveryForServer;
exports.stopProjectFeishuTurnRecoveryForServer = stopProjectFeishuTurnRecoveryForServer;
const conversation_turn_control_1 = require("../../agents/conversation-turn-control");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const project_session_agent_binding_1 = require("./project-session-agent-binding");
const project_runtime_1 = require("./project-runtime");
const internal_api_auth_1 = require("../system/internal-api-auth");
const draining = new Set();
let recoveryTimer = null;
function projectFeishuTurnConversationId(project, projectSessionId) {
    return `project-feishu:${String(project || "").trim()}:${String(projectSessionId || "").trim()}`;
}
function enqueueProjectFeishuTurn(input) {
    const conversationId = projectFeishuTurnConversationId(input.project, input.projectSessionId);
    const queued = conversation_turn_control_1.conversationTurnControl.enqueue({
        scope: "project",
        conversation_id: conversationId,
        mode: "queue",
        message: input.message,
        attachments: Array.isArray(input.files) ? input.files : [],
        request_id: input.requestId,
        metadata: {
            kind: "project_feishu_turn_v2",
            project: input.project,
            project_session_id: input.projectSessionId,
            platform_context: input.platformContext,
        },
    });
    const position = conversation_turn_control_1.conversationTurnControl.list({
        scope: "project",
        conversation_id: conversationId,
        statuses: "queued,sending",
        limit: 500,
    }).turns.find((turn) => turn.id === queued.turn.id)?.position || 1;
    return { ...queued, conversationId, position };
}
async function readSseReply(response) {
    const body = await response.text();
    const chunks = [];
    let fallback = "";
    for (const block of body.split(/\r?\n\r?\n/)) {
        const data = block.split(/\r?\n/).find((line) => line.startsWith("data:"))?.slice(5).trim();
        if (!data)
            continue;
        try {
            const event = JSON.parse(data);
            if (event?.type === "chunk" && event.text)
                chunks.push(String(event.text));
            if (event?.type === "done")
                fallback = String(event.taskExperience?.final_summary || event.message || fallback || "");
            if (event?.type === "error")
                throw new Error(String(event.text || event.error || "项目主 Agent 处理失败"));
        }
        catch (error) {
            if (error instanceof SyntaxError)
                continue;
            throw error;
        }
    }
    return chunks.join("").trim() || fallback.trim() || "项目主 Agent 已接收并处理这条排队消息。";
}
async function drainProjectFeishuTurns(baseUrl, project, projectSessionId) {
    const conversationId = projectFeishuTurnConversationId(project, projectSessionId);
    if (!project || !projectSessionId || draining.has(conversationId) || (0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(project, projectSessionId))
        return;
    draining.add(conversationId);
    try {
        while (!(0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(project, projectSessionId)) {
            const turn = conversation_turn_control_1.conversationTurnControl.claim({ scope: "project", conversation_id: conversationId });
            if (!turn)
                break;
            const metadata = turn.metadata || {};
            try {
                const response = await fetch(`${baseUrl}/api/send-stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(0, internal_api_auth_1.buildInternalApiHeaders)("project-feishu-queue", "POST", "/api/send-stream") },
                    body: JSON.stringify({
                        project,
                        sessionId: projectSessionId,
                        message: turn.message,
                        files: turn.attachments,
                        source: "feishu",
                        target_type: "project_agent",
                        platform_context: metadata.platform_context || {},
                    }),
                });
                if (response.status === 409) {
                    conversation_turn_control_1.conversationTurnControl.defer(turn.id, "项目会话租约仍被占用，保留原顺序稍后重试");
                    break;
                }
                if (!response.ok) {
                    const body = await response.text();
                    let detail = body;
                    try {
                        detail = String(JSON.parse(body)?.error || body);
                    }
                    catch { }
                    throw new Error(detail || `项目主 Agent 请求失败 (${response.status})`);
                }
                const reply = await readSseReply(response);
                const delivery = await (0, feishu_channel_1.notifyFeishuTaskStage)({
                    stage: "project_agent_queued_reply",
                    title: `${(0, project_runtime_1.projectDisplayName)(project)} · 项目主 Agent`,
                    markdown: reply,
                    sessionId: projectSessionId,
                    forceNewMessage: true,
                    dedupeKey: `project-feishu-queued-turn:${turn.id}`,
                });
                if (!delivery?.success && !delivery?.queued)
                    throw new Error(delivery?.reason || "原项目飞书会话投递失败");
                conversation_turn_control_1.conversationTurnControl.settle({ id: turn.id, status: "completed", result: { reply, delivery } });
            }
            catch (error) {
                conversation_turn_control_1.conversationTurnControl.settle({ id: turn.id, status: "failed", error: error?.message || String(error) });
                await (0, feishu_channel_1.notifyFeishuTaskStage)({
                    stage: "project_agent_queued_failure",
                    title: `${(0, project_runtime_1.projectDisplayName)(project)} · 排队消息未完成`,
                    markdown: `这条排队消息没有处理成功：${String(error?.message || error).slice(0, 300)}。后续消息不会因此被阻塞。`,
                    sessionId: projectSessionId,
                    forceNewMessage: true,
                    dedupeKey: `project-feishu-queued-turn-failed:${turn.id}`,
                }).catch(() => { });
            }
            if ((0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(project, projectSessionId))
                break;
        }
    }
    finally {
        draining.delete(conversationId);
    }
}
function startProjectFeishuTurnRecoveryForServer(baseUrl) {
    if (recoveryTimer)
        return { started: false };
    const tick = () => {
        const queued = conversation_turn_control_1.conversationTurnControl.listInternal({ scope: "project", statuses: "queued", limit: 500 }).turns
            .filter((turn) => turn.metadata?.kind === "project_feishu_turn_v2");
        const exactScopes = new Map();
        for (const turn of queued) {
            const project = String(turn.metadata?.project || "");
            const sessionId = String(turn.metadata?.project_session_id || "");
            if (project && sessionId)
                exactScopes.set(`${project}\u0000${sessionId}`, { project, sessionId });
        }
        for (const value of exactScopes.values())
            void drainProjectFeishuTurns(baseUrl, value.project, value.sessionId);
    };
    tick();
    recoveryTimer = setInterval(tick, 3_000);
    recoveryTimer.unref?.();
    return { started: true };
}
function stopProjectFeishuTurnRecoveryForServer() {
    if (recoveryTimer)
        clearInterval(recoveryTimer);
    recoveryTimer = null;
}
//# sourceMappingURL=project-feishu-turn-queue.js.map