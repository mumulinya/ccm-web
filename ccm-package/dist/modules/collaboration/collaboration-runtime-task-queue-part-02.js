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
exports.buildPlanModeClarificationQuestions = buildPlanModeClarificationQuestions;
exports.buildGroupPlanModePreflight = buildGroupPlanModePreflight;
exports.buildGroupProjectAnalysisContext = buildGroupProjectAnalysisContext;
exports.buildProjectCodeReadOnlySnapshot = buildProjectCodeReadOnlySnapshot;
exports.runCollaborationUxSelfTest = runCollaborationUxSelfTest;
exports.buildInlineTaskRuntime = buildInlineTaskRuntime;
exports.updateGroupTaskInlineStatus = updateGroupTaskInlineStatus;
exports.buildChildAgentWorkerHandoff = buildChildAgentWorkerHandoff;
exports.taskAgentInvocationMemoryOptions = taskAgentInvocationMemoryOptions;
exports.taskAgentSessionLifecycleRunnerOptions = taskAgentSessionLifecycleRunnerOptions;
exports.buildWorkerContinuationHandoff = buildWorkerContinuationHandoff;
exports.buildChildAgentDevelopmentContract = buildChildAgentDevelopmentContract;
exports.getTaskById = getTaskById;
exports.buildChildAgentTaskText = buildChildAgentTaskText;
exports.buildQueuedGroupTaskMessage = buildQueuedGroupTaskMessage;
exports.normalizePlanAssignments = normalizePlanAssignments;
exports.buildWorkflowMeta = buildWorkflowMeta;
exports.getInitialWorkflowMeta = getInitialWorkflowMeta;
exports.updateGroupMessageAssignmentStatus = updateGroupMessageAssignmentStatus;
exports.sendTaskCompletionNotification = sendTaskCompletionNotification;
exports.sendTaskFailureNotification = sendTaskFailureNotification;
exports.appendTaskGroupReport = appendTaskGroupReport;
exports.buildTaskProviderSwitchRequests = buildTaskProviderSwitchRequests;
exports.appendLegacyTaskExecutionGroupReport = appendLegacyTaskExecutionGroupReport;
exports.appendLegacyCodeReviewGroupReport = appendLegacyCodeReviewGroupReport;
exports.syncTaskBacklogStatus = syncTaskBacklogStatus;
exports.getTaskTargetKey = getTaskTargetKey;
exports.isActionableMentionText = isActionableMentionText;
exports.normalizeMentionTask = normalizeMentionTask;
exports.escapeRegExp = escapeRegExp;
exports.extractActionableMentions = extractActionableMentions;
exports.buildAgentQaProtocolInstructions = buildAgentQaProtocolInstructions;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const display_1 = require("./display");
const project_analysis_1 = require("./project-analysis");
const memory_1 = require("./memory");
const feishu_1 = require("./feishu");
const feishu_channel_1 = require("./feishu-channel");
const group_coordination_mcp_1 = require("../../integrations/group-coordination-mcp");
const task_delivery_report_1 = require("./task-delivery-report");
const storage_1 = require("./storage");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const memory_2 = require("../../projects/memory");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_task_queue_part_01_1 = require("./collaboration-runtime-task-queue-part-01");
function buildPlanModeClarificationQuestions(message, risk = {}, selectedProjects = []) {
    return require("./collaboration-task-intake").buildPlanModeClarificationQuestions(message, risk, selectedProjects);
}
function buildGroupPlanModePreflight(input) {
    return require("./collaboration-task-intake").buildGroupPlanModePreflight(input);
}
function buildGroupProjectAnalysisContext(group, message, ctx, configs = (0, db_1.getConfigs)()) {
    return (0, project_analysis_1.buildGroupProjectAnalysisContext)(group, message, ctx, configs, {
        compactMemoryText: memory_1.compactMemoryText,
        compactPreserveLines: memory_1.compactPreserveLines,
        getProjectExtraConfig: collaboration_runtime_plan_tools_1.getProjectExtraConfig,
        buildProjectMemoryPacket: memory_2.buildProjectMemoryPacket,
    });
}
function buildProjectCodeReadOnlySnapshot(project, workDir, message) {
    return require("./collaboration-task-intake").buildProjectCodeReadOnlySnapshot(project, workDir, message);
}
function runCollaborationUxSelfTest() {
    return require("./collaboration-ux-self-tests").runCollaborationUxSelfTest();
}
function buildInlineTaskRuntime(task) {
    const executions = (0, execution_kernel_1.listExecutions)({ taskId: task.id });
    const sessions = (0, agent_sessions_1.listTaskAgentSessions)({ taskId: task.id });
    const running = executions.filter(item => ["spawning", "ready", "prompt_accepted", "running"].includes(item.state));
    const failed = executions.filter(item => item.state === "failed");
    const reviewing = executions.filter(item => item.state === "reviewing");
    const mergeReady = executions.filter(item => item.green?.level === "merge_ready");
    return {
        taskId: task.id,
        status: task.status,
        statusText: task.status_detail || "",
        updatedAt: task.updated_at || new Date().toISOString(),
        lifecycle: (0, collaboration_runtime_task_queue_part_01_1.deriveTaskLifecycle)(task, executions),
        reasoning: task.reasoning_loop ? {
            planVersion: Number(task.reasoning_loop.plan_version || 0),
            openAssertions: (task.reasoning_loop.assertions || []).filter((item) => item.status !== "passed").length,
            deviations: (task.reasoning_loop.deviations || []).length,
            recoveryChecks: (task.reasoning_loop.recovery_checks || []).length,
            lastDecision: task.reasoning_loop.explanations?.[task.reasoning_loop.explanations.length - 1] || null,
        } : null,
        counts: { total: executions.length, running: running.length, reviewing: reviewing.length, failed: failed.length, mergeReady: mergeReady.length },
        agents: executions.map(item => ({
            project: item.project,
            state: item.state,
            green: item.green?.level || "none",
            failureClass: item.failure?.failureClass || "",
            runtimeFallbacks: (item.events || []).filter((event) => event.name === "runtime.fallback").length,
            conflictGroup: item.workspace?.conflictGroup || "",
        })),
        sessions: sessions.map(session => ({
            project: session.project,
            agentType: session.agentType,
            status: session.status,
            nativeSessionId: session.nativeSessionId || "",
            ...(0, agent_sessions_1.getTaskAgentSessionContinuity)(session),
        })),
        taskCard: (0, collaboration_runtime_task_queue_part_01_1.buildTaskCardView)(task, executions, sessions),
        task_card: (0, collaboration_runtime_task_queue_part_01_1.buildTaskCardView)(task, executions, sessions),
    };
}
function updateGroupTaskInlineStatus(task, status, detail = "") {
    if (!task?.group_id || !task?.id)
        return null;
    const sessionId = (0, collaboration_runtime_task_queue_part_01_1.groupSessionIdForTask)(task);
    const messages = (0, storage_1.getGroupMessages)(task.group_id, sessionId);
    const runtime = buildInlineTaskRuntime({ ...task, status, status_detail: detail || task.status_detail });
    let changed = false;
    const next = messages.map((message) => {
        if (message?.task_id !== task.id)
            return message;
        changed = true;
        const { taskRuntime: _storedTaskRuntime, task_runtime: _storedTaskRuntimeSnake, taskCard: _storedTaskCard, task_card: _storedTaskCardSnake, ...messageWithoutStoredRuntime } = message;
        return {
            ...messageWithoutStoredRuntime,
            task: message.task ? { ...message.task, status, status_detail: detail || task.status_detail || "" } : message.task,
            workflow: { ...(message.workflow || {}), phase: status === "done" ? "complete" : status === "failed" || status === "cancelled" ? "needs_rework" : status === "in_progress" ? "executing" : (message.workflow?.phase || "dispatching"), updated_at: new Date().toISOString() },
        };
    });
    if (changed)
        (0, storage_1.saveGroupMessages)(task.group_id, next, sessionId);
    return runtime;
}
function buildChildAgentWorkerHandoff(targetProject, taskText = "", options = {}) {
    return require("./collaboration-task-intake").buildChildAgentWorkerHandoff(targetProject, taskText, options);
}
function taskAgentInvocationMemoryOptions(edge) {
    return require("./collaboration-coordination-ux").taskAgentInvocationMemoryOptions.apply(null, arguments);
}
function taskAgentSessionLifecycleRunnerOptions(snapshot) {
    return require("./collaboration-coordination-ux").taskAgentSessionLifecycleRunnerOptions.apply(null, arguments);
}
function buildWorkerContinuationHandoff(task, targetProject = "", options = {}) {
    return require("./collaboration-coordination-ux").buildWorkerContinuationHandoff.apply(null, arguments);
}
function extractMemoryDispatchFreshnessGate(memory) {
    return require("./collaboration-coordination-ux").extractMemoryDispatchFreshnessGate.apply(null, arguments);
}
function renderMemoryDispatchFreshnessGateForContract(memory, handoff = null) {
    return require("./collaboration-coordination-ux").renderMemoryDispatchFreshnessGateForContract.apply(null, arguments);
}
function buildChildAgentDevelopmentContract(targetProject, taskText = "", options = {}) {
    return require("./collaboration-coordination-ux").buildChildAgentDevelopmentContract.apply(null, arguments);
}
function getTaskById(taskId) {
    if (!taskId)
        return null;
    return (0, db_1.loadTasks)().find((task) => task.id === taskId) || null;
}
function buildChildAgentTaskText(childTaskText, task = null) {
    if (!task || task.workflow_type !== "daily_dev")
        return childTaskText;
    return [
        "原始业务开发任务上下文：",
        `- 任务：${task.title || "未命名任务"}`,
        task.business_goal || task.businessGoal ? `- 业务目标：${(0, memory_1.compactMemoryText)(task.business_goal || task.businessGoal, 700)}` : "",
        task.acceptance_criteria || task.acceptanceCriteria ? `- 全局验收标准：${(0, memory_1.compactMemoryText)(task.acceptance_criteria || task.acceptanceCriteria, 700)}` : "",
        task.source_documents || task.sourceDocuments ? `- 关联文档摘要：${(0, memory_1.compactMemoryText)(task.source_documents || task.sourceDocuments, 900)}` : "",
        "",
        "主 Agent 指派给你的子任务：",
        childTaskText || "请根据原始业务开发任务上下文完成你负责的实现与验证。",
    ].filter(line => line !== "").join("\n");
}
function buildQueuedGroupTaskMessage(task) {
    return require("./collaboration-task-intake").buildQueuedGroupTaskMessage(task);
}
function normalizePlanAssignments(assignments) {
    return (assignments || []).map((item) => ({
        ...item,
        status: item.status || "pending",
        statusText: item.statusText || "待处理",
        attempt: Number(item.attempt || 1),
        rework: !!item.rework,
        continuationOf: String(item.continuationOf || item.continuation_of || "").trim(),
        continuationStrategy: String(item.continuationStrategy || item.continuation_strategy || "").trim(),
    }));
}
function getWorkflowPhaseFromAssignments(assignments = []) {
    const items = assignments || [];
    if (items.length === 0)
        return "understanding";
    const statuses = items.map((item) => String(item.status || "pending"));
    if (statuses.some(s => ["failed", "blocked", "needs_info", "partial"].includes(s)))
        return "needs_rework";
    if (statuses.some(s => s === "running"))
        return "executing";
    if (statuses.every(s => s === "done"))
        return "reviewing";
    return "dispatching";
}
function buildWorkflowMeta(phase, label = "") {
    return {
        phase,
        label: label || phase,
        updated_at: new Date().toISOString(),
    };
}
function getInitialWorkflowMeta(assignments, dispatchPolicy, label = "主 Agent 初始计划") {
    const action = String(dispatchPolicy?.action || "");
    if (action === "ask_user")
        return buildWorkflowMeta("needs_user", "等待用户补充");
    if (action === "hold")
        return buildWorkflowMeta("hold", "暂不执行");
    if (action === "direct_answer")
        return buildWorkflowMeta("complete", "直接回复");
    if (dispatchPolicy?.requiresConfirmation)
        return buildWorkflowMeta("needs_user", "等待用户确认");
    return buildWorkflowMeta((assignments || []).length ? "dispatching" : "understanding", label);
}
function updateGroupMessageAssignmentStatus(groupId, messageId, project, status, statusText = "") {
    if (!messageId || !project)
        return null;
    const located = (0, storage_1.findGroupChatSessionContainingMessage)(groupId, messageId);
    const sessionId = located?.session?.id || "";
    const messages = located?.messages || (0, storage_1.getGroupMessages)(groupId);
    let changed = false;
    let workflow = null;
    for (const msg of messages) {
        if (msg.id !== messageId || !Array.isArray(msg.assignments))
            continue;
        msg.assignments = msg.assignments.map((item) => {
            if (item.project !== project)
                return item;
            changed = true;
            return {
                ...item,
                status,
                statusText: statusText || status,
                updated_at: new Date().toISOString(),
            };
        });
        const phase = getWorkflowPhaseFromAssignments(msg.assignments);
        msg.workflow = {
            ...(msg.workflow || {}),
            ...buildWorkflowMeta(phase),
            phase,
        };
        workflow = msg.workflow;
    }
    if (changed)
        (0, storage_1.saveGroupMessages)(groupId, messages, sessionId);
    return workflow;
}
async function sendTaskCompletionNotification(task, result) {
    // Tasks bound to Feishu are already delivered to their originating chat by
    // the task status hook. Preserve the fixed webhook as a legacy fallback.
    if ((0, feishu_channel_1.hasFeishuTaskBinding)({ taskId: task?.id, missionId: task?.parent_task_id || task?.root_task_id }))
        return;
    const summary = task?.delivery_summary || {};
    const sourceReport = String(summary.user_report || result || "");
    const resultSummary = sourceReport.substring(0, 900) + (sourceReport.length > 900 ? "..." : "");
    const fileCount = summary.actual_file_change_count ?? summary.files_changed?.length ?? 0;
    const verificationCount = summary.verification?.length || 0;
    const missingVerificationCount = summary.verification_required_missing?.length || 0;
    const reviewStatus = summary.has_final_review ? (summary.review_status || "complete") : "无";
    const priority = task.priority === "high" ? "高" : task.priority === "normal" ? "中" : "低";
    const markdown = [
        `**任务标题**：${task.title || "未命名任务"}`,
        `**目标项目**：${task.target_project || "群聊"}`,
        `**优先级**：${priority}`,
        `**完成时间**：${new Date().toLocaleString("zh-CN")}`,
        `**实际文件变更**：${fileCount} 个`,
        `**验证记录**：${verificationCount} 条`,
        `**缺命令验证**：${missingVerificationCount} 项`,
        `**主 Agent 复盘**：${reviewStatus}`,
        "",
        `**用户交付报告**：\n${resultSummary || "无"}`,
    ].join("\n");
    const notification = await (0, feishu_1.sendFeishuReportMessage)({
        title: "任务完成通知",
        markdown,
    });
    if (!notification.success)
        console.warn("[飞书通知] 任务完成通知发送失败:", notification.error || "未知错误");
}
async function sendTaskFailureNotification(task, errorMsg) {
    if ((0, feishu_channel_1.hasFeishuTaskBinding)({ taskId: task?.id, missionId: task?.parent_task_id || task?.root_task_id }))
        return;
    const markdown = [
        `**任务标题**：${task.title || "未命名任务"}`,
        `**目标项目**：${task.target_project || "群聊"}`,
        `**失败时间**：${new Date().toLocaleString("zh-CN")}`,
        "",
        `**错误信息**：\n${String(errorMsg || "未知错误").substring(0, 900)}`,
    ].join("\n");
    const notification = await (0, feishu_1.sendFeishuReportMessage)({
        title: "任务执行失败",
        markdown,
    });
    if (!notification.success)
        console.warn("[飞书通知] 任务失败通知发送失败:", notification.error || "未知错误");
}
function appendTaskGroupReport(task, status, detail = "") {
    if (!task?.group_id)
        return;
    const deliveryReport = (0, task_delivery_report_1.buildTaskDeliveryReport)(task, task?.delivery_summary || {}, status, detail);
    (0, storage_1.appendGroupMessage)(task.group_id, {
        id: "m" + Date.now().toString(36) + "delivery" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: "system",
        content: deliveryReport.user_text || (0, task_delivery_report_1.buildTaskGroupReportMessage)(task, status, detail),
        timestamp: new Date().toISOString(),
        task_id: task.id,
        delivery_summary: task.delivery_summary || null,
        delivery_report: deliveryReport,
    });
}
function buildTaskProviderSwitchRequests(task = {}) {
    const overrides = task?.runtime_overrides && typeof task.runtime_overrides === "object"
        ? task.runtime_overrides
        : {};
    const requests = {};
    for (const [project, provider] of Object.entries(overrides)) {
        const requestedAgentType = String(provider || "").trim();
        if (!requestedAgentType)
            continue;
        requests[String(project || "*")] = {
            requested_agent_type: requestedAgentType,
            compatibility_confirmed: true,
            compatibility_evidence: [
                `task-local runtime override targets provider ${requestedAgentType}`,
                `project scope ${project || "*"} remains unchanged`,
                "existing project workDir and configured provider candidate must pass the provider-switch gate",
            ],
            reason: "task-local runtime override selected for this child-agent dispatch",
            authority: {
                kind: "task_runtime_override",
                authority_id: String(task.id || task.task_id || ""),
                approved: true,
                local_policy_authority: true,
                allow_switch_away_from_held_provider: true,
            },
        };
    }
    const wildcard = String(task?.runtime_override || "").trim();
    if (wildcard && !requests["*"]) {
        requests["*"] = {
            requested_agent_type: wildcard,
            compatibility_confirmed: true,
            compatibility_evidence: [
                `task-local runtime override targets provider ${wildcard}`,
                "project scope remains unchanged",
                "existing project workDir and configured provider candidate must pass the provider-switch gate",
            ],
            reason: "task-local wildcard runtime override selected for this child-agent dispatch",
            authority: {
                kind: "task_runtime_override",
                authority_id: String(task.id || task.task_id || ""),
                approved: true,
                local_policy_authority: true,
                allow_switch_away_from_held_provider: true,
            },
        };
    }
    return requests;
}
function appendLegacyTaskExecutionGroupReport(input) {
    if (!input.groupId || !input.task)
        return;
    const deliveryReport = (0, task_delivery_report_1.buildTaskDeliveryReport)(input.task, input.task?.delivery_summary || {}, input.status, input.detail || "");
    (0, storage_1.appendGroupMessage)(input.groupId, {
        id: "m" + Date.now().toString(36) + "legacyexec" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: "system",
        type: "task_execution_result",
        content: deliveryReport.user_text || (0, task_delivery_report_1.buildTaskGroupReportMessage)(input.task, input.status, input.detail || ""),
        timestamp: new Date().toISOString(),
        task_id: input.task.id,
        delivery_summary: input.task.delivery_summary || null,
        delivery_report: deliveryReport,
        fileChanges: input.fileChanges || null,
        file_changes: input.fileChanges || null,
        technical_content: String(input.rawResult || ""),
        raw_result: String(input.rawResult || ""),
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
    });
}
function parseLegacyReviewSummary(value) {
    const text = String(value || "").trim();
    if (!text)
        return "";
    const jsonText = text.match(/\{[\s\S]*\}/)?.[0] || "";
    if (jsonText) {
        try {
            const parsed = JSON.parse(jsonText);
            const overall = (0, display_1.sanitizeMainAgentUserText)(parsed.overall || parsed.summary || "", "", 180);
            const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
            const high = issues.filter((item) => String(item?.severity || "").toLowerCase() === "high").length;
            const medium = issues.filter((item) => String(item?.severity || "").toLowerCase() === "medium").length;
            const low = issues.filter((item) => String(item?.severity || "").toLowerCase() === "low").length;
            const issueText = issues.length ? `发现 ${issues.length} 个建议（高 ${high} / 中 ${medium} / 低 ${low}）` : "暂未发现明确问题";
            return [issueText, overall].filter(Boolean).join("；");
        }
        catch { }
    }
    return (0, display_1.sanitizeMainAgentUserText)(text, "审查结果已整理，技术细节已放入技术详情。", 220);
}
function appendLegacyCodeReviewGroupReport(input) {
    if (!input.groupId)
        return;
    const rows = (input.reviewResults || []).map((row) => {
        const reviewer = (0, display_1.sanitizeMainAgentUserText)(row?.reviewer || "Reviewer", "Reviewer", 80);
        if (row?.error)
            return `- ${reviewer}：审查失败，排障信息已放入技术详情。`;
        return `- ${reviewer}：${parseLegacyReviewSummary(row?.result) || "审查结果已整理。"}`;
    });
    const failed = (input.reviewResults || []).filter((row) => row?.error).length;
    const content = [
        `代码审查完成：${(0, display_1.sanitizeMainAgentUserText)(input.project, "当前项目", 120)}`,
        rows.length ? rows.join("\n") : "暂未收到可展示的审查结论。",
        failed ? `有 ${failed} 个审查 Agent 遇到问题，详细原因已放入技术详情。` : "原始审查输出默认收在技术详情里。",
    ].join("\n");
    (0, storage_1.appendGroupMessage)(input.groupId, {
        id: "m" + Date.now().toString(36) + "review" + crypto.randomBytes(2).toString("hex"),
        role: "assistant",
        agent: input.coordinator || "coordinator",
        type: "code_review_result",
        content,
        timestamp: new Date().toISOString(),
        review_results: input.reviewResults || [],
        technical_content: JSON.stringify(input.reviewResults || [], null, 2),
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
    });
}
function syncTaskBacklogStatus(task, status, result = "") {
    const backlogFile = task?.workflow_meta?.intake?.backlog_file;
    if (!task?.group_id || !backlogFile)
        return null;
    return (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(task.group_id, backlogFile, status, {
        task_id: task.id,
        result: result || task.status_detail || task.result || status,
    });
}
// === 协作与辅助规则 ===
function getTaskTargetKey(task) {
    if (task?.queue_scope === "isolated_parallel" && task?.id) {
        return `isolated:${task.target_project || "unknown"}:${task.id}`;
    }
    if (task.assign_type === "group" && task.group_id) {
        return `group:${task.group_id}`;
    }
    return `project:${task.target_project}`;
}
function isActionableMentionText(text) {
    const value = String(text || "").trim();
    if (value.length < 4)
        return false;
    if (/^(收到|好的|了解|谢谢|辛苦了|已完成|完成了|确认收到|ok|OK)[。！!,.，\s]*$/.test(value))
        return false;
    return true;
}
function normalizeMentionTask(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 240);
}
function stripMessageListPrefix(line) {
    return String(line || "").trim().replace(/^([>*-]|\d+[.)、]|[（(]\d+[）)])\s*/, "").trim();
}
function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function extractActionableMentions(text, group, sourceProject = "") {
    const memberNames = (group.members || [])
        .map((m) => String(m.project || "").trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    const members = new Set(memberNames);
    const results = [];
    const seen = new Set();
    for (const line of String(text || "").split(/\r?\n/)) {
        const normalized = stripMessageListPrefix(line);
        let targetName = "";
        let message = "";
        for (const name of memberNames) {
            const token = `@${name}`;
            if (!normalized.startsWith(token))
                continue;
            const rest = normalized.slice(token.length);
            if (rest && !/^[\s：:，,、\-—]/.test(rest))
                continue;
            targetName = name;
            message = rest.replace(/^[\s：:，,、\-—]+/, "").trim();
            break;
        }
        if (!targetName) {
            const match = normalized.match(/^@([^\s：:，,、\-—]+)(?:\s+|[：:，,、\-—]+)([\s\S]+)$/);
            if (!match)
                continue;
            targetName = match[1];
            message = match[2].trim();
        }
        if (!members.has(targetName) || targetName === sourceProject)
            continue;
        if (!isActionableMentionText(message))
            continue;
        const key = `${targetName}\n${normalizeMentionTask(message)}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        results.push({ mention: `@${targetName}`, targetName, message });
    }
    return results;
}
function buildAgentQaProtocolInstructions(currentAgent, memberList) {
    const members = memberList || "暂无可询问成员";
    return [
        "",
        "[群聊主 Agent 协调协议]",
        `- 你是 ${currentAgent || "当前子 Agent"}。可协作成员仅用于了解团队能力：${members}。你不能直接给其他子 Agent 派活，也不能私下扩大其他 Agent 的写权限。`,
        `- 需要跨 Agent 信息、实现、评审或风险确认时，必须调用内部 MCP ${group_coordination_mcp_1.GROUP_COORDINATION_MCP_SERVER_NAME} 的 request_coordination、request_review 或 report_blocker。只描述需求、证据、能力和验收标准，由群聊主 Agent 选择执行者、建立依赖并验收。`,
        "- 前端需要后端新增接口等写依赖时，kind 必须填 implementation，并给出 acceptance_criteria/requested_write_paths；主 Agent 会创建正式工作项，完成验收后再恢复你的原任务会话。",
        "- 只需要接口解释、字段确认或代码评审时，使用 information/review；目标 Agent 只能只读回答。涉及账号、密钥、生产数据、业务方向或高风险权限时使用 risk/report_blocker，由主 Agent 询问用户。",
        "- target_hint 只是能力建议，不是派发命令；主 Agent 可以改派。回答或实现结果必须尽量附文件、接口、文档、命令或截图证据。",
        "- 如果你正在回答其他 Agent 的问题，可以直接自然语言回答；也可以用 reply_agent：<tool_call>{\"name\":\"reply_agent\",\"arguments\":{\"answer\":\"结论...\",\"evidence\":\"接口/文件/验证证据...\"}}</tool_call>",
        "- 兼容旧运行时的降级格式：CCM_COORDINATION_REQUESTS [{\"kind\":\"information\",\"summary\":\"确认订单接口契约\",\"question\":\"...\",\"required_capabilities\":[\"api\"],\"blocking\":true}]。旧 ask_agent 会被平台转换为主 Agent 协调请求，不再视为直接派发。",
        "- 如果没有真实依赖或阻塞，不要调用协调 MCP，也不要输出协调标记。",
        "",
    ].join("\n");
}
//# sourceMappingURL=collaboration-runtime-task-queue-part-02.js.map