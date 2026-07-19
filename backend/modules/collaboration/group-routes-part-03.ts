// Behavior-freeze split from group-routes.ts (part 3/3).
import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson, GROUP_MESSAGES_DIR } from "../../core/utils";
import { loadTasks } from "../../core/db";
import {
  appendGroupMessage,
  archiveGroupChatSession,
  createGroupChatSession,
  deleteGroupChatSession,
  getActiveGroupChatSessionId,
  getGroupMessages,
  listGroupChatSessions,
  loadGroups,
  purgeLegacyDefaultGroupChatSession,
  pruneArchivedGroupChatSessions,
  renameGroupChatSession,
  saveGroupMessages,
  saveGroups,
  selectGroupChatSession,
} from "./storage";
import { clearGroupLogs, loadGroupLogs } from "./logs";
import { getCoordinatorMember, loadOrchestratorConfig, normalizeGroupOrchestrator } from "./group-orchestrator";
import { buildFreshToolAuthorizationPayload, buildToolAuthorizationPayload, normalizeToolAuthorization, recordToolAuthorizationChange } from "../../tools/tool-authorization";
import { sanitizeMainAgentDeliveryText } from "../../agents/delivery-report";
import { getGroupAutoCompactThreshold, resolveGroupModelContextCapacity } from "./group-memory-compaction";
import { acknowledgeInvalidPendingModelCapabilityRefreshOutcome, buildModelCapabilityRefreshPlan, readInvalidPendingModelCapabilityRefreshOutcomes, readModelCapabilityCache, readModelCapabilityDowngradeAlerts, readModelCapabilityRefreshOutcomeLedger, readModelCapabilityRefreshStatus, recordModelCapabilityEvidence, revokeModelCapabilityEvidence, runModelCapabilityCacheMaintenance, summarizeModelCapabilityCache } from "./model-capability-cache";
import { readGroupSessionRetentionMaintenanceStatus, runGroupSessionRetentionMaintenance } from "./group-session-maintenance";
import { runGroupMemoryAutoCompactionNow } from "./group-memory-context";

import {
  BasicGroupRouteDeps,
  compactGroupMessageTaskRuntime,
} from "./group-routes-part-01";

import {
  buildGroupMainAgentStatus,
} from "./group-routes-part-02";

