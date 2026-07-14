import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { loadTasks } from "../../core/db";
import { CCM_DIR, sendJson } from "../../core/utils";
import { getGroupMessages, listGroupChatSessions, loadGroups } from "../collaboration/storage";

const WEB_SESSIONS_DIR = path.join(CCM_DIR, "web-sessions");
const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const SEARCH_SCHEMA = "ccm-conversation-search-v2";

type ConversationType = "project" | "group" | "global";

export type ConversationSearchRecord = {
  conversationType: ConversationType;
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
  context: { before: any[]; after: any[] };
};

function hash(value: any, length = 20) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function text(value: any, max = 12_000) {
  const result = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return String(result || "").slice(0, max);
}

function timestamp(value: any, fallback = "") {
  const time = Date.parse(String(value || fallback || ""));
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

function messageSource(message: any, fallback: string) {
  const raw = String(message?.source_channel || message?.sourceChannel || message?.channel || message?.source || message?.origin || message?.metadata?.source || "").toLowerCase();
  return raw.includes("feishu") ? "feishu" : fallback;
}

function sourceLabel(source: string, conversationType: ConversationType) {
  if (source === "feishu") return "飞书会话";
  if (conversationType === "global") return "全局助手";
  if (conversationType === "group") return "群聊协作";
  return "项目会话";
}

function normalizeAttachments(message: any) {
  const values = [message?.attachments, message?.files, message?.source_attachments].flatMap(value => Array.isArray(value) ? value : []);
  const seen = new Set<string>();
  return values.flatMap((item: any) => {
    const name = text(typeof item === "string" ? path.basename(item) : item?.name || item?.filename || item?.path || item?.url, 220).trim();
    if (!name || seen.has(name)) return [];
    seen.add(name);
    return [{ name, type: text(item?.type || item?.mime_type || item?.mimeType, 100), size: Number(item?.size || 0) }];
  }).slice(0, 12);
}

function contextRows(messages: any[], index: number, direction: "before" | "after") {
  const indexes = direction === "before" ? [index - 2, index - 1] : [index + 1, index + 2];
  return indexes.filter(value => value >= 0 && value < messages.length).map(value => ({
    messageId: String(messages[value]?.id || messages[value]?.message_id || messages[value]?.messageId || ""),
    role: String(messages[value]?.role || "unknown"),
    agent: text(messages[value]?.agent || "", 100),
    content: text(messages[value]?.content, 500),
    timestamp: timestamp(messages[value]?.timestamp || messages[value]?.created_at || messages[value]?.createdAt),
  }));
}

function recordFromMessage(input: any, message: any, index: number, messages: any[], tasks: Map<string, any>): ConversationSearchRecord | null {
  const content = text(message?.content).trim();
  if (!content) return null;
  const conversationType = input.conversationType as ConversationType;
  const source = messageSource(message, conversationType);
  const taskId = String(message?.task_id || message?.taskId || message?.metadata?.task_id || "");
  const explicitMessageId = String(message?.id || message?.message_id || message?.messageId || "");
  return {
    conversationType,
    source,
    sourceLabel: sourceLabel(source, conversationType),
    project: String(input.project || ""),
    groupId: String(input.groupId || ""),
    groupName: String(input.groupName || ""),
    sessionId: String(input.sessionId || ""),
    sessionName: String(input.sessionName || input.sessionId || "会话"),
    messageId: explicitMessageId,
    messageIndex: index,
    role: String(message?.role || "unknown"),
    agent: text(message?.agent || message?.agent_name || message?.project || "", 120),
    content,
    timestamp: timestamp(message?.timestamp || message?.created_at || message?.createdAt, input.updatedAt),
    taskId,
    taskTitle: text(tasks.get(taskId)?.title || "", 180),
    attachments: normalizeAttachments(message),
    context: { before: contextRows(messages, index, "before"), after: contextRows(messages, index, "after") },
  };
}

function collectProjectRecords(tasks: Map<string, any>) {
  const records: ConversationSearchRecord[] = [];
  if (!fs.existsSync(WEB_SESSIONS_DIR)) return records;
  for (const project of fs.readdirSync(WEB_SESSIONS_DIR)) {
    const projectDir = path.join(WEB_SESSIONS_DIR, project);
    try { if (!fs.statSync(projectDir).isDirectory()) continue; } catch { continue; }
    for (const file of fs.readdirSync(projectDir).filter(name => name.endsWith(".json"))) {
      const session = readJson(path.join(projectDir, file), null);
      if (!session) continue;
      const messages = Array.isArray(session.history) ? session.history : Array.isArray(session.messages) ? session.messages : [];
      const sessionId = String(session.id || file.replace(/\.json$/i, ""));
      for (let index = 0; index < messages.length; index += 1) {
        const record = recordFromMessage({ conversationType: "project", project, sessionId, sessionName: session.name || sessionId, updatedAt: session.updated_at }, messages[index], index, messages, tasks);
        if (record) records.push(record);
      }
    }
  }
  return records;
}

function collectGroupRecords(tasks: Map<string, any>) {
  const records: ConversationSearchRecord[] = [];
  for (const group of loadGroups()) {
    const groupId = String(group.id || "");
    if (!groupId) continue;
    const manifest = listGroupChatSessions(groupId);
    for (const session of manifest.sessions || []) {
      const messages = getGroupMessages(groupId, session.id);
      for (let index = 0; index < messages.length; index += 1) {
        const record = recordFromMessage({ conversationType: "group", groupId, groupName: group.name || groupId, sessionId: session.id, sessionName: session.title || session.id, updatedAt: session.updatedAt }, messages[index], index, messages, tasks);
        if (record) records.push(record);
      }
    }
  }
  return records;
}

function collectGlobalRecords(tasks: Map<string, any>) {
  const records: ConversationSearchRecord[] = [];
  const history = readJson(GLOBAL_AGENT_HISTORY_FILE, { sessions: [] });
  const sessions = collapseGeneratedGlobalWelcomeSessions(Array.isArray(history.sessions) ? history.sessions : []);
  for (const session of sessions) {
    const messages = Array.isArray(session.messages) ? session.messages : Array.isArray(session.history) ? session.history : [];
    const sessionId = String(session.id || "");
    for (let index = 0; index < messages.length; index += 1) {
      const record = recordFromMessage({ conversationType: "global", sessionId, sessionName: session.name || "全局助手会话", updatedAt: session.updated_at || session.updatedAt }, messages[index], index, messages, tasks);
      if (record) records.push(record);
    }
  }
  return records;
}

export function collapseGeneratedGlobalWelcomeSessions(sessions: any[]) {
  const rows = Array.isArray(sessions) ? sessions : [];
  const keepBySignature = new Map<string, { index: number; time: number }>();

  for (let index = 0; index < rows.length; index += 1) {
    const session = rows[index];
    const messages = Array.isArray(session?.messages) ? session.messages : Array.isArray(session?.history) ? session.history : [];
    const message = messages[0];
    const isGeneratedEmptySession = messages.length === 1
      && String(session?.name || "") === "默认会话"
      && String(message?.role || "") === "assistant"
      && !String(message?.id || message?.message_id || message?.messageId || "")
      && !String(message?.task_id || message?.taskId || "")
      && String(message?.content || "").trim().startsWith("你好！我是您的全局助手");
    if (!isGeneratedEmptySession) continue;

    const signature = `${String(session.name)}\u0001${String(message.content || "").trim()}`;
    const time = validTime(message?.timestamp || session?.updated_at || session?.updatedAt || session?.created_at || session?.createdAt, index);
    const previous = keepBySignature.get(signature);
    if (!previous || time > previous.time) keepBySignature.set(signature, { index, time });
  }

  const keepIndexes = new Set([...keepBySignature.values()].map(item => item.index));
  return rows.filter((session, index) => {
    const messages = Array.isArray(session?.messages) ? session.messages : Array.isArray(session?.history) ? session.history : [];
    const message = messages[0];
    const signature = messages.length === 1
      && String(session?.name || "") === "默认会话"
      && String(message?.role || "") === "assistant"
      && !String(message?.id || message?.message_id || message?.messageId || "")
      && !String(message?.task_id || message?.taskId || "")
      && String(message?.content || "").trim().startsWith("你好！我是您的全局助手")
      ? `${String(session.name)}\u0001${String(message.content || "").trim()}`
      : "";
    return !signature || keepIndexes.has(index);
  });
}

export function collectConversationSearchRecords() {
  const tasks = new Map(loadTasks().map((task: any) => [String(task.id || ""), task]));
  return [...collectProjectRecords(tasks), ...collectGroupRecords(tasks), ...collectGlobalRecords(tasks)];
}

export function parseConversationSearchQuery(value: any, match = "all") {
  const query = text(value, 500).trim();
  const quoted: string[] = [];
  const remainder = query.replace(/["“”]([^"“”]+)["“”]/g, (_, phrase) => {
    quoted.push(String(phrase).trim().toLowerCase());
    return " ";
  });
  const words = remainder.split(/\s+/).map(item => item.trim().toLowerCase()).filter(Boolean);
  const terms = Array.from(new Set([...quoted, ...words])).slice(0, 20);
  return { query, terms, match: match === "phrase" ? "phrase" : match === "any" ? "any" : "all" };
}

