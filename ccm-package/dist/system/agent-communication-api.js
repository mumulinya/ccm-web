"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentCommunicationApi = handleAgentCommunicationApi;
const utils_1 = require("../core/utils");
const agent_communication_v2_1 = require("./agent-communication-v2");
const execution_kernel_1 = require("../agents/execution-kernel");
function parseBody(buffer) {
    if (!buffer.length)
        return {};
    const parsed = JSON.parse(buffer.toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("请求体必须是JSON对象");
    return parsed;
}
function handleAgentCommunicationApi(pathname, req, res, parsed, options = {}) {
    if (pathname === "/api/agent-communications" && req.method === "GET") {
        (0, agent_communication_v2_1.reconcileAgentCommunications)();
        (0, utils_1.sendJson)(res, {
            success: true,
            schema: "ccm-agent-communication-list-v2",
            communications: (0, agent_communication_v2_1.listAgentCommunications)(parsed?.query || {}),
            contentStored: false,
        });
        return true;
    }
    if (pathname === "/api/agent-communications/diagnostics" && req.method === "GET") {
        (0, agent_communication_v2_1.reconcileAgentCommunications)();
        (0, utils_1.sendJson)(res, { success: true, diagnostics: (0, agent_communication_v2_1.getAgentCommunicationDiagnostics)() });
        return true;
    }
    const detailMatch = pathname.match(/^\/api\/agent-communications\/([^/]+)$/);
    if (detailMatch && req.method === "GET") {
        const communication = (0, agent_communication_v2_1.getAgentCommunication)(decodeURIComponent(detailMatch[1]));
        if (!communication)
            (0, utils_1.sendJson)(res, { success: false, error: "Agent Communication消息不存在" }, 404);
        else
            (0, utils_1.sendJson)(res, { success: true, communication, contentStored: false });
        return true;
    }
    const actionMatch = pathname.match(/^\/api\/agent-communications\/([^/]+)\/action$/);
    if (actionMatch && req.method === "POST") {
        const auth = req.ccmAuth;
        if (auth?.kind === "browser" && auth?.role !== "admin") {
            (0, utils_1.sendJson)(res, { success: false, error: "仅管理员可以执行 Agent Communication 管理操作" }, 403);
            return true;
        }
        (0, utils_1.collectRequestBuffer)(req).then(buffer => {
            try {
                const body = parseBody(buffer);
                const action = String(body.action || "");
                if (!["cancel", "retry", "takeover", "reconcile"].includes(action))
                    throw new Error("action必须是cancel/retry/takeover/reconcile");
                if (action !== "reconcile" && !String(body.reason || "").trim())
                    throw new Error("管理操作必须填写原因");
                const current = (0, agent_communication_v2_1.getAgentCommunication)(decodeURIComponent(actionMatch[1]), { includeEvents: false, includeReceipts: false });
                if (!current)
                    throw new Error("Agent Communication消息不存在");
                if (action === "cancel" || action === "takeover")
                    (0, execution_kernel_1.requestTaskCancellation)(current.taskId, String(body.reason || "管理员操作"), String(body.actor || "memory-center-admin"));
                const result = (0, agent_communication_v2_1.performAgentCommunicationAction)(decodeURIComponent(actionMatch[1]), action, {
                    reason: String(body.reason || "").slice(0, 500),
                    actor: String(body.actor || "memory-center-admin").slice(0, 200),
                });
                let taskAction = null;
                if (action === "retry" && options.retryTask && options.createCollabCtx) {
                    const retryReason = String(body.reason || "Agent Communication V2 管理重试");
                    (0, execution_kernel_1.requestTaskCancellation)(current.taskId, retryReason, String(body.actor || "memory-center-admin"));
                    const deadline = Date.now() + 60_000;
                    const ctx = options.createCollabCtx();
                    const attemptTaskRetry = () => {
                        const attempt = options.retryTask(current.taskId, ctx, retryReason, true);
                        if (attempt?.success)
                            return;
                        if (Date.now() < deadline && [409, 429].includes(Number(attempt?.status || 0))) {
                            const timer = setTimeout(attemptTaskRetry, 2_000);
                            timer.unref?.();
                            return;
                        }
                        try {
                            (0, agent_communication_v2_1.performAgentCommunicationAction)(current.messageId, "takeover", {
                                reason: `管理重试未能安全重新入队：${String(attempt?.error || "unknown").slice(0, 300)}`,
                                actor: String(body.actor || "memory-center-admin"),
                            });
                        }
                        catch { }
                    };
                    const immediate = options.retryTask(current.taskId, ctx, retryReason, true);
                    if (!immediate?.success && [409, 429].includes(Number(immediate?.status || 0))) {
                        const timer = setTimeout(attemptTaskRetry, 2_000);
                        timer.unref?.();
                        taskAction = { success: true, scheduled: true, waitingForRunnerStop: true };
                    }
                    else
                        taskAction = immediate;
                }
                (0, utils_1.sendJson)(res, { success: true, action, result, taskAction, contentStored: false });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400);
            }
        }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: String(error?.message || error) }, 400));
        return true;
    }
    return false;
}
//# sourceMappingURL=agent-communication-api.js.map