/** Small authoritative-state facade used by task lifecycle integrations. */
import { type ExecutionSessionStatus } from "./execution-session-registry";
export declare function readAuthoritativeExecutionState(executionSessionId: string): {
    executionSessionId: string;
    taskId: string;
    workItemId: string;
    generation: number;
    status: ExecutionSessionStatus;
    updatedAt: string;
    contentStored: false;
};
export declare function transitionAuthoritativeExecutionState(executionSessionId: string, status: ExecutionSessionStatus): {
    executionSessionId: string;
    taskId: string;
    workItemId: string;
    generation: number;
    status: ExecutionSessionStatus;
    updatedAt: string;
    contentStored: false;
};
