"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTaskRecoveryRoutes = handleTaskRecoveryRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const task_recovery_context_1 = require("../../tasks/task-recovery-context");
const task_recovery_session_1 = require("../../agents/task-recovery-session");
/** Recovery writes deliberately go through the existing guarded replay action handler. */
function handleTaskRecoveryRoutes(pathname, req, res) {
    const match = pathname.match(/^\/api\/tasks\/([^/]+)\/(context-contamination|recovery-sessions)(?:\/([^/]+))?$/);
    if (!match)
        return false;
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "GET") {
        (0, utils_1.sendJson)(res, { success: false, code: "METHOD_NOT_ALLOWED" }, 405);
        return true;
    }
    let taskId;
    try {
        taskId = decodeURIComponent(match[1]);
    }
    catch {
        (0, utils_1.sendJson)(res, { success: false, code: "INVALID_TASK_ID" }, 400);
        return true;
    }
    const task = (0, db_1.getTaskById)(taskId);
    if (!task) {
        (0, utils_1.sendJson)(res, { success: false, error: "任务不存在" }, 404);
        return true;
    }
    if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
        (0, utils_1.sendJson)(res, { success: false, code: "RESOURCE_ACCESS_DENIED", error: "没有该任务的访问权限" }, 403);
        return true;
    }
    if (match[2] === "context-contamination") {
        const decision = (0, task_recovery_context_1.inspectTaskRecoveryContext)(task);
        // Anchor/checksums remain internal; query does not write any state.
        (0, utils_1.sendJson)(res, { success: true, taskId, status: decision.status, reason: decision.reason,
            events: decision.events, eventCount: decision.eventCount, contentStored: false });
        return true;
    }
    const sessions = (0, task_recovery_session_1.projectTaskRecoverySessions)(task);
    if (match[3]) {
        const session = sessions.find((row) => row.id === match[3]);
        (0, utils_1.sendJson)(res, session ? { success: true, session, contentStored: false } : { success: false, error: "恢复会话不存在" }, session ? 200 : 404);
    }
    else
        (0, utils_1.sendJson)(res, { success: true, taskId, sessions, contentStored: false });
    return true;
}
//# sourceMappingURL=task-recovery-routes.js.map