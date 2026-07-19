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
exports.handleGroupLiveRoutesSendPreface = handleGroupLiveRoutesSendPreface;
// Behavior-freeze split from group-live-routes-part-02.ts (part 1/2).
// Behavior-freeze split from group-live-routes.ts (part 2/2).
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const group_routes_1 = require("./group-routes");
const logs_1 = require("./logs");
const storage_1 = require("./storage");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const source_ingestion_1 = require("../requirements/source-ingestion");
const group_memory_index_1 = require("./group-memory-index");
const group_live_routes_part_01_1 = require("./group-live-routes-part-01");
async function handleGroupLiveRoutesSendPreface(payload, uploadedFiles, ctx, deps, res) {
    const { writeSse, ensureTraceId, classifyGroupProjectTaskIntentWithAgent, shouldCreatePersistentGroupTask, shouldUseProjectAnalysisMode, continueTaskWithMessage, appendMainAgentDecisionTrace, applyMainAgentDecisionPetState, buildWorkflowMeta, buildInlineTaskRuntime, updateGroupMemory, getAgentQaItemsForGroup, } = deps;
    let reliabilityOperationKey = "";
    const { group_id, target_project, message, client_message_id } = payload;
    let groupSessionId = String(payload.group_session_id || payload.groupSessionId || "").trim();
    const userMessage = String(message || "").trim();
    const groups = (0, storage_1.loadGroups)();
    const group = groups.find(g => g.id === group_id);
    if (!group) {
        (0, utils_1.sendJson)(res, { error: "群聊不存在" }, 400);
        return { done: true };
    }
    const availableTargets = [
        {
            type: "group",
            id: group.id,
            name: group.name || group.id,
            capabilities: (group.members || []).flatMap((member) => member.skills || member.capabilities || []),
        },
        ...(group.members || []).map((member) => ({
            type: "project",
            id: member.project,
            name: member.name || member.project,
            capabilities: member.skills || member.capabilities || [],
        })),
    ];
    let sourceIngestion = await (0, source_ingestion_1.ingestRequirementSources)({
        files: uploadedFiles,
        userText: userMessage,
        extractRequirement: uploadedFiles.length > 0 || /https?:\/\//i.test(userMessage),
        decomposeRequirement: false,
        availableTargets,
    });
    const uploadedFilesContext = sourceIngestion.agent_context
        || ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
    const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
    const incomingMessageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
    const userMessageForHistory = attachmentSummary
        ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
        : userMessage;
    if (!incomingMessageForAgent) {
        (0, utils_1.sendJson)(res, { error: "消息或附件不能为空" }, 400);
        return { done: true };
    }
    try {
        groupSessionId = (0, storage_1.resolveWritableGroupChatSession)(group_id, groupSessionId, { title: "新会话" }).id;
    }
    catch (error) {
        const status = /不存在/.test(String(error?.message || "")) ? 404 : 409;
        (0, utils_1.sendJson)(res, { error: error.message }, status);
        return { done: true };
    }
    (0, group_orchestrator_1.normalizeGroupOrchestrator)(group);
    const directMemoryActionName = String(payload.memory_action || payload.memoryAction || "").trim().toLowerCase();
    if (directMemoryActionName) {
        if (!["remember", "forget"].includes(directMemoryActionName)) {
            (0, utils_1.sendJson)(res, { error: "不支持的记忆操作" }, 400);
            return { done: true };
        }
        if (!groupSessionId.startsWith("gcs_")) {
            (0, utils_1.sendJson)(res, { error: "旧群聊会话不再接收记忆写入，请新建会话" }, 409);
            return { done: true };
        }
        if (uploadedFiles.length) {
            (0, utils_1.sendJson)(res, { error: "记忆命令暂不接收附件，请输入明确文本" }, 400);
            return { done: true };
        }
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
            ? ` 可选记忆：${receipt.candidates.map((item) => `${item.memoryId}（${(0, group_live_routes_part_01_1.compactGroupLiveText)(item.text, 80)}）`).join("；")}`
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
        return { done: true };
    }
    const explicitContinuationTaskId = String(payload.continuation_task_id || payload.continuationTaskId || "").trim();
    const explicitContinuationResolution = (0, group_live_routes_part_01_1.resolveExplicitGroupContinuationTask)((0, db_1.loadTasks)(), group_id, explicitContinuationTaskId);
    const explicitContinuationTask = explicitContinuationResolution.task;
    if (explicitContinuationTaskId && !explicitContinuationTask) {
        (0, utils_1.sendJson)(res, { error: explicitContinuationResolution.error }, explicitContinuationResolution.status || 404);
        return { done: true };
    }
    if (explicitContinuationTask && String(explicitContinuationTask.group_session_id || explicitContinuationTask.groupSessionId || "default") !== groupSessionId) {
        (0, utils_1.sendJson)(res, { error: "这个任务属于另一个群聊会话，请切换到任务所属会话后继续" }, 409);
        return { done: true };
    }
    const explicitContinuationKind = String(payload.continuation_kind || payload.continuationKind || "supplement").trim().toLowerCase();
    if (explicitContinuationTaskId && !["supplement", "revise_goal"].includes(explicitContinuationKind)) {
        (0, utils_1.sendJson)(res, { error: "不支持的任务接续类型" }, 400);
        return { done: true };
    }
    const clarificationRequestId = String(payload.clarification_request_id || payload.clarificationRequestId || "").trim();
    const clarificationMessageId = String(payload.clarification_message_id || payload.clarificationMessageId || "").trim();
    if (explicitContinuationTaskId && (clarificationRequestId || clarificationMessageId)) {
        (0, utils_1.sendJson)(res, { error: "一次只能继续一个任务或回答一个待确认问题" }, 400);
        return { done: true };
    }
    const pendingClarification = (0, group_live_routes_part_01_1.resolvePendingGroupClarification)((0, storage_1.getGroupMessages)(group_id, groupSessionId), clarificationRequestId, clarificationMessageId);
    if ((clarificationRequestId || clarificationMessageId) && !pendingClarification.context) {
        (0, utils_1.sendJson)(res, { error: pendingClarification.error }, pendingClarification.status || 404);
        return { done: true };
    }
    const clarificationContext = pendingClarification.context;
    const clarificationOriginalMessage = String(clarificationContext?.original_user_message || clarificationContext?.originalUserMessage || clarificationContext?.original_message || clarificationContext?.originalMessage || "").trim();
    const effectiveUserMessage = clarificationContext
        ? `${clarificationOriginalMessage || "原始请求"}\n补充说明：${userMessage || "请结合本次附件"}`.trim()
        : userMessage;
    const messageForAgent = clarificationContext
        ? (0, group_live_routes_part_01_1.buildGroupClarificationContinuationMessage)(clarificationContext, incomingMessageForAgent)
        : incomingMessageForAgent;
    const routing = (0, group_orchestrator_1.selectGroupTargets)(group, clarificationContext?.target_project || clarificationContext?.targetProject || target_project);
    const isBroadcast = routing.isBroadcast;
    const isOrchestrated = routing.orchestrated;
    const targetMembers = routing.members;
    if (targetMembers.length === 0) {
        (0, utils_1.sendJson)(res, { error: "没有找到目标项目" }, 400);
        return { done: true };
    }
    const messageMode = String(clarificationContext?.message_mode || clarificationContext?.messageMode || payload.message_mode || payload.messageMode || "conversation").trim().toLowerCase();
    const messageTraceId = ensureTraceId(payload.trace_id || payload.traceId || clarificationContext?.trace_id || clarificationContext?.traceId, "group");
    const forceProjectTask = (0, group_live_routes_part_01_1.groupLiveFlag)(payload.force_task ?? payload.forceTask, (0, group_live_routes_part_01_1.groupLiveFlag)(clarificationContext?.force_task ?? clarificationContext?.forceTask, false));
    const taskIntent = explicitContinuationTask
        ? { executable: true, kind: "project_task", confidence: 1, reason: "用户正在补充当前任务所需条件", source: "explicit_task_continuation", workflowDecision: { mode: "execute_direct", continuationKind: explicitContinuationKind, needsPlanning: false, needsEpicDecomposition: false, actionRequired: true, confidence: 1, reason: "用户显式继续现有任务", source: "explicit_user_choice" } }
        : forceProjectTask
            ? { executable: true, kind: "project_task", confidence: 1, reason: "用户已明确要求创建并执行项目任务", source: "explicit_force_task", workflowDecision: { mode: "execute_direct", continuationKind: "new_task", needsPlanning: false, needsEpicDecomposition: false, actionRequired: true, confidence: 1, reason: "用户显式要求创建任务", source: "explicit_user_choice" } }
            : await classifyGroupProjectTaskIntentWithAgent({
                group,
                message: effectiveUserMessage,
                uploadedFiles,
                isOrchestrated,
                messageMode,
                forceProjectTask,
                sharedFilesContext: uploadedFilesContext,
                groupSessionId,
            });
    const statusFollowupRequest = isOrchestrated
        && !clarificationContext
        && !forceProjectTask
        && taskIntent?.workflowDecision?.readAction === "inspect_status";
    if (taskIntent?.workflowDecision?.needsEpicDecomposition === true && !sourceIngestion.decomposition) {
        // 只有主 Agent 的模型选择 Epic 后才生成任务图；入口不再按关键词预拆解。
        sourceIngestion = await (0, source_ingestion_1.ingestRequirementSources)({
            files: uploadedFiles,
            userText: effectiveUserMessage,
            extractRequirement: true,
            decomposeRequirement: true,
            availableTargets,
        });
    }
    const persistentTaskRequest = !!explicitContinuationTask || (!statusFollowupRequest && shouldCreatePersistentGroupTask({ isOrchestrated, messageMode, taskIntent, forceProjectTask }));
    const projectAnalysisRequest = !statusFollowupRequest && shouldUseProjectAnalysisMode({ isOrchestrated, messageMode, taskIntent }) && !persistentTaskRequest;
    const continuationKind = explicitContinuationTask
        ? explicitContinuationKind
        : String(taskIntent?.workflowDecision?.continuationKind || "new_task");
    const continuationTask = explicitContinuationTask || (!clarificationContext && persistentTaskRequest && continuationKind !== "new_task"
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
        return { done: true };
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
        return { done: true };
    }
    if (continuationTask) {
        const continuation = continueTaskWithMessage(continuationTask.id, messageForAgent, ctx, {
            source: String(payload.source || "group_chat_followup"),
            continuationKind,
            auto_execute: (0, group_live_routes_part_01_1.groupLiveFlag)(payload.auto_execute ?? payload.autoExecute, true),
            interrupt_current_run: (0, group_live_routes_part_01_1.groupLiveFlag)(payload.interrupt_current_run ?? payload.interruptCurrentRun, continuationKind === "revise_goal"),
            resolve_waiting_user: (0, group_live_routes_part_01_1.groupLiveFlag)(payload.resolve_waiting_user ?? payload.resolveWaitingUser, false),
            append_group_message: false,
            idempotencyKey: client_message_id ? `group-followup:${client_message_id}` : "",
        });
        if (!continuation.success) {
            (0, utils_1.sendJson)(res, { error: continuation.error, new_task_suggested: continuation.new_task_suggested }, continuation.status || 400);
            return { done: true };
        }
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
        return { done: true };
    }
    return {
        done: false,
        payload, uploadedFiles, ctx, deps, res,
        reliabilityOperationKey, group_id, target_project, groupSessionId, userMessage, group, sourceIngestion,
        uploadedFilesContext, attachmentSummary, incomingMessageForAgent, userMessageForHistory, messageForAgent,
        effectiveUserMessage, routing, isBroadcast, isOrchestrated, targetMembers, messageMode, messageTraceId,
        forceProjectTask, taskIntent, statusFollowupRequest, persistentTaskRequest, projectAnalysisRequest,
        continuationKind, continuationTask, groupOperationKey, userMsg, clarificationContext, clarificationRequestId,
        pendingClarification, clarificationMessageId, explicitContinuationTask, explicitContinuationKind, client_message_id, configs,
    };
}
//# sourceMappingURL=group-live-routes-part-02-part-01.js.map