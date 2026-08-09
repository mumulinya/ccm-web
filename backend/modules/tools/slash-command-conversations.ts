import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, collectRequestBuffer, sendJson } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import {
  appendProjectSessionLocalCommandRecord,
  getSessionDetail,
  replaceProjectSessionConversation,
  writeProjectSessionConversationBranch,
} from "../projects/sessions";
import {
  createGroupChatSession,
  getGroupMessages,
  saveGroupMessages,
  selectGroupChatSession,
} from "../collaboration/storage";
import { rotateGroupSessionLifecycleHead } from "../collaboration/group-session-lifecycle-head";
import { readGroupSessionLifecycleHead } from "../collaboration/group-session-lifecycle-head";
import { getProjectSessionAgentBinding } from "../projects/project-session-agent-binding";
import { requestGroupSessionAgentCancellation } from "../../agents/execution-kernel";

type Scope = "global" | "project" | "group";

const STATE_FILE = path.join(CCM_DIR, "slash-command-conversation-state.json");
const GLOBAL_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const REWIND_DIR = path.join(CCM_DIR, "conversation-rewind-snapshots");
const BLOCKED_DETAIL_KEY = /(?:prompt|secret|password|token|api[_-]?key|raw(?:output|result|body)|hidden[_-]?thinking|native[_-]?session|content|text|body)/i;

function now() { return new Date().toISOString(); }
function checksum(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function normalizeScope(value: any): Scope { return value === "project" || value === "group" ? value : "global"; }
function safeId(value: any, label: string) {
  const id = String(value || "").trim();
  if (!id || !/^[\p{L}\p{N}._:-]{1,180}$/u.test(id)) throw new Error(`缺少或无效的${label}`);
  return id;
}
function identity(input: any) {
  const scope = normalizeScope(input.scope);
  const sessionId = safeId(input.exactSessionId || input.exact_session_id || input.sessionId || input.session_id, "会话 ID");
  const scopeId = scope === "global" ? "global" : safeId(input.scopeId || input.scope_id || input.project || input.groupId || input.group_id, "作用域 ID");
  return { scope, scopeId, sessionId, key: `${scope}:${scopeId}:${sessionId}` };
}

function readState() {
  return readJsonWithBackup(STATE_FILE, { schema: "ccm-slash-command-conversation-state-v1", revision: 0, sessions: {}, records: [] });
}
function mutateState<T>(operation: (state: any) => T): T {
  return withFileLock(STATE_FILE, () => {
    const state: any = readState();
    state.sessions = state.sessions && typeof state.sessions === "object" ? state.sessions : {};
    state.records = Array.isArray(state.records) ? state.records : [];
    const result = operation(state);
    state.revision = Number(state.revision || 0) + 1;
    state.updatedAt = now();
    state.records = state.records.slice(-2000);
    writeJsonAtomic(STATE_FILE, state);
    return result;
  });
}

function cleanAttachment(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    id: String(value.id || value.file_id || ""),
    name: String(value.name || value.filename || "").slice(0, 240),
    type: String(value.type || value.mime || value.mimeType || "").slice(0, 120),
    size: Math.max(0, Number(value.size || 0)),
    checksum: String(value.checksum || "").slice(0, 128),
  };
}
function cloneVisibleMessage(message: any) {
  if (!message || !["user", "assistant"].includes(String(message.role || ""))) return null;
  if (message.hidden_execution === true || message.modelVisible === false || message.model_visible === false) return null;
  if (["tool_use", "tool_result", "local_command", "command_result"].includes(String(message.type || ""))) return null;
  const content = String(message.content || message.text || "").slice(0, 80_000);
  if (!content.trim()) return null;
  const files = (Array.isArray(message.files) ? message.files : Array.isArray(message.attachments) ? message.attachments : []).map(cleanAttachment).filter(Boolean);
  return {
    id: String(message.id || message.message_id || `msg_${crypto.randomUUID()}`),
    role: String(message.role),
    content,
    timestamp: String(message.timestamp || message.created_at || now()),
    ...(files.length ? { files } : {}),
    ...(message.sourceRefs || message.source_refs ? { sourceRefs: message.sourceRefs || message.source_refs } : {}),
  };
}
function cloneVisibleMessages(messages: any[]) { return (messages || []).map(cloneVisibleMessage).filter(Boolean); }
function messageId(message: any, index: number) { return String(message?.id || message?.message_id || message?.uuid || `index:${index}`); }
function anchorIndex(messages: any[], requested: any) {
  if (!messages.length) return -1;
  const target = String(requested || "").trim();
  if (!target) return messages.length - 1;
  const found = messages.findIndex((message, index) => messageId(message, index) === target);
  if (found < 0) throw new Error("锚点消息不存在或已漂移");
  return found;
}

