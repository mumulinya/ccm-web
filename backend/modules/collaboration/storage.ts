import * as fs from "fs";
import * as path from "path";
import {
  GROUP_MESSAGES_DIR,
  GROUPS_FILE,
} from "../../core/utils";
import { loadTasks } from "../../core/db";
import { appendTraceEvent, ensureTraceId } from "../../system/reliability-ledger";
import { requestGroupSessionAgentCancellation } from "../../agents/execution-kernel";
import { normalizeGroupOrchestrator } from "./group-orchestrator";
import { deleteGroupPostTurnSummaryArtifacts } from "./group-post-turn-summary";
import {
  ensureGroupSessionLifecycleHead,
  getGroupSessionLifecycleHeadFile,
  readGroupSessionLifecycleHead,
  transitionGroupSessionLifecycleHead,
} from "./group-session-lifecycle-head";

// === 群聊管理 ===
export function loadGroups() {
  if (!fs.existsSync(GROUPS_FILE)) return [];
  try {
    const groups = JSON.parse(fs.readFileSync(GROUPS_FILE, "utf-8"));
    if (!Array.isArray(groups)) return [];
    const before = JSON.stringify(groups);
    const normalized = groups.map(normalizeGroupOrchestrator);
    if (JSON.stringify(normalized) !== before) {
      saveGroups(normalized);
    }
    return normalized;
  } catch {
    try {
      const recovered = JSON.parse(fs.readFileSync(`${GROUPS_FILE}.bak`, "utf-8"));
      if (Array.isArray(recovered)) return recovered.map(normalizeGroupOrchestrator);
    } catch {}
    return [];
  }
}

