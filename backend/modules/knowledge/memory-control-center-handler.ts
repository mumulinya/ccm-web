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
  memoryCenterExactGroupSessionScope,
  memorySummary,
  readMemoryFile,
  recordMemoryOperation,
} from "./memory-control-center-api";
import { pruneMemoryControls, updateMemoryControl } from "./memory-control-center-controls";
import {
  readGroupMemoryAutoCompactCircuitAdmission,
  resetGroupMemoryAutoCompactCircuitBreaker,
} from "../collaboration/group-memory-auto-compact-circuit-breaker";
import {
  readPromotedMemoryStore,
  revokePromotedMemory,
} from "../collaboration/typed-memory-promotion";
import {
  readTypedMemoryConflictLedger,
  resolveTypedMemoryConflict,
} from "../collaboration/typed-memory-conflict";
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
  // 顺带收集每个 scope 的存活 itemId，供孤儿控制项回收使用。
  // 读取失败的 scope 不进入这张表，宁可少回收也不能误删用户的置顶/屏蔽。
  const liveIdsByScope = new Map<string, Set<string>>();
  const alerts = scopes.flatMap(summary => {
    let detail: any = null;
    try {
      detail = getMemoryCenterScope(summary.scope, summary.id);
    } catch {
      return [];
    }
    const live = new Set<string>();
    for (const group of detail.itemGroups || []) {
      for (const item of group.items || []) live.add(String(item.itemId || ""));
    }
    liveIdsByScope.set(`${summary.scope}::${summary.id}`, live);
    return healthAlerts(summary.scope, summary.id, detail.rawMemory).map(alert => ({
      ...alert,
      scope: summary.scope,
      scopeId: summary.id,
      label: summary.label,
    }));
  });
  let controlGc: any = { pruned: 0, orphans: [] };
  try {
    controlGc = pruneMemoryControls(liveIdsByScope, { actor: "memory-center-overview" });
  } catch {}
  return {
    generatedAt: now(),
    groups,
    projects,
    globals,
    tasks,
    alerts,
    controlGc: { pruned: Number(controlGc.pruned || 0) },
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

  if (pathname === "/api/memory-center/compact-circuit" && req.method === "GET") {
    try {
      const { groupId, sessionId } = memoryCenterExactGroupSessionScope(query.scopeId || query.scope_id || query.id);
      sendJson(res, { success: true, admission: readGroupMemoryAutoCompactCircuitAdmission(groupId, sessionId) });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }

  if (pathname === "/api/memory-center/compact-circuit-reset" && req.method === "POST") {
    readBody(req, data => {
      try {
        const { groupId, sessionId } = memoryCenterExactGroupSessionScope(data.scopeId || data.scope_id || data.id);
        const reason = String(data.reason || "").trim();
        if (!reason) throw new Error("重置压缩熔断必须填写原因");
        const actor = String(data.actor || "memory-center");
        const ledger = resetGroupMemoryAutoCompactCircuitBreaker(groupId, sessionId, { reason, actor });
        const audit = recordMemoryOperation({
          action: "compact_circuit_reset",
          scope: "group",
          scopeId: `${groupId}::${sessionId}`,
          actor,
          reason,
          previousState: ledger.previousState,
        });
        sendJson(res, { success: true, ledger, audit });
      } catch (error: any) {
        sendJson(res, { success: false, error: String(error?.message || error) }, 400);
      }
    }, error => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }

  if (pathname === "/api/memory-center/conflicts" && req.method === "GET") {
    try {
      const { typedScopeId } = memoryCenterExactGroupSessionScope(query.scopeId || query.scope_id || query.id);
      const ledger = readTypedMemoryConflictLedger(typedScopeId);
      sendJson(res, {
        success: true,
        scopeId: typedScopeId,
        file: ledger.file,
        pairs: ledger.pairs,
        pendingCount: ledger.pairs.filter((pair: any) => String(pair?.status || "pending") === "pending").length,
      });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }

  if (pathname === "/api/memory-center/conflict-resolve" && req.method === "POST") {
    readBody(req, data => {
      try {
        const { typedScopeId } = memoryCenterExactGroupSessionScope(data.scopeId || data.scope_id || data.id);
        const result = resolveTypedMemoryConflict(typedScopeId, String(data.pairId || data.pair_id || ""), {
          resolution: data.resolution,
          reason: data.reason,
          actor: data.actor || "memory-center",
        });
        const audit = recordMemoryOperation({
          action: "memory_conflict_resolve",
          scope: "group",
          scopeId: typedScopeId,
          actor: String(data.actor || "memory-center"),
          reason: String(data.reason || ""),
          pairId: result.pair?.pairId || "",
          resolution: result.pair?.resolution || "",
        });
        sendJson(res, { success: true, ...result, audit });
      } catch (error: any) {
        sendJson(res, { success: false, error: String(error?.message || error) }, 400);
      }
    }, error => sendJson(res, { success: false, error: String(error?.message || error) }, 400));
    return true;
  }

  if (pathname === "/api/memory-center/promoted" && req.method === "GET") {
    try {
      const store = readPromotedMemoryStore(String(query.project || query.projectId || "unassigned"));
      sendJson(res, {
        success: true,
        project: store.project,
        file: store.file,
        entries: store.entries,
        activeCount: store.entries.filter((entry: any) => String(entry?.status || "active") === "active").length,
      });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }

  if (pathname === "/api/memory-center/promoted-revoke" && req.method === "POST") {
    readBody(req, data => {
      try {
        const result = revokePromotedMemory(
          String(data.project || data.projectId || "unassigned"),
          String(data.promotionId || data.promotion_id || ""),
          { reason: data.reason, actor: data.actor || "memory-center", restore: data.restore === true },
        );
        const audit = recordMemoryOperation({
          action: data.restore === true ? "promoted_memory_restore" : "promoted_memory_revoke",
          scope: "project",
          scopeId: result.project,
          actor: String(data.actor || "memory-center"),
          reason: String(data.reason || ""),
          promotionId: result.entry?.promotionId || "",
        });
        sendJson(res, { success: true, ...result, audit });
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
