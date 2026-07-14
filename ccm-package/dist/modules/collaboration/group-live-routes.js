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
exports.resolveExplicitGroupContinuationTask = resolveExplicitGroupContinuationTask;
exports.runGroupExplicitContinuationRoutingSelfTest = runGroupExplicitContinuationRoutingSelfTest;
exports.buildGroupClarificationSummary = buildGroupClarificationSummary;
exports.runGroupClarificationSummarySelfTest = runGroupClarificationSummarySelfTest;
exports.resolvePendingGroupClarification = resolvePendingGroupClarification;
exports.buildGroupClarificationContinuationMessage = buildGroupClarificationContinuationMessage;
exports.runGroupClarificationContinuationSelfTest = runGroupClarificationContinuationSelfTest;
exports.handleGroupLiveRoutes = handleGroupLiveRoutes;
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const group_routes_1 = require("./group-routes");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const user_facing_text_1 = require("../../agents/user-facing-text");
const source_ingestion_1 = require("../requirements/source-ingestion");
const group_memory_index_1 = require("./group-memory-index");
function compactGroupLiveText(value, max = 180) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
function groupLiveFlag(value, fallback = false) {
    if (value === undefined || value === null || value === "")
        return fallback;
    if (typeof value === "boolean")
        return value;
    return ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());
}
function resolveExplicitGroupContinuationTask(tasks, groupId, taskId) {
    const id = String(taskId || "").trim();
    if (!id)
        return { task: null, status: 0, error: "" };
    const task = (Array.isArray(tasks) ? tasks : []).find((item) => item?.id === id) || null;
    const unavailable = !task
        || task.group_id !== groupId
        || task.archived
        || task.deleted_at
        || ["cancelled", "archived"].includes(String(task.status || ""));
    return unavailable
        ? { task: null, status: 404, error: "当前群聊中没有可继续的这个任务" }
        : { task, status: 200, error: "" };
}
function runGroupExplicitContinuationRoutingSelfTest() {
    const tasks = [
        { id: "task-newer", group_id: "group-a", status: "in_progress", updated_at: "2026-07-12T10:00:00.000Z" },
        { id: "task-target", group_id: "group-a", status: "needs_user", updated_at: "2026-07-12T09:00:00.000Z" },
        { id: "task-other-group", group_id: "group-b", status: "needs_user" },
        { id: "task-cancelled", group_id: "group-a", status: "cancelled" },
    ];
    const exact = resolveExplicitGroupContinuationTask(tasks, "group-a", "task-target");
    const crossGroup = resolveExplicitGroupContinuationTask(tasks, "group-a", "task-other-group");
    const cancelled = resolveExplicitGroupContinuationTask(tasks, "group-a", "task-cancelled");
    const checks = {
        selectsRequestedTaskInsteadOfMostRecent: exact.task?.id === "task-target",
        rejectsCrossGroupTask: crossGroup.status === 404 && !crossGroup.task,
        rejectsCancelledTask: cancelled.status === 404 && !cancelled.task,
        acceptsMultipartBoolean: groupLiveFlag("true") === true && groupLiveFlag("false") === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
const GROUP_CLARIFICATION_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|native_session|task_agent_session|WorkerContextPacket|raw\s+payload|raw_report|execution_id|Coordinator|Pipeline/i;
function sanitizeGroupClarificationText(value, fallback = "", max = 220) {
    let text = compactGroupLiveText(value, max).replace(/\*\*/g, "").trim();
    const fallbackText = (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(fallback);
    if (!text)
        return fallbackText;
    if (GROUP_CLARIFICATION_INTERNAL_PATTERN.test(text))
        return fallbackText;
    return (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(text);
}
function extractClarificationQuestion(responseText, fallback = "") {
    const text = String(responseText || "");
    const boldQuestion = text.match(/\*\*([^*?？]{2,240}[?？]?[^*]*)\*\*/);
    if (boldQuestion?.[1])
        return boldQuestion[1];
    const lineQuestion = text.split(/\r?\n/).map(line => line.trim()).find(line => /[?？]$/.test(line));
    return lineQuestion || fallback;
}
function buildGroupClarificationSummary(input) {
    const members = Array.isArray(input.group?.members)
        ? input.group.members.map((member) => String(member?.project || "").trim()).filter((name) => name && !/^coordinator$/i.test(name)).slice(0, 8)
        : [];
    const missing = Array.isArray(input.analysis?.missingInfo) ? input.analysis.missingInfo : [];
    const fallbackQuestion = missing[0] || input.dispatchPolicy?.reason || "请补充目标、范围或验收标准。";
    const question = sanitizeGroupClarificationText(extractClarificationQuestion(input.responseText, fallbackQuestion), "请补充目标、范围或验收标准。", 260);
    const reason = sanitizeGroupClarificationText(input.dispatchPolicy?.reason || missing[0] || "信息还不够明确，我需要先确认关键边界。", "信息还不够明确，我需要先确认关键边界。", 220);
    const suggestions = [
        members.length ? `说明影响哪些项目或成员：${members.join("、")}` : "",
        "补充你希望完成的验收标准",
        "说明是否允许修改代码、配置或执行验证",
    ].filter(Boolean).slice(0, 3);
    return {
        schema: "ccm-group-main-agent-clarification-summary-v1",
        title: "需要你补充信息",
        status: "waiting_user",
        status_label: "等待你回复",
        headline: "我已暂停派发，先确认一个关键问题。",
        question,
        reason,
        answer_suggestions: suggestions,
        next_action: "你回复后，我会带着补充信息继续判断：直接回答、进入计划确认，或安排执行成员。",
        coordinator: (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(input.coordinator || "我"),
        display_policy: {
            user_visible: true,
            show_todo: false,
            technical_details_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function runGroupClarificationSummarySelfTest() {
    const summary = buildGroupClarificationSummary({
        group: { members: [{ project: "coordinator" }, { project: "web-app" }, { project: "api-service" }] },
        responseText: "我需要先确认一下：**这次是只改前端入口，还是也要补后端接口？**",
        dispatchPolicy: { action: "ask_user", reason: "缺少影响范围，trace_id=should-hide" },
        analysis: { missingInfo: ["需要确认前后端范围"] },
        coordinator: "coordinator",
    });
    const visibleText = JSON.stringify({
        title: summary.title,
        status_label: summary.status_label,
        headline: summary.headline,
        question: summary.question,
        reason: summary.reason,
        answer_suggestions: summary.answer_suggestions,
        next_action: summary.next_action,
    });
    const checks = {
        schema: summary.schema === "ccm-group-main-agent-clarification-summary-v1",
        waitsForUser: summary.status === "waiting_user" && summary.status_label === "等待你回复",
        questionVisible: /只改前端入口|后端接口/.test(summary.question),
        suggestionsVisible: summary.answer_suggestions.some((item) => item.includes("web-app")),
        todoHidden: summary.display_policy.show_todo === false,
        hidesProtocol: !GROUP_CLARIFICATION_INTERNAL_PATTERN.test(visibleText),
    };
    return { pass: Object.values(checks).every(Boolean), checks, summary };
}
function groupClarificationContext(message) {
    return message?.clarification_context || message?.clarificationContext || null;
}
function resolvePendingGroupClarification(messages, requestId, messageId = "") {
    const requestedId = String(requestId || "").trim();
    const requestedMessageId = String(messageId || "").trim();
    if (!requestedId && !requestedMessageId)
        return { message: null, context: null, status: 0, error: "" };
    const candidate = [...(Array.isArray(messages) ? messages : [])].reverse().find((item) => {
        const context = groupClarificationContext(item);
        if (!context || String(context.status || "pending") !== "pending" || context.resolved_at || context.resolvedAt)
            return false;
        const contextId = String(context.id || context.request_id || context.requestId || "").trim();
        return (requestedId && contextId === requestedId) || (requestedMessageId && String(item?.id || "") === requestedMessageId);
    }) || null;
    if (!candidate)
        return { message: null, context: null, status: 404, error: "当前群聊中没有等待回答的这个问题" };
    return { message: candidate, context: groupClarificationContext(candidate), status: 200, error: "" };
}
function buildGroupClarificationContinuationMessage(context, answerForAgent) {
    const original = String(context?.original_message_for_agent || context?.originalMessageForAgent || context?.original_message || context?.originalMessage || "").trim();
    const question = String(context?.question || "").trim();
    const answer = String(answerForAgent || "").trim();
    return [
        "[原始请求]",
        original,
        question ? `[此前需要确认]\n${question}` : "",
        "[用户补充]",
        answer,
        "[接续要求]",
        "这是对同一请求的补充回答。请合并原始请求与补充信息继续判断、规划或执行，不要把这条简短回答当成独立新任务。",
    ].filter(Boolean).join("\n\n");
}
function resolveStoredGroupClarification(groupId, pending, answerMessageId, sessionId = "") {
    if (!pending?.message?.id || !pending?.context)
        return;
    const messages = (0, storage_1.getGroupMessages)(groupId, sessionId);
    const index = messages.findIndex((item) => item.id === pending.message.id);
    if (index < 0)
        return;
    const resolvedAt = new Date().toISOString();
    const current = messages[index];
    const summary = current.clarification_summary || current.clarificationSummary || null;
    const context = groupClarificationContext(current) || pending.context;
    messages[index] = {
        ...current,
        clarification_summary: summary ? { ...summary, status: "resolved", status_label: "已补充", resolved_at: resolvedAt, answer_message_id: answerMessageId } : summary,
        clarificationSummary: summary ? { ...summary, status: "resolved", status_label: "已补充", resolved_at: resolvedAt, answer_message_id: answerMessageId } : summary,
        clarification_context: { ...context, status: "resolved", resolved_at: resolvedAt, answer_message_id: answerMessageId },
        clarificationContext: { ...context, status: "resolved", resolved_at: resolvedAt, answer_message_id: answerMessageId },
    };
    (0, storage_1.saveGroupMessages)(groupId, messages, sessionId);
}
function runGroupClarificationContinuationSelfTest() {
    const messages = [
        { id: "clarification-newer", clarification_context: { id: "request-newer", status: "pending", original_message: "另一个请求" } },
        { id: "clarification-target", clarification_context: { id: "request-target", status: "pending", original_message_for_agent: "修复登录恢复", question: "前端和后端都要修改吗？" } },
        { id: "clarification-resolved", clarification_context: { id: "request-resolved", status: "resolved", resolved_at: "2026-07-12T00:00:00.000Z" } },
    ];
    const exact = resolvePendingGroupClarification(messages, "request-target", "");
    const resolved = resolvePendingGroupClarification(messages, "request-resolved", "");
    const continuation = buildGroupClarificationContinuationMessage(exact.context, "前后端都改");
    const checks = {
        selectsExactPendingQuestion: exact.message?.id === "clarification-target",
        ignoresResolvedQuestion: resolved.status === 404 && !resolved.context,
        preservesOriginalRequest: continuation.includes("修复登录恢复"),
        carriesQuestionAndAnswer: continuation.includes("前端和后端都要修改吗") && continuation.includes("前后端都改"),
        preventsStandaloneAnswerRouting: continuation.includes("不要把这条简短回答当成独立新任务"),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
function buildGroupTaskIntakeSummary(input) {
    const requiresConfirmation = input.planModePreflight?.requires_confirmation === true;
    const queued = input.queueResult?.queued === true;
    const status = requiresConfirmation ? "waiting_confirmation" : queued ? "queued" : "saved";
    const goal = compactGroupLiveText(input.goal || input.task?.business_goal || input.task?.title || "这项需求", 180);
    const queueText = queued
        ? `已进入执行队列，位置 ${input.queueResult?.position || 1}`
        : requiresConfirmation
            ? "已暂停自动执行，等待你确认计划"
            : compactGroupLiveText(input.queueResult?.message || "已保存，等待执行通道恢复或手动启动", 160);
    const nextAction = requiresConfirmation
        ? "等待你确认执行前计划；确认后我再安排执行成员。"
        : queued
            ? "等待我启动执行、安排执行成员，并回收结果说明。"
            : "等待执行通道恢复或手动启动；启动后再安排执行成员。";
    return {
        schema: "ccm-group-task-intake-summary-v1",
        title: "接下来",
        status,
        status_label: requiresConfirmation ? "等待确认" : queued ? "已入队" : "已保存",
        headline: requiresConfirmation
            ? `我已为「${goal}」整理执行前计划。`
            : `我已接管「${goal}」，会按任务链路继续推进。`,
        items: [
            { label: "负责人", value: `${(0, user_facing_text_1.sanitizeMainAgentRoleLanguage)(input.coordinator || "我")} 已接管需求` },
            { label: "执行前检查", value: requiresConfirmation ? "计划已生成，需先确认范围" : "只读检查已通过" },
            { label: "队列状态", value: queueText },
            { label: "后续跟踪", value: "等待执行成员提交结果说明，我再验收和总结" },
        ],
        next_action: nextAction,
        display_policy: {
            user_visible: true,
            technical_details_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function handleGroupLiveRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    const { writeSse, ensureTraceId, classifyGroupProjectTaskIntentWithAgent, shouldCreatePersistentGroupTask, shouldUseProjectAnalysisMode, classifyTaskContinuation, looksLikeTaskContinuation, continueTaskWithMessage, appendMainAgentDecisionTrace, applyMainAgentDecisionPetState, validateDailyDevGroupReady, compactMemoryText, buildGroupPlanModePreflight, createTask, updateTask, appendTaskTimelineEvent, buildWorkflowMeta, buildInlineTaskRuntime, updateGroupMemory, enqueueTask, buildCoordinatorSharedFilesContext, buildGroupProjectAnalysisContext, normalizePlanAssignments, getInitialWorkflowMeta, getCoordinatorActionMentions, processCrossAgents, runCoordinatorReviewLoop, buildGroupContextPacket, buildAgentToolContext, prepareAgentRuntimeTools, getProjectExtraConfig, buildAgentMemoryContextBundle, buildAgentMemoryPacket, buildChildAgentDevelopmentContract, buildProjectVerificationHints, buildAgentQaProtocolInstructions, getAgentQaItemsForGroup, handleAgentQaRequests, runtimeToolSnapshotFromAudit, extractActionableMentions, extractAgentReceipt, } = deps;
    if (pathname === "/api/groups/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleGroupSend = async (payload, uploadedFiles = []) => {
            let reliabilityOperationKey = "";
            try {
                const { group_id, target_project, message, client_message_id } = payload;
                let groupSessionId = String(payload.group_session_id || payload.groupSessionId || "").trim();
                const userMessage = String(message || "").trim();
                const sourceIngestion = await (0, source_ingestion_1.ingestRequirementSources)({
                    files: uploadedFiles,
                    userText: userMessage,
                    extractRequirement: uploadedFiles.length > 0 || /https?:\/\//i.test(userMessage),
                });
                const uploadedFilesContext = sourceIngestion.agent_context
                    || ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
                const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
                const incomingMessageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
                const userMessageForHistory = attachmentSummary
                    ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
                    : userMessage;
                if (!incomingMessageForAgent)
                    return (0, utils_1.sendJson)(res, { error: "消息或附件不能为空" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                groupSessionId = groupSessionId || (0, storage_1.getActiveGroupChatSessionId)(group_id);
                const groupSession = (0, storage_1.listGroupChatSessions)(group_id).sessions.find((item) => item.id === groupSessionId);
                if (!groupSession)
                    return (0, utils_1.sendJson)(res, { error: "群聊会话不存在" }, 404);
                if (groupSession.archived === true)
                    return (0, utils_1.sendJson)(res, { error: "归档会话为只读状态，请恢复或新建会话后继续" }, 409);
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                const directMemoryActionName = String(payload.memory_action || payload.memoryAction || "").trim().toLowerCase();
                if (directMemoryActionName) {
                    if (!["remember", "forget"].includes(directMemoryActionName))
                        return (0, utils_1.sendJson)(res, { error: "不支持的记忆操作" }, 400);
                    if (!groupSessionId.startsWith("gcs_"))
                        return (0, utils_1.sendJson)(res, { error: "旧群聊会话不再接收记忆写入，请新建会话" }, 409);
                    if (uploadedFiles.length)
                        return (0, utils_1.sendJson)(res, { error: "记忆命令暂不接收附件，请输入明确文本" }, 400);
                    const messageTraceId = ensureTraceId(payload.trace_id || payload.traceId, "group-memory");
                    const messageId = client_message_id ? String(client_message_id) : `m${Date.now().toString(36)}`;
                    const typedMemoryScopeId = `${group_id}--${groupSessionId}`;
                    const action = (0, group_memory_index_1.buildGroupDirectMemoryAction)(typedMemoryScopeId, {
                        action: directMemoryActionName,
                        messageId,
                        content: String(payload.memory_content || payload.memoryContent || userMessage).trim(),
                        memoryType: payload.memory_type || payload.memoryType || "user",
                        targetMemoryId: payload.target_memory_id || payload.targetMemoryId || "",
                    });
                    const userMsg = {
                        id: messageId,
                        role: "user",
                        target: "coordinator",
                        content: userMessageForHistory,
                        timestamp: new Date().toISOString(),
                        trace_id: messageTraceId,
                        group_session_id: groupSessionId,
                        memory_direct_action: action,
                    };
                    (0, storage_1.appendGroupMessage)(group_id, userMsg);
                    const commit = (0, group_memory_index_1.commitGroupDirectMemoryAction)(typedMemoryScopeId, (0, storage_1.getGroupMessages)(group_id, groupSessionId), {
                        requestId: action.requestId,
                        reason: `group-chat-${directMemoryActionName}`,
                    });
                    const receipt = commit.receipt || {};
                    const candidateHint = Array.isArray(receipt.candidates) && receipt.candidates.length
                        ? ` 可选记忆：${receipt.candidates.map((item) => `${item.memoryId}（${compactGroupLiveText(item.text, 80)}）`).join("；")}`
                        : "";
                    const responseText = receipt.status === "committed" && directMemoryActionName === "remember"
                        ? `已记入当前群聊会话，记忆 ID：${receipt.memoryId}。`
                        : receipt.status === "duplicate"
                            ? `当前群聊会话已经有这条记忆，记忆 ID：${receipt.memoryId}。`
                            : receipt.status === "committed" && directMemoryActionName === "forget"
                                ? `已从当前群聊会话忘记记忆 ${receipt.memoryId}。`
                                : `没有修改记忆：${receipt.reason || "记忆操作未通过校验"}。${candidateHint}`;
                    const responseMessageId = `${messageId}-memory-receipt`;
                    (0, storage_1.appendGroupMessage)(group_id, {
                        id: responseMessageId,
                        role: "assistant",
                        agent: "coordinator",
                        type: "group_memory_receipt",
                        content: responseText,
                        timestamp: new Date().toISOString(),
                        trace_id: messageTraceId,
                        group_session_id: groupSessionId,
                        memory_receipt: receipt,
                    });
                    (0, logs_1.addGroupLog)(group_id, receipt.status === "rejected" ? "warning" : "info", "direct_memory", responseText, {
                        group_session_id: groupSessionId,
                        typed_memory_scope_id: typedMemoryScopeId,
                        action: directMemoryActionName,
                        request_id: action.requestId,
                        receipt,
                    });
                    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" });
                    writeSse(res, { type: "agent_done", agent: "coordinator", messageId: responseMessageId, text: responseText, memoryReceipt: receipt });
                    writeSse(res, { type: "done", messageId: responseMessageId, memoryReceipt: receipt });
                    res.end();
                    return;
                }
                const explicitContinuationTaskId = String(payload.continuation_task_id || payload.continuationTaskId || "").trim();
                const explicitContinuationResolution = resolveExplicitGroupContinuationTask((0, db_1.loadTasks)(), group_id, explicitContinuationTaskId);
                const explicitContinuationTask = explicitContinuationResolution.task;
                if (explicitContinuationTaskId && !explicitContinuationTask) {
                    return (0, utils_1.sendJson)(res, { error: explicitContinuationResolution.error }, explicitContinuationResolution.status || 404);
                }
                if (explicitContinuationTask && String(explicitContinuationTask.group_session_id || explicitContinuationTask.groupSessionId || "default") !== groupSessionId) {
                    return (0, utils_1.sendJson)(res, { error: "这个任务属于另一个群聊会话，请切换到任务所属会话后继续" }, 409);
                }
                const explicitContinuationKind = String(payload.continuation_kind || payload.continuationKind || "supplement").trim().toLowerCase();
                if (explicitContinuationTaskId && !["supplement", "revise_goal"].includes(explicitContinuationKind)) {
                    return (0, utils_1.sendJson)(res, { error: "不支持的任务接续类型" }, 400);
                }
                const clarificationRequestId = String(payload.clarification_request_id || payload.clarificationRequestId || "").trim();
                const clarificationMessageId = String(payload.clarification_message_id || payload.clarificationMessageId || "").trim();
                if (explicitContinuationTaskId && (clarificationRequestId || clarificationMessageId)) {
                    return (0, utils_1.sendJson)(res, { error: "一次只能继续一个任务或回答一个待确认问题" }, 400);
                }
                const pendingClarification = resolvePendingGroupClarification((0, storage_1.getGroupMessages)(group_id, groupSessionId), clarificationRequestId, clarificationMessageId);
                if ((clarificationRequestId || clarificationMessageId) && !pendingClarification.context) {
                    return (0, utils_1.sendJson)(res, { error: pendingClarification.error }, pendingClarification.status || 404);
                }
                const clarificationContext = pendingClarification.context;
                const clarificationOriginalMessage = String(clarificationContext?.original_user_message || clarificationContext?.originalUserMessage || clarificationContext?.original_message || clarificationContext?.originalMessage || "").trim();
                const effectiveUserMessage = clarificationContext
                    ? `${clarificationOriginalMessage || "原始请求"}\n补充说明：${userMessage || "请结合本次附件"}`.trim()
                    : userMessage;
                const messageForAgent = clarificationContext
                    ? buildGroupClarificationContinuationMessage(clarificationContext, incomingMessageForAgent)
                    : incomingMessageForAgent;
                const routing = (0, group_orchestrator_1.selectGroupTargets)(group, clarificationContext?.target_project || clarificationContext?.targetProject || target_project);
                const isBroadcast = routing.isBroadcast;
                const isOrchestrated = routing.orchestrated;
                const targetMembers = routing.members;
                if (targetMembers.length === 0) {
                    return (0, utils_1.sendJson)(res, { error: "没有找到目标项目" }, 400);
                }
                const messageMode = String(clarificationContext?.message_mode || clarificationContext?.messageMode || payload.message_mode || payload.messageMode || "conversation").trim().toLowerCase();
                const messageTraceId = ensureTraceId(payload.trace_id || payload.traceId || clarificationContext?.trace_id || clarificationContext?.traceId, "group");
                const forceProjectTask = groupLiveFlag(payload.force_task ?? payload.forceTask, groupLiveFlag(clarificationContext?.force_task ?? clarificationContext?.forceTask, false));
                const statusFollowupRequest = isOrchestrated
                    && !clarificationContext
                    && !forceProjectTask
                    && sourceIngestion.sources.length === 0
                    && (0, group_routes_1.isGroupProgressStatusRequest)(userMessage);
                const taskIntent = explicitContinuationTask
                    ? { executable: true, kind: "project_task", confidence: 1, reason: "用户正在补充当前任务所需条件", source: "explicit_task_continuation" }
                    : forceProjectTask
                        ? { executable: true, kind: "project_task", confidence: 1, reason: "用户已明确要求创建并执行项目任务", source: "explicit_force_task" }
                        : await classifyGroupProjectTaskIntentWithAgent({
                            group,
                            message: effectiveUserMessage,
                            uploadedFiles,
                            isOrchestrated,
                            messageMode,
                            forceProjectTask,
                            sharedFilesContext: uploadedFilesContext,
                        });
                const persistentTaskRequest = !!explicitContinuationTask || (!statusFollowupRequest && shouldCreatePersistentGroupTask({ isOrchestrated, messageMode, taskIntent, forceProjectTask }));
                const projectAnalysisRequest = !statusFollowupRequest && shouldUseProjectAnalysisMode({ isOrchestrated, messageMode, taskIntent }) && !persistentTaskRequest;
                const continuationKind = explicitContinuationTask ? explicitContinuationKind : classifyTaskContinuation(effectiveUserMessage);
                const continuationTask = explicitContinuationTask || (!clarificationContext && persistentTaskRequest && continuationKind !== "new_task" && looksLikeTaskContinuation(effectiveUserMessage)
                    ? (0, db_1.loadTasks)()
                        .filter((item) => item.group_id === group_id && !item.archived && !item.deleted_at && !["cancelled", "archived"].includes(String(item.status || "")))
                        .filter((item) => String(item.group_session_id || item.groupSessionId || "default") === groupSessionId)
                        .filter((item) => item.status !== "done" || Date.now() - Date.parse(item.completed_at || item.updated_at || "") < 30 * 60 * 1000)
                        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))[0]
                    : null);
                const groupOperationKey = persistentTaskRequest && client_message_id ? `${group_id}:${groupSessionId || "active"}:${String(client_message_id)}` : "";
                reliabilityOperationKey = groupOperationKey;
                const groupOperation = groupOperationKey
                    ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "group-task-message", key: groupOperationKey, traceId: messageTraceId, leaseMs: 10 * 60 * 1000, metadata: { group_id, client_message_id: String(client_message_id) } })
                    : null;
                if (groupOperation && !groupOperation.acquired) {
                    const replay = groupOperation.record?.result || {};
                    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" });
                    writeSse(res, { type: "duplicate_suppressed", text: groupOperation.inProgress ? "相同群聊消息正在处理，已阻止重复派发" : "相同群聊消息已经处理，返回原任务", traceId: groupOperation.traceId, task: replay.task || null, queue: replay.queue || null });
                    writeSse(res, { type: "done", taskId: replay.task?.id || "", traceId: groupOperation.traceId });
                    res.end();
                    return;
                }
                const userMsg = {
                    id: client_message_id ? String(client_message_id) : "m" + Date.now().toString(36),
                    role: "user",
                    target: routing.targetLabel,
                    content: userMessageForHistory,
                    timestamp: new Date().toISOString(),
                    trace_id: messageTraceId,
                    ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                    ...(continuationTask ? { task_id: continuationTask.id } : {}),
                    ...(clarificationContext ? {
                        clarification_request_id: clarificationRequestId || clarificationContext.id || clarificationContext.request_id || "",
                        clarification_response_to: pendingClarification.message?.id || clarificationMessageId,
                    } : {}),
                };
                (0, storage_1.appendGroupMessage)(group_id, userMsg);
                for (const member of targetMembers) {
                    ctx.broadcastPetSpeech(member.project, { role: "user", text: userMessageForHistory, final: true, source: "group" });
                }
                (0, logs_1.addGroupLog)(group_id, "info", "message", `用户发送消息给 ${isOrchestrated ? '主 Agent' : isBroadcast ? '所有人' : target_project}`, {
                    message: userMessageForHistory.substring(0, 200),
                    target: routing.targetLabel,
                    is_broadcast: isBroadcast,
                    orchestrated: isOrchestrated,
                    task_intent: taskIntent,
                    task_card_allowed: persistentTaskRequest,
                    status_followup: statusFollowupRequest,
                    clarification_resumed: !!clarificationContext,
                    clarification_request_id: clarificationRequestId || "",
                });
                const configs = (0, db_1.getConfigs)();
                if (persistentTaskRequest) {
                    (0, logs_1.addGroupLog)(group_id, "info", "project_task_preflight", "项目任务意图已确认，开始执行前预检", {
                        source: taskIntent?.source || "",
                        force_task: forceProjectTask,
                    });
                }
                if (statusFollowupRequest) {
                    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                    const allTasks = (0, db_1.loadTasks)();
                    const sessionTasks = allTasks.filter((task) => String(task?.group_id || "") === String(group_id)
                        && String(task?.group_session_id || task?.groupSessionId || "default") === groupSessionId);
                    const sessionTaskIds = new Set(sessionTasks.map((task) => String(task.id || "")));
                    const agentQa = getAgentQaItemsForGroup(group_id, 50).filter((item) => sessionTaskIds.has(String(item?.task_id || item?.taskId || ""))
                        || String(item?.group_session_id || item?.groupSessionId || "") === groupSessionId);
                    const mainAgentStatus = (0, group_routes_1.buildGroupMainAgentStatus)({
                        groupId: String(group_id || ""),
                        tasks: sessionTasks,
                        agentQa,
                        getRuntime: buildInlineTaskRuntime,
                    });
                    const statusSummary = (0, group_routes_1.buildGroupStatusFollowupSummary)({ status: mainAgentStatus });
                    const responseMessageId = "m" + Date.now().toString(36) + "gstatus" + crypto.randomBytes(2).toString("hex");
                    const workflow = buildWorkflowMeta("monitoring", "我已汇报当前进展");
                    (0, storage_1.appendGroupMessage)(group_id, {
                        id: responseMessageId,
                        role: "assistant",
                        agent: coordinator.project,
                        type: "group_status_followup",
                        content: statusSummary.text,
                        timestamp: new Date().toISOString(),
                        ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                        workflow,
                        mainAgentStatus,
                        main_agent_status: mainAgentStatus,
                        statusFollowupSummary: statusSummary,
                        status_followup_summary: statusSummary,
                    });
                    updateGroupMemory(group_id, {
                        groupSessionId,
                        currentPhase: "monitoring",
                        decision: "用户询问当前任务进展",
                        reason: mainAgentStatus.latest_task_title || "群聊任务状态追问",
                        nextAction: statusSummary.next_action,
                    });
                    (0, logs_1.addGroupLog)(group_id, "success", "status_followup", "主 Agent 已回复当前群聊任务进展", {
                        task_id: mainAgentStatus.task_id || "",
                        phase: mainAgentStatus.phase || "",
                        running_child_agents: mainAgentStatus.running_child_agents || [],
                    });
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    writeSse(res, { type: "status", text: "正在整理当前任务进展...", agent: coordinator.project });
                    writeSse(res, {
                        type: "agent_done",
                        agent: coordinator.project,
                        text: statusSummary.text,
                        messageId: responseMessageId,
                        workflow,
                        dispatchPolicy: {
                            action: "status_followup",
                            reason: "用户询问当前任务进展",
                            nextStep: statusSummary.next_action,
                        },
                    });
                    writeSse(res, { type: "done", messageId: responseMessageId });
                    res.end();
                    return;
                }
                if (continuationTask) {
                    const continuation = continueTaskWithMessage(continuationTask.id, messageForAgent, ctx, {
                        source: String(payload.source || "group_chat_followup"),
                        continuationKind,
                        auto_execute: groupLiveFlag(payload.auto_execute ?? payload.autoExecute, true),
                        interrupt_current_run: groupLiveFlag(payload.interrupt_current_run ?? payload.interruptCurrentRun, continuationKind === "revise_goal"),
                        resolve_waiting_user: groupLiveFlag(payload.resolve_waiting_user ?? payload.resolveWaitingUser, false),
                        append_group_message: false,
                        idempotencyKey: client_message_id ? `group-followup:${client_message_id}` : "",
                    });
                    if (!continuation.success)
                        return (0, utils_1.sendJson)(res, { error: continuation.error, new_task_suggested: continuation.new_task_suggested }, continuation.status || 400);
                    if (groupOperationKey)
                        (0, reliability_ledger_1.completeIdempotency)("group-task-message", groupOperationKey, { task: continuation.task, queue: continuation.queue_result, continuation: true });
                    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" });
                    const continuationText = continuation.friendly_text
                        || continuation.user_status?.headline
                        || (continuation.deferred ? "补充要求已收到，本轮结束后会继续处理。" : "补充要求已并入原任务。");
                    const continuationNextStep = continuation.next_action
                        || continuation.user_status?.next_action
                        || (continuation.deferred ? "等待当前轮完成后继续" : "已并入原任务");
                    const continuationRoute = continuation.user_status?.route_label
                        || (continuation.deferred ? "本轮结束后接续" : "并入同一任务");
                    const continuationDecision = appendMainAgentDecisionTrace({
                        groupId: group_id,
                        traceId: continuation.trace_id || messageTraceId,
                        messageId: userMsg.id,
                        taskId: continuation.task?.id || continuationTask.id,
                        coordinator: (0, group_orchestrator_1.getCoordinatorMember)(group).project,
                        mode: "followup",
                        messageMode,
                        taskIntent,
                        dispatchPolicy: { action: continuation.user_status?.replan_required ? "replan" : "continue", reason: continuationRoute, nextStep: continuationNextStep },
                        observations: {
                            continuation_kind: continuationKind,
                            same_task: true,
                            deferred: continuation.deferred === true,
                            route_label: continuationRoute,
                            replan_required: continuation.user_status?.replan_required === true,
                        },
                        reply: { kind: "task_update", text: continuationText },
                    });
                    applyMainAgentDecisionPetState(ctx, continuationDecision);
                    writeSse(res, {
                        type: "task_updated",
                        agent: (0, group_orchestrator_1.getCoordinatorMember)(group).project,
                        text: continuationText,
                        nextAction: continuationNextStep,
                        task: continuation.task,
                        taskId: continuation.task?.id,
                        traceId: continuation.trace_id,
                        continuationKind,
                        sameTaskTrace: true,
                    });
                    writeSse(res, { type: "main_agent_decision", decision: continuationDecision, traceId: continuation.trace_id || messageTraceId });
                    writeSse(res, { type: "done", taskId: continuation.task?.id, traceId: continuation.trace_id });
                    res.end();
                    return;
                }
                // 项目任务模式会创建持久工单。后续执行由可恢复任务队列持有，不依赖本次 SSE 连接。
                if (persistentTaskRequest) {
                    (0, logs_1.addGroupLog)(group_id, "info", "project_task_preflight", "正在核对项目执行成员与工作目录");
                    const groupReadiness = validateDailyDevGroupReady(group);
                    const coordinator = groupReadiness.coordinator || (0, group_orchestrator_1.getCoordinatorMember)(group);
                    (0, logs_1.addGroupLog)(group_id, "info", "project_task_preflight", "项目执行成员与工作目录已就绪", {
                        ready_projects: groupReadiness.readyMembers.map((item) => item.project),
                    });
                    const attachmentRecords = sourceIngestion.attachments;
                    const extractedRequirement = sourceIngestion.requirement;
                    const firstDirectiveLine = effectiveUserMessage.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
                    const attachmentTitle = attachmentRecords.map((file) => file.name).filter(Boolean).join("、");
                    const taskTitle = compactMemoryText(extractedRequirement?.title || firstDirectiveLine || (attachmentTitle ? `处理需求文档：${attachmentTitle}` : "项目开发任务"), 80);
                    const businessGoal = extractedRequirement?.business_goal || effectiveUserMessage || taskTitle;
                    const sourceDocuments = [
                        effectiveUserMessage ? `用户原始开发指令：\n${effectiveUserMessage}` : "",
                        sourceIngestion.source_documents ? `用户提交的业务资料：${sourceIngestion.source_documents}` : "",
                        extractedRequirement ? `结构化需求：\n${JSON.stringify(extractedRequirement, null, 2)}` : "",
                    ].filter(Boolean).join("\n\n");
                    const acceptanceCriteria = [
                        ...(extractedRequirement?.acceptance_criteria || []),
                        "主 Agent 必须完成需求理解、计划、子 Agent 分派、执行跟踪、必要返工和最终验收。",
                        "涉及代码的任务必须提供实际文件变更和已执行的构建或测试证据。",
                        "最终报告必须说明完成内容、变更文件、验证结果、风险以及仍需用户处理的事项。",
                    ].filter(Boolean).join(" ");
                    const now = new Date().toISOString();
                    const flagEnabled = (value, fallback = true) => {
                        if (value === undefined || value === null || value === "")
                            return fallback;
                        return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
                    };
                    (0, logs_1.addGroupLog)(group_id, "info", "project_task_preflight", "正在生成执行前计划");
                    const planModePreflight = buildGroupPlanModePreflight({
                        group,
                        message: [businessGoal, ...(extractedRequirement?.scope || []).map((item) => `范围：${item}`)].join("\n") || taskTitle,
                        ctx,
                        configs,
                        taskIntent,
                        attachmentCount: attachmentRecords.length,
                        coordinatorProject: coordinator.project,
                    });
                    (0, logs_1.addGroupLog)(group_id, "info", "project_task_preflight", "执行前计划已生成", {
                        requires_confirmation: planModePreflight.requires_confirmation === true,
                        risk_level: planModePreflight.risk?.level || "",
                    });
                    const requestedAutoExecute = flagEnabled(payload.auto_execute ?? payload.autoExecute, true);
                    const autoExecute = requestedAutoExecute && planModePreflight.requires_confirmation !== true;
                    const inferredAgentQa = /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(effectiveUserMessage);
                    const requiresAgentQa = flagEnabled(payload.requires_agent_qa ?? payload.requiresAgentQa, inferredAgentQa);
                    const globalDirectDispatch = payload.global_direct_dispatch || payload.globalDirectDispatch || (payload.global_handoff || payload.globalHandoff ? {
                        schema: "ccm-global-direct-dispatch-v1",
                        source: payload.source || "global-agent-direct-dispatch",
                        global_run_id: payload.global_run_id || payload.globalRunId || "",
                        session_id: payload.global_session_id || payload.globalSessionId || "",
                        trace_id: messageTraceId,
                        handoff: payload.global_handoff || payload.globalHandoff || null,
                        original_text: payload.original_text || payload.originalText || effectiveUserMessage,
                        user_goal: effectiveUserMessage || taskTitle,
                        accepted_at: now,
                    } : null);
                    let task = createTask({
                        title: taskTitle,
                        description: (0, daily_dev_backlog_1.buildDailyDevTaskDescription)({
                            title: taskTitle,
                            business_goal: businessGoal,
                            scope: extractedRequirement?.scope?.length ? extractedRequirement.scope.join("；") : "由项目主 Agent 根据用户指令、附件和项目上下文识别影响范围。",
                            documents: sourceDocuments,
                            acceptance: acceptanceCriteria,
                            constraints: "主 Agent 对任务全程负责；验收门禁未通过时不得向用户报告完成。",
                            plan_mode: planModePreflight,
                        }),
                        target_project: coordinator.project,
                        group_id,
                        group_session_id: groupSessionId || undefined,
                        assign_type: "group",
                        priority: payload.priority || "normal",
                        auto_execute: autoExecute,
                        workflow_type: "daily_dev",
                        requires_code_changes: flagEnabled(payload.requires_code_changes ?? payload.requiresCodeChanges, true),
                        requires_verification: flagEnabled(payload.requires_verification ?? payload.requiresVerification, true),
                        requires_independent_review: flagEnabled(payload.requires_independent_review ?? payload.requiresIndependentReview, false),
                        requires_agent_qa: requiresAgentQa,
                        business_goal: businessGoal,
                        acceptance_criteria: acceptanceCriteria,
                        source_documents: sourceDocuments,
                        source_attachments: attachmentRecords,
                        requirement_extraction: extractedRequirement,
                        source_ingestion: sourceIngestion.technical,
                        intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
                        intake_draft: planModePreflight,
                        workflow_meta: {
                            plan_mode: planModePreflight,
                            intake: {
                                source: clarificationContext ? "group-chat-clarification-resume" : "group-chat-project-task",
                                message_mode: messageMode,
                                client_message_id: client_message_id || null,
                                accepted_at: now,
                                attachment_count: attachmentRecords.length,
                                source_summary: sourceIngestion.user_summary,
                                source_ingestion: sourceIngestion.technical,
                                requirement_extraction: extractedRequirement,
                                task_intent: taskIntent,
                                ...(clarificationContext ? {
                                    clarification_request_id: clarificationRequestId || clarificationContext.id || clarificationContext.request_id || "",
                                    clarification_message_id: pendingClarification.message?.id || clarificationMessageId,
                                    clarification_answer_message_id: userMsg.id,
                                    original_trace_id: clarificationContext.trace_id || clarificationContext.traceId || "",
                                } : {}),
                                plan_mode: planModePreflight,
                                requires_confirmation: planModePreflight.requires_confirmation === true,
                                auto_continue: planModePreflight.auto_continue === true,
                                requested_auto_execute: requestedAutoExecute,
                            },
                            project_mission: {
                                owner_agent: coordinator.project,
                                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
                                user_directive: effectiveUserMessage || "请读取并完成附件中的开发需求",
                            },
                            ...(globalDirectDispatch ? { global_direct_dispatch: { ...globalDirectDispatch, accepted_at: globalDirectDispatch.accepted_at || now } } : {}),
                        },
                        trace_id: messageTraceId,
                        idempotency_key: groupOperationKey ? `group-task-message:${groupOperationKey}` : null,
                    });
                    (0, logs_1.addGroupLog)(group_id, "info", "project_task_preflight", "持久任务已创建", { task_id: task.id });
                    task = updateTask(task.id, {
                        auto_execute: autoExecute,
                        intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
                        intake_draft: planModePreflight,
                        status_detail: planModePreflight.requires_confirmation
                            ? "执行前计划已准备好，等待你确认后才会安排执行成员"
                            : "执行前计划已就绪，低风险任务自动进入执行队列",
                        workflow_meta: {
                            ...(task.workflow_meta || {}),
                            plan_mode: planModePreflight,
                            intake: {
                                ...((task.workflow_meta || {}).intake || {}),
                                plan_mode: planModePreflight,
                                requires_confirmation: planModePreflight.requires_confirmation === true,
                                auto_continue: planModePreflight.auto_continue === true,
                                requested_auto_execute: requestedAutoExecute,
                            },
                            project_mission: {
                                ...((task.workflow_meta || {}).project_mission || {}),
                                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
                            },
                            ...(globalDirectDispatch ? { global_direct_dispatch: { ...globalDirectDispatch, accepted_at: globalDirectDispatch.accepted_at || now } } : {}),
                        },
                    }) || task;
                    const intakeTimelineEvent = appendTaskTimelineEvent(task.id, {
                        type: planModePreflight.requires_confirmation ? "plan_mode_waiting_confirmation" : "plan_mode_auto_continue",
                        title: planModePreflight.requires_confirmation ? "执行前计划已生成" : "执行前计划已就绪",
                        detail: planModePreflight.risk?.summary || taskTitle,
                        status: "active",
                        phase: "intake",
                        agent: coordinator.project,
                        data: {
                            attachment_count: attachmentRecords.length,
                            source: clarificationContext ? "group-chat-clarification-resume" : "group-chat",
                            plan_mode: planModePreflight,
                            ...(clarificationContext ? { clarification_request_id: clarificationRequestId || clarificationContext.id || clarificationContext.request_id || "" } : {}),
                        },
                    });
                    const intakeProgressCheckpoint = {
                        schema: "ccm-main-agent-live-checkpoint-v1",
                        id: intakeTimelineEvent?.id || `intake-${task.id}`,
                        label: planModePreflight.requires_confirmation ? "执行前计划已生成" : "执行前计划已就绪",
                        detail: compactMemoryText(planModePreflight.risk?.summary || taskTitle, 180),
                        status: "active",
                        phase: "intake",
                        at: intakeTimelineEvent?.at || now,
                        task_id: task.id,
                    };
                    const receiptMessageId = "m" + Date.now().toString(36) + "mission";
                    const understoodGoal = compactMemoryText(effectiveUserMessage || task.title, 180).replace(/[。.!！]+$/g, "");
                    const receiptContent = planModePreflight.requires_confirmation
                        ? `我先按只读方式看了一轮：${understoodGoal}。这个需求${planModePreflight.risk?.summary ? `因为「${planModePreflight.risk.summary}」` : "需要先确认范围"}，我已经整理好执行前计划。你确认后，我再安排执行成员开始修改。`
                        : `我明白了：${understoodGoal}。执行前只读检查已通过，风险较低，会进入队列开始修改和检查，进度会持续更新在下方任务卡中。`;
                    const queueResult = task.auto_execute && task.intake_state !== "awaiting_confirmation"
                        ? enqueueTask(task.id, ctx)
                        : { queued: false, message: planModePreflight.requires_confirmation ? "任务已创建，等待用户确认执行前计划" : "任务已创建，等待手动启动" };
                    const queueText = queueResult?.queued
                        ? `任务已进入执行队列（位置 ${queueResult.position || 1}）`
                        : `任务已保存；${queueResult?.message || "等待执行通道恢复"}`;
                    const taskAfterQueue = (0, db_1.loadTasks)().find((item) => item.id === task.id) || task;
                    const intakeSummary = buildGroupTaskIntakeSummary({
                        task: taskAfterQueue,
                        goal: effectiveUserMessage || taskAfterQueue.title,
                        planModePreflight,
                        queueResult,
                        coordinator: coordinator.project,
                    });
                    const intakeTaskRuntime = buildInlineTaskRuntime(taskAfterQueue);
                    const intakeTaskCard = intakeTaskRuntime?.taskCard || intakeTaskRuntime?.task_card || null;
                    const receiptMessage = {
                        id: receiptMessageId,
                        role: "assistant",
                        agent: coordinator.project,
                        type: "project_task_intake",
                        content: receiptContent,
                        timestamp: now,
                        task_id: task.id,
                        trace_id: messageTraceId,
                        task: {
                            id: taskAfterQueue.id,
                            title: taskAfterQueue.title,
                            status: taskAfterQueue.status,
                            status_detail: taskAfterQueue.status_detail || "",
                            workflow_type: taskAfterQueue.workflow_type,
                            attachment_count: attachmentRecords.length,
                            intake_state: taskAfterQueue.intake_state,
                        },
                        queue: queueResult,
                        intakeSummary,
                        intake_summary: intakeSummary,
                        workflow: buildWorkflowMeta("understanding", "我已接管"),
                        planMode: planModePreflight,
                        plan_mode: planModePreflight,
                        taskCard: intakeTaskCard,
                        task_card: intakeTaskCard,
                        taskRuntime: intakeTaskRuntime,
                        task_runtime: intakeTaskRuntime,
                    };
                    (0, storage_1.appendGroupMessage)(group_id, receiptMessage);
                    if (clarificationContext)
                        resolveStoredGroupClarification(group_id, pendingClarification, userMsg.id, groupSessionId);
                    updateGroupMemory(group_id, {
                        groupSessionId,
                        goal: effectiveUserMessage || userMessageForHistory,
                        currentPhase: "understanding",
                        decision: `已创建持久任务 ${task.id}`,
                        reason: task.title,
                        nextAction: planModePreflight.requires_confirmation ? "等待用户确认执行前计划" : "我会读取需求和项目上下文，生成执行计划并安排执行成员",
                    });
                    (0, logs_1.addTaskLog)(task.id, queueResult?.queued ? "success" : "warning", queueText);
                    if (groupOperationKey)
                        (0, reliability_ledger_1.completeIdempotency)("group-task-message", groupOperationKey, { task: { id: task.id, title: task.title, status: task.status, workflow_type: task.workflow_type }, queue: queueResult });
                    const mainAgentDecision = appendMainAgentDecisionTrace({
                        groupId: group_id,
                        traceId: messageTraceId,
                        messageId: receiptMessageId,
                        taskId: task.id,
                        coordinator: coordinator.project,
                        mode: "project_task",
                        messageMode,
                        taskIntent,
                        dispatchPolicy: planModePreflight.requires_confirmation
                            ? { action: "await_confirmation", reason: planModePreflight.risk?.summary || taskIntent.reason, nextStep: "等待用户确认执行前计划" }
                            : { action: "delegate", reason: taskIntent.reason, nextStep: queueResult?.queued ? "等待执行成员执行并提交结果说明" : "等待执行通道恢复或手动启动" },
                        assignments: [{ project: coordinator.project, task: task.title }],
                        observations: {
                            task_created: true,
                            plan_mode: true,
                            requires_confirmation: planModePreflight.requires_confirmation === true,
                            auto_continue: planModePreflight.auto_continue === true,
                            risk_level: planModePreflight.risk?.level || "low",
                            risk_reasons: planModePreflight.risk?.reasons || [],
                            read_only_exploration: true,
                            impact_scope: planModePreflight.impact_scope,
                            permission_boundaries: planModePreflight.permission_boundaries,
                            auto_execute: task.auto_execute !== false,
                            queued: queueResult?.queued === true,
                            queue_position: queueResult?.position || 0,
                            attachment_count: attachmentRecords.length,
                        },
                        reply: { kind: "task_card", messageId: receiptMessageId, text: receiptContent },
                    });
                    applyMainAgentDecisionPetState(ctx, mainAgentDecision);
                    try {
                        const storedMessages = (0, storage_1.getGroupMessages)(group_id, groupSessionId);
                        const storedIndex = storedMessages.findIndex((item) => item.id === receiptMessageId);
                        if (storedIndex >= 0) {
                            storedMessages[storedIndex] = { ...storedMessages[storedIndex], mainAgentDecision, main_agent_decision: mainAgentDecision };
                            (0, storage_1.saveGroupMessages)(group_id, storedMessages, groupSessionId);
                        }
                    }
                    catch { }
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    writeSse(res, {
                        type: "task_created",
                        agent: coordinator.project,
                        text: receiptContent,
                        messageId: receiptMessageId,
                        task: {
                            id: taskAfterQueue.id,
                            title: taskAfterQueue.title,
                            status: taskAfterQueue.status,
                            status_detail: taskAfterQueue.status_detail || "",
                            workflow_type: taskAfterQueue.workflow_type,
                            attachment_count: attachmentRecords.length,
                        },
                        traceId: messageTraceId,
                        queue: queueResult,
                        intakeSummary,
                        intake_summary: intakeSummary,
                        workflow: receiptMessage.workflow,
                        planMode: planModePreflight,
                        plan_mode: planModePreflight,
                        taskCard: receiptMessage.taskCard,
                        task_card: receiptMessage.task_card,
                        taskRuntime: receiptMessage.taskRuntime,
                        task_runtime: receiptMessage.task_runtime,
                        mainAgentDecision,
                        progressCheckpoint: intakeProgressCheckpoint,
                        progress_checkpoint: intakeProgressCheckpoint,
                    });
                    writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });
                    writeSse(res, { type: "status", text: queueText, agent: coordinator.project, taskId: task.id, progressCheckpoint: intakeProgressCheckpoint, progress_checkpoint: intakeProgressCheckpoint });
                    writeSse(res, { type: "done", messageId: receiptMessageId, taskId: task.id });
                    res.end();
                    return;
                }
                if (isBroadcast && isOrchestrated) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                    const conversationalOnly = (["project_task", "daily_dev", "mission"].includes(messageMode) && !persistentTaskRequest) || projectAnalysisRequest;
                    writeSse(res, {
                        type: "status",
                        text: projectAnalysisRequest
                            ? `🔎 正在只读分析项目...`
                            : conversationalOnly
                                ? `💬 正在回复...`
                                : `🧠 正在协调群聊...`,
                        agent: coordinator.project
                    });
                    ctx.setAgentActivity(coordinator.project, "working", projectAnalysisRequest ? "正在只读分析项目" : conversationalOnly ? "正在回复" : "正在协调群聊", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(coordinator.project, { role: "status", text: projectAnalysisRequest ? "正在查看项目上下文..." : conversationalOnly ? "正在回复..." : "正在协调群聊...", source: "group" });
                    updateGroupMemory(group_id, {
                        groupSessionId,
                        ...(conversationalOnly ? {} : { goal: effectiveUserMessage || userMessageForHistory }),
                        currentPhase: projectAnalysisRequest ? "project_analysis" : conversationalOnly ? "conversation" : "understanding",
                        decision: projectAnalysisRequest ? `只读项目分析：${taskIntent.reason}` : conversationalOnly ? `普通对话：${taskIntent.reason}` : "用户把消息交给我协调",
                        reason: routing.targetLabel,
                        nextAction: projectAnalysisRequest ? "我会基于项目上下文直接回答，不创建任务卡" : conversationalOnly ? "我会直接回复用户，不创建任务卡" : "我会先判断是否需要安排执行成员",
                    });
                    const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6, groupSessionId });
                    const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
                    const projectAnalysisContext = projectAnalysisRequest ? buildGroupProjectAnalysisContext(group, messageForAgent, ctx, configs) : "";
                    const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
                        group,
                        message: projectAnalysisRequest
                            ? `${messageForAgent}\n\n[模式]\n只读项目分析：请基于项目上下文回答用户问题，不要派发子 Agent，不要创建任务，不要承诺修改。`
                            : messageForAgent,
                        context: projectAnalysisRequest ? `${context}\n\n${projectAnalysisContext}` : context,
                        source: "user",
                        sharedFilesContext: [sharedFilesContext, projectAnalysisContext].filter(Boolean).join("\n\n"),
                    });
                    try {
                        const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
                        const outputText = coordinatorResult.content;
                        const rawPlanAssignments = normalizePlanAssignments(coordinatorResult.assignments || []);
                        const planAssignments = conversationalOnly || projectAnalysisRequest ? [] : rawPlanAssignments;
                        const dispatchPolicy = projectAnalysisRequest
                            ? { action: "project_analysis", reason: taskIntent.reason, nextStep: "已基于只读项目上下文回答用户" }
                            : conversationalOnly
                                ? { action: "answer", reason: taskIntent.reason, nextStep: "已按普通对话回复用户" }
                                : (coordinatorResult.dispatchPolicy || null);
                        const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "初始计划");
                        const mainAgentDecision = appendMainAgentDecisionTrace({
                            groupId: group_id,
                            traceId: messageTraceId,
                            messageId: responseMessageId,
                            coordinator: coordinator.project,
                            mode: projectAnalysisRequest ? "project_analysis" : planAssignments.length || dispatchPolicy?.action === "delegate" ? "delegation" : "conversation",
                            messageMode,
                            taskIntent,
                            dispatchPolicy,
                            assignments: planAssignments,
                            observations: {
                                context_packet: true,
                                clarification_resumed: !!clarificationContext,
                                clarification_request_id: clarificationRequestId || "",
                                shared_files_context: !!sharedFilesContext,
                                project_analysis_context: !!projectAnalysisContext,
                                runtime: coordinatorResult.runtime || "",
                                execution_order: conversationalOnly ? "none" : (coordinatorResult.executionOrder || "parallel"),
                            },
                            reply: { kind: "assistant_message", messageId: responseMessageId, text: outputText },
                        });
                        const clarificationSummary = dispatchPolicy?.action === "ask_user"
                            ? buildGroupClarificationSummary({
                                group,
                                userMessage: effectiveUserMessage,
                                responseText: outputText,
                                dispatchPolicy,
                                analysis: coordinatorResult.analysis || null,
                                coordinator: coordinator.project,
                            })
                            : null;
                        const clarificationContextRecord = clarificationSummary ? {
                            schema: "ccm-group-clarification-context-v1",
                            id: `group-clarification:${group_id}:${responseMessageId}`,
                            status: "pending",
                            group_id,
                            response_message_id: responseMessageId,
                            original_message: effectiveUserMessage,
                            original_user_message: effectiveUserMessage,
                            original_message_for_agent: messageForAgent,
                            question: clarificationSummary.question,
                            message_mode: messageMode,
                            target_project: clarificationContext?.target_project || clarificationContext?.targetProject || target_project || "all",
                            force_task: forceProjectTask,
                            trace_id: clarificationContext?.trace_id || clarificationContext?.traceId || messageTraceId,
                            parent_request_id: clarificationRequestId || "",
                            created_at: new Date().toISOString(),
                        } : null;
                        applyMainAgentDecisionPetState(ctx, mainAgentDecision);
                        writeSse(res, {
                            type: "agent_done",
                            agent: coordinator.project,
                            text: outputText,
                            messageId: responseMessageId,
                            assignments: planAssignments,
                            executionOrder: conversationalOnly ? "none" : (coordinatorResult.executionOrder || "parallel"),
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy,
                            coordinationPlan: conversationalOnly ? null : (coordinatorResult.coordinationPlan || null),
                            workflow: workflowMeta,
                            mainAgentDecision,
                            clarificationSummary,
                            clarification_summary: clarificationSummary,
                            clarificationContext: clarificationContextRecord,
                            clarification_context: clarificationContextRecord,
                        });
                        writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });
                        (0, storage_1.appendGroupMessage)(group_id, {
                            id: responseMessageId,
                            role: "assistant",
                            agent: coordinator.project,
                            content: outputText,
                            timestamp: new Date().toISOString(),
                            ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                            assignments: planAssignments,
                            executionOrder: conversationalOnly ? "none" : (coordinatorResult.executionOrder || "parallel"),
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy,
                            coordinationPlan: conversationalOnly ? null : (coordinatorResult.coordinationPlan || null),
                            workflow: workflowMeta,
                            mainAgentDecision,
                            clarificationSummary,
                            clarification_summary: clarificationSummary,
                            clarificationContext: clarificationContextRecord,
                            clarification_context: clarificationContextRecord,
                        });
                        if (clarificationContext)
                            resolveStoredGroupClarification(group_id, pendingClarification, userMsg.id, groupSessionId);
                        updateGroupMemory(group_id, {
                            groupSessionId,
                            currentPhase: workflowMeta.phase,
                            decision: `${dispatchPolicy?.action || "unknown"}：${dispatchPolicy?.reason || "派发判断已整理"}`,
                            reason: dispatchPolicy?.risk || "",
                            nextAction: clarificationSummary?.next_action || dispatchPolicy?.nextStep || (planAssignments.length ? "等待执行成员提交结果说明" : "等待用户继续补充"),
                        });
                        (0, logs_1.addGroupLog)(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300),
                            runtime: "coded-orchestrator",
                        });
                        let crossOutputs = [];
                        const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 正在安排执行成员..." });
                            const execOrder = coordinatorResult.executionOrder || "parallel";
                            crossOutputs = await processCrossAgents(group_id, group, coordinator.project, outputText, validMentions, configs, ctx, res, 0, new Set(), execOrder, responseMessageId);
                            await runCoordinatorReviewLoop({
                                groupId: group_id,
                                group,
                                userMessage: messageForAgent,
                                coordinatorOutput: outputText,
                                crossOutputs,
                                configs,
                                ctx,
                                streamRes: res,
                                executionOrder: execOrder,
                            });
                        }
                        writeSse(res, { type: "done", messageId: responseMessageId });
                        res.end();
                    }
                    catch (err) {
                        writeSse(res, { type: "error", text: err.message });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                if (isBroadcast) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: `🧠 并行处理中，${targetMembers.length} 个 Agent 同时工作...` })}\n\n`);
                    for (const member of targetMembers) {
                        ctx.setAgentActivity(member.project, "working", "群聊协作中", { tab: "groups", groupId: group_id });
                        ctx.broadcastPetSpeech(member.project, { role: "status", text: "群聊协作中，正在思考...", source: "group" });
                    }
                    const getAgentPrompt = async (member) => {
                        const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5, groupSessionId });
                        const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                        const collaborationInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                        const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                        const toolContext = buildAgentToolContext(ctx, group, member.project);
                        const memberConfig = configs.find(c => c.name === member.project);
                        const memberWorkDir = memberConfig ? (0, db_1.getConfigInfo)(memberConfig.path)[0]?.workDir : "";
                        const memberAgentType = memberConfig ? ((0, db_1.getConfigInfo)(memberConfig.path)[0]?.agent || member.agent || "claudecode") : (member.agent || "claudecode");
                        const memoryBundle = await deps.buildAgentMemoryContextBundleWithManifestSelection(group_id, member.project, messageForAgent, {
                            workDir: memberWorkDir,
                            groupSessionId,
                        });
                        const memoryPacket = memoryBundle.rendered_text || buildAgentMemoryPacket(group_id, member.project, messageForAgent);
                        const developmentContract = buildChildAgentDevelopmentContract(member.project, messageForAgent, {
                            source: "群聊广播",
                            verification_hints: buildProjectVerificationHints(member.project, memberWorkDir),
                            work_dir: memberWorkDir,
                            agent_type: memberAgentType,
                            group,
                            memory: memoryBundle,
                        });
                        return {
                            prompt: `${collaborationInstructions}${buildAgentQaProtocolInstructions(member.project, memberList)}${toolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n用户刚才把这条消息发给了群聊所有成员，请从 ${member.project} 的职责视角回复：${messageForAgent}`,
                            allowedTools: toolContext.allowedTools,
                            toolAudit: toolContext.toolAudit,
                            authorizationReadiness: toolContext.authorizationReadiness,
                        };
                    };
                    const agentPromises = targetMembers.map(member => {
                        return new Promise(async (resolve) => {
                            const config = configs.find(c => c.name === member.project);
                            if (!config) {
                                resolve();
                                return;
                            }
                            const info = (0, db_1.getConfigInfo)(config.path);
                            const workDir = info[0]?.workDir;
                            const agentType = info[0]?.agent || "claudecode";
                            const agentPrompt = await getAgentPrompt(member);
                            try {
                                const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, agentPrompt.allowedTools, res, {
                                    toolAudit: agentPrompt.toolAudit,
                                    authorizationReadiness: agentPrompt.authorizationReadiness,
                                });
                                if (runtimeToolContext.dispatchBlocked) {
                                    const reason = runtimeToolContext.dispatchGate?.reason || `${member.project} MCP/Skill 授权未就绪，已阻止安排执行成员`;
                                    (0, logs_1.addGroupLog)(group_id, "warning", "runtime-tool-dispatch-blocked", reason, { agent: member.project, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                                    writeSse(res, { type: "agent_done", agent: member.project, text: `⚠️ ${reason}`, blocked: true, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                                    resolve();
                                    return;
                                }
                                const responseMessageId = "m" + Date.now().toString(36) + member.project + crypto.randomBytes(2).toString("hex");
                                let memberFileChanges = null;
                                let memberWorkEvents = [];
                                const text = await ctx.callAgentForGroupStream(member.project, `${agentPrompt.prompt}${runtimeToolContext.prompt}`, workDir, agentType, {
                                    res,
                                    groupId: group_id,
                                    timeoutMs: 300000,
                                    messageId: responseMessageId,
                                    allowedTools: agentPrompt.allowedTools,
                                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                                    runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, agentPrompt.allowedTools),
                                    runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                                    initialWorkEvents: [runtimeToolContext.workEvent],
                                    onDone: (opts) => { memberFileChanges = opts.fileChanges; memberWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
                                });
                                (0, storage_1.appendGroupMessage)(group_id, {
                                    id: responseMessageId,
                                    role: "assistant", agent: member.project,
                                    content: text,
                                    timestamp: new Date().toISOString(),
                                    ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                                    fileChanges: memberFileChanges,
                                    workEvents: memberWorkEvents,
                                });
                                const validMentions = extractActionableMentions(text, group, member.project);
                                if (validMentions.length > 0) {
                                    writeSse(res, { type: "status", text: `🧩 ${member.project} 正在分配协作任务...` });
                                    await processCrossAgents(group_id, group, member.project, text, validMentions, configs, ctx, res);
                                }
                            }
                            catch (e) {
                                writeSse(res, { type: "agent_done", agent: member.project, text: `❌ 错误: ${e.message}` });
                            }
                            finally {
                                resolve();
                            }
                        });
                    });
                    Promise.all(agentPromises).then(() => {
                        writeSse(res, { type: "done" });
                        try {
                            res.end();
                        }
                        catch { }
                    });
                    return;
                }
                // 单个 Agent 模式
                const target_project_actual = targetMembers[0].project;
                const coordinatorProject = (0, group_orchestrator_1.getCoordinatorMember)(group).project;
                const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";
                if (target_project_actual === coordinatorProject) {
                    const sharedFilesCtx2 = buildCoordinatorSharedFilesContext(ctx, group);
                    updateGroupMemory(group_id, {
                        groupSessionId,
                        goal: userMessageForHistory,
                        currentPhase: "understanding",
                        decision: "用户直接点名协调处理",
                        reason: target_project_actual,
                        nextAction: "我会判断是否直接答复或安排执行成员",
                    });
                    const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6, groupSessionId });
                    const coordinatorResult = await (0, group_orchestrator_1.runGroupOrchestrator)({
                        group,
                        message: messageForAgent,
                        context,
                        source: "direct",
                        sharedFilesContext: sharedFilesCtx2,
                    });
                    const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
                    const planAssignments2 = normalizePlanAssignments(coordinatorResult.assignments || []);
                    const dispatchPolicy2 = coordinatorResult.dispatchPolicy || null;
                    const workflowMeta2 = getInitialWorkflowMeta(planAssignments2, dispatchPolicy2, "初始计划");
                    if (useStream) {
                        res.writeHead(200, {
                            "Content-Type": "text/event-stream",
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "Access-Control-Allow-Origin": "*",
                        });
                        writeSse(res, { type: "status", text: "🧠 代码协调器正在分配任务...", agent: coordinatorProject });
                        writeSse(res, {
                            type: "agent_done",
                            agent: coordinatorProject,
                            text: coordinatorResult.content,
                            messageId: responseMessageId,
                            assignments: planAssignments2,
                            executionOrder: coordinatorResult.executionOrder || "parallel",
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy: dispatchPolicy2,
                            coordinationPlan: coordinatorResult.coordinationPlan || null,
                            workflow: workflowMeta2,
                        });
                    }
                    (0, storage_1.appendGroupMessage)(group_id, {
                        id: responseMessageId,
                        role: "assistant",
                        agent: coordinatorProject,
                        content: coordinatorResult.content,
                        timestamp: new Date().toISOString(),
                        ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                        assignments: planAssignments2,
                        executionOrder: coordinatorResult.executionOrder || "parallel",
                        runtime: coordinatorResult.runtime || "",
                        dispatchPolicy: dispatchPolicy2,
                        coordinationPlan: coordinatorResult.coordinationPlan || null,
                        workflow: workflowMeta2,
                    });
                    updateGroupMemory(group_id, {
                        groupSessionId,
                        currentPhase: workflowMeta2.phase,
                        decision: `${dispatchPolicy2?.action || "unknown"}：${dispatchPolicy2?.reason || "派发判断已整理"}`,
                        reason: dispatchPolicy2?.risk || "",
                        nextAction: dispatchPolicy2?.nextStep || (planAssignments2.length ? "等待执行成员提交结果说明" : "等待用户继续补充"),
                    });
                    const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
                    let crossOutputs = [];
                    let reviewResult = null;
                    if (validMentions.length > 0) {
                        if (useStream)
                            writeSse(res, { type: "status", text: "🧩 正在安排执行成员..." });
                        const execOrder2 = coordinatorResult.executionOrder || "parallel";
                        crossOutputs = await processCrossAgents(group_id, group, coordinatorProject, coordinatorResult.content, validMentions, configs, ctx, useStream ? res : null, 0, new Set(), execOrder2, responseMessageId);
                        reviewResult = await runCoordinatorReviewLoop({
                            groupId: group_id,
                            group,
                            userMessage: messageForAgent,
                            coordinatorOutput: coordinatorResult.content,
                            crossOutputs,
                            configs,
                            ctx,
                            streamRes: useStream ? res : null,
                            executionOrder: execOrder2,
                        });
                    }
                    if (useStream) {
                        writeSse(res, { type: "done", messageId: responseMessageId });
                        res.end();
                    }
                    else {
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            reply: reviewResult?.content ? `${coordinatorResult.content}\n\n---\n\n${reviewResult.content}` : coordinatorResult.content,
                            cross_pending: validMentions.length > 0
                        });
                    }
                    return;
                }
                const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(target_project_actual, group, configs);
                if (!runtime)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const workDir = runtime.workDir;
                const agentType = runtime.agentType;
                const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5, groupSessionId });
                const memberList = group.members.map((m) => m.project).filter((p) => p !== target_project_actual).join(", ");
                let atInstructions = "";
                if (target_project_actual === coordinatorProject) {
                    atInstructions = (0, group_orchestrator_1.buildCoordinatorCollaborationInstructions)(memberList);
                }
                else {
                    atInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(target_project_actual, memberList);
                }
                let sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                const toolContext = buildAgentToolContext(ctx, group, target_project_actual);
                const runtimeToolContext = prepareAgentRuntimeTools(group_id, target_project_actual, workDir, agentType, toolContext.allowedTools, useStream ? res : null, {
                    toolAudit: toolContext.toolAudit,
                    authorizationReadiness: toolContext.authorizationReadiness,
                });
                if (runtimeToolContext.dispatchBlocked) {
                    const reason = runtimeToolContext.dispatchGate?.reason || `${target_project_actual} MCP/Skill 授权未就绪，已阻止安排执行成员`;
                    (0, logs_1.addGroupLog)(group_id, "warning", "runtime-tool-dispatch-blocked", reason, { agent: target_project_actual, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                    if (useStream) {
                        if (!res.headersSent) {
                            res.writeHead(200, {
                                "Content-Type": "text/event-stream",
                                "Cache-Control": "no-cache",
                                "Connection": "keep-alive",
                                "Access-Control-Allow-Origin": "*",
                            });
                        }
                        writeSse(res, { type: "error", text: reason, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                        writeSse(res, { type: "done", blocked: true });
                        res.end();
                        return;
                    }
                    return (0, utils_1.sendJson)(res, { success: false, error: reason, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate }, 409);
                }
                const projectConfig = getProjectExtraConfig(target_project_actual);
                if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
                    sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
                }
                const memoryBundle = await deps.buildAgentMemoryContextBundleWithManifestSelection(group_id, target_project_actual, messageForAgent, {
                    workDir,
                    groupSessionId,
                });
                const memoryPacket = memoryBundle.rendered_text || buildAgentMemoryPacket(group_id, target_project_actual, messageForAgent);
                const developmentContract = buildChildAgentDevelopmentContract(target_project_actual, messageForAgent, {
                    source: "群聊点名",
                    verification_hints: buildProjectVerificationHints(target_project_actual, workDir),
                    work_dir: workDir,
                    agent_type: agentType,
                    group,
                    memory: memoryBundle,
                });
                const fullPrompt = `${atInstructions}${buildAgentQaProtocolInstructions(target_project_actual, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${messageForAgent}`;
                if (useStream) {
                    const responseMessageId = "m" + Date.now().toString(36) + "a" + crypto.randomBytes(2).toString("hex");
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 Agent 正在思考..." })}\n\n`);
                    ctx.setAgentActivity(target_project_actual, "working", "群聊协作中", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(target_project_actual, { role: "status", text: "Agent 正在思考...", source: "group" });
                    try {
                        let targetFileChanges = null;
                        let targetWorkEvents = [];
                        const outputText = await ctx.callAgentForGroupStream(target_project_actual, fullPrompt, workDir, agentType, {
                            res,
                            groupId: group_id,
                            timeoutMs: 300000,
                            messageId: responseMessageId,
                            allowedTools: toolContext.allowedTools,
                            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                            initialWorkEvents: [runtimeToolContext.workEvent],
                            onDone: (opts) => { targetFileChanges = opts.fileChanges; targetWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
                        });
                        (0, storage_1.appendGroupMessage)(group_id, {
                            id: responseMessageId,
                            role: "assistant", agent: target_project_actual,
                            content: outputText.trim(),
                            timestamp: new Date().toISOString(),
                            ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                            fileChanges: targetFileChanges,
                            workEvents: targetWorkEvents,
                        });
                        (0, logs_1.addGroupLog)(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
                            agent: target_project_actual,
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300)
                        });
                        const qaResult = await handleAgentQaRequests({
                            groupId: group_id,
                            group,
                            sourceProject: target_project_actual,
                            sourceOutput: outputText,
                            originalPrompt: fullPrompt,
                            sourceWorkDir: workDir,
                            sourceAgentType: agentType,
                            allowedTools: toolContext.allowedTools,
                            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                            configs,
                            ctx,
                            streamRes: res,
                            taskId: "",
                            qaDepth: 0,
                        });
                        const downstreamOutput = qaResult.resumedOutput || outputText;
                        const validMentions = extractActionableMentions(downstreamOutput, group, target_project_actual);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 正在分配任务..." });
                            try {
                                await processCrossAgents(group_id, group, target_project_actual, downstreamOutput, validMentions, configs, ctx, res);
                            }
                            catch (err) {
                                writeSse(res, { type: "error", text: `跨 Agent 协作失败: ${err.message}` });
                            }
                        }
                        writeSse(res, { type: "done", fileChanges: targetFileChanges, messageId: responseMessageId });
                        res.end();
                    }
                    catch (err) {
                        writeSse(res, { type: "error", text: err.message });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                // 非流式
                const output = await ctx.callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000, {
                    tab: "groups",
                    groupId: group_id,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                    runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                });
                (0, storage_1.appendGroupMessage)(group_id, {
                    id: "m" + Date.now().toString(36) + "a",
                    role: "assistant", agent: target_project_actual,
                    content: output,
                    timestamp: new Date().toISOString(),
                    ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                });
                const validMentions = extractActionableMentions(output, group, target_project_actual);
                if (validMentions.length > 0) {
                    (0, utils_1.sendJson)(res, { success: true, reply: output, cross_pending: true });
                    setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs, ctx));
                    return;
                }
                (0, utils_1.sendJson)(res, { success: true, reply: output });
            }
            catch (e) {
                if (reliabilityOperationKey) {
                    try {
                        (0, reliability_ledger_1.failIdempotency)("group-task-message", reliabilityOperationKey, e);
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            ctx.collectRequestBuffer(req).then((buffer) => {
                try {
                    const boundary = ctx.getMultipartBoundary(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = ctx.parseMultipart(buffer, boundary);
                    handleGroupSend(fields, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                await handleGroupSend(JSON.parse(body));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/broadcast" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, message, group_session_id, groupSessionId: groupSessionIdCamel } = JSON.parse(body);
                const groupSessionId = String(group_session_id || groupSessionIdCamel || "").trim();
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                (0, storage_1.appendGroupMessage)(group_id, {
                    id: "m" + Date.now().toString(36),
                    role: "user", target: "all", content: message,
                    timestamp: new Date().toISOString(),
                    ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                });
                const replies = [];
                const configs = (0, db_1.getConfigs)();
                for (const member of group.members) {
                    const config = configs.find(c => c.name === member.project);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5, groupSessionId });
                    const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                    const toolContext = buildAgentToolContext(ctx, group, member.project);
                    const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, toolContext.allowedTools, null, {
                        toolAudit: toolContext.toolAudit,
                        authorizationReadiness: toolContext.authorizationReadiness,
                    });
                    if (runtimeToolContext.dispatchBlocked) {
                        const reason = runtimeToolContext.dispatchGate?.reason || `${member.project} MCP/Skill 授权未就绪，已阻止安排执行成员`;
                        (0, logs_1.addGroupLog)(group_id, "warning", "runtime-tool-dispatch-blocked", reason, { agent: member.project, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                        replies.push({ project: member.project, reply: "", blocked: true, error: reason, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                        continue;
                    }
                    const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                    const memberInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                    const memoryBundle = await deps.buildAgentMemoryContextBundleWithManifestSelection(group_id, member.project, message, {
                        workDir,
                        groupSessionId,
                    });
                    const memoryPacket = memoryBundle.rendered_text || buildAgentMemoryPacket(group_id, member.project, message);
                    const developmentContract = buildChildAgentDevelopmentContract(member.project, message, {
                        source: "群聊广播 API",
                        verification_hints: buildProjectVerificationHints(member.project, workDir),
                        work_dir: workDir,
                        agent_type: agentType,
                        group,
                        memory: memoryBundle,
                        requires_code_changes: false,
                    });
                    const fullPrompt = `${memberInstructions}${buildAgentQaProtocolInstructions(member.project, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n群聊记录：\n${context}\n\n请从 ${member.project} 的职责视角回复：${message}`;
                    const output = await ctx.callAgent(member.project, fullPrompt, workDir, agentType, 300000, {
                        tab: "groups",
                        groupId: group_id,
                        allowedTools: toolContext.allowedTools,
                        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                        runtimeToolSnapshot: runtimeToolSnapshotFromAudit(runtimeToolContext.audit, toolContext.allowedTools),
                        runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                    });
                    (0, storage_1.appendGroupMessage)(group_id, {
                        id: "m" + Date.now().toString(36) + member.project,
                        role: "assistant", agent: member.project, content: output,
                        timestamp: new Date().toISOString(),
                        ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                    });
                    replies.push({ project: member.project, reply: output, receipt: extractAgentReceipt(output, member.project) });
                }
                (0, utils_1.sendJson)(res, { success: true, replies });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/groups/decompose" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, requirement, group_session_id, groupSessionId: groupSessionIdCamel } = JSON.parse(body);
                const groupSessionId = String(group_session_id || groupSessionIdCamel || "").trim();
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                const configs = (0, db_1.getConfigs)();
                const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
                const members = (0, group_orchestrator_1.getRoutableMembers)(group);
                const memberList = members.map((m) => `${m.project}(${m.agent})`).join(", ");
                const tasks = (0, group_orchestrator_1.decomposeRequirementWithCodedCoordinator)(group, requirement);
                const output = JSON.stringify({ coordinator: coordinator.project, members: memberList, tasks }, null, 2);
                const createdTasks = tasks.map(t => createTask({
                    title: t.title,
                    description: t.description || "",
                    target_project: t.target_project || coordinator.project,
                    group_id,
                    group_session_id: groupSessionId || undefined,
                    assign_type: "group",
                    priority: t.priority || "normal"
                }));
                (0, storage_1.appendGroupMessage)(group_id, {
                    id: "m" + Date.now().toString(36) + "decompose",
                    role: "assistant",
                    agent: coordinator.project,
                    content: `📋 需求已分解，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i + 1}. [${t.target_project}] ${t.title}`).join("\n")}`,
                    timestamp: new Date().toISOString(),
                    ...(groupSessionId ? { group_session_id: groupSessionId } : {}),
                });
                (0, utils_1.sendJson)(res, { success: true, tasks: createdTasks, raw_output: output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=group-live-routes.js.map