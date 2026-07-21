import * as path from "path";
import * as fs from "fs";
import { CCM_DIR, sendJson } from "../../core/utils";
import {
  GLOBAL_MEMORY_FILE,
  PROJECT_MEMORY_DIR,
  now,
} from "./memory-control-center-types";
import {
  findMemoryEvidence,
  getMemoryCenterScope,
  healthAlerts,
  listJsonFiles,
  listMemoryAudit,
  listMemoryCenterGroupSessionScopes,
  memorySummary,
  readMemoryFile,
} from "./memory-control-center-api";
import { updateMemoryControl } from "./memory-control-center-controls";
import {
  readGroupSessionMemoryCustomPromptProfile,
  readGroupSessionMemoryCustomTemplateProfile,
  saveGroupSessionMemoryCustomPrompt,
  saveGroupSessionMemoryCustomTemplate,
} from "../collaboration/group-session-memory-model-extraction";

function projectSummaries() {
  const longTerm = listJsonFiles(PROJECT_MEMORY_DIR).flatMap(file => {
    const memory = readMemoryFile(file);
    if (!memory) return [];
    const id = String(memory.project || path.basename(file, ".json"));
    return [{ ...memorySummary("project", id, memory, "长期记忆"), projectId: id, memoryKind: "long_term" }];
  });
  const sessions: any[] = [];
  const root = path.join(CCM_DIR, "web-sessions");
  try {
    for (const projectEntry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!projectEntry.isDirectory()) continue;
      for (const file of listJsonFiles(path.join(root, projectEntry.name))) {
        const memory = readMemoryFile(file);
        if (!memory) continue;
        const sessionId = String(memory.id || memory.session_id || path.basename(file, ".json"));
        sessions.push({
          ...memorySummary("project_session", `${projectEntry.name}::${sessionId}`, memory, String(memory.name || memory.title || sessionId)),
          projectId: projectEntry.name,
          projectSessionId: sessionId,
          sessionLabel: String(memory.name || memory.title || sessionId),
          memoryKind: "session",
        });
      }
    }
  } catch {}
  return [...longTerm, ...sessions];
}

function globalSummaries() {
  const memory = readMemoryFile(GLOBAL_MEMORY_FILE);
  if (!memory) return [];
  const history = readMemoryFile(path.join(CCM_DIR, "global-agent-history.json"));
  const liveSessions = Array.isArray(history?.sessions) ? history.sessions : [];
  const liveById = new Map(liveSessions.map((session: any) => [String(session.id || ""), session]));
  const storedSessions = Array.isArray(memory.sessions) ? memory.sessions : [];
  const visibleSessions = liveById.size
    ? storedSessions.filter((session: any) => liveById.has(String(session.sessionId || "")))
    : storedSessions;
  const sessions = visibleSessions.map((session: any) => {
    const sessionId = String(session.sessionId || "");
    const live = liveById.get(sessionId) as any;
    return {
      ...memorySummary("global_session", `session:${sessionId}`, session, live?.name || session.title || sessionId),
      memoryKind: "session",
      currentSession: String(history?.current_session_id || "") === sessionId,
      channel: String(live?.source || "web"),
    };
  });
  return [{ ...memorySummary("global", "global", memory, "全局长期记忆"), memoryKind: "long_term" }, ...sessions];
}

function taskAgentSummaries() {
  const store = readMemoryFile(path.join(CCM_DIR, "task-agent-sessions.json"));
  return (store?.sessions || []).map((session: any) => {
    const sessionId = String(session.id || "");
    const projectId = String(session.project || "").trim() || "unassigned";
    const runtime = String(session.agentType || "").trim() || "agent";
    const summary = memorySummary(
      "task_agent",
      sessionId,
      { ...session, compaction: session.compaction || { latestProviderUsage: session.providerContextUsageBaseline, consecutiveFailures: session.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0 } },
      `${projectId} / ${sessionId}`,
    );
    return {
      ...summary,
      projectId,
      projectLabel: projectId === "unassigned" ? "未关联项目" : projectId,
      taskAgentSessionId: sessionId,
      taskId: String(session.taskId || ""),
      groupId: String(session.groupId || ""),
      agentType: runtime,
      status: String(session.status || ""),
      turnCount: Number(session.turnCount || 0),
      lastUsedAt: String(session.lastUsedAt || session.updatedAt || session.createdAt || ""),
      sessionLabel: `${runtime} · ${sessionId}`,
    };
  }).sort((left: any, right: any) => String(right.lastUsedAt || "").localeCompare(String(left.lastUsedAt || "")));
}

