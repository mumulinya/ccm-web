"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactGroupLiveText = compactGroupLiveText;
exports.groupLiveFlag = groupLiveFlag;
exports.resolveExplicitGroupContinuationTask = resolveExplicitGroupContinuationTask;
exports.runGroupExplicitContinuationRoutingSelfTest = runGroupExplicitContinuationRoutingSelfTest;
exports.buildGroupClarificationSummary = buildGroupClarificationSummary;
exports.runGroupClarificationSummarySelfTest = runGroupClarificationSummarySelfTest;
exports.resolvePendingGroupClarification = resolvePendingGroupClarification;
exports.buildGroupClarificationContinuationMessage = buildGroupClarificationContinuationMessage;
exports.resolveStoredGroupClarification = resolveStoredGroupClarification;
exports.runGroupClarificationContinuationSelfTest = runGroupClarificationContinuationSelfTest;
exports.buildGroupTaskIntakeSummary = buildGroupTaskIntakeSummary;
const storage_1 = require("./storage");
const user_facing_text_1 = require("../../agents/user-facing-text");
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
//# sourceMappingURL=group-live-routes-part-01.js.map