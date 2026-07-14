#!/usr/bin/env node
import * as readline from "readline";

const port = Number(process.env.CCM_PORT || process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] || 3080);
const baseUrl = `http://127.0.0.1:${port}`;
const sessions = new Set<string>();
let seq = 0;

function write(message: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
}

function respond(id: any, result: any) {
  write({ id, result });
}

function respondError(id: any, code: number, message: string) {
  write({ id, error: { code, message } });
}

function notify(method: string, params: any) {
  write({ method, params });
}

function extractPrompt(params: any) {
  const prompt = params?.prompt || params?.content || params?.messages || [];
  if (typeof prompt === "string") return { text: prompt.trim(), unsupported: [] as string[] };
  if (!Array.isArray(prompt)) return { text: "", unsupported: [] as string[] };
  const parts: string[] = [];
  const unsupported: string[] = [];
  const collect = (block: any) => {
    if (typeof block === "string") {
      parts.push(block);
      return;
    }
    if (!block || typeof block !== "object") return;
    if (block.type === "text" && block.text) {
      parts.push(String(block.text));
      return;
    }
    if (typeof block.content === "string") {
      parts.push(block.content);
      return;
    }
    if (Array.isArray(block.content)) {
      for (const nested of block.content) collect(nested);
      return;
    }
    const kind = String(block.type || block.mimeType || "attachment").toLowerCase();
    if (/image|audio|video|file|resource|attachment/.test(kind) || block.uri || block.data) unsupported.push(kind);
  };
  for (const item of prompt) {
    collect(item);
  }
  return { text: parts.join("\n").trim(), unsupported: [...new Set(unsupported)] };
}

async function callGlobalAgent(text: string, sessionId = "default", messageId = "") {
  const response = await fetch(`${baseUrl}/api/feishu/control-bot/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CCM-ACP": "1" },
    body: JSON.stringify({ text, sessionId, messageId, source: "cc-connect-acp" }),
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  const data = await response.json() as any;
  if (!response.ok || data?.success === false) throw new Error(data?.error || `全局 Agent 请求失败 (${response.status})`);
  return String(data.reply || data.message || "已处理");
}

function sendTextUpdate(sessionId: string, text: string) {
  notify("session/update", {
    sessionId,
    update: {
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text },
      messageId: `ccm-${Date.now()}`,
    },
  });
}

async function handleRequest(message: any) {
  const { id, method, params } = message;
  try {
    if (method === "initialize") {
      respond(id, {
        protocolVersion: params?.protocolVersion || 1,
        agentCapabilities: {
          loadSession: false,
          promptCapabilities: { image: false, audio: false, embeddedContext: false },
          mcpCapabilities: { http: false, sse: false },
          sessionCapabilities: {},
          auth: {},
        },
        agentInfo: { name: "CCM Global Agent", version: "1.0.0" },
        authMethods: [],
      });
      return;
    }

    if (method === "session/new") {
      const sessionId = `ccm-global-${Date.now().toString(36)}-${++seq}`;
      sessions.add(sessionId);
      respond(id, { sessionId, configOptions: null, modes: null });
      return;
    }

    if (method === "session/load") {
      const sessionId = String(params?.sessionId || params?.id || `ccm-global-${Date.now().toString(36)}-${++seq}`);
      sessions.add(sessionId);
      respond(id, { sessionId, configOptions: null, modes: null });
      return;
    }

    if (method === "session/prompt") {
      const sessionId = String(params?.sessionId || "default");
      sessions.add(sessionId);
      const prompt = extractPrompt(params);
      const text = prompt.text;
      if (prompt.unsupported.length > 0) {
        sendTextUpdate(sessionId, "我看到了附件，但当前飞书控制通道还不能可靠读取附件内容。请把任务目标和附件中的关键信息用文字发给我，我会继续处理。附件不会被当作已读取或已验收。");
        respond(id, { stopReason: "end_turn" });
        return;
      }
      if (!text) {
        sendTextUpdate(sessionId, "请发送文字指令。");
        respond(id, { stopReason: "end_turn" });
        return;
      }
      const reply = await callGlobalAgent(text, sessionId, String(id ?? ""));
      sendTextUpdate(sessionId, reply);
      respond(id, { stopReason: "end_turn" });
      return;
    }

    if (method === "session/cancel" || method === "session/close" || method === "session/delete") {
      respond(id, {});
      return;
    }

    if (id !== undefined) respondError(id, -32601, `Unsupported method: ${method}`);
  } catch (error: any) {
    if (id !== undefined) respondError(id, -32000, error?.message || String(error));
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  const text = line.trim();
  if (!text) return;
  try {
    void handleRequest(JSON.parse(text));
  } catch (error: any) {
    respondError(null, -32700, error?.message || "Parse error");
  }
});
