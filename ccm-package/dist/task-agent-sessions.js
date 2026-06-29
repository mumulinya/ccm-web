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
exports.getTaskAgentSessionOptions = getTaskAgentSessionOptions;
exports.getTaskAgentSessionContinuity = getTaskAgentSessionContinuity;
exports.listTaskAgentSessions = listTaskAgentSessions;
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
        if (existing.resumeMode !== "native" && (0, agent_runtime_1.getAgentRuntime)(runtime).capabilities.sessionResume && !Number(existing.nativeCaptureFailures || 0)) {
            existing.resumeMode = "native";
            existing.nativeSessionId = "";
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
    const capturedNativeId = String(result.nativeSessionId || current.nativeSessionId || "").trim();
    const requiresCapturedId = current.resumeMode === "native"
        && (0, agent_runtime_1.getAgentRuntime)(current.agentType).capabilities.sessionResume
        && (0, agent_runtime_1.normalizeAgentRuntimeId)(current.agentType) !== "claudecode";
    const captureFailed = result.success !== false && requiresCapturedId && !capturedNativeId;
    const next = {
        ...current,
        nativeSessionId: capturedNativeId,
        resumeMode: captureFailed ? "scratchpad" : current.resumeMode,
        nativeCaptureFailures: Number(current.nativeCaptureFailures || 0) + (captureFailed ? 1 : 0),
        turnCount: Number(current.turnCount || 0) + 1,
        lastTurnSucceeded: result.success !== false,
        lastError: result.success === false ? "Agent 执行失败" : captureFailed ? "CLI 未返回原生 session ID，已安全降级为 scratchpad 续跑" : "",
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
    };
}
function listTaskAgentSessions(filter = {}) {
    return loadStore().sessions.filter((item) => (!filter.scopeId || item.scopeId === filter.scopeId)
        && (!filter.taskId || item.taskId === filter.taskId)
        && (!filter.groupId || item.groupId === filter.groupId)
        && (!filter.project || item.project === filter.project)
        && (!filter.status || item.status === filter.status));
}
function shouldCloseTaskAgentSessions(input) {
    const hasPersistentTask = !!String(input.taskId || "").trim();
    return hasPersistentTask
        ? String(input.taskStatus || "") === "done"
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
    const checks = {
        persistsNativeSession: options.persistSession,
        resumesAfterFirstTurn: options.resumeSession,
        preservesNativeId: options.sessionId === claude.nativeSessionId,
        cursorUsesNativeContinuation: (0, agent_runtime_1.getAgentRuntime)("cursor").capabilities.sessionResume,
        persistentTaskWaitsForDoneState: !shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "in_progress" }),
        persistentTaskClosesAfterDoneState: shouldCloseTaskAgentSessions({ taskId: "task-1", reviewStatus: "complete", taskStatus: "done" }),
        conversationalTaskClosesAfterReview: shouldCloseTaskAgentSessions({ reviewStatus: "complete" }),
        missingNativeIdCanDegradeSafely: cursorWithoutCapturedId.resumeMode === "scratchpad" && cursorWithoutCapturedId.nativeCaptureFailures === 1,
        capturedNativeIdStaysResumable: codexWithCapturedId.resumeMode === "native" && getTaskAgentSessionOptions(codexWithCapturedId).resumeSession,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=task-agent-sessions.js.map