export function saveGroups(groups: any[]) {
  const content = JSON.stringify(groups, null, 2);
  if (fs.existsSync(GROUPS_FILE)) {
    try { if (fs.readFileSync(GROUPS_FILE, "utf-8") === content) return; } catch {}
  }
  const temp = `${GROUPS_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  if (fs.existsSync(GROUPS_FILE)) {
    try { fs.copyFileSync(GROUPS_FILE, `${GROUPS_FILE}.bak`); } catch {}
  }
  fs.writeFileSync(temp, content, "utf-8");
  replaceFileWithWindowsRetry(temp, GROUPS_FILE);
}

const groupMessagesCache = new Map<string, { mtimeMs: number; size: number; messages: any[] }>();
type GroupMessageAppendHook = (groupId: string, message: any, messages: any[]) => void;
var groupMessageAppendHooks: Set<GroupMessageAppendHook> | null = null;

function replaceFileWithWindowsRetry(temp: string, file: string) {
  let lastError: any = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      fs.renameSync(temp, file);
      return;
    } catch (error: any) {
      lastError = error;
      if (!['EPERM', 'EACCES', 'EBUSY', 'EEXIST'].includes(String(error?.code || ''))) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * (attempt + 1));
    }
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
      fs.renameSync(temp, file);
      return;
    } catch (error: any) {
      lastError = error;
      if (!['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOENT'].includes(String(error?.code || ''))) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
    }
  }
  try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
  throw lastError || new Error(`无法替换文件：${file}`);
}

function getGroupMessageAppendHooks() {
  if (!groupMessageAppendHooks) groupMessageAppendHooks = new Set<GroupMessageAppendHook>();
  return groupMessageAppendHooks;
}

const GROUP_DEFAULT_SESSION_ID = "default";
const GROUP_MESSAGE_SESSIONS_DIR = path.join(GROUP_MESSAGES_DIR, "sessions");

function cleanGroupSessionPathPart(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}

function getGroupSessionManifestFile(groupId: string) {
  return path.join(GROUP_MESSAGE_SESSIONS_DIR, cleanGroupSessionPathPart(groupId), "manifest.json");
}

function getGroupSessionMessagesFile(groupId: string, sessionId: string) {
  if (!sessionId || sessionId === GROUP_DEFAULT_SESSION_ID) return path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  return path.join(GROUP_MESSAGE_SESSIONS_DIR, cleanGroupSessionPathPart(groupId), `${cleanGroupSessionPathPart(sessionId)}.json`);
}

export function getGroupChatSessionMessagesFile(groupId: string, sessionId = "") {
  return getGroupSessionMessagesFile(groupId, String(sessionId || getActiveGroupChatSessionId(groupId)));
}

function readGroupSessionManifest(groupId: string) {
  const file = getGroupSessionManifestFile(groupId);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    return {
      schema: "ccm-group-chat-sessions-v1",
      groupId,
      activeSessionId: String(parsed.activeSessionId || GROUP_DEFAULT_SESSION_ID),
      sessions,
      updatedAt: String(parsed.updatedAt || ""),
    };
  } catch {
    return {
      schema: "ccm-group-chat-sessions-v1",
      groupId,
      activeSessionId: GROUP_DEFAULT_SESSION_ID,
      sessions: [] as any[],
      updatedAt: "",
    };
  }
}

function writeGroupSessionManifest(groupId: string, manifest: any) {
  const file = getGroupSessionManifestFile(groupId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
  replaceFileWithWindowsRetry(temp, file);
}

function defaultGroupSessionRecord(groupId: string) {
  const file = getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID);
  let messageCount = 0;
  let updatedAt = "";
  try {
    const stat = fs.statSync(file);
    updatedAt = stat.mtime.toISOString();
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    messageCount = Array.isArray(parsed) ? parsed.length : 0;
  } catch {}
  return {
    id: GROUP_DEFAULT_SESSION_ID,
    title: messageCount ? "历史会话" : "新会话",
    createdAt: updatedAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
    messageCount,
    legacy: true,
  };
}

export function listGroupChatSessions(groupId: string) {
  const manifest = readGroupSessionManifest(groupId);
  const legacyExists = fs.existsSync(getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID));
  const sessions = (manifest.sessions.length ? [...manifest.sessions] : [defaultGroupSessionRecord(groupId)])
    .filter((item: any) => item.id !== GROUP_DEFAULT_SESSION_ID || legacyExists || manifest.activeSessionId === GROUP_DEFAULT_SESSION_ID);
  if ((legacyExists || manifest.activeSessionId === GROUP_DEFAULT_SESSION_ID) && !sessions.some((item: any) => item.id === GROUP_DEFAULT_SESSION_ID)) {
    sessions.unshift(defaultGroupSessionRecord(groupId));
  }
  return { ...manifest, sessions: sessions.sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))) };
}

export function getActiveGroupChatSessionId(groupId: string) {
  return readGroupSessionManifest(groupId).activeSessionId || GROUP_DEFAULT_SESSION_ID;
}

export function findGroupChatSessionContainingMessage(groupId: string, messageId: string) {
  const targetId = String(messageId || "").trim();
  if (!targetId) return null;
  for (const session of listGroupChatSessions(groupId).sessions) {
    const messages = getGroupMessages(groupId, session.id);
    if (messages.some((message: any) => String(message?.id || "") === targetId)) return { session, messages };
  }
  return null;
}

export function createGroupChatSession(groupId: string, title = "") {
  const manifest = listGroupChatSessions(groupId);
  const now = new Date().toISOString();
  const id = `gcs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const session = { id, title: String(title || "新会话").trim().slice(0, 80) || "新会话", createdAt: now, updatedAt: now, messageCount: 0, legacy: false };
  const existingSessions = manifest.sessions.filter((item: any) => item.id !== GROUP_DEFAULT_SESSION_ID || fs.existsSync(getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID)));
  ensureGroupSessionLifecycleHead(groupId, id, { createdAt: now, reason: "group_chat_session_created" });
  try {
    writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: id, sessions: [...existingSessions, session] });
    saveGroupMessages(groupId, [], id);
  } catch (error) {
    try { transitionGroupSessionLifecycleHead({ groupId, groupSessionId: id, status: "deleted", reason: "group_chat_session_create_failed" }); } catch {}
    throw error;
  }
  return session;
}

export function selectGroupChatSession(groupId: string, sessionId: string) {
  const manifest = listGroupChatSessions(groupId);
  const session = manifest.sessions.find((item: any) => item.id === sessionId);
  if (!session) throw new Error("群聊会话不存在");
  writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: session.id });
  return session;
}

