"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOrchestratorRoutes = handleOrchestratorRoutes;
const utils_1 = require("../../core/utils");
const storage_1 = require("./storage");
const group_orchestrator_1 = require("./group-orchestrator");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
function handleOrchestratorRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    if (pathname === "/api/orchestrator/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)((0, group_orchestrator_1.loadOrchestratorConfig)()) });
        return true;
    }
    if (pathname === "/api/orchestrator/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, group_orchestrator_1.saveOrchestratorConfig)(updates);
                (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)(config) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groups = (0, storage_1.loadGroups)();
                const group = payload.group_id
                    ? groups.find(g => g.id === payload.group_id)
                    : groups[0];
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "请先创建一个群聊并添加项目 Agent" }, 400);
                const message = String(payload.message || "帮我排查登录页面调用接口失败的问题，前后端都看一下").trim();
                const sharedFilesContext = deps.buildCoordinatorSharedFilesContext(ctx, group);
                const result = await deps.runGroupOrchestrator({ group, message, source: "test", sharedFilesContext });
                (0, utils_1.sendJson)(res, { success: true, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/diagnostics" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, deps.buildDailyDevAgentDiagnostics());
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/orchestrator/trace-replay" && req.method === "GET") {
        try {
            const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
            (0, utils_1.sendJson)(res, {
                success: true,
                replay: traceId ? deps.replayAgentTrace(traceId) : deps.buildTraceReplaySuite(Number(parsed.query.limit || 20)),
            });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/orchestrator/runtime-kernel/self-test" && req.method === "GET") {
        const result = deps.runAgentRuntimeKernelSelfTest();
        (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        return true;
    }
    if (pathname === "/api/orchestrator/main-agent-actions" && req.method === "GET") {
        try {
            const selfTest = deps.runGroupMainAgentActionRegistrySelfTest();
            const toolLoopSelfTest = deps.runGroupMainAgentToolLoopSelfTest();
            (0, utils_1.sendJson)(res, {
                success: true,
                version: "group-main-agent-action-registry-1.0",
                actions: deps.getGroupMainAgentActionRegistry(),
                selfTest,
                toolLoopSelfTest,
            });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/orchestrator/runtime-monitors") {
        if (req.method === "GET") {
            (0, utils_1.sendJson)(res, deps.applyRuntimeMonitorControl("status", ctx));
            return true;
        }
        if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const payload = body ? JSON.parse(body) : {};
                    (0, utils_1.sendJson)(res, deps.applyRuntimeMonitorControl(payload.action || "status", ctx));
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
                }
            });
            return true;
        }
    }
    if (pathname === "/api/orchestrator/daily-dev-autopilot/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, daily_dev_backlog_1.runDailyDevAutopilotOnce)(ctx, {
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    import_shared_docs: payload.import_shared_docs !== false && payload.importSharedDocs !== false,
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-autopilot/ensure-cron" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, (0, daily_dev_backlog_1.ensureDailyDevAutopilotCronJobs)(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-rehearsal" && (req.method === "GET" || req.method === "POST")) {
        if (req.method === "GET") {
            try {
                (0, utils_1.sendJson)(res, deps.buildDailyDevWorkflowRehearsal());
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, deps.buildDailyDevWorkflowRehearsal(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-smoke-task" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, deps.createDailyDevSmokeTask(payload, ctx));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/daily-dev-smoke-status" && (req.method === "GET" || req.method === "POST")) {
        if (req.method === "GET") {
            try {
                (0, utils_1.sendJson)(res, deps.getDailyDevSmokeStatus({
                    task_id: parsed.query.task_id || parsed.query.taskId,
                }));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, deps.getDailyDevSmokeStatus(payload));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/agent-cli-probe/batch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await deps.runAgentCliProbeBatch(payload, ctx);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/agent-cli-probe" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await deps.runAgentCliProbe(payload, ctx);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : (result.blocked ? 409 : 500));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/switch-executor" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.taskId || payload.id || "");
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const result = deps.switchTaskExecutor(taskId, payload.runtime || payload.agent_type || payload.agentType, ctx, payload);
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/runtime-fallback-probe" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await deps.runRuntimeFallbackProbe(payload, ctx);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : 500);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/agent-recovery-monitor/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = await deps.runAgentRecoveryMonitorOnce(ctx, payload);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : 409);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=orchestrator-routes.js.map