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
exports.loadGroups = loadGroups;
exports.saveGroups = saveGroups;
exports.getGroupChatSessionMessagesFile = getGroupChatSessionMessagesFile;
exports.listGroupChatSessions = listGroupChatSessions;
exports.getActiveGroupChatSessionId = getActiveGroupChatSessionId;
exports.invalidateGroupMembershipContext = invalidateGroupMembershipContext;
exports.resolveWritableGroupChatSession = resolveWritableGroupChatSession;
exports.findGroupChatSessionContainingMessage = findGroupChatSessionContainingMessage;
exports.createGroupChatSession = createGroupChatSession;
exports.selectGroupChatSession = selectGroupChatSession;
exports.renameGroupChatSession = renameGroupChatSession;
exports.applyGroupSessionProvisionalTitle = applyGroupSessionProvisionalTitle;
exports.scheduleGroupSessionAutoTitle = scheduleGroupSessionAutoTitle;
exports.archiveGroupChatSession = archiveGroupChatSession;
exports.findActiveGroupSessionTasks = findActiveGroupSessionTasks;
exports.reconcileGroupSessionLifecycleAgentCancellations = reconcileGroupSessionLifecycleAgentCancellations;
exports.deleteGroupChatSession = deleteGroupChatSession;
exports.purgeLegacyDefaultGroupChatSession = purgeLegacyDefaultGroupChatSession;
exports.pruneArchivedGroupChatSessions = pruneArchivedGroupChatSessions;
exports.registerGroupMessageAppendHook = registerGroupMessageAppendHook;
exports.resolveGroupMessageSessionId = resolveGroupMessageSessionId;
exports.getGroupMessages = getGroupMessages;
exports.appendGroupMessage = appendGroupMessage;
exports.saveGroupMessages = saveGroupMessages;
exports.runGroupChatSessionsSelfTest = runGroupChatSessionsSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const conversation_search_dirty_1 = require("../../system/conversation-search-dirty");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const execution_kernel_1 = require("../../agents/execution-kernel");
const provider_neutral_context_cache_1 = require("../../system/provider-neutral-context-cache");
const runtime_events_1 = require("../../system/runtime-events");
const session_title_1 = require("../../system/session-title");
const group_orchestrator_1 = require("./group-orchestrator");
const session_task_timeline_1 = require("../../tasks/session-task-timeline");
const session_compaction_runs_1 = require("../../system/session-compaction-runs");
const session_start_hook_context_1 = require("../../system/session-start-hook-context");
const group_post_turn_summary_1 = require("./group-post-turn-summary");
const group_session_lifecycle_head_1 = require("./group-session-lifecycle-head");
const post_turn_tool_context_compaction_1 = require("../../system/post-turn-tool-context-compaction");
const pre_request_tool_context_1 = require("../../system/pre-request-tool-context");
// === 群聊管理 ===
function loadGroups() {
    if (!fs.existsSync(utils_1.GROUPS_FILE))
        return [];
    try {
        const groups = JSON.parse(fs.readFileSync(utils_1.GROUPS_FILE, "utf-8"));
        if (!Array.isArray(groups))
            return [];
        const before = JSON.stringify(groups);
        const normalized = groups.map(group_orchestrator_1.normalizeGroupOrchestrator);
        if (JSON.stringify(normalized) !== before) {
            saveGroups(normalized);
        }
        return normalized;
    }
    catch {
        try {
            const recovered = JSON.parse(fs.readFileSync(`${utils_1.GROUPS_FILE}.bak`, "utf-8"));
            if (Array.isArray(recovered))
                return recovered.map(group_orchestrator_1.normalizeGroupOrchestrator);
        }
        catch { }
        return [];
    }
}
function saveGroups(groups) {
    const content = JSON.stringify(groups, null, 2);
    if (fs.existsSync(utils_1.GROUPS_FILE)) {
        try {
            if (fs.readFileSync(utils_1.GROUPS_FILE, "utf-8") === content)
                return;
        }
        catch { }
    }
    const temp = `${utils_1.GROUPS_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    if (fs.existsSync(utils_1.GROUPS_FILE)) {
        try {
            fs.copyFileSync(utils_1.GROUPS_FILE, `${utils_1.GROUPS_FILE}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, content, "utf-8");
    replaceFileWithWindowsRetry(temp, utils_1.GROUPS_FILE);
}
const groupMessagesCache = new Map();
var groupMessageAppendHooks = null;
function replaceFileWithWindowsRetry(temp, file) {
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt++) {
        try {
            fs.renameSync(temp, file);
            return;
        }
        catch (error) {
            lastError = error;
            if (!['EPERM', 'EACCES', 'EBUSY', 'EEXIST'].includes(String(error?.code || '')))
                throw error;
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * (attempt + 1));
        }
    }
    for (let attempt = 0; attempt < 12; attempt++) {
        try {
            if (fs.existsSync(file))
                fs.unlinkSync(file);
            fs.renameSync(temp, file);
            return;
        }
        catch (error) {
            lastError = error;
            if (!['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOENT'].includes(String(error?.code || '')))
                break;
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
        }
    }
    try {
        if (fs.existsSync(temp))
            fs.unlinkSync(temp);
    }
    catch { }
    throw lastError || new Error(`无法替换文件：${file}`);
}
function getGroupMessageAppendHooks() {
    if (!groupMessageAppendHooks)
        groupMessageAppendHooks = new Set();
    return groupMessageAppendHooks;
}
const GROUP_DEFAULT_SESSION_ID = "default";
const GROUP_MESSAGE_SESSIONS_DIR = path.join(utils_1.GROUP_MESSAGES_DIR, "sessions");
function cleanGroupSessionPathPart(value) {
    return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}
