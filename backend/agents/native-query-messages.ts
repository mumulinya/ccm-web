import type { ProviderAgentTurn, ProviderToolCall } from "../system/provider-native-tools";
import { shouldUseAnthropic, shouldUseGemini, type LlmChatMessage } from "../modules/collaboration/group-orchestrator-llm-client";
import { isPersistedToolResult, modelVisiblePersistedToolResult } from "../tools/tool-result-storage";

export type NativeQueryFamily = "openai" | "anthropic" | "gemini";

export type NativeToolResult = {
  callId: string;
  name: string;
  ok: boolean;
  output?: any;
  error?: string;
  reason?: string;
};

export function nativeQueryFamily(config: any): NativeQueryFamily {
  if (shouldUseAnthropic(config)) return "anthropic";
  if (shouldUseGemini(config)) return "gemini";
  return "openai";
}

function stringifyToolOutput(result: NativeToolResult) {
  if (result.error) return JSON.stringify({ ok: false, error: result.error, reason: result.reason || "" });
  if (isPersistedToolResult(result.output)) return modelVisiblePersistedToolResult(result.output);
  if (isPersistedToolResult(result.output?.observation)) return modelVisiblePersistedToolResult(result.output.observation);
  if (typeof result.output === "string") return result.output;
  try { return JSON.stringify(result.output ?? { ok: result.ok !== false }); }
  catch { return String(result.output ?? ""); }
}

function openaiAssistantMessage(turn: ProviderAgentTurn) {
  const toolCalls = (turn.toolCalls || []).map((item: ProviderToolCall) => ({
    id: item.id,
    type: "function",
    function: { name: item.name, arguments: JSON.stringify(item.arguments ?? {}) },
  }));
  return {
    role: "assistant",
    content: String(turn.text || "") || (toolCalls.length ? null : ""),
    ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
  };
}

function anthropicAssistantMessage(turn: ProviderAgentTurn) {
  const content: any[] = [];
  if (String(turn.text || "").trim()) content.push({ type: "text", text: String(turn.text) });
  for (const item of turn.toolCalls || []) {
    content.push({ type: "tool_use", id: item.id, name: item.name, input: item.arguments || {} });
  }
  if (!content.length) content.push({ type: "text", text: "" });
  return { role: "assistant", content };
}

function geminiAssistantMessage(turn: ProviderAgentTurn) {
  const parts: any[] = [];
  if (String(turn.text || "").trim()) parts.push({ text: String(turn.text) });
  for (const item of turn.toolCalls || []) {
    parts.push({ functionCall: { id: item.id, name: item.name, args: item.arguments || {} } });
  }
  if (!parts.length) parts.push({ text: "" });
  return { role: "assistant", content: parts };
}

function openaiToolMessages(results: NativeToolResult[]) {
  return results.map(result => ({
    role: "tool",
    tool_call_id: result.callId,
    name: result.name,
    content: stringifyToolOutput(result),
  }));
}

function anthropicToolResultMessage(results: NativeToolResult[]) {
  return {
    role: "user",
    content: results.map(result => ({
      type: "tool_result",
      tool_use_id: result.callId,
      content: stringifyToolOutput(result),
      is_error: result.ok === false,
    })),
  };
}

function geminiToolResultMessage(results: NativeToolResult[]) {
  return {
    role: "user",
    content: results.map(result => ({
      functionResponse: {
        name: result.name,
        id: result.callId,
        response: result.ok === false
          ? { ok: false, error: result.error || result.reason || "tool_failed" }
          : (result.output && typeof result.output === "object" && !isPersistedToolResult(result.output) ? result.output : { result: stringifyToolOutput(result) }),
      },
    })),
  };
}

export function appendNativeAssistantTurn(messages: LlmChatMessage[], turn: ProviderAgentTurn, family: NativeQueryFamily): LlmChatMessage[] {
  const next = messages.slice();
  if (family === "anthropic") next.push(anthropicAssistantMessage(turn));
  else if (family === "gemini") next.push(geminiAssistantMessage(turn));
  else next.push(openaiAssistantMessage(turn));
  return next;
}

export function appendNativeToolResults(
  messages: LlmChatMessage[],
  results: NativeToolResult[],
  family: NativeQueryFamily,
): LlmChatMessage[] {
  if (!results.length) return messages;
  const next = messages.slice();
  if (family === "anthropic") next.push(anthropicToolResultMessage(results));
  else if (family === "gemini") next.push(geminiToolResultMessage(results));
  else next.push(...openaiToolMessages(results));
  return next;
}

export function appendNativeTurnTranscript(
  messages: LlmChatMessage[],
  turn: ProviderAgentTurn,
  results: NativeToolResult[],
  family: NativeQueryFamily,
): LlmChatMessage[] {
  return appendNativeToolResults(appendNativeAssistantTurn(messages, turn, family), results, family);
}

export function nativeTranscriptHasToolResult(messages: LlmChatMessage[]) {
  return messages.some(message => {
    if (String(message?.role || "") === "tool") return true;
    const content = message?.content;
    if (!Array.isArray(content)) return false;
    return content.some((part: any) => part?.type === "tool_result" || part?.functionResponse);
  });
}

function nativeResultFromCompactRow(row: any): NativeToolResult | null {
  const callId = String(row?.callId || row?.toolCallId || row?.tool_call_id || "").trim();
  if (!callId) return null;
  return {
    callId,
    name: String(row?.name || row?.toolName || "tool"),
    ok: row?.ok !== false,
    output: row?.output,
    error: row?.error,
    reason: row?.reason,
  };
}

function replaceToolResultPart(part: any, byId: Map<string, NativeToolResult>) {
  if (part?.type === "tool_result") {
    const result = byId.get(String(part.tool_use_id || ""));
    if (!result) return part;
    return { ...part, content: stringifyToolOutput(result), is_error: result.ok === false };
  }
  if (part?.functionResponse) {
    const result = byId.get(String(part.functionResponse.id || ""));
    if (!result) return part;
    return {
      ...part,
      functionResponse: {
        ...part.functionResponse,
        response: result.ok === false
          ? { ok: false, error: result.error || result.reason || "tool_failed" }
          : (result.output && typeof result.output === "object" && !isPersistedToolResult(result.output) ? result.output : { result: stringifyToolOutput(result) }),
      },
    };
  }
  return part;
}

export function applyCompactedToolResultsToMessages(
  messages: LlmChatMessage[],
  results: Array<{ callId?: string; toolCallId?: string; tool_call_id?: string; name?: string; ok?: boolean; output?: any; error?: string; reason?: string }>,
): LlmChatMessage[] {
  const byId = new Map<string, NativeToolResult>();
  for (const row of Array.isArray(results) ? results : []) {
    const mapped = nativeResultFromCompactRow(row);
    if (mapped) byId.set(mapped.callId, mapped);
  }
  if (!byId.size) return messages;
  return (Array.isArray(messages) ? messages : []).map(message => {
    const role = String(message?.role || "");
    if (role === "tool") {
      const result = byId.get(String((message as any).tool_call_id || ""));
      if (!result) return message;
      return { ...message, content: stringifyToolOutput(result) };
    }
    if (!Array.isArray(message?.content)) return message;
    let changed = false;
    const content = message.content.map((part: any) => {
      const next = replaceToolResultPart(part, byId);
      if (next !== part) changed = true;
      return next;
    });
    return changed ? { ...message, content } : message;
  });
}
