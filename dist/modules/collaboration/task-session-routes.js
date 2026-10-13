"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlanningTask = void 0;
exports.handleTaskSessionRoutes = handleTaskSessionRoutes;
const task_session_boundary_1 = require("./task-session-boundary");
const user_workflow_projection_1 = require("../../agents/user-workflow-projection");
const task_session_attachments_1 = require("./task-session-attachments");
const task_session_source_sync_1 = require("./task-session-source-sync");
const task_session_message_routing_1 = require("./task-session-message-routing");
const task_session_message_validation_1 = require("./task-session-message-validation");
const bounded_sse_1 = require("../../system/bounded-sse");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const task_session_store_1 = require("./task-session-store");
const task_session_planning_1 = require("./task-session-planning");
var task_session_planning_2 = require("./task-session-planning");
Object.defineProperty(exports, "updatePlanningTask", { enumerable: true, get: function () { return task_session_planning_2.updatePlanningTask; } });
const task_run_store_1 = require("./task-run-store");
const task_context_1 = require("../../tasks/task-context");
const agent_run_consistency_1 = require("../../agents/agent-run-consistency");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
function readBody(req, taskId) {
    return (0, utils_1.collectRequestBuffer)(req).then(async (buffer) => {
        if (!buffer.length)
            return {};
        const contentType = String(req.headers?.["content-type"] || "");
        if (contentType.toLowerCase().includes("multipart/form-data")) {
            const boundary = (0, utils_1.getMultipartBoundary)(contentType);
            if (!boundary)
                throw new Error("Multipart 请求缺少 boundary");
            const multipart = (0, utils_1.parseMultipart)(buffer, boundary);
            const fields = { ...(multipart.fields || {}) };
            for (const key of ["execution_intent", "new_topic"]) {
                if (key in fields)
                    fields[key] = ["1", "true", "yes", "on"].includes(String(fields[key]).toLowerCase());
            }
            if (multipart.files?.length && !taskId)
                throw new Error("该操作不支持附件上传");
            fields.attachments = await Promise.all((multipart.files || []).map((file) => (0, task_session_attachments_1.retainTaskSessionUpload)(taskId, file)));
            return fields;
        }
        try {
            return JSON.parse(buffer.toString("utf8"));
        }
        catch {
            throw new Error("请求 JSON 无效");
        }
    });
}
function taskFor(id) {
    const taskId = decodeURIComponent(String(id || ""));
    return { taskId, task: (0, db_1.getTaskById)(taskId) || (0, db_1.loadTasks)().find((row) => String(row?.id || "") === taskId) || null };
}
function planningActions(task, session) {
    if (task?.planning_operation?.status === "running")
        return [];
    const lifecycle = String(session?.lifecycle || "").toLowerCase();
    const intakeState = String(task?.intake_state || "").toLowerCase();
    if (lifecycle === "planning" || lifecycle === "awaiting_confirmation" || intakeState === "awaiting_confirmation") {
        const actions = ["answer_clarification", "revise_plan"];
        if (!Array.isArray(session?.dossier?.clarification_questions) || session.dossier.clarification_questions.length === 0)
            actions.push("confirm_execution");
        return actions;
    }
    return [];
}
function latestAttemptForTask(taskId) {
    return Math.max(0, ...(0, task_run_store_1.listTaskRuns)(taskId).map((run) => Number(run?.attempt || run?.execution_attempt || 0)));
}
function denied(res, task, auth, action = "use") {
    if (!task || !(0, access_policy_1.hasTaskResourceAccess)(task, auth, action)) {
        (0, utils_1.sendJson)(res, { success: false, error: task ? "当前账户没有该任务的访问权限" : "任务不存在", code: task ? "RESOURCE_ACCESS_DENIED" : "TASK_NOT_FOUND" }, task ? 403 : 404);
        return true;
    }
    return false;
}
function handleTaskSessionRoutes(pathname, req, res, parsed, deps = {}) {
    const detailMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)$/);
    const messagesMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)\/messages$/);
    const eventsMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)\/events$/);
    const eventsStreamMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)\/events\/stream$/);
    const actionsMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)\/actions$/);
    const materializeMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)\/materialize$/);
    const attachmentMatch = pathname.match(/^\/api\/task-sessions\/([^/]+)\/attachments\/([a-f0-9]{64})$/);
    const match = detailMatch || messagesMatch || eventsMatch || eventsStreamMatch || actionsMatch || materializeMatch || attachmentMatch;
    if (!match)
        return false;
    const { taskId } = taskFor(match[1]);
    let task = (0, db_1.getTaskById)(taskId) || (0, db_1.loadTasks)().find((row) => String(row?.id || "") === taskId) || null;
    if (denied(res, task, req.ccmAuth, req.method === "POST" ? "manage" : "use"))
        return true;
    if (task?.planning_operation?.status === "running")
        task = (0, task_session_planning_1.reconcilePlanningOperation)(task);
    const opening = (0, task_session_boundary_1.taskSessionOpeningState)(task);
    if (!opening.open) {
        (0, utils_1.sendJson)(res, { success: false, available: false, code: "TASK_SESSION_NOT_OPEN", reason: opening.reason,
            error: "任务会话将在确认完成或关闭未完成任务后开放；当前进展请在来源聊天查看" }, 409);
        return true;
    }
    if (attachmentMatch && ["GET", "HEAD"].includes(req.method)) {
        const asset = (0, task_session_attachments_1.readTaskSessionAttachment)(taskId, attachmentMatch[2]);
        if (!asset) {
            (0, utils_1.sendJson)(res, { success: false, code: "TASK_ATTACHMENT_NOT_FOUND" }, 404);
            return true;
        }
        res.writeHead(200, { "Content-Type": "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
            "Content-Length": asset.metadata.size, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.metadata.filename)}` });
        if (req.method === "HEAD")
            res.end();
        else {
            const stream = require("fs").createReadStream(asset.file);
            stream.on("error", () => res.destroy());
            res.on("close", () => stream.destroy());
            stream.pipe(res);
        }
        return true;
    }
    if (detailMatch && req.method === "GET") {
        void (async () => {
            await require("./task-session-source-attachments").retainTaskSessionSourceAttachments(taskId);
            try {
                (0, task_session_source_sync_1.reconcilePendingTaskSourceSync)(taskId);
            }
            catch {
                (0, utils_1.sendJson)(res, { success: false, code: "TASK_SESSION_SOURCE_SYNC_PENDING", error: "任务上下文同步待修复，尚不能继续开发" }, 409);
                return true;
            }
            let session = (0, task_session_store_1.getTaskSession)(taskId);
            if (session || (0, task_session_store_1.taskSessionCreationState)(task).eligible) {
                const projected = (0, task_session_store_1.materializeTaskSession)(task);
                session = projected.session || null;
            }
            if (!session) {
                (0, utils_1.sendJson)(res, { success: false, available: false, error: "任务尚未结束，任务会话将在终态后生成", code: "TASK_SESSION_NOT_READY", reason: "source_conversation_task_pending", source_session_id: task?.source_conversation_ref?.exactSessionId || task?.exact_session_id || "" }, 409);
                return true;
            }
            const identity = (0, task_context_1.taskTimelineIdentity)(task);
            const executionIdentity = identity.exactSessionId ? {
                scope: identity.scope,
                scope_id: identity.scopeId,
                exact_session_id: identity.exactSessionId,
                task_id: taskId,
                attempt: Number(task?.execution_attempt || task?.attempt || latestAttemptForTask(taskId) || 0),
            } : null;
            const activeRunId = task.active_run_id || task.run_id || task.task_run?.run_id || "";
            (0, utils_1.sendJson)(res, { success: true, user_workflow: (0, user_workflow_projection_1.readUserWorkflow)(task), session, runs: (0, task_run_store_1.listTaskRuns)(taskId), execution_identity: executionIdentity, governance: {
                    activity: (0, agent_governance_store_1.listAgentActivity)({ taskId, limit: 80 }),
                    approvals: activeRunId ? (0, agent_governance_store_1.listAgentApprovals)(activeRunId) : [],
                    artifacts: activeRunId ? (0, agent_governance_store_1.listAgentRunArtifacts)(activeRunId) : [],
                    dependencies: (0, agent_governance_store_1.listAgentTaskDependencies)(taskId),
                    secrets: activeRunId ? (0, agent_governance_store_1.listAgentRunSecrets)(activeRunId).map(item => ({ ...item, secretRef: "[reference]" })) : [],
                    consistency: (0, agent_run_consistency_1.buildTaskRunConsistencyProjection)(task),
                }, task: { id: task.id, title: task.title || task.name || "", status: task.status, group_id: task.group_id || "", target_project: task.target_project || "", active_run_id: activeRunId, task_session_creation_policy: session.creation_policy, task_session_archive_policy: session.archive_policy, spec_checksum: task.task_spec?.checksum || "", plan_revision: session.plan_revision, pause_control: task.pause_control || null }, available: true, lifecycle: session.lifecycle, available_actions: planningActions(task, session) });
        })().catch((error) => (0, utils_1.sendJson)(res, { success: false, code: "TASK_SESSION_ATTACHMENT_SYNC_PENDING", error: "任务附件同步未完成，请重试" }, 503));
        return true;
    }
    if (messagesMatch && req.method === "GET") {
        let session = (0, task_session_store_1.getTaskSession)(taskId);
        if (!session && (0, task_session_store_1.taskSessionCreationState)(task).eligible)
            session = (0, task_session_store_1.materializeTaskSession)(task).session || null;
        if (!session) {
            (0, utils_1.sendJson)(res, { success: false, available: false, error: "任务会话尚未生成", code: "TASK_SESSION_NOT_READY" }, 409);
            return true;
        }
        (0, utils_1.sendJson)(res, { success: true, task_id: taskId, messages: session.messages || [], revision: session.revision });
        return true;
    }
    if (eventsMatch && req.method === "GET") {
        if (!(0, task_session_store_1.getTaskSession)(taskId) && (0, task_session_store_1.taskSessionCreationState)(task).eligible)
            (0, task_session_store_1.materializeTaskSession)(task);
        if (!(0, task_session_store_1.getTaskSession)(taskId)) {
            (0, utils_1.sendJson)(res, { success: false, available: false, error: "任务会话尚未生成", code: "TASK_SESSION_NOT_READY" }, 409);
            return true;
        }
        const after = Number(parsed?.query?.after || parsed?.query?.sequence || 0);
        (0, utils_1.sendJson)(res, { success: true, task_id: taskId, events: (0, task_session_store_1.taskSessionEvents)(taskId, after), last_sequence: (0, task_session_store_1.taskSessionEvents)(taskId).length });
        return true;
    }
    if (eventsStreamMatch && req.method === "GET") {
        if (!(0, task_session_store_1.getTaskSession)(taskId) && (0, task_session_store_1.taskSessionCreationState)(task).eligible)
            (0, task_session_store_1.materializeTaskSession)(task);
        if (!(0, task_session_store_1.getTaskSession)(taskId)) {
            (0, utils_1.sendJson)(res, { success: false, available: false, error: "任务会话尚未生成", code: "TASK_SESSION_NOT_READY" }, 409);
            return true;
        }
        const cursor = Math.max(0, Number(req.headers["last-event-id"] || parsed?.query?.after || parsed?.query?.cursor || 0));
        res.writeHead(200, {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        });
        const writer = (0, bounded_sse_1.createBoundedSseWriter)(res);
        writer.write("retry: 1500\n\n");
        let last = cursor;
        let closed = false;
        const flush = () => {
            if (closed)
                return;
            const rows = (0, task_session_store_1.taskSessionEvents)(taskId, last);
            for (const event of rows) {
                const sequence = Number(event?.sequence || 0);
                if (!sequence || sequence <= last)
                    continue;
                last = sequence;
                try {
                    if (!writer.write(`id: ${sequence}\nevent: task_session\ndata: ${JSON.stringify(event)}\n\n`)) {
                        closed = true;
                        break;
                    }
                }
                catch {
                    closed = true;
                }
            }
        };
        flush();
        const interval = setInterval(flush, 1200);
        interval.unref?.();
        const heartbeat = setInterval(() => {
            if (closed)
                return;
            try {
                writer.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
            }
            catch {
                closed = true;
            }
        }, 15000);
        heartbeat.unref?.();
        const cleanup = () => { closed = true; clearInterval(interval); clearInterval(heartbeat); };
        req.once("close", cleanup);
        writer.onClose(cleanup);
        return true;
    }
    if (materializeMatch && req.method === "POST") {
        const result = (0, task_session_store_1.materializeTaskSession)(task);
        (0, utils_1.sendJson)(res, { success: !!result.available, ...result }, result.available ? 200 : 409);
        return true;
    }
    if (messagesMatch && req.method === "POST") {
        void readBody(req, taskId).then(async (payload) => {
            const currentTask = (0, db_1.getTaskById)(taskId);
            if (payload.new_topic === true)
                throw Object.assign(new Error("独立新话题请在来源聊天发送，不会写入当前任务会话"), { code: "TASK_SESSION_NEW_TOPIC", status: 409 });
            const priorPending = (0, task_session_store_1.getTaskSession)(taskId)?.pending_follow_up;
            if (payload.message_id && priorPending?.message_id === payload.message_id && priorPending.status !== "awaiting_confirmation") {
                if (String(payload.content || payload.message || "").trim() !== priorPending.content)
                    throw Object.assign(new Error("同一执行请求身份不能修改内容"), { code: "TASK_SESSION_MESSAGE_ID_CONFLICT", status: 409 });
                (0, utils_1.sendJson)(res, { success: true, replayed: true, pending_follow_up: priorPending.status });
                return;
            }
            const messageType = String(payload?.message_type || payload?.type || (payload?.execution_intent ? "execution_request" : "discussion")).trim().toLowerCase();
            if (!["discussion", "execution_request", "clarification_answer", "plan_feedback"].includes(messageType))
                throw Object.assign(new Error("任务消息类型无效"), { code: "TASK_SESSION_MESSAGE_TYPE_INVALID", status: 400 });
            const executionIntent = (0, task_session_message_validation_1.taskSessionExecutionIntent)(payload, messageType);
            (0, task_session_message_validation_1.validateTaskSessionExecutionTarget)(currentTask, payload, executionIntent);
            if (messageType === "clarification_answer" || messageType === "plan_feedback")
                (0, task_session_planning_1.assertPlanningState)(currentTask);
            let discussionAnswer = "";
            if (messageType === "discussion" && !executionIntent) {
                const route = await (0, task_session_message_routing_1.routeTaskSessionDiscussion)(currentTask, payload, deps.taskSessionModelCall);
                if (route.relation !== "related_question" || route.confidence < 0.85) {
                    (0, utils_1.sendJson)(res, { success: false, code: route.relation === "task_change" ? "TASK_SESSION_EXECUTION_CONFIRMATION_REQUIRED" : "TASK_SESSION_MESSAGE_NOT_ASSOCIATED",
                        route, error: route.relation === "task_change" ? "请明确提交修复/继续执行请求，再确认执行" : "这条消息尚未关联当前任务，请在来源聊天发送或明确任务目标" }, 409);
                    return;
                }
                discussionAnswer = route.answer;
            }
            if (currentTask?.intake_state === "awaiting_confirmation" && executionIntent) {
                throw Object.assign(new Error("请先在执行前计划中回答问题或修改计划，再确认执行"), { code: "TASK_PLAN_CONFIRMATION_REQUIRED", status: 409 });
            }
            const message = (0, task_session_store_1.appendTaskSessionMessage)(taskId, { ...payload, role: "user", source_ref: { kind: "task_session_user_message", task_id: taskId,
                    task_session_id: (0, task_session_store_1.getTaskSession)(taskId)?.session_id, actor_type: "user", actor_id: req.ccmAuth?.userId || req.ccmAuth?.actorId || "local-user", message_type: messageType } });
            if (messageType === "clarification_answer" || messageType === "plan_feedback") {
                const updated = await (0, task_session_planning_1.updatePlanningTask)(currentTask, { ...payload, message_id: message.message_id, content: message.content, message_type: messageType }, deps);
                (0, utils_1.sendJson)(res, {
                    success: true,
                    message,
                    message_type: messageType,
                    planning_updated: updated.changed,
                    requires_confirmation: true,
                    next_action: "confirm_execution",
                });
                return;
            }
            if (executionIntent) {
                const mode = String(payload?.mode || "queue").toLowerCase() === "steer" ? "steer" : "queue";
                if (mode === "steer") {
                    const activeRunId = String(currentTask?.active_run_id || currentTask?.run_id || currentTask?.task_run?.run_id || "").trim();
                    const requestedRunId = String(payload?.active_run_id || "").trim();
                    const requestedAttemptId = String(payload?.attempt_id || "").trim();
                    const activeRun = requestedRunId ? (0, task_run_store_1.getTaskRun)(requestedRunId) : null;
                    const expectedAttemptId = activeRun ? `${activeRun.run_id}:${Number(activeRun.attempt || 1)}` : "";
                    const activeStatus = String(activeRun?.status || "").toLowerCase();
                    if (!activeRunId || requestedRunId !== activeRunId || !activeRun || !["queued", "pending", "running", "in_progress", "verifying", "resuming"].includes(activeStatus) || requestedAttemptId !== expectedAttemptId) {
                        throw Object.assign(new Error("当前没有可追加的活动执行，请改为排队等待"), { code: "TASK_SESSION_STEER_TARGET_INVALID", status: 409 });
                    }
                }
                (0, task_session_store_1.setTaskSessionPendingFollowUp)(taskId, {
                    message_id: message.message_id,
                    content: message.content,
                    requested_at: message.created_at,
                    status: "awaiting_confirmation",
                    mode,
                    active_run_id: String(payload?.active_run_id || ""),
                    attempt_id: String(payload?.attempt_id || ""),
                    spec_checksum: String(currentTask.task_spec?.checksum || ""),
                    plan_revision: Number(currentTask.plan_revision_count || currentTask.task_spec?.plan_revision || 1),
                });
            }
            const discussionReply = executionIntent ? null : (0, task_session_store_1.appendTaskSessionMessage)(taskId, {
                message_id: `task-session:${taskId}:reply:${message.message_id}`,
                role: "assistant",
                content: discussionAnswer || (0, task_session_store_1.buildTaskSessionDiscussionReply)(taskId, message.content),
                source_ref: { task_id: taskId, source_message_id: message.message_id, kind: "task_session_dossier_reply" },
            });
            (0, utils_1.sendJson)(res, { success: true, message, discussion_reply: discussionReply, execution_intent: executionIntent, requires_confirmation: executionIntent, pending_response: false, next_action: executionIntent ? "confirm_task_run" : "answer_in_task_session" });
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error), code: error?.code }, Number(error?.status || 400)));
        return true;
    }
    if (actionsMatch && req.method === "POST") {
        void readBody(req).then(async (payload) => {
            const currentTask = (0, db_1.getTaskById)(taskId);
            const action = String(payload?.action || "").trim().toLowerCase();
            const runId = String(payload?.run_id || payload?.runId || "").trim();
            if (action === "confirm_execution") {
                if (currentTask?.plan_confirmation?.key === payload.idempotency_key && payload.idempotency_key) {
                    (0, utils_1.sendJson)(res, { success: true, action, replayed: true, task: currentTask });
                    return;
                }
                if (!deps.confirmExecution) {
                    (0, utils_1.sendJson)(res, { success: false, error: "任务确认执行服务不可用", code: "TASK_CONFIRM_EXECUTION_UNAVAILABLE" }, 503);
                    return;
                }
                (0, task_session_planning_1.prepareTaskPlanConfirmation)(currentTask, payload);
                Promise.resolve(deps.confirmExecution({ task: currentTask, taskId, payload, req }))
                    .then((result) => (0, utils_1.sendJson)(res, { ...(result || { success: true }), action }))
                    .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error), code: error?.code || "TASK_CONFIRM_EXECUTION_FAILED" }, Number(error?.status || 409)));
                return;
            }
            if (action === "confirm_follow_up" || action === "reject_follow_up") {
                if (currentTask?.intake_state === "awaiting_confirmation")
                    throw Object.assign(new Error("请先确认执行前计划"), { code: "TASK_PLAN_CONFIRMATION_REQUIRED", status: 409 });
                const session = (0, task_session_store_1.getTaskSession)(taskId);
                const messageId = String(payload?.message_id || payload?.messageId || session?.pending_follow_up?.message_id || "").trim();
                const pending = session?.pending_follow_up;
                if (pending?.message_id === messageId && ((action === "confirm_follow_up" && pending.status === "accepted") || (action === "reject_follow_up" && pending.status === "rejected"))) {
                    (0, utils_1.sendJson)(res, { success: true, replayed: true, action, message_id: messageId });
                    return;
                }
                if (!session || !pending || pending.message_id !== messageId || pending.status !== "awaiting_confirmation") {
                    (0, utils_1.sendJson)(res, { success: false, error: "没有待确认的任务执行请求", code: "TASK_FOLLOW_UP_NOT_PENDING" }, 409);
                    return;
                }
                if (action === "reject_follow_up") {
                    (0, task_session_store_1.setTaskSessionPendingFollowUp)(taskId, { ...pending, status: "rejected" });
                    (0, utils_1.sendJson)(res, { success: true, action, message_id: messageId });
                    return;
                }
                if (pending.spec_checksum !== undefined && (pending.spec_checksum !== String(currentTask.task_spec?.checksum || "")
                    || pending.plan_revision !== Number(currentTask.plan_revision_count || currentTask.task_spec?.plan_revision || 1))) {
                    throw Object.assign(new Error("任务计划已变化，请重新提交并确认继续执行请求"), { code: "TASK_FOLLOW_UP_PLAN_STALE", status: 409 });
                }
                if (pending.mode === "steer") {
                    const activeRunId = String(currentTask?.active_run_id || currentTask?.run_id || currentTask?.task_run?.run_id || "").trim();
                    const targetRunId = String(pending.active_run_id || "").trim();
                    const targetAttemptId = String(pending.attempt_id || "").trim();
                    const targetRun = targetRunId ? (0, task_run_store_1.getTaskRun)(targetRunId) : null;
                    const expectedAttemptId = targetRun ? `${targetRun.run_id}:${Number(targetRun.attempt || 1)}` : "";
                    const status = String(targetRun?.status || "").toLowerCase();
                    if (!activeRunId || targetRunId !== activeRunId || !targetRun || !["queued", "pending", "running", "in_progress", "verifying", "resuming"].includes(status) || targetAttemptId !== expectedAttemptId) {
                        throw Object.assign(new Error("追加目标已发生变化，请重新提交为排队消息"), { code: "TASK_SESSION_STEER_TARGET_STALE", status: 409 });
                    }
                }
                if (!deps.confirmFollowUp) {
                    (0, utils_1.sendJson)(res, { success: false, error: "任务继续执行服务不可用", code: "TASK_FOLLOW_UP_UNAVAILABLE" }, 503);
                    return;
                }
                Promise.resolve(deps.confirmFollowUp({ task: currentTask, taskId, pending, payload, req }))
                    .then((result) => {
                    if (result?.success !== false)
                        (0, task_session_store_1.setTaskSessionPendingFollowUp)(taskId, { ...pending, status: "accepted" });
                    (0, utils_1.sendJson)(res, { ...(result || { success: true }), action, message_id: messageId });
                })
                    .catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error), code: error?.code || "TASK_FOLLOW_UP_FAILED" }, Number(error?.status || 409)));
                return;
            }
            if (["answer_clarification", "revise_plan"].includes(action)) {
                (0, task_session_planning_1.assertPlanningState)(currentTask);
                const kind = action === "answer_clarification" ? "clarification_answer" : "plan_feedback";
                const result = await (0, task_session_planning_1.updatePlanningTask)(currentTask, { ...payload, message_id: payload.message_id || payload.idempotency_key, message_type: kind }, deps);
                (0, task_session_store_1.appendTaskSessionMessage)(taskId, { ...payload, message_id: payload.message_id || payload.idempotency_key, role: "user" });
                (0, utils_1.sendJson)(res, { success: true, action, ...result });
                return;
            }
            if (action === "archive_unfinished" && deps.archiveUnfinished) {
                (0, utils_1.sendJson)(res, await deps.archiveUnfinished({ task: currentTask, payload, req }));
                return;
            }
            const run = runId ? (0, task_run_store_1.getTaskRun)(runId) : null;
            if (!run || run.task_id !== taskId) {
                (0, utils_1.sendJson)(res, { success: false, error: "必须提供属于该任务的 run_id", code: "TASK_RUN_REQUIRED" }, 409);
                return;
            }
            const guard = (0, task_run_store_1.validateActiveTaskRun)(currentTask, runId);
            if (!guard.ok) {
                (0, utils_1.sendJson)(res, { success: false, ...guard }, 409);
                return;
            }
            if (["pause", "resume", "retry", "cancel"].includes(action) && deps.taskRunAction) {
                Promise.resolve(deps.taskRunAction({ action, task: currentTask, run, payload, req, res }))
                    .then(result => (0, utils_1.sendJson)(res, result || { success: true, action }))
                    .catch(error => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error), code: error?.code }, Number(error?.status || 409)));
                return;
            }
            (0, utils_1.sendJson)(res, { success: false, error: `暂不支持任务会话操作：${action || "未指定"}`, code: "TASK_SESSION_ACTION_UNSUPPORTED" }, 409);
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error), code: error?.code }, Number(error?.status || 400)));
        return true;
    }
    return false;
}
//# sourceMappingURL=task-session-routes.js.map