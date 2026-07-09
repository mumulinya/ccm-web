import * as crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson } from "../../core/utils";
import { getConfigInfo, getConfigs, loadTasks } from "../../core/db";
import {
  buildCoordinatorCollaborationInstructions,
  buildMemberCollaborationInstructions,
  decomposeRequirementWithCodedCoordinator,
  getCoordinatorMember,
  getRoutableMembers,
  normalizeGroupOrchestrator,
  resolveMemberRuntime,
  runGroupOrchestrator,
  selectGroupTargets,
} from "./group-orchestrator";
import {
  buildGroupMainAgentStatus,
  buildGroupStatusFollowupSummary,
  isGroupProgressStatusRequest,
} from "./group-routes";
import { buildDailyDevTaskDescription } from "./daily-dev-backlog";
import { addGroupLog, addTaskLog } from "./logs";
import { appendGroupMessage, getGroupMessages, loadGroups, saveGroupMessages } from "./storage";
import { acquireIdempotency, completeIdempotency, failIdempotency } from "../../system/reliability-ledger";
import { sanitizeMainAgentRoleLanguage } from "../../agents/user-facing-text";

type GroupLiveRoutesDeps = {
  writeSse: (res: ServerResponse, data: any) => void;
  ensureTraceId: (value: any, prefix: string) => string;
  classifyGroupProjectTaskIntentWithAgent: (input: any) => Promise<any>;
  shouldCreatePersistentGroupTask: (input: any) => boolean;
  shouldUseProjectAnalysisMode: (input: any) => boolean;
  classifyTaskContinuation: (message: string) => string;
  looksLikeTaskContinuation: (message: string) => boolean;
  continueTaskWithMessage: (taskId: string, message: string, ctx: any, options?: any) => any;
  appendMainAgentDecisionTrace: (input: any) => any;
  applyMainAgentDecisionPetState: (ctx: any, decision: any) => void;
  validateDailyDevGroupReady: (group: any) => any;
  compactMemoryText: (text: any, maxLength?: number) => string;
  buildGroupPlanModePreflight: (input: any) => any;
  createTask: (task: any) => any;
  updateTask: (taskId: string, updates: any) => any;
  appendTaskTimelineEvent: (taskId: string, event: any) => void;
  buildWorkflowMeta: (phase: string, label?: string) => any;
  buildInlineTaskRuntime: (task: any) => any;
  updateGroupMemory: (groupId: string, patch: any) => any;
  enqueueTask: (taskId: string, ctx: any) => any;
  buildCoordinatorSharedFilesContext: (ctx: any, group: any) => string;
  buildGroupProjectAnalysisContext: (group: any, message: string, ctx: any, configs?: any[]) => string;
  normalizePlanAssignments: (items: any[]) => any[];
  getInitialWorkflowMeta: (assignments: any[], dispatchPolicy: any, label?: string) => any;
  getCoordinatorActionMentions: (coordinatorResult: any, group: any, coordinatorProject: string) => any[];
  processCrossAgents: (...args: any[]) => Promise<any>;
  runCoordinatorReviewLoop: (input: any) => Promise<any>;
  buildGroupContextPacket: (groupId: string, options?: any) => string;
  buildAgentToolContext: (ctx: any, group: any, project: string) => any;
  prepareAgentRuntimeTools: (groupId: string, project: string, workDir: string, agentType: string, allowedTools: any, streamRes?: ServerResponse | null, options?: any) => any;
  getProjectExtraConfig: (project: string) => any;
  buildAgentMemoryContextBundle: (groupId: string, project: string, message: string, options?: any) => any;
  buildAgentMemoryPacket: (groupId: string, project: string, message: string) => string;
  buildChildAgentDevelopmentContract: (project: string, message: string, options?: any) => string;
  buildProjectVerificationHints: (project: string, workDir: string) => any;
  buildAgentQaProtocolInstructions: (project: string, memberList: string) => string;
  getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
  handleAgentQaRequests: (input: any) => Promise<any>;
  runtimeToolSnapshotFromAudit: (audit: any, allowedTools: any) => any;
  extractActionableMentions: (text: string, group: any, sourceProject: string) => any[];
  extractAgentReceipt: (text: string, project: string) => any;
};

