"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDispatchScopeRoutes = handleDispatchScopeRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const access_policy_1 = require("../system/access-policy");
const dispatch_scope_service_1 = require("../../agents/dispatch-scope-service");
function handleDispatchScopeRoutes(pathname, req, res, query, updateTask) {
    const match = pathname.match(/^\/api\/tasks\/([^/]+)\/work-items\/([^/]+)\/scope-expansion(?:\/(approve|reject|expire))?$/);
    if (!match || !["POST", "GET"].includes(req.method))
        return false;
    const taskId = decodeURIComponent(match[1]), workItemId = decodeURIComponent(match[2]);
    const readTask = (id) => (0, db_1.loadTasks)().find((t) => t.id === id);
    const task = readTask(taskId);
    if (!task) {
        (0, utils_1.sendJson)(res, { success: false, error: "任务不存在" }, 404);
        return true;
    }
    if (!(0, access_policy_1.hasTaskResourceAccess)(task, req.ccmAuth, req.method === "GET" ? "use" : "manage")) {
        (0, utils_1.sendJson)(res, { success: false, error: "任务权限不足" }, 403);
        return true;
    }
    if (req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, requests: (task.scope_expansion_requests || []).filter((r) => r.workItemId === workItemId) });
        return true;
    }
    const handle = async (body) => {
        try {
            const result = await (0, dispatch_scope_service_1.mutateDispatchScope)({ readTask, updateTask,
                pause: run => require("../../agents/execution-kernel").requestActiveAgentRunPause({ taskId, executionId: run.executionId, reason: "范围扩展审批等待" }),
                continueRun: (run, request) => require("../../agents/agent-execution-coordinator").continueApprovedDispatchScope(run.runId, request.id),
            }, taskId, workItemId, match[3] || "request", { ...query, ...body }, req.ccmAuth?.userId || "");
            (0, utils_1.sendJson)(res, { success: true, ...result });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code || "CCM_SCOPE_CONFLICT" }, 409);
        }
    };
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 65536)
        req.destroy(); });
    req.on("end", () => { try {
        void handle(body ? JSON.parse(body) : {});
    }
    catch {
        (0, utils_1.sendJson)(res, { success: false, error: "JSON 无效" }, 400);
    } });
    return true;
}
//# sourceMappingURL=dispatch-scope-routes.js.map