import * as crypto from "crypto";
import { sendJson } from "../../core/utils";
import { getObservabilityDatabase } from "../../system/observability-database";
import {
  CONVERSATION_SEARCH_SCHEMA,
  activeConversationSearchGeneration,
  candidateRowsForTerm,
  collectConversationSearchSources,
  collapseGeneratedGlobalWelcomeSessions,
  conversationMessageWindow,
  conversationSearchRecordRows,
  getConversationSearchIndexStatus,
  startConversationSearchIndexBuild,
  type ConversationSearchRecordV3,
} from "./conversation-search-index";

export { collapseGeneratedGlobalWelcomeSessions } from "./conversation-search-index";

export type ConversationSearchRecord = Omit<ConversationSearchRecordV3, "rowId" | "sourceIdentity" | "sourceChecksum"> & {
  context: { before: any[]; after: any[] };
};

function hash(value: any, length = 20) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

function text(value: any, max = 500) {
  const result = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
  return String(result || "").slice(0, max);
}

function validTime(value: any, fallback: number) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseConversationSearchQuery(value: any, match = "all") {
  const query = text(value, 500).trim();
  const quoted: string[] = [];
  const remainder = query.replace(/["“”]([^"“”]+)["“”]/g, (_, phrase) => {
    quoted.push(String(phrase).trim().normalize("NFKC").toLowerCase());
    return " ";
  });
  const words = remainder.split(/\s+/).map(item => item.trim().normalize("NFKC").toLowerCase()).filter(Boolean);
  const terms = Array.from(new Set([...quoted, ...words])).slice(0, 20);
  return { query, terms, match: match === "phrase" ? "phrase" : match === "any" ? "any" : "all" };
}

function matchesTerms(content: string, parsed: any) {
  const haystack = String(content || "").normalize("NFKC").toLowerCase();
  if (!parsed.terms.length) return false;
  if (parsed.match === "phrase") return haystack.includes(parsed.query.normalize("NFKC").toLowerCase().replace(/^["“”]|["“”]$/g, ""));
  if (parsed.match === "any") return parsed.terms.some((term: string) => haystack.includes(term));
  return parsed.terms.every((term: string) => haystack.includes(term));
}

function intersectSets(sets: Set<string>[]) {
  if (!sets.length) return new Set<string>();
  const [smallest, ...others] = [...sets].sort((a, b) => a.size - b.size);
  return new Set([...smallest].filter(value => others.every(set => set.has(value))));
}

function unionSets(sets: Set<string>[]) {
  return new Set(sets.flatMap(set => [...set]));
}

function normalizedDbRow(row: any) {
  let attachments: any[] = [];
  try { attachments = JSON.parse(String(row.attachments_json || "[]")); } catch {}
  return {
    rowId: String(row.row_id || ""),
    conversationType: String(row.conversation_type || ""),
    source: String(row.source || ""),
    sourceLabel: String(row.source_label || ""),
    project: String(row.project_id || ""),
    groupId: String(row.group_id || ""),
    groupName: String(row.group_name || ""),
    sessionId: String(row.session_id || ""),
    sessionName: String(row.session_name || ""),
    messageId: String(row.message_id || ""),
    messageIndex: Number(row.message_index || 0),
    role: String(row.role || "unknown"),
    agent: String(row.agent || ""),
    content: String(row.content || ""),
    timestamp: String(row.timestamp || ""),
    taskId: String(row.task_id || ""),
    taskTitle: String(row.task_title || ""),
    attachments,
    sourceChecksum: String(row.source_checksum || ""),
  };
}

function contextForRow(generation: string, row: any) {
  const window = conversationMessageWindow({ generation, rowId: row.rowId, before: 2, after: 2 });
  const rows = window?.messages || [];
  const format = (item: any) => ({ messageId: item.messageId, messageIndex: item.messageIndex, role: item.role, agent: item.agent, content: item.content.slice(0, 1000), timestamp: item.timestamp });
  return {
    before: rows.filter((item: any) => item.messageIndex < row.messageIndex).map(format),
    after: rows.filter((item: any) => item.messageIndex > row.messageIndex).map(format),
  };
}