export function renameGroupChatSession(groupId: string, sessionId: string, title: string) {
  const manifest = listGroupChatSessions(groupId);
  const cleanTitle = String(title || "").trim().slice(0, 80);
  if (!cleanTitle) throw new Error("会话名称不能为空");
  let renamed: any = null;
  const sessions = manifest.sessions.map((item: any) => {
    if (item.id !== sessionId) return item;
    renamed = { ...item, title: cleanTitle, updatedAt: new Date().toISOString() };
    return renamed;
  });
  if (!renamed) throw new Error("群聊会话不存在");
  writeGroupSessionManifest(groupId, { ...manifest, sessions });
  return renamed;
}

export function archiveGroupChatSession(groupId: string, sessionId: string, archived = true) {
  const manifest = listGroupChatSessions(groupId);
  let changed: any = null;
  const now = new Date().toISOString();
  const sessions = manifest.sessions.map((item: any) => {
    if (item.id !== sessionId) return item;
    changed = { ...item, archived: !!archived, archivedAt: archived ? now : "", updatedAt: now };
    return changed;
  });
  if (!changed) throw new Error("群聊会话不存在");
  const previousLifecycle = sessionId.startsWith("gcs_")
    ? ensureGroupSessionLifecycleHead(groupId, sessionId, { reason: "archive_lazy_adopt" }).head
    : null;
  let lifecycleCancellation: any = null;
  if (sessionId.startsWith("gcs_")) {
    transitionGroupSessionLifecycleHead({
      groupId,
      groupSessionId: sessionId,
      status: archived ? "archived" : "active",
      reason: archived ? "group_chat_session_archived" : "group_chat_session_restored",
    });
    if (archived) {
      lifecycleCancellation = requestGroupSessionAgentCancellation({
        groupId,
        groupSessionId: sessionId,
        taskIds: findActiveGroupSessionTasks(groupId, sessionId).map((task: any) => task.id),
        reason: "群聊会话已归档，停止该会话仍在运行的项目 Agent",
        actor: "group-session-archive",
      });
    }
  }
  let activeSessionId = manifest.activeSessionId;
  if (archived && activeSessionId === sessionId) {
    activeSessionId = sessions.find((item: any) => item.id !== sessionId && item.archived !== true)?.id || "";
  }
  try {
    writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: activeSessionId || manifest.activeSessionId, sessions });
    if (archived && !activeSessionId) {
      createGroupChatSession(groupId, "新会话");
    }
  } catch (error) {
    if (sessionId.startsWith("gcs_") && previousLifecycle?.status && previousLifecycle.status !== (archived ? "archived" : "active")) {
      try { transitionGroupSessionLifecycleHead({ groupId, groupSessionId: sessionId, status: previousLifecycle.status, reason: "group_chat_session_archive_rollback" }); } catch {}
    }
    throw error;
  }
  return lifecycleCancellation ? { ...changed, lifecycleCancellation } : changed;
}

export function findActiveGroupSessionTasks(groupId: string, sessionId: string, tasks: any[] = loadTasks()) {
  return tasks.filter((task: any) => String(task?.group_id || "") === groupId
    && String(task?.group_session_id || task?.groupSessionId || GROUP_DEFAULT_SESSION_ID) === sessionId
    && !task?.archived
    && !["done", "failed", "cancelled", "archived"].includes(String(task?.status || "")));
}

