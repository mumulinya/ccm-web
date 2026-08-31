"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.collapseGeneratedGlobalWelcomeSessions = void 0;
exports.parseConversationSearchQuery = parseConversationSearchQuery;
exports.searchConversationIndex = searchConversationIndex;
exports.searchConversationRecords = searchConversationRecords;
exports.collectConversationSearchRecords = collectConversationSearchRecords;
exports.runConversationSearchSelfTest = runConversationSearchSelfTest;
exports.handleConversationSearchApi = handleConversationSearchApi;
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const observability_database_1 = require("../../system/observability-database");
const conversation_search_index_1 = require("./conversation-search-index");
var conversation_search_index_2 = require("./conversation-search-index");
Object.defineProperty(exports, "collapseGeneratedGlobalWelcomeSessions", { enumerable: true, get: function () { return conversation_search_index_2.collapseGeneratedGlobalWelcomeSessions; } });
function hash(value, length = 20) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}
function text(value, max = 500) {
    const result = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
    return String(result || "").slice(0, max);
}
function validTime(value, fallback) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : fallback;
}
function parseConversationSearchQuery(value, match = "all") {
    const query = text(value, 500).trim();
    const quoted = [];
    const remainder = query.replace(/["“”]([^"“”]+)["“”]/g, (_, phrase) => {
        quoted.push(String(phrase).trim().normalize("NFKC").toLowerCase());
        return " ";
    });
    const words = remainder.split(/\s+/).map(item => item.trim().normalize("NFKC").toLowerCase()).filter(Boolean);
    const terms = Array.from(new Set([...quoted, ...words])).slice(0, 20);
    return { query, terms, match: match === "phrase" ? "phrase" : match === "any" ? "any" : "all" };
}
function matchesTerms(content, parsed) {
    const haystack = String(content || "").normalize("NFKC").toLowerCase();
    if (!parsed.terms.length)
        return false;
    if (parsed.match === "phrase")
        return haystack.includes(parsed.query.normalize("NFKC").toLowerCase().replace(/^["“”]|["“”]$/g, ""));
    if (parsed.match === "any")
        return parsed.terms.some((term) => haystack.includes(term));
    return parsed.terms.every((term) => haystack.includes(term));
}
function intersectSets(sets) {
    if (!sets.length)
        return new Set();
    const [smallest, ...others] = [...sets].sort((a, b) => a.size - b.size);
    return new Set([...smallest].filter(value => others.every(set => set.has(value))));
}
function unionSets(sets) {
    return new Set(sets.flatMap(set => [...set]));
}
function normalizedDbRow(row) {
    let attachments = [];
    try {
        attachments = JSON.parse(String(row.attachments_json || "[]"));
    }
    catch { }
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
function contextForRow(generation, row) {
    const window = (0, conversation_search_index_1.conversationMessageWindow)({ generation, rowId: row.rowId, before: 2, after: 2 });
    const rows = window?.messages || [];
    const format = (item) => ({ messageId: item.messageId, messageIndex: item.messageIndex, role: item.role, agent: item.agent, content: item.content.slice(0, 1000), timestamp: item.timestamp });
    return {
        before: rows.filter((item) => item.messageIndex < row.messageIndex).map(format),
        after: rows.filter((item) => item.messageIndex > row.messageIndex).map(format),
    };
}
function searchConversationIndex(options = {}) {
    const started = Date.now();
    const parsed = parseConversationSearchQuery(options.q, options.match);
    const status = (0, conversation_search_index_1.getConversationSearchIndexStatus)();
    const generation = (0, conversation_search_index_1.activeConversationSearchGeneration)();
    if (!generation) {
        (0, conversation_search_index_1.startConversationSearchIndexBuild)({ reason: "first_search" });
        return { schema: conversation_search_index_1.CONVERSATION_SEARCH_SCHEMA, success: false, code: "index_building", error: "会话搜索索引正在建立", retryable: true, index: status };
    }
    const sourceTerms = parsed.match === "phrase" ? [parsed.query.replace(/^["“”]|["“”]$/g, "")] : parsed.terms;
    const sets = sourceTerms.map(term => new Set((0, conversation_search_index_1.candidateRowsForTerm)(generation, term)));
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
    const matched = (0, conversation_search_index_1.conversationSearchRecordRows)(generation, [...candidates]).map(normalizedDbRow).filter((record) => {
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
    const counts = (field) => matched.reduce((result, item) => {
        const key = String(item[field] || "未标记");
        result[key] = Number(result[key] || 0) + 1;
        return result;
    }, {});
    const offset = (page - 1) * pageSize;
    const results = matched.slice(offset, offset + pageSize).map((record) => ({
        ...record,
        id: `search:${hash(`${record.conversationType}|${record.project}|${record.groupId}|${record.sessionId}|${record.messageId || record.messageIndex}|${record.timestamp}`)}`,
        stableMessageId: !!record.messageId,
        matchTerms: parsed.terms,
        context: contextForRow(generation, record),
        indexGeneration: generation,
    }));
    return {
        schema: conversation_search_index_1.CONVERSATION_SEARCH_SCHEMA,
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
function searchConversationRecords(records, options = {}) {
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
    const counts = (field) => matched.reduce((result, item) => { const key = String(item[field] || "未标记"); result[key] = Number(result[key] || 0) + 1; return result; }, {});
    return { schema: conversation_search_index_1.CONVERSATION_SEARCH_SCHEMA, success: true, query: parsed, page, page_size: pageSize, total: matched.length, page_count: Math.ceil(matched.length / pageSize), has_more: offset + results.length < matched.length, results, facets: { sources: counts("source"), conversation_types: counts("conversationType"), roles: counts("role"), agents: counts("agent"), projects: counts("project"), groups: counts("groupName") } };
}
function collectConversationSearchRecords() {
    return (0, conversation_search_index_1.collectConversationSearchSources)().flatMap(source => source.records.map(record => ({ ...record, context: { before: [], after: [] } })));
}
function runConversationSearchSelfTest() {
    const base = { conversationType: "project", source: "project", sourceLabel: "项目会话", project: "shop", groupId: "", groupName: "", sessionId: "s1", sessionName: "订单开发", messageId: "m1", messageIndex: 0, role: "user", agent: "", content: "修复 飞书 周报 的日期范围", timestamp: "2026-07-13T08:00:00.000Z", taskId: "task-1", taskTitle: "修复周报", attachments: [{ name: "需求.png" }], context: { before: [], after: [] } };
    const records = [base, { ...base, conversationType: "global", source: "global", sessionId: "g1", messageId: "g1", role: "assistant", content: "飞书通知已发送" }, { ...base, conversationType: "music", source: "music", sessionId: "music-agent", messageId: "music-1", content: "播放适合雨天的音乐" }];
    const result = searchConversationRecords(records, { q: "飞书 周报", page_size: 1 });
    const music = searchConversationRecords(records, { q: "雨天", source: "music" });
    const collapsed = (0, conversation_search_index_1.collapseGeneratedGlobalWelcomeSessions)([{ id: "old", name: "默认会话", messages: [{ role: "assistant", content: "你好！我是您的全局助手。", timestamp: "2026-01-01" }] }, { id: "new", name: "默认会话", messages: [{ role: "assistant", content: "你好！我是您的全局助手。", timestamp: "2026-02-01" }] }]);
    const checks = { multiWordSearch: result.total === 1, pagination: result.results.length === 1, musicCovered: music.total === 1, generatedWelcomeCollapsed: collapsed.length === 1 && collapsed[0].id === "new", fullTextNotTruncated: searchConversationRecords([{ ...base, content: `${"a".repeat(13_000)}终点词` }], { q: "终点词" }).total === 1 };
    return { pass: Object.values(checks).every(Boolean), checks };
}
function readJsonBody(req, max = 256 * 1024) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => { body += String(chunk); if (body.length > max)
            reject(new Error("请求内容过大")); });
        req.on("end", () => { try {
            resolve(body ? JSON.parse(body) : {});
        }
        catch {
            reject(new Error("JSON格式无效"));
        } });
        req.on("error", reject);
    });
}
function publicFavoriteRow(row) {
    return normalizedDbRow(row);
}
function handleConversationSearchApi(pathname, req, res, parsed) {
    if (pathname === "/api/search/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, index: (0, conversation_search_index_1.getConversationSearchIndexStatus)() });
        return true;
    }
    if (pathname === "/api/search/rebuild" && req.method === "POST") {
        (0, utils_1.sendJson)(res, { success: true, build: (0, conversation_search_index_1.startConversationSearchIndexBuild)({ force: true, reason: "manual" }) }, 202);
        return true;
    }
    if (pathname === "/api/conversations/message-window" && req.method === "GET") {
        const window = (0, conversation_search_index_1.conversationMessageWindow)({ generation: String(parsed.query.generation || ""), rowId: String(parsed.query.row_id || parsed.query.rowId || ""), conversationType: String(parsed.query.conversation_type || parsed.query.conversationType || ""), project: String(parsed.query.project || ""), groupId: String(parsed.query.group_id || parsed.query.groupId || ""), sessionId: String(parsed.query.session_id || parsed.query.sessionId || ""), messageId: String(parsed.query.message_id || parsed.query.messageId || ""), messageIndex: Number(parsed.query.message_index || parsed.query.messageIndex), before: Number(parsed.query.before || 12), after: Number(parsed.query.after || 12) });
        if (!window)
            (0, utils_1.sendJson)(res, { success: false, error: "消息不存在或索引已更新", code: "message_anchor_stale" }, 404);
        else
            (0, utils_1.sendJson)(res, { success: true, window });
        return true;
    }
    if (pathname === "/api/search/favorites" && req.method === "GET") {
        const userId = String(req.ccmAuth?.userId || "");
        const generation = (0, conversation_search_index_1.activeConversationSearchGeneration)();
        const db = (0, observability_database_1.getObservabilityDatabase)();
        const rows = db.prepare(`SELECT m.*,f.favorite_id,f.created_at AS favorite_at FROM conversation_search_favorites_v3 f
      JOIN conversation_search_messages_v3 m ON m.generation=? AND m.row_id=f.row_id AND m.source_checksum=f.source_checksum
      WHERE f.user_id=? ORDER BY f.created_at DESC LIMIT 100`).all(generation, userId);
        (0, utils_1.sendJson)(res, { success: true, favorites: rows.map(row => ({ ...publicFavoriteRow(row), id: row.favorite_id, favoriteAt: row.favorite_at, indexGeneration: generation, context: { before: [], after: [] } })) });
        return true;
    }
    if (pathname === "/api/search/favorites" && req.method === "POST") {
        void readJsonBody(req).then(body => {
            const userId = String(req.ccmAuth?.userId || "");
            const generation = (0, conversation_search_index_1.activeConversationSearchGeneration)();
            const rowId = String(body.row_id || body.rowId || "");
            const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT row_id,source_checksum FROM conversation_search_messages_v3 WHERE generation=? AND row_id=?").get(generation, rowId);
            if (!row)
                return (0, utils_1.sendJson)(res, { success: false, error: "消息不存在或索引已更新" }, 404);
            const favoriteId = `favorite:${hash(`${userId}|${rowId}`)}`;
            (0, observability_database_1.getObservabilityDatabase)().prepare("INSERT INTO conversation_search_favorites_v3(user_id,favorite_id,row_id,source_checksum,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,favorite_id) DO UPDATE SET source_checksum=excluded.source_checksum,created_at=excluded.created_at")
                .run(userId, favoriteId, rowId, row.source_checksum, new Date().toISOString());
            (0, utils_1.sendJson)(res, { success: true, favorite_id: favoriteId });
        }).catch(error => (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400));
        return true;
    }
    if (pathname === "/api/search/favorites" && req.method === "DELETE") {
        const userId = String(req.ccmAuth?.userId || "");
        const favoriteId = String(parsed.query.favorite_id || parsed.query.favoriteId || "");
        const rowId = String(parsed.query.row_id || parsed.query.rowId || "");
        if (favoriteId)
            (0, observability_database_1.getObservabilityDatabase)().prepare("DELETE FROM conversation_search_favorites_v3 WHERE user_id=? AND favorite_id=?").run(userId, favoriteId);
        else if (rowId)
            (0, observability_database_1.getObservabilityDatabase)().prepare("DELETE FROM conversation_search_favorites_v3 WHERE user_id=? AND row_id=?").run(userId, rowId);
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
    if (pathname !== "/api/search" || req.method !== "GET")
        return false;
    const query = String(parsed.query?.q || "").trim();
    if (!query) {
        (0, utils_1.sendJson)(res, { schema: conversation_search_index_1.CONVERSATION_SEARCH_SCHEMA, success: true, query: { query: "", terms: [], match: "all" }, page: 1, page_size: 30, total: 0, page_count: 0, has_more: false, results: [], facets: {}, index: (0, conversation_search_index_1.getConversationSearchIndexStatus)() });
        return true;
    }
    try {
        const result = searchConversationIndex(parsed.query || {});
        (0, utils_1.sendJson)(res, result, result.success === false ? 503 : 200);
    }
    catch (error) {
        (0, utils_1.sendJson)(res, { success: false, error: error?.message || "对话搜索失败", code: "search_failed" }, 500);
    }
    return true;
}
//# sourceMappingURL=conversation-search.js.map