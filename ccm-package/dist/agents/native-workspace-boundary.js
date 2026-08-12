"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceNativeWorkspaceBoundary = enforceNativeWorkspaceBoundary;
const execution_kernel_1 = require("./execution-kernel");
/**
 * Fail-closed boundary for third-party native editors. Violating files are
 * selectively restored only inside isolated worktrees. Shared workspaces are
 * never mutated automatically and remain blocked for explicit user review.
 */
function enforceNativeWorkspaceBoundary(taskId, violations = []) {
    const rows = (Array.isArray(violations) ? violations : []).filter(item => item?.path);
    if (!rows.length)
        return { pass: true, quarantined: [], blocked: [] };
    const executions = (0, execution_kernel_1.listExecutions)({ taskId });
    const quarantined = [];
    const blocked = [];
    for (const execution of executions) {
        const project = String(execution?.project || "").trim();
        const paths = Array.from(new Set(rows
            .filter(item => !item?.agent || String(item.agent).trim() === project)
            .map(item => String(item.path || "").trim())
            .filter(Boolean)));
        if (!paths.length)
            continue;
        const checkpointIds = Array.isArray(execution?.checkpointIds) ? execution.checkpointIds : [];
        const checkpointId = String(checkpointIds[checkpointIds.length - 1] || "");
        if (execution?.workspace?.mode !== "worktree" || !checkpointId) {
            blocked.push({ executionId: execution.id, paths, reason: "共享工作区或缺少可信检查点，已阻止验收但未自动改动用户文件" });
            continue;
        }
        try {
            (0, execution_kernel_1.rollbackExecutionCheckpoint)(checkpointId, "原生 Agent 写入越过项目允许范围，已隔离违规文件", {
                paths,
                cancelExecution: false,
            });
            quarantined.push({ executionId: execution.id, checkpointId, paths });
        }
        catch (error) {
            blocked.push({ executionId: execution.id, paths, reason: String(error?.message || error).slice(0, 500) });
        }
    }
    return { pass: false, quarantined, blocked };
}
//# sourceMappingURL=native-workspace-boundary.js.map