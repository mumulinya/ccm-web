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
exports.taskSessionArchiveState = taskSessionArchiveState;
exports.taskSessionCreationState = taskSessionCreationState;
exports.taskSessionArchiveActions = taskSessionArchiveActions;
exports.taskSessionOutputRevision = taskSessionOutputRevision;
exports.taskSessionStorePath = taskSessionStorePath;
exports.getTaskSession = getTaskSession;
exports.listTaskSessions = listTaskSessions;
exports.isTaskSessionAvailable = isTaskSessionAvailable;
exports.reconcileTaskSessions = reconcileTaskSessions;
exports.materializeTaskSession = materializeTaskSession;
exports.appendTaskSessionMessage = appendTaskSessionMessage;
exports.setTaskSessionPendingFollowUp = setTaskSessionPendingFollowUp;
exports.buildTaskSessionDiscussionReply = buildTaskSessionDiscussionReply;
exports.taskSessionEvents = taskSessionEvents;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const task_run_store_1 = require("./task-run-store");
const storage_1 = require("./storage");
const project_session_compaction_1 = require("../projects/project-session-compaction");
const task_workflow_model_1 = require("./task-workflow-model");
const FILE = path.join(utils_1.CCM_DIR, "task-sessions.json");
const LOCK = path.join(utils_1.CCM_DIR, "task-sessions-v1");
const REVIEWABLE = new Set(["done", "completed", "success", "failed", "blocked", "cancelled", "canceled", "interrupted", "waiting_user", "recovery_required"]);
const UNFINISHED = new Set(["failed", "blocked", "cancelled", "canceled", "interrupted", "recovery_required"]);
const text = (value, max = 4000) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const taskStatus = (task) => text(task?.status, 80).toLowerCase();
const taskIdOf = (task) => text(task?.id || task?.task_id, 180);
const activeRunIdOf = (task) => text(task?.active_run_id || task?.run_id || task?.task_run?.run_id, 180);
const now = () => new Date().toISOString();
function taskSessionArchiveState(task) {
    const policy = task?.task_spec?.task_session_archive_policy || (0, task_workflow_model_1.resolveTaskSessionArchivePolicy)(task);
    const status = taskStatus(task);
    if (policy !== "user_confirm" && policy !== "auto_terminal")
        return { eligible: false, policy: "", reason: REVIEWABLE.has(status) ? "archive_policy_missing" : "task_not_terminal" };
    if (!REVIEWABLE.has(status))
        return { eligible: false, policy, reason: "task_not_terminal" };
    if (policy === "auto_terminal")
        return { eligible: status !== "waiting_user", policy, reason: status === "waiting_user" ? "awaiting_confirmation" : "auto_terminal" };
    if (["done", "completed", "success"].includes(status) && task?.acceptance_state === "accepted") {
        return { eligible: true, policy, reason: "user_accepted" };
    }
    if (UNFINISHED.has(status) && task?.task_session_archive?.decision === "close_unfinished") {
        return { eligible: true, policy, reason: "user_closed_unfinished" };
    }
    return { eligible: false, policy, reason: "awaiting_user_acceptance" };
}
function taskSessionCreationState(task) {
    const policy = task?.task_spec?.task_session_creation_policy || (0, task_workflow_model_1.resolveTaskSessionCreationPolicy)(task);
    if (policy === "on_create")
        return { eligible: true, policy, reason: "on_create" };
    const archive = taskSessionArchiveState(task);
    return { eligible: archive.eligible, policy, reason: archive.reason, archive_policy: archive.policy };
}
function taskSessionArchiveActions(task) {
    if (task?.task_spec?.task_session_archive_policy !== "user_confirm" || task?.task_session_archive?.decision || task?.acceptance_state === "accepted")
        return [];
    if (taskStatus(task) === "waiting_user" && task?.acceptance_state === "awaiting_user_acceptance")
        return ["accept", "revise"];
    return UNFINISHED.has(taskStatus(task)) ? ["archive_unfinished"] : [];
}
function taskSessionOutputRevision(task) {
    return text(task?.user_acceptance?.output_revision || task?.final_output_revision || task?.revision, 180);
}
function readStore() {
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(FILE, { schema: "ccm-task-session-store-v1", sessions: [] });
    const rows = Array.isArray(raw) ? raw : raw?.sessions;
    return (Array.isArray(rows) ? rows : []).filter((row) => row && taskIdOf(row) && text(row.session_id));
}
function writeStore(sessions) {
    (0, atomic_json_file_1.writeJsonAtomic)(FILE, { schema: "ccm-task-session-store-v1", version: 1, updated_at: now(), sessions });
}
function originOf(task) {
    return text(task?.task_spec?.origin || task?.origin || task?.source_channel || task?.request_origin || "dispatch", 80).toLowerCase();
}
function firstText(task, keys, max = 12000) {
    for (const key of keys) {
        const value = task?.[key];
        if (typeof value === "string" && value.trim())
            return text(value, max);
    }
    return "";
}
function publicRun(run) {
    if (!run)
        return null;
    return {
        run_id: text(run.run_id, 180), task_id: text(run.task_id, 180), trigger: text(run.trigger, 40),
        attempt_id: text(run.attempt_id || run.attemptId || `${run.run_id}:${run.attempt || 1}`, 240),
        status: text(run.status, 60), attempt: Math.max(1, Number(run.attempt || 1)), parent_run_id: text(run.parent_run_id, 180),
        created_at: text(run.created_at, 80), updated_at: text(run.updated_at, 80),
        verification_result: run.verification_result || null, delivery_result: run.delivery_result || null,
        evidence_count: Array.isArray(run.execution_evidence) ? run.execution_evidence.length : 0,
        automation_definition_id: text(run.automation_definition_id, 180),
        automation_definition_revision: Number(run.automation_definition_revision || 0) || null,
    };
}
function buildDossier(task, runs) {
    const spec = task?.task_spec || {};
    const files = task?.file_changes?.files || task?.delivery_summary?.actual_file_changes || task?.receipt?.filesChanged || [];
    const verification = task?.verification || task?.delivery_summary?.verification || task?.receipt?.verification || [];
    const status = taskStatus(task);
    const result = firstText(task, ["status_detail", "result", "final_report", "final_reply", "delivery_summary"], 8000)
        || (status === "done" || status === "completed" ? "任务已完成" : `任务${status || "已结束"}`);
    const intake = task?.intake_draft || task?.intakeDraft || task?.workflow_meta?.intake || {};
    const plan = task?.decomposition_plan || task?.requirement_decomposition || intake?.decomposition_plan || task?.mission_plan || intake;
    const clarificationQuestions = Array.isArray(intake?.clarification_questions)
        ? intake.clarification_questions.slice(0, 30)
        : Array.isArray(plan?.clarification_questions) ? plan.clarification_questions.slice(0, 30) : [];
    const creationPolicy = spec.task_session_creation_policy || (0, task_workflow_model_1.resolveTaskSessionCreationPolicy)(task);
    const archivePolicy = spec.task_session_archive_policy || (0, task_workflow_model_1.resolveTaskSessionArchivePolicy)(task);
    const lifecycle = creationPolicy === "on_create"
        ? (task?.intake_state === "awaiting_confirmation" ? "awaiting_confirmation" : ["pending", "queued", "planning"].includes(status) ? (task?.intake_state === "confirmed" || task.auto_execute !== false ? "running" : "planning") : REVIEWABLE.has(status) ? "available" : "running")
        : "available";
    return {
        original_request: firstText(task, ["user_message", "request", "message", "description", "business_goal", "goal", "title"], 12000),
        title: text(task?.title || task?.name || spec.goal || "未命名任务", 400),
        origin: originOf(task),
        target: { project: text(task?.target_project || task?.project || spec?.target?.project, 400), group_id: text(task?.group_id || spec?.target?.group_id, 240) },
        scope: text(spec.scope || task?.scope || task?.allowed_scope, 4000),
        acceptance: spec.acceptance_policy || task?.acceptance_policy || task?.acceptance_policy_snapshot || null,
        execution_policy: spec.execution_policy || task?.workflow_policy_snapshot || null,
        approval_policy: spec.approval_policy || task?.approval_policy || null,
        attachments: Array.isArray(task?.attachments) ? task.attachments.slice(0, 100) : [],
        task_spec: { revision: Number(spec.revision || task?.task_spec_revision || 1), checksum: text(spec.checksum || spec.plan_checksum, 160) },
        creation_policy: creationPolicy,
        archive_policy: archivePolicy,
        lifecycle,
        plan,
        plan_history: (task.plan_history || []).map((item) => ({ revision: item.revision, plan: item.plan, at: item.at })),
        planning_updating: task.planning_operation?.status === "running",
        archived: taskSessionArchiveState(task).eligible,
        clarification_questions: clarificationQuestions,
        intake_state: text(task?.intake_state || intake?.state, 80),
        confirmation_state: text(task?.acceptance_state || (task?.intake_state === "confirmed" ? "confirmed" : "pending"), 80),
        plan_revision: Number(task?.plan_revision_count || task?.plan_revision || spec.plan_revision || 1),
        status,
        result,
        unfinished: status === "done" || status === "completed" || status === "success" ? [] : [text(task?.status_detail || result, 2000)],
        file_changes: Array.isArray(files) ? files.slice(0, 200) : [],
        verification: Array.isArray(verification) ? verification.slice(0, 100) : [],
        delivery: task?.delivery_summary || task?.delivery_result || null,
        runs: runs.map(publicRun),
        source_ref: task?.source_conversation_ref || null,
        last_updated_at: text(task?.updated_at || task?.updatedAt, 80),
    };
}
function resultMessage(task, run) {
    const dossier = buildDossier(task, run ? [run] : []);
    return {
        message_id: `task-session:${taskIdOf(task)}:result:${text(run?.run_id || task?.revision || "initial", 180)}`,
        task_id: taskIdOf(task), role: "assistant", content: dossier.result,
        ...(run?.run_id ? { run_id: text(run.run_id, 180) } : {}), created_at: text(task?.updated_at, 80) || now(),
        source_ref: { task_id: taskIdOf(task), run_id: run?.run_id || "", revision: Number(task?.revision || 0) },
    };
}
function hasTerminalResult(task, run) {
    const status = text(run?.status || task?.status, 60).toLowerCase();
    return ["done", "completed", "success", "failed", "blocked", "cancelled", "canceled", "interrupted", "waiting_user", "recovery_required"].includes(status)
        && !!(run?.run_id || task?.final_report || task?.final_reply || task?.result || task?.status_detail);
}
function buildInitialMessages(task, runs) {
    const taskId = taskIdOf(task);
    const created = text(task?.created_at || task?.createdAt, 80) || now();
    const dossier = buildDossier(task, runs);
    const related = collectRelatedMessages(task, taskId);
    const initial = [
        { message_id: `task-session:${taskId}:context`, task_id: taskId, role: "system_context", content: JSON.stringify(dossier), created_at: created, source_ref: { task_id: taskId, revision: Number(task?.revision || 0) } },
        { message_id: `task-session:${taskId}:request`, task_id: taskId, role: "user", content: dossier.original_request || dossier.title, created_at: created, source_ref: { message_id: text(task?.message_id || task?.anchor_message_id, 180), task_id: taskId } },
        ...related,
    ];
    const terminalRuns = runs.filter(run => hasTerminalResult(task, run));
    if (terminalRuns.length)
        initial.push(...terminalRuns.slice().reverse().map(run => resultMessage(task, run)));
    return initial.filter((item, index, all) => all.findIndex(other => other.message_id === item.message_id) === index).slice(-500);
}
function collectRelatedMessages(task, taskId) {
    const source = task?.source_conversation_ref || {};
    const rows = [];
    try {
        if (task?.group_id && task?.group_session_id)
            rows.push(...((0, storage_1.getGroupMessages)(String(task.group_id), String(task.group_session_id)) || []));
        else if (task?.target_project && task?.project_session_id)
            rows.push(...((0, project_session_compaction_1.listProjectSessionHistoryMessages)(String(task.target_project), String(task.project_session_id)) || []));
        else if (source.scope === "global") {
            const file = path.join(utils_1.CCM_DIR, "global-agent-history.json");
            if (require("fs").existsSync(file)) {
                const store = JSON.parse(require("fs").readFileSync(file, "utf8"));
                const session = (store.sessions || []).find((item) => String(item.id || item.session_id || "") === String(source.exactSessionId || ""));
                rows.push(...(session?.messages || []));
            }
        }
    }
    catch { }
    const anchor = text(source.messageId || task?.message_id || task?.anchor_message_id, 180);
    return rows.filter(item => String(item?.task_id || item?.taskId || "") === taskId || (anchor && String(item?.id || item?.message_id || "") === anchor))
        .map(item => ({
        message_id: `source:${String(item.id || item.message_id || crypto.createHash("sha256").update(JSON.stringify(item)).digest("hex"))}`,
        task_id: taskId,
        role: (item.role === "assistant" ? "assistant" : "user"),
        content: text(item.content || item.text, 20_000),
        created_at: text(item.timestamp || item.created_at, 80) || now(),
        source_ref: { task_id: taskId, source_message_id: String(item.id || item.message_id || "") },
    })).filter(item => item.content);
}
function taskSessionStorePath() { return FILE; }
function getTaskSession(taskId) { const id = text(taskId, 180); return readStore().find(row => row.task_id === id) || null; }
function listTaskSessions() { return readStore(); }
function isTaskSessionAvailable(task) { return !!getTaskSession(taskIdOf(task)); }
function reconcileTaskSessions() {
    const results = [];
    for (const task of (0, db_1.loadTasks)()) {
        if (!taskIdOf(task) || !taskSessionCreationState(task).eligible)
            continue;
        try {
            results.push(materializeTaskSession(task));
        }
        catch (error) {
            results.push({ available: false, created: false, reason: String(error?.message || error) });
        }
    }
    return { checked: results.length, created: results.filter(item => item.created).length, available: results.filter(item => item.available).length, failed: results.filter(item => item.available === false && item.reason !== "task_not_terminal").length };
}
function materializeTaskSession(taskInput) {
    const task = taskInput || (0, db_1.getTaskById)(text(taskInput?.id || taskInput?.task_id, 180));
    const taskId = taskIdOf(task);
    if (!task || !taskId)
        return { available: false, created: false, reason: "task_missing" };
    const existingSession = getTaskSession(taskId);
    const creationState = taskSessionCreationState(task);
    if (!creationState.eligible && !existingSession)
        return { available: false, created: false, reason: creationState.reason, task_id: taskId };
    return (0, atomic_json_file_1.withFileLock)(LOCK, () => {
        const sessions = readStore();
        const runs = (0, task_run_store_1.listTaskRuns)(taskId);
        const runIds = runs.map(run => text(run.run_id, 180)).filter(Boolean);
        const existing = sessions.find(row => row.task_id === taskId);
        if (existing) {
            const known = new Set(existing.messages.map(item => item.message_id));
            const additions = [
                ...collectRelatedMessages(task, taskId),
                ...runs.filter(run => hasTerminalResult(task, run)).map(run => resultMessage(task, run)),
            ].filter(item => !known.has(item.message_id));
            const dossier = buildDossier(task, runs);
            const nextSpecRevision = Number(task?.task_spec?.revision || task?.task_spec_revision || existing.task_spec_revision || 1);
            const nextLifecycle = dossier.lifecycle;
            const nextActiveRunId = activeRunIdOf(task);
            const unchanged = additions.length === 0
                && existing.lifecycle === nextLifecycle
                && existing.creation_policy === dossier.creation_policy
                && existing.archive_policy === dossier.archive_policy
                && existing.plan_revision === dossier.plan_revision
                && existing.task_spec_revision === nextSpecRevision
                && existing.active_run_id === nextActiveRunId
                && JSON.stringify(existing.run_ids || []) === JSON.stringify(runIds)
                && JSON.stringify(existing.dossier || {}) === JSON.stringify(dossier);
            if (unchanged)
                return { available: true, created: false, session: existing };
            const next = {
                ...existing,
                updated_at: now(),
                revision: existing.revision + 1,
                lifecycle: nextLifecycle,
                creation_policy: dossier.creation_policy,
                archive_policy: dossier.archive_policy,
                plan_revision: dossier.plan_revision,
                task_spec_revision: nextSpecRevision,
                active_run_id: nextActiveRunId,
                run_ids: runIds,
                dossier,
                messages: [...existing.messages, ...additions].slice(-500),
            };
            sessions[sessions.indexOf(existing)] = next;
            writeStore(sessions);
            return { available: true, created: false, session: next };
        }
        const timestamp = now();
        const dossier = buildDossier(task, runs);
        const session = {
            schema: "ccm-task-session-v1", task_id: taskId, session_id: `task_session_${crypto.randomUUID()}`,
            title: text(task?.title || task?.name || task?.task_spec?.goal || "任务会话", 240), origin: originOf(task), status: "available",
            lifecycle: dossier.lifecycle,
            creation_policy: dossier.creation_policy,
            archive_policy: dossier.archive_policy,
            plan_revision: dossier.plan_revision,
            task_spec_revision: Number(task?.task_spec?.revision || task?.task_spec_revision || 1),
            created_at: timestamp, updated_at: timestamp, materialized_at: timestamp, revision: 1, active_run_id: activeRunIdOf(task), run_ids: runIds,
            dossier, messages: buildInitialMessages(task, runs),
            pending_follow_up: null,
        };
        sessions.push(session);
        writeStore(sessions);
        return { available: true, created: true, session };
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function appendTaskSessionMessage(taskId, input) {
    const id = text(taskId, 180);
    const content = text(input?.content || input?.message, 20_000);
    if (!id || !content)
        throw new Error("任务会话消息不能为空");
    return (0, atomic_json_file_1.withFileLock)(LOCK, () => {
        const sessions = readStore();
        const index = sessions.findIndex(row => row.task_id === id);
        if (index < 0)
            throw new Error("任务会话尚未生成");
        const current = sessions[index];
        const requestedMessageId = text(input?.message_id, 180);
        const existing = requestedMessageId ? current.messages.find(item => item.message_id === requestedMessageId) : null;
        if (existing)
            return existing;
        const attachments = Array.isArray(input?.attachments)
            ? input.attachments.slice(0, 20).map((item) => ({
                name: text(item?.name || item?.filename, 240),
                filename: text(item?.filename || item?.name, 240),
                size: Math.max(0, Number(item?.size || 0)),
                content_type: text(item?.content_type || item?.contentType, 120),
                stored: item?.stored !== false,
            })).filter((item) => item.name)
            : [];
        const message = { message_id: requestedMessageId || `task-session:${id}:message:${crypto.randomUUID()}`, task_id: id, role: input?.role === "assistant" ? "assistant" : "user", content, created_at: now(), ...(text(input?.run_id, 180) ? { run_id: text(input.run_id, 180) } : {}), source_ref: input?.source_ref || null, ...(attachments.length ? { attachments } : {}) };
        const next = { ...current, revision: current.revision + 1, updated_at: now(), messages: [...current.messages, message].slice(-500) };
        sessions[index] = next;
        writeStore(sessions);
        return message;
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function setTaskSessionPendingFollowUp(taskId, pending) {
    const id = text(taskId, 180);
    return (0, atomic_json_file_1.withFileLock)(LOCK, () => {
        const sessions = readStore();
        const index = sessions.findIndex(row => row.task_id === id);
        if (index < 0)
            throw new Error("任务会话尚未生成");
        const next = { ...sessions[index], pending_follow_up: pending || null, revision: sessions[index].revision + 1, updated_at: now() };
        sessions[index] = next;
        writeStore(sessions);
        return next;
    }, { timeoutMs: 10_000, staleMs: 60_000 });
}
function buildTaskSessionDiscussionReply(taskId, question = "") {
    const session = getTaskSession(taskId);
    if (!session)
        throw new Error("任务会话尚未生成");
    const dossier = session.dossier || {};
    const statusLabels = { completed: "已完成", done: "已完成", success: "已完成", failed: "失败", blocked: "阻塞", waiting_user: "等待确认", recovery_required: "需要人工恢复" };
    const status = statusLabels[String(dossier.status || "").toLowerCase()] || String(dossier.status || "已结束");
    const result = text(dossier.result || "暂无执行结果", 1800);
    const unfinished = Array.isArray(dossier.unfinished) ? dossier.unfinished.filter(Boolean).map(item => text(item, 500)).slice(0, 3) : [];
    const prefix = question ? `我已根据任务档案查看你的问题：“${text(question, 240)}”。` : "我已读取这个任务的档案。";
    const lines = [`${prefix} 当前任务状态：${status}。`, `执行结果：${result}`];
    if (unfinished.length)
        lines.push(`仍需处理：${unfinished.join("；")}`);
    lines.push("这是一条任务档案答复，没有启动新的代码执行。若需要修复或继续开发，请勾选“修复/继续执行请求”，确认后我会创建新的运行。 ");
    return lines.join("\n");
}
function taskSessionEvents(taskId, after = 0) {
    const task = (0, db_1.getTaskById)(text(taskId, 180));
    if (!task)
        return [];
    const rows = [];
    for (const item of Array.isArray(task.workflow_timeline) ? task.workflow_timeline : [])
        rows.push({ kind: "timeline", at: item.at || task.updated_at, type: item.type || "task_event", title: text(item.title || item.detail, 300), status: text(item.status, 40), data: item.data || null });
    for (const run of (0, task_run_store_1.listTaskRuns)(taskId))
        for (const item of Array.isArray(run.history) ? run.history : [])
            rows.push({ kind: "run", at: item.at || run.updated_at, type: "run_status", title: `运行 ${text(run.status, 40)}`, status: text(item.status || run.status, 40), run_id: run.run_id, data: { attempt: run.attempt, trigger: run.trigger } });
    return rows.sort((a, b) => String(a.at).localeCompare(String(b.at)) || String(a.type).localeCompare(String(b.type)))
        .map((item, index) => {
        const stableKey = crypto.createHash("sha256").update(JSON.stringify({
            taskId,
            kind: item.kind,
            type: item.type,
            runId: item.run_id || "",
            at: item.at || "",
            title: item.title || "",
            status: item.status || "",
        })).digest("hex").slice(0, 24);
        return { event_id: `task-session-event:${taskId}:${stableKey}`, sequence: index + 1, ...item };
    })
        .filter(item => item.sequence > Math.max(0, Number(after || 0)));
}
//# sourceMappingURL=task-session-store.js.map