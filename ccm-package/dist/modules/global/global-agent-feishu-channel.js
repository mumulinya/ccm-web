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
const source_ingestion_1 = require("../requirements/source-ingestion");
const feishu_access_1 = require("../collaboration/feishu-access");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const feishu_conversation_v2_1 = require("../collaboration/feishu-conversation-v2");
const automation_session_bindings_1 = require("../../system/automation-session-bindings");
const slash_command_conversations_1 = require("../tools/slash-command-conversations");
const feishu_inbound_attachments_1 = require("../../integrations/feishu-inbound-attachments");
const global_agent_attachments_1 = require("./global-agent-attachments");
const conversation_message_routing_1 = require("../../agents/conversation-message-routing");
// Feishu event decoding, message lifecycle, turn control, and restart recovery.
function createGlobalAgentFeishuChannel(deps) {
    const { GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, appendGlobalActionAudit, appendGlobalAgentConversationMessage, appendTraceEvent, bindFeishuIdentifiersFromValue, bindFeishuTaskContext, cancelGlobalAgentRun, conversationTurnControl, createAgenticRuntime, ensureTraceId, feishuRuntimeEventPresentation, findWaitingGlobalAgentRun, formatMissionStatus, getConfigs, getFeishuMessageId, getGlobalAgentConversationMessages, getGlobalAgentRun, getGlobalDevelopmentMission, globalRunVisibleReply, isGlobalProgressStatusRequest, listGlobalAgentRuns, listTaskPermissionRequests, loadGroups, notifyFeishuTaskStage, postLocalApi, recordFeishuInbound, resolveFeishuGlobalAgentSessionId, resumeGlobalAgentRun, runAgenticGlobalRequest, sendFeishuReportMessage, steerGlobalAgentRun } = deps;
    const resolveUserAccess = deps.resolveFeishuUserAccess || feishu_access_1.resolveFeishuUserAccess;
    const resolveBoundFeishuGlobalSessionId = typeof deps.resolveBoundFeishuGlobalSessionId === "function"
        ? deps.resolveBoundFeishuGlobalSessionId
        : (_payload, fallbackSessionId = "") => String(fallbackSessionId || "");
    async function sendFeishuConversationReply(input) {
        const bound = await notifyFeishuTaskStage({
            stage: input.stage || "global_agent_reply",
            title: input.title,
            markdown: input.markdown,
            sessionId: input.conversationId,
            cardKey: input.cardKey || input.traceId || input.conversationId,
            runId: input.runId || "",
            missionId: input.missionId || "",
            taskId: input.taskId || "",
            dedupeKey: `global-reply:${input.traceId || input.conversationId}:${input.dedupeSuffix || crypto.createHash("sha256").update(input.markdown).digest("hex").slice(0, 16)}`,
            actions: input.actions,
        });
        if (bound?.success || bound?.queued)
            return { ...bound, channel: "bound_conversation" };
        return { ...bound, success: false, queued: false, channel: "exact_conversation_only", reason: bound?.reason || "bound_delivery_unavailable" };
    }
    function feishuSourceCoverage(sourceIngestion) {
        const sources = Array.isArray(sourceIngestion?.sources) ? sourceIngestion.sources : [];
        if (!sources.length)
            return "";
        const readable = sources.filter((source) => {
            const status = String(source?.status || "").toLowerCase();
            return source?.readable === true || ["parsed", "partial"].includes(status);
        }).length;
        const pending = sources.length - readable;
        return pending > 0
            ? `资料读取：已读取 ${readable}/${sources.length} 份，仍有 ${pending} 份需要授权或重新上传。`
            : `资料读取：${readable} 份资料均已加入需求与验收上下文。`;
    }
    function formatFeishuTaskJourney(run, mission, sourceIngestion, fallback) {
        const base = globalRunVisibleReply(run, fallback).trim();
        const sourceLine = feishuSourceCoverage(sourceIngestion || run.source_ingestion);
        const status = String(run.status || "");
        const lines = [];
        if (status === "waiting_confirmation") {
            lines.push("当前状态：等待你确认后再执行。");
            lines.push(base);
            lines.push("请回复“确认”继续，或回复“取消”。");
        }
        else if (status === "waiting_clarification") {
            lines.push("当前状态：需要你补充信息，任务进度已保留。");
            lines.push(base);
            const clarification = run.clarification_summary?.pre_plan_clarification
                || run.clarificationSummary?.prePlanClarification;
            if (Array.isArray(clarification?.questions) && clarification.questions.length) {
                lines.push(clarification.questions.map((question, index) => {
                    const options = Array.isArray(question.options) && question.options.length
                        ? `\n${question.options.map((option, optionIndex) => `   ${optionIndex + 1}. ${option.label}${option.recommended ? "（推荐）" : ""}`).join("\n")}`
                        : "";
                    return `${index + 1}. ${question.label}${options}`;
                }).join("\n"));
                lines.push("请按“问题序号：选项序号/补充文字”回复，我会沿用原请求生成详细计划并等待你确认。");
            }
        }
        else if (["supervising", "running"].includes(status) || mission && !["completed", "failed", "cancelled"].includes(String(mission.status || ""))) {
            const childCount = Array.isArray(mission?.children) ? mission.children.length : 0;
            lines.push(`当前状态：${childCount ? `已进入自动执行链路，共 ${childCount} 个执行步骤。` : "正在处理，本消息不代表任务已完成。"}`);
            lines.push(base);
            lines.push("后续会在同一飞书会话更新执行、验收、返工或阻塞结果。");
        }
        else if (status === "failed") {
            lines.push("当前状态：执行未完成。");
            lines.push(base);
            lines.push("已完成部分和失败证据会保留，可在补齐条件后继续。");
        }
        else {
            lines.push(base);
        }
        if (sourceLine)
            lines.push(sourceLine);
        return lines.filter(Boolean).join("\n\n");
    }
    function cardActionValue(payload) {
        return payload?.action?.value || payload?.event?.action?.value || payload?.event?.action || {};
    }
    function cardActionMessageId(payload) {
        return String(payload?.context?.open_message_id
            || payload?.event?.context?.open_message_id
            || payload?.event?.message?.message_id
            || payload?.message_id
            || "").trim();
    }
    async function processFeishuCardAction(baseUrl, payload, ctx) {
        const value = cardActionValue(payload);
        const action = String(value?.ccm_action || "");
        if (!(0, feishu_access_1.verifyFeishuCardAction)(value))
            throw new Error("飞书交互卡片签名无效");
        if (!value.expires_at || Date.parse(String(value.expires_at)) <= Date.now())
            throw new Error("飞书交互卡片已经过期");
        const access = resolveUserAccess(payload);
        if (!access.allowed)
            throw new Error(access.reason);
        const messageId = cardActionMessageId(payload);
        const binding = (0, feishu_channel_1.getFeishuBindingByMessageId)(messageId);
        if (action === "global_target_selection") {
            if (!access.canOperate)
                throw new Error("当前飞书用户没有任务投放权限");
            if (!ctx)
                throw new Error("全局 Agent 运行上下文不可用");
            const conversationId = String(value.conversation_id || "").trim();
            if (!binding || !conversationId || !binding.session_ids?.includes(conversationId))
                throw new Error("目标选择卡片与原飞书会话不匹配");
            const target = (0, automation_session_bindings_1.listGlobalDispatchTargets)().find((item) => item.ready !== false && item.scope === String(value.scope || "") && item.scopeId === String(value.scope_id || ""));
            if (!target)
                throw new Error("所选项目或群聊已经不可投放，请重新选择");
            const waiting = getGlobalAgentRun(String(value.decision || ""));
            if (!waiting || waiting.status !== "waiting_clarification" || waiting.session_id !== conversationId)
                throw new Error("原任务已不再等待目标选择");
            const targetRef = { scope: target.scope, scopeId: target.scopeId, canonicalName: target.canonicalName, displayName: target.displayName };
            const selectionText = `目标选择：${target.displayName || target.canonicalName}`;
            appendGlobalAgentConversationMessage(conversationId, "user", selectionText, "feishu");
            const run = await runAgenticGlobalRequest(baseUrl, ctx, {
                message: selectionText,
                originalMessage: selectionText,
                sessionId: conversationId,
                source: "feishu-control-bot",
                clarificationRunId: waiting.id,
                requestedTargetRefs: [targetRef],
                principal: { kind: "feishu", id: access.open_id || access.user_id || "unknown", role: access.role, capabilities: [] },
            });
            const mission = run.mission_id ? getGlobalDevelopmentMission(run.mission_id) : null;
            const markdown = formatFeishuTaskJourney(run, mission, null, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK);
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            await sendFeishuConversationReply({ conversationId, title: "全局 Agent 任务进展", markdown, runId: run.id, missionId: run.mission_id || "", stage: run.status, dedupeSuffix: `target:${run.id}:${target.scope}:${target.scopeId}` });
            return { success: true, action, target: targetRef, run_id: run.id, status: run.status, message: markdown };
        }
        if (action !== "permission_decision")
            throw new Error("不支持的飞书卡片操作");
        if (!access.canApprove)
            throw new Error("当前飞书用户没有审批权限");
        if (!binding || binding.id !== String(value.binding_id || ""))
            throw new Error("审批卡片与原飞书会话不匹配");
        const requestId = String(value.request_id || "");
        const request = listTaskPermissionRequests({ state: "awaiting_user" }).find((item) => item.id === requestId);
        if (!request)
            throw new Error("权限申请已经处理、失效或不存在");
        const belongsToBinding = binding.session_ids?.includes(request.originSessionId)
            || binding.task_ids?.includes(request.taskId)
            || binding.run_ids?.includes(request.globalRunId)
            || binding.mission_ids?.includes(request.globalMissionId);
        if (!belongsToBinding)
            throw new Error("权限申请不属于这张飞书会话卡片");
        const decision = value.decision === "approve" ? "approve" : "reject";
        await postLocalApi(baseUrl, "/api/tasks/permission-requests/decide", {
            request_id: requestId,
            decision,
            reason: `飞书管理员 ${access.name || access.open_id || access.user_id} 通过交互卡片${decision === "approve" ? "批准" : "拒绝"}`,
            maxUses: 1,
            expiresInMinutes: 15,
        });
        const markdown = decision === "approve"
            ? `已批准 ${request.project} 的 ${request.operation} 权限一次，有效期 15 分钟；原任务会自动继续。`
            : `已拒绝 ${request.project} 的 ${request.operation} 权限申请。`;
        await notifyFeishuTaskStage({
            stage: "permission_result",
            title: "权限审批结果",
            markdown,
            sessionId: request.originSessionId,
            runId: request.globalRunId,
            missionId: request.globalMissionId,
            taskId: String(request.taskId || "").startsWith("project-session:") ? "" : request.taskId,
            forceNewMessage: true,
            dedupeKey: `permission-result:${requestId}:${decision}`,
        });
        return { success: true, decision, request_id: requestId, message: markdown };
    }
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
    function feishuRequirementTargets() {
        return (0, automation_session_bindings_1.listGlobalDispatchTargets)().filter((target) => target.ready !== false).map((target) => ({
            type: target.scope,
            id: target.scopeId,
            name: target.displayName || target.canonicalName || target.scopeId,
            canonicalName: target.canonicalName || target.scopeId,
            capabilities: target.capabilities || [],
        }));
    }
    function normalizeFeishuRequestedTargets(textValue) {
        const text = String(textValue || "").trim();
        const targets = feishuRequirementTargets();
        const numbered = text.match(/^(?:选择|目标)?\s*(\d{1,2})\s*[。.!！]?$/);
        if (numbered) {
            const target = targets[Number(numbered[1]) - 1];
            return target ? [{ scope: target.type, scopeId: target.id, canonicalName: target.canonicalName, displayName: target.name }] : [];
        }
        return targets.filter((target) => {
            const names = [target.name, target.canonicalName, target.id].map(value => String(value || "").trim()).filter(value => value.length >= 2);
            return names.some(name => text.includes(name));
        }).map((target) => ({ scope: target.type, scopeId: target.id, canonicalName: target.canonicalName, displayName: target.name }));
    }
    function feishuTargetSelectionMarkdown() {
        const targets = feishuRequirementTargets();
        if (!targets.length)
            return "当前没有可投放的项目或群聊，请先在 CCM 页面完成目标配置。";
        return [
            "请选择本次任务要投放的目标（可直接回复序号或完整名称）：",
            ...targets.map((target, index) => `${index + 1}. ${target.name}（${target.type === "group" ? "群聊" : "项目"}）`),
        ].join("\n");
    }
    function feishuTargetSelectionActions(run, conversationId) {
        try {
            return feishuRequirementTargets().slice(0, 5).map((target) => {
                const value = {
                    ccm_action: "global_target_selection",
                    request_id: `${target.type}:${target.id}`,
                    decision: String(run?.id || ""),
                    binding_id: "",
                    scope: target.type,
                    scope_id: target.id,
                    conversation_id: conversationId,
                    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
                };
                value.signature = (0, feishu_access_1.signFeishuCardAction)(value);
                return { text: String(target.name || target.id).slice(0, 24), type: "default", value };
            });
        }
        catch {
            return [];
        }
    }
    async function ingestFeishuRequirementAttachment(payload, userText) {
        const message = payload?.event?.message || {};
        const messageType = String(message.message_type || "").toLowerCase();
        const targets = feishuRequirementTargets();
        const controlledAttachments = Array.isArray(payload?.feishu_attachments) ? payload.feishu_attachments : [];
        if (controlledAttachments.length) {
            const files = (0, feishu_inbound_attachments_1.materializeFeishuInboundAttachments)(controlledAttachments);
            const result = await (0, source_ingestion_1.ingestRequirementSources)({
                files,
                userText,
                extractRequirement: true,
                decomposeRequirement: false,
                availableTargets: targets,
            });
            result.warnings = [...new Set([
                    ...(Array.isArray(result.warnings) ? result.warnings : []),
                    ...(Array.isArray(payload?.feishu_attachment_warnings) ? payload.feishu_attachment_warnings : []),
                ])];
            result.feishu_attachments = controlledAttachments;
            result.public_attachments = (0, global_agent_attachments_1.serializeGlobalRequestAttachments)(files).map((item) => {
                const parsed = (result.sources || []).find((sourceItem) => String(sourceItem?.name || "") === item.name);
                return parsed ? { ...item, status: String(parsed.status || (parsed.readable ? "parsed" : "failed")), readable: parsed.readable === true, checksum: String(parsed.checksum || parsed.manifest?.source_checksum || "") } : item;
            });
            return result;
        }
        if (["file", "media", "image"].includes(messageType)) {
            const messageId = String(message.message_id || getFeishuMessageId(payload) || "").trim();
            if (!messageId)
                throw new Error("飞书附件事件缺少消息标识");
            const resolved = await (0, feishu_inbound_attachments_1.resolveFeishuInboundAttachments)({
                messageId,
                resourceHints: (0, feishu_inbound_attachments_1.extractFeishuEventResourceHints)(payload),
                source: "event_callback",
            });
            if (!resolved.attachments.length)
                throw new Error(resolved.failures[0]?.reason || "飞书附件下载失败");
            payload.feishu_attachments = resolved.attachments;
            payload.feishu_attachment_warnings = resolved.warnings;
            const files = (0, feishu_inbound_attachments_1.materializeFeishuInboundAttachments)(resolved.attachments);
            const result = await (0, source_ingestion_1.ingestRequirementSources)({
                files,
                userText,
                extractRequirement: true,
                decomposeRequirement: false,
                availableTargets: targets,
            });
            result.warnings = [...new Set([...(result.warnings || []), ...resolved.warnings])];
            result.feishu_attachments = resolved.attachments;
            result.public_attachments = (0, global_agent_attachments_1.serializeGlobalRequestAttachments)(files).map((item) => {
                const parsed = (result.sources || []).find((sourceItem) => String(sourceItem?.name || "") === item.name);
                return parsed ? { ...item, status: String(parsed.status || (parsed.readable ? "parsed" : "failed")), readable: parsed.readable === true, checksum: String(parsed.checksum || parsed.manifest?.source_checksum || "") } : item;
            });
            return result;
        }
        if (/https?:\/\//i.test(userText)) {
            return (0, source_ingestion_1.ingestRequirementSources)({
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
        const inferredConversationId = resolveFeishuGlobalAgentSessionId(payload);
        const conversationId = options.conversationId || resolveBoundFeishuGlobalSessionId(payload, inferredConversationId);
        const destination = options.destination || (options.inboundRecorded ? null : recordFeishuInbound({ payload, sessionId: conversationId, messageId: getFeishuMessageId(payload) }));
        bindFeishuTaskContext({ sessionId: conversationId, destination, source: "feishu-control-bot", targetType: "global_agent", originReceipt: options.originReceipt });
        const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
        const explicitRouteChoice = String(options.resolvedRoute || "").trim();
        const explicitCandidateTaskId = String(options.resolvedCandidateTaskId || "").trim();
        const recoverableCandidates = (0, conversation_message_routing_1.findRecoverableConversationTasks)({ scope: "global", scopeId: "global", exactSessionId: conversationId });
        const explicitCandidate = explicitRouteChoice === "continue_original"
            ? recoverableCandidates.find((item) => String(item?.id || "") === explicitCandidateTaskId)
            : null;
        if (explicitRouteChoice === "continue_original" && !explicitCandidate) {
            throw Object.assign(new Error("原任务已不可恢复，请选择作为新任务或仅回答问题"), { code: "CONVERSATION_ROUTE_CANDIDATE_STALE" });
        }
        if (explicitCandidate) {
            historyBeforeUser.push({ role: "system", content: `用户明确选择继续原任务。可恢复任务摘要：${JSON.stringify((0, conversation_message_routing_1.buildRecoverableTaskSummary)(explicitCandidate))}。必须沿用该任务目标，不得创建重复任务。` });
        }
        else if (recoverableCandidates.length) {
            historyBeforeUser.push({ role: "system", content: `当前精确会话的可恢复任务摘要：${JSON.stringify(recoverableCandidates.slice(0, 3).map(conversation_message_routing_1.buildRecoverableTaskSummary))}。请结合当前消息判断 continuationKind；不要仅因为存在旧任务就续接。` });
        }
        const sourceIngestion = await ingestFeishuRequirementAttachment(payload, text);
        const controlledAttachments = Array.isArray(payload?.feishu_attachments) ? payload.feishu_attachments : [];
        const attachmentSources = Array.isArray(sourceIngestion?.sources) ? sourceIngestion.sources : [];
        const readableAttachmentCount = attachmentSources.filter((item) => item?.readable === true || ["parsed", "partial"].includes(String(item?.status || "").toLowerCase())).length;
        if (controlledAttachments.length && readableAttachmentCount === 0
            && /^(?:请读取并处理我刚发送的附件。?|请读取并处理这条飞书附件。?)$/.test(String(text || "").trim())) {
            throw new Error("附件已经收到，但没有可读取的内容。请转换为 PDF、图片或文本后重新发送。");
        }
        if (controlledAttachments.length) {
            const transferFailureCount = Array.isArray(payload?.feishu_attachment_failures) ? payload.feishu_attachment_failures.length : 0;
            const unreadable = Math.max(0, controlledAttachments.length - readableAttachmentCount) + transferFailureCount;
            const reportedAttachmentCount = controlledAttachments.length + transferFailureCount;
            const unreadableNames = [
                ...attachmentSources.filter((item) => item?.readable !== true).map((item) => String(item?.name || "附件")),
                ...(Array.isArray(payload?.feishu_attachment_failures) ? payload.feishu_attachment_failures.map((item) => String(item?.name || "附件")) : []),
            ].filter(Boolean).slice(0, 5);
            await sendFeishuConversationReply({
                conversationId,
                title: "全局 Agent · 附件读取",
                markdown: unreadable
                    ? `已收到 ${reportedAttachmentCount} 个附件，已读取 ${readableAttachmentCount} 个；${unreadable} 个无法解析${unreadableNames.length ? `（${unreadableNames.join("、")}）` : ""}，将继续处理可读内容。`
                    : `已收到并读取 ${reportedAttachmentCount} 个附件，正在整理任务目标。`,
                traceId,
                stage: "global_agent_attachment_ingestion",
                dedupeSuffix: `attachments:${getFeishuMessageId(payload) || controlledAttachments.map((item) => item.id).join(":")}`,
            });
        }
        const agentMessage = sourceIngestion?.agent_context
            ? `${text}${sourceIngestion.agent_context}`
            : text;
        appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu", {
            files: Array.isArray(sourceIngestion?.public_attachments)
                ? sourceIngestion.public_attachments
                : (0, feishu_inbound_attachments_1.publicFeishuInboundAttachments)(payload?.feishu_attachments),
        });
        const auditBase = {
            source: "feishu-control-bot",
            sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
            message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
            trace_id: traceId,
        };
        appendTraceEvent(traceId, { id: `feishu:${getFeishuMessageId(payload) || crypto.randomBytes(4).toString("hex")}:received`, type: "feishu.message_received", status: "info", message: text.slice(0, 500), data: { conversation_id: conversationId, message_id: getFeishuMessageId(payload) } });
        try {
            const permissionMatch = text.match(/^(批准权限|同意权限|拒绝权限|取消权限)\s+(perm_[a-f0-9]{24})[。！!\s]*$/i);
            if (permissionMatch) {
                const access = resolveUserAccess({ ...payload, open_id: destination?.open_id, user_id: destination?.user_id });
                if (!access.canApprove) {
                    const markdown = access.allowed ? "当前飞书用户没有审批权限。" : access.reason;
                    if (sendReport)
                        await sendFeishuConversationReply({ conversationId, title: "全局 Agent 权限审批", markdown, traceId, dedupeSuffix: "permission-forbidden" });
                    return markdown;
                }
                const requestId = String(permissionMatch[2] || "");
                const request = listTaskPermissionRequests({ originType: "global", originSessionId: conversationId, state: "awaiting_user" })
                    .find((item) => item.id === requestId);
                if (!request) {
                    const markdown = "这项权限申请不属于当前飞书全局会话，或者已经处理、失效。";
                    appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
                    if (sendReport)
                        await sendFeishuConversationReply({ conversationId, title: "全局 Agent 权限审批", markdown, traceId, dedupeSuffix: `permission-mismatch:${requestId}` });
                    return markdown;
                }
                const decision = /^(批准|同意)/.test(permissionMatch[1]) ? "approve" : "reject";
                await postLocalApi(baseUrl, "/api/tasks/permission-requests/decide", {
                    request_id: requestId,
                    decision,
                    reason: `用户在来源飞书会话明确${decision === "approve" ? "批准" : "拒绝"}`,
                    maxUses: 1,
                    expiresInMinutes: 15,
                });
                const markdown = decision === "approve"
                    ? `已批准 ${request.project} 的 ${request.operation} 权限一次，有效期 15 分钟；原任务会自动继续。`
                    : `已拒绝 ${request.project} 的 ${request.operation} 权限申请。`;
                appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
                if (sendReport)
                    await sendFeishuConversationReply({ conversationId, title: "全局 Agent 权限审批", markdown, traceId, dedupeSuffix: `permission:${requestId}:${decision}` });
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
                        await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown, traceId, dedupeSuffix: "no-confirmation" });
                    return markdown;
                }
                run = await resumeGlobalAgentRun(waiting.id, createAgenticRuntime(baseUrl, ctx), {
                    approved: !/^取消/i.test(confirmationMatch[1]),
                    cancelled: /^取消/i.test(confirmationMatch[1]),
                });
            }
            else {
                const requestedTargetRefs = normalizeFeishuRequestedTargets(text);
                const clarificationRun = requestedTargetRefs.length
                    ? listGlobalAgentRuns({ sessionId: conversationId }).find((item) => item.status === "waiting_clarification")
                    : null;
                const onFeishuRuntimeEvent = (event) => {
                    bindFeishuIdentifiersFromValue(conversationId, event, destination);
                    if (event?.type === "text" && event?.text) {
                        options.onDelta?.(String(event.text));
                    }
                    const presentation = feishuRuntimeEventPresentation(event);
                    if (!presentation)
                        return;
                    void notifyFeishuTaskStage({
                        ...presentation,
                        sessionId: conversationId,
                        cardKey: traceId,
                        runId: event?.run_id || event?.runId || event?.global_run_id || event?.globalRunId || "",
                        missionId: event?.mission_id || event?.missionId || "",
                        taskId: event?.task_id || event?.taskId || "",
                        dedupeKey: `runtime:${traceId}:${event?.type || "event"}:${event?.tool || event?.name || ""}:${event?.task_id || event?.taskId || ""}`,
                    }).catch((error) => console.warn(`[飞书全局 Agent] 进度投递失败：${error?.message || error}`));
                };
                run = await runAgenticGlobalRequest(baseUrl, ctx, {
                    message: agentMessage,
                    originalMessage: text,
                    history: historyBeforeUser.map((item) => ({ role: item.role, content: item.content })),
                    sessionId: conversationId,
                    source: "feishu-control-bot",
                    traceId,
                    sourceIngestion,
                    principal: options.principal || { kind: "feishu", id: destination?.open_id || destination?.user_id || "unknown", role: "operator", capabilities: [] },
                    turnId: options.turnId || options.turn_id || "",
                    queueScope: `feishu:${conversationId}`,
                    clarificationRunId: clarificationRun?.id || "",
                    requestedTargetRefs,
                    routeGuard: (workflowDecision) => {
                        if (explicitRouteChoice === "answer_only") {
                            workflowDecision.mode = "answer";
                            workflowDecision.actionRequired = false;
                            workflowDecision.requiresCodeChanges = false;
                            workflowDecision.continuationKind = "new_task";
                            return;
                        }
                        if (explicitRouteChoice === "start_new_task") {
                            workflowDecision.continuationKind = "new_task";
                            return;
                        }
                        if (explicitRouteChoice === "continue_original") {
                            workflowDecision.continuationKind = String(workflowDecision.continuationKind || "supplement") === "revise_goal" ? "revise_goal" : "supplement";
                            return;
                        }
                        const route = (0, conversation_message_routing_1.decideConversationMessageRoute)({ workflowDecision, candidates: recoverableCandidates });
                        if (route.decision === "needs_user") {
                            throw Object.assign(new Error(route.reason), { code: "CONVERSATION_ROUTE_REQUIRED", route });
                        }
                    },
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
                targetType: "global_agent",
                originReceipt: options.originReceipt,
            });
            let markdown = formatFeishuTaskJourney(run, missionSnapshot, sourceIngestion, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK);
            if (run.status === "waiting_clarification" && !run.requested_target_refs?.length) {
                markdown = `${markdown}\n\n${feishuTargetSelectionMarkdown()}`;
            }
            appendGlobalActionAudit({ ...auditBase, action: { type: "agentic_loop", params: { run_id: run.id } }, status: run.status, result: { summary: markdown, trace_id: run.trace_id, steps: run.steps.length } });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu", {
                extractMemory: run.direct_reply_fast_path !== true,
            });
            if (sendReport)
                await sendFeishuConversationReply({
                    conversationId,
                    title: run.status === "waiting_confirmation"
                        ? "全局 Agent 等待确认"
                        : run.status === "waiting_clarification"
                            ? "全局 Agent 需要补充信息"
                            : "全局 Agent 任务进展",
                    markdown,
                    traceId,
                    cardKey: traceId,
                    runId: run.id,
                    missionId: run.mission_id || "",
                    stage: run.status,
                    actions: run.status === "waiting_clarification" && !run.requested_target_refs?.length
                        ? feishuTargetSelectionActions(run, conversationId)
                        : undefined,
                    dedupeSuffix: `run:${run.id}:${run.status}`,
                });
            return markdown;
        }
        catch (error) {
            const modelCouldNotRoute = !explicitRouteChoice && [
                String(error?.code || ""),
                String(error?.message || ""),
            ].some(value => /MODEL|PROVIDER|TIMEOUT|NETWORK|大模型|模型不可用|模型未配置/i.test(value));
            if ((error?.code === "CONVERSATION_ROUTE_REQUIRED" || modelCouldNotRoute)
                && recoverableCandidates.length > 0
                && String(options.turnId || options.turn_id || "").trim()) {
                const turnId = String(options.turnId || options.turn_id || "").trim();
                const currentTurn = conversationTurnControl.listInternal({ scope: "feishu", conversation_id: conversationId, limit: 500 }).turns.find((item) => item.id === turnId);
                if (currentTurn?.status === "sending") {
                    const routed = conversationTurnControl.requireRoute({
                        id: currentTurn.id,
                        revision: currentTurn.revision,
                        routing: {
                            candidateTaskId: String(error?.route?.candidate?.id || recoverableCandidates[0]?.id || ""),
                            confidence: Number(error?.route?.confidence || 0),
                            reason: String(error?.route?.reason || (modelCouldNotRoute ? "主 Agent 暂时无法可靠判断这条消息是否续接原任务，请选择处理方式" : error?.message) || "需要确认消息处理方式"),
                        },
                    });
                    const markdown = [
                        "这条消息可能与刚才的任务有关。",
                        routed.routing?.reason || "请确认如何处理这条消息。",
                        routed.routing?.candidateTaskId ? "1. 继续原任务" : "1. 继续原任务（当前不可用）",
                        "2. 作为新任务",
                        "3. 仅回答问题",
                        "请直接回复 1、2 或 3。",
                    ].join("\n");
                    if (sendReport)
                        await sendFeishuConversationReply({ conversationId, title: "全局 Agent · 请选择处理方式", markdown, traceId, stage: "conversation_route_required", dedupeSuffix: `route:${routed.id}:${routed.revision}` });
                    throw Object.assign(new Error(markdown), { code: "CONVERSATION_ROUTE_REQUIRED", routeHandled: true, routed, safeReply: markdown });
                }
            }
            const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
            appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
            appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
            if (sendReport)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent 执行失败", markdown, traceId, dedupeSuffix: "failure" });
            return markdown;
        }
    }
    function parseFeishuConversationTurnCommand(value) {
        const text = String(value || "").trim();
        const aside = text.match(/^\/btw(?:\s+([\s\S]+))?$/i);
        if (aside)
            return { kind: "aside", message: String(aside[1] || "").trim() };
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
                    const queuedContext = turn.metadata?.feishu_context_v2 || null;
                    const queuedPayload = queuedContext?.payload || payload;
                    const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, turn.message, queuedPayload, {
                        sendReport: true,
                        traceId: String(turn.metadata?.trace_id || ""),
                        inboundRecorded: !!queuedContext,
                        destination: queuedContext?.destination || undefined,
                        conversationId: turn.conversation_id,
                        originReceipt: turn.metadata?.origin_receipt || undefined,
                        principal: turn.metadata?.principal || undefined,
                        turnId: turn.id,
                        resolvedRoute: String(turn.metadata?.resolved_route || ""),
                        resolvedCandidateTaskId: String(turn.metadata?.resolved_candidate_task_id || ""),
                    });
                    conversationTurnControl.settle({ id: turn.id, status: "completed", result: { reply } });
                }
                catch (error) {
                    if (error?.routeHandled === true)
                        break;
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
        const envelope = payload?.feishu_inbound_envelope || (0, feishu_conversation_v2_1.buildFeishuInboundEnvelopeV2)({
            payload: { ...payload, target_type: "global_agent" },
            targetType: "global_agent",
            transport: String(payload?.source || "").includes("acp") ? "acp" : "internal",
            messageId: getFeishuMessageId(payload),
        });
        const inferredConversationId = resolveFeishuGlobalAgentSessionId(payload);
        const conversationId = resolveBoundFeishuGlobalSessionId(payload, inferredConversationId);
        const messageId = getFeishuMessageId(payload);
        let command = parseFeishuConversationTurnCommand(text);
        const earlyAccess = resolveUserAccess(payload);
        if (command.kind === "aside") {
            if (!earlyAccess.allowed) {
                const reply = `${earlyAccess.reason}。无法读取这个飞书会话绑定的CCM上下文。`;
                if (options.sendReport !== false)
                    await sendFeishuConversationReply({ conversationId, title: "临时提问", markdown: reply, traceId: options.traceId, dedupeSuffix: `aside-denied:${messageId}` });
                return { reply, denied: true, ephemeral: true };
            }
            const exactBinding = (0, feishu_channel_1.getFeishuBindingByMessageId)(messageId || payload?.event?.message?.root_id || payload?.root_message_id || "");
            const bindingType = String(exactBinding?.target_type || "global_agent");
            const asideScope = ["group_agent", "group_session"].includes(bindingType) ? "group" : bindingType === "project_agent" ? "project" : "global";
            const asideScopeId = asideScope === "global" ? "global" : String(exactBinding?.project_id || "").trim();
            const asideSessionId = asideScope === "global" ? conversationId : String(exactBinding?.active_session_id || "").trim();
            if (!asideSessionId || !asideScopeId || !command.message) {
                const reply = !command.message ? "请在 /btw 后输入临时问题。" : "当前飞书消息没有精确绑定CCM会话，无法安全读取上下文。";
                if (options.sendReport !== false)
                    await sendFeishuConversationReply({ conversationId, title: "临时提问", markdown: reply, traceId: options.traceId, dedupeSuffix: `aside-invalid:${messageId}` });
                return { reply, ephemeral: true };
            }
            const result = await (0, slash_command_conversations_1.runConversationAside)({ scope: asideScope, scopeId: asideScopeId, exactSessionId: asideSessionId, question: command.message });
            const reply = `**临时提问 · 基于提问时上下文**\n\n${result.answer}`;
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId: asideSessionId, title: "临时提问", markdown: reply, traceId: options.traceId, dedupeSuffix: `aside:${messageId || crypto.randomUUID()}` });
            return { reply, ephemeral: true, content_stored: false };
        }
        const destination = recordFeishuInbound({ payload, sessionId: conversationId, messageId });
        const originReceipt = (0, feishu_conversation_v2_1.buildFeishuOriginReceiptV2)({ envelope, sessionId: conversationId });
        const buildQueuedContext = () => {
            const context = (0, feishu_conversation_v2_1.buildFeishuQueuedTurnContextV2)(envelope, payload, destination);
            if (Array.isArray(payload?.feishu_attachments) && payload.feishu_attachments.length) {
                context.payload.feishu_attachments = payload.feishu_attachments;
                context.payload.feishu_attachment_warnings = Array.isArray(payload?.feishu_attachment_warnings)
                    ? payload.feishu_attachment_warnings
                    : [];
            }
            return context;
        };
        bindFeishuTaskContext({ sessionId: conversationId, destination, source: "feishu-control-bot", targetType: "global_agent" });
        const access = resolveUserAccess({ ...payload, open_id: destination?.open_id, user_id: destination?.user_id });
        if (!access.allowed) {
            const reply = `${access.reason}。请让 CCM 管理员在“设置 → 通知与渠道 → 任务会话”中添加你的飞书身份。`;
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent 访问受限", markdown: reply, traceId: options.traceId, dedupeSuffix: `access-denied:${messageId || access.open_id || access.user_id}` });
            return { reply, denied: true, report_sent: options.sendReport !== false };
        }
        let resolvedRoute = "";
        let resolvedCandidateTaskId = "";
        let resolvedConversationTurn = null;
        if (command.kind === "normal" && /^[123]$/.test(command.message)) {
            const pendingRoute = conversationTurnControl.listInternal({ scope: "feishu", conversation_id: conversationId, statuses: "needs_route", limit: 20 }).turns.at(-1);
            if (pendingRoute?.routing) {
                const choice = command.message === "1" ? "continue_original" : command.message === "2" ? "start_new_task" : "answer_only";
                if (choice === "continue_original" && !pendingRoute.routing.candidateTaskId) {
                    const reply = "当前没有可安全恢复的原任务，请回复 2 作为新任务，或回复 3 仅回答问题。";
                    if (options.sendReport !== false)
                        await sendFeishuConversationReply({ conversationId, title: "全局 Agent · 请选择处理方式", markdown: reply, traceId: options.traceId, dedupeSuffix: `route-unavailable:${pendingRoute.id}:${pendingRoute.revision}` });
                    return { reply, route_required: true, turn: pendingRoute, report_sent: options.sendReport !== false };
                }
                const resolved = conversationTurnControl.resolveRoute({
                    id: pendingRoute.id,
                    revision: pendingRoute.revision,
                    choice,
                    bindingChecksum: pendingRoute.routing.bindingChecksum,
                });
                command = { kind: "normal", message: resolved.message };
                resolvedRoute = choice;
                resolvedCandidateTaskId = String(resolved.routing?.candidateTaskId || "");
                resolvedConversationTurn = resolved;
            }
        }
        if (["stop", "steer", "queue"].includes(command.kind) && !access.canOperate) {
            const reply = "当前飞书用户只有查看权限，不能控制或排队开发任务。";
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent 访问受限", markdown: reply, traceId: options.traceId, dedupeSuffix: `operation-denied:${messageId}` });
            return { reply, denied: true, report_sent: options.sendReport !== false };
        }
        const sessionRuns = listGlobalAgentRuns({ sessionId: conversationId, limit: 100 });
        const activeRun = sessionRuns.find((run) => String(run?.status || "") === "running") || null;
        if (!access.canOperate && activeRun && command.kind === "normal") {
            const reply = "当前飞书用户只有查看权限，不能向正在执行的任务追加或排队新要求。";
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent 访问受限", markdown: reply, traceId: options.traceId, dedupeSuffix: `queue-denied:${messageId}` });
            return { reply, denied: true, report_sent: options.sendReport !== false };
        }
        if (command.kind === "stop") {
            if (activeRun?.id)
                cancelGlobalAgentRun(activeRun.id);
            void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload);
            const result = {
                reply: activeRun?.id
                    ? "已停止当前工作。已经排队的后续消息会继续保留，你也可以发送新的要求。"
                    : "当前没有正在执行的工作。已经排队的消息仍会保留。",
                stopped_run_id: activeRun?.id || "",
            };
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: result.reply, traceId: options.traceId, dedupeSuffix: `stop:${messageId || activeRun?.id || "none"}` });
            return { ...result, report_sent: options.sendReport !== false };
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
                steerGlobalAgentRun(activeRun.id, command.message, {
                    kind: "supplement",
                    source: "feishu_mid_turn",
                    requestId: queued.turn.request_id,
                });
                conversationTurnControl.settle({ id: queued.turn.id, status: "applied", active_run_id: activeRun.id });
                const result = { reply: "已把这条要求纳入当前工作，我会在安全节点重新核对计划并继续。", turn: queued.turn, run_id: activeRun.id };
                if (options.sendReport !== false)
                    await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: result.reply, traceId: options.traceId, dedupeSuffix: `steer:${queued.turn.id}` });
                return { ...result, report_sent: options.sendReport !== false };
            }
            catch (error) {
                conversationTurnControl.settle({ id: queued.turn.id, status: "failed", error: error?.message || String(error) });
                throw error;
            }
        }
        if (activeRun && !resolvedConversationTurn && (command.kind === "queue" || command.kind === "normal")) {
            const queuedContext = buildQueuedContext();
            const queued = conversationTurnControl.enqueue({
                scope: "feishu",
                conversation_id: conversationId,
                mode: "queue",
                message: command.message,
                request_id: messageId || options.traceId || undefined,
                active_run_id: activeRun.id,
                metadata: { source: "feishu-control-bot", trace_id: options.traceId || "", feishu_context_v2: queuedContext, origin_receipt: originReceipt, principal: { kind: "feishu", id: destination?.open_id || destination?.user_id || "unknown", role: access.role || (access.canOperate ? "operator" : "viewer"), capabilities: access.canOperate ? ["task.execute"] : [] } },
            });
            const position = conversationTurnControl.list({ scope: "feishu", conversation_id: conversationId, statuses: "queued,sending" })
                .turns.find((turn) => turn.id === queued.turn.id)?.position || 1;
            const result = {
                reply: `当前工作仍在进行，这条消息已排在第 ${position} 位，完成后会自动处理。发送“停止”可以结束当前工作。`,
                queued: true,
                position,
                turn: queued.turn,
            };
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: result.reply, traceId: options.traceId, dedupeSuffix: `queue:${queued.turn.id}` });
            return { ...result, report_sent: options.sendReport !== false, origin_receipt: originReceipt };
        }
        const queuedContext = buildQueuedContext();
        const queued = resolvedConversationTurn
            ? { turn: resolvedConversationTurn, duplicate: true }
            : conversationTurnControl.enqueue({
                scope: "feishu",
                conversation_id: conversationId,
                mode: "queue",
                message: command.message,
                request_id: messageId || options.traceId || undefined,
                metadata: { source: "feishu-control-bot", trace_id: options.traceId || "", feishu_context_v2: queuedContext, origin_receipt: originReceipt, principal: { kind: "feishu", id: destination?.open_id || destination?.user_id || "unknown", role: access.role || (access.canOperate ? "operator" : "viewer"), capabilities: access.canOperate ? ["task.execute"] : [] } },
            });
        const turn = conversationTurnControl.claim({ scope: "feishu", conversation_id: conversationId, id: queued.turn.id });
        if (!turn) {
            const position = conversationTurnControl.list({ scope: "feishu", conversation_id: conversationId, statuses: "queued,sending" }).turns.find((item) => item.id === queued.turn.id)?.position || 1;
            const reply = `这条消息已进入当前飞书会话队列，排在第 ${position} 位，完成后会自动回复。`;
            if (options.sendReport !== false)
                await sendFeishuConversationReply({ conversationId, title: "全局 Agent", markdown: reply, traceId: options.traceId, dedupeSuffix: `queue:${queued.turn.id}` });
            return { reply, queued: true, position, turn: queued.turn, report_sent: options.sendReport !== false, origin_receipt: originReceipt };
        }
        try {
            const reply = await processFeishuGlobalAgentMessage(baseUrl, ctx, command.message, payload, { ...options, inboundRecorded: true, destination, conversationId, originReceipt, turnId: turn.id, resolvedRoute, resolvedCandidateTaskId, principal: { kind: "feishu", id: destination?.open_id || destination?.user_id || "unknown", role: access.role || (access.canOperate ? "operator" : "viewer"), capabilities: access.canOperate ? ["task.execute"] : [] } });
            conversationTurnControl.settle({ id: turn.id, status: "completed", checkpoint: "completed", result: { reply } });
            void drainFeishuConversationTurns(baseUrl, ctx, conversationId, payload).catch((error) => console.warn(`[飞书全局 Agent] 队列续跑失败：${error?.message || error}`));
            return { reply, turn_id: turn.id };
        }
        catch (error) {
            if (error?.routeHandled === true) {
                return { reply: String(error.safeReply || error.message || "请选择处理方式"), route_required: true, turn: error.routed, report_sent: options.sendReport !== false };
            }
            conversationTurnControl.settle({ id: turn.id, status: "failed", checkpoint: "failed", error: error?.message || String(error) });
            throw error;
        }
    }
    function runFeishuConversationTurnCommandSelfTest() {
        const checks = {
            stop: parseFeishuConversationTurnCommand("停止").kind === "stop",
            steer: parseFeishuConversationTurnCommand("引导：先补测试").message === "先补测试",
            queue: parseFeishuConversationTurnCommand("排队: 再写文档").kind === "queue",
            aside: parseFeishuConversationTurnCommand("/btw 当前任务做到哪一步了").kind === "aside"
                && parseFeishuConversationTurnCommand("/btw 当前任务做到哪一步了").message === "当前任务做到哪一步了",
            ordinaryDefaultsToNormal: parseFeishuConversationTurnCommand("进度怎么样").kind === "normal",
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    return {
        normalizeFeishuEventPayload, verifyFeishuEventToken, extractFeishuMessageText, extractCcConnectHookText,
        processFeishuGlobalAgentMessage, parseFeishuConversationTurnCommand, drainFeishuConversationTurns, startFeishuConversationTurnRecoveryForServer,
        stopFeishuConversationTurnRecoveryForServer, processFeishuControlledMessage, processFeishuCardAction, runFeishuConversationTurnCommandSelfTest,
    };
}
//# sourceMappingURL=global-agent-feishu-channel.js.map