function compactGroupLiveText(value: any, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

const GROUP_CLARIFICATION_INTERNAL_PATTERN = /CCM_AGENT_RECEIPT|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|native_session|task_agent_session|WorkerContextPacket|raw\s+payload|raw_report|execution_id|Coordinator|Pipeline/i;

function sanitizeGroupClarificationText(value: any, fallback = "", max = 220) {
  let text = compactGroupLiveText(value, max).replace(/\*\*/g, "").trim();
  const fallbackText = sanitizeMainAgentRoleLanguage(fallback);
  if (!text) return fallbackText;
  if (GROUP_CLARIFICATION_INTERNAL_PATTERN.test(text)) return fallbackText;
  return sanitizeMainAgentRoleLanguage(text);
}

function extractClarificationQuestion(responseText: any, fallback = "") {
  const text = String(responseText || "");
  const boldQuestion = text.match(/\*\*([^*?？]{2,240}[?？]?[^*]*)\*\*/);
  if (boldQuestion?.[1]) return boldQuestion[1];
  const lineQuestion = text.split(/\r?\n/).map(line => line.trim()).find(line => /[?？]$/.test(line));
  return lineQuestion || fallback;
}

export function buildGroupClarificationSummary(input: {
  group: any;
  userMessage?: string;
  responseText?: string;
  dispatchPolicy?: any;
  analysis?: any;
  coordinator?: string;
}) {
  const members = Array.isArray(input.group?.members)
    ? input.group.members.map((member: any) => String(member?.project || "").trim()).filter((name: string) => name && !/^coordinator$/i.test(name)).slice(0, 8)
    : [];
  const missing = Array.isArray(input.analysis?.missingInfo) ? input.analysis.missingInfo : [];
  const fallbackQuestion = missing[0] || input.dispatchPolicy?.reason || "请补充目标、范围或验收标准。";
  const question = sanitizeGroupClarificationText(
    extractClarificationQuestion(input.responseText, fallbackQuestion),
    "请补充目标、范围或验收标准。",
    260,
  );
  const reason = sanitizeGroupClarificationText(
    input.dispatchPolicy?.reason || missing[0] || "信息还不够明确，我需要先确认关键边界。",
    "信息还不够明确，我需要先确认关键边界。",
    220,
  );
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
    coordinator: sanitizeMainAgentRoleLanguage(input.coordinator || "我"),
    display_policy: {
      user_visible: true,
      show_todo: false,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
    },
  };
}

export function runGroupClarificationSummarySelfTest() {
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
    suggestionsVisible: summary.answer_suggestions.some((item: string) => item.includes("web-app")),
    todoHidden: summary.display_policy.show_todo === false,
    hidesProtocol: !GROUP_CLARIFICATION_INTERNAL_PATTERN.test(visibleText),
  };
  return { pass: Object.values(checks).every(Boolean), checks, summary };
}

