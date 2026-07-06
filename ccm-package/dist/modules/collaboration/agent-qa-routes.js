"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentQaRoutes = handleAgentQaRoutes;
const utils_1 = require("../../core/utils");
const storage_1 = require("./storage");
function handleAgentQaRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    if (pathname === "/api/agent-collaboration/protocol" && req.method === "GET") {
        const items = deps.getAgentQaItemsForGroup(String(parsed.query.group_id || parsed.query.id || ""), parseInt(String(parsed.query.limit || "")) || 100);
        (0, utils_1.sendJson)(res, {
            success: true,
            version: "8.0",
            mode: "task_bound_structured_collaboration",
            selftest: deps.runAgentCollaborationProtocolSelfTest(),
            summary: {
                total: items.length,
                open: items.filter((item) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual", "rejected"].includes(String(item.status || ""))).length,
                accepted: items.filter((item) => item.acceptance?.accepted === true).length,
                rejected: items.filter((item) => item.acceptance?.accepted === false).length,
                resumed: items.filter((item) => item.status === "resumed").length,
                permission_violations: items.filter((item) => item.permission_boundary?.pass === false).length,
            },
            items,
        });
        return true;
    }
    if (pathname === "/api/agent-qa/arbitrate" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const decision = String(payload.decision || "").toLowerCase();
                if (!["accept", "reject"].includes(decision))
                    return (0, utils_1.sendJson)(res, { success: false, error: "decision 必须是 accept 或 reject" }, 400);
                const item = deps.setAgentQaArbitration(String(payload.id || payload.qa_id || ""), decision, String(payload.reason || ""));
                if (!item)
                    return (0, utils_1.sendJson)(res, { success: false, error: "问答记录不存在" }, 404);
                const group = (0, storage_1.loadGroups)().find((entry) => entry.id === item.group_id);
                const wakeup = decision === "accept" && group ? await deps.resumeAgentQaFromStoredContinuation(item, group, ctx, null) : { resumed: false };
                (0, utils_1.sendJson)(res, { success: true, item: wakeup.resumed ? wakeup.item : item, wakeup });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/agent-qa/manual-takeover" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const item = deps.setAgentQaManualTakeover(String(payload.id || payload.qa_id || ""), String(payload.reason || ""));
                if (!item)
                    return (0, utils_1.sendJson)(res, { success: false, error: "问答记录不存在" }, 404);
                (0, utils_1.sendJson)(res, { success: true, item });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/agent-qa/retry" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = await deps.retryAgentQaItem(String(payload.id || payload.qa_id || ""), ctx, null);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : 400);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/agent-qa/list" && req.method === "GET") {
        const groupId = parsed.query.group_id || parsed.query.id || "";
        const limit = parseInt(String(parsed.query.limit || "")) || 100;
        (0, utils_1.sendJson)(res, { success: true, items: deps.getAgentQaItemsForGroup(String(groupId || ""), limit) });
        return true;
    }
    return false;
}
//# sourceMappingURL=agent-qa-routes.js.map