/** A provider turn finishing is not a Routine delivering its task. This
 * projection is replayable across the JSON/SQLite boundary. */
export declare function syncDispatchRoutineTask(task: any): import("./agent-governance-types").AgentRoutineRun;
export declare function reconcileDispatchRoutineTasks(): {
    checked: number;
    repaired: number;
};
