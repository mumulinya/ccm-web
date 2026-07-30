import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { spawn, type ChildProcess } from "child_process";
import { loadTasks } from "../../core/db";
import { CCM_DIR } from "../../core/utils";
import { getObservabilityDatabase, withImmediateObservabilityTransaction } from "../../system/observability-database";
import {
  clearConversationSearchIndexDirty,
  conversationSearchDirtyState,
  markConversationSearchIndexDirty,
} from "../../system/conversation-search-dirty";
import { getGroupMessages, listGroupChatSessions, loadGroups } from "../collaboration/storage";
import { loadMusicAgentMemory, MUSIC_AGENT_SINGLETON_ID } from "../music/memory";

export const CONVERSATION_SEARCH_SCHEMA = "ccm-conversation-search-v3";
const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const WEB_SESSIONS_DIR = path.join(CCM_DIR, "web-sessions");
export { markConversationSearchIndexDirty } from "../../system/conversation-search-dirty";

export type ConversationTypeV3 = "project" | "group" | "global" | "music";

export type ConversationSearchRecordV3 = {
  rowId: string;
  conversationType: ConversationTypeV3;
  source: string;
  sourceLabel: string;
  project: string;
  groupId: string;
  groupName: string;
  sessionId: string;
  sessionName: string;
  messageId: string;
  messageIndex: number;
  role: string;
  agent: string;
  content: string;
  timestamp: string;
  taskId: string;
  taskTitle: string;
  attachments: any[];
  sourceIdentity: string;
  sourceChecksum: string;
};

type SourceRow = {
  sourceIdentity: string;
  scopeType: ConversationTypeV3;
  scopeId: string;
  sessionId: string;
  sourceChecksum: string;
  status: "ready" | "degraded";
  errorSummary: string;
  records: ConversationSearchRecordV3[];
};

let buildProcess: ChildProcess | null = null;
let scheduler: NodeJS.Timeout | null = null;

