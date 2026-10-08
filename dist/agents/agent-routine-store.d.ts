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
export declare function updateAgentRoutineRun(routineRunId: string, patch: {
    runId?: string;
    status?: AgentRoutineRun["status"];
}): AgentRoutineRun;
export declare function listAgentRoutineRuns(routineId?: string): AgentRoutineRun[];
