import type { IncomingMessage, ServerResponse } from "http";
import type { UrlWithParsedQuery } from "url";
import { sendJson } from "../../core/utils";
import { loadGroups } from "./storage";

type AgentQaRouteDeps = {
  getAgentQaItemsForGroup: (groupId: string, limit?: number) => any[];
  runAgentCollaborationProtocolSelfTest: () => any;
  setAgentQaArbitration: (id: string, decision: "accept" | "reject", reason: string) => any;
  resumeAgentQaFromStoredContinuation: (item: any, group: any, ctx: any, streamRes: any) => Promise<any>;
  setAgentQaManualTakeover: (id: string, reason: string) => any;
  retryAgentQaItem: (id: string, ctx: any, streamRes: any) => Promise<any>;
};

export function handleAgentQaRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  parsed: UrlWithParsedQuery,
  ctx: any,
  deps: AgentQaRouteDeps,
): boolean {
  const pathname = parsed.pathname;

  if (pathname === "/api/agent-collaboration/protocol" && req.method === "GET") {
    const items = deps.getAgentQaItemsForGroup(String(parsed.query.group_id || parsed.query.id || ""), parseInt(String(parsed.query.limit || "")) || 100);
    sendJson(res, {
      success: true,
      version: "8.0",
      mode: "task_bound_structured_collaboration",
      selftest: deps.runAgentCollaborationProtocolSelfTest(),
      summary: {
        total: items.length,
        open: items.filter((item: any) => ["waiting", "asking", "queued", "needs_user", "timeout", "manual", "rejected"].includes(String(item.status || ""))).length,
        accepted: items.filter((item: any) => item.acceptance?.accepted === true).length,
        rejected: items.filter((item: any) => item.acceptance?.accepted === false).length,
        resumed: items.filter((item: any) => item.status === "resumed").length,
        permission_violations: items.filter((item: any) => item.permission_boundary?.pass === false).length,
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
        if (!["accept", "reject"].includes(decision)) return sendJson(res, { success: false, error: "decision 必须是 accept 或 reject" }, 400);
        const item = deps.setAgentQaArbitration(String(payload.id || payload.qa_id || ""), decision as "accept" | "reject", String(payload.reason || ""));
        if (!item) return sendJson(res, { success: false, error: "问答记录不存在" }, 404);
        const group = loadGroups().find((entry: any) => entry.id === item.group_id);
        const wakeup = decision === "accept" && group ? await deps.resumeAgentQaFromStoredContinuation(item, group, ctx, null) : { resumed: false };
        sendJson(res, { success: true, item: wakeup.resumed ? (wakeup as any).item : item, wakeup });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
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
        if (!item) return sendJson(res, { success: false, error: "问答记录不存在" }, 404);
        sendJson(res, { success: true, item });
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
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
        sendJson(res, result, result.success ? 200 : 400);
      } catch (e: any) {
        sendJson(res, { success: false, error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/agent-qa/list" && req.method === "GET") {
    const groupId = parsed.query.group_id || parsed.query.id || "";
    const limit = parseInt(String(parsed.query.limit || "")) || 100;
    sendJson(res, { success: true, items: deps.getAgentQaItemsForGroup(String(groupId || ""), limit) });
    return true;
  }

  return false;
}
