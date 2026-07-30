import * as fs from "fs";
import * as path from "path";
import { sendJson, CCM_DIR, SESSIONS_DIR } from "../../core/utils";
import { resolveContainedPath, validateProjectName, validateSessionId } from "./project-validation";
import { getConfigs } from "../../core/db";
import {
  generateSessionTitleWithModel,
  isMeaningfulSessionTitleInput,
  isSessionTitlePlaceholder,
} from "../../system/session-title";
import { purgeProjectChatRunsForSession } from "../../projects/chat-runs";
import { compactProjectSessionWithModel, scheduleProjectSessionMemoryExtraction } from "./project-session-compaction";
import {
  getProjectSessionAgentBinding,
  purgeProjectSessionAgentBinding,
  rotateProjectSessionAgentBinding,
} from "./project-session-agent-binding";
import { cancelProjectMainTasksForSession } from "./project-main-agent";
import { publishRuntimeEvent } from "../../system/runtime-events";
import { invalidateProviderNeutralContextCacheState } from "../../system/provider-neutral-context-cache";
import { buildFeishuConversationIdentityV2 } from "../collaboration/feishu-conversation-v2";
import { markConversationSearchIndexDirty } from "../../system/conversation-search-dirty";

export const WEB_SESSIONS_DIR = path.join(CCM_DIR, "web-sessions");

export function getProjectSessionDir(projectName: string): string {
  return resolveContainedPath(WEB_SESSIONS_DIR, validateProjectName(projectName));
}

export function getSessionFilePath(projectName: string, sessionId: string) {
  return resolveContainedPath(getProjectSessionDir(projectName), `${validateSessionId(sessionId)}.json`);
}

function requireActiveProject(projectName: string) {
  const project = validateProjectName(projectName);
  const config = getConfigs().find((item) => item.name === project);
  if (!config) throw new Error("项目不存在或已经归档");
  return { project, config };
}

