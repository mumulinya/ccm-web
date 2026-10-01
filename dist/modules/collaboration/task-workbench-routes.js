"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectTaskWorkbenchRow = projectTaskWorkbenchRow;
exports.handleTaskWorkbenchRoutes = handleTaskWorkbenchRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const automation_definition_service_1 = require("../scheduling/automation-definition-service");
const task_run_store_1 = require("./task-run-store");
const task_replay_1 = require("./task-replay");
const task_session_store_1 = require("./task-session-store");
const text = (value, fallback = "") => {
    const result = String(value ?? "").trim();
    return result || fallback;
};
const RUNNING = new Set(["queued", "running", "verifying", "waiting_user"]);
const NEEDS_ATTENTION = new Set(["failed", "blocked", "waiting_user", "recovery_required"]);
function taskIdOf(task) { return text(task?.id || task?.task_id); }
function runIdOf(task) { return text(task?.active_run_id || task?.task_run?.run_id || task?.run_id); }
function originOf(task) {
    const value = text(task?.task_spec?.origin || task?.origin || task?.source_channel || task?.request_origin).toLowerCase();
    if (value.includes("automation") || value.includes("cron"))
        return "automation";
    if (value.includes("global"))
        return "global_agent";
    if (value.includes("conversation") || value.includes("chat"))
        return "conversation";
    if (value.includes("workbench"))
        return "workbench";
    return "dispatch";
}
function taskTitle(task) { return text(task?.title || task?.name || task?.task_spec?.goal || task?.description, "未命名任务"); }
function targetLabel(task) { return text(task?.group_id || task?.groupId) ? `群聊 ${text(task.group_id || task.groupId)}` : text(task?.target_project || task?.targetProject, "未指定项目"); }
function statusOf(task, run) {
    if (task?.intake_state === "awaiting_confirmation")
        return "waiting_user";
    if (task?.task_spec?.task_session_archive_policy === "user_confirm" && task?.acceptance_state === "awaiting_user_acceptance")
        return "waiting_user";
    if (run?.status)
        return run.status;
    const status = text(task?.status, "pending").toLowerCase();
    return status === "done" ? "completed" : status;
}
function attentionReason(task, run) {
    if (task?.intake_state === "awaiting_confirmation")
        return task.intake_draft?.clarification_questions?.length
            ? "需要补充信息，请打开任务会话" : "等待确认执行计划，请打开任务会话";
    const status = statusOf(task, run);
    if (status === "waiting_user")
        return "等待用户确认或补充信息";
    if (status === "failed")
        return "执行失败，需要重试或查看证据";
    if (status === "blocked")
        return "任务被阻塞，需要处理阻塞原因";
    if (status === "recovery_required")
        return "运行身份或证据不完整，需要恢复处理";
    if (task?.approval_policy === "confirm_before_delivery" || task?.task_spec?.approval_policy === "confirm_before_delivery")
        return "验收已完成，等待交付确认";
    return "";
}
function actionsFor(task, run) {
    const status = statusOf(task, run);
    const active = run && run.run_id === runIdOf(task);
    const actions = [];
    if (task?.intake_state === "awaiting_confirmation")
        return actions;
    if (task?.task_spec?.task_session_archive_policy === "user_confirm" && task?.acceptance_state === "awaiting_user_acceptance")
        return actions;
    if (active && ["queued", "running", "verifying", "waiting_user", "blocked"].includes(status))
        actions.push("cancel");
    if (active && ["failed", "blocked", "cancelled"].includes(status))
        actions.push("retry");
    if (active && ["blocked", "waiting_user", "recovery_required"].includes(status))
        actions.push("resume");
    if (active && status === "waiting_user")
        actions.push("confirm");
    return actions;
}
function runSummary(run) {
    if (!run)
        return null;
    return {
        run_id: run.run_id,
        attempt_id: text(run.attempt_id || run.attemptId || `${run.run_id}:${run.attempt || 1}`),
        task_id: run.task_id,
        trace_id: run.trace_id,
        trigger: run.trigger,
        status: run.status,
        attempt: run.attempt,
        parent_run_id: run.parent_run_id || "",
        queue_lane: run.queue_lane || "",
        created_at: run.created_at,
        updated_at: run.updated_at,
        verification_result: run.verification_result || null,
        delivery_result: run.delivery_result || null,
        evidence_count: Array.isArray(run.execution_evidence) ? run.execution_evidence.length : 0,
        automation_definition_id: run.automation_definition_id || "",
        automation_definition_revision: run.automation_definition_revision || null,
    };
}
function projectTaskWorkbenchRow(task, allRuns = (0, task_run_store_1.listTaskRuns)()) {
    const taskId = taskIdOf(task);
    const runs = allRuns.filter(run => run.task_id === taskId);
    const activeId = runIdOf(task);
    const activeRun = runs.find(run => run.run_id === activeId) || runs[0] || null;
    const origin = originOf(task);
    const spec = task?.task_spec || {};
    const automationId = activeRun?.automation_definition_id || task?.automation_definition_id || task?.source_automation_definition_id || "";
    const definition = automationId ? (0, automation_definition_service_1.getAutomationDefinition)(automationId) : null;
    const status = statusOf(task, activeRun);
    const taskSession = (0, task_session_store_1.getTaskSession)(taskId);
    const creationState = (0, task_session_store_1.taskSessionCreationState)(task);
    const clarificationQuestions = Array.isArray(spec?.clarification_questions)
        ? spec.clarification_questions
        : Array.isArray(task?.intake_draft?.clarification_questions)
            ? task.intake_draft.clarification_questions
            : [];
    return {
        task_id: taskId,
        title: taskTitle(task),
        goal: text(spec.goal || task?.description || task?.title),
        scope: text(spec.scope || task?.scope),
        origin,
        target: { project: text(task?.target_project || task?.targetProject), group_id: text(task?.group_id || task?.groupId), label: targetLabel(task) },
        status,
        active_run: runSummary(activeRun),
        run_count: runs.length,
        acceptance: activeRun?.verification_result || task?.acceptance_state || task?.acceptance_result || null,
        updated_at: text(activeRun?.updated_at || task?.updated_at || task?.updatedAt, task?.created_at || ""),
        attention_reason: attentionReason(task, activeRun),
        available_actions: actionsFor(task, activeRun),
        archive_policy: spec.task_session_archive_policy || "",
        creation_policy: spec.task_session_creation_policy || creationState.policy,
        archive_state: (0, task_session_store_1.taskSessionArchiveState)(task),
        archive_actions: (0, task_session_store_1.taskSessionArchiveActions)(task),
        output_revision: (0, task_session_store_1.taskSessionOutputRevision)(task),
        automation: definition ? { definition_id: definition.definition_id, name: definition.name, revision: definition.revision, schedule: definition.schedule, timezone: definition.timezone, enabled: definition.enabled !== false } : null,
        plan_status: taskSession?.lifecycle
            || (task?.intake_state === "awaiting_confirmation" ? "awaiting_confirmation" : creationState.policy === "on_create" && creationState.eligible ? "planning" : ""),
        clarification: {
            count: clarificationQuestions.length,
            pending: clarificationQuestions.length > 0,
            questions: clarificationQuestions.slice(0, 20),
        },
        task_session: taskSession
            ? { available: true, session_id: taskSession.session_id, lifecycle: taskSession.lifecycle, creation_policy: taskSession.creation_policy, materialized_at: taskSession.materialized_at, updated_at: taskSession.updated_at }
            : { available: creationState.eligible, lifecycle: creationState.policy === "on_create" ? "planning" : "", creation_policy: creationState.policy },
        spec_summary: { revision: spec.revision || spec.spec_revision || task?.task_spec_revision || 1, checksum: spec.checksum || spec.plan_checksum || "", execution_policy: spec.execution_policy || task?.workflow_policy_snapshot || null },
    };
}
function visibleTasks(req) {
    const principal = req.ccmAuth;
    return (0, db_1.loadTasks)().filter((task) => !task.archived && !task.deleted_at
        && (!principal || principal.kind !== "browser" || principal.role === "admin" || (0, access_policy_1.hasTaskResourceAccess)(task, principal, "use")));
}
function handleTaskWorkbenchRoutes(pathname, req, res, parsed) {
    const detailRunMatch = pathname.match(/^\/api\/task-workbench\/([^/]+)\/runs\/([^/]+)$/);
    const detailMatch = pathname.match(/^\/api\/task-workbench\/([^/]+)$/);
    if (pathname === "/api/task-workbench" && req.method === "GET") {
        const allRuns = (0, task_run_store_1.listTaskRuns)();
        const query = text(parsed.query.query || parsed.query.q).toLowerCase();
        const view = text(parsed.query.view, "needs_attention");
        const statusFilter = text(parsed.query.status).toLowerCase();
        const originFilter = text(parsed.query.origin).toLowerCase();
        const project = text(parsed.query.project).toLowerCase();
        const groupId = text(parsed.query.group_id || parsed.query.groupId);
        const allRows = visibleTasks(req).map(task => projectTaskWorkbenchRow(task, allRuns)).filter(row => row.origin !== "automation");
        const rows = allRows.filter(row => {
            if (query && !`${row.title} ${row.goal} ${row.task_id}`.toLowerCase().includes(query))
                return false;
            if (statusFilter && row.status !== statusFilter)
                return false;
            if (originFilter && row.origin !== originFilter)
                return false;
            if (project && String(row.target.project).toLowerCase() !== project)
                return false;
            if (groupId && row.target.group_id !== groupId)
                return false;
            if (view === "running" && !RUNNING.has(row.status))
                return false;
            if (view === "needs_attention" && !row.attention_reason && !NEEDS_ATTENTION.has(row.status))
                return false;
            return true;
        }).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
        const page = Math.max(1, Number(parsed.query.page || 1));
        const limit = Math.max(1, Math.min(100, Number(parsed.query.limit || 30)));
        const items = rows.slice((page - 1) * limit, page * limit);
        (0, utils_1.sendJson)(res, { success: true, items, tasks: items, pagination: { page, limit, total: rows.length, pages: Math.ceil(rows.length / limit) }, counts: { all: allRows.length, needs_attention: allRows.filter(row => row.attention_reason || NEEDS_ATTENTION.has(row.status)).length, running: allRows.filter(row => RUNNING.has(row.status)).length, completed: allRows.filter(row => row.status === "completed").length } });
        return true;
    }
    if (!detailMatch && !detailRunMatch)
        return false;
    if (req.method !== "GET")
        return false;
    const taskId = decodeURIComponent((detailRunMatch || detailMatch)[1]);
    const task = visibleTasks(req).find((row) => taskIdOf(row) === taskId);
    if (!task) {
        (0, utils_1.sendJson)(res, { success: false, error: "任务不存在" }, 404);
        return true;
    }
    const runs = (0, task_run_store_1.listTaskRuns)(taskId);
    if (detailRunMatch) {
        const runId = decodeURIComponent(detailRunMatch[2]);
        const run = runs.find(item => item.run_id === runId);
        if (!run) {
            (0, utils_1.sendJson)(res, { success: false, error: "运行实例不存在" }, 404);
            return true;
        }
        const replay = (0, task_replay_1.buildCompleteTaskReplay)(taskId, { includeDetails: false });
        (0, utils_1.sendJson)(res, { success: true, task: projectTaskWorkbenchRow(task, runs), run: runSummary(run), runs: runs.map(runSummary), replay: replay ? (0, task_replay_1.projectTaskReplayForAccess)(replay, false) : null });
        return true;
    }
    const row = projectTaskWorkbenchRow(task, runs);
    const activeRun = runs.find(run => run.run_id === runIdOf(task)) || runs[0] || null;
    const definitionId = activeRun?.automation_definition_id || task?.automation_definition_id || task?.source_automation_definition_id || "";
    const definition = definitionId ? (0, automation_definition_service_1.getAutomationDefinition)(definitionId) : null;
    const replay = (0, task_replay_1.buildCompleteTaskReplay)(taskId, { includeDetails: false });
    (0, utils_1.sendJson)(res, { success: true, task: row, task_spec: task.task_spec || null, current_run: activeRun ? runSummary(activeRun) : null, runs: runs.map(runSummary), automation: definition ? { ...definition, runs: (0, automation_definition_service_1.listAutomationDefinitionRuns)(definition.definition_id).map(runSummary) } : null, replay: replay ? (0, task_replay_1.projectTaskReplayForAccess)(replay, false) : null, available_actions: actionsFor(task, activeRun) });
    return true;
}
//# sourceMappingURL=task-workbench-routes.js.map