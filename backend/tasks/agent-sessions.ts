import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { getAgentRuntime, normalizeAgentRuntimeId } from "../agents/runtime";
import { CCM_DIR } from "../core/utils";

const STORE_FILE = path.join(CCM_DIR, "task-agent-sessions.json");
const STORE_BACKUP_FILE = `${STORE_FILE}.bak`;
const MEMORY_CONTEXT_SNAPSHOT_DIR = path.join(CCM_DIR, "task-agent-memory-context-snapshots");
const MAX_SESSION_RECORDS = 500;
const MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION = 20;
const TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA = "ccm-task-agent-memory-context-snapshot-v1";
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS = 30;
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS = 45;
const DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION = 5;

export type TaskAgentMemoryContextSnapshotRef = {
  snapshotId: string;
  snapshotPath: string;
  checksum: string;
  workerContextPacketId?: string;
  workerHandoffId?: string;
  gateIds?: string[];
  generatedAt: string;
};

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
  memoryContextSnapshotId?: string;
  memoryContextSnapshotPath?: string;
  memoryContextSnapshotChecksum?: string;
  memoryContextPacketId?: string;
  memoryContextSnapshotAt?: string;
  memoryContextSnapshots?: TaskAgentMemoryContextSnapshotRef[];
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

function safeStringify(value: any) {
  const seen = new WeakSet<object>();
  return JSON.stringify(value || {}, (_key, item) => {
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    return item;
  });
}

function hashValue(value: any, len = 24) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : safeStringify(value)).digest("hex").slice(0, len);
}

