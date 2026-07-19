// Behavior-freeze split from group-live-routes.ts (part 1/2).
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
import { appendGroupMessage, getGroupMessages, loadGroups, resolveWritableGroupChatSession, saveGroupMessages } from "./storage";
import { acquireIdempotency, completeIdempotency, failIdempotency } from "../../system/reliability-ledger";
import { sanitizeMainAgentRoleLanguage } from "../../agents/user-facing-text";
import { ingestRequirementSources } from "../requirements/source-ingestion";
import { buildGroupDirectMemoryAction, commitGroupDirectMemoryAction } from "./group-memory-index";

export type GroupLiveRoutesDeps = {
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
  buildAgentMemoryContextBundleWithManifestSelection: (groupId: string, project: string, message: string, options?: any) => Promise<any>;
  buildAgentMemoryPacket: (groupId: string, project: string, message: string, options?: any) => string;
  buildChildAgentDevelopmentContract: (project: string, message: string, options?: any) => string;
  buildProjectVerificationHints: (project: string, workDir: string) => any;
  buildAgentQaProtocolInstructions: (project: string, memberList: string) => string;
  getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
  handleAgentQaRequests: (input: any) => Promise<any>;
  runtimeToolSnapshotFromAudit: (audit: any, allowedTools: any) => any;
  extractActionableMentions: (text: string, group: any, sourceProject: string) => any[];
  extractAgentReceipt: (text: string, project: string) => any;
};

export function compactGroupLiveText(value: any, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function groupLiveFlag(value: any, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "on"].includes(String(value).trim().toLowerCase());
}

export function resolveExplicitGroupContinuationTask(tasks: any[], groupId: string, taskId: string) {
  const id = String(taskId || "").trim();
  if (!id) return { task: null, status: 0, error: "" };
  const task = (Array.isArray(tasks) ? tasks : []).find((item: any) => item?.id === id) || null;
  const unavailable = !task
    || task.group_id !== groupId
    || task.archived
    || task.deleted_at
    || ["cancelled", "archived"].includes(String(task.status || ""));
  return unavailable
    ? { task: null, status: 404, error: "当前群聊中没有可继续的这个任务" }
    : { task, status: 200, error: "" };
}

export function runGroupExplicitContinuationRoutingSelfTest() {
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

function groupClarificationContext(message: any) {
  return message?.clarification_context || message?.clarificationContext || null;
}

export function resolvePendingGroupClarification(messages: any[], requestId: string, messageId = "") {
  const requestedId = String(requestId || "").trim();
  const requestedMessageId = String(messageId || "").trim();
  if (!requestedId && !requestedMessageId) return { message: null, context: null, status: 0, error: "" };
  const candidate = [...(Array.isArray(messages) ? messages : [])].reverse().find((item: any) => {
    const context = groupClarificationContext(item);
    if (!context || String(context.status || "pending") !== "pending" || context.resolved_at || context.resolvedAt) return false;
    const contextId = String(context.id || context.request_id || context.requestId || "").trim();
    return (requestedId && contextId === requestedId) || (requestedMessageId && String(item?.id || "") === requestedMessageId);
  }) || null;
  if (!candidate) return { message: null, context: null, status: 404, error: "当前群聊中没有等待回答的这个问题" };
  return { message: candidate, context: groupClarificationContext(candidate), status: 200, error: "" };
}

export function buildGroupClarificationContinuationMessage(context: any, answerForAgent: string) {
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

export function resolveStoredGroupClarification(groupId: string, pending: any, answerMessageId: string, sessionId = "") {
  if (!pending?.message?.id || !pending?.context) return;
  const messages = getGroupMessages(groupId, sessionId);
  const index = messages.findIndex((item: any) => item.id === pending.message.id);
  if (index < 0) return;
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
  saveGroupMessages(groupId, messages, sessionId);
}

export function runGroupClarificationContinuationSelfTest() {
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

export function buildGroupTaskIntakeSummary(input: {
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
