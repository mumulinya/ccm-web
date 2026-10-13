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
exports.assertPersistentDispatchGate = assertPersistentDispatchGate;
const db_1 = require("../core/db");
const dispatch_execution_policy_1 = require("./dispatch-execution-policy");
const dispatch_profile_1 = require("./dispatch-profile");
const child_process_1 = require("child_process");
const acceptance_contract_1 = require("./acceptance-contract");
const dispatch_write_permission_1 = require("./dispatch-write-permission");
const dispatch_workspace_policy_1 = require("./dispatch-workspace-policy");
const path = __importStar(require("path"));
/** Shared preflight for persisted tasks; synthetic maintenance runs have no TaskSpec. */
function assertPersistentDispatchGate(input) {
    let task = (0, db_1.getTaskById)(input.taskId);
    if (!task)
        return;
    if (task.task_session_boundary_version && require("../modules/collaboration/task-session-source-sync").hasPendingTaskSourceSync(task.id)) {
        throw Object.assign(new Error("任务上下文同步尚未完成，需先完成补偿对账"), { code: "CCM_TASK_SESSION_SOURCE_SYNC_PENDING" });
    }
    if (task.task_session_boundary_version && !require("../modules/collaboration/task-session-store").getTaskSession(task.id)) {
        throw Object.assign(new Error("任务上下文绑定尚未完成，已阻止 Runtime 启动"), { code: "CCM_TASK_SESSION_BINDING_PENDING" });
    }
    if (task.task_session_continuation_context && input.scope !== "test_agent" && input.agentId !== "test-agent" && !(0, dispatch_workspace_policy_1.isDispatchPlanningRun)(input)) {
        const session = require("../tasks/agent-sessions").listTaskAgentSessions({ taskId: task.id }).find((row) => row.id === input.taskAgentSessionId);
        const checked = session?.taskSessionContinuation;
        if (!checked || checked.attempt_id !== task.attempt_id || !checked.workspace_path
            || !input.workspacePath || path.resolve(checked.workspace_path) !== path.resolve(input.workspacePath)
            || input.nativeSessionId && (session.nativeSessionId !== input.nativeSessionId || checked.mode !== "native_reused")) {
            throw Object.assign(new Error("再次开发的原生会话尚未通过续接检查"), { code: "TASK_SESSION_NATIVE_RESUME_NOT_VERIFIED" });
        }
    }
    if (!task.dispatch_profile_snapshot)
        task = require("./dispatch-legacy-materialization").materializeLegacyDispatchPolicy(task);
    if (!task?.dispatch_profile_snapshot)
        return;
    if (task.trace_id && input.traceId !== task.trace_id)
        throw Object.assign(new Error("派发 trace_id 与任务权威身份不一致"), { code: "CCM_RUN_IDENTITY_CONFLICT" });
    (0, dispatch_execution_policy_1.assertDispatchExecutionPolicy)(task);
    if (task.acceptance_state === "delivery_recovery_required")
        throw Object.assign(new Error("中断的交付需人工核对，禁止重新启动开发 Runtime"), { code: "CCM_DISPATCH_DELIVERY_RECOVERY_REQUIRED" });
    if (task.rework_exhausted && input.scope !== "test_agent")
        throw Object.assign(new Error("自动返工已停止；请人工 retry 开始新周期"), { code: "CCM_DISPATCH_REWORK_BLOCKED" });
    if ((task.scope_expansion_requests || []).some((r) => (input.runId ? r.runId === input.runId : !r.attemptId || r.attemptId === input.attemptId) && (r.status === "pending" || r.applicationState === "applying" || ["rejected", "expired"].includes(r.status)))) {
        throw Object.assign(new Error("范围扩展尚未完成审批或应用"), { code: "CCM_SCOPE_APPROVAL_PENDING" });
    }
    if (input.scope === "test_agent" || input.agentId === "test-agent" && input.source === "test-agent")
        return;
    const profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    // The coordinator's model planning loop does not edit the child workspace.
    if ((0, dispatch_workspace_policy_1.isDispatchPlanningRun)(input))
        return;
    if (profile.requiredGates.requireIsolatedWorktree) {
        if (!input.workspacePath)
            throw Object.assign(new Error("严格任务缺少独立工作区"), { code: "CCM_DISPATCH_WORKTREE_REQUIRED" });
        const git = (0, child_process_1.spawnSync)("git", ["-C", input.workspacePath, "rev-parse", "--git-dir", "--git-common-dir"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
        const dirs = String(git.stdout || "").trim().split(/\r?\n/);
        if (git.status !== 0 || dirs.length !== 2 || dirs[0] === dirs[1])
            throw Object.assign(new Error("严格任务必须使用独立 Worktree，禁止共享目录降级"), { code: "CCM_DISPATCH_WORKTREE_REQUIRED" });
        const contract = (0, acceptance_contract_1.taskAcceptanceContract)(task);
        const validation = (0, acceptance_contract_1.validateAcceptanceContract)(contract);
        if (!contract || !validation.valid || contract.level !== "strict" || contract.taskId !== task.id)
            throw Object.assign(new Error("严格任务缺少有效的完整验收合同，需先完成规划"), { code: "CCM_DISPATCH_ACCEPTANCE_CONTRACT_REQUIRED", issues: validation.issues });
    }
    (0, dispatch_write_permission_1.assertDispatchWritePermission)(input);
}
//# sourceMappingURL=dispatch-run-gate.js.map