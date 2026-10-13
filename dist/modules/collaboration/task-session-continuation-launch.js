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
exports.prepareTaskSessionContinuationLaunch = prepareTaskSessionContinuationLaunch;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const agent_run_store_1 = require("../../agents/agent-run-store");
const dispatch_resume_inspection_1 = require("../../agents/dispatch-resume-inspection");
const agent_governance_store_1 = require("../../agents/agent-governance-store");
const agent_sessions_shared_1 = require("../../tasks/agent-sessions-shared");
const runtime_1 = require("../../agents/runtime");
const task_session_workspace_rebuild_1 = require("./task-session-workspace-rebuild");
/** Validate saved bindings before they become CLI resume flags for a new cycle. */
async function prepareTaskSessionContinuationLaunch(task, session, workspacePath) {
    if (!task?.task_session_continuation_context || !session)
        return session;
    if (!workspacePath || !fs.existsSync(workspacePath))
        throw Object.assign(new Error("再次开发工作区证据不足：workspace_missing"), { code: "TASK_SESSION_WORKSPACE_RECONCILIATION_REQUIRED", status: 409 });
    const previous = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id }).filter(run => run.taskAgentSessionId === session.id
        && run.scope !== "test_agent" && run.agentId !== "test-agent" && !run.executionId?.endsWith(":ack-preflight")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    let rebuild = null;
    if (previous) {
        const samePath = path.resolve(previous.workspacePath) === path.resolve(workspacePath);
        const workspace = samePath && previous.workspaceEvidence && await require("../../agents/agent-run-workspace").verifyAgentRunWorkspaceEvidence(previous, previous.workspaceEvidence);
        if (!workspace?.valid) {
            rebuild = await (0, task_session_workspace_rebuild_1.verifyTaskSessionWorkspaceRebuild)(task, session, previous, workspacePath).catch(() => null);
            if (!rebuild)
                throw Object.assign(new Error(`再次开发工作区证据不足：${workspace?.reason || "workspace_path_changed"}`), { code: "TASK_SESSION_WORKSPACE_RECONCILIATION_REQUIRED", status: 409 });
        }
    }
    else if (session.turnCount > 0) {
        throw Object.assign(new Error("再次开发缺少原运行及工作区归属证据"), { code: "TASK_SESSION_WORKSPACE_RECONCILIATION_REQUIRED", status: 409 });
    }
    let reason = "fresh_session";
    let reusable = false;
    if (rebuild)
        reason = "workspace_rebuilt_from_delivery";
    else if (session.nativeSessionId && session.turnCount > 0 && (0, runtime_1.getAgentRuntime)(session.agentType).capabilities.sessionResume) {
        if (!previous)
            reason = "previous_run_evidence_missing";
        else {
            const inspection = await (0, dispatch_resume_inspection_1.inspectDispatchResume)(previous);
            reusable = inspection.resumable;
            reason = String(inspection.reason || "resume_evidence_insufficient");
            if (!reusable && (!inspection.workspaceValid || /(?:workspace|worktree|Commit|Checksum)_?(?:missing|changed)/.test(reason))
                && !["native_session_unverified", "provider_session_evidence_missing", "runtime_version_evidence_missing"].includes(reason)) {
                throw Object.assign(new Error(`再次开发工作区证据不足：${reason}`), { code: "TASK_SESSION_WORKSPACE_RECONCILIATION_REQUIRED", status: 409 });
            }
        }
    }
    else if (!(0, runtime_1.getAgentRuntime)(session.agentType).capabilities.sessionResume)
        reason = "runtime_session_resume_unsupported";
    const next = (0, agent_sessions_shared_1.withTaskAgentSessionStoreLock)(() => {
        const store = (0, agent_sessions_shared_1.loadStore)();
        const index = store.sessions.findIndex(row => row.id === session.id && row.taskId === task.id);
        if (index < 0 || store.sessions[index].nativeSessionId !== session.nativeSessionId)
            throw new Error("续接会话身份已改变，请重试");
        const current = store.sessions[index];
        const state = { attempt_id: task.attempt_id, parent_run_id: previous?.runId || "", workspace_path: path.resolve(workspacePath),
            mode: reusable ? "native_reused" : "fresh_session", reason, ...(rebuild ? { workspace_rebuild: rebuild } : {}), checked_at: new Date().toISOString() };
        const updated = { ...current, taskSessionContinuation: state,
            ...(!reusable ? { nativeSessionId: "", nativeResumeEvidenceRef: "", nativeSessionHistory: [...new Set([...(current.nativeSessionHistory || []), current.nativeSessionId].filter(Boolean))],
                lastError: `再次开发新建原生会话：${reason}` } : {}) };
        store.sessions[index] = updated;
        (0, agent_sessions_shared_1.saveStore)(store);
        return updated;
    });
    (0, agent_governance_store_1.recordAgentActivity)({ taskId: task.id, runId: previous?.runId || "", traceId: task.trace_id,
        actorType: "system", actorId: "task-session-continuation", eventType: "runtime.session_attached", summary: reusable ? "再次开发已验证原生会话" : "再次开发使用新会话与任务上下文",
        payload: next.taskSessionContinuation, idempotencyKey: `task-session-continuation:${task.active_run_id}:${session.id}` });
    return next;
}
//# sourceMappingURL=task-session-continuation-launch.js.map