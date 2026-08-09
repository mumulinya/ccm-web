import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson } from "../../core/utils";
import { loadTasks } from "../../core/db";
import { validateTaskMutationGuard } from "../../system/task-conversation-links";
import { resolveLocalAuthSession } from "../system/local-auth";
import { loadGroups } from "./storage";
import {
  loadOrchestratorConfig,
  publicOrchestratorConfig,
  saveOrchestratorConfig,
  testUnifiedModelConnection,
} from "./group-orchestrator";
import {
  ensureDailyDevAutopilotCronJobs,
  runDailyDevAutopilotOnce,
} from "./daily-dev-backlog";
import { recordModelCapabilityEvidence } from "./model-capability-cache";
import { probeProviderCacheCapability } from "../../system/provider-cache-capability-probe";
import {
  readProviderCacheCapabilityState,
  revokeProviderCacheCapabilityEvidence,
} from "../../system/provider-cache-capability-registry";
import {
  readContextEngineV2Status,
  readProviderNeutralContextCacheRuntimeStatus,
  runProviderNeutralContextCacheMaintenance,
} from "../../system/provider-neutral-context-cache";
import { readContextEngineTrends } from "../../system/context-engine-observability";
import {
  drillContextEngineRecoveryPoint,
  listContextEngineRecoveryPoints,
  restoreContextEngineRecoveryPoint,
} from "../../system/context-engine-recovery";

type OrchestratorRouteDeps = {
  buildCoordinatorSharedFilesContext: (ctx: any, group: any, options?: { groupSessionId?: string; message?: string; generation?: number }) => string;
  runGroupOrchestrator: (options: any) => Promise<any>;
  buildDailyDevAgentDiagnostics: () => any;
  replayAgentTrace: (traceId: string) => any;
  buildTraceReplaySuite: (limit?: number) => any;
  runAgentRuntimeKernelSelfTest: () => any;
  runWorkerHandoffSelfTest: () => any;
  runGroupMainAgentActionRegistrySelfTest: () => any;
  runGroupMainAgentToolLoopSelfTest: () => any;
  getGroupMainAgentActionRegistry: () => any;
  applyRuntimeMonitorControl: (action: string, ctx: any) => any;
  buildDailyDevWorkflowRehearsal: (payload?: any) => any;
  createDailyDevSmokeTask: (payload: any, ctx: any) => any;
  getDailyDevSmokeStatus: (payload?: any) => any;
  runAgentCliProbeBatch: (payload: any, ctx: any) => Promise<any>;
  runAgentCliProbe: (payload: any, ctx: any) => Promise<any>;
  switchTaskExecutor: (taskId: string, runtime: string, ctx: any, payload: any) => any;
  runRuntimeFallbackProbe: (payload: any, ctx: any) => Promise<any>;
  runAgentRecoveryMonitorOnce: (ctx: any, payload: any) => Promise<any>;
};

