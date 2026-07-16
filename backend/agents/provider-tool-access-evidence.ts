import * as crypto from "crypto";
import { normalizeAgentRuntimeId } from "./runtime";

export const PROVIDER_TOOL_ACCESS_EVIDENCE_SCHEMA = "ccm-provider-tool-access-evidence-v1";

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function evidenceChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.checksumValid;
  return checksum(payload);
}

function compact(value: any, max = 1600) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values: any[], limit = 40) {
  return Array.from(new Set(values.map(value => compact(value, 1000)).filter(Boolean))).slice(0, limit);
}

function collectPathLikeValues(value: any, out: string[] = [], depth = 0) {
  if (depth > 6 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectPathLikeValues(item, out, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.replace(/[_-]/g, "").toLowerCase();
    if (["filepath", "path", "paths", "filename", "files", "cwd", "workingdirectory"].includes(normalizedKey)) {
      if (Array.isArray(item)) out.push(...item.map(entry => compact(entry, 1000)).filter(Boolean));
      else if (typeof item === "string") out.push(compact(item, 1000));
    }
    if (item && typeof item === "object") collectPathLikeValues(item, out, depth + 1);
  }
  return out;
}

function collectToolNames(value: any, out: string[] = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectToolNames(item, out, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.replace(/[_-]/g, "").toLowerCase();
    if (["toolname", "name"].includes(normalizedKey) && typeof item === "string") out.push(compact(item, 120));
    if (item && typeof item === "object") collectToolNames(item, out, depth + 1);
  }
  return out;
}

function collectCommands(value: any, out: string[] = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) collectCommands(item, out, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.replace(/[_-]/g, "").toLowerCase();
    if (["command", "cmd", "commandline"].includes(normalizedKey) && typeof item === "string") out.push(compact(item, 2000));
    if (item && typeof item === "object") collectCommands(item, out, depth + 1);
  }
  return out;
}

function classifyOperation(toolNames: string[], commands: string[], event: any) {
  const text = [...toolNames, ...commands, String(event?.type || ""), String(event?.item?.type || "")].join("\n");
  if (/\b(Read|FileRead|read_file|Get-Content|type|cat)\b/i.test(text)) return "read";
  if (/\b(Grep|rg|Select-String|findstr)\b/i.test(text)) return "grep";
  if (/\b(Glob|Get-ChildItem|dir|ls)\b/i.test(text)) return "glob";
  return "";
}

function eventSucceeded(event: any) {
  const status = String(event?.status || event?.item?.status || event?.result?.status || "").toLowerCase();
  const exitCode = event?.exit_code ?? event?.exitCode ?? event?.item?.exit_code ?? event?.item?.exitCode;
  if (status && /fail|error|cancel/.test(status)) return false;
  if (exitCode !== undefined && exitCode !== null && Number(exitCode) !== 0) return false;
  return true;
}

function extractEventRows(rawOutput: string) {
  const parsed: { index: number; raw: string; event: any }[] = [];
  let invalidJsonLineCount = 0;
  for (const [index, line] of String(rawOutput || "").split(/\r?\n/).entries()) {
    const raw = line.trim();
    if (!raw.startsWith("{")) continue;
    try {
      const event = JSON.parse(raw);
      if (event && typeof event === "object" && !Array.isArray(event)) parsed.push({ index, raw, event });
    } catch {
      invalidJsonLineCount += 1;
    }
  }
  return { parsed, invalidJsonLineCount };
}

export function extractProviderToolAccessEvidence(agentType: string, rawOutput: string, binding: any = {}) {
  const provider = normalizeAgentRuntimeId(agentType);
  const { parsed, invalidJsonLineCount } = extractEventRows(rawOutput);
  const supported = provider === "codex" || provider === "cursor";
  const events = parsed.flatMap(({ index, raw, event }) => {
    const toolNames = unique(collectToolNames(event), 12);
    const commands = unique(collectCommands(event), 12);
    const operation = classifyOperation(toolNames, commands, event);
    if (!operation) return [];
    return [{
      eventIndex: index,
      eventType: compact(event.type || event.item?.type || "native_json_event", 120),
      toolName: toolNames[0] || (commands.length ? "command_execution" : "native_tool"),
      operation,
      paths: unique(collectPathLikeValues(event), 40),
      commands,
      success: eventSucceeded(event),
      eventChecksum: crypto.createHash("sha256").update(raw).digest("hex"),
      searchableTextChecksum: checksum({ toolNames, commands, paths: collectPathLikeValues(event) }),
      searchableText: compact(JSON.stringify(event), 4000),
    }];
  }).slice(0, 160);
  const captureStatus = !supported
    ? "capture_unavailable"
    : !parsed.length
      ? "unstructured_output"
      : events.length
        ? "observed"
        : "no_file_access_observed";
  const core = {
    schema: PROVIDER_TOOL_ACCESS_EVIDENCE_SCHEMA,
    version: 1,
    provider,
    captureStatus,
    source: "provider_native_json_stream",
    groupId: String(binding.groupId || binding.group_id || ""),
    groupSessionId: String(binding.groupSessionId || binding.group_session_id || ""),
    taskId: String(binding.taskId || binding.task_id || ""),
    executionId: String(binding.executionId || binding.execution_id || ""),
    taskAgentSessionId: String(binding.taskAgentSessionId || binding.task_agent_session_id || ""),
    nativeSessionId: String(binding.nativeSessionId || binding.native_session_id || ""),
    runnerRequestId: String(binding.runnerRequestId || binding.runner_request_id || ""),
    parsedJsonEventCount: parsed.length,
    invalidJsonLineCount,
    accessEventCount: events.length,
    events,
    capturedAt: String(binding.capturedAt || binding.captured_at || new Date().toISOString()),
  };
  return { ...core, checksum: evidenceChecksum(core) };
}

