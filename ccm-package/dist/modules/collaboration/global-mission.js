"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGlobalMissionChildDeliveryEvidence = getGlobalMissionChildDeliveryEvidence;
exports.globalMissionChildGatePassed = globalMissionChildGatePassed;
exports.refreshGlobalMissionParentInTaskList = refreshGlobalMissionParentInTaskList;
function getGlobalMissionChildDeliveryEvidence(task, deps) {
    const executions = task?.id ? deps.listExecutions({ taskId: task.id }) : [];
    const worktrees = executions.filter((item) => item?.workspace?.mode === "worktree");
    const unmerged = worktrees.filter((item) => !item?.workspace?.mergedAt || !item?.workspace?.mergeCommit);
    return {
        execution_count: executions.length,
        execution_states: executions.map((item) => ({
            execution_id: item.id,
            agent: item.agent || item.project || "",
            state: item.state || "",
            green_level: item.green?.level || "none",
            green_passed: item.green?.pass === true,
            workspace_mode: item.workspace?.mode || "shared",
            merge_status: item.workspace?.mode === "worktree"
                ? (item.workspace?.mergedAt && item.workspace?.mergeCommit ? "merged" : "merge_pending")
                : "not_required",
            merge_commit: item.workspace?.mergeCommit || "",
        })),
        merge_required: worktrees.length > 0,
        merge_passed: unmerged.length === 0,
        merge_pending_execution_ids: unmerged.map((item) => item.id),
        merge_commits: worktrees.map((item) => item.workspace?.mergeCommit).filter(Boolean),
    };
}
function globalMissionChildGatePassed(task, deps) {
    if (!task || task.status !== "done")
        return false;
    const summary = task.delivery_summary || {};
    const evidence = getGlobalMissionChildDeliveryEvidence(task, deps);
    if (!evidence.merge_passed)
        return false;
    if (task.assign_type === "group")
        return summary.acceptance_gate_passed === true;
    const requiresCode = deps.taskRequiresCodeChanges(task);
    const requiresVerification = deps.taskRequiresVerification(task);
    const actualChanges = Number(summary.actual_file_change_count || task.file_changes?.count || 0);
    const executedVerification = Number(summary.verification_executed?.length || 0);
    const failedVerification = Number(summary.verification_failed?.length || 0);
    if (requiresCode && actualChanges <= 0)
        return false;
    if (requiresVerification && executedVerification <= 0)
        return false;
    if (failedVerification > 0 || summary.verification_required_gate_passed === false || (requiresVerification && summary.verification_source_gate_passed !== true))
        return false;
    if (summary.independent_review_required === true && summary.independent_review_gate_passed !== true)
        return false;
    return true;
}
function refreshGlobalMissionParentInTaskList(tasks, parentId, deps) {
    if (!parentId)
        return null;
    const parent = tasks.find((item) => item.id === parentId && item.workflow_type === "global_mission");
    if (!parent)
        return null;
    const children = tasks.filter((item) => item.parent_task_id === parentId);
    const rows = children.map((child) => ({
        ...getGlobalMissionChildDeliveryEvidence(child, deps),
        task_id: child.id,
        title: child.title,
        target_type: child.mission_target?.type || child.assign_type,
        target: child.mission_target?.name || child.group_id || child.target_project || "",
        status: child.status,
        status_detail: child.status_detail || child.result || "",
        gate_passed: globalMissionChildGatePassed(child, deps),
        actual_file_change_count: Number(child.delivery_summary?.actual_file_change_count || child.file_changes?.count || 0),
        actual_file_changes: Array.isArray(child.delivery_summary?.actual_file_changes)
            ? child.delivery_summary.actual_file_changes.map((item) => ({
                ...(item || {}),
                project: item?.project || item?.target_project || child.target_project || child.mission_target?.name || "",
            }))
            : [],
        verification_count: Number(child.delivery_summary?.verification_executed?.length || 0),
        receipt_status: child.receipt?.status || "",
        blockers: [
            ...(Array.isArray(child.delivery_summary?.blockers) ? child.delivery_summary.blockers : []),
            ...(Array.isArray(child.delivery_summary?.needs) ? child.delivery_summary.needs : []),
        ],
    }));
    const completed = rows.filter((item) => item.status === "done").length;
    const passed = rows.filter((item) => item.gate_passed).length;
    const failed = rows.filter((item) => item.status === "failed").length;
    const blocked = rows.filter((item) => item.status === "failed" || item.blockers.length > 0 || (item.status === "done" && !item.gate_passed)).length;
    const allPassed = rows.length > 0 && passed === rows.length;
    const now = new Date().toISOString();
    const actualFileChanges = rows
        .flatMap((row) => Array.isArray(row.actual_file_changes) ? row.actual_file_changes : [])
        .filter((item) => item?.path);
    const controlMode = parent.supervisor_control?.mode || "automatic";
    const cancelled = parent.status === "cancelled";
    parent.status = allPassed ? "done" : cancelled ? "cancelled" : "in_progress";
    parent.status_detail = allPassed
        ? "所有群聊主 Agent和项目 Agent子任务均已通过交付验收"
        : cancelled
            ? (parent.status_detail || "全局任务已取消")
            : controlMode === "manual"
                ? "全局任务已由用户人工接管"
                : controlMode === "paused"
                    ? "全局任务监工已暂停"
                    : failed > 0
                        ? `${failed} 个子任务执行失败，等待全局 Agent重试或用户干预`
                        : blocked > 0
                            ? `${blocked} 个子任务存在验收缺口或阻塞`
                            : `跨项目任务执行中：${completed}/${rows.length} 已完成`;
    parent.mission_summary = {
        total: rows.length,
        completed,
        passed,
        failed,
        blocked,
        pending: rows.length - completed - failed,
        all_passed: allPassed,
        children: rows,
        updated_at: now,
    };
    parent.delivery_summary = {
        headline: allPassed ? "全局开发任务已完成并通过全部交付验收" : "全局开发任务仍在执行或验收中",
        global_mission: true,
        child_tasks: rows,
        actual_file_changes: actualFileChanges,
        actual_file_change_count: actualFileChanges.length,
        child_task_count: rows.length,
        completed_count: completed,
        passed_count: passed,
        failed_count: failed,
        blocked_count: blocked,
        acceptance_gate_passed: allPassed,
        generated_at: now,
    };
    parent.updated_at = now;
    if (allPassed)
        parent.completed_at = parent.completed_at || now;
    else if (!cancelled)
        delete parent.completed_at;
    return parent;
}
//# sourceMappingURL=global-mission.js.map