export function handleOrchestratorRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: UrlWithParsedQuery,
  ctx: any,
  deps: OrchestratorRouteDeps,
): boolean {
  const pathname = parsed.pathname;

  const requireAdmin = () => {
    const auth = resolveLocalAuthSession(req);
    if (!auth) {
      sendJson(res, { success: false, error: "请先登录", code: "AUTH_REQUIRED" }, 401);
      return null;
    }
    if (auth.user.role !== "admin") {
      sendJson(res, { success: false, error: "仅管理员可以修改 Provider 缓存能力证据", code: "ADMIN_REQUIRED" }, 403);
      return null;
    }
    return auth;
  };

  if (pathname === "/api/orchestrator/config" && req.method === "GET") {
    sendJson(res, { success: true, config: publicOrchestratorConfig(loadOrchestratorConfig()) });
    return true;
  }

  if (pathname === "/api/orchestrator/credential/reveal" && req.method === "POST") {
    try {
      const auth = resolveLocalAuthSession(req);
      if (!auth) {
        sendJson(res, { success: false, error: "请先登录", code: "AUTH_REQUIRED" }, 401);
        return true;
      }
      if (auth.user.role !== "admin") {
        sendJson(res, { success: false, error: "仅管理员可以查看 API Key", code: "ADMIN_REQUIRED" }, 403);
        return true;
      }
      const apiKey = String(loadOrchestratorConfig().apiKey || "");
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      if (!apiKey) {
        sendJson(res, { success: false, error: "尚未保存统一大模型 API Key" }, 404);
        return true;
      }
      sendJson(res, { success: true, apiKey });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取 API Key 失败" }, 500);
    }
    return true;
  }

  if (pathname === "/api/orchestrator/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);
        const config = saveOrchestratorConfig(updates);
        if (Number(config.modelContextWindow || 0) > 0
          && ["modelContextWindow", "model_context_window", "memoryContextPreset", "memory_context_preset"].some(key => Object.prototype.hasOwnProperty.call(updates, key))) {
          recordModelCapabilityEvidence({
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
        sendJson(res, { success: true, config: publicOrchestratorConfig(config) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/connection-test" && req.method === "POST") {
    void testUnifiedModelConnection().then(result => {
      sendJson(res, result, result.success ? 200 : 422);
    }).catch((error: any) => {
      sendJson(res, { success: false, message: error?.message || "模型连接测试失败" }, 500);
    });
    return true;
  }

  if (pathname === "/api/orchestrator/cache-capability" && req.method === "GET") {
    const config = loadOrchestratorConfig();
    sendJson(res, { success: true, capability: readProviderCacheCapabilityState(config) });
    return true;
  }

  if (pathname === "/api/orchestrator/cache-capability/probe" && req.method === "POST") {
    if (!requireAdmin()) return true;
    void probeProviderCacheCapability(loadOrchestratorConfig()).then(result => {
      sendJson(res, result, result.connection.success ? 200 : 422);
    }).catch((error: any) => {
      sendJson(res, { success: false, error: error?.message || "缓存能力探测失败" }, 500);
    });
    return true;
  }

  if (pathname === "/api/orchestrator/cache-capability/revoke" && req.method === "POST") {
    if (!requireAdmin()) return true;
    try {
      sendJson(res, revokeProviderCacheCapabilityEvidence(loadOrchestratorConfig()));
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "清除缓存能力证据失败" }, 500);
    }
    return true;
  }

  if (pathname === "/api/context-engine/status" && req.method === "GET") {
    const scope = String(parsed.query.scope || "").trim().toLowerCase();
    const scopeId = String(parsed.query.scope_id || parsed.query.scopeId || "").trim();
    const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
    if (!['global', 'group', 'project', 'music', 'other'].includes(scope) || !sessionId) {
      sendJson(res, { success: false, error: "必须提供有效 scope 和精确 session_id" }, 400);
      return true;
    }
    let recoveryPoints: any[] = [];
    try { recoveryPoints = listContextEngineRecoveryPoints({ scope, scopeId: scopeId || sessionId, sessionId }); } catch {}
    sendJson(res, {
      success: true,
      status: {
        ...readContextEngineV2Status({ scope: scope as any, scopeId, sessionId }, loadOrchestratorConfig()),
        trends: readContextEngineTrends({ scope, scopeId, sessionId, limit: 100 }),
        recovery: { count: recoveryPoints.length, latest: recoveryPoints[0] || null, contentStored: false },
      },
    });
    return true;
  }

  if (pathname === "/api/context-engine/trends" && req.method === "GET") {
    sendJson(res, { success: true, trends: readContextEngineTrends({
      scope: String(parsed.query.scope || ""),
      scopeId: String(parsed.query.scope_id || parsed.query.scopeId || ""),
      sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
      since: String(parsed.query.since || ""),
      limit: Number(parsed.query.limit || 100),
    }) });
    return true;
  }

  if (pathname === "/api/context-engine/cache/runtime" && req.method === "GET") {
    sendJson(res, { success: true, runtime: readProviderNeutralContextCacheRuntimeStatus() });
    return true;
  }

  if (pathname === "/api/context-engine/cache/maintenance" && req.method === "POST") {
    if (!requireAdmin()) return true;
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, { success: true, result: runProviderNeutralContextCacheMaintenance({
          dryRun: payload.dry_run === true || payload.dryRun === true,
          stateRetentionDays: Number(payload.state_retention_days || payload.stateRetentionDays || 30),
          archiveRetentionDays: Number(payload.archive_retention_days || payload.archiveRetentionDays || 90),
        }) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "上下文缓存清理失败" }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/context-engine/recovery" && req.method === "GET") {
    try {
      sendJson(res, { success: true, recoveryPoints: listContextEngineRecoveryPoints({
        scope: String(parsed.query.scope || ""),
        scopeId: String(parsed.query.scope_id || parsed.query.scopeId || ""),
        sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""),
      }) });
    } catch (error: any) {
      sendJson(res, { success: false, error: error?.message || "读取恢复点失败" }, 400);
    }
    return true;
  }

  if (["/api/context-engine/recovery/drill", "/api/context-engine/recovery/restore"].includes(String(pathname)) && req.method === "POST") {
    const restore = pathname.endsWith("/restore");
    if (restore && !requireAdmin()) return true;
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = restore ? restoreContextEngineRecoveryPoint(payload) : drillContextEngineRecoveryPoint(payload);
        sendJson(res, { success: true, result });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || (restore ? "恢复失败" : "恢复演练失败") }, 400);
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
        const groups = loadGroups();
        const group = payload.group_id
          ? groups.find(g => g.id === payload.group_id)
          : groups[0];
        if (!group) return sendJson(res, { error: "请先创建一个群聊并添加项目 Agent" }, 400);
        const message = String(payload.message || "帮我排查登录页面调用接口失败的问题，前后端都看一下").trim();
        const sharedFilesContext = deps.buildCoordinatorSharedFilesContext(ctx, group);
        const result = await deps.runGroupOrchestrator({ group, message, source: "test", sharedFilesContext });
        sendJson(res, { success: true, result });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/diagnostics" && req.method === "GET") {
    try {
      sendJson(res, deps.buildDailyDevAgentDiagnostics());
    } catch (e: any) {
      sendJson(res, { error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/orchestrator/trace-replay" && req.method === "GET") {
    try {
      const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
      sendJson(res, {
        success: true,
        replay: traceId ? deps.replayAgentTrace(traceId) : deps.buildTraceReplaySuite(Number(parsed.query.limit || 20)),
      });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/orchestrator/runtime-kernel/self-test" && req.method === "GET") {
    const result = deps.runAgentRuntimeKernelSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/orchestrator/worker-handoff/self-test" && req.method === "GET") {
    const result = deps.runWorkerHandoffSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/orchestrator/main-agent-actions" && req.method === "GET") {
    try {
      const selfTest = deps.runGroupMainAgentActionRegistrySelfTest();
      const toolLoopSelfTest = deps.runGroupMainAgentToolLoopSelfTest();
      sendJson(res, {
        success: true,
        version: "group-main-agent-action-registry-1.0",
        actions: deps.getGroupMainAgentActionRegistry(),
        selfTest,
        toolLoopSelfTest,
      });
    } catch (e: any) {
      sendJson(res, { success: false, error: e.message }, 500);
    }
    return true;
  }

  if (pathname === "/api/orchestrator/runtime-monitors") {
    if (req.method === "GET") {
      sendJson(res, deps.applyRuntimeMonitorControl("status", ctx));
      return true;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          sendJson(res, deps.applyRuntimeMonitorControl(payload.action || "status", ctx));
        } catch (e: any) {
          sendJson(res, { success: false, error: e.message }, 400);
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
        const result = runDailyDevAutopilotOnce(ctx, {
          group_id: payload.group_id || payload.groupId || "",
          limit: payload.limit || 20,
          import_shared_docs: payload.import_shared_docs !== false && payload.importSharedDocs !== false,
          auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
          only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
          requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
        });
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
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
        sendJson(res, ensureDailyDevAutopilotCronJobs(payload));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/daily-dev-rehearsal" && (req.method === "GET" || req.method === "POST")) {
    if (req.method === "GET") {
      try {
        sendJson(res, deps.buildDailyDevWorkflowRehearsal());
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, deps.buildDailyDevWorkflowRehearsal(payload));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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
        sendJson(res, deps.createDailyDevSmokeTask(payload, ctx));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/orchestrator/daily-dev-smoke-status" && (req.method === "GET" || req.method === "POST")) {
    if (req.method === "GET") {
      try {
        sendJson(res, deps.getDailyDevSmokeStatus({
          task_id: parsed.query.task_id || parsed.query.taskId,
        }));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
      return true;
    }
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, deps.getDailyDevSmokeStatus(payload));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
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
        sendJson(res, result);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 500);
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
        sendJson(res, result, result.success ? 200 : (result.blocked ? 409 : 500));
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
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
        if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
        const task = loadTasks().find((item: any) => String(item?.id || "") === taskId);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        const guard = validateTaskMutationGuard(task, payload, { requireTarget: true });
        if ("error" in guard) return sendJson(res, { success: false, error: guard.error, code: guard.code, ...guard.details }, guard.status);
        const result = deps.switchTaskExecutor(taskId, payload.runtime || payload.agent_type || payload.agentType, ctx, payload);
        if (!result.success) return sendJson(res, { error: result.error }, result.status || 400);
        sendJson(res, result);
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
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
        sendJson(res, result, result.success ? 200 : 500);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
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
        sendJson(res, result, result.success ? 200 : 409);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  return false;
}
