import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getAgentRuntime, normalizeAgentRuntimeId } from "./agent-runtime";
import { CCM_DIR } from "./utils";

const STORE_FILE = path.join(CCM_DIR, "task-agent-sessions.json");
const STORE_BACKUP_FILE = `${STORE_FILE}.bak`;
const MAX_SESSION_RECORDS = 500;

export type TaskAgentSession = {
  id: string;
  scopeId: string;
  taskId: string;
  groupId: string;
  project: string;
  agentType: string;
  nativeSessionId: string;
  resumeMode: "native" | "scratchpad";
  status: "open" | "closed";
  turnCount: number;
  lastTurnSucceeded: boolean | null;
  createdAt: string;
  lastUsedAt: string;
  closedAt: string;
  closeReason: string;
  nativeCaptureFailures?: number;
  nativeRecoveryAttempts?: number;
  nativeSessionHistory?: string[];
  lastNativeRecoveryAt?: string;
  lastError?: string;
  permissionDriftCount?: number;
  lastPermissionDriftAt?: string;
  runtimeSnapshotId?: string;
  runtimeSnapshotPath?: string;
  mcpConfigPath?: string;
  allowedTools?: any;
  permissionRules?: any[];
  runtimeToolUpdatedAt?: string;
};

function emptyStore() {
  return { version: 1, sessions: [] as TaskAgentSession[] };
}

function loadStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return {
      version: 1,
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    };
  } catch {
    try {
      const recovered = JSON.parse(fs.readFileSync(STORE_BACKUP_FILE, "utf-8"));
      return { version: 1, sessions: Array.isArray(recovered?.sessions) ? recovered.sessions : [] };
    } catch { return emptyStore(); }
  }
}

function saveStore(store: any) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  const sessions = (store.sessions || [])
    .sort((a: any, b: any) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)))
    .slice(-MAX_SESSION_RECORDS);
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  if (fs.existsSync(STORE_FILE)) {
    try {
      JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
      fs.copyFileSync(STORE_FILE, STORE_BACKUP_FILE);
    } catch {}
  }
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, sessions }, null, 2), "utf-8");
  fs.renameSync(tmp, STORE_FILE);
}

function createNativeSessionId(agentType: string) {
  return normalizeAgentRuntimeId(agentType) === "claudecode" ? crypto.randomUUID() : "";
}

