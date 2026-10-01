"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTaskAcceptanceRoute = handleTaskAcceptanceRoute;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const task_acceptance_service_1 = require("../../agents/task-acceptance-service");
const task_session_store_1 = require("./task-session-store");
function handleTaskAcceptanceRoute(pathname, req, res) {
    const match = pathname.match(/^\/api\/tasks\/([^/]+)\/acceptance$/);
    if (!match)
        return false;
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "GET") {
        (0, utils_1.sendJson)(res, { success: false, code: "METHOD_NOT_ALLOWED" }, 405);
        return true;
    }
    let id = "";
    try {
        id = decodeURIComponent(match[1]);
    }
    catch {
        (0, utils_1.sendJson)(res, { success: false, code: "INVALID_TASK_ID" }, 400);
        return true;
    }
    const task = (0, db_1.getTaskById)(id);
    if (!task) {
        (0, utils_1.sendJson)(res, { success: false, error: "任务不存在" }, 404);
        return true;
    }
    if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, "use")) {
        (0, utils_1.sendJson)(res, { success: false, code: "RESOURCE_ACCESS_DENIED" }, 403);
        return true;
    }
    const projection = (0, task_acceptance_service_1.taskAcceptanceProjection)(task);
    (0, utils_1.sendJson)(res, { success: true, taskId: id, ...projection, archive_policy: task?.task_spec?.task_session_archive_policy || "", archive_state: (0, task_session_store_1.taskSessionArchiveState)(task), available_actions: (0, task_session_store_1.taskSessionArchiveActions)(task), output_revision: (0, task_session_store_1.taskSessionOutputRevision)(task), task_session: (0, task_session_store_1.getTaskSession)(id) ? { available: true } : { available: false }, contentStored: false });
    return true;
}
//# sourceMappingURL=task-acceptance-routes.js.map