function matchesTerms(content: string, parsed: any) {
  const haystack = content.toLowerCase();
  if (!parsed.terms.length) return false;
  if (parsed.match === "phrase") return haystack.includes(parsed.query.toLowerCase().replace(/^["“”]|["“”]$/g, ""));
  if (parsed.match === "any") return parsed.terms.some((term: string) => haystack.includes(term));
  return parsed.terms.every((term: string) => haystack.includes(term));
}

function validTime(value: any, fallback: number) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function searchConversationRecords(records: ConversationSearchRecord[], options: any = {}) {
  const parsed = parseConversationSearchQuery(options.q, options.match);
  const source = String(options.source || "all");
  const conversationType = String(options.conversation_type || options.conversationType || "");
  const project = String(options.project || "");
  const groupId = String(options.group_id || options.groupId || "");
  const groupName = String(options.group_name || options.groupName || "");
  const role = String(options.role || "");
  const agent = String(options.agent || "").toLowerCase();
  const start = validTime(options.start, Number.NEGATIVE_INFINITY);
  const end = validTime(options.end, Number.POSITIVE_INFINITY);
  const requestedPage = Number(options.page || 1);
  const requestedPageSize = Number(options.page_size || options.pageSize || options.limit || 30);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const pageSize = Number.isFinite(requestedPageSize) ? Math.max(1, Math.min(100, Math.floor(requestedPageSize))) : 30;

  const matched = records.filter(record => {
    const time = validTime(record.timestamp, 0);
    return matchesTerms(record.content, parsed)
      && (source === "all" || !source || record.source === source || record.conversationType === source)
      && (!conversationType || record.conversationType === conversationType)
      && (!project || record.project === project)
      && (!groupId || record.groupId === groupId)
      && (!groupName || record.groupName === groupName)
      && (!role || record.role === role)
      && (!agent || record.agent.toLowerCase().includes(agent))
      && time >= start && time < end;
  });
  matched.sort((left, right) => {
    const value = validTime(right.timestamp, 0) - validTime(left.timestamp, 0);
    return options.sort === "oldest" ? -value : value;
  });

  const counts = (field: keyof ConversationSearchRecord) => matched.reduce((result: Record<string, number>, item) => {
    const key = String(item[field] || "未标记");
    result[key] = Number(result[key] || 0) + 1;
    return result;
  }, {});
  const offset = (page - 1) * pageSize;
  const results = matched.slice(offset, offset + pageSize).map(record => ({
    ...record,
    id: `search:${hash(`${record.conversationType}|${record.project}|${record.groupId}|${record.sessionId}|${record.messageId || record.messageIndex}|${record.timestamp}`)}`,
    stableMessageId: !!record.messageId,
    matchTerms: parsed.terms,
  }));
  return {
    schema: SEARCH_SCHEMA,
    success: true,
    query: parsed,
    page,
    page_size: pageSize,
    total: matched.length,
    page_count: Math.ceil(matched.length / pageSize),
    has_more: offset + results.length < matched.length,
    results,
    facets: {
      sources: counts("source"),
      conversation_types: counts("conversationType"),
      roles: counts("role"),
      agents: counts("agent"),
      projects: counts("project"),
      groups: counts("groupName"),
    },
  };
}