export function searchConversationIndex(options: any = {}) {
  const started = Date.now();
  const parsed = parseConversationSearchQuery(options.q, options.match);
  const status = getConversationSearchIndexStatus();
  const generation = activeConversationSearchGeneration();
  if (!generation) {
    startConversationSearchIndexBuild({ reason: "first_search" });
    return { schema: CONVERSATION_SEARCH_SCHEMA, success: false, code: "index_building", error: "会话搜索索引正在建立", retryable: true, index: status };
  }
  const sourceTerms = parsed.match === "phrase" ? [parsed.query.replace(/^["“”]|["“”]$/g, "")] : parsed.terms;
  const sets = sourceTerms.map(term => new Set(candidateRowsForTerm(generation, term)));
  const candidates = parsed.match === "any" ? unionSets(sets) : intersectSets(sets);
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
  const matched = conversationSearchRecordRows(generation, [...candidates]).map(normalizedDbRow).filter((record: any) => {
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
  matched.sort((left: any, right: any) => {
    const value = validTime(right.timestamp, 0) - validTime(left.timestamp, 0);
    return options.sort === "oldest" ? -value : value;
  });
  const counts = (field: string) => matched.reduce((result: Record<string, number>, item: any) => {
    const key = String(item[field] || "未标记");
    result[key] = Number(result[key] || 0) + 1;
    return result;
  }, {});
  const offset = (page - 1) * pageSize;
  const results = matched.slice(offset, offset + pageSize).map((record: any) => ({
    ...record,
    id: `search:${hash(`${record.conversationType}|${record.project}|${record.groupId}|${record.sessionId}|${record.messageId || record.messageIndex}|${record.timestamp}`)}`,
    stableMessageId: !!record.messageId,
    matchTerms: parsed.terms,
    context: contextForRow(generation, record),
    indexGeneration: generation,
  }));
  return {
    schema: CONVERSATION_SEARCH_SCHEMA,
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
    index: { ...status, active_generation: generation, stale_served: status.stale === true },
    audit: { candidate_messages: candidates.size, elapsed_ms: Date.now() - started, sources: ["global", "group", "project", "music", "feishu"] },
  };
}

// Pure compatibility helper used by fixtures and tests. Production queries use the SQLite index above.
export function searchConversationRecords(records: ConversationSearchRecord[], options: any = {}) {
  const parsed = parseConversationSearchQuery(options.q, options.match);
  const source = String(options.source || "all");
  const requestedPage = Number(options.page || 1);
  const requestedPageSize = Number(options.page_size || options.pageSize || options.limit || 30);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
  const pageSize = Number.isFinite(requestedPageSize) ? Math.max(1, Math.min(100, Math.floor(requestedPageSize))) : 30;
  const matched = records.filter(record => matchesTerms(record.content, parsed)
    && (source === "all" || !source || record.source === source || record.conversationType === source)
    && (!options.role || record.role === options.role));
  matched.sort((a, b) => validTime(b.timestamp, 0) - validTime(a.timestamp, 0));
  const offset = (page - 1) * pageSize;
  const results = matched.slice(offset, offset + pageSize).map(record => ({ ...record, id: `search:${hash(`${record.sessionId}|${record.messageId || record.messageIndex}`)}`, matchTerms: parsed.terms }));
  const counts = (field: keyof ConversationSearchRecord) => matched.reduce((result: Record<string, number>, item) => { const key = String(item[field] || "未标记"); result[key] = Number(result[key] || 0) + 1; return result; }, {});
  return { schema: CONVERSATION_SEARCH_SCHEMA, success: true, query: parsed, page, page_size: pageSize, total: matched.length, page_count: Math.ceil(matched.length / pageSize), has_more: offset + results.length < matched.length, results, facets: { sources: counts("source"), conversation_types: counts("conversationType"), roles: counts("role"), agents: counts("agent"), projects: counts("project"), groups: counts("groupName") } };
}

export function collectConversationSearchRecords() {
  return collectConversationSearchSources().flatMap(source => source.records.map(record => ({ ...record, context: { before: [], after: [] } })));
}

export function runConversationSearchSelfTest() {
  const base: ConversationSearchRecord = { conversationType: "project", source: "project", sourceLabel: "项目会话", project: "shop", groupId: "", groupName: "", sessionId: "s1", sessionName: "订单开发", messageId: "m1", messageIndex: 0, role: "user", agent: "", content: "修复 飞书 周报 的日期范围", timestamp: "2026-07-13T08:00:00.000Z", taskId: "task-1", taskTitle: "修复周报", attachments: [{ name: "需求.png" }], context: { before: [], after: [] } };
  const records = [base, { ...base, conversationType: "global" as const, source: "global", sessionId: "g1", messageId: "g1", role: "assistant", content: "飞书通知已发送" }, { ...base, conversationType: "music" as const, source: "music", sessionId: "music-agent", messageId: "music-1", content: "播放适合雨天的音乐" }];
  const result = searchConversationRecords(records, { q: "飞书 周报", page_size: 1 });
  const music = searchConversationRecords(records, { q: "雨天", source: "music" });
  const collapsed = collapseGeneratedGlobalWelcomeSessions([{ id: "old", name: "默认会话", messages: [{ role: "assistant", content: "你好！我是您的全局助手。", timestamp: "2026-01-01" }] }, { id: "new", name: "默认会话", messages: [{ role: "assistant", content: "你好！我是您的全局助手。", timestamp: "2026-02-01" }] }]);
  const checks = { multiWordSearch: result.total === 1, pagination: result.results.length === 1, musicCovered: music.total === 1, generatedWelcomeCollapsed: collapsed.length === 1 && collapsed[0].id === "new", fullTextNotTruncated: searchConversationRecords([{ ...base, content: `${"a".repeat(13_000)}终点词` }], { q: "终点词" }).total === 1 };
  return { pass: Object.values(checks).every(Boolean), checks };
}

function readJsonBody(req: any, max = 256 * 1024) {
  return new Promise<any>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: any) => { body += String(chunk); if (body.length > max) reject(new Error("请求内容过大")); });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("JSON格式无效")); } });
    req.on("error", reject);
  });
}

