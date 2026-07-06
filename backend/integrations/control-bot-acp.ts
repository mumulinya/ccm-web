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

function extractPromptText(params: any) {
  const prompt = params?.prompt || params?.content || params?.messages || [];
  if (typeof prompt === "string") return prompt.trim();
  if (!Array.isArray(prompt)) return "";
  const parts: string[] = [];
  for (const item of prompt) {
    if (typeof item === "string") parts.push(item);
    else if (item?.type === "text" && item.text) parts.push(String(item.text));
    else if (item?.content && typeof item.content === "string") parts.push(item.content);
    else if (Array.isArray(item?.content)) {
      for (const block of item.content) {
        if (typeof block === "string") parts.push(block);
        else if (block?.type === "text" && block.text) parts.push(String(block.text));
      }
    }
  }
  return parts.join("\n").trim();
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
      const text = extractPromptText(params);
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