export function openTaskAgentSession(input: {
  scopeId: string;
  taskId?: string;
  groupId: string;
  project: string;
  agentType: string;
}) {
  const store = loadStore();
  const runtime = normalizeAgentRuntimeId(input.agentType);
  const existing = [...store.sessions].reverse().find((item: TaskAgentSession) =>
    item.status === "open"
    && item.scopeId === input.scopeId
    && item.groupId === input.groupId
    && item.project === input.project
    && item.agentType === runtime
  );
  if (existing) {
    if (existing.resumeMode !== "native" && getAgentRuntime(runtime).capabilities.sessionResume && Number(existing.nativeCaptureFailures || 0) < 3) {
      existing.resumeMode = "native";
      existing.nativeSessionId = "";
      existing.nativeRecoveryAttempts = Number(existing.nativeRecoveryAttempts || 0) + 1;
      existing.lastNativeRecoveryAt = new Date().toISOString();
      existing.lastError = "正在重新尝试捕获原生 session ID";
      saveStore(store);
    }
    return existing;
  }

  const now = new Date().toISOString();
  const session: TaskAgentSession = {
    id: `tas_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
    scopeId: String(input.scopeId || input.taskId || "").trim(),
    taskId: String(input.taskId || "").trim(),
    groupId: String(input.groupId || "").trim(),
    project: String(input.project || "").trim(),
    agentType: runtime,
    nativeSessionId: createNativeSessionId(runtime),
    resumeMode: getAgentRuntime(runtime).capabilities.sessionResume ? "native" : "scratchpad",
    status: "open",
    turnCount: 0,
    lastTurnSucceeded: null,
    createdAt: now,
    lastUsedAt: now,
    closedAt: "",
    closeReason: "",
    nativeCaptureFailures: 0,
    nativeRecoveryAttempts: 0,
    nativeSessionHistory: [],
    lastNativeRecoveryAt: "",
    lastError: "",
  };
  store.sessions.push(session);
  saveStore(store);
  return session;
}

export function recordTaskAgentSessionTurn(sessionId: string, result: { nativeSessionId?: string; success?: boolean; error?: string; nativeSessionInvalid?: boolean; permissionDrift?: boolean; runtimeToolSnapshot?: any } = {}) {
  const store = loadStore();
  const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === sessionId);
  if (index < 0) return null;
  const current = store.sessions[index];
  const next = advanceTaskAgentSession(current, result);
  store.sessions[index] = next;
  saveStore(store);
  return next;
}

export function advanceTaskAgentSession(current: TaskAgentSession, result: { nativeSessionId?: string; success?: boolean; error?: string; nativeSessionInvalid?: boolean; permissionDrift?: boolean; runtimeToolSnapshot?: any } = {}) {
  const errorText = String(result.error || "");
  const invalidNativeSession = result.nativeSessionInvalid === true || /(?:session|thread).*(?:not found|invalid|expired|不存在|无效|过期)|无法恢复.*(?:session|会话)/i.test(errorText);
  const permissionDrift = result.permissionDrift === true;
  const capturedNativeId = String(result.nativeSessionId || current.nativeSessionId || "").trim();
  const requiresCapturedId = current.resumeMode === "native"
    && getAgentRuntime(current.agentType).capabilities.sessionResume
    && normalizeAgentRuntimeId(current.agentType) !== "claudecode";
  const captureFailed = result.success !== false && requiresCapturedId && !capturedNativeId;
  const previousIds = [...new Set([...(current.nativeSessionHistory || []), current.nativeSessionId].filter(Boolean))].slice(-10);
  const next: TaskAgentSession = {
    ...current,
    nativeSessionId: permissionDrift ? createNativeSessionId(current.agentType) : invalidNativeSession ? "" : capturedNativeId,
    resumeMode: permissionDrift ? "native" : captureFailed ? "scratchpad" : invalidNativeSession && getAgentRuntime(current.agentType).capabilities.sessionResume ? "native" : current.resumeMode,
    nativeCaptureFailures: Number(current.nativeCaptureFailures || 0) + (captureFailed ? 1 : 0),
    nativeRecoveryAttempts: Number(current.nativeRecoveryAttempts || 0) + (invalidNativeSession || permissionDrift ? 1 : 0),
    nativeSessionHistory: previousIds,
    lastNativeRecoveryAt: invalidNativeSession || permissionDrift ? new Date().toISOString() : current.lastNativeRecoveryAt || "",
    turnCount: permissionDrift ? 0 : Number(current.turnCount || 0) + 1,
    lastTurnSucceeded: result.success !== false,
    lastError: permissionDrift ? "检测到实际只读权限与可写任务声明不一致；已隔离旧 native session，下轮创建可写恢复会话" : invalidNativeSession ? "原生会话已失效，下轮将创建恢复会话并承接工作区" : result.success === false ? (errorText || "Agent 执行失败") : captureFailed ? "CLI 未返回原生 session ID，已安全降级为 scratchpad 续跑" : "",
    permissionDriftCount: Number(current.permissionDriftCount || 0) + (permissionDrift ? 1 : 0),
    lastPermissionDriftAt: permissionDrift ? new Date().toISOString() : current.lastPermissionDriftAt || "",
    lastUsedAt: new Date().toISOString(),
  };
  if (result.runtimeToolSnapshot && typeof result.runtimeToolSnapshot === "object") {
    next.runtimeSnapshotId = String(result.runtimeToolSnapshot.snapshotId || current.runtimeSnapshotId || "");
    next.runtimeSnapshotPath = String(result.runtimeToolSnapshot.snapshotPath || current.runtimeSnapshotPath || "");
    next.mcpConfigPath = String(result.runtimeToolSnapshot.mcpConfigPath || current.mcpConfigPath || "");
    next.allowedTools = result.runtimeToolSnapshot.allowedTools || current.allowedTools || null;
    next.permissionRules = Array.isArray(result.runtimeToolSnapshot.permissionRules)
      ? result.runtimeToolSnapshot.permissionRules.slice(0, 50)
      : current.permissionRules || [];
    next.runtimeToolUpdatedAt = new Date().toISOString();
  }
  return next;
}

export function closeTaskAgentSessions(input: { scopeId?: string; taskId?: string; groupId?: string }, reason = "主 Agent 已完成最终验收") {
  if (!String(input.scopeId || "").trim() && !String(input.taskId || "").trim()) return [];
  const store = loadStore();
  const now = new Date().toISOString();
  const closed: TaskAgentSession[] = [];
  store.sessions = store.sessions.map((item: TaskAgentSession) => {
    const matches = item.status === "open"
      && (!input.scopeId || item.scopeId === input.scopeId)
      && (!input.taskId || item.taskId === input.taskId)
      && (!input.groupId || item.groupId === input.groupId);
    if (!matches) return item;
    const next: TaskAgentSession = { ...item, status: "closed", closedAt: now, closeReason: reason, lastUsedAt: now };
    closed.push(next);
    return next;
  });
  if (closed.length) saveStore(store);
  return closed;
}

export function reopenTaskAgentSessions(taskId: string, reason = "用户在同一任务中继续修改") {
  const id = String(taskId || "").trim();
  if (!id) return [];
  const store = loadStore();
  const now = new Date().toISOString();
  const latestByLane = new Map<string, TaskAgentSession>();
  for (const session of store.sessions) {
    if (session.taskId !== id && session.scopeId !== id) continue;
    const key = `${session.groupId}::${session.project}::${session.agentType}`;
    const previous = latestByLane.get(key);
    if (!previous || String(session.lastUsedAt || session.createdAt) > String(previous.lastUsedAt || previous.createdAt)) latestByLane.set(key, session);
  }
  const ids = new Set(Array.from(latestByLane.values()).map(item => item.id));
  const reopened: TaskAgentSession[] = [];
  store.sessions = store.sessions.map((session: TaskAgentSession) => {
    if (!ids.has(session.id) || session.status === "open") return session;
    const next = { ...session, status: "open" as const, closedAt: "", closeReason: "", lastUsedAt: now, lastError: reason };
    reopened.push(next);
    return next;
  });
  if (reopened.length) saveStore(store);
  return reopened;
}

export function getTaskAgentSessionOptions(session: TaskAgentSession) {
  return {
    sessionId: session.nativeSessionId,
    resumeSession: session.resumeMode === "native" && session.turnCount > 0 && !!session.nativeSessionId,
    persistSession: session.resumeMode === "native",
    runtimeSnapshotId: session.runtimeSnapshotId || "",
    mcpConfigPath: session.mcpConfigPath || "",
  };
}

export function getTaskAgentSessionContinuity(session: TaskAgentSession) {
  return {
    mode: session.resumeMode,
    native: session.resumeMode === "native" && !!session.nativeSessionId,
    degraded: session.resumeMode === "scratchpad" && getAgentRuntime(session.agentType).capabilities.sessionResume,
    reason: session.lastError || "",
    turnCount: session.turnCount,
    recoveryAttempts: Number(session.nativeRecoveryAttempts || 0),
    previousNativeSessionIds: session.nativeSessionHistory || [],
    runtimeSnapshotId: session.runtimeSnapshotId || "",
    mcpConfigPath: session.mcpConfigPath || "",
    runtimeToolUpdatedAt: session.runtimeToolUpdatedAt || "",
  };
}

export function listTaskAgentSessions(filter: { scopeId?: string; taskId?: string; groupId?: string; project?: string; status?: string } = {}) {
  return loadStore().sessions.filter((item: TaskAgentSession) =>
    (!filter.scopeId || item.scopeId === filter.scopeId)
    && (!filter.taskId || item.taskId === filter.taskId)
    && (!filter.groupId || item.groupId === filter.groupId)
    && (!filter.project || item.project === filter.project)
    && (!filter.status || item.status === filter.status)
  );
}

export function purgeTaskAgentSessions(taskId: string) {
  const id = String(taskId || "").trim();
  if (!id) return [];
  const store = loadStore();
  const removed = store.sessions.filter((item: TaskAgentSession) => item.taskId === id || item.scopeId === id);
  if (!removed.length) return [];
  store.sessions = store.sessions.filter((item: TaskAgentSession) => item.taskId !== id && item.scopeId !== id);
  saveStore(store);
  return removed;
}

export function reconcileTaskAgentSessions(tasks: any[], nowMs = Date.now()) {
  const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map((task: any) => [String(task.id || ""), task]));
  const store = loadStore();
  const closed: TaskAgentSession[] = [];
  const now = new Date(nowMs).toISOString();
  store.sessions = store.sessions.map((session: TaskAgentSession) => {
    if (session.status !== "open") return session;
    const task: any = taskMap.get(session.taskId || session.scopeId);
    const inactiveMs = nowMs - Date.parse(session.lastUsedAt || session.createdAt || now);
    const terminal = !task || task.archived || task.deleted_at || ["done", "cancelled", "archived"].includes(String(task.status || ""));
    const abandoned = inactiveMs > 30 * 24 * 60 * 60 * 1000 && String(task?.status || "") !== "in_progress";
    if (!terminal && !abandoned) return session;
    const next = { ...session, status: "closed" as const, closedAt: now, lastUsedAt: now, closeReason: terminal ? "任务已终态、归档或不存在，自动关闭残留会话" : "会话超过 30 天未使用，自动关闭" };
    closed.push(next);
    return next;
  });
  if (closed.length) saveStore(store);
  return { closed: closed.length, sessions: closed };
}

export function shouldCloseTaskAgentSessions(input: { taskId?: string; reviewStatus?: string; taskStatus?: string }) {
  const hasPersistentTask = !!String(input.taskId || "").trim();
  const terminalStatuses = new Set(["done", "cancelled", "archived", "deleted"]);
  return hasPersistentTask
    ? terminalStatuses.has(String(input.taskStatus || ""))
    : String(input.reviewStatus || "") === "complete";
}

export function runTaskAgentSessionSelfTest() {
  const claude = {
    nativeSessionId: crypto.randomUUID(),
    resumeMode: "native",
    turnCount: 1,
  } as TaskAgentSession;
  const options = getTaskAgentSessionOptions(claude);
  const cursorWithoutCapturedId = advanceTaskAgentSession({ ...claude, id: "cursor-test", agentType: "cursor", nativeSessionId: "", turnCount: 0 } as TaskAgentSession, { success: true });
  const codexWithCapturedId = advanceTaskAgentSession({ ...claude, id: "codex-test", agentType: "codex", nativeSessionId: "", turnCount: 0 } as TaskAgentSession, { success: true, nativeSessionId: "codex-thread-1" });
  const invalidCursor = advanceTaskAgentSession({ ...claude, id: "cursor-invalid", agentType: "cursor", nativeSessionId: "cursor-thread-old", turnCount: 2 } as TaskAgentSession, { success: false, error: "session not found" });
  const runtimeSnapshotSession = advanceTaskAgentSession({ ...claude, id: "runtime-snapshot", agentType: "claudecode", nativeSessionId: "claude-session", turnCount: 1 } as TaskAgentSession, {
    success: true,
    runtimeToolSnapshot: {
      snapshotId: "snap-runtime",
      snapshotPath: "/tmp/runtime-tool-snapshot.json",
      mcpConfigPath: "/tmp/mcp.json",
      allowedTools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
      permissionRules: [{ rule: "mcp__ccm__payments__createInvoice" }],
    },
  });
  const checks = {
      persistsNativeSession: options.persistSession,
      resumesAfterFirstTurn: options.resumeSession,
      preservesNativeId: options.sessionId === claude.nativeSessionId,
      cursorUsesNativeContinuation: getAgentRuntime("cursor").capabilities.sessionResume,
      persistentTaskWaitsForDoneState: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "in_progress" }),
      persistentTaskClosesAfterDoneState: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "done" }),
      persistentTaskKeepsSessionOnFailed: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "failed" }),
      persistentTaskKeepsSessionOnPaused: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "paused" }),
      persistentTaskClosesAfterCancelled: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "cancelled" }),
      persistentTaskClosesAfterArchived: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "archived" }),
      conversationalTaskClosesAfterReview: shouldCloseTaskAgentSessions({ reviewStatus: "complete" }),
      missingNativeIdCanDegradeSafely: cursorWithoutCapturedId.resumeMode === "scratchpad" && cursorWithoutCapturedId.nativeCaptureFailures === 1,
      capturedNativeIdStaysResumable: codexWithCapturedId.resumeMode === "native" && getTaskAgentSessionOptions(codexWithCapturedId).resumeSession,
      invalidNativeSessionCreatesRecoveryPath: invalidCursor.resumeMode === "native" && invalidCursor.nativeSessionId === "" && invalidCursor.nativeSessionHistory?.includes("cursor-thread-old") && invalidCursor.nativeRecoveryAttempts === 1,
      runtimeSnapshotPersistsAcrossTurns: runtimeSnapshotSession.runtimeSnapshotId === "snap-runtime" && getTaskAgentSessionOptions(runtimeSnapshotSession).runtimeSnapshotId === "snap-runtime" && getTaskAgentSessionContinuity(runtimeSnapshotSession).mcpConfigPath === "/tmp/mcp.json",
      permissionDriftRebuildsNativeSession: (() => {
        const drifted = advanceTaskAgentSession({ ...claude, id: "codex-drift", agentType: "codex", nativeSessionId: "codex-readonly", turnCount: 3 } as TaskAgentSession, { success: false, error: "sandbox read-only", permissionDrift: true });
        return drifted.resumeMode === "native" && drifted.nativeSessionId === "" && drifted.turnCount === 0 && drifted.nativeSessionHistory?.includes("codex-readonly") && drifted.permissionDriftCount === 1;
      })(),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