export function reconcileGroupSessionLifecycleAgentCancellations(tasks: any[] = loadTasks()) {
  const scopes = new Map<string, { groupId: string; groupSessionId: string; taskIds: string[] }>();
  for (const task of tasks) {
    const groupId = String(task?.group_id || task?.groupId || "").trim();
    const groupSessionId = String(task?.group_session_id || task?.groupSessionId || "").trim();
    if (!groupId || !groupSessionId.startsWith("gcs_") || task?.archived
      || ["done", "failed", "cancelled", "archived"].includes(String(task?.status || ""))) continue;
    const key = `${groupId}\u0000${groupSessionId}`;
    const scope = scopes.get(key) || { groupId, groupSessionId, taskIds: [] };
    if (task?.id) scope.taskIds.push(String(task.id));
    scopes.set(key, scope);
  }
  const revoked: any[] = [];
  let active = 0;
  for (const scope of scopes.values()) {
    const head = readGroupSessionLifecycleHead(scope.groupId, scope.groupSessionId);
    if (head?.status === "active") {
      active++;
      continue;
    }
    revoked.push({
      lifecycleStatus: String(head?.status || "missing_or_corrupt"),
      lifecycleGeneration: Number(head?.generation || 0),
      ...requestGroupSessionAgentCancellation({
        ...scope,
        reason: `启动恢复发现群聊会话生命周期为 ${head?.status || "missing_or_corrupt"}，停止旧会话 Agent`,
        actor: "group-session-lifecycle-startup-reconcile",
      }),
    });
  }
  return {
    schema: "ccm-group-session-lifecycle-agent-reconciliation-v1",
    checked: scopes.size,
    active,
    revoked: revoked.length,
    taskCount: revoked.reduce((sum, item) => sum + Number(item.taskIds?.length || 0), 0),
    scopes: revoked,
    reconciledAt: new Date().toISOString(),
  };
}

export function deleteGroupChatSession(groupId: string, sessionId: string, options: any = {}) {
  const manifest = listGroupChatSessions(groupId);
  const session = manifest.sessions.find((item: any) => item.id === sessionId);
  if (!session) throw new Error("群聊会话不存在");
  const activeTasks = findActiveGroupSessionTasks(groupId, sessionId);
  if (activeTasks.length && options.force !== true) {
    throw new Error(`会话仍有 ${activeTasks.length} 个未完成任务，请先归档任务或显式强制删除`);
  }
  const lifecycleTombstone = sessionId.startsWith("gcs_")
    ? transitionGroupSessionLifecycleHead({ groupId, groupSessionId: sessionId, status: "deleted", reason: options.reason || "group_chat_session_deleted" })
    : null;
  const lifecycleCancellation = sessionId.startsWith("gcs_")
    ? requestGroupSessionAgentCancellation({
        groupId,
        groupSessionId: sessionId,
        taskIds: activeTasks.map((task: any) => task.id),
        reason: "群聊会话已删除，停止该会话仍在运行的项目 Agent",
        actor: "group-session-delete",
      })
    : null;
  const file = getGroupSessionMessagesFile(groupId, sessionId);
  for (const target of [file, `${file}.bak`]) {
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
  }
  groupMessagesCache.delete(`${groupId}::${sessionId}`);
  const postTurnSummaries = deleteGroupPostTurnSummaryArtifacts(groupId, sessionId);
  const remaining = manifest.sessions.filter((item: any) => item.id !== sessionId);
  const nextActive = manifest.activeSessionId === sessionId
    ? remaining.find((item: any) => item.archived !== true)?.id || remaining[0]?.id || ""
    : manifest.activeSessionId;
  writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: nextActive || GROUP_DEFAULT_SESSION_ID, sessions: remaining });
  let replacement: any = null;
  if (!remaining.length) replacement = createGroupChatSession(groupId, "新会话");
  return { session, deletedMessageFile: file, postTurnSummaries, activeTaskCount: activeTasks.length, forced: options.force === true, replacement, lifecycleTombstone, lifecycleCancellation };
}

export function purgeLegacyDefaultGroupChatSession(groupId: string, options: any = {}) {
  const manifest = readGroupSessionManifest(groupId);
  const legacy = manifest.sessions.find((item: any) => item.id === GROUP_DEFAULT_SESSION_ID);
  const file = getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID);
  if (!legacy && !fs.existsSync(file)) {
    return { schema: "ccm-group-chat-legacy-session-purge-v1", groupId, purged: false, reason: "legacy_session_absent" };
  }
  const activeTasks = findActiveGroupSessionTasks(groupId, GROUP_DEFAULT_SESSION_ID);
  if (activeTasks.length && options.force !== true) {
    throw new Error(`旧会话仍有 ${activeTasks.length} 个未完成任务，请显式 force 后再删除`);
  }
  for (const target of [file, `${file}.bak`]) {
    try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch {}
  }
  groupMessagesCache.delete(`${groupId}::${GROUP_DEFAULT_SESSION_ID}`);
  const remaining = manifest.sessions.filter((item: any) => item.id !== GROUP_DEFAULT_SESSION_ID);
  const activeSessionId = manifest.activeSessionId === GROUP_DEFAULT_SESSION_ID
    ? remaining.find((item: any) => item.archived !== true)?.id || remaining[0]?.id || ""
    : manifest.activeSessionId;
  writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: activeSessionId || GROUP_DEFAULT_SESSION_ID, sessions: remaining });
  const replacement = !remaining.length ? createGroupChatSession(groupId, "新会话") : null;
  return {
    schema: "ccm-group-chat-legacy-session-purge-v1",
    groupId,
    purged: true,
    legacySessionId: GROUP_DEFAULT_SESSION_ID,
    deletedMessageFile: file,
    activeTaskCount: activeTasks.length,
    forced: options.force === true,
    replacement,
    activeSessionId: replacement?.id || activeSessionId,
    purgedAt: new Date().toISOString(),
  };
}

