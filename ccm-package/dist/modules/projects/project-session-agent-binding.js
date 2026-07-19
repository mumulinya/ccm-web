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
exports.PROJECT_WEB_SESSION_AGENT_GROUP = void 0;
exports.buildProjectSessionAgentScopeId = buildProjectSessionAgentScopeId;
exports.acquireProjectSessionAgentDispatch = acquireProjectSessionAgentDispatch;
exports.releaseProjectSessionAgentDispatch = releaseProjectSessionAgentDispatch;
exports.isProjectSessionAgentDispatchActive = isProjectSessionAgentDispatchActive;
exports.getProjectSessionAgentBinding = getProjectSessionAgentBinding;
exports.bindProjectSessionAgentExecution = bindProjectSessionAgentExecution;
exports.rotateProjectSessionAgentBinding = rotateProjectSessionAgentBinding;
exports.purgeProjectSessionAgentBinding = purgeProjectSessionAgentBinding;
exports.reopenProjectSessionAgentBinding = reopenProjectSessionAgentBinding;
const crypto = __importStar(require("crypto"));
const runtime_1 = require("../../agents/runtime");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const project_validation_1 = require("./project-validation");
exports.PROJECT_WEB_SESSION_AGENT_GROUP = "project-chat";
const activeProjectSessionDispatches = new Set();
function buildProjectSessionAgentScopeId(project, projectSessionId) {
    const safeProject = (0, project_validation_1.validateProjectName)(project);
    const safeSessionId = (0, project_validation_1.validateSessionId)(projectSessionId);
    const digest = crypto.createHash("sha256").update(`${safeProject}\u0000${safeSessionId}`).digest("hex").slice(0, 28);
    return `project-session:${digest}`;
}
function acquireProjectSessionAgentDispatch(project, projectSessionId) {
    const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
    if (activeProjectSessionDispatches.has(scopeId))
        return { acquired: false, scopeId };
    activeProjectSessionDispatches.add(scopeId);
    return { acquired: true, scopeId };
}
function releaseProjectSessionAgentDispatch(scopeId) {
    return activeProjectSessionDispatches.delete(String(scopeId || ""));
}
function isProjectSessionAgentDispatchActive(project, projectSessionId) {
    return activeProjectSessionDispatches.has(buildProjectSessionAgentScopeId(project, projectSessionId));
}
function getProjectSessionAgentBinding(project, projectSessionId) {
    const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
    const sessions = (0, agent_sessions_1.listTaskAgentSessions)({ scopeId, groupId: exports.PROJECT_WEB_SESSION_AGENT_GROUP })
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const active = [...sessions].reverse().find(session => session.status === "open") || null;
    return {
        schema: "ccm-project-session-agent-binding-v1",
        project,
        project_session_id: projectSessionId,
        scope_id: scopeId,
        generation: active ? sessions.findIndex(session => session.id === active.id) + 1 : sessions.length,
        task_agent_session_id: active?.id || "",
        native_session_id: active?.nativeSessionId || "",
        provider: active?.agentType || "",
        resume_mode: active?.resumeMode || "",
        turn_count: Number(active?.turnCount || 0),
        status: active ? "open" : sessions.length ? "closed" : "unbound",
        generation_count: sessions.length,
    };
}
function bindProjectSessionAgentExecution(input) {
    const project = (0, project_validation_1.validateProjectName)(input.project);
    const projectSessionId = (0, project_validation_1.validateSessionId)(input.projectSessionId);
    const agentType = (0, runtime_1.normalizeAgentRuntimeId)(input.agentType);
    const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
    const open = (0, agent_sessions_1.listTaskAgentSessions)({ scopeId, groupId: exports.PROJECT_WEB_SESSION_AGENT_GROUP, status: "open" });
    if (open.some(session => session.agentType !== agentType)) {
        (0, agent_sessions_1.closeTaskAgentSessions)({ scopeId, groupId: exports.PROJECT_WEB_SESSION_AGENT_GROUP }, `项目会话切换执行器到 ${agentType}`);
    }
    const session = (0, agent_sessions_1.openTaskAgentSession)({
        scopeId,
        taskId: scopeId,
        groupId: exports.PROJECT_WEB_SESSION_AGENT_GROUP,
        project,
        agentType,
    });
    const binding = getProjectSessionAgentBinding(project, projectSessionId);
    return { session, options: (0, agent_sessions_1.getTaskAgentSessionOptions)(session), binding };
}
function rotateProjectSessionAgentBinding(project, projectSessionId, reason = "项目会话开始新世代") {
    const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
    if (activeProjectSessionDispatches.has(scopeId))
        throw new Error("当前项目会话仍有第三方 Agent 正在执行，不能切换会话世代");
    const closed = (0, agent_sessions_1.closeTaskAgentSessions)({ scopeId, groupId: exports.PROJECT_WEB_SESSION_AGENT_GROUP }, reason);
    return { scopeId, closed, nextGeneration: getProjectSessionAgentBinding(project, projectSessionId).generation_count + 1 };
}
function purgeProjectSessionAgentBinding(project, projectSessionId) {
    const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
    return { scopeId, removed: (0, agent_sessions_1.purgeTaskAgentSessions)(scopeId) };
}
function reopenProjectSessionAgentBinding(project, projectSessionId, reason = "项目会话世代提交回滚") {
    const scopeId = buildProjectSessionAgentScopeId(project, projectSessionId);
    return { scopeId, reopened: (0, agent_sessions_1.reopenTaskAgentSessions)(scopeId, reason) };
}
//# sourceMappingURL=project-session-agent-binding.js.map