"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSessionCompactionHookRoutes = handleSessionCompactionHookRoutes;
const utils_1 = require("../core/utils");
const session_compaction_command_hooks_1 = require("./session-compaction-command-hooks");
const session_compaction_runs_1 = require("./session-compaction-runs");
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += chunk;
            if (body.length > 64_000)
                reject(new Error("请求体过大"));
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error("请求体不是有效 JSON"));
            }
        });
        req.on("error", reject);
    });
}
function handleSessionCompactionHookRoutes(pathname, req, res, parsed) {
    if (pathname === "/api/session-compaction/cancel") {
        if (req.method !== "POST") {
            (0, utils_1.sendJson)(res, { success: false, error: "Method Not Allowed" }, 405);
            return true;
        }
        void readBody(req).then(payload => {
            const scope = payload?.scope === "group" || payload?.scope === "project" ? payload.scope : "global";
            const exactSessionId = String(payload?.exactSessionId || payload?.exact_session_id || "").trim();
            if (!exactSessionId)
                return (0, utils_1.sendJson)(res, { success: false, error: "缺少精确会话 ID" }, 400);
            (0, utils_1.sendJson)(res, (0, session_compaction_runs_1.cancelSessionCompactionRun)({ scope, exactSessionId, runId: payload?.compactionRunId || payload?.compaction_run_id, reason: "用户取消当前会话压缩" }));
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "取消会话压缩失败" }, 400));
        return true;
    }
    if (pathname !== "/api/session-compaction/hooks")
        return false;
    if (req.method === "GET") {
        const scope = String(parsed?.query?.scope || "");
        const scopeId = String(parsed?.query?.scope_id || parsed?.query?.scopeId || "");
        (0, utils_1.sendJson)(res, { success: true, hooks: (0, session_compaction_command_hooks_1.listSessionCompactionCommandHooks)({ scope, scopeId }) });
        return true;
    }
    if (req.method === "POST") {
        void readBody(req).then(payload => (0, utils_1.sendJson)(res, { success: true, hook: (0, session_compaction_command_hooks_1.saveSessionCompactionCommandHook)(payload) }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "保存压缩 Hook 失败" }, 400));
        return true;
    }
    if (req.method === "DELETE") {
        void readBody(req).then(payload => (0, utils_1.sendJson)(res, { success: true, ...(0, session_compaction_command_hooks_1.deleteSessionCompactionCommandHook)(payload.id) }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "删除压缩 Hook 失败" }, 400));
        return true;
    }
    (0, utils_1.sendJson)(res, { success: false, error: "Method Not Allowed" }, 405);
    return true;
}
//# sourceMappingURL=session-compaction-hook-routes.js.map