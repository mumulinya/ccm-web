"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TASK_STATUS_CANONICAL = void 0;
exports.canonicalTaskStatus = canonicalTaskStatus;
exports.normalizeTaskStatus = normalizeTaskStatus;
exports.validateTaskLifecycleTransition = validateTaskLifecycleTransition;
exports.normalizeTaskLifecycle = normalizeTaskLifecycle;
exports.runTaskLifecycleSelfTest = runTaskLifecycleSelfTest;
exports.taskAvailableActions = taskAvailableActions;
const TERMINAL = new Set(["completed", "done", "cancelled", "reverted"]);
const ALIASES = { running: "in_progress", testing: "reviewing", awaiting_test_agent: "reviewing", test_agent_running: "reviewing", needs_user: "waiting_user", recovering: "in_progress" };
exports.TASK_STATUS_CANONICAL = {
    pending: "pending", queued: "queued", running: "in_progress", in_progress: "in_progress", executing: "executing",
    reviewing: "reviewing", testing: "reviewing", awaiting_test_agent: "reviewing", test_agent_running: "reviewing",
    reworking: "reworking", repairing: "reworking", blocked: "blocked", waiting: "waiting_user", waiting_user: "waiting_user",
    needs_user: "waiting_user", paused: "paused", completed: "completed", done: "completed", succeeded: "completed",
    failed: "failed", error: "failed", cancelled: "cancelled", canceled: "cancelled", reverted: "reverted",
};
function canonicalTaskStatus(value) { const raw = String(value || "pending").trim().toLowerCase(); return ALIASES[raw] || raw; }
function normalizeTaskStatus(value) {
    const raw = String(value || "pending").trim().toLowerCase();
    return exports.TASK_STATUS_CANONICAL[raw] || canonicalTaskStatus(raw);
}
function validateTaskLifecycleTransition(from, to, context = "任务") { const previous = canonicalTaskStatus(from); const next = canonicalTaskStatus(to); const issues = []; if (TERMINAL.has(previous) && next !== previous)
    issues.push(`${context}已处于终态 ${previous}，不能迁移到 ${next}`); if (previous === "cancelled" && next !== "cancelled")
    issues.push(`${context}已取消，不能恢复执行`); if (previous === "reverted" && next !== "reverted")
    issues.push(`${context}已撤销，不能继续执行`); return { valid: issues.length === 0, issues, from: previous, to: next }; }
function normalizeTaskLifecycle(task) { const status = canonicalTaskStatus(task?.status || task?.acceptance_state || task?.phase); return { status, acceptanceState: String(task?.acceptance_state || "").trim().toLowerCase(), phase: String(task?.phase || "").trim().toLowerCase(), terminal: TERMINAL.has(status) }; }
function runTaskLifecycleSelfTest() { if (!validateTaskLifecycleTransition("reviewing", "completed").valid)
    throw new Error("valid completion rejected"); if (validateTaskLifecycleTransition("completed", "in_progress").valid)
    throw new Error("terminal regression accepted"); if (validateTaskLifecycleTransition("cancelled", "queued").valid)
    throw new Error("cancelled recovery accepted"); return true; }
function taskAvailableActions(task) {
    const status = normalizeTaskStatus(task?.status);
    const acceptance = String(task?.acceptance_state || "").trim().toLowerCase();
    if (status === "waiting_user" && acceptance === "awaiting_user_acceptance")
        return ["accept", "revise", "cancel"];
    if (["completed", "cancelled", "reverted"].includes(String(status)))
        return [];
    return [];
}
//# sourceMappingURL=task-lifecycle.js.map