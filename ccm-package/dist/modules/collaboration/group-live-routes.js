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
exports.handleGroupLiveRoutes = handleGroupLiveRoutes;
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const reliability_ledger_1 = require("../../system/reliability-ledger");
function handleGroupLiveRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    const { writeSse, ensureTraceId, classifyGroupProjectTaskIntentWithAgent, shouldCreatePersistentGroupTask, shouldUseProjectAnalysisMode, classifyTaskContinuation, looksLikeTaskContinuation, continueTaskWithMessage, appendMainAgentDecisionTrace, applyMainAgentDecisionPetState, validateDailyDevGroupReady, compactMemoryText, buildGroupPlanModePreflight, createTask, updateTask, appendTaskTimelineEvent, buildWorkflowMeta, buildInlineTaskRuntime, updateGroupMemory, enqueueTask, buildCoordinatorSharedFilesContext, buildGroupProjectAnalysisContext, normalizePlanAssignments, getInitialWorkflowMeta, getCoordinatorActionMentions, processCrossAgents, runCoordinatorReviewLoop, buildGroupContextPacket, buildAgentToolContext, prepareAgentRuntimeTools, getProjectExtraConfig, buildAgentMemoryPacket, buildChildAgentDevelopmentContract, buildProjectVerificationHints, buildAgentQaProtocolInstructions, handleAgentQaRequests, runtimeToolSnapshotFromAudit, extractActionableMentions, extractAgentReceipt, } = deps;
    if (pathname === "/api/groups/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleGroupSend = async (payload, uploadedFiles = []) => {
            let reliabilityOperationKey = "";
            try {
                const { group_id, target_project, message, client_message_id } = payload;
                const userMessage = String(message || "").trim();
                const uploadedFilesContext = ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
                const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
                const messageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
                const userMessageForHistory = attachmentSummary
                    ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
                    : userMessage;
                if (!messageForAgent)
                    return (0, utils_1.sendJson)(res, { error: "消息或附件不能为空" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
                const routing = (0, group_orchestrator_1.selectGroupTargets)(group, target_project);
                const isBroadcast = routing.isBroadcast;
                const isOrchestrated = routing.orchestrated;
                const targetMembers = routing.members;
                if (targetMembers.length === 0) {
                    return (0, utils_1.sendJson)(res, { error: "没有找到目标项目" }, 400);
                }
                const messageMode = String(payload.message_mode || payload.messageMode || "conversation").trim().toLowerCase();
                const messageTraceId = ensureTraceId(payload.trace_id || payload.traceId, "group");
                const forceProjectTask = payload.force_task === true || payload.forceTask === true;
                const taskIntent = await classifyGroupProjectTaskIntentWithAgent({
                    group,
                    message: userMessage,
                    uploadedFiles,
                    isOrchestrated,
                    messageMode,
                    forceProjectTask,
                    sharedFilesContext: uploadedFilesContext,
                });
                const persistentTaskRequest = shouldCreatePersistentGroupTask({ isOrchestrated, messageMode, taskIntent, forceProjectTask });
                const projectAnalysisRequest = shouldUseProjectAnalysisMode({ isOrchestrated, messageMode, taskIntent }) && !persistentTaskRequest;
                const continuationKind = classifyTaskContinuation(userMessage);
                const continuationTask = persistentTaskRequest && continuationKind !== "new_task" && looksLikeTaskContinuation(userMessage)
                    ? (0, db_1.loadTasks)()
                        .filter((item) => item.group_id === group_id && !item.archived && !item.deleted_at && !["cancelled", "archived"].includes(String(item.status || "")))
                        .filter((item) => item.status !== "done" || Date.now() - Date.parse(item.completed_at || item.updated_at || "") < 30 * 60 * 1000)
                        .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))[0]
                    : null;
                const groupOperationKey = persistentTaskRequest && client_message_id ? `${group_id}:${String(client_message_id)}` : "";
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
                    ...(continuationTask ? { task_id: continuationTask.id } : {}),
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
                });
                const configs = (0, db_1.getConfigs)();
                if (continuationTask) {
                    const continuation = continueTaskWithMessage(continuationTask.id, messageForAgent, ctx, {
                        source: "group_chat_followup",
                        continuationKind,
                        auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                        idempotencyKey: client_message_id ? `group-followup:${client_message_id}` : "",
                    });
                    if (!continuation.success)
                        return (0, utils_1.sendJson)(res, { error: continuation.error, new_task_suggested: continuation.new_task_suggested }, continuation.status || 400);
                    if (groupOperationKey)
                        (0, reliability_ledger_1.completeIdempotency)("group-task-message", groupOperationKey, { task: continuation.task, queue: continuation.queue_result, continuation: true });
                    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" });
                    const continuationDecision = appendMainAgentDecisionTrace({
                        groupId: group_id,
                        traceId: continuation.trace_id || messageTraceId,
                        messageId: userMsg.id,
                        taskId: continuation.task?.id || continuationTask.id,
                        coordinator: (0, group_orchestrator_1.getCoordinatorMember)(group).project,
                        mode: "followup",
                        messageMode,
                        taskIntent,
                        dispatchPolicy: { action: "replan", reason: `追加要求：${continuationKind}`, nextStep: continuation.deferred ? "等待当前轮完成后继续" : "已并入原任务" },
                        observations: { continuation_kind: continuationKind, same_task: true, deferred: continuation.deferred === true },
                        reply: { kind: "task_update", text: continuation.deferred ? "追加要求已收到，本轮结束后继续" : "追加要求已并入原任务" },
                    });
                    applyMainAgentDecisionPetState(ctx, continuationDecision);
                    writeSse(res, { type: "task_updated", agent: (0, group_orchestrator_1.getCoordinatorMember)(group).project, text: continuation.deferred ? "追加要求已收到，本轮结束后继续" : "追加要求已并入原任务", task: continuation.task, taskId: continuation.task?.id, traceId: continuation.trace_id, continuationKind, sameTaskTrace: true });
                    writeSse(res, { type: "main_agent_decision", decision: continuationDecision, traceId: continuation.trace_id || messageTraceId });
                    writeSse(res, { type: "done", taskId: continuation.task?.id, traceId: continuation.trace_id });
                    res.end();
                    return;
                }
                // 项目任务模式会创建持久工单。后续执行由可恢复任务队列持有，不依赖本次 SSE 连接。
                if (persistentTaskRequest) {
                    const groupReadiness = validateDailyDevGroupReady(group);
                    const coordinator = groupReadiness.coordinator || (0, group_orchestrator_1.getCoordinatorMember)(group);
                    const attachmentRecords = (uploadedFiles || []).map((file) => ({
                        name: file.filename || file.name || "",
                        path: file.savedPath || file.path || "",
                        size: Number(file.size || 0),
                    })).filter((file) => file.name || file.path);
                    const firstDirectiveLine = userMessage.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
                    const attachmentTitle = attachmentRecords.map((file) => file.name).filter(Boolean).join("、");
                    const taskTitle = compactMemoryText(firstDirectiveLine || (attachmentTitle ? `处理需求文档：${attachmentTitle}` : "项目开发任务"), 80);
                    const sourceDocuments = [
                        userMessage ? `用户原始开发指令：\n${userMessage}` : "",
                        uploadedFilesContext ? `用户提交的开发文档：${uploadedFilesContext}` : "",
                    ].filter(Boolean).join("\n\n");
                    const acceptanceCriteria = [
                        "主 Agent 必须完成需求理解、计划、子 Agent 分派、执行跟踪、必要返工和最终验收。",
                        "涉及代码的任务必须提供实际文件变更和已执行的构建或测试证据。",
                        "最终报告必须说明完成内容、变更文件、验证结果、风险以及仍需用户处理的事项。",
                    ].join(" ");
                    const now = new Date().toISOString();
                    const flagEnabled = (value, fallback = true) => {
                        if (value === undefined || value === null || value === "")
                            return fallback;
                        return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
                    };
                    const planModePreflight = buildGroupPlanModePreflight({
                        group,
                        message: userMessage || taskTitle,
                        ctx,
                        configs,
                        taskIntent,
                        attachmentCount: attachmentRecords.length,
                        coordinatorProject: coordinator.project,
                    });
                    const requestedAutoExecute = flagEnabled(payload.auto_execute ?? payload.autoExecute, true);
                    const autoExecute = requestedAutoExecute && planModePreflight.requires_confirmation !== true;
                    const inferredAgentQa = /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(userMessage);
                    const requiresAgentQa = flagEnabled(payload.requires_agent_qa ?? payload.requiresAgentQa, inferredAgentQa);
                    let task = createTask({
                        title: taskTitle,
                        description: (0, daily_dev_backlog_1.buildDailyDevTaskDescription)({
                            title: taskTitle,
                            business_goal: userMessage || taskTitle,
                            scope: "由项目主 Agent 根据用户指令、附件和项目上下文识别影响范围。",
                            documents: sourceDocuments,
                            acceptance: acceptanceCriteria,
                            constraints: "主 Agent 对任务全程负责；验收门禁未通过时不得向用户报告完成。",
                            plan_mode: planModePreflight,
                        }),
                        target_project: coordinator.project,
                        group_id,
                        assign_type: "group",
                        priority: payload.priority || "normal",
                        auto_execute: autoExecute,
                        workflow_type: "daily_dev",
                        requires_code_changes: flagEnabled(payload.requires_code_changes ?? payload.requiresCodeChanges, true),
                        requires_verification: flagEnabled(payload.requires_verification ?? payload.requiresVerification, true),
                        requires_agent_qa: requiresAgentQa,
                        business_goal: userMessage || taskTitle,
                        acceptance_criteria: acceptanceCriteria,
                        source_documents: sourceDocuments,
                        source_attachments: attachmentRecords,
                        intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
                        intake_draft: planModePreflight,
                        workflow_meta: {
                            plan_mode: planModePreflight,
                            intake: {
                                source: "group-chat-project-task",
                                message_mode: messageMode,
                                client_message_id: client_message_id || null,
                                accepted_at: now,
                                attachment_count: attachmentRecords.length,
                                task_intent: taskIntent,
                                plan_mode: planModePreflight,
                                requires_confirmation: planModePreflight.requires_confirmation === true,
                                auto_continue: planModePreflight.auto_continue === true,
                                requested_auto_execute: requestedAutoExecute,
                            },
                            project_mission: {
                                owner_agent: coordinator.project,
                                control_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "queued",
                                user_directive: userMessage || "请读取并完成附件中的开发需求",
                            },
                        },
                        trace_id: messageTraceId,
                        idempotency_key: groupOperationKey ? `group-task-message:${groupOperationKey}` : null,
                    });
                    task = updateTask(task.id, {
                        auto_execute: autoExecute,
                        intake_state: planModePreflight.requires_confirmation ? "awaiting_confirmation" : "confirmed",
                        intake_draft: planModePreflight,
                        status_detail: planModePreflight.requires_confirmation
                            ? "执行前计划已准备好，等待你确认后才会派发子 Agent"
                            : "执行前计划已完成，低风险任务自动进入执行队列",
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
                        },
                    }) || task;
                    appendTaskTimelineEvent(task.id, {
                        type: planModePreflight.requires_confirmation ? "plan_mode_waiting_confirmation" : "plan_mode_auto_continue",
                        title: planModePreflight.requires_confirmation ? "主 Agent 已生成执行前计划" : "主 Agent 已完成执行前计划",
                        detail: planModePreflight.risk?.summary || taskTitle,
                        status: "active",
                        phase: "intake",
                        agent: coordinator.project,
                        data: { attachment_count: attachmentRecords.length, source: "group-chat", plan_mode: planModePreflight },
                    });
                    const receiptMessageId = "m" + Date.now().toString(36) + "mission";
                    const understoodGoal = compactMemoryText(userMessage || task.title, 180).replace(/[。.!！]+$/g, "");
                    const receiptContent = planModePreflight.requires_confirmation
                        ? `我先按只读方式看了一轮：${understoodGoal}。这个需求${planModePreflight.risk?.summary ? `因为「${planModePreflight.risk.summary}」` : "需要先确认范围"}，我已经整理好执行前计划。你确认后，我再派发子 Agent 开始修改。`
                        : `我明白了：${understoodGoal}。我已完成执行前只读检查，风险较低，会进入队列开始修改和检查，进度会持续更新在下方任务卡中。`;
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
                            id: task.id,
                            title: task.title,
                            status: task.status,
                            workflow_type: task.workflow_type,
                            attachment_count: attachmentRecords.length,
                            intake_state: task.intake_state,
                        },
                        workflow: buildWorkflowMeta("understanding", "主 Agent 已接管"),
                        taskRuntime: buildInlineTaskRuntime(task),
                        task_runtime: buildInlineTaskRuntime(task),
                    };
                    (0, storage_1.appendGroupMessage)(group_id, receiptMessage);
                    updateGroupMemory(group_id, {
                        goal: userMessageForHistory,
                        currentPhase: "understanding",
                        decision: `项目主 Agent 已创建持久任务 ${task.id}`,
                        reason: task.title,
                        nextAction: planModePreflight.requires_confirmation ? "等待用户确认执行前计划" : "主 Agent读取需求和项目上下文，生成执行计划并分派子 Agent",
                    });
                    const queueResult = task.auto_execute && task.intake_state !== "awaiting_confirmation"
                        ? enqueueTask(task.id, ctx)
                        : { queued: false, message: planModePreflight.requires_confirmation ? "任务已创建，等待用户确认执行前计划" : "任务已创建，等待手动启动" };
                    const queueText = queueResult?.queued
                        ? `任务已进入执行队列（位置 ${queueResult.position || 1}）`
                        : `任务已保存；${queueResult?.message || "等待执行通道恢复"}`;
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
                            : { action: "delegate", reason: taskIntent.reason, nextStep: queueResult?.queued ? "等待子 Agent 执行和回执" : "等待执行通道恢复或手动启动" },
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
                        const storedMessages = (0, storage_1.getGroupMessages)(group_id);
                        const storedIndex = storedMessages.findIndex((item) => item.id === receiptMessageId);
                        if (storedIndex >= 0) {
                            storedMessages[storedIndex] = { ...storedMessages[storedIndex], mainAgentDecision, main_agent_decision: mainAgentDecision };
                            (0, storage_1.saveGroupMessages)(group_id, storedMessages);
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
                            id: task.id,
                            title: task.title,
                            status: task.status,
                            workflow_type: task.workflow_type,
                            attachment_count: attachmentRecords.length,
                        },
                        traceId: messageTraceId,
                        queue: queueResult,
                        workflow: receiptMessage.workflow,
                        mainAgentDecision,
                    });
                    writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });
                    writeSse(res, { type: "status", text: queueText, agent: coordinator.project });
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
                            ? `🔎 主 Agent ${coordinator.project} 正在只读分析项目...`
                            : conversationalOnly
                                ? `💬 主 Agent ${coordinator.project} 正在回复...`
                                : `🧠 主 Agent ${coordinator.project} 正在协调群聊...`,
                        agent: coordinator.project
                    });
                    ctx.setAgentActivity(coordinator.project, "working", projectAnalysisRequest ? "主 Agent 正在只读分析项目" : conversationalOnly ? "主 Agent 正在回复" : "主 Agent 正在协调群聊", { tab: "groups", groupId: group_id });
                    ctx.broadcastPetSpeech(coordinator.project, { role: "status", text: projectAnalysisRequest ? "正在查看项目上下文..." : conversationalOnly ? "正在回复..." : "主 Agent 正在协调群聊...", source: "group" });
                    updateGroupMemory(group_id, {
                        ...(conversationalOnly ? {} : { goal: userMessageForHistory }),
                        currentPhase: projectAnalysisRequest ? "project_analysis" : conversationalOnly ? "conversation" : "understanding",
                        decision: projectAnalysisRequest ? `只读项目分析：${taskIntent.reason}` : conversationalOnly ? `普通对话：${taskIntent.reason}` : "用户把消息交给主 Agent 协调",
                        reason: routing.targetLabel,
                        nextAction: projectAnalysisRequest ? "主 Agent 基于项目上下文直接回答，不创建任务卡" : conversationalOnly ? "主 Agent 直接回复用户，不创建任务卡" : "主 Agent 先判断是否需要派发子 Agent",
                    });
                    const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6 });
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
                        const workflowMeta = getInitialWorkflowMeta(planAssignments, dispatchPolicy, "主 Agent 初始计划");
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
                                shared_files_context: !!sharedFilesContext,
                                project_analysis_context: !!projectAnalysisContext,
                                runtime: coordinatorResult.runtime || "",
                                execution_order: conversationalOnly ? "none" : (coordinatorResult.executionOrder || "parallel"),
                            },
                            reply: { kind: "assistant_message", messageId: responseMessageId, text: outputText },
                        });
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
                        });
                        writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });
                        (0, storage_1.appendGroupMessage)(group_id, {
                            id: responseMessageId,
                            role: "assistant",
                            agent: coordinator.project,
                            content: outputText,
                            timestamp: new Date().toISOString(),
                            assignments: planAssignments,
                            executionOrder: conversationalOnly ? "none" : (coordinatorResult.executionOrder || "parallel"),
                            runtime: coordinatorResult.runtime || "",
                            dispatchPolicy,
                            coordinationPlan: conversationalOnly ? null : (coordinatorResult.coordinationPlan || null),
                            workflow: workflowMeta,
                            mainAgentDecision,
                        });
                        updateGroupMemory(group_id, {
                            currentPhase: workflowMeta.phase,
                            decision: `${dispatchPolicy?.action || "unknown"}：${dispatchPolicy?.reason || "主 Agent 已完成派发判断"}`,
                            reason: dispatchPolicy?.risk || "",
                            nextAction: dispatchPolicy?.nextStep || (planAssignments.length ? "等待子 Agent 回执" : "等待用户继续补充"),
                        });
                        (0, logs_1.addGroupLog)(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
                            response_length: outputText.length,
                            response_preview: outputText.substring(0, 300),
                            runtime: "coded-orchestrator",
                        });
                        let crossOutputs = [];
                        const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
                        if (validMentions.length > 0) {
                            writeSse(res, { type: "status", text: "🧩 主 Agent 正在分派子 Agent..." });
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
                    const getAgentPrompt = (member) => {
                        const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });
                        const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                        const collaborationInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                        const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                        const toolContext = buildAgentToolContext(ctx, group, member.project);
                        const memberConfig = configs.find(c => c.name === member.project);
                        const memberWorkDir = memberConfig ? (0, db_1.getConfigInfo)(memberConfig.path)[0]?.workDir : "";
                        const memoryPacket = buildAgentMemoryPacket(group_id, member.project, messageForAgent);
                        const developmentContract = buildChildAgentDevelopmentContract(member.project, messageForAgent, {
                            source: "群聊广播",
                            verification_hints: buildProjectVerificationHints(member.project, memberWorkDir),
                            work_dir: memberWorkDir,
                        });
                        return {
                            prompt: `${collaborationInstructions}${buildAgentQaProtocolInstructions(member.project, memberList)}${toolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n用户刚才把这条消息发给了群聊所有成员，请从 ${member.project} 的职责视角回复：${messageForAgent}`,
                            allowedTools: toolContext.allowedTools,
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
                            const agentPrompt = getAgentPrompt(member);
                            try {
                                const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, agentPrompt.allowedTools, res);
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
                                    initialWorkEvents: [runtimeToolContext.workEvent],
                                    onDone: (opts) => { memberFileChanges = opts.fileChanges; memberWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
                                });
                                (0, storage_1.appendGroupMessage)(group_id, {
                                    id: responseMessageId,
                                    role: "assistant", agent: member.project,
                                    content: text,
                                    timestamp: new Date().toISOString(),
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
                        goal: userMessageForHistory,
                        currentPhase: "understanding",
                        decision: "用户直接点名主 Agent",
                        reason: target_project_actual,
                        nextAction: "主 Agent 判断是否直接答复或派发子 Agent",
                    });
                    const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6 });
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
                    const workflowMeta2 = getInitialWorkflowMeta(planAssignments2, dispatchPolicy2, "主 Agent 初始计划");
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
                        assignments: planAssignments2,
                        executionOrder: coordinatorResult.executionOrder || "parallel",
                        runtime: coordinatorResult.runtime || "",
                        dispatchPolicy: dispatchPolicy2,
                        coordinationPlan: coordinatorResult.coordinationPlan || null,
                        workflow: workflowMeta2,
                    });
                    updateGroupMemory(group_id, {
                        currentPhase: workflowMeta2.phase,
                        decision: `${dispatchPolicy2?.action || "unknown"}：${dispatchPolicy2?.reason || "主 Agent 已完成派发判断"}`,
                        reason: dispatchPolicy2?.risk || "",
                        nextAction: dispatchPolicy2?.nextStep || (planAssignments2.length ? "等待子 Agent 回执" : "等待用户继续补充"),
                    });
                    const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
                    let crossOutputs = [];
                    let reviewResult = null;
                    if (validMentions.length > 0) {
                        if (useStream)
                            writeSse(res, { type: "status", text: "🧩 代码协调器正在分派子 Agent..." });
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
                const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });
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
                const runtimeToolContext = prepareAgentRuntimeTools(group_id, target_project_actual, workDir, agentType, toolContext.allowedTools, useStream ? res : null);
                const projectConfig = getProjectExtraConfig(target_project_actual);
                if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
                    sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
                }
                const memoryPacket = buildAgentMemoryPacket(group_id, target_project_actual, messageForAgent);
                const developmentContract = buildChildAgentDevelopmentContract(target_project_actual, messageForAgent, {
                    source: "群聊点名",
                    verification_hints: buildProjectVerificationHints(target_project_actual, workDir),
                    work_dir: workDir,
                });
                const fullPrompt = `${atInstructions}${buildAgentQaProtocolInstructions(target_project_actual, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}${sharedFilesContext}\n${developmentContract}\n\n${memoryPacket}\n\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${messageForAgent}`;
                if (useStream) {
                    const responseMessageId = "m" + Date.now().toString(36) + "a" + crypto.randomBytes(2).toString("hex");
                    const startedAt = Date.now();
                    const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
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
                            writeSse(res, { type: "status", text: "🧩 主 Agent 正在分配任务..." });
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
                        ctx.recordMetric(target_project_actual, {
                            success: false,
                            durationMs: Date.now() - startedAt,
                            fileChangeCount: 0
                        });
                        try {
                            res.end();
                        }
                        catch { }
                    }
                    return;
                }
                // 非流式
                const output = await ctx.callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id, allowedTools: toolContext.allowedTools, mcpConfigPath: runtimeToolContext.audit.mcpConfigPath });
                (0, storage_1.appendGroupMessage)(group_id, {
                    id: "m" + Date.now().toString(36) + "a",
                    role: "assistant", agent: target_project_actual,
                    content: output,
                    timestamp: new Date().toISOString(),
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
                const { group_id, message } = JSON.parse(body);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
                (0, storage_1.appendGroupMessage)(group_id, {
                    id: "m" + Date.now().toString(36),
                    role: "user", target: "all", content: message,
                    timestamp: new Date().toISOString(),
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
                    const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });
                    const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
                    const toolContext = buildAgentToolContext(ctx, group, member.project);
                    const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, toolContext.allowedTools);
                    const memberList = group.members.map((m) => m.project).filter((p) => p !== member.project && p !== "coordinator").join(", ");
                    const memberInstructions = (0, group_orchestrator_1.buildMemberCollaborationInstructions)(member.project, memberList);
                    const memoryPacket = buildAgentMemoryPacket(group_id, member.project, message);
                    const fullPrompt = `${memberInstructions}${buildAgentQaProtocolInstructions(member.project, memberList)}${toolContext.prompt}${runtimeToolContext.prompt}${sharedFilesContext}\n${memoryPacket}\n\n群聊记录：\n${context}\n\n请从 ${member.project} 的职责视角回复：${message}`;
                    const output = await ctx.callAgent(member.project, fullPrompt, workDir, agentType, 300000, {
                        tab: "groups",
                        groupId: group_id,
                        allowedTools: toolContext.allowedTools,
                        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    });
                    (0, storage_1.appendGroupMessage)(group_id, {
                        id: "m" + Date.now().toString(36) + member.project,
                        role: "assistant", agent: member.project, content: output,
                        timestamp: new Date().toISOString(),
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
                const { group_id, requirement } = JSON.parse(body);
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
                    priority: t.priority || "normal"
                }));
                (0, storage_1.appendGroupMessage)(group_id, {
                    id: "m" + Date.now().toString(36) + "decompose",
                    role: "assistant",
                    agent: coordinator.project,
                    content: `📋 需求分解完成，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i + 1}. [${t.target_project}] ${t.title}`).join("\n")}`,
                    timestamp: new Date().toISOString(),
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