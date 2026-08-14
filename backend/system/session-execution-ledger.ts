import * as crypto from "crypto";
import { projectContextSourceToolResultForPersistence } from "./context-source-tool-result-projection";

export type SessionExecutionEventType = "tool_use" | "tool_result";

export type SessionExecutionEvent = {
  id: string;
  type: SessionExecutionEventType;
  toolCallId: string;
  toolName: string;
  timestamp: string;
  runId: string;
  traceId: string;
  anchorMessageId: string;
  status: "running" | "ok" | "error";
  hidden: true;
  payload: any;
};

const SECRET_KEY = /(?:^|_)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)(?:$|_)/i;
const BINARY_KEY = /(?:^|_)(?:data|base64|bytes|image[_-]?data|file[_-]?data)(?:$|_)/i;
const DATA_URL = /data:(?:image|application\/pdf)\/[a-z0-9.+-]+;base64,[a-z0-9+/=]{64,}/gi;
const INLINE_SECRET = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;

function hash(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

export function sanitizeSessionExecutionValue(value: any, depth = 0, seen = new WeakSet<object>()): any {
  if (depth > 12) return "[depth-limited]";
  if (typeof value === "string") return value.replace(DATA_URL, "[binary-media]").replace(INLINE_SECRET, "$1[redacted]");
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return `[binary:${value.byteLength}]`;
  if (Array.isArray(value)) return value.map(item => sanitizeSessionExecutionValue(item, depth + 1, seen));
  const output: any = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) output[key] = "[redacted]";
    else if (BINARY_KEY.test(key) && (typeof nested === "string" || Buffer.isBuffer(nested) || nested instanceof Uint8Array)) output[key] = "[binary-content]";
    else output[key] = sanitizeSessionExecutionValue(nested, depth + 1, seen);
  }
  return output;
}

export function createSessionExecutionEvent(input: Partial<SessionExecutionEvent> & {
  type: SessionExecutionEventType;
  toolName: string;
  payload?: any;
}) {
  const timestamp = String(input.timestamp || new Date().toISOString());
  const status: SessionExecutionEvent["status"] = input.status === "error" ? "error" : input.type === "tool_use" ? "running" : "ok";
  const normalized = {
    type: input.type,
    toolName: String(input.toolName || "tool"),
    toolCallId: String(input.toolCallId || ""),
    timestamp,
    runId: String(input.runId || ""),
    traceId: String(input.traceId || ""),
    anchorMessageId: String(input.anchorMessageId || ""),
    status,
    payload: sanitizeSessionExecutionValue(input.type === "tool_result"
      ? projectContextSourceToolResultForPersistence(input.toolName, input.payload ?? null)
      : input.payload ?? null),
  };
  const toolCallId = normalized.toolCallId || `tc_${hash([normalized.runId, normalized.toolName, timestamp, normalized.type])}`;
  return {
    ...normalized,
    id: String(input.id || `exec_${hash([toolCallId, normalized.type, timestamp])}`),
    toolCallId,
    hidden: true as const,
  } satisfies SessionExecutionEvent;
}

export function executionEventModelContent(event: SessionExecutionEvent, options: { clearToolResult?: boolean; replacementText?: string } = {}) {
  const serialized = JSON.stringify(event.payload ?? null);
  if (event.type === "tool_use") return `[tool_use ${event.toolName} #${event.toolCallId}]\n${serialized}`;
  const projected = options.clearToolResult === true
    ? "[Old tool result content cleared]"
    : String(options.replacementText || serialized);
  return `[tool_result ${event.toolName} #${event.toolCallId} status=${event.status}]\n${projected}`;
}

export function executionEventToModelMessage(event: SessionExecutionEvent, options: { clearToolResult?: boolean; replacementText?: string } = {}) {
  return {
    id: event.id,
    role: event.type === "tool_use" ? "assistant" : "user",
    content: executionEventModelContent(event, options),
    timestamp: event.timestamp,
    type: event.type,
    tool_call_id: event.toolCallId,
    tool_name: event.toolName,
    hidden_execution: true,
    anchor_message_id: event.anchorMessageId,
  };
}

