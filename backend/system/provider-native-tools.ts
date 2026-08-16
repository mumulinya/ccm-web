import * as crypto from "crypto";
import type { LlmTokenUsage } from "../modules/collaboration/group-orchestrator-llm-client";

export type ProviderToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  deferred?: boolean;
};

export type ProviderToolCall = { id: string; name: string; arguments: any; argumentsChecksum: string };
export type ProviderAgentTurn = {
  text: string;
  toolCalls: ProviderToolCall[];
  toolReferences: string[];
  stopReason: string;
  usage: LlmTokenUsage;
};

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function providerContentText(value: any) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(item => typeof item === "string" ? item : String(item?.text || item?.content || "")).join("");
  }
  if (value && typeof value === "object") return String(value.text || value.content || "");
  return "";
}

function parseArguments(value: any) {
  if (value && typeof value === "object") return value;
  try { const parsed = JSON.parse(String(value || "{}")); return parsed && typeof parsed === "object" ? parsed : {}; }
  catch { return { _malformedJson: String(value || "").slice(0, 4000) }; }
}

function call(id: any, name: any, args: any): ProviderToolCall {
  const parsed = parseArguments(args);
  return { id: String(id || `call_${checksum({ name, parsed }).slice(0, 16)}`), name: String(name || ""), arguments: parsed, argumentsChecksum: checksum(parsed) };
}

export function providerToolsRequestPatch(family: "openai" | "anthropic" | "gemini", tools: ProviderToolDefinition[], nativeToolReference = false) {
  const filtered = tools.filter(tool => tool?.name && tool.deferred !== true);
  if (family === "openai") return { body: { tools: filtered.map(tool => ({ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.inputSchema || { type: "object", properties: {} } } })), tool_choice: "auto" }, headers: {} };
  if (family === "gemini") return { body: { tools: [{ functionDeclarations: filtered.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.inputSchema || { type: "object", properties: {} } })) }] }, headers: {} };
  return {
    body: { tools: tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.inputSchema || { type: "object", properties: {} }, ...(nativeToolReference && tool.deferred === true ? { defer_loading: true } : {}) })) },
    headers: nativeToolReference ? { "anthropic-beta": "advanced-tool-use-2025-11-20" } : {},
  };
}

export function parseOpenAiAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn {
  const message = data?.choices?.[0]?.message || {};
  return {
    text: providerContentText(message.content),
    toolCalls: (message.tool_calls || []).map((item: any) => call(item.id, item.function?.name, item.function?.arguments)),
    toolReferences: [],
    stopReason: String(data?.choices?.[0]?.finish_reason || ""),
    usage,
  };
}

export function parseGeminiAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn {
  const parts = (data?.candidates || []).flatMap((candidate: any) => candidate?.content?.parts || []);
  return {
    text: parts.map((part: any) => String(part?.text || "")).join(""),
    toolCalls: parts.filter((part: any) => part?.functionCall).map((part: any) => call(part.functionCall.id, part.functionCall.name, part.functionCall.args)),
    toolReferences: [],
    stopReason: String(data?.candidates?.[0]?.finishReason || ""),
    usage,
  };
}

export function parseAnthropicAgentTurn(data: any, usage: LlmTokenUsage): ProviderAgentTurn {
  const parts = Array.isArray(data?.content) ? data.content : [];
  return {
    text: parts.filter((part: any) => part?.type === "text").map((part: any) => String(part.text || "")).join(""),
    toolCalls: parts.filter((part: any) => part?.type === "tool_use").map((part: any) => call(part.id, part.name, part.input)),
    toolReferences: parts.filter((part: any) => part?.type === "tool_reference").map((part: any) => String(part.tool_name || part.name || "")).filter(Boolean),
    stopReason: String(data?.stop_reason || ""),
    usage,
  };
}

