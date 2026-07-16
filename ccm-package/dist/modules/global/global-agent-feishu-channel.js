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
exports.createGlobalAgentFeishuChannel = createGlobalAgentFeishuChannel;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const feishu_1 = require("../collaboration/feishu");
const source_ingestion_1 = require("../requirements/source-ingestion");
const workflow_decision_1 = require("../../agents/workflow-decision");
// Feishu event decoding, message lifecycle, turn control, and restart recovery.
function createGlobalAgentFeishuChannel(deps) {
    const { GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, appendGlobalActionAudit, appendGlobalAgentConversationMessage, appendTraceEvent, bindFeishuIdentifiersFromValue, bindFeishuTaskContext, cancelGlobalAgentRun, conversationTurnControl, createAgenticRuntime, ensureTraceId, feishuRuntimeEventPresentation, findWaitingGlobalAgentRun, formatMissionStatus, getConfigs, getFeishuMessageId, getGlobalAgentConversationMessages, getGlobalAgentRun, getGlobalDevelopmentMission, globalRunVisibleReply, isGlobalProgressStatusRequest, listGlobalAgentRuns, loadGroups, notifyFeishuTaskStage, recordFeishuInbound, resolveFeishuGlobalAgentSessionId, resumeGlobalAgentRun, runAgenticGlobalRequest, sendFeishuReportMessage, steerGlobalAgentRun } = deps;
    function decryptFeishuEvent(encrypted, encryptKey) {
        const key = crypto.createHash("sha256").update(encryptKey).digest();
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.alloc(16));
        decipher.setAutoPadding(true);
        const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
        return JSON.parse(plain);
    }
    function normalizeFeishuEventPayload(payload, config) {
        if (!payload?.encrypt)
            return payload;
        const encryptKey = String(config.control_bot_encrypt_key || "").trim();
        if (!encryptKey)
            throw new Error("收到加密事件，但尚未配置 Encrypt Key");
        return decryptFeishuEvent(String(payload.encrypt), encryptKey);
    }
    function verifyFeishuEventToken(payload, config) {
        const expected = String(config.control_bot_verification_token || "").trim();
        if (!expected)
            throw new Error("控制机器人尚未配置 Verification Token");
        const actual = String(payload?.token || payload?.header?.token || "").trim();
        if (!actual || actual !== expected)
            throw new Error("飞书事件 Verification Token 校验失败");
    }
    function extractFeishuMessageText(payload) {
        const message = payload?.event?.message || {};
        let content = {};
        try {
            content = JSON.parse(String(message.content || "{}"));
        }
        catch { }
        if (["file", "media", "image"].includes(String(message.message_type || ""))) {
            const fileName = String(content.file_name || content.name || (message.message_type === "image" ? "需求图片.png" : "需求附件")).trim();
            return `请读取附件「${fileName}」，根据我的真实目标判断是直接回答、只读分析、执行、先规划还是拆成 Epic；未经确认不要创建或派发任务。`;
        }
        if (message.message_type !== "text")
            return "";
        return String(content.text || "")
            .replace(/@_user_\d+/g, "")
            .replace(/<at[^>]*>.*?<\/at>/gi, "")
            .trim();
    }
    function safeFeishuFileName(value, fallback) {
        const name = path.basename(String(value || fallback)).replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 180);
        return name || fallback;
    }
    function feishuRequirementTargets() {
        return [
            ...(typeof loadGroups === "function" ? loadGroups().map((group) => ({
                type: "group",
                id: group.id,
                name: group.name || group.id,
                capabilities: (group.members || []).flatMap((member) => member.skills || member.capabilities || []),
            })) : []),
            ...(typeof getConfigs === "function" ? getConfigs().map((config) => ({ type: "project", id: config.name, name: config.name })) : []),
        ];
    }
    async function ingestFeishuRequirementAttachment(payload, userText) {
        const message = payload?.event?.message || {};
        const messageType = String(message.message_type || "").toLowerCase();
        const targets = feishuRequirementTargets();
        if (["file", "media", "image"].includes(messageType)) {
            let content = {};
            try {
                content = JSON.parse(String(message.content || "{}"));
            }
            catch { }
            const fileKey = String(content.file_key || content.image_key || "").trim();
            const messageId = String(message.message_id || getFeishuMessageId(payload) || "").trim();
            if (!fileKey || !messageId)
                throw new Error("飞书附件事件缺少资源标识");
            const image = messageType === "image" && !content.file_key;
            const fallbackName = image ? `feishu-image-${fileKey.slice(-8)}.png` : `feishu-file-${fileKey.slice(-8)}`;
            const fileName = safeFeishuFileName(content.file_name || content.name, fallbackName);
            const downloaded = await (0, feishu_1.downloadFeishuMessageResource)({
                messageId,
                fileKey,
                type: image ? "image" : "file",
                maxBytes: 25 * 1024 * 1024,
            });
            fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
            const savedPath = path.join(utils_1.UPLOAD_DIR, `feishu-${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${fileName}`);
            fs.writeFileSync(savedPath, downloaded.buffer);
            return (0, source_ingestion_1.ingestRequirementSources)({
                files: [{ filename: fileName, savedPath, size: downloaded.size }],
                userText,
                extractRequirement: true,
                decomposeRequirement: false,
                availableTargets: targets,
            });
        }
        // 纯文本直接交给 Agentic Loop；由大模型选择工作流。
        return null;
    }
    function extractCcConnectHookText(payload) {
        const candidates = [
            payload?.message?.text,
            payload?.message?.content,
            payload?.message,
            payload?.text,
            payload?.content,
            payload?.prompt,
            payload?.data?.message?.text,
            payload?.data?.message?.content,
            payload?.data?.text,
            payload?.data?.content,
            payload?.event?.message?.text,
            payload?.event?.message?.content,
        ];
        for (const item of candidates) {
            if (typeof item === "string" && item.trim()) {
                let text = item.trim();
                if (/^\{/.test(text)) {
                    try {
                        const parsed = JSON.parse(text);
                        text = String(parsed.text || parsed.content || text).trim();
                    }
                    catch { }
                }
                return text
                    .replace(/@_user_\d+/g, "")
                    .replace(/<at[^>]*>.*?<\/at>/gi, "")
                    .trim();
            }
        }
        return "";
    }
    async function processFeishuGlobalAgentMessage(baseUrl, ctx, text, payload, options = {}) {
        const sendReport = options.sendReport !== false;
        const traceId = ensureTraceId(options.traceId, "feishu");
        const conversationId = resolveFeishuGlobalAgentSessionId(payload);
        const destination = recordFeishuInbound({ payload, sessionId: conversationId, messageId: getFeishuMessageId(payload) });
        bindFeishuTaskContext({ sessionId: conversationId, destination, source: "feishu-control-bot" });
        const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
        const sourceIngestion = await ingestFeishuRequirementAttachment(payload, text);
        appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu");
        const auditBase = {
            source: "feishu-control-bot",
            sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
            message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
            trace_id: traceId,
        };
        appendTraceEvent(traceId, { id: `feishu:${getFeishuMessageId(payload) || crypto.randomBytes(4).toString("hex")}:received`, type: "feishu.message_received", status: "info", message: text.slice(0, 500), data: { conversation_id: conversationId, message_id: getFeishuMessageId(payload) } });
        try {
            if (/^(帮助|help|\/help)$/i.test(text)) {
                const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个协作群或项目执行成员下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n删除等高风险操作必须回到 CCM 界面确认。";
                if (sendReport)
                    await sendFeishuReportMessage({ title: "全局 Agent 使用帮助", markdown });
                appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
                return markdown;
            }
            const confirmationMatch = text.match(/^(确认(?:执行)?|同意|取消)(?:\s+([a-z0-9_-]+))?[。！!\s]*$/i);
            let run;
            if (confirmationMatch) {
                const requestedId = String(confirmationMatch[2] || "").trim();
                const waiting = requestedId ? getGlobalAgentRun(requestedId) : findWaitingGlobalAgentRun(conversationId);
                if (!waiting || waiting.status !== "waiting_confirmation") {
                    const markdown = "当前没有等待你确认的全局 Agent 操作。";
                    appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
                    if (sendReport)
                        await sendFeishuReportMessage({ title: "全局 Agent", markdown });
                    return markdown;
                }
                run = await resumeGlobalAgentRun(waiting.id, createAgenticRuntime(baseUrl, ctx), {
                    approved: !/^取消/i.test(confirmationMatch[1]),
                    cancelled: /^取消/i.test(confirmationMatch[1]),
                });
            }
            else {
                const onFeishuRuntimeEvent = (event) => {
                    bindFeishuIdentifiersFromValue(conversationId, event, destination);
                    const presentation = feishuRuntimeEventPresentation(event);
                    if (!presentation)
                        return;
                    void notifyFeishuTaskStage({
                        ...presentation,
                        sessionId: conversationId,
                        dedupeKey: `runtime:${traceId}:${event?.type || "event"}:${event?.tool || event?.name || ""}:${event?.task_id || event?.taskId || ""}`,
                    });
                };
                run = await runAgenticGlobalRequest(baseUrl, ctx, {
                    message: text,
                    history: historyBeforeUser.map((item) => ({ role: item.role, content: item.content })),
                    sessionId: conversationId,
                    source: "feishu-control-bot",
                    traceId,
                    sourceIngestion,
                    onEvent: onFeishuRuntimeEvent,
                });
            }
            const missionSnapshot = run.mission_id ? getGlobalDevelopmentMission(run.mission_id) : null;
            bindFeishuTaskContext({
                sessionId: conversationId,
                destination,
                runIds: [run.id],
                missionIds: [run.mission_id],
                taskIds: [run.mission_id, ...(missionSnapshot?.children || []).map((item) => item.id)],
                source: "feishu-control-bot",
            });
            const confirmationHint = run.status === "waiting_confirmation"
                ? `\n\n待确认操作：${run.pending_tool?.name || "写入操作"}\n运行 ID：${run.id}\n回复“确认 ${run.id}”继续，或回复“取消 ${run.id}”。`
                : "";
            const markdown = `${globalRunVisibleReply(run, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK)}${confirmationHint}`;
            appendGlobalActionAudit({ ...auditBase, action: { type: "agentic_loop", params: { run_id: run.id } }, status: run.status, result: { summary: markdown, trace_id: run.trace_id, steps: run.steps.length } });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            if (sendReport)
                await sendFeishuReportMessage({ title: run.status === "waiting_confirmation" ? "全局 Agent 等待确认" : "全局 Agent 执行结果", markdown });
            return markdown;
        }
        catch (error) {
            const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
            appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            if (sendReport)
                await sendFeishuReportMessage({ title: "全局 Agent 执行失败", markdown });
            return markdown;
        }
    }
    function parseFeishuConversationTurnCommand(value) {
        const text = String(value || "").trim();
        if (/^(?:停止|停止当前|取消当前|stop)$/i.test(text))
            return { kind: "stop", message: "" };
        const steer = text.match(/^(?:引导|补充|调整)(?:当前)?\s*[:：]\s*([\s\S]+)$/i);
        if (steer)
            return { kind: "steer", message: steer[1].trim() };
        const queue = text.match(/^(?:排队|稍后|下一条)\s*[:：]\s*([\s\S]+)$/i);
        if (queue)
            return { kind: "queue", message: queue[1].trim() };
        return { kind: "normal", message: text };
    }
    const drainingFeishuConversationTurns = new Set();
    let feishuConversationTurnRecoveryTimer = null;
    async function drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload) {
        if (!conversationId || drainingFeishuConversationTurns.has(conversationId))
            return;
        drainingFeishuConversationTurns.add(conversationId);
        try {
            while (true) {
                const turn = conversationTurnControl.claim({ scope: "feishu", conversation_id: conversationId });
                if (!turn)
                    break;
                try {
                    const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, turn.message, payload, {
                        sendReport: true,
                        traceId: String(turn.metadata?.trace_id || ""),
                    });
                    conversationTurnControl.settle({ id: turn.id, status: "completed", result: { reply } });
                }
                catch (error) {
                    conversationTurnControl.settle({ id: turn.id, status: "failed", error: error?.message || String(error) });
                    break;
                }
            }
        }
        finally {
            drainingFeishuConversationTurns.delete(conversationId);
        }
    }
    function startFeishuConversationTurnRecoveryForServer(baseUrl, ctx) {
        if (feishuConversationTurnRecoveryTimer)
            return { started: false };
        const tick = () => {
            const queued = conversationTurnControl.list({ scope: "feishu", statuses: "queued", limit: 500 }).turns;
            const conversationIds = Array.from(new Set(queued.map((turn) => String(turn.conversation_id || "")).filter(Boolean)));
            for (const conversationId of conversationIds) {
                const active = listGlobalAgentRuns({ sessionId: conversationId, limit: 20 })
                    .some((run) => ["running", "supervising", "paused"].includes(String(run?.status || "")));
                if (!active)
                    void drainFeishuConversationTurns(baseUrl, ctx, conversationId, { ccm_conversation_id: conversationId, source: "feishu_queue_recovery" });
            }
        };
        tick();
        feishuConversationTurnRecoveryTimer = setInterval(tick, 3_000);
        feishuConversationTurnRecoveryTimer.unref?.();
        return { started: true };
    }
    function stopFeishuConversationTurnRecoveryForServer() {
        if (feishuConversationTurnRecoveryTimer)
            clearInterval(feishuConversationTurnRecoveryTimer);
        feishuConversationTurnRecoveryTimer = null;
    }
    async function processFeishuControlledMessage(baseUrl, ctx, text, payload, options = {}) {
        const conversationId = resolveFeishuGlobalAgentSessionId(payload);
        const messageId = getFeishuMessageId(payload);
        const command = parseFeishuConversationTurnCommand(text);
        const activeRun = listGlobalAgentRuns({ sessionId: conversationId, limit: 20 })
            .find((run) => ["running", "supervising", "paused"].includes(String(run?.status || ""))) || null;
        if (command.kind === "stop") {
            if (activeRun?.id)
                cancelGlobalAgentRun(activeRun.id);
            void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload);
            return {
                reply: activeRun?.id
                    ? "已停止当前工作。已经排队的后续消息会继续保留，你也可以发送新的要求。"
                    : "当前没有正在执行的工作。已经排队的消息仍会保留。",
                stopped_run_id: activeRun?.id || "",
            };
        }
        if (activeRun && command.kind === "steer") {
            const queued = conversationTurnControl.enqueue({
                scope: "feishu",
                conversation_id: conversationId,
                mode: "steer",
                message: command.message,
                request_id: messageId || options.traceId || undefined,
                active_run_id: activeRun.id,
                metadata: { source: "feishu-control-bot", trace_id: options.traceId || "" },
            });
            try {
                const continuationKind = (await (0, workflow_decision_1.decideWorkflowWithModel)({
                    message: command.message,
                    scope: "global",
                    context: { current_goal: activeRun.original_user_message || activeRun.user_message || "", phase: activeRun.status },
                })).continuationKind;
                steerGlobalAgentRun(activeRun.id, command.message, {
                    kind: continuationKind,
                    source: "feishu_mid_turn",
                    requestId: queued.turn.request_id,
                });
                conversationTurnControl.settle({ id: queued.turn.id, status: "applied", active_run_id: activeRun.id });
                return { reply: "已把这条要求纳入当前工作，我会在安全节点重新核对计划并继续。", turn: queued.turn, run_id: activeRun.id };
            }
            catch (error) {
                conversationTurnControl.settle({ id: queued.turn.id, status: "failed", error: error?.message || String(error) });
                throw error;
            }
        }
        if (activeRun && (command.kind === "queue" || command.kind === "normal")) {
            const queued = conversationTurnControl.enqueue({
                scope: "feishu",
                conversation_id: conversationId,
                mode: "queue",
                message: command.message,
                request_id: messageId || options.traceId || undefined,
                active_run_id: activeRun.id,
                metadata: { source: "feishu-control-bot", trace_id: options.traceId || "" },
            });
            const position = conversationTurnControl.list({ scope: "feishu", conversation_id: conversationId, statuses: "queued,sending" })
                .turns.find((turn) => turn.id === queued.turn.id)?.position || 1;
            return {
                reply: `当前工作仍在进行，这条消息已排在第 ${position} 位，完成后会自动处理。发送“停止”可以结束当前工作。`,
                queued: true,
                position,
                turn: queued.turn,
            };
        }
        const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, command.message, payload, options);
        void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload);
        return { reply };
    }
    function runFeishuConversationTurnCommandSelfTest() {
        const checks = {
            stop: parseFeishuConversationTurnCommand("停止").kind === "stop",
            steer: parseFeishuConversationTurnCommand("引导：先补测试").message === "先补测试",
            queue: parseFeishuConversationTurnCommand("排队: 再写文档").kind === "queue",
            ordinaryDefaultsToNormal: parseFeishuConversationTurnCommand("进度怎么样").kind === "normal",
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    return {
        normalizeFeishuEventPayload, verifyFeishuEventToken, extractFeishuMessageText, extractCcConnectHookText,
        processFeishuGlobalAgentMessage, parseFeishuConversationTurnCommand, startFeishuConversationTurnRecoveryForServer,
        stopFeishuConversationTurnRecoveryForServer, processFeishuControlledMessage, runFeishuConversationTurnCommandSelfTest,
    };
}
//# sourceMappingURL=global-agent-feishu-channel.js.map