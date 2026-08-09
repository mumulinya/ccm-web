"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAutomationSessionBindingsApi = handleAutomationSessionBindingsApi;
const utils_1 = require("../core/utils");
const api_access_control_1 = require("../modules/system/api-access-control");
const automation_session_bindings_1 = require("./automation-session-bindings");
function readJsonBody(req, maxBytes = 64 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", chunk => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > maxBytes) {
                reject(new Error("自动化会话请求体超过限制"));
                req.destroy();
                return;
            }
            chunks.push(buffer);
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
            }
            catch {
                reject(new Error("请求 JSON 无效"));
            }
        });
        req.on("error", reject);
    });
}
function actorOf(req) {
    const principal = (0, api_access_control_1.requestAccessPrincipal)(req);
    return principal?.kind === "browser" ? `user:${principal.userId}` : principal?.caller ? `internal:${principal.caller}` : "system";
}
function handleAutomationSessionBindingsApi(pathname, req, res, parsed) {
    if (pathname === "/api/global-agent/dispatch-targets" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, targets: (0, automation_session_bindings_1.listGlobalDispatchTargets)() });
        return true;
    }
    if (pathname === "/api/automation-session-bindings" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, {
                success: true,
                bindings: (0, automation_session_bindings_1.listAutomationSessionBindings)(parsed?.query?.scope, parsed?.query?.scope_id || parsed?.query?.scopeId),
            });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取自动化会话绑定失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/automation-sessions" && req.method === "POST") {
        if ((0, api_access_control_1.requestIsReadOnly)(req)) {
            (0, utils_1.sendJson)(res, { success: false, error: "只读账户不能创建自动化任务会话" }, 403);
            return true;
        }
        void readJsonBody(req).then(body => {
            const binding = (0, automation_session_bindings_1.createBoundAutomationSession)({
                scope: body.scope,
                scopeId: body.scopeId || body.scope_id,
                sources: body.sources,
                title: body.title,
                actor: actorOf(req),
                reason: body.reason || "automation_session_api_create",
            });
            (0, utils_1.sendJson)(res, { success: true, binding });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "创建自动化任务会话失败" }, 400));
        return true;
    }
    if (pathname === "/api/automation-session-bindings" && req.method === "POST") {
        if ((0, api_access_control_1.requestIsReadOnly)(req)) {
            (0, utils_1.sendJson)(res, { success: false, error: "只读账户不能修改自动化任务来源绑定" }, 403);
            return true;
        }
        void readJsonBody(req).then(body => {
            const binding = (0, automation_session_bindings_1.replaceAutomationSessionSources)({
                scope: body.scope,
                scopeId: body.scopeId || body.scope_id,
                exactSessionId: body.exactSessionId || body.exact_session_id,
                sources: body.sources || [],
                expectedRevision: body.expectedRevision ?? body.expected_revision,
                actor: actorOf(req),
                reason: body.reason || "automation_session_api_bind",
            });
            (0, utils_1.sendJson)(res, { success: true, binding });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新自动化任务来源绑定失败" }, 400));
        return true;
    }
    const bindingMatch = pathname.match(/^\/api\/automation-session-bindings\/([^/]+)$/);
    if (bindingMatch && req.method === "PATCH") {
        if ((0, api_access_control_1.requestIsReadOnly)(req)) {
            (0, utils_1.sendJson)(res, { success: false, error: "只读账户不能修改自动化任务来源绑定" }, 403);
            return true;
        }
        void readJsonBody(req).then(body => {
            if (Array.isArray(body.sources)) {
                const binding = (0, automation_session_bindings_1.replaceAutomationSessionSources)({
                    scope: body.scope,
                    scopeId: body.scopeId || body.scope_id,
                    exactSessionId: body.exactSessionId || body.exact_session_id,
                    sources: body.sources,
                    expectedRevision: body.expectedRevision ?? body.expected_revision,
                    actor: actorOf(req),
                    reason: body.reason || "automation_session_api_update",
                });
                (0, utils_1.sendJson)(res, { success: true, binding });
                return;
            }
            const binding = (0, automation_session_bindings_1.setAutomationSessionBindingStatus)(decodeURIComponent(bindingMatch[1]), body.status || "archived", body.expectedRevision ?? body.expected_revision, actorOf(req), body.reason || "automation_session_api_status");
            (0, utils_1.sendJson)(res, { success: true, binding });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "更新自动化任务来源绑定失败" }, 400));
        return true;
    }
    const drainMatch = pathname.match(/^\/api\/automation-session-bindings\/([^/]+)\/drain$/);
    if (drainMatch && req.method === "POST") {
        if ((0, api_access_control_1.requestIsReadOnly)(req)) {
            (0, utils_1.sendJson)(res, { success: false, error: "只读账户不能停止自动化任务会话接单" }, 403);
            return true;
        }
        void readJsonBody(req).then(body => {
            const binding = (0, automation_session_bindings_1.setAutomationSessionBindingStatus)(decodeURIComponent(drainMatch[1]), "draining", body.expectedRevision ?? body.expected_revision, actorOf(req), body.reason || "automation_session_draining");
            (0, utils_1.sendJson)(res, { success: true, binding });
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "停止自动化任务会话接单失败" }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=automation-session-bindings-api.js.map