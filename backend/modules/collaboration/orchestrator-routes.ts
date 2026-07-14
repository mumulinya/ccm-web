import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson } from "../../core/utils";
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

type OrchestratorRouteDeps = {
  buildCoordinatorSharedFilesContext: (ctx: any, group: any) => string;
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

  if (pathname === "/api/orchestrator/config" && req.method === "GET") {
    sendJson(res, { success: true, config: publicOrchestratorConfig(loadOrchestratorConfig()) });
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
