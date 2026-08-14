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
exports.TASK_PAUSE_STUCK_MS = void 0;
exports.taskPausePlanChecksum = taskPausePlanChecksum;
exports.taskPauseWorkspaceChecksum = taskPauseWorkspaceChecksum;
exports.taskPauseCompletedWorkItemIds = taskPauseCompletedWorkItemIds;
exports.isTaskPauseRequested = isTaskPauseRequested;
exports.isTaskSafelyPaused = isTaskSafelyPaused;
exports.isTaskPauseHeld = isTaskPauseHeld;
exports.validateTaskPauseControl = validateTaskPauseControl;
exports.createTaskPauseRequest = createTaskPauseRequest;
exports.updateTaskPauseProgress = updateTaskPauseProgress;
exports.createTaskResumeControl = createTaskResumeControl;
exports.validateTaskPauseResume = validateTaskPauseResume;
exports.taskPauseStatusProjection = taskPauseStatusProjection;
exports.taskPauseBoundaryError = taskPauseBoundaryError;
exports.assertTaskPauseBoundary = assertTaskPauseBoundary;
exports.runTaskPauseControlSelfTest = runTaskPauseControlSelfTest;
const crypto = __importStar(require("crypto"));
exports.TASK_PAUSE_STUCK_MS = 30_000;
function hash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function unsigned(value) {
    const clone = { ...value };
    delete clone.checksum;
    return clone;
}
function generationOf(task) {
    return Math.max(1, Number(task?.generation || task?.workflow_generation || 1));
}
function attemptOf(task) {
    return Math.max(0, Number(task?.execution_attempt || task?.project_main_execution?.attempt || task?.attempt || 0));
}
function taskPausePlanChecksum(task) {
    const existing = String(task?.resume_checkpoint?.planChecksum || task?.interruption_receipt?.resume_checkpoint?.planChecksum || "");
    if (existing)
        return existing;
    return hash({
        title: task?.title || "",
        description: task?.description || "",
        plan: task?.intake_draft || task?.workflow_meta?.plan_mode || task?.decomposition_plan || null,
        workItems: (Array.isArray(task?.work_items) ? task.work_items : []).map((item) => ({
            id: item?.id || "",
            title: item?.title || "",
            objective: item?.objective || "",
            dependsOn: item?.dependsOn || item?.depends_on || [],
        })),
    });
}
function taskPauseWorkspaceChecksum(task) {
    return String(task?.workspace_snapshot_checksum
        || task?.workspace_evidence?.checksum
        || task?.resume_checkpoint?.workspaceChecksum
        || task?.interruption_receipt?.resume_checkpoint?.workspaceChecksum
        || "");
}
function taskPauseCompletedWorkItemIds(task) {
    const checkpoint = task?.resume_checkpoint || task?.interruption_receipt?.resume_checkpoint || {};
    if (Array.isArray(checkpoint?.completedWorkItemIds))
        return Array.from(new Set(checkpoint.completedWorkItemIds.map(String).filter(Boolean)));
    return (Array.isArray(task?.work_items) ? task.work_items : [])
        .filter((item) => ["completed", "accepted", "awaiting_review"].includes(String(item?.status || "")))
        .map((item) => String(item?.id || ""))
        .filter(Boolean);
}
function isTaskPauseRequested(task) {
    return ["requested", "quiescing"].includes(String(task?.pause_control?.state || ""));
}
function isTaskSafelyPaused(task) {
    return String(task?.pause_control?.state || "") === "paused";
}
function isTaskPauseHeld(task) {
    return ["requested", "quiescing", "paused", "resuming", "blocked"].includes(String(task?.pause_control?.state || ""));
}
function validateTaskPauseControl(control) {
    return !!control
        && control.schema === "ccm-task-pause-control-v1"
        && typeof control.checksum === "string"
        && control.checksum === hash(unsigned(control));
}
function createTaskPauseRequest(task, input = {}) {
    const previous = validateTaskPauseControl(task?.pause_control) ? task.pause_control : null;
    if (previous && ["requested", "quiescing", "paused"].includes(previous.state))
        return previous;
    const raw = {
        schema: "ccm-task-pause-control-v1",
        state: Number(input.pendingWriterCount || 0) > 0 ? "quiescing" : "requested",
        taskId: String(task?.id || ""),
        generation: generationOf(task),
        attempt: attemptOf(task),
        pauseSequence: Math.max(0, Number(previous?.pauseSequence || task?.pause_sequence || 0)) + 1,
        revision: Math.max(0, Number(task?.revision || 0)),
        requestedAt: input.requestedAt || new Date().toISOString(),
        checkpoint: {
            phase: String(input.phase || task?.acceptance_state || task?.collaboration_state?.phase || task?.status || "executing"),
            ...(input.workItemId ? { workItemId: String(input.workItemId) } : {}),
            planChecksum: taskPausePlanChecksum(task),
            ...(taskPauseWorkspaceChecksum(task) ? { workspaceChecksum: taskPauseWorkspaceChecksum(task) } : {}),
            completedWorkItemIds: taskPauseCompletedWorkItemIds(task),
            suspendedSessionCount: Math.max(0, Number(input.suspendedSessionCount || 0)),
        },
        pendingWriterCount: Math.max(0, Number(input.pendingWriterCount || 0)),
        contentStored: false,
    };
    return { ...raw, checksum: hash(raw) };
}
function updateTaskPauseProgress(task, input) {
    const current = validateTaskPauseControl(task?.pause_control)
        ? task.pause_control
        : createTaskPauseRequest(task, input);
    const pendingWriterCount = Math.max(0, Number(input.pendingWriterCount ?? current.pendingWriterCount ?? 0));
    const state = input.state || (pendingWriterCount > 0 ? "quiescing" : "paused");
    const raw = {
        ...unsigned(current),
        state,
        pendingWriterCount,
        ...(state === "paused" ? { pausedAt: input.pausedAt || current.pausedAt || new Date().toISOString() } : {}),
        checkpoint: current.checkpoint ? {
            ...current.checkpoint,
            ...(input.workspaceChecksum ? { workspaceChecksum: input.workspaceChecksum } : {}),
            ...(input.suspendedSessionCount !== undefined ? { suspendedSessionCount: Math.max(0, Number(input.suspendedSessionCount)) } : {}),
        } : undefined,
        ...(input.blockedReason ? { blockedReason: String(input.blockedReason).slice(0, 500) } : {}),
    };
    return { ...raw, checksum: hash(raw) };
}
function createTaskResumeControl(task, resumedAt = new Date().toISOString()) {
    if (!validateTaskPauseControl(task?.pause_control))
        throw Object.assign(new Error("暂停记录无效，不能安全继续"), { code: "TASK_PAUSE_CONTROL_INVALID" });
    const current = task.pause_control;
    const raw = {
        ...unsigned(current),
        state: "resuming",
        pendingWriterCount: 0,
        resumedAt,
        blockedReason: undefined,
    };
    return { ...raw, checksum: hash(raw) };
}
function validateTaskPauseResume(task, input = {}) {
    const control = task?.pause_control;
    const checks = {
        control_valid: validateTaskPauseControl(control),
        safely_paused: String(control?.state || "") === "paused",
        generation_unchanged: Number(control?.generation || 0) === generationOf(task),
        attempt_unchanged: Number(control?.attempt || 0) === attemptOf(task),
        plan_unchanged: String(control?.checkpoint?.planChecksum || "") === taskPausePlanChecksum(task),
        workspace_unchanged: !control?.checkpoint?.workspaceChecksum
            || !input.currentWorkspaceChecksum
            || String(control.checkpoint.workspaceChecksum) === String(input.currentWorkspaceChecksum),
        authorization_valid: input.authorizationValid !== false,
        runtime_valid: input.runtimeValid !== false,
        no_active_writers: Math.max(0, Number(input.activeWriterCount || 0)) === 0,
    };
    const valid = Object.values(checks).every(Boolean);
    const reason = !checks.control_valid ? "暂停记录校验失败"
        : !checks.safely_paused ? "任务尚未到达安全暂停点"
            : !checks.generation_unchanged || !checks.attempt_unchanged ? "任务执行代次已经变化"
                : !checks.plan_unchanged ? "执行计划已发生变化"
                    : !checks.workspace_unchanged ? "暂停后工作区发生变化"
                        : !checks.authorization_valid ? "代码修改授权已经失效"
                            : !checks.runtime_valid ? "原项目 Agent 会话当前不可恢复"
                                : !checks.no_active_writers ? "仍有写入进程没有退出"
                                    : "可以沿用原任务和现场继续";
    return { valid, checks, reason };
}
function taskPauseStatusProjection(task, input = {}) {
    const control = task?.pause_control || null;
    const requestedAt = String(control?.requestedAt || "");
    const elapsedMs = requestedAt ? Math.max(0, Date.now() - Date.parse(requestedAt)) : 0;
    const state = String(control?.state || "") || (task?.is_paused || task?.paused ? "paused" : "running");
    const activeWriterCount = Math.max(0, Number(input.activeWriterCount ?? control?.pendingWriterCount ?? 0));
    const stuck = ["requested", "quiescing"].includes(state) && elapsedMs >= exports.TASK_PAUSE_STUCK_MS;
    return {
        schema: "ccm-task-pause-status-v1",
        taskId: String(task?.id || ""),
        state,
        requestedAt,
        pausedAt: String(control?.pausedAt || ""),
        resumedAt: String(control?.resumedAt || ""),
        elapsedMs,
        stuck,
        activeWriterCount,
        descendantCount: Math.max(0, Number(input.descendantCount || 0)),
        childPausedCount: Math.max(0, Number(input.childPausedCount || 0)),
        checkpoint: control?.checkpoint ? {
            phase: String(control.checkpoint.phase || ""),
            completedWorkItemCount: Array.isArray(control.checkpoint.completedWorkItemIds) ? control.checkpoint.completedWorkItemIds.length : 0,
            suspendedSessionCount: Math.max(0, Number(control.checkpoint.suspendedSessionCount || 0)),
        } : null,
        pauseSequence: Math.max(0, Number(control?.pauseSequence || 0)),
        revision: Math.max(0, Number(task?.revision || 0)),
        generation: generationOf(task),
        availableActions: state === "paused"
            ? [{ id: "resume_paused", kind: "resume_paused", label: "继续", enabled: true }]
            : stuck
                ? [{ id: "force_interrupt", kind: "force_interrupt", label: "强制中断", enabled: true }, { id: "recheck", kind: "recheck", label: "重新检查", enabled: true }]
                : ["requested", "quiescing"].includes(state)
                    ? [{ id: "recheck", kind: "recheck", label: "重新检查", enabled: true }]
                    : [],
        checksum: String(control?.checksum || ""),
        contentStored: false,
    };
}
function taskPauseBoundaryError(task, phase = "executing", workItemId = "") {
    const error = new Error("任务已到达安全暂停点");
    error.code = "CCM_TASK_PAUSE_SAFE_BOUNDARY";
    error.taskId = String(task?.id || "");
    error.phase = phase;
    error.workItemId = workItemId;
    return error;
}
function assertTaskPauseBoundary(task, phase = "executing", workItemId = "") {
    if (isTaskPauseRequested(task))
        throw taskPauseBoundaryError(task, phase, workItemId);
}
function runTaskPauseControlSelfTest() {
    const task = { id: "pause-self-test", revision: 3, generation: 2, execution_attempt: 1, status: "in_progress", acceptance_state: "executing", work_items: [{ id: "done", status: "completed" }] };
    const requested = createTaskPauseRequest(task, { pendingWriterCount: 1, suspendedSessionCount: 1 });
    const paused = updateTaskPauseProgress({ ...task, pause_control: requested }, { state: "paused", pendingWriterCount: 0, workspaceChecksum: "workspace-a" });
    const resumed = createTaskResumeControl({ ...task, workspace_snapshot_checksum: "workspace-a", pause_control: paused });
    const validation = validateTaskPauseResume({ ...task, workspace_snapshot_checksum: "workspace-a", pause_control: paused }, { currentWorkspaceChecksum: "workspace-a" });
    const checks = {
        requestIsDurable: validateTaskPauseControl(requested) && requested.state === "quiescing",
        pausesWithoutGenerationChange: paused.generation === 2 && paused.attempt === 1 && paused.state === "paused",
        preservesCompletedWork: paused.checkpoint?.completedWorkItemIds.includes("done") === true,
        resumesSameSequence: resumed.pauseSequence === paused.pauseSequence && resumed.state === "resuming",
        validatesUnchangedState: validation.valid === true,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=task-pause-control.js.map