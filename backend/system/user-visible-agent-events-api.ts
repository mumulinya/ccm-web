import type { IncomingMessage, ServerResponse } from "http";
import {
  listUserVisibleAgentEvents,
  getUserVisibleAgentEvent,
  subscribeUserVisibleAgentEvents,
  type UserVisibleAgentEvent,
} from "./user-visible-agent-events";
import { buildToolDisplayDetail, isWorkspaceReadonlyToolName } from "./tool-display-projection";
import { executeWorkspaceReadonlyTool, sealScopedToolCapability } from "../tools/workspace-readonly-tools";
import { loadGroups } from "../modules/collaboration/storage";
import { sendJson } from "../core/utils";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";

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

export async function rehydrateReadonlyToolDetail(event: UserVisibleAgentEvent) {
  if (!event.toolName || !isWorkspaceReadonlyToolName(event.toolName)) throw Object.assign(new Error("该工具不支持安全详情重取"), { statusCode: 409 });
  if (!event.toolCallId || !event.detail?.safeArguments) throw Object.assign(new Error("历史工具事件缺少可验证的调用定位"), { statusCode: 409 });
  const allowedProjects = event.scope === "project" ? [event.scopeId]
    : event.scope === "group"
      ? (loadGroups().find((group: any) => String(group?.id || "") === event.scopeId)?.members || [])
        .map((member: any) => String(member?.project || "").trim()).filter(Boolean)
      : [];
  const capabilityToken = sealScopedToolCapability({
    scope: event.scope,
    scopeId: event.scopeId,
    exactSessionId: event.exactSessionId,
    generation: event.generation,
    allowedProjects,
  });
  const result = await executeWorkspaceReadonlyTool(event.toolName, event.detail.safeArguments, capabilityToken);
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
  return current;
}

function rehydrateFailureFreshness(error: any) {
  const message = String(error?.message || error || "");
  if (/permission|权限|授权|forbidden|unauthorized/i.test(message)) return "permission_revoked";
  if (/not.?found|不存在|已删除|ENOENT/i.test(message)) return "deleted";
  return "";
}

export function handleUserVisibleAgentEventsApi(pathname: string, req: IncomingMessage, res: ServerResponse, parsed: any) {
  const detailMatch = pathname.match(/^\/api\/agent-execution\/events\/([^/]+)\/detail$/);
  if (detailMatch && req.method === "POST") {
    res.setHeader("Cache-Control", "no-store");
    try {
      const filter = identity(parsed?.query);
      const event = getUserVisibleAgentEvent(filter, decodeURIComponent(detailMatch[1]));
      if (!event) return sendJson(res, { success: false, error: "工具事件不存在或不属于当前精确会话" }, 404);
      rehydrateReadonlyToolDetail(event)
        .then(toolDisplay => sendJson(res, { success: true, schema: "ccm-tool-detail-response-v1", toolDisplay, contentStored: false }))
        .catch((error: any) => sendJson(res, {
          success: false,
          error: String(error?.message || error),
          ...(rehydrateFailureFreshness(error) ? { freshness: rehydrateFailureFreshness(error) } : {}),
          contentStored: false,
        }, Number(error?.statusCode || 400)));
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
    }
    return true;
  }
  if (pathname === "/api/agent-execution/events" && req.method === "GET") {
    try {
      const enabled = loadOrchestratorConfig().ccStyleExecutionDisplayEnabled !== false;
      sendJson(res, enabled
        ? { success: true, enabled, ...listUserVisibleAgentEvents({ ...identity(parsed?.query), ...parsed?.query }) }
        : { success: true, enabled, schema: "ccm-user-visible-agent-event-list-v1", events: [], nextCursor: 0, hasMore: false, contentStored: false });
    } catch (error: any) {
      sendJson(res, { success: false, error: String(error?.message || error) }, 400);
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
      if (written.has(event.eventId)) return;
      written.add(event.eventId);
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
      if (written.has(event.eventId)) continue;
      written.add(event.eventId);
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
