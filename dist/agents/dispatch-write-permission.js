"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDispatchWritePermission = ensureDispatchWritePermission;
exports.assertDispatchWritePermission = assertDispatchWritePermission;
const db_1 = require("../core/db");
const dispatch_workspace_policy_1 = require("./dispatch-workspace-policy");
function requirement(input) {
    const task = (0, db_1.getTaskById)(input.taskId);
    if (!task?.dispatch_profile_snapshot || task.workflow_policy_snapshot?.approval !== "confirm_before_write")
        return null;
    if (input.scope === "test_agent" || (0, dispatch_workspace_policy_1.isDispatchPlanningRun)(input))
        return null;
    const item = (task.work_items || []).find(row => (row.id || row.workItemId) === input.workItemId);
    const project = String(item?.project || task.target_project || task.targetProject || "");
    if (!project || !input.workspacePath)
        throw Object.assign(new Error("首次修改审批缺少项目和工作区绑定"), { code: "CCM_DISPATCH_WRITE_APPROVAL_REQUIRED" });
    const { permissionSnapshotForTask } = require("../modules/tools/conversation-permission-policy");
    const snapshot = { ...permissionSnapshotForTask(task), mode: "ask_before_edit" };
    return { task: { ...task, conversation_permission_snapshot: snapshot }, project, workDir: input.workspacePath, agentType: input.runtimeId };
}
/** Reuse CCM's permission broker, including expiry and exact workspace binding.
 * Frozen confirm_before_write overrides a weaker conversation default. */
async function ensureDispatchWritePermission(input) {
    const required = requirement(input);
    if (!required)
        return;
    const { authorizeProjectChildAgentStart } = require("../modules/tools/conversation-permission-policy");
    const permission = await authorizeProjectChildAgentStart(required);
    if (!permission.allowed) {
        require("../modules/collaboration/collaboration-task-service").updateTask(required.task.id, {
            status: "blocked", acceptance_state: "needs_user", status_detail: permission.message,
            conversation_permission_snapshot: permission.snapshot, conversation_permission_mode: permission.mode,
            permission_policy_revision: permission.snapshot?.revision || 0,
        });
        throw Object.assign(new Error(permission.message), {
            code: "CCM_DISPATCH_WRITE_APPROVAL_REQUIRED", permissionRequestId: permission.permissionRequest?.id,
        });
    }
}
/** Synchronous process/lease observations cannot ask a model or create grants. */
function assertDispatchWritePermission(input) {
    const required = requirement(input);
    if (!required)
        return;
    const task = required.task;
    const key = String(task.task_thread_id || task.taskThreadId || task.root_task_id || task.rootTaskId || task.retry_of_task_id || task.retryOfTaskId || task.id);
    const paths = (task.allowed_paths || task.allowedPaths || [required.workDir]).map((value) => String(value).trim()).filter(Boolean).sort();
    const requests = require("../modules/collaboration/task-permission-broker").listTaskPermissionRequests({ project: required.project });
    const approved = requests.some((request) => request.approvalScope === "task" && request.operation === "workspace_edit_session"
        && String(request.approvalTaskKey || request.taskId) === key && request.state === "approved" && request.decidedBy === "local-user"
        && Number(request.permissionPolicyRevision || 0) === Number(task.conversation_permission_snapshot.revision || 0)
        && request.expiresAt && Date.parse(request.expiresAt) > Date.now() && request.usedCount < request.maxUses
        && (request.approvedProjectIds || []).includes(required.project)
        && JSON.stringify([...(request.approvedPaths || [])].sort()) === JSON.stringify(paths));
    if (!approved)
        throw Object.assign(new Error("首次修改需要有效人工授权；禁止通过续租或重试绕过"), { code: "CCM_DISPATCH_WRITE_APPROVAL_REQUIRED" });
}
//# sourceMappingURL=dispatch-write-permission.js.map