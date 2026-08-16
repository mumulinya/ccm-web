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
exports.WEB_SESSIONS_DIR = void 0;
exports.getProjectSessionDir = getProjectSessionDir;
exports.getSessionFilePath = getSessionFilePath;
exports.findCcSessionFile = findCcSessionFile;
exports.getProjectFeishuSessionTargets = getProjectFeishuSessionTargets;
exports.resolveProjectFeishuTargetForAcpSession = resolveProjectFeishuTargetForAcpSession;
exports.runProjectFeishuSessionSourceSelfTest = runProjectFeishuSessionSourceSelfTest;
exports.syncFromCcToFilesystem = syncFromCcToFilesystem;
exports.syncToFilesystemToCc = syncToFilesystemToCc;
exports.syncSessions = syncSessions;
exports.getSessions = getSessions;
exports.getSessionDetail = getSessionDetail;
exports.replaceProjectSessionConversation = replaceProjectSessionConversation;
exports.writeProjectSessionConversationBranch = writeProjectSessionConversationBranch;
exports.createProjectSessionRecord = createProjectSessionRecord;
exports.applyProjectSessionProvisionalTitle = applyProjectSessionProvisionalTitle;
exports.bindProjectFeishuSession = bindProjectFeishuSession;
exports.ensureProjectAutomationSession = ensureProjectAutomationSession;
exports.appendProjectSessionTaskMessage = appendProjectSessionTaskMessage;
exports.appendProjectSessionLocalCommandRecord = appendProjectSessionLocalCommandRecord;
exports.upsertProjectSessionTaskMessage = upsertProjectSessionTaskMessage;
exports.scheduleProjectSessionAutoTitle = scheduleProjectSessionAutoTitle;
exports.handleSessionsApi = handleSessionsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const project_validation_1 = require("./project-validation");
const db_1 = require("../../core/db");
const session_title_1 = require("../../system/session-title");
const chat_runs_1 = require("../../projects/chat-runs");
const project_session_compaction_1 = require("./project-session-compaction");
const project_session_agent_binding_1 = require("./project-session-agent-binding");
const project_main_agent_1 = require("./project-main-agent");
const runtime_events_1 = require("../../system/runtime-events");
const provider_neutral_context_cache_1 = require("../../system/provider-neutral-context-cache");
const feishu_conversation_v2_1 = require("../collaboration/feishu-conversation-v2");
const conversation_search_dirty_1 = require("../../system/conversation-search-dirty");
const main_agent_post_compact_continuity_1 = require("../../system/main-agent-post-compact-continuity");
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
exports.WEB_SESSIONS_DIR = path.join(utils_1.CCM_DIR, "web-sessions");
function clearProjectMainDynamicContext(project, sessionId) {
    try {
        (0, main_agent_post_compact_continuity_1.clearMainAgentPostCompactContinuity)({
            agentKind: "project",
            scope: "project",
            scopeId: (0, project_validation_1.validateProjectName)(project),
            exactSessionId: (0, project_validation_1.validateSessionId)(sessionId),
            generation: 0,
        });
    }
    catch { }
}
function getProjectSessionDir(projectName) {
    return (0, project_validation_1.resolveContainedPath)(exports.WEB_SESSIONS_DIR, (0, project_validation_1.validateProjectName)(projectName));
}
function getSessionFilePath(projectName, sessionId) {
    return (0, project_validation_1.resolveContainedPath)(getProjectSessionDir(projectName), `${(0, project_validation_1.validateSessionId)(sessionId)}.json`);
}
function requireActiveProject(projectName) {
    const project = (0, project_validation_1.validateProjectName)(projectName);
    const config = (0, db_1.getConfigs)().find((item) => item.name === project);
    if (!config)
        throw new Error("项目不存在或已经归档");
    return { project, config };
}
function ensureWebSessionDir(projectName) {
    const dir = getProjectSessionDir(projectName);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return dir;
}
// 查找 cc-connect 的 session 文件（带 hash 的）
function findCcSessionFile(projectName) {
    const safeProjectName = (0, project_validation_1.validateProjectName)(projectName);
    if (!fs.existsSync(utils_1.SESSIONS_DIR))
        return null;
    const escaped = safeProjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`^${escaped}(?:_[^/\\\\]+)?\\.json$`);
    const files = fs.readdirSync(utils_1.SESSIONS_DIR).filter(f => matcher.test(f) && !fs.statSync((0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, f)).isDirectory());
    const newest = files
        .map((file) => ({ file, mtime: fs.statSync((0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, file)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime || a.file.localeCompare(b.file))[0];
    return newest ? (0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, newest.file) : null;
}
function isFeishuPlatformSessionKey(value) {
    return /^(?:feishu|lark):/i.test(String(value || "").trim());
}
function projectFeishuTargetsFromStore(store, projectName = "selftest-project") {
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
        let identity = null;
        try {
            identity = (0, feishu_conversation_v2_1.buildFeishuConversationIdentityV2)({
                payload: { platform_session_key: platformKey, chat_id: chatId, open_id: openId, thread_id: threadId, root_id: threadId, project: projectName },
                targetType: "project_agent",
                projectId: projectName,
            });
        }
        catch { }
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
function loadProjectCcSessionStore(projectName) {
    const file = findCcSessionFile(projectName);
    if (!file || !fs.existsSync(file))
        return { file: "", store: null, targets: [] };
    try {
        const store = JSON.parse(fs.readFileSync(file, "utf-8"));
        return { file, store, targets: projectFeishuTargetsFromStore(store, projectName) };
    }
    catch {
        return { file, store: null, targets: [] };
    }
}
function projectSessionSource(sessionId, session, targets) {
    const explicit = String(session?.source || session?.channel || "").toLowerCase();
    if (explicit === "feishu")
        return "feishu";
    if (explicit === "web")
        return "web";
    if (targets.some((target) => target.session_ids.includes(sessionId)))
        return "feishu";
    return "web";
}
function getProjectFeishuSessionTargets(projectName) {
    const project = requireActiveProject(projectName).project;
    const { targets } = loadProjectCcSessionStore(project);
    return targets.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
}
function resolveProjectFeishuTargetFromStore(store, targets, acpSessionId) {
    const matchingSessionIds = Object.entries(store?.sessions || {})
        .filter(([, session]) => String(session?.agent_session_id || "") === acpSessionId)
        .map(([sessionId]) => String(sessionId));
    const exact = targets.filter((target) => matchingSessionIds.includes(String(target.active_session_id || "")));
    if (exact.length === 1)
        return { target: exact[0], resolution: "cc_connect_agent_session" };
    if (exact.length > 1)
        throw new Error("ACP 会话同时映射到多个飞书目标，已拒绝路由");
    const bound = targets.filter((target) => String(target.active_session_id || "").trim());
    throw new Error(bound.length ? "尚未建立 ACP 会话与飞书目标的精确映射，请重新绑定当前项目飞书会话" : "当前项目没有已绑定的飞书会话");
}
function resolveProjectFeishuTargetForAcpSession(projectName, acpSessionId) {
    const project = requireActiveProject(projectName).project;
    const safeAcpSessionId = String(acpSessionId || "").trim();
    if (!safeAcpSessionId || safeAcpSessionId.length > 240)
        throw new Error("ACP 会话 ID 无效");
    const { store, targets } = loadProjectCcSessionStore(project);
    if (!store)
        throw new Error("项目 cc-connect 会话存储不存在");
    return resolveProjectFeishuTargetFromStore(store, targets, safeAcpSessionId);
}
function runProjectFeishuSessionSourceSelfTest() {
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
    try {
        resolveProjectFeishuTargetFromStore({ ...store, sessions: {} }, targets, "acp-not-flushed");
    }
    catch {
        missingExactMappingRejected = true;
    }
    let ambiguousMappingRejected = false;
    try {
        const ambiguousStore = { ...store, sessions: {}, active_session: { [groupKey]: "s2", [threadKey]: "s3" } };
        resolveProjectFeishuTargetFromStore(ambiguousStore, projectFeishuTargetsFromStore(ambiguousStore, "project-selftest"), "acp-unknown");
    }
    catch {
        ambiguousMappingRejected = true;
    }
    const checks = {
        extracts_only_project_store_targets: targets.length === 2,
        exposes_active_exact_session: targets.find((item) => item.id === groupKey)?.active_session_id === "s2",
        uses_real_chat_name: targets.find((item) => item.id === groupKey)?.label === "项目协作群",
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
function syncFromCcToFilesystem(projectName) {
    const ccFile = findCcSessionFile(projectName);
    if (!ccFile || !fs.existsSync(ccFile))
        return;
    try {
        const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
        const targets = projectFeishuTargetsFromStore(data, projectName);
        const dir = ensureWebSessionDir(projectName);
        for (const [sid, session] of Object.entries(data.sessions || {})) {
            const rawSession = session;
            const sessionData = {
                ...rawSession,
                source: projectSessionSource(sid, rawSession, targets),
                feishu_platform_keys: targets.filter((target) => target.session_ids.includes(sid)).map((target) => target.id),
            };
            const filePath = getSessionFilePath(projectName, (0, project_validation_1.validateSessionId)(sid));
            // 只更新有变化的
            const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : null;
            if (Array.isArray(existing?.execution_history)) {
                sessionData.execution_history_version = Number(existing.execution_history_version || 1);
                sessionData.execution_history = existing.execution_history;
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
            if (!ccSids.has(fid))
                fs.unlinkSync((0, project_validation_1.resolveContainedPath)(dir, f));
        }
    }
    catch { }
}
// 从文件夹格式同步回 cc-connect 单文件
function syncToFilesystemToCc(projectName) {
    const ccFile = findCcSessionFile(projectName);
    if (!ccFile)
        return;
    try {
        const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
        ccData.sessions = ccData.sessions || {};
        const dir = getProjectSessionDir(projectName);
        if (!fs.existsSync(dir))
            return;
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
            const sid = f.replace(".json", "");
            const sessionData = JSON.parse(fs.readFileSync((0, project_validation_1.resolveContainedPath)(dir, f), "utf-8"));
            const { execution_history, executionHistory, execution_history_version, ...sharedSessionData } = sessionData;
            ccData.sessions[sid] = sharedSessionData;
        }
        // 更新 counter
        const maxNum = Math.max(0, ...Object.keys(ccData.sessions).map(s => parseInt(s.replace("s", "")) || 0));
        ccData.counter = maxNum + 1;
        fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
    }
    catch { }
}
// 双向同步
function syncSessions(projectName) {
    syncFromCcToFilesystem(projectName);
}
// 获取会话列表（从文件夹读取）
function getSessions(projectName) {
    syncSessions(projectName);
    const targets = getProjectFeishuSessionTargets(projectName);
    const dir = getProjectSessionDir(projectName);
    if (!fs.existsSync(dir))
        return [];
    const automatedSessionIds = new Set((0, db_1.loadTasks)()
        .filter((task) => String(task?.target_project || "") === String(projectName || ""))
        .map((task) => String(task?.project_session_id || task?.exact_session_id || ""))
        .filter(Boolean));
    return fs.readdirSync(dir)
        .filter(f => f.endsWith(".json"))
        .map(f => {
        try {
            const data = JSON.parse(fs.readFileSync((0, project_validation_1.resolveContainedPath)(dir, f), "utf-8"));
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
                session_kind: String(data.session_kind || data.sessionKind || "").toLowerCase() === "automation" || automatedSessionIds.has(String(id))
                    ? "automation"
                    : "conversation",
                feishu_bindings: targets.filter((target) => target.active_session_id === id),
            };
        }
        catch {
            return null;
        }
    })
        .filter(Boolean)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
}
// 获取会话详情
function getSessionDetail(projectName, sessionId) {
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
                feishu_bindings: targets.filter((target) => target.active_session_id === sessionId),
                agent_binding: (0, project_session_agent_binding_1.getProjectSessionAgentBinding)(projectName, sessionId),
            };
        }
        catch { }
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
                feishu_bindings: targets.filter((target) => target.active_session_id === sessionId),
                agent_binding: (0, project_session_agent_binding_1.getProjectSessionAgentBinding)(projectName, sessionId),
            } : null;
        }
        catch { }
    }
    return null;
}
function sanitizeProjectSessionAttachments(value) {
    return (Array.isArray(value) ? value : []).slice(0, 10).flatMap((item) => {
        if (!item || typeof item !== "object")
            return [];
        const name = path.basename(String(item.name || item.filename || "附件")).slice(0, 180) || "附件";
        const rawUrl = String(item.upload_url || item.uploadUrl || "").trim();
        const uploadUrl = rawUrl.startsWith("/api/uploads/") ? rawUrl.slice(0, 2048) : "";
        return [{
                id: String(item.id || item.feishuAttachmentId || "").slice(0, 160),
                name,
                size: Math.max(0, Number(item.size || 0)),
                type: String(item.type || item.mimeType || item.contentType || "application/octet-stream").slice(0, 128),
                checksum: String(item.checksum || "").slice(0, 128),
                status: String(item.status || "received").slice(0, 40),
                contentStored: false,
                ...(uploadUrl ? { upload_url: uploadUrl } : {}),
            }];
    });
}
function normalizeWebSessionMessage(message) {
    const input = message && typeof message === "object" ? message : {};
    const safe = {
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
        "prePlanClarification",
        "pre_plan_clarification",
        "clarificationSummary",
        "clarification_summary",
        "clarificationContext",
        "clarification_context",
        "businessDecision",
        "business_decision",
        "task_id",
        "run_id",
        "taskExperience",
        "fileChanges",
        "workEvents",
        "projectRun",
        "agenticRun",
        "managementReceipt",
        "provider_usage",
        "interruption",
        "source",
        "type",
        "commandResult",
        "localCommandRecord",
        "modelVisible",
    ]) {
        if (Object.prototype.hasOwnProperty.call(input, key))
            safe[key] = input[key];
    }
    const attachments = sanitizeProjectSessionAttachments(input.files || input.attachments);
    if (attachments.length)
        safe.files = attachments;
    return safe;
}
function replaceProjectSessionConversation(projectInput, sessionIdInput, messages, reason = "会话历史被受控替换") {
    const project = (0, project_validation_1.validateProjectName)(projectInput);
    const sessionId = (0, project_validation_1.validateSessionId)(sessionIdInput);
    if (!Array.isArray(messages) || messages.length > 10_000)
        throw new Error("会话消息数量无效");
    const filePath = getSessionFilePath(project, sessionId);
    if (!fs.existsSync(filePath))
        throw new Error("会话不存在");
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    (0, project_main_agent_1.cancelProjectMainTasksForSession)(project, sessionId, reason);
    data.history = messages.map(normalizeWebSessionMessage);
    data.execution_history = [];
    clearProjectMainDynamicContext(project, sessionId);
    const rotation = (0, project_session_agent_binding_1.rotateProjectSessionAgentBinding)(project, sessionId, reason);
    delete data.compaction;
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    syncToFilesystemToCc(project);
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${project}:${sessionId}`);
    return { project, sessionId, count: data.history.length, generation: rotation.nextGeneration, data };
}
function writeProjectSessionConversationBranch(projectInput, name, messages) {
    const created = createProjectSessionRecord(projectInput, name, "web");
    const filePath = getSessionFilePath(created.project, created.sessionId);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    data.history = messages.map(normalizeWebSessionMessage);
    data.title_origin = "manual";
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    syncToFilesystemToCc(created.project);
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${created.project}:${created.sessionId}`);
    return { ...created, data };
}
function messageMatchesDeleteSelector(message, selector, index) {
    if (!message || !selector)
        return false;
    const id = String(selector.id || selector.message_id || "").trim();
    const taskId = String(selector.task_id || selector.taskId || "").trim();
    const timestamp = String(selector.timestamp || "").trim();
    if (id && String(message.id || message.message_id || "") === id)
        return true;
    if (taskId && String(message.task_id || message.taskExperience?.task_id || message.run_id || "") === taskId)
        return true;
    if (timestamp && String(message.timestamp || "") === timestamp)
        return true;
    if (Number.isInteger(selector.index) && selector.index === index)
        return true;
    return false;
}
function getNextSessionId(projectName) {
    const dir = getProjectSessionDir(projectName);
    const nums = [];
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).filter(f => f.endsWith(".json")).forEach(f => nums.push(parseInt(f.replace("s", "").replace(".json", "")) || 0));
    }
    const ccFile = findCcSessionFile(projectName);
    if (ccFile) {
        try {
            const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            Object.keys(data.sessions || {}).forEach(s => nums.push(parseInt(s.replace("s", "")) || 0));
            Object.values(data.active_session || {}).forEach((s) => nums.push(parseInt(String(s).replace("s", "")) || 0));
            Object.values(data.user_sessions || {}).flatMap((values) => Array.isArray(values) ? values : [])
                .forEach((s) => nums.push(parseInt(String(s).replace("s", "")) || 0));
        }
        catch { }
    }
    return `s${nums.length > 0 ? Math.max(...nums) + 1 : 1}`;
}
const projectSessionTitleJobs = new Map();
function createProjectSessionRecord(projectName, name = "", source = "web", options = {}) {
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
        title_origin: (0, session_title_1.isSessionTitlePlaceholder)(sessionName) ? "placeholder" : "manual",
        agent_type: "claudecode",
        history: [],
        created_at: now,
        updated_at: now,
        source: normalizedSource,
        session_kind: normalizedSource === "feishu"
            ? "conversation"
            : String(options.sessionKind || options.session_kind || "").toLowerCase() === "automation"
                ? "automation"
                : "conversation",
    };
    fs.writeFileSync(getSessionFilePath(safeProject, sessionId), JSON.stringify(sessionData, null, 2));
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${safeProject}:${sessionId}`);
    syncToFilesystemToCc(safeProject);
    return { project: safeProject, sessionId, name: sessionName, source: normalizedSource, session_kind: sessionData.session_kind, created: true };
}
function applyProjectSessionProvisionalTitle(project, sessionId, message) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const filePath = getSessionFilePath(safeProject, safeSessionId);
    if (!fs.existsSync(filePath))
        return { renamed: false, reason: "session_missing" };
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!(0, session_title_1.isSessionTitleAutoReplaceable)(data.name, data.title_origin || data.titleOrigin)) {
        return { renamed: false, reason: "title_not_replaceable", name: data.name };
    }
    const files = message?.files || message?.attachments || [];
    const generated = (0, session_title_1.generateProvisionalSessionTitle)({
        scope: "project",
        userMessage: String(message?.content || ""),
        attachmentNames: files.map((file) => String(file?.name || file?.filename || "")).filter(Boolean),
    });
    if (!generated.title)
        return { renamed: false, reason: "title_input_skipped", name: data.name, generated };
    const now = new Date().toISOString();
    data.name = generated.title;
    data.title_origin = "provisional";
    data.title_provisional_at = now;
    data.updated_at = now;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${safeProject}:${safeSessionId}`);
    syncToFilesystemToCc(safeProject);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.session_title_changed", {
        project: safeProject,
        sessionId: safeSessionId,
        source: "project-session-provisional-title",
    });
    return { renamed: true, name: data.name, generated };
}
function bindProjectFeishuSession(projectName, sessionId, targetId, action = "bind") {
    const project = requireActiveProject(projectName).project;
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const filePath = getSessionFilePath(project, safeSessionId);
    if (!fs.existsSync(filePath))
        throw new Error("项目会话不存在");
    const { file, store, targets } = loadProjectCcSessionStore(project);
    if (!file || !store)
        throw new Error("项目尚未创建 cc-connect 会话存储，请先连接 Agent/飞书通道");
    const target = targets.find((item) => item.id === String(targetId || ""));
    if (!target)
        throw new Error("飞书目标不属于当前项目或尚未被发现");
    const session = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const source = projectSessionSource(safeSessionId, session, targets);
    if (action === "bind" && source !== "feishu")
        throw new Error("只能将飞书目标绑定到飞书会话");
    store.active_session = store.active_session || {};
    store.user_sessions = store.user_sessions || {};
    if (action === "unbind") {
        if (String(store.active_session[target.id] || "") === safeSessionId)
            delete store.active_session[target.id];
    }
    else {
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
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.feishu_session_binding_changed", {
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
        target: getProjectFeishuSessionTargets(project).find((item) => item.id === target.id) || null,
    };
}
function ensureProjectAutomationSession(projectName, requestedSessionId = "", title = "自动开发任务") {
    const safeProject = requireActiveProject(projectName).project;
    const sessionId = String(requestedSessionId || "").trim();
    if (!sessionId)
        return createProjectSessionRecord(safeProject, title, "web", { sessionKind: "automation" });
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const existing = getSessionDetail(safeProject, safeSessionId);
    if (!existing)
        throw new Error("指定的项目会话不存在");
    return { project: safeProject, sessionId: safeSessionId, name: existing.name || safeSessionId, created: false };
}
function appendProjectSessionTaskMessage(projectName, sessionId, message) {
    const safeProject = requireActiveProject(projectName).project;
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const filePath = getSessionFilePath(safeProject, safeSessionId);
    if (!fs.existsSync(filePath))
        throw new Error("项目会话不存在");
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const normalized = normalizeWebSessionMessage(message);
    data.history = Array.isArray(data.history) ? data.history : [];
    if (!data.history.some((item) => String(item.id || "") === normalized.id))
        data.history.push(normalized);
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${safeProject}:${safeSessionId}`);
    syncToFilesystemToCc(safeProject);
    if (normalized.role === "user") {
        try {
            applyProjectSessionProvisionalTitle(safeProject, safeSessionId, normalized);
        }
        catch (error) {
            console.warn(`[项目会话] 临时命名失败 (${safeProject}/${safeSessionId})：${error?.message || error}`);
        }
    }
    const hasStoredUserTitleInput = data.history.some((item) => item?.role === "user"
        && ((0, session_title_1.isMeaningfulSessionTitleInput)(item?.content) || (item?.files || item?.attachments || []).length));
    if (normalized.role === "assistant" && String(normalized.content || "").trim() && hasStoredUserTitleInput) {
        void scheduleProjectSessionAutoTitle(safeProject, safeSessionId).catch((error) => {
            console.warn(`[项目会话] 自动命名失败 (${safeProject}/${safeSessionId})：${error?.message || error}`);
        });
    }
    return normalized;
}
/** Append a CCM-local transcript record without triggering title generation or
 * rotating the task/session generation. Local slash commands are deliberately
 * invisible to the model and must not disturb an active Agent run. */
function appendProjectSessionLocalCommandRecord(projectName, sessionId, message) {
    const safeProject = requireActiveProject(projectName).project;
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const filePath = getSessionFilePath(safeProject, safeSessionId);
    if (!fs.existsSync(filePath))
        throw new Error("项目会话不存在");
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const normalized = normalizeWebSessionMessage({ ...message, modelVisible: false, type: "command_result" });
    data.history = Array.isArray(data.history) ? data.history : [];
    if (!data.history.some((item) => String(item.id || "") === normalized.id))
        data.history.push(normalized);
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${safeProject}:${safeSessionId}`);
    syncToFilesystemToCc(safeProject);
    return normalized;
}
function upsertProjectSessionTaskMessage(projectName, sessionId, message) {
    const safeProject = requireActiveProject(projectName).project;
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const filePath = getSessionFilePath(safeProject, safeSessionId);
    if (!fs.existsSync(filePath))
        throw new Error("项目会话不存在");
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const normalized = normalizeWebSessionMessage(message);
    const taskId = String(normalized.task_id || normalized.taskExperience?.task_id || "").trim();
    data.history = Array.isArray(data.history) ? data.history : [];
    const existingIndex = data.history.findIndex((item) => {
        if (String(item?.id || "") === normalized.id)
            return true;
        if (!taskId)
            return false;
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
    }
    else {
        data.history.push(normalized);
    }
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${safeProject}:${safeSessionId}`);
    syncToFilesystemToCc(safeProject);
    (0, runtime_events_1.publishRuntimeEvent)("project", "project.session_messages_changed", {
        project: safeProject,
        sessionId: safeSessionId,
        taskId,
        messageId: existingIndex >= 0 ? String(data.history[existingIndex]?.id || normalized.id) : normalized.id,
        status: String(normalized.taskExperience?.status || normalized.taskExperience?.phase || "changed").slice(0, 40),
        source: "project-main-agent-session-projection",
    });
    if (normalized.role === "user") {
        try {
            applyProjectSessionProvisionalTitle(safeProject, safeSessionId, normalized);
        }
        catch (error) {
            console.warn(`[项目会话] 临时命名失败 (${safeProject}/${safeSessionId})：${error?.message || error}`);
        }
    }
    const hasStoredUserTitleInput = data.history.some((item) => item?.role === "user"
        && ((0, session_title_1.isMeaningfulSessionTitleInput)(item?.content) || (item?.files || item?.attachments || []).length));
    if (normalized.role === "assistant" && String(normalized.content || "").trim() && hasStoredUserTitleInput) {
        void scheduleProjectSessionAutoTitle(safeProject, safeSessionId).catch((error) => {
            console.warn(`[项目会话] 自动命名失败 (${safeProject}/${safeSessionId})：${error?.message || error}`);
        });
    }
    return existingIndex >= 0 ? data.history[existingIndex] : normalized;
}
function scheduleProjectSessionAutoTitle(project, sessionId, options = {}) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeSessionId = (0, project_validation_1.validateSessionId)(sessionId);
    const key = `${safeProject}::${safeSessionId}`;
    const existingJob = projectSessionTitleJobs.get(key);
    if (existingJob)
        return existingJob;
    const job = (async () => {
        const filePath = getSessionFilePath(safeProject, safeSessionId);
        if (!fs.existsSync(filePath))
            return { renamed: false, reason: "session_missing" };
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!(0, session_title_1.isSessionTitleAutoReplaceable)(data.name, data.title_origin || data.titleOrigin))
            return { renamed: false, reason: "title_already_set", name: data.name };
        const history = Array.isArray(data.history) ? data.history : [];
        const userIndex = history.findIndex((message) => message?.role === "user"
            && ((0, session_title_1.isMeaningfulSessionTitleInput)(message?.content) || (message?.files || message?.attachments || []).length));
        const persistedUserMessage = userIndex >= 0 ? history[userIndex] : null;
        const persistedAssistantMessage = userIndex >= 0
            ? history.slice(userIndex + 1).find((message) => message?.role === "assistant" && String(message?.content || "").trim())
            : null;
        const directUserMessage = String(options.turn?.userMessage || "").trim();
        const directAssistantMessage = String(options.turn?.assistantMessage || "").trim();
        const userMessage = persistedUserMessage || ((0, session_title_1.isMeaningfulSessionTitleInput)(directUserMessage) || (options.turn?.attachmentNames || []).length
            ? { content: directUserMessage, files: (options.turn?.attachmentNames || []).map(name => ({ name })) }
            : null);
        if (!userMessage)
            return { renamed: false, reason: "meaningful_user_message_missing", name: data.name };
        const assistantMessage = persistedAssistantMessage || (directAssistantMessage ? { content: directAssistantMessage } : null);
        if (!assistantMessage)
            return { renamed: false, reason: "assistant_reply_missing", name: data.name };
        const files = userMessage.files || userMessage.attachments || [];
        const generated = await (0, session_title_1.generateSessionTitleWithModel)({
            scope: "project",
            userMessage: String(userMessage.content || ""),
            assistantMessage: String(assistantMessage.content || ""),
            attachmentNames: files.map((file) => String(file?.name || file?.filename || "")).filter(Boolean),
        }, options);
        if (!generated.title)
            return { renamed: false, reason: "title_input_skipped", name: data.name, generated };
        const latest = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!(0, session_title_1.isSessionTitleAutoReplaceable)(latest.name, latest.title_origin || latest.titleOrigin))
            return { renamed: false, reason: "title_changed_during_generation", name: latest.name };
        latest.name = generated.title;
        latest.title_origin = generated.source === "model" ? "model" : "fallback";
        latest.title_generated_at = new Date().toISOString();
        latest.updated_at = latest.title_generated_at;
        fs.writeFileSync(filePath, JSON.stringify(latest, null, 2));
        (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`project:${safeProject}:${safeSessionId}`);
        syncToFilesystemToCc(safeProject);
        (0, runtime_events_1.publishRuntimeEvent)("project", "project.session_title_changed", {
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
function handleSessionsApi(pathname, req, res, parsed) {
    if (pathname === "/api/sessions/feishu-targets" && req.method === "GET") {
        try {
            const project = (0, project_validation_1.validateProjectName)(parsed?.query?.project || "");
            const acpSessionId = String(parsed?.query?.acp_session_id || parsed?.query?.acpSessionId || "").trim();
            const resolved = acpSessionId ? resolveProjectFeishuTargetForAcpSession(project, acpSessionId) : null;
            (0, utils_1.sendJson)(res, {
                success: true,
                project,
                targets: getProjectFeishuSessionTargets(project),
                resolved_target: resolved?.target || null,
                resolution: resolved?.resolution || "",
            });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e?.message || "读取项目飞书目标失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/sessions/feishu-bind" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = bindProjectFeishuSession(payload.project, payload.sessionId || payload.session_id, payload.targetId || payload.target_id, payload.action === "unbind" ? "unbind" : "bind");
                (0, utils_1.sendJson)(res, { success: true, ...result, targets: getProjectFeishuSessionTargets(payload.project) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e?.message || "更新项目飞书会话绑定失败" }, 400);
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
                (0, utils_1.sendJson)(res, { success: true, sessionId: created.sessionId, name: created.name, source: String(source || "web") === "feishu" ? "feishu" : "web", session_kind: created.session_kind || "conversation", binding });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                if (!project || !sessionId || !message)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                if (!data.history)
                    data.history = [];
                const normalizedMessage = normalizeWebSessionMessage(message);
                const duplicate = normalizedMessage.id && data.history.some((item) => String(item?.id || "") === String(normalizedMessage.id));
                if (!duplicate)
                    data.history.push(normalizedMessage);
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                let provisionalTitle = null;
                if (!duplicate && normalizedMessage.role === "user") {
                    provisionalTitle = applyProjectSessionProvisionalTitle(project, sessionId, normalizedMessage);
                }
                if (normalizedMessage.role === "assistant") {
                    (0, project_session_compaction_1.scheduleProjectSessionMemoryExtraction)(project, sessionId);
                    void scheduleProjectSessionAutoTitle(project, sessionId).catch((error) => {
                        console.warn(`[项目会话] 自动命名失败 (${project}/${sessionId})：${error?.message || error}`);
                    });
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    count: data.history.length,
                    name: provisionalTitle?.name || data.name,
                    title_origin: provisionalTitle?.renamed ? "provisional" : data.title_origin || "",
                    duplicate,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                if (!project || !sessionId)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const before = Array.isArray(data.history) ? data.history.length : 0;
                const removedIds = new Set((Array.isArray(data.history) ? data.history : [])
                    .filter((message, index) => messageMatchesDeleteSelector(message, payload, index))
                    .map((message) => String(message?.id || message?.message_id || ""))
                    .filter(Boolean));
                data.history = (Array.isArray(data.history) ? data.history : []).filter((message, index) => !messageMatchesDeleteSelector(message, payload, index));
                const deleted = before - data.history.length;
                if (deleted > 0)
                    (0, project_main_agent_1.cancelProjectMainTasksForSession)(project, sessionId, "项目会话消息被删除，取消未完成的项目主 Agent 任务");
                const rotation = deleted > 0 ? (0, project_session_agent_binding_1.rotateProjectSessionAgentBinding)(project, sessionId, "项目会话消息删除，压缩边界失效") : null;
                if (deleted > 0) {
                    clearProjectMainDynamicContext(project, sessionId);
                    delete data.compaction;
                    data.execution_history = (Array.isArray(data.execution_history) ? data.execution_history : [])
                        .filter((event) => !removedIds.has(String(event?.anchorMessageId || event?.anchor_message_id || "")));
                }
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, deleted, count: data.history.length, binding_generation: rotation?.nextGeneration || 0 });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                if (!project || !sessionId || !Array.isArray(payload.messages))
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                if (payload.messages.length > 10000)
                    return (0, utils_1.sendJson)(res, { error: "单个会话消息数量不能超过 10000 条" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const before = Array.isArray(data.history) ? data.history.length : 0;
                (0, project_main_agent_1.cancelProjectMainTasksForSession)(project, sessionId, "项目会话消息被替换，取消未完成的项目主 Agent 任务");
                data.history = payload.messages.map(normalizeWebSessionMessage);
                data.execution_history = [];
                clearProjectMainDynamicContext(project, sessionId);
                const rotation = (0, project_session_agent_binding_1.rotateProjectSessionAgentBinding)(project, sessionId, "项目会话消息替换，压缩边界失效");
                delete data.compaction;
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, replaced: before, count: data.history.length, binding_generation: rotation.nextGeneration });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                if (!project || !sessionId)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const cleared = Array.isArray(data.history) ? data.history.length : 0;
                (0, project_main_agent_1.cancelProjectMainTasksForSession)(project, sessionId, "用户清空项目会话，取消未完成的项目主 Agent 任务");
                const rotation = (0, project_session_agent_binding_1.rotateProjectSessionAgentBinding)(project, sessionId, "用户清空项目会话");
                data.history = [];
                data.execution_history = [];
                clearProjectMainDynamicContext(project, sessionId);
                delete data.compaction;
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, cleared, binding_generation: rotation.nextGeneration, closed_agent_sessions: rotation.closed.length });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/compact" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const project = (0, project_validation_1.validateProjectName)(payload.project);
                const sessionId = (0, project_validation_1.validateSessionId)(payload.sessionId || payload.session_id);
                const result = await (0, project_session_compaction_1.compactProjectSessionWithModel)(project, sessionId, {
                    force: true,
                    reason: "manual_slash_compact",
                    customInstructions: String(payload.customInstructions || payload.custom_instructions || "").trim(),
                });
                if (result?.compacted === true)
                    (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
                        eventId: `project-compact:${sessionId}:${String(result?.boundary?.id || Date.now())}`,
                        scope: "project", scopeId: project, exactSessionId: sessionId,
                        generation: Number(result?.boundary?.generation || result?.boundaryGeneration || 0),
                        eventType: "context_compacted",
                        display: { title: "上下文已压缩", summary: "压缩完成，当前会话可以继续工作", status: "success" },
                    });
                (0, utils_1.sendJson)(res, { success: true, project, session_id: sessionId, mode: "model_required", ...result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e?.message || "项目会话压缩失败" }, 400);
            }
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
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                (0, project_main_agent_1.cancelProjectMainTasksForSession)(project, sessionId, "用户删除项目会话，取消未完成的项目主 Agent 任务");
                const bindingCleanup = (0, project_session_agent_binding_1.purgeProjectSessionAgentBinding)(project, sessionId);
                const runCleanup = (0, chat_runs_1.purgeProjectChatRunsForSession)(project, sessionId);
                fs.unlinkSync(filePath);
                clearProjectMainDynamicContext(project, sessionId);
                let contextCacheCleanup = null;
                try {
                    contextCacheCleanup = (0, provider_neutral_context_cache_1.invalidateProviderNeutralContextCacheState)({
                        scope: "project",
                        scopeId: project,
                        sessionId,
                    }, "project_session_deleted");
                }
                catch { }
                const ccFile = findCcSessionFile(project);
                if (ccFile) {
                    try {
                        const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
                        delete data.sessions[sessionId];
                        for (const [k, v] of Object.entries(data.active_session || {})) {
                            if (v === sessionId)
                                delete data.active_session[k];
                        }
                        for (const [k, values] of Object.entries(data.user_sessions || {})) {
                            if (!Array.isArray(values))
                                continue;
                            data.user_sessions[k] = values.filter((value) => String(value) !== String(sessionId));
                        }
                        fs.writeFileSync(ccFile, JSON.stringify(data, null, 2));
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    removed_agent_sessions: bindingCleanup.removed.length,
                    removed_project_runs: runCleanup.removed.length,
                    context_cache_invalidated: contextCacheCleanup?.success === true,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                if (!safeName || safeName.length > 80)
                    return (0, utils_1.sendJson)(res, { error: "会话名称应为 1 到 80 个字符" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
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
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
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
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const result = await scheduleProjectSessionAutoTitle(project, sessionId);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                (0, utils_1.sendJson)(res, { success: true, name: data.name, title_source: data.title_origin || "", renamed: result.renamed === true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=sessions.js.map