export function verifyProviderToolAccessEvidence(evidence: any, expected: any = {}) {
  const gaps: string[] = [];
  if (evidence?.schema !== PROVIDER_TOOL_ACCESS_EVIDENCE_SCHEMA || Number(evidence?.version || 0) !== 1) gaps.push("schema");
  if (!evidence?.checksum || evidence.checksum !== evidenceChecksum(evidence)) gaps.push("checksum");
  if (evidence?.source !== "provider_native_json_stream") gaps.push("source");
  if (!['observed', 'no_file_access_observed', 'unstructured_output', 'capture_unavailable'].includes(String(evidence?.captureStatus || ""))) gaps.push("capture_status");
  for (const [evidenceKey, expectedKeys] of Object.entries({
    groupId: ["groupId", "group_id"],
    groupSessionId: ["groupSessionId", "group_session_id"],
    taskId: ["taskId", "task_id"],
    executionId: ["executionId", "execution_id"],
    taskAgentSessionId: ["taskAgentSessionId", "task_agent_session_id"],
    nativeSessionId: ["nativeSessionId", "native_session_id"],
    runnerRequestId: ["runnerRequestId", "runner_request_id"],
  })) {
    const expectedValue = (expectedKeys as string[]).map(key => expected?.[key]).find(value => String(value || "").trim());
    if (expectedValue && String(evidence?.[evidenceKey] || "").trim() !== String(expectedValue).trim()) gaps.push(`${evidenceKey}_mismatch`);
  }
  const events = Array.isArray(evidence?.events) ? evidence.events : [];
  if (Number(evidence?.accessEventCount || 0) !== events.length) gaps.push("event_count");
  if (events.some((event: any) => !["read", "grep", "glob"].includes(String(event?.operation || "")) || !/^[a-f0-9]{64}$/.test(String(event?.eventChecksum || "")))) gaps.push("event_shape");
  return { valid: gaps.length === 0, gaps };
}

export function matchProviderToolAccessEvidence(evidence: any, references: any[] = []) {
  const verification = verifyProviderToolAccessEvidence(evidence);
  if (!verification.valid) return { matched: false, eventCount: 0, events: [], verification };
  const needles = unique(references, 24).map(value => value.replace(/\\/g, "/").toLowerCase()).filter(Boolean);
  const events = (Array.isArray(evidence.events) ? evidence.events : []).filter((event: any) => {
    const haystack = [event.searchableText, ...(event.paths || []), ...(event.commands || [])].join("\n").replace(/\\/g, "/").toLowerCase();
    return event.success !== false && needles.some(needle => haystack.includes(needle));
  });
  return { matched: events.length > 0, eventCount: events.length, events, verification };
}

export function runProviderToolAccessEvidenceSelfTest() {
  const binding = { groupId: "phase348-group", groupSessionId: "gcs_phase348", taskId: "task-phase348", executionId: "exec-phase348", taskAgentSessionId: "tas_phase348", nativeSessionId: "thread-phase348", runnerRequestId: "adr_phase348_123456789abc", capturedAt: "2026-07-16T00:00:00.000Z" };
  const raw = [
    JSON.stringify({ type: "thread.started", thread_id: binding.nativeSessionId }),
    JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "Get-Content src/auth.ts", status: "completed", exit_code: 0 } }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }),
  ].join("\n");
  const evidence = extractProviderToolAccessEvidence("codex", raw, binding);
  const valid = verifyProviderToolAccessEvidence(evidence, binding);
  const matched = matchProviderToolAccessEvidence(evidence, ["src/auth.ts"]);
  const forged = { ...evidence, taskAgentSessionId: "tas_sibling" };
  return {
    valid: valid.valid,
    observed: evidence.captureStatus === "observed" && evidence.accessEventCount === 1,
    matched: matched.matched && matched.eventCount === 1,
    siblingRejected: verifyProviderToolAccessEvidence(evidence, { ...binding, taskAgentSessionId: "tas_sibling" }).valid === false,
    tamperRejected: verifyProviderToolAccessEvidence(forged, binding).valid === false,
    unsupportedExplicit: extractProviderToolAccessEvidence("claudecode", "plain output", binding).captureStatus === "capture_unavailable",
  };
}
