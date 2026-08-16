import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { getGroupSessionSidecarFile } from "./group-memory-storage";
import {
  createSessionExecutionEvent,
  findPendingToolCallId,
  normalizeSessionExecutionEvents,
  type SessionExecutionEvent,
} from "../../system/session-execution-ledger";

const GROUP_SESSION_EXECUTION_DIR = path.join(CCM_DIR, "group-session-execution");

function ledgerFile(groupId: string, groupSessionId: string) {
  return getGroupSessionSidecarFile(GROUP_SESSION_EXECUTION_DIR, groupId, groupSessionId);
}

function emptyLedger(groupId: string, groupSessionId: string) {
  return {
    schema: "ccm-group-session-execution-v1",
    version: 1,
    groupId,
    groupSessionId,
    execution_history: [] as SessionExecutionEvent[],
    updated_at: "",
  };
}

export function listGroupSessionExecutionEvents(groupId: string, groupSessionId: string): SessionExecutionEvent[] {
  const id = String(groupId || "").trim();
  const sessionId = String(groupSessionId || "").trim();
  if (!id || !sessionId.startsWith("gcs_")) return [];
  const file = ledgerFile(id, sessionId);
  if (!fs.existsSync(file)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return normalizeSessionExecutionEvents(data?.execution_history || data?.executionHistory);
  } catch {
    return [];
  }
}

export function appendGroupSessionExecutionEvent(groupIdInput: string, groupSessionIdInput: string, event: any) {
  const groupId = String(groupIdInput || "").trim();
  const groupSessionId = String(groupSessionIdInput || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) return null;
  const file = ledgerFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const current = fs.existsSync(file)
      ? { ...emptyLedger(groupId, groupSessionId), ...JSON.parse(fs.readFileSync(file, "utf8")) }
      : emptyLedger(groupId, groupSessionId);
    const events = normalizeSessionExecutionEvents(current.execution_history);
    const type = String(event?.type || "") === "tool_use" || String(event?.type || "") === "tool_started" ? "tool_use" : "tool_result";
    const toolName = String(event?.toolName || event?.tool_name || event?.tool || "tool");
    const runId = String(event?.runId || event?.run_id || "");
    const toolCallId = type === "tool_result"
      ? (String(event?.toolCallId || event?.tool_call_id || "") || findPendingToolCallId(events, runId, toolName))
      : String(event?.toolCallId || event?.tool_call_id || "");
    const created = createSessionExecutionEvent({
      type,
      toolName,
      toolCallId,
      runId,
      traceId: String(event?.traceId || event?.trace_id || ""),
      anchorMessageId: String(event?.anchorMessageId || event?.anchor_message_id || ""),
      timestamp: event?.timestamp || event?.at || new Date().toISOString(),
      status: event?.status === "error" || event?.error ? "error" : type === "tool_use" ? "running" : "ok",
      payload: event?.payload ?? (type === "tool_use" ? { arguments: event?.arguments || {} } : { observation: event?.observation ?? null, error: event?.error || "" }),
    });
    if (!events.some(item => item.id === created.id)) events.push(created);
    writeJsonAtomic(file, {
      ...current,
      schema: "ccm-group-session-execution-v1",
      version: 1,
      groupId,
      groupSessionId,
      execution_history: events.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      updated_at: new Date().toISOString(),
    });
    return created;
  });
}

export function runGroupSessionExecutionLedgerSelfTest() {
  const groupId = `selftest-group-${Date.now()}`;
  const sessionId = `gcs_selftest_${Date.now()}`;
  const use = appendGroupSessionExecutionEvent(groupId, sessionId, {
    type: "tool_use",
    toolName: "read_file",
    toolCallId: "call_self",
    runId: "run_self",
    anchorMessageId: "u1",
    arguments: { path: "README.md" },
  });
  const result = appendGroupSessionExecutionEvent(groupId, sessionId, {
    type: "tool_result",
    toolName: "read_file",
    toolCallId: "call_self",
    runId: "run_self",
    anchorMessageId: "u1",
    observation: { text: "# Hello" },
  });
  const listed = listGroupSessionExecutionEvents(groupId, sessionId);
  const file = ledgerFile(groupId, sessionId);
  try { fs.unlinkSync(file); } catch {}
  const checks = {
    wroteUse: String(use?.toolCallId || "") === "call_self",
    wroteResult: String(result?.type || "") === "tool_result",
    listedPair: listed.length === 2 && listed[0].toolName === "read_file",
    rejectsNonExactSession: appendGroupSessionExecutionEvent(groupId, "default", { type: "tool_use", toolName: "read_file" }) == null,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
