"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileTaskPauseTree = void 0;
exports.finalizeTaskPauseAtSafeBoundary = finalizeTaskPauseAtSafeBoundary;
exports.requestTaskPauseTree = requestTaskPauseTree;
exports.resumeTaskPauseTree = resumeTaskPauseTree;
exports.handleTaskPauseRoutes = handleTaskPauseRoutes;
const task_conversation_links_1 = require("../../system/task-conversation-links");
const access_policy_1 = require("../system/access-policy");
const task_pause_control_1 = require("../../tasks/task-pause-control");
function taskIdFrom(value) {
    return String(value?.task_id || value?.taskId || value?.id || "").trim();
}
function readJsonRequest(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024)
                reject(new Error("请求内容过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求 JSON 格式无效"));
            }
        });
        req.on("error", reject);
    });
}
function descendantsOf(task, tasks) {
    const byId = new Map(tasks.map(item => [String(item?.id || ""), item]));
    const byParent = new Map();
    for (const item of tasks) {
        const parent = String(item?.parent_task_id || item?.parentTaskId || "");
        if (!parent)
            continue;
        byParent.set(parent, [...(byParent.get(parent) || []), item]);
    }
    const rows = [];
    const seen = new Set();
    const queue = [task];
    while (queue.length) {
        const current = queue.shift();
        const id = String(current?.id || "");
        if (!id || seen.has(id))
            continue;
        seen.add(id);
        rows.push(current);
        queue.push(...(byParent.get(id) || []));
        if (Array.isArray(current?.child_task_ids)) {
            queue.push(...current.child_task_ids.map((childId) => byId.get(String(childId))).filter(Boolean));
        }
    }
    return rows;
}
function terminal(task) {
    return ["done", "failed", "cancelled", "canceled", "reverted", "archived"]
        .includes(String(task?.status || "").toLowerCase());
}
function writerCount(taskId, deps) {
    return Math.max(0, Number(deps.listActiveAgentRuns({ taskId })?.length || 0));
}
function mutationConflict(task, payload, requireTarget = false) {
    const guard = (0, task_conversation_links_1.validateTaskMutationGuard)(task, payload, { requireTarget });
    return "error" in guard ? guard : null;
}
function appendPauseVisibleEvent(task, kind, deps) {
    const links = deps.buildTaskConversationLinks(task, [task])?.links || [];
    const link = links.find((item) => item.relation === "target" && item.available) || links.find((item) => item.available);
    if (!link)
        return;
    const control = task?.pause_control || task?.last_pause_control || {};
    const phase = String(control?.checkpoint?.phase || task?.acceptance_state || "executing");
    const title = kind === "requested" ? "正在暂停" : kind === "paused" ? "已安全暂停" : "已从暂停处继续";
    const summary = kind === "requested"
        ? "等待当前操作安全收口"
        : kind === "paused"
            ? "代码现场和子 Agent 会话已保留"
            : `已从${/accept|verify|review|summary|deliver/i.test(phase) ? "验证与交付" : /dispatch|queue|dependency/i.test(phase) ? "协调与分派" : "实施处理"}阶段继续`;
    deps.appendUserVisibleAgentEvent({
        eventId: `task:${task.id}:pause:${Math.max(0, Number(control?.pauseSequence || 0))}:${kind}`,
        scope: link.scope,
        scopeId: link.scopeId,
        exactSessionId: link.exactSessionId,
        ...(link.messageId ? { anchorMessageId: link.messageId } : {}),
        generation: Math.max(1, Number(task?.generation || task?.workflow_generation || 1)),
        taskId: String(task.id || ""),
        eventType: "agent_progress",
        display: { title, summary, status: kind === "requested" ? "running" : "success" },
        detail: {
            availableActions: kind === "paused"
                ? [{ id: "resume_paused", kind: "resume_paused", label: "继续", enabled: true, pauseSequence: Math.max(0, Number(control?.pauseSequence || 0)) }]
                : [],
            executionStage: { kind: /accept|verify|review|summary|deliver/i.test(phase) ? "verification_delivery" : /dispatch|queue|dependency/i.test(phase) ? "coordination_dispatch" : "project_execution" },
            pauseMilestone: {
                safe: kind !== "requested",
                kind,
                pauseSequence: Math.max(0, Number(control?.pauseSequence || 0)),
                phase,
                completedWorkItemCount: Array.isArray(control?.checkpoint?.completedWorkItemIds) ? control.checkpoint.completedWorkItemIds.length : 0,
            },
        },
    });
}
function markRequested(task, deps) {
    const activeWriters = writerCount(String(task.id || ""), deps);
    const sessions = deps.listTaskAgentSessions({ taskId: String(task.id || "") });
    const control = (0, task_pause_control_1.createTaskPauseRequest)(task, {
        pendingWriterCount: activeWriters,
        suspendedSessionCount: sessions.filter((item) => item.status === "suspended").length,
    });
    try {
        deps.requestActiveAgentRunPause?.({ taskId: String(task.id || ""), reason: "任务请求在最近安全检查点暂停" });
    }
    catch { }
    const updated = deps.updateTask(task.id, {
        pause_control: control,
        pause_sequence: control.pauseSequence,
        pause_previous_status: task.pause_previous_status || task.status,
        pause_previous_auto_execute: task.pause_previous_auto_execute ?? task.auto_execute,
        auto_execute: false,
        is_paused: true,
        paused: true,
        status_detail: activeWriters > 0 ? "正在暂停，等待当前操作安全收口" : "暂停请求已接收，正在确认没有活动写入",
    }) || task;
    const timer = setTimeout(() => {
        const current = deps.loadTasks().find((item) => String(item?.id || "") === String(task.id || ""));
        if (!current || !(0, task_pause_control_1.isTaskPauseRequested)(current))
            return;
        deps.updateTask(current.id, { status_detail: "正在暂停，当前操作仍在安全收口；可选择强制中断" });
        deps.appendTaskTimelineEvent(current.id, {
            type: "task_pause_waiting_long",
            title: "安全暂停仍在等待",
            detail: "已等待30秒；系统不会自动终止写入进程，可由用户选择强制中断",
            status: "warn",
            phase: current.pause_control?.checkpoint?.phase || "executing",
            data: { pause_sequence: current.pause_control?.pauseSequence || 0, content_stored: false },
        });
    }, task_pause_control_1.TASK_PAUSE_STUCK_MS);
    timer.unref?.();
    appendPauseVisibleEvent(updated, "requested", deps);
    deps.appendTaskTimelineEvent(task.id, {
        type: "task_pause_requested",
        title: "暂停请求已接收",
        detail: activeWriters > 0 ? `等待 ${activeWriters} 个活动写入收口` : "正在确认安全检查点",
        status: "active",
        phase: control.checkpoint?.phase || "executing",
        data: { pause_sequence: control.pauseSequence, pending_writer_count: activeWriters, content_stored: false },
    });
    return updated;
}
function finalizeTaskPauseAtSafeBoundary(task, deps, options = {}) {
    if ((0, task_pause_control_1.isTaskSafelyPaused)(task) || !(0, task_pause_control_1.isTaskPauseRequested)(task))
        return task;
    const activeWriters = writerCount(String(task.id || ""), deps);
    const runtimeHeld = deps.runningTaskIds?.has(String(task.id || "")) === true;
    if (activeWriters > 0 || (runtimeHeld && options.allowRuntimeHolder !== true)) {
        const control = (0, task_pause_control_1.updateTaskPauseProgress)(task, { state: "quiescing", pendingWriterCount: activeWriters + (runtimeHeld ? 1 : 0) });
        return deps.updateTask(task.id, { pause_control: control, status_detail: "正在暂停，等待当前操作安全收口" }) || task;
    }
    const suspended = deps.suspendTaskAgentSessions({ taskId: String(task.id || ""), groupId: task.group_id || undefined }, "任务已在安全检查点暂停");
    const control = (0, task_pause_control_1.updateTaskPauseProgress)(task, {
        state: "paused",
        pendingWriterCount: 0,
        suspendedSessionCount: suspended.length,
        workspaceChecksum: (0, task_pause_control_1.taskPauseWorkspaceChecksum)(task),
    });
    const updated = deps.updateTask(task.id, {
        status: "paused",
        auto_execute: false,
        is_paused: true,
        paused: true,
        pause_control: control,
        status_detail: "已在最近安全检查点暂停，代码现场和子 Agent 会话已保留",
        collaboration_state: { ...(task.collaboration_state || {}), phase: "paused", needs_user: false, updated_at: new Date().toISOString() },
    }) || task;
    for (const execution of deps.listExecutions({ taskId: String(task.id || "") })) {
        if (["succeeded", "failed", "cancelled", "paused"].includes(String(execution?.state || "")))
            continue;
        deps.transitionExecution(execution.id, "paused", "任务已在最近安全检查点暂停", { status: "warning", data: { pause_sequence: control.pauseSequence } });
    }
    deps.updateGroupTaskInlineStatus(updated, "paused", updated.status_detail);
    deps.appendTaskTimelineEvent(task.id, {
        type: "task_pause_checkpoint_reached",
        title: "已到达安全暂停点",
        detail: `已保留 ${control.checkpoint?.completedWorkItemIds.length || 0} 个完成工作项和 ${suspended.length} 个子 Agent 会话`,
        status: "ok",
        phase: control.checkpoint?.phase || "paused",
        data: { pause_sequence: control.pauseSequence, checkpoint: control.checkpoint, content_stored: false },
    });
    appendPauseVisibleEvent(updated, "paused", deps);
    return updated;
}
function reconcileTree(task, deps) {
    const tasks = deps.loadTasks();
    const rows = descendantsOf(task, tasks).filter((item) => !terminal(item));
    const children = rows.slice(1).map((item) => finalizeTaskPauseAtSafeBoundary(item, deps));
    const freshRoot = deps.loadTasks().find((item) => String(item.id) === String(task.id)) || task;
    const childrenSafe = children.every((item) => (0, task_pause_control_1.isTaskSafelyPaused)(item) || terminal(item));
    const root = childrenSafe ? finalizeTaskPauseAtSafeBoundary(freshRoot, deps) : freshRoot;
    return { root, rows: [root, ...children], childrenSafe };
}
exports.reconcileTaskPauseTree = reconcileTree;
function requestTaskPauseTree(task, deps) {
    const tree = descendantsOf(task, deps.loadTasks()).filter((item) => !terminal(item));
    for (const row of tree.slice().reverse())
        markRequested(row, deps);
    const freshRoot = deps.loadTasks().find((item) => String(item?.id || "") === String(task?.id || "")) || task;
    return reconcileTree(freshRoot, deps);
}
async function resumeTaskPauseTree(task, ctx, deps) {
    const tree = descendantsOf(task, deps.loadTasks()).filter((item) => !terminal(item));
    const resumable = tree.slice().reverse();
    const validations = resumable.map((row) => {
        // A previous resume attempt can leave the task blocked after a failed
        // workspace/permission/runtime check.  Treat a new explicit "continue"
        // as a recheck of that same pause checkpoint, not as a new run.
        const validationRow = String(row?.pause_control?.state || "") === "blocked"
            ? { ...row, pause_control: (0, task_pause_control_1.updateTaskPauseProgress)(row, { state: "paused", pendingWriterCount: 0 }) }
            : row;
        const sessions = deps.listTaskAgentSessions({ taskId: String(row.id || "") });
        const runtimeValid = sessions.every((session) => session.resumeMode !== "native" || !!session.nativeSessionId);
        const permissionMode = String(row.conversation_permission_mode || row.conversation_permission_snapshot?.mode || "");
        const needsEditApproval = row.requires_code_changes !== false && permissionMode === "ask_before_edit";
        const authorizationValid = !needsEditApproval || !!(row.edit_approval_id || row.editApprovalId);
        return {
            row: validationRow,
            validation: (0, task_pause_control_1.validateTaskPauseResume)(validationRow, {
                currentWorkspaceChecksum: (0, task_pause_control_1.taskPauseWorkspaceChecksum)(validationRow),
                authorizationValid,
                runtimeValid,
                activeWriterCount: writerCount(String(row.id || ""), deps),
            }),
        };
    });
    const rejected = validations.find(item => !item.validation.valid);
    if (rejected) {
        const blocked = (0, task_pause_control_1.updateTaskPauseProgress)(rejected.row, { state: "blocked", blockedReason: rejected.validation.reason });
        deps.updateTask(rejected.row.id, { pause_control: blocked, status_detail: `无法继续：${rejected.validation.reason}` });
        const error = new Error(rejected.validation.reason);
        error.code = "TASK_PAUSE_RESUME_BLOCKED";
        error.status = 409;
        error.checks = rejected.validation.checks;
        throw error;
    }
    const resumedRows = [];
    for (const { row } of validations) {
        const resumedAt = new Date().toISOString();
        const control = (0, task_pause_control_1.createTaskResumeControl)(row, resumedAt);
        const pausedAtMs = Date.parse(String(row.pause_control?.pausedAt || ""));
        const pauseWaitMs = Number.isFinite(pausedAtMs) ? Math.max(0, Date.parse(resumedAt) - pausedAtMs) : 0;
        const reopened = deps.reopenTaskAgentSessions(String(row.id || ""), "从安全暂停点继续原任务和原生 Agent 会话");
        const updated = deps.updateTask(row.id, {
            status: "pending",
            auto_execute: row.pause_previous_auto_execute !== false,
            is_paused: false,
            paused: false,
            pause_control: control,
            pause_wait_ms: Math.max(0, Number(row.pause_wait_ms || 0)) + pauseWaitMs,
            resumed_at: resumedAt,
            status_detail: `已从“${control.checkpoint?.phase || "当前"}”阶段继续，已完成工作项不会重复执行`,
            collaboration_state: { ...(row.collaboration_state || {}), phase: "resuming", needs_user: false, updated_at: resumedAt },
        }) || row;
        for (const execution of deps.listExecutions({ taskId: String(row.id || "") })) {
            if (String(execution?.state || "") !== "paused")
                continue;
            deps.transitionExecution(execution.id, "queued", "任务已从安全暂停点恢复，等待继续执行", { status: "info", data: { pause_sequence: control.pauseSequence } });
        }
        deps.appendTaskTimelineEvent(row.id, {
            type: "task_resumed_from_pause",
            title: "已从安全暂停点继续",
            detail: `已恢复 ${reopened.length} 个子 Agent 会话；已完成工作项不会重复执行`,
            status: "ok",
            phase: control.checkpoint?.phase || "queued",
            data: { pause_sequence: control.pauseSequence, reopened_session_count: reopened.length, pause_wait_ms: pauseWaitMs, content_stored: false },
        });
        appendPauseVisibleEvent(updated, "resumed", deps);
        deps.updateGroupTaskInlineStatus(updated, "pending", updated.status_detail);
        resumedRows.push(updated);
    }
    for (const row of resumedRows) {
        if (row.auto_execute === false || String(row.workflow_type || "") === "global_mission")
            continue;
        deps.enqueueTask(String(row.id || ""), ctx);
    }
    const root = deps.loadTasks().find((item) => String(item?.id || "") === String(task?.id || "")) || resumedRows[resumedRows.length - 1] || task;
    await ctx.onTaskStatusChange?.(root, "resumed", root.status_detail);
    return { root, resumedRows };
}
function handleTaskPauseRoutes(req, res, parsed, ctx, deps) {
    const pathname = String(parsed?.pathname || "");
    const pausePaths = ["/api/tasks/pause/preview", "/api/tasks/pause", "/api/tasks/resume-paused"];
    if (pathname === "/api/tasks/pause/status" && req.method === "GET") {
        const taskId = String(parsed?.query?.task_id || parsed?.query?.taskId || "").trim();
        const task = deps.loadTasks().find((item) => String(item?.id || "") === taskId);
        if (!task) {
            deps.sendJson(res, { success: false, error: "任务不存在" }, 404);
            return true;
        }
        if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
            deps.sendJson(res, { success: false, error: "当前账户没有该任务的访问权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
            return true;
        }
        const reconciled = reconcileTree(task, deps);
        const descendants = reconciled.rows.slice(1);
        res.setHeader("Cache-Control", "private, no-store");
        deps.sendJson(res, {
            success: true,
            status: (0, task_pause_control_1.taskPauseStatusProjection)(reconciled.root, {
                activeWriterCount: writerCount(taskId, deps),
                descendantCount: descendants.length,
                childPausedCount: descendants.filter((item) => (0, task_pause_control_1.isTaskSafelyPaused)(item) || terminal(item)).length,
            }),
        });
        return true;
    }
    if (!pausePaths.includes(pathname) || req.method !== "POST")
        return false;
    void readJsonRequest(req).then(async (payload) => {
        const taskId = taskIdFrom(payload);
        let task = deps.loadTasks().find((item) => String(item?.id || "") === taskId);
        if (!task)
            return deps.sendJson(res, { success: false, error: "任务不存在" }, 404);
        if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "manage"))
            return deps.sendJson(res, { success: false, error: "当前账户没有该任务的管理权限", code: "RESOURCE_ACCESS_DENIED" }, 403);
        const conflict = mutationConflict(task, payload, pathname === "/api/tasks/resume-paused");
        if (conflict)
            return deps.sendJson(res, { success: false, error: conflict.error, code: conflict.code, ...conflict.details }, conflict.status);
        if (pathname === "/api/tasks/resume-paused" && payload.pauseSequence !== undefined
            && Number(payload.pauseSequence) !== Math.max(0, Number(task?.pause_control?.pauseSequence || 0))) {
            return deps.sendJson(res, { success: false, code: "TASK_PAUSE_SEQUENCE_CONFLICT", error: "暂停状态已更新，请刷新后重试" }, 409);
        }
        const tree = descendantsOf(task, deps.loadTasks()).filter((item) => !terminal(item));
        if (pathname === "/api/tasks/pause/preview") {
            res.setHeader("Cache-Control", "private, no-store");
            return deps.sendJson(res, {
                success: true,
                preview: {
                    schema: "ccm-task-pause-preview-v1",
                    taskId,
                    descendantCount: Math.max(0, tree.length - 1),
                    activeWriterCount: tree.reduce((sum, item) => sum + writerCount(String(item.id || ""), deps), 0),
                    checkpointsPreserved: true,
                    sessionsPreserved: true,
                    worktreesPreserved: true,
                    revision: Math.max(0, Number(task.revision || 0)),
                    generation: Math.max(1, Number(task.generation || task.workflow_generation || 1)),
                    contentStored: false,
                },
            });
        }
        if (pathname === "/api/tasks/pause") {
            const reconciled = requestTaskPauseTree(task, deps);
            await ctx.onTaskStatusChange?.(reconciled.root, "paused", reconciled.root.status_detail);
            return deps.sendJson(res, {
                success: true,
                task: reconciled.root,
                status: (0, task_pause_control_1.taskPauseStatusProjection)(reconciled.root, {
                    activeWriterCount: writerCount(taskId, deps),
                    descendantCount: Math.max(0, reconciled.rows.length - 1),
                    childPausedCount: reconciled.rows.slice(1).filter((item) => (0, task_pause_control_1.isTaskSafelyPaused)(item) || terminal(item)).length,
                }),
            });
        }
        const resumed = await resumeTaskPauseTree(task, ctx, deps);
        return deps.sendJson(res, { success: true, task: resumed.root, resumedTaskIds: resumed.resumedRows.map(item => item.id), pauseSequence: resumed.root.pause_control?.pauseSequence || 0 });
    }).catch((error) => deps.sendJson(res, { success: false, error: error?.message || String(error), checks: error?.checks || undefined }, Number(error?.status || (/冲突|版本|generation/i.test(String(error?.message || "")) ? 409 : 400))));
    return true;
}
//# sourceMappingURL=task-pause-routes.js.map