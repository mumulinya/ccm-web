import type { IncomingMessage, ServerResponse } from "http";
import {
  listUserVisibleAgentEvents,
  listTaskAttemptReplayProjections,
  listUserVisibleAgentEventsForTaskAttempt,
  getUserVisibleAgentEvent,
  subscribeUserVisibleAgentEvents,
  type UserVisibleAgentEvent,
} from "./user-visible-agent-events";
import { buildToolDisplayDetail, isWorkspaceReadonlyToolName, workspaceReadonlyContractVersion } from "./tool-display-projection";
import { executeWorkspaceReadonlyTool, sealScopedToolCapability } from "../tools/workspace-readonly-tools";
import { loadGroups } from "../modules/collaboration/storage";
import { sendJson } from "../core/utils";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import { projectUnifiedAgentTurnStates } from "./unified-agent-turn-state";
import { getConfigs } from "../core/db";
import { hasResourceAccess, hasTaskResourceAccess } from "../modules/system/access-policy";
import { loadTasks } from "../core/db";
import { getCommandLiveTail } from "./command-live-progress";
import { projectEventFileDiff } from "./event-file-diff";
import { projectEventFileSource } from "./event-file-source";

function identity(query: any) {
  return {
    scope: query?.scope,
    scopeId: query?.scope_id || query?.scopeId,
    exactSessionId: query?.exact_session_id || query?.exactSessionId || query?.session_id || query?.sessionId,
  };
}

function matches(event: UserVisibleAgentEvent, filter: any) {
  return event.scope === filter.scope
    && event.scopeId === filter.scopeId
    && event.exactSessionId === filter.exactSessionId;
}

