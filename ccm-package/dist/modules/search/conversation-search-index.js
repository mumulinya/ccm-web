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
exports.markConversationSearchIndexDirty = exports.CONVERSATION_SEARCH_SCHEMA = void 0;
exports.collapseGeneratedGlobalWelcomeSessions = collapseGeneratedGlobalWelcomeSessions;
exports.collectConversationSearchSources = collectConversationSearchSources;
exports.buildConversationSearchIndexSync = buildConversationSearchIndexSync;
exports.getConversationSearchIndexStatus = getConversationSearchIndexStatus;
exports.startConversationSearchIndexBuild = startConversationSearchIndexBuild;
exports.startConversationSearchIndexScheduler = startConversationSearchIndexScheduler;
exports.stopConversationSearchIndexScheduler = stopConversationSearchIndexScheduler;
exports.activeConversationSearchGeneration = activeConversationSearchGeneration;
exports.shortSearchTerm = shortSearchTerm;
exports.candidateRowsForTerm = candidateRowsForTerm;
exports.conversationSearchRecordRows = conversationSearchRecordRows;
exports.conversationMessageWindow = conversationMessageWindow;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const observability_database_1 = require("../../system/observability-database");
const conversation_search_dirty_1 = require("../../system/conversation-search-dirty");
const storage_1 = require("../collaboration/storage");
const memory_1 = require("../music/memory");
exports.CONVERSATION_SEARCH_SCHEMA = "ccm-conversation-search-v3";
const GLOBAL_AGENT_HISTORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-history.json");
const WEB_SESSIONS_DIR = path.join(utils_1.CCM_DIR, "web-sessions");
var conversation_search_dirty_2 = require("../../system/conversation-search-dirty");
Object.defineProperty(exports, "markConversationSearchIndexDirty", { enumerable: true, get: function () { return conversation_search_dirty_2.markConversationSearchIndexDirty; } });
let buildProcess = null;
let scheduler = null;
function sha(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function stableId(prefix, value) {
    return `${prefix}_${sha(value).slice(0, 24)}`;
}
function validIso(value, fallback = "") {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}
function messageSource(message, fallback) {
    const raw = String(message?.source_channel || message?.sourceChannel || message?.channel || message?.source || message?.origin || message?.metadata?.source || "").toLowerCase();
    return raw.includes("feishu") ? "feishu" : fallback;
}
function sourceLabel(source, conversationType) {
    if (source === "feishu")
        return "飞书会话";
    if (conversationType === "global")
        return "全局助手";
    if (conversationType === "group")
        return "群聊协作";
    if (conversationType === "music")
        return "音乐助手";
    return "项目会话";
}
function normalizeAttachments(message) {
    const values = [message?.attachments, message?.files, message?.source_attachments].flatMap(value => Array.isArray(value) ? value : []);
    const seen = new Set();
    return values.flatMap((item) => {
        const raw = typeof item === "string" ? item : item?.name || item?.filename || item?.path || item?.url;
        const name = path.basename(String(raw || "")).slice(0, 220).trim();
        if (!name || seen.has(name))
            return [];
        seen.add(name);
        return [{ name, type: String(item?.type || item?.mime_type || item?.mimeType || "").slice(0, 100), size: Math.max(0, Number(item?.size || 0) || 0) }];
    }).slice(0, 24);
}
function normalizeMessageRecord(input, message, index, tasks, sourceChecksum) {
    const content = typeof message?.content === "string" ? message.content : message?.content == null ? "" : JSON.stringify(message.content);
    if (!content.trim())
        return null;
    const conversationType = input.conversationType;
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
function sourceRow(input, messages, tasks) {
    const normalizedMessages = Array.isArray(messages) ? messages : [];
    const sourceChecksum = sha(normalizedMessages.map((message, index) => ({
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
        scopeId: String(input.project || input.groupId || input.sessionId || memory_1.MUSIC_AGENT_SINGLETON_ID),
        sessionId: String(input.sessionId),
        sourceChecksum,
        status: "ready",
        errorSummary: "",
        records: normalizedMessages.map((message, index) => normalizeMessageRecord(input, message, index, tasks, sourceChecksum)).filter(Boolean),
    };
}
function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return fallback;
    }
}
function generatedWelcomeSignature(session) {
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
function collapseGeneratedGlobalWelcomeSessions(sessions) {
    const rows = Array.isArray(sessions) ? sessions : [];
    const latest = new Map();
    rows.forEach((session, index) => {
        const signature = generatedWelcomeSignature(session);
        if (!signature)
            return;
        const messages = Array.isArray(session.messages) ? session.messages : session.history || [];
        const time = Date.parse(String(messages[0]?.timestamp || session.updatedAt || session.updated_at || "")) || index;
        const previous = latest.get(signature);
        if (!previous || time > previous.time)
            latest.set(signature, { index, time });
    });
    const keep = new Set([...latest.values()].map(item => item.index));
    return rows.filter((session, index) => !generatedWelcomeSignature(session) || keep.has(index));
}
function collectConversationSearchSources() {
    const tasks = new Map((0, db_1.loadTasks)().map((task) => [String(task.id || ""), task]));
    const sources = [];
    if (fs.existsSync(WEB_SESSIONS_DIR)) {
        const rootReal = fs.realpathSync(WEB_SESSIONS_DIR);
        for (const project of fs.readdirSync(WEB_SESSIONS_DIR)) {
            const projectDir = path.join(WEB_SESSIONS_DIR, project);
            try {
                const stat = fs.lstatSync(projectDir);
                if (!stat.isDirectory() || stat.isSymbolicLink())
                    continue;
                const real = fs.realpathSync(projectDir);
                if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`))
                    continue;
            }
            catch {
                continue;
            }
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
    for (const group of (0, storage_1.loadGroups)()) {
        const groupId = String(group.id || "");
        if (!groupId)
            continue;
        for (const session of (0, storage_1.listGroupChatSessions)(groupId).sessions || []) {
            const sessionId = String(session.id || "");
            sources.push(sourceRow({ conversationType: "group", groupId, groupName: group.name || groupId, sessionId, sessionName: session.title || sessionId, updatedAt: session.updatedAt, sourceIdentity: `group:${groupId}:${sessionId}` }, (0, storage_1.getGroupMessages)(groupId, sessionId), tasks));
        }
    }
    const globalHistory = readJson(GLOBAL_AGENT_HISTORY_FILE, null);
    if (globalHistory) {
        for (const session of collapseGeneratedGlobalWelcomeSessions(globalHistory.sessions || [])) {
            const sessionId = String(session.id || "");
            if (!sessionId)
                continue;
            sources.push(sourceRow({ conversationType: "global", sessionId, sessionName: session.name || "全局助手会话", updatedAt: session.updated_at || session.updatedAt, sourceIdentity: `global:${sessionId}` }, Array.isArray(session.messages) ? session.messages : session.history, tasks));
        }
    }
    else if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
        sources.push({ sourceIdentity: "global:store", scopeType: "global", scopeId: "global", sessionId: "", sourceChecksum: "", status: "degraded", errorSummary: "全局会话文件无法解析", records: [] });
    }
    const music = (0, memory_1.loadMusicAgentMemory)();
    sources.push(sourceRow({ conversationType: "music", sessionId: memory_1.MUSIC_AGENT_SINGLETON_ID, sessionName: "音乐助手", sourceIdentity: `music:${memory_1.MUSIC_AGENT_SINGLETON_ID}` }, music.transcript || [], tasks));
    return sources;
}
function shortTerms(content) {
    const chars = Array.from(String(content || "").toLowerCase().normalize("NFKC"));
    const terms = new Set();
    for (let index = 0; index < chars.length; index += 1) {
        if (!/\s/u.test(chars[index]))
            terms.add(chars[index]);
        if (index + 1 < chars.length && !/\s/u.test(chars[index]) && !/\s/u.test(chars[index + 1]))
            terms.add(`${chars[index]}${chars[index + 1]}`);
        if (terms.size >= 12_000)
            break;
    }
    return [...terms];
}
function buildConversationSearchIndexSync() {
    const sources = collectConversationSearchSources();
    const manifestChecksum = sha(sources.map(source => ({ identity: source.sourceIdentity, checksum: source.sourceChecksum, status: source.status })));
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const active = db.prepare("SELECT * FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get();
    if (active?.source_manifest_checksum === manifestChecksum && Number(active.message_count || 0) === sources.reduce((sum, source) => sum + source.records.length, 0)) {
        (0, conversation_search_dirty_1.clearConversationSearchIndexDirty)({ checkedAt: new Date().toISOString(), reason: "unchanged" });
        return { success: true, unchanged: true, generation: active.generation, message_count: active.message_count, source_count: active.source_count };
    }
    const generation = `csi_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`;
    const now = new Date().toISOString();
    db.prepare("INSERT INTO conversation_search_generations_v3(generation,status,active,created_at,updated_at,source_manifest_checksum) VALUES(?,?,?,?,?,?)")
        .run(generation, "building", 0, now, now, manifestChecksum);
    try {
        (0, observability_database_1.withImmediateObservabilityTransaction)((tx) => {
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
                    for (const term of shortTerms(record.content))
                        insertTerm.run(generation, record.rowId, term);
                    messageCount += 1;
                }
            }
            tx.prepare("UPDATE conversation_search_generations_v3 SET active=0 WHERE active=1").run();
            tx.prepare("UPDATE conversation_search_generations_v3 SET status='ready',active=1,completed_at=?,updated_at=?,source_count=?,message_count=?,degraded_source_count=? WHERE generation=?")
                .run(now, now, sources.length, messageCount, sources.filter(source => source.status === "degraded").length, generation);
            const old = tx.prepare("SELECT generation FROM conversation_search_generations_v3 WHERE active=0 AND status='ready' ORDER BY completed_at DESC LIMIT -1 OFFSET 2").all();
            for (const row of old) {
                tx.prepare("DELETE FROM conversation_search_messages_v3 WHERE generation=?").run(row.generation);
                tx.prepare("DELETE FROM conversation_search_fts_v3 WHERE generation=?").run(row.generation);
                tx.prepare("DELETE FROM conversation_search_short_terms_v3 WHERE generation=?").run(row.generation);
                tx.prepare("DELETE FROM conversation_search_sources_v3 WHERE generation=?").run(row.generation);
                tx.prepare("DELETE FROM conversation_search_generations_v3 WHERE generation=?").run(row.generation);
            }
        });
        (0, conversation_search_dirty_1.clearConversationSearchIndexDirty)({ indexedAt: now, generation });
        return { success: true, generation, source_count: sources.length, message_count: sources.reduce((sum, source) => sum + source.records.length, 0), degraded_source_count: sources.filter(source => source.status === "degraded").length };
    }
    catch (error) {
        db.prepare("UPDATE conversation_search_generations_v3 SET status='failed',updated_at=?,error_summary=? WHERE generation=?").run(new Date().toISOString(), String(error?.message || error).slice(0, 800), generation);
        throw error;
    }
}
function getConversationSearchIndexStatus() {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const active = db.prepare("SELECT * FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get();
    const latest = db.prepare("SELECT * FROM conversation_search_generations_v3 ORDER BY created_at DESC LIMIT 1").get();
    const dirty = (0, conversation_search_dirty_1.conversationSearchDirtyState)({ dirty: !active });
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
function startConversationSearchIndexBuild(options = {}) {
    const status = getConversationSearchIndexStatus();
    if (buildProcess)
        return { accepted: false, reason: "already_building", ...status };
    if (!options.force && status.ready && status.stale !== true)
        return { accepted: false, reason: "up_to_date", ...status };
    const child = (0, child_process_1.spawn)(process.execPath, [__filename, "--conversation-search-worker"], {
        env: { ...process.env, CCM_CONVERSATION_SEARCH_WORKER: "1", CCM_CONVERSATION_SEARCH_REASON: options.reason || "scheduled" },
        stdio: ["ignore", "ignore", "pipe", "ipc"],
        windowsHide: true,
    });
    buildProcess = child;
    child.stderr?.on("data", data => console.warn(`[会话搜索索引] ${String(data).trim().slice(0, 800)}`));
    child.once("exit", () => { if (buildProcess === child)
        buildProcess = null; });
    return { accepted: true, pid: child.pid, ...status };
}
function startConversationSearchIndexScheduler() {
    if (scheduler)
        return;
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)("startup_validation");
    startConversationSearchIndexBuild({ reason: "startup" });
    let validationTick = 0;
    scheduler = setInterval(() => {
        const status = getConversationSearchIndexStatus();
        validationTick += 1;
        if (!status.ready || status.stale || validationTick % 4 === 0)
            startConversationSearchIndexBuild({ force: validationTick % 4 === 0, reason: status.stale ? "dirty_reconcile" : "periodic_validation" });
    }, 15_000);
    scheduler.unref?.();
}
function stopConversationSearchIndexScheduler() {
    if (scheduler)
        clearInterval(scheduler);
    scheduler = null;
    if (buildProcess && !buildProcess.killed)
        buildProcess.kill();
    buildProcess = null;
}
function activeConversationSearchGeneration() {
    const row = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT generation FROM conversation_search_generations_v3 WHERE active=1 ORDER BY completed_at DESC LIMIT 1").get();
    return String(row?.generation || "");
}
function shortSearchTerm(value) {
    return Array.from(String(value || "").normalize("NFKC").trim()).length < 3;
}
function candidateRowsForTerm(generation, term) {
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const normalized = String(term || "").normalize("NFKC").trim().toLowerCase();
    if (!normalized)
        return [];
    if (shortSearchTerm(normalized)) {
        return db.prepare("SELECT row_id FROM conversation_search_short_terms_v3 WHERE generation=? AND term=?").all(generation, normalized).map(row => String(row.row_id));
    }
    const query = `\"${normalized.replace(/\"/g, '\"\"')}\"`;
    return db.prepare("SELECT row_id FROM conversation_search_fts_v3 WHERE generation=? AND conversation_search_fts_v3 MATCH ?").all(generation, query).map(row => String(row.row_id));
}
function conversationSearchRecordRows(generation, rowIds) {
    if (!rowIds.length)
        return [];
    const db = (0, observability_database_1.getObservabilityDatabase)();
    const rows = [];
    for (let offset = 0; offset < rowIds.length; offset += 500) {
        const page = rowIds.slice(offset, offset + 500);
        rows.push(...db.prepare(`SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND row_id IN (${page.map(() => "?").join(",")})`).all(generation, ...page));
    }
    return rows;
}
function conversationMessageWindow(input) {
    const generation = input.generation || activeConversationSearchGeneration();
    if (!generation)
        return null;
    const db = (0, observability_database_1.getObservabilityDatabase)();
    let target = null;
    if (input.rowId)
        target = db.prepare("SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND row_id=?").get(generation, input.rowId);
    if (!target && input.sessionId && input.messageId)
        target = db.prepare("SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND conversation_type=? AND project_id=? AND group_id=? AND session_id=? AND message_id=?").get(generation, input.conversationType || "", input.project || "", input.groupId || "", input.sessionId, input.messageId);
    if (!target && input.sessionId && Number.isFinite(Number(input.messageIndex)))
        target = db.prepare("SELECT * FROM conversation_search_messages_v3 WHERE generation=? AND conversation_type=? AND project_id=? AND group_id=? AND session_id=? AND message_index=?").get(generation, input.conversationType || "", input.project || "", input.groupId || "", input.sessionId, Number(input.messageIndex));
    if (!target)
        return null;
    const before = Math.max(0, Math.min(50, Number(input.before ?? 12)));
    const after = Math.max(0, Math.min(50, Number(input.after ?? 12)));
    const rows = db.prepare(`SELECT row_id,message_id,message_index,role,agent,content,timestamp,content_checksum FROM conversation_search_messages_v3
    WHERE generation=? AND conversation_type=? AND project_id=? AND group_id=? AND session_id=? AND message_index BETWEEN ? AND ? ORDER BY message_index`)
        .all(generation, target.conversation_type, target.project_id, target.group_id, target.session_id, Math.max(0, target.message_index - before), target.message_index + after);
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
    }
    catch (error) {
        process.send?.({ success: false, error: error?.message || String(error) });
        console.error(error?.stack || error);
        process.exit(1);
    }
}
//# sourceMappingURL=conversation-search-index.js.map