export function pruneArchivedGroupChatSessions(groupId: string, options: any = {}) {
  const manifest = listGroupChatSessions(groupId);
  const nowMs = Date.parse(String(options.now || "")) || Date.now();
  const retentionDays = Math.max(1, Number(options.retentionDays || options.retention_days || 30));
  const maxArchived = Math.max(1, Number(options.maxArchived || options.max_archived || 20));
  const dryRun = options.dryRun !== false && options.dry_run !== false;
  const archived = manifest.sessions.filter((item: any) => item.archived === true)
    .sort((a: any, b: any) => String(b.archivedAt || b.updatedAt || "").localeCompare(String(a.archivedAt || a.updatedAt || "")));
  const candidates = archived.filter((item: any, index: number) => {
    const at = Date.parse(String(item.archivedAt || item.updatedAt || "")) || 0;
    return index >= maxArchived || (at > 0 && nowMs - at >= retentionDays * 86_400_000);
  });
  const results = dryRun ? [] : candidates.map((item: any) => {
    try { return { id: item.id, deleted: true, result: deleteGroupChatSession(groupId, item.id) }; }
    catch (error: any) { return { id: item.id, deleted: false, error: error?.message || String(error) }; }
  });
  return { schema: "ccm-group-chat-session-retention-v1", groupId, dryRun, retentionDays, maxArchived, archivedCount: archived.length, candidateCount: candidates.length, candidates, results, generatedAt: new Date(nowMs).toISOString() };
}

export function registerGroupMessageAppendHook(hook: GroupMessageAppendHook) {
  const hooks = getGroupMessageAppendHooks();
  hooks.add(hook);
  return () => hooks.delete(hook);
}

export function resolveGroupMessageSessionId(groupId: string, msg: any, tasks: any[] = loadTasks()) {
  const linkedTask = msg?.task_id ? tasks.find((task: any) => task.id === msg.task_id) : null;
  const taskSessionId = linkedTask ? String(linkedTask?.group_session_id || linkedTask?.groupSessionId || GROUP_DEFAULT_SESSION_ID) : "";
  return String(msg?.group_session_id || msg?.groupSessionId || taskSessionId || getActiveGroupChatSessionId(groupId));
}

