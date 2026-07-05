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
exports.openTaskAgentSession = openTaskAgentSession;
exports.recordTaskAgentSessionTurn = recordTaskAgentSessionTurn;
exports.advanceTaskAgentSession = advanceTaskAgentSession;
exports.closeTaskAgentSessions = closeTaskAgentSessions;
exports.reopenTaskAgentSessions = reopenTaskAgentSessions;
exports.getTaskAgentSessionOptions = getTaskAgentSessionOptions;
exports.getTaskAgentSessionContinuity = getTaskAgentSessionContinuity;
exports.listTaskAgentSessions = listTaskAgentSessions;
exports.purgeTaskAgentSessions = purgeTaskAgentSessions;
exports.reconcileTaskAgentSessions = reconcileTaskAgentSessions;
exports.shouldCloseTaskAgentSessions = shouldCloseTaskAgentSessions;
exports.runTaskAgentSessionSelfTest = runTaskAgentSessionSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const agent_runtime_1 = require("./agent-runtime");
const utils_1 = require("./utils");
const STORE_FILE = path.join(utils_1.CCM_DIR, "task-agent-sessions.json");
const STORE_BACKUP_FILE = `${STORE_FILE}.bak`;
const MAX_SESSION_RECORDS = 500;
function emptyStore() {
    return { version: 1, sessions: [] };
}
function loadStore() {
    try {
        if (!fs.existsSync(STORE_FILE))
            return emptyStore();
        const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
        return {
            version: 1,
            sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
        };
    }
    catch {
        try {
            const recovered = JSON.parse(fs.readFileSync(STORE_BACKUP_FILE, "utf-8"));
            return { version: 1, sessions: Array.isArray(recovered?.sessions) ? recovered.sessions : [] };
        }
        catch {
            return emptyStore();
        }
    }
}
function saveStore(store) {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    const sessions = (store.sessions || [])
        .sort((a, b) => String(a.lastUsedAt || a.createdAt).localeCompare(String(b.lastUsedAt || b.createdAt)))
        .slice(-MAX_SESSION_RECORDS);
    const tmp = `${STORE_FILE}.${process.pid}.tmp`;
    if (fs.existsSync(STORE_FILE)) {
        try {
            JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
            fs.copyFileSync(STORE_FILE, STORE_BACKUP_FILE);
        }
        catch { }
    }
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, sessions }, null, 2), "utf-8");
    fs.renameSync(tmp, STORE_FILE);
}
function createNativeSessionId(agentType) {
    return (0, agent_runtime_1.normalizeAgentRuntimeId)(agentType) === "claudecode" ? crypto.randomUUID() : "";
}
function openTaskAgentSession(input) {
    const store = loadStore();
    const runtime = (0, agent_runtime_1.normalizeAgentRuntimeId)(input.agentType);
    const existing = [...store.sessions].reverse().find((item) => item.status === "open"
        && item.scopeId === input.scopeId
        && item.groupId === input.groupId
        && item.project === input.project
        && item.agentType === runtime);
    if (existing) {
        if (existing.resumeMode !== "native" && (0, agent_runtime_1.getAgentRuntime)(runtime).capabilities.sessionResume && Number(existing.nativeCaptureFailures || 0) < 3) {
            existing.resumeMode = "native";
            existing.nativeSessionId = "";
            existing.nativeRecoveryAttempts = Number(existing.nativeRecoveryAttempts || 0) + 1;
            existing.lastNativeRecoveryAt = new Date().toISOString();
            existing.lastError = "正在重新尝试捕获原生 session ID";
            saveStore(store);
        }
        return existing;
    }
    const now = new Date().toISOString();
    const session = {
        id: `tas_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        scopeId: String(input.scopeId || input.taskId || "").trim(),
        taskId: String(input.taskId || "").trim(),
        groupId: String(input.groupId || "").trim(),
        project: String(input.project || "").trim(),
        agentType: runtime,
        nativeSessionId: createNativeSessionId(runtime),
        resumeMode: (0, agent_runtime_1.getAgentRuntime)(runtime).capabilities.sessionResume ? "native" : "scratchpad",
        status: "open",
        turnCount: 0,
        lastTurnSucceeded: null,
        createdAt: now,
        lastUsedAt: now,
        closedAt: "",
        closeReason: "",
        nativeCaptureFailures: 0,
        nativeRecoveryAttempts: 0,
        nativeSessionHistory: [],
        lastNativeRecoveryAt: "",
        lastError: "",
    };
    store.sessions.push(session);
    saveStore(store);
    return session;
}
function recordTaskAgentSessionTurn(sessionId, result = {}) {
    const store = loadStore();
    const index = store.sessions.findIndex((item) => item.id === sessionId);
    if (index < 0)
        return null;
    const current = store.sessions[index];
    const next = advanceTaskAgentSession(current, result);
    store.sessions[index] = next;
    saveStore(store);
    return next;
}
function advanceTaskAgentSession(current, result = {}) {
    const errorText = String(result.error || "");
    const invalidNativeSession = result.nativeSessionInvalid === true || /(?:session|thread).*(?:not found|invalid|expired|不存在|无效|过期)|无法恢复.*(?:session|会话)/i.test(errorText);
    const permissionDrift = result.permissionDrift === true;
    const capturedNativeId = String(result.nativeSessionId || current.nativeSessionId || "").trim();
    const requiresCapturedId = current.resumeMode === "native"
        && (0, agent_runtime_1.getAgentRuntime)(current.agentType).capabilities.sessionResume
        && (0, agent_runtime_1.normalizeAgentRuntimeId)(current.agentType) !== "claudecode";
    const captureFailed = result.success !== false && requiresCapturedId && !capturedNativeId;
    const previousIds = [...new Set([...(current.nativeSessionHistory || []), current.nativeSessionId].filter(Boolean))].slice(-10);
    const next = {
        ...current,
        nativeSessionId: permissionDrift ? createNativeSessionId(current.agentType) : invalidNativeSession ? "" : capturedNativeId,
        resumeMode: permissionDrift ? "native" : captureFailed ? "scratchpad" : invalidNativeSession && (0, agent_runtime_1.getAgentRuntime)(current.agentType).capabilities.sessionResume ? "native" : current.resumeMode,
        nativeCaptureFailures: Number(current.nativeCaptureFailures || 0) + (captureFailed ? 1 : 0),
        nativeRecoveryAttempts: Number(current.nativeRecoveryAttempts || 0) + (invalidNativeSession || permissionDrift ? 1 : 0),
        nativeSessionHistory: previousIds,
        lastNativeRecoveryAt: invalidNativeSession || permissionDrift ? new Date().toISOString() : current.lastNativeRecoveryAt || "",
        turnCount: permissionDrift ? 0 : Number(current.turnCount || 0) + 1,
        lastTurnSucceeded: result.success !== false,
        lastError: permissionDrift ? "检测到实际只读权限与可写任务声明不一致；已隔离旧 native session，下轮创建可写恢复会话" : invalidNativeSession ? "原生会话已失效，下轮将创建恢复会话并承接工作区" : result.success === false ? (errorText || "Agent 执行失败") : captureFailed ? "CLI 未返回原生 session ID，已安全降级为 scratchpad 续跑" : "",
        permissionDriftCount: Number(current.permissionDriftCount || 0) + (permissionDrift ? 1 : 0),
        lastPermissionDriftAt: permissionDrift ? new Date().toISOString() : current.lastPermissionDriftAt || "",
        lastUsedAt: new Date().toISOString(),
    };
    return next;
}
function closeTaskAgentSessions(input, reason = "主 Agent 已完成最终验收") {
    if (!String(input.scopeId || "").trim() && !String(input.taskId || "").trim())
        return [];
    const store = loadStore();
    const now = new Date().toISOString();
    const closed = [];
    store.sessions = store.sessions.map((item) => {
        const matches = item.status === "open"
            && (!input.scopeId || item.scopeId === input.scopeId)
            && (!input.taskId || item.taskId === input.taskId)
            && (!input.groupId || item.groupId === input.groupId);
        if (!matches)
            return item;
        const next = { ...item, status: "closed", closedAt: now, closeReason: reason, lastUsedAt: now };
        closed.push(next);
        return next;
    });
    if (closed.length)
        saveStore(store);
    return closed;
}
function reopenTaskAgentSessions(taskId, reason = "用户在同一任务中继续修改") {
    const id = String(taskId || "").trim();
    if (!id)
        return [];
    const store = loadStore();
    const now = new Date().toISOString();
    const latestByLane = new Map();
    for (const session of store.sessions) {
        if (session.taskId !== id && session.scopeId !== id)
            continue;
        const key = `${session.groupId}::${session.project}::${session.agentType}`;
        const previous = latestByLane.get(key);
        if (!previous || String(session.lastUsedAt || session.createdAt) > String(previous.lastUsedAt || previous.createdAt))
            latestByLane.set(key, session);
    }
    const ids = new Set(Array.from(latestByLane.values()).map(item => item.id));
    const reopened = [];
    store.sessions = store.sessions.map((session) => {
        if (!ids.has(session.id) || session.status === "open")
            return session;
        const next = { ...session, status: "open", closedAt: "", closeReason: "", lastUsedAt: now, lastError: reason };
        reopened.push(next);
        return next;
    });
    if (reopened.length)
        saveStore(store);
    return reopened;
}
function getTaskAgentSessionOptions(session) {
    return {
        sessionId: session.nativeSessionId,
        resumeSession: session.resumeMode === "native" && session.turnCount > 0 && !!session.nativeSessionId,
        persistSession: session.resumeMode === "native",
    };
}
function getTaskAgentSessionContinuity(session) {
    return {
        mode: session.resumeMode,
        native: session.resumeMode === "native" && !!session.nativeSessionId,
        degraded: session.resumeMode === "scratchpad" && (0, agent_runtime_1.getAgentRuntime)(session.agentType).capabilities.sessionResume,
        reason: session.lastError || "",
        turnCount: session.turnCount,
        recoveryAttempts: Number(session.nativeRecoveryAttempts || 0),
        previousNativeSessionIds: session.nativeSessionHistory || [],
    };
}
function listTaskAgentSessions(filter = {}) {
    return loadStore().sessions.filter((item) => (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
}
function purgeTaskAgentSessions(taskId) {
    const id = String(taskId || "").trim();
    if (!id)
        return [];
    const store = loadStore();
    const removed = store.sessions.filter((item) => item.taskId === id || item.scopeId === id);
    if (!removed.length)
        return [];
    store.sessions = store.sessions.filter((item) => item.taskId !== id && item.scopeId !== id);
    saveStore(store);
    return removed;
}
function reconcileTaskAgentSessions(tasks, nowMs = Date.now()) {
    const taskMap = new Map((Array.isArray(tasks) ? tasks : []).map((task) => [String(task.id || ""), task]));
    const store = loadStore();
    const closed = [];
    const now = new Date(nowMs).toISOString();
    store.sessions = store.sessions.map((session) => {
        if (session.status !== "open")
            return session;
        const task = taskMap.get(session.taskId || session.scopeId);
        const inactiveMs = nowMs - Date.parse(session.lastUsedAt || session.createdAt || now);
        const terminal = !task || task.archived || task.deleted_at || ["done", "cancelled", "archived"].includes(String(task.status || ""));
        const abandoned = inactiveMs > 30 * 24 * 60 * 60 * 1000 && String(task?.status || "") !== "in_progress";
        if (!terminal && !abandoned)
            return session;
        const next = { ...session, status: "closed", closedAt: now, lastUsedAt: now, closeReason: terminal ? "任务已终态、归档或不存在，自动关闭残留会话" : "会话超过 30 天未使用，自动关闭" };
        closed.push(next);
        return next;
    });
    if (closed.length)
        saveStore(store);
    return { closed: closed.length, sessions: closed };
}
function shouldCloseTaskAgentSessions(input) {
    const hasPersistentTask = !!String(input.taskId || "").trim();
    const terminalStatuses = new Set(["done", "cancelled", "archived", "deleted"]);
    return hasPersistentTask
        ? terminalStatuses.has(String(input.taskStatus || ""))
        : String(input.reviewStatus || "") === "complete";
}
function runTaskAgentSessionSelfTest() {
    const claude = {
        nativeSessionId: crypto.randomUUID(),
        resumeMode: "native",
        turnCount: 1,
    };
    const options = getTaskAgentSessionOptions(claude);
    const cursorWithoutCapturedId = advanceTaskAgentSession({ ...claude, id: "cursor-test", agentType: "cursor", nativeSessionId: "", turnCount: 0 }, { success: true });
    const codexWithCapturedId = advanceTaskAgentSession({ ...claude, id: "codex-test", agentType: "codex", nativeSessionId: "", turnCount: 0 }, { success: true, nativeSessionId: "codex-thread-1" });
    const invalidCursor = advanceTaskAgentSession({ ...claude, id: "cursor-invalid", agentType: "cursor", nativeSessionId: "cursor-thread-old", turnCount: 2 }, { success: false, error: "session not found" });
    const checks = {
        persistsNativeSession: options.persistSession,
        resumesAfterFirstTurn: options.resumeSession,
        preservesNativeId: options.sessionId === claude.nativeSessionId,
        cursorUsesNativeContinuation: (0, agent_runtime_1.getAgentRuntime)("cursor").capabilities.sessionResume,
        persistentTaskWaitsForDoneState: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "in_progress" }),
        persistentTaskClosesAfterDoneState: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "done" }),
        persistentTaskKeepsSessionOnFailed: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "failed" }),
        persistentTaskKeepsSessionOnPaused: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "paused" }),
        persistentTaskClosesAfterCancelled: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "cancelled" }),
        persistentTaskClosesAfterArchived: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "blocked", taskStatus: "archived" }),
        conversationalTaskClosesAfterReview: shouldCloseTaskAgentSessions({ reviewStatus: "complete" }),
        missingNativeIdCanDegradeSafely: cursorWithoutCapturedId.resumeMode === "scratchpad" && cursorWithoutCapturedId.nativeCaptureFailures === 1,
        capturedNativeIdStaysResumable: codexWithCapturedId.resumeMode === "native" && getTaskAgentSessionOptions(codexWithCapturedId).resumeSession,
        invalidNativeSessionCreatesRecoveryPath: invalidCursor.resumeMode === "native" && invalidCursor.nativeSessionId === "" && invalidCursor.nativeSessionHistory?.includes("cursor-thread-old") && invalidCursor.nativeRecoveryAttempts === 1,
        permissionDriftRebuildsNativeSession: (() => {
            const drifted = advanceTaskAgentSession({ ...claude, id: "codex-drift", agentType: "codex", nativeSessionId: "codex-readonly", turnCount: 3 }, { success: false, error: "sandbox read-only", permissionDrift: true });
            return drifted.resumeMode === "native" && drifted.nativeSessionId === "" && drifted.turnCount === 0 && drifted.nativeSessionHistory?.includes("codex-readonly") && drifted.permissionDriftCount === 1;
        })(),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=task-agent-sessions.js.map