export function buildMemoryCenterOverview() {
  const groups = listMemoryCenterGroupSessionScopes();
  const projects = projectSummaries();
  const globals = globalSummaries();
  const tasks = taskAgentSummaries();
  const scopes = [...globals, ...groups, ...projects, ...tasks];
  const alerts = scopes.flatMap(summary => {
    const detail = getMemoryCenterScope(summary.scope, summary.id);
    return healthAlerts(summary.scope, summary.id, detail.rawMemory).map(alert => ({
      ...alert,
      scope: summary.scope,
      scopeId: summary.id,
      label: summary.label,
    }));
  });
  return {
    generatedAt: now(),
    groups,
    projects,
    globals,
    tasks,
    alerts,
    totals: {
      scopes: scopes.length,
      groupSessions: groups.length,
      projects: projects.length,
      taskAgents: tasks.length,
      alerts: alerts.length,
      beforeTokens: scopes.reduce((sum, item) => sum + Number(item.beforeTokens || 0), 0),
      afterTokens: scopes.reduce((sum, item) => sum + Number(item.afterTokens || 0), 0),
    },
  };
}

function readBody(req: any, callback: (data: any) => void, onError: (error: any) => void) {
  let body = "";
  req.on("data", (chunk: any) => body += chunk);
  req.on("end", () => {
    try { callback(JSON.parse(body || "{}")); }
    catch (error) { onError(error); }
  });
}

function customizationScopeId(value: any) {
  return String(value || "").trim().replace("::gcs_", "--gcs_");
}

export function handleMemoryCenterApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (!pathname.startsWith("/api/memory-center/")) return false;
  const query = parsed?.query || {};

  if (pathname === "/api/memory-center/overview" && req.method === "GET") {
    sendJson(res, buildMemoryCenterOverview());
    return true;
  }

  if (pathname === "/api/memory-center/scope" && req.method === "GET") {
    try {
      sendJson(res, getMemoryCenterScope(query.scope, String(query.id || "")));
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 404);
    }
    return true;
  }

  if (pathname === "/api/memory-center/audit" && req.method === "GET") {
    sendJson(res, { success: true, audit: listMemoryAudit(Number(query.limit || 200), { scope: query.scope, scopeId: query.id }) });
    return true;
  }

  if (pathname === "/api/memory-center/evidence" && req.method === "GET") {
    sendJson(res, { success: true, evidence: findMemoryEvidence({
      scope: query.scope,
      groupId: query.group_id || query.groupId,
      messageId: query.message_id || query.messageId,
      taskId: query.task_id || query.taskId,
      sessionId: query.session_id || query.sessionId,
      missionId: query.mission_id || query.missionId,
    }) });
    return true;
  }

  if (pathname === "/api/memory-center/control" && req.method === "POST") {
    readBody(req, data => {
      try {
        const result = updateMemoryControl({
          scope: data.scope,
          scopeId: data.scopeId || data.scope_id,
          itemType: data.itemType || data.item_type,
          itemId: data.itemId || data.item_id,
          action: data.action,
          text: data.text,
          reason: data.reason,
          actor: data.actor || "memory-center",
        });
        sendJson(res, { success: true, ...result });
      } catch (error: any) {
        sendJson(res, { success: false, error: String(error?.message || error) }, 400);
      }
    }, error => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }

  if (pathname === "/api/memory-center/session-memory-custom-prompt" && req.method === "GET") {
    try {
      const scopeId = customizationScopeId(query.scopeId || query.scope_id);
      sendJson(res, { success: true, profile: readGroupSessionMemoryCustomPromptProfile(scopeId) });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }

  if (pathname === "/api/memory-center/session-memory-custom-prompt" && req.method === "POST") {
    readBody(req, data => {
      try {
        const scopeId = customizationScopeId(data.scopeId || data.scope_id);
        const profile = saveGroupSessionMemoryCustomPrompt(scopeId, data.content, { reset: data.reset === true });
        sendJson(res, { success: true, profile });
      } catch (error: any) {
        sendJson(res, { success: false, error: String(error?.message || error) }, 400);
      }
    }, error => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }

  if (pathname === "/api/memory-center/session-memory-custom-template" && req.method === "GET") {
    try {
      const scopeId = customizationScopeId(query.scopeId || query.scope_id);
      sendJson(res, { success: true, profile: readGroupSessionMemoryCustomTemplateProfile(scopeId) });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }

  if (pathname === "/api/memory-center/session-memory-custom-template" && req.method === "POST") {
    readBody(req, data => {
      try {
        const scopeId = customizationScopeId(data.scopeId || data.scope_id);
        const profile = saveGroupSessionMemoryCustomTemplate(scopeId, data.content, { reset: data.reset === true });
        sendJson(res, { success: true, profile });
      } catch (error: any) {
        sendJson(res, { success: false, error: String(error?.message || error) }, 400);
      }
    }, error => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }

  sendJson(res, { success: false, error: "Memory Center endpoint not found" }, 404);
  return true;
}
