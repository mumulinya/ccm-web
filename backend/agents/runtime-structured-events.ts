import * as crypto from "crypto";
import { normalizeAgentRuntimeId, AgentRuntimeId } from "./runtime";
import { sanitizeAssistantProgressText } from "../system/assistant-progress";

export const AGENT_RUNTIME_EVENT_SCHEMA = "ccm-agent-runtime-event-v1" as const;

export type AgentRuntimeStructuredEventType =
  | "assistant_progress"
  | "tool_started"
  | "tool_completed"
  | "tool_failed"
  | "file_changed"
  | "verification_started"
  | "verification_completed"
  | "status";

export type AgentRuntimeProgressSource = "agent_reported" | "runtime_structured" | "system_observed";

export interface AgentRuntimeEventIdentity {
  taskId: string;
  workItemId: string;
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  anchorMessageId: string;
  originMessageId?: string;
  agentRunId: string;
  generation: number;
  attempt: number;
  leaseId: string;
  project?: string;
}

export type AgentRuntimeFileReadEvidence = {
  project: string;
  path: string;
  ranges: Array<{ start: number; end: number }>;
  checksum?: string;
  source: "structured_tool" | "safe_command_inference";
  contentStored: false;
};

export interface AgentRuntimeStructuredEvent extends AgentRuntimeEventIdentity {
  schema: typeof AGENT_RUNTIME_EVENT_SCHEMA;
  eventId: string;
  runtime: AgentRuntimeId;
  runtimeVersion: string;
  eventType: AgentRuntimeStructuredEventType;
  toolCallId?: string;
  assistantRole?: "progress" | "final";
  relatedToolCallIds?: string[];
  progressSource: AgentRuntimeProgressSource;
  confidence: "declared" | "observed";
  safeSummary?: string;
  target?: string;
  toolName?: string;
  safeArguments?: Record<string, unknown>;
  safeResult?: Record<string, unknown>;
  fileReadEvidence?: AgentRuntimeFileReadEvidence;
  status: "running" | "success" | "failed" | "waiting";
  sourceEventChecksum: string;
  createdAt: string;
  contentStored: false;
}

type ParserOptions = {
  runtime: string;
  runtimeVersion?: string;
  identity: AgentRuntimeEventIdentity;
  onEvent: (event: AgentRuntimeStructuredEvent) => void;
  onContractDrift?: (detail: { runtime: AgentRuntimeId; reason: string; sourceEventChecksum: string }) => void;
};

const MAX_BUFFER = 256 * 1024;
const MAX_SUMMARY = 600;
const HIDDEN_EVENT_PATTERN = /thinking|reasoning|chain.?of.?thought|analysis|system.?prompt|developer.?prompt/i;
const SECRET_PATTERN = /(api[_-]?key|authorization|bearer|password|secret|credential|private[_-]?key)\s*[:=]/i;

