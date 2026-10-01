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
exports.createExecutionSession = createExecutionSession;
exports.getExecutionSession = getExecutionSession;
exports.listExecutionSessions = listExecutionSessions;
exports.transitionExecutionSession = transitionExecutionSession;
exports.bindRuntimeSession = bindRuntimeSession;
exports.listRuntimeBindings = listRuntimeBindings;
exports.updateRuntimeBinding = updateRuntimeBinding;
exports.replaceRuntimeSession = replaceRuntimeSession;
exports.appendExecutionAttempt = appendExecutionAttempt;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const runtime_paths_1 = require("../core/runtime-paths");
const atomic_json_file_1 = require("../core/atomic-json-file");
const root = () => path.join(path.resolve(process.env.CCM_TASK_STORE_DIR || runtime_paths_1.DEFAULT_CCM_DIR), "execution-sessions");
const safe = (value) => String(value || "").trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 140);
const id = (prefix, input) => `${prefix}_${crypto.createHash("sha256").update(input).digest("hex").slice(0, 24)}`;
function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(value, null, 2)); fs.renameSync(tmp, file); }
function createExecutionSession(input) {
    const generation = input.generation ?? 1;
    if (!Number.isSafeInteger(generation) || generation < 0)
        throw new Error("执行会话 generation 无效");
    const legacyId = id("es", `${input.taskId}:${input.workItemId}`);
    const legacy = getExecutionSession(legacyId);
    // Keep existing matching bindings, but never return another generation's session.
    const sessionId = legacy?.generation === generation || (!legacy && generation === 1)
        ? legacyId : id("es", `${input.taskId}:${input.workItemId}:generation:${generation}`);
    const file = path.join(root(), `${sessionId}.json`);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const existing = getExecutionSession(sessionId);
        if (existing) {
            if (existing.generation !== generation || existing.projectId !== safe(input.projectId))
                throw new Error("执行会话归属冲突");
            return existing;
        }
        const now = new Date().toISOString();
        const session = { id: sessionId, taskId: safe(input.taskId), workItemId: safe(input.workItemId), projectId: safe(input.projectId),
            generation, status: "created", attemptIds: [], evidenceIds: [], failureRecordIds: [], createdAt: now, updatedAt: now, contentStored: false };
        (0, atomic_json_file_1.writeJsonAtomic)(file, session);
        return session;
    });
}
function getExecutionSession(sessionId) { try {
    const value = JSON.parse(fs.readFileSync(path.join(root(), `${safe(sessionId)}.json`), "utf8"));
    return value?.contentStored === false ? value : null;
}
catch {
    return null;
} }
function listExecutionSessions(taskId) { try {
    return fs.readdirSync(root()).filter(name => name.endsWith(".json")).map(name => getExecutionSession(name.slice(0, -5))).filter((row) => !!row && (!taskId || row.taskId === safe(taskId)));
}
catch {
    return [];
} }
function transitionExecutionSession(sessionId, status) { const current = getExecutionSession(sessionId); if (!current)
    throw new Error("执行会话不存在"); if (["completed", "failed", "cancelled"].includes(current.status) && current.status !== status)
    throw new Error("终态执行会话不能回退"); const next = { ...current, status, updatedAt: new Date().toISOString() }; write(path.join(root(), `${safe(sessionId)}.json`), next); return next; }
function bindRuntimeSession(sessionId, input) { const session = getExecutionSession(sessionId); if (!session)
    throw new Error("执行会话不存在"); const now = new Date().toISOString(); const binding = { id: id("rb", `${sessionId}:${input.runtimeType}:${input.providerSessionId || now}`), executionSessionId: sessionId, runtimeType: input.runtimeType, providerSessionId: input.providerSessionId, agentId: input.agentId, status: "active", boundAt: now, lastSeenAt: now, contentStored: false }; write(path.join(root(), `${binding.id}.binding.json`), binding); write(path.join(root(), `${sessionId}.json`), { ...session, currentRuntimeBindingId: binding.id, updatedAt: now }); return binding; }
function listRuntimeBindings(sessionId) { try {
    return fs.readdirSync(root()).filter(name => name.endsWith(".binding.json")).map(name => { try {
        return JSON.parse(fs.readFileSync(path.join(root(), name), "utf8"));
    }
    catch {
        return null;
    } }).filter(row => row?.contentStored === false && (!sessionId || row.executionSessionId === sessionId));
}
catch {
    return [];
} }
/** Update a runtime binding without changing the authoritative execution session. */
function updateRuntimeBinding(bindingId, status, lastSeenAt = new Date().toISOString()) {
    const file = path.join(root(), `${safe(bindingId)}.binding.json`);
    let current;
    try {
        current = JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        throw new Error("运行时绑定不存在");
    }
    if (current.contentStored !== false)
        throw new Error("运行时绑定格式无效");
    const next = { ...current, status, lastSeenAt, contentStored: false };
    write(file, next);
    return next;
}
/** Rebind only the runtime implementation; WorkItem and ExecutionSession IDs stay stable. */
function replaceRuntimeSession(sessionId, input) {
    const current = getExecutionSession(sessionId);
    if (!current)
        throw new Error("执行会话不存在");
    for (const binding of listRuntimeBindings(sessionId).filter(item => item.status === "active")) {
        updateRuntimeBinding(binding.id, "replaced");
    }
    return bindRuntimeSession(sessionId, input);
}
function appendExecutionAttempt(sessionId, attemptId) {
    const current = getExecutionSession(sessionId);
    if (!current)
        throw new Error("执行会话不存在");
    const attempt = safe(attemptId);
    if (!attempt)
        throw new Error("attemptId 不能为空");
    const next = { ...current, attemptIds: [...new Set([...(current.attemptIds || []), attempt])], updatedAt: new Date().toISOString() };
    write(path.join(root(), `${safe(sessionId)}.json`), next);
    return next;
}
//# sourceMappingURL=execution-session-registry.js.map