function loadGlobalStore() { return readJsonWithBackup(GLOBAL_HISTORY_FILE, { current_session_id: "", sessions: [] }); }
function writeGlobalStore(store: any) { writeJsonAtomic(GLOBAL_HISTORY_FILE, store); }

function readConversation(input: any) {
  const id = identity(input);
  if (id.scope === "global") {
    const store: any = loadGlobalStore();
    const session = (store.sessions || []).find((item: any) => String(item.id) === id.sessionId);
    if (!session) throw new Error("全局会话不存在");
    return { id, title: String(session.name || "全局 Agent 会话"), messages: Array.isArray(session.messages) ? session.messages : [], raw: session };
  }
  if (id.scope === "project") {
    const detail: any = getSessionDetail(id.scopeId, id.sessionId);
    if (!detail) throw new Error("项目会话不存在");
    return { id, title: String(detail.name || "项目会话"), messages: Array.isArray(detail.history) ? detail.history : [], raw: detail };
  }
  const messages = getGroupMessages(id.scopeId, id.sessionId);
  return { id, title: "群聊会话", messages, raw: null };
}

function currentBoundary(input: any) {
  const conversation = readConversation(input);
  const state: any = readState();
  const sessionState = state.sessions?.[conversation.id.key] || {};
  return {
    ...conversation,
    revision: Number(sessionState.revision || 0),
    generation: conversation.id.scope === "project"
      ? Number(getProjectSessionAgentBinding(conversation.id.scopeId, conversation.id.sessionId)?.generation || 0)
      : conversation.id.scope === "group"
        ? Number(readGroupSessionLifecycleHead(conversation.id.scopeId, conversation.id.sessionId)?.generation || 0)
        : Number(sessionState.generation || 0),
    conversationChecksum: checksum(conversation.messages),
  };
}

function assertExpected(boundary: any, input: any) {
  const expectedChecksum = String(input.conversationChecksum || input.conversation_checksum || "");
  const expectedRevision = input.revision;
  const expectedGeneration = input.generation;
  if (expectedChecksum && expectedChecksum !== boundary.conversationChecksum) throw new Error("会话内容已漂移，请重新预览");
  if (expectedRevision !== undefined && Number(expectedRevision) !== boundary.revision) throw new Error("会话 revision 已漂移，请重新预览");
  if (expectedGeneration !== undefined && Number(expectedGeneration) !== boundary.generation) throw new Error("会话 generation 已漂移，请重新预览");
}

function persistSessionState(id: ReturnType<typeof identity>, patch: any, expected: { revision?: number; generation?: number } = {}) {
  return mutateState(state => {
    const previous = state.sessions[id.key] || { revision: 0, generation: 0 };
    if (expected.revision !== undefined && Number(expected.revision) !== Number(previous.revision || 0)) throw new Error("会话命令状态 revision 已漂移，请重新读取");
    if (expected.generation !== undefined && Number(expected.generation) !== Number(previous.generation || 0)) throw new Error("会话命令状态 generation 已漂移，请重新读取");
    const next = { ...previous, ...patch, revision: Number(previous.revision || 0) + 1, updatedAt: now() };
    state.sessions[id.key] = next;
    return next;
  });
}