function checksum(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compact(value: any, max = MAX_SUMMARY) {
  const text = String(value ?? "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  if (!text || SECRET_PATTERN.test(text)) return "";
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function valueAt(event: any, paths: string[]) {
  for (const path of paths) {
    let current = event;
    for (const key of path.split(".")) current = current?.[key];
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return undefined;
}

function safeAssistantText(event: any) {
  const type = compact(event?.type || event?.event || event?.kind, 100).toLowerCase();
  if (HIDDEN_EVENT_PATTERN.test(type)) return "";
  const role = compact(event?.role || event?.message?.role || event?.item?.role, 40).toLowerCase();
  const assistantLike = role === "assistant"
    || ["assistant", "assistant_message", "agent_message", "text", "message"].includes(type)
    || ["message.completed", "item.completed"].includes(type);
  if (!assistantLike) return "";
  const itemType = compact(event?.item?.type || event?.message?.type, 80).toLowerCase();
  if (HIDDEN_EVENT_PATTERN.test(itemType)) return "";
  const raw = valueAt(event, [
    "text", "message.text", "message.content", "item.text", "item.content", "part.text", "response",
  ]);
  if (typeof raw === "string") return sanitizeAssistantProgressText(raw);
  if (Array.isArray(raw)) {
    return sanitizeAssistantProgressText(raw.filter(item => !HIDDEN_EVENT_PATTERN.test(String(item?.type || "")))
      .map(item => item?.text || item?.content || "").filter(Boolean).join(" "));
  }
  return "";
}

function safeToolSegment(value: any) {
  return compact(value, 120).replace(/[^a-zA-Z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "");
}

function safeCommand(value: any) {
  return compact(value, 500)
    .replace(/((?:api[_-]?key|access[_-]?token|authorization|cookie|password|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{4,}/gi, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, "[redacted]")
    .replace(/(\s(?:-e|--eval|-Command|-EncodedCommand|\/c)\s+)[\s\S]*$/i, "$1[脚本内容已隐藏]");
}

function safeToolArguments(event: any, item: any) {
  const raw = valueAt(event, ["arguments", "args", "input", "tool.arguments", "item.arguments", "item.input"]);
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const allowed = ["path", "paths", "file", "file_path", "query", "pattern", "symbol", "project", "projectId", "project_id", "offset", "limit", "checksum", "expected_checksum"];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    const value = source?.[key];
    if (value === undefined || value === null || value === "") continue;
    result[key] = Array.isArray(value) ? value.slice(0, 40).map(entry => {
      if (key !== "paths" || !entry || typeof entry !== "object") return compact(entry, 500);
      const pathValue = normalizedEvidencePath(entry.path || entry.file || entry.file_path);
      return {
        ...(pathValue ? { path: pathValue } : {}),
        ...(Number.isFinite(Number(entry.offset)) ? { offset: Math.max(1, Number(entry.offset)) } : {}),
        ...(Number.isFinite(Number(entry.limit)) ? { limit: Math.max(1, Math.min(2_000, Number(entry.limit))) } : {}),
        ...(compact(entry.expected_checksum || entry.checksum, 160) ? { expected_checksum: compact(entry.expected_checksum || entry.checksum, 160) } : {}),
      };
    }).filter(entry => typeof entry !== "object" || Object.keys(entry).length) : compact(value, 500);
  }
  const command = item?.command ?? source?.command ?? source?.cmd ?? source?.shellCommand ?? source?.shell_command;
  if (command != null && safeCommand(Array.isArray(command) ? command.join(" ") : command)) {
    result.command = safeCommand(Array.isArray(command) ? command.join(" ") : command);
  }
  return result;
}

function safeToolResult(event: any, item: any, status: "running" | "success" | "failed") {
  const rawStatus = compact(item?.status || event?.status || (status === "success" ? "completed" : status), 80);
  const exitCode = Number(item?.exit_code ?? item?.exitCode ?? event?.exit_code ?? event?.exitCode);
  const durationMs = Number(item?.duration_ms ?? item?.durationMs ?? event?.duration_ms ?? event?.durationMs);
  return {
    status: rawStatus || status,
    ...(Number.isFinite(exitCode) ? { exitCode } : {}),
    ...(Number.isFinite(durationMs) && durationMs >= 0 ? { durationMs } : {}),
    ...(status === "failed" ? { error: compact(item?.error?.message || item?.error || event?.error?.message || event?.error || "工具执行失败", 300) } : {}),
    contentStored: false,
  };
}

function unquoteShellToken(value: string) {
  const token = String(value || "").trim();
  if (token.length >= 2 && ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'")))) {
    return token.slice(1, -1);
  }
  return token;
}

function normalizedEvidencePath(value: any) {
  const result = unquoteShellToken(compact(value, 500)).replace(/\\/g, "/").replace(/^\.\//, "").trim();
  if (!result || /^\//.test(result) || /^[a-z]:\//i.test(result) || result.split("/").some(part => part === "..")) return "";
  return result;
}

function rangeFromArguments(args: Record<string, unknown>) {
  const offset = Math.max(1, Number(args.offset || 1));
  const limit = Math.max(0, Number(args.limit || 0));
  return [{ start: offset, end: limit ? offset + limit - 1 : offset + 1_999 }];
}

function inferReadCommand(commandValue: any) {
  const command = compact(Array.isArray(commandValue) ? commandValue.join(" ") : commandValue, 1_000);
  if (!command || /[\r\n]|&&|\|\||[|><;`]|\$\(/.test(command)) return null;
  const wrappers = [
    /^(?:powershell(?:\.exe)?|pwsh(?:\.exe)?)\s+(?:-(?:NoProfile|NonInteractive)\s+)*(?:-Command\s+)?Get-Content\s+(?:-(?:LiteralPath|Path)\s+)?(.+?)\s*$/i,
    /^Get-Content\s+(?:-(?:LiteralPath|Path)\s+)?(.+?)\s*$/i,
    /^(?:cat|type)\s+(?:--\s+)?(.+?)\s*$/i,
  ];
  for (const pattern of wrappers) {
    const match = command.match(pattern);
    if (!match) continue;
    const candidate = match[1].replace(/\s+-(?:Raw|ReadCount|TotalCount|Tail|Head)\b.*$/i, "").trim();
    if (/\s-[A-Za-z]/.test(candidate)) return null;
    if (/\s/.test(candidate) && !/^(['"]).*\1$/.test(candidate)) return null;
    const filePath = normalizedEvidencePath(candidate);
    if (filePath) return { path: filePath, ranges: [{ start: 1, end: 2_000 }] };
  }
  const sed = command.match(/^sed\s+-n\s+['"]?(\d+)\s*,\s*(\d+)p['"]?\s+(.+?)\s*$/i);
  if (sed) {
    const start = Math.max(1, Number(sed[1]));
    const end = Math.max(start, Number(sed[2]));
    const filePath = normalizedEvidencePath(sed[3]);
    if (filePath) return { path: filePath, ranges: [{ start, end }] };
  }
  return null;
}

function fileReadEvidence(event: any, item: any, toolName: string, args: Record<string, unknown>) {
  const operation = String(toolName || "").split("__").at(-1)?.toLowerCase() || "";
  const normalizedOperation = operation.replace(/[_\s-]+/g, "");
  const project = compact(event?.project || event?.projectName || event?.identity?.project || "", 240);
  if (["read", "readfile", "fileread"].includes(normalizedOperation)) {
    const filePath = normalizedEvidencePath(args.path || args.file || args.file_path);
    if (!filePath) return null;
    return { project, path: filePath, ranges: rangeFromArguments(args), checksum: compact(args.checksum || args.expected_checksum, 160) || undefined, source: "structured_tool", contentStored: false } as const;
  }
  const inferred = inferReadCommand(item?.command ?? args.command);
  if (!inferred) return null;
  return { project, ...inferred, source: "safe_command_inference", contentStored: false } as const;
}

function assistantRoleFor(event: any, hasRelatedTools: boolean): "progress" | "final" {
  const explicit = compact(event?.assistantRole || event?.assistant_role || event?.message?.assistantRole, 40).toLowerCase();
  if (explicit === "final") return "final";
  if (explicit === "progress") return "progress";
  const type = compact(event?.type || event?.event || event?.kind, 120).toLowerCase();
  const status = compact(event?.status || event?.message?.status || event?.item?.status, 80).toLowerCase();
  if (!hasRelatedTools && (/^(?:result|final|turn\.completed|response\.completed)$/.test(type)
    || (/^(?:message\.completed|item\.completed)$/.test(type) && /complete|success|done/.test(status)))) return "final";
  return "progress";
}

function toolDescriptor(event: any) {
  const type = compact(event?.type || event?.event || event?.kind, 120).toLowerCase();
  const item = event?.item || event?.message || event?.tool || event?.part || {};
  const itemType = compact(item?.type || event?.subtype || "", 120).toLowerCase();
  const declaredToolName = compact(valueAt(event, [
    "tool_name", "toolName", "name", "tool.name", "item.name", "item.tool_name", "item.tool", "message.name", "part.name",
  ]), 160);
  const serverName = compact(valueAt(event, ["server", "server_name", "item.server", "item.server_name", "tool.server"]), 120);
  const isMcp = /mcp/.test(`${type} ${itemType}`) || !!serverName;
  const mcpToolName = safeToolSegment(declaredToolName);
  const safeServerName = safeToolSegment(serverName || "provider");
  const toolName = isMcp && mcpToolName
    ? safeServerName === "ccm_workspace_readonly"
      ? `mcp__ccm__ccm_workspace_readonly__${mcpToolName}`
      : safeServerName === "ccm_workspace_edit"
        ? `mcp__ccm__ccm_workspace_edit__${mcpToolName}`
        : `mcp__${safeServerName}__${mcpToolName}`
    : /command_execution|shell|terminal/.test(itemType) ? "run_command"
      : declaredToolName;
  const callId = compact(valueAt(event, [
    "tool_call_id", "toolCallId", "call_id", "callId", "item.id", "message.id", "id",
  ]), 240);
  const toolLike = !!toolName || /tool|command_execution|mcp|function_call/.test(`${type} ${itemType}`);
  if (!toolLike || HIDDEN_EVENT_PATTERN.test(`${type} ${itemType}`)) return null;
  const failed = /fail|error/.test(`${type} ${event?.status || ""} ${item?.status || ""}`);
  const completed = failed || /completed|complete|result|success|done|finished/.test(`${type} ${event?.status || ""} ${item?.status || ""}`);
  const args = safeToolArguments(event, item);
  const readEvidence = fileReadEvidence(event, item, toolName || "tool", args);
  const target = compact(
    args?.path || args?.file || args?.file_path || args?.query || args?.pattern || args?.command || "",
    240,
  );
  return {
    eventType: failed ? "tool_failed" : completed ? "tool_completed" : "tool_started",
    status: failed ? "failed" : completed ? "success" : "running",
    toolName: toolName || "tool",
    callId: callId || checksum(JSON.stringify({ type, itemType, toolName, target })).slice(0, 24),
    target,
    safeArguments: args,
    safeResult: safeToolResult(event, item, failed ? "failed" : completed ? "success" : "running"),
    ...(readEvidence ? { fileReadEvidence: readEvidence } : {}),
  } as const;
}

function fileDescriptor(event: any) {
  const type = compact(event?.type || event?.event || event?.kind, 100).toLowerCase();
  const itemType = compact(event?.item?.type || event?.message?.type || "", 100).toLowerCase();
  if (!/file_change|file.changed|patch|edit/.test(`${type} ${itemType}`)) return null;
  const target = compact(valueAt(event, ["path", "file", "file_path", "item.path", "item.file", "message.path"]), 300);
  return target ? { target } : null;
}

function verificationDescriptor(event: any) {
  const type = compact(event?.type || event?.event || event?.kind, 100).toLowerCase();
  const name = compact(valueAt(event, ["name", "command", "item.command", "message.command"]), 240);
  const haystack = `${type} ${name}`;
  if (!/test|build|lint|typecheck|verification/.test(haystack)) return null;
  const failed = /fail|error/.test(`${haystack} ${event?.status || ""}`);
  const completed = failed || /completed|result|success|done/.test(`${haystack} ${event?.status || ""}`);
  return {
    eventType: completed ? "verification_completed" : "verification_started",
    status: failed ? "failed" : completed ? "success" : "running",
    target: name || "验证",
  } as const;
}

function runtimeRecognizesJson(runtime: AgentRuntimeId, event: any) {
  const type = compact(event?.type || event?.event || event?.kind, 120).toLowerCase();
  if (!type) return false;
  const known: Record<string, RegExp> = {
    claudecode: /^(assistant|user|result|system|stream_event|tool|message|text)/,
    codex: /^(thread\.|turn\.|item\.|agent_message|message|error)/,
    cursor: /^(system|assistant|user|tool|result|error|message)/,
    gemini: /^(text|message|assistant|result|response|error|tool|function)/,
    opencode: /^(text|message|assistant|result|error|tool|step|part)/,
    qoder: /^(text|message|assistant|result|error|tool|status)/,
  };
  return known[runtime]?.test(type) === true;
}

function expandStructuredEvents(event: any) {
  const content = Array.isArray(event?.message?.content) ? event.message.content
    : Array.isArray(event?.content) ? event.content
      : Array.isArray(event?.parts) ? event.parts
        : Array.isArray(event?.response?.candidates?.[0]?.content?.parts) ? event.response.candidates[0].content.parts
          : [];
  if (!content.length) return [event];
  return content.map((item: any, itemIndex: number) => {
    const functionCall = item?.functionCall || item?.function_call || null;
    return {
      ...event,
      type: item?.type || (functionCall ? "function_call" : item?.text ? "text" : event?.type),
      item: functionCall ? { ...functionCall, type: "function_call", id: functionCall.id || `${event?.id || "event"}:${itemIndex}` } : item,
      text: item?.text,
      name: functionCall?.name || item?.name,
      arguments: functionCall?.args || functionCall?.arguments || item?.input || item?.arguments,
    };
  });
}

export function createAgentRuntimeStructuredEventParser(options: ParserOptions) {
  const runtime = normalizeAgentRuntimeId(options.runtime);
  let buffer = "";
  let index = 0;
  const seen = new Set<string>();
  let pendingAssistant: Array<{ rawLine: string; event: any }> = [];

  const emit = (rawLine: string, rawEvent: any, relatedToolCallIds: string[] = [], assistantRole?: "progress" | "final") => {
    const sourceEventChecksum = checksum(rawLine);
    if (seen.has(sourceEventChecksum)) return;
    seen.add(sourceEventChecksum);
    if (!runtimeRecognizesJson(runtime, rawEvent)) {
      options.onContractDrift?.({ runtime, reason: "unknown_runtime_event_shape", sourceEventChecksum });
      return;
    }
    const createdAt = new Date().toISOString();
    const base = {
      schema: AGENT_RUNTIME_EVENT_SCHEMA,
      eventId: `are_${sourceEventChecksum.slice(0, 28)}`,
      runtime,
      runtimeVersion: compact(options.runtimeVersion, 120),
      ...options.identity,
      progressSource: "runtime_structured" as const,
      confidence: "observed" as const,
      sourceEventChecksum,
      createdAt,
      contentStored: false as const,
    };
    const tool = toolDescriptor(rawEvent);
    if (tool) {
      options.onEvent({
        ...base,
        eventType: tool.eventType,
        toolCallId: tool.callId,
        toolName: tool.toolName,
        safeSummary: tool.toolName,
        target: tool.target,
        safeArguments: tool.safeArguments,
        safeResult: tool.safeResult,
        ...(tool.fileReadEvidence ? { fileReadEvidence: tool.fileReadEvidence } : {}),
        status: tool.status,
      });
      return;
    }
    const verification = verificationDescriptor(rawEvent);
    if (verification) {
      options.onEvent({ ...base, eventType: verification.eventType, safeSummary: verification.target, target: verification.target, status: verification.status });
      return;
    }
    const file = fileDescriptor(rawEvent);
    if (file) {
      options.onEvent({ ...base, eventType: "file_changed", safeSummary: "文件已变更", target: file.target, status: "success" });
      return;
    }
    const assistantText = safeAssistantText(rawEvent);
    if (assistantText) {
      options.onEvent({
        ...base,
        eventType: "assistant_progress",
        assistantRole: assistantRole || assistantRoleFor(rawEvent, relatedToolCallIds.length > 0),
        relatedToolCallIds,
        safeSummary: assistantText,
        status: "running",
        confidence: "declared",
      });
      return;
    }
    index += 1;
  };

  const flushPendingAssistant = (relatedToolCallIds: string[] = [], role: "progress" | "final" = "progress") => {
    for (const pending of pendingAssistant) emit(pending.rawLine, pending.event, relatedToolCallIds, role);
    pendingAssistant = [];
  };

  const consumeLine = (line: string) => {
    const text = line.trim().replace(/^data:\s*/i, "");
    if (!text || text === "[DONE]") return;
    try {
      const parsed = JSON.parse(text);
      const expandedEvents = expandStructuredEvents(parsed);
      const relatedToolCallIds = [...new Set(expandedEvents.map(event => toolDescriptor(event)?.callId).filter(Boolean) as string[])];
      const role = assistantRoleFor(parsed, relatedToolCallIds.length > 0);
      const assistantEvents = expandedEvents
        .map((event, eventIndex) => ({ event, eventIndex, text: safeAssistantText(event) }))
        .filter(item => !!item.text);
      if (relatedToolCallIds.length) flushPendingAssistant(relatedToolCallIds, "progress");
      else if (!assistantEvents.length || role === "final") flushPendingAssistant([], role);
      if (assistantEvents.length && !relatedToolCallIds.length && role === "progress") {
        pendingAssistant.push(...assistantEvents.map(item => ({ rawLine: `${text}#${item.eventIndex}`, event: item.event })));
        for (const [eventIndex, expanded] of expandedEvents.entries()) {
          if (!safeAssistantText(expanded)) emit(`${text}#${eventIndex}`, expanded, [], role);
        }
        return;
      }
      for (const [eventIndex, expanded] of expandedEvents.entries()) {
        emit(`${text}#${eventIndex}`, expanded, relatedToolCallIds, role);
      }
    }
    catch {
      // Free-form stdout is intentionally ignored. It can still be normalized
      // after process completion, but never becomes a user-visible fact.
    }
  };

  return {
    push(chunk: string | Buffer) {
      buffer = (buffer + String(chunk || "")).slice(-MAX_BUFFER);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) consumeLine(line);
    },
    flush() {
      if (buffer.trim()) consumeLine(buffer);
      flushPendingAssistant([], "final");
      buffer = "";
    },
    stats() { return { runtime, seen: seen.size, pendingBytes: Buffer.byteLength(buffer), index }; },
  };
}

export function runAgentRuntimeStructuredEventSelfTest() {
  const events: AgentRuntimeStructuredEvent[] = [];
  const identity: AgentRuntimeEventIdentity = {
    taskId: "task-1", workItemId: "work-1", scope: "group", scopeId: "group-1",
    exactSessionId: "session-1", anchorMessageId: "message-1", agentRunId: "acm-1",
    generation: 2, attempt: 1, leaseId: "acl-1",
  };
  const fixtures: Array<[string, string[]]> = [
    ["claudecode", ['{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"先检查入口。"},{"type":"tool_use","id":"claude-tool","name":"Read","input":{"path":"src/a.ts"}}]}}']],
    ["codex", [
      '{"type":"item.completed","item":{"id":"codex-message","type":"agent_message","text":"开始验证。"}}',
      '{"type":"item.started","item":{"id":"codex-tool","type":"command_execution","command":"npm test","status":"in_progress"}}',
      '{"type":"item.completed","item":{"id":"codex-tool","type":"command_execution","command":"npm test","status":"completed","exit_code":0}}',
    ]],
    ["cursor", ['{"type":"assistant","text":"检查引用。"}', '{"type":"tool_started","id":"cursor-tool","name":"Grep","arguments":{"query":"symbol"}}']],
    ["gemini", ['{"type":"response","response":{"candidates":[{"content":{"parts":[{"text":"读取配置。"},{"functionCall":{"id":"gemini-tool","name":"read_file","args":{"path":"config.json"}}}]}}]}}']],
    ["opencode", ['{"type":"text","role":"assistant","text":"定位模块。"}', '{"type":"tool","id":"opencode-tool","name":"glob","status":"running"}']],
    ["qoder", ['{"type":"assistant","text":"准备修改。"}', '{"type":"tool","id":"qoder-tool","name":"read","status":"running"}', '{"type":"result","role":"assistant","text":"最终交付不应成为进度。"}']],
  ];
  for (const [runtime, lines] of fixtures) {
    const parser = createAgentRuntimeStructuredEventParser({ runtime, identity: { ...identity, agentRunId: `acm-${runtime}` }, onEvent: event => events.push(event) });
    for (const line of lines) parser.push(`${line}\n`);
    parser.push('{"type":"reasoning","text":"SECRET_CHAIN_OF_THOUGHT"}\n');
    parser.push('free form stdout should be ignored\n');
    parser.flush();
  }
  const runtimeSet = new Set(events.map(event => event.runtime));
  return {
    pass: runtimeSet.size === 6
      && [...runtimeSet].every(runtime => events.some(event => event.runtime === runtime && event.eventType === "tool_started"))
      && [...runtimeSet].every(runtime => events.some(event => event.runtime === runtime && event.eventType === "assistant_progress"))
      && events.some(event => event.runtime === "claudecode" && event.relatedToolCallIds?.includes("claude-tool"))
      && events.some(event => event.runtime === "gemini" && event.relatedToolCallIds?.includes("gemini-tool"))
      && events.some(event => event.runtime === "codex" && event.toolName === "run_command" && event.target === "npm test")
      && !events.some(event => ["command_execution", "mcp_tool_call"].includes(String(event.toolName || event.safeSummary)))
      && !events.some(event => event.safeSummary?.includes("最终交付") && event.assistantRole !== "final")
      && events.filter(event => event.eventType === "assistant_progress").every(event => (event.safeSummary || "").length <= 120)
      && !JSON.stringify(events).includes("SECRET_CHAIN_OF_THOUGHT"),
    events,
  };
}
