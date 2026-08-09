"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOrchestratorRoutes = handleOrchestratorRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const task_conversation_links_1 = require("../../system/task-conversation-links");
const local_auth_1 = require("../system/local-auth");
const storage_1 = require("./storage");
const group_orchestrator_1 = require("./group-orchestrator");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const model_capability_cache_1 = require("./model-capability-cache");
const provider_cache_capability_probe_1 = require("../../system/provider-cache-capability-probe");
const provider_cache_capability_registry_1 = require("../../system/provider-cache-capability-registry");
const provider_neutral_context_cache_1 = require("../../system/provider-neutral-context-cache");
const context_engine_observability_1 = require("../../system/context-engine-observability");
const context_engine_recovery_1 = require("../../system/context-engine-recovery");
function handleOrchestratorRoutes(req, res, parsed, ctx, deps) {
    const pathname = parsed.pathname;
    const requireAdmin = () => {
        const auth = (0, local_auth_1.resolveLocalAuthSession)(req);
        if (!auth) {
            (0, utils_1.sendJson)(res, { success: false, error: "请先登录", code: "AUTH_REQUIRED" }, 401);
            return null;
        }
        if (auth.user.role !== "admin") {
            (0, utils_1.sendJson)(res, { success: false, error: "仅管理员可以修改 Provider 缓存能力证据", code: "ADMIN_REQUIRED" }, 403);
            return null;
        }
        return auth;
    };
    if (pathname === "/api/orchestrator/config" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)((0, group_orchestrator_1.loadOrchestratorConfig)()) });
        return true;
    }
    if (pathname === "/api/orchestrator/credential/reveal" && req.method === "POST") {
        try {
            const auth = (0, local_auth_1.resolveLocalAuthSession)(req);
            if (!auth) {
                (0, utils_1.sendJson)(res, { success: false, error: "请先登录", code: "AUTH_REQUIRED" }, 401);
                return true;
            }
            if (auth.user.role !== "admin") {
                (0, utils_1.sendJson)(res, { success: false, error: "仅管理员可以查看 API Key", code: "ADMIN_REQUIRED" }, 403);
                return true;
            }
            const apiKey = String((0, group_orchestrator_1.loadOrchestratorConfig)().apiKey || "");
            res.setHeader("Cache-Control", "private, no-store, max-age=0");
            res.setHeader("Pragma", "no-cache");
            if (!apiKey) {
                (0, utils_1.sendJson)(res, { success: false, error: "尚未保存统一大模型 API Key" }, 404);
                return true;
            }
            (0, utils_1.sendJson)(res, { success: true, apiKey });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取 API Key 失败" }, 500);
        }
        return true;
    }
    if (pathname === "/api/orchestrator/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, group_orchestrator_1.saveOrchestratorConfig)(updates);
                if (Number(config.modelContextWindow || 0) > 0
                    && ["modelContextWindow", "model_context_window", "memoryContextPreset", "memory_context_preset"].some(key => Object.prototype.hasOwnProperty.call(updates, key))) {
                    (0, model_capability_cache_1.recordModelCapabilityEvidence)({
                        provider: String(config.provider || config.format || "group-main-agent"),
                        model: String(config.model || ""),
                        source: "user_setting",
                        contextWindow: Number(config.modelContextWindow),
                        maxOutputTokens: Number(config.modelMaxOutputTokens || 20_000),
                        checkedAt: new Date().toISOString(),
                        evidenceId: "memory-center-context-setting",
                    });
                }
                if (["groupSessionAutoPruneEnabled", "group_session_auto_prune_enabled", "groupSessionRetentionIntervalHours", "group_session_retention_interval_hours"].some(key => Object.prototype.hasOwnProperty.call(updates, key))) {
                    const { startGroupSessionRetentionMaintenanceScheduler } = require("./group-session-maintenance");
                    startGroupSessionRetentionMaintenanceScheduler();
                }
                (0, utils_1.sendJson)(res, { success: true, config: (0, group_orchestrator_1.publicOrchestratorConfig)(config) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/orchestrator/connection-test" && req.method === "POST") {
        void (0, group_orchestrator_1.testUnifiedModelConnection)().then(result => {
            (0, utils_1.sendJson)(res, result, result.success ? 200 : 422);
        }).catch((error) => {
            (0, utils_1.sendJson)(res, { success: false, message: error?.message || "模型连接测试失败" }, 500);
        });
        return true;
    }
    if (pathname === "/api/orchestrator/cache-capability" && req.method === "GET") {
        const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
        (0, utils_1.sendJson)(res, { success: true, capability: (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config) });
        return true;
    }
    if (pathname === "/api/orchestrator/cache-capability/probe" && req.method === "POST") {
        if (!requireAdmin())
            return true;
        void (0, provider_cache_capability_probe_1.probeProviderCacheCapability)((0, group_orchestrator_1.loadOrchestratorConfig)()).then(result => {
            (0, utils_1.sendJson)(res, result, result.connection.success ? 200 : 422);
        }).catch((error) => {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "缓存能力探测失败" }, 500);
        });
        return true;
    }
    if (pathname === "/api/orchestrator/cache-capability/revoke" && req.method === "POST") {
        if (!requireAdmin())
            return true;
        try {
            (0, utils_1.sendJson)(res, (0, provider_cache_capability_registry_1.revokeProviderCacheCapabilityEvidence)((0, group_orchestrator_1.loadOrchestratorConfig)()));
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "清除缓存能力证据失败" }, 500);
        }
        return true;
    }
    if (pathname === "/api/context-engine/status" && req.method === "GET") {
        const scope = String(parsed.query.scope || "").trim().toLowerCase();
        const scopeId = String(parsed.query.scope_id || parsed.query.scopeId || "").trim();
        const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
        if (!['global', 'group', 'project', 'music', 'other'].includes(scope) || !sessionId) {
            (0, utils_1.sendJson)(res, { success: false, error: "必须提供有效 scope 和精确 session_id" }, 400);
            return true;
        }
        let recoveryPoints = [];
        try {
            recoveryPoints = (0, context_engine_recovery_1.listContextEngineRecoveryPoints)({ scope, scopeId: scopeId || sessionId, sessionId });
        }
        catch { }
        (0, utils_1.sendJson)(res, {
            success: true,
            status: {
                ...(0, provider_neutral_context_cache_1.readContextEngineV2Status)({ scope: scope, scopeId, sessionId }, (0, group_orchestrator_1.loadOrchestratorConfig)()),
                trends: (0, context_engine_observability_1.readContextEngineTrends)({ scope, scopeId, sessionId, limit: 100 }),
                recovery: { count: recoveryPoints.length, latest: recoveryPoints[0] || null, contentStored: false },
            },
        });
        return true;
    }
    if (pathname === "/api/context-engine/trends" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, trends: (0, context_engine_observability_1.readContextEngineTrends)({
                scope: String(parsed.query.scope || ""),
                scopeId: String(parsed.query.scope_id || parsed.query.scopeId || ""),
                sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
                since: String(parsed.query.since || ""),
                limit: Number(parsed.query.limit || 100),
            }) });
        return true;
    }
    if (pathname === "/api/context-engine/cache/runtime" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, runtime: (0, provider_neutral_context_cache_1.readProviderNeutralContextCacheRuntimeStatus)() });
        return true;
    }
    if (pathname === "/api/context-engine/cache/maintenance" && req.method === "POST") {
        if (!requireAdmin())
            return true;
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, { success: true, result: (0, provider_neutral_context_cache_1.runProviderNeutralContextCacheMaintenance)({
                        dryRun: payload.dry_run === true || payload.dryRun === true,
                        stateRetentionDays: Number(payload.state_retention_days || payload.stateRetentionDays || 30),
                        archiveRetentionDays: Number(payload.archive_retention_days || payload.archiveRetentionDays || 90),
                    }) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "上下文缓存清理失败" }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/context-engine/recovery" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, recoveryPoints: (0, context_engine_recovery_1.listContextEngineRecoveryPoints)({
                    scope: String(parsed.query.scope || ""),
                    scopeId: String(parsed.query.scope_id || parsed.query.scopeId || ""),
                    sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
                }) });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "读取恢复点失败" }, 400);
        }
        return true;
    }
    if (["/api/context-engine/recovery/drill", "/api/context-engine/recovery/restore"].includes(String(pathname)) && req.method === "POST") {
        const restore = pathname.endsWith("/restore");
        if (restore && !requireAdmin())
            return true;
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = restore ? (0, context_engine_recovery_1.restoreContextEngineRecoveryPoint)(payload) : (0, context_engine_recovery_1.drillContextEngineRecoveryPoint)(payload);
                (0, utils_1.sendJson)(res, { success: true, result });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || (restore ? "恢复失败" : "恢复演练失败") }, 400);
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
    if (pathname === "/api/orchestrator/worker-handoff/self-test" && req.method === "GET") {
        const result = deps.runWorkerHandoffSelfTest();
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
                const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === taskId);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const guard = (0, task_conversation_links_1.validateTaskMutationGuard)(task, payload, { requireTarget: true });
                if ("error" in guard)
                    return (0, utils_1.sendJson)(res, { success: false, error: guard.error, code: guard.code, ...guard.details }, guard.status);
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