import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";

const GLOBAL_AGENT_BRIDGE_FILE = path.join(CCM_DIR, "global-agent-bridge.json");

function writeGlobalJsonAtomic(file: string, value: any) {
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, `${file}.bak`); } catch {} }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function loadGlobalAgentBridgeStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_BRIDGE_FILE)) return JSON.parse(fs.readFileSync(GLOBAL_AGENT_BRIDGE_FILE, "utf-8"));
  } catch {}
  try { return JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_BRIDGE_FILE}.bak`, "utf-8")); } catch {}
  return { requests: [] };
}

export function saveGlobalAgentBridgeStore(store: any) {
  const cutoff = Date.now() - 30 * 60 * 1000;
  store.requests = (Array.isArray(store.requests) ? store.requests : [])
    .filter((item: any) => item.status === "pending" || Date.parse(item.updated_at || item.created_at || 0) > cutoff)
    .slice(-100);
  writeGlobalJsonAtomic(GLOBAL_AGENT_BRIDGE_FILE, store);
}

export function createGlobalAgentBridgeRequest(text: string, sessionId: string) {
  const store = loadGlobalAgentBridgeStore();
  const request = {
    id: "gab_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex"),
    status: "pending",
    text,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.requests = [...(store.requests || []), request];
  saveGlobalAgentBridgeStore(store);
  return request;
}

export async function waitForGlobalAgentBridgeResult(id: string, timeoutMs = 10 * 60 * 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const store = loadGlobalAgentBridgeStore();
    const request = (store.requests || []).find((item: any) => item.id === id);
    if (request && request.status !== "pending") return request;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return { id, status: "timeout", reply: "Web 全局 Agent 控制台暂未响应，请确认 CCM 页面处于打开状态后重试。" };
}

export function getRequestBaseUrl(req: any): string {
  const port = Number(req.socket?.localPort || 3080);
  return `http://127.0.0.1:${port}`;
}

export async function callLocalApi(baseUrl: string, pathname: string, options: any = {}): Promise<any> {
  const response = await fetch(baseUrl + pathname, options);
  const data = await response.json() as any;
  if (!response.ok || data?.success === false || data?.error) {
    throw new Error(data?.error || `接口执行失败 (${response.status})`);
  }
  return data;
}

export function postLocalApi(baseUrl: string, pathname: string, body: any): Promise<any> {
  return callLocalApi(baseUrl, pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

export function parseSseApiEvents(text: string) {
  const events: any[] = [];
  for (const block of String(text || "").split(/\r?\n\r?\n/)) {
    const event = parseSseApiEventBlock(block);
    if (event) events.push(event);
  }
  return events;
}

export function parseSseApiEventBlock(block: string) {
  const data = String(block || "")
    .split(/\r?\n/)
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).trimStart())
    .join("\n")
    .trim();
  if (!data || data === "[DONE]") return null;
  try {
    return JSON.parse(data);
  } catch {
    return { type: "message", text: data };
  }
}

export async function postLocalSseOrJsonApi(baseUrl: string, pathname: string, body: any, options: { onEvent?: (event: any) => void } = {}): Promise<any> {
  const response = await fetch(baseUrl + pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
    body: JSON.stringify(body || {}),
  });
  const contentType = response.headers.get("content-type") || "";
  let text = "";
  let data: any = null;
  const events: any[] = [];
  if (!contentType.includes("application/json") && response.body && typeof (response.body as any).getReader === "function") {
    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      buffer += chunk;
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const event = parseSseApiEventBlock(block);
        if (!event) continue;
        events.push(event);
        try { options.onEvent?.(event); } catch {}
      }
    }
    const tail = decoder.decode();
    if (tail) {
      text += tail;
      buffer += tail;
    }
    if (buffer.trim()) {
      const event = parseSseApiEventBlock(buffer);
      if (event) {
        events.push(event);
        try { options.onEvent?.(event); } catch {}
      }
    }
  } else {
    text = await response.text();
  }
  if (contentType.includes("application/json") || /^\s*[{[]/.test(text)) {
    try { data = text ? JSON.parse(text) : {}; } catch { data = null; }
  }
  if (!data) {
    if (!events.length) events.push(...parseSseApiEvents(text));
    const errorEvent = events.find(event => event?.type === "error");
    const taskEvent = events.find(event => event?.type === "task_created" || event?.type === "task_updated");
    const agentEvent = events.find(event => event?.type === "agent_done");
    const doneEvent = [...events].reverse().find(event => event?.type === "done");
    data = {
      success: !errorEvent,
      events,
      error: errorEvent?.text || errorEvent?.error || "",
      reply: taskEvent?.text || agentEvent?.text || "",
      task: taskEvent?.task || null,
      queue: taskEvent?.queue || null,
      messageId: taskEvent?.messageId || agentEvent?.messageId || doneEvent?.messageId || "",
      taskId: taskEvent?.task?.id || doneEvent?.taskId || "",
    };
  }
  if (!response.ok || data?.success === false || data?.error) {
    throw new Error(data?.error || `接口执行失败 (${response.status})`);
  }
  return data;
}

