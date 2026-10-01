/**
 * Record Global Agent run terminals into the shared performance metrics store.
 * Scope: global:global / role: global_agent. Skips duplicate executionId events.
 */
/** Accumulate provider usage onto a Global Agent run across multi-step model calls. */
export declare function accumulateGlobalAgentRunUsage(run: any, delta: any): any;
/**
 * Record a terminal Global Agent run (completed / failed / cancelled).
 * Does not record supervising / waiting states.
 */
export declare function recordGlobalAgentRunMetric(run: any, status: string, options?: {
    source?: string;
    runtime?: string;
}): boolean;