function sha(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function stableId(prefix: string, value: any) {
  return `${prefix}_${sha(value).slice(0, 24)}`;
}

function validIso(value: any, fallback = "") {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function messageSource(message: any, fallback: string) {
  const raw = String(message?.source_channel || message?.sourceChannel || message?.channel || message?.source || message?.origin || message?.metadata?.source || "").toLowerCase();
  return raw.includes("feishu") ? "feishu" : fallback;
}

function sourceLabel(source: string, conversationType: ConversationTypeV3) {
  if (source === "feishu") return "飞书会话";
  if (conversationType === "global") return "全局助手";
  if (conversationType === "group") return "群聊协作";
  if (conversationType === "music") return "音乐助手";
  return "项目会话";
}

function normalizeAttachments(message: any) {
  const values = [message?.attachments, message?.files, message?.source_attachments].flatMap(value => Array.isArray(value) ? value : []);
  const seen = new Set<string>();
  return values.flatMap((item: any) => {
    const raw = typeof item === "string" ? item : item?.name || item?.filename || item?.path || item?.url;
    const name = path.basename(String(raw || "")).slice(0, 220).trim();
    if (!name || seen.has(name)) return [];
    seen.add(name);
    return [{ name, type: String(item?.type || item?.mime_type || item?.mimeType || "").slice(0, 100), size: Math.max(0, Number(item?.size || 0) || 0) }];
  }).slice(0, 24);
}

function normalizeMessageRecord(input: any, message: any, index: number, tasks: Map<string, any>, sourceChecksum: string): ConversationSearchRecordV3 | null {
  const content = typeof message?.content === "string" ? message.content : message?.content == null ? "" : JSON.stringify(message.content);
  if (!content.trim()) return null;
  const conversationType = input.conversationType as ConversationTypeV3;
  const source = messageSource(message, conversationType);
  const taskId = String(message?.task_id || message?.taskId || message?.metadata?.task_id || "");
  const messageId = String(message?.id || message?.message_id || message?.messageId || "");
  const rowId = stableId("csm", `${conversationType}|${input.project || ""}|${input.groupId || ""}|${input.sessionId}|${messageId || index}`);
  return {
    rowId,
    conversationType,
    source,
    sourceLabel: sourceLabel(source, conversationType),
    project: String(input.project || ""),
    groupId: String(input.groupId || ""),
    groupName: String(input.groupName || ""),
    sessionId: String(input.sessionId || ""),
    sessionName: String(input.sessionName || input.sessionId || "会话"),
    messageId,
    messageIndex: index,
    role: String(message?.role || "unknown"),
    agent: String(message?.agent || message?.agent_name || message?.project || (conversationType === "music" && message?.role !== "user" ? "音乐助手" : "")).slice(0, 120),
    content,
    timestamp: validIso(message?.timestamp || message?.created_at || message?.createdAt, input.updatedAt || ""),
    taskId,
    taskTitle: String(tasks.get(taskId)?.title || "").slice(0, 180),
    attachments: normalizeAttachments(message),
    sourceIdentity: String(input.sourceIdentity),
    sourceChecksum,
  };
}

function sourceRow(input: any, messages: any[], tasks: Map<string, any>): SourceRow {
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const sourceChecksum = sha(normalizedMessages.map((message: any, index: number) => ({
    id: message?.id || message?.message_id || message?.messageId || index,
    role: message?.role || "",
    content: message?.content || "",
    timestamp: message?.timestamp || message?.created_at || message?.createdAt || "",
    task_id: message?.task_id || message?.taskId || "",
    attachments: normalizeAttachments(message),
  })));
  return {
    sourceIdentity: input.sourceIdentity,
    scopeType: input.conversationType,
    scopeId: String(input.project || input.groupId || input.sessionId || MUSIC_AGENT_SINGLETON_ID),
    sessionId: String(input.sessionId),
    sourceChecksum,
    status: "ready",
    errorSummary: "",
    records: normalizedMessages.map((message: any, index: number) => normalizeMessageRecord(input, message, index, tasks, sourceChecksum)).filter(Boolean),
  };
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function generatedWelcomeSignature(session: any) {
  const messages = Array.isArray(session?.messages) ? session.messages : Array.isArray(session?.history) ? session.history : [];
  const message = messages[0];
  return messages.length === 1
    && String(session?.name || "") === "默认会话"
    && String(message?.role || "") === "assistant"
    && !String(message?.id || message?.message_id || message?.messageId || "")
    && String(message?.content || "").trim().startsWith("你好！我是您的全局助手")
    ? `${session.name}\u0001${String(message.content || "").trim()}`
    : "";
}

export function collapseGeneratedGlobalWelcomeSessions(sessions: any[]) {
  const rows = Array.isArray(sessions) ? sessions : [];
  const latest = new Map<string, { index: number; time: number }>();
  rows.forEach((session, index) => {
    const signature = generatedWelcomeSignature(session);
    if (!signature) return;
    const messages = Array.isArray(session.messages) ? session.messages : session.history || [];
    const time = Date.parse(String(messages[0]?.timestamp || session.updatedAt || session.updated_at || "")) || index;
    const previous = latest.get(signature);
    if (!previous || time > previous.time) latest.set(signature, { index, time });
  });
  const keep = new Set([...latest.values()].map(item => item.index));
  return rows.filter((session, index) => !generatedWelcomeSignature(session) || keep.has(index));
}

export function collectConversationSearchSources(): SourceRow[] {
  const tasks = new Map(loadTasks().map((task: any) => [String(task.id || ""), task]));
  const sources: SourceRow[] = [];

  if (fs.existsSync(WEB_SESSIONS_DIR)) {
    const rootReal = fs.realpathSync(WEB_SESSIONS_DIR);
    for (const project of fs.readdirSync(WEB_SESSIONS_DIR)) {
      const projectDir = path.join(WEB_SESSIONS_DIR, project);
      try {
        const stat = fs.lstatSync(projectDir);
        if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
        const real = fs.realpathSync(projectDir);
        if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) continue;
      } catch { continue; }
      for (const file of fs.readdirSync(projectDir).filter(name => name.endsWith(".json"))) {
        const full = path.join(projectDir, file);
        const session = readJson(full, null);
        const sessionId = String(session?.id || file.replace(/\.json$/i, ""));
        const identity = `project:${project}:${sessionId}`;
        if (!session) {
          sources.push({ sourceIdentity: identity, scopeType: "project", scopeId: project, sessionId, sourceChecksum: "", status: "degraded", errorSummary: "项目会话文件无法解析", records: [] });
          continue;
        }
        sources.push(sourceRow({ conversationType: "project", project, sessionId, sessionName: session.name || sessionId, updatedAt: session.updated_at || session.updatedAt, sourceIdentity: identity }, Array.isArray(session.history) ? session.history : session.messages, tasks));
      }
    }
  }

  for (const group of loadGroups()) {
    const groupId = String(group.id || "");
    if (!groupId) continue;
    for (const session of listGroupChatSessions(groupId).sessions || []) {
      const sessionId = String(session.id || "");
      sources.push(sourceRow({ conversationType: "group", groupId, groupName: group.name || groupId, sessionId, sessionName: session.title || sessionId, updatedAt: session.updatedAt, sourceIdentity: `group:${groupId}:${sessionId}` }, getGroupMessages(groupId, sessionId), tasks));
    }
  }

  const globalHistory = readJson(GLOBAL_AGENT_HISTORY_FILE, null);
  if (globalHistory) {
    for (const session of collapseGeneratedGlobalWelcomeSessions(globalHistory.sessions || [])) {
      const sessionId = String(session.id || "");
      if (!sessionId) continue;
      sources.push(sourceRow({ conversationType: "global", sessionId, sessionName: session.name || "全局助手会话", updatedAt: session.updated_at || session.updatedAt, sourceIdentity: `global:${sessionId}` }, Array.isArray(session.messages) ? session.messages : session.history, tasks));
    }
  } else if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
    sources.push({ sourceIdentity: "global:store", scopeType: "global", scopeId: "global", sessionId: "", sourceChecksum: "", status: "degraded", errorSummary: "全局会话文件无法解析", records: [] });
  }

  const music = loadMusicAgentMemory();
  sources.push(sourceRow({ conversationType: "music", sessionId: MUSIC_AGENT_SINGLETON_ID, sessionName: "音乐助手", sourceIdentity: `music:${MUSIC_AGENT_SINGLETON_ID}` }, music.transcript || [], tasks));
  return sources;
}

function shortTerms(content: string) {
  const chars = Array.from(String(content || "").toLowerCase().normalize("NFKC"));
  const terms = new Set<string>();
  for (let index = 0; index < chars.length; index += 1) {
    if (!/\s/u.test(chars[index])) terms.add(chars[index]);
    if (index + 1 < chars.length && !/\s/u.test(chars[index]) && !/\s/u.test(chars[index + 1])) terms.add(`${chars[index]}${chars[index + 1]}`);
    if (terms.size >= 12_000) break;
  }
  return [...terms];
}

export function buildConversationSearchIndexSync() {
  const sources = collectConversationSearchSources();
  const manifestChecksum = sha(sources.map(source => ({ identity: source.sourceIdentity, checksum: source.sourceChecksum, status: source.status })));
  const db = getObservabilityDatabase();
  const active = db.prepare("SELECT * FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get() as any;
  if (active?.source_manifest_checksum === manifestChecksum && Number(active.message_count || 0) === sources.reduce((sum, source) => sum + source.records.length, 0)) {
    clearConversationSearchIndexDirty({ checkedAt: new Date().toISOString(), reason: "unchanged" });
    return { success: true, unchanged: true, generation: active.generation, message_count: active.message_count, source_count: active.source_count };
  }
  const generation = `csi_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO conversation_search_generations_v3(generation,status,active,created_at,updated_at,source_manifest_checksum) VALUES(?,?,?,?,?,?)")
    .run(generation, "building", 0, now, now, manifestChecksum);
  try {
    withImmediateObservabilityTransaction((tx) => {
      const insertMessage = tx.prepare(`INSERT INTO conversation_search_messages_v3(
        generation,row_id,conversation_type,source,source_label,project_id,group_id,group_name,session_id,session_name,message_id,message_index,role,agent,content,content_checksum,timestamp,task_id,task_title,attachments_json,source_identity,source_checksum,indexed_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
      const insertFts = tx.prepare("INSERT INTO conversation_search_fts_v3(row_id,generation,content) VALUES(?,?,?)");
      const insertTerm = tx.prepare("INSERT OR IGNORE INTO conversation_search_short_terms_v3(generation,row_id,term) VALUES(?,?,?)");
      const insertSource = tx.prepare("INSERT INTO conversation_search_sources_v3(generation,source_identity,scope_type,scope_id,session_id,source_checksum,message_count,status,error_summary,indexed_at) VALUES(?,?,?,?,?,?,?,?,?,?)");
      let messageCount = 0;
      for (const source of sources) {
        insertSource.run(generation, source.sourceIdentity, source.scopeType, source.scopeId, source.sessionId, source.sourceChecksum, source.records.length, source.status, source.errorSummary, now);
        for (const record of source.records) {
          insertMessage.run(generation, record.rowId, record.conversationType, record.source, record.sourceLabel, record.project, record.groupId, record.groupName, record.sessionId, record.sessionName, record.messageId, record.messageIndex, record.role, record.agent, record.content, sha(record.content), record.timestamp, record.taskId, record.taskTitle, JSON.stringify(record.attachments), record.sourceIdentity, record.sourceChecksum, now);
          insertFts.run(record.rowId, generation, record.content.normalize("NFKC").toLowerCase());
          for (const term of shortTerms(record.content)) insertTerm.run(generation, record.rowId, term);
          messageCount += 1;
        }
      }
      tx.prepare("UPDATE conversation_search_generations_v3 SET active=0 WHERE active=1").run();
      tx.prepare("UPDATE conversation_search_generations_v3 SET status='ready',active=1,completed_at=?,updated_at=?,source_count=?,message_count=?,degraded_source_count=? WHERE generation=?")
        .run(now, now, sources.length, messageCount, sources.filter(source => source.status === "degraded").length, generation);
      const old = tx.prepare("SELECT generation FROM conversation_search_generations_v3 WHERE active=0 AND status='ready' ORDER BY completed_at DESC LIMIT -1 OFFSET 2").all() as any[];
      for (const row of old) {
        tx.prepare("DELETE FROM conversation_search_messages_v3 WHERE generation=?").run(row.generation);
        tx.prepare("DELETE FROM conversation_search_fts_v3 WHERE generation=?").run(row.generation);
        tx.prepare("DELETE FROM conversation_search_short_terms_v3 WHERE generation=?").run(row.generation);
        tx.prepare("DELETE FROM conversation_search_sources_v3 WHERE generation=?").run(row.generation);
        tx.prepare("DELETE FROM conversation_search_generations_v3 WHERE generation=?").run(row.generation);
      }
    });
    clearConversationSearchIndexDirty({ indexedAt: now, generation });
    return { success: true, generation, source_count: sources.length, message_count: sources.reduce((sum, source) => sum + source.records.length, 0), degraded_source_count: sources.filter(source => source.status === "degraded").length };
  } catch (error: any) {
    db.prepare("UPDATE conversation_search_generations_v3 SET status='failed',updated_at=?,error_summary=? WHERE generation=?").run(new Date().toISOString(), String(error?.message || error).slice(0, 800), generation);
    throw error;
  }
}