function branchConversation(input: any) {
  const boundary = currentBoundary(input);
  if (!input.anchorMessageId && !input.anchor_message_id) throw new Error("/branch 必须绑定锚点消息");
  if (!input.conversationChecksum && !input.conversation_checksum) throw new Error("/branch 必须提交会话 checksum");
  if (input.revision === undefined || input.generation === undefined) throw new Error("/branch 必须提交 revision 与 generation");
  assertExpected(boundary, input);
  const index = anchorIndex(boundary.messages, input.anchorMessageId || input.anchor_message_id);
  const messages = cloneVisibleMessages(boundary.messages.slice(0, index + 1));
  const title = String(input.title || `${boundary.title} · 分支`).trim().slice(0, 80);
  let created: any;
  if (boundary.id.scope === "global") {
    created = withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const session = { id: sessionId, name: title, titleOrigin: "manual", source: "web", createdAt: now(), updatedAt: now(), messages };
      store.sessions = [session, ...(store.sessions || [])];
      store.current_session_id = sessionId;
      writeGlobalStore(store);
      return { sessionId, session };
    });
  } else if (boundary.id.scope === "project") {
    created = writeProjectSessionConversationBranch(boundary.id.scopeId, title, messages);
  } else {
    const session = createGroupChatSession(boundary.id.scopeId, title);
    saveGroupMessages(boundary.id.scopeId, messages.map(message => ({ ...message, group_session_id: session.id })), session.id);
    selectGroupChatSession(boundary.id.scopeId, session.id);
    created = { sessionId: session.id, session };
  }
  const createdSessionId = String(created.sessionId || created.session?.id || "");
  const createdIdentity = identity({ scope: boundary.id.scope, scopeId: boundary.id.scopeId, exactSessionId: createdSessionId });
  persistSessionState(createdIdentity, { generation: 0, branchedFrom: boundary.id.sessionId, anchorMessageId: messageId(boundary.messages[index], index) });
  return {
    schema: "ccm-conversation-branch-receipt-v1",
    success: true,
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    sourceSessionId: boundary.id.sessionId,
    sessionId: createdSessionId,
    anchorMessageId: messageId(boundary.messages[index], index),
    copiedMessages: messages.length,
    generation: 0,
    contentStored: false,
  };
}

function rewindPreview(input: any) {
  const boundary = currentBoundary(input);
  assertExpected(boundary, input);
  const index = anchorIndex(boundary.messages, input.anchorMessageId || input.anchor_message_id);
  const anchorMessageId = messageId(boundary.messages[index], index);
  const plan = {
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    exactSessionId: boundary.id.sessionId,
    anchorMessageId,
    keepMessages: index + 1,
    removeMessages: boundary.messages.length - index - 1,
    generation: boundary.generation,
    revision: boundary.revision,
    conversationChecksum: boundary.conversationChecksum,
  };
  return { schema: "ccm-conversation-rewind-preview-v1", success: true, ...plan, planChecksum: checksum(plan), codeRestoreAvailable: false, contentStored: false };
}