function buildGroupTaskIntakeSummary(input: {
  task: any;
  goal: string;
  planModePreflight: any;
  queueResult: any;
  coordinator: string;
}) {
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
      { label: "负责人", value: `${sanitizeMainAgentRoleLanguage(input.coordinator || "我")} 已接管需求` },
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

export function handleGroupLiveRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: UrlWithParsedQuery,
  ctx: any,
  deps: GroupLiveRoutesDeps,
): boolean {
  const pathname = parsed.pathname;
  const {
    writeSse,
    ensureTraceId,
    classifyGroupProjectTaskIntentWithAgent,
    shouldCreatePersistentGroupTask,
    shouldUseProjectAnalysisMode,
    classifyTaskContinuation,
    looksLikeTaskContinuation,
    continueTaskWithMessage,
    appendMainAgentDecisionTrace,
    applyMainAgentDecisionPetState,
    validateDailyDevGroupReady,
    compactMemoryText,
    buildGroupPlanModePreflight,
    createTask,
    updateTask,
    appendTaskTimelineEvent,
    buildWorkflowMeta,
    buildInlineTaskRuntime,
    updateGroupMemory,
    enqueueTask,
    buildCoordinatorSharedFilesContext,
    buildGroupProjectAnalysisContext,
    normalizePlanAssignments,
    getInitialWorkflowMeta,
    getCoordinatorActionMentions,
    processCrossAgents,
    runCoordinatorReviewLoop,
    buildGroupContextPacket,
    buildAgentToolContext,
    prepareAgentRuntimeTools,
    getProjectExtraConfig,
    buildAgentMemoryContextBundle,
    buildAgentMemoryPacket,
    buildChildAgentDevelopmentContract,
    buildProjectVerificationHints,
    buildAgentQaProtocolInstructions,
    getAgentQaItemsForGroup,
    handleAgentQaRequests,
    runtimeToolSnapshotFromAudit,
    extractActionableMentions,
    extractAgentReceipt,
  } = deps;
  if (pathname === "/api/groups/send" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleGroupSend = async (payload: any, uploadedFiles = []) => {
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
        if (!messageForAgent) return sendJson(res, { error: "消息或附件不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);
        normalizeGroupOrchestrator(group);

        const routing = selectGroupTargets(group, target_project);
        const isBroadcast = routing.isBroadcast;
        const isOrchestrated = routing.orchestrated;
        const targetMembers = routing.members;

        if (targetMembers.length === 0) {
          return sendJson(res, { error: "没有找到目标项目" }, 400);
        }

        const messageMode = String(payload.message_mode || payload.messageMode || "conversation").trim().toLowerCase();
        const messageTraceId = ensureTraceId(payload.trace_id || payload.traceId, "group");
        const forceProjectTask = payload.force_task === true || payload.forceTask === true;
        const statusFollowupRequest = isOrchestrated
          && !forceProjectTask
          && uploadedFiles.length === 0
          && isGroupProgressStatusRequest(userMessage);
        const taskIntent = await classifyGroupProjectTaskIntentWithAgent({
          group,
          message: userMessage,
          uploadedFiles,
          isOrchestrated,
          messageMode,
          forceProjectTask,
          sharedFilesContext: uploadedFilesContext,
        });
        const persistentTaskRequest = !statusFollowupRequest && shouldCreatePersistentGroupTask({ isOrchestrated, messageMode, taskIntent, forceProjectTask });
        const projectAnalysisRequest = !statusFollowupRequest && shouldUseProjectAnalysisMode({ isOrchestrated, messageMode, taskIntent }) && !persistentTaskRequest;
        const continuationKind = classifyTaskContinuation(userMessage);
        const continuationTask = persistentTaskRequest && continuationKind !== "new_task" && looksLikeTaskContinuation(userMessage)
          ? loadTasks()
            .filter((item: any) => item.group_id === group_id && !item.archived && !item.deleted_at && !["cancelled", "archived"].includes(String(item.status || "")))
            .filter((item: any) => item.status !== "done" || Date.now() - Date.parse(item.completed_at || item.updated_at || "") < 30 * 60 * 1000)
            .sort((a: any, b: any) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))[0]
          : null;
        const groupOperationKey = persistentTaskRequest && client_message_id ? `${group_id}:${String(client_message_id)}` : "";
        reliabilityOperationKey = groupOperationKey;
        const groupOperation = groupOperationKey
          ? acquireIdempotency({ scope: "group-task-message", key: groupOperationKey, traceId: messageTraceId, leaseMs: 10 * 60 * 1000, metadata: { group_id, client_message_id: String(client_message_id) } })
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
        appendGroupMessage(group_id, userMsg);
        for (const member of targetMembers) {
          ctx.broadcastPetSpeech(member.project, { role: "user", text: userMessageForHistory, final: true, source: "group" });
        }

        addGroupLog(group_id, "info", "message", `用户发送消息给 ${isOrchestrated ? '主 Agent' : isBroadcast ? '所有人' : target_project}`, {
          message: userMessageForHistory.substring(0, 200),
          target: routing.targetLabel,
          is_broadcast: isBroadcast,
          orchestrated: isOrchestrated,
          task_intent: taskIntent,
          task_card_allowed: persistentTaskRequest,
          status_followup: statusFollowupRequest,
        });

        const configs = getConfigs();
        if (statusFollowupRequest) {
          const coordinator = getCoordinatorMember(group);
          const allTasks = loadTasks();
          const agentQa = getAgentQaItemsForGroup(group_id, 50);
          const mainAgentStatus = buildGroupMainAgentStatus({
            groupId: String(group_id || ""),
            tasks: allTasks,
            agentQa,
            getRuntime: buildInlineTaskRuntime,
          });
          const statusSummary = buildGroupStatusFollowupSummary({ status: mainAgentStatus });
          const responseMessageId = "m" + Date.now().toString(36) + "gstatus" + crypto.randomBytes(2).toString("hex");
          const workflow = buildWorkflowMeta("monitoring", "我已汇报当前进展");
          appendGroupMessage(group_id, {
            id: responseMessageId,
            role: "assistant",
            agent: coordinator.project,
            type: "group_status_followup",
            content: statusSummary.text,
            timestamp: new Date().toISOString(),
            workflow,
            mainAgentStatus,
            main_agent_status: mainAgentStatus,
            statusFollowupSummary: statusSummary,
            status_followup_summary: statusSummary,
          });
          updateGroupMemory(group_id, {
            currentPhase: "monitoring",
            decision: "用户询问当前任务进展",
            reason: mainAgentStatus.latest_task_title || "群聊任务状态追问",
            nextAction: statusSummary.next_action,
          });
          addGroupLog(group_id, "success", "status_followup", "主 Agent 已回复当前群聊任务进展", {
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
            source: "group_chat_followup",
            continuationKind,
            auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
            idempotencyKey: client_message_id ? `group-followup:${client_message_id}` : "",
          });
          if (!continuation.success) return sendJson(res, { error: continuation.error, new_task_suggested: continuation.new_task_suggested }, continuation.status || 400);
          if (groupOperationKey) completeIdempotency("group-task-message", groupOperationKey, { task: continuation.task, queue: continuation.queue_result, continuation: true });
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
            coordinator: getCoordinatorMember(group).project,
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
            agent: getCoordinatorMember(group).project,
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
          const groupReadiness = validateDailyDevGroupReady(group);
          const coordinator = groupReadiness.coordinator || getCoordinatorMember(group);
          const attachmentRecords = (uploadedFiles || []).map((file: any) => ({
            name: file.filename || file.name || "",
            path: file.savedPath || file.path || "",
            size: Number(file.size || 0),
          })).filter((file: any) => file.name || file.path);
          const firstDirectiveLine = userMessage.split(/\r?\n/).map((line: string) => line.trim()).find(Boolean) || "";
          const attachmentTitle = attachmentRecords.map((file: any) => file.name).filter(Boolean).join("、");
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
          const flagEnabled = (value: any, fallback = true) => {
            if (value === undefined || value === null || value === "") return fallback;
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
          const globalDirectDispatch = payload.global_direct_dispatch || payload.globalDirectDispatch || (payload.global_handoff || payload.globalHandoff ? {
            schema: "ccm-global-direct-dispatch-v1",
            source: payload.source || "global-agent-direct-dispatch",
            global_run_id: payload.global_run_id || payload.globalRunId || "",
            session_id: payload.global_session_id || payload.globalSessionId || "",
            trace_id: messageTraceId,
            handoff: payload.global_handoff || payload.globalHandoff || null,
            original_text: payload.original_text || payload.originalText || userMessage,
            user_goal: userMessage || taskTitle,
            accepted_at: now,
          } : null);
          let task = createTask({
            title: taskTitle,
            description: buildDailyDevTaskDescription({
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
              ...(globalDirectDispatch ? { global_direct_dispatch: { ...globalDirectDispatch, accepted_at: globalDirectDispatch.accepted_at || now } } : {}),
            },
            trace_id: messageTraceId,
            idempotency_key: groupOperationKey ? `group-task-message:${groupOperationKey}` : null,
          });
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
            data: { attachment_count: attachmentRecords.length, source: "group-chat", plan_mode: planModePreflight },
          }) as any;
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
          const understoodGoal = compactMemoryText(userMessage || task.title, 180).replace(/[。.!！]+$/g, "");
          const receiptContent = planModePreflight.requires_confirmation
            ? `我先按只读方式看了一轮：${understoodGoal}。这个需求${planModePreflight.risk?.summary ? `因为「${planModePreflight.risk.summary}」` : "需要先确认范围"}，我已经整理好执行前计划。你确认后，我再安排执行成员开始修改。`
            : `我明白了：${understoodGoal}。执行前只读检查已通过，风险较低，会进入队列开始修改和检查，进度会持续更新在下方任务卡中。`;
          const queueResult = task.auto_execute && task.intake_state !== "awaiting_confirmation"
            ? enqueueTask(task.id, ctx)
            : { queued: false, message: planModePreflight.requires_confirmation ? "任务已创建，等待用户确认执行前计划" : "任务已创建，等待手动启动" };
          const queueText = queueResult?.queued
            ? `任务已进入执行队列（位置 ${queueResult.position || 1}）`
            : `任务已保存；${queueResult?.message || "等待执行通道恢复"}`;
          const taskAfterQueue = loadTasks().find((item: any) => item.id === task.id) || task;
          const intakeSummary = buildGroupTaskIntakeSummary({
            task: taskAfterQueue,
            goal: userMessage || taskAfterQueue.title,
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
          appendGroupMessage(group_id, receiptMessage);
          updateGroupMemory(group_id, {
            goal: userMessageForHistory,
            currentPhase: "understanding",
            decision: `已创建持久任务 ${task.id}`,
            reason: task.title,
            nextAction: planModePreflight.requires_confirmation ? "等待用户确认执行前计划" : "我会读取需求和项目上下文，生成执行计划并安排执行成员",
          });

          addTaskLog(task.id, queueResult?.queued ? "success" : "warning", queueText);
          if (groupOperationKey) completeIdempotency("group-task-message", groupOperationKey, { task: { id: task.id, title: task.title, status: task.status, workflow_type: task.workflow_type }, queue: queueResult });
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
            const storedMessages = getGroupMessages(group_id);
            const storedIndex = storedMessages.findIndex((item: any) => item.id === receiptMessageId);
            if (storedIndex >= 0) {
              storedMessages[storedIndex] = { ...storedMessages[storedIndex], mainAgentDecision, main_agent_decision: mainAgentDecision };
              saveGroupMessages(group_id, storedMessages);
            }
          } catch {}

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

          const coordinator = getCoordinatorMember(group);
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
            ...(conversationalOnly ? {} : { goal: userMessageForHistory }),
            currentPhase: projectAnalysisRequest ? "project_analysis" : conversationalOnly ? "conversation" : "understanding",
            decision: projectAnalysisRequest ? `只读项目分析：${taskIntent.reason}` : conversationalOnly ? `普通对话：${taskIntent.reason}` : "用户把消息交给我协调",
            reason: routing.targetLabel,
            nextAction: projectAnalysisRequest ? "我会基于项目上下文直接回答，不创建任务卡" : conversationalOnly ? "我会直接回复用户，不创建任务卡" : "我会先判断是否需要安排执行成员",
          });
          const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6 });
          const sharedFilesContext = buildCoordinatorSharedFilesContext(ctx, group);
          const projectAnalysisContext = projectAnalysisRequest ? buildGroupProjectAnalysisContext(group, messageForAgent, ctx, configs) : "";
          const coordinatorResult = await runGroupOrchestrator({
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
            const rawPlanAssignments = normalizePlanAssignments((coordinatorResult as any).assignments || []);
            const planAssignments = conversationalOnly || projectAnalysisRequest ? [] : rawPlanAssignments;
            const dispatchPolicy = projectAnalysisRequest
              ? { action: "project_analysis", reason: taskIntent.reason, nextStep: "已基于只读项目上下文回答用户" }
              : conversationalOnly
              ? { action: "answer", reason: taskIntent.reason, nextStep: "已按普通对话回复用户" }
              : ((coordinatorResult as any).dispatchPolicy || null);
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
                shared_files_context: !!sharedFilesContext,
                project_analysis_context: !!projectAnalysisContext,
                runtime: (coordinatorResult as any).runtime || "",
                execution_order: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              },
              reply: { kind: "assistant_message", messageId: responseMessageId, text: outputText },
            });
            const clarificationSummary = dispatchPolicy?.action === "ask_user"
              ? buildGroupClarificationSummary({
                group,
                userMessage,
                responseText: outputText,
                dispatchPolicy,
                analysis: (coordinatorResult as any).analysis || null,
                coordinator: coordinator.project,
              })
              : null;
            applyMainAgentDecisionPetState(ctx, mainAgentDecision);
            writeSse(res, {
              type: "agent_done",
              agent: coordinator.project,
              text: outputText,
              messageId: responseMessageId,
              assignments: planAssignments,
              executionOrder: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy,
              coordinationPlan: conversationalOnly ? null : ((coordinatorResult as any).coordinationPlan || null),
              workflow: workflowMeta,
              mainAgentDecision,
              clarificationSummary,
              clarification_summary: clarificationSummary,
            });
            writeSse(res, { type: "main_agent_decision", decision: mainAgentDecision, traceId: messageTraceId });

            appendGroupMessage(group_id, {
              id: responseMessageId,
              role: "assistant",
              agent: coordinator.project,
              content: outputText,
              timestamp: new Date().toISOString(),
              assignments: planAssignments,
              executionOrder: conversationalOnly ? "none" : ((coordinatorResult as any).executionOrder || "parallel"),
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy,
              coordinationPlan: conversationalOnly ? null : ((coordinatorResult as any).coordinationPlan || null),
              workflow: workflowMeta,
              mainAgentDecision,
              clarificationSummary,
              clarification_summary: clarificationSummary,
            });
            updateGroupMemory(group_id, {
            currentPhase: workflowMeta.phase,
            decision: `${dispatchPolicy?.action || "unknown"}：${dispatchPolicy?.reason || "派发判断已整理"}`,
            reason: dispatchPolicy?.risk || "",
            nextAction: clarificationSummary?.next_action || dispatchPolicy?.nextStep || (planAssignments.length ? "等待执行成员提交结果说明" : "等待用户继续补充"),
            });

            addGroupLog(group_id, "success", "orchestrator", `主 Agent ${coordinator.project} 回复完成`, {
              response_length: outputText.length,
              response_preview: outputText.substring(0, 300),
              runtime: "coded-orchestrator",
            });

            let crossOutputs: string[] = [];
            const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinator.project);
            if (validMentions.length > 0) {
              writeSse(res, { type: "status", text: "🧩 正在安排执行成员..." });
              const execOrder = (coordinatorResult as any).executionOrder || "parallel";
              crossOutputs = await processCrossAgents(group_id, group, coordinator.project, outputText, validMentions, configs, ctx, res, 0, new Set<string>(), execOrder, responseMessageId);
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
          } catch (err: any) {
            writeSse(res, { type: "error", text: err.message });
            try { res.end(); } catch {}
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

          const getAgentPrompt = (member: any) => {
            const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });

            const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== member.project && p !== "coordinator").join(", ");
            const collaborationInstructions = buildMemberCollaborationInstructions(member.project, memberList);
            const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

            const toolContext = buildAgentToolContext(ctx, group, member.project);
            const memberConfig = configs.find(c => c.name === member.project);
            const memberWorkDir = memberConfig ? getConfigInfo(memberConfig.path)[0]?.workDir : "";
            const memberAgentType = memberConfig ? (getConfigInfo(memberConfig.path)[0]?.agent || member.agent || "claudecode") : (member.agent || "claudecode");
            const memoryBundle = buildAgentMemoryContextBundle(group_id, member.project, messageForAgent, {
              workDir: memberWorkDir,
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
            return new Promise<void>(async (resolve) => {
              const config = configs.find(c => c.name === member.project);
              if (!config) {
                resolve();
                return;
              }

              const info = getConfigInfo(config.path);
              const workDir = info[0]?.workDir;
              const agentType = info[0]?.agent || "claudecode";
              const agentPrompt = getAgentPrompt(member);

              try {
                const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, agentPrompt.allowedTools, res, {
                  toolAudit: agentPrompt.toolAudit,
                  authorizationReadiness: agentPrompt.authorizationReadiness,
                });
                if (runtimeToolContext.dispatchBlocked) {
                  const reason = runtimeToolContext.dispatchGate?.reason || `${member.project} MCP/Skill 授权未就绪，已阻止安排执行成员`;
                  addGroupLog(group_id, "warning", "runtime-tool-dispatch-blocked", reason, { agent: member.project, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                  writeSse(res, { type: "agent_done", agent: member.project, text: `⚠️ ${reason}`, blocked: true, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
                  resolve();
                  return;
                }
                const responseMessageId = "m" + Date.now().toString(36) + member.project + crypto.randomBytes(2).toString("hex");
                let memberFileChanges = null;
                let memberWorkEvents: any[] = [];
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
                  onDone: (opts: any) => { memberFileChanges = opts.fileChanges; memberWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
                });
                appendGroupMessage(group_id, {
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
              } catch (e: any) {
                writeSse(res, { type: "agent_done", agent: member.project, text: `❌ 错误: ${e.message}` });
              } finally {
                resolve();
              }
            });
          });

          Promise.all(agentPromises).then(() => {
            writeSse(res, { type: "done" });
            try {
              res.end();
            } catch {}
          });
          return;
        }

        // 单个 Agent 模式
        const target_project_actual = targetMembers[0].project;
        const coordinatorProject = getCoordinatorMember(group).project;
        const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";
        if (target_project_actual === coordinatorProject) {
          const sharedFilesCtx2 = buildCoordinatorSharedFilesContext(ctx, group);
          updateGroupMemory(group_id, {
            goal: userMessageForHistory,
            currentPhase: "understanding",
            decision: "用户直接点名协调处理",
            reason: target_project_actual,
            nextAction: "我会判断是否直接答复或安排执行成员",
          });
          const context = buildGroupContextPacket(group_id, { recentLimit: 20, olderLimit: 36, fullCount: 6 });
          const coordinatorResult = await runGroupOrchestrator({
            group,
            message: messageForAgent,
            context,
            source: "direct",
            sharedFilesContext: sharedFilesCtx2,
          });
          const responseMessageId = "m" + Date.now().toString(36) + "coord" + crypto.randomBytes(2).toString("hex");
          const planAssignments2 = normalizePlanAssignments((coordinatorResult as any).assignments || []);
          const dispatchPolicy2 = (coordinatorResult as any).dispatchPolicy || null;
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
              executionOrder: (coordinatorResult as any).executionOrder || "parallel",
              runtime: (coordinatorResult as any).runtime || "",
              dispatchPolicy: dispatchPolicy2,
              coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
              workflow: workflowMeta2,
            });
          }

          appendGroupMessage(group_id, {
            id: responseMessageId,
            role: "assistant",
            agent: coordinatorProject,
            content: coordinatorResult.content,
            timestamp: new Date().toISOString(),
            assignments: planAssignments2,
            executionOrder: (coordinatorResult as any).executionOrder || "parallel",
            runtime: (coordinatorResult as any).runtime || "",
            dispatchPolicy: dispatchPolicy2,
            coordinationPlan: (coordinatorResult as any).coordinationPlan || null,
            workflow: workflowMeta2,
          });
          updateGroupMemory(group_id, {
            currentPhase: workflowMeta2.phase,
            decision: `${dispatchPolicy2?.action || "unknown"}：${dispatchPolicy2?.reason || "派发判断已整理"}`,
            reason: dispatchPolicy2?.risk || "",
            nextAction: dispatchPolicy2?.nextStep || (planAssignments2.length ? "等待执行成员提交结果说明" : "等待用户继续补充"),
          });

          const validMentions = getCoordinatorActionMentions(coordinatorResult, group, coordinatorProject);
          let crossOutputs: string[] = [];
          let reviewResult: any = null;
          if (validMentions.length > 0) {
            if (useStream) writeSse(res, { type: "status", text: "🧩 正在安排执行成员..." });
            const execOrder2 = (coordinatorResult as any).executionOrder || "parallel";
            crossOutputs = await processCrossAgents(group_id, group, coordinatorProject, coordinatorResult.content, validMentions, configs, ctx, useStream ? res : null, 0, new Set<string>(), execOrder2, responseMessageId);
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
          } else {
            sendJson(res, {
              success: true,
              reply: reviewResult?.content ? `${coordinatorResult.content}\n\n---\n\n${reviewResult.content}` : coordinatorResult.content,
              cross_pending: validMentions.length > 0
            });
          }
          return;
        }

        const runtime = resolveMemberRuntime(target_project_actual, group, configs);
        if (!runtime) return sendJson(res, { error: "项目配置不存在" }, 400);
        const workDir = runtime.workDir;
        const agentType = runtime.agentType;

        const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });
        const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== target_project_actual).join(", ");
        let atInstructions = "";
        if (target_project_actual === coordinatorProject) {
          atInstructions = buildCoordinatorCollaborationInstructions(memberList);
        } else {
          atInstructions = buildMemberCollaborationInstructions(target_project_actual, memberList);
        }

        let sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

        const toolContext = buildAgentToolContext(ctx, group, target_project_actual);
        const runtimeToolContext = prepareAgentRuntimeTools(group_id, target_project_actual, workDir, agentType, toolContext.allowedTools, useStream ? res : null, {
          toolAudit: toolContext.toolAudit,
          authorizationReadiness: toolContext.authorizationReadiness,
        });
        if (runtimeToolContext.dispatchBlocked) {
          const reason = runtimeToolContext.dispatchGate?.reason || `${target_project_actual} MCP/Skill 授权未就绪，已阻止安排执行成员`;
          addGroupLog(group_id, "warning", "runtime-tool-dispatch-blocked", reason, { agent: target_project_actual, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
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
          return sendJson(res, { success: false, error: reason, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate }, 409);
        }
        const projectConfig = getProjectExtraConfig(target_project_actual);

        if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
          sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
        }

        const memoryBundle = buildAgentMemoryContextBundle(group_id, target_project_actual, messageForAgent, {
          workDir,
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
            let targetWorkEvents: any[] = [];
            const outputText = await ctx.callAgentForGroupStream(target_project_actual, fullPrompt, workDir, agentType, {
              res,
              groupId: group_id,
              timeoutMs: 300000,
              messageId: responseMessageId,
              allowedTools: toolContext.allowedTools,
        mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,

        initialWorkEvents: [runtimeToolContext.workEvent],
              onDone: (opts: any) => { targetFileChanges = opts.fileChanges; targetWorkEvents = Array.isArray(opts.workEvents) ? opts.workEvents : []; }
            });

            appendGroupMessage(group_id, {
              id: responseMessageId,
              role: "assistant", agent: target_project_actual,
              content: outputText.trim(),
              timestamp: new Date().toISOString(),
              fileChanges: targetFileChanges,
                    workEvents: targetWorkEvents,
            });

            addGroupLog(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
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
              } catch (err: any) {
                writeSse(res, { type: "error", text: `跨 Agent 协作失败: ${err.message}` });
              }
            }
            writeSse(res, { type: "done", fileChanges: targetFileChanges, messageId: responseMessageId });
            res.end();
          } catch (err: any) {
            writeSse(res, { type: "error", text: err.message });
            ctx.recordMetric(target_project_actual, {
              success: false,
              durationMs: Date.now() - startedAt,
              fileChangeCount: 0
            });
            try { res.end(); } catch {}
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

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "a",
          role: "assistant", agent: target_project_actual,
          content: output,
          timestamp: new Date().toISOString(),
        });

        const validMentions = extractActionableMentions(output, group, target_project_actual);
        if (validMentions.length > 0) {
          sendJson(res, { success: true, reply: output, cross_pending: true });
          setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs, ctx));
          return;
        }

        sendJson(res, { success: true, reply: output });
      } catch (e: any) {
        if (reliabilityOperationKey) {
          try { failIdempotency("group-task-message", reliabilityOperationKey, e); } catch {}
        }
        sendJson(res, { error: e.message }, 500);
      }
    };

    if (contentType.includes("multipart/form-data")) {
      ctx.collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = ctx.getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = ctx.parseMultipart(buffer, boundary);
          handleGroupSend(fields, files);
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }

    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        await handleGroupSend(JSON.parse(body));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36),
          role: "user", target: "all", content: message,
          timestamp: new Date().toISOString(),
        });

        const replies = [];
        const configs = getConfigs();

        for (const member of group.members) {
          const config = configs.find(c => c.name === member.project);
          if (!config) continue;
          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          const context = buildGroupContextPacket(group_id, { recentLimit: 10, olderLimit: 24, fullCount: 5 });

          const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");
          const toolContext = buildAgentToolContext(ctx, group, member.project);
          const runtimeToolContext = prepareAgentRuntimeTools(group_id, member.project, workDir, agentType, toolContext.allowedTools, null, {
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
          });
          if (runtimeToolContext.dispatchBlocked) {
            const reason = runtimeToolContext.dispatchGate?.reason || `${member.project} MCP/Skill 授权未就绪，已阻止安排执行成员`;
            addGroupLog(group_id, "warning", "runtime-tool-dispatch-blocked", reason, { agent: member.project, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
            replies.push({ project: member.project, reply: "", blocked: true, error: reason, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
            continue;
          }

          const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== member.project && p !== "coordinator").join(", ");
          const memberInstructions = buildMemberCollaborationInstructions(member.project, memberList);
          const memoryBundle = buildAgentMemoryContextBundle(group_id, member.project, message, {
            workDir,
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

          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + member.project,
            role: "assistant", agent: member.project, content: output,
            timestamp: new Date().toISOString(),
          });
          replies.push({ project: member.project, reply: output, receipt: extractAgentReceipt(output, member.project) });
        }

        sendJson(res, { success: true, replies });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
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
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        const configs = getConfigs();
        const coordinator = getCoordinatorMember(group);
        const members = getRoutableMembers(group);
        const memberList = members.map((m: any) => `${m.project}(${m.agent})`).join(", ");

        const tasks = decomposeRequirementWithCodedCoordinator(group, requirement);
        const output = JSON.stringify({ coordinator: coordinator.project, members: memberList, tasks }, null, 2);

        const createdTasks = tasks.map(t => createTask({
          title: t.title,
          description: t.description || "",
          target_project: t.target_project || coordinator.project,
          priority: t.priority || "normal"
        }));

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "decompose",
          role: "assistant",
          agent: coordinator.project,
          content: `📋 需求已分解，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i+1}. [${t.target_project}] ${t.title}`).join("\n")}`,
          timestamp: new Date().toISOString(),
        });

        sendJson(res, { success: true, tasks: createdTasks, raw_output: output });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }
  return false;
}