function safeReadJson(file: string, fallback: any = null) {
  try {
    if (!file || !fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  fs.renameSync(tmp, file);
}

function safeFileSegment(value: any, fallback = "unknown") {
  const text = String(value || "").trim().replace(/[^a-zA-Z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
  return text || fallback;
}

function getMemoryContextSnapshotDir(sessionId: string) {
  return path.join(MEMORY_CONTEXT_SNAPSHOT_DIR, safeFileSegment(sessionId, "session"));
}

function collectMemoryContextGateIds(value: any, out = new Set<string>()) {
  if (!value || typeof value !== "object") return out;
  const candidates = [
    value.dispatch_gate_id,
    value.dispatchGateId,
    value.reinjection_gate_id,
    value.reinjectionGateId,
    value.revalidation_gate_id,
    value.revalidationGateId,
    value.gate_id,
    value.gateId,
    value.marker_id,
    value.markerId,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || "").trim();
    if (text) out.add(text);
  }
  for (const key of [
    "memory",
    "group_memory",
    "groupMemory",
    "global_agent_memory",
    "globalAgentMemory",
    "references",
    "worker_context_packet",
    "workerContextPacket",
    "memory_context",
    "memoryContext",
    "dispatch_freshness_gate",
    "global_memory_health_gate",
    "post_compact_reinjection_gate",
    "post_compact_dispatch_marker",
    "compact_file_reference_read_plan_revalidation_gate",
  ]) {
    collectMemoryContextGateIds(value[key], out);
  }
  if (Array.isArray(value.items)) {
    for (const item of value.items.slice(0, 80)) {
      const id = String(item?.id || item?.globalMemoryId || item?.global_memory_id || "").trim();
      if (id) out.add(id);
    }
  }
  if (Array.isArray(value.candidates)) {
    for (const item of value.candidates.slice(0, 80)) {
      const id = String(item?.candidate_id || item?.candidateId || "").trim();
      if (id) out.add(id);
    }
  }
  return out;
}

function normalizeMemorySnapshotRefs(value: any): TaskAgentMemoryContextSnapshotRef[] {
  return (Array.isArray(value) ? value : []).map((item: any) => ({
    snapshotId: String(item?.snapshotId || item?.snapshot_id || "").trim(),
    snapshotPath: String(item?.snapshotPath || item?.snapshot_path || "").trim(),
    checksum: String(item?.checksum || item?.snapshotChecksum || item?.snapshot_checksum || "").trim(),
    workerContextPacketId: String(item?.workerContextPacketId || item?.worker_context_packet_id || "").trim(),
    workerHandoffId: String(item?.workerHandoffId || item?.worker_handoff_id || "").trim(),
    gateIds: Array.isArray(item?.gateIds || item?.gate_ids)
      ? (item.gateIds || item.gate_ids).map((id: any) => String(id || "").trim()).filter(Boolean).slice(0, 80)
      : [],
    generatedAt: String(item?.generatedAt || item?.generated_at || "").trim(),
  })).filter((item: TaskAgentMemoryContextSnapshotRef) => item.snapshotId || item.snapshotPath);
}

function purgeMemoryContextSnapshotsForSession(sessionId: string) {
  const dir = getMemoryContextSnapshotDir(sessionId);
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

function normalizeSnapshotFileKey(file: any) {
  try { return path.resolve(String(file || "")).toLowerCase(); } catch { return String(file || "").toLowerCase(); }
}

function pathIsInsideMemorySnapshotDir(file: string) {
  try {
    const base = path.resolve(MEMORY_CONTEXT_SNAPSHOT_DIR).toLowerCase();
    const target = path.resolve(file).toLowerCase();
    return target === base || target.startsWith(`${base}${path.sep}`);
  } catch {
    return false;
  }
}

function listMemoryContextSnapshotFilesOnDisk() {
  const files: { file: string; sessionId: string }[] = [];
  try {
    if (!fs.existsSync(MEMORY_CONTEXT_SNAPSHOT_DIR)) return files;
    for (const entry of fs.readdirSync(MEMORY_CONTEXT_SNAPSHOT_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sessionDir = path.join(MEMORY_CONTEXT_SNAPSHOT_DIR, entry.name);
      for (const fileEntry of fs.readdirSync(sessionDir, { withFileTypes: true })) {
        if (fileEntry.isFile() && fileEntry.name.endsWith(".json")) {
          files.push({ file: path.join(sessionDir, fileEntry.name), sessionId: entry.name });
        }
      }
    }
  } catch {}
  return files;
}

function verifyMemoryContextSnapshotChecksum(snapshot: any) {
  if (!snapshot || typeof snapshot !== "object") return false;
  const expected = String(snapshot.checksum || "").trim();
  if (!expected) return false;
  const payload = { ...snapshot };
  delete payload.checksum;
  delete payload.snapshot_file;
  if (hashValue(payload) === expected) return true;
  const aliasPayload = JSON.parse(JSON.stringify(payload));
  if (aliasPayload?.context?.worker_context_packet?.memory) {
    aliasPayload.context.memory_context = aliasPayload.context.worker_context_packet.memory;
    if (hashValue(aliasPayload) === expected) return true;
  }
  return false;
}

function hasMeaningfulMemoryContext(value: any) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value).length > 0;
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

export function bindTaskAgentMemoryContextSnapshot(sessionId: string, input: {
  taskId?: string;
  groupId?: string;
  project?: string;
  agentType?: string;
  nativeSessionId?: string;
  turn?: number;
  executionId?: string;
  traceId?: string;
  workerContextPacket?: any;
  workerHandoff?: any;
  workerHandoffSummary?: any;
  memoryContext?: any;
  renderedHandoff?: string;
  renderedPrompt?: string;
  runtimeToolSnapshot?: any;
} = {}) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  const store = loadStore();
  const index = store.sessions.findIndex((item: TaskAgentSession) => item.id === id);
  if (index < 0) return null;
  const current = store.sessions[index];
  const packet = input.workerContextPacket || input.workerHandoff?.worker_context_packet || input.workerHandoff?.workerContextPacket || {};
  const memoryContext = input.memoryContext || packet.memory || input.workerHandoff?.references?.memory_context || input.workerHandoff?.references?.memoryContext || null;
  const workerHandoffId = String(input.workerHandoff?.handoff_id || input.workerHandoff?.handoffId || input.workerHandoffSummary?.handoff_id || input.workerHandoffSummary?.handoffId || "").trim();
  const workerContextPacketId = String(packet?.packet_id || packet?.packetId || input.workerHandoffSummary?.packet_id || input.workerHandoffSummary?.packetId || "").trim();
  const generatedAt = new Date().toISOString();
  const gateIds = Array.from(collectMemoryContextGateIds({
    worker_context_packet: packet,
    worker_handoff: input.workerHandoff || null,
    memory_context: memoryContext,
  })).slice(0, 100);
  const snapshotSeed = [
    current.id,
    input.taskId || current.taskId,
    input.groupId || current.groupId,
    input.project || current.project,
    input.executionId || "",
    workerContextPacketId,
    Number(input.turn || current.turnCount + 1 || 0),
    generatedAt,
  ].join("\0");
  const snapshotId = `tams_${hashValue(snapshotSeed, 18)}`;
  const snapshotFile = path.join(getMemoryContextSnapshotDir(current.id), `${snapshotId}.json`);
  const payloadWithoutChecksum = {
    schema: TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA,
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    session: {
      id: current.id,
      scope_id: current.scopeId,
      task_id: String(input.taskId || current.taskId || "").trim(),
      group_id: String(input.groupId || current.groupId || "").trim(),
      project: String(input.project || current.project || "").trim(),
      agent_type: normalizeAgentRuntimeId(input.agentType || current.agentType || ""),
      native_session_id: String(input.nativeSessionId || current.nativeSessionId || "").trim(),
      turn: Number(input.turn || current.turnCount + 1 || 0),
      resume_mode: current.resumeMode,
    },
    context: {
      execution_id: String(input.executionId || "").trim(),
      trace_id: String(input.traceId || "").trim(),
      worker_context_packet_id: workerContextPacketId,
      worker_handoff_id: workerHandoffId,
      worker_context_packet: packet || null,
      worker_handoff_summary: input.workerHandoffSummary || null,
      memory_context: memoryContext || null,
      memory_context_checksum: hashValue(memoryContext || {}),
      rendered_handoff_checksum: input.renderedHandoff ? hashValue(input.renderedHandoff) : "",
      rendered_prompt_checksum: input.renderedPrompt ? hashValue(input.renderedPrompt) : "",
      rendered_prompt_excerpt: input.renderedPrompt ? String(input.renderedPrompt).slice(0, 4000) : "",
      runtime_tool_snapshot: input.runtimeToolSnapshot || null,
      gate_ids: gateIds,
    },
  };
  const checksum = hashValue(payloadWithoutChecksum);
  const snapshot = {
    ...payloadWithoutChecksum,
    checksum,
    snapshot_file: snapshotFile,
  };
  writeJsonAtomic(snapshotFile, snapshot);
  const ref: TaskAgentMemoryContextSnapshotRef = {
    snapshotId,
    snapshotPath: snapshotFile,
    checksum,
    workerContextPacketId,
    workerHandoffId,
    gateIds,
    generatedAt,
  };
  const refs = normalizeMemorySnapshotRefs(current.memoryContextSnapshots);
  refs.push(ref);
  const next: TaskAgentSession = {
    ...current,
    memoryContextSnapshotId: snapshotId,
    memoryContextSnapshotPath: snapshotFile,
    memoryContextSnapshotChecksum: checksum,
    memoryContextPacketId: workerContextPacketId,
    memoryContextSnapshotAt: generatedAt,
    memoryContextSnapshots: refs.slice(-MAX_MEMORY_CONTEXT_SNAPSHOTS_PER_SESSION),
    lastUsedAt: generatedAt,
  };
  store.sessions[index] = next;
  saveStore(store);
  return { session: next, snapshot, ref };
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

export function listTaskAgentMemoryContextSnapshots(filter: { scopeId?: string; taskId?: string; groupId?: string; project?: string; status?: string; sessionId?: string } = {}) {
  const sessions = loadStore().sessions.filter((item: TaskAgentSession) =>
    (!filter.sessionId || item.id === filter.sessionId)
    && (!filter.scopeId || item.scopeId === filter.scopeId)
    && (!filter.taskId || item.taskId === filter.taskId)
    && (!filter.groupId || item.groupId === filter.groupId)
    && (!filter.project || item.project === filter.project)
    && (!filter.status || item.status === filter.status)
  );
  const snapshots: any[] = [];
  for (const session of sessions) {
    const refs = normalizeMemorySnapshotRefs([
      ...(session.memoryContextSnapshots || []),
      session.memoryContextSnapshotId || session.memoryContextSnapshotPath ? {
        snapshotId: session.memoryContextSnapshotId || "",
        snapshotPath: session.memoryContextSnapshotPath || "",
        checksum: session.memoryContextSnapshotChecksum || "",
        workerContextPacketId: session.memoryContextPacketId || "",
        generatedAt: session.memoryContextSnapshotAt || "",
      } : null,
    ].filter(Boolean));
    const seen = new Set<string>();
    for (const ref of refs) {
      const key = ref.snapshotId || ref.snapshotPath;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const loaded = safeReadJson(ref.snapshotPath, null);
      snapshots.push({
        ...(loaded || {}),
        schema: loaded?.schema || "ccm-task-agent-memory-context-snapshot-ref-v1",
        snapshot_id: loaded?.snapshot_id || ref.snapshotId,
        snapshot_file: loaded?.snapshot_file || ref.snapshotPath,
        checksum: loaded?.checksum || ref.checksum,
        generated_at: loaded?.generated_at || ref.generatedAt,
        session: loaded?.session || {
          id: session.id,
          scope_id: session.scopeId,
          task_id: session.taskId,
          group_id: session.groupId,
          project: session.project,
          agent_type: session.agentType,
          native_session_id: session.nativeSessionId,
          turn: session.turnCount,
          resume_mode: session.resumeMode,
        },
        ref,
      });
    }
  }
  return snapshots.sort((a: any, b: any) => String(a.generated_at || "").localeCompare(String(b.generated_at || "")));
}

function taskAgentMemorySnapshotMatchesFilter(row: any, filter: any = {}) {
  const session = row?.session || {};
  return (!filter.sessionId || session.id === filter.sessionId)
    && (!filter.scopeId || session.scope_id === filter.scopeId || session.scopeId === filter.scopeId)
    && (!filter.taskId || session.task_id === filter.taskId || session.taskId === filter.taskId)
    && (!filter.groupId || session.group_id === filter.groupId || session.groupId === filter.groupId)
    && (!filter.project || session.project === filter.project)
    && (!filter.status || row.status === filter.status || session.status === filter.status);
}

function buildTaskAgentMemorySnapshotRow(input: {
  session?: TaskAgentSession | null;
  ref?: TaskAgentMemoryContextSnapshotRef | null;
  loaded?: any;
  actualFile?: string;
  source: "session_ref" | "orphan_file";
  latestRank?: number | null;
  policy: { staleDays: number; retentionDays: number; keepLatestPerSession: number };
  nowMs: number;
}) {
  const loaded = input.loaded || null;
  const loadedSession = loaded?.session || {};
  const session = input.session || null;
  const actualFile = String(input.actualFile || input.ref?.snapshotPath || loaded?.snapshot_file || "").trim();
  const fileExists = !!actualFile && fs.existsSync(actualFile);
  const stat = (() => {
    try { return fileExists ? fs.statSync(actualFile) : null; } catch { return null; }
  })();
  const generatedAt = String(loaded?.generated_at || input.ref?.generatedAt || (stat ? stat.mtime.toISOString() : "") || "").trim();
  const generatedMs = Date.parse(generatedAt || "");
  const ageMs = Number.isFinite(generatedMs) ? Math.max(0, input.nowMs - generatedMs) : stat ? Math.max(0, input.nowMs - stat.mtimeMs) : null;
  const ageDays = ageMs === null ? null : Math.round((ageMs / (24 * 60 * 60 * 1000)) * 10) / 10;
  const context = loaded?.context || {};
  const memoryContext = context.memory_context || context.worker_context_packet?.memory || null;
  const gateIds = Array.isArray(context.gate_ids || input.ref?.gateIds)
    ? (context.gate_ids || input.ref?.gateIds).map((id: any) => String(id || "").trim()).filter(Boolean)
    : [];
  const workerContextPacketId = String(context.worker_context_packet_id || input.ref?.workerContextPacketId || "").trim();
  const snapshotId = String(loaded?.snapshot_id || input.ref?.snapshotId || path.basename(actualFile || "", ".json") || "").trim();
  const sessionId = String(loadedSession.id || session?.id || "").trim();
  const expectedSessionId = String(session?.id || "").trim();
  const sessionBound = input.source === "session_ref"
    ? !!expectedSessionId && (!loaded || String(loadedSession.id || "") === expectedSessionId)
    : false;
  const schemaOk = loaded?.schema === TASK_AGENT_MEMORY_CONTEXT_SNAPSHOT_SCHEMA;
  const checksumMatches = !!loaded && verifyMemoryContextSnapshotChecksum(loaded);
  const memoryContextPresent = hasMeaningfulMemoryContext(memoryContext);
  const stale = ageDays !== null && ageDays >= input.policy.staleDays;
  const latestRank = input.latestRank ?? null;
  const latestForSession = latestRank === 0;
  const retentionExpired = ageDays !== null && ageDays >= input.policy.retentionDays;
  const prunable = fileExists
    && pathIsInsideMemorySnapshotDir(actualFile)
    && !latestForSession
    && (input.source === "orphan_file" || (latestRank !== null && latestRank >= input.policy.keepLatestPerSession && retentionExpired));
  const hardGaps: any[] = [];
  const warningGaps: any[] = [];
  if (!fileExists) hardGaps.push({ reason: "快照文件缺失" });
  if (fileExists && !loaded) hardGaps.push({ reason: "快照 JSON 无法读取" });
  if (loaded && !schemaOk) hardGaps.push({ reason: "快照 schema 不匹配" });
  if (loaded && !checksumMatches) hardGaps.push({ reason: "快照 checksum 不匹配" });
  if (input.source === "session_ref" && !sessionBound) hardGaps.push({ reason: "快照未绑定到实际 task Agent session" });
  if (loaded && !memoryContextPresent) hardGaps.push({ reason: "快照缺少可注入 memory_context" });
  if (loaded && !workerContextPacketId) hardGaps.push({ reason: "快照缺少 worker context packet id" });
  if (loaded && !gateIds.length) warningGaps.push({ reason: "快照未捕获 memory gate ids" });
  if (input.source === "orphan_file") warningGaps.push({ reason: "快照文件未被 task-agent-sessions 索引引用" });
  if (stale) warningGaps.push({ reason: `快照超过 ${input.policy.staleDays} 天未刷新` });
  const gaps = [...hardGaps, ...warningGaps];
  const status = hardGaps.length ? "fail" : warningGaps.length ? "warn" : "ok";
  return {
    schema: "ccm-task-agent-memory-context-snapshot-inventory-row-v1",
    source: input.source,
    status,
    snapshotId,
    snapshotFile: actualFile,
    declaredSnapshotFile: String(loaded?.snapshot_file || "").trim(),
    checksum: String(loaded?.checksum || input.ref?.checksum || "").trim(),
    checksumMatches,
    generatedAt,
    ageDays,
    stale,
    prunable,
    latestForSession,
    latestRank,
    sessionId,
    expectedSessionId,
    taskId: String(loadedSession.task_id || session?.taskId || "").trim(),
    scopeId: String(loadedSession.scope_id || session?.scopeId || "").trim(),
    groupId: String(loadedSession.group_id || session?.groupId || "").trim(),
    project: String(loadedSession.project || session?.project || "").trim(),
    agentType: String(loadedSession.agent_type || session?.agentType || "").trim(),
    nativeSessionId: String(loadedSession.native_session_id || session?.nativeSessionId || "").trim(),
    resumeMode: String(loadedSession.resume_mode || session?.resumeMode || "").trim(),
    workerContextPacketId,
    workerHandoffId: String(context.worker_handoff_id || input.ref?.workerHandoffId || "").trim(),
    gateIds,
    gateCount: gateIds.length,
    fileExists,
    readable: !!loaded,
    schemaOk,
    sessionBound,
    memoryContextPresent,
    renderedPromptChecksum: String(context.rendered_prompt_checksum || "").trim(),
    gaps,
  };
}

export function buildTaskAgentMemoryContextSnapshotInventory(filter: {
  scopeId?: string;
  taskId?: string;
  groupId?: string;
  project?: string;
  status?: string;
  sessionId?: string;
  staleAfterDays?: number;
  stale_after_days?: number;
  retentionDays?: number;
  retention_days?: number;
  keepLatestPerSession?: number;
  keep_latest_per_session?: number;
  nowMs?: number;
  includeOrphans?: boolean;
  include_orphans?: boolean;
} = {}) {
  const staleDays = Math.max(1, Number(filter.staleAfterDays ?? filter.stale_after_days ?? DEFAULT_MEMORY_CONTEXT_SNAPSHOT_STALE_DAYS));
  const retentionDays = Math.max(1, Number(filter.retentionDays ?? filter.retention_days ?? DEFAULT_MEMORY_CONTEXT_SNAPSHOT_RETENTION_DAYS));
  const keepLatestPerSession = Math.max(1, Number(filter.keepLatestPerSession ?? filter.keep_latest_per_session ?? DEFAULT_MEMORY_CONTEXT_SNAPSHOT_KEEP_LATEST_PER_SESSION));
  const nowMs = Number(filter.nowMs || Date.now());
  const store = loadStore();
  const sessions = store.sessions.filter((item: TaskAgentSession) =>
    (!filter.sessionId || item.id === filter.sessionId)
    && (!filter.scopeId || item.scopeId === filter.scopeId)
    && (!filter.taskId || item.taskId === filter.taskId)
    && (!filter.groupId || item.groupId === filter.groupId)
    && (!filter.project || item.project === filter.project)
    && (!filter.status || item.status === filter.status)
  );
  const allSessionsById = new Map<string, TaskAgentSession>(store.sessions.map((session: TaskAgentSession) => [session.id, session]));
  const policy = { staleDays, retentionDays, keepLatestPerSession };
  const rows: any[] = [];
  const referencedFileKeys = new Set<string>();
  const referencedSnapshotIds = new Set<string>();
  for (const session of sessions) {
    const refs = normalizeMemorySnapshotRefs([
      ...(session.memoryContextSnapshots || []),
      session.memoryContextSnapshotId || session.memoryContextSnapshotPath ? {
        snapshotId: session.memoryContextSnapshotId || "",
        snapshotPath: session.memoryContextSnapshotPath || "",
        checksum: session.memoryContextSnapshotChecksum || "",
        workerContextPacketId: session.memoryContextPacketId || "",
        generatedAt: session.memoryContextSnapshotAt || "",
      } : null,
    ].filter(Boolean));
    const uniqueRefs: TaskAgentMemoryContextSnapshotRef[] = [];
    const seen = new Set<string>();
    for (const ref of refs) {
      const key = ref.snapshotPath ? normalizeSnapshotFileKey(ref.snapshotPath) : ref.snapshotId;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueRefs.push(ref);
      if (ref.snapshotPath) referencedFileKeys.add(normalizeSnapshotFileKey(ref.snapshotPath));
      if (ref.snapshotId) referencedSnapshotIds.add(ref.snapshotId);
    }
    const sortedRefs = [...uniqueRefs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
    const latestRankByKey = new Map<string, number>();
    sortedRefs.forEach((ref, index) => latestRankByKey.set(ref.snapshotPath ? normalizeSnapshotFileKey(ref.snapshotPath) : ref.snapshotId, index));
    for (const ref of uniqueRefs) {
      const key = ref.snapshotPath ? normalizeSnapshotFileKey(ref.snapshotPath) : ref.snapshotId;
      const loaded = safeReadJson(ref.snapshotPath, null);
      rows.push(buildTaskAgentMemorySnapshotRow({
        session,
        ref,
        loaded,
        actualFile: ref.snapshotPath,
        source: "session_ref",
        latestRank: latestRankByKey.get(key) ?? null,
        policy,
        nowMs,
      }));
    }
  }

  if (filter.includeOrphans !== false && filter.include_orphans !== false) {
    for (const disk of listMemoryContextSnapshotFilesOnDisk()) {
      const fileKey = normalizeSnapshotFileKey(disk.file);
      if (referencedFileKeys.has(fileKey)) continue;
      const loaded = safeReadJson(disk.file, null);
      const snapshotId = String(loaded?.snapshot_id || path.basename(disk.file, ".json"));
      if (referencedSnapshotIds.has(snapshotId)) continue;
      const loadedSession = loaded?.session || {};
      const session = allSessionsById.get(String(loadedSession.id || disk.sessionId || "")) || null;
      const rowSeed = {
        session: loadedSession,
        status: session?.status || "",
      };
      if (!taskAgentMemorySnapshotMatchesFilter(rowSeed, filter)) continue;
      rows.push(buildTaskAgentMemorySnapshotRow({
        session,
        loaded,
        actualFile: disk.file,
        source: "orphan_file",
        latestRank: null,
        policy,
        nowMs,
      }));
    }
  }

  rows.sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")));
  const byGroup = new Map<string, any>();
  for (const row of rows) {
    const groupId = row.groupId || "unknown";
    const current = byGroup.get(groupId) || { groupId, snapshotCount: 0, okCount: 0, warnCount: 0, failCount: 0, prunableCount: 0, staleCount: 0, projects: new Set<string>() };
    current.snapshotCount += 1;
    if (row.status === "ok") current.okCount += 1;
    if (row.status === "warn") current.warnCount += 1;
    if (row.status === "fail") current.failCount += 1;
    if (row.prunable) current.prunableCount += 1;
    if (row.stale) current.staleCount += 1;
    if (row.project) current.projects.add(row.project);
    byGroup.set(groupId, current);
  }
  const groups = Array.from(byGroup.values()).map(group => ({
    ...group,
    projects: Array.from(group.projects).slice(0, 12),
  })).sort((a, b) => Number(b.failCount + b.warnCount) - Number(a.failCount + a.warnCount));
  return {
    schema: "ccm-task-agent-memory-context-snapshot-inventory-v1",
    generatedAt: new Date(nowMs).toISOString(),
    directory: MEMORY_CONTEXT_SNAPSHOT_DIR,
    filters: {
      scopeId: filter.scopeId || "",
      taskId: filter.taskId || "",
      groupId: filter.groupId || "",
      project: filter.project || "",
      status: filter.status || "",
      sessionId: filter.sessionId || "",
    },
    policy,
    summary: {
      sessionCount: sessions.length,
      snapshotCount: rows.length,
      okCount: rows.filter(row => row.status === "ok").length,
      warnCount: rows.filter(row => row.status === "warn").length,
      failCount: rows.filter(row => row.status === "fail").length,
      referencedCount: rows.filter(row => row.source === "session_ref").length,
      orphanFileCount: rows.filter(row => row.source === "orphan_file").length,
      missingFileCount: rows.filter(row => !row.fileExists).length,
      unreadableCount: rows.filter(row => row.fileExists && !row.readable).length,
      checksumMismatchCount: rows.filter(row => row.readable && !row.checksumMatches).length,
      missingPacketCount: rows.filter(row => row.readable && !row.workerContextPacketId).length,
      missingGateCount: rows.filter(row => row.readable && !row.gateCount).length,
      staleCount: rows.filter(row => row.stale).length,
      prunableCount: rows.filter(row => row.prunable).length,
      groupCount: groups.length,
    },
    groups,
    rows: rows.slice(0, 300),
    weakRows: rows.filter(row => row.status === "fail" || row.status === "warn").slice(0, 60),
    prunableRows: rows.filter(row => row.prunable),
  };
}

export function pruneTaskAgentMemoryContextSnapshots(options: any = {}) {
  const dryRun = options.dryRun !== false && options.dry_run !== false;
  const inventory = buildTaskAgentMemoryContextSnapshotInventory(options);
  const candidates = (inventory.prunableRows || []).filter((row: any) => row.fileExists && row.snapshotFile && pathIsInsideMemorySnapshotDir(row.snapshotFile));
  const pruned: any[] = [];
  const skipped: any[] = [];
  for (const row of candidates) {
    if (dryRun) {
      pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, sessionId: row.sessionId, dryRun: true, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
      continue;
    }
    try {
      fs.rmSync(row.snapshotFile, { force: true });
      pruned.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, sessionId: row.sessionId, dryRun: false, reason: row.source === "orphan_file" ? "orphan_file" : "retention_expired" });
      try {
        const dir = path.dirname(row.snapshotFile);
        if (pathIsInsideMemorySnapshotDir(dir) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch {}
    } catch (error: any) {
      skipped.push({ snapshotId: row.snapshotId, snapshotFile: row.snapshotFile, reason: error?.message || String(error) });
    }
  }
  if (!dryRun && pruned.length) {
    const prunedIds = new Set(pruned.map(row => String(row.snapshotId || "")).filter(Boolean));
    const prunedFiles = new Set(pruned.map(row => normalizeSnapshotFileKey(row.snapshotFile)).filter(Boolean));
    const store = loadStore();
    store.sessions = store.sessions.map((session: TaskAgentSession) => {
      const refs = normalizeMemorySnapshotRefs(session.memoryContextSnapshots).filter(ref =>
        !prunedIds.has(ref.snapshotId)
        && !prunedFiles.has(normalizeSnapshotFileKey(ref.snapshotPath))
      );
      const currentPruned = prunedIds.has(String(session.memoryContextSnapshotId || ""))
        || prunedFiles.has(normalizeSnapshotFileKey(session.memoryContextSnapshotPath || ""));
      if (!currentPruned && refs.length === normalizeMemorySnapshotRefs(session.memoryContextSnapshots).length) return session;
      const latest = [...refs].sort((a, b) => String(b.generatedAt || "").localeCompare(String(a.generatedAt || "")))[0] || null;
      return {
        ...session,
        memoryContextSnapshotId: latest?.snapshotId || "",
        memoryContextSnapshotPath: latest?.snapshotPath || "",
        memoryContextSnapshotChecksum: latest?.checksum || "",
        memoryContextPacketId: latest?.workerContextPacketId || "",
        memoryContextSnapshotAt: latest?.generatedAt || "",
        memoryContextSnapshots: refs,
      };
    });
    saveStore(store);
  }
  return {
    schema: "ccm-task-agent-memory-context-snapshot-retention-result-v1",
    generatedAt: new Date().toISOString(),
    dryRun,
    policy: inventory.policy,
    before: inventory.summary,
    candidateCount: candidates.length,
    prunedCount: pruned.length,
    skippedCount: skipped.length,
    pruned,
    skipped,
  };
}

export function purgeTaskAgentSessions(taskId: string) {
  const id = String(taskId || "").trim();
  if (!id) return [];
  const store = loadStore();
  const removed = store.sessions.filter((item: TaskAgentSession) => item.taskId === id || item.scopeId === id);
  if (!removed.length) return [];
  store.sessions = store.sessions.filter((item: TaskAgentSession) => item.taskId !== id && item.scopeId !== id);
  for (const session of removed) purgeMemoryContextSnapshotsForSession(session.id);
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
      taskAgentMemoryContextSnapshotBindsSession: (() => {
        const taskId = `task-agent-memory-snapshot-selftest-${process.pid}-${Date.now().toString(36)}`;
        try {
          const session = openTaskAgentSession({
            scopeId: taskId,
            taskId,
            groupId: "group-agent-memory-snapshot-selftest",
            project: "frontend",
            agentType: "codex",
          });
          const bound = bindTaskAgentMemoryContextSnapshot(session.id, {
            taskId,
            groupId: "group-agent-memory-snapshot-selftest",
            project: "frontend",
            agentType: "codex",
            nativeSessionId: "codex-native-memory-selftest",
            turn: 1,
            executionId: "exec-agent-memory-snapshot-selftest",
            traceId: "trace-agent-memory-snapshot-selftest",
            workerContextPacket: {
              packet_id: "wcp_agent_memory_snapshot_selftest",
              memory: {
                schema: "ccm-group-memory-context-v1",
                target_project: "frontend",
                dispatch_freshness_gate: {
                  schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
                  dispatch_gate_id: "gmd_agent_memory_snapshot_selftest",
                },
              },
            },
            renderedPrompt: "prompt contains injected worker memory",
          });
          const listed = listTaskAgentMemoryContextSnapshots({ taskId });
          const loaded = listed.find((item: any) => item.snapshot_id === bound?.snapshot?.snapshot_id);
          return !!bound?.session.memoryContextSnapshotId
            && !!bound?.snapshot.snapshot_file
            && fs.existsSync(bound.snapshot.snapshot_file)
            && loaded?.context?.worker_context_packet_id === "wcp_agent_memory_snapshot_selftest"
            && loaded?.context?.gate_ids?.includes("gmd_agent_memory_snapshot_selftest")
            && loaded?.session?.id === session.id;
        } finally {
          purgeTaskAgentSessions(taskId);
        }
      })(),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