function rewindApply(input: any) {
  const preview = rewindPreview(input);
  if (!input.planChecksum || String(input.planChecksum) !== preview.planChecksum) throw new Error("回退计划 checksum 不匹配，请重新预览");
  const boundary = currentBoundary(input);
  const index = anchorIndex(boundary.messages, preview.anchorMessageId);
  const kept = boundary.messages.slice(0, index + 1);
  fs.mkdirSync(REWIND_DIR, { recursive: true });
  const snapshotId = `rewind_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
  writeJsonAtomic(path.join(REWIND_DIR, `${snapshotId}.json`), {
    schema: "ccm-conversation-rewind-snapshot-v1",
    snapshotId,
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    exactSessionId: boundary.id.sessionId,
    createdAt: String(input.createdAt || input.created_at || now()),
    conversationChecksum: boundary.conversationChecksum,
    messages: boundary.messages,
  });
  let generation = boundary.generation + 1;
  if (boundary.id.scope === "global") {
    withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const session = (store.sessions || []).find((item: any) => String(item.id) === boundary.id.sessionId);
      if (!session || checksum(session.messages || []) !== boundary.conversationChecksum) throw new Error("全局会话已漂移，请重新预览");
      session.messages = kept;
      session.updatedAt = now();
      writeGlobalStore(store);
    });
  } else if (boundary.id.scope === "project") {
    const result = replaceProjectSessionConversation(boundary.id.scopeId, boundary.id.sessionId, kept, "用户通过 /rewind 回退会话");
    generation = Number(result.generation || generation);
  } else {
    requestGroupSessionAgentCancellation({ groupId: boundary.id.scopeId, groupSessionId: boundary.id.sessionId, reason: "用户通过 /rewind 回退会话", actor: "slash-command" });
    saveGroupMessages(boundary.id.scopeId, kept, boundary.id.sessionId);
    generation = Number(rotateGroupSessionLifecycleHead({ groupId: boundary.id.scopeId, groupSessionId: boundary.id.sessionId, reason: "用户通过 /rewind 回退会话" }).head?.generation || generation);
  }
  const state = persistSessionState(boundary.id, { generation, lastRewindSnapshotId: snapshotId, anchorMessageId: preview.anchorMessageId });
  return { schema: "ccm-conversation-rewind-receipt-v1", success: true, snapshotId, scope: boundary.id.scope, scopeId: boundary.id.scopeId, exactSessionId: boundary.id.sessionId, keptMessages: kept.length, removedMessages: preview.removeMessages, generation, revision: state.revision, contentStored: false };
}

function safeProjection(value: any, depth = 0): any {
  if (depth > 5) return "[truncated]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.replace(/\b(?:Bearer\s+)?(?:sk-)?[A-Za-z0-9_-]{24,}\b/g, "[redacted]").slice(0, 1200);
  if (Array.isArray(value)) return value.slice(0, 80).map(item => safeProjection(item, depth + 1));
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !BLOCKED_DETAIL_KEY.test(key)).slice(0, 100).map(([key, item]) => [key, safeProjection(item, depth + 1)]));
  return String(value).slice(0, 200);
}

function persistLocalCommandRecord(input: any) {
  const id = identity(input);
  const command = safeId(input.command, "命令名称");
  const summary = String(input.summary || "命令已执行").trim().slice(0, 1200);
  const record = {
    schema: "ccm-local-command-record-v1",
    id: `lcr_${crypto.randomUUID()}`,
    scope: id.scope,
    scopeId: id.scopeId,
    exactSessionId: id.sessionId,
    command,
    invocationChecksum: String(input.invocationChecksum || input.invocation_checksum || checksum({ command, args: input.args || "" })),
    status: ["failed", "cancelled"].includes(String(input.status)) ? String(input.status) : "success",
    summary,
    safeDetails: safeProjection(input.safeDetails || input.result || {}),
    modelVisible: false,
    contentStored: false,
    createdAt: now(),
  };
  const message = { id: record.id, role: "assistant", type: "command_result", content: summary, commandResult: safeProjection(input.result || { command, summary, headline: summary }), localCommandRecord: record, modelVisible: false, timestamp: record.createdAt };
  if (id.scope === "global") {
    withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const session = (store.sessions || []).find((item: any) => String(item.id) === id.sessionId);
      if (!session) throw new Error("全局会话不存在");
      session.messages = [...(session.messages || []), message];
      session.updatedAt = now();
      writeGlobalStore(store);
    });
  } else if (id.scope === "project") {
    appendProjectSessionLocalCommandRecord(id.scopeId, id.sessionId, message);
  } else {
    saveGroupMessages(id.scopeId, [...getGroupMessages(id.scopeId, id.sessionId), { ...message, group_session_id: id.sessionId }], id.sessionId);
  }
  mutateState(state => { state.records.push(record); return record; });
  return record;
}

function readSessionState(input: any) {
  const id = identity(input);
  const state: any = readState();
  const stored = state.sessions?.[id.key] || { revision: 0, generation: 0 };
  const generation = id.scope === "project"
    ? Number(getProjectSessionAgentBinding(id.scopeId, id.sessionId)?.generation || 0)
    : id.scope === "group"
      ? Number(readGroupSessionLifecycleHead(id.scopeId, id.sessionId)?.generation || 0)
      : Number(stored.generation || 0);
  return { id, state: { ...stored, generation } };
}

function updatePlanMode(input: any) {
  const { id, state } = readSessionState(input);
  if (input.revision === undefined || input.generation === undefined) throw new Error("Plan Mode 更新必须绑定 revision 与 generation");
  if (Number(input.generation) !== Number(state.generation || 0)) throw new Error("会话 generation 已漂移，请重新读取");
  const action = String(input.action || (input.enabled === false ? "exit" : "open")).toLowerCase();
  const enabled = !["exit", "off", "disable"].includes(action);
  const planMode = enabled ? {
    enabled: true,
    planId: String(state.planMode?.planId || `plan_${crypto.randomUUID()}`),
    description: String(input.description || input.goal || state.planMode?.description || "").slice(0, 4000),
    enteredAt: state.planMode?.enteredAt || now(),
    updatedAt: now(),
  } : { enabled: false, planId: String(state.planMode?.planId || ""), description: String(state.planMode?.description || ""), exitedAt: now(), updatedAt: now() };
  const next = persistSessionState(id, { planMode, generation: Number(state.generation || 0) }, { revision: Number(input.revision) });
  return { schema: "ccm-conversation-plan-mode-v1", scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(next.generation || 0), revision: Number(next.revision || 0), ...planMode };
}

function updatePreferences(input: any) {
  const { id, state } = readSessionState(input);
  if (input.revision === undefined || input.generation === undefined) throw new Error("会话偏好更新必须绑定 revision 与 generation");
  if (Number(input.generation) !== Number(state.generation || 0)) throw new Error("会话 generation 已漂移，请重新读取");
  const previous = state.preferences || {};
  const patch: any = {};
  if (input.model !== undefined) patch.model = String(input.model || "").slice(0, 200);
  if (input.effort !== undefined) {
    const effort = String(input.effort || "").toLowerCase();
    if (!["low", "medium", "high"].includes(effort)) throw new Error("effort 只支持 low、medium、high");
    patch.effort = effort;
  }
  if (input.fast !== undefined) {
    if (input.fast === true) throw new Error("当前 Provider 适配器尚未声明可核验的 Fast Mode 能力，本会话不会伪装为已启用");
    patch.fast = false;
  }
  if (input.outputStyle !== undefined || input.output_style !== undefined) {
    const outputStyle = String(input.outputStyle || input.output_style || "").toLowerCase();
    if (!["concise", "balanced", "detailed"].includes(outputStyle)) throw new Error("output-style 只支持 concise、balanced、detailed");
    patch.outputStyle = outputStyle;
  }
  const next = persistSessionState(id, { preferences: { ...previous, ...patch }, generation: Number(state.generation || 0) }, { revision: Number(input.revision) });
  return { schema: "ccm-conversation-preferences-v1", scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, preferences: next.preferences || {}, generation: Number(next.generation || 0), revision: Number(next.revision || 0) };
}

async function body(req: any) { return JSON.parse((await collectRequestBuffer(req)).toString("utf8") || "{}"); }

export function handleSlashCommandConversationApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/conversations/plan-mode" && req.method === "GET") {
    try { const { id, state } = readSessionState(parsed.query || {}); sendJson(res, { success: true, scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(state.generation || 0), revision: Number(state.revision || 0), planMode: state.planMode || { enabled: false } }); }
    catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    return true;
  }
  if (pathname === "/api/conversations/preferences" && req.method === "GET") {
    try { const { id, state } = readSessionState(parsed.query || {}); sendJson(res, { success: true, scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(state.generation || 0), revision: Number(state.revision || 0), preferences: state.preferences || {} }); }
    catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    return true;
  }
  const handlers: Record<string, (value: any) => any> = {
    "/api/conversations/branch": branchConversation,
    "/api/conversations/rewind/preview": rewindPreview,
    "/api/conversations/rewind/apply": rewindApply,
    "/api/conversations/plan-mode": updatePlanMode,
    "/api/conversations/preferences": updatePreferences,
    "/api/slash-commands/records": persistLocalCommandRecord,
  };
  const handler = handlers[pathname];
  if (!handler || !["POST", "PATCH"].includes(String(req.method))) return false;
  void body(req).then(value => sendJson(res, { success: true, result: handler(value) })).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error) }, 400));
  return true;
}

export function runSlashCommandConversationSelfTest() {
  const unsafe = safeProjection({ apiKey: "sentinel", count: 2, nested: { rawOutput: "secret", status: "ok" } });
  const checks = {
    stripsSecrets: unsafe.apiKey === undefined && unsafe.nested.rawOutput === undefined,
    keepsSafeFields: unsafe.count === 2 && unsafe.nested.status === "ok",
    visibleCloneDropsLocalCommands: cloneVisibleMessages([{ role: "assistant", content: "x", type: "command_result", modelVisible: false }]).length === 0,
    visibleCloneKeepsConversation: cloneVisibleMessages([{ id: "m1", role: "user", content: "hello" }])[0]?.content === "hello",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
