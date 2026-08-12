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
exports.createGlobalAgentApi = createGlobalAgentApi;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const workflow_decision_1 = require("../../agents/workflow-decision");
const global_agent_attachments_1 = require("./global-agent-attachments");
const project_runtime_1 = require("../projects/project-runtime");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const tool_manager_1 = require("../../tools/tool-manager");
const tool_authorization_1 = require("../../tools/tool-authorization");
const feishu_reaction_feedback_1 = require("../../integrations/feishu-reaction-feedback");
const global_agent_tool_authorization_1 = require("./global-agent-tool-authorization");
const feishu_conversation_v2_1 = require("../collaboration/feishu-conversation-v2");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const api_access_control_1 = require("../system/api-access-control");
const git_workspace_runtime_1 = require("../tools/git-workspace-runtime");
const global_terminal_delivery_1 = require("../../agents/global/global-terminal-delivery");
const task_conversation_links_1 = require("../../system/task-conversation-links");
const secure_multipart_1 = require("../../system/secure-multipart");
const automation_session_bindings_1 = require("../../system/automation-session-bindings");
const access_policy_1 = require("../system/access-policy");
const global_agent_capabilities_1 = require("./global-agent-capabilities");
function normalizeGlobalRequestedTargets(value, message = "") {
    let rows = value;
    if (typeof rows === "string") {
        try {
            rows = JSON.parse(rows);
        }
        catch {
            rows = [];
        }
    }
    const available = (0, automation_session_bindings_1.listGlobalDispatchTargets)();
    const byKey = new Map(available.map((item) => [`${item.scope}:${item.scopeId}`, item]));
    const requestedRows = Array.isArray(rows) ? rows : [];
    const explicit = requestedRows.map((item) => {
        const scope = String(item?.scope || item?.type || "").trim().toLowerCase();
        const scopeId = String(item?.scopeId || item?.scope_id || item?.id || item?.group_id || item?.project || "").trim();
        return byKey.get(`${scope}:${scopeId}`) || null;
    });
    if (requestedRows.length) {
        if (explicit.some((item) => !item || item.ready !== true))
            throw new Error("选择的项目或群聊已经不可投放，请刷新目标列表后重试");
        return [...new Map(explicit.map((item) => [`${item.scope}:${item.scopeId}`, item])).values()];
    }
    const text = String(message || "");
    const exactNameMentioned = (nameValue) => {
        const name = String(nameValue || "").trim();
        if (name.length < 2)
            return false;
        if (text.trim() === name)
            return true;
        if (/^[a-z0-9_.-]+$/i.test(name)) {
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return new RegExp(`(^|[\\s，,。:：;；'\"“”()（）\\[\\]])${escaped}($|[\\s，,。:：;；'\"“”()（）\\[\\]])`, "i").test(text);
        }
        return text.includes(name);
    };
    const matches = available.filter((item) => item.ready === true && [item.canonicalName, item.displayName]
        .some(exactNameMentioned));
    const ambiguousNames = new Set();
    for (const match of matches) {
        for (const name of [match.canonicalName, match.displayName].filter(Boolean)) {
            if (matches.filter((item) => item.canonicalName === name || item.displayName === name).length > 1)
                ambiguousNames.add(String(name));
        }
    }
    return matches.filter((item) => !ambiguousNames.has(String(item.canonicalName)) && !ambiguousNames.has(String(item.displayName)));
}
function resolveControlBotAcpPlatformContext(acpSessionIdValue) {
    const acpSessionId = String(acpSessionIdValue || "").trim();
    if (!acpSessionId || acpSessionId.length > 240 || !fs.existsSync(utils_1.SESSIONS_DIR))
        throw new Error("全局 ACP 会话 ID 无效");
    const files = fs.readdirSync(utils_1.SESSIONS_DIR)
        .filter((file) => /^ccm-control-bot(?:_[^/\\]+)?\.json$/i.test(file))
        .map((file) => ({ file, mtime: fs.statSync(path.join(utils_1.SESSIONS_DIR, file)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime || a.file.localeCompare(b.file));
    for (const candidate of files) {
        try {
            const store = JSON.parse(fs.readFileSync(path.join(utils_1.SESSIONS_DIR, candidate.file), "utf-8"));
            const sessionIds = Object.entries(store.sessions || {})
                .filter(([, session]) => String(session?.agent_session_id || "") === acpSessionId)
                .map(([sessionId]) => String(sessionId));
            const platformKeys = Object.entries(store.active_session || {})
                .filter(([, sessionId]) => sessionIds.includes(String(sessionId)))
                .map(([platformKey]) => String(platformKey));
            if (platformKeys.length !== 1)
                continue;
            const platformSessionKey = platformKeys[0];
            const parts = platformSessionKey.split(":");
            const chatId = parts.find((part) => /^oc_/i.test(part)) || "";
            const openId = parts.find((part) => /^ou_/i.test(part)) || "";
            const rootIndex = parts.findIndex((part) => part === "root");
            const threadId = rootIndex >= 0 ? String(parts[rootIndex + 1] || "") : "";
            if (!chatId && !openId)
                continue;
            return {
                chat_id: chatId,
                open_id: openId,
                root_id: threadId,
                thread_id: threadId,
                platform_message_id: threadId,
                platform_session_key: platformSessionKey,
                acp_session_id: acpSessionId,
            };
        }
        catch { }
    }
    throw new Error("无法将全局 ACP 会话精确映射到飞书身份");
}
// HTTP transport adapter for the global Agent feature surface.
function createGlobalAgentApi(deps) {
    const { GLOBAL_AGENT_TOOL_SPECS, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, GLOBAL_MANAGEMENT_ACTIONS, GLOBAL_MANAGEMENT_REQUIRED_PARAMS, GLOBAL_PET_AGENT_NAME, acquireIdempotency, appendGlobalActionAudit, applyGlobalAgentSupervisionSteer, bindFeishuGlobalSession, buildAgentQualitySnapshot, buildAgenticContext, buildGlobalAgentEventUi, buildGlobalAgentGroupMemoryModelContext, buildGlobalAgentSessionDebug, buildGlobalAgentToolDefinitions, buildGlobalControlCenterSnapshot, buildGlobalDispatchStrategy, buildGlobalGroupMemoryContext, buildGlobalSystemHealth, buildPublicGlobalStatusRun, buildTraceReplaySuite, buildUploadedFilesContext, callLlm, cancelGlobalAgentRun, checkGlobalMissionSupervisorNow, classifyGlobalAgentUserSteer, classifyGlobalControlIntent, collectRequestBuffer, compactGlobalAgentSessionWithModel, completeGlobalAgentSupervision, completeIdempotency, conversationTurnControl, controlGlobalMissionSupervisor, createAgenticRuntime, createGlobalAgentConversationSession, createGlobalDevelopmentMission, createRequirementEpicWithChildren, createMissionSupervisorRuntime, deleteGlobalAgentConversationSession, deleteGlobalAgentHook, deleteGlobalAgentPermissionRule, ensureTraceId, extractCcConnectHookText, extractFeishuMessageText, failIdempotency, formatMissionStatus, getAgentQualityPolicy, getConfigInfo, getConfigs, getFeishuGlobalSessionBindings, getFeishuMessageId, getGlobalAgentBackgroundOutput, getGlobalAgentRun, getGlobalDevelopmentMission, getGlobalMissionSupervisor, getGlobalMissionSupervisorSchedulerStatus, getIdempotencyRecord, getMultipartBoundary, getRequestBaseUrl, globalRunVisibleReply, ingestGlobalAgentConversation, ingestRequirementSources, isGlobalProgressStatusRequest, listGlobalAgentRuns, listGlobalMissionSupervisors, listTaskAgentSessions, loadFeishuConfig, loadGlobalAgentHooks, loadGlobalAgentPermissionRules, loadGlobalAgentBridgeStore, loadGlobalAgentHistoryStore, loadGroups, loadOrchestratorConfig, loadTasks, normalizeFeishuEventPayload, parseMultipart, pauseGlobalAgentRun, processFeishuCardAction, processFeishuControlledMessage, publicGlobalAgentRun, publicGlobalAgentRunSummary, refreshGlobalDevelopmentMissions, relayGlobalPetEvent, replayAgentTrace, resolveFeishuDestination, resolveFeishuGlobalAgentSessionId, resumeGlobalAgentRun, runAgentQualityCenterSelfTest, runAgentReasoningLoopSelfTest, runAgentRuntimeKernelSelfTest, runGlobalAgentLoopSelfTest, runGlobalAgentRuntimeSelfTest, runGlobalControlCenterSelfTest, runGlobalGroupMemoryContextSelfTest, runGlobalMissionSupervisorAsyncSelfTest, runGlobalMissionSupervisorSelfTest, runAgenticGlobalRequest, saveGlobalAgentBridgeStore, saveGlobalAgentHook, saveGlobalAgentPermissionRule, sendFeishuReportMessage, sendJson, setAgentQualityPolicy, startGlobalMissionSupervisor, steerGlobalAgentRun, syncGlobalAgentWebHistory, updateGlobalAgentSupervisionState, verifyFeishuEventToken, waitForIdempotencyResult } = deps;
    const readJsonRequest = (req) => new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024)
                reject(new Error("请求内容过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求 JSON 格式无效"));
            }
        });
        req.on("error", reject);
    });
    const globalFeishuSessionSnapshot = () => {
        const store = loadGlobalAgentHistoryStore();
        const bindings = getFeishuGlobalSessionBindings();
        const sessions = (store.sessions || [])
            .filter((session) => String(session.source || "web") === "feishu")
            .map((session) => ({
            ...session,
            feishuBindings: bindings.filter((binding) => String(binding.active_session_id || "") === String(session.id || "")),
        }));
        return { sessions, bindings };
    };
    const requirementTargets = () => [
        ...loadGroups().map((group) => ({
            type: "group",
            id: group.id,
            name: group.name || group.id,
            capabilities: (group.members || []).flatMap((member) => member.skills || member.capabilities || []),
        })),
        ...getConfigs().map((config) => ({ type: "project", id: config.name, name: (0, project_runtime_1.projectDisplayName)(config.name) })),
    ];
    const drainingGlobalWebTurns = new Set();
    let globalWebTurnRecoveryTimer = null;
    const drainGlobalWebTurns = async (baseUrl, ctx, sessionId) => {
        if (!sessionId || drainingGlobalWebTurns.has(sessionId))
            return;
        drainingGlobalWebTurns.add(sessionId);
        try {
            while (true) {
                const occupied = listGlobalAgentRuns({ sessionId, limit: 20 })
                    .some((run) => ["running", "executing", "supervising", "paused", "waiting_clarification", "waiting_user", "blocked", "interrupted", "recovering"]
                    .includes(String(run?.status || "").toLowerCase()));
                if (occupied)
                    break;
                const turn = conversationTurnControl.claim({ scope: "global", conversation_id: sessionId });
                if (!turn)
                    break;
                const metadata = turn.metadata?.global_context_v2 || {};
                try {
                    const run = await runAgenticGlobalRequest(baseUrl, ctx, {
                        message: String(metadata.message || turn.message || ""),
                        originalMessage: String(metadata.original_message || turn.message || ""),
                        history: Array.isArray(metadata.history) ? metadata.history : [],
                        sessionId,
                        source: String(metadata.source || "web-queue-recovery"),
                        traceId: String(metadata.trace_id || ""),
                        clarificationRunId: String(metadata.clarification_run_id || ""),
                        sourceIngestion: metadata.source_ingestion || null,
                        readOnly: metadata.read_only === true,
                        principal: metadata.principal || null,
                        requestedTargetRefs: Array.isArray(metadata.requested_target_refs) ? metadata.requested_target_refs : [],
                        turnId: turn.id,
                        queueScope: `global:${sessionId}`,
                    });
                    conversationTurnControl.settle({
                        id: turn.id,
                        status: run.status === "failed" ? "failed" : "completed",
                        run_id: run.id,
                        checkpoint: run.status,
                        semantic_decision_receipt: run.workflow_decision || run.workflowDecision || null,
                        result: { run_id: run.id, status: run.status, retryable: run.retryable === true },
                        error: run.status === "failed" ? run.error || run.final_reply : "",
                    });
                }
                catch (error) {
                    conversationTurnControl.settle({ id: turn.id, status: "failed", checkpoint: "failed", error: error?.message || String(error) });
                }
            }
        }
        finally {
            drainingGlobalWebTurns.delete(sessionId);
        }
    };
    const startGlobalWebTurnRecoveryForServer = (baseUrl, ctx) => {
        if (globalWebTurnRecoveryTimer)
            return { started: false };
        const tick = () => {
            const queued = conversationTurnControl.list({ scope: "global", statuses: "queued", limit: 500 }).turns;
            for (const sessionId of [...new Set(queued.map((turn) => String(turn.conversation_id || "")).filter(Boolean))]) {
                void drainGlobalWebTurns(baseUrl, ctx, sessionId).catch((error) => console.warn(`[全局 Agent 队列] 启动恢复失败：${error?.message || error}`));
            }
        };
        tick();
        globalWebTurnRecoveryTimer = setInterval(tick, 3_000);
        globalWebTurnRecoveryTimer.unref?.();
        return { started: true };
    };
    const stopGlobalWebTurnRecoveryForServer = () => {
        if (globalWebTurnRecoveryTimer)
            clearInterval(globalWebTurnRecoveryTimer);
        globalWebTurnRecoveryTimer = null;
    };
    function handleGlobalAgentApi(pathname, req, res, parsed, ctx) {
        if (pathname === "/api/global-agent/dispatch-targets" && req.method === "GET") {
            const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
            const targets = (0, automation_session_bindings_1.listGlobalDispatchTargets)().filter((item) => {
                if (principal?.kind !== "browser" || principal.role === "admin")
                    return true;
                const type = String(item.scope || "").toLowerCase() === "group" ? "group" : "project";
                return (0, access_policy_1.hasResourceAccess)(principal.userId, principal.role, type, String(item.scopeId || ""), "use");
            });
            sendJson(res, { success: true, targets });
            return true;
        }
        if (pathname === "/api/global-agent/history" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const store = syncGlobalAgentWebHistory(payload);
                    require("../../agents/global/memory").pruneDeletedGlobalWebSessionMemory((store.sessions || []).filter((session) => String(session.source || "web") === "web").map((session) => String(session.id || "")));
                    sendJson(res, { success: true, sessions: store.sessions?.length || 0, current_session_id: store.current_session_id || "" });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || "全局 Agent 历史同步失败" }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/history" && req.method === "GET") {
            const store = loadGlobalAgentHistoryStore();
            sendJson(res, { success: true, ...store });
            return true;
        }
        if (pathname === "/api/global-agent/feishu-sessions" && req.method === "GET") {
            sendJson(res, { success: true, ...globalFeishuSessionSnapshot() });
            return true;
        }
        if (pathname === "/api/global-agent/feishu-sessions/create" && req.method === "POST") {
            void readJsonRequest(req).then((payload) => {
                const session = createGlobalAgentConversationSession({ source: "feishu", name: payload.name });
                let binding = null;
                if (String(payload.binding_id || "").trim()) {
                    binding = bindFeishuGlobalSession({ bindingId: String(payload.binding_id), sessionId: session.id, action: "bind" });
                }
                sendJson(res, { success: true, session: { ...session, feishuBindings: binding ? [binding] : [] }, binding });
            }).catch((error) => sendJson(res, { success: false, error: error?.message || "创建飞书会话失败" }, 400));
            return true;
        }
        if (pathname === "/api/global-agent/feishu-sessions/bind" && req.method === "POST") {
            void readJsonRequest(req).then((payload) => {
                const sessionId = String(payload.session_id || "").trim();
                const action = payload.action === "unbind" ? "unbind" : "bind";
                if (action === "bind") {
                    const session = (loadGlobalAgentHistoryStore().sessions || []).find((item) => String(item.id || "") === sessionId);
                    if (!session || String(session.source || "web") !== "feishu")
                        throw new Error("只能将飞书目标绑定到飞书会话");
                }
                const binding = bindFeishuGlobalSession({ bindingId: String(payload.binding_id || ""), sessionId, action });
                sendJson(res, { success: true, binding, ...globalFeishuSessionSnapshot() });
            }).catch((error) => sendJson(res, { success: false, error: error?.message || "更新飞书会话绑定失败" }, 400));
            return true;
        }
        if (pathname === "/api/global-agent/feishu-sessions/delete" && req.method === "POST") {
            void readJsonRequest(req).then((payload) => {
                const sessionId = String(payload.session_id || "").trim();
                const result = deleteGlobalAgentConversationSession(sessionId, "feishu");
                for (const binding of getFeishuGlobalSessionBindings()) {
                    if (String(binding.active_session_id || "") === sessionId) {
                        bindFeishuGlobalSession({ bindingId: binding.id, sessionId, action: "unbind" });
                    }
                }
                sendJson(res, { success: true, ...result, ...globalFeishuSessionSnapshot() });
            }).catch((error) => sendJson(res, { success: false, error: error?.message || "删除飞书会话失败" }, 400));
            return true;
        }
        if (pathname === "/api/global-agent/memory/compact" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const sessionId = String(payload.session_id || payload.sessionId || "").trim();
                    if (!sessionId)
                        return sendJson(res, { success: false, error: "缺少当前全局 Agent 会话 ID" }, 400);
                    const known = (loadGlobalAgentHistoryStore().sessions || []).some((session) => String(session.id) === sessionId);
                    if (!known)
                        return sendJson(res, { success: false, error: "全局 Agent 会话不存在" }, 404);
                    const result = await compactGlobalAgentSessionWithModel(sessionId, {
                        force: true,
                        reason: "manual_slash_compact",
                        customInstructions: String(payload.custom_instructions || payload.customInstructions || "").trim(),
                    });
                    sendJson(res, {
                        success: true,
                        session_id: sessionId,
                        mode: "model_required",
                        compacted: result.compacted === true,
                        reason: result.reason || "manual_slash_compact",
                        archive_id: result.archive?.id || "",
                        before_tokens: Number(result.session?.preCompactTokenCount || result.tokenCount || 0),
                        after_tokens: Number(result.session?.postCompactTokenCount || 0),
                        preserved_messages: Number(result.session?.boundary?.preservedMessageCount || 0),
                        summary_source: result.session?.summarySource || "model",
                        token_measurement: result.session?.compaction?.tokenMeasurement || null,
                        auto_compact_threshold: Number(result.session?.compaction?.postCompactGate?.threshold || 0),
                        post_compact_gate: result.session?.compaction?.postCompactGate || null,
                        session_memory: result.session?.compaction?.sessionMemoryState || null,
                        consecutive_failures: Number(result.session?.compaction?.consecutiveFailures || 0),
                        model_context_capacity: result.archive?.model?.modelContextCapacity || null,
                    });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || "全局 Agent 会话压缩失败" }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/bridge/pending" && req.method === "GET") {
            const store = loadGlobalAgentBridgeStore();
            const pending = (store.requests || []).filter((item) => item.status === "pending").sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0] || null;
            sendJson(res, { success: true, request: pending });
            return true;
        }
        if (pathname === "/api/global-agent/bridge/result" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const store = loadGlobalAgentBridgeStore();
                    const request = (store.requests || []).find((item) => item.id === payload.id);
                    if (!request)
                        return sendJson(res, { success: false, error: "桥接请求不存在" }, 404);
                    request.status = payload.success === false ? "failed" : "done";
                    request.reply = String(payload.reply || payload.error || GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK);
                    request.error = payload.error || "";
                    request.updated_at = new Date().toISOString();
                    saveGlobalAgentBridgeStore(store);
                    sendJson(res, { success: true });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || "桥接结果保存失败" }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/feishu/control-bot/message" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                let reactionInput = null;
                let inboundReceiptId = "";
                let inboundOperationKey = "";
                let streamResponse = false;
                const emitControlStream = (event) => {
                    if (!streamResponse || res.writableEnded || res.destroyed)
                        return;
                    res.write(`data: ${JSON.stringify(event)}\n\n`);
                };
                const finishReaction = (status) => {
                    if (!reactionInput)
                        return;
                    try {
                        (0, feishu_reaction_feedback_1.finishFeishuReactionFeedback)({ ...reactionInput, status });
                    }
                    catch (reactionError) {
                        console.warn(`[飞书状态表情] 全局结束通知失败 reason=${String(reactionError?.message || reactionError).slice(0, 160)}`);
                    }
                    reactionInput = null;
                };
                try {
                    const isAcp = req.ccmAuth?.kind === "internal" && req.ccmAuth?.caller === "feishu-acp";
                    const config = loadFeishuConfig();
                    if (!isAcp) {
                        const expected = String(config.control_bot_hook_token || "").trim();
                        const actual = String(parsed.query.token || req.headers["x-ccm-token"] || "").trim();
                        if (!expected || actual !== expected) {
                            sendJson(res, { success: false, error: "控制机器人 Hook Token 校验失败" }, 401);
                            return;
                        }
                    }
                    let payload = body ? JSON.parse(body) : {};
                    const requestedTargetType = String(payload.target_type || payload.targetType || "global_agent");
                    if (requestedTargetType !== "global_agent") {
                        sendJson(res, { success: false, error: requestedTargetType.includes("group") ? "飞书不再支持直接进入群聊 Agent" : "全局飞书入口目标类型无效" }, 403);
                        return;
                    }
                    streamResponse = isAcp && payload.stream === true;
                    if (isAcp) {
                        payload = { ...payload, ...resolveControlBotAcpPlatformContext(payload.acpSessionId || payload.sessionId) };
                    }
                    const inboundEnvelope = (0, feishu_conversation_v2_1.buildFeishuInboundEnvelopeV2)({
                        payload: { ...payload, target_type: "global_agent" },
                        targetType: "global_agent",
                        applicationId: config.control_bot_app_id || config.app_id,
                        transport: isAcp ? "acp" : "internal",
                        messageId: getFeishuMessageId(payload),
                    });
                    payload = {
                        ...payload,
                        target_type: "global_agent",
                        conversation_key_v2: inboundEnvelope.identity.conversation_key_v2,
                        feishu_app_fingerprint: inboundEnvelope.identity.application_fingerprint,
                        feishu_inbound_envelope: inboundEnvelope,
                    };
                    const text = extractCcConnectHookText(payload);
                    if (!text) {
                        sendJson(res, { success: false, error: "未从控制机器人载荷中识别到文本消息" }, 400);
                        return;
                    }
                    const inboundClaim = (0, feishu_conversation_v2_1.acquireFeishuInboundReceipt)(inboundEnvelope, 11 * 60 * 1000);
                    inboundReceiptId = inboundClaim.receipt.id;
                    inboundOperationKey = inboundEnvelope.idempotency_key;
                    const conversationId = resolveFeishuGlobalAgentSessionId(payload);
                    const messageId = getFeishuMessageId(payload);
                    const operationKey = inboundEnvelope.idempotency_key;
                    const operation = acquireIdempotency({ scope: "feishu-global-inbound-v2", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { conversation_id: conversationId, message_id: messageId, envelope_checksum: inboundEnvelope.checksum } });
                    const replyWithDuplicate = (settled) => {
                        const replay = settled?.result || inboundClaim.receipt.result || {};
                        const duplicateResult = { success: settled?.status === "completed" || inboundClaim.receipt.processing_state === "completed", duplicate: true, message: "重复飞书消息已抑制", reply: replay.reply || replay.error || "消息仍在处理中", trace_id: settled?.trace_id || operation.traceId };
                        if (streamResponse) {
                            res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
                            emitControlStream({ type: "result", ...duplicateResult });
                            emitControlStream({ type: "done" });
                            res.end();
                        }
                        else
                            sendJson(res, duplicateResult);
                    };
                    if (!inboundClaim.acquired) {
                        const settled = operation.acquired
                            ? { status: inboundClaim.receipt.processing_state === "completed" ? "completed" : "failed", result: inboundClaim.receipt.result, trace_id: operation.traceId }
                            : operation.inProgress ? await waitForIdempotencyResult("feishu-global-inbound-v2", operationKey) : operation.record;
                        if (operation.acquired) {
                            if (settled.status === "completed")
                                completeIdempotency("feishu-global-inbound-v2", operationKey, settled.result);
                            else
                                failIdempotency("feishu-global-inbound-v2", operationKey, settled.result?.error || "飞书入站回执未完成");
                        }
                        replyWithDuplicate(settled);
                        return;
                    }
                    if (!operation.acquired) {
                        const settled = operation.inProgress ? await waitForIdempotencyResult("feishu-global-inbound-v2", operationKey) : operation.record;
                        if (settled?.status === "completed")
                            (0, feishu_conversation_v2_1.completeFeishuInboundReceipt)(inboundReceiptId, { reply: settled.result?.reply });
                        else
                            (0, feishu_conversation_v2_1.failFeishuInboundReceipt)(inboundReceiptId, settled?.result?.error || "重复飞书消息仍在处理中", true);
                        replyWithDuplicate(settled);
                        return;
                    }
                    if (isAcp && /^om_[a-z0-9_-]{8,200}$/i.test(messageId)) {
                        reactionInput = { scope: "global", messageId };
                        try {
                            (0, feishu_reaction_feedback_1.beginFeishuReactionFeedback)(reactionInput);
                        }
                        catch (reactionError) {
                            console.warn(`[飞书状态表情] 全局开始通知失败 reason=${String(reactionError?.message || reactionError).slice(0, 160)}`);
                            reactionInput = null;
                        }
                    }
                    if (streamResponse) {
                        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
                        if (typeof res.flushHeaders === "function")
                            res.flushHeaders();
                    }
                    const controlled = await processFeishuControlledMessage(getRequestBaseUrl(req), ctx, text, payload, {
                        sendReport: !isAcp,
                        traceId: operation?.traceId,
                        onDelta: streamResponse ? (delta) => emitControlStream({ type: "chunk", text: delta }) : undefined,
                    });
                    (0, feishu_conversation_v2_1.updateFeishuInboundReceipt)(inboundReceiptId, "agent_completed", { reply: controlled.reply });
                    completeIdempotency("feishu-global-inbound-v2", operationKey, controlled);
                    (0, feishu_conversation_v2_1.completeFeishuInboundReceipt)(inboundReceiptId, { reply: controlled.reply, delivery_id: controlled.delivery?.id });
                    const responsePayload = { success: true, message: controlled.queued ? "控制机器人消息已排队" : "控制机器人消息已处理", ...controlled, trace_id: operation?.traceId || "" };
                    if (streamResponse) {
                        emitControlStream({ type: "result", ...responsePayload });
                        emitControlStream({ type: "done" });
                        res.end();
                    }
                    else {
                        sendJson(res, responsePayload);
                    }
                    finishReaction("completed");
                }
                catch (error) {
                    if (inboundReceiptId)
                        try {
                            (0, feishu_conversation_v2_1.failFeishuInboundReceipt)(inboundReceiptId, error, true);
                        }
                        catch { }
                    if (inboundOperationKey)
                        try {
                            failIdempotency("feishu-global-inbound-v2", inboundOperationKey, error);
                        }
                        catch { }
                    finishReaction("failed");
                    if (streamResponse && res.headersSent) {
                        emitControlStream({ type: "error", text: error?.message || "控制机器人消息处理失败" });
                        emitControlStream({ type: "done" });
                        res.end();
                    }
                    else if (!res.headersSent) {
                        sendJson(res, { success: false, error: error?.message || "控制机器人消息处理失败" }, 400);
                    }
                }
            });
            return true;
        }
        if (pathname === "/api/feishu/bot/test" && req.method === "POST") {
            const config = loadFeishuConfig();
            const publicBaseUrl = String(config.control_bot_public_base_url || "").trim().replace(/\/$/, "");
            const verificationToken = String(config.control_bot_verification_token || "").trim();
            if (!publicBaseUrl || !/^https:\/\//i.test(publicBaseUrl)) {
                sendJson(res, { success: false, error: "请先填写可公网访问的 HTTPS 地址" }, 400);
                return true;
            }
            if (!verificationToken) {
                sendJson(res, { success: false, error: "请先填写 Verification Token" }, 400);
                return true;
            }
            const callbackUrl = publicBaseUrl + "/api/feishu/bot/event";
            const challenge = "ccm-" + Date.now().toString(36);
            void fetch(callbackUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "url_verification", challenge, token: verificationToken }),
                signal: AbortSignal.timeout(10000),
            }).then(async (response) => {
                const data = await response.json();
                if (!response.ok || data?.challenge !== challenge)
                    throw new Error(data?.error || `回调响应异常 (${response.status})`);
                sendJson(res, { success: true, message: "控制机器人事件回调可用", callback_url: callbackUrl });
            }).catch((error) => {
                sendJson(res, { success: false, error: `无法访问事件回调：${error?.message || String(error)}` }, 400);
            });
            return true;
        }
        if (pathname === "/api/feishu/bot/event" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const config = loadFeishuConfig();
                    const rawPayload = body ? JSON.parse(body) : {};
                    const payload = normalizeFeishuEventPayload(rawPayload, config);
                    const requestedTargetType = String(payload.target_type || payload.targetType || "global_agent");
                    if (requestedTargetType !== "global_agent")
                        throw new Error(requestedTargetType.includes("group") ? "飞书不再支持直接进入群聊 Agent" : "飞书事件目标类型无效");
                    verifyFeishuEventToken(payload, config);
                    if (payload.type === "url_verification" || payload.challenge) {
                        sendJson(res, { challenge: payload.challenge });
                        return;
                    }
                    const eventType = String(payload?.header?.event_type || payload?.type || "");
                    if (["card.action.trigger", "card.action.trigger_v1"].includes(eventType)) {
                        if (config.control_bot_enabled !== true) {
                            sendJson(res, { toast: { type: "error", content: "CCM 飞书任务通道未启用" } });
                            return;
                        }
                        try {
                            const result = await processFeishuCardAction(getRequestBaseUrl(req), payload, ctx);
                            sendJson(res, { toast: { type: "success", content: result.message || "操作成功" } });
                        }
                        catch (error) {
                            sendJson(res, { toast: { type: "error", content: error?.message || "卡片操作失败" } });
                        }
                        return;
                    }
                    sendJson(res, { code: 0 });
                    if (config.control_bot_enabled !== true)
                        return;
                    if (eventType !== "im.message.receive_v1")
                        return;
                    if (payload?.event?.sender?.sender_type === "app")
                        return;
                    const messageId = getFeishuMessageId(payload);
                    const messageType = String(payload?.event?.message?.message_type || "").toLowerCase();
                    const extractedText = extractFeishuMessageText(payload);
                    const text = extractedText || (["file", "media", "image"].includes(messageType) ? "请读取并处理这条飞书附件。" : "");
                    if (!text) {
                        const conversationId = resolveFeishuGlobalAgentSessionId({ ...payload, target_type: "global_agent" });
                        const destination = (0, feishu_channel_1.recordFeishuInbound)({ payload: { ...payload, target_type: "global_agent" }, sessionId: conversationId, messageId });
                        (0, feishu_channel_1.bindFeishuTaskContext)({ sessionId: conversationId, destination, source: "feishu-control-bot", targetType: "global_agent" });
                        void (0, feishu_channel_1.notifyFeishuTaskStage)({
                            stage: "global_agent_reply",
                            title: "全局 Agent",
                            markdown: "目前支持文字、图片和文件消息；请重新发送可读取的内容。",
                            sessionId: conversationId,
                            dedupeKey: `unsupported-feishu-message:${messageId || payload?.header?.event_id || "unknown"}`,
                        });
                        return;
                    }
                    const inboundEnvelope = (0, feishu_conversation_v2_1.buildFeishuInboundEnvelopeV2)({
                        payload: { ...payload, target_type: "global_agent" },
                        targetType: "global_agent",
                        applicationId: config.control_bot_app_id || config.app_id,
                        transport: "event_callback",
                        messageId,
                        eventId: payload?.header?.event_id,
                    });
                    const routedPayload = {
                        ...payload,
                        target_type: "global_agent",
                        conversation_key_v2: inboundEnvelope.identity.conversation_key_v2,
                        feishu_app_fingerprint: inboundEnvelope.identity.application_fingerprint,
                        feishu_inbound_envelope: inboundEnvelope,
                    };
                    const inboundClaim = (0, feishu_conversation_v2_1.acquireFeishuInboundReceipt)(inboundEnvelope, 11 * 60 * 1000);
                    const operationKey = inboundEnvelope.idempotency_key;
                    const operation = acquireIdempotency({ scope: "feishu-global-inbound-v2", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { message_id: messageId, event_id: payload?.header?.event_id || "", envelope_checksum: inboundEnvelope.checksum } });
                    if (!inboundClaim.acquired) {
                        if (operation.acquired) {
                            if (inboundClaim.receipt.processing_state === "completed")
                                completeIdempotency("feishu-global-inbound-v2", operationKey, inboundClaim.receipt.result || {});
                            else
                                failIdempotency("feishu-global-inbound-v2", operationKey, inboundClaim.receipt.result?.error || "飞书入站回执仍在处理中");
                        }
                        return;
                    }
                    if (!operation.acquired) {
                        if (operation.record?.status === "completed")
                            (0, feishu_conversation_v2_1.completeFeishuInboundReceipt)(inboundClaim.receipt.id, { reply: operation.record?.result?.reply });
                        else
                            (0, feishu_conversation_v2_1.failFeishuInboundReceipt)(inboundClaim.receipt.id, operation.record?.result?.error || "重复飞书消息仍在处理中", true);
                        return;
                    }
                    (0, feishu_conversation_v2_1.updateFeishuInboundReceipt)(inboundClaim.receipt.id, "agent_processing");
                    void processFeishuControlledMessage(getRequestBaseUrl(req), ctx, text, routedPayload, { traceId: operation.traceId })
                        .then(result => {
                        completeIdempotency("feishu-global-inbound-v2", operationKey, result);
                        (0, feishu_conversation_v2_1.completeFeishuInboundReceipt)(inboundClaim.receipt.id, { reply: result.reply, delivery_id: result.delivery?.id });
                    })
                        .catch(error => {
                        failIdempotency("feishu-global-inbound-v2", operationKey, error);
                        (0, feishu_conversation_v2_1.failFeishuInboundReceipt)(inboundClaim.receipt.id, error, true);
                        const conversationId = resolveFeishuGlobalAgentSessionId(routedPayload);
                        void (0, feishu_channel_1.notifyFeishuTaskStage)({
                            stage: "failure",
                            title: "全局 Agent 处理失败",
                            markdown: `这条消息暂时没有处理成功：${String(error?.message || error).slice(0, 240)}。你可以直接重新发送。`,
                            sessionId: conversationId,
                            dedupeKey: `global-inbound-failure:${inboundEnvelope.idempotency_key}:${inboundClaim.receipt.attempt}`,
                        });
                    });
                }
                catch (error) {
                    if (!res.headersSent)
                        sendJson(res, { code: 1, error: error?.message || "飞书事件处理失败" }, 401);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/capabilities" && req.method === "GET") {
            sendJson(res, {
                success: true,
                capabilities: Object.entries(GLOBAL_MANAGEMENT_ACTIONS).map(([type, spec]) => ({
                    type,
                    label: spec.label,
                    operations: spec.operations,
                    destructive: spec.destructive,
                    required_params: GLOBAL_MANAGEMENT_REQUIRED_PARAMS[type] || {},
                })),
            });
            return true;
        }
        if (pathname === "/api/global-agent/audit" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    sendJson(res, { success: true, audit: appendGlobalActionAudit(payload) });
                }
                catch (error) {
                    sendJson(res, { error: error.message || "审计记录失败" }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/orchestrate" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const decompositionPlan = payload.decomposition_plan || payload.decompositionPlan || payload.requirement_decomposition || payload.requirementDecomposition;
                    const result = decompositionPlan?.items?.length
                        ? createRequirementEpicWithChildren({
                            ...payload,
                            decomposition_plan: decompositionPlan,
                            confirmed: payload.confirmed === true,
                            source: payload.source || "global-agent-chat",
                            channel: payload.channel || "web-global-agent",
                            conversation_id: payload.session_id || payload.sessionId || "default",
                            client_message_id: payload.client_message_id || payload.clientMessageId || payload.request_id || payload.requestId || "",
                        })
                        : createGlobalDevelopmentMission({
                            ...payload,
                            source: payload.source || "global-agent-chat",
                        }, ctx);
                    if (result.needs_clarification || result.needs_confirmation) {
                        return sendJson(res, result, 409);
                    }
                    const mission = result.epic || result.mission;
                    const supervisor = startGlobalMissionSupervisor({
                        mission_id: mission.id,
                        global_run_id: payload.global_run_id || payload.globalRunId || "",
                        trace_id: mission.trace_id,
                        session_id: payload.session_id || payload.sessionId || "default",
                        source: payload.source || "global-agent-chat",
                        business_goal: mission.business_goal,
                        acceptance: mission.acceptance_criteria,
                        max_attempts: payload.max_attempts || payload.maxAttempts || 3,
                    });
                    sendJson(res, { ...result, mission, supervisor });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error.message || "全局任务创建失败" }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/missions" && req.method === "GET") {
            const id = String(parsed.query.id || "").trim();
            if (id) {
                const result = getGlobalDevelopmentMission(id);
                if (!result)
                    return sendJson(res, { error: "全局任务不存在" }, 404);
                const supervisor = getGlobalMissionSupervisor(id);
                const childNavigation = result.children.map((task) => (0, task_conversation_links_1.buildTaskConversationLinks)(task)).filter(Boolean);
                const navigation = {
                    schema: "ccm-global-mission-navigation-v1",
                    source: (0, task_conversation_links_1.buildTaskConversationLinks)(result.mission)?.links?.find((item) => item.relation === "source") || null,
                    targets: childNavigation.flatMap((item) => item.links || []).filter((item) => item.relation === "target"),
                    contentStored: false,
                };
                const delivery = (0, task_conversation_links_1.buildGlobalMissionSafeProjection)(result.mission, result.children, supervisor);
                const projectionRevision = crypto.createHash("sha256").update(JSON.stringify({
                    mission: result.mission?.id,
                    revision: result.mission?.revision,
                    updatedAt: result.mission?.updated_at,
                    supervisor: supervisor?.updated_at,
                    children: result.children.map((task) => [task.id, task.revision, task.status, task.updated_at]),
                })).digest("hex");
                sendJson(res, { success: true, ...result, supervisor, navigation, delivery, projectionRevision });
                return true;
            }
            const missions = refreshGlobalDevelopmentMissions();
            sendJson(res, { success: true, missions });
            return true;
        }
        if (pathname === "/api/global-agent/supervisors" && req.method === "GET") {
            const id = String(parsed.query.id || parsed.query.mission_id || parsed.query.missionId || "").trim();
            if (id) {
                const supervisor = getGlobalMissionSupervisor(id);
                if (!supervisor)
                    return sendJson(res, { success: false, error: "全局任务监工不存在" }, 404), true;
                sendJson(res, { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) });
                return true;
            }
            sendJson(res, {
                success: true,
                supervisors: listGlobalMissionSupervisors({ status: String(parsed.query.status || "") || undefined, limit: Number(parsed.query.limit || 50) }),
                scheduler: getGlobalMissionSupervisorSchedulerStatus(),
            });
            return true;
        }
        if (pathname === "/api/global-agent/terminal-deliveries" && req.method === "GET") {
            const states = String(parsed.query.state || parsed.query.states || "").split(",").map((item) => item.trim()).filter(Boolean);
            sendJson(res, { success: true, deliveries: (0, global_terminal_delivery_1.listGlobalTerminalDeliveries)({ supervisorId: String(parsed.query.supervisor_id || "") || undefined, states }) });
            return true;
        }
        if (pathname === "/api/global-agent/terminal-deliveries/retry" && req.method === "POST") {
            void readJsonRequest(req).then((payload) => {
                const delivery = (0, global_terminal_delivery_1.retryGlobalTerminalDelivery)(String(payload.id || payload.delivery_id || ""));
                sendJson(res, { success: true, delivery });
            }).catch((error) => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
            return true;
        }
        if (pathname === "/api/global-agent/supervisors/self-test" && req.method === "GET") {
            void runGlobalMissionSupervisorAsyncSelfTest()
                .then(asyncResult => {
                const unit = runGlobalMissionSupervisorSelfTest();
                const pass = unit.pass && asyncResult.pass;
                sendJson(res, { success: pass, result: { pass, unit, async_e2e: asyncResult } }, pass ? 200 : 500);
            })
                .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
            return true;
        }
        if (pathname === "/api/global-agent/supervisors/control" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const id = String(payload.id || payload.supervisor_id || payload.mission_id || "").trim();
                    if (!id)
                        return sendJson(res, { success: false, error: "缺少监工或全局任务 ID" }, 400);
                    const operation = String(payload.operation || "check_now");
                    const supervisor = operation === "check_now"
                        ? await checkGlobalMissionSupervisorNow(id, createMissionSupervisorRuntime(ctx))
                        : await controlGlobalMissionSupervisor(id, operation, createMissionSupervisorRuntime(ctx), payload);
                    let run = null;
                    if (supervisor.global_run_id) {
                        run = supervisor.status === "cancelled"
                            ? completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled")
                            : updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
                    }
                    const userSupplement = String(payload.message || payload.followup || "").trim();
                    if (operation === "update_goal" && userSupplement && supervisor.session_id) {
                        ingestGlobalAgentConversation({
                            sessionId: supervisor.session_id,
                            source: payload.source || "global_mission_user_input",
                            messages: [{
                                    role: "user",
                                    content: userSupplement,
                                    timestamp: payload.message_timestamp || payload.messageTimestamp || new Date().toISOString(),
                                    mission_id: supervisor.mission_id,
                                    run_id: supervisor.global_run_id || "",
                                    metadata: {
                                        continuation_kind: supervisor.last_continuation?.kind || "supplement",
                                        waiting_user_resolved: supervisor.last_continuation?.resolves_waiting_user === true,
                                        request_id: payload.request_id || payload.requestId || "",
                                    },
                                }],
                        });
                    }
                    sendJson(res, {
                        success: true,
                        supervisor,
                        mission: getGlobalDevelopmentMission(supervisor.mission_id),
                        run: run ? publicGlobalAgentRun(run) : null,
                    });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/tools" && req.method === "GET") {
            const authorization = (0, global_agent_tool_authorization_1.getGlobalAgentToolAuthorizationPayload)();
            const options = (0, tool_authorization_1.buildToolAuthorizationOptions)({
                mcpTools: (0, db_1.loadMcpTools)(),
                skills: (0, db_1.loadSkills)(),
                status: tool_manager_1.toolManager.getToolList(),
            });
            sendJson(res, { success: true, ...authorization, options });
            return true;
        }
        if (pathname === "/api/global-agent/tools" && req.method === "POST") {
            void readJsonRequest(req)
                .then(payload => (0, global_agent_tool_authorization_1.saveGlobalAgentToolAuthorization)(payload))
                .then(result => sendJson(res, { success: true, ...result }))
                .catch((error) => sendJson(res, { success: false, error: error?.message || "保存全局 Agent 工具配置失败" }, 400));
            return true;
        }
        if (pathname === "/api/global-agent/tools/self-test" && req.method === "GET") {
            const result = (0, global_agent_tool_authorization_1.runGlobalAgentToolAuthorizationSelfTest)();
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/runtime/tools" && req.method === "GET") {
            sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
            return true;
        }
        if (pathname === "/api/global-agent/control-center" && req.method === "GET") {
            const message = String(parsed.query.message || "").trim();
            sendJson(res, { success: true, control: buildGlobalControlCenterSnapshot(message) });
            return true;
        }
        if (pathname === "/api/global-agent/control-center/intent-preview" && req.method === "GET") {
            const message = String(parsed.query.message || "").trim();
            void (0, workflow_decision_1.decideWorkflowWithModel)({
                message,
                scope: "global",
                context: { projects: requirementTargets().map((item) => ({ type: item.type, id: item.id, name: item.name })) },
            }).then(workflowDecision => {
                sendJson(res, { success: true, workflow_decision: workflowDecision, intent: workflowDecision, dispatch: { mode: workflowDecision.mode, targets: workflowDecision.targetRefs } });
            }).catch((error) => {
                sendJson(res, { success: false, error: `统一大模型无法形成路由预览：${error?.message || error}` }, 503);
            });
            return true;
        }
        if (pathname === "/api/global-agent/control-center/health" && req.method === "GET") {
            sendJson(res, { success: true, health: buildGlobalSystemHealth() });
            return true;
        }
        if (pathname === "/api/global-agent/group-memory" && req.method === "GET") {
            const query = String(parsed.query.query || parsed.query.q || "").trim();
            sendJson(res, {
                success: true,
                group_memory_context: buildGlobalGroupMemoryContext(query, {
                    sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
                    maxGroups: Number(parsed.query.max_groups || parsed.query.maxGroups || 8),
                    maxTypedMemory: Number(parsed.query.max_typed_memory || parsed.query.maxTypedMemory || 4),
                }),
            });
            return true;
        }
        if (pathname === "/api/global-agent/group-memory/self-test" && req.method === "GET") {
            const result = runGlobalGroupMemoryContextSelfTest();
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/control-center/self-test" && req.method === "GET") {
            const result = runGlobalControlCenterSelfTest();
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/runtime/permissions" && req.method === "GET") {
            sendJson(res, { success: true, rules: loadGlobalAgentPermissionRules() });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/permissions" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const result = payload.operation === "delete" || payload.delete === true
                        ? deleteGlobalAgentPermissionRule(String(payload.id || ""))
                        : saveGlobalAgentPermissionRule(payload);
                    sendJson(res, { success: true, result, rules: loadGlobalAgentPermissionRules() });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/hooks" && req.method === "GET") {
            sendJson(res, { success: true, hooks: loadGlobalAgentHooks() });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/hooks" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const result = payload.operation === "delete" || payload.delete === true
                        ? deleteGlobalAgentHook(String(payload.id || ""))
                        : saveGlobalAgentHook(payload);
                    sendJson(res, { success: true, result, hooks: loadGlobalAgentHooks() });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/background" && req.method === "GET") {
            const id = String(parsed.query.id || parsed.query.run_id || "").trim();
            if (!id)
                return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
            const run = getGlobalAgentRun(id);
            sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/background/control" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const id = String(payload.id || payload.run_id || "").trim();
                    const operation = String(payload.operation || "").toLowerCase();
                    if (!id)
                        return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
                    let run;
                    if (operation === "stop" || operation === "cancel")
                        run = cancelGlobalAgentRun(id);
                    else if (operation === "pause")
                        run = pauseGlobalAgentRun(id);
                    else if (operation === "resume" || operation === "takeover")
                        run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
                            approved: payload.approved === true ? true : undefined,
                            feedback: payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "",
                            source: payload.source || payload.resume_source || payload.resumeSource || "global_background_control",
                        });
                    else
                        throw new Error("operation 必须是 stop、pause、resume 或 takeover");
                    sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/session-debug" && req.method === "GET") {
            const id = String(parsed.query.id || parsed.query.run_id || "").trim();
            if (!id)
                return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
            const run = getGlobalAgentRun(id);
            if (!run)
                return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
            sendJson(res, { success: true, debug: buildGlobalAgentSessionDebug(run) });
            return true;
        }
        if (pathname === "/api/global-agent/runtime/self-test" && req.method === "GET") {
            const result = runGlobalAgentRuntimeSelfTest(GLOBAL_AGENT_TOOL_SPECS);
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/agentic/tools" && req.method === "GET") {
            sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
            return true;
        }
        if (pathname === "/api/global-agent/agentic/self-test" && req.method === "GET") {
            void runGlobalAgentLoopSelfTest()
                .then(result => sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500))
                .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
            return true;
        }
        if (pathname === "/api/global-agent/quality" && req.method === "GET") {
            sendJson(res, { success: true, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
            return true;
        }
        if (pathname === "/api/global-agent/quality" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const policy = setAgentQualityPolicy({
                        shadowMode: payload.shadowMode ?? payload.shadow_mode,
                        minWriteConfidence: payload.minWriteConfidence ?? payload.min_write_confidence,
                        requireGroundedTarget: payload.requireGroundedTarget ?? payload.require_grounded_target,
                        actor: payload.actor || "local-user",
                        reason: payload.reason,
                    });
                    sendJson(res, { success: true, policy, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/quality/self-test" && req.method === "GET") {
            const result = runAgentQualityCenterSelfTest();
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/reasoning/self-test" && req.method === "GET") {
            const result = runAgentReasoningLoopSelfTest();
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/runtime-kernel/self-test" && req.method === "GET") {
            const result = runAgentRuntimeKernelSelfTest();
            sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
            return true;
        }
        if (pathname === "/api/global-agent/trace-replay" && req.method === "GET") {
            const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
            sendJson(res, {
                success: true,
                replay: traceId ? replayAgentTrace(traceId) : buildTraceReplaySuite(Number(parsed.query.limit || 20)),
            });
            return true;
        }
        if (pathname === "/api/global-agent/runs" && req.method === "GET") {
            const id = String(parsed.query.id || "").trim();
            if (id) {
                const run = getGlobalAgentRun(id);
                if (!run)
                    return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
                sendJson(res, { success: true, run: publicGlobalAgentRun(run, String(parsed.query.detail || "") === "full") });
                return true;
            }
            const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
            const status = String(parsed.query.status || "").trim();
            const detail = String(parsed.query.detail || "").trim().toLowerCase();
            const project = detail === "full"
                ? (run) => publicGlobalAgentRun(run)
                : (run) => publicGlobalAgentRunSummary(run);
            sendJson(res, { success: true, runs: listGlobalAgentRuns({ sessionId: sessionId || undefined, status: status || undefined, limit: Number(parsed.query.limit || 30) }).map(project) });
            return true;
        }
        if (pathname === "/api/global-agent/runs/steer" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const id = String(payload.id || payload.run_id || payload.runId || "").trim();
                    const message = String(payload.message || payload.text || "").trim();
                    if (!id)
                        return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
                    if (!message)
                        return sendJson(res, { success: false, error: "补充要求不能为空" }, 400);
                    const storedRun = getGlobalAgentRun(id);
                    if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
                        const requestId = String(payload.request_id || payload.requestId || "").trim();
                        const existing = requestId
                            ? (storedRun.user_steer_history || storedRun.userSteerHistory || []).find((item) => item?.request_id === requestId)
                            : null;
                        if (existing) {
                            const existingSupervisor = getGlobalMissionSupervisor(storedRun.supervisor_id);
                            return sendJson(res, {
                                success: true,
                                accepted: true,
                                applied: existing.status === "applied",
                                duplicate: true,
                                steering: existing,
                                run: publicGlobalAgentRun(storedRun),
                                supervisor: existingSupervisor,
                                mission: existingSupervisor ? getGlobalDevelopmentMission(existingSupervisor.mission_id) : null,
                                message: existing.kind === "revise_goal"
                                    ? "目标调整已接收。旧执行已停止，正在按新目标重新规划。"
                                    : "补充要求已接收，已并入当前任务继续处理。",
                            });
                        }
                        const requestedKind = String(payload.kind || payload.steering_kind || payload.steeringKind || "auto");
                        const kind = requestedKind === "auto"
                            ? (await (0, workflow_decision_1.decideWorkflowWithModel)({
                                message,
                                scope: "global",
                                context: { current_goal: storedRun.original_user_message || storedRun.user_message, phase: "supervising" },
                            })).continuationKind
                            : requestedKind === "revise_goal" ? "revise_goal" : "supplement";
                        const supervisorBefore = getGlobalMissionSupervisor(storedRun.supervisor_id);
                        if (!supervisorBefore)
                            throw new Error("全局任务跟进记录不存在");
                        const goalPrefix = String(supervisorBefore.business_goal || storedRun.original_user_message || storedRun.user_message || "").trim();
                        const businessGoal = [
                            goalPrefix,
                            `${kind === "revise_goal" ? "目标调整" : "补充要求"}：${message}`,
                        ].filter(Boolean).join("\n").slice(0, 50_000);
                        const source = String(payload.source || "global_web_supervision_steer");
                        const supervisor = await controlGlobalMissionSupervisor(storedRun.supervisor_id, "update_goal", createMissionSupervisorRuntime(ctx), {
                            ...payload,
                            business_goal: businessGoal,
                            acceptance: supervisorBefore.acceptance,
                            message,
                            continuation_kind: kind,
                            request_id: requestId,
                            source,
                            continuation: {
                                ...(payload.continuation && typeof payload.continuation === "object" ? payload.continuation : {}),
                                kind,
                                source,
                                reason: message,
                                title: kind === "revise_goal" ? "监督阶段目标调整" : "监督阶段补充要求",
                                interrupt_current_run: kind === "revise_goal",
                            },
                        });
                        const result = applyGlobalAgentSupervisionSteer(id, message, {
                            kind,
                            source,
                            requestId,
                            supervisorState: supervisor.status,
                            continuationSummary: supervisor.last_continuation || null,
                        });
                        try {
                            ingestGlobalAgentConversation({
                                sessionId: result.run.session_id,
                                source,
                                messages: [{
                                        role: "user",
                                        content: message,
                                        timestamp: result.steering.at,
                                        trace_id: result.run.trace_id,
                                        run_id: result.run.id,
                                        metadata: {
                                            kind: result.steering.kind,
                                            steering_id: result.steering.id,
                                            supervision: true,
                                            applied: true,
                                        },
                                    }],
                            });
                        }
                        catch (error) {
                            console.warn(`[全局记忆] 持续跟进补充要求写入失败：${error?.message || error}`);
                        }
                        return sendJson(res, {
                            success: true,
                            accepted: true,
                            applied: true,
                            duplicate: result.duplicate,
                            steering: result.steering,
                            continuation: result.continuation,
                            supervisor,
                            mission: getGlobalDevelopmentMission(supervisor.mission_id),
                            run: publicGlobalAgentRun(result.run),
                            message: kind === "revise_goal"
                                ? "目标调整已接收。旧执行已停止，正在按新目标重新规划。"
                                : "补充要求已接收，已并入当前任务继续处理。",
                        });
                    }
                    const requestedKind = String(payload.kind || payload.steering_kind || payload.steeringKind || "auto");
                    const modelKind = requestedKind === "auto"
                        ? (await (0, workflow_decision_1.decideWorkflowWithModel)({
                            message,
                            scope: "global",
                            context: { current_goal: storedRun?.original_user_message || storedRun?.user_message || "", phase: "running" },
                        })).continuationKind
                        : requestedKind === "revise_goal" ? "revise_goal" : "supplement";
                    const result = steerGlobalAgentRun(id, message, {
                        kind: modelKind,
                        source: payload.source || "global_web_mid_turn",
                        requestId: payload.request_id || payload.requestId || "",
                    });
                    try {
                        ingestGlobalAgentConversation({
                            sessionId: result.run.session_id,
                            source: payload.source || "global_web_mid_turn",
                            messages: [{
                                    role: "user",
                                    content: message,
                                    timestamp: result.steering.at,
                                    trace_id: result.run.trace_id,
                                    run_id: result.run.id,
                                    metadata: {
                                        kind: result.steering.kind,
                                        steering_id: result.steering.id,
                                        mid_turn: true,
                                    },
                                }],
                        });
                    }
                    catch (error) {
                        console.warn(`[全局记忆] 执行中补充要求写入失败：${error?.message || error}`);
                    }
                    sendJson(res, {
                        success: true,
                        accepted: true,
                        duplicate: result.duplicate,
                        steering: result.steering,
                        run: publicGlobalAgentRun(result.run),
                        message: result.steering.kind === "revise_goal"
                            ? "目标调整已接收，会在当前任务中重新核对计划。"
                            : "补充要求已接收，会在当前任务中继续处理。",
                    });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 409);
                }
            });
            return true;
        }
        if (["/api/global-agent/runs/confirm", "/api/global-agent/runs/resume", "/api/global-agent/runs/pause", "/api/global-agent/runs/cancel"].includes(pathname) && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", async () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    const id = String(payload.id || payload.run_id || "").trim();
                    if (!id)
                        return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
                    let run;
                    const storedRun = getGlobalAgentRun(id);
                    if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
                        const operation = pathname.endsWith("/cancel") ? "cancel" : pathname.endsWith("/pause") ? "pause" : pathname.endsWith("/resume") ? "resume" : "";
                        if (operation) {
                            const supervisor = await controlGlobalMissionSupervisor(storedRun.supervisor_id, operation, createMissionSupervisorRuntime(ctx), payload);
                            run = operation === "cancel"
                                ? completeGlobalAgentSupervision(id, { summary: "全局任务已由用户取消。" }, "cancelled")
                                : updateGlobalAgentSupervisionState(id, supervisor.status);
                        }
                    }
                    if (!run) {
                        if (pathname.endsWith("/pause"))
                            run = pauseGlobalAgentRun(id);
                        else if (pathname.endsWith("/cancel"))
                            run = cancelGlobalAgentRun(id);
                        else
                            run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
                                approved: pathname.endsWith("/confirm") ? payload.approved !== false : undefined,
                                cancelled: pathname.endsWith("/confirm") && payload.approved === false,
                                feedback: payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "",
                                source: payload.source || payload.resume_source || payload.resumeSource || "global_run_control",
                            });
                    }
                    sendJson(res, { success: true, run: publicGlobalAgentRun(run) });
                }
                catch (error) {
                    sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                }
            });
            return true;
        }
        if (pathname === "/api/global-agent/run" && req.method === "POST") {
            const contentType = String(req.headers["content-type"] || "");
            const handleRun = async (payload, files = []) => {
                const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
                let reliabilityOperationKey = "";
                let reliabilityOperationAcquired = false;
                let streamRequestId = "";
                let streamSequence = 0;
                let visibleTextEmitted = false;
                let activeTurn = null;
                let activeSessionId = "";
                if (isStream) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache, no-transform",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no",
                    });
                    if (typeof res.flushHeaders === "function")
                        res.flushHeaders();
                }
                const emit = (event) => {
                    if (!isStream || res.writableEnded)
                        return;
                    if (event?.type === "text" && String(event?.text || "").trim())
                        visibleTextEmitted = true;
                    const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
                    const sequence = ++streamSequence;
                    const eventId = String(event?.event_id || event?.eventId || `${streamRequestId || "global-stream"}:${sequence}`);
                    const payloadWithOrder = { ...event, event_id: eventId, eventId, sequence, ...(ui ? { ui } : {}) };
                    res.write(`data: ${JSON.stringify(payloadWithOrder)}\n\n`);
                    res.flush?.();
                };
                const streamBufferedGlobalReply = async (content) => {
                    const characters = Array.from(String(content || ""));
                    const chunkSize = characters.length > 2400 ? 36 : characters.length > 800 ? 24 : 16;
                    for (let offset = 0; offset < characters.length; offset += chunkSize) {
                        if (res.destroyed || res.writableEnded)
                            break;
                        emit({ type: "text", text: characters.slice(offset, offset + chunkSize).join("") });
                        if (offset + chunkSize < characters.length) {
                            await new Promise(resolve => setTimeout(resolve, 14));
                        }
                    }
                };
                try {
                    let message = String(payload.message || "").trim();
                    const originalMessage = message;
                    const sourceIngestion = await ingestRequirementSources({
                        files,
                        userText: message,
                        extractRequirement: files.length > 0 || /https?:\/\//i.test(message),
                        decomposeRequirement: false,
                        availableTargets: requirementTargets(),
                    });
                    if (sourceIngestion.agent_context) {
                        message = message ? `${message}${sourceIngestion.agent_context}` : `请处理以下资料：${sourceIngestion.agent_context}`;
                    }
                    const displayMessage = originalMessage || (files.length
                        ? `请处理已上传的 ${files.length} 份资料：${files.map((file) => file.filename || "附件").join("、")}`
                        : message);
                    if (!files.length && (0, global_agent_capabilities_1.isGlobalAgentCapabilityQuestion)(originalMessage)) {
                        if (isStream) {
                            await streamBufferedGlobalReply(global_agent_capabilities_1.GLOBAL_AGENT_CAPABILITY_REPLY);
                            emit({ type: "done", capability_reply: true });
                            res.end();
                        }
                        else
                            sendJson(res, { success: true, reply: global_agent_capabilities_1.GLOBAL_AGENT_CAPABILITY_REPLY, capability_reply: true, contentStored: false });
                        return;
                    }
                    const requestedTargetRefs = normalizeGlobalRequestedTargets(payload.target_refs || payload.targetRefs, originalMessage || message);
                    const requestPrincipal = (0, api_access_control_1.requestAccessPrincipal)(req);
                    if (requestPrincipal?.kind === "browser" && requestPrincipal.role !== "admin") {
                        const forbidden = requestedTargetRefs.find((target) => !(0, access_policy_1.hasResourceAccess)(requestPrincipal.userId, requestPrincipal.role, String(target.scope || "") === "group" ? "group" : "project", String(target.scopeId || ""), "use"));
                        if (forbidden)
                            throw new Error("当前账户没有所选项目或群聊的任务派发权限");
                    }
                    const sourceFiles = (0, global_agent_attachments_1.serializeGlobalRequestAttachments)(files);
                    if (!message)
                        throw new Error("消息不能为空");
                    let history = [];
                    try {
                        history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]"));
                    }
                    catch { }
                    const sessionId = String(payload.session_id || payload.sessionId || "web:default");
                    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在思考...", { tab: "global-agent" }, 12 * 60 * 1000);
                    ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role: "user", text: displayMessage, final: true, source: "global" });
                    const requestId = String(payload.request_id || payload.requestId || req.headers["x-client-message-id"] || `server-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`).trim();
                    const operationKey = requestId ? `${sessionId}:${requestId}` : "";
                    streamRequestId = requestId;
                    reliabilityOperationKey = operationKey;
                    const operation = operationKey ? acquireIdempotency({ scope: "global-agent-request", key: operationKey, leaseMs: 13 * 60 * 1000, metadata: { session_id: sessionId, source: "web" } }) : null;
                    reliabilityOperationAcquired = operation?.acquired === true;
                    if (operation && !operation.acquired) {
                        const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-request", operationKey, 13 * 60 * 1000) : operation.record;
                        const replayRun = settled?.result?.run_id ? getGlobalAgentRun(settled.result.run_id) : null;
                        const result = settled?.result?.run || (replayRun ? publicGlobalAgentRun(replayRun) : null);
                        if (!result)
                            throw new Error(settled?.error || "重复请求仍在处理中");
                        if (isStream) {
                            emit({ type: "result", run: result, source_files: sourceFiles, files: sourceFiles, duplicate: true });
                            emit({ type: "done" });
                            res.end();
                        }
                        else
                            sendJson(res, { success: true, run: result, source_files: sourceFiles, files: sourceFiles, duplicate: true });
                        return;
                    }
                    const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
                    const queued = conversationTurnControl.enqueue({
                        scope: "global",
                        conversation_id: sessionId,
                        mode: "queue",
                        message: displayMessage,
                        attachments: sourceFiles,
                        request_id: requestId,
                        metadata: {
                            global_context_v2: {
                                message,
                                original_message: displayMessage,
                                history,
                                source: "web",
                                trace_id: operation?.traceId || "",
                                clarification_run_id: payload.clarification_run_id || payload.clarificationRunId || "",
                                source_ingestion: sourceIngestion,
                                read_only: (0, api_access_control_1.requestIsReadOnly)(req),
                                principal,
                                requested_target_refs: requestedTargetRefs,
                            },
                        },
                    });
                    activeSessionId = sessionId;
                    activeTurn = conversationTurnControl.claim({ scope: "global", conversation_id: sessionId, id: queued.turn.id, lease_ms: 13 * 60 * 1000 });
                    if (!activeTurn) {
                        const position = conversationTurnControl.list({ scope: "global", conversation_id: sessionId, statuses: "queued,sending" })
                            .turns.find((turn) => turn.id === queued.turn.id)?.position || 1;
                        const queuedResult = { accepted: true, queued: true, turn_id: queued.turn.id, queue_scope: `global:${sessionId}`, queue_position: position, retryable: false };
                        if (operationKey)
                            completeIdempotency("global-agent-request", operationKey, queuedResult);
                        if (isStream) {
                            emit({ type: "queued", ...queuedResult });
                            emit({ type: "done", ...queuedResult });
                            res.end();
                        }
                        else
                            sendJson(res, { success: true, ...queuedResult }, 202);
                        return;
                    }
                    emit({ type: "claimed", turn_id: activeTurn.id, queue_scope: `global:${sessionId}`, queue_position: 1 });
                    let finalPetEventRelayed = false;
                    const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
                        message,
                        originalMessage: displayMessage,
                        history,
                        sessionId,
                        source: "web",
                        traceId: operation?.traceId,
                        clarificationRunId: payload.clarification_run_id || payload.clarificationRunId || "",
                        sourceIngestion,
                        readOnly: (0, api_access_control_1.requestIsReadOnly)(req),
                        principal,
                        requestedTargetRefs,
                        turnId: activeTurn.id,
                        queueScope: `global:${sessionId}`,
                        onEvent: (event) => {
                            emit(event);
                            relayGlobalPetEvent(ctx, event);
                            if (["completed", "failed", "cancelled"].includes(String(event?.type || ""))) {
                                finalPetEventRelayed = true;
                            }
                        },
                    });
                    if (isStream && !visibleTextEmitted && String(run.final_reply || "").trim()) {
                        await streamBufferedGlobalReply(run.final_reply);
                    }
                    conversationTurnControl.settle({
                        id: activeTurn.id,
                        status: run.status === "failed" ? "failed" : "completed",
                        run_id: run.id,
                        checkpoint: run.status,
                        semantic_decision_receipt: run.workflow_decision || run.workflowDecision || null,
                        result: { run_id: run.id, status: run.status, retryable: run.retryable === true },
                        error: run.status === "failed" ? run.error || run.final_reply : "",
                    });
                    if (operationKey)
                        completeIdempotency("global-agent-request", operationKey, { run_id: run.id, status: run.status });
                    const result = publicGlobalAgentRun(run);
                    if (!finalPetEventRelayed) {
                        relayGlobalPetEvent(ctx, { type: run.status === "failed" ? "failed" : "completed", run }, { finalRun: result });
                    }
                    if (isStream) {
                        emit({ type: "result", run: result, source_files: sourceFiles, files: sourceFiles, turn_id: activeTurn.id, queue_scope: `global:${sessionId}`, queue_position: 0, authorization_receipt: run.write_authorization_receipt || null, retryable: run.retryable === true, terminal_receipt: run.terminal_receipt || null });
                        emit({ type: "done" });
                        res.end();
                    }
                    else
                        sendJson(res, { success: true, run: result, source_files: sourceFiles, files: sourceFiles, turn_id: activeTurn.id, queue_scope: `global:${sessionId}`, queue_position: 0, authorization_receipt: run.write_authorization_receipt || null, retryable: run.retryable === true, terminal_receipt: run.terminal_receipt || null });
                }
                catch (error) {
                    if (activeTurn?.id) {
                        try {
                            conversationTurnControl.settle({ id: activeTurn.id, status: "failed", checkpoint: "failed", error: error?.message || String(error) });
                        }
                        catch { }
                    }
                    if (reliabilityOperationKey && reliabilityOperationAcquired) {
                        try {
                            failIdempotency("global-agent-request", reliabilityOperationKey, error);
                        }
                        catch { }
                    }
                    relayGlobalPetEvent(ctx, { type: "failed", error: error?.message || String(error) }, { error: error?.message || String(error) });
                    if (isStream) {
                        emit({ type: "error", text: error?.message || String(error) });
                        emit({ type: "done" });
                        res.end();
                    }
                    else
                        sendJson(res, { success: false, error: error?.message || String(error), retryable: true, turn_id: activeTurn?.id || "" }, 400);
                }
                finally {
                    if (activeSessionId) {
                        void drainGlobalWebTurns(getRequestBaseUrl(req), ctx, activeSessionId).catch((error) => {
                            console.warn(`[全局 Agent 队列] 后台续跑失败：${error?.message || error}`);
                        });
                    }
                }
            };
            if (contentType.includes("multipart/form-data")) {
                (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(({ fields, files }) => {
                    return handleRun(fields || {}, files || []);
                }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
            }
            else {
                let body = "";
                req.on("data", (chunk) => body += chunk);
                req.on("end", () => {
                    try {
                        void handleRun(body ? JSON.parse(body) : {}, []);
                    }
                    catch (error) {
                        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                    }
                });
            }
            return true;
        }
        if (pathname === "/api/global-agent/chat" && req.method === "POST") {
            const contentType = req.headers["content-type"] || "";
            const handleAgenticChatProxy = async (payload, files = []) => {
                const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
                let legacyTurn = null;
                let legacySessionId = "";
                if (isStream) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache, no-transform",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no",
                    });
                    if (typeof res.flushHeaders === "function")
                        res.flushHeaders();
                }
                const emit = (event) => {
                    if (!isStream || res.writableEnded)
                        return;
                    const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
                    res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
                };
                try {
                    let message = String(payload.message || "").trim();
                    const originalMessage = message;
                    const sourceIngestion = await ingestRequirementSources({
                        files,
                        userText: message,
                        extractRequirement: files.length > 0 || /https?:\/\//i.test(message),
                        decomposeRequirement: false,
                        availableTargets: requirementTargets(),
                    });
                    if (sourceIngestion.agent_context) {
                        message = message ? `${message}${sourceIngestion.agent_context}` : `请处理以下资料：${sourceIngestion.agent_context}`;
                    }
                    const displayMessage = originalMessage || (files.length
                        ? `请处理已上传的 ${files.length} 份资料：${files.map((file) => file.filename || "附件").join("、")}`
                        : message);
                    if (!message)
                        throw new Error("消息不能为空");
                    let history = [];
                    try {
                        history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]"));
                    }
                    catch { }
                    const sessionId = String(payload.session_id || payload.sessionId || "legacy:web");
                    legacySessionId = sessionId;
                    const requestId = String(payload.request_id || payload.requestId || req.headers["x-client-message-id"] || `legacy-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`);
                    const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
                    const sourceFiles = (0, global_agent_attachments_1.serializeGlobalRequestAttachments)(files);
                    const queued = conversationTurnControl.enqueue({
                        scope: "global",
                        conversation_id: sessionId,
                        mode: "queue",
                        message: displayMessage,
                        attachments: sourceFiles,
                        request_id: requestId,
                        metadata: { global_context_v2: { message, original_message: displayMessage, history, source: "legacy-chat-proxy", source_ingestion: sourceIngestion, read_only: (0, api_access_control_1.requestIsReadOnly)(req), principal } },
                    });
                    const turn = conversationTurnControl.claim({ scope: "global", conversation_id: sessionId, id: queued.turn.id });
                    legacyTurn = turn;
                    if (!turn) {
                        const position = conversationTurnControl.list({ scope: "global", conversation_id: sessionId, statuses: "queued,sending" }).turns.find((item) => item.id === queued.turn.id)?.position || 1;
                        if (isStream) {
                            emit({ type: "queued", accepted: true, queued: true, turn_id: queued.turn.id, queue_scope: `global:${sessionId}`, queue_position: position });
                            emit({ type: "done" });
                            res.end();
                        }
                        else
                            sendJson(res, { success: true, accepted: true, queued: true, turn_id: queued.turn.id, queue_scope: `global:${sessionId}`, queue_position: position }, 202);
                        return;
                    }
                    const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
                        message,
                        originalMessage: displayMessage,
                        history,
                        sessionId,
                        source: "legacy-chat-proxy",
                        sourceIngestion,
                        readOnly: (0, api_access_control_1.requestIsReadOnly)(req),
                        principal,
                        turnId: turn.id,
                        queueScope: `global:${sessionId}`,
                        onEvent: emit,
                    });
                    conversationTurnControl.settle({ id: turn.id, status: run.status === "failed" ? "failed" : "completed", run_id: run.id, checkpoint: run.status, semantic_decision_receipt: run.workflow_decision || run.workflowDecision || null, result: { run_id: run.id, status: run.status }, error: run.status === "failed" ? run.error || run.final_reply : "" });
                    const result = publicGlobalAgentRun(run);
                    if (isStream) {
                        emit({ type: "result", run: result, source_files: sourceFiles, files: sourceFiles, turn_id: turn.id, queue_scope: `global:${sessionId}`, authorization_receipt: run.write_authorization_receipt || null, retryable: run.retryable === true });
                        emit({ type: "done" });
                        res.end();
                    }
                    else {
                        sendJson(res, { success: true, reply: globalRunVisibleReply(run, ""), run: result, source_files: sourceFiles, files: sourceFiles, agentic: true, turn_id: turn.id, queue_scope: `global:${sessionId}`, authorization_receipt: run.write_authorization_receipt || null, retryable: run.retryable === true });
                    }
                    void drainGlobalWebTurns(getRequestBaseUrl(req), ctx, sessionId).catch((error) => console.warn(`[全局 Agent 队列] legacy续跑失败：${error?.message || error}`));
                }
                catch (error) {
                    if (legacyTurn?.id) {
                        try {
                            conversationTurnControl.settle({ id: legacyTurn.id, status: "failed", checkpoint: "failed", error: error?.message || String(error) });
                        }
                        catch { }
                    }
                    if (isStream) {
                        emit({ type: "error", text: error?.message || String(error) });
                        emit({ type: "done" });
                        res.end();
                    }
                    else {
                        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                    }
                }
                finally {
                    if (legacySessionId)
                        void drainGlobalWebTurns(getRequestBaseUrl(req), ctx, legacySessionId).catch((error) => console.warn(`[全局 Agent 队列] legacy恢复失败：${error?.message || error}`));
                }
            };
            if (contentType.includes("multipart/form-data")) {
                (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(({ fields, files }) => {
                    return handleAgenticChatProxy(fields || {}, files || []);
                }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
            }
            else {
                let body = "";
                req.on("data", (chunk) => body += chunk);
                req.on("end", () => {
                    try {
                        void handleAgenticChatProxy(body ? JSON.parse(body) : {}, []);
                    }
                    catch (error) {
                        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
                    }
                });
            }
            return true;
        }
        // 7. 新增智能代码审查接口
        if (pathname === "/api/global-agent/git-review" && req.method === "POST") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", async () => {
                try {
                    const { project } = JSON.parse(body || "{}");
                    if (!project)
                        return sendJson(res, { error: "缺少项目参数" }, 400);
                    const configs = getConfigs();
                    const config = configs.find(c => c.name === project);
                    if (!config)
                        return sendJson(res, { error: "项目不存在" }, 404);
                    const info = getConfigInfo(config.path);
                    const workDir = info[0]?.workDir;
                    if (!workDir)
                        return sendJson(res, { error: "项目工作区目录未配置" }, 400);
                    // 执行 Git 命令获取变更状态和 diff
                    let status = "";
                    let diff = "";
                    try {
                        status = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["status", "--porcelain"], { maxOutputBytes: 10 * 1024 * 1024 })).stdout;
                        diff = (await (0, git_workspace_runtime_1.runGitCommand)(workDir, ["diff"], { maxOutputBytes: 10 * 1024 * 1024 })).stdout;
                        // 如果工作区干净，尝试对比暂存区
                        if (!diff.trim()) {
                            const staged = await (0, git_workspace_runtime_1.tryGitCommand)(workDir, ["diff", "--staged"], { maxOutputBytes: 10 * 1024 * 1024 });
                            if (!staged.ok)
                                throw new Error(staged.error || "读取暂存区差异失败");
                            diff = staged.output;
                        }
                    }
                    catch (gitErr) {
                        return sendJson(res, { error: "获取 Git 变更失败，请确保该项目是 Git 仓库且本地安装了 Git: " + gitErr.message }, 500);
                    }
                    if (!status.trim()) {
                        return sendJson(res, { success: true, review: "🔍 该项目当前干净，没有未提交的代码变更需要审查。" });
                    }
                    // 限制 diff payload 的最大长度以防超限
                    const maxDiffLength = 12000;
                    let diffPayload = diff;
                    if (diffPayload.length > maxDiffLength) {
                        diffPayload = diffPayload.slice(0, maxDiffLength) + "\n\n...(由于内容过多，部分 diff 差异已截断)\n";
                    }
                    // 调用大模型进行代码审查
                    const orchestratorConfig = loadOrchestratorConfig();
                    if (!orchestratorConfig.apiKey || !orchestratorConfig.apiUrl) {
                        return sendJson(res, { error: "统一大模型未配置，请先到「系统设置」中完善配置" }, 400);
                    }
                    const reviewPrompt = `你是一个拥有多年研发经验的技术专家与资深代码审查员(Code Reviewer)。
  请对以下项目「${project}」的本地 Git 代码变更进行智能审查。
  
  【Git 状态详情】
  ${status}
  
  【Git Diff 内容】
  \`\`\`diff
  ${diffPayload}
  \`\`\`
  
  请用中文产出结构化、专业的审查报告，格式如下：
  1. **变更概要**：简要说明本次修改涉及了哪些文件，主要做了什么功能或修复。
  2. **潜在风险与缺陷审查**：分析修改后的代码，排查是否有潜在 Bug、逻辑漏洞、死循环、并发冲突或安全漏洞，如果没有，请说明通过审查。
  3. **代码质量与改进建议**：指出可以优化重构的代码、可读性改进点，或是否遗漏了测试命令。
  4. **推荐 Commit 注释**：提供一个简洁、规范的推荐 Git 提交注释（建议遵循 Angular 规范，如 "feat(ui): 增加xxx组件"）。
  
  请仅返回上述报告的 Markdown 文本，排版必须美观大方。`;
                    const messages = [
                        { role: "system", content: "你是一个专业的 AI 代码审查助手。" },
                        { role: "user", content: reviewPrompt }
                    ];
                    const reviewResult = await callLlm(orchestratorConfig, messages);
                    sendJson(res, { success: true, review: reviewResult });
                }
                catch (err) {
                    sendJson(res, { error: err.message || "代码审查执行出错" }, 500);
                }
            });
            return true;
        }
        return false;
    }
    return { handleGlobalAgentApi, drainGlobalWebTurns, startGlobalWebTurnRecoveryForServer, stopGlobalWebTurnRecoveryForServer };
}
//# sourceMappingURL=global-agent-api.js.map