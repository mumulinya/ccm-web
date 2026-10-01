"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planAvailableActions = planAvailableActions;
exports.missionNavigationActions = missionNavigationActions;
exports.globalRunAvailableActions = globalRunAvailableActions;
exports.globalMissionAvailableActions = globalMissionAvailableActions;
const action = (kind, label, tone = "outline") => ({ id: kind, kind, label, tone });
function planAvailableActions(status) {
    if (status === "completed")
        return [];
    return [action("revise_plan", "修改计划"), ...(["ready", "awaiting_confirmation"].includes(status)
            ? [action("confirm_plan", "确认并执行", "primary")] : [])];
}
function missionNavigationActions(links) {
    return links.filter(link => link?.available !== false).slice(0, 4).map(link => ({
        id: `open_target_session:${link.linkId || link.taskId || link.exactSessionId}`,
        kind: "open_target_session", label: link.scope === "group" ? "查看群聊任务" : "查看项目任务",
        tone: "outline", task_id: link.taskId || "", link,
    }));
}
// Public projections are recomputed from persisted state, never copied from a
// browser-provided card. Execution endpoints still enforce authorization.
function globalRunAvailableActions(run) {
    if (run.status === "waiting_confirmation")
        return [action("reject_confirmation", "取消"), action("confirm", "确认并继续", "primary")];
    if (run.status === "waiting_clarification")
        return [action("provide_clarification", "补充信息", "primary"), action("cancel", "取消")];
    if (["paused", "interrupted"].includes(run.status) || run.pause_control?.state === "paused")
        return [action("resume", "继续", "primary")];
    if (run.status === "failed")
        return run.retryable === false ? [] : [action("retry", "重试", "primary")];
    if (["running", "planning", "supervising", "executing"].includes(run.status))
        return [action("pause", "暂停"), action("cancel", "停止", "danger")];
    return [];
}
function globalMissionAvailableActions(mission) {
    if (mission.status === "awaiting_change_review")
        return [action("view_changes", "查看整批改动"), action("approve_epic", "批准 Epic 交付", "primary"), action("targeted_rework", "退回子任务返工", "warning")];
    if (mission.acceptance_state === "recovery_required")
        return [action("resume_interrupted", "恢复任务", "primary"), action("cancel", "停止任务", "danger")];
    if (["paused", "manual_takeover", "interrupted"].includes(mission.status))
        return [action("resume", "继续任务", "primary"), action("cancel", "停止任务", "danger")];
    if (["failed", "error", "blocked"].includes(mission.status))
        return [action("retry", "重试", "primary"), action("cancel", "停止任务", "danger")];
    if (["done", "completed", "cancelled", "reverted", "archived"].includes(mission.status))
        return [];
    return [action("continue", "追加要求", "primary"), action("pause", "暂停"), action("cancel", "停止任务", "danger")];
}
//# sourceMappingURL=task-available-actions.js.map