function publicFavoriteRow(row: any) {
  return normalizedDbRow(row);
}

export function handleConversationSearchApi(pathname: string, req: any, res: any, parsed: any) {
  if (pathname === "/api/search/status" && req.method === "GET") {
    sendJson(res, { success: true, index: getConversationSearchIndexStatus() });
    return true;
  }
  if (pathname === "/api/search/rebuild" && req.method === "POST") {
    sendJson(res, { success: true, build: startConversationSearchIndexBuild({ force: true, reason: "manual" }) }, 202);
    return true;
  }
  if (pathname === "/api/conversations/message-window" && req.method === "GET") {
    const window = conversationMessageWindow({ generation: String(parsed.query.generation || ""), rowId: String(parsed.query.row_id || parsed.query.rowId || ""), conversationType: String(parsed.query.conversation_type || parsed.query.conversationType || ""), project: String(parsed.query.project || ""), groupId: String(parsed.query.group_id || parsed.query.groupId || ""), sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""), messageId: String(parsed.query.message_id || parsed.query.messageId || ""), messageIndex: Number(parsed.query.message_index || parsed.query.messageIndex), before: Number(parsed.query.before || 12), after: Number(parsed.query.after || 12) });
    if (!window) sendJson(res, { success: false, error: "消息不存在或索引已更新", code: "message_anchor_stale" }, 404);
    else sendJson(res, { success: true, window });
    return true;
  }
  if (pathname === "/api/search/favorites" && req.method === "GET") {
    const userId = String(req.ccmAuth?.userId || "");
    const generation = activeConversationSearchGeneration();
    const db = getObservabilityDatabase();
    const rows = db.prepare(`SELECT m.*,f.favorite_id,f.created_at AS favorite_at FROM conversation_search_favorites_v3 f
      JOIN conversation_search_messages_v3 m ON m.generation=? AND m.row_id=f.row_id AND m.source_checksum=f.source_checksum
      WHERE f.user_id=? ORDER BY f.created_at DESC LIMIT 100`).all(generation, userId) as any[];
    sendJson(res, { success: true, favorites: rows.map(row => ({ ...publicFavoriteRow(row), id: row.favorite_id, favoriteAt: row.favorite_at, indexGeneration: generation, context: { before: [], after: [] } })) });
    return true;
  }
  if (pathname === "/api/search/favorites" && req.method === "POST") {
    void readJsonBody(req).then(body => {
      const userId = String(req.ccmAuth?.userId || "");
      const generation = activeConversationSearchGeneration();
      const rowId = String(body.row_id || body.rowId || "");
      const row = getObservabilityDatabase().prepare("SELECT row_id,source_checksum FROM conversation_search_messages_v3 WHERE generation=? AND row_id=?").get(generation, rowId) as any;
      if (!row) return sendJson(res, { success: false, error: "消息不存在或索引已更新" }, 404);
      const favoriteId = `favorite:${hash(`${userId}|${rowId}`)}`;
      getObservabilityDatabase().prepare("INSERT INTO conversation_search_favorites_v3(user_id,favorite_id,row_id,source_checksum,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,favorite_id) DO UPDATE SET source_checksum=excluded.source_checksum,created_at=excluded.created_at")
        .run(userId, favoriteId, rowId, row.source_checksum, new Date().toISOString());
      sendJson(res, { success: true, favorite_id: favoriteId });
    }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
    return true;
  }
  if (pathname === "/api/search/favorites" && req.method === "DELETE") {
    const userId = String(req.ccmAuth?.userId || "");
    const favoriteId = String(parsed.query.favorite_id || parsed.query.favoriteId || "");
    const rowId = String(parsed.query.row_id || parsed.query.rowId || "");
    if (favoriteId) getObservabilityDatabase().prepare("DELETE FROM conversation_search_favorites_v3 WHERE user_id=? AND favorite_id=?").run(userId, favoriteId);
    else if (rowId) getObservabilityDatabase().prepare("DELETE FROM conversation_search_favorites_v3 WHERE user_id=? AND row_id=?").run(userId, rowId);
    sendJson(res, { success: true });
    return true;
  }
  if (pathname !== "/api/search" || req.method !== "GET") return false;
  const query = String(parsed.query?.q || "").trim();
  if (!query) {
    sendJson(res, { schema: CONVERSATION_SEARCH_SCHEMA, success: true, query: { query: "", terms: [], match: "all" }, page: 1, page_size: 30, total: 0, page_count: 0, has_more: false, results: [], facets: {}, index: getConversationSearchIndexStatus() });
    return true;
  }
  try {
    const result = searchConversationIndex(parsed.query || {});
    sendJson(res, result, result.success === false ? 503 : 200);
  } catch (error: any) {
    sendJson(res, { success: false, error: error?.message || "对话搜索失败", code: "search_failed" }, 500);
  }
  return true;
}