export function runConversationSearchSelfTest() {
  const base = (overrides: Partial<ConversationSearchRecord>): ConversationSearchRecord => ({
    conversationType: "project", source: "project", sourceLabel: "项目会话", project: "shop", groupId: "", groupName: "", sessionId: "s1", sessionName: "订单开发", messageId: "m1", messageIndex: 0, role: "user", agent: "", content: "修复 飞书 周报 的日期范围", timestamp: "2026-07-13T08:00:00.000Z", taskId: "task-1", taskTitle: "修复周报", attachments: [{ name: "需求.png" }], context: { before: [], after: [] }, ...overrides,
  });
  const records = [
    base({}),
    base({ conversationType: "global", source: "global", sourceLabel: "全局助手", project: "", sessionId: "g1", messageId: "g1", role: "assistant", agent: "全局 Agent", content: "飞书通知已发送", timestamp: "2026-07-13T09:00:00.000Z" }),
    base({ conversationType: "group", source: "feishu", sourceLabel: "飞书会话", project: "", groupId: "team", groupName: "开发群", sessionId: "gs1", messageId: "gm1", content: "飞书 周报 已验收", timestamp: "2026-07-12T09:00:00.000Z" }),
  ];
  const andResult = searchConversationRecords(records, { q: "飞书 周报", page_size: 1 });
  const phraseResult = searchConversationRecords(records, { q: "飞书通知", match: "phrase" });
  const filtered = searchConversationRecords(records, { q: "飞书", source: "feishu", role: "user" });
  const welcome = { role: "assistant", content: "你好！我是您的全局助手。这里是欢迎说明。", timestamp: "2026-07-13T08:00:00.000Z" };
  const collapsedWelcomes = collapseGeneratedGlobalWelcomeSessions([
    { id: "welcome-old", name: "默认会话", messages: [welcome] },
    { id: "welcome-new", name: "默认会话", messages: [{ ...welcome, timestamp: "2026-07-13T09:00:00.000Z" }] },
    { id: "real-repeat", name: "真实会话", messages: [welcome] },
  ]);
  const checks = {
    multiWordAndSearch: andResult.total === 2,
    accuratePagination: andResult.results.length === 1 && andResult.page_count === 2 && andResult.has_more === true,
    phraseSearch: phraseResult.total === 1 && phraseResult.results[0]?.conversationType === "global",
    sourceAndRoleFilters: filtered.total === 1 && filtered.results[0]?.groupId === "team",
    exactNavigationIdentity: filtered.results[0]?.messageId === "gm1" && filtered.results[0]?.sessionId === "gs1",
    taskAndAttachmentRelation: searchConversationRecords(records, { q: "日期范围" }).results[0]?.taskId === "task-1" && searchConversationRecords(records, { q: "日期范围" }).results[0]?.attachments?.length === 1,
    completeFacets: andResult.facets.conversation_types.project === 1 && andResult.facets.conversation_types.group === 1,
    generatedWelcomeNoiseCollapsed: collapsedWelcomes.length === 2
      && collapsedWelcomes.some((session: any) => session.id === "welcome-new")
      && collapsedWelcomes.some((session: any) => session.id === "real-repeat"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

export function handleConversationSearchApi(pathname: string, req: any, res: any, parsed: any) {
  if (pathname !== "/api/search" || req.method !== "GET") return false;
  const started = Date.now();
  const query = String(parsed.query?.q || "").trim();
  if (!query) {
    sendJson(res, { schema: SEARCH_SCHEMA, success: true, query: { query: "", terms: [], match: "all" }, page: 1, page_size: 30, total: 0, page_count: 0, has_more: false, results: [], facets: {}, audit: { scanned_messages: 0, elapsed_ms: 0 } });
    return true;
  }
  try {
    const records = collectConversationSearchRecords();
    const result = searchConversationRecords(records, parsed.query || {});
    sendJson(res, { ...result, audit: { scanned_messages: records.length, elapsed_ms: Date.now() - started, sources: ["global", "group", "project", "feishu"] } });
  } catch (error: any) {
    sendJson(res, { success: false, error: error?.message || "对话搜索失败" }, 500);
  }
  return true;
}