function getGroupSessionManifestFile(groupId) {
    return path.join(GROUP_MESSAGE_SESSIONS_DIR, cleanGroupSessionPathPart(groupId), "manifest.json");
}
function getGroupSessionMessagesFile(groupId, sessionId) {
    if (!sessionId || sessionId === GROUP_DEFAULT_SESSION_ID)
        return path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`);
    return path.join(GROUP_MESSAGE_SESSIONS_DIR, cleanGroupSessionPathPart(groupId), `${cleanGroupSessionPathPart(sessionId)}.json`);
}
function getGroupChatSessionMessagesFile(groupId, sessionId = "") {
    return getGroupSessionMessagesFile(groupId, String(sessionId || getActiveGroupChatSessionId(groupId)));
}
function readGroupSessionManifest(groupId) {
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
    }
    catch {
        return {
            schema: "ccm-group-chat-sessions-v1",
            groupId,
            activeSessionId: GROUP_DEFAULT_SESSION_ID,
            sessions: [],
            updatedAt: "",
        };
    }
}
function writeGroupSessionManifest(groupId, manifest) {
    const file = getGroupSessionManifestFile(groupId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2), "utf-8");
    replaceFileWithWindowsRetry(temp, file);
}
function defaultGroupSessionRecord(groupId) {
    const file = getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID);
    let messageCount = 0;
    let updatedAt = "";
    try {
        const stat = fs.statSync(file);
        updatedAt = stat.mtime.toISOString();
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        messageCount = Array.isArray(parsed) ? parsed.length : 0;
    }
    catch { }
    return {
        id: GROUP_DEFAULT_SESSION_ID,
        title: messageCount ? "历史会话" : "新会话",
        createdAt: updatedAt || new Date().toISOString(),
        updatedAt: updatedAt || new Date().toISOString(),
        messageCount,
        legacy: true,
        session_kind: "conversation",
    };
}
function normalizeGroupSessionKind(groupId, session, automatedSessionIds) {
    const explicit = String(session?.session_kind || session?.sessionKind || session?.purpose || "").trim().toLowerCase();
    if (["automation", "automated_task", "task"].includes(explicit))
        return "automation";
    if (automatedSessionIds.has(String(session?.id || "")))
        return "automation";
    return "conversation";
}
function listGroupChatSessions(groupId) {
    const manifest = readGroupSessionManifest(groupId);
    const legacyExists = fs.existsSync(getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID));
    const automatedSessionIds = new Set((0, db_1.loadTasks)()
        .filter((task) => String(task?.group_id || "") === String(groupId || ""))
        .map((task) => String(task?.group_session_id || task?.exact_session_id || ""))
        .filter(Boolean));
    const sessions = (manifest.sessions.length ? [...manifest.sessions] : [defaultGroupSessionRecord(groupId)])
        .filter((item) => item.id !== GROUP_DEFAULT_SESSION_ID || legacyExists || manifest.activeSessionId === GROUP_DEFAULT_SESSION_ID);
    if ((legacyExists || manifest.activeSessionId === GROUP_DEFAULT_SESSION_ID) && !sessions.some((item) => item.id === GROUP_DEFAULT_SESSION_ID)) {
        sessions.unshift(defaultGroupSessionRecord(groupId));
    }
    return {
        ...manifest,
        sessions: sessions
            .map((session) => ({ ...session, session_kind: normalizeGroupSessionKind(groupId, session, automatedSessionIds) }))
            .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
    };
}
function getActiveGroupChatSessionId(groupId) {
    return readGroupSessionManifest(groupId).activeSessionId || GROUP_DEFAULT_SESSION_ID;
}
function invalidateGroupMembershipContext(groupId, reason = "group_membership_changed") {
    const sessions = listGroupChatSessions(groupId).sessions;
    const results = [];
    for (const session of sessions) {
        const sessionId = String(session?.id || "").trim();
        if (!sessionId)
            continue;
        try {
            const result = (0, provider_neutral_context_cache_1.invalidateProviderNeutralContextCacheState)({
                scope: "group",
                scopeId: groupId,
                sessionId,
            }, reason);
            results.push({ sessionId, success: result.success === true, hotCleared: Number(result.hotCleared || 0) });
        }
        catch (error) {
            results.push({ sessionId, success: false, reason: String(error?.message || error || "context_invalidation_failed").slice(0, 180) });
        }
    }
    return {
        schema: "ccm-group-membership-context-refresh-v1",
        groupId,
        refreshed: results.filter(item => item.success).length,
        failed: results.filter(item => !item.success).length,
        sessions: results,
        refreshedAt: new Date().toISOString(),
    };
}
function resolveWritableGroupChatSession(groupId, requestedSessionId = "", options = {}) {
    const id = String(groupId || "").trim();
    if (!id)
        throw new Error("群聊 ID 不能为空");
    const requested = String(requestedSessionId || "").trim();
    if (!requested && options.createDedicated === true) {
        return createGroupChatSession(id, String(options.title || "自动开发任务"), {
            sessionKind: options.sessionKind || options.session_kind || "automation",
        });
    }
    const manifest = listGroupChatSessions(id);
    const candidateId = requested || String(manifest.activeSessionId || "").trim();
    const candidate = manifest.sessions.find((item) => item.id === candidateId) || null;
    if (candidate && candidate.id.startsWith("gcs_") && candidate.archived !== true)
        return candidate;
    if (requested) {
        if (!candidate)
            throw new Error("群聊会话不存在");
        if (!candidate.id.startsWith("gcs_"))
            throw new Error("旧群聊会话不再接收新任务，请新建会话");
        throw new Error("归档会话为只读状态，请恢复或新建会话后继续");
    }
    if (options.createIfMissing === false) {
        if (candidate?.archived === true)
            throw new Error("归档会话为只读状态，请恢复或新建会话后继续");
        throw new Error("当前群聊没有可写会话，请新建会话");
    }
    return createGroupChatSession(id, String(options.title || "新会话"), {
        sessionKind: options.sessionKind || options.session_kind || "conversation",
    });
}
function findGroupChatSessionContainingMessage(groupId, messageId) {
    const targetId = String(messageId || "").trim();
    if (!targetId)
        return null;
    for (const session of listGroupChatSessions(groupId).sessions) {
        const messages = getGroupMessages(groupId, session.id);
        if (messages.some((message) => String(message?.id || "") === targetId))
            return { session, messages };
    }
    return null;
}
function createGroupChatSession(groupId, title = "", options = {}) {
    const manifest = listGroupChatSessions(groupId);
    const now = new Date().toISOString();
    const id = `gcs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanTitle = String(title || "新会话").trim().slice(0, 80) || "新会话";
    const sessionKind = ["automation", "automated_task", "task"].includes(String(options.sessionKind || options.session_kind || "").toLowerCase())
        ? "automation"
        : "conversation";
    const session = { id, title: cleanTitle, titleOrigin: (0, session_title_1.isSessionTitlePlaceholder)(cleanTitle) ? "placeholder" : "manual", createdAt: now, updatedAt: now, messageCount: 0, legacy: false, session_kind: sessionKind };
    const existingSessions = manifest.sessions.filter((item) => item.id !== GROUP_DEFAULT_SESSION_ID || fs.existsSync(getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID)));
    (0, group_session_lifecycle_head_1.ensureGroupSessionLifecycleHead)(groupId, id, { createdAt: now, reason: "group_chat_session_created" });
    try {
        writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: id, sessions: [...existingSessions, session] });
        saveGroupMessages(groupId, [], id);
    }
    catch (error) {
        try {
            (0, group_session_lifecycle_head_1.transitionGroupSessionLifecycleHead)({ groupId, groupSessionId: id, status: "deleted", reason: "group_chat_session_create_failed" });
        }
        catch { }
        throw error;
    }
    return session;
}
function selectGroupChatSession(groupId, sessionId) {
    const manifest = listGroupChatSessions(groupId);
    const session = manifest.sessions.find((item) => item.id === sessionId);
    if (!session)
        throw new Error("群聊会话不存在");
    writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: session.id });
    return session;
}
function renameGroupChatSession(groupId, sessionId, title) {
    const manifest = listGroupChatSessions(groupId);
    const cleanTitle = String(title || "").trim().slice(0, 80);
    if (!cleanTitle)
        throw new Error("会话名称不能为空");
    let renamed = null;
    const sessions = manifest.sessions.map((item) => {
        if (item.id !== sessionId)
            return item;
        renamed = { ...item, title: cleanTitle, titleOrigin: "manual", updatedAt: new Date().toISOString() };
        return renamed;
    });
    if (!renamed)
        throw new Error("群聊会话不存在");
    writeGroupSessionManifest(groupId, { ...manifest, sessions });
    return renamed;
}
function applyGroupSessionProvisionalTitle(groupId, sessionId, message) {
    const manifest = listGroupChatSessions(groupId);
    const session = manifest.sessions.find((item) => item.id === sessionId);
    if (!session || !(0, session_title_1.isSessionTitleAutoReplaceable)(session.title, session.titleOrigin)) {
        return { renamed: false, reason: "title_not_replaceable", session };
    }
    const files = message?.files || message?.attachments || [];
    const generated = (0, session_title_1.generateProvisionalSessionTitle)({
        scope: "group",
        userMessage: String(message?.content || ""),
        attachmentNames: files.map((file) => String(file?.name || file?.filename || "")).filter(Boolean),
    });
    if (!generated.title)
        return { renamed: false, reason: "title_input_skipped", session, generated };
    const now = new Date().toISOString();
    const renamed = { ...session, title: generated.title, titleOrigin: "provisional", titleProvisionalAt: now, updatedAt: now };
    writeGroupSessionManifest(groupId, { ...manifest, sessions: manifest.sessions.map((item) => item.id === sessionId ? renamed : item) });
    return { renamed: true, session: renamed, generated };
}
const groupSessionTitleJobs = new Map();
function scheduleGroupSessionAutoTitle(groupId, sessionId, options = {}) {
    const key = `${groupId}::${sessionId}`;
    const existingJob = groupSessionTitleJobs.get(key);
    if (existingJob)
        return existingJob;
    const job = (async () => {
        const manifest = listGroupChatSessions(groupId);
        const session = manifest.sessions.find((item) => item.id === sessionId);
        if (!session || !(0, session_title_1.isSessionTitleAutoReplaceable)(session.title, session.titleOrigin))
            return { renamed: false, reason: "title_already_set", session };
        const messages = getGroupMessages(groupId, sessionId);
        const userIndex = messages.findIndex((message) => message?.role === "user"
            && ((0, session_title_1.isMeaningfulSessionTitleInput)(message?.content) || (message?.files || message?.attachments || []).length));
        if (userIndex < 0)
            return { renamed: false, reason: "meaningful_user_message_missing", session };
        const userMessage = messages[userIndex];
        const assistantMessage = messages.slice(userIndex + 1).find((message) => message?.role === "assistant" && String(message?.content || "").trim());
        if (!assistantMessage)
            return { renamed: false, reason: "assistant_reply_missing", session };
        const files = userMessage.files || userMessage.attachments || [];
        const generated = await (0, session_title_1.generateSessionTitleWithModel)({
            scope: "group",
            userMessage: String(userMessage.content || ""),
            assistantMessage: String(assistantMessage.content || ""),
            attachmentNames: files.map((file) => String(file?.name || file?.filename || "")).filter(Boolean),
        }, options);
        if (!generated.title)
            return { renamed: false, reason: "title_input_skipped", generated };
        const latest = listGroupChatSessions(groupId);
        const current = latest.sessions.find((item) => item.id === sessionId);
        if (!current || !(0, session_title_1.isSessionTitleAutoReplaceable)(current.title, current.titleOrigin))
            return { renamed: false, reason: "title_changed_during_generation", session: current };
        const now = new Date().toISOString();
        const renamed = { ...current, title: generated.title, titleOrigin: generated.source === "model" ? "model" : "fallback", titleGeneratedAt: now, updatedAt: now };
        writeGroupSessionManifest(groupId, { ...latest, sessions: latest.sessions.map((item) => item.id === sessionId ? renamed : item) });
        return { renamed: true, session: renamed, generated };
    })().finally(() => groupSessionTitleJobs.delete(key));
    groupSessionTitleJobs.set(key, job);
    return job;
}
function archiveGroupChatSession(groupId, sessionId, archived = true) {
    const manifest = listGroupChatSessions(groupId);
    let changed = null;
    const now = new Date().toISOString();
    const sessions = manifest.sessions.map((item) => {
        if (item.id !== sessionId)
            return item;
        changed = { ...item, archived: !!archived, archivedAt: archived ? now : "", updatedAt: now };
        return changed;
    });
    if (!changed)
        throw new Error("群聊会话不存在");
    const previousLifecycle = sessionId.startsWith("gcs_")
        ? (0, group_session_lifecycle_head_1.ensureGroupSessionLifecycleHead)(groupId, sessionId, { reason: "archive_lazy_adopt" }).head
        : null;
    let lifecycleCancellation = null;
    if (sessionId.startsWith("gcs_")) {
        (0, group_session_lifecycle_head_1.transitionGroupSessionLifecycleHead)({
            groupId,
            groupSessionId: sessionId,
            status: archived ? "archived" : "active",
            reason: archived ? "group_chat_session_archived" : "group_chat_session_restored",
        });
        if (archived) {
            lifecycleCancellation = (0, execution_kernel_1.requestGroupSessionAgentCancellation)({
                groupId,
                groupSessionId: sessionId,
                taskIds: findActiveGroupSessionTasks(groupId, sessionId).map((task) => task.id),
                reason: "群聊会话已归档，停止该会话仍在运行的项目 Agent",
                actor: "group-session-archive",
            });
        }
    }
    let activeSessionId = manifest.activeSessionId;
    if (archived && activeSessionId === sessionId) {
        activeSessionId = sessions.find((item) => item.id !== sessionId && item.archived !== true)?.id || "";
    }
    try {
        writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: activeSessionId || manifest.activeSessionId, sessions });
        if (archived && !activeSessionId) {
            createGroupChatSession(groupId, "新会话");
        }
    }
    catch (error) {
        if (sessionId.startsWith("gcs_") && previousLifecycle?.status && previousLifecycle.status !== (archived ? "archived" : "active")) {
            try {
                (0, group_session_lifecycle_head_1.transitionGroupSessionLifecycleHead)({ groupId, groupSessionId: sessionId, status: previousLifecycle.status, reason: "group_chat_session_archive_rollback" });
            }
            catch { }
        }
        throw error;
    }
    return lifecycleCancellation ? { ...changed, lifecycleCancellation } : changed;
}
function findActiveGroupSessionTasks(groupId, sessionId, tasks = (0, db_1.loadTasks)()) {
    return tasks.filter((task) => String(task?.group_id || "") === groupId
        && String(task?.group_session_id || task?.groupSessionId || GROUP_DEFAULT_SESSION_ID) === sessionId
        && !task?.archived
        && !["done", "failed", "cancelled", "archived"].includes(String(task?.status || "")));
}
function reconcileGroupSessionLifecycleAgentCancellations(tasks = (0, db_1.loadTasks)()) {
    const scopes = new Map();
    for (const task of tasks) {
        const groupId = String(task?.group_id || task?.groupId || "").trim();
        const groupSessionId = String(task?.group_session_id || task?.groupSessionId || "").trim();
        if (!groupId || !groupSessionId.startsWith("gcs_") || task?.archived
            || ["done", "failed", "cancelled", "archived"].includes(String(task?.status || "")))
            continue;
        const key = `${groupId}\u0000${groupSessionId}`;
        const scope = scopes.get(key) || { groupId, groupSessionId, taskIds: [] };
        if (task?.id)
            scope.taskIds.push(String(task.id));
        scopes.set(key, scope);
    }
    const revoked = [];
    let active = 0;
    for (const scope of scopes.values()) {
        const head = (0, group_session_lifecycle_head_1.readGroupSessionLifecycleHead)(scope.groupId, scope.groupSessionId);
        if (head?.status === "active") {
            active++;
            continue;
        }
        revoked.push({
            lifecycleStatus: String(head?.status || "missing_or_corrupt"),
            lifecycleGeneration: Number(head?.generation || 0),
            ...(0, execution_kernel_1.requestGroupSessionAgentCancellation)({
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
function deleteGroupChatSession(groupId, sessionId, options = {}) {
    const manifest = listGroupChatSessions(groupId);
    const session = manifest.sessions.find((item) => item.id === sessionId);
    if (!session)
        throw new Error("群聊会话不存在");
    (0, session_compaction_runs_1.cancelSessionCompactionRun)({ scope: "group", exactSessionId: `${groupId}:${sessionId}`, reason: "群聊会话已删除" });
    (0, session_start_hook_context_1.clearSessionStartHookContext)("group", `${groupId}:${sessionId}`);
    const activeTasks = findActiveGroupSessionTasks(groupId, sessionId);
    if (activeTasks.length && options.force !== true) {
        throw new Error(`会话仍有 ${activeTasks.length} 个未完成任务，请先归档任务或显式强制删除`);
    }
    const lifecycleTombstone = sessionId.startsWith("gcs_")
        ? (0, group_session_lifecycle_head_1.transitionGroupSessionLifecycleHead)({ groupId, groupSessionId: sessionId, status: "deleted", reason: options.reason || "group_chat_session_deleted" })
        : null;
    const lifecycleCancellation = sessionId.startsWith("gcs_")
        ? (0, execution_kernel_1.requestGroupSessionAgentCancellation)({
            groupId,
            groupSessionId: sessionId,
            taskIds: activeTasks.map((task) => task.id),
            reason: "群聊会话已删除，停止该会话仍在运行的项目 Agent",
            actor: "group-session-delete",
        })
        : null;
    const file = getGroupSessionMessagesFile(groupId, sessionId);
    for (const target of [file, `${file}.bak`]) {
        try {
            if (fs.existsSync(target))
                fs.unlinkSync(target);
        }
        catch { }
    }
    groupMessagesCache.delete(`${groupId}::${sessionId}`);
    (0, post_turn_tool_context_compaction_1.deletePostTurnToolContextState)("group", groupId, sessionId);
    (0, pre_request_tool_context_1.deletePreRequestToolContextState)("group", groupId, sessionId);
    const postTurnSummaries = (0, group_post_turn_summary_1.deleteGroupPostTurnSummaryArtifacts)(groupId, sessionId);
    let providerContextCache = { success: false, reason: "not_invalidated" };
    try {
        providerContextCache = (0, provider_neutral_context_cache_1.invalidateProviderNeutralContextCacheState)({ scope: "group", scopeId: groupId, sessionId }, "group_session_deleted");
    }
    catch (error) {
        providerContextCache = { success: false, reason: error?.message || String(error) };
    }
    const remaining = manifest.sessions.filter((item) => item.id !== sessionId);
    const nextActive = manifest.activeSessionId === sessionId
        ? remaining.find((item) => item.archived !== true)?.id || remaining[0]?.id || ""
        : manifest.activeSessionId;
    writeGroupSessionManifest(groupId, { ...manifest, activeSessionId: nextActive || GROUP_DEFAULT_SESSION_ID, sessions: remaining });
    let replacement = null;
    if (!remaining.length)
        replacement = createGroupChatSession(groupId, "新会话");
    return { session, deletedMessageFile: file, postTurnSummaries, providerContextCache, activeTaskCount: activeTasks.length, forced: options.force === true, replacement, lifecycleTombstone, lifecycleCancellation };
}
function purgeLegacyDefaultGroupChatSession(groupId, options = {}) {
    const manifest = readGroupSessionManifest(groupId);
    const legacy = manifest.sessions.find((item) => item.id === GROUP_DEFAULT_SESSION_ID);
    const file = getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID);
    if (!legacy && !fs.existsSync(file)) {
        return { schema: "ccm-group-chat-legacy-session-purge-v1", groupId, purged: false, reason: "legacy_session_absent" };
    }
    const activeTasks = findActiveGroupSessionTasks(groupId, GROUP_DEFAULT_SESSION_ID);
    if (activeTasks.length && options.force !== true) {
        throw new Error(`旧会话仍有 ${activeTasks.length} 个未完成任务，请显式 force 后再删除`);
    }
    for (const target of [file, `${file}.bak`]) {
        try {
            if (fs.existsSync(target))
                fs.unlinkSync(target);
        }
        catch { }
    }
    groupMessagesCache.delete(`${groupId}::${GROUP_DEFAULT_SESSION_ID}`);
    const remaining = manifest.sessions.filter((item) => item.id !== GROUP_DEFAULT_SESSION_ID);
    const activeSessionId = manifest.activeSessionId === GROUP_DEFAULT_SESSION_ID
        ? remaining.find((item) => item.archived !== true)?.id || remaining[0]?.id || ""
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
function pruneArchivedGroupChatSessions(groupId, options = {}) {
    const manifest = listGroupChatSessions(groupId);
    const nowMs = Date.parse(String(options.now || "")) || Date.now();
    const retentionDays = Math.max(1, Number(options.retentionDays || options.retention_days || 30));
    const maxArchived = Math.max(1, Number(options.maxArchived || options.max_archived || 20));
    const dryRun = options.dryRun !== false && options.dry_run !== false;
    const archived = manifest.sessions.filter((item) => item.archived === true)
        .sort((a, b) => String(b.archivedAt || b.updatedAt || "").localeCompare(String(a.archivedAt || a.updatedAt || "")));
    const candidates = archived.filter((item, index) => {
        const at = Date.parse(String(item.archivedAt || item.updatedAt || "")) || 0;
        return index >= maxArchived || (at > 0 && nowMs - at >= retentionDays * 86_400_000);
    });
    const results = dryRun ? [] : candidates.map((item) => {
        try {
            return { id: item.id, deleted: true, result: deleteGroupChatSession(groupId, item.id) };
        }
        catch (error) {
            return { id: item.id, deleted: false, error: error?.message || String(error) };
        }
    });
    return { schema: "ccm-group-chat-session-retention-v1", groupId, dryRun, retentionDays, maxArchived, archivedCount: archived.length, candidateCount: candidates.length, candidates, results, generatedAt: new Date(nowMs).toISOString() };
}
function registerGroupMessageAppendHook(hook) {
    const hooks = getGroupMessageAppendHooks();
    hooks.add(hook);
    return () => hooks.delete(hook);
}
function resolveGroupMessageSessionId(groupId, msg, tasks = (0, db_1.loadTasks)()) {
    const linkedTask = msg?.task_id ? tasks.find((task) => task.id === msg.task_id) : null;
    const taskSessionId = linkedTask ? String(linkedTask?.group_session_id || linkedTask?.groupSessionId || GROUP_DEFAULT_SESSION_ID) : "";
    return String(msg?.group_session_id || msg?.groupSessionId || taskSessionId || getActiveGroupChatSessionId(groupId));
}
function getGroupMessages(groupId, sessionId = "") {
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
        if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size)
            return cached.messages;
        const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
        const messages = Array.isArray(parsed) ? parsed : [];
        groupMessagesCache.set(cacheKey, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
        return messages;
    }
    catch {
        try {
            const backup = `${file}.bak`;
            const parsed = JSON.parse(fs.readFileSync(backup, "utf-8"));
            const messages = Array.isArray(parsed) ? parsed : [];
            const stat = fs.statSync(file);
            groupMessagesCache.set(cacheKey, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
            return messages;
        }
        catch {
            groupMessagesCache.delete(cacheKey);
            return [];
        }
    }
}
function appendGroupMessage(groupId, msg) {
    const sessionId = resolveGroupMessageSessionId(groupId, msg);
    const messages = getGroupMessages(groupId, sessionId);
    const messageId = String(msg?.id || "").trim();
    const existing = messageId ? messages.find((item) => String(item?.id || "") === messageId) : null;
    if (existing)
        return existing;
    const taskRecord = msg?.task_id ? (0, db_1.loadTasks)().find((task) => task.id === msg.task_id) : null;
    const taskTraceId = taskRecord?.trace_id || "";
    const traceId = (0, reliability_ledger_1.ensureTraceId)(msg?.trace_id || msg?.traceId || taskTraceId, "message");
    const taskThreadId = String(msg?.task_thread_id
        || msg?.taskThreadId
        || taskRecord?.task_thread_id
        || taskRecord?.taskThreadId
        || taskRecord?.root_task_id
        || taskRecord?.rootTaskId
        || taskRecord?.retry_of_task_id
        || taskRecord?.retryOfTaskId
        || taskRecord?.source_task_id
        || taskRecord?.sourceTaskId
        || msg?.task_id
        || "");
    const next = {
        ...msg,
        group_session_id: sessionId,
        trace_id: traceId,
        ...(taskThreadId ? { task_thread_id: taskThreadId } : {}),
    };
    messages.push(next);
    saveGroupMessages(groupId, messages, sessionId);
    (0, session_task_timeline_1.recordSessionTimelineMessage)({ exactSessionId: sessionId, scope: "group", scopeId: groupId, role: String(next.role || "user") === "assistant" ? "assistant" : "user", messageId: messageId || undefined, taskId: next?.task_id || next?.taskId, timestamp: next?.timestamp || next?.created_at });
    (0, reliability_ledger_1.appendTraceEvent)(traceId, { id: `group-message:${groupId}:${messageId || messages.length}`, type: "group.message_persisted", status: "ok", group_id: groupId, task_id: msg?.task_id || "", agent: msg?.agent || msg?.role || "", message: String(msg?.content || "").slice(0, 500), data: { message_id: messageId } });
    for (const hook of getGroupMessageAppendHooks()) {
        try {
            hook(groupId, next, messages);
        }
        catch { }
    }
    if (String(next.role || "") === "user") {
        try {
            applyGroupSessionProvisionalTitle(groupId, sessionId, next);
        }
        catch (error) {
            console.warn(`[群聊会话] 临时命名失败 (${groupId}/${sessionId})：${error?.message || error}`);
        }
    }
    if (String(next.role || "") === "assistant" && String(next.content || "").trim()) {
        void scheduleGroupSessionAutoTitle(groupId, sessionId).catch((error) => {
            console.warn(`[群聊会话] 自动命名失败 (${groupId}/${sessionId})：${error?.message || error}`);
        });
    }
    return next;
}
function saveGroupMessages(groupId, messages, sessionId = "") {
    if (!fs.existsSync(utils_1.GROUP_MESSAGES_DIR)) {
        fs.mkdirSync(utils_1.GROUP_MESSAGES_DIR, { recursive: true });
    }
    const resolvedSessionId = String(sessionId || getActiveGroupChatSessionId(groupId));
    const cacheKey = `${groupId}::${resolvedSessionId}`;
    const file = getGroupSessionMessagesFile(groupId, resolvedSessionId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(messages, null, 2), "utf-8");
    replaceFileWithWindowsRetry(temp, file);
    const stat = fs.statSync(file);
    groupMessagesCache.set(cacheKey, { mtimeMs: stat.mtimeMs, size: stat.size, messages });
    const manifestFile = getGroupSessionManifestFile(groupId);
    if (fs.existsSync(manifestFile)) {
        const manifest = listGroupChatSessions(groupId);
        const now = new Date().toISOString();
        const sessions = manifest.sessions.map((item) => item.id === resolvedSessionId ? { ...item, messageCount: messages.length, updatedAt: now } : item);
        writeGroupSessionManifest(groupId, { ...manifest, sessions });
    }
    (0, conversation_search_dirty_1.markConversationSearchIndexDirty)(`group:${groupId}:${resolvedSessionId}`);
    (0, runtime_events_1.publishRuntimeEvent)("group", "group.session_messages_changed", {
        groupId,
        sessionId: resolvedSessionId,
        count: messages.length,
        messageId: messages.at(-1)?.id || "",
        taskId: messages.at(-1)?.task_id || "",
    });
}
function runGroupChatSessionsSelfTest() {
    const groupId = `group-chat-sessions-selftest-${process.pid}-${Date.now().toString(36)}`;
    const groupDir = path.dirname(getGroupSessionManifestFile(groupId));
    const legacyFile = getGroupSessionMessagesFile(groupId, GROUP_DEFAULT_SESSION_ID);
    const lifecycleFiles = [];
    try {
        const first = createGroupChatSession(groupId, "会话 A");
        lifecycleFiles.push((0, group_session_lifecycle_head_1.getGroupSessionLifecycleHeadFile)(groupId, first.id));
        const firstCreatedLifecycle = (0, group_session_lifecycle_head_1.readGroupSessionLifecycleHead)(groupId, first.id);
        appendGroupMessage(groupId, { id: "session-a-message", role: "user", content: "SESSION_A_SENTINEL", group_session_id: first.id });
        const second = createGroupChatSession(groupId, "会话 B");
        lifecycleFiles.push((0, group_session_lifecycle_head_1.getGroupSessionLifecycleHeadFile)(groupId, second.id));
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
        const firstArchivedLifecycle = (0, group_session_lifecycle_head_1.readGroupSessionLifecycleHead)(groupId, first.id);
        const activeAfterArchive = getActiveGroupChatSessionId(groupId);
        const retention = pruneArchivedGroupChatSessions(groupId, { dryRun: true, retentionDays: 30, now: new Date(Date.now() + 31 * 86_400_000).toISOString() });
        archiveGroupChatSession(groupId, first.id, false);
        const firstRestoredLifecycle = (0, group_session_lifecycle_head_1.readGroupSessionLifecycleHead)(groupId, first.id);
        const deleted = deleteGroupChatSession(groupId, second.id);
        const secondDeletedLifecycle = (0, group_session_lifecycle_head_1.readGroupSessionLifecycleHead)(groupId, second.id);
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
            renamePersists: renamed.title === "会话 A 已重命名" && manifest.sessions.find((item) => item.id === first.id)?.title === "会话 A 已重命名",
            archiveSwitchesActiveSession: activeAfterArchive === second.id,
            retentionFindsExpiredArchive: retention.candidates.some((item) => item.id === first.id),
            deleteRemovesOnlyTargetSession: deleted.session.id === second.id
                && manifest.sessions.some((item) => item.id === first.id)
                && !manifest.sessions.some((item) => item.id === second.id)
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
    }
    finally {
        try {
            if (fs.existsSync(groupDir)) {
                for (const name of fs.readdirSync(groupDir)) {
                    const file = path.join(groupDir, name);
                    if (fs.statSync(file).isFile())
                        fs.unlinkSync(file);
                }
                fs.rmdirSync(groupDir);
            }
        }
        catch { }
        try {
            if (fs.existsSync(legacyFile))
                fs.unlinkSync(legacyFile);
        }
        catch { }
        try {
            if (fs.existsSync(`${legacyFile}.bak`))
                fs.unlinkSync(`${legacyFile}.bak`);
        }
        catch { }
        for (const file of lifecycleFiles.flatMap(item => [item, `${item}.bak`, `${item}.lock`])) {
            try {
                if (fs.existsSync(file))
                    fs.unlinkSync(file);
            }
            catch { }
        }
    }
}
//# sourceMappingURL=storage.js.map