function ensureWebSessionDir(projectName: string) {
  const dir = getProjectSessionDir(projectName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 查找 cc-connect 的 session 文件（带 hash 的）
export function findCcSessionFile(projectName: string) {
  const safeProjectName = validateProjectName(projectName);
  if (!fs.existsSync(SESSIONS_DIR)) return null;
  const escaped = safeProjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`^${escaped}(?:_[^/\\\\]+)?\\.json$`);
  const files = fs.readdirSync(SESSIONS_DIR).filter(f =>
    matcher.test(f) && !fs.statSync(resolveContainedPath(SESSIONS_DIR, f)).isDirectory()
  );
  const newest = files
    .map((file) => ({ file, mtime: fs.statSync(resolveContainedPath(SESSIONS_DIR, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime || a.file.localeCompare(b.file))[0];
  return newest ? resolveContainedPath(SESSIONS_DIR, newest.file) : null;
}

function isFeishuPlatformSessionKey(value: any) {
  return /^(?:feishu|lark):/i.test(String(value || "").trim());
}

function projectFeishuTargetsFromStore(store: any, projectName = "selftest-project") {
  const active = store?.active_session && typeof store.active_session === "object" ? store.active_session : {};
  const users = store?.user_sessions && typeof store.user_sessions === "object" ? store.user_sessions : {};
  const metadata = store?.user_meta && typeof store.user_meta === "object" ? store.user_meta : {};
  const keys = [...new Set([...Object.keys(active), ...Object.keys(users)].filter(isFeishuPlatformSessionKey))];
  return keys.map((platformKey) => {
    const parts = platformKey.split(":");
    const chatId = parts.find((part) => /^oc_/i.test(part)) || "";
    const openId = parts.find((part) => /^ou_/i.test(part)) || "";
    const rootIndex = parts.findIndex((part) => part === "root");
    const threadId = rootIndex >= 0 ? String(parts[rootIndex + 1] || "") : "";
    const meta = metadata[platformKey] || metadata[openId] || metadata[chatId] || {};
    const sessionIds = [...new Set([...(Array.isArray(users[platformKey]) ? users[platformKey] : []), active[platformKey]]
      .map((value) => String(value || "").trim()).filter(Boolean))];
    const baseLabel = String(meta.name || meta.display_name || meta.chat_name || meta.user_name || chatId || openId || "飞书会话");
    let identity: any = null;
    try {
      identity = buildFeishuConversationIdentityV2({
        payload: { platform_session_key: platformKey, chat_id: chatId, open_id: openId, thread_id: threadId, root_id: threadId, project: projectName },
        targetType: "project_agent",
        projectId: projectName,
      });
    } catch {}
    return {
      id: platformKey,
      platform_session_key: platformKey,
      label: threadId ? `${baseLabel} · 话题 ${threadId.slice(-6)}` : baseLabel,
      chat_id: chatId,
      open_id: openId,
      thread_id: threadId,
      root_message_id: threadId,
      latest_message_id: threadId,
      active_session_id: String(active[platformKey] || ""),
      session_ids: sessionIds,
      target_type: "project_agent",
      project_id: projectName,
      conversation_key_v2: identity?.conversation_key_v2 || "",
      thread_scope: threadId || "main",
    };
  });
}

function loadProjectCcSessionStore(projectName: string) {
  const file = findCcSessionFile(projectName);
  if (!file || !fs.existsSync(file)) return { file: "", store: null, targets: [] as any[] };
  try {
    const store = JSON.parse(fs.readFileSync(file, "utf-8"));
    return { file, store, targets: projectFeishuTargetsFromStore(store, projectName) };
  } catch {
    return { file, store: null, targets: [] as any[] };
  }
}

function projectSessionSource(sessionId: string, session: any, targets: any[]) {
  const explicit = String(session?.source || session?.channel || "").toLowerCase();
  if (explicit === "feishu") return "feishu";
  if (explicit === "web") return "web";
  if (targets.some((target: any) => target.session_ids.includes(sessionId))) return "feishu";
  return "web";
}

export function getProjectFeishuSessionTargets(projectName: string) {
  const project = requireActiveProject(projectName).project;
  const { targets } = loadProjectCcSessionStore(project);
  return targets.sort((a: any, b: any) => String(a.label || "").localeCompare(String(b.label || "")));
}

function resolveProjectFeishuTargetFromStore(store: any, targets: any[], acpSessionId: string) {
  const matchingSessionIds = Object.entries(store?.sessions || {})
    .filter(([, session]: any) => String(session?.agent_session_id || "") === acpSessionId)
    .map(([sessionId]) => String(sessionId));
  const exact = targets.filter((target: any) => matchingSessionIds.includes(String(target.active_session_id || "")));
  if (exact.length === 1) return { target: exact[0], resolution: "cc_connect_agent_session" };
  if (exact.length > 1) throw new Error("ACP 会话同时映射到多个飞书目标，已拒绝路由");
  const bound = targets.filter((target: any) => String(target.active_session_id || "").trim());
  throw new Error(bound.length ? "尚未建立 ACP 会话与飞书目标的精确映射，请重新绑定当前项目飞书会话" : "当前项目没有已绑定的飞书会话");
}

export function resolveProjectFeishuTargetForAcpSession(projectName: string, acpSessionId: string) {
  const project = requireActiveProject(projectName).project;
  const safeAcpSessionId = String(acpSessionId || "").trim();
  if (!safeAcpSessionId || safeAcpSessionId.length > 240) throw new Error("ACP 会话 ID 无效");
  const { store, targets } = loadProjectCcSessionStore(project);
  if (!store) throw new Error("项目 cc-connect 会话存储不存在");
  return resolveProjectFeishuTargetFromStore(store, targets, safeAcpSessionId);
}

export function runProjectFeishuSessionSourceSelfTest() {
  const groupKey = "feishu:oc_project:ou_owner";
  const threadKey = "feishu:oc_project:root:om_thread";
  const store = {
    sessions: { s2: { agent_session_id: "acp-project-s2" } },
    active_session: { [groupKey]: "s2" },
    user_sessions: { [groupKey]: ["s1", "s2"], [threadKey]: ["s3"] },
    user_meta: { [groupKey]: { chat_name: "项目协作群" }, [threadKey]: { chat_name: "需求线程" } },
  };
  const targets = projectFeishuTargetsFromStore(store, "project-selftest");
  const exactAcp = resolveProjectFeishuTargetFromStore(store, targets, "acp-project-s2");
  let missingExactMappingRejected = false;
  try { resolveProjectFeishuTargetFromStore({ ...store, sessions: {} }, targets, "acp-not-flushed"); } catch { missingExactMappingRejected = true; }
  let ambiguousMappingRejected = false;
  try {
    const ambiguousStore = { ...store, sessions: {}, active_session: { [groupKey]: "s2", [threadKey]: "s3" } };
    resolveProjectFeishuTargetFromStore(ambiguousStore, projectFeishuTargetsFromStore(ambiguousStore, "project-selftest"), "acp-unknown");
  } catch { ambiguousMappingRejected = true; }
  const checks = {
    extracts_only_project_store_targets: targets.length === 2,
    exposes_active_exact_session: targets.find((item: any) => item.id === groupKey)?.active_session_id === "s2",
    uses_real_chat_name: targets.find((item: any) => item.id === groupKey)?.label === "项目协作群",
    classifies_historical_feishu_session: projectSessionSource("s1", {}, targets) === "feishu",
    classifies_active_feishu_session: projectSessionSource("s2", {}, targets) === "feishu",
    leaves_unbound_web_session_web: projectSessionSource("s9", {}, targets) === "web",
    explicit_web_beats_historical_mapping: projectSessionSource("s1", { source: "web" }, targets) === "web",
    preserves_explicit_unbound_feishu_session: projectSessionSource("s8", { source: "feishu" }, targets) === "feishu",
    resolves_real_acp_session_to_exact_project_session: exactAcp.target?.active_session_id === "s2" && exactAcp.resolution === "cc_connect_agent_session",
    rejects_unproven_first_turn_fallback: missingExactMappingRejected,
    rejects_ambiguous_acp_target_mapping: ambiguousMappingRejected,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

// 从 cc-connect 单文件同步到文件夹格式
export function syncFromCcToFilesystem(projectName: string) {
  const ccFile = findCcSessionFile(projectName);
  if (!ccFile || !fs.existsSync(ccFile)) return;
  try {
    const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
    const targets = projectFeishuTargetsFromStore(data, projectName);
    const dir = ensureWebSessionDir(projectName);
    for (const [sid, session] of Object.entries(data.sessions || {})) {
      const rawSession = session as any;
      const sessionData = {
        ...rawSession,
        source: projectSessionSource(sid, rawSession, targets),
        feishu_platform_keys: targets.filter((target: any) => target.session_ids.includes(sid)).map((target: any) => target.id),
      };
      const filePath = getSessionFilePath(projectName, validateSessionId(sid));
      // 只更新有变化的
      const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : null;
      if (Array.isArray(existing?.execution_history)) {
        (sessionData as any).execution_history_version = Number(existing.execution_history_version || 1);
        (sessionData as any).execution_history = existing.execution_history;
      }
      const historyChanged = JSON.stringify(existing?.history || []) !== JSON.stringify(sessionData.history || []);
      const bindingsChanged = JSON.stringify(existing?.feishu_platform_keys || []) !== JSON.stringify(sessionData.feishu_platform_keys || []);
      if (!existing
        || existing.updated_at !== sessionData.updated_at
        || existing.source !== sessionData.source
        || existing.name !== sessionData.name
        || historyChanged
        || bindingsChanged) {
        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
      }
    }
    // 删除文件夹中已不存在的会话
    const ccSids = new Set(Object.keys(data.sessions || {}));
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
      const fid = f.replace(".json", "");
      if (!ccSids.has(fid)) fs.unlinkSync(resolveContainedPath(dir, f));
    }
  } catch {}
}

// 从文件夹格式同步回 cc-connect 单文件
export function syncToFilesystemToCc(projectName: string) {
  const ccFile = findCcSessionFile(projectName);
  if (!ccFile) return;
  try {
    const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
    ccData.sessions = ccData.sessions || {};
    const dir = getProjectSessionDir(projectName);
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
      const sid = f.replace(".json", "");
      const sessionData = JSON.parse(fs.readFileSync(resolveContainedPath(dir, f), "utf-8"));
      const { execution_history, executionHistory, execution_history_version, ...sharedSessionData } = sessionData;
      ccData.sessions[sid] = sharedSessionData;
    }
    // 更新 counter
    const maxNum = Math.max(0, ...Object.keys(ccData.sessions).map(s => parseInt(s.replace("s", "")) || 0));
    ccData.counter = maxNum + 1;
    fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
  } catch {}
}

// 双向同步
export function syncSessions(projectName: string) {
  syncFromCcToFilesystem(projectName);
}

// 获取会话列表（从文件夹读取）
export function getSessions(projectName: string) {
  syncSessions(projectName);
  const targets = getProjectFeishuSessionTargets(projectName);
  const dir = getProjectSessionDir(projectName);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(resolveContainedPath(dir, f), "utf-8"));
        const id = data.id || f.replace(".json", "");
        const source = projectSessionSource(id, data, targets);
        return {
          id,
          name: data.name || data.id || f.replace(".json", ""),
          agent_type: data.agent_type || "claudecode",
          message_count: (data.history || []).length,
          last_message: (data.history || []).slice(-1)[0]?.content?.substring(0, 100) || "",
          created_at: data.created_at,
          updated_at: data.updated_at,
          source,
          feishu_bindings: targets.filter((target: any) => target.active_session_id === id),
        };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
}

// 获取会话详情
export function getSessionDetail(projectName: string, sessionId: string) {
  syncFromCcToFilesystem(projectName);
  const targets = getProjectFeishuSessionTargets(projectName);
  const filePath = getSessionFilePath(projectName, sessionId);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const { execution_history, executionHistory, execution_history_version, ...publicData } = data;
      return {
        ...publicData,
        source: projectSessionSource(sessionId, data, targets),
        feishu_bindings: targets.filter((target: any) => target.active_session_id === sessionId),
        agent_binding: getProjectSessionAgentBinding(projectName, sessionId),
      };
    } catch {}
  }
  // fallback: 从 cc-connect 文件读取
  const ccFile = findCcSessionFile(projectName);
  if (ccFile) {
    try {
      const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
      const session = data.sessions[sessionId] || null;
      return session ? {
        ...session,
        source: projectSessionSource(sessionId, session, targets),
        feishu_bindings: targets.filter((target: any) => target.active_session_id === sessionId),
        agent_binding: getProjectSessionAgentBinding(projectName, sessionId),
      } : null;
    } catch {}
  }
  return null;
}

function normalizeWebSessionMessage(message: any) {
  const input = message && typeof message === "object" ? message : {};
  const safe: any = {
    id: String(input.id || input.message_id || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`),
    role: input.role,
    content: String(input.content || ""),
    agent: input.agent || null,
    timestamp: input.timestamp || new Date().toISOString(),
  };
  for (const key of [
    "requestText",
    "messageMode",
    "message_mode",
    "task_id",
    "run_id",
    "taskExperience",
    "fileChanges",
    "workEvents",
    "projectRun",
    "agenticRun",
    "managementReceipt",
    "provider_usage",
    "source",
    "type",
  ]) {
    if (Object.prototype.hasOwnProperty.call(input, key)) safe[key] = input[key];
  }
  return safe;
}

function messageMatchesDeleteSelector(message: any, selector: any, index: number) {
  if (!message || !selector) return false;
  const id = String(selector.id || selector.message_id || "").trim();
  const taskId = String(selector.task_id || selector.taskId || "").trim();
  const timestamp = String(selector.timestamp || "").trim();
  if (id && String(message.id || message.message_id || "") === id) return true;
  if (taskId && String(message.task_id || message.taskExperience?.task_id || message.run_id || "") === taskId) return true;
  if (timestamp && String(message.timestamp || "") === timestamp) return true;
  if (Number.isInteger(selector.index) && selector.index === index) return true;
  return false;
}

function getNextSessionId(projectName: string) {
  const dir = getProjectSessionDir(projectName);
  const nums: number[] = [];
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).filter(f => f.endsWith(".json")).forEach(f => nums.push(parseInt(f.replace("s","").replace(".json","")) || 0));
  }
  const ccFile = findCcSessionFile(projectName);
  if (ccFile) {
    try {
      const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
      Object.keys(data.sessions || {}).forEach(s => nums.push(parseInt(s.replace("s","")) || 0));
      Object.values(data.active_session || {}).forEach((s: any) => nums.push(parseInt(String(s).replace("s", "")) || 0));
      Object.values(data.user_sessions || {}).flatMap((values: any) => Array.isArray(values) ? values : [])
        .forEach((s: any) => nums.push(parseInt(String(s).replace("s", "")) || 0));
    } catch {}
  }
  return `s${nums.length > 0 ? Math.max(...nums) + 1 : 1}`;
}

const projectSessionTitleJobs = new Map<string, Promise<any>>();

export function createProjectSessionRecord(projectName: string, name = "", source = "web") {
  const safeProject = requireActiveProject(projectName).project;
  ensureWebSessionDir(safeProject);
  const sessionId = getNextSessionId(safeProject);
  const now = new Date().toISOString();
  const normalizedSource = String(source || "web").toLowerCase() === "feishu" ? "feishu" : "web";
  const placeholderName = normalizedSource === "feishu" ? "新建飞书会话" : "新会话";
  const sessionName = String(name || placeholderName).trim() || placeholderName;
  const sessionData = {
    id: sessionId,
    name: sessionName,
    title_origin: isSessionTitlePlaceholder(sessionName) ? "placeholder" : "manual",
    agent_type: "claudecode",
    history: [],
    created_at: now,
    updated_at: now,
    source: normalizedSource,
  };
  fs.writeFileSync(getSessionFilePath(safeProject, sessionId), JSON.stringify(sessionData, null, 2));
  markConversationSearchIndexDirty(`project:${safeProject}:${sessionId}`);
  syncToFilesystemToCc(safeProject);
  return { project: safeProject, sessionId, name: sessionName, created: true };
}

export function bindProjectFeishuSession(projectName: string, sessionId: string, targetId: string, action: "bind" | "unbind" = "bind") {
  const project = requireActiveProject(projectName).project;
  const safeSessionId = validateSessionId(sessionId);
  const filePath = getSessionFilePath(project, safeSessionId);
  if (!fs.existsSync(filePath)) throw new Error("项目会话不存在");
  const { file, store, targets } = loadProjectCcSessionStore(project);
  if (!file || !store) throw new Error("项目尚未创建 cc-connect 会话存储，请先连接 Agent/飞书通道");
  const target = targets.find((item: any) => item.id === String(targetId || ""));
  if (!target) throw new Error("飞书目标不属于当前项目或尚未被发现");
  const session = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const source = projectSessionSource(safeSessionId, session, targets);
  if (action === "bind" && source !== "feishu") throw new Error("只能将飞书目标绑定到飞书会话");
  store.active_session = store.active_session || {};
  store.user_sessions = store.user_sessions || {};
  if (action === "unbind") {
    if (String(store.active_session[target.id] || "") === safeSessionId) delete store.active_session[target.id];
  } else {
    store.active_session[target.id] = safeSessionId;
    store.user_sessions[target.id] = [...new Set([...(Array.isArray(store.user_sessions[target.id]) ? store.user_sessions[target.id] : []), safeSessionId])];
    session.source = "feishu";
    session.feishu_platform_keys = [...new Set([...(session.feishu_platform_keys || []), target.id])];
    session.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    store.sessions = store.sessions || {};
    store.sessions[safeSessionId] = session;
  }
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
  publishRuntimeEvent("project", "project.feishu_session_binding_changed", {
    project,
    sessionId: safeSessionId,
    id: target.id,
    status: action === "unbind" ? "unbound" : "bound",
    source: "project-feishu-session-binding",
  });
  return {
    project,
    session_id: safeSessionId,
    action,
    target: getProjectFeishuSessionTargets(project).find((item: any) => item.id === target.id) || null,
  };
}

export function ensureProjectAutomationSession(projectName: string, requestedSessionId = "", title = "自动开发任务") {
  const safeProject = requireActiveProject(projectName).project;
  const sessionId = String(requestedSessionId || "").trim();
  if (!sessionId) return createProjectSessionRecord(safeProject, title);
  const safeSessionId = validateSessionId(sessionId);
  const existing = getSessionDetail(safeProject, safeSessionId);
  if (!existing) throw new Error("指定的项目会话不存在");
  return { project: safeProject, sessionId: safeSessionId, name: existing.name || safeSessionId, created: false };
}

export function appendProjectSessionTaskMessage(projectName: string, sessionId: string, message: any) {
  const safeProject = requireActiveProject(projectName).project;
  const safeSessionId = validateSessionId(sessionId);
  const filePath = getSessionFilePath(safeProject, safeSessionId);
  if (!fs.existsSync(filePath)) throw new Error("项目会话不存在");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const normalized = normalizeWebSessionMessage(message);
  data.history = Array.isArray(data.history) ? data.history : [];
  if (!data.history.some((item: any) => String(item.id || "") === normalized.id)) data.history.push(normalized);
  data.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  markConversationSearchIndexDirty(`project:${safeProject}:${safeSessionId}`);
  syncToFilesystemToCc(safeProject);
  if (normalized.role === "assistant" && String(normalized.content || "").trim()) {
    void scheduleProjectSessionAutoTitle(safeProject, safeSessionId).catch((error: any) => {
      console.warn(`[项目会话] 自动命名失败 (${safeProject}/${safeSessionId})：${error?.message || error}`);
    });
  }
  return normalized;
}

export function upsertProjectSessionTaskMessage(projectName: string, sessionId: string, message: any) {
  const safeProject = requireActiveProject(projectName).project;
  const safeSessionId = validateSessionId(sessionId);
  const filePath = getSessionFilePath(safeProject, safeSessionId);
  if (!fs.existsSync(filePath)) throw new Error("项目会话不存在");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const normalized = normalizeWebSessionMessage(message);
  const taskId = String(normalized.task_id || normalized.taskExperience?.task_id || "").trim();
  data.history = Array.isArray(data.history) ? data.history : [];
  const existingIndex = data.history.findIndex((item: any) => {
    if (String(item?.id || "") === normalized.id) return true;
    if (!taskId) return false;
    return item?.role === "assistant"
      && String(item?.task_id || item?.taskExperience?.task_id || "") === taskId;
  });
  if (existingIndex >= 0) {
    const existing = data.history[existingIndex] || {};
    data.history[existingIndex] = {
      ...existing,
      ...normalized,
      id: String(existing.id || normalized.id),
      timestamp: existing.timestamp || normalized.timestamp,
    };
  } else {
    data.history.push(normalized);
  }
  data.updated_at = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  markConversationSearchIndexDirty(`project:${safeProject}:${safeSessionId}`);
  syncToFilesystemToCc(safeProject);
  publishRuntimeEvent("project", "project.session_messages_changed", {
    project: safeProject,
    sessionId: safeSessionId,
    taskId,
    messageId: existingIndex >= 0 ? String(data.history[existingIndex]?.id || normalized.id) : normalized.id,
    status: String(normalized.taskExperience?.status || normalized.taskExperience?.phase || "changed").slice(0, 40),
    source: "project-main-agent-session-projection",
  });
  return existingIndex >= 0 ? data.history[existingIndex] : normalized;
}

export function scheduleProjectSessionAutoTitle(project: string, sessionId: string, options: {
  modelCall?: (request: any) => Promise<any>;
  turn?: { userMessage?: string; assistantMessage?: string; attachmentNames?: string[] };
} = {}) {
  const safeProject = validateProjectName(project);
  const safeSessionId = validateSessionId(sessionId);
  const key = `${safeProject}::${safeSessionId}`;
  const existingJob = projectSessionTitleJobs.get(key);
  if (existingJob) return existingJob;
  const job = (async () => {
    const filePath = getSessionFilePath(safeProject, safeSessionId);
    if (!fs.existsSync(filePath)) return { renamed: false, reason: "session_missing" };
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!isSessionTitlePlaceholder(data.name, data.title_origin || data.titleOrigin)) return { renamed: false, reason: "title_already_set", name: data.name };
    const history = Array.isArray(data.history) ? data.history : [];
    const userIndex = history.findIndex((message: any) => message?.role === "user"
      && (isMeaningfulSessionTitleInput(message?.content) || (message?.files || message?.attachments || []).length));
    const persistedUserMessage = userIndex >= 0 ? history[userIndex] : null;
    const persistedAssistantMessage = userIndex >= 0
      ? history.slice(userIndex + 1).find((message: any) => message?.role === "assistant" && String(message?.content || "").trim())
      : null;
    const directUserMessage = String(options.turn?.userMessage || "").trim();
    const directAssistantMessage = String(options.turn?.assistantMessage || "").trim();
    const userMessage = persistedUserMessage || (
      isMeaningfulSessionTitleInput(directUserMessage) || (options.turn?.attachmentNames || []).length
        ? { content: directUserMessage, files: (options.turn?.attachmentNames || []).map(name => ({ name })) }
        : null
    );
    if (!userMessage) return { renamed: false, reason: "meaningful_user_message_missing", name: data.name };
    const assistantMessage = persistedAssistantMessage || (directAssistantMessage ? { content: directAssistantMessage } : null);
    if (!assistantMessage) return { renamed: false, reason: "assistant_reply_missing", name: data.name };
    const files = userMessage.files || userMessage.attachments || [];
    const generated = await generateSessionTitleWithModel({
      scope: "project",
      userMessage: String(userMessage.content || ""),
      assistantMessage: String(assistantMessage.content || ""),
      attachmentNames: files.map((file: any) => String(file?.name || file?.filename || "")).filter(Boolean),
    }, options);
    if (!generated.title) return { renamed: false, reason: "title_input_skipped", name: data.name, generated };
    const latest = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!isSessionTitlePlaceholder(latest.name, latest.title_origin || latest.titleOrigin)) return { renamed: false, reason: "title_changed_during_generation", name: latest.name };
    latest.name = generated.title;
    latest.title_origin = generated.source === "model" ? "model" : "fallback";
    latest.title_generated_at = new Date().toISOString();
    latest.updated_at = latest.title_generated_at;
    fs.writeFileSync(filePath, JSON.stringify(latest, null, 2));
    markConversationSearchIndexDirty(`project:${safeProject}:${safeSessionId}`);
    syncToFilesystemToCc(safeProject);
    publishRuntimeEvent("project", "project.session_title_changed", {
      project: safeProject,
      sessionId: safeSessionId,
      source: "project-session-auto-title",
    });
    return { renamed: true, name: latest.name, generated };
  })().finally(() => projectSessionTitleJobs.delete(key));
  projectSessionTitleJobs.set(key, job);
  return job;
}

// === Sessions API 路由分流 ===
export function handleSessionsApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/sessions/feishu-targets" && req.method === "GET") {
    try {
      const project = validateProjectName(parsed?.query?.project || "");
      const acpSessionId = String(parsed?.query?.acp_session_id || parsed?.query?.acpSessionId || "").trim();
      const resolved = acpSessionId ? resolveProjectFeishuTargetForAcpSession(project, acpSessionId) : null;
      sendJson(res, {
        success: true,
        project,
        targets: getProjectFeishuSessionTargets(project),
        resolved_target: resolved?.target || null,
        resolution: resolved?.resolution || "",
      });
    } catch (e: any) {
      sendJson(res, { success: false, error: e?.message || "读取项目飞书目标失败" }, 400);
    }
    return true;
  }

  if (pathname === "/api/sessions/feishu-bind" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const result = bindProjectFeishuSession(
          payload.project,
          payload.sessionId || payload.session_id,
          payload.targetId || payload.target_id,
          payload.action === "unbind" ? "unbind" : "bind",
        );
        sendJson(res, { success: true, ...result, targets: getProjectFeishuSessionTargets(payload.project) });
      } catch (e: any) {
        sendJson(res, { success: false, error: e?.message || "更新项目飞书会话绑定失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, name, source, binding_id } = JSON.parse(body);
        const created = createProjectSessionRecord(project, name, source);
        const binding = binding_id
          ? bindProjectFeishuSession(project, created.sessionId, binding_id, "bind")
          : null;
        sendJson(res, { success: true, sessionId: created.sessionId, name: created.name, source: String(source || "web") === "feishu" ? "feishu" : "web", binding });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId, message } = JSON.parse(body);
        if (!project || !sessionId || !message) return sendJson(res, { error: "缺少参数" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!data.history) data.history = [];
        const normalizedMessage = normalizeWebSessionMessage(message);
        const duplicate = normalizedMessage.id && data.history.some((item: any) => String(item?.id || "") === String(normalizedMessage.id));
        if (!duplicate) data.history.push(normalizedMessage);
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        if (normalizedMessage.role === "assistant") {
          scheduleProjectSessionMemoryExtraction(project, sessionId);
          void scheduleProjectSessionAutoTitle(project, sessionId).catch((error: any) => {
            console.warn(`[项目会话] 自动命名失败 (${project}/${sessionId})：${error?.message || error}`);
          });
        }
        sendJson(res, { success: true, count: data.history.length, name: data.name, duplicate });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/message/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { project, sessionId } = payload;
        if (!project || !sessionId) return sendJson(res, { error: "缺少参数" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const before = Array.isArray(data.history) ? data.history.length : 0;
        const removedIds = new Set((Array.isArray(data.history) ? data.history : [])
          .filter((message: any, index: number) => messageMatchesDeleteSelector(message, payload, index))
          .map((message: any) => String(message?.id || message?.message_id || ""))
          .filter(Boolean));
        data.history = (Array.isArray(data.history) ? data.history : []).filter((message: any, index: number) => !messageMatchesDeleteSelector(message, payload, index));
        const deleted = before - data.history.length;
        if (deleted > 0) cancelProjectMainTasksForSession(project, sessionId, "项目会话消息被删除，取消未完成的项目主 Agent 任务");
        const rotation = deleted > 0 ? rotateProjectSessionAgentBinding(project, sessionId, "项目会话消息删除，压缩边界失效") : null;
        if (deleted > 0) {
          delete data.compaction;
          data.execution_history = (Array.isArray(data.execution_history) ? data.execution_history : [])
            .filter((event: any) => !removedIds.has(String(event?.anchorMessageId || event?.anchor_message_id || "")));
        }
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        sendJson(res, { success: true, deleted, count: data.history.length, binding_generation: rotation?.nextGeneration || 0 });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/messages/replace" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const { project, sessionId } = payload;
        if (!project || !sessionId || !Array.isArray(payload.messages)) return sendJson(res, { error: "缺少参数" }, 400);
        if (payload.messages.length > 10000) return sendJson(res, { error: "单个会话消息数量不能超过 10000 条" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const before = Array.isArray(data.history) ? data.history.length : 0;
        cancelProjectMainTasksForSession(project, sessionId, "项目会话消息被替换，取消未完成的项目主 Agent 任务");
        data.history = payload.messages.map(normalizeWebSessionMessage);
        data.execution_history = [];
        const rotation = rotateProjectSessionAgentBinding(project, sessionId, "项目会话消息替换，压缩边界失效");
        delete data.compaction;
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        sendJson(res, { success: true, replaced: before, count: data.history.length, binding_generation: rotation.nextGeneration });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId } = JSON.parse(body || "{}");
        if (!project || !sessionId) return sendJson(res, { error: "缺少参数" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        const cleared = Array.isArray(data.history) ? data.history.length : 0;
        cancelProjectMainTasksForSession(project, sessionId, "用户清空项目会话，取消未完成的项目主 Agent 任务");
        const rotation = rotateProjectSessionAgentBinding(project, sessionId, "用户清空项目会话");
        data.history = [];
        data.execution_history = [];
        delete data.compaction;
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        syncToFilesystemToCc(project);
        sendJson(res, { success: true, cleared, binding_generation: rotation.nextGeneration, closed_agent_sessions: rotation.closed.length });
      } catch (e: any) { sendJson(res, { error: e.message }, 400); }
    });
    return true;
  }

  if (pathname === "/api/sessions/compact" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const project = validateProjectName(payload.project);
        const sessionId = validateSessionId(payload.sessionId || payload.session_id);
        const result = await compactProjectSessionWithModel(project, sessionId, {
          force: true,
          reason: "manual_slash_compact",
          customInstructions: String(payload.customInstructions || payload.custom_instructions || "").trim(),
        });
        sendJson(res, { success: true, project, session_id: sessionId, mode: "model_required", ...result });
      } catch (e: any) { sendJson(res, { success: false, error: e?.message || "项目会话压缩失败" }, 400); }
    });
    return true;
  }

  if (pathname === "/api/sessions/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId } = JSON.parse(body);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        cancelProjectMainTasksForSession(project, sessionId, "用户删除项目会话，取消未完成的项目主 Agent 任务");
        const bindingCleanup = purgeProjectSessionAgentBinding(project, sessionId);
        const runCleanup = purgeProjectChatRunsForSession(project, sessionId);
        fs.unlinkSync(filePath);
        let contextCacheCleanup: any = null;
        try {
          contextCacheCleanup = invalidateProviderNeutralContextCacheState({
            scope: "project",
            scopeId: project,
            sessionId,
          }, "project_session_deleted");
        } catch {}
        const ccFile = findCcSessionFile(project);
        if (ccFile) {
          try {
            const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            delete data.sessions[sessionId];
            for (const [k, v] of Object.entries(data.active_session || {})) {
              if (v === sessionId) delete data.active_session[k];
            }
            for (const [k, values] of Object.entries(data.user_sessions || {})) {
              if (!Array.isArray(values)) continue;
              data.user_sessions[k] = values.filter((value: any) => String(value) !== String(sessionId));
            }
            fs.writeFileSync(ccFile, JSON.stringify(data, null, 2));
          } catch {}
        }
        sendJson(res, {
          success: true,
          removed_agent_sessions: bindingCleanup.removed.length,
          removed_project_runs: runCleanup.removed.length,
          context_cache_invalidated: contextCacheCleanup?.success === true,
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/rename" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { project, sessionId, name } = JSON.parse(body);
        const safeName = String(name || "").trim();
        if (!safeName || safeName.length > 80) return sendJson(res, { error: "会话名称应为 1 到 80 个字符" }, 400);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        data.name = safeName;
        data.title_origin = "manual";
        data.updated_at = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        const ccFile = findCcSessionFile(project);
        if (ccFile) {
          try {
            const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            if (ccData.sessions[sessionId]) {
              ccData.sessions[sessionId].name = safeName;
              ccData.sessions[sessionId].title_origin = "manual";
              ccData.sessions[sessionId].updated_at = data.updated_at;
              fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
            }
          } catch {}
        }
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/sessions/auto-name" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { project, sessionId } = JSON.parse(body);
        requireActiveProject(project);
        const filePath = getSessionFilePath(project, sessionId);
        if (!fs.existsSync(filePath)) return sendJson(res, { error: "会话不存在" }, 404);
        const result = await scheduleProjectSessionAutoTitle(project, sessionId);
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        sendJson(res, { success: true, name: data.name, title_source: data.title_origin || "", renamed: result.renamed === true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  return false;
}
