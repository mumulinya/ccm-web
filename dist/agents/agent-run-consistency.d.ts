import type { AgentRun } from "./agent-run-types";
import type { HeartbeatWakeRequest } from "./agent-heartbeat-types";
export interface TaskRunConsistencyProjection {
    run_id: string;
    run_status: string;
    runtime_id: string;
    run_started_at: string;
    run_finished_at: string;
    run_recovery_state: string;
    heartbeat_wake_id: string;
    heartbeat_status: string;
    heartbeat_coalesced: boolean;
    lease_owner_id: string;
    lease_expires_at: string;
    consistency_state: "consistent" | "repairable" | "blocked";
    consistency_issues: string[];
}
export declare function selectCurrentAgentRun(task: any, runs?: AgentRun[]): AgentRun;
export declare function assertTaskAndRunProjectionConsistency(task: any, runs?: AgentRun[], wakes?: HeartbeatWakeRequest[]): {
    consistent: boolean;
    state: "blocked" | "consistent" | "repairable";
    issues: string[];
    current: AgentRun;
    runs: AgentRun[];
    wakes: HeartbeatWakeRequest[];
};
export declare function buildTaskRunConsistencyProjection(task: any): TaskRunConsistencyProjection | null;
/**
 * Repair only the durable task projection from the AgentRun authority. This
 * deliberately does not infer success or rewrite a task lifecycle status.
 */
export declare function repairTaskAgentRunProjection(task: any, current: AgentRun | null, wake?: HeartbeatWakeRequest | null): {
    repaired: boolean;
    task: any;
    reason: string;
    patch?: undefined;
} | {
    repaired: boolean;
    task: any;
    patch: any;
    reason?: undefined;
} | {
    repaired: boolean;
    task: any;
    patch: any;
    reason: string;
};
export declare function reconcileTaskAgentRunConsistency(tasks?: any[], options?: {
    appendEvents?: boolean;
}): {
    checked: number;
    consistent: number;
    repairable: number;
    blocked: number;
    repaired: number;
    issues: {
        taskId: string;
        runId: string;
        state: string;
        issues: string[];
    }[];
};