export function turnForLegacyJsonLoop(turn: ProviderAgentTurn) {
  if (turn.toolCalls.length) return JSON.stringify({
    responseType: "tool_calls",
    ...(turn.text.trim() ? { progressUpdate: turn.text.trim(), progressKind: "before_tools" } : {}),
    toolRequests: turn.toolCalls.map(item => ({ name: item.name, arguments: item.arguments, reason: "Provider原生工具调用" })),
    providerToolCallIds: turn.toolCalls.map(item => item.id),
    toolReferences: turn.toolReferences,
  });
  return turn.text.trim();
}

function tryCompleteToolCall(row: { id: string; name: string; arguments: string }, emitted: Set<string>, onToolCallReady?: (item: ProviderToolCall) => void) {
  if (!row.name || !String(row.arguments || "").trim() || emitted.has(`${row.id}:${row.name}`)) return;
  try {
    const parsed = JSON.parse(String(row.arguments));
    if (!parsed || typeof parsed !== "object") return;
    const item = call(row.id, row.name, parsed);
    emitted.add(`${row.id}:${row.name}`);
    onToolCallReady?.(item);
  } catch {}
}

export function createOpenAiStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void) {
  const calls = new Map<number, { id: string; name: string; arguments: string }>();
  const emitted = new Set<string>();
  let text = "";
  let stopReason = "";
  return {
    push(event: any) {
      const choice = event?.choices?.[0];
      text += providerContentText(choice?.delta?.content);
      stopReason = String(choice?.finish_reason || stopReason || "");
      for (const item of choice?.delta?.tool_calls || []) {
        const index = Number(item.index || 0);
        const row = calls.get(index) || { id: "", name: "", arguments: "" };
        row.id += String(item.id || ""); row.name += String(item.function?.name || ""); row.arguments += String(item.function?.arguments || "");
        calls.set(index, row);
        tryCompleteToolCall(row, emitted, onToolCallReady);
      }
    },
    finish(usage: LlmTokenUsage): ProviderAgentTurn { return { text, toolCalls: [...calls.values()].map(row => call(row.id, row.name, row.arguments)), toolReferences: [], stopReason, usage }; },
  };
}

export function createAnthropicStreamTurnAccumulator(onToolCallReady?: (item: ProviderToolCall) => void) {
  const blocks = new Map<number, any>();
  const emitted = new Set<string>();
  let text = "";
  let stopReason = "";
  return {
    push(event: any) {
      if (event?.type === "content_block_start") blocks.set(Number(event.index || 0), { ...(event.content_block || {}), partial: "" });
      if (event?.type === "content_block_delta") {
        const block = blocks.get(Number(event.index || 0)) || { type: event?.delta?.type === "input_json_delta" ? "tool_use" : "text", partial: "" };
        if (event?.delta?.type === "text_delta") { block.text = String(block.text || "") + String(event.delta.text || ""); text += String(event.delta.text || ""); }
        if (event?.delta?.type === "input_json_delta") block.partial += String(event.delta.partial_json || "");
        blocks.set(Number(event.index || 0), block);
        if (block.type === "tool_use") tryCompleteToolCall({ id: String(block.id || ""), name: String(block.name || ""), arguments: String(block.partial || "") }, emitted, onToolCallReady);
      }
      if (event?.type === "content_block_stop") {
        const block = blocks.get(Number(event.index || 0));
        if (block?.type === "tool_use") {
          const item = call(block.id, block.name, block.input || block.partial);
          if (!emitted.has(`${item.id}:${item.name}`)) {
            emitted.add(`${item.id}:${item.name}`);
            onToolCallReady?.(item);
          }
        }
      }
      stopReason = String(event?.delta?.stop_reason || event?.stop_reason || stopReason || "");
    },
    finish(usage: LlmTokenUsage): ProviderAgentTurn {
      const values = [...blocks.values()];
      return { text, toolCalls: values.filter(row => row.type === "tool_use").map(row => call(row.id, row.name, row.input || row.partial)), toolReferences: values.filter(row => row.type === "tool_reference").map(row => String(row.tool_name || row.name || "")).filter(Boolean), stopReason, usage };
    },
  };
}
