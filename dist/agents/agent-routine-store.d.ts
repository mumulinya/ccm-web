import type { AgentRoutineRun } from "./agent-governance-types";
export declare function upsertAgentRoutine(input: {
    routineId?: string;
    name?: string;
    agentId?: string;
    scope?: string;
    scopeId?: string;
    schedule: string;
    triggerType?: string;
    catchUpPolicy?: string;
    concurrencyPolicy?: string;
    enabled?: boolean;
    payload?: any;
}): unknown;
export declare function listAgentRoutines(): {
    routineId: string;
    name: string;
    agentId: string;
    scope: string;
    scopeId: string;
    schedule: string;
    triggerType: string;
    catchUpPolicy: string;
    concurrencyPolicy: string;
    enabled: boolean;
    payload: any;
    createdAt: string;
    updatedAt: string;
}[];
export declare function createAgentRoutineRun(input: {
    routineId: string;
    scheduleWindowId: string;
    triggerType?: string;
    runId?: string;
    status?: AgentRoutineRun["status"];
    catchUp?: boolean;
}): AgentRoutineRun;
/** Creation and duplicate detection share the SQLite transaction. A replay
 * must never mutate an already queued or running schedule window. */
export declare function reserveAgentRoutineWindow(input: {
    routineId: string;
    scheduleWindowId: string;
    triggerType?: string;
    runId?: string;
    status?: AgentRoutineRun["status"];
    catchUp?: boolean;
    scheduledFor?: string;
    concurrencyPolicy?: string;
}): {
    run: AgentRoutineRun;
    created: boolean;
};
export declare function getAgentRoutineWindowTime(run: AgentRoutineRun): string;
/** Promote the one retained window only after the previous delivery settles.
 * This is a reservation in the existing ledger, not another task queue. */
export declare function claimDeferredAgentRoutineWindow(routineId: string): AgentRoutineRun | null;
export declare function updateAgentRoutineRun(routineRunId: string, patch: {
    runId?: string;
    status?: AgentRoutineRun["status"];
}): AgentRoutineRun;
export declare function listAgentRoutineRuns(routineId?: string): AgentRoutineRun[];