export function handleBasicGroupRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: UrlWithParsedQuery,
  ctx: any,
  deps: BasicGroupRouteDeps,
): boolean {
  const pathname = parsed.pathname;

  if (pathname === "/api/groups" && req.method === "GET") {
    sendJson(res, { groups: loadGroups() });
    return true;
  }

  if (pathname === "/api/groups/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, members } = JSON.parse(body);
        const groups = loadGroups();
        const id = "g" + Date.now().toString(36);
        const allMembers = Array.isArray(members) ? members : [];
        const group = normalizeGroupOrchestrator({
          id, name, members: allMembers,
          created_at: new Date().toISOString(),
        });
        groups.push(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/members" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, add, remove } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (add) {
          for (const m of add) {
            if (!group.members.find((x: any) => x.project === m.project)) {
              group.members.push(m);
            }
          }
        }
        if (remove) {
          const coordinatorProject = getCoordinatorMember(group).project;
          group.members = group.members.filter((m: any) => !remove.includes(m.project) || m.project === coordinatorProject || m.role === "coordinator");
        }
        normalizeGroupOrchestrator(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id } = JSON.parse(body);
        const groups = loadGroups().filter(g => g.id !== id);
        saveGroups(groups);
        try {
          fs.unlinkSync(path.join(GROUP_MESSAGES_DIR, `${id}.json`));
        } catch {}
        try {
          fs.unlinkSync(deps.getGroupMemoryFile(id));
        } catch {}
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/rename" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, name } = JSON.parse(body);
        if (!name || !name.trim()) return sendJson(res, { error: "群聊名称不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        group.name = name.trim();
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    const toolAuth = buildToolAuthorizationPayload(group.tools || {});
    sendJson(res, { tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, connection_preflight: toolAuth.connection_preflight });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, tools } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        const previousTools = normalizeToolAuthorization(group.tools || {});
        group.tools = normalizeToolAuthorization(tools);
        saveGroups(groups);
        const toolAuth = await buildFreshToolAuthorizationPayload(group.tools);
        const authorizationChange = recordToolAuthorizationChange({
          scope: "group",
          scopeId: group_id,
          previous: previousTools,
          next: group.tools,
          actor: "api",
          source: "/api/groups/tools",
          toolAudit: toolAuth.tool_audit,
          authorizationReadiness: toolAuth.authorization_readiness,
        });
        sendJson(res, { success: true, tools: toolAuth.tools, tool_audit: toolAuth.tool_audit, authorization_readiness: toolAuth.authorization_readiness, connection_preflight: toolAuth.connection_preflight, authorization_change: authorizationChange });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    const before = JSON.stringify(group.shared_files || []);
    group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
    if (JSON.stringify(group.shared_files) !== before) saveGroups(groups);
    sendJson(res, { files: group.shared_files || [] });
    return true;
  }

  if (pathname === "/api/groups/shared/add" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name, content } = JSON.parse(body);
        if (!name || !content) return sendJson(res, { error: "文件名和内容不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        const existing = group.shared_files.findIndex((f: any) => f.name === name);
        if (existing >= 0) {
          group.shared_files[existing].content = content;
          group.shared_files[existing].type = "text";
          group.shared_files[existing].readable = true;
          group.shared_files[existing].updated_at = new Date().toISOString();
        } else {
          group.shared_files.push({
            name,
            type: "text",
            readable: true,
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        group.shared_files = group.shared_files.filter((f: any) => f.name !== name);
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/import" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, file_names } = JSON.parse(body);
        if (!file_names || !Array.isArray(file_names)) return sendJson(res, { error: "请提供文件名列表" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];

        let imported = 0;
        for (const name of file_names) {
          const filePath = ctx.getSharedFilePath(name);
          if (filePath && fs.existsSync(filePath)) {
            const record = ctx.createSharedFileRecord(name, "global");
            if (!record) continue;
            const existing = group.shared_files.findIndex((f: any) => f.name === name);
            if (existing >= 0) {
              group.shared_files[existing] = {
                ...group.shared_files[existing],
                ...record,
                created_at: group.shared_files[existing].created_at || record.created_at,
                updated_at: new Date().toISOString()
              };
            } else {
              group.shared_files.push(record);
            }
            imported++;
          }
        }
        saveGroups(groups);
        sendJson(res, { success: true, imported, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory/capacity" && req.method === "GET") {
    const config = loadOrchestratorConfig();
    const capacity = resolveGroupModelContextCapacity(config);
    sendJson(res, {
      success: true,
      schema: "ccm-group-memory-capacity-status-v1",
      capacity,
      capabilityCache: summarizeModelCapabilityCache(readModelCapabilityCache()),
      configuredAutoCompactThreshold: Number(config.modelAutoCompactTokenLimit || 0),
      effectiveAutoCompactThreshold: getGroupAutoCompactThreshold(config),
      preset: String(config.memoryContextPreset || "default"),
      model: String(config.model || ""),
      generatedAt: new Date().toISOString(),
    });
    return true;
  }

  if (pathname === "/api/groups/memory/capabilities" && req.method === "GET") {
    const cache = readModelCapabilityCache();
    sendJson(res, { success: true, cache: summarizeModelCapabilityCache(cache), entries: cache.entries, refreshPlan: buildModelCapabilityRefreshPlan(), refreshStatus: readModelCapabilityRefreshStatus(), refreshOutcomeLedger: readModelCapabilityRefreshOutcomeLedger(), invalidRefreshOutcomes: readInvalidPendingModelCapabilityRefreshOutcomes(), downgradeAlerts: readModelCapabilityDowngradeAlerts(20), generatedAt: new Date().toISOString() });
    return true;
  }

  if (pathname === "/api/groups/memory/capabilities/invalid-outcomes" && req.method === "GET") {
    sendJson(res, { success: true, ...readInvalidPendingModelCapabilityRefreshOutcomes(), generatedAt: new Date().toISOString() });
    return true;
  }

  if (pathname === "/api/groups/memory/capabilities/invalid-outcomes/acknowledge" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = acknowledgeInvalidPendingModelCapabilityRefreshOutcome({ ...payload, acknowledgedBy: "memory-center" });
        if (!result.acknowledged) return sendJson(res, { success: false, error: result.reason || "确认失败", result }, 409);
        sendJson(res, { success: true, result, invalidRefreshOutcomes: readInvalidPendingModelCapabilityRefreshOutcomes() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory/capabilities" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        if (String(payload.source || "") !== "user_setting") {
          return sendJson(res, { error: "Memory Center 只能写入 user_setting；provider 与 native receipt 由可信执行链写入" }, 400);
        }
        const result = recordModelCapabilityEvidence({ ...payload, source: "user_setting" });
        sendJson(res, { success: true, ...result });
      } catch (error: any) {
        sendJson(res, { error: error.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory/capabilities/revoke" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = revokeModelCapabilityEvidence({ ...payload, actor: "memory-center" });
        sendJson(res, { success: true, result });
      } catch (error: any) {
        sendJson(res, { error: error.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory/capabilities/maintenance" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const dryRun = payload.dryRun !== false && payload.dry_run !== false;
        if (!dryRun && payload.explicitExecution !== true && payload.explicit_execution !== true) {
          return sendJson(res, { error: "实际清理需要 explicitExecution=true" }, 400);
        }
        const result = runModelCapabilityCacheMaintenance({ ...payload, dryRun });
        sendJson(res, { success: true, result, cache: summarizeModelCapabilityCache(readModelCapabilityCache()) });
      } catch (error: any) {
        sendJson(res, { error: error.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/sessions/maintenance" && req.method === "GET") {
    sendJson(res, { success: true, status: readGroupSessionRetentionMaintenanceStatus() });
    return true;
  }

  if (pathname === "/api/groups/sessions/maintenance" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const dryRun = payload.dryRun !== false && payload.dry_run !== false;
        if (!dryRun && payload.explicitExecution !== true && payload.explicit_execution !== true) {
          return sendJson(res, { error: "实际清理需要 explicitExecution=true" }, 400);
        }
        const status = runGroupSessionRetentionMaintenance({ ...payload, dryRun, force: true, trigger: "manual-api" });
        sendJson(res, { success: true, status });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/sessions" && req.method === "GET") {
    const groupId = String(parsed.query.id || parsed.query.group_id || "").trim();
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    sendJson(res, { success: true, ...listGroupChatSessions(groupId) });
    return true;
  }

  if (pathname === "/api/groups/sessions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const groupId = String(payload.id || payload.group_id || "").trim();
        if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const action = String(payload.action || "create").trim().toLowerCase();
        const sessionId = String(payload.session_id || payload.sessionId || "");
        let session: any = null;
        let result: any = null;
        if (action === "select") session = selectGroupChatSession(groupId, sessionId);
        else if (action === "rename") session = renameGroupChatSession(groupId, sessionId, String(payload.title || ""));
        else if (action === "archive" || action === "restore") session = archiveGroupChatSession(groupId, sessionId, action === "archive");
        else if (action === "delete") {
          result = deleteGroupChatSession(groupId, sessionId, { force: payload.force === true });
          result.memoryArtifacts = deps.deleteGroupSessionMemoryArtifacts?.(groupId, sessionId) || null;
        } else if (action === "purge_legacy") {
          result = purgeLegacyDefaultGroupChatSession(groupId, { force: payload.force === true });
          if (result.purged) result.memoryArtifacts = deps.deleteGroupSessionMemoryArtifacts?.(groupId, "default") || null;
        } else if (action === "prune") {
          const retentionConfig = loadOrchestratorConfig();
          result = pruneArchivedGroupChatSessions(groupId, {
            retentionDays: retentionConfig.groupSessionRetentionDays,
            maxArchived: retentionConfig.groupSessionMaxArchived,
            ...payload,
          });
          if (result.dryRun === false) {
            for (const row of result.results || []) {
              if (row.deleted) row.memoryArtifacts = deps.deleteGroupSessionMemoryArtifacts?.(groupId, row.id) || null;
            }
          }
        } else session = createGroupChatSession(groupId, String(payload.title || ""));
        sendJson(res, { success: true, session, result, ...listGroupChatSessions(groupId) });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/messages" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const requestedLimit = parseInt(String(parsed.query.limit || "")) || 100;
    const limit = Math.max(1, Math.min(2000, requestedLimit));
    const groupIdText = String(groupId);
    const sessionId = String(parsed.query.session_id || parsed.query.sessionId || getActiveGroupChatSessionId(groupIdText));
    const rawMessages = getGroupMessages(groupIdText, sessionId).slice(-limit);
    const allTasks = loadTasks();
    const sessionTasks = allTasks.filter((task: any) => String(task?.group_id || "") === groupIdText
      && String(task?.group_session_id || task?.groupSessionId || "default") === sessionId);
    const taskIds = new Set(rawMessages.map((message: any) => String(message?.task_id || message?.task?.id || "")).filter(Boolean));
    const taskMap = new Map(sessionTasks.filter((task: any) => taskIds.has(String(task.id))).map((task: any) => [String(task.id), task]));
    const runtimeMap = new Map<string, any>();
    const runtimeAttachedTaskIds = new Set<string>();
    const getRuntime = (task: any) => {
      const taskId = String(task?.id || "");
      if (!taskId) return null;
      if (!runtimeMap.has(taskId)) {
        runtimeMap.set(taskId, compactGroupMessageTaskRuntime(deps.buildInlineTaskRuntime(task)));
      }
      return runtimeMap.get(taskId);
    };
    const messages = rawMessages.map((message: any) => {
      const taskId = String(message?.task_id || message?.task?.id || "");
      const task = taskMap.get(taskId);
      const {
        taskRuntime: _storedTaskRuntime,
        task_runtime: _storedTaskRuntimeSnake,
        taskCard: _storedTaskCard,
        task_card: _storedTaskCardSnake,
        ...messageWithoutStoredRuntime
      } = message || {};
      if (!task || runtimeAttachedTaskIds.has(taskId)) return messageWithoutStoredRuntime;
      runtimeAttachedTaskIds.add(taskId);
      const runtime = getRuntime(task);
      return { ...messageWithoutStoredRuntime, taskRuntime: runtime };
    });
    const memory = deps.loadGroupMemory(groupIdText, sessionId);
    const sessionTaskIds = new Set(sessionTasks.map((task: any) => String(task.id || "")));
    const agentQa = deps.getAgentQaItemsForGroup(groupIdText, 100).filter((item: any) => sessionTaskIds.has(String(item?.task_id || item?.taskId || ""))
      || String(item?.group_session_id || item?.groupSessionId || "") === sessionId);
    const mainAgentStatus = buildGroupMainAgentStatus({ groupId: groupIdText, tasks: sessionTasks, agentQa, getRuntime });
    sendJson(res, { messages, memory, agentQa, mainAgentStatus, sessionId, sessions: listGroupChatSessions(groupIdText).sessions });
    return true;
  }

  if (pathname === "/api/groups/memory/compact" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const groupId = String(payload.id || payload.group_id || "").trim();
        if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
        if (!loadGroups().some((item: any) => String(item.id || "") === groupId)) return sendJson(res, { error: "群聊不存在" }, 404);
        const sessionId = String(payload.session_id || payload.sessionId || getActiveGroupChatSessionId(groupId));
        const sessionExists = listGroupChatSessions(groupId).sessions.some((item: any) => String(item.id || "") === sessionId);
        if (!sessionId.startsWith("gcs_") || !sessionExists) return sendJson(res, { error: "当前群聊会话无效" }, 409);
        const customInstructions = String(payload.custom_instructions || payload.customInstructions || "").trim();
        if (customInstructions.length > 4_000) return sendJson(res, { error: "压缩附加要求不能超过 4000 个字符" }, 400);
        const result: any = await runGroupMemoryAutoCompactionNow(groupId, {
          sessionId,
          force: true,
          reason: "manual_slash_command",
          config: { memoryCompactionUseModel: true, memoryCompactionMode: "model-required", customInstructions },
        });
        if (!result.success) return sendJson(res, { error: result.error || result.reason || "手动压缩失败" }, 409);
        const compression = result.memory?.messageCompression || {};
        sendJson(res, {
          success: true,
          compacted: result.compacted === true,
          summary: result.compacted === true ? "当前群聊会话已手动压缩。" : "当前群聊会话没有可压缩的旧消息。",
          metrics: {
            群聊会话: sessionId,
            压缩旧消息: Number(compression.compressedMessages || 0),
            保留近期原文: Number(compression.recentMessages || compression.recentLimit || 0),
          },
          boundaryId: result.boundary?.id || "",
          sessionId,
        });
      } catch (error: any) {
        sendJson(res, { error: error.message || "手动压缩失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/messages/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const groupId = String(payload.id || payload.group_id || "").trim();
        if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const group = loadGroups().find((item: any) => item.id === groupId);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        const sessionId = String(payload.session_id || payload.sessionId || getActiveGroupChatSessionId(groupId));
        const before = getGroupMessages(groupId, sessionId).length;
        saveGroupMessages(groupId, [], sessionId);
        if (payload.clear_memory === true || payload.clearMemory === true) {
          try { fs.unlinkSync(deps.getGroupMemoryFile(groupId, sessionId)); } catch {}
        }
        sendJson(res, { success: true, cleared: before, session_id: sessionId, memory_cleared: payload.clear_memory === true || payload.clearMemory === true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/memory" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const sessionId = String(parsed.query.session_id || parsed.query.sessionId || getActiveGroupChatSessionId(String(groupId)));
    const project = parsed.query.project ? String(parsed.query.project) : "";
    const memory = deps.saveGroupMemory(String(groupId), deps.loadGroupMemory(String(groupId), sessionId), sessionId);
    sendJson(res, {
      success: true,
      memory,
      context: deps.buildGroupMemoryContext(memory),
      agentPacket: project ? deps.buildAgentMemoryPacket(String(groupId), project, "", { groupSessionId: sessionId }) : "",
    });
    return true;
  }

  if (pathname === "/api/groups/logs" && req.method === "GET") {
    const groupId = parsed.query.id;
    const limit = parseInt(String(parsed.query.limit || "")) || 100;
    const category = parsed.query.category;

    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const logs = loadGroupLogs();
    let groupLogs = logs[String(groupId)] || [];
    if (category) {
      groupLogs = groupLogs.filter((l: any) => l.category === category);
    }
    sendJson(res, { logs: groupLogs.slice(-limit) });
    return true;
  }

  if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id } = JSON.parse(body);
        const cleared = clearGroupLogs(String(group_id || ""));
        sendJson(res, { success: true, cleared });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);

    const logs = loadGroupLogs();
    const initialCount = (logs[String(groupId)] || []).length;
    let lastCount = initialCount;

    const interval = setInterval(() => {
      try {
        const currentLogs = loadGroupLogs();
        const groupLogs = currentLogs[String(groupId)] || [];

        if (groupLogs.length > lastCount) {
          const newLogs = groupLogs.slice(lastCount);
          for (const log of newLogs) {
            res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
          }
          lastCount = groupLogs.length;
        }
      } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
      }
    }, 1000);

    req.on("close", () => {
      clearInterval(interval);
    });
    return true;
  }

  return false;
}
