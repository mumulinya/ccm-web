export interface AgentRunSupervisorOptions {
    intervalMs?: number;
    startingTimeoutMs?: number;
    runningTimeoutMs?: number;
    autoRecover?: boolean;
    includeMetrics?: boolean;
}
export declare function reconcileAgentRunSupervisor(options?: AgentRunSupervisorOptions): Promise<any>;
export declare function startAgentRunSupervisor(options?: AgentRunSupervisorOptions): {
    started: boolean;
    alreadyRunning: boolean;
    intervalMs?: undefined;
} | {
    started: boolean;
    intervalMs: number;
    alreadyRunning?: undefined;
};
export declare function stopAgentRunSupervisor(): boolean;
export declare function inspectAgentRun(runId: string): import("./agent-run-types").AgentRun;