function writeEvent(res: ServerResponse, event: UserVisibleAgentEvent) {
  if (event.sequence > 0) res.write(`id: ${event.sequence}\n`);
  res.write(`event: agent_execution\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function normalizedToolPath(value: any) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function observedFileChecksums(event: UserVisibleAgentEvent) {
  const rows: any[] = Array.isArray(event.detail?.toolDisplay?.result?.rows) ? event.detail.toolDisplay.result.rows as any[] : [];
  const checksums = new Map<string, string>();
  for (const row of rows) {
    const filePath = normalizedToolPath(row?.path);
    const value = String(row?.checksum || "").trim();
    if (filePath && value) checksums.set(filePath, value);
  }
  const singlePath = normalizedToolPath(event.detail?.safeArguments?.path);
  const singleRevision = String(event.detail?.toolDisplay?.result?.authoritativeRevision || "").trim();
  if (singlePath && singleRevision && !checksums.has(singlePath)) checksums.set(singlePath, singleRevision);
  return checksums;
}

function attachSourceFreshness(event: UserVisibleAgentEvent, current: any) {
  const observed = observedFileChecksums(event);
  const fileRows = Array.isArray(current?.result?.fileRows) ? current.result.fileRows : [];
  for (const row of fileRows) {
    const filePath = normalizedToolPath(row?.path);
    const observedChecksum = String(observed.get(filePath) || "").trim();
    const currentChecksum = String(row?.checksum || row?.currentChecksum || "").trim();
    row.observedChecksum = observedChecksum || undefined;
    row.currentChecksum = currentChecksum || undefined;
    row.freshness = observedChecksum && currentChecksum && observedChecksum !== currentChecksum ? "drifted" : "current";
  }
  if (fileRows.some((row: any) => row.freshness === "drifted")) current.result.freshness = "drifted";
  else if (fileRows.length) current.result.freshness = "current";
  return current;
}

function eventReadProject(event: UserVisibleAgentEvent) {
  const explicit = String(event.detail?.fileReadEvidence?.project || event.detail?.safeArguments?.project_id || event.detail?.safeArguments?.projectId || event.detail?.safeArguments?.project || "").trim();
  if (explicit) return explicit;
  const task: any = event.taskId ? loadTasks().find((item: any) => String(item?.id || "") === String(event.taskId)) : null;
  const workItem: any = (Array.isArray(task?.work_items) ? task.work_items : [])
    .find((item: any) => String(item?.id || item?.workItemId || "") === String(event.workItemId || ""));
  return String(workItem?.project || workItem?.target || task?.target_project || task?.targetProject || event.detail?.agentDisplay?.projectId || (event.scope === "project" ? event.scopeId : "")).trim();
}

function canReadCurrentSource(req: IncomingMessage, event: UserVisibleAgentEvent) {
  const principal = (req as any).ccmAuth;
  if (!principal || principal.kind !== "browser" || principal.role === "admin") return true;
  const userId = String(principal.userId || "");
  const task = event.taskId ? loadTasks().find((item: any) => String(item?.id || "") === String(event.taskId)) : null;
  if (task && !hasTaskResourceAccess(task, principal, "use")) return false;
  if (event.scope === "project" && !hasResourceAccess(userId, principal.role, "project", event.scopeId, "use")) return false;
  if (event.scope === "group" && !hasResourceAccess(userId, principal.role, "group", event.scopeId, "use")) return false;
  const requestedProject = eventReadProject(event);
  return !!requestedProject && hasResourceAccess(userId, principal.role, "project", requestedProject, "use");
}

function eventDiffProject(event: UserVisibleAgentEvent, requestedPath: string) {
  const normalized = normalizedToolPath(requestedPath);
  const row: any = (Array.isArray(event.detail?.fileChanges) ? event.detail.fileChanges : [])
    .find((item: any) => normalizedToolPath(item?.path || item?.file || item?.name) === normalized);
  const task: any = event.taskId ? loadTasks().find((item: any) => String(item?.id || "") === String(event.taskId)) : null;
  return String(row?.project || event.detail?.agentDisplay?.projectId || task?.target_project || task?.targetProject || (event.scope === "project" ? event.scopeId : "")).trim();
}

function canReadProjectCode(req: IncomingMessage, project: string) {
  const principal = (req as any).ccmAuth;
  if (!principal || principal.kind !== "browser" || principal.role === "admin") return true;
  return !!project && hasResourceAccess(String(principal.userId || ""), principal.role, "project", project, "use");
}

export async function rehydrateReadonlyToolDetail(event: UserVisibleAgentEvent, options: any = {}) {
  if (event.detail?.fileReadEvidence) {
    if (!event.taskId || !event.workItemId || !event.agentRunId || !event.toolCallId) {
      throw Object.assign(new Error("子 Agent 文件读取事件缺少完整的任务、工作项或运行绑定"), { statusCode: 409 });
    }
    const source = projectEventFileSource(event, eventReadProject(event));
    const current = buildToolDisplayDetail({
      toolName: "mcp__ccm__ccm_workspace_readonly__read_file",
      arguments: {
        project_id: source.project,
        path: source.path,
        offset: source.offset,
        limit: source.lines.length,
      },
      result: source,
      transientBody: true,
      freshness: source.freshness,
      authoritativeRevision: source.checksum,
    });
    for (const row of current.result.fileRows || []) {
      row.observedChecksum = event.detail.fileReadEvidence.checksum;
      row.currentChecksum = source.checksum;
      row.freshness = source.freshness;
    }
    current.result.freshness = source.freshness;
    return current;
  }
  if (!event.toolName || !isWorkspaceReadonlyToolName(event.toolName)) throw Object.assign(new Error("该工具不支持安全详情重取"), { statusCode: 409 });
  if (!event.toolCallId || !event.detail?.safeArguments) throw Object.assign(new Error("历史工具事件缺少可验证的调用定位"), { statusCode: 409 });
  const allowedProjects = event.scope === "project" ? [event.scopeId]
    : event.scope === "group"
      ? (loadGroups().find((group: any) => String(group?.id || "") === event.scopeId)?.members || [])
        .map((member: any) => String(member?.project || "").trim()).filter(Boolean)
      : (() => {
        const requestedProject = String(event.detail?.safeArguments?.project_id || event.detail?.safeArguments?.projectId || "").trim();
        return requestedProject && getConfigs().some((project: any) => String(project?.name || "") === requestedProject)
          ? [requestedProject]
          : [];
      })();
  const capabilityToken = sealScopedToolCapability({
    scope: event.scope,
    scopeId: event.scopeId,
    exactSessionId: event.exactSessionId,
    generation: event.generation,
    allowedProjects,
  });
  let executionArguments: any = event.detail.safeArguments;
  const continuationFiles = Array.isArray(options?.continuation?.files) ? options.continuation.files : [];
  const continueSourceRead = options?.continue === true && /(?:^|__)read_files?$/i.test(String(event.toolName || ""));
  if (continueSourceRead) {
    const isBatch = /(?:^|__)read_files$/i.test(String(event.toolName || ""));
    const originalValues = isBatch
      ? (Array.isArray(event.detail.safeArguments?.paths) ? event.detail.safeArguments.paths : [])
      : [event.detail.safeArguments?.path];
    const originalPaths = new Set(originalValues
      .map((item: any) => String(typeof item === "string" ? item : item?.path || "").replace(/\\/g, "/").trim())
      .filter(Boolean));
    const paths = continuationFiles.slice(0, 20).map((item: any) => ({
      path: String(item?.path || "").replace(/\\/g, "/").trim(),
      offset: Math.max(1, Number(item?.nextOffset || item?.next_offset || 1)),
      expectedChecksum: String(item?.checksum || ""),
    })).filter((item: any) => item.path && originalPaths.has(item.path));
    if (!paths.length) throw Object.assign(new Error("没有可继续读取的文件"), { statusCode: 409 });
    executionArguments = isBatch ? {
      ...event.detail.safeArguments,
      // Continue in bounded chunks. An explicit offset without a limit means
      // "read to EOF" in the V3 contract and can exceed the per-file budget.
      paths: paths.map((item: any) => ({ path: item.path, offset: item.offset, limit: 100, expected_checksum: item.expectedChecksum })),
    } : {
      ...event.detail.safeArguments,
      path: paths[0].path,
      offset: paths[0].offset,
      limit: 100,
      expected_checksum: paths[0].expectedChecksum,
    };
    const result = await executeWorkspaceReadonlyTool(event.toolName, executionArguments, capabilityToken, 3) as any;
    const rawPayload = result?.modelPayload || result;
    const rawFiles = isBatch && Array.isArray(rawPayload?.files) ? rawPayload.files : [rawPayload];
    const changed = paths.find((item: any) => item.expectedChecksum
      && rawFiles.find((file: any) => String(file?.path || "") === item.path)?.checksum !== item.expectedChecksum);
    if (changed) throw Object.assign(new Error(`文件内容已变化，请重新读取当前详情：${changed.path}`), { statusCode: 409 });
    const current = buildToolDisplayDetail({
      toolName: event.toolName,
      arguments: event.detail.safeArguments,
      result,
      transientBody: true,
      freshness: "current",
    });
    const pendingCount = Number(current.result.continuation?.pendingCount || 0);
    current.result.summary = `已继续读取 ${paths.length} 个文件${pendingCount ? `，仍有 ${pendingCount} 个文件未读完` : "，剩余内容已读完"}`;
    return attachSourceFreshness(event, current);
  }
  const result = await executeWorkspaceReadonlyTool(
    event.toolName,
    executionArguments,
    capabilityToken,
    workspaceReadonlyContractVersion(event.toolName, event.detail?.toolContractVersion),
  );
  const current = buildToolDisplayDetail({
    toolName: event.toolName,
    arguments: event.detail.safeArguments,
    result,
    transientBody: true,
    freshness: "current",
  });
  const previousRevision = String(event.detail?.toolDisplay?.result?.authoritativeRevision || "");
  const currentRevision = String(current.result.authoritativeRevision || "");
  if (previousRevision && currentRevision && previousRevision !== currentRevision) current.result.freshness = "drifted";
  return attachSourceFreshness(event, current);
}

function rehydrateFailureFreshness(error: any) {
  const message = String(error?.message || error || "");
  if (/permission|权限|授权|forbidden|unauthorized/i.test(message)) return "permission_revoked";
  if (/not.?found|不存在|已删除|ENOENT/i.test(message)) return "deleted";
  if (/已变化|checksum|版本漂移/i.test(message)) return "drifted";
  return "";
}

export function handleUserVisibleAgentEventsApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any) {
  const detailMatch = pathname.match(/^\/api\/agent-execution\/events\/([^/]+)\/detail$/);
  if (detailMatch && req.method === "POST") {
    res.setHeader("Cache-Control", "private, no-store");
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 128_000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const filter = identity(parsed?.query);
        const event = getUserVisibleAgentEvent(filter, decodeURIComponent(detailMatch[1]));
        if (!event) return sendJson(res, { success: false, error: "工具事件不存在或不属于当前精确会话" }, 404);
        const options = body ? JSON.parse(body) : {};
        if (options?.includeDiff === true) {
          const requestedPath = normalizedToolPath(options?.path);
          if (!requestedPath) return sendJson(res, { success: false, error: "Diff详情请求缺少文件路径", contentStored: false }, 400);
          const project = eventDiffProject(event, requestedPath);
          if (!canReadProjectCode(req, project)) return sendJson(res, { success: false, error: "当前账户没有目标项目的源码读取权限", freshness: "permission_revoked", contentStored: false }, 403);
          const detail = projectEventFileDiff(event, requestedPath, project);
          return sendJson(res, { success: true, ...detail });
        }
        if (options?.includeLiveTail === true) {
          const principal = (req as any).ccmAuth;
          const task = event.taskId ? loadTasks().find((item: any) => String(item?.id || "") === String(event.taskId)) : null;
          const canManage = principal?.role === "admin"
            || (task && hasTaskResourceAccess(task, principal, "manage"))
            || (event.scope !== "global" && hasResourceAccess(String(principal?.userId || ""), principal?.role, event.scope, event.scopeId, "manage"));
          if (!canManage) return sendJson(res, { success: false, error: "只有资源管理者可以查看脱敏最近输出" }, 403);
          const findRunId = (value: any, depth = 0): string => {
            if (!value || depth > 5) return "";
            if (typeof value !== "object") return "";
            if (value.command_run_id || value.commandRunId) return String(value.command_run_id || value.commandRunId);
            for (const child of Object.values(value)) {
              const found = findRunId(child, depth + 1);
              if (found) return found;
            }
            return "";
          };
          const commandRunId = findRunId(event.detail?.safeResult) || findRunId(event.detail?.toolDisplay?.result);
          const liveTail = commandRunId ? getCommandLiveTail(commandRunId) : null;
          return sendJson(res, { success: true, schema: "ccm-tool-detail-response-v1", toolDisplay: event.detail?.toolDisplay || null, liveTail, contentStored: false });
        }
        if (options?.includeSource !== true) return sendJson(res, { success: false, error: "源码详情请求缺少明确读取标记", contentStored: false }, 400);
        if (!canReadCurrentSource(req, event)) return sendJson(res, { success: false, error: "当前账户没有目标项目的源码读取权限", freshness: "permission_revoked", contentStored: false }, 403);
        const toolDisplay = await rehydrateReadonlyToolDetail(event, options);
        sendJson(res, { success: true, schema: "ccm-tool-detail-response-v1", toolDisplay, contentStored: false });
      } catch (error: any) {
        sendJson(res, {
          success: false,
          error: String(error?.message || error),
          ...(rehydrateFailureFreshness(error) ? { freshness: rehydrateFailureFreshness(error) } : {}),
          contentStored: false,
        }, Number(error?.statusCode || 400));
      }
    });
    return true;
  }
  if (pathname === "/api/agent-execution/events" && req.method === "GET") {
    try {
      const enabled = loadOrchestratorConfig().ccStyleExecutionDisplayEnabled !== false;
      const taskId = String(parsed?.query?.task_id || parsed?.query?.taskId || "").trim();
      const attempt = Math.max(0, Number(parsed?.query?.attempt || 0));
      if (enabled && taskId) {
        const task = loadTasks().find((item: any) => String(item?.id || "") === taskId);
        if (!task || !hasTaskResourceAccess(task, (req as any).ccmAuth, "use")) {
          return sendJson(res, { success: false, error: "当前账户无权查看该任务的执行记录", contentStored: false }, 403);
        }
      }
      const page = enabled
        ? taskId && attempt
          ? listUserVisibleAgentEventsForTaskAttempt({ ...identity(parsed?.query), ...parsed?.query, taskId, attempt })
          : listUserVisibleAgentEvents({ ...identity(parsed?.query), ...parsed?.query })
        : null;
      sendJson(res, enabled
        ? { success: true, enabled, ...page, turnStates: projectUnifiedAgentTurnStates(page?.events || []) }
        : { success: true, enabled, schema: "ccm-user-visible-agent-event-list-v1", events: [], nextCursor: 0, hasMore: false, contentStored: false });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }
  if (pathname === "/api/agent-execution/attempts" && req.method === "GET") {
    try {
      const taskId = String(parsed?.query?.task_id || parsed?.query?.taskId || "").trim();
      const task = taskId ? loadTasks().find((item: any) => String(item?.id || "") === taskId) : null;
      if (!task || !hasTaskResourceAccess(task, (req as any).ccmAuth, "use")) {
        return sendJson(res, { success: false, error: "当前账户无权查看该任务的历史执行", contentStored: false }, 403);
      }
      sendJson(res, { success: true, ...listTaskAttemptReplayProjections({ ...identity(parsed?.query), ...parsed?.query, taskId }) });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error), contentStored: false }, 400);
    }
    return true;
  }
  if (pathname !== "/api/agent-execution/events/stream" || req.method !== "GET") return false;
  try {
    if (loadOrchestratorConfig().ccStyleExecutionDisplayEnabled === false) {
      res.writeHead(204, { "Cache-Control": "no-store" });
      res.end();
      return true;
    }
    const filter = identity(parsed?.query);
    const cursor = Math.max(0, Number(req.headers["last-event-id"] || parsed?.query?.cursor || parsed?.query?.after || 0));
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");
    const queued: UserVisibleAgentEvent[] = [];
    const written = new Set<string>();
    let replayReady = false;
    const unsubscribe = subscribeUserVisibleAgentEvents(event => {
      if (!matches(event, filter)) return;
      if (!replayReady) { queued.push(event); return; }
      // Persisted events are immutable. Live-only tool progress deliberately
      // reuses a stable event id so the client can update one row in place.
      if (event.sequence > 0 && written.has(event.eventId)) return;
      if (event.sequence > 0) written.add(event.eventId);
      try { writeEvent(res, event); } catch { unsubscribe(); }
    });
    let replayCursor = cursor;
    let hasMore = true;
    while (hasMore) {
      const page = listUserVisibleAgentEvents({ ...filter, cursor: replayCursor, limit: 500 });
      for (const event of page.events) {
        written.add(event.eventId);
        writeEvent(res, event);
      }
      hasMore = page.hasMore && page.nextCursor > replayCursor;
      replayCursor = page.nextCursor;
    }
    replayReady = true;
    for (const event of queued) {
      if (event.sequence > 0 && written.has(event.eventId)) continue;
      if (event.sequence > 0) written.add(event.eventId);
      writeEvent(res, event);
    }
    const heartbeat = setInterval(() => {
      try { res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString(), contentStored: false })}\n\n`); }
      catch { clearInterval(heartbeat); unsubscribe(); }
    }, 15_000);
    heartbeat.unref?.();
    req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
  } catch (error: any) {
    if (!res.headersSent) sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    else res.end();
  }
  return true;
}
