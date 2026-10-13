"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRelatedTaskIntake = resolveRelatedTaskIntake;
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const task_session_store_1 = require("./task-session-store");
const task_session_boundary_1 = require("./task-session-boundary");
/** An explicit new-goal intake links history without reopening the original task. */
function resolveRelatedTaskIntake(payload, principal) {
    if (!payload.related_task_id)
        return null;
    const task = (0, db_1.getTaskById)(String(payload.related_task_id));
    if (!task || !(0, access_policy_1.hasTaskResourceAccess)(task, principal, "manage") || !(0, task_session_boundary_1.taskSessionOpeningState)(task).open) {
        throw Object.assign(new Error("原任务会话不存在、未开放或没有权限"), { code: "TASK_RELATED_INTAKE_DENIED", status: 403 });
    }
    const session = (0, task_session_store_1.getTaskSession)(task.id);
    if (!session)
        throw new Error("原任务上下文尚未保存");
    return { task_id: task.id, task_session_id: session.session_id, trace_id: task.trace_id,
        relationship: "independent_goal", actor_id: principal?.userId || principal?.actorId || "local-user" };
}
//# sourceMappingURL=task-session-related-intake.js.map