export function normalizeSessionExecutionEvents(value: any): SessionExecutionEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && ["tool_use", "tool_result"].includes(String(item.type || "")))
    .map(item => createSessionExecutionEvent({
      ...item,
      type: item.type,
      toolName: item.toolName || item.tool_name,
      toolCallId: item.toolCallId || item.tool_call_id,
      runId: item.runId || item.run_id,
      traceId: item.traceId || item.trace_id,
      anchorMessageId: item.anchorMessageId || item.anchor_message_id,
      payload: item.payload,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function findPendingToolCallId(events: SessionExecutionEvent[], runId: string, toolName: string) {
  const completed = new Set(events.filter(item => item.type === "tool_result").map(item => item.toolCallId));
  return [...events].reverse().find(item => item.type === "tool_use"
    && item.runId === runId
    && item.toolName === toolName
    && !completed.has(item.toolCallId))?.toolCallId || "";
}

export function eventsAnchoredToMessages(events: SessionExecutionEvent[], messages: any[]) {
  const ids = new Set((messages || []).map(message => String(message?.id || message?.uuid || message?.messageId || "")).filter(Boolean));
  if (!ids.size) return [];
  return events.filter(event => ids.has(event.anchorMessageId));
}

export function mergeConversationWithExecution(messages: any[], events: SessionExecutionEvent[], options: {
  clearedToolCallIds?: Set<string>;
  replacedToolResults?: Map<string, string>;
} = {}) {
  return [
    ...(messages || []).map((message: any, index: number) => ({ ...message, __order: index * 2 })),
    ...events.map((event, index) => ({ ...executionEventToModelMessage(event, {
      clearToolResult: event.type === "tool_result" && options.clearedToolCallIds?.has(event.toolCallId) === true,
      replacementText: event.type === "tool_result" ? options.replacedToolResults?.get(event.toolCallId) : undefined,
    }), __order: index * 2 + 1 })),
  ].sort((left: any, right: any) => {
    const byTime = String(left.timestamp || "").localeCompare(String(right.timestamp || ""));
    return byTime || Number(left.__order || 0) - Number(right.__order || 0);
  }).map(({ __order, ...message }: any) => message);
}

export function runSessionExecutionLedgerSelfTest() {
  const use = createSessionExecutionEvent({
    type: "tool_use",
    // Use an ordinary tool here so this self-test exercises the ledger sanitizer.
    // Workspace read tools intentionally persist only a rehydratable receipt and
    // therefore must not retain the raw payload tested below.
    toolName: "custom_tool",
    toolCallId: "tool-selftest",
    runId: "run-selftest",
    anchorMessageId: "user-1",
    timestamp: "2026-01-01T00:00:01.000Z",
    payload: { path: "src/app.ts", api_key: "should-not-survive" },
  });
  const result = createSessionExecutionEvent({
    type: "tool_result",
    toolName: "custom_tool",
    toolCallId: "tool-selftest",
    runId: "run-selftest",
    anchorMessageId: "user-1",
    timestamp: "2026-01-01T00:00:02.000Z",
    payload: { content: `data:image/png;base64,${"a".repeat(100)}\n${"source".repeat(3000)}` },
  });
  const conversation = [
    { id: "user-1", role: "user", content: "检查源码", timestamp: "2026-01-01T00:00:00.000Z" },
    { id: "assistant-1", role: "assistant", content: "已经检查。", timestamp: "2026-01-01T00:00:03.000Z" },
  ];
  const timeline = mergeConversationWithExecution(conversation, [use, result]);
  const checks = {
    secretRedacted: use.payload.api_key === "[redacted]",
    binaryReplaced: String(result.payload.content).includes("[binary-media]"),
    toolPairBound: use.toolCallId === result.toolCallId,
    toolRolesMatchCc: timeline[1]?.role === "assistant" && timeline[2]?.role === "user",
    hiddenFromVisibleTranscript: conversation.every((message: any) => message.hidden_execution !== true),
    recentResultPreservedRaw: String(timeline[2]?.content || "").includes("source".repeat(3000)),
    anchoredSelectionExact: eventsAnchoredToMessages([use, result], conversation.slice(0, 1)).length === 2,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
