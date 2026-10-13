"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDispatchRoutineTask = syncDispatchRoutineTask;
exports.reconcileDispatchRoutineTasks = reconcileDispatchRoutineTasks;
const agent_run_store_1 = require("./agent-run-store");
const agent_run_lifecycle_1 = require("./agent-run-lifecycle");
const agent_routine_store_1 = require("./agent-routine-store");
/** A provider turn finishing is not a Routine delivering its task. This
 * projection is replayable across the JSON/SQLite boundary. */
function syncDispatchRoutineTask(task) {
    const routineId = String(task?.automation_routine_run_id || "");
    if (!routineId)
        return null;
    const routine = (0, agent_routine_store_1.listAgentRoutineRuns)().find(item => item.routineRunId === routineId);
    if (!routine)
        return null;
    const runs = (0, agent_run_store_1.listAgentRuns)({ taskId: task.id });
    const run = runs.find(item => item.runId === routine.runId);
    const terminalTask = ["done", "completed"].includes(String(task.status));
    const active = runs.some(item => !(0, agent_run_lifecycle_1.isAgentRunTerminal)(item.status));
    const gate = task.delivery_summary?.acceptance_gate?.pass === true || task.delivery_summary?.acceptance_gate_passed === true;
    const verified = !task.dispatch_profile_snapshot || gate && task.main_agent_final_acceptance?.accepted === true;
    const waiting = task.user_acceptance?.state === "pending" || task.acceptance_state === "delivery_recovery_required";
    const failed = ["failed", "cancelled", "canceled"].includes(String(task.status)) || !!task.rework_exhausted;
    const status = failed && !active ? "failed"
        : terminalTask && verified && !waiting && !active && run?.status === "succeeded" ? "succeeded"
            : routine.runId ? "running" : routine.status;
    if (status === routine.status)
        return routine;
    return (0, agent_routine_store_1.updateAgentRoutineRun)(routineId, { status });
}
function reconcileDispatchRoutineTasks() {
    let checked = 0, repaired = 0;
    for (const task of require('../core/task-query').listAutomationTasks()) {
        if (!task.automation_routine_run_id)
            continue;
        checked++;
        const before = (0, agent_routine_store_1.listAgentRoutineRuns)().find(item => item.routineRunId === task.automation_routine_run_id);
        const after = syncDispatchRoutineTask(task);
        if (before && after && before.status !== after.status)
            repaired++;
    }
    return { checked, repaired };
}
//# sourceMappingURL=dispatch-routine-consistency.js.map