export function getConversationSearchIndexStatus() {
  const db = getObservabilityDatabase();
  const active = db.prepare("SELECT * FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get() as any;
  const latest = db.prepare("SELECT * FROM conversation_search_generations_v3 ORDER BY created_at DESC LIMIT 1").get() as any;
  const dirty = conversationSearchDirtyState({ dirty: !active });
  return {
    schema: "ccm-conversation-search-index-status-v3",
    ready: !!active,
    active_generation: active?.generation || "",
    message_count: Number(active?.message_count || 0),
    source_count: Number(active?.source_count || 0),
    degraded_source_count: Number(active?.degraded_source_count || 0),
    completed_at: active?.completed_at || "",
    stale: dirty?.dirty === true,
    building: latest?.status === "building" || !!buildProcess,
    latest_status: latest?.status || "missing",
    error: latest?.status === "failed" ? latest.error_summary || "索引构建失败" : "",
  };
}

export function startConversationSearchIndexBuild(options: { force?: boolean; reason?: string } = {}) {
  const status = getConversationSearchIndexStatus();
  if (buildProcess) return { accepted: false, reason: "already_building", ...status };
  if (!options.force && status.ready && status.stale !== true) return { accepted: false, reason: "up_to_date", ...status };
  const child = spawn(process.execPath, [__filename, "--conversation-search-worker"], {
    env: { ...process.env, CCM_CONVERSATION_SEARCH_WORKER: "1", CCM_CONVERSATION_SEARCH_REASON: options.reason || "scheduled" },
    stdio: ["ignore", "ignore", "pipe", "ipc"],
    windowsHide: true,
  });
  buildProcess = child;
  child.stderr?.on("data", data => console.warn(`[会话搜索索引] ${String(data).trim().slice(0, 800)}`));
  child.once("exit", () => { if (buildProcess === child) buildProcess = null; });
  return { accepted: true, pid: child.pid, ...status };
}

export function startConversationSearchIndexScheduler() {
  if (scheduler) return;
  markConversationSearchIndexDirty("startup_validation");
  startConversationSearchIndexBuild({ reason: "startup" });
  let validationTick = 0;
  scheduler = setInterval(() => {
    const status = getConversationSearchIndexStatus();
    validationTick += 1;
    if (!status.ready || status.stale || validationTick % 4 === 0) startConversationSearchIndexBuild({ force: validationTick % 4 === 0, reason: status.stale ? "dirty_reconcile" : "periodic_validation" });
  }, 15_000);
  scheduler.unref?.();
}

export function stopConversationSearchIndexScheduler() {
  if (scheduler) clearInterval(scheduler);
  scheduler = null;
  if (buildProcess && !buildProcess.killed) buildProcess.kill();
  buildProcess = null;
}

export function activeConversationSearchGeneration() {
  const row = getObservabilityDatabase().prepare("SELECT generation FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get() as any;
  return String(row?.generation || "");
}

export function shortSearchTerm(value: string) {
  return Array.from(String(value || "").normalize("NFKC").trim()).length < 3;
}

export function candidateRowsForTerm(generation: string, term: string) {
  const db = getObservabilityDatabase();
  const normalized = String(term || "").normalize("NFKC").trim().toLowerCase();
  if (!normalized) return [];
  if (shortSearchTerm(normalized)) {
    return (db.prepare("SELECT row_id FROM conversation_search_short_terms_v3 WHERE generation=? AND term=?").all(generation, normalized) as any[]).map(row => String(row.row_id));
  }
  const query = `\"${normalized.replace(/\"/g, '\"\"')}\"`;
  return (db.prepare("SELECT row_id FROM conversation_search_fts_v3 WHERE generation=? AND conversation_search_fts_v3 MATCH ?").all(generation, query) as any[]).map(row => String(row.row_id));
}

export function conversationSearchRecordRows(generation: string, rowIds: string[]) {
  if (!rowIds.length) return [];
  const db = getObservabilityDatabase();
  const rows: any[] = [];
  for (let offset = 0; offset < rowIds.length; offset += 500) {
    const page = rowIds.slice(offset, offset + 500);
    rows.push(...db.prepare(`SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND row_id IN (${page.map(() => "?").join(",")})`).all(generation, ...page));
  }
  return rows;
}

export function conversationMessageWindow(input: { generation?: string; rowId?: string; conversationType?: string; project?: string; groupId?: string; sessionId?: string; messageId?: string; messageIndex?: number; before?: number; after?: number }) {
  const generation = input.generation || activeConversationSearchGeneration();
  if (!generation) return null;
  const db = getObservabilityDatabase();
  let target: any = null;
  if (input.rowId) target = db.prepare("SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND row_id=?").get(generation, input.rowId);
  if (!target && input.sessionId && input.messageId) target = db.prepare("SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND conversation_type=? AND project_id=? AND group_id=? AND session_id=? AND message_id=?").get(generation, input.conversationType || "", input.project || "", input.groupId || "", input.sessionId, input.messageId);
  if (!target && input.sessionId && Number.isFinite(Number(input.messageIndex))) target = db.prepare("SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND conversation_type=? AND project_id=? AND group_id=? AND session_id=? AND message_index=?").get(generation, input.conversationType || "", input.project || "", input.groupId || "", input.sessionId, Number(input.messageIndex));
  if (!target) return null;
  const before = Math.max(0, Math.min(50, Number(input.before ?? 12)));
  const after = Math.max(0, Math.min(50, Number(input.after ?? 12)));
  const rows = db.prepare(`SELECT row_id,message_id,message_index,role,agent,content,timestamp,content_checksum FROM conversation_search_messages_v3
    WHERE generation=? AND conversation_type=? AND project_id=? AND group_id=? AND session_id=? AND message_index BETWEEN ? AND ? ORDER BY message_index`)
    .all(generation, target.conversation_type, target.project_id, target.group_id, target.session_id, Math.max(0, target.message_index - before), target.message_index + after) as any[];
  return {
    schema: "ccm-conversation-message-window-v3",
    generation,
    source_checksum: target.source_checksum,
    target: { row_id: target.row_id, message_id: target.message_id, message_index: target.message_index },
    conversation: { conversation_type: target.conversation_type, project: target.project_id, group_id: target.group_id, session_id: target.session_id, session_name: target.session_name },
    messages: rows.map(row => ({ rowId: row.row_id, messageId: row.message_id, messageIndex: row.message_index, role: row.role, agent: row.agent, content: row.content, timestamp: row.timestamp, checksum: row.content_checksum, target: row.row_id === target.row_id })),
  };
}

if (process.env.CCM_CONVERSATION_SEARCH_WORKER === "1" && process.argv.includes("--conversation-search-worker")) {
  try {
    const result = buildConversationSearchIndexSync();
    process.send?.({ success: true, result });
    process.exit(0);
  } catch (error: any) {
    process.send?.({ success: false, error: error?.message || String(error) });
    console.error(error?.stack || error);
    process.exit(1);
  }
}