export function getGroupMessages(groupId: string, sessionId = "") {
  const resolvedSessionId = String(sessionId || getActiveGroupChatSessionId(groupId));
  const cacheKey = `${groupId}::${resolvedSessionId}`;
  const file = getGroupSessionMessagesFile(groupId, resolvedSessionId);
  if (!fs.existsSync(file)) {
    groupMessagesCache.delete(cacheKey);
    return [];
  }
  try {
    const stat = fs.statSync(file);
    const cached = groupMessagesCache.get(cacheKey);
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.messages;
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const messages = Array.isArray(parsed) ? parsed : [];
    groupMessagesCache.set(cacheKey, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
    return messages;
  } catch {
    try {
      const backup = `${file}.bak`;
      const parsed = JSON.parse(fs.readFileSync(backup, "utf-8"));
      const messages = Array.isArray(parsed) ? parsed : [];
      const stat = fs.statSync(file);
      groupMessagesCache.set(cacheKey, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
      return messages;
    } catch {
      groupMessagesCache.delete(cacheKey);
      return [];
    }
  }
}

export function appendGroupMessage(groupId: string, msg: any) {
  const sessionId = resolveGroupMessageSessionId(groupId, msg);
  const messages = getGroupMessages(groupId, sessionId);
  const messageId = String(msg?.id || "").trim();
  const existing = messageId ? messages.find((item: any) => String(item?.id || "") === messageId) : null;
  if (existing) return existing;
  const taskTraceId = msg?.task_id ? loadTasks().find((task: any) => task.id === msg.task_id)?.trace_id : "";
  const traceId = ensureTraceId(msg?.trace_id || msg?.traceId || taskTraceId, "message");
  const next = { ...msg, group_session_id: sessionId, trace_id: traceId };
  messages.push(next);
  saveGroupMessages(groupId, messages, sessionId);
  appendTraceEvent(traceId, { id: `group-message:${groupId}:${messageId || messages.length}`, type: "group.message_persisted", status: "ok", group_id: groupId, task_id: msg?.task_id || "", agent: msg?.agent || msg?.role || "", message: String(msg?.content || "").slice(0, 500), data: { message_id: messageId } });
  for (const hook of getGroupMessageAppendHooks()) {
    try { hook(groupId, next, messages); } catch {}
  }
  return next;
}

export function saveGroupMessages(groupId: string, messages: any[], sessionId = "") {
  if (!fs.existsSync(GROUP_MESSAGES_DIR)) {
    fs.mkdirSync(GROUP_MESSAGES_DIR, { recursive: true });
  }
  const resolvedSessionId = String(sessionId || getActiveGroupChatSessionId(groupId));
  const cacheKey = `${groupId}::${resolvedSessionId}`;
  const file = getGroupSessionMessagesFile(groupId, resolvedSessionId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(messages, null, 2), "utf-8");
  replaceFileWithWindowsRetry(temp, file);
  const stat = fs.statSync(file);
  groupMessagesCache.set(cacheKey, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
  const manifestFile = getGroupSessionManifestFile(groupId);
  if (fs.existsSync(manifestFile)) {
    const manifest = listGroupChatSessions(groupId);
    const now = new Date().toISOString();
    const sessions = manifest.sessions.map((item: any) => item.id === resolvedSessionId ? { ...item, messageCount: messages.length, updatedAt: now } : item);
    writeGroupSessionManifest(groupId, { ...manifest, sessions });
  }
}

export function runGroupChatSessionsSelfTest() {
  const groupId = `group-chat-sessions-selftest-${process.pid}-${Date.now().toString(36)}`;
  const groupDir = path.dirname(getGroupSessionManifestFile(groupId));
  const legacyFile = getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID);
  const lifecycleFiles: string[] = [];
  try {
    const first = createGroupChatSession(groupId, "会话 A");
    lifecycleFiles.push(getGroupSessionLifecycleHeadFile(groupId, first.id));
    const firstCreatedLifecycle = readGroupSessionLifecycleHead(groupId, first.id);
    appendGroupMessage(groupId, { id: "session-a-message", role: "user", content: "SESSION_A_SENTINEL", group_session_id: first.id });
    const second = createGroupChatSession(groupId, "会话 B");
    lifecycleFiles.push(getGroupSessionLifecycleHeadFile(groupId, second.id));
    appendGroupMessage(groupId, { id: "session-b-message", role: "user", content: "SESSION_B_SENTINEL", group_session_id: second.id });
    const syntheticTasks = [
      { id: "late-task", group_id: groupId, group_session_id: first.id, status: "in_progress" },
      { id: "legacy-task", group_id: groupId, status: "in_progress" },
      { id: "done-task", group_id: groupId, group_session_id: first.id, status: "done" },
    ];
    const lateReceiptSession = resolveGroupMessageSessionId(groupId, { task_id: "late-task" }, syntheticTasks);
    const legacyReceiptSession = resolveGroupMessageSessionId(groupId, { task_id: "legacy-task" }, syntheticTasks);
    const activeTaskRows = findActiveGroupSessionTasks(groupId, first.id, syntheticTasks);
    const firstMessages = getGroupMessages(groupId, first.id);
    const secondMessages = getGroupMessages(groupId, second.id);
    selectGroupChatSession(groupId, first.id);
    const activeMessages = getGroupMessages(groupId);
    const renamed = renameGroupChatSession(groupId, first.id, "会话 A 已重命名");
    archiveGroupChatSession(groupId, first.id, true);
    const firstArchivedLifecycle = readGroupSessionLifecycleHead(groupId, first.id);
    const activeAfterArchive = getActiveGroupChatSessionId(groupId);
    const retention = pruneArchivedGroupChatSessions(groupId, { dryRun: true, retentionDays: 30, now: new Date(Date.now() + 31 * 86_400_000).toISOString() });
    archiveGroupChatSession(groupId, first.id, false);
    const firstRestoredLifecycle = readGroupSessionLifecycleHead(groupId, first.id);
    const deleted = deleteGroupChatSession(groupId, second.id);
    const secondDeletedLifecycle = readGroupSessionLifecycleHead(groupId, second.id);
    const manifest = listGroupChatSessions(groupId);
    const checks = {
      createsIndependentSessionIds: first.id !== second.id,
      firstSessionContainsOnlyFirstSentinel: JSON.stringify(firstMessages).includes("SESSION_A_SENTINEL") && !JSON.stringify(firstMessages).includes("SESSION_B_SENTINEL"),
      secondSessionContainsOnlySecondSentinel: JSON.stringify(secondMessages).includes("SESSION_B_SENTINEL") && !JSON.stringify(secondMessages).includes("SESSION_A_SENTINEL"),
      switchingRestoresSelectedSession: getActiveGroupChatSessionId(groupId) === first.id && JSON.stringify(activeMessages).includes("SESSION_A_SENTINEL"),
      messagesCarrySessionIdentity: firstMessages[0]?.group_session_id === first.id && secondMessages[0]?.group_session_id === second.id,
      lateReceiptStaysWithTaskSession: lateReceiptSession === first.id && lateReceiptSession !== second.id,
      legacyTaskNeverFallsIntoActiveSession: legacyReceiptSession === GROUP_DEFAULT_SESSION_ID,
      deleteGuardCountsOnlyActiveTasks: activeTaskRows.length === 1 && activeTaskRows[0].id === "late-task",
      renamePersists: renamed.title === "会话 A 已重命名" && manifest.sessions.find((item: any) => item.id === first.id)?.title === "会话 A 已重命名",
      archiveSwitchesActiveSession: activeAfterArchive === second.id,
      retentionFindsExpiredArchive: retention.candidates.some((item: any) => item.id === first.id),
      deleteRemovesOnlyTargetSession: deleted.session.id === second.id
        && manifest.sessions.some((item: any) => item.id === first.id)
        && !manifest.sessions.some((item: any) => item.id === second.id)
        && !fs.existsSync(getGroupSessionMessagesFile(groupId, second.id)),
      lifecycleGenerationTracksArchiveRestore: firstCreatedLifecycle?.status === "active"
        && firstCreatedLifecycle?.generation === 1
        && firstArchivedLifecycle?.status === "archived"
        && firstArchivedLifecycle?.generation === 2
        && firstRestoredLifecycle?.status === "active"
        && firstRestoredLifecycle?.generation === 3,
      deletionLeavesDurableTombstone: secondDeletedLifecycle?.status === "deleted"
        && secondDeletedLifecycle?.generation === 2
        && deleted.lifecycleTombstone?.head?.head_checksum === secondDeletedLifecycle?.head_checksum,
    };
    return { pass: Object.values(checks).every(Boolean), checks, first, second, manifest };
  } finally {
    try {
      if (fs.existsSync(groupDir)) {
        for (const name of fs.readdirSync(groupDir)) {
          const file = path.join(groupDir, name);
          if (fs.statSync(file).isFile()) fs.unlinkSync(file);
        }
        fs.rmdirSync(groupDir);
      }
    } catch {}
    try { if (fs.existsSync(legacyFile)) fs.unlinkSync(legacyFile); } catch {}
    try { if (fs.existsSync(`${legacyFile}.bak`)) fs.unlinkSync(`${legacyFile}.bak`); } catch {}
    for (const file of lifecycleFiles.flatMap(item => [item, `${item}.bak`, `${item}